/**
 * Guardrails Engine - Deterministic Safety Layer
 *
 * This module implements the "rules-first" safety architecture for medical triage.
 * All patient inputs pass through deterministic rules BEFORE any LLM reasoning.
 *
 * SAFETY PRINCIPLE: We cannot afford false negatives for life-threatening conditions.
 * The system is designed to err on the side of caution (over-triage is safer than under-triage).
 *
 * Architecture:
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │                      PATIENT INPUT                                   │
 * └───────────────────────────┬─────────────────────────────────────────┘
 *                             ▼
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │  LAYER 1: KEYWORD DETECTION (Deterministic, <1ms)                   │
 * │  • Red flag keywords (chest pain, can't breathe, etc.)              │
 * │  • Pattern matching for critical conditions                          │
 * │  • Result: Minimum ATS category floor                                │
 * └───────────────────────────┬─────────────────────────────────────────┘
 *                             ▼
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │  LAYER 2: CLINICAL RULES (Deterministic, <5ms)                      │
 * │  • Age-adjusted thresholds                                          │
 * │  • Vital signs assessment                                            │
 * │  • Symptom combinations                                              │
 * │  • Result: Category adjustment + alerts                              │
 * └───────────────────────────┬─────────────────────────────────────────┘
 *                             ▼
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │  LAYER 3: LLM REASONING (Non-deterministic, 1-3s)                   │
 * │  • Complex symptom interpretation                                    │
 * │  • Context-aware assessment                                          │
 * │  • Natural language understanding                                    │
 * │  • Result: Category recommendation + reasoning                       │
 * └───────────────────────────┬─────────────────────────────────────────┘
 *                             ▼
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │  LAYER 4: SAFETY ENVELOPE (Deterministic, <1ms)                     │
 * │  • Enforce minimum category from Layer 1-2                          │
 * │  • Prevent under-triage regardless of LLM output                    │
 * │  • Log all decisions for audit                                       │
 * │  • Result: FINAL ATS category                                        │
 * └─────────────────────────────────────────────────────────────────────┘
 */

import {
  ATSCategory,
  ATSAssessment,
  ATS_CATEGORIES,
  SymptomPresentation,
  checkRedFlags,
  getMinimumCategoryFromFlags,
  enforceMinimumCategory,
  CLINICAL_DISCRIMINATORS,
} from './ats.js';

/**
 * Guardrails result after deterministic processing
 */
export interface GuardrailsResult {
  minimumCategory: ATSCategory | null;
  redFlagsDetected: Array<{
    id: string;
    name: string;
    evidence: string;
    action: string;
    minCategory: ATSCategory;
  }>;
  clinicalAlerts: Array<{
    type: 'vital_sign' | 'age_risk' | 'symptom_combination' | 'time_critical';
    message: string;
    severity: 'critical' | 'warning' | 'info';
  }>;
  categoryAdjustments: Array<{
    reason: string;
    adjustment: 'escalate' | 'maintain';
    fromCategory?: ATSCategory;
    toCategory?: ATSCategory;
  }>;
  auditLog: Array<{
    layer: 'keyword' | 'clinical' | 'llm' | 'safety';
    step: string;
    result: string;
    timestamp: string;
  }>;
  requiresImmediateAttention: boolean;
  escalationRequired: boolean;
}

/**
 * Layer 1: Keyword Detection
 * Fast pattern matching for critical symptoms
 */
function runKeywordDetection(
  rawInput: string,
  age?: number
): Pick<GuardrailsResult, 'redFlagsDetected' | 'minimumCategory'> & { auditLog: GuardrailsResult['auditLog'] } {
  const timestamp = new Date().toISOString();
  const auditLog: GuardrailsResult['auditLog'] = [];

  auditLog.push({
    layer: 'keyword',
    step: 'START',
    result: `Processing input: ${rawInput.substring(0, 100)}...`,
    timestamp,
  });

  const redFlags = checkRedFlags(rawInput, age);
  const minimumCategory = getMinimumCategoryFromFlags(redFlags);

  auditLog.push({
    layer: 'keyword',
    step: 'COMPLETE',
    result: `Detected ${redFlags.length} red flags. Minimum category: ${minimumCategory || 'none'}`,
    timestamp: new Date().toISOString(),
  });

  return { redFlagsDetected: redFlags, minimumCategory, auditLog };
}

