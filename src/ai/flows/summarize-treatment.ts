// Summarize Treatment History
'use server';
/**
 * @fileOverview Summarizes a patient's treatment history.
 *
 * - summarizeTreatmentHistory - A function that summarizes the treatment history.
 * - SummarizeTreatmentHistoryInput - The input type for the summarizeTreatmentHistory function.
 * - SummarizeTreatmentHistoryOutput - The return type for the summarizeTreatmentHistory function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SummarizeTreatmentHistoryInputSchema = z.object({
  patientDetails: z.string().describe('Details of the patient including name, age, and medical history.'),
  treatmentHistory: z.string().describe('A detailed history of the patient\'s treatments, including dates, times, observations, and medications.'),
});
export type SummarizeTreatmentHistoryInput = z.infer<typeof SummarizeTreatmentHistoryInputSchema>;

const SummarizeTreatmentHistoryOutputSchema = z.object({
  summary: z.string().describe('A concise summary of the patient\'s treatment history, highlighting key trends and patterns.'),
});
export type SummarizeTreatmentHistoryOutput = z.infer<typeof SummarizeTreatmentHistoryOutputSchema>;

export async function summarizeTreatmentHistory(input: SummarizeTreatmentHistoryInput): Promise<SummarizeTreatmentHistoryOutput> {
  return summarizeTreatmentHistoryFlow(input);
}

const prompt = ai.definePrompt({
  name: 'summarizeTreatmentHistoryPrompt',
  input: {schema: SummarizeTreatmentHistoryInputSchema},
  output: {schema: SummarizeTreatmentHistoryOutputSchema},
  prompt: `You are a medical expert tasked with summarizing patient treatment histories.

  Given the following patient details and treatment history, create a concise summary highlighting key trends and patterns in their care.

  Patient Details: {{{patientDetails}}}
  Treatment History: {{{treatmentHistory}}}

  Summary:`, 
});

const summarizeTreatmentHistoryFlow = ai.defineFlow(
  {
    name: 'summarizeTreatmentHistoryFlow',
    inputSchema: SummarizeTreatmentHistoryInputSchema,
    outputSchema: SummarizeTreatmentHistoryOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
