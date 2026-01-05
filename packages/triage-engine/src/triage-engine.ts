import { z } from 'zod';
import {
  PatientIntake,
  TriageResult,
  TriageResultSchema,
  RedFlag,
  UrgencyLevel,
} from './types.js';

// LLM client interface - supports multiple backends
interface LLMClient {
  messages: {
    create: (params: any) => Promise<any>;
  };
}

// Red flag conditions that MUST be detected with 100% sensitivity
const RED_FLAG_CONDITIONS = [
  'Chest pain with radiation to arm/jaw/back',
  'Difficulty breathing / shortness of breath',
  'Sudden severe headache ("worst headache of my life")',
  'Loss of consciousness / syncope',
  'Signs of stroke (FAST: Face drooping, Arm weakness, Speech difficulty)',
  'Severe allergic reaction / anaphylaxis',
  'Suicidal ideation or self-harm',
  'Heavy bleeding that won\'t stop',
  'Severe abdominal pain with fever',
  'Confusion or altered mental status',
];

const TRIAGE_PROMPT = `You are an AI medical triage system. Your role is to assess patient symptoms and provide triage recommendations.

CRITICAL SAFETY RULE: You must NEVER miss a red flag condition. Better to over-triage than under-triage.

RED FLAG CONDITIONS (require immediate escalation):
${RED_FLAG_CONDITIONS.map((c, i) => `${i + 1}. ${c}`).join('\n')}

TRIAGE LEVELS:
- Severity 1-2: Low concern, routine care
- Severity 3: Moderate concern, needs attention today
- Severity 4: High concern, needs prompt attention
- Severity 5: Critical, immediate attention required

URGENCY LEVELS:
- EMERGENCY: Immediate attention (ambulance/ER)
- URGENT: Within 1 hour
- SEMI_URGENT: Within 4 hours
- STANDARD: Same day
- NON_URGENT: Can be scheduled

Your assessment must include:
1. Severity score (1-5)
2. Urgency level
3. Any red flags detected
4. Recommended specialty(ies)
5. Clear reasoning for your decision
6. Recommendations for the patient

Be precise. Be safe. When in doubt, escalate.

Respond with JSON only.`;

export class TriageEngine {
  private client: LLMClient;
  private model: string;
  private apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.GROQ_API_KEY || '';
    this.model = 'llama-3.3-70b-versatile';
    this.client = this.createGroqClient();
  }

  private createGroqClient(): LLMClient {
    const apiKey = this.apiKey;
    const model = this.model;

    return {
      messages: {
        create: async (params: any) => {
          const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: model,
              messages: [
                { role: 'system', content: params.system },
                ...params.messages,
              ],
              max_tokens: params.max_tokens || 2048,
              temperature: 0.7,
            }),
          });

          if (!response.ok) {
            throw new Error(`Groq API error: ${response.status}`);
          }

          const data = await response.json();
          return {
            content: [{ type: 'text', text: data.choices[0].message.content }],
          };
        },
      },
    };
  }

  async assess(intake: PatientIntake): Promise<TriageResult> {
    const patientContext = this.formatPatientContext(intake);

    const response = await this.client.messages.create({
      system: TRIAGE_PROMPT,
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: `Perform triage assessment for the following patient:\n\n${patientContext}`,
        },
      ],
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type');
    }

    // Extract JSON from response
    let jsonStr = content.text;
    const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1];
    }

    const parsed = JSON.parse(jsonStr);
    const result = TriageResultSchema.parse(parsed);

    // Double-check red flags with keyword detection (safety net)
    const additionalFlags = this.checkRedFlagKeywords(intake.rawInput);
    if (additionalFlags.length > 0 && !result.redFlags.detected) {
      result.redFlags = {
        detected: true,
        flags: additionalFlags.map(flag => ({
          condition: flag,
          evidence: 'Keyword detection',
          action: 'Escalate to URGENT or higher',
        })),
      };
      result.urgency = 'URGENT';
      if (result.severity < 4) {
        result.severity = 4;
      }
    }

    return result;
  }

  private formatPatientContext(intake: PatientIntake): string {
    const parts = [];

    parts.push(`PATIENT STATEMENT: "${intake.rawInput}"`);

    if (intake.symptoms.length > 0) {
      parts.push('\nPARSED SYMPTOMS:');
      intake.symptoms.forEach((s, i) => {
        parts.push(`${i + 1}. ${s.description}`);
        if (s.location) parts.push(`   Location: ${s.location}`);
        if (s.duration) parts.push(`   Duration: ${s.duration}`);
        if (s.severity) parts.push(`   Severity: ${s.severity}/10`);
        if (s.onset) parts.push(`   Onset: ${s.onset}`);
        if (s.associated?.length) parts.push(`   Associated: ${s.associated.join(', ')}`);
      });
    }

    if (intake.demographics) {
      if (intake.demographics.age) parts.push(`\nAGE: ${intake.demographics.age}`);
      if (intake.demographics.sex) parts.push(`SEX: ${intake.demographics.sex}`);
    }

    if (intake.medicalHistory?.length) {
      parts.push(`\nMEDICAL HISTORY: ${intake.medicalHistory.join(', ')}`);
    }

    if (intake.currentMedications?.length) {
      parts.push(`CURRENT MEDICATIONS: ${intake.currentMedications.join(', ')}`);
    }

    if (intake.allergies?.length) {
      parts.push(`ALLERGIES: ${intake.allergies.join(', ')}`);
    }

    return parts.join('\n');
  }

  private checkRedFlagKeywords(text: string): string[] {
    const lowerText = text.toLowerCase();
    const flags: string[] = [];

    const keywordPatterns = [
      { pattern: /chest pain|chest tightness|chest pressure/, flag: 'Chest pain' },
      { pattern: /can't breathe|hard to breathe|shortness of breath|gasping/, flag: 'Difficulty breathing' },
      { pattern: /worst headache|thunderclap headache|sudden severe headache/, flag: 'Sudden severe headache' },
      { pattern: /passed out|fainted|lost consciousness|blacked out/, flag: 'Loss of consciousness' },
      { pattern: /face droop|arm weak|slurred speech|can't speak|one side/, flag: 'Possible stroke symptoms' },
      { pattern: /can't swallow|throat closing|swelling.*throat/, flag: 'Possible anaphylaxis' },
      { pattern: /want to die|kill myself|suicide|self.?harm/, flag: 'Suicidal ideation' },
      { pattern: /heavy bleeding|won't stop bleeding|blood everywhere/, flag: 'Severe bleeding' },
      { pattern: /confused|don't know where|altered mental/, flag: 'Altered mental status' },
    ];

    for (const { pattern, flag } of keywordPatterns) {
      if (pattern.test(lowerText)) {
        flags.push(flag);
      }
    }

    return flags;
  }
}
