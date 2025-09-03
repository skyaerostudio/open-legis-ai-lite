import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { extractTextFromPDF } from '@/lib/pdf-processor';
import { generateBatchEmbeddings, validateOpenAIConfig } from '@/lib/embeddings';

export async function POST(request: NextRequest) {
  console.log('Document processing request received');

  try {
    // Parse request body
    const body = await request.json();
    const { version_id } = body;

    if (!version_id) {
      return NextResponse.json({ 
        error: 'version_id is required' 
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

    // Get document version info
    const { data: version, error: versionError } = await supabase
      .from('document_versions')
      .select('*')
      .eq('id', version_id)
      .single();

    if (versionError || !version) {
      return NextResponse.json({ 
        error: 'Document version not found' 
      }, { status: 404 });
    }

    // Check if already processing or completed
    if (version.processing_status === 'processing') {
      return NextResponse.json({ 
        message: 'Document is already being processed',
        status: 'processing'
      });
    }

    if (version.processing_status === 'completed') {
      return NextResponse.json({ 
        message: 'Document has already been processed',
        status: 'completed'
      });
    }

    // Update status to processing
    await supabase
      .from('document_versions')
      .update({ processing_status: 'processing' })
      .eq('id', version_id);

    console.log(`Starting processing for version ${version_id}`);

    try {
      // Download file from Supabase Storage
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('documents')
        .download(version.storage_path);

      if (downloadError || !fileData) {
        throw new Error(`Failed to download file: ${downloadError?.message || 'File not found'}`);
      }

      // Convert to Buffer for processing
      const fileBuffer = Buffer.from(await fileData.arrayBuffer());
      console.log(`Downloaded file: ${fileBuffer.length} bytes`);

      // Extract text and segment into clauses
      console.log('Starting PDF text extraction...');
      const processingResult = await extractTextFromPDF(fileBuffer);
      console.log(`Extraction complete: ${processingResult.segments.length} segments identified`);

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
        throw new Error(`Failed to store clauses: ${clauseError?.message}`);
      }

      console.log(`Stored ${insertedClauses.length} clauses in database`);

      // Generate embeddings for all clause texts
      console.log('Starting embedding generation...');
      const clauseTexts = processingResult.segments.map(segment => segment.text);
      const embeddingResult = await generateBatchEmbeddings(clauseTexts);
      
      console.log(`Generated ${embeddingResult.embeddings.length} embeddings using ${embeddingResult.total_tokens} tokens`);

      // Store embeddings in database
      const embeddingInserts = embeddingResult.embeddings.map((embeddingData, index) => ({
        clause_id: insertedClauses[index].id,
        vector: embeddingData.embedding
      }));

      const { error: embeddingError } = await supabase
        .from('embeddings')
        .insert(embeddingInserts);

      if (embeddingError) {
        throw new Error(`Failed to store embeddings: ${embeddingError.message}`);
      }

      console.log(`Stored ${embeddingInserts.length} embeddings in database`);

      // Update version with processing results
      await supabase
        .from('document_versions')
        .update({ 
          processing_status: 'completed',
          pages: processingResult.metadata.total_pages
        })
        .eq('id', version_id);

      console.log(`Processing completed successfully for version ${version_id}`);

      return NextResponse.json({
        success: true,
        message: 'Document processing completed successfully',
        processing_result: {
          version_id,
          segments_count: processingResult.segments.length,
          total_pages: processingResult.metadata.total_pages,
          text_length: processingResult.metadata.text_length,
          processing_method: processingResult.metadata.processing_method,
          tokens_used: embeddingResult.total_tokens,
          embeddings_generated: embeddingResult.embeddings.length
        }
      });

    } catch (processingError) {
      console.error('Processing error:', processingError);

      // Update status to failed
      await supabase
        .from('document_versions')
        .update({ processing_status: 'failed' })
        .eq('id', version_id);

      return NextResponse.json({ 
        error: `Processing failed: ${processingError instanceof Error ? processingError.message : 'Unknown error'}`
      }, { status: 500 });
    }

  } catch (error) {
    console.error('API error:', error);
    
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const version_id = url.searchParams.get('version_id');

    if (!version_id) {
      return NextResponse.json({ 
        error: 'version_id parameter is required' 
      }, { status: 400 });
    }

    const supabase = createClient();

    // Get processing status and basic info
    const { data: version, error: versionError } = await supabase
      .from('document_versions')
      .select(`
        id,
        processing_status,
        pages,
        created_at,
        document_id,
        version_label
      `)
      .eq('id', version_id)
      .single();

    if (versionError || !version) {
      return NextResponse.json({ 
        error: 'Document version not found' 
      }, { status: 404 });
    }

    // Get clause count if processing is completed
    let clauseCount = 0;
    if (version.processing_status === 'completed') {
      const { count } = await supabase
        .from('clauses')
        .select('*', { count: 'exact', head: true })
        .eq('version_id', version_id);
      
      clauseCount = count || 0;
    }

    return NextResponse.json({
      version_id,
      status: version.processing_status,
      document_id: version.document_id,
      version_label: version.version_label,
      pages: version.pages,
      clause_count: clauseCount,
      created_at: version.created_at
    });

  } catch (error) {
    console.error('Status check error:', error);
    
    return NextResponse.json({ 
      error: 'Failed to check processing status' 
    }, { status: 500 });
  }
}