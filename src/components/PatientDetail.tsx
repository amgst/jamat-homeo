"use client";

import { useState, useEffect } from 'react';
import type { Patient, Treatment } from '@/lib/types';
import { TreatmentForm } from './TreatmentForm';
import { TreatmentCard } from './TreatmentCard';
import { ScrollArea } from './ui/scroll-area';
import { Timestamp } from 'firebase/firestore';
import { Button } from './ui/button';
import { BookText, Loader2, Trash2 } from 'lucide-react';
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
  // Remove summarizeTreatmentHistory import, summary, isSummarizing, handleSummarize, and any references
  // Remove any buttons, UI, or dialog for summarizing patient treatments
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
      title: "علاج حذف ہو گیا",
      description: "علاج کا ریکارڈ کامیابی سے حذف کر دیا گیا ہے۔",
    });
  };
  
  // Remove summarizeTreatmentHistory import, summary, isSummarizing, handleSummarize, and any references
  // Remove any buttons, UI, or dialog for summarizing patient treatments

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
        return 'نامعلوم';
    };
    
    const dobFormatted = patient.dob ? new Date(patient.dob).toLocaleDateString('ur-PK', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' }) : 'نامعلوم';

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
      <header className="p-4 border-b flex items-start justify-between bg-card/50 shrink-0 max-md:hidden">
        <div className="flex-1">
          <div className="flex flex-col mb-4">
            <h1 className="text-3xl font-bold font-headline flex items-baseline gap-3">
              {patient.name}
              <span className="text-sm text-muted-foreground" title={`تاریخِ پیدائش: ${dobFormatted}`}>
                {calculateAge(patient.dob || '', patient.age) === 'نامعلوم' ? 'نامعلوم' : `${calculateAge(patient.dob || '', patient.age)} سال`}
              </span>
            </h1>
            {patient.patientNumber && (
              <div className="bg-primary/10 px-3 py-1 rounded-lg mt-2 w-fit">
                <span className="text-sm font-medium text-primary">مریض #: {patient.patientNumber}</span>
              </div>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
            
            {patient.contactNumber && (
              <div>
                <p className="text-muted-foreground">رابطہ</p>
                <p className="font-medium">{patient.contactNumber}</p>
              </div>
            )}
            
            {firstTreatment && (
              <div>
                <p className="text-muted-foreground">پہلا معائنہ</p>
                <p className="font-medium">{firstTreatment.date ? new Date(firstTreatment.date).toLocaleDateString('ur-PK') : 'نامعلوم'}</p>
              </div>
            )}
            
            {lastTreatment && (
              <div>
                <p className="text-muted-foreground">آخری معائنہ</p>
                <p className="font-medium">{lastTreatment.date ? new Date(lastTreatment.date).toLocaleDateString('ur-PK') : 'نامعلوم'}</p>
              </div>
            )}
          </div>
        </div>
        
        {/* Remove the entire div for header actions: summary and patient delete button */}
      </header>
  {/* EditPatientDialog Removed */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          <TreatmentForm patient={patient} onAddTreatment={handleAddTreatment} />
          
          <div>
            <h2 className="text-xl font-bold font-headline mb-3">علاج کی تاریخ</h2>
            {sortedTreatments && sortedTreatments.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full border rounded-lg bg-background/50">
                  <thead>
                    <tr className="bg-card/50">
                      <th className="px-3 py-1.5 text-right">تاریخ اور وقت</th>
                      <th className="px-3 py-1.5 text-right">علاج</th>
                      <th className="px-3 py-1.5 text-right">مشاہدات</th>
                      <th className="px-3 py-1.5 text-right w-20">عمل</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedTreatments.map((treatment, index) => (
                      <tr key={treatment.id || index} className="border-b">
                        <td className="px-3 py-1.5 text-right">
                          <div>{treatment.date ? new Date(treatment.date).toLocaleDateString('ur-PK') : 'نامعلوم'}</div>
                          <div className="text-xs text-muted-foreground mt-1">{treatment.time}</div>
                        </td>
                        <td className="px-3 py-1.5 text-right">{treatment.remedy || '-'}</td>
                        <td className="px-3 py-1.5 whitespace-pre-wrap text-right">{treatment.observations}</td>
                        <td className="px-3 py-1.5">
                          <div className="flex items-center gap-2">
                            <EditTreatmentDialog 
                              treatment={treatment} 
                              onUpdateTreatment={handleUpdateTreatment} 
                            />
                            {/* Remove delete button for treatments here */}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-8 border-2 border-dashed rounded-lg">
                <p>ابھی تک کوئی علاج ریکارڈ نہیں ہوا۔</p>
                <p className="text-sm">اوپر موجود فارم کا استعمال کر کے پہلی اندراج شامل کریں۔</p>
              </div>
            )}
          </div>
        </div>
      </ScrollArea>
      
      <AlertDialog open={showDeleteTreatmentDialog} onOpenChange={setShowDeleteTreatmentDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>علاج کا ریکارڈ حذف کریں</AlertDialogTitle>
            <AlertDialogDescription>
              کیا آپ اس علاج کا ریکارڈ حذف کرنا چاہتے ہیں؟ یہ کارروائی واپس نہیں لی جا سکتی۔
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setShowDeleteTreatmentDialog(false);
              setTreatmentToDelete(null);
            }}>
              منسوخ کریں
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteTreatment}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              حذف کریں
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Remove summarizeTreatmentHistory import, summary, isSummarizing, handleSummarize, and any references
  // Remove any buttons, UI, or dialog for summarizing patient treatments */}
      
      <EditPatientDialog 
        patient={patient} 
        onUpdatePatient={onUpdatePatient}
      />
    </div>
  );
}
