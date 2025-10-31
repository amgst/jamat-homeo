"use client";
import React, { useState, useEffect } from "react";
import { AddPatientDialog } from "@/components/AddPatientDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { db } from "@/lib/firebase";
import { addDoc, collection, doc, getDoc, setDoc, updateDoc, query, where, getDocs, deleteDoc, deleteField } from "firebase/firestore";
import type { Patient, Camp } from "@/lib/types";
import { EditPatientDialog } from "@/components/EditPatientDialog";
import { useRouter } from "next/navigation";
import { AddExistingPatientDialog } from "@/components/AddExistingPatientDialog";

export default function CampPage() {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [camp, setCamp] = useState<Camp | null>(null);
  const [campPatients, setCampPatients] = useState<Patient[]>([]);
  const [isCampEditing, setIsCampEditing] = useState(true);
  const [camps, setCamps] = useState<Camp[]>([]);
  const [selectedCampId, setSelectedCampId] = useState<string>('');
  const [campForm, setCampForm] = useState({
    name: '',
    date: '',
    location: '',
  });
  const [editPatient, setEditPatient] = useState<Patient|null>(null);
  const [sortField, setSortField] = useState<'patientNumber' | 'name' | 'contactNumber' | 'age' | 'sex'>('patientNumber');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [showAddExisting, setShowAddExisting] = useState(false);
  // In useEffect, load both all-camp patients (campId filter) and regular patients
  // Remove all regularPatients state/logic and rendering for regulars

  // Load all camps and select the first (for now)
  useEffect(() => {
    // (For MVP assume only 1 active camp)
    (async () => {
      const campsQ = query(collection(db, 'camps'));
      const campsSnap = await getDocs(campsQ);
      const allCamps = campsSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as Camp[];
      setCamps(allCamps);
      if (allCamps.length > 0) {
        const first = allCamps[0];
        setCamp(first);
        setSelectedCampId(first.id);
        setCampForm({
          name: (first as any).name ?? '',
          date: (first as any).date ?? '',
          location: (first as any).location ?? '',
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

  const handleSelectCamp = (e: any) => {
    const id = e.target.value as string;
    setSelectedCampId(id);
    const selected = camps.find(c => c.id === id) || null;
    setCamp(selected ?? null);
    if (selected) {
      setCampForm({
        name: (selected as any).name ?? '',
        date: (selected as any).date ?? '',
        location: (selected as any).location ?? '',
      });
      setIsCampEditing(false);
    } else {
      setCampForm({ name: '', date: '', location: '' });
      setIsCampEditing(true);
    }
  };
  
  const handleSaveCamp = async () => {
    if (!campForm.name || !campForm.date) return;
    if (camp) {
      // Update existing camp
      await updateDoc(doc(db, 'camps', camp.id), campForm);
      setCamp({ ...camp, ...campForm });
      setCamps(prev => prev.map(c => c.id === camp.id ? { ...c, ...campForm } as Camp : c));
      setIsCampEditing(false);
    } else {
      // Create new camp
      const created = await addDoc(collection(db, 'camps'), campForm);
      setCamp({ id: created.id, ...campForm });
      setCamps(prev => [...prev, { id: created.id, ...campForm } as Camp]);
      setSelectedCampId(created.id);
      setIsCampEditing(false);
    }
  };

  const handleDeleteCamp = async () => {
    if (!camp) return;
    if (campPatients.length > 0) return; // Safety guard; button should be disabled anyway
    const confirmDelete = window.confirm('Delete this empty camp? This cannot be undone.');
    if (!confirmDelete) return;
    await deleteDoc(doc(db, 'camps', camp.id));
    // Remove from local list
    const remaining = camps.filter(c => c.id !== camp.id);
    setCamps(remaining);
    if (remaining.length > 0) {
      const next = remaining[0];
      setCamp(next);
      setSelectedCampId(next.id);
      setCampForm({
        name: (next as any).name ?? '',
        date: (next as any).date ?? '',
        location: (next as any).location ?? '',
      });
      setIsCampEditing(false);
    } else {
      // No camps left, go to new camp mode
      setCamp(null);
      setSelectedCampId('');
      setCampForm({ name: '', date: '', location: '' });
      setCampPatients([]);
      setIsCampEditing(true);
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

  const handleAddedExisting = async () => {
    if (camp) {
      const qP = query(collection(db, 'patients'), where('campId', '==', camp.id));
      const snapP = await getDocs(qP);
      setCampPatients(snapP.docs.map(doc => ({ id: doc.id, ...doc.data() } as Patient)));
    }
    setShowAddExisting(false);
  };

  const handleUpdatedPatient = async (updated: Patient) => {
    try {
      // Remove undefined fields and immutable fields before update
      const { id, createdAt, ...rest } = updated as any;
      const cleaned: Record<string, any> = {};
      Object.entries(rest).forEach(([key, value]) => {
        if (value !== undefined) cleaned[key] = value;
      });
      await updateDoc(doc(db, 'patients', id), cleaned);
      setCampPatients((prev) => prev.map((p) => p.id === id ? { ...(p as any), ...cleaned } as Patient : p));
      setEditPatient(null);
    } catch(e) {
      alert('Failed to update');
      setEditPatient(null);
    }
  };

  const handleRemoveFromCamp = async (patientId: string) => {
    if (!camp) return;
    const confirmRemove = window.confirm('Remove this patient from the camp list? Patient record will remain.');
    if (!confirmRemove) return;
    try {
      await updateDoc(doc(db, 'patients', patientId), { campId: deleteField() });
      setCampPatients(prev => prev.filter(p => p.id !== patientId));
    } catch(e) {
      alert('Failed to remove from camp');
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

  // Camp stats (total, by gender, by age bands)
  const campStats = React.useMemo(() => {
    const safeParseAge = (p: Patient): number | null => {
      if (typeof (p as any).age === 'number') return (p as any).age;
      if (typeof (p as any).age === 'string') {
        const n = parseInt((p as any).age);
        return isNaN(n) ? null : n;
      }
      if ((p as any).dob) {
        const dobStr = (p as any).dob as string;
        const d = new Date(dobStr);
        if (!isNaN(d.getTime())) {
          const today = new Date();
          let years = today.getFullYear() - d.getFullYear();
          const m = today.getMonth() - d.getMonth();
          if (m < 0 || (m === 0 && today.getDate() < d.getDate())) years--;
          return years;
        }
      }
      return null;
    };

    const total = campPatients.length;
    let male = 0, female = 0;
    const ageGroups: Record<'kids' | 'adults' | 'old', number> = { kids: 0, adults: 0, old: 0 };

    for (const p of campPatients) {
      const sex = ((p as any).sex || '').toString().toLowerCase();
      if (sex === 'male' || sex === 'm') male++;
      else if (sex === 'female' || sex === 'f') female++;

      const age = safeParseAge(p);
      if (age !== null && age >= 0) {
        if (age < 18) ageGroups.kids++;
        else if (age <= 40) ageGroups.adults++;
        else ageGroups.old++;
      }
    }

    return { total, male, female, ageGroups };
  }, [campPatients]);

  ;
  return (
    <main className="max-w-4xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Camp Registration</h1>
      <section className="mb-6 bg-white rounded shadow p-4">
        <h2 className="text-xl font-semibold mb-2">Camp Details</h2>
        <div>
          <div className="mb-3">
            <label className="mr-2 font-medium">Switch Camp:</label>
            <select className="border rounded p-2" value={selectedCampId} onChange={handleSelectCamp}>
              {camps.map(c => (
                <option key={c.id} value={c.id}>{(c as any).name} — {(c as any).date}</option>
              ))}
              <option value="">— New Camp —</option>
            </select>
          </div>
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
              {/* New Camp Button */}
              <Button size="sm" variant="secondary" onClick={() => {
                setCamp(null);
                setCampForm({ name: '', date: '', location: '' });
                setIsCampEditing(true);
              }}>
                + نئی کیمپ بنائیں
              </Button>
              {/* Delete Empty Camp Button */}
              <Button
                size="sm"
                variant="destructive"
                onClick={handleDeleteCamp}
                disabled={!camp || campPatients.length > 0}
                title={campPatients.length > 0 ? 'Cannot delete: camp has patients' : 'Delete this empty camp'}
              >
                Delete Empty Camp
              </Button>
            </div>
          )}
        </div>
      </section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Registered Camp Patients</h2>
        <div className="flex gap-2">
          <Button onClick={() => setShowAddExisting(true)} disabled={!camp}>
            Add Existing Patient
          </Button>
          <Button onClick={() => setShowAddDialog(true)} disabled={!camp}>
            Register New Patient
          </Button>
        </div>
      </div>
      {/* Camp summary stats */}
      <section className="bg-white rounded shadow p-4 mb-4">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-center">
          <div className="p-3 border rounded">
            <div className="text-xs text-muted-foreground">Total</div>
            <div className="text-xl font-semibold">{campStats.total}</div>
          </div>
          <div className="p-3 border rounded">
            <div className="text-xs text-muted-foreground">Male</div>
            <div className="text-xl font-semibold">{campStats.male}</div>
          </div>
          <div className="p-3 border rounded">
            <div className="text-xs text-muted-foreground">Female</div>
            <div className="text-xl font-semibold">{campStats.female}</div>
          </div>
          <div className="p-3 border rounded">
            <div className="text-xs text-muted-foreground">Kids (&lt;18) / Adults (18-40) / Old (40+)</div>
            <div className="text-sm font-medium">
              {campStats.ageGroups.kids} / {campStats.ageGroups.adults} / {campStats.ageGroups.old}
            </div>
          </div>
        </div>
      </section>
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
                  <td className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setEditPatient(p)}>Edit</Button>
                    <Button variant="destructive" size="sm" onClick={() => handleRemoveFromCamp(p.id)}>Remove</Button>
                  </td>
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
      <AddExistingPatientDialog
        open={showAddExisting}
        onOpenChange={setShowAddExisting}
        campId={camp?.id}
        onAdded={handleAddedExisting}
      />
    </main>
  );
}
