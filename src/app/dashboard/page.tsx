
"use client";
export const dynamic = "force-dynamic";

import { useState, useMemo, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import type { Patient } from '@/lib/types';
import { isAuthenticated, logout } from '@/lib/auth';
import { db } from '@/lib/firebase';
import { collection, getDocs, addDoc, doc, updateDoc, query, orderBy, deleteDoc } from 'firebase/firestore';


import { AddPatientDialog } from '@/components/AddPatientDialog';
import { PatientDetail } from '@/components/PatientDetail';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { UserPlus, Search, Stethoscope, LogOut, PanelLeft, ArrowUpDown, ArrowUp, ArrowDown, Pill } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { useToast } from '@/hooks/use-toast';

export default function DashboardPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
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
                title: "Patient Updated",
                description: "Patient information has been successfully updated.",
            });
        } catch (error) {
            console.error("Error updating patient: ", error);
            toast({
                title: "Update Failed",
                description: "Failed to update patient information. Please try again.",
                variant: "destructive",
            });
        }
    };
    
    const handleLogout = () => {
        logout();
        router.replace('/login');
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
        return 'N/A';
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
                <h2 className="text-2xl font-headline text-foreground">Loading Dashboard...</h2>
                <p className="max-w-md">Please wait a moment.</p>
            </div>
        );
    }

    const PatientListContent = () => (
        <div className="flex flex-col bg-card/50 h-full">
            <header className="p-4 border-b flex justify-between items-center shrink-0">
                <div className="cursor-pointer" onClick={() => router.push('/')}>
                    <Logo />
                </div>
                <div className="flex items-center gap-2">
                  <AddPatientDialog onAddPatient={handleAddPatient} existingPatients={patients} />
                   <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" onClick={() => router.push('/patients')} className="text-muted-foreground hover:text-foreground">
                                    <PanelLeft className="h-5 w-5" />
                                    <span className="sr-only">Patient List</span>
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                            <p>Patient List</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                   <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" onClick={() => router.push('/medicines')} className="text-muted-foreground hover:text-foreground">
                                    <Pill className="h-5 w-5" />
                                    <span className="sr-only">Medicines</span>
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                            <p>Medicines</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                   <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" onClick={handleLogout} className="text-muted-foreground hover:text-foreground">
                                    <LogOut className="h-5 w-5" />
                                    <span className="sr-only">Logout</span>
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                            <p>Logout</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>
            </header>
            
            <div className="p-4 shrink-0">
                <div className="relative mb-3">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                        placeholder="Search patients..." 
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
                        ID {getSortIcon('patientNumber')}
                    </Button>
                    <Button 
                        variant={sortBy === 'name' ? 'secondary' : 'ghost'} 
                        size="sm" 
                        onClick={() => handleSort('name')}
                        className="h-7 px-2 text-xs"
                    >
                        Name {getSortIcon('name')}
                    </Button>
                    <Button 
                        variant={sortBy === 'dateAdded' ? 'secondary' : 'ghost'} 
                        size="sm" 
                        onClick={() => handleSort('dateAdded')}
                        className="h-7 px-2 text-xs"
                    >
                        Added {getSortIcon('dateAdded')}
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
                                           {patient.avatarUrl && <AvatarImage src={patient.avatarUrl} alt={patient.patientNumber || patient.name} data-ai-hint="person" />}
                                           <AvatarFallback>{patient.patientNumber || patient.name.split(' ').map((n: string) => n[0]).join('')}</AvatarFallback>
                                       </Avatar>
                                       <div className="overflow-hidden">
                                           <div className="flex items-center gap-2">
                                               <p className="font-semibold truncate">{patient.name}</p>
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
            <header className="border-b bg-card/50">
                <div className="container mx-auto px-4 py-4 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <div className="cursor-pointer" onClick={() => router.push('/')}>
                            <Logo />
                        </div>
                        <div className="flex gap-2">
                            <Button variant="secondary">
                                Patients
                            </Button>
                            <Button variant="ghost" onClick={() => router.push('/patients')}>
                                Patient List
                            </Button>
                            <Button variant="ghost" onClick={() => router.push('/medicines')}>
                                Medicines
                            </Button>
                        </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={handleLogout}>
                        <LogOut className="h-5 w-5" />
                    </Button>
                </div>
            </header>

            <main className="container mx-auto px-4 py-6">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-3xl font-bold">Patient Management</h1>
                        <p className="text-muted-foreground">Manage your patients</p>
                    </div>
                    <AddPatientDialog onAddPatient={handleAddPatient} existingPatients={patients} />
                </div>

                <div className="mb-6">
                    <div className="relative mb-3">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                            placeholder="Search patients..." 
                            className="pl-10" 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    
                    <div className="flex gap-1 text-xs">
                        <Button 
                            variant={sortBy === 'patientNumber' ? 'secondary' : 'ghost'} 
                            size="sm" 
                            onClick={() => handleSort('patientNumber')}
                            className="h-7 px-2 text-xs"
                        >
                            ID {getSortIcon('patientNumber')}
                        </Button>
                        <Button 
                            variant={sortBy === 'name' ? 'secondary' : 'ghost'} 
                            size="sm" 
                            onClick={() => handleSort('name')}
                            className="h-7 px-2 text-xs"
                        >
                            Name {getSortIcon('name')}
                        </Button>
                        <Button 
                            variant={sortBy === 'dateAdded' ? 'secondary' : 'ghost'} 
                            size="sm" 
                            onClick={() => handleSort('dateAdded')}
                            className="h-7 px-2 text-xs"
                        >
                            Added {getSortIcon('dateAdded')}
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-6">
                    <div className="space-y-4">
                        {paginatedPatients.map((patient: Patient) => (
                            <div key={patient.id} className={`border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer ${
                                selectedPatientId === patient.id ? 'bg-accent border-accent-foreground' : ''
                            }`} onClick={() => handleSelectPatient(patient.id)}>
                                <div className="flex items-center space-x-3">
                                    <Avatar className="h-12 w-12">
                                        {patient.avatarUrl && <AvatarImage src={patient.avatarUrl} alt={patient.patientNumber || patient.name} />}
                                        <AvatarFallback>{patient.patientNumber || patient.name.split(' ').map((n: string) => n[0]).join('')}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <h3 className="font-semibold">{patient.name}</h3>
                                        <p className="text-sm text-muted-foreground">Age: {calculateAge(patient.dob || '', patient.age) === 'N/A' ? 'N/A' : `${calculateAge(patient.dob || '', patient.age)} years`}</p>
                                        {patient.patientNumber && <p className="text-xs text-muted-foreground">ID: {patient.patientNumber}</p>}
                                    </div>
                                </div>
                            </div>
                        ))}
                        
                        {/* Pagination Controls */}
                        {totalPages > 1 && (
                            <div className="flex items-center justify-between border-t pt-4">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                    disabled={currentPage === 1}
                                >
                                    Previous
                                </Button>
                                
                                <div className="text-sm text-muted-foreground">
                                    Page {currentPage} of {totalPages}
                                </div>
                                
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                    disabled={currentPage === totalPages}
                                >
                                    Next
                                </Button>
                            </div>
                        )}
                    </div>

                    <div>
                        {selectedPatient ? (
                            <PatientDetail key={selectedPatient.id} patient={selectedPatient} onUpdatePatient={handleUpdatePatient} onDeletePatient={handleDeletePatient} isDeleting={isDeleting} />
                        ) : (
                            <div className="flex flex-col items-center justify-center h-64 text-center p-8 text-muted-foreground border rounded-lg">
                                <Stethoscope className="h-16 w-16 mb-4" />
                                <h3 className="text-lg font-semibold">Select a patient</h3>
                                <p>Choose a patient from the list to see their details</p>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}