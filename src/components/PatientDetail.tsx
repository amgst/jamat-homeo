"use client";

import { useState, useEffect } from 'react';
import type { Patient, Treatment } from '@/lib/types';
import { TreatmentForm } from './TreatmentForm';
import { TreatmentCard } from './TreatmentCard';
import { ScrollArea } from './ui/scroll-area';
import { Timestamp } from 'firebase/firestore';
import { Button } from './ui/button';
import { BookText, Loader2, Trash2 } from 'lucide-react';
import { summarizeTreatmentHistory } from '@/ai/flows/summarize-treatment';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { EditPatientDialog } from './EditPatientDialog';
import { EditTreatmentDialog } from './EditTreatmentDialog';


export type PatientDetailProps = {
  patient: Patient;
  onUpdatePatient: (patient: Patient) => void;
  onDeletePatient?: (patientId: string) => void;
  isDeleting?: boolean;
};

export const PatientDetail = ({ patient, onUpdatePatient, onDeletePatient, isDeleting }: PatientDetailProps) => {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showDeleteTreatmentDialog, setShowDeleteTreatmentDialog] = useState(false);
  const [treatmentToDelete, setTreatmentToDelete] = useState<string | null>(null);
  const { toast } = useToast();
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);

  // Open edit dialog when component mounts if requested
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const editMode = urlParams.get('edit') === 'true';
    if (editMode) {
      setShowEditDialog(true);
      // Remove the edit parameter from URL without reloading the page
      urlParams.delete('edit');
      const newUrl = `${window.location.pathname}${urlParams.toString() ? '?' + urlParams.toString() : ''}`;
      window.history.replaceState({}, '', newUrl);
    }
    
    // Listen for custom event to open edit dialog
    const handleOpenEditDialog = () => {
      setShowEditDialog(true);
    };

    window.addEventListener('openEditDialog', handleOpenEditDialog);

    return () => {
      window.removeEventListener('openEditDialog', handleOpenEditDialog);
    };
  }, []);

  const handleAddTreatment = (newTreatmentData: Omit<Treatment, 'id'>) => {
    // Firestore uses Timestamps for dates, so let's be consistent
    const newTreatment: Treatment = {
      id: `t_${Date.now()}`, // This is a temporary ID for the key, Firestore will generate its own
      ...newTreatmentData,
      date: Timestamp.fromDate(new Date(newTreatmentData.date)).toDate().toISOString().split('T')[0],
    };

    const updatedPatient: Patient = {
      ...patient,
      treatments: [newTreatment, ...(patient.treatments || [])],
    };

    onUpdatePatient(updatedPatient);
  };

  const handleUpdateTreatment = (updatedTreatment: Treatment) => {
    const updatedTreatments = (patient.treatments || []).map(treatment => 
      treatment.id === updatedTreatment.id ? updatedTreatment : treatment
    );

    const updatedPatient: Patient = {
      ...patient,
      treatments: updatedTreatments,
    };

    onUpdatePatient(updatedPatient);
  };

  const handleDeleteTreatment = (treatmentId: string) => {
    setTreatmentToDelete(treatmentId);
    setShowDeleteTreatmentDialog(true);
  };

  const confirmDeleteTreatment = () => {
    if (!treatmentToDelete) return;
    
    const updatedTreatments = (patient.treatments || []).filter(treatment => 
      treatment.id !== treatmentToDelete
    );

    const updatedPatient: Patient = {
      ...patient,
      treatments: updatedTreatments,
    };

    onUpdatePatient(updatedPatient);
    setShowDeleteTreatmentDialog(false);
    setTreatmentToDelete(null);
    
    toast({
      title: "Treatment Deleted",
      description: "The treatment record has been successfully deleted.",
    });
  };
  
  const handleSummarize = async () => {
    if (!patient.treatments || patient.treatments.length === 0) {
      toast({
        variant: "destructive",
        title: "No History Found",
        description: "There are no treatments to summarize for this patient.",
      });
      return;
    }
    
    setIsSummarizing(true);
    try {
      const patientDetails = `Name: ${patient.name}, DOB: ${patient.dob}`;
      const treatmentHistory = patient.treatments
        .map(t => `Date: ${t.date} ${t.time}\nRemedy: ${t.remedy || 'N/A'}\nObservations: ${t.observations}`)
        .join('\n\n---\n\n');
      
      const result = await summarizeTreatmentHistory({ patientDetails, treatmentHistory });
      setSummary(result.summary);

    } catch (error) {
      console.error("AI summary error:", error);
      toast({
        variant: "destructive",
        title: "Summary Failed",
        description: "Could not generate the patient summary. Please try again.",
      });
    } finally {
      setIsSummarizing(false);
    }
  };

    const sortedTreatments = (patient.treatments || []).sort((a, b) => {
        const dateA = new Date(`${a.date}T${a.time}`);
        const dateB = new Date(`${b.date}T${b.time}`);
        return dateB.getTime() - dateA.getTime();
    });

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
    
    const dobFormatted = patient.dob ? new Date(patient.dob).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' }) : 'N/A';

    // Get first and last treatment dates
    const getFirstTreatmentDate = () => {
        if (!patient.treatments || patient.treatments.length === 0) return null;
        const sortedByDate = [...patient.treatments].sort((a, b) => {
            const dateA = new Date(`${a.date}T${a.time}`);
            const dateB = new Date(`${b.date}T${b.time}`);
            return dateA.getTime() - dateB.getTime();
        });
        return sortedByDate[0];
    };

    const getLastTreatmentDate = () => {
        if (!patient.treatments || patient.treatments.length === 0) return null;
        const sortedByDate = [...patient.treatments].sort((a, b) => {
            const dateA = new Date(`${a.date}T${a.time}`);
            const dateB = new Date(`${b.date}T${b.time}`);
            return dateB.getTime() - dateA.getTime();
        });
        return sortedByDate[0];
    };

    const firstTreatment = getFirstTreatmentDate();
    const lastTreatment = getLastTreatmentDate();

  return (
    <div className="flex flex-col h-full">
      <header className="p-6 border-b flex items-start justify-between bg-card/50 shrink-0 max-md:hidden">
        <div className="flex-1">
          <div className="flex flex-col mb-4">
            <h1 className="text-3xl font-bold font-headline">{patient.name}</h1>
            {patient.patientNumber && (
              <div className="bg-primary/10 px-3 py-1 rounded-lg mt-2 w-fit">
                <span className="text-sm font-medium text-primary">Patient #: {patient.patientNumber}</span>
              </div>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Age</p>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <p className="font-medium text-left cursor-pointer">{calculateAge(patient.dob || '', patient.age) === 'N/A' ? 'N/A' : `${calculateAge(patient.dob || '', patient.age)} years`}</p>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>DOB: {dobFormatted}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            
            {patient.contactNumber && (
              <div>
                <p className="text-muted-foreground">Contact</p>
                <p className="font-medium">{patient.contactNumber}</p>
              </div>
            )}
            
            {firstTreatment && (
              <div>
                <p className="text-muted-foreground">First Visit</p>
                <p className="font-medium">{firstTreatment.date ? new Date(firstTreatment.date).toLocaleDateString() : 'N/A'}</p>
              </div>
            )}
            
            {lastTreatment && (
              <div>
                <p className="text-muted-foreground">Last Visit</p>
                <p className="font-medium">{lastTreatment.date ? new Date(lastTreatment.date).toLocaleDateString() : 'N/A'}</p>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2 ml-6">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button onClick={handleSummarize} disabled={isSummarizing} size="icon" variant="outline">
                    {isSummarizing ? <Loader2 className="animate-spin" /> : <BookText />}
                    <span className="sr-only">Summarize History</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Summarize History</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
            
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="destructive" size="icon" onClick={() => setShowDeleteDialog(true)} disabled={isDeleting}>
                    <span className="sr-only">Delete Patient</span>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Delete Patient</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
        </div>
      </header>
  {/* EditPatientDialog Removed */}
      <ScrollArea className="flex-1">
        <div className="p-6 space-y-8">
          <TreatmentForm patient={patient} onAddTreatment={handleAddTreatment} />
          
          <div>
            <h2 className="text-2xl font-bold font-headline mb-4">Treatment History</h2>
            {sortedTreatments && sortedTreatments.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full border rounded-lg bg-background/50">
                  <thead>
                    <tr className="bg-card/50">
                      <th className="px-4 py-2 text-left">Date & Time</th>
                      <th className="px-4 py-2 text-left">Remedy</th>
                      <th className="px-4 py-2 text-left">Observations</th>
                      <th className="px-4 py-2 text-left w-20">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedTreatments.map((treatment, index) => (
                      <tr key={treatment.id || index} className="border-b">
                        <td className="px-4 py-2">
                          <div>{treatment.date ? new Date(treatment.date).toLocaleDateString() : 'N/A'}</div>
                          <div className="text-xs text-muted-foreground mt-1">{treatment.time}</div>
                        </td>
                        <td className="px-4 py-2">{treatment.remedy || '-'}</td>
                        <td className="px-4 py-2 whitespace-pre-wrap">{treatment.observations}</td>
                        <td className="px-4 py-2">
                          <div className="flex items-center gap-2">
                            <EditTreatmentDialog 
                              treatment={treatment} 
                              onUpdateTreatment={handleUpdateTreatment} 
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteTreatment(treatment.id)}
                              className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-8 border-2 border-dashed rounded-lg">
                <p>No treatments recorded yet.</p>
                <p className="text-sm">Use the form above to add the first entry.</p>
              </div>
            )}
          </div>
        </div>
      </ScrollArea>
      
      <AlertDialog open={showDeleteTreatmentDialog} onOpenChange={setShowDeleteTreatmentDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Treatment Record</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this treatment record? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setShowDeleteTreatmentDialog(false);
              setTreatmentToDelete(null);
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteTreatment}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      <AlertDialog open={!!summary} onOpenChange={(open) => !open && setSummary(null)}>
        <AlertDialogContent className="max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Patient Summary for {patient.name}</AlertDialogTitle>
            <AlertDialogDescription className="text-foreground whitespace-pre-wrap font-body pt-4 max-h-[60vh] overflow-y-auto">
              {summary}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Close</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      <EditPatientDialog 
        patient={patient} 
        onUpdatePatient={onUpdatePatient}
      />
    </div>
  );
}