/**
 * Layer 2: Clinical Rules
 * Apply evidence-based clinical discriminators
 */
function runClinicalRules(
  presentation: SymptomPresentation,
  currentMinCategory: ATSCategory | null
): Pick<GuardrailsResult, 'clinicalAlerts' | 'categoryAdjustments'> & {
  minimumCategory: ATSCategory | null;
  auditLog: GuardrailsResult['auditLog'];
} {
  const timestamp = new Date().toISOString();
  const auditLog: GuardrailsResult['auditLog'] = [];
  const clinicalAlerts: GuardrailsResult['clinicalAlerts'] = [];
  const categoryAdjustments: GuardrailsResult['categoryAdjustments'] = [];
  let minimumCategory = currentMinCategory;

  auditLog.push({
    layer: 'clinical',
    step: 'START',
    result: 'Applying clinical discriminators',
    timestamp,
  });

  // Check vital signs if available
  if (presentation.vitals) {
    const { vitals } = presentation;
    const thresholds = CLINICAL_DISCRIMINATORS.vitals;

    // Critical hypotension
    if (vitals.systolicBP && vitals.systolicBP < thresholds.criticalHypotension.systolic) {
      clinicalAlerts.push({
        type: 'vital_sign',
        message: `Critical hypotension: Systolic BP ${vitals.systolicBP}mmHg (< ${thresholds.criticalHypotension.systolic})`,
        severity: 'critical',
      });
      minimumCategory = escalateCategory(minimumCategory, 'ATS1');
    } else if (vitals.systolicBP && vitals.systolicBP < thresholds.moderateHypotension.systolic) {
      clinicalAlerts.push({
        type: 'vital_sign',
        message: `Hypotension: Systolic BP ${vitals.systolicBP}mmHg`,
        severity: 'warning',
      });
      minimumCategory = escalateCategory(minimumCategory, 'ATS2');
    }

    // Critical hypoxia
    if (vitals.spo2 && vitals.spo2 < thresholds.criticalHypoxia.spo2) {
      clinicalAlerts.push({
        type: 'vital_sign',
        message: `Critical hypoxia: SpO2 ${vitals.spo2}% (< ${thresholds.criticalHypoxia.spo2}%)`,
        severity: 'critical',
      });
      minimumCategory = escalateCategory(minimumCategory, 'ATS1');
    } else if (vitals.spo2 && vitals.spo2 < thresholds.moderateHypoxia.spo2) {
      clinicalAlerts.push({
        type: 'vital_sign',
        message: `Low oxygen: SpO2 ${vitals.spo2}%`,
        severity: 'warning',
      });
      minimumCategory = escalateCategory(minimumCategory, 'ATS2');
    }

    // Tachycardia/Bradycardia
    if (vitals.heartRate && vitals.heartRate > thresholds.criticalTachycardia.hr) {
      clinicalAlerts.push({
        type: 'vital_sign',
        message: `Critical tachycardia: HR ${vitals.heartRate}bpm`,
        severity: 'critical',
      });
      minimumCategory = escalateCategory(minimumCategory, 'ATS2');
    }

    if (vitals.heartRate && vitals.heartRate < thresholds.criticalBradycardia.hr) {
      clinicalAlerts.push({
        type: 'vital_sign',
        message: `Critical bradycardia: HR ${vitals.heartRate}bpm`,
        severity: 'critical',
      });
      minimumCategory = escalateCategory(minimumCategory, 'ATS2');
    }

    // High fever
    if (vitals.temperature && vitals.temperature >= thresholds.criticalFever.temp) {
      clinicalAlerts.push({
        type: 'vital_sign',
        message: `Critical fever: ${vitals.temperature}°C`,
        severity: 'critical',
      });
      // Higher acuity for children under 3
      const ageAdjusted = presentation.demographics?.age !== undefined && presentation.demographics.age < 3 ? 'ATS2' : 'ATS3';
      minimumCategory = escalateCategory(minimumCategory, ageAdjusted);
    } else if (vitals.temperature && vitals.temperature >= thresholds.highFever.temp) {
      clinicalAlerts.push({
        type: 'vital_sign',
        message: `High fever: ${vitals.temperature}°C`,
        severity: 'warning',
      });
    }
  }

  // Age-specific adjustments
  if (presentation.demographics?.age !== undefined) {
    const age = presentation.demographics.age;

    // Elderly patients (≥65) - lower threshold for escalation
    if (age >= 65) {
      clinicalAlerts.push({
        type: 'age_risk',
        message: 'Patient is 65 or older - consider lower threshold for escalation',
        severity: 'info',
      });
    }

    // Paediatric patients (≤3) - higher vigilance
    if (age <= 3) {
      clinicalAlerts.push({
        type: 'age_risk',
        message: 'Paediatric patient (≤3 years) - elevated risk for rapid deterioration',
        severity: 'warning',
      });
    }

    // Infants (<1 year) with any fever - ATS3 minimum
    if (age < 1 && presentation.vitals?.temperature && presentation.vitals.temperature >= 38.0) {
      clinicalAlerts.push({
        type: 'age_risk',
        message: 'Febrile infant (<1 year) - requires urgent assessment',
        severity: 'critical',
      });
      minimumCategory = escalateCategory(minimumCategory, 'ATS3');
    }
  }

  // Symptom severity assessment
  for (const symptom of presentation.symptoms) {
    if (symptom.severity) {
      const painLevels = CLINICAL_DISCRIMINATORS.pain;

      if (symptom.severity >= painLevels.severe.min) {
        clinicalAlerts.push({
          type: 'symptom_combination',
          message: `Severe pain reported: ${symptom.severity}/10 - ${symptom.description}`,
          severity: 'warning',
        });
        minimumCategory = escalateCategory(minimumCategory, 'ATS3');
      }
    }

    // Sudden onset is often more concerning
    if (symptom.onset === 'sudden') {
      clinicalAlerts.push({
        type: 'time_critical',
        message: `Sudden onset: ${symptom.description}`,
        severity: 'info',
      });
    }
  }

  auditLog.push({
    layer: 'clinical',
    step: 'COMPLETE',
    result: `${clinicalAlerts.length} alerts generated. Minimum category: ${minimumCategory || 'none'}`,
    timestamp: new Date().toISOString(),
  });

  return {
    clinicalAlerts,
    categoryAdjustments,
    minimumCategory,
    auditLog,
  };
}

