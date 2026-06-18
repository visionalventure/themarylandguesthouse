'use client';

import { useCallback, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { format, differenceInDays, isPast } from 'date-fns';
import {
  Plus, FileText, FileCheck, File, Loader2, Trash2, Download,
  Upload, ShieldCheck, AlertTriangle, AlertCircle, CheckCircle2,
  Clock, Tag, X, Settings2, ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { FadeIn } from '@/components/ui/fade-in';
import { AnimatedCounter } from '@/components/ui/animated-counter';
import { documentsApi } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { usePageTitle } from '@/hooks/use-page-title';
import { useAuthStore } from '@/store/auth';

// ── Built-in categories (enum values from DB) ──────────────────────────────
const BUILT_IN_CATS = ['CONTRACT','LICENSE','STAFF_FILE','PROCUREMENT','FINANCIAL','LEGAL','INSURANCE','OTHER'];

const CAT_COLORS: Record<string, string> = {
  CONTRACT:   'border-blue-500/30 bg-blue-500/15 text-blue-400',
  LICENSE:    'border-violet-500/30 bg-violet-500/15 text-violet-400',
  STAFF_FILE: 'border-amber-500/30 bg-amber-500/15 text-amber-400',
  PROCUREMENT:'border-orange-500/30 bg-orange-500/15 text-orange-400',
  FINANCIAL:  'border-green-500/30 bg-green-500/15 text-green-400',
  LEGAL:      'border-red-500/30 bg-red-500/15 text-red-400',
  INSURANCE:  'border-teal-500/30 bg-teal-500/15 text-teal-400',
  OTHER:      'border-white/10 bg-white/5 text-muted-foreground',
};

const CATEGORY_COLORS_LIST = [
  { value: 'slate', label: 'Slate' },
  { value: 'blue', label: 'Blue' },
  { value: 'green', label: 'Green' },
  { value: 'amber', label: 'Amber' },
  { value: 'violet', label: 'Violet' },
  { value: 'rose', label: 'Rose' },
  { value: 'teal', label: 'Teal' },
];

function customCatClass(color: string) {
  const map: Record<string, string> = {
    slate:  'border-white/10 bg-white/5 text-muted-foreground',
    blue:   'border-blue-500/30 bg-blue-500/15 text-blue-400',
    green:  'border-green-500/30 bg-green-500/15 text-green-400',
    amber:  'border-amber-500/30 bg-amber-500/15 text-amber-400',
    violet: 'border-violet-500/30 bg-violet-500/15 text-violet-400',
    rose:   'border-rose-500/30 bg-rose-500/15 text-rose-400',
    teal:   'border-teal-500/30 bg-teal-500/15 text-teal-400',
  };
  return map[color] ?? map.slate;
}

function expiryStatus(expiryDate: string | null) {
  if (!expiryDate) return null;
  const d = new Date(expiryDate);
  const days = differenceInDays(d, new Date());
  if (isPast(d)) return { label: 'Expired', color: 'border-red-500/30 bg-red-500/10 text-red-400', icon: AlertCircle, days };
  if (days <= 30) return { label: `${days}d left`, color: 'border-amber-500/30 bg-amber-500/10 text-amber-400', icon: AlertTriangle, days };
  if (days <= 90) return { label: `${days}d left`, color: 'border-yellow-500/30 bg-yellow-500/10 text-yellow-400', icon: Clock, days };
  return { label: 'Valid', color: 'border-green-500/30 bg-green-500/10 text-green-400', icon: CheckCircle2, days };
}

function DocIcon({ category }: { category: string }) {
  if (category === 'CONTRACT' || category === 'LEGAL') return <FileCheck className="w-7 h-7 text-primary" />;
  if (category === 'STAFF_FILE') return <File className="w-7 h-7 text-amber-400" />;
  return <FileText className="w-7 h-7 text-muted-foreground" />;
}

// ── Upload dropzone ────────────────────────────────────────────────────────
function UploadZone({ onFile }: { onFile: (f: File) => void }) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) onFile(f);
  }, [onFile]);

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className={cn(
        'border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all',
        dragging
          ? 'border-primary bg-primary/10'
          : 'border-white/[0.12] hover:border-primary/50 hover:bg-white/[0.02]',
      )}
    >
      <input ref={inputRef} type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }} />
      <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
      <p className="text-sm text-foreground/70">Drag & drop file here, or <span className="text-primary font-medium">browse</span></p>
      <p className="text-xs text-muted-foreground mt-1">PDF, DOC, DOCX, XLS, XLSX, PNG, JPG — up to 50MB</p>
    </div>
  );
}

// ── Upload progress bar ────────────────────────────────────────────────────
function UploadProgress({ pct, fileName }: { pct: number; fileName: string }) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span className="truncate max-w-[200px]">{fileName}</span>
        <span>{pct}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
        <div
          className="h-full gold-gradient rounded-full transition-all duration-200"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ── Expiry timeline card ───────────────────────────────────────────────────
