import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const documentId = params.id;
    const url = new URL(request.url);
    const versionId = url.searchParams.get('version_id');

    if (!documentId) {
      return NextResponse.json({ 
        error: 'Document ID is required' 
      }, { status: 400 });
    }

    const supabase = createClient();

    // Get document information
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .single();

    if (docError || !document) {
      return NextResponse.json({ 
        error: 'Document not found' 
      }, { status: 404 });
    }

    // Get document versions
    let versionsQuery = supabase
      .from('document_versions')
      .select('*')
      .eq('document_id', documentId)
      .eq('processing_status', 'completed')
      .order('created_at', { ascending: false });

    const { data: versions, error: versionsError } = await versionsQuery;

    if (versionsError) {
      return NextResponse.json({ 
        error: 'Failed to fetch document versions' 
      }, { status: 500 });
    }

    if (!versions || versions.length === 0) {
      return NextResponse.json({ 
        error: 'No completed versions found for this document' 
      }, { status: 404 });
    }

    // Use specified version or latest completed version
    const targetVersion = versionId 
      ? versions.find(v => v.id === versionId) || versions[0]
      : versions[0];

    // Get clauses for the version
    const { data: clauses, error: clausesError } = await supabase
      .from('clauses')
      .select('*')
      .eq('version_id', targetVersion.id)
      .order('page_from', { ascending: true });

    if (clausesError) {
      return NextResponse.json({ 
        error: 'Failed to fetch clauses' 
      }, { status: 500 });
    }

    // Get clause counts by type (group by clause_ref patterns)
    const clauseStats = {
      total_clauses: clauses?.length || 0,
      articles: clauses?.filter(c => c.clause_ref?.toLowerCase().includes('pasal')).length || 0,
      paragraphs: clauses?.filter(c => c.clause_ref?.toLowerCase().includes('ayat')).length || 0,
      points: clauses?.filter(c => c.clause_ref?.toLowerCase().includes('huruf')).length || 0,
      chapters: clauses?.filter(c => c.clause_ref?.toLowerCase().includes('bab')).length || 0
    };

    // Get conflicts if any
    const { data: conflicts, error: conflictsError } = await supabase
      .from('conflicts')
      .select('*')
      .eq('version_id', targetVersion.id)
      .order('overlap_score', { ascending: false });

    // Get diffs if there are multiple versions
    let diffs = [];
    if (versions.length > 1) {
      const { data: diffsData, error: diffsError } = await supabase
        .from('diffs')
        .select('*')
        .or(`v_from.eq.${targetVersion.id},v_to.eq.${targetVersion.id}`)
        .limit(50);
      
      if (!diffsError && diffsData) {
        diffs = diffsData;
      }
    }

    // Prepare response data
    const response = {
      document,
      version: targetVersion,
      versions: versions.map(v => ({
        id: v.id,
        version_label: v.version_label,
        pages: v.pages,
        created_at: v.created_at
      })),
      analysis: {
        clauses_count: clauseStats.total_clauses,
        pages_count: targetVersion.pages,
        clause_stats: clauseStats,
        processing_date: targetVersion.created_at,
        text_length: clauses?.reduce((sum, clause) => sum + clause.text.length, 0) || 0
      },
      clauses: clauses || [],
      conflicts: conflicts || [],
      diffs: diffs,
      has_conflicts: (conflicts?.length || 0) > 0,
      has_diffs: diffs.length > 0,
      summary: {
        document_type: document.kind || 'Legal Document',
        jurisdiction: document.jurisdiction || 'Indonesia',
        total_sections: clauseStats.total_clauses,
        key_statistics: [
          { label: 'Total Clauses', value: clauseStats.total_clauses },
          { label: 'Articles (Pasal)', value: clauseStats.articles },
          { label: 'Paragraphs (Ayat)', value: clauseStats.paragraphs },
          { label: 'Points (Huruf)', value: clauseStats.points },
          { label: 'Pages', value: targetVersion.pages || 0 },
          { label: 'Potential Conflicts', value: conflicts?.length || 0 }
        ]
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Results API error:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}