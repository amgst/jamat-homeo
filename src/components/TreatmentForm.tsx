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
    message: "مشاہدات کم از کم 5 حروف ہونے چاہئیں۔",
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
      <CardHeader className="py-3">
        <CardTitle className="font-headline flex items-center gap-2 text-base">
          <Clock className="h-4 w-4" />
          نیا علاج درج کریں
        </CardTitle>
        <CardDescription className="text-xs">{patient.name} کے لئے نیا علاج یا مشاہدات درج کریں۔ محفوظ کرنے پر وقت خودکار شامل ہوگا۔</CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="remedy"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ادویات / علاج</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="استعمال شدہ دوا درج کریں..."
                      rows={4}
                      {...field}
                      value={field.value || ''}
                      onChange={e => field.onChange(e.target.value || '')}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="observations"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>مشاہدات اور نوٹس</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="مریض کی حالت، علامات وغیرہ بیان کریں" 
                      rows={4}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             
            {/* Medicine Selection Modal Trigger and Selected Medicines Display */}
            <div className="space-y-2 md:col-start-2">
              <Button type="button" variant="outline" onClick={() => setShowMedicineModal(true)}>
                ادویات منتخب کریں
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
                    <DialogTitle>علاج کے لئے ادویات منتخب کریں</DialogTitle>
                  </DialogHeader>
                  {/* Add search input to medicine selection modal */}
                  <div className="py-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="ادویات تلاش کریں..."
                        className="pl-10"
                        value={medicineSearchQuery}
                        onChange={(e) => setMedicineSearchQuery(e.target.value)}
                      />
                    </div>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>نمبر</TableHead>
                        <TableHead>دوائی</TableHead>
                        <TableHead>خوراک</TableHead>
                        <TableHead>انتخاب</TableHead>
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
                                <SelectValue placeholder="خوراک" />
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
                        پچھلا
                      </Button>
                      
                      <div className="text-sm text-muted-foreground">
                        صفحہ {currentPage} از {totalPages}
                      </div>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                      >
                        اگلا
                      </Button>
                    </div>
                  )}
                  <DialogFooter>
                    <Button type="button" onClick={() => setShowMedicineModal(false)}>
                      مکمل
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}

            {/* Dosage instructions removed from main form. Now set per medicine in modal. */}
            
            <div className="flex justify-end md:col-span-2">
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                علاج محفوظ کریں
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}