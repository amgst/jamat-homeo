"use client";

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Pencil } from 'lucide-react';
import type { Patient } from '@/lib/types';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

const formSchema = z.object({
  name: z.string().min(1, {
    message: "Name is required.",
  }),
  dob: z.date().optional(),
  age: z.string().optional(),
  patientNumber: z.string().optional(),
  contactNumber: z.string().optional(),
});

type EditPatientDialogProps = {
  patient: Patient;
  onUpdatePatient: (patient: Patient) => void;
};

export function EditPatientDialog({ patient, onUpdatePatient }: EditPatientDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [ageInputMode, setAgeInputMode] = useState<"dob" | "age">(patient.dob ? "dob" : "age");
  const { toast } = useToast();
  
  // Open dialog when a global 'openEditDialog' event is dispatched (from dashboard URL param)
  useEffect(() => {
    const handler = () => setIsOpen(true);
    window.addEventListener('openEditDialog', handler);
    return () => window.removeEventListener('openEditDialog', handler);
  }, []);
  
  // Function to calculate age from date of birth (Date or ISO string)
  const calculateAge = (dobInput: Date | string) => {
    const dob = dobInput instanceof Date ? dobInput : new Date(dobInput);
    if (isNaN(dob.getTime())) return '';
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    return String(age);
  };
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: patient.name,
      dob: patient.dob ? new Date(patient.dob) : undefined,
      age: patient.age ? String(patient.age) : "",
      patientNumber: patient.patientNumber || "",
      contactNumber: patient.contactNumber || "",
    },
  });

  const watchedDob = form.watch('dob');
  const watchedName = form.watch('name');
  
  // Debug: Log form values when they change
  useEffect(() => {
    console.log('Form name value changed:', watchedName);
  }, [watchedName]);

  // Debug: Log form state changes
  useEffect(() => {
    console.log('Form state changed:', {
      isValid: form.formState.isValid,
      errors: form.formState.errors,
      isDirty: form.formState.isDirty,
      isSubmitting: form.formState.isSubmitting
    });
  }, [form.formState]);
  
  // No auto-sync between DOB and Age; only display computed age when DOB is present

  // Keep mode via toggle; no auto switching

  // Reset form when patient changes or dialog opens
  useEffect(() => {
    if (isOpen) {
      form.reset({
        name: patient.name,
        dob: patient.dob ? new Date(patient.dob) : undefined,
        age: patient.age ? String(patient.age) : "",
        patientNumber: patient.patientNumber || "",
        contactNumber: patient.contactNumber || "",
      });
      setAgeInputMode(patient.dob ? "dob" : "age");
    }
  }, [patient, form, isOpen]);

  function onSubmit(values: z.infer<typeof formSchema>) {
    console.log('=== onSubmit called ===');
    console.log('Form values:', values);
    console.log('Original patient:', patient);
    
    const hasDob = Boolean(values.dob && values.dob instanceof Date && !isNaN((values.dob as Date).getTime()));
    const updatedPatient = {
      ...patient,
      ...values,
      // Save only the active mode's value
      dob: ageInputMode === 'dob' && hasDob ? format(values.dob as Date, 'yyyy-MM-dd') : undefined,
      age: ageInputMode === 'age' ? (values.age ? parseInt(values.age) : undefined) : undefined,
    }
    
    console.log('Updated patient:', updatedPatient);
    onUpdatePatient(updatedPatient);
    setIsOpen(false);
    toast({
      title: "Patient Updated",
      description: "Patient information has been successfully updated.",
    });
  }

  return (
  <Dialog open={isOpen} onOpenChange={setIsOpen} key={patient.id}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Pencil className="h-4 w-4" />
                <span className="sr-only">Edit Patient</span>
              </Button>
            </DialogTrigger>
          </TooltipTrigger>
          <TooltipContent>
            <p>Edit patient details</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Patient</DialogTitle>
          <DialogDescription>
            Update the patient's details below. Click save when you're done.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit, (errors) => {
            console.log('Form validation errors:', errors);
          })} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="e.g. John Doe" 
                      {...field} 
                      onChange={(e) => {
                        console.log('Name field changed:', e.target.value);
                        field.onChange(e);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="space-y-4">
              <div className="space-y-2">
                <FormLabel>Age Information</FormLabel>
                <div className="flex gap-2 p-1 bg-muted rounded-lg">
                  <Button
                    type="button"
                    variant={ageInputMode === "dob" ? "default" : "ghost"}
                    size="sm"
                    className="flex-1"
                    onClick={() => setAgeInputMode("dob")}
                  >
                    Date of Birth
                  </Button>
                  <Button
                    type="button"
                    variant={ageInputMode === "age" ? "default" : "ghost"}
                    size="sm"
                    className="flex-1"
                    onClick={() => setAgeInputMode("age")}
                  >
                    Direct Age
                  </Button>
                </div>
              </div>

              {ageInputMode === 'dob' ? (
              <FormField
                control={form.control}
                name="dob"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Date of Birth</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value && field.value instanceof Date && !isNaN(field.value.getTime()) ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          captionLayout="dropdown-buttons"
                          fromYear={1900}
                          toYear={new Date().getFullYear()}
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) =>
                            date > new Date() || date < new Date("1900-01-01")
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                    {field.value instanceof Date && !isNaN(field.value.getTime()) && (
                      <p className="text-sm text-muted-foreground">
                        Age: {calculateAge(field.value)} years
                      </p>
                    )}
                  </FormItem>
                )}
              />
              ) : (
              <FormField
                control={form.control}
                name="age"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Age (in years)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number"
                        placeholder="Enter age" 
                        min="0"
                        max="150"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              )}
            </div>
            <FormField
              control={form.control}
              name="patientNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Patient Number (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. P01, P02, P03" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="contactNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contact Number (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. +1234567890" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="secondary">
                  Cancel
                </Button>
              </DialogClose>
              <Button 
                type="submit"
                onClick={() => {
                  console.log('Save button clicked');
                  console.log('Current form values:', form.getValues());
                  console.log('Form is valid:', form.formState.isValid);
                  console.log('Form errors:', form.formState.errors);
                }}
              >
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
