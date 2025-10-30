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
    message: "نام کم از کم 2 حروف پر مشتمل ہونا چاہیے۔",
  }),
  sex: z.string().min(1, {
    message: "جنس ضروری ہے۔",
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
  campId?: string;
}

const calculateAge = (birthDate: Date): number => {
  return differenceInYears(new Date(), birthDate)
}

// Removed calculateDOBFromAge function as it was causing controlled/uncontrolled input issues

export function AddPatientDialog({ onAddPatient, existingPatients, campId }: AddPatientDialogProps) {
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
    if (campId) {
      // Filter only CAMP- numbers for this camp
      const campPatients = existingPatients.filter(p => p.patientNumber && p.patientNumber.startsWith('CAMP-'));
      const existingNumbers = campPatients
        .map(p => p.patientNumber)
        .filter(num => num && num.match(/^CAMP-\d+$/i))
        .map(num => parseInt(num!.substring(5)))
        .filter(num => !isNaN(num));
      const maxNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) : 0;
      const nextNumber = maxNumber + 1;
      return `CAMP-${nextNumber}`;
    }
    // Regular patients
    const existingNumbers = existingPatients
      .map(p => p.patientNumber)
      .filter(num => num && num.match(/^P\d+$/i))
      .map(num => parseInt(num!.substring(1)))
      .filter(num => !isNaN(num));
    const maxNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) : 0;
    const nextNumber = maxNumber + 1;
    return `P${nextNumber.toString().padStart(2, '0')}`;
  };

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
      };
      if (campId) {
        patientData.campId = campId;
      }
      // Save age as number if present
      if (typeof patientData.age === 'string' && patientData.age.trim()) {
        const parsedAge = parseInt(patientData.age);
        if (!isNaN(parsedAge)) patientData.age = parsedAge;
        else delete patientData.age;
      }

      // Only include dob if it exists
      if (cleanedData.dob) {
        patientData.dob = format(cleanedData.dob as Date, 'yyyy-MM-dd')
      }

      await addDoc(collection(db, "patients"), patientData)
      
      toast({
        title: "کامیابی",
        description: "مریض کامیابی سے شامل کر دیا گیا",
      })
      
      form.reset()
      setOpen(false)
      onAddPatient()
    } catch (error) {
      console.error("Error adding patient:", error)
      toast({
        title: "خرابی",
        description: "مریض شامل کرنے میں ناکامی ہوئی",
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
                مریض شامل کریں
              </Button>
            </DialogTrigger>
          </TooltipTrigger>
          <TooltipContent>
            <p>سسٹم میں نیا مریض شامل کریں</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>نیا مریض شامل کریں</DialogTitle>
          <DialogDescription>
            نیچے مریض کی معلومات درج کریں۔ جن فیلڈز پر * ہے وہ لازمی ہیں۔
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
                    <FormLabel>نام *</FormLabel>
                    <FormControl>
                      <Input placeholder="مریض کا نام درج کریں" {...field} />
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
                    <FormLabel>رابطہ نمبر *</FormLabel>
                    <FormControl>
                      <Input placeholder="رابطہ نمبر درج کریں" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <FormLabel>عمر کی معلومات</FormLabel>
                <div className="flex gap-2 p-1 bg-muted rounded-lg">
                  <Button
                    type="button"
                    variant={ageInputMode === "dob" ? "default" : "ghost"}
                    size="sm"
                    className="flex-1"
                    onClick={() => setAgeInputMode("dob")}
                  >
                    تاریخِ پیدائش
                  </Button>
                  <Button
                    type="button"
                    variant={ageInputMode === "age" ? "default" : "ghost"}
                    size="sm"
                    className="flex-1"
                    onClick={() => setAgeInputMode("age")}
                  >
                    براہِ راست عمر
                  </Button>
                </div>
              </div>

              {ageInputMode === "dob" ? (
                <FormField
                  control={form.control}
                  name="dob"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>تاریخِ پیدائش</FormLabel>
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
                                <span>تاریخ منتخب کریں</span>
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
                          عمر: {calculateAge(field.value)} سال
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
                      <FormLabel>عمر (سال میں)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="عمر درج کریں"
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
                <Label>رشتہ</Label>
                <Select value={relation} onValueChange={(value: "father" | "husband") => setRelation(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="father">والد</SelectItem>
                    <SelectItem value="husband">شوہر</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {relation === "father" ? (
                <FormField
                  control={form.control}
                  name="fatherName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>والد کا نام</FormLabel>
                      <FormControl>
                        <Input placeholder="والد کا نام درج کریں" {...field} />
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
                      <FormLabel>شوہر کا نام</FormLabel>
                      <FormControl>
                        <Input placeholder="شوہر کا نام درج کریں" {...field} />
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
                    <FormLabel>جنس *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="جنس منتخب کریں" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Male">مرد</SelectItem>
                        <SelectItem value="Female">خاتون</SelectItem>
                        <SelectItem value="Other">دیگر</SelectItem>
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
                    <FormLabel>بلڈ گروپ</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="بلڈ گروپ منتخب کریں" />
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
                منسوخ کریں
              </Button>
              <Button type="submit">مریض شامل کریں</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}