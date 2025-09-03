import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { compareDocuments, createDiffRecord, getDiffSummary } from '@/lib/diff-engine';

export async function POST(request: NextRequest) {
  console.log('Diff comparison request received');

  try {
    const body = await request.json();
    const { version_from_id, version_to_id, options = {} } = body;

    if (!version_from_id || !version_to_id) {
      return NextResponse.json({ 
        error: 'Both version_from_id and version_to_id are required' 
      }, { status: 400 });
    }

    if (version_from_id === version_to_id) {
      return NextResponse.json({ 
        error: 'Cannot compare a version with itself' 
      }, { status: 400 });
    }

    const supabase = createClient();

    // Check if diff already exists
    const { data: existingDiff } = await supabase
      .from('diffs')
      .select('*')
      .eq('v_from', version_from_id)
      .eq('v_to', version_to_id)
      .limit(1);

    if (existingDiff && existingDiff.length > 0) {
      return NextResponse.json({
        success: true,
        message: 'Diff already exists',
        cached: true,
        diff_id: existingDiff[0].id,
        created_at: existingDiff[0].created_at
      });
    }

    // Get both document versions with their clauses
    const [versionFrom, versionTo] = await Promise.all([
      getVersionWithClauses(supabase, version_from_id),
      getVersionWithClauses(supabase, version_to_id)
    ]);

    if (!versionFrom) {
      return NextResponse.json({ 
        error: 'Source version not found or not processed' 
      }, { status: 404 });
    }

    if (!versionTo) {
      return NextResponse.json({ 
        error: 'Target version not found or not processed' 
      }, { status: 404 });
    }

    console.log(`Comparing versions: ${versionFrom.version_label} → ${versionTo.version_label}`);

    // Perform the diff
    const diffResult = await compareDocuments(versionFrom, versionTo, options);

    // Store the diff results in database
    const diffRecords = await createDiffRecord(version_from_id, version_to_id, diffResult);

    // Insert diff records
    const { data: insertedDiffs, error: insertError } = await supabase
      .from('diffs')
      .insert(diffRecords.records)
      .select();

    if (insertError) {
      console.error('Failed to store diff records:', insertError);
      return NextResponse.json({ 
        error: 'Failed to store comparison results' 
      }, { status: 500 });
    }

    console.log(`Diff completed: ${diffResult.changes.length} changes stored`);

    return NextResponse.json({
      success: true,
      message: 'Document comparison completed',
      diff_result: {
        version_from: versionFrom.version_label,
        version_to: versionTo.version_label,
        summary: getDiffSummary(diffResult),
        changes_count: diffResult.changes.length,
        summary_stats: diffResult.summary,
        confidence_score: diffResult.metadata.confidence_score,
        processing_time_ms: diffResult.metadata.processing_time_ms
      },
      diff_records: insertedDiffs?.length || 0
    });

  } catch (error) {
    console.error('Diff API error:', error);
    
    return NextResponse.json({ 
      error: 'Internal server error during comparison' 
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const version_from_id = url.searchParams.get('version_from_id');
    const version_to_id = url.searchParams.get('version_to_id');
    const document_id = url.searchParams.get('document_id');

    const supabase = createClient();

    if (version_from_id && version_to_id) {
      // Get specific diff between two versions
      const { data: diffs, error } = await supabase
        .from('diffs')
        .select('*')
        .eq('v_from', version_from_id)
        .eq('v_to', version_to_id)
        .order('created_at', { ascending: true });

      if (error) {
        throw error;
      }

      if (!diffs || diffs.length === 0) {
        return NextResponse.json({
          found: false,
          message: 'No comparison found between these versions'
        });
      }

      // Group diffs by change kind and calculate summary
      const summary = {
        total_changes: diffs.length,
        additions: diffs.filter(d => d.change_kind === 'added').length,
        deletions: diffs.filter(d => d.change_kind === 'deleted').length,
        modifications: diffs.filter(d => d.change_kind === 'modified').length
      };

      return NextResponse.json({
        found: true,
        version_from_id,
        version_to_id,
        summary,
        changes: diffs,
        created_at: diffs[0].created_at
      });

    } else if (document_id) {
      // Get all diffs for a document (between all version pairs)
      const { data: documentVersions, error: versionsError } = await supabase
        .from('document_versions')
        .select('id, version_label, created_at')
        .eq('document_id', document_id)
        .eq('processing_status', 'completed')
        .order('created_at', { ascending: true });

      if (versionsError) {
        throw versionsError;
      }

      if (!documentVersions || documentVersions.length < 2) {
        return NextResponse.json({
          document_id,
          available_comparisons: 0,
          message: 'Document needs at least 2 versions for comparison'
        });
      }

      // Get available diffs
      const versionIds = documentVersions.map(v => v.id);
      const { data: availableDiffs, error: diffsError } = await supabase
        .from('diffs')
        .select('v_from, v_to, created_at')
        .in('v_from', versionIds)
        .in('v_to', versionIds);

      if (diffsError) {
        throw diffsError;
      }

      // Create comparison matrix
      const comparisons = [];
      for (let i = 0; i < documentVersions.length - 1; i++) {
        for (let j = i + 1; j < documentVersions.length; j++) {
          const fromVersion = documentVersions[i];
          const toVersion = documentVersions[j];
          
          const existingDiff = availableDiffs?.find(
            d => d.v_from === fromVersion.id && d.v_to === toVersion.id
          );

          comparisons.push({
            from_version: fromVersion,
            to_version: toVersion,
            has_diff: !!existingDiff,
            diff_created: existingDiff?.created_at || null
          });
        }
      }

      return NextResponse.json({
        document_id,
        versions: documentVersions,
        available_comparisons: comparisons.length,
        completed_comparisons: comparisons.filter(c => c.has_diff).length,
        comparisons
      });

    } else {
      return NextResponse.json({ 
        error: 'Either (version_from_id AND version_to_id) OR document_id is required' 
      }, { status: 400 });
    }

  } catch (error) {
    console.error('Diff GET error:', error);
    
    return NextResponse.json({ 
      error: 'Failed to retrieve comparison data' 
    }, { status: 500 });
  }
}

/**
 * Helper function to get version with clauses
 */
async function getVersionWithClauses(supabase: any, versionId: string) {
  const { data: version, error: versionError } = await supabase
    .from('document_versions')
    .select(`
      id,
      version_label,
      processing_status,
      clauses (
        id,
        clause_ref,
        text,
        page_from,
        page_to
      )
    `)
    .eq('id', versionId)
    .single();

  if (versionError || !version) {
    return null;
  }

  if (version.processing_status !== 'completed') {
    return null;
  }

  return {
    id: version.id,
    version_label: version.version_label,
    clauses: version.clauses || []
  };
}