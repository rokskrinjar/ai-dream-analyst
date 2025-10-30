import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Grid3x3, Table2, Search, MoreVertical, Edit, Trash2, Brain, ChevronLeft, ChevronRight } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";

interface Dream {
  id: string;
  title: string;
  content: string;
  dream_date: string;
  primary_emotion?: string;
  image_url?: string;
  created_at: string;
  analysis?: {
    analysis_text: string;
  }[];
}

type ViewMode = 'grid' | 'table';
type AnalysisFilter = 'all' | 'analyzed' | 'not-analyzed';
type DateRangeFilter = '7d' | '30d' | '90d' | 'all';
type SortBy = 'date-desc' | 'date-asc' | 'title-asc' | 'title-desc';

export default function Dreams() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [dreams, setDreams] = useState<Dream[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [analysisFilter, setAnalysisFilter] = useState<AnalysisFilter>('all');
  const [dateRangeFilter, setDateRangeFilter] = useState<DateRangeFilter>('all');
  const [sortBy, setSortBy] = useState<SortBy>('date-desc');
  const [selectedDreams, setSelectedDreams] = useState<Set<string>>(new Set());
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [dreamToDelete, setDreamToDelete] = useState<string | null>(null);

  const itemsPerPage = viewMode === 'grid' ? 12 : 20;

  useEffect(() => {
    if (user) {
      fetchDreams();
    }
  }, [user]);

  const fetchDreams = async () => {
    try {
      setLoading(true);
    const { data, error } = await supabase
      .from('dreams')
      .select('*, analysis:dream_analyses(analysis_text)')
      .eq('user_id', user?.id)
      .eq('is_deleted', false)
      .order('dream_date', { ascending: false });

      if (error) throw error;
      setDreams(data || []);
    } catch (error) {
      console.error('Error fetching dreams:', error);
      toast.error('Failed to load dreams');
    } finally {
      setLoading(false);
    }
  };

  const filteredAndSortedDreams = useMemo(() => {
    let filtered = [...dreams];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(dream =>
        dream.title.toLowerCase().includes(query) ||
        dream.content.toLowerCase().includes(query)
      );
    }

    // Analysis filter
    if (analysisFilter === 'analyzed') {
      filtered = filtered.filter(dream => dream.analysis && dream.analysis.length > 0);
    } else if (analysisFilter === 'not-analyzed') {
      filtered = filtered.filter(dream => !dream.analysis || dream.analysis.length === 0);
    }

    // Date range filter
    if (dateRangeFilter !== 'all') {
      const now = new Date();
      const days = dateRangeFilter === '7d' ? 7 : dateRangeFilter === '30d' ? 30 : 90;
      const cutoffDate = new Date(now.setDate(now.getDate() - days));
      filtered = filtered.filter(dream => new Date(dream.dream_date) >= cutoffDate);
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date-desc':
          return new Date(b.dream_date).getTime() - new Date(a.dream_date).getTime();
        case 'date-asc':
          return new Date(a.dream_date).getTime() - new Date(b.dream_date).getTime();
        case 'title-asc':
          return a.title.localeCompare(b.title);
        case 'title-desc':
          return b.title.localeCompare(a.title);
        default:
          return 0;
      }
    });

    return filtered;
  }, [dreams, searchQuery, analysisFilter, dateRangeFilter, sortBy]);

  const paginatedDreams = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredAndSortedDreams.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredAndSortedDreams, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredAndSortedDreams.length / itemsPerPage);

  const handleDelete = async (dreamId: string) => {
    try {
      const { error } = await supabase
        .from('dreams')
        .update({
          is_deleted: true,
          deleted_at: new Date().toISOString()
        })
        .eq('id', dreamId);

      if (error) throw error;
      
      toast.success('Dream deleted successfully');
      fetchDreams();
      setSelectedDreams(prev => {
        const newSet = new Set(prev);
        newSet.delete(dreamId);
        return newSet;
      });
    } catch (error) {
      console.error('Error deleting dream:', error);
      toast.error('Failed to delete dream');
    }
  };

  const handleBulkDelete = async () => {
    try {
      const { error } = await supabase
        .from('dreams')
        .update({
          is_deleted: true,
          deleted_at: new Date().toISOString()
        })
        .in('id', Array.from(selectedDreams));

      if (error) throw error;
      
      toast.success('Dreams deleted successfully');
      fetchDreams();
      setSelectedDreams(new Set());
      setDeleteDialogOpen(false);
    } catch (error) {
      console.error('Error deleting dreams:', error);
      toast.error('Failed to delete dreams');
    }
  };

  const toggleSelectDream = (dreamId: string) => {
    setSelectedDreams(prev => {
      const newSet = new Set(prev);
      if (newSet.has(dreamId)) {
        newSet.delete(dreamId);
      } else {
        newSet.add(dreamId);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedDreams.size === paginatedDreams.length) {
      setSelectedDreams(new Set());
    } else {
      setSelectedDreams(new Set(paginatedDreams.map(d => d.id)));
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const truncateText = (text: string, maxLength: number) => {
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader title="My Dreams" />
        <main className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <Card key={i}>
                <Skeleton className="h-48 w-full" />
                <CardContent className="p-4">
                  <Skeleton className="h-4 w-3/4 mb-2" />
                  <Skeleton className="h-3 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader title="My Dreams" />
      
      <main className="container mx-auto px-4 py-8">
        {/* Header with filters */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl font-bold">My Dreams</h1>
              <p className="text-muted-foreground">{filteredAndSortedDreams.length} dreams total</p>
            </div>
            
            <div className="flex gap-2">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('grid')}
              >
                <Grid3x3 className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'table' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('table')}
              >
                <Table2 className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Filters and search */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search dreams..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={analysisFilter} onValueChange={(value: AnalysisFilter) => setAnalysisFilter(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All dreams</SelectItem>
                <SelectItem value="analyzed">Analyzed</SelectItem>
                <SelectItem value="not-analyzed">Not analyzed</SelectItem>
              </SelectContent>
            </Select>

            <Select value={dateRangeFilter} onValueChange={(value: DateRangeFilter) => setDateRangeFilter(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All time</SelectItem>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={(value: SortBy) => setSortBy(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date-desc">Newest first</SelectItem>
                <SelectItem value="date-asc">Oldest first</SelectItem>
                <SelectItem value="title-asc">Title A-Z</SelectItem>
                <SelectItem value="title-desc">Title Z-A</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Bulk actions bar */}
        {viewMode === 'table' && selectedDreams.size > 0 && (
          <div className="mb-4 p-4 bg-muted rounded-lg flex items-center justify-between">
            <span className="font-medium">{selectedDreams.size} selected</span>
            <div className="flex gap-2">
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setDeleteDialogOpen(true)}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete selected
              </Button>
            </div>
          </div>
        )}

        {/* Empty state */}
        {filteredAndSortedDreams.length === 0 && (
          <Card>
            <CardContent className="py-16 text-center">
              <h3 className="text-xl font-semibold mb-2">
                {dreams.length === 0 ? 'No dreams yet' : 'No results found'}
              </h3>
              <p className="text-muted-foreground mb-6">
                {dreams.length === 0 ? 'Start recording your dreams to begin your journey' : 'Try adjusting your filters'}
              </p>
              {dreams.length === 0 && (
                <Button onClick={() => navigate('/dream-entry')}>
                  Add Dream
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Grid View */}
        {viewMode === 'grid' && filteredAndSortedDreams.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {paginatedDreams.map((dream) => (
              <Card key={dream.id} className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer">
                <div onClick={() => navigate(`/edit-dream/${dream.id}`)}>
                  {dream.image_url && (
                    <div className="aspect-video overflow-hidden bg-muted">
                      <img
                        src={dream.image_url}
                        alt={dream.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-lg line-clamp-2">{dream.title}</CardTitle>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/edit-dream/${dream.id}`);
                          }}>
                            <Edit className="w-4 h-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              setDreamToDelete(dream.id);
                              setDeleteDialogOpen(true);
                            }}
                            className="text-destructive"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <p className="text-sm text-muted-foreground">{formatDate(dream.dream_date)}</p>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
                      {dream.content}
                    </p>
                    <div className="flex items-center justify-between">
                      {dream.primary_emotion && (
                        <Badge variant="secondary">{dream.primary_emotion}</Badge>
                      )}
                      {dream.analysis && dream.analysis.length > 0 ? (
                        <Badge variant="default" className="ml-auto">
                          <Brain className="w-3 h-3 mr-1" />
                          Analyzed
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="ml-auto">
                          Not analyzed
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Table View */}
        {viewMode === 'table' && filteredAndSortedDreams.length > 0 && (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedDreams.size === paginatedDreams.length && paginatedDreams.length > 0}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead className="hidden md:table-cell">Preview</TableHead>
                  <TableHead className="hidden lg:table-cell">Emotion</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-12">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedDreams.map((dream) => (
                  <TableRow key={dream.id} className="cursor-pointer" onClick={() => navigate(`/edit-dream/${dream.id}`)}>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedDreams.has(dream.id)}
                        onCheckedChange={() => toggleSelectDream(dream.id)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{formatDate(dream.dream_date)}</TableCell>
                    <TableCell className="max-w-xs">{truncateText(dream.title, 50)}</TableCell>
                    <TableCell className="hidden md:table-cell max-w-md text-muted-foreground">
                      {truncateText(dream.content, 80)}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {dream.primary_emotion && (
                        <Badge variant="secondary">{dream.primary_emotion}</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {dream.analysis && dream.analysis.length > 0 ? (
                        <Badge variant="default">
                          <Brain className="w-3 h-3 mr-1" />
                          Analyzed
                        </Badge>
                      ) : (
                        <Badge variant="outline">Not analyzed</Badge>
                      )}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => navigate(`/edit-dream/${dream.id}`)}>
                            <Edit className="w-4 h-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setDreamToDelete(dream.id);
                              setDeleteDialogOpen(true);
                            }}
                            className="text-destructive"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-8 flex items-center justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            
            {[...Array(totalPages)].map((_, i) => {
              const page = i + 1;
              if (
                page === 1 ||
                page === totalPages ||
                (page >= currentPage - 1 && page <= currentPage + 1)
              ) {
                return (
                  <Button
                    key={page}
                    variant={currentPage === page ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setCurrentPage(page)}
                  >
                    {page}
                  </Button>
                );
              } else if (page === currentPage - 2 || page === currentPage + 2) {
                return <span key={page} className="px-2">...</span>;
              }
              return null;
            })}
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </main>

      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {selectedDreams.size > 0
                ? `Delete ${selectedDreams.size} dreams?`
                : 'Delete dream?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {selectedDreams.size > 0
                ? 'This action cannot be undone. The selected dreams will be permanently deleted.'
                : 'This action cannot be undone. This dream will be permanently deleted.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDreamToDelete(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (selectedDreams.size > 0) {
                  handleBulkDelete();
                } else if (dreamToDelete) {
                  handleDelete(dreamToDelete);
                  setDreamToDelete(null);
                  setDeleteDialogOpen(false);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
