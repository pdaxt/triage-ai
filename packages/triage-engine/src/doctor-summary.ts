import Anthropic from '@anthropic-ai/sdk';
import { PatientIntake, TriageResult, DoctorSummary, DoctorSummarySchema } from './types.js';

const DOCTOR_SUMMARY_PROMPT = `You are a medical AI assistant preparing pre-consultation briefings for doctors.

Your role is to summarize patient triage data into a concise, actionable briefing that helps the doctor:
1. Quickly understand the patient's presentation
2. Know what red flags to watch for
3. Have context-appropriate questions ready
4. Consider relevant differential diagnoses

The doctor will use this summary to:
- Prepare for a rapid virtual consultation
- Make informed decisions about digital prescriptions
- Identify cases that need in-person follow-up

Format your response as structured JSON that can be displayed in a doctor dashboard.

Be concise but thorough. Doctors are busy - every word must add value.`;

export class DoctorSummaryGenerator {
  private client: Anthropic;

  constructor(apiKey?: string) {
    this.client = new Anthropic({ apiKey });
  }

  async generate(intake: PatientIntake, triageResult: TriageResult): Promise<DoctorSummary> {
    const briefingRequest = this.formatBriefingRequest(intake, triageResult);

    const response = await this.client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      system: DOCTOR_SUMMARY_PROMPT,
      messages: [
        {
          role: 'user',
          content: briefingRequest,
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
    return DoctorSummarySchema.parse(parsed);
  }

  private formatBriefingRequest(intake: PatientIntake, result: TriageResult): string {
    return `Generate a doctor pre-consultation briefing for the following case:

PATIENT STATEMENT:
"${intake.rawInput}"

TRIAGE ASSESSMENT:
- Severity: ${result.severity}/5
- Urgency: ${result.urgency}
- Red Flags: ${result.redFlags.detected ? result.redFlags.flags.map(f => f.condition).join(', ') : 'None detected'}
- Specialty Match: ${result.specialtyMatch.join(', ')}
- Triage Reasoning: ${result.reasoning}

SYMPTOMS IDENTIFIED:
${intake.symptoms.map((s, i) => `${i + 1}. ${s.description}${s.duration ? ` (${s.duration})` : ''}${s.severity ? ` - Severity ${s.severity}/10` : ''}`).join('\n')}

${intake.medicalHistory?.length ? `MEDICAL HISTORY:\n${intake.medicalHistory.join(', ')}` : ''}

${intake.currentMedications?.length ? `CURRENT MEDICATIONS:\n${intake.currentMedications.join(', ')}` : ''}

${intake.allergies?.length ? `ALLERGIES:\n${intake.allergies.join(', ')}` : ''}

Generate a structured briefing the doctor can review in under 30 seconds before the virtual consultation.
Include suggested questions specific to this presentation.
Include 2-4 differential diagnoses to consider.`;
  }
}
