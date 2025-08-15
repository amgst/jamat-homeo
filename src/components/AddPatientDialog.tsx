"use client";

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserPlus } from 'lucide-react';
import type { Patient } from '@/lib/types';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';

const formSchema = z.object({
  name: z.string()
    .min(1, { message: "Name is required." })
    .min(2, { message: "Name must be at least 2 characters." })
    .max(100, { message: "Name must be less than 100 characters." })
    .regex(/^[a-zA-Z\s]+$/, { message: "Name can only contain letters and spaces." }),
  dob: z.string()
    .optional()
    .refine((val) => {
      if (!val || val.trim() === "") return true;
      const date = new Date(val);
      const today = new Date();
      const minDate = new Date('1900-01-01');
      return date instanceof Date && !isNaN(date.getTime()) && date <= today && date >= minDate;
    }, {
      message: "Please enter a valid date (YYYY-MM-DD format, not in future).",
    }),
  contactNumber: z.string()
    .optional()
    .refine((val) => {
      if (!val || val.trim() === "") return true;
      const cleanedNumber = val.replace(/[\s\-\(\)]/g, '');
      return /^[\+]?[0-9]{7,15}$/.test(cleanedNumber);
    }, {
      message: "Please enter a valid phone number (7-15 digits).",
    }),
  fatherName: z.string()
    .optional()
    .refine((val) => {
      if (!val || val.trim() === "") return true;
      return val.length >= 2 && val.length <= 100 && /^[a-zA-Z\s]+$/.test(val);
    }, {
      message: "Name must be 2-100 characters and contain only letters and spaces.",
    }),
  age: z.string()
    .optional()
    .refine((val) => {
      if (!val || val.trim() === "") return true;
      const num = parseInt(val);
      return !isNaN(num) && num > 0 && num <= 150 && Number.isInteger(num);
    }, {
      message: "Age must be a whole number between 1 and 150.",
    }),
  sex: z.enum(['Male', 'Female']).optional(),
  bloodGroup: z.enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']).optional(),
});

type AddPatientDialogProps = {
  onAddPatient: (patient: Omit<Patient, 'id' | 'treatments' | 'avatarUrl'>) => void;
};

export function AddPatientDialog({ onAddPatient }: AddPatientDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [relation, setRelation] = useState<'Father' | 'Husband'>("Father");
  
  // Function to generate patient number
  const generatePatientNumber = () => {
    const timestamp = Date.now().toString().slice(-6); // Last 6 digits of timestamp
    const random = Math.floor(Math.random() * 100).toString().padStart(2, '0');
    return `P${timestamp}${random}`;
  };
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      dob: "",
      contactNumber: "",
      fatherName: "",
      age: "",
      sex: undefined,
      bloodGroup: undefined,
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      console.log('AddPatientDialog onSubmit called with:', values);
      console.log('Form validation passed, calling onAddPatient...');
      
      // Generate auto patient number
      const autoPatientNumber = generatePatientNumber();
      
      // Sanitize and prepare data
      const { age, dob, contactNumber, fatherName, name, ...rest } = values;
      
      // Clean and validate the data before sending
      const patientData: any = {
        name: name.trim(),
        patientNumber: autoPatientNumber, // Auto-generated patient number
        dob: dob?.trim() || "",
        contactNumber: contactNumber?.trim() || "",
        fatherName: fatherName?.trim() || "",
        ...rest,
      };
      
      // Only add age if it's a valid number
      if (age && age.trim() !== "") {
        const ageNum = parseInt(age.trim());
        if (!isNaN(ageNum) && ageNum > 0 && ageNum <= 150) {
          patientData.age = ageNum;
        }
      }
      
      // Remove empty optional fields to avoid Firebase issues
      Object.keys(patientData).forEach(key => {
        if (patientData[key] === "" || patientData[key] === null || patientData[key] === undefined) {
          if (key !== 'patientNumber') { // Don't remove patient number even if empty (shouldn't happen)
            delete patientData[key];
          }
        }
      });
      
      console.log('Cleaned patient data:', patientData);
      onAddPatient(patientData);
      form.reset();
      setIsOpen(false);
      console.log('Dialog closed and form reset');
    } catch (error) {
      console.error('Error in onSubmit:', error);
      // You might want to show an error message to the user here
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                <UserPlus className="h-5 w-5" />
                <span className="sr-only">Add Patient</span>
              </Button>
            </DialogTrigger>
          </TooltipTrigger>
          <TooltipContent>
            <p>Add Patient</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Patient</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-2 gap-2 py-2">
            <div className="col-span-2">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name <span className="text-red-500">*</span></FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. John Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField control={form.control} name="dob" render={({ field }) => (
              <FormItem>
                <FormLabel>Date of Birth</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. 1990-01-01" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="age" render={({ field }) => (
              <FormItem>
                <FormLabel>Age</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. 25" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="contactNumber" render={({ field }) => (
              <FormItem>
                <FormLabel>Contact Number</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. +1234567890" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="fatherName" render={({ field }) => (
              <FormItem>
                <FormLabel>
                  <div className="flex items-center gap-2">
                    <span>{relation === 'Father' ? "Father's Name" : "Husband's Name"}</span>
                    <select
                      className="border rounded px-1 py-0.5 text-xs"
                      value={relation}
                      onChange={e => setRelation(e.target.value as 'Father' | 'Husband')}
                    >
                      <option value="Father">Father</option>
                      <option value="Husband">Husband</option>
                    </select>
                  </div>
                </FormLabel>
                <FormControl>
                  <Input placeholder={relation === 'Father' ? "e.g. John Smith" : "e.g. Ahmed Khan"} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="sex" render={({ field }) => (
              <FormItem>
                <FormLabel>Sex</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select sex" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="bloodGroup" render={({ field }) => (
              <FormItem>
                <FormLabel>Blood Group</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select blood group" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="A+">A+</SelectItem>
                    <SelectItem value="A-">A-</SelectItem>
                    <SelectItem value="B+">B+</SelectItem>
                    <SelectItem value="B-">B-</SelectItem>
                    <SelectItem value="AB+">AB+</SelectItem>
                    <SelectItem value="AB-">AB-</SelectItem>
                    <SelectItem value="O+">O+</SelectItem>
                    <SelectItem value="O-">O-</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            <div className="col-span-2 flex justify-end gap-2 mt-2">
              <DialogClose asChild>
                <Button type="button" variant="secondary">Cancel</Button>
              </DialogClose>
              <Button type="submit" onClick={() => console.log('Save Patient button clicked')}>Save Patient</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