/**
 * Helper: Escalate to a more urgent category
 */
function escalateCategory(
  current: ATSCategory | null,
  target: ATSCategory
): ATSCategory {
  if (current === null) return target;

  const order: ATSCategory[] = ['ATS1', 'ATS2', 'ATS3', 'ATS4', 'ATS5'];
  const currentIndex = order.indexOf(current);
  const targetIndex = order.indexOf(target);

  return currentIndex <= targetIndex ? current : target;
}

/**
 * Layer 4: Safety Envelope
 * Ensure final category respects all safety constraints
 */
function applySafetyEnvelope(
  llmCategory: ATSCategory,
  guardrailsMinimum: ATSCategory | null,
  redFlagsDetected: GuardrailsResult['redFlagsDetected'],
  clinicalAlerts: GuardrailsResult['clinicalAlerts']
): {
  finalCategory: ATSCategory;
  wasEscalated: boolean;
  escalationReason: string | null;
  auditLog: GuardrailsResult['auditLog'];
} {
  const timestamp = new Date().toISOString();
  const auditLog: GuardrailsResult['auditLog'] = [];

  auditLog.push({
    layer: 'safety',
    step: 'START',
    result: `LLM recommended: ${llmCategory}, Guardrails minimum: ${guardrailsMinimum || 'none'}`,
    timestamp,
  });

  const finalCategory = enforceMinimumCategory(llmCategory, guardrailsMinimum);
  const wasEscalated = finalCategory !== llmCategory;

  let escalationReason: string | null = null;
  if (wasEscalated) {
    if (redFlagsDetected.length > 0) {
      escalationReason = `Red flags detected: ${redFlagsDetected.map(f => f.name).join(', ')}`;
    } else if (clinicalAlerts.some(a => a.severity === 'critical')) {
      escalationReason = `Critical clinical alerts: ${clinicalAlerts.filter(a => a.severity === 'critical').map(a => a.message).join('; ')}`;
    }
  }

  auditLog.push({
    layer: 'safety',
    step: 'COMPLETE',
    result: wasEscalated
      ? `ESCALATED from ${llmCategory} to ${finalCategory}. Reason: ${escalationReason}`
      : `Confirmed LLM recommendation: ${finalCategory}`,
    timestamp: new Date().toISOString(),
  });

  return { finalCategory, wasEscalated, escalationReason, auditLog };
}

