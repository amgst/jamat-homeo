import React, { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { addDoc, collection } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { toast } from "@/hooks/use-toast"
import { Plus, Calendar as CalendarIcon } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { format, differenceInYears, subYears } from "date-fns"
import { cn } from "@/lib/utils"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import type { Patient } from "@/lib/types"


const formSchema = z.object({
  name: z.string().min(2, {
    message: "Name must be at least 2 characters.",
  }),
  sex: z.string().min(1, {
    message: "Sex is required.",
  }),
  dob: z.date().optional(),
  age: z.string().optional(),
  contactNumber: z.string().optional(),
  fatherName: z.string().optional(),
  husbandName: z.string().optional(),
  address: z.string().optional(),
  occupation: z.string().optional(),
  emergencyContact: z.string().optional(),
  medicalHistory: z.string().optional(),
  allergies: z.string().optional(),
  currentMedications: z.string().optional(),
})

type FormData = z.infer<typeof formSchema>

interface AddPatientDialogProps {
  onAddPatient: () => void;
  existingPatients: Patient[];
}

const calculateAge = (birthDate: Date): number => {
  return differenceInYears(new Date(), birthDate)
}

// Removed calculateDOBFromAge function as it was causing controlled/uncontrolled input issues

export function AddPatientDialog({ onAddPatient, existingPatients }: AddPatientDialogProps) {
  const [open, setOpen] = useState(false)
  const [relation, setRelation] = useState<"father" | "husband">("father")
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false)
  // Removed isUpdatingFromToggle state as it's no longer needed
  const [ageInputMode, setAgeInputMode] = useState<"dob" | "age">("dob")

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      sex: "Male",
      contactNumber: "",
      fatherName: "",
      husbandName: "",
      age: "",
      address: "",
      occupation: "",
      emergencyContact: "",
      medicalHistory: "",
      allergies: "",
      currentMedications: "",
    },
  })

  // Removed DOB change handler to prevent controlled/uncontrolled input warnings

  // Handle mode switching
  useEffect(() => {
    if (ageInputMode === "age") {
      form.setValue("dob", undefined)
    } else {
      form.setValue("age", "")
    }
  }, [ageInputMode, form])

  const generatePatientNumber = (existingPatients: Patient[]) => {
    // Get all existing patient numbers and find the highest number
    const existingNumbers = existingPatients
      .map(p => p.patientNumber)
      .filter(num => num && num.match(/^P\d+$/i))
      .map(num => parseInt(num!.substring(1)))
      .filter(num => !isNaN(num))
    
    const maxNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) : 0
    const nextNumber = maxNumber + 1
    
    return `P${nextNumber.toString().padStart(2, '0')}`
  }

  const onSubmit = async (data: FormData) => {
    try {
      // Age and DOB are now optional - no validation required

      // Remove empty optional fields
      const cleanedData = Object.fromEntries(
        Object.entries(data).filter(([_, value]) => {
          if (typeof value === "string") {
            return value.trim() !== ""
          }
          return value !== undefined && value !== null
        })
      )

      const patientData: any = {
        ...cleanedData,
        patientNumber: generatePatientNumber(existingPatients),
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      // Only include dob if it exists
      if (cleanedData.dob) {
        patientData.dob = format(cleanedData.dob as Date, 'yyyy-MM-dd')
      }

      await addDoc(collection(db, "patients"), patientData)
      
      toast({
        title: "Success",
        description: "Patient added successfully",
      })
      
      form.reset()
      setOpen(false)
      onAddPatient()
    } catch (error) {
      console.error("Error adding patient:", error)
      toast({
        title: "Error",
        description: "Failed to add patient",
        variant: "destructive",
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Patient
              </Button>
            </DialogTrigger>
          </TooltipTrigger>
          <TooltipContent>
            <p>Add a new patient to the system</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Patient</DialogTitle>
          <DialogDescription>
            Fill in the patient information below. All fields marked with * are required.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter patient name" {...field} />
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
                    <FormLabel>Contact Number *</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter contact number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

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
                      <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Relation</Label>
                <Select value={relation} onValueChange={(value: "father" | "husband") => setRelation(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="father">Father</SelectItem>
                    <SelectItem value="husband">Husband</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {relation === "father" ? (
                <FormField
                  control={form.control}
                  name="fatherName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Father's Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter father's name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : (
                <FormField
                  control={form.control}
                  name="husbandName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Husband's Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter husband's name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="sex"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sex *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select sex" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Male">Male</SelectItem>
                        <SelectItem value="Female">Female</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="medicalHistory"
                render={({ field }) => (
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
                )}
              />
            </div>
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Add Patient</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}