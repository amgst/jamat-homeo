"use client";

import React, { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where, updateDoc, doc } from "firebase/firestore";
import type { Patient, Camp } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Circle, User, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function DoctorPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isClient, setIsClient] = useState(false);
  const [isAuth, setIsAuth] = useState(false);
  const [campPatients, setCampPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [camps, setCamps] = useState<Camp[]>([]);
  const [selectedCampId, setSelectedCampId] = useState<string>("all");

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
    loadCamps();
    loadCampPatients();
  }, [isClient, isAuth, selectedCampId]);

  const loadCamps = async () => {
    try {
      const campsQ = query(collection(db, 'camps'));
      const campsSnap = await getDocs(campsQ);
      const allCamps = campsSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as Camp[];
      setCamps(allCamps);
    } catch (e) {
      console.error("Error loading camps:", e);
    }
  };

  const loadCampPatients = async () => {
    setLoading(true);
    try {
      let patients: Patient[] = [];
      
      if (selectedCampId === "all") {
        // Get all patients that have a campId (camp patients)
        // Load all patients and filter client-side
        const allPatientsSnap = await getDocs(collection(db, 'patients'));
        patients = allPatientsSnap.docs
          .map(doc => ({ id: doc.id, ...doc.data() } as Patient))
          .filter(p => (p as any).campId != null && (p as any).campId !== '');
      } else {
        const q = query(collection(db, 'patients'), where('campId', '==', selectedCampId));
        const snap = await getDocs(q);
        patients = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Patient));
      }
      
      // Sort: unchecked first, then by name
      patients.sort((a, b) => {
        const aChecked = (a as any).doctorChecked === true;
        const bChecked = (b as any).doctorChecked === true;
        if (aChecked !== bChecked) {
          return aChecked ? 1 : -1;
        }
        return (a.name || '').localeCompare(b.name || '');
      });
      setCampPatients(patients);
    } catch (e) {
      console.error("Error loading camp patients:", e);
      toast({ variant: "destructive", title: "ڈیٹا لوڈ نہیں ہو سکا" });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleChecked = async (patientId: string, currentStatus: boolean) => {
    try {
      const patientRef = doc(db, 'patients', patientId);
      const now = new Date();
      await updateDoc(patientRef, {
        doctorChecked: !currentStatus,
        doctorCheckedAt: !currentStatus ? now.toISOString() : null,
      });
      
      // Update local state
      setCampPatients(prev => prev.map(p => 
        p.id === patientId 
          ? { ...p, doctorChecked: !currentStatus, doctorCheckedAt: !currentStatus ? now.toISOString() : undefined } as any
          : p
      ));
      
      toast({ 
        title: !currentStatus ? "مریض چیک ہو گیا" : "مریض غیر چیک ہو گیا",
        description: !currentStatus ? "مریض کا معائنہ مکمل ہو گیا" : "مریض دوبارہ معائنے کے لئے تیار ہے"
      });
    } catch (e) {
      console.error("Error updating patient:", e);
      toast({ variant: "destructive", title: "اپڈیٹ ناکام" });
    }
  };

  const formatTime = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleTimeString('ur-PK', { hour: '2-digit', minute: '2-digit' });
  };

  if (!isClient || !isAuth) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Clock className="h-8 w-8 animate-spin mx-auto mb-2" />
          <p>لوڈ ہو رہا ہے...</p>
        </div>
      </div>
    );
  }

  const checkedCount = campPatients.filter(p => (p as any).doctorChecked === true).length;
  const totalCount = campPatients.length;

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <main className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-4">ڈاکٹر کی فہرست</h1>
          
          <div className="flex items-center gap-4 mb-4">
            <label className="font-medium">کیمپ منتخب کریں:</label>
            <Select value={selectedCampId} onValueChange={setSelectedCampId}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="تمام کیمپ" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">تمام کیمپ</SelectItem>
                {camps.map(camp => (
                  <SelectItem key={camp.id} value={camp.id}>
                    {(camp as any).name} — {(camp as any).date}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="bg-card p-4 rounded-lg shadow mb-4">
            <div className="flex items-center gap-6">
              <div>
                <span className="text-muted-foreground">کل مریض:</span>
                <span className="font-bold text-lg mr-2">{totalCount}</span>
              </div>
              <div>
                <span className="text-muted-foreground">چیک شدہ:</span>
                <span className="font-bold text-lg text-green-600 mr-2">{checkedCount}</span>
              </div>
              <div>
                <span className="text-muted-foreground">باقی:</span>
                <span className="font-bold text-lg text-orange-600 mr-2">{totalCount - checkedCount}</span>
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Clock className="h-8 w-8 animate-spin mr-2" />
            <p>لوڈ ہو رہا ہے...</p>
          </div>
        ) : campPatients.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <User className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>کوئی کیمپ مریض نہیں ملا</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {campPatients.map((patient) => {
              const isChecked = (patient as any).doctorChecked === true;
              const checkedAt = (patient as any).doctorCheckedAt;
              return (
                <div
                  key={patient.id}
                  className={`p-4 rounded-lg border-2 transition-all cursor-pointer ${
                    isChecked 
                      ? 'bg-green-50 border-green-300' 
                      : 'bg-white border-gray-200 hover:border-primary'
                  }`}
                  onClick={() => router.push(`/patients/${patient.id}`)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg mb-1 hover:underline">{patient.name}</h3>
                      {patient.patientNumber && (
                        <p className="text-sm text-muted-foreground">#{patient.patientNumber}</p>
                      )}
                      {patient.contactNumber && (
                        <p className="text-sm text-muted-foreground">{patient.contactNumber}</p>
                      )}
                      {isChecked && checkedAt && (
                        <p className="text-xs text-green-600 mt-2">
                          <Clock className="h-3 w-3 inline mr-1" />
                          {formatTime(checkedAt)}
                        </p>
                      )}
                    </div>
                    <Button
                      variant={isChecked ? "default" : "outline"}
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleChecked(patient.id, isChecked);
                      }}
                      className={isChecked ? "bg-green-600 hover:bg-green-700" : ""}
                    >
                      {isChecked ? (
                        <>
                          <CheckCircle2 className="h-4 w-4 ml-2" />
                          مکمل
                        </>
                      ) : (
                        <>
                          <Circle className="h-4 w-4 ml-2" />
                          چیک کریں
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

