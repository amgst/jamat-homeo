"use client";
import React, { useState, useEffect } from "react";
import { AddPatientDialog } from "@/components/AddPatientDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { db } from "@/lib/firebase";
import { addDoc, collection, doc, getDoc, setDoc, updateDoc, query, where, getDocs } from "firebase/firestore";
import type { Patient, Camp } from "@/lib/types";
import { EditPatientDialog } from "@/components/EditPatientDialog";
import { useRouter } from "next/navigation";

export default function CampPage() {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [camp, setCamp] = useState<Camp | null>(null);
  const [campPatients, setCampPatients] = useState<Patient[]>([]);
  const [isCampEditing, setIsCampEditing] = useState(true);
  const [campForm, setCampForm] = useState({
    name: '',
    date: '',
    location: '',
  });
  const [editPatient, setEditPatient] = useState<Patient|null>(null);
  const [sortField, setSortField] = useState<'patientNumber' | 'name' | 'contactNumber' | 'age' | 'sex'>('patientNumber');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  // In useEffect, load both all-camp patients (campId filter) and regular patients
  // Remove all regularPatients state/logic and rendering for regulars

  // Load last-used camp or create new
  useEffect(() => {
    // (For MVP assume only 1 active camp)
    (async () => {
      const campsQ = query(collection(db, 'camps'));
      const campsSnap = await getDocs(campsQ);
      if (!campsSnap.empty) {
        const campDoc = campsSnap.docs[0];
        setCamp({ id: campDoc.id, ...(campDoc.data() as any) });
        setCampForm({
          name: campDoc.data().name ?? '',
          date: campDoc.data().date ?? '',
          location: campDoc.data().location ?? '',
        });
        setIsCampEditing(false);
      }
    })();
  }, []);

  // Load patients for this camp
  useEffect(() => {
    if (!camp) return;
    (async () => {
      // Camp patients
      const qP = query(collection(db, 'patients'), where('campId', '==', camp.id));
      const snapP = await getDocs(qP);
      setCampPatients(snapP.docs.map(doc => ({ id: doc.id, ...doc.data() } as Patient)));
    })();
  }, [camp]);

  const handleCampChange = (e: any) => {
    setCampForm({ ...campForm, [e.target.name]: e.target.value });
  };
  
  const handleSaveCamp = async () => {
    if (!campForm.name || !campForm.date) return;
    if (camp) {
      // Update existing camp
      await updateDoc(doc(db, 'camps', camp.id), campForm);
      setCamp({ ...camp, ...campForm });
      setIsCampEditing(false);
    } else {
      // Create new camp
      const created = await addDoc(collection(db, 'camps'), campForm);
      setCamp({ id: created.id, ...campForm });
      setIsCampEditing(false);
    }
  };

  const handleAddPatient = async () => {
    // After registering a patient, reload camp patients
    if (camp) {
      const qP = query(collection(db, 'patients'), where('campId', '==', camp.id));
      const snapP = await getDocs(qP);
      setCampPatients(snapP.docs.map(doc => ({ id: doc.id, ...doc.data() } as Patient)));
    }
    setShowAddDialog(false);
  };

  const handleUpdatedPatient = async (updated: Patient) => {
    try {
      await updateDoc(doc(db, 'patients', updated.id), updated);
      setCampPatients((prev) => prev.map((p) => p.id === updated.id ? updated : p));
      setEditPatient(null);
    } catch(e) {
      alert('Failed to update');
      setEditPatient(null);
    }
  };

  const sortedCampPatients = [...campPatients].sort((a, b) => {
    let aVal: any = a[sortField] ?? '';
    let bVal: any = b[sortField] ?? '';
    if(sortField === 'age') {
      aVal = +aVal || 0; bVal = +bVal || 0;
    }
    if(sortField === 'patientNumber') {
      // Natural sort for CAMP-<num>
      const extractNum = (num: string) => parseInt((num || '').replace(/\D/g, '')) || 0;
      aVal = extractNum(aVal); bVal = extractNum(bVal);
    }
    if(typeof aVal === 'string' && typeof bVal === 'string') {
      return (sortDirection === 'asc' ? 1 : -1) * aVal.localeCompare(bVal, undefined, {numeric: true, sensitivity: 'base'});
    }
    return (sortDirection === 'asc' ? 1 : -1) * ((aVal > bVal) ? 1 : (aVal < bVal) ? -1 : 0);
  });
  const handleSort = (field: 'patientNumber' | 'name' | 'contactNumber' | 'age' | 'sex') => {
    if (sortField === field) setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDirection('asc'); }
  };

  const router = useRouter();

  return (
    <main className="max-w-4xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Camp Registration</h1>
      <section className="mb-6 bg-white rounded shadow p-4">
        <h2 className="text-xl font-semibold mb-2">Camp Details</h2>
        {isCampEditing ? (
          <div className="flex flex-col md:flex-row gap-4">
            <Input placeholder="Camp Name" name="name" value={campForm.name} onChange={handleCampChange} />
            <Input type="date" placeholder="Date" name="date" value={campForm.date} onChange={handleCampChange} />
            <Input placeholder="Location" name="location" value={campForm.location} onChange={handleCampChange} />
            <Button onClick={handleSaveCamp}>Save Camp</Button>
          </div>
        ) : (
          <div className="flex flex-col md:flex-row items-center gap-6">
            <p><b>Name:</b> {camp?.name}</p>
            <p><b>Date:</b> {camp?.date}</p>
            <p><b>Location:</b> {camp?.location}</p>
            <Button size="sm" variant="outline" onClick={() => setIsCampEditing(true)}>Edit</Button>
          </div>
        )}
      </section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Registered Camp Patients</h2>
        <Button onClick={() => setShowAddDialog(true)} disabled={!camp}>
          Register New Patient
        </Button>
      </div>
      <section className="bg-white rounded shadow p-4 mb-8">
        <h3 className="font-bold mb-2">کیمپ کے مریض</h3>
        {sortedCampPatients.length ? (
          <table className="min-w-full mb-4">
            <thead>
            <tr>
              <th className="cursor-pointer" onClick={() => handleSort('patientNumber')}>Number {sortField==='patientNumber' ? (sortDirection==='asc'? '▲':'▼') : ''}</th>
              <th className="cursor-pointer" onClick={() => handleSort('name')}>Name {sortField==='name' ? (sortDirection==='asc'? '▲':'▼') : ''}</th>
              <th className="cursor-pointer" onClick={() => handleSort('contactNumber')}>Contact {sortField==='contactNumber' ? (sortDirection==='asc'? '▲':'▼') : ''}</th>
              <th className="cursor-pointer" onClick={() => handleSort('age')}>Age {sortField==='age' ? (sortDirection==='asc'? '▲':'▼') : ''}</th>
              <th className="cursor-pointer" onClick={() => handleSort('sex')}>Sex {sortField==='sex' ? (sortDirection==='asc'? '▲':'▼') : ''}</th>
              <th>Edit</th>
            </tr>
            </thead>
            <tbody>
              {sortedCampPatients.map((p) => (
                <tr key={p.id}>
                  <td>
                    <button className="underline text-blue-600 hover:text-blue-900" onClick={() => router.push(`/patients/${p.id}`)}>
                      {p.patientNumber}
                    </button>
                  </td>
                  <td>{p.name}</td><td>{p.contactNumber}</td><td>{p.age || '-'}</td><td>{p.sex}</td>
                  <td><Button variant="outline" size="sm" onClick={() => setEditPatient(p)}>Edit</Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-gray-500">No camp patients yet.</p>
        )}
        {editPatient && (
          <EditPatientDialog 
            patient={editPatient} 
            onUpdatePatient={handleUpdatedPatient} 
            open={!!editPatient}
            onOpenChange={(open) => {
              if (!open) setEditPatient(null);
            }}
          />
        )}
      </section>
      {/* Pass campId to dialog for patient registration */}
      <AddPatientDialog 
        open={showAddDialog} 
        onOpenChange={setShowAddDialog} 
        campId={camp?.id}
        onAddPatient={handleAddPatient}
        existingPatients={campPatients}
      />
    </main>
  );
}
