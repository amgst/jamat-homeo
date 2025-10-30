
"use client";
export const dynamic = "force-dynamic";

import { useState, useMemo, useEffect, Suspense } from 'react';
import { format, isSameDay } from 'date-fns';
import { useSearchParams, useRouter } from 'next/navigation';
import type { Patient } from '@/lib/types';
import { isAuthenticated } from '@/lib/auth';
import { db } from '@/lib/firebase';
import { collection, getDocs, addDoc, doc, updateDoc, query, orderBy, deleteDoc } from 'firebase/firestore';


import { AddPatientDialog } from '@/components/AddPatientDialog';
import { PatientDetail } from '@/components/PatientDetail';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, Stethoscope, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { cn, toUrduName } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { useToast } from '@/hooks/use-toast';

export default function DashboardPage() {
  return (
    <Suspense fallback={<div>لوڈ ہو رہا ہے...</div>}>
      <DashboardPageContent />
    </Suspense>
  );
}

function DashboardPageContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { toast } = useToast();
    const [patients, setPatients] = useState<Patient[]>([]);
    const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isClient, setIsClient] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [sortBy, setSortBy] = useState<'name' | 'patientNumber' | 'dateAdded'>('patientNumber');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
    const [currentPage, setCurrentPage] = useState(1);
    const patientsPerPage = 10;
    const [todayQueueCount, setTodayQueueCount] = useState<number>(0);

    useEffect(() => {
        setIsClient(true);
    }, []);

    // Handle URL parameters for patient selection and edit mode
    useEffect(() => {
        if (isClient) {
            const patientId = searchParams.get('patientId');
            const editMode = searchParams.get('edit') === 'true';
            
            if (patientId) {
                setSelectedPatientId(patientId);
                if (editMode) {
                    // Dispatch event to open edit dialog
                    setTimeout(() => {
                        window.dispatchEvent(new CustomEvent('openEditDialog'));
                    }, 100);
                }
            }
        }
    }, [searchParams, isClient]);

    const handleDeletePatient = async (patientId: string) => {
        setIsDeleting(true);
        try {
            await deleteDoc(doc(db, 'patients', patientId));
            setPatients(prev => prev.filter(p => p.id !== patientId));
            setSelectedPatientId(null);
        } catch (error) {
            console.error('Error deleting patient:', error);
            alert('Failed to delete patient.');
        } finally {
            setIsDeleting(false);
        }
    };

    const isAuth = isClient && isAuthenticated();

    useEffect(() => {
        if (isClient) {
            if (!isAuth) {
                router.replace('/login');
            } else {
                fetchPatients();
                fetchTodayQueueCount();
            }
        }
    }, [isClient, isAuth, router]);

    const fetchPatients = async () => {
        setIsLoading(true);
        try {
            const patientsCollection = collection(db, 'patients');
            const q = query(patientsCollection, orderBy('name'));
            const patientsSnapshot = await getDocs(q);
            const patientsList = patientsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Patient));
            setPatients(patientsList);
        } catch (error) {
            console.error("Error fetching patients:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddPatient = async () => {
        // Refresh the patients list after adding
        await fetchPatients();
    };

    const handleUpdatePatient = async (updatedPatient: Patient) => {
         try {
            console.log('handleUpdatePatient called with:', updatedPatient);
            const patientRef = doc(db, "patients", updatedPatient.id);
            const { id, ...patientData } = updatedPatient;
            // Remove undefined values so Firestore doesn't receive them
            const sanitizedData = Object.fromEntries(
                Object.entries(patientData).filter(([_, v]) => v !== undefined)
            ) as Omit<Patient, 'id'>;
            console.log('Patient data to update:', sanitizedData);
            await updateDoc(patientRef, sanitizedData);
            
            setPatients(prev => prev.map(p => p.id === updatedPatient.id ? updatedPatient : p));
             if (selectedPatientId !== updatedPatient.id) {
                setSelectedPatientId(updatedPatient.id);
            }
            console.log('Patient updated successfully');
            toast({
                title: "مریض کی معلومات اپڈیٹ ہو گئی",
                description: "مریض کی معلومات کامیابی سے اپڈیٹ کر دی گئی ہیں۔",
            });
        } catch (error) {
            console.error("Error updating patient: ", error);
            toast({
                title: "اپڈیٹ ناکام",
                description: "مریض کی معلومات اپڈیٹ کرنے میں ناکامی۔ براہ کرم دوبارہ کوشش کریں۔",
                variant: "destructive",
            });
        }
    };
    
    
    
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

    const fetchTodayQueueCount = async () => {
        try {
            const today = format(new Date(), 'yyyy-MM-dd');
            const q = query(collection(db, 'campQueue'), orderBy('createdAtDay'));
            const snap = await getDocs(q);
            const count = snap.docs.filter(d => (d.data() as any).createdAtDay === today).length;
            setTodayQueueCount(count);
        } catch (e) {
            console.warn('Failed to fetch today queue count', e);
        }
    };

    const filteredAndSortedPatients = useMemo(() => {
        let filtered = patients;
        
        // Apply search filter
        if (searchQuery) {
            const lowercasedQuery = searchQuery.toLowerCase();
            filtered = patients.filter(patient => 
                patient.name.toLowerCase().includes(lowercasedQuery) ||
                patient.dob?.includes(lowercasedQuery) ||
                (patient.patientNumber && patient.patientNumber.toLowerCase().includes(lowercasedQuery)) ||
                (patient.treatments && patient.treatments.some(t => t.observations.toLowerCase().includes(lowercasedQuery)))
            );
        }
        
        // Apply sorting
        return [...filtered].sort((a, b) => {
            let aValue: string | number;
            let bValue: string | number;
            
            switch (sortBy) {
                case 'name':
                    aValue = a.name.toLowerCase();
                    bValue = b.name.toLowerCase();
                    break;
                case 'patientNumber':
                    aValue = a.patientNumber || '';
                    bValue = b.patientNumber || '';
                    break;
                case 'dateAdded':
                    aValue = a.id; // Using ID as proxy for date added
                    bValue = b.id;
                    break;
                default:
                    return 0;
            }
            
            if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
            return 0;
        });
    }, [patients, searchQuery, sortBy, sortOrder]);

    // Calculate paginated patients and total pages
    const paginatedPatients = useMemo(() => {
        const startIndex = (currentPage - 1) * patientsPerPage;
        const endIndex = startIndex + patientsPerPage;
        return filteredAndSortedPatients.slice(startIndex, endIndex);
    }, [filteredAndSortedPatients, currentPage]);

    const totalPages = useMemo(() => {
        return Math.ceil(filteredAndSortedPatients.length / patientsPerPage);
    }, [filteredAndSortedPatients]);

    const selectedPatient = useMemo(() => {
        return patients.find(p => p.id === selectedPatientId) ?? null;
    }, [patients, selectedPatientId]);

    const handleSelectPatient = (patientId: string) => {
        setSelectedPatientId(patientId);
    }
    
    const handleSort = (newSortBy: 'name' | 'patientNumber' | 'dateAdded') => {
        if (sortBy === newSortBy) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(newSortBy);
            setSortOrder('asc');
        }
    };
    
    const getSortIcon = (field: 'name' | 'patientNumber' | 'dateAdded') => {
        if (sortBy !== field) return <ArrowUpDown className="h-3 w-3" />;
        return sortOrder === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />;
    };
    
    if (!isClient || !isAuth) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-center p-8 text-muted-foreground">
               <div className="mb-4 rounded-full bg-accent/10 p-4 text-accent">
                  <Stethoscope className="h-16 w-16 animate-pulse"/>
                </div>
                <h2 className="text-2xl font-headline text-foreground">ڈیش بورڈ لوڈ ہو رہا ہے...</h2>
                <p className="max-w-md">براہ کرم کچھ لمحہ انتظار کریں۔</p>
            </div>
        );
    }

    const PatientListContent = () => (
        <div className="flex flex-col bg-card/50 h-full">
            
            
            <div className="p-4 shrink-0">
                <div className="relative mb-3">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                        placeholder="مریضوں کو تلاش کریں..." 
                        className="pl-10" 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                
                {/* Sort Controls */}
                <div className="flex gap-1 text-xs">
                    <Button 
                        variant={sortBy === 'patientNumber' ? 'secondary' : 'ghost'} 
                        size="sm" 
                        onClick={() => handleSort('patientNumber')}
                        className="h-7 px-2 text-xs"
                    >
                        آئی ڈی {getSortIcon('patientNumber')}
                    </Button>
                    <Button 
                        variant={sortBy === 'name' ? 'secondary' : 'ghost'} 
                        size="sm" 
                        onClick={() => handleSort('name')}
                        className="h-7 px-2 text-xs"
                    >
                        نام {getSortIcon('name')}
                    </Button>
                    <Button 
                        variant={sortBy === 'dateAdded' ? 'secondary' : 'ghost'} 
                        size="sm" 
                        onClick={() => handleSort('dateAdded')}
                        className="h-7 px-2 text-xs"
                    >
                        شامل کیا گیا {getSortIcon('dateAdded')}
                    </Button>
                </div>
            </div>

            <ScrollArea className="flex-1">
                <nav className="px-4 pb-4">
                    {isLoading && patients.length === 0 ? (
                         <ul className="space-y-1">
                            {[...Array(5)].map((_, i) => (
                                <li key={i} className="flex items-center space-x-3 w-full p-2">
                                    <Skeleton className="h-10 w-10 rounded-full" />
                                    <div className="space-y-2">
                                        <Skeleton className="h-4 w-[150px]" />
                                        <Skeleton className="h-3 w-[100px]" />
                                    </div>
                                </li>
                            ))}
                        </ul>
                    ) : (
                         <ul className="space-y-1">
                           {filteredAndSortedPatients.map(patient => (
                               <li key={patient.id}>
                                   <button
                                      onClick={() => handleSelectPatient(patient.id)}
                                      className={cn(
                                          'flex items-center space-x-3 w-full p-2 rounded-lg text-left transition-colors',
                                          selectedPatientId === patient.id
                                              ? 'bg-accent text-accent-foreground'
                                              : 'hover:bg-accent/20'
                                      )}
                                      aria-current={selectedPatientId === patient.id}
                                   >
                                       <Avatar className="h-10 w-10">
                                           {patient.avatarUrl && <AvatarImage src={patient.avatarUrl} alt={patient.patientNumber || toUrduName(patient.name)} data-ai-hint="person" />}
                                           <AvatarFallback>{patient.patientNumber || toUrduName(patient.name).split(' ').map((n: string) => n[0]).join('')}</AvatarFallback>
                                       </Avatar>
                                       <div className="overflow-hidden">
                                           <div className="flex items-center gap-2">
                                               <p className="font-semibold truncate">{toUrduName(patient.name)}</p>
                                           </div>
                                           <p className="text-sm text-muted-foreground">Age: {calculateAge(patient.dob || '', patient.age) === 'N/A' ? 'N/A' : `${calculateAge(patient.dob || '', patient.age)} years`}</p>
                                       </div>
                                   </button>
                               </li>
                           ))}
                        </ul>
                    )}
                </nav>
            </ScrollArea>
        </div>
    );

    return (
        <div className="min-h-screen bg-background">
            

            <main className="container mx-auto px-4 py-6">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-3xl font-bold">مریضوں کا نظم و نسق</h1>
                        <p className="text-muted-foreground">اپنے مریضوں کو منظم کریں</p>
                    </div>
                    <AddPatientDialog onAddPatient={handleAddPatient} existingPatients={patients} />
                </div>

                {/* Google-like search at top */}
                <div className="mb-8">
                    <div className="max-w-2xl mx-auto">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                            <Input 
                                placeholder="نام، آئی ڈی یا رابطہ نمبر سے تلاش کریں..." 
                                className="pl-10 h-12 rounded-full text-lg" 
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        const q = searchQuery.trim();
                                        if (q) {
                                            router.push(`/patients?search=${encodeURIComponent(q)}`);
                                        } else {
                                            router.push('/patients');
                                        }
                                    }
                                }}
                            />
                        </div>
                    </div>
                </div>

                {/* Top metrics */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <div className="border rounded-lg p-4 bg-card/50">
                        <p className="text-sm text-muted-foreground">کل مریض</p>
                        <p className="text-2xl font-bold mt-1">{patients.length}</p>
                    </div>
                    <div className="border rounded-lg p-4 bg-card/50">
                        <p className="text-sm text-muted-foreground">آج کی رجسٹریشنز</p>
                        <p className="text-2xl font-bold mt-1">{
                            patients.filter(p => {
                                const created = (p as any).createdAt;
                                if (!created) return false;
                                const date = typeof created === 'string' ? new Date(created) : new Date(created.seconds ? created.seconds * 1000 : created);
                                return isSameDay(date, new Date());
                            }).length
                        }</p>
                    </div>
                    <div className="border rounded-lg p-4 bg-card/50">
                        <p className="text-sm text-muted-foreground">آج کا کیو</p>
                        <p className="text-2xl font-bold mt-1">{todayQueueCount}</p>
                    </div>
                    <div className="border rounded-lg p-4 bg-card/50">
                        <p className="text-sm text-muted-foreground">منتخب مریض</p>
                        <p className="text-2xl font-bold mt-1">{selectedPatientId ? 1 : 0}</p>
                    </div>
                </div>

                {/* Queue overview */}
                <div className="mb-6">
                    
                </div>

                {/* Removed patients list and detail from dashboard */}
            </main>
        </div>
    );
}