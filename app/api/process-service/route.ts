import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { extractTextFromPDF } from '@/lib/pdf-processor';
import { generateBatchEmbeddings, validateOpenAIConfig } from '@/lib/embeddings';

interface ServiceProcessingRequest {
  job_id: string;
}

export async function POST(request: NextRequest) {
  console.log('Service processing request received');

  try {
    // Parse request body
    const body = await request.json();
    const { job_id } = body as ServiceProcessingRequest;

    if (!job_id) {
      return NextResponse.json({ 
        error: 'job_id is required' 
      }, { status: 400 });
    }

    // Validate OpenAI configuration before proceeding
    const configValidation = validateOpenAIConfig();
    if (!configValidation.isValid) {
      return NextResponse.json({ 
        error: `OpenAI configuration error: ${configValidation.error}` 
      }, { status: 500 });
    }

    const supabase = createClient();

    // Get service job details using the database function
    const { data: jobDetails, error: jobError } = await supabase
      .rpc('begin_job_processing', { p_job_id: job_id });

    if (jobError || !jobDetails || jobDetails.length === 0) {
      return NextResponse.json({ 
        error: 'Service job not found or already processing' 
      }, { status: 404 });
    }

    const job = jobDetails[0];
    console.log(`Starting service processing for job ${job_id}, service: ${job.service_type}`);

    // Update job status to processing
    await supabase
      .from('service_jobs')
      .update({ 
        status: 'processing',
        progress: 10
      })
      .eq('id', job_id);

    try {
      // Process each document version in the service job
      const processedVersions = [];
      for (let i = 0; i < job.version_ids.length; i++) {
        const version_id = job.version_ids[i];
        console.log(`Processing version ${i + 1}/${job.version_ids.length}: ${version_id}`);

        // Get document version info
        const { data: version, error: versionError } = await supabase
          .from('document_versions')
          .select('*, documents(*)')
          .eq('id', version_id)
          .single();

        if (versionError || !version) {
          throw new Error(`Document version ${version_id} not found`);
        }

        // Update version status to processing
        await supabase.rpc('update_processing_status', {
          p_version_id: version_id,
          p_status: 'processing',
          p_progress: 0
        });

        // Download file from Supabase Storage
        const { data: fileData, error: downloadError } = await supabase.storage
          .from('documents')
          .download(version.storage_path);

        if (downloadError || !fileData) {
          throw new Error(`Failed to download file for version ${version_id}: ${downloadError?.message || 'File not found'}`);
        }

        // Convert to Buffer for processing
        const fileBuffer = Buffer.from(await fileData.arrayBuffer());
        console.log(`Downloaded file for version ${version_id}: ${fileBuffer.length} bytes`);

        // Extract text and segment into clauses
        console.log(`Starting PDF text extraction for version ${version_id}...`);
        const processingResult = await extractTextFromPDF(fileBuffer);
        console.log(`Extraction complete for version ${version_id}: ${processingResult.segments.length} segments identified`);

        // Store clauses in database
        const clauseInserts = processingResult.segments.map(segment => ({
          version_id: version_id,
          clause_ref: segment.clause_ref,
          text: segment.text,
          page_from: segment.page_from,
          page_to: segment.page_to
        }));

        const { data: insertedClauses, error: clauseError } = await supabase
          .from('clauses')
          .insert(clauseInserts)
          .select();

        if (clauseError || !insertedClauses) {
          throw new Error(`Failed to store clauses for version ${version_id}: ${clauseError?.message}`);
        }

        console.log(`Stored ${insertedClauses.length} clauses for version ${version_id}`);

        // Generate embeddings for all clause texts
        console.log(`Starting embedding generation for version ${version_id}...`);
        const clauseTexts = processingResult.segments.map(segment => segment.text);
        const embeddingResult = await generateBatchEmbeddings(clauseTexts);
        
        console.log(`Generated ${embeddingResult.embeddings.length} embeddings for version ${version_id} using ${embeddingResult.total_tokens} tokens`);

        // Store embeddings in database
        const embeddingInserts = embeddingResult.embeddings.map((embeddingData, index) => ({
          clause_id: insertedClauses[index].id,
          vector: embeddingData.embedding
        }));

        const { error: embeddingError } = await supabase
          .from('embeddings')
          .insert(embeddingInserts);

        if (embeddingError) {
          throw new Error(`Failed to store embeddings for version ${version_id}: ${embeddingError.message}`);
        }

        console.log(`Stored ${embeddingInserts.length} embeddings for version ${version_id}`);

        // Update version processing status
        await supabase.rpc('update_processing_status', {
          p_version_id: version_id,
          p_status: 'completed',
          p_progress: 100
        });

        // Update version with processing results
        await supabase
          .from('document_versions')
          .update({ 
            pages: processingResult.metadata.total_pages
          })
          .eq('id', version_id);

        processedVersions.push({
          version_id,
          segments_count: processingResult.segments.length,
          total_pages: processingResult.metadata.total_pages,
          text_length: processingResult.metadata.text_length,
          processing_method: processingResult.metadata.processing_method,
          tokens_used: embeddingResult.total_tokens,
          embeddings_generated: embeddingResult.embeddings.length
        });

        // Update job progress
        const progressPercent = Math.floor(((i + 1) / job.version_ids.length) * 90) + 10;
        await supabase
          .from('service_jobs')
          .update({ progress: progressPercent })
          .eq('id', job_id);
      }

      // Complete the service job
      const result_data = {
        service_type: job.service_type,
        processed_versions: processedVersions,
        total_documents: job.version_ids.length,
        processing_completed_at: new Date().toISOString()
      };

      await supabase.rpc('complete_job_processing', {
        p_job_id: job_id,
        p_result_data: result_data
      });

      console.log(`Service processing completed successfully for job ${job_id}`);

      return NextResponse.json({
        success: true,
        message: `Service processing completed successfully for ${job.service_type}`,
        job_id,
        service_type: job.service_type,
        processing_result: {
          total_documents: job.version_ids.length,
          processed_versions: processedVersions,
          total_tokens_used: processedVersions.reduce((sum, v) => sum + v.tokens_used, 0),
          total_embeddings: processedVersions.reduce((sum, v) => sum + v.embeddings_generated, 0)
        }
      });

    } catch (processingError) {
      console.error('Service processing error:', processingError);

      // Update job status to failed
      await supabase.rpc('fail_job_processing', {
        p_job_id: job_id,
        p_error_message: processingError instanceof Error ? processingError.message : 'Unknown processing error'
      });

      return NextResponse.json({ 
        error: `Service processing failed: ${processingError instanceof Error ? processingError.message : 'Unknown error'}`
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Service processing API error:', error);
    
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

// GET endpoint to check service job status
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const job_id = url.searchParams.get('job_id');

    if (!job_id) {
      return NextResponse.json({ 
        error: 'job_id parameter is required' 
      }, { status: 400 });
    }

    const supabase = createClient();

    // Get service job status and details
    const { data: job, error: jobError } = await supabase
      .from('service_jobs')
      .select(`
        id,
        service_type,
        status,
        progress,
        version_ids,
        result_data,
        error_message,
        is_public,
        created_at,
        updated_at
      `)
      .eq('id', job_id)
      .single();

    if (jobError || !job) {
      return NextResponse.json({ 
        error: 'Service job not found' 
      }, { status: 404 });
    }

    // Get processing status of individual versions
    const versionStatuses = [];
    if (job.version_ids && job.version_ids.length > 0) {
      const { data: versions, error: versionsError } = await supabase
        .from('document_versions')
        .select(`
          id,
          processing_status,
          processing_progress,
          pages,
          processing_error,
          documents(id, title)
        `)
        .in('id', job.version_ids);

      if (!versionsError && versions) {
        versionStatuses.push(...versions);
      }
    }

    return NextResponse.json({
      job_id,
      service_type: job.service_type,
      status: job.status,
      progress: job.progress,
      version_count: job.version_ids ? job.version_ids.length : 0,
      version_statuses: versionStatuses,
      result_data: job.result_data,
      error_message: job.error_message,
      is_public: job.is_public,
      created_at: job.created_at,
      updated_at: job.updated_at
    });

  } catch (error) {
    console.error('Service job status check error:', error);
    
    return NextResponse.json({ 
      error: 'Failed to check service job status' 
    }, { status: 500 });
  }
}