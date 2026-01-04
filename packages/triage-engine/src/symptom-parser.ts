import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { Symptom, SymptomSchema } from './types.js';

const ParsedSymptomsSchema = z.object({
  symptoms: z.array(SymptomSchema),
  additionalContext: z.string().optional(),
});

const SYMPTOM_PARSER_PROMPT = `You are a medical symptom parser. Extract structured symptoms from patient descriptions.

For each symptom, extract:
- description: The main symptom in medical terminology
- location: Body part/area affected (if mentioned)
- duration: How long they've had it (if mentioned)
- severity: 1-10 scale based on their description (if determinable)
- onset: "sudden" or "gradual" (if mentioned)
- associated: Related symptoms mentioned together

Be precise and clinical. Do not add symptoms not mentioned.
Do not diagnose - only parse what the patient says.

Respond with JSON only.`;

export class SymptomParser {
  private client: Anthropic;

  constructor(apiKey?: string) {
    this.client = new Anthropic({ apiKey });
  }

  async parse(rawInput: string): Promise<{ symptoms: Symptom[]; additionalContext?: string }> {
    const response = await this.client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: SYMPTOM_PARSER_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Parse the following patient input into structured symptoms:\n\n"${rawInput}"`,
        },
      ],
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type');
    }

    // Extract JSON from response (handle markdown code blocks)
    let jsonStr = content.text;
    const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1];
    }

    const parsed = JSON.parse(jsonStr);
    return ParsedSymptomsSchema.parse(parsed);
  }
}
