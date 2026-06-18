'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { format } from 'date-fns';
import { Plus, FileText, FileCheck, File, Loader2, Trash2, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { FadeIn } from '@/components/ui/fade-in';
import { documentsApi } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

import { usePageTitle } from '@/hooks/use-page-title';
import { useAuthStore } from '@/store/auth';

const CATEGORIES = ['ALL', 'CONTRACT', 'LICENSE', 'HR', 'FINANCIAL', 'LEGAL', 'INSURANCE', 'OTHER'];

const CAT_COLORS: Record<string, string> = {
  CONTRACT:  'bg-blue-100 text-blue-700 border-blue-200 dark:bg-primary/20 dark:text-primary',
  LICENSE:   'bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-900/20 dark:text-violet-400',
  HR:        'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400',
  FINANCIAL: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400',
  LEGAL:     'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400',
  INSURANCE: 'bg-teal-100 text-teal-700 border-teal-200 dark:bg-teal-900/20 dark:text-teal-400',
  OTHER:     'bg-gray-100 text-gray-600 border-gray-200 dark:bg-muted dark:text-muted-foreground',
};

function DocIcon({ category }: { category: string }) {
  if (category === 'CONTRACT' || category === 'LEGAL') return <FileCheck className="w-8 h-8 text-primary" />;
  if (category === 'HR') return <File className="w-8 h-8 text-amber-500" />;
  return <FileText className="w-8 h-8 text-muted-foreground" />;
}

export default function DocumentsPage() {
  usePageTitle('Documents');
  const propertyId = useAuthStore((s) => s.propertyId);
  const [category, setCategory] = useState('ALL');
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const debouncedSearch = useDebouncedValue(search, 300);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: docsData } = useQuery({
    queryKey: ['documents', propertyId, category, debouncedSearch],
    queryFn: () => documentsApi.list({
      propertyId: propertyId,
      ...(category !== 'ALL' ? { category } : {}),
      ...(debouncedSearch ? { search: debouncedSearch } : {}),
    }).then(r => r.data),
  });

  const docs: any[] = docsData?.data ?? [];

  const deleteMutation = useMutation({
    mutationFn: (id: string) => documentsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      toast({ title: 'Document deleted' });
    },
    onError: (err: any) => toast({ variant: 'destructive', title: err.response?.data?.message || 'Failed' }),
  });

  const { register, handleSubmit, watch, setValue, reset } = useForm({
    defaultValues: { title: '', category: 'OTHER', fileUrl: '', description: '', tags: '' },
  });

  const createMutation = useMutation({
    mutationFn: (values: any) => documentsApi.create({
      propertyId: propertyId,
      ...values,
      tags: values.tags ? values.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : [],
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      toast({ title: 'Document added' });
      setDialogOpen(false);
      reset();
    },
    onError: (err: any) => toast({ variant: 'destructive', title: err.response?.data?.message || 'Failed' }),
  });

  return (
    <FadeIn className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Documents</h1>
          <p className="text-muted-foreground text-sm">Contracts, licenses, HR, and company documents</p>
        </div>
        <Button className="bg-primary hover:bg-primary/90 text-primary-foreground" onClick={() => setDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" /> Add Document
        </Button>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex gap-1">
          {CATEGORIES.map(cat => (
            <Button
              key={cat}
              size="sm"
              variant={category === cat ? 'default' : 'outline'}
              className={cn('h-7 text-xs', category === cat ? 'bg-primary text-primary-foreground' : '')}
              onClick={() => setCategory(cat)}
            >
              {cat}
            </Button>
          ))}
        </div>
        <Input
          placeholder="Search documents..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="max-w-xs h-8 text-sm"
        />
      </div>

      {docs.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground text-sm">
            No documents found. Add one to get started.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {docs.map(doc => (
            <Card key={doc.id} className="hover:border-primary/40 transition-colors group">
              <CardContent className="pt-4 pb-4 space-y-3">
                <div className="flex items-start justify-between">
                  <DocIcon category={doc.category} />
                  <Badge className={cn('text-xs border shrink-0', CAT_COLORS[doc.category] ?? CAT_COLORS.OTHER)}>
                    {doc.category}
                  </Badge>
                </div>
                <div>
                  <p className="font-semibold text-sm text-foreground leading-tight">{doc.title}</p>
                  {doc.description && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{doc.description}</p>
                  )}
                </div>
                <div className="text-xs text-muted-foreground space-y-0.5">
                  {doc.uploadedBy && <p>By: {doc.uploadedBy.firstName} {doc.uploadedBy.lastName}</p>}
                  <p>{format(new Date(doc.createdAt), 'MMM d, yyyy')}</p>
                  {doc.version && <p>v{doc.version}</p>}
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  {doc.fileUrl && (
                    <Button size="sm" variant="outline" className="h-7 text-xs flex-1" asChild>
                      <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer">
                        <Download className="w-3 h-3 mr-1" /> View
                      </a>
                    </Button>
                  )}
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-red-500"
                    onClick={() => setDeleteTargetId(doc.id)}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Document</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit(d => createMutation.mutate(d))} className="space-y-4">
            <div className="space-y-2">
              <Label>Document Title *</Label>
              <Input placeholder="e.g. Health & Safety Certificate" {...register('title', { required: true })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={watch('category')} onValueChange={v => setValue('category', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.filter(c => c !== 'ALL').map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>File URL</Label>
              <Input placeholder="https://drive.google.com/..." {...register('fileUrl')} />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea rows={2} placeholder="Brief description..." {...register('description')} />
            </div>
            <div className="space-y-2">
              <Label>Tags (comma-separated)</Label>
              <Input placeholder="compliance, 2024, expired..." {...register('tags')} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createMutation.isPending} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Add Document
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTargetId}
        onOpenChange={(v) => { if (!v) setDeleteTargetId(null); }}
        title="Delete document?"
        description="This will permanently remove the document and all its versions. This action cannot be undone."
        confirmLabel="Delete"
        loading={deleteMutation.isPending}
        onConfirm={() => {
          if (deleteTargetId) {
            deleteMutation.mutate(deleteTargetId, { onSettled: () => setDeleteTargetId(null) });
          }
        }}
      />
    </FadeIn>
  );
}
