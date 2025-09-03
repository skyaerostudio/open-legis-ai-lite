import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';

// Configure maximum file size (50MB)
const MAX_FILE_SIZE = 50 * 1024 * 1024;
const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'text/html',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
];

export async function POST(request: NextRequest) {
  console.log('File upload request received');

  try {
    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const title = formData.get('title') as string;
    const kind = formData.get('kind') as string;
    const jurisdiction = formData.get('jurisdiction') as string;

    // Validate file presence
    if (!file) {
      return NextResponse.json({ 
        error: 'No file provided' 
      }, { status: 400 });
    }

    // Validate file type
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      return NextResponse.json({ 
        error: `Unsupported file type: ${file.type}. Supported types: PDF, HTML, DOC, DOCX` 
      }, { status: 400 });
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      const sizeMB = Math.round(file.size / (1024 * 1024));
      return NextResponse.json({ 
        error: `File too large: ${sizeMB}MB. Maximum size: 50MB` 
      }, { status: 400 });
    }

    // Use original filename or provided title
    const documentTitle = title || file.name.replace(/\.[^/.]+$/, ''); // Remove file extension

    console.log(`Processing file: ${file.name} (${Math.round(file.size / 1024)}KB, ${file.type})`);

    const supabase = createClient();

    // Generate unique filename to avoid conflicts
    const timestamp = Date.now();
    const fileExtension = file.name.split('.').pop() || 'pdf';
    const fileName = `${timestamp}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

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
        console.error('Storage upload error:', uploadError);
        return NextResponse.json({ 
          error: `Upload failed: ${uploadError.message}` 
        }, { status: 500 });
      }

      console.log(`File uploaded to storage: ${uploadData.path}`);

      // Create document record
      const { data: document, error: docError } = await supabase
        .from('documents')
        .insert({
          title: documentTitle,
          kind: kind || 'uploaded',
          jurisdiction: jurisdiction || null
        })
        .select()
        .single();

      if (docError) {
        console.error('Document creation error:', docError);
        
        // Clean up uploaded file
        await supabase.storage
          .from('documents')
          .remove([uploadData.path]);

        return NextResponse.json({ 
          error: `Failed to create document record: ${docError.message}` 
        }, { status: 500 });
      }

      console.log(`Document created: ${document.id}`);

      // Create document version record
      const { data: version, error: versionError } = await supabase
        .from('document_versions')
        .insert({
          document_id: document.id,
          version_label: 'v1',
          storage_path: uploadData.path,
          processing_status: 'pending',
          pages: null // Will be updated after processing
        })
        .select()
        .single();

      if (versionError) {
        console.error('Version creation error:', versionError);
        
        // Clean up document and uploaded file
        await supabase.from('documents').delete().eq('id', document.id);
        await supabase.storage
          .from('documents')
          .remove([uploadData.path]);

        return NextResponse.json({ 
          error: `Failed to create version record: ${versionError.message}` 
        }, { status: 500 });
      }

      console.log(`Version created: ${version.id}`);

      // Trigger background processing (async, don't wait)
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 
                     request.headers.get('origin') || 
                     'http://localhost:3000';

      fetch(`${baseUrl}/api/process`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'User-Agent': 'internal-processing'
        },
        body: JSON.stringify({ version_id: version.id })
      }).catch(error => {
        console.error('Background processing trigger failed:', error);
        // Mark version as failed to process
        supabase
          .from('document_versions')
          .update({ processing_status: 'failed' })
          .eq('id', version.id)
          .then(() => console.log('Version marked as failed'));
      });

      console.log('Background processing triggered');

      return NextResponse.json({
        success: true,
        message: 'File uploaded successfully, processing started',
        document: {
          id: document.id,
          title: document.title,
          kind: document.kind,
          jurisdiction: document.jurisdiction,
          created_at: document.created_at
        },
        version: {
          id: version.id,
          version_label: version.version_label,
          processing_status: version.processing_status,
          created_at: version.created_at
        },
        file_info: {
          original_name: file.name,
          size_bytes: file.size,
          type: file.type,
          storage_path: uploadData.path
        }
      });

    } catch (storageError) {
      console.error('Storage operation failed:', storageError);
      return NextResponse.json({ 
        error: 'Storage operation failed' 
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Upload API error:', error);
    
    if (error instanceof Error && error.message.includes('FormData')) {
      return NextResponse.json({ 
        error: 'Invalid form data' 
      }, { status: 400 });
    }
    
    return NextResponse.json({ 
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