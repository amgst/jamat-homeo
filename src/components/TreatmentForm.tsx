"use client";

import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { treatmentSuggestion } from '@/ai/flows/treatment-suggestion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';

import type { Patient, Treatment, Medicine } from '@/lib/types';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { Loader2, Clock, Search } from 'lucide-react';

const formSchema = z.object({
  observations: z.string().min(5, {
    message: "Observations must be at least 5 characters.",
  }),
  remedy: z.string().optional(),
  dosage: z.string().optional(),
});

type TreatmentFormProps = {
  patient: Patient;
  onAddTreatment: (treatment: Omit<Treatment, 'id'>) => void;
};

export function TreatmentForm({ patient, onAddTreatment }: TreatmentFormProps) {
  const { toast } = useToast();
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [isLoadingMedicines, setIsLoadingMedicines] = useState(false);
  // Track selected medicines and their dosages
  const [showMedicineModal, setShowMedicineModal] = useState(false);
  const [medicineRows, setMedicineRows] = useState<Array<{ id: string; name: string; selected: boolean; dosage: string }>>([]);
  // Add search state for medicine modal
  const [medicineSearchQuery, setMedicineSearchQuery] = useState('');
  // Add pagination state for medicine modal
  const [currentPage, setCurrentPage] = useState(1);
  const medicinesPerPage = 5;

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      observations: "",
      remedy: "",
      dosage: "",
    },
  });

  // Fetch medicines from Firestore
  useEffect(() => {
    const fetchMedicines = async () => {
      setIsLoadingMedicines(true);
      try {
        const medicinesCollection = collection(db, 'medicines');
        const q = query(medicinesCollection, orderBy('name'));
        const medicinesSnapshot = await getDocs(q);
        const medicinesList = medicinesSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            name: data.name || '',
            stock: data.stock || 0,
            unit: data.unit || '',
            expiryDate: data.expiryDate,
            batchNumber: data.batchNumber,
            manufacturer: data.manufacturer,
            price: data.price,
            minStockLevel: data.minStockLevel
          } as Medicine;
        });
        console.log('Fetched medicines:', medicinesList); // Debug log
        setMedicines(medicinesList);
  setMedicineRows(medicinesList.map((m, idx) => ({ id: m.id, name: m.name, selected: false, dosage: '' })));
      } catch (error) {
        console.error("Error fetching medicines:", error);
        toast({
          variant: "destructive",
          title: "Error Loading Medicines",
          description: "Could not load medicine inventory. Please try again later.",
        });
      } finally {
        setIsLoadingMedicines(false);
      }
    };

    fetchMedicines();
  }, []);

  const handleObservationsChange = async (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const query = event.target.value;
    form.setValue('observations', query, { shouldValidate: true });

    if (query.trim().length < 10) {
      setSuggestions([]);
      return;
    }

    setIsLoadingSuggestions(true);
    try {
      const patientDetails = `Name: ${patient.name}, DOB: ${patient.dob}`;
      const treatmentHistory = patient.treatments?.map(t => `${t.date}: ${t.observations}`).join('\n') || "No prior treatments recorded.";
      
      const result = await treatmentSuggestion({
        patientDetails,
        treatmentContext: treatmentHistory,
        query,
      });

      setSuggestions(result.suggestions || []);
    } catch (error) {
      console.error("AI suggestion error:", error);
      toast({
        variant: "destructive",
        title: "AI Suggestion Failed",
        description: "Could not fetch AI-powered suggestions. Please try again later.",
      });
      setSuggestions([]);
    } finally {
      setIsLoadingSuggestions(false);
    }
  };
  
  function onSubmit(values: z.infer<typeof formSchema>) {
    // Auto-generate current date and time when saving
    const now = new Date();
    // Get selected medicines and their dosages
    const selectedRows = medicineRows.filter(row => row.selected);
    // Format: MedicineName (DosageAbbr)
    const selectedMedicineText = selectedRows.map(row => `${row.name}${row.dosage ? ` (${row.dosage})` : ''}`).join(', ');
    // Combine with any manually entered remedy
    const remedyValue = values.remedy
      ? `${values.remedy}${selectedMedicineText ? ', ' + selectedMedicineText : ''}`
      : selectedMedicineText;
    const treatmentData = {
      ...values,
      remedy: remedyValue || undefined,
      date: now.toISOString().split('T')[0],
      time: now.toTimeString().split(' ')[0].substring(0, 5),
    };
    onAddTreatment(treatmentData);
    form.reset({
      observations: "",
      remedy: "",
      dosage: "",
    });
  // No need to reset selectedMedicineIds, handled by medicineRows state
    setSuggestions([]);
    toast({
      title: "Treatment Added",
      description: `A new treatment for ${patient.name} has been saved with current timestamp.`,
    });
  }

  // Handle row selection in modal table
  const handleRowSelect = (id: string) => {
    setMedicineRows(rows => rows.map(row => row.id === id ? { ...row, selected: !row.selected } : row));
  };

  // Handle dosage change for a row
  const handleRowDosage = (id: string, dosage: string) => {
    setMedicineRows(rows => rows.map(row => row.id === id ? { ...row, dosage } : row));
  };

  // Filter medicine rows based on search query
  const filteredMedicineRows = useMemo(() => {
    if (!medicineSearchQuery) return medicineRows;
    return medicineRows.filter(row => 
        row.name.toLowerCase().includes(medicineSearchQuery.toLowerCase())
    );
  }, [medicineRows, medicineSearchQuery]);

  // Calculate paginated medicine rows
  const paginatedMedicineRows = useMemo(() => {
    const startIndex = (currentPage - 1) * medicinesPerPage;
    const endIndex = startIndex + medicinesPerPage;
    return filteredMedicineRows.slice(startIndex, endIndex);
  }, [filteredMedicineRows, currentPage]);

  // Calculate total pages
  const totalPages = useMemo(() => {
    return Math.ceil(filteredMedicineRows.length / medicinesPerPage);
  }, [filteredMedicineRows]);

  // Reset to first page when search query changes
  useEffect(() => {
    setCurrentPage(1);
  }, [medicineSearchQuery]);

  return (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle className="font-headline flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Add New Treatment
        </CardTitle>
        <CardDescription>Log a new treatment or observation for {patient.name}. Timestamp will be added automatically when saved.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="observations"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observations & Notes</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Describe patient's condition, symptoms, etc." 
                      rows={5}
                      {...field}
                      onChange={handleObservationsChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             
            {(isLoadingSuggestions || suggestions.length > 0) && (
              <div className="space-y-2">
                 <FormField
                    control={form.control}
                    name="remedy"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Suggested Remedy</FormLabel>
                         <FormControl>
                            <Input 
                              placeholder="AI suggestions will appear here..." 
                              {...field} 
                              value={field.value || ''} // Ensure value is never undefined
                              onChange={(e) => field.onChange(e.target.value || '')} // Ensure value is never null
                            />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <div className="pt-2">
                  {isLoadingSuggestions ? (
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating ideas...
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {suggestions.map((suggestion, index) => (
                        <Button
                          key={index}
                          type="button"
                          variant="outline"
                          size="sm"
                          className="text-xs h-auto py-1 px-2"
                          onClick={() => {
                            const currentRemedies = form.getValues('remedy') || '';
                            const newRemedy = currentRemedies ? `${currentRemedies}, ${suggestion}` : suggestion;
                            form.setValue('remedy', newRemedy, { shouldValidate: true });
                          }}
                        >
                          {suggestion}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}


            {/* Medicine Selection Modal Trigger and Selected Medicines Display */}
            <div className="space-y-2">
              <Button type="button" variant="outline" onClick={() => setShowMedicineModal(true)}>
                Select Medicines
              </Button>
              {/* Show selected medicines below button */}
              {medicineRows.filter(row => row.selected).length > 0 && (
                <div className="flex flex-wrap gap-2 pt-2">
                  {medicineRows.filter(row => row.selected).map(row => (
                    <span key={row.id} className="inline-block px-2 py-1 bg-accent rounded text-sm">
                      {row.name}{row.dosage ? ` (${row.dosage})` : ''}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Table for Medicine Selection */}
            {showMedicineModal && (
              <Dialog open={showMedicineModal} onOpenChange={(open) => {
                setShowMedicineModal(open);
                // Reset pagination when modal closes
                if (!open) {
                  setCurrentPage(1);
                  setMedicineSearchQuery('');
                }
              }}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Select Medicines for Treatment</DialogTitle>
                  </DialogHeader>
                  {/* Add search input to medicine selection modal */}
                  <div className="py-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search medicines..."
                        className="pl-10"
                        value={medicineSearchQuery}
                        onChange={(e) => setMedicineSearchQuery(e.target.value)}
                      />
                    </div>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>S. No.</TableHead>
                        <TableHead>Medicine</TableHead>
                        <TableHead>Dosage</TableHead>
                        <TableHead>Select</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedMedicineRows.map((row: { id: string; name: string; selected: boolean; dosage: string }, idx: number) => (
                        <TableRow key={row.id}>
                          <TableCell>{(currentPage - 1) * medicinesPerPage + idx + 1}</TableCell>
                          <TableCell>{row.name}</TableCell>
                          <TableCell>
                            <Select value={row.dosage} onValueChange={val => handleRowDosage(row.id, val)}>
                              <SelectTrigger>
                                <SelectValue placeholder="Dosage" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="OD">OD</SelectItem>
                                <SelectItem value="BD">BD</SelectItem>
                                <SelectItem value="TDS">TDS</SelectItem>
                                <SelectItem value="QDS">QDS</SelectItem>
                                <SelectItem value="HS">HS</SelectItem>
                                <SelectItem value="SOS">SOS</SelectItem>
                                <SelectItem value="STAT">STAT</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <input type="checkbox" checked={row.selected} onChange={() => handleRowSelect(row.id)} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {/* Add pagination controls */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between border-t pt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                      >
                        Previous
                      </Button>
                      
                      <div className="text-sm text-muted-foreground">
                        Page {currentPage} of {totalPages}
                      </div>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                      >
                        Next
                      </Button>
                    </div>
                  )}
                  <DialogFooter>
                    <Button type="button" onClick={() => setShowMedicineModal(false)}>
                      Done
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}

            {/* Dosage instructions removed from main form. Now set per medicine in modal. */}
            
            <div className="flex justify-end">
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Treatment
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}