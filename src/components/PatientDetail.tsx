"use client";

import { useState } from 'react';
import type { Patient, Treatment } from '@/lib/types';
import { TreatmentForm } from './TreatmentForm';
import { TreatmentCard } from './TreatmentCard';
import { ScrollArea } from './ui/scroll-area';
import { Timestamp } from 'firebase/firestore';
import { Button } from './ui/button';
import { BookText, Loader2, Pencil } from 'lucide-react';
// import { summarizeTreatmentHistory } from '@/ai/flows/summarize-treatment';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { EditPatientDialog } from './EditPatientDialog';


export type PatientDetailProps = {
  patient: Patient;
  onUpdatePatient: (patient: Patient) => void;
  onDeletePatient?: (patientId: string) => void;
  isDeleting?: boolean;
};

export const PatientDetail = ({ patient, onUpdatePatient, onDeletePatient, isDeleting }: PatientDetailProps) => {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const { toast } = useToast();
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);

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
      
      // const result = await summarizeTreatmentHistory({ patientDetails, treatmentHistory });
      // setSummary(result.summary);
      
      // Temporarily disabled AI summary for build
      setSummary("AI treatment summary temporarily disabled for production build.");

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
    
    const dobFormatted = new Date(patient.dob).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });

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
                    <p className="font-medium text-left cursor-pointer">{calculateAge(patient.dob)} years</p>
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
                <p className="font-medium">{new Date(firstTreatment.date).toLocaleDateString()}</p>
              </div>
            )}
            
            {lastTreatment && (
              <div>
                <p className="text-muted-foreground">Last Visit</p>
                <p className="font-medium">{new Date(lastTreatment.date).toLocaleDateString()}</p>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2 ml-6">
            <EditPatientDialog patient={patient} onUpdatePatient={onUpdatePatient} />
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
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Delete Patient</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Patient</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <span className="font-bold">{patient.name}</span>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting} onClick={() => setShowDeleteDialog(false)}>Cancel</AlertDialogCancel>
            <Button variant="destructive" disabled={isDeleting} onClick={() => {
              if (onDeletePatient) onDeletePatient(patient.id);
              setShowDeleteDialog(false);
            }}>
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
        </div>
      </header>
      
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
                    </tr>
                  </thead>
                  <tbody>
                    {sortedTreatments.map((treatment, index) => (
                      <tr key={treatment.id || index} className="border-b">
                        <td className="px-4 py-2">
                          <div>{new Date(treatment.date).toLocaleDateString()}</div>
                          <div className="text-xs text-muted-foreground mt-1">{treatment.time}</div>
                        </td>
                        <td className="px-4 py-2">{treatment.remedy || '-'}</td>
                        <td className="px-4 py-2 whitespace-pre-wrap">{treatment.observations}</td>
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
    </div>
  );
}