/**
 * Main Guardrails Engine
 * Runs all deterministic safety checks before LLM processing
 */
export class GuardrailsEngine {
  /**
   * Pre-LLM processing: Run deterministic safety checks
   * Returns the minimum acceptable category and any alerts
   */
  preProcess(rawInput: string, presentation: SymptomPresentation): GuardrailsResult {
    // Layer 1: Keyword detection
    const keywordResult = runKeywordDetection(rawInput, presentation.demographics?.age);

    // Layer 2: Clinical rules
    const clinicalResult = runClinicalRules(presentation, keywordResult.minimumCategory);

    // Combine results
    const requiresImmediateAttention =
      clinicalResult.minimumCategory === 'ATS1' ||
      keywordResult.redFlagsDetected.some(f => f.minCategory === 'ATS1');

    const escalationRequired =
      clinicalResult.minimumCategory === 'ATS1' ||
      clinicalResult.minimumCategory === 'ATS2' ||
      clinicalResult.clinicalAlerts.some(a => a.severity === 'critical');

    return {
      minimumCategory: clinicalResult.minimumCategory,
      redFlagsDetected: keywordResult.redFlagsDetected,
      clinicalAlerts: clinicalResult.clinicalAlerts,
      categoryAdjustments: clinicalResult.categoryAdjustments,
      auditLog: [...keywordResult.auditLog, ...clinicalResult.auditLog],
      requiresImmediateAttention,
      escalationRequired,
    };
  }

  /**
   * Post-LLM processing: Enforce safety envelope
   * Ensures the final category respects all safety constraints
   */
  postProcess(
    llmCategory: ATSCategory,
    guardrailsResult: GuardrailsResult
  ): {
    finalCategory: ATSCategory;
    wasEscalated: boolean;
    escalationReason: string | null;
    auditLog: GuardrailsResult['auditLog'];
  } {
    return applySafetyEnvelope(
      llmCategory,
      guardrailsResult.minimumCategory,
      guardrailsResult.redFlagsDetected,
      guardrailsResult.clinicalAlerts
    );
  }

  /**
   * Generate a safety-focused prompt preamble for the LLM
   * Includes context from guardrails analysis
   */
  generateLLMContext(guardrailsResult: GuardrailsResult): string {
    const parts: string[] = [];

    if (guardrailsResult.redFlagsDetected.length > 0) {
      parts.push('⚠️ RED FLAGS DETECTED:');
      for (const flag of guardrailsResult.redFlagsDetected) {
        parts.push(`- ${flag.name}: "${flag.evidence}" → ${flag.action}`);
      }
      parts.push(`\nMINIMUM CATEGORY: ${guardrailsResult.minimumCategory} (from safety rules)`);
    }

    if (guardrailsResult.clinicalAlerts.length > 0) {
      parts.push('\n📋 CLINICAL ALERTS:');
      for (const alert of guardrailsResult.clinicalAlerts) {
        const icon = alert.severity === 'critical' ? '🔴' : alert.severity === 'warning' ? '🟡' : 'ℹ️';
        parts.push(`${icon} ${alert.message}`);
      }
    }

    if (guardrailsResult.requiresImmediateAttention) {
      parts.push('\n🚨 THIS PATIENT REQUIRES IMMEDIATE ATTENTION');
    }

    return parts.join('\n');
  }
}

export const guardrailsEngine = new GuardrailsEngine();
