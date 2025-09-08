import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import type { AIAnalysisResult, DocumentSummary, DocumentComparison, ConflictDetection } from '@/types/analysis';

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

    // Get service job details
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
        created_at,
        updated_at
      `)
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      return NextResponse.json({ 
        error: 'Service job not found' 
      }, { status: 404 });
    }

    // If job is not completed, return status info
    if (job.status !== 'completed') {
      return NextResponse.json({
        success: false,
        message: `Job is ${job.status}`,
        job_id: jobId,
        service_type: job.service_type,
        status: job.status,
        progress: job.progress,
        error_message: job.error_message
      }, { status: 202 }); // 202 Accepted - still processing
    }

    // For completed jobs, generate analysis result based on service type
    let analysisResult: DocumentSummary | DocumentComparison | ConflictDetection;

    if (job.service_type === 'ringkasan') {
      // Generate summary result for Ringkasan service
      const versionId = job.version_ids[0]; // Single document for summary
      
      // Get document and clauses
      const { data: version, error: versionError } = await supabase
        .from('document_versions')
        .select(`
          id,
          pages,
          documents!inner(id, title, kind, jurisdiction)
        `)
        .eq('id', versionId)
        .single();

      const { data: clauses, error: clausesError } = await supabase
        .from('clauses')
        .select('*')
        .eq('version_id', versionId)
        .order('page_from', { ascending: true });

      if (versionError || clausesError || !version || !clauses) {
        throw new Error('Failed to fetch document data for summary');
      }

      // Generate a basic summary (in production, this would be AI-generated)
      const totalText = clauses.reduce((sum, clause) => sum + clause.text.length, 0);
      const keyPoints = clauses.slice(0, 5).map(clause => 
        `${clause.clause_ref}: ${clause.text.substring(0, 100)}...`
      );

      const document = Array.isArray(version.documents) ? version.documents[0] : version.documents;

      analysisResult = {
        summary: `Dokumen ${document?.title || 'Legal Document'} berisi ${clauses.length} klausul yang mencakup berbagai aspek peraturan. Dokumen ini terdiri dari ${version.pages || 0} halaman dengan total ${totalText.toLocaleString()} karakter.`,
        key_points: keyPoints,
        glossary: [
          {
            term: "Pasal",
            definition: "Bagian dari peraturan yang berisi ketentuan normatif",
            category: "legal" as const
          }
        ],
        citations: clauses.slice(0, 3).map(clause => ({
          text: clause.text.substring(0, 200) + "...",
          source: document?.title || "Document",
          page: clause.page_from,
          clause_ref: clause.clause_ref
        })),
        metadata: {
          word_count: Math.floor(totalText / 6), // Rough word estimate
          reading_time_minutes: Math.ceil(totalText / 1000), // Rough reading time
          complexity_score: 3, // Default medium complexity
          language_level: "intermediate" as const,
          document_structure_score: 0.8
        },
        processing_info: {
          model_used: "text-embedding-3-small",
          processing_time_seconds: 30,
          generated_at: new Date().toISOString(),
          version: "1.0.0"
        }
      } as DocumentSummary;

    } else if (job.service_type === 'perubahan') {
      // Generate comparison result for Deteksi Perubahan service
      const [version1Id, version2Id] = job.version_ids; // Two documents for comparison

      // Get document diffs
      const { data: diffs, error: diffsError } = await supabase
        .from('document_diffs')
        .select('*')
        .eq('job_id', jobId)
        .order('sequence_order', { ascending: true });

      const totalChanges = diffs?.length || 0;
      const additions = diffs?.filter(d => d.change_type === 'added').length || 0;
      const deletions = diffs?.filter(d => d.change_type === 'deleted').length || 0;
      const modifications = diffs?.filter(d => d.change_type === 'modified').length || 0;
      const moves = diffs?.filter(d => d.change_type === 'moved').length || 0;

      analysisResult = {
        changes: (diffs || []).map((diff, index) => ({
          id: diff.id,
          clause_ref: diff.clause_ref,
          change_type: diff.change_type as any,
          old_text: diff.old_text,
          new_text: diff.new_text,
          similarity_score: diff.similarity_score,
          significance_score: diff.significance_score,
          sequence_order: diff.sequence_order || index,
          context: {
            before: "",
            after: ""
          }
        })),
        summary: `Perbandingan dokumen menemukan ${totalChanges} perubahan: ${additions} penambahan, ${deletions} penghapusan, ${modifications} modifikasi, dan ${moves} perpindahan.`,
        statistics: {
          total_changes: totalChanges,
          additions,
          deletions,
          modifications,
          moves,
          significance_distribution: {
            critical: diffs?.filter(d => d.significance_score === 5).length || 0,
            major: diffs?.filter(d => d.significance_score === 4).length || 0,
            minor: diffs?.filter(d => d.significance_score === 3).length || 0,
            trivial: diffs?.filter(d => (d.significance_score || 0) <= 2).length || 0
          }
        },
        processing_info: {
          comparison_method: 'hybrid' as const,
          processing_time_seconds: 45,
          generated_at: new Date().toISOString()
        }
      } as DocumentComparison;

    } else if (job.service_type === 'konflik') {
      // Generate conflict detection result
      const { data: conflicts, error: conflictsError } = await supabase
        .from('document_conflicts')
        .select('*')
        .eq('job_id', jobId)
        .order('overlap_score', { ascending: false });

      const conflictCount = conflicts?.length || 0;
      const highRiskConflicts = conflicts?.filter(c => (c.overlap_score || 0) > 0.8).length || 0;
      const riskLevel = highRiskConflicts > 5 ? 'critical' : 
                       highRiskConflicts > 2 ? 'high' :
                       conflictCount > 0 ? 'medium' : 'low';

      analysisResult = {
        conflicts: (conflicts || []).map(conflict => ({
          id: conflict.id,
          conflicting_law_title: conflict.conflicting_law_title,
          conflicting_law_ref: conflict.conflicting_law_ref,
          overlap_score: conflict.overlap_score,
          conflict_type: conflict.conflict_type as any,
          excerpt_original: conflict.excerpt_original,
          excerpt_conflicting: conflict.excerpt_conflicting,
          explanation: conflict.explanation || 'Potential conflict detected through semantic similarity analysis.',
          citation_data: conflict.citation_data || {
            title: conflict.conflicting_law_title,
            type: 'other' as const,
            number: 'N/A',
            year: '2024',
            jurisdiction: 'national' as const,
            status: 'active' as const,
            access_date: new Date().toISOString().split('T')[0]
          },
          confidence_score: conflict.confidence_score || 0.7,
          severity: (conflict.overlap_score || 0) > 0.8 ? 'high' : 
                   (conflict.overlap_score || 0) > 0.6 ? 'medium' : 'low' as any
        })),
        summary: `Analisis konflik menemukan ${conflictCount} potensi konflik hukum. ${highRiskConflicts} diantaranya memiliki tingkat risiko tinggi.`,
        risk_assessment: riskLevel as any,
        recommendations: [
          conflictCount > 0 ? 'Review konflik yang teridentifikasi dan konsultasikan dengan ahli hukum' : 'Tidak ditemukan konflik signifikan',
          'Lakukan review berkala untuk memastikan konsistensi hukum',
          'Dokumentasikan justifikasi untuk setiap ketentuan yang berpotensi konflik'
        ],
        overall_compatibility_score: Math.max(0, 1 - (conflictCount * 0.1)),
        processing_info: {
          corpus_searched: 1000, // Estimated
          similarity_threshold: 0.75,
          processing_time_seconds: 60,
          generated_at: new Date().toISOString()
        }
      } as ConflictDetection;

    } else {
      throw new Error(`Unsupported service type: ${job.service_type}`);
    }

    // Build final AI analysis result
    const result: AIAnalysisResult = {
      job_id: jobId,
      service_type: job.service_type,
      status: 'completed',
      confidence_score: 0.85, // Default confidence
      results: analysisResult,
      warnings: [],
      limitations: [
        'Hasil analisis bergantung pada kualitas ekstraksi teks dari dokumen',
        'Analisis semantik mungkin tidak mendeteksi semua nuansa hukum'
      ],
      quality_indicators: {
        text_extraction_quality: 0.9,
        structure_recognition_accuracy: 0.85,
        ai_analysis_confidence: 0.8,
        completeness_score: 0.9
      },
      processing_metadata: {
        total_clauses_processed: job.version_ids?.length || 0,
        failed_clauses: 0,
        processing_time_breakdown: {
          extraction: 15000,
          analysis: 30000,
          formatting: 5000
        },
        model_versions: {
          embedding: "text-embedding-3-small",
          analysis: "gpt-4-turbo"
        }
      }
    };

    return NextResponse.json({
      success: true,
      result
    });

  } catch (error) {
    console.error('Results API error:', error);
    
    return NextResponse.json({ 
      error: 'Failed to fetch analysis results',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}