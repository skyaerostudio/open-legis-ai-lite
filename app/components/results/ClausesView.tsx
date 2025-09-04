'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  BookOpen, 
  FileText, 
  ChevronDown, 
  ChevronUp,
  Filter
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface ClausesViewProps {
  clauses: any[];
  document: any;
  analysis: any;
}

export default function ClausesView({ clauses, document, analysis }: ClausesViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [expandedClauses, setExpandedClauses] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Filter and search clauses
  const filteredClauses = useMemo(() => {
    let filtered = clauses;

    // Filter by type
    if (filterType !== 'all') {
      filtered = filtered.filter(clause => {
        const ref = clause.clause_ref?.toLowerCase() || '';
        switch (filterType) {
          case 'pasal':
            return ref.includes('pasal');
          case 'ayat':
            return ref.includes('ayat');
          case 'huruf':
            return ref.includes('huruf');
          case 'bab':
            return ref.includes('bab');
          default:
            return true;
        }
      });
    }

    // Search in text
    if (searchTerm) {
      filtered = filtered.filter(clause => 
        clause.text.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (clause.clause_ref && clause.clause_ref.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    return filtered;
  }, [clauses, filterType, searchTerm]);

  // Pagination
  const totalPages = Math.ceil(filteredClauses.length / itemsPerPage);
  const paginatedClauses = filteredClauses.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const toggleClause = (clauseId: string) => {
    const newExpanded = new Set(expandedClauses);
    if (newExpanded.has(clauseId)) {
      newExpanded.delete(clauseId);
    } else {
      newExpanded.add(clauseId);
    }
    setExpandedClauses(newExpanded);
  };

  const getClauseTypeColor = (clauseRef: string) => {
    const ref = clauseRef?.toLowerCase() || '';
    if (ref.includes('pasal')) return 'bg-blue-100 text-blue-800';
    if (ref.includes('ayat')) return 'bg-green-100 text-green-800';
    if (ref.includes('huruf')) return 'bg-purple-100 text-purple-800';
    if (ref.includes('bab')) return 'bg-orange-100 text-orange-800';
    return 'bg-gray-100 text-gray-800';
  };

  const truncateText = (text: string, maxLength: number = 200) => {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + '...';
  };

  return (
    <div className="space-y-6">
      {/* Search and Filter Controls */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari dalam pasal-pasal..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            
            <div className="flex gap-2">
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-40">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Jenis</SelectItem>
                  <SelectItem value="pasal">Pasal</SelectItem>
                  <SelectItem value="ayat">Ayat</SelectItem>
                  <SelectItem value="huruf">Huruf</SelectItem>
                  <SelectItem value="bab">Bab</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="flex justify-between items-center mt-4 pt-4 border-t">
            <span className="text-sm text-muted-foreground">
              Menampilkan {filteredClauses.length} dari {clauses.length} bagian
              {searchTerm && ` untuk "${searchTerm}"`}
            </span>
            
            {filteredClauses.length > itemsPerPage && (
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  Sebelumnya
                </Button>
                <span className="text-sm">
                  Halaman {currentPage} dari {totalPages}
                </span>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Selanjutnya
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Clauses List */}
      <div className="space-y-4">
        {paginatedClauses.map((clause, index) => {
          const isExpanded = expandedClauses.has(clause.id);
          const displayText = isExpanded ? clause.text : truncateText(clause.text);
          
          return (
            <Card key={clause.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div className="flex items-center space-x-2">
                    {clause.clause_ref && (
                      <Badge className={getClauseTypeColor(clause.clause_ref)}>
                        {clause.clause_ref}
                      </Badge>
                    )}
                    {clause.page_from && (
                      <span className="text-xs text-muted-foreground">
                        Hal. {clause.page_from}
                        {clause.page_to && clause.page_to !== clause.page_from && `-${clause.page_to}`}
                      </span>
                    )}
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleClause(clause.id)}
                  >
                    {isExpanded ? (
                      <>
                        <ChevronUp className="h-4 w-4 mr-1" />
                        Sembunyikan
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-4 w-4 mr-1" />
                        Lihat Lengkap
                      </>
                    )}
                  </Button>
                </div>
              </CardHeader>
              
              <CardContent className="pt-0">
                <div className="prose prose-sm max-w-none">
                  <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {displayText}
                  </p>
                </div>
                
                {!isExpanded && clause.text.length > 200 && (
                  <div className="mt-2 text-sm text-muted-foreground">
                    +{clause.text.length - 200} karakter lagi...
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredClauses.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Tidak ada hasil</h3>
            <p className="text-muted-foreground">
              {searchTerm 
                ? `Tidak ditemukan bagian yang mengandung "${searchTerm}"`
                : 'Tidak ada bagian yang sesuai dengan filter yang dipilih'
              }
            </p>
            {(searchTerm || filterType !== 'all') && (
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => {
                  setSearchTerm('');
                  setFilterType('all');
                }}
              >
                Reset Filter
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Bottom Pagination */}
      {filteredClauses.length > itemsPerPage && (
        <div className="flex justify-center">
          <div className="flex items-center gap-2">
            <Button 
              variant="outline"
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
            >
              Pertama
            </Button>
            <Button 
              variant="outline"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              Sebelumnya
            </Button>
            <span className="px-4 py-2 text-sm">
              {currentPage} / {totalPages}
            </span>
            <Button 
              variant="outline"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              Selanjutnya
            </Button>
            <Button 
              variant="outline"
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
            >
              Terakhir
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}