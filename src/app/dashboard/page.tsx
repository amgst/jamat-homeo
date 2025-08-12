"use client";

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { Patient } from '@/lib/types';
import { isAuthenticated, logout } from '@/lib/auth';
import { db } from '@/lib/firebase';
import { collection, getDocs, addDoc, doc, updateDoc, query, orderBy } from 'firebase/firestore';


import { AddPatientDialog } from '@/components/AddPatientDialog';
import { PatientDetail } from '@/components/PatientDetail';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { UserPlus, Search, Stethoscope, LogOut, PanelLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from '@/components/ui/sheet';

export default function DashboardPage() {
    const router = useRouter();
    const [patients, setPatients] = useState<Patient[]>([]);
    const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isAuth, setIsAuth] = useState(false);
    const [isPatientListOpen, setIsPatientListOpen] = useState(false);


    useEffect(() => {
        const auth = isAuthenticated();
        setIsAuth(auth);
        if (!auth) {
            router.replace('/login');
        } else {
            fetchPatients();
        }
    }, [router]);

    const fetchPatients = async () => {
        setIsLoading(true);
        try {
            const patientsCollection = collection(db, 'patients');
            const q = query(patientsCollection, orderBy('name'));
            const patientsSnapshot = await getDocs(q);
            const patientsList = patientsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Patient));
            setPatients(patientsList);
            if (patientsList.length > 0 && !selectedPatientId) {
                setSelectedPatientId(patientsList[0].id);
            }
        } catch (error) {
            console.error("Error fetching patients:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddPatient = async (newPatientData: Omit<Patient, 'id' | 'treatments' | 'avatarUrl'>) => {
        console.log('handleAddPatient called with:', newPatientData);
        try {
            console.log('Attempting to add patient to Firestore...');
            const docRef = await addDoc(collection(db, "patients"), {
                ...newPatientData,
                avatarUrl: ``,
                treatments: [],
            });
            console.log('Patient added successfully with ID:', docRef.id);
            await fetchPatients();
            setSelectedPatientId(docRef.id);
            setIsPatientListOpen(false); // Close sheet on mobile after adding
            console.log('Patient list updated and selected');
        } catch (error) {
            console.error("Error adding patient: ", error);
            alert('Failed to add patient: ' + error.message);
        }
    };

    const handleUpdatePatient = async (updatedPatient: Patient) => {
         try {
            const patientRef = doc(db, "patients", updatedPatient.id);
            const { id, ...patientData } = updatedPatient;
            await updateDoc(patientRef, patientData);
            
            setPatients(prev => prev.map(p => p.id === updatedPatient.id ? updatedPatient : p));
             if (selectedPatientId !== updatedPatient.id) {
                setSelectedPatientId(updatedPatient.id);
            }
        } catch (error) {
            console.error("Error updating patient: ", error);
        }
    };
    
    const handleLogout = () => {
        logout();
        router.replace('/login');
    };
    
    const calculateAge = (dobString: string) => {
        const dob = new Date(dobString);
        const today = new Date();
        let age = today.getFullYear() - dob.getFullYear();
        const m = today.getMonth() - dob.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
            age--;
        }
        return age;
    };

    const filteredPatients = useMemo(() => {
        if (!searchQuery) return patients;
        const lowercasedQuery = searchQuery.toLowerCase();
        return patients.filter(patient => 
            patient.name.toLowerCase().includes(lowercasedQuery) ||
            patient.dob.includes(lowercasedQuery) ||
            (patient.treatments && patient.treatments.some(t => t.observations.toLowerCase().includes(lowercasedQuery)))
        );
    }, [patients, searchQuery]);

    const selectedPatient = useMemo(() => {
        return patients.find(p => p.id === selectedPatientId) ?? null;
    }, [patients, selectedPatientId]);

    const handleSelectPatient = (patientId: string) => {
        setSelectedPatientId(patientId);
        setIsPatientListOpen(false); // Close sheet on mobile after selection
    }
    
    if (!isAuth) {
        return null; // or a loading spinner
    }

    const PatientListContent = () => (
        <div className="flex flex-col bg-card/50 h-full">
            <header className="p-4 border-b flex justify-between items-center shrink-0">
                <Logo />
                <div className="flex items-center gap-2">
                  <AddPatientDialog onAddPatient={handleAddPatient} />
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
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                        placeholder="Search patients..." 
                        className="pl-10" 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
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
                           {filteredPatients.map(patient => (
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
                                           {patient.avatarUrl && <AvatarImage src={patient.avatarUrl} alt={patient.name} data-ai-hint="person" />}
                                           <AvatarFallback>{patient.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                                       </Avatar>
                                       <div className="overflow-hidden">
                                           <p className="font-semibold truncate">{patient.name}</p>
                                           <p className="text-sm text-muted-foreground">Age: {calculateAge(patient.dob)}</p>
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
        <div className="grid md:grid-cols-[350px_1fr] h-full bg-background font-body text-foreground">
            <aside className="hidden md:flex md:flex-col md:border-r">
                <PatientListContent />
            </aside>
            
            <main className="flex-1 flex flex-col overflow-y-auto">
                {/* Mobile Header */}
                <header className="md:hidden flex items-center justify-between p-4 border-b">
                     <Sheet open={isPatientListOpen} onOpenChange={setIsPatientListOpen}>
                        <SheetTrigger asChild>
                            <Button variant="outline" size="icon">
                                <PanelLeft className="h-5 w-5" />
                                <span className="sr-only">Show Patients</span>
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="left" className="p-0 w-[320px]">
                            <SheetTitle className="sr-only">Patient List</SheetTitle>
                            <SheetDescription className="sr-only">A list of all patients in the system.</SheetDescription>
                            <PatientListContent />
                        </SheetContent>
                    </Sheet>
                    <div className="text-lg font-bold">
                        {selectedPatient ? selectedPatient.name : 'Select Patient'}
                    </div>
                    <div className="w-10"></div>
                </header>
            
                <div className="flex-1 overflow-y-auto">
                    {isLoading && !selectedPatient ? (
                        <div className="flex flex-col items-center justify-center h-full text-center p-8 text-muted-foreground">
                           <div className="mb-4 rounded-full bg-accent/10 p-4 text-accent">
                              <Stethoscope className="h-16 w-16 animate-pulse"/>
                            </div>
                            <h2 className="text-2xl font-headline text-foreground">Loading Patients...</h2>
                            <p className="max-w-md">Fetching data from the secure database.</p>
                        </div>
                    ) : selectedPatient ? (
                        <PatientDetail key={selectedPatient.id} patient={selectedPatient} onUpdatePatient={handleUpdatePatient} />
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-center p-8 text-muted-foreground">
                            <div className="mb-4 rounded-full bg-accent/10 p-4 text-accent">
                              <Stethoscope className="h-16 w-16 "/>
                            </div>
                            <h2 className="text-2xl font-headline text-foreground">Select a patient</h2>
                            <p className="max-w-md">Choose a patient from the list to see their details, or add a new patient to get started.</p>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
