import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { generateDocumentSummary, findConflicts, getAnalysisResults } from '@/lib/rag-retriever';

export async function POST(request: NextRequest) {
  console.log('Analysis request received');

  try {
    const body = await request.json();
    const { version_id, analysis_type = 'full' } = body;

    if (!version_id) {
      return NextResponse.json({ 
        error: 'version_id is required' 
      }, { status: 400 });
    }

    const supabase = createClient();

    // Verify version exists and is completed
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

    if (version.processing_status !== 'completed') {
      return NextResponse.json({ 
        error: `Document not ready for analysis. Status: ${version.processing_status}`,
        current_status: version.processing_status
      }, { status: 400 });
    }

    console.log(`Starting ${analysis_type} analysis for version ${version_id}`);

    try {
      let result;

      switch (analysis_type) {
        case 'summary':
          result = {
            summary: await generateDocumentSummary(version_id),
            analysis_type: 'summary'
          };
          break;
          
        case 'conflicts':
          result = {
            conflicts: await findConflicts(version_id),
            analysis_type: 'conflicts'
          };
          break;
          
        case 'full':
        default:
          result = {
            ...await getAnalysisResults(version_id),
            analysis_type: 'full'
          };
          break;
      }

      console.log(`Analysis completed for version ${version_id}`);

      return NextResponse.json({
        success: true,
        version_id,
        ...result,
        analysis_timestamp: new Date().toISOString()
      });

    } catch (analysisError) {
      console.error('Analysis processing error:', analysisError);
      
      return NextResponse.json({ 
        error: `Analysis failed: ${analysisError instanceof Error ? analysisError.message : 'Unknown error'}`
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Analysis API error:', error);
    
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const version_id = url.searchParams.get('version_id');
    const cached_only = url.searchParams.get('cached_only') === 'true';

    if (!version_id) {
      return NextResponse.json({ 
        error: 'version_id parameter is required' 
      }, { status: 400 });
    }

    const supabase = createClient();

    // Get basic version info
    const { data: version, error: versionError } = await supabase
      .from('document_versions')
      .select(`
        id,
        processing_status,
        pages,
        created_at,
        document_id,
        version_label,
        documents (
          title,
          kind,
          jurisdiction
        )
      `)
      .eq('id', version_id)
      .single();

    if (versionError || !version) {
      return NextResponse.json({ 
        error: 'Document version not found' 
      }, { status: 404 });
    }

    // Check if analysis is available (if requested cached only)
    if (cached_only && version.processing_status !== 'completed') {
      return NextResponse.json({
        available: false,
        status: version.processing_status,
        message: 'Analysis not yet available'
      });
    }

    // Get clause count
    const { count: clauseCount } = await supabase
      .from('clauses')
      .select('*', { count: 'exact', head: true })
      .eq('version_id', version_id);

    // Check for existing conflicts
    const { data: existingConflicts, count: conflictCount } = await supabase
      .from('conflicts')
      .select('*', { count: 'exact' })
      .eq('version_id', version_id);

    const response = {
      version_id,
      document: version.documents,
      version_info: {
        version_label: version.version_label,
        processing_status: version.processing_status,
        pages: version.pages,
        created_at: version.created_at
      },
      analysis_status: {
        clauses_processed: clauseCount || 0,
        conflicts_found: conflictCount || 0,
        can_analyze: version.processing_status === 'completed',
        last_updated: version.created_at
      }
    };

    // If not cached_only and document is ready, perform analysis
    if (!cached_only && version.processing_status === 'completed') {
      try {
        // Only generate summary for GET requests, not full analysis
        const summary = await generateDocumentSummary(version_id);
        (response as any).summary = summary;
      } catch (error) {
        console.warn('Could not generate summary for GET request:', error);
        // Don't fail the whole request if summary generation fails
      }
    }

    return NextResponse.json(response);

  } catch (error) {
    console.error('Analysis GET error:', error);
    
    return NextResponse.json({ 
      error: 'Failed to get analysis information' 
    }, { status: 500 });
  }
}