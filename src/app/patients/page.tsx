"use client";

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import type { Patient } from '@/lib/types';
import { isAuthenticated, logout } from '@/lib/auth';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, orderBy, deleteDoc, doc } from 'firebase/firestore';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, LogOut, Pill, Stethoscope, Edit, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
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

export default function PatientsListPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isClient, setIsClient] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [patientToDelete, setPatientToDelete] = useState<Patient | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ key: keyof Patient; direction: 'asc' | 'desc' } | null>(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

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
      toast({
        title: "Error",
        description: "Failed to fetch patients. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
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
    return 'N/A';
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
          
          if (ageA === 'N/A' && ageB === 'N/A') return 0;
          if (ageA === 'N/A') return sortConfig.direction === 'asc' ? 1 : -1;
          if (ageB === 'N/A') return sortConfig.direction === 'asc' ? -1 : 1;
          
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

  const handleLogout = () => {
    logout();
    router.replace('/login');
  };

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

  if (!isClient || !isAuth) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8 text-muted-foreground">
        <div className="mb-4 rounded-full bg-accent/10 p-4 text-accent">
          <Stethoscope className="h-16 w-16 animate-pulse"/>
        </div>
        <h2 className="text-2xl font-headline text-foreground">Loading Patients...</h2>
        <p className="max-w-md">Please wait a moment.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="cursor-pointer" onClick={() => router.push('/')}>
              <Logo />
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => router.push('/dashboard')}>
                Dashboard
              </Button>
              <Button variant="secondary">
                Patients
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
            <h1 className="text-3xl font-bold">All Patients</h1>
            <p className="text-muted-foreground">View and manage all patients in a table format</p>
          </div>
        </div>

        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search patients by name, ID, or contact number..." 
              className="pl-10" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="cursor-pointer" onClick={() => handleSort('patientNumber')}>
                  Patient ID
                  <span className="float-right">{getSortIcon('patientNumber')}</span>
                </TableHead>
                <TableHead className="cursor-pointer" onClick={() => handleSort('name')}>
                  Name
                  <span className="float-right">{getSortIcon('name')}</span>
                </TableHead>
                <TableHead className="cursor-pointer" onClick={() => handleSort('age')}>
                  Age
                  <span className="float-right">{getSortIcon('age')}</span>
                </TableHead>
                <TableHead className="cursor-pointer" onClick={() => handleSort('contactNumber')}>
                  Contact
                  <span className="float-right">{getSortIcon('contactNumber')}</span>
                </TableHead>
                <TableHead className="cursor-pointer" onClick={() => handleSort('sex')}>
                  Sex
                  <span className="float-right">{getSortIcon('sex')}</span>
                </TableHead>
                <TableHead className="cursor-pointer" onClick={() => handleSort('bloodGroup')}>
                  Blood Group
                  <span className="float-right">{getSortIcon('bloodGroup')}</span>
                </TableHead>
                <TableHead className="cursor-pointer" onClick={() => handleSort('treatments')}>
                  Treatments
                  <span className="float-right">{getSortIcon('treatments')}</span>
                </TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                // Skeleton loading rows
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
                    <p className="text-lg">No patients found</p>
                    <p>Try adjusting your search query</p>
                  </TableCell>
                </TableRow>
              ) : (
                sortedAndFilteredPatients.map((patient) => (
                  <TableRow key={patient.id}>
                    <TableCell className="font-medium">{patient.patientNumber || 'N/A'}</TableCell>
                    <TableCell>{patient.name}</TableCell>
                    <TableCell>{calculateAge(patient.dob || '', patient.age)}</TableCell>
                    <TableCell>{patient.contactNumber || 'N/A'}</TableCell>
                    <TableCell>{patient.sex || 'N/A'}</TableCell>
                    <TableCell>{patient.bloodGroup || 'N/A'}</TableCell>
                    <TableCell>{patient.treatments?.length || 0}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => router.push(`/dashboard?patientId=${patient.id}&edit=true`)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </main>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the patient 
              <span className="font-semibold"> {patientToDelete?.name}</span> and all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeletePatient} 
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}