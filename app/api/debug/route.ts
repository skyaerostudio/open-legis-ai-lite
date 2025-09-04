import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const action = url.searchParams.get('action');
    const versionId = url.searchParams.get('version_id');

    const supabase = createClient();

    switch (action) {
      case 'storage':
        // Check storage bucket and list files
        const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
        
        if (bucketError) {
          return NextResponse.json({ 
            error: 'Failed to list buckets', 
            details: bucketError.message 
          });
        }

        const documentsBucket = buckets.find(b => b.name === 'documents');
        
        if (!documentsBucket) {
          return NextResponse.json({ 
            error: 'Documents bucket not found', 
            available_buckets: buckets.map(b => b.name) 
          });
        }

        // List files in documents bucket
        const { data: files, error: filesError } = await supabase.storage
          .from('documents')
          .list('', { limit: 10 });

        return NextResponse.json({
          bucket_exists: true,
          bucket_info: documentsBucket,
          files: files || [],
          files_error: filesError?.message
        });

      case 'database':
        // Check database connectivity and tables
        const { data: documents, error: docError } = await supabase
          .from('documents')
          .select('id, title, created_at')
          .limit(5);

        const { data: versions, error: versionError } = await supabase
          .from('document_versions')
          .select('id, processing_status, created_at')
          .limit(5);

        const { count: docCount } = await supabase
          .from('documents')
          .select('*', { count: 'exact', head: true });

        const { count: versionCount } = await supabase
          .from('document_versions')
          .select('*', { count: 'exact', head: true });

        return NextResponse.json({
          database_connected: true,
          documents: { 
            sample: documents || [], 
            count: docCount || 0, 
            error: docError?.message 
          },
          versions: { 
            sample: versions || [], 
            count: versionCount || 0, 
            error: versionError?.message 
          }
        });

      case 'download':
        // Test file download for specific version
        if (!versionId) {
          return NextResponse.json({ 
            error: 'version_id parameter required for download test' 
          }, { status: 400 });
        }

        const { data: version, error: versionError2 } = await supabase
          .from('document_versions')
          .select('*')
          .eq('id', versionId)
          .single();

        if (versionError2 || !version) {
          return NextResponse.json({ 
            error: 'Version not found', 
            details: versionError2?.message 
          }, { status: 404 });
        }

        try {
          const { data: fileData, error: downloadError } = await supabase.storage
            .from('documents')
            .download(version.storage_path);

          if (downloadError || !fileData) {
            return NextResponse.json({ 
              error: 'Download failed', 
              details: downloadError?.message,
              storage_path: version.storage_path
            });
          }

          const fileSize = fileData.size;
          return NextResponse.json({
            download_success: true,
            version,
            file_size: fileSize,
            storage_path: version.storage_path
          });

        } catch (downloadError) {
          return NextResponse.json({ 
            error: 'Download exception', 
            details: downloadError instanceof Error ? downloadError.message : 'Unknown error',
            storage_path: version.storage_path
          });
        }

      case 'env':
        // Check environment variables (without exposing sensitive values)
        return NextResponse.json({
          supabase_url: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Missing',
          supabase_anon_key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Set' : 'Missing',
          supabase_service_key: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Set' : 'Missing',
          openai_api_key: process.env.OPENAI_API_KEY ? 'Set' : 'Missing',
          base_url: process.env.NEXT_PUBLIC_BASE_URL || 'Not set'
        });

      default:
        return NextResponse.json({
          available_actions: ['storage', 'database', 'download', 'env'],
          usage: {
            storage: 'GET /api/debug?action=storage',
            database: 'GET /api/debug?action=database', 
            download: 'GET /api/debug?action=download&version_id=<uuid>',
            env: 'GET /api/debug?action=env'
          }
        });
    }

  } catch (error) {
    console.error('Debug endpoint error:', error);
    return NextResponse.json({ 
      error: 'Debug endpoint failed', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}