import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const jobId = id;

    if (!jobId) {
      return NextResponse.json({ 
        error: 'Job ID is required' 
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
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      return NextResponse.json({ 
        error: 'Job not found' 
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
      success: true,
      job: {
        id: job.id,
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
      }
    });

  } catch (error) {
    console.error('Jobs API error:', error);
    
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}