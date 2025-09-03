'use client';

import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  ChevronUp, 
  ChevronDown, 
  Eye, 
  EyeOff, 
  Copy, 
  CheckCircle,
  Plus,
  Minus,
  Edit3,
  RotateCcw,
  AlertTriangle,
  Info
} from 'lucide-react';

interface WordChange {
  added?: boolean;
  removed?: boolean;
  value: string;
}

interface ClauseChange {
  clause_ref?: string;
  change_kind: 'added' | 'deleted' | 'modified' | 'moved';
  old_text?: string;
  new_text?: string;
  similarity_score?: number;
  page_from?: number;
  page_to?: number;
  word_changes?: WordChange[];
  sentence_changes?: WordChange[];
  significance_level: 'major' | 'minor' | 'cosmetic';
  explanation?: string;
}

interface DiffPaneProps {
  versionFrom: string;
  versionTo: string;
  changes: ClauseChange[];
  summary: {
    total_changes: number;
    additions: number;
    deletions: number;
    modifications: number;
    major_changes: number;
    minor_changes: number;
  };
  className?: string;
}

export default function DiffPane({ 
  versionFrom, 
  versionTo, 
  changes, 
  summary,
  className = '' 
}: DiffPaneProps) {
  const [showOnlyChanges, setShowOnlyChanges] = useState(true);
  const [currentChange, setCurrentChange] = useState(0);
  const [showMinorChanges, setShowMinorChanges] = useState(true);
  const [copiedItem, setCopiedItem] = useState<string | null>(null);
  
  const changeRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Filter changes based on visibility settings
  const visibleChanges = changes.filter(change => {
    if (!showMinorChanges && change.significance_level === 'minor') {
      return false;
    }
    return true;
  });

  const jumpToChange = (index: number) => {
    setCurrentChange(index);
    const actualIndex = changes.findIndex(change => change === visibleChanges[index]);
    changeRefs.current[actualIndex]?.scrollIntoView({ 
      behavior: 'smooth', 
      block: 'center' 
    });
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

  const getChangeIcon = (changeKind: string) => {
    switch (changeKind) {
      case 'added':
        return <Plus className="h-4 w-4 text-green-600" />;
      case 'deleted':
        return <Minus className="h-4 w-4 text-red-600" />;
      case 'modified':
        return <Edit3 className="h-4 w-4 text-blue-600" />;
      case 'moved':
        return <RotateCcw className="h-4 w-4 text-purple-600" />;
      default:
        return <Info className="h-4 w-4 text-gray-600" />;
    }
  };

  const getChangeColor = (changeKind: string, significance?: string) => {
    const base = {
      added: 'border-l-green-500 bg-green-50',
      deleted: 'border-l-red-500 bg-red-50',
      modified: 'border-l-blue-500 bg-blue-50',
      moved: 'border-l-purple-500 bg-purple-50'
    }[changeKind] || 'border-l-gray-500 bg-gray-50';

    if (significance === 'major') {
      return base + ' ring-2 ring-orange-200';
    }

    return base;
  };

  const renderWordChanges = (wordChanges: WordChange[] | undefined) => {
    if (!wordChanges) return null;

    return (
      <div className="space-y-1">
        {wordChanges.map((change, index) => (
          <span
            key={index}
            className={`
              ${change.added ? 'bg-green-200 text-green-900' : ''}
              ${change.removed ? 'bg-red-200 text-red-900 line-through' : ''}
              ${!change.added && !change.removed ? '' : 'px-1 rounded'}
            `}
          >
            {change.value}
          </span>
        ))}
      </div>
    );
  };

  const getSeverityBadge = (significance: string) => {
    const styles = {
      major: 'bg-red-100 text-red-800 border-red-200',
      minor: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      cosmetic: 'bg-gray-100 text-gray-800 border-gray-200'
    };

    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${styles[significance as keyof typeof styles] || styles.cosmetic}`}>
        {significance === 'major' && <AlertTriangle className="w-3 h-3 mr-1" />}
        {significance.charAt(0).toUpperCase() + significance.slice(1)}
      </span>
    );
  };

  if (changes.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <CheckCircle className="mx-auto h-12 w-12 text-green-600 mb-4" />
            <h3 className="text-lg font-semibold text-green-900 mb-2">No Changes Detected</h3>
            <p className="text-sm text-green-700">
              The document versions are identical.
            </p>
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
          <CardTitle className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">Document Comparison</h2>
              <p className="text-sm text-muted-foreground font-normal mt-1">
                {versionFrom} → {versionTo}
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold">{summary.total_changes}</div>
              <div className="text-xs text-muted-foreground">changes</div>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4 text-sm">
            <div className="text-center">
              <div className="text-lg font-semibold text-green-600">{summary.additions}</div>
              <div className="text-muted-foreground">Added</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-red-600">{summary.deletions}</div>
              <div className="text-muted-foreground">Removed</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-blue-600">{summary.modifications}</div>
              <div className="text-muted-foreground">Modified</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-orange-600">{summary.major_changes}</div>
              <div className="text-muted-foreground">Major</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Controls */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4 items-center">
            <Button 
              variant={showOnlyChanges ? "default" : "outline"}
              onClick={() => setShowOnlyChanges(!showOnlyChanges)}
              size="sm"
            >
              {showOnlyChanges ? <Eye className="mr-2 h-4 w-4" /> : <EyeOff className="mr-2 h-4 w-4" />}
              {showOnlyChanges ? "Show All Content" : "Show Changes Only"}
            </Button>
            
            <Button
              variant={showMinorChanges ? "default" : "outline"}
              onClick={() => setShowMinorChanges(!showMinorChanges)}
              size="sm"
            >
              {showMinorChanges ? "Hide Minor Changes" : "Show Minor Changes"}
            </Button>
            
            <div className="flex items-center gap-2 ml-auto">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => jumpToChange(Math.max(0, currentChange - 1))}
                disabled={currentChange === 0 || visibleChanges.length === 0}
              >
                <ChevronUp className="h-4 w-4" />
              </Button>
              
              <span className="text-sm text-muted-foreground px-2">
                {visibleChanges.length > 0 ? currentChange + 1 : 0} of {visibleChanges.length}
              </span>
              
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => jumpToChange(Math.min(visibleChanges.length - 1, currentChange + 1))}
                disabled={currentChange >= visibleChanges.length - 1 || visibleChanges.length === 0}
              >
                <ChevronDown className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Changes List */}
      <div className="space-y-4">
        {changes.map((change, index) => {
          // Skip if filtered out
          if (!showMinorChanges && change.significance_level === 'minor') {
            return null;
          }

          return (
            <Card 
              key={index}
              ref={(el) => { 
                changeRefs.current[index] = el;
              }}
              className={`border-l-4 ${getChangeColor(change.change_kind, change.significance_level)}`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      {getChangeIcon(change.change_kind)}
                      <span className="font-semibold capitalize">
                        {change.change_kind} {change.clause_ref && `- ${change.clause_ref}`}
                      </span>
                      {getSeverityBadge(change.significance_level)}
                      {change.similarity_score && (
                        <span className="text-xs text-muted-foreground">
                          {Math.round(change.similarity_score * 100)}% similar
                        </span>
                      )}
                    </div>
                    
                    {change.explanation && (
                      <p className="text-sm text-muted-foreground">
                        {change.explanation}
                      </p>
                    )}
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const textToCopy = [
                        `Change: ${change.change_kind}`,
                        change.clause_ref && `Clause: ${change.clause_ref}`,
                        change.explanation && `Explanation: ${change.explanation}`,
                        change.old_text && `Old: ${change.old_text.substring(0, 100)}...`,
                        change.new_text && `New: ${change.new_text.substring(0, 100)}...`
                      ].filter(Boolean).join('\n');
                      
                      copyToClipboard(textToCopy, `change-${index}`);
                    }}
                  >
                    {copiedItem === `change-${index}` ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="pt-0">
                {/* Show old text for deletions and modifications */}
                {change.old_text && (change.change_kind === 'deleted' || change.change_kind === 'modified') && (
                  <div className="mb-4">
                    <h4 className="font-medium text-sm mb-2 text-red-700">
                      {change.change_kind === 'deleted' ? 'Removed Text:' : 'Original Text:'}
                    </h4>
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-sm text-red-900 font-mono leading-relaxed">
                        {change.old_text}
                      </p>
                    </div>
                  </div>
                )}

                {/* Show new text for additions and modifications */}
                {change.new_text && (change.change_kind === 'added' || change.change_kind === 'modified') && (
                  <div className="mb-4">
                    <h4 className="font-medium text-sm mb-2 text-green-700">
                      {change.change_kind === 'added' ? 'Added Text:' : 'Updated Text:'}
                    </h4>
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-sm text-green-900 font-mono leading-relaxed">
                        {change.new_text}
                      </p>
                    </div>
                  </div>
                )}

                {/* Show word-level changes for modifications */}
                {change.word_changes && change.change_kind === 'modified' && (
                  <div>
                    <h4 className="font-medium text-sm mb-2">Word-level Changes:</h4>
                    <div className="p-3 bg-muted rounded-lg">
                      <div className="text-sm font-mono leading-relaxed">
                        {renderWordChanges(change.word_changes)}
                      </div>
                    </div>
                  </div>
                )}

                {/* Page information */}
                {(change.page_from || change.page_to) && (
                  <div className="mt-4 pt-4 border-t border-border text-xs text-muted-foreground">
                    Page{change.page_from !== change.page_to ? 's' : ''}: {change.page_from}
                    {change.page_to && change.page_from !== change.page_to && `-${change.page_to}`}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Export Options */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => {
                const summaryText = [
                  `Document Comparison: ${versionFrom} → ${versionTo}`,
                  `Total Changes: ${summary.total_changes}`,
                  `• ${summary.additions} additions`,
                  `• ${summary.deletions} deletions`,
                  `• ${summary.modifications} modifications`,
                  `• ${summary.major_changes} major changes`,
                  '',
                  ...changes.map((change, i) => 
                    `${i + 1}. ${change.change_kind.toUpperCase()} - ${change.clause_ref || 'Clause'}: ${change.explanation || 'No explanation'}`
                  )
                ].join('\n');
                
                copyToClipboard(summaryText, 'full-diff');
              }}
            >
              {copiedItem === 'full-diff' ? (
                <CheckCircle className="mr-2 h-4 w-4" />
              ) : (
                <Copy className="mr-2 h-4 w-4" />
              )}
              Copy Summary
            </Button>
            
            <Button variant="outline">
              Export PDF
            </Button>
            
            <Button variant="outline">
              Share Comparison
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}