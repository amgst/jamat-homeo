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
import { Textarea } from "@/components/ui/textarea"
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

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  contactNumber: z.string().min(10, "Contact number must be at least 10 digits"),
  fatherName: z.string().optional(),
  husbandName: z.string().optional(),
  dob: z.date().optional(),
  age: z.string().optional(),
  sex: z.enum(["Male", "Female", "Other"]),
  bloodGroup: z.enum(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]).optional(),
  address: z.string().optional(),
  occupation: z.string().optional(),
  maritalStatus: z.enum(["Single", "Married", "Divorced", "Widowed"]).optional(),
  emergencyContact: z.string().optional(),
  medicalHistory: z.string().optional(),
  allergies: z.string().optional(),
  currentMedications: z.string().optional(),
})

type FormData = z.infer<typeof formSchema>

interface AddPatientDialogProps {
  onPatientAdded: () => void
}

const calculateAge = (birthDate: Date): number => {
  return differenceInYears(new Date(), birthDate)
}

const calculateDOBFromAge = (age: number): Date => {
  // Use January 1st of the calculated year
  const currentYear = new Date().getFullYear()
  const birthYear = currentYear - age
  return new Date(birthYear, 0, 1) // January 1st
}

export function AddPatientDialog({ onPatientAdded }: AddPatientDialogProps) {
  const [open, setOpen] = useState(false)
  const [relation, setRelation] = useState<"father" | "husband">("father")
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false)
  const [isUpdatingFromToggle, setIsUpdatingFromToggle] = useState(false)

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
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

  // Handle DOB changes to calculate age
  useEffect(() => {
    if (isUpdatingFromToggle) return
    
    const subscription = form.watch((value, { name }) => {
      if (name === "dob" && value.dob) {
        const calculatedAge = calculateAge(value.dob)
        setIsUpdatingFromToggle(true)
        form.setValue("age", calculatedAge.toString())
        setTimeout(() => setIsUpdatingFromToggle(false), 0)
      }
    })
    return () => subscription.unsubscribe()
  }, [form, isUpdatingFromToggle])

  // Handle age changes to calculate DOB
  useEffect(() => {
    if (isUpdatingFromToggle) return
    
    const subscription = form.watch((value, { name }) => {
      if (name === "age" && value.age && !isNaN(Number(value.age))) {
        const ageNum = Number(value.age)
        if (ageNum > 0 && ageNum < 150) {
          const calculatedDOB = calculateDOBFromAge(ageNum)
          setIsUpdatingFromToggle(true)
          form.setValue("dob", calculatedDOB)
          setTimeout(() => setIsUpdatingFromToggle(false), 0)
        }
      }
    })
    return () => subscription.unsubscribe()
  }, [form, isUpdatingFromToggle])

  const generatePatientNumber = () => {
    const timestamp = Date.now().toString()
    return `P${timestamp.slice(-6)}`
  }

  const onSubmit = async (data: FormData) => {
    try {
      // Validate that either age or dob is provided
      if (!data.age && !data.dob) {
        toast({
          title: "Error",
          description: "Please provide either age or date of birth",
          variant: "destructive",
        })
        return
      }

      // Remove empty optional fields
      const cleanedData = Object.fromEntries(
        Object.entries(data).filter(([_, value]) => {
          if (typeof value === "string") {
            return value.trim() !== ""
          }
          return value !== undefined && value !== null
        })
      )

      const patientData = {
        ...cleanedData,
        patientNumber: generatePatientNumber(),
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      await addDoc(collection(db, "patients"), patientData)
      
      toast({
        title: "Success",
        description: "Patient added successfully",
      })
      
      form.reset()
      setOpen(false)
      onPatientAdded()
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="dob"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Date of Birth</FormLabel>
                    <div className="flex gap-2 items-center">
                      <Input
                        type="date"
                        value={field.value || ""}
                        onChange={e => {
                          field.onChange(e.target.value);
                          // Accept string, convert to Date only for calculations
                          if (e.target.value) {
                            const dobString = e.target.value;
                            if (/^\d{4}-\d{2}-\d{2}$/.test(dobString)) {
                              const [year, month, day] = dobString.split('-').map(Number);
                              const dobDate = new Date(year, month - 1, day);
                              if (!isNaN(dobDate.getTime())) {
                                const today = new Date();
                                let age = today.getFullYear() - dobDate.getFullYear();
                                const m = today.getMonth() - dobDate.getMonth();
                                if (m < 0 || (m === 0 && today.getDate() < dobDate.getDate())) {
                                  age--;
                                }
                                form.setValue("age", age > 0 ? String(age) : "");
                              }
                            }
                          }
                        }}
                        className="w-full"
                      />
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="age"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Age</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="Enter age"
                        value={field.value || ""}
                        onChange={e => {
                          field.onChange(e.target.value);
                          // Accept string/number, convert to DOB string if valid
                          const ageNum = parseInt(e.target.value);
                          if (!isNaN(ageNum) && ageNum > 0 && ageNum < 150) {
                            const today = new Date();
                            const birthYear = today.getFullYear() - ageNum;
                            // Use Jan 1 for simplicity
                            const dobIso = `${birthYear}-01-01`;
                            form.setValue("dob", dobIso);
                          }
                        }}
                        min="0"
                        max="150"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
                name="bloodGroup"
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

            {/* ... existing code ... */}
            
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
