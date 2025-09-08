import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import type { ServiceTypeUnion } from '@/types/processing';
import type { Document, DocumentVersion } from '@/types/database';

// Configure maximum file size (50MB)
const MAX_FILE_SIZE = 50 * 1024 * 1024;
const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'text/html',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
];

// Service type validation
type ServiceValidationType = 'ringkasan' | 'konflik' | 'perubahan';

interface UploadRequest {
  service_type: ServiceValidationType;
  file?: File;
  file1?: File;
  file2?: File;
  title?: string;
  kind?: string;
  jurisdiction?: string;
}

interface UploadResponse {
  success: boolean;
  message: string;
  job_id?: string;
  documents?: Document[];
  versions?: DocumentVersion[];
  service_type?: ServiceValidationType;
  error?: string;
}

export async function POST(request: NextRequest) {
  console.log('Multi-service file upload request received');

  try {
    // Parse form data
    const formData = await request.formData();
    const serviceType = formData.get('service_type') as ServiceValidationType;
    const title = formData.get('title') as string;
    const kind = formData.get('kind') as string;
    const jurisdiction = formData.get('jurisdiction') as string;

    // Validate service type
    if (!serviceType || !['ringkasan', 'konflik', 'perubahan'].includes(serviceType)) {
      return NextResponse.json({ 
        error: 'Invalid or missing service_type. Must be: ringkasan, konflik, or perubahan' 
      }, { status: 400 });
    }

    // Get files based on service type
    let files: File[];
    if (serviceType === 'perubahan') {
      // For document comparison, we need exactly 2 files
      const file1 = formData.get('file1') as File;
      const file2 = formData.get('file2') as File;
      
      if (!file1 || !file2) {
        return NextResponse.json({ 
          error: 'Deteksi Perubahan requires exactly 2 files (file1 and file2)' 
        }, { status: 400 });
      }
      files = [file1, file2];
    } else {
      // For summary and conflict detection, we need 1 file
      const file = formData.get('file') as File;
      
      if (!file) {
        return NextResponse.json({ 
          error: `${serviceType === 'ringkasan' ? 'Ringkasan Bahasa Sederhana' : 'Deteksi Konflik'} requires exactly 1 file` 
        }, { status: 400 });
      }
      files = [file];
    }

    // Validate all files
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileLabel = files.length > 1 ? `file${i + 1}` : 'file';
      
      // Validate file type
      if (!ALLOWED_FILE_TYPES.includes(file.type)) {
        return NextResponse.json({ 
          error: `${fileLabel}: Unsupported file type: ${file.type}. Supported types: PDF, HTML, DOC, DOCX` 
        }, { status: 400 });
      }

      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        const sizeMB = Math.round(file.size / (1024 * 1024));
        return NextResponse.json({ 
          error: `${fileLabel}: File too large: ${sizeMB}MB. Maximum size: 50MB` 
        }, { status: 400 });
      }
      
      // Service-specific validation
      if (serviceType === 'perubahan' && file.type !== 'application/pdf') {
        return NextResponse.json({
          error: `${fileLabel}: Deteksi Perubahan currently supports PDF files only`
        }, { status: 400 });
      }
    }

    console.log(`Processing ${files.length} file(s) for service: ${serviceType}`);
    files.forEach((file, i) => {
      console.log(`File ${i + 1}: ${file.name} (${Math.round(file.size / 1024)}KB, ${file.type})`);
    });

    const supabase = createClient();
    const timestamp = Date.now();
    
    // Arrays to store created documents and versions
    const createdDocuments: Document[] = [];
    const createdVersions: DocumentVersion[] = [];
    const uploadedPaths: string[] = [];
    
    try {
      // Process each file atomically
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileLabel = files.length > 1 ? ` (Document ${i + 1})` : '';
        const documentTitle = title ? `${title}${fileLabel}` : file.name.replace(/\.[^/.]+$/, '');
        
        // Generate unique filename
        const fileExtension = file.name.split('.').pop() || 'pdf';
        const fileName = `${timestamp}-${i + 1}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
        try {
          // Upload file to Supabase Storage
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('documents')
            .upload(fileName, file, {
              cacheControl: '3600',
              upsert: false,
              contentType: file.type
            });

          if (uploadError) {
            console.error(`File ${i + 1} storage upload error:`, uploadError);
            throw new Error(`File ${i + 1} upload failed: ${uploadError.message}`);
          }

          console.log(`File ${i + 1} uploaded to storage: ${uploadData.path}`);
          uploadedPaths.push(uploadData.path);

          // Create document record
          const { data: document, error: docError } = await supabase
            .from('documents')
            .insert({
              title: documentTitle,
              kind: kind || 'uploaded',
              jurisdiction: jurisdiction || null,
              language: 'id'
            })
            .select()
            .single();

          if (docError) {
            console.error(`Document ${i + 1} creation error:`, docError);
            throw new Error(`Failed to create document record: ${docError.message}`);
          }

          console.log(`Document ${i + 1} created: ${document.id}`);
          createdDocuments.push(document);

          // Create document version record
          const { data: version, error: versionError } = await supabase
            .from('document_versions')
            .insert({
              document_id: document.id,
              version_label: 'v1',
              storage_path: uploadData.path,
              processing_status: 'pending',
              processing_progress: 0,
              pages: null
            })
            .select()
            .single();

          if (versionError) {
            console.error(`Version ${i + 1} creation error:`, versionError);
            throw new Error(`Failed to create version record: ${versionError.message}`);
          }

          console.log(`Version ${i + 1} created: ${version.id}`);
          createdVersions.push(version);

        } catch (fileError) {
          console.error(`Error processing file ${i + 1}:`, fileError);
          throw fileError; // Re-throw to trigger cleanup
        }
      }

      // Create service job record
      const versionIds = createdVersions.map(v => v.id);
      const { data: serviceJob, error: jobError } = await supabase
        .from('service_jobs')
        .insert({
          service_type: serviceType as ServiceTypeUnion,
          status: 'pending',
          progress: 0,
          version_ids: versionIds,
          result_data: null,
          is_public: false
        })
        .select()
        .single();

      if (jobError) {
        console.error('Service job creation error:', jobError);
        throw new Error(`Failed to create service job: ${jobError.message}`);
      }

      console.log(`Service job created: ${serviceJob.id}`);

      // Trigger background processing
      const baseUrl = request.headers.get('origin') || 
                     process.env.NEXT_PUBLIC_BASE_URL || 
                     'http://localhost:3000';

      console.log(`Triggering ${serviceType} processing at: ${baseUrl}/api/process-service`);
      
      // Don't wait for processing trigger - it's async
      fetch(`${baseUrl}/api/process-service`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'User-Agent': 'internal-processing'
        },
        body: JSON.stringify({ job_id: serviceJob.id })
      }).then(response => {
        if (response.ok) {
          console.log('Background processing triggered successfully');
        } else {
          console.error('Background processing trigger failed with status:', response.status);
        }
      }).catch(error => {
        console.error('Background processing trigger failed:', error);
        // Mark job as failed
        supabase
          .rpc('fail_job_processing', {
            p_job_id: serviceJob.id,
            p_error_message: `Processing trigger failed: ${error.message}`
          })
          .then(() => console.log('Job marked as failed'));
      });

      return NextResponse.json({
        success: true,
        message: `${files.length} file(s) uploaded successfully for ${serviceType}, processing started`,
        job_id: serviceJob.id,
        service_type: serviceType,
        documents: createdDocuments.map(doc => ({
          id: doc.id,
          title: doc.title,
          kind: doc.kind,
          jurisdiction: doc.jurisdiction,
          created_at: doc.created_at
        })),
        versions: createdVersions.map(version => ({
          id: version.id,
          version_label: version.version_label,
          processing_status: version.processing_status,
          created_at: version.created_at
        })),
        files_info: files.map((file, i) => ({
          original_name: file.name,
          size_bytes: file.size,
          type: file.type,
          storage_path: uploadedPaths[i]
        }))
      });

    } catch (atomicError) {
      console.error('Atomic upload operation failed:', atomicError);
      
      // Rollback: Clean up any uploaded files and created records
      console.log('Starting rollback cleanup...');
      
      // Clean up storage files
      if (uploadedPaths.length > 0) {
        try {
          await supabase.storage
            .from('documents')
            .remove(uploadedPaths);
          console.log(`Cleaned up ${uploadedPaths.length} uploaded file(s)`);
        } catch (cleanupError) {
          console.error('Failed to clean up uploaded files:', cleanupError);
        }
      }
      
      // Clean up database records (cascading deletes will handle versions)
      if (createdDocuments.length > 0) {
        try {
          const documentIds = createdDocuments.map(doc => doc.id);
          await supabase
            .from('documents')
            .delete()
            .in('id', documentIds);
          console.log(`Cleaned up ${documentIds.length} document record(s)`);
        } catch (cleanupError) {
          console.error('Failed to clean up document records:', cleanupError);
        }
      }
      
      return NextResponse.json({ 
        success: false,
        error: atomicError instanceof Error ? atomicError.message : 'Upload operation failed'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Upload API error:', error);
    
    if (error instanceof Error && error.message.includes('FormData')) {
      return NextResponse.json({ 
        success: false,
        error: 'Invalid form data' 
      }, { status: 400 });
    }
    
    return NextResponse.json({ 
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}

// GET endpoint to list uploaded documents
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const offset = parseInt(url.searchParams.get('offset') || '0');

    const supabase = createClient();

    const { data: documents, error, count } = await supabase
      .from('documents')
      .select(`
        id,
        title,
        kind,
        jurisdiction,
        created_at,
        document_versions (
          id,
          version_label,
          processing_status,
          pages,
          created_at
        )
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Documents fetch error:', error);
      return NextResponse.json({ 
        error: 'Failed to fetch documents' 
      }, { status: 500 });
    }

    return NextResponse.json({
      documents: documents || [],
      pagination: {
        limit,
        offset,
        total: count || 0,
        has_more: (count || 0) > offset + limit
      }
    });

  } catch (error) {
    console.error('Documents list error:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}