function ExpiryDocCard({ doc, urgent }: { doc: any; urgent?: boolean }) {
  const status = expiryStatus(doc.expiryDate);
  if (!status) return null;
  const Icon = status.icon;
  return (
    <div className={cn('flex items-start gap-3 px-4 py-3 rounded-xl border transition-colors', status.color)}>
      <Icon className="w-4 h-4 mt-0.5 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{doc.name}</p>
        <p className="text-xs text-muted-foreground">
          {doc.category}{doc.customCategory ? ` · ${doc.customCategory}` : ''} ·{' '}
          {format(new Date(doc.expiryDate), 'MMM d, yyyy')}
        </p>
      </div>
      {doc.fileUrl && (
        <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-foreground">
          <Download className="w-3.5 h-3.5" />
        </a>
      )}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────
export default function DocumentsPage() {
  usePageTitle('Documents');
  const propertyId = useAuthStore((s) => s.propertyId);
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN';

  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadPct, setUploadPct] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [catDialogOpen, setCatDialogOpen] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatColor, setNewCatColor] = useState('slate');
  const debouncedSearch = useDebouncedValue(search, 300);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // ── Queries ──────────────────────────────────────────────────────────────
  const { data: docsData } = useQuery({
    queryKey: ['documents', propertyId, categoryFilter, debouncedSearch],
    queryFn: () => documentsApi.list({
      propertyId,
      ...(categoryFilter !== 'ALL' ? { category: categoryFilter } : {}),
      ...(debouncedSearch ? { search: debouncedSearch } : {}),
    }).then(r => r.data),
  });

  const { data: complianceData } = useQuery({
    queryKey: ['documents-compliance', propertyId],
    queryFn: () => documentsApi.compliance(propertyId).then(r => r.data),
  });

  const { data: customCats = [] } = useQuery<any[]>({
    queryKey: ['doc-categories', propertyId],
    queryFn: () => documentsApi.getCategories(propertyId).then(r => r.data),
  });

  const docs: any[] = docsData?.data ?? [];
  const allCategories = ['ALL', ...BUILT_IN_CATS, ...customCats.map((c: any) => c.name)];

  // ── Mutations ─────────────────────────────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: (id: string) => documentsApi.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['documents'] }); queryClient.invalidateQueries({ queryKey: ['documents-compliance'] }); toast({ title: 'Document deleted' }); },
    onError: (err: any) => toast({ variant: 'destructive', title: err.response?.data?.message || 'Failed' }),
  });

  const { register, handleSubmit, watch, setValue, reset } = useForm({
    defaultValues: { title: '', category: 'OTHER', customCategory: '', description: '', tags: '', expiryDate: '' },
  });

  const createMutation = useMutation({
    mutationFn: (values: any) => documentsApi.create({
      propertyId,
      ...values,
      fileUrl: uploadResult?.fileUrl || '',
      fileName: uploadResult?.fileName || values.title,
      fileSize: uploadResult?.fileSize || 0,
      mimeType: uploadResult?.mimeType || 'application/octet-stream',
      tags: values.tags ? values.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : [],
      expiryDate: values.expiryDate || null,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['documents-compliance'] });
      toast({ title: 'Document saved' });
      setDialogOpen(false);
      reset();
      setUploadFile(null);
      setUploadResult(null);
      setUploadPct(0);
    },
    onError: (err: any) => toast({ variant: 'destructive', title: err.response?.data?.message || 'Failed' }),
  });

  const createCatMutation = useMutation({
    mutationFn: () => documentsApi.createCategory({ propertyId, name: newCatName, color: newCatColor }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['doc-categories'] }); setNewCatName(''); toast({ title: 'Category created' }); },
    onError: (err: any) => toast({ variant: 'destructive', title: err.response?.data?.message || 'Category already exists' }),
  });

  const deleteCatMutation = useMutation({
    mutationFn: (id: string) => documentsApi.deleteCategory(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['doc-categories'] }),
  });

  // ── File upload handler ───────────────────────────────────────────────────
  const handleFileSelect = async (file: File) => {
    setUploadFile(file);
    setUploading(true);
    setUploadPct(0);
    try {
      const res = await documentsApi.upload(file, (pct) => setUploadPct(pct));
      setUploadResult(res.data);
      toast({ title: 'File uploaded' });
    } catch {
      toast({ variant: 'destructive', title: 'Upload failed' });
      setUploadFile(null);
    } finally {
      setUploading(false);
    }
  };

  const selectedCat = watch('category');

  // ── Compliance score color ────────────────────────────────────────────────
  const score = complianceData?.complianceScore ?? 100;
  const scoreColor = score >= 80 ? 'text-green-400' : score >= 60 ? 'text-amber-400' : 'text-red-400';

  return (
    <FadeIn className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Documents</h1>
          <p className="text-muted-foreground text-sm">Contracts, licenses, HR records and compliance tracking</p>
        </div>
        <div className="flex gap-2">
          {isAdmin && (
            <Button variant="outline" onClick={() => setCatDialogOpen(true)}>
              <Settings2 className="w-4 h-4 mr-2" /> Categories
            </Button>
          )}
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" /> Add Document
          </Button>
        </div>
      </div>

      <Tabs defaultValue="all">
        <TabsList className="bg-white/[0.04] border border-white/[0.08]">
          <TabsTrigger value="all">All Documents</TabsTrigger>
          <TabsTrigger value="compliance" className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" />
            Compliance
            {(complianceData?.expired?.length ?? 0) > 0 && (
              <span className="ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full bg-red-500/80 text-white text-[10px] font-bold">
                {complianceData.expired.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ── All Documents tab ─────────────────────────────────────────── */}
        <TabsContent value="all" className="space-y-4 mt-4">
          {/* Category filter pills */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex gap-1 flex-wrap">
              {allCategories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={cn(
                    'px-3 py-1 rounded-lg text-xs font-medium border transition-all',
                    categoryFilter === cat
                      ? 'bg-gold-main/20 text-gold-main border-gold-main/40'
                      : 'border-white/[0.08] text-muted-foreground hover:text-foreground hover:bg-white/[0.04]',
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>
            <Input
              placeholder="Search documents..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="max-w-xs h-8 text-sm ml-auto"
            />
          </div>

          {docs.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center">
                <FileText className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">No documents found. Add one to get started.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {docs.map(doc => {
                const exp = expiryStatus(doc.expiryDate);
                const catColor = CAT_COLORS[doc.category] ?? customCatClass(
                  customCats.find((c: any) => c.name === doc.customCategory)?.color ?? 'slate'
                );
                return (
                  <Card key={doc.id} className="hover:border-primary/30 group">
                    <CardContent className="pt-4 pb-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <DocIcon category={doc.category} />
                        <div className="flex flex-col items-end gap-1">
                          <Badge className={cn('text-[10px] border shrink-0', catColor)}>
                            {doc.customCategory || doc.category}
                          </Badge>
                          {exp && (
                            <Badge className={cn('text-[10px] border shrink-0', exp.color)}>
                              {exp.label}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div>
                        <p className="font-semibold text-sm text-foreground leading-tight">{doc.name}</p>
                        {doc.description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{doc.description}</p>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground space-y-0.5">
                        {doc.expiryDate && (
                          <p className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Expires {format(new Date(doc.expiryDate), 'MMM d, yyyy')}
                          </p>
                        )}
                        <p>{format(new Date(doc.createdAt), 'MMM d, yyyy')}</p>
                        {doc.version > 1 && <p>v{doc.version}</p>}
                      </div>
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {doc.fileUrl && (
                          <Button size="sm" variant="outline" className="h-7 text-xs flex-1" asChild>
                            <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer">
                              <Download className="w-3 h-3 mr-1" /> View
                            </a>
                          </Button>
                        )}
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-red-400"
                          onClick={() => setDeleteTargetId(doc.id)}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ── Compliance tab ────────────────────────────────────────────── */}
        <TabsContent value="compliance" className="space-y-6 mt-4">
          {/* Score cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-5 pb-5 text-center">
                <p className={cn('text-4xl font-bold', scoreColor)}>
                  <AnimatedCounter value={score} />%
                </p>
                <p className="text-xs text-muted-foreground mt-1">Compliance Score</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5 pb-5 text-center">
                <p className="text-3xl font-bold text-red-400">
                  <AnimatedCounter value={complianceData?.expired?.length ?? 0} />
                </p>
                <p className="text-xs text-muted-foreground mt-1">Expired</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5 pb-5 text-center">
                <p className="text-3xl font-bold text-amber-400">
                  <AnimatedCounter value={complianceData?.expiring30?.length ?? 0} />
                </p>
                <p className="text-xs text-muted-foreground mt-1">Expiring in 30 days</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5 pb-5 text-center">
                <p className="text-3xl font-bold text-yellow-400">
                  <AnimatedCounter value={complianceData?.expiring90?.length ?? 0} />
                </p>
                <p className="text-xs text-muted-foreground mt-1">Expiring in 90 days</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Expired */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400" />
                  <span>Expired Documents</span>
                  {(complianceData?.expired?.length ?? 0) > 0 && (
                    <Badge className="ml-auto border-red-500/30 bg-red-500/15 text-red-400 text-[10px]">
                      {complianceData.expired.length} urgent
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {(complianceData?.expired ?? []).length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">No expired documents</p>
                ) : (
                  complianceData.expired.map((doc: any) => <ExpiryDocCard key={doc.id} doc={doc} urgent />)
                )}
              </CardContent>
            </Card>

            {/* Expiring soon */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <span>Expiring Soon</span>
                  {(complianceData?.expiring30?.length ?? 0) > 0 && (
                    <Badge className="ml-auto border-amber-500/30 bg-amber-500/15 text-amber-400 text-[10px]">
                      {complianceData.expiring30.length} within 30d
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {(complianceData?.expiring30 ?? []).length === 0 && (complianceData?.expiring90 ?? []).length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">No documents expiring soon</p>
                ) : (
                  [...(complianceData?.expiring30 ?? []), ...(complianceData?.expiring90 ?? [])]
                    .map((doc: any) => <ExpiryDocCard key={doc.id} doc={doc} />)
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* ── Add Document Dialog ────────────────────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={(v) => { setDialogOpen(v); if (!v) { reset(); setUploadFile(null); setUploadResult(null); setUploadPct(0); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Add Document</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit(d => createMutation.mutate(d))} className="space-y-4">

            {/* Upload zone */}
            {!uploadResult ? (
              uploading ? (
                <UploadProgress pct={uploadPct} fileName={uploadFile?.name ?? ''} />
              ) : (
                <UploadZone onFile={handleFileSelect} />
              )
            ) : (
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-green-500/30 bg-green-500/10">
                <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{uploadResult.fileName}</p>
                  <p className="text-xs text-muted-foreground">{(uploadResult.fileSize / 1024).toFixed(1)} KB uploaded</p>
                </div>
                <button type="button" onClick={() => { setUploadFile(null); setUploadResult(null); setUploadPct(0); }}
                  className="text-muted-foreground hover:text-foreground">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            <div className="space-y-2">
              <Label>Document Title *</Label>
              <Input placeholder="e.g. Health & Safety Certificate" {...register('title', { required: true })} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={selectedCat} onValueChange={v => setValue('category', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {BUILT_IN_CATS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    {customCats.length > 0 && (
                      <>
                        <div className="px-2 py-1 text-[10px] text-muted-foreground uppercase tracking-wider border-t border-border mt-1 pt-2">Custom</div>
                        {customCats.map((c: any) => <SelectItem key={c.id} value="OTHER">{c.name}</SelectItem>)}
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Custom Category</Label>
                <Input placeholder="e.g. Fire Safety" {...register('customCategory')} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Expiry Date <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Input type="date" {...register('expiryDate')} />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea rows={2} placeholder="Brief description..." {...register('description')} />
            </div>

            <div className="space-y-2">
              <Label>Tags <span className="text-muted-foreground text-xs">(comma-separated)</span></Label>
              <Input placeholder="compliance, 2024, renewed..." {...register('tags')} />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createMutation.isPending || uploading}>
                {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Add Document
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Categories Management Dialog (Admin only) ──────────────────────── */}
      <Dialog open={catDialogOpen} onOpenChange={setCatDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Tag className="w-4 h-4 text-primary" />
              Document Categories
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground">Built-in categories cannot be removed. Custom categories can be deleted.</p>

            {/* Built-in */}
            <div className="space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Built-in</p>
              <div className="flex flex-wrap gap-1.5">
                {BUILT_IN_CATS.map(c => (
                  <span key={c} className={cn('px-2.5 py-0.5 rounded-full text-xs font-medium border', CAT_COLORS[c] ?? CAT_COLORS.OTHER)}>
                    {c}
                  </span>
                ))}
              </div>
            </div>

            {/* Custom */}
            {customCats.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Custom</p>
                {customCats.map((c: any) => (
                  <div key={c.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                    <span className={cn('px-2.5 py-0.5 rounded-full text-xs font-medium border', customCatClass(c.color))}>
                      {c.name}
                    </span>
                    <button onClick={() => deleteCatMutation.mutate(c.id)}
                      className="text-muted-foreground hover:text-red-400 transition-colors">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add new */}
            <div className="pt-2 border-t border-white/[0.06] space-y-3">
              <p className="text-sm font-medium">Create Category</p>
              <div className="flex gap-2">
                <Input
                  placeholder="Category name..."
                  value={newCatName}
                  onChange={e => setNewCatName(e.target.value)}
                  className="flex-1"
                />
                <Select value={newCatColor} onValueChange={setNewCatColor}>
                  <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORY_COLORS_LIST.map(c => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                className="w-full"
                disabled={!newCatName.trim() || createCatMutation.isPending}
                onClick={() => createCatMutation.mutate()}
              >
                {createCatMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                Create Category
              </Button>
            </div>
          </div>
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
          if (deleteTargetId) deleteMutation.mutate(deleteTargetId, { onSettled: () => setDeleteTargetId(null) });
        }}
      />
    </FadeIn>
  );
}
