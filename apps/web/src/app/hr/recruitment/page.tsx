'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Plus, Briefcase, Users2, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { hrApi } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { usePageTitle } from '@/hooks/use-page-title';
import { useAuthStore } from '@/store/auth';
import { cn } from '@/lib/utils';
import { FadeIn } from '@/components/ui/fade-in';

const CANDIDATE_COLORS: Record<string, string> = {
  APPLIED:            'bg-blue-100 text-blue-700',
  SHORTLISTED:        'bg-indigo-100 text-indigo-700',
  INTERVIEW_SCHEDULED:'bg-amber-100 text-amber-700',
  INTERVIEWED:        'bg-purple-100 text-purple-700',
  OFFER_EXTENDED:     'bg-green-100 text-green-700',
  HIRED:              'bg-green-200 text-green-800',
  REJECTED:           'bg-red-100 text-red-700',
  WITHDRAWN:          'bg-gray-100 text-gray-600',
};

export default function RecruitmentPage() {
  usePageTitle('Recruitment');
  const propertyId = useAuthStore((s) => s.propertyId);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [createJobOpen, setCreateJobOpen] = useState(false);
  const [addCandidateOpen, setAddCandidateOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [jobForm, setJobForm] = useState({ title: '', description: '', requirements: '', openDate: new Date().toISOString().split('T')[0] });
  const [candidateForm, setCandidateForm] = useState({ firstName: '', lastName: '', email: '', phone: '' });

  const { data: jobs, isLoading: jobsLoading } = useQuery({
    queryKey: ['job-openings', propertyId, statusFilter],
    queryFn: () => hrApi.jobOpenings({ propertyId, status: statusFilter || undefined }).then(r => r.data),
  });
  const jobOpenings: any[] = Array.isArray(jobs) ? jobs : (jobs?.data ?? []);

  const { data: candidatesData, isLoading: candidatesLoading } = useQuery({
    queryKey: ['candidates', selectedJobId],
    queryFn: () => hrApi.candidates(selectedJobId!).then(r => r.data),
    enabled: !!selectedJobId,
  });
  const candidates: any[] = Array.isArray(candidatesData) ? candidatesData : (candidatesData?.data ?? []);

  const createJobMutation = useMutation({
    mutationFn: () => hrApi.createJobOpening({ ...jobForm, propertyId }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['job-openings'] }); toast({ title: 'Job opening created' }); setCreateJobOpen(false); },
    onError: (err: any) => toast({ variant: 'destructive', title: err.response?.data?.message || 'Failed' }),
  });

  const closeJobMutation = useMutation({
    mutationFn: (id: string) => hrApi.updateJobOpening(id, { status: 'CANCELLED' }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['job-openings'] }); toast({ title: 'Job opening closed' }); },
  });

  const addCandidateMutation = useMutation({
    mutationFn: () => hrApi.createCandidate(selectedJobId!, candidateForm),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidates', selectedJobId] });
      toast({ title: 'Candidate added' });
      setAddCandidateOpen(false);
      setCandidateForm({ firstName: '', lastName: '', email: '', phone: '' });
    },
    onError: (err: any) => toast({ variant: 'destructive', title: err.response?.data?.message || 'Failed' }),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => hrApi.updateCandidateStatus(id, status),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['candidates', selectedJobId] }); toast({ title: 'Status updated' }); },
  });

  const selectedJob = jobOpenings.find(j => j.id === selectedJobId);

  const JOB_STATUS_COLORS: Record<string, string> = {
    OPEN: 'bg-green-100 text-green-700',
    FILLED: 'bg-blue-100 text-blue-700',
    CANCELLED: 'bg-gray-100 text-gray-600',
    ON_HOLD: 'bg-amber-100 text-amber-700',
  };

  return (
    <FadeIn className="space-y-6">
      <div className="flex items-center gap-3">
        <Briefcase className="w-6 h-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Recruitment</h1>
          <p className="text-muted-foreground text-sm">Job openings, candidates, and hiring pipeline</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Job Openings Panel */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="flex-1 h-8 text-xs"><SelectValue placeholder="All Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Status</SelectItem>
                {['OPEN','FILLED','CANCELLED','ON_HOLD'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground" onClick={() => setCreateJobOpen(true)}>
              <Plus className="w-3.5 h-3.5 mr-1" /> Post
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              {jobsLoading ? (
                <div className="py-8 text-center text-muted-foreground text-sm">Loading…</div>
              ) : jobOpenings.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground text-sm">No job openings.</div>
              ) : (
                <div>
                  {jobOpenings.map((job: any) => (
                    <div key={job.id}
                      className={cn(
                        'flex items-center justify-between px-4 py-3 border-b border-border cursor-pointer hover:bg-muted/30 transition-colors',
                        selectedJobId === job.id ? 'bg-primary/5 border-l-2 border-l-primary' : '',
                      )}
                      onClick={() => setSelectedJobId(job.id)}>
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{job.title}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge className={cn('text-xs', JOB_STATUS_COLORS[job.status] ?? 'bg-muted')}>{job.status}</Badge>
                          <span className="text-xs text-muted-foreground">{job._count?.candidates ?? 0} candidates</span>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Candidates Panel */}
        <div className="lg:col-span-3 space-y-3">
          {!selectedJobId ? (
            <Card>
              <CardContent className="py-16 text-center text-muted-foreground text-sm">
                <Briefcase className="w-10 h-10 mx-auto mb-3 opacity-30" />
                Select a job opening to view candidates
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">{selectedJob?.title}</h3>
                  <p className="text-xs text-muted-foreground">Candidates in pipeline</p>
                </div>
                <div className="flex gap-2">
                  {selectedJob?.status === 'OPEN' && (
                    <>
                      <Button size="sm" variant="outline" className="text-xs"
                        onClick={() => closeJobMutation.mutate(selectedJobId)}>Close Opening</Button>
                      <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs"
                        onClick={() => setAddCandidateOpen(true)}>
                        <Plus className="w-3.5 h-3.5 mr-1" /> Add Candidate
                      </Button>
                    </>
                  )}
                </div>
              </div>

              <Card>
                <CardContent className="p-0">
                  {candidatesLoading ? (
                    <div className="py-8 text-center text-muted-foreground text-sm">Loading candidates…</div>
                  ) : candidates.length === 0 ? (
                    <div className="py-8 text-center text-muted-foreground text-sm">
                      <Users2 className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      No candidates yet.
                    </div>
                  ) : (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border bg-muted/40">
                          <th className="text-left px-4 py-3 font-medium text-muted-foreground">Candidate</th>
                          <th className="text-left px-4 py-3 font-medium text-muted-foreground">Contact</th>
                          <th className="text-left px-4 py-3 font-medium text-muted-foreground">Applied</th>
                          <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                          <th className="px-4 py-3" />
                        </tr>
                      </thead>
                      <tbody>
                        {candidates.map((c: any) => (
                          <tr key={c.id} className="border-b border-border hover:bg-muted/30">
                            <td className="px-4 py-3 font-medium">{c.firstName} {c.lastName}</td>
                            <td className="px-4 py-3 text-xs text-muted-foreground">{c.email || c.phone || '—'}</td>
                            <td className="px-4 py-3 text-xs text-muted-foreground">
                              {c.appliedAt ? format(new Date(c.appliedAt), 'MMM d, yyyy') : '—'}
                            </td>
                            <td className="px-4 py-3">
                              <Badge className={cn('text-xs', CANDIDATE_COLORS[c.status] ?? 'bg-muted')}>
                                {c.status?.replace(/_/g, ' ')}
                              </Badge>
                            </td>
                            <td className="px-4 py-3">
                              <Select value={c.status}
                                onValueChange={status => updateStatusMutation.mutate({ id: c.id, status })}>
                                <SelectTrigger className="h-7 w-36 text-xs"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  {['APPLIED','SHORTLISTED','INTERVIEW_SCHEDULED','INTERVIEWED','OFFER_EXTENDED','HIRED','REJECTED','WITHDRAWN'].map(s => (
                                    <SelectItem key={s} value={s}>{s.replace(/_/g, ' ')}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>

      {/* Create Job Dialog */}
      <Dialog open={createJobOpen} onOpenChange={setCreateJobOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Post Job Opening</DialogTitle></DialogHeader>
          <div className="space-y-3 text-sm">
            <div className="space-y-1.5">
              <Label>Job Title *</Label>
              <Input placeholder="e.g. Front Desk Officer" value={jobForm.title}
                onChange={e => setJobForm(f => ({ ...f, title: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Open Date *</Label>
              <Input type="date" value={jobForm.openDate}
                onChange={e => setJobForm(f => ({ ...f, openDate: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Job Description</Label>
              <Textarea rows={3} value={jobForm.description}
                onChange={e => setJobForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Requirements</Label>
              <Textarea rows={2} value={jobForm.requirements}
                onChange={e => setJobForm(f => ({ ...f, requirements: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateJobOpen(false)}>Cancel</Button>
            <Button disabled={!jobForm.title || createJobMutation.isPending}
              className="bg-primary hover:bg-primary/90 text-primary-foreground" onClick={() => createJobMutation.mutate()}>
              Post Opening
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Candidate Dialog */}
      <Dialog open={addCandidateOpen} onOpenChange={setAddCandidateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Candidate</DialogTitle></DialogHeader>
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>First Name *</Label>
                <Input value={candidateForm.firstName} onChange={e => setCandidateForm(f => ({ ...f, firstName: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Last Name *</Label>
                <Input value={candidateForm.lastName} onChange={e => setCandidateForm(f => ({ ...f, lastName: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input type="email" value={candidateForm.email} onChange={e => setCandidateForm(f => ({ ...f, email: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input value={candidateForm.phone} onChange={e => setCandidateForm(f => ({ ...f, phone: e.target.value }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddCandidateOpen(false)}>Cancel</Button>
            <Button disabled={!candidateForm.firstName || !candidateForm.lastName || addCandidateMutation.isPending}
              className="bg-primary hover:bg-primary/90 text-primary-foreground" onClick={() => addCandidateMutation.mutate()}>
              Add Candidate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </FadeIn>
  );
}
