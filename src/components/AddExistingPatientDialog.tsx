"use client";

import React, { useEffect, useMemo, useState } from "react";
import { collection, doc, getDocs, limit, orderBy, query, updateDoc, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Patient } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface AddExistingPatientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campId: string | undefined;
  onAdded: () => Promise<void> | void;
}

export function AddExistingPatientDialog({ open, onOpenChange, campId, onAdded }: AddExistingPatientDialogProps) {
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<Patient[]>([]);
  const [isAddingId, setIsAddingId] = useState<string | null>(null);

  // Debounce search input
  const [debounced, setDebounced] = useState(search);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    if (!open) {
      setSearch("");
      setResults([]);
      return;
    }
  }, [open]);

  useEffect(() => {
    const run = async () => {
      if (!open) return;
      setIsLoading(true);
      try {
        if (!debounced) {
          // Show most recent 25 when no search
          const q0 = query(collection(db, "patients"), orderBy("createdAt", "desc"), limit(25));
          const snap0 = await getDocs(q0);
          setResults(snap0.docs.map(d => ({ id: d.id, ...(d.data() as any) }) as Patient));
        } else {
          // Basic prefix search on name (case sensitive depends on data)
          const upper = debounced + "\uf8ff";
          const q1 = query(
            collection(db, "patients"),
            orderBy("name"),
            where("name", ">=", debounced),
            where("name", "<=", upper),
            limit(25)
          );
          const snap1 = await getDocs(q1);
          setResults(snap1.docs.map(d => ({ id: d.id, ...(d.data() as any) }) as Patient));
        }
      } finally {
        setIsLoading(false);
      }
    };
    run();
  }, [open, debounced]);

  const handleAttach = async (patientId: string) => {
    if (!campId) return;
    setIsAddingId(patientId);
    try {
      await updateDoc(doc(db, "patients", patientId), { campId });
      await Promise.resolve(onAdded());
      onOpenChange(false);
    } finally {
      setIsAddingId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>موجودہ مریض شامل کریں</DialogTitle>
        </DialogHeader>
        <div className="flex gap-2 items-center">
          <Input
            placeholder="نام یا تلاش"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="mt-3 max-h-80 overflow-auto border rounded">
          {isLoading ? (
            <div className="p-4 text-sm text-muted-foreground">Loading…</div>
          ) : results.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground">No results</div>
          ) : (
            <ul>
              {results.map((p) => (
                <li key={p.id} className="flex items-center justify-between px-3 py-2 border-b last:border-b-0">
                  <div className="flex flex-col">
                    <span className="font-medium">{p.name}</span>
                    <span className="text-xs text-muted-foreground">{p.patientNumber} {p.contactNumber ? `• ${p.contactNumber}` : ''}</span>
                  </div>
                  <Button size="sm" onClick={() => handleAttach(p.id)} disabled={!campId || isAddingId === p.id}>
                    {isAddingId === p.id ? 'Adding…' : 'Add to Camp'}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}


