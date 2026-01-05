/**
 * ATS Triage Engine - Hybrid Rules + LLM Architecture
 *
 * This is the core triage engine that combines:
 * 1. Deterministic guardrails (rules-based safety layer)
 * 2. LLM reasoning (for complex interpretation)
 * 3. Safety envelope (post-LLM validation)
 *
 * The architecture ensures that life-threatening conditions are NEVER missed,
 * while leveraging LLM capabilities for nuanced clinical reasoning.
 *
 * Supports multiple LLM backends: Groq, Ollama, OpenAI-compatible APIs
 */

// LLM client interface - supports multiple backends
interface LLMClient {
  messages: {
    create: (params: any) => Promise<any>;
  };
}
import { z } from 'zod';
import {
  ATSCategory,
  ATSAssessment,
  ATS_CATEGORIES,
  SymptomPresentation,
  SymptomPresentationSchema,
} from './ats.js';
import { GuardrailsEngine, GuardrailsResult, guardrailsEngine } from './guardrails.js';

/**
 * LLM Triage Response Schema
 */
const LLMTriageResponseSchema = z.object({
  category: ATSCategory,
  confidence: z.number().min(0).max(1),
  clinicalReasoning: z.string(),
  discriminatorsUsed: z.array(z.string()),
  recommendations: z.array(z.string()),
  differentialConsiderations: z.array(z.string()).optional(),
});

type LLMTriageResponse = z.infer<typeof LLMTriageResponseSchema>;

/**
 * System prompt for ATS triage
 * Designed to work WITH the guardrails, not replace them
 */
const ATS_TRIAGE_SYSTEM_PROMPT = `You are an AI medical triage assistant trained in the Australian Triage Scale (ATS).

CRITICAL SAFETY RULES:
1. You NEVER diagnose - you only assess urgency and recommend appropriate level of care
2. You ALWAYS err on the side of caution - over-triage is safer than under-triage
3. Red flag symptoms have ALREADY been detected by our safety layer - respect the minimum category
4. Your role is to provide clinical reasoning and recommendations, not to override safety rules

AUSTRALIAN TRIAGE SCALE (ATS) CATEGORIES:
- ATS1 (Resuscitation): Immediately life-threatening. Max wait: 0 minutes.
  Examples: cardiac arrest, respiratory arrest, severe anaphylaxis

- ATS2 (Emergency): Imminently life-threatening. Max wait: 10 minutes.
  Examples: chest pain (cardiac), stroke symptoms, severe respiratory distress

- ATS3 (Urgent): Potentially life-threatening. Max wait: 30 minutes.
  Examples: moderate dyspnoea, significant abdominal pain, high fever with risk factors

- ATS4 (Semi-urgent): Potentially serious. Max wait: 60 minutes.
  Examples: mild respiratory symptoms, minor injuries, uncomplicated infections

- ATS5 (Non-urgent): Less urgent. Max wait: 120 minutes.
  Examples: minor wounds, chronic stable conditions, prescription refills

CLINICAL DISCRIMINATORS TO CONSIDER:
- Airway compromise or risk
- Breathing difficulty (work of breathing, respiratory rate)
- Circulation (BP, heart rate, perfusion)
- Disability (GCS, neurological status)
- Pain severity (severe = 8-10, moderate = 5-7, mild = 1-4)
- Mechanism of injury
- Time since onset
- Patient age and comorbidities

RESPONSE FORMAT:
You must respond with valid JSON only:
{
  "category": "ATS1" | "ATS2" | "ATS3" | "ATS4" | "ATS5",
  "confidence": 0.0-1.0,
  "clinicalReasoning": "Brief clinical reasoning for this triage decision",
  "discriminatorsUsed": ["List of clinical discriminators that informed this decision"],
  "recommendations": ["Specific next steps for this patient"],
  "differentialConsiderations": ["Conditions to consider/rule out"]
}`;

/**
 * ATS Triage Engine
 * Hybrid architecture combining deterministic rules with LLM reasoning
 */
export class ATSTriageEngine {
  private client: LLMClient;
  private guardrails: GuardrailsEngine;
  private model: string;
  private apiKey: string;

