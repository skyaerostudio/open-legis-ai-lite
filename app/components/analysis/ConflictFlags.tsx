'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  AlertTriangle, 
  ExternalLink, 
  Copy, 
  CheckCircle, 
  Info,
  Scale,
  FileText,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { useState } from 'react';

interface ConflictCitation {
  title: string;
  article?: string;
  paragraph?: string;
  url?: string;
}

interface ConflictResult {
  law_ref: string;
  overlap_score: number;
  excerpt: string;
  citation: ConflictCitation;
  explanation: string;
}

interface ConflictFlagsProps {
  conflicts: ConflictResult[];
  documentTitle: string;
  className?: string;
}

export default function ConflictFlags({ 
  conflicts, 
  documentTitle, 
  className = '' 
}: ConflictFlagsProps) {
  const [expandedConflicts, setExpandedConflicts] = useState<Set<number>>(new Set());
  const [copiedItem, setCopiedItem] = useState<string | null>(null);

  const toggleConflictExpansion = (index: number) => {
    const newExpanded = new Set(expandedConflicts);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedConflicts(newExpanded);
  };

  const copyToClipboard = async (text: string, itemId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedItem(itemId);
      setTimeout(() => setCopiedItem(null), 2000);
    } catch (error) {
      console.error('Failed to copy text:', error);
    }
  };

  const getSeverityColor = (score: number) => {
    if (score >= 0.8) return 'text-red-600 bg-red-50 border-red-200';
    if (score >= 0.6) return 'text-orange-600 bg-orange-50 border-orange-200';
    return 'text-yellow-600 bg-yellow-50 border-yellow-200';
  };

  const getSeverityIcon = (score: number) => {
    if (score >= 0.8) return <AlertTriangle className="h-5 w-5 text-red-600" />;
    if (score >= 0.6) return <AlertTriangle className="h-5 w-5 text-orange-600" />;
    return <Info className="h-5 w-5 text-yellow-600" />;
  };

  const getSeverityLabel = (score: number) => {
    if (score >= 0.8) return 'High Risk';
    if (score >= 0.6) return 'Medium Risk';
    return 'Low Risk';
  };

  const formatCitation = (citation: ConflictCitation) => {
    let formatted = citation.title;
    if (citation.article) formatted += `, ${citation.article}`;
    if (citation.paragraph) formatted += `, ${citation.paragraph}`;
    return formatted;
  };

  if (conflicts.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <CheckCircle className="mx-auto h-12 w-12 text-green-600 mb-4" />
            <h3 className="text-lg font-semibold text-green-900 mb-2">No Conflicts Detected</h3>
            <p className="text-sm text-green-700">
              No potential legal conflicts were found with existing legislation in our database.
            </p>
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg text-xs text-green-600">
              <p>
                <strong>Note:</strong> This analysis is based on available documents in the system. 
                Manual review is still recommended for comprehensive legal assessment.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-3">
            <AlertTriangle className="h-6 w-6 text-orange-600" />
            <div className="flex-1">
              <h2 className="text-xl font-bold">Conflict Detection Results</h2>
              <p className="text-sm text-muted-foreground font-normal mt-1">
                {conflicts.length} potential conflict{conflicts.length === 1 ? '' : 's'} found in {documentTitle}
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-orange-600">{conflicts.length}</div>
              <div className="text-xs text-muted-foreground">conflicts</div>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4 text-sm">
            <div className="flex items-center space-x-2">
              <Scale className="h-4 w-4" />
              <span>AI-powered legal analysis</span>
            </div>
            <div className="flex items-center space-x-2">
              <FileText className="h-4 w-4" />
              <span>Cross-referenced against database</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Disclaimer */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start space-x-3">
          <Info className="h-5 w-5 text-blue-600 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-blue-800">Legal Analysis Disclaimer</p>
            <p className="text-blue-700 mt-1">
              These conflict detections are generated by AI analysis and represent potential areas of concern. 
              They require professional legal review and should not be considered as legal advice. 
              Always consult with qualified legal professionals for definitive analysis.
            </p>
          </div>
        </div>
      </div>

      {/* Conflict List */}
      <div className="space-y-4">
        {conflicts.map((conflict, index) => (
          <Card key={index} className={`border-l-4 ${getSeverityColor(conflict.overlap_score).split(' ').slice(1).join(' ')}`}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    {getSeverityIcon(conflict.overlap_score)}
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSeverityColor(conflict.overlap_score)}`}>
                      {getSeverityLabel(conflict.overlap_score)} ({Math.round(conflict.overlap_score * 100)}% similarity)
                    </span>
                  </div>
                  
                  <h3 className="font-semibold text-lg leading-tight">
                    Potential Conflict with {conflict.law_ref}
                  </h3>
                  
                  <p className="text-sm text-muted-foreground mt-1">
                    {formatCitation(conflict.citation)}
                  </p>
                </div>
                
                <div className="flex space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(
                      `Conflict: ${conflict.law_ref}\nSimilarity: ${Math.round(conflict.overlap_score * 100)}%\nExplanation: ${conflict.explanation}\nSource: ${formatCitation(conflict.citation)}`,
                      `conflict-${index}`
                    )}
                  >
                    {copiedItem === `conflict-${index}` ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleConflictExpansion(index)}
                  >
                    {expandedConflicts.has(index) ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-0">
              {/* Brief explanation */}
              <div className="mb-4">
                <h4 className="font-medium text-sm mb-2">Conflict Analysis:</h4>
                <p className="text-sm leading-relaxed">
                  {conflict.explanation.split('\n')[0]}
                </p>
              </div>

              {/* Expanded details */}
              {expandedConflicts.has(index) && (
                <div className="space-y-4 pt-4 border-t border-border">
                  {/* Full explanation */}
                  <div>
                    <h4 className="font-medium text-sm mb-2">Detailed Analysis:</h4>
                    <div className="text-sm leading-relaxed space-y-2">
                      {conflict.explanation.split('\n').map((line, lineIndex) => (
                        <p key={lineIndex}>{line}</p>
                      ))}
                    </div>
                  </div>

                  {/* Conflicting text excerpt */}
                  <div>
                    <h4 className="font-medium text-sm mb-2">Conflicting Text Excerpt:</h4>
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-sm italic leading-relaxed">
                        "{conflict.excerpt}"
                      </p>
                    </div>
                  </div>

                  {/* Citation details */}
                  <div>
                    <h4 className="font-medium text-sm mb-2">Source Citation:</h4>
                    <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div className="text-sm">
                        <p className="font-medium">{conflict.citation.title}</p>
                        {conflict.citation.article && (
                          <p className="text-muted-foreground">Article: {conflict.citation.article}</p>
                        )}
                        {conflict.citation.paragraph && (
                          <p className="text-muted-foreground">Paragraph: {conflict.citation.paragraph}</p>
                        )}
                      </div>
                      
                      {conflict.citation.url && (
                        <Button variant="outline" size="sm" asChild>
                          <a href={conflict.citation.url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="mr-2 h-4 w-4" />
                            View Source
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Action Buttons */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => copyToClipboard(
                conflicts.map((c, i) => `${i + 1}. ${c.law_ref} (${Math.round(c.overlap_score * 100)}% similarity)\n   ${c.explanation.split('\n')[0]}\n   Source: ${formatCitation(c.citation)}`).join('\n\n'),
                'all-conflicts'
              )}
            >
              {copiedItem === 'all-conflicts' ? (
                <CheckCircle className="mr-2 h-4 w-4" />
              ) : (
                <Copy className="mr-2 h-4 w-4" />
              )}
              Copy All Conflicts
            </Button>
            
            <Button variant="outline">
              <FileText className="mr-2 h-4 w-4" />
              Export Report
            </Button>
            
            <Button variant="outline">
              <ExternalLink className="mr-2 h-4 w-4" />
              Share Analysis
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}