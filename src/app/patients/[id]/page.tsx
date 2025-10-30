"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc, deleteDoc } from "firebase/firestore";
import type { Patient } from "@/lib/types";
import { PatientDetail } from "@/components/PatientDetail";
import { Stethoscope, ArrowRight, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { EditPatientDialog } from "@/components/EditPatientDialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';

export default function PatientDetailPage() {
  return (
    <Suspense fallback={<div>لوڈ ہو رہا ہے...</div>}>
      <PatientDetailPageContent />
    </Suspense>
  );
}

function PatientDetailPageContent() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const [isClient, setIsClient] = useState(false);
  const [isAuth, setIsAuth] = useState(false);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const patientId = useMemo(() => String(params?.id || ""), [params]);

  useEffect(() => {
    setIsClient(true);
    setIsAuth(isAuthenticated());
  }, []);

  useEffect(() => {
    if (!isClient) return;
    if (!isAuth) {
      router.replace("/login");
      return;
    }
    if (!patientId) return;
    const fetch = async () => {
      setLoading(true);
      try {
        const ref = doc(db, "patients", patientId);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          setPatient({ id: snap.id, ...(snap.data() as any) });
        } else {
          toast({ variant: "destructive", title: "مریض نہیں ملا" });
        }
      } catch (e) {
        console.error("Patient fetch failed", e);
        toast({ variant: "destructive", title: "ڈیٹا لوڈ نہیں ہو سکا" });
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [isClient, isAuth, patientId, router, toast]);

  const handleUpdatePatient = async (updated: Patient) => {
    try {
      const { id, ...data } = updated;
      await updateDoc(doc(db, "patients", id), data as any);
      setPatient(updated);
      toast({ title: "مریض اپڈیٹ ہوا", description: "تفصیلات محفوظ ہو گئیں۔" });
    } catch (e) {
      console.error("Update error", e);
      toast({ variant: "destructive", title: "اپڈیٹ ناکام" });
    }
  };

  const handleDeletePatient = async (id: string) => {
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, "patients", id));
      toast({ title: "حذف ہوگیا" });
      router.replace("/patients");
    } catch (e) {
      console.error("Delete error", e);
      toast({ variant: "destructive", title: "حذف ناکام" });
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isClient || !isAuth) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8 text-muted-foreground">
        <div className="mb-4 rounded-full bg-accent/10 p-4 text-accent">
          <Stethoscope className="h-16 w-16 animate-pulse" />
        </div>
        <h2 className="text-2xl font-headline text-foreground">لوڈ ہو رہا ہے...</h2>
        <p className="max-w-md">براہ کرم کچھ لمحہ انتظار کریں۔</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-2xl font-bold">مریض کی تفصیل</h1>
          </div>
          {patient && (
            <div className="flex gap-2">
              <EditPatientDialog patient={patient} onUpdatePatient={handleUpdatePatient} />
              <Button variant="outline" color="destructive" onClick={() => setShowDeleteDialog(true)} disabled={isDeleting}>
                Remove Patient
              </Button>
            </div>
          )}
        </div>
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>مریض حذف کریں</AlertDialogTitle>
              <AlertDialogDescription>کیا آپ اس مریض کو مکمل طور پر حذف کرنا چاہتے ہیں؟ یہ کارروائی واپس نہیں لی جا سکتی!</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>منسوخ کریں</AlertDialogCancel>
              <AlertDialogAction 
                className="bg-destructive text-white hover:bg-destructive/90" 
                onClick={() => {
                  if(patient) handleDeletePatient(patient.id);
                  setShowDeleteDialog(false);
                }}
                disabled={isDeleting}
              >
                {isDeleting ? 'حذف ہو رہا ہے...' : 'حذف کریں'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        {loading || !patient ? (
          <div className="text-muted-foreground">لوڈ ہو رہا ہے...</div>
        ) : (
          <PatientDetail patient={patient} onUpdatePatient={handleUpdatePatient} onDeletePatient={handleDeletePatient} isDeleting={isDeleting} />
        )}
      </main>
    </div>
  );
}


