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
      title: "علاج حذف ہو گیا",
      description: "علاج کا ریکارڈ کامیابی سے حذف کر دیا گیا ہے۔",
    });
  };
  
  const handleSummarize = async () => {
    if (!patient.treatments || patient.treatments.length === 0) {
      toast({
        variant: "destructive",
        title: "کوئی سابقہ تاریخ نہیں ملی",
        description: "اس مریض کے لیے خلاصہ کرنے کے لیے کوئی علاج موجود نہیں ہے۔",
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
        title: "خلاصہ ناکام",
        description: "مریض کا خلاصہ تیار نہیں کیا جا سکا۔ براہ کرم دوبارہ کوشش کریں۔",
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
      <header className="p-6 border-b flex items-start justify-between bg-card/50 shrink-0 max-md:hidden">
        <div className="flex-1">
          <div className="flex flex-col mb-4">
            <h1 className="text-3xl font-bold font-headline">{patient.name}</h1>
            {patient.patientNumber && (
              <div className="bg-primary/10 px-3 py-1 rounded-lg mt-2 w-fit">
                <span className="text-sm font-medium text-primary">مریض #: {patient.patientNumber}</span>
              </div>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">عمر</p>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <p className="font-medium cursor-pointer">{calculateAge(patient.dob || '', patient.age) === 'نامعلوم' ? 'نامعلوم' : `${calculateAge(patient.dob || '', patient.age)} سال`}</p>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>تاریخِ پیدائش: {dobFormatted}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            
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
        
        <div className="flex items-center gap-2 ml-6">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button onClick={handleSummarize} disabled={isSummarizing} size="icon" variant="outline">
                    {isSummarizing ? <Loader2 className="animate-spin" /> : <BookText />}
                    <span className="sr-only">خلاصہ بنائیں</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>خلاصہ بنائیں</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
            
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="destructive" size="icon" onClick={() => setShowDeleteDialog(true)} disabled={isDeleting}>
                    <span className="sr-only">مریض حذف کریں</span>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>مریض حذف کریں</p>
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
            <h2 className="text-2xl font-bold font-headline mb-4">علاج کی تاریخ</h2>
            {sortedTreatments && sortedTreatments.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full border rounded-lg bg-background/50">
                  <thead>
                    <tr className="bg-card/50">
                      <th className="px-4 py-2 text-left">تاریخ اور وقت</th>
                      <th className="px-4 py-2 text-left">علاج</th>
                      <th className="px-4 py-2 text-left">مشاہدات</th>
                      <th className="px-4 py-2 text-left w-20">عمل</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedTreatments.map((treatment, index) => (
                      <tr key={treatment.id || index} className="border-b">
                        <td className="px-4 py-2">
                          <div>{treatment.date ? new Date(treatment.date).toLocaleDateString('ur-PK') : 'نامعلوم'}</div>
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
      
      <AlertDialog open={!!summary} onOpenChange={(open) => !open && setSummary(null)}>
        <AlertDialogContent className="max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>مریض کا خلاصہ: {patient.name}</AlertDialogTitle>
            <AlertDialogDescription className="text-foreground whitespace-pre-wrap font-body pt-4 max-h-[60vh] overflow-y-auto">
              {summary}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>بند کریں</AlertDialogCancel>
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