  constructor(options?: { apiKey?: string; model?: string; client?: LLMClient }) {
    this.apiKey = options?.apiKey || process.env.GROQ_API_KEY || '';
    this.model = options?.model || 'llama-3.3-70b-versatile';
    this.guardrails = guardrailsEngine;

    // Use provided client or create Groq-compatible client
    this.client = options?.client || this.createGroqClient();
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
              max_tokens: params.max_tokens || 1024,
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

  /**
   * Perform full ATS triage assessment
   * This is the main entry point for triage
   */
  async assess(presentation: SymptomPresentation): Promise<ATSAssessment> {
    const startTime = Date.now();
    const auditTrail: ATSAssessment['auditTrail'] = [];

    // Validate input
    const validatedPresentation = SymptomPresentationSchema.parse(presentation);
    const rawInput = this.buildRawInput(validatedPresentation);

    auditTrail.push({
      step: 'INPUT_RECEIVED',
      result: `Chief complaint: ${validatedPresentation.chiefComplaint}`,
      timestamp: new Date().toISOString(),
    });

    // LAYER 1-2: Run guardrails (deterministic)
    const guardrailsResult = this.guardrails.preProcess(rawInput, validatedPresentation);
    auditTrail.push(...guardrailsResult.auditLog);

    auditTrail.push({
      step: 'GUARDRAILS_COMPLETE',
      result: `Minimum category: ${guardrailsResult.minimumCategory || 'none'}, Red flags: ${guardrailsResult.redFlagsDetected.length}`,
      timestamp: new Date().toISOString(),
    });

    // LAYER 3: LLM reasoning
    const llmResponse = await this.callLLM(validatedPresentation, guardrailsResult);
    auditTrail.push({
      step: 'LLM_ASSESSMENT',
      result: `LLM recommended: ${llmResponse.category} (confidence: ${(llmResponse.confidence * 100).toFixed(0)}%)`,
      timestamp: new Date().toISOString(),
    });

    // LAYER 4: Safety envelope (post-LLM validation)
    const safetyResult = this.guardrails.postProcess(llmResponse.category, guardrailsResult);
    auditTrail.push(...safetyResult.auditLog);

    // Build final assessment
    const categoryInfo = ATS_CATEGORIES[safetyResult.finalCategory];
    const processingTime = Date.now() - startTime;

    auditTrail.push({
      step: 'ASSESSMENT_COMPLETE',
      result: `Final category: ${safetyResult.finalCategory} (${categoryInfo.name}). Processing time: ${processingTime}ms`,
      timestamp: new Date().toISOString(),
    });

    // Build escalation notes if category was escalated
    let escalationNotes: string | undefined;
    if (safetyResult.wasEscalated) {
      escalationNotes = `Category escalated from ${llmResponse.category} to ${safetyResult.finalCategory}. ${safetyResult.escalationReason}`;
    }

    return {
      category: safetyResult.finalCategory,
      categoryInfo: {
        name: categoryInfo.name,
        description: categoryInfo.description,
        maxWaitTime: categoryInfo.maxWaitTime,
        color: categoryInfo.color,
      },
      confidence: safetyResult.wasEscalated ? 0.95 : llmResponse.confidence, // High confidence for rule-based escalations
      redFlagsDetected: guardrailsResult.redFlagsDetected.map(f => ({
        id: f.id,
        name: f.name,
        evidence: f.evidence,
        action: f.action,
      })),
      clinicalReasoning: safetyResult.wasEscalated
        ? `${llmResponse.clinicalReasoning}\n\n⚠️ ESCALATED: ${safetyResult.escalationReason}`
        : llmResponse.clinicalReasoning,
      discriminatorsUsed: llmResponse.discriminatorsUsed,
      recommendations: this.buildRecommendations(
        safetyResult.finalCategory,
        llmResponse.recommendations,
        guardrailsResult
      ),
      escalationNotes,
      auditTrail,
    };
  }

  /**
   * Build raw input string for guardrails processing
   */
  private buildRawInput(presentation: SymptomPresentation): string {
    const parts: string[] = [presentation.chiefComplaint];

    for (const symptom of presentation.symptoms) {
      let symptomStr = symptom.description;
      if (symptom.location) symptomStr += ` (${symptom.location})`;
      if (symptom.duration) symptomStr += ` for ${symptom.duration}`;
      if (symptom.severity) symptomStr += ` - severity ${symptom.severity}/10`;
      if (symptom.onset) symptomStr += ` - ${symptom.onset} onset`;
      parts.push(symptomStr);
    }

    return parts.join('. ');
  }

  /**
   * Call LLM for clinical reasoning
   */
  private async callLLM(
    presentation: SymptomPresentation,
    guardrailsResult: GuardrailsResult
  ): Promise<LLMTriageResponse> {
    const guardrailsContext = this.guardrails.generateLLMContext(guardrailsResult);

    const userPrompt = this.buildUserPrompt(presentation, guardrailsContext);

    try {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 1024,
        system: ATS_TRIAGE_SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userPrompt }],
      });

      const content = response.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected response type');
      }

      // Parse JSON response
      let jsonStr = content.text;
      const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1];
      }
      const objectMatch = jsonStr.match(/\{[\s\S]*\}/);
      if (objectMatch) {
        jsonStr = objectMatch[0];
      }

      const parsed = JSON.parse(jsonStr);
      return LLMTriageResponseSchema.parse(parsed);
    } catch (error) {
      // Fallback if LLM fails - use guardrails minimum or default to ATS4
      console.error('LLM call failed:', error);

      return {
        category: guardrailsResult.minimumCategory || 'ATS4',
        confidence: 0.5,
        clinicalReasoning: 'LLM assessment unavailable. Category based on safety rules and clinical discriminators.',
        discriminatorsUsed: ['Fallback assessment'],
        recommendations: ['Proceed with clinical assessment', 'Escalate if any deterioration'],
      };
    }
  }

  /**
   * Build user prompt for LLM
   */
  private buildUserPrompt(
    presentation: SymptomPresentation,
    guardrailsContext: string
  ): string {
    const parts: string[] = [];

    // Guardrails context (if any red flags or alerts)
    if (guardrailsContext) {
      parts.push('SAFETY LAYER ANALYSIS:');
      parts.push(guardrailsContext);
      parts.push('');
    }

    // Patient presentation
    parts.push('PATIENT PRESENTATION:');
    parts.push(`Chief Complaint: ${presentation.chiefComplaint}`);

    if (presentation.demographics) {
      const demo = presentation.demographics;
      if (demo.age !== undefined) parts.push(`Age: ${demo.age} years`);
      if (demo.sex) parts.push(`Sex: ${demo.sex}`);
    }

    if (presentation.symptoms.length > 0) {
      parts.push('\nSymptoms:');
      for (const symptom of presentation.symptoms) {
        let symptomLine = `- ${symptom.description}`;
        if (symptom.location) symptomLine += ` (${symptom.location})`;
        if (symptom.duration) symptomLine += `, duration: ${symptom.duration}`;
        if (symptom.severity) symptomLine += `, severity: ${symptom.severity}/10`;
        if (symptom.onset) symptomLine += `, onset: ${symptom.onset}`;
        if (symptom.associated?.length) symptomLine += `, associated: ${symptom.associated.join(', ')}`;
        parts.push(symptomLine);
      }
    }

    if (presentation.vitals) {
      const v = presentation.vitals;
      const vitalsParts: string[] = [];
      if (v.heartRate) vitalsParts.push(`HR: ${v.heartRate}`);
      if (v.systolicBP && v.diastolicBP) vitalsParts.push(`BP: ${v.systolicBP}/${v.diastolicBP}`);
      if (v.temperature) vitalsParts.push(`Temp: ${v.temperature}°C`);
      if (v.respiratoryRate) vitalsParts.push(`RR: ${v.respiratoryRate}`);
      if (v.spo2) vitalsParts.push(`SpO2: ${v.spo2}%`);
      if (vitalsParts.length > 0) {
        parts.push(`\nVitals: ${vitalsParts.join(', ')}`);
      }
    }

    if (presentation.medicalHistory?.length) {
      parts.push(`\nMedical History: ${presentation.medicalHistory.join(', ')}`);
    }

    if (presentation.currentMedications?.length) {
      parts.push(`Current Medications: ${presentation.currentMedications.join(', ')}`);
    }

    if (presentation.allergies?.length) {
      parts.push(`Allergies: ${presentation.allergies.join(', ')}`);
    }

    parts.push('\nProvide your ATS triage assessment as JSON.');

    return parts.join('\n');
  }

  /**
   * Build final recommendations based on category and context
   */
  private buildRecommendations(
    category: ATSCategory,
    llmRecommendations: string[],
    guardrailsResult: GuardrailsResult
  ): string[] {
    const recommendations: string[] = [];

    // Category-specific recommendations
    switch (category) {
      case 'ATS1':
        recommendations.push('IMMEDIATE resuscitation team activation');
        recommendations.push('Continuous monitoring required');
        break;
      case 'ATS2':
        recommendations.push('Urgent medical assessment within 10 minutes');
        recommendations.push('Prepare for potential escalation');
        break;
      case 'ATS3':
        recommendations.push('Medical assessment within 30 minutes');
        break;
      case 'ATS4':
        recommendations.push('Medical assessment within 60 minutes');
        break;
      case 'ATS5':
        recommendations.push('Assessment when resources available (within 2 hours)');
        break;
    }

    // Add red flag actions
    for (const flag of guardrailsResult.redFlagsDetected) {
      recommendations.push(flag.action);
    }

    // Add LLM recommendations (deduplicated)
    for (const rec of llmRecommendations) {
      if (!recommendations.some(r => r.toLowerCase().includes(rec.toLowerCase().substring(0, 20)))) {
        recommendations.push(rec);
      }
    }

    return recommendations;
  }
}

