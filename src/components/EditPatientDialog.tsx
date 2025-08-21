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

const formSchema = z.object({
  name: z.string().min(2, {
    message: "Name must be at least 2 characters.",
  }),
  dob: z.date().optional(),
  age: z.string().optional(),
  patientNumber: z.string().optional().refine((val) => {
    if (!val) return true;
    return /^P\d{2,}$/i.test(val);
  }, {
    message: "Patient number must be in format P01, P02, etc.",
  }),
  contactNumber: z.string().optional(),
});

type EditPatientDialogProps = {
  patient: Patient;
  onUpdatePatient: (patient: Patient) => void;
};

export function EditPatientDialog({ patient, onUpdatePatient }: EditPatientDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [ageInputMode, setAgeInputMode] = useState<"dob" | "age">(patient.dob ? "dob" : "age");
  
  // Function to calculate age from date of birth
  const calculateAge = (dob: Date) => {
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    return age.toString();
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

  // Watch for DOB changes to automatically calculate age (only in DOB mode)
  const watchedDob = form.watch('dob');
  
  useEffect(() => {
    if (watchedDob && ageInputMode === 'dob') {
      const calculatedAge = calculateAge(watchedDob);
      form.setValue('age', calculatedAge);
    }
  }, [watchedDob, form, ageInputMode]);

  // Handle mode switching
  useEffect(() => {
    if (ageInputMode === "age") {
      form.setValue("dob", undefined);
    } else {
      form.setValue("age", "");
    }
  }, [ageInputMode, form]);

  function onSubmit(values: z.infer<typeof formSchema>) {
    const updatedPatient = {
      ...patient,
      ...values,
      dob: values.dob && values.dob instanceof Date && !isNaN(values.dob.getTime()) ? format(values.dob, 'yyyy-MM-dd') : patient.dob,
      age: values.age ? parseInt(values.age) : undefined,
    }
    onUpdatePatient(updatedPatient);
    setIsOpen(false);
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <DialogTrigger asChild>
              <Button variant="outline" size="icon">
                <Pencil className="h-4 w-4" />
                <span className="sr-only">Edit Patient</span>
              </Button>
            </DialogTrigger>
          </TooltipTrigger>
          <TooltipContent>
            <p>Edit Patient</p>
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
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. John Doe" {...field} />
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

              {ageInputMode === "dob" ? (
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
                      {field.value && (
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
              <Button type="submit">Save Changes</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
