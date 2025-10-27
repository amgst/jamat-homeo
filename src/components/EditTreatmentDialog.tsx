"use client";

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

import type { Treatment } from '@/lib/types';

const formSchema = z.object({
  date: z.date({
    required_error: "علاج کی تاریخ ضروری ہے۔",
  }),
  time: z.string().min(1, {
    message: "علاج کا وقت ضروری ہے۔",
  }),
  observations: z.string().min(5, {
    message: "مشاہدات کم از کم 5 حروف ہونے چاہئیں۔",
  }),
  remedy: z.string().optional(),
});

type EditTreatmentDialogProps = {
  treatment: Treatment;
  onUpdateTreatment: (treatment: Treatment) => void;
};

export function EditTreatmentDialog({ treatment, onUpdateTreatment }: EditTreatmentDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date: new Date(treatment.date),
      time: treatment.time,
      observations: treatment.observations,
      remedy: treatment.remedy || "",
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    const updatedTreatment: Treatment = {
      ...treatment,
      date: format(values.date, 'yyyy-MM-dd'),
      time: values.time,
      observations: values.observations,
      remedy: values.remedy || undefined,
    };
    
    onUpdateTreatment(updatedTreatment);
    setIsOpen(false);
    toast({
      title: "علاج اپڈیٹ ہو گیا",
      description: "علاج کا ریکارڈ کامیابی سے اپڈیٹ کر دیا گیا ہے۔",
    });
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Pencil className="h-4 w-4" />
                <span className="sr-only">علاج میں ترمیم کریں</span>
              </Button>
            </DialogTrigger>
          </TooltipTrigger>
          <TooltipContent>
            <p>علاج میں ترمیم کریں</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>علاج میں ترمیم کریں</DialogTitle>
          <DialogDescription>
            نیچے علاج کی تفصیلات اپڈیٹ کریں۔ جب مکمل ہو جائے تو محفوظ کریں۔
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>علاج کی تاریخ</FormLabel>
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
                            {field.value ? (
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
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>علاج کا وقت</FormLabel>
                    <FormControl>
                      <Input 
                        type="time"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
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
            <FormField
              control={form.control}
              name="remedy"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>علاج/دوائی (اختیاری)</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="مقررہ دوائی درج کریں" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="secondary">
                  منسوخ کریں
                </Button>
              </DialogClose>
              <Button type="submit">تبدیلیاں محفوظ کریں</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}