/**
 * Doctor Summary Generator for ATS assessments
 * Creates pre-consultation briefings for clinicians
 */
export class ATSDoctorSummaryGenerator {
  private client: LLMClient;
  private model: string;
  private apiKey: string;

  constructor(options?: { apiKey?: string; model?: string; client?: LLMClient }) {
    this.apiKey = options?.apiKey || process.env.GROQ_API_KEY || '';
    this.model = options?.model || 'llama-3.3-70b-versatile';

    // Use provided client or create Groq-compatible client
    this.client = options?.client || this.createGroqClient();
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
              messages: params.messages,
              max_tokens: params.max_tokens || 512,
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

  async generate(
    presentation: SymptomPresentation,
    assessment: ATSAssessment
  ): Promise<{
    headline: string;
    keyFindings: string[];
    suggestedQuestions: string[];
    differentialDiagnosis: string[];
    immediateActions: string[];
  }> {
    const prompt = `Generate a concise doctor pre-consultation briefing.

PATIENT:
${presentation.demographics?.age ? `Age: ${presentation.demographics.age}` : ''}
${presentation.demographics?.sex ? `Sex: ${presentation.demographics.sex}` : ''}

PRESENTATION:
Chief Complaint: ${presentation.chiefComplaint}
Symptoms: ${presentation.symptoms.map(s => s.description).join(', ')}

TRIAGE ASSESSMENT:
Category: ${assessment.category} (${assessment.categoryInfo.name})
Max Wait: ${assessment.categoryInfo.maxWaitTime}
Red Flags: ${assessment.redFlagsDetected.length > 0 ? assessment.redFlagsDetected.map(f => f.name).join(', ') : 'None'}
Clinical Reasoning: ${assessment.clinicalReasoning}

Respond with JSON:
{
  "headline": "One-line summary for quick review",
  "keyFindings": ["Finding 1", "Finding 2"],
  "suggestedQuestions": ["Question to ask patient"],
  "differentialDiagnosis": ["Condition 1", "Condition 2"],
  "immediateActions": ["Action if applicable"]
}`;

    try {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 512,
        messages: [{ role: 'user', content: prompt }],
      });

      const content = response.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected response type');
      }

      let jsonStr = content.text;
      const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) jsonStr = jsonMatch[1];
      const objectMatch = jsonStr.match(/\{[\s\S]*\}/);
      if (objectMatch) jsonStr = objectMatch[0];

      return JSON.parse(jsonStr);
    } catch (error) {
      console.error('Doctor summary generation failed:', error);
      return {
        headline: `${assessment.category} - ${presentation.chiefComplaint}`,
        keyFindings: presentation.symptoms.map(s => s.description),
        suggestedQuestions: ['Can you describe your symptoms in more detail?'],
        differentialDiagnosis: ['Requires clinical assessment'],
        immediateActions: assessment.recommendations.slice(0, 2),
      };
    }
  }
}

// Export singleton instances
export const atsTriageEngine = new ATSTriageEngine();
export const atsDoctorSummaryGenerator = new ATSDoctorSummaryGenerator();
