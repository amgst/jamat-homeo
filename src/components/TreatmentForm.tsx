"use client";

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { treatmentSuggestion } from '@/ai/flows/treatment-suggestion';

import type { Patient, Treatment } from '@/lib/types';
import { Loader2 } from 'lucide-react';

const formSchema = z.object({
  date: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: "Please enter a valid date.",
  }),
  time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: "Please enter a valid time in HH:mm format.",
  }),
  observations: z.string().min(5, {
    message: "Observations must be at least 5 characters.",
  }),
  remedy: z.string().optional(),
});

type TreatmentFormProps = {
  patient: Patient;
  onAddTreatment: (treatment: Omit<Treatment, 'id'>) => void;
};

export function TreatmentForm({ patient, onAddTreatment }: TreatmentFormProps) {
  const { toast } = useToast();
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      time: new Date().toTimeString().split(' ')[0].substring(0, 5),
      observations: "",
      remedy: "",
    },
  });

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
    onAddTreatment(values);
    form.reset({
      date: new Date().toISOString().split('T')[0],
      time: new Date().toTimeString().split(' ')[0].substring(0, 5),
      observations: "",
      remedy: "",
    });
    setSuggestions([]);
    toast({
      title: "Treatment Added",
      description: `A new treatment for ${patient.name} has been saved.`,
    });
  }

  return (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle className="font-headline">Add New Treatment</CardTitle>
        <CardDescription>Log a new treatment or observation for {patient.name}.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Time</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
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
                            <Input placeholder="AI suggestions will appear here..." {...field} />
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
                            form.setValue('remedy', newRemedy);
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
