"use client";

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { Patient } from '@/lib/types';
import { isAuthenticated } from '@/lib/auth';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, deleteDoc, doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Stethoscope, Edit, ArrowUpDown, ArrowUp, ArrowDown, BookText, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { toUrduName } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { EditPatientDialog } from '@/components/EditPatientDialog';

function PatientsListPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isClient, setIsClient] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [patientToDelete, setPatientToDelete] = useState<Patient | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ key: keyof Patient; direction: 'asc' | 'desc' } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [patientsPerPage, setPatientsPerPage] = useState<number>(() => {
    if (typeof window === 'undefined') return 10;
    const saved = window.localStorage.getItem('patientsPageSize');
    const n = saved ? parseInt(saved) : 10;
    return [10, 25, 50, 100].includes(n) ? n : 10;
  });
  const [viewMode, setViewMode] = useState<'table' | 'cards'>(() => {
    if (typeof window === 'undefined') return 'table';
    const saved = window.localStorage.getItem('patientsViewMode');
    return saved === 'cards' ? 'cards' : 'table';
  });

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) return;
    const q = searchParams.get('search') || '';
    if (q) setSearchQuery(q);
  }, [isClient, searchParams]);

  const isAuth = isClient && isAuthenticated();

  useEffect(() => {
    if (isClient && !isAuth) {
      router.replace('/login');
    }
  }, [isClient, isAuth, router]);

  useEffect(() => {
    if (!isClient || !isAuth) return;
    setIsLoading(true);
    const patientsCollection = collection(db, 'patients');
    const q = query(patientsCollection, orderBy('name'));
    const unsub = onSnapshot(q, (patientsSnapshot) => {
      const patientsList = patientsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Patient));
      setPatients(patientsList);
      setIsLoading(false);
    }, (error) => {
      console.error('Error fetching patients:', error);
      toast({
        title: 'خرابی',
        description: 'مریضوں کا ڈیٹا حاصل کرنے میں ناکامی۔ براہ کرم دوبارہ کوشش کریں۔',
        variant: 'destructive',
      });
      setIsLoading(false);
    });
    return () => unsub();
  }, [isClient, isAuth]);

  const calculateAge = (dobString: string, ageValue?: number) => {
    if (dobString) {
      const dob = new Date(dobString);
      if (!isNaN(dob.getTime())) {
        const today = new Date();
        let age = today.getFullYear() - dob.getFullYear();
        const m = today.getMonth() - dob.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
          age--;
        }
        return age;
      }
    }
    // Fallback to age field if DOB is not available
    if (ageValue !== undefined && ageValue !== null) {
      return ageValue;
    }
    return 'نامعلوم';
  };

  const handleSort = (key: keyof Patient) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key: keyof Patient) => {
    if (!sortConfig || sortConfig.key !== key) {
      return <ArrowUpDown className="ml-2 h-4 w-4" />;
    }
    return sortConfig.direction === 'asc' ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />;
  };

  const sortedAndFilteredPatients = useMemo(() => {
    let filtered = patients;
    
    // Apply search filter
    if (searchQuery.trim() !== '') {
      const lowercasedQuery = searchQuery.toLowerCase();
      filtered = patients.filter(patient => 
        patient.name.toLowerCase().includes(lowercasedQuery) ||
        (patient.patientNumber && patient.patientNumber.toLowerCase().includes(lowercasedQuery)) ||
        (patient.contactNumber && patient.contactNumber.includes(lowercasedQuery))
      );
    }
    
    // Apply sorting
    if (sortConfig !== null) {
      filtered.sort((a, b) => {
        // Special handling for age calculation
        if (sortConfig.key === 'age') {
          const ageA = calculateAge(a.dob || '', a.age);
          const ageB = calculateAge(b.dob || '', b.age);
          
          if (ageA === 'نامعلوم' && ageB === 'نامعلوم') return 0;
          if (ageA === 'نامعلوم') return sortConfig.direction === 'asc' ? 1 : -1;
          if (ageB === 'نامعلوم') return sortConfig.direction === 'asc' ? -1 : 1;
          
          return sortConfig.direction === 'asc' 
            ? (ageA as number) - (ageB as number) 
            : (ageB as number) - (ageA as number);
        }
        
        // Special handling for treatments count
        if (sortConfig.key === 'treatments') {
          const countA = a.treatments?.length || 0;
          const countB = b.treatments?.length || 0;
          return sortConfig.direction === 'asc' ? countA - countB : countB - countA;
        }
        
        // Default sorting for other fields
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];
        
        // Handle undefined values
        if (aValue === undefined && bValue === undefined) return 0;
        if (aValue === undefined) return sortConfig.direction === 'asc' ? 1 : -1;
        if (bValue === undefined) return sortConfig.direction === 'asc' ? -1 : 1;
        
        // Handle string comparisons
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          return sortConfig.direction === 'asc' 
            ? aValue.localeCompare(bValue) 
            : bValue.localeCompare(aValue);
        }
        
        // Handle number comparisons
        if (typeof aValue === 'number' && typeof bValue === 'number') {
          return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
        }
        
        // Convert to string for other types
        return sortConfig.direction === 'asc' 
          ? String(aValue).localeCompare(String(bValue)) 
          : String(bValue).localeCompare(String(aValue));
      });
    }
    
    return filtered;
  }, [patients, searchQuery, sortConfig]);

  const totalPages = useMemo(() => {
    return Math.ceil(sortedAndFilteredPatients.length / patientsPerPage) || 1;
  }, [sortedAndFilteredPatients, patientsPerPage]);

  const paginatedPatients = useMemo(() => {
    const startIndex = (currentPage - 1) * patientsPerPage;
    const endIndex = startIndex + patientsPerPage;
    return sortedAndFilteredPatients.slice(startIndex, endIndex);
  }, [sortedAndFilteredPatients, currentPage, patientsPerPage]);

  useEffect(() => {
    // Reset to first page when search or sort changes
    setCurrentPage(1);
  }, [searchQuery, sortConfig]);

  useEffect(() => {
    setCurrentPage(1);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('patientsPageSize', String(patientsPerPage));
    }
  }, [patientsPerPage]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('patientsViewMode', viewMode);
    }
  }, [viewMode]);

  

  const handleDeletePatient = async () => {
    if (!patientToDelete) return;
    
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, 'patients', patientToDelete.id));
      setPatients(prev => prev.filter(p => p.id !== patientToDelete.id));
      toast({
        title: "Patient Deleted",
        description: "Patient has been successfully deleted.",
      });
    } catch (error) {
      console.error('Error deleting patient:', error);
      toast({
        title: "Delete Failed",
        description: "Failed to delete patient. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setPatientToDelete(null);
      setIsDeleteDialogOpen(false);
    }
  };

  const openDeleteDialog = (patient: Patient) => {
    setPatientToDelete(patient);
    setIsDeleteDialogOpen(true);
  };

  const handleUpdatePatient = async (updatedPatient: Patient) => {
    try {
      const { id, ...data } = updatedPatient;
      const ref = doc(db, 'patients', id);
      await updateDoc(ref, data as any);
      toast({ title: 'مریض اپڈیٹ ہوا', description: 'تفصیلات محفوظ ہو گئیں۔' });
    } catch (e) {
      console.error('Update patient error', e);
      toast({ variant: 'destructive', title: 'اپڈیٹ ناکام', description: 'براہ کرم دوبارہ کوشش کریں۔' });
    }
  };

  if (!isClient || !isAuth) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8 text-muted-foreground">
        <div className="mb-4 rounded-full bg-accent/10 p-4 text-accent">
          <Stethoscope className="h-16 w-16 animate-pulse"/>
        </div>
        <h2 className="text-2xl font-headline text-foreground">مریض لوڈ ہو رہے ہیں...</h2>
        <p className="max-w-md">براہ کرم کچھ لمحہ انتظار کریں۔</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      

      <main className="container mx-auto px-4 py-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">تمام مریض</h1>
            <p className="text-muted-foreground">تمام مریضوں کو جدول میں دیکھیں اور منظم کریں</p>
          </div>
        </div>

        <div className="mb-6">
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="نام، آئی ڈی یا رابطہ نمبر سے مریض تلاش کریں..." 
                className="pl-10" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground whitespace-nowrap">ویو</span>
              <div className="flex rounded-md overflow-hidden border">
                <Button type="button" variant={viewMode === 'table' ? 'secondary' : 'ghost'} size="sm" className="rounded-none" onClick={() => setViewMode('table')}>ٹیبل</Button>
                <Button type="button" variant={viewMode === 'cards' ? 'secondary' : 'ghost'} size="sm" className="rounded-none" onClick={() => setViewMode('cards')}>کارڈ</Button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground whitespace-nowrap">فی صفحہ</span>
              <Select value={String(patientsPerPage)} onValueChange={(v) => setPatientsPerPage(parseInt(v))}>
                <SelectTrigger className="w-[100px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {viewMode === 'table' ? (
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="cursor-pointer" onClick={() => handleSort('patientNumber')}>
                    مریض آئی ڈی
                    <span className="float-right">{getSortIcon('patientNumber')}</span>
                  </TableHead>
                  <TableHead className="cursor-pointer" onClick={() => handleSort('name')}>
                    نام
                    <span className="float-right">{getSortIcon('name')}</span>
                  </TableHead>
                  <TableHead className="cursor-pointer" onClick={() => handleSort('age')}>
                    عمر
                    <span className="float-right">{getSortIcon('age')}</span>
                  </TableHead>
                  <TableHead className="cursor-pointer" onClick={() => handleSort('contactNumber')}>
                    رابطہ
                    <span className="float-right">{getSortIcon('contactNumber')}</span>
                  </TableHead>
                  <TableHead className="cursor-pointer" onClick={() => handleSort('sex')}>
                    جنس
                    <span className="float-right">{getSortIcon('sex')}</span>
                  </TableHead>
                  <TableHead className="cursor-pointer" onClick={() => handleSort('bloodGroup')}>
                    بلڈ گروپ
                    <span className="float-right">{getSortIcon('bloodGroup')}</span>
                  </TableHead>
                  <TableHead className="cursor-pointer" onClick={() => handleSort('treatments')}>
                    علاج
                    <span className="float-right">{getSortIcon('treatments')}</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, index) => (
                    <TableRow key={index}>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell className="text-right">
                        <Skeleton className="h-8 w-16 ml-auto" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : sortedAndFilteredPatients.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      <Stethoscope className="h-12 w-12 mx-auto mb-2" />
                      <p className="text-lg">کوئی مریض نہیں ملا</p>
                      <p>اپنی تلاش تبدیل کریں</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedPatients.map((patient) => (
                    <TableRow key={patient.id}>
                      <TableCell className="font-medium">{patient.patientNumber || 'نامعلوم'}</TableCell>
                      <TableCell>
                        <button className="underline-offset-2 hover:underline text-blue-700" onClick={() => router.push(`/patients/${patient.id}`)}>
                          {toUrduName(patient.name)}
                        </button>
                      </TableCell>
                      <TableCell>{calculateAge(patient.dob || '', patient.age)}</TableCell>
                      <TableCell>{patient.contactNumber || 'نامعلوم'}</TableCell>
                      <TableCell>{patient.sex || 'نامعلوم'}</TableCell>
                      <TableCell>{patient.bloodGroup || 'نامعلوم'}</TableCell>
                      <TableCell>{patient.treatments?.length || 0}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div>
            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Card key={i} className="bg-card/50">
                    <CardHeader>
                      <Skeleton className="h-5 w-40" />
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-8 w-24" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : sortedAndFilteredPatients.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground border rounded-lg">
                <Stethoscope className="h-12 w-12 mx-auto mb-2" />
                <p className="text-lg">کوئی مریض نہیں ملا</p>
                <p>اپنی تلاش تبدیل کریں</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {paginatedPatients.map((patient) => (
                  <Card key={patient.id} className="bg-card/50">
                    <CardHeader className="flex flex-row items-center gap-3">
                      <Avatar className="h-10 w-10">
                        {patient.avatarUrl && <AvatarImage src={patient.avatarUrl} alt={patient.patientNumber || toUrduName(patient.name)} />}
                        <AvatarFallback>{(patient.patientNumber || toUrduName(patient.name)).toString().slice(0,2)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <CardTitle className="text-base">
                          <button className="underline-offset-2 hover:underline" onClick={() => router.push(`/patients/${patient.id}`)}>
                            {toUrduName(patient.name)}
                          </button>
                        </CardTitle>
                        <CardDescription className="text-xs">آئی ڈی: {patient.patientNumber || '—'}</CardDescription>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="text-sm text-muted-foreground">عمر: {calculateAge(patient.dob || '', patient.age)}</div>
                      <div className="text-sm text-muted-foreground">رابطہ: {patient.contactNumber || '—'}</div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t pt-4 mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
            >
              پچھلا
            </Button>
            <div className="text-sm text-muted-foreground">
              صفحہ {currentPage} از {totalPages}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
            >
              اگلا
            </Button>
          </div>
        )}
      </main>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>کیا آپ یقینی ہیں؟</AlertDialogTitle>
            <AlertDialogDescription>
              یہ عمل واپس نہیں لیا جا سکتا۔ اس سے مریض 
              <span className="font-semibold"> {toUrduName(patientToDelete?.name || '')}</span> اور اس کا تمام متعلقہ ڈیٹا مستقل طور پر حذف ہو جائے گا۔
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>منسوخ کریں</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeletePatient} 
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeleting ? 'حذف کیا جا رہا ہے...' : 'حذف کریں'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function PatientsListPage() {
  return (
    <Suspense fallback={<div className="flex flex-col items-center justify-center h-full text-center p-8 text-muted-foreground">
      <div className="mb-4 rounded-full bg-accent/10 p-4 text-accent">
        <Stethoscope className="h-16 w-16 animate-pulse"/>
      </div>
      <h2 className="text-2xl font-headline text-foreground">مریض لوڈ ہو رہے ہیں...</h2>
      <p className="max-w-md">براہ کرم کچھ لمحہ انتظار کریں۔</p>
    </div>}>
      <PatientsListPageContent />
    </Suspense>
  );
}