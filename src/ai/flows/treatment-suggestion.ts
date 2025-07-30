// This file implements the Genkit flow for the TreatmentSuggestion story.
// It provides AI-powered suggestions to quickly and accurately input common treatments and observations for a patient.

'use server';

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const TreatmentSuggestionInputSchema = z.object({
  patientDetails: z.string().describe('Details about the patient including medical history, current condition, and any known allergies.'),
  treatmentContext: z.string().describe('Context about the current treatment being administered, including date, time, and any previous treatments given.'),
  query: z.string().describe('The text query for treatment suggestions, usually a list of symptoms.'),
});
export type TreatmentSuggestionInput = z.infer<typeof TreatmentSuggestionInputSchema>;

const TreatmentSuggestionOutputSchema = z.object({
  suggestions: z.array(z.string()).describe('A list of up to 5 suggested homeopathic remedies (including potency, e.g., "Arnica Montana 30C") based on the patient\'s symptoms.'),
});
export type TreatmentSuggestionOutput = z.infer<typeof TreatmentSuggestionOutputSchema>;

export async function treatmentSuggestion(input: TreatmentSuggestionInput): Promise<TreatmentSuggestionOutput> {
  return treatmentSuggestionFlow(input);
}

const treatmentSuggestionPrompt = ai.definePrompt({
  name: 'treatmentSuggestionPrompt',
  input: {schema: TreatmentSuggestionInputSchema},
  output: {schema: TreatmentSuggestionOutputSchema},
  prompt: `You are an expert AI assistant for a homeopathic doctor. Your role is to suggest relevant homeopathic remedies based on a patient's symptoms, paying close attention to the principles of homeopathy.

  Analyze the following symptoms described in the query. Consider the "totality of symptoms," including:
  - The chief complaint.
  - Modalities (what makes the symptoms better or worse, e.g., time of day, temperature, position).
  - The patient's emotional and mental state.
  - Any strange, rare, or peculiar symptoms.

  Based on this homeopathic analysis of the patient's case, suggest up to 5 of the most relevant homeopathic remedies. Include common potencies (e.g., "Arnica Montana 30C", "Nux Vomica 200CK").

  Patient Details:
  {{patientDetails}}

  Treatment History:
  {{treatmentContext}}

  Current Symptoms (Query):
  {{query}}

  Format your response as a JSON array of strings.
  `,
});

const treatmentSuggestionFlow = ai.defineFlow(
  {
    name: 'treatmentSuggestionFlow',
    inputSchema: TreatmentSuggestionInputSchema,
    outputSchema: TreatmentSuggestionOutputSchema,
  },
  async input => {
    const {output} = await treatmentSuggestionPrompt(input);
    return output!;
  }
);
