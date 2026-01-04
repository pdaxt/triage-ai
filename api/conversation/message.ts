import type { VercelRequest, VercelResponse } from '@vercel/node';
import Anthropic from '@anthropic-ai/sdk';

// Shared conversation store (will reset between cold starts)
const conversations = new Map<string, any>();

const SYSTEM_PROMPT = `You are TriageAI, a medical triage assistant using the Australian Triage Scale (ATS).

CONVERSATION FLOW:
1. Gather symptoms naturally (ask ONE question at a time)
2. Understand duration, severity, location
3. After 3-4 exchanges OR if red flags detected, provide triage

RED FLAGS (require IMMEDIATE triage):
- Chest pain radiating to arm/jaw
- Difficulty breathing / gasping
- Stroke signs (face droop, arm weakness, slurred speech)
- Severe allergic reaction
- Suicidal ideation
- Heavy bleeding
- Altered mental status

AUSTRALIAN TRIAGE SCALE:
- ATS1 (RESUSCITATION): Immediate - life threatening
- ATS2 (EMERGENCY): 10 min - imminent threat to life
- ATS3 (URGENT): 30 min - potential threat
- ATS4 (SEMI-URGENT): 60 min - potentially serious
- ATS5 (NON-URGENT): 120 min - less urgent

RESPONSE FORMAT (JSON only):
{
  "message": "Your response to patient",
  "extractedData": {
    "symptoms": ["symptom1"],
    "duration": "if mentioned",
    "severity": 1-10 if mentioned,
    "age": if mentioned
  },
  "readyToTriage": false,
  "triageResult": null
}

When readyToTriage is true, include triageResult:
{
  "readyToTriage": true,
  "triageResult": {
    "category": "ATS1-5",
    "categoryName": "RESUSCITATION/EMERGENCY/URGENT/SEMI-URGENT/NON-URGENT",
    "maxWaitTime": "Immediate/10 min/30 min/60 min/120 min",
    "severity": 1-5,
    "urgency": "EMERGENCY/URGENT/SEMI_URGENT/STANDARD/NON_URGENT",
    "confidence": 0.0-1.0,
    "redFlags": { "detected": true/false, "flags": [{"condition": "", "evidence": "", "action": ""}] },
    "reasoning": "clinical reasoning",
    "recommendations": ["recommendation1"],
    "doctorSummary": {
      "headline": "one line for doctor",
      "keySymptoms": ["symptom1"],
      "differentialDiagnosis": ["diagnosis1"]
    }
  }
}`;

// Red flag keyword detection (<1ms deterministic safety)
function checkRedFlags(text: string): Array<{ condition: string; evidence: string; action: string }> {
  const lowerText = text.toLowerCase();
  const flags: Array<{ condition: string; evidence: string; action: string }> = [];

  const patterns = [
    {
      pattern: /chest pain|chest tightness|crushing.*chest|radiating.*arm/,
      condition: 'Cardiac-type chest pain',
      action: 'CALL EMERGENCY SERVICES IMMEDIATELY'
    },
    {
      pattern: /can't breathe|difficulty breathing|gasping|shortness of breath/,
      condition: 'Severe respiratory distress',
      action: 'CALL EMERGENCY SERVICES IMMEDIATELY'
    },
    {
      pattern: /face droop|arm weak|slurred speech|stroke/,
      condition: 'Possible stroke (FAST signs)',
      action: 'CALL EMERGENCY SERVICES - Time critical'
    },
    {
      pattern: /suicide|kill myself|want to die|end my life/,
      condition: 'Suicidal ideation',
      action: 'IMMEDIATE mental health crisis intervention'
    },
    {
      pattern: /heavy bleeding|blood everywhere|won't stop bleeding/,
      condition: 'Severe hemorrhage',
      action: 'CALL EMERGENCY SERVICES'
    },
    {
      pattern: /throat closing|can't swallow|anaphylax/,
      condition: 'Possible anaphylaxis',
      action: 'CALL EMERGENCY SERVICES - Use EpiPen if available'
    },
  ];

  for (const { pattern, condition, action } of patterns) {
    if (pattern.test(lowerText)) {
      const match = lowerText.match(pattern);
      flags.push({
        condition,
        evidence: match ? match[0] : 'keyword detected',
        action,
      });
    }
  }

  return flags;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { conversationId, message } = req.body;

  if (!conversationId || !message) {
    return res.status(400).json({ error: 'conversationId and message required' });
  }

  // Check for red flags first (deterministic, <1ms)
  const redFlags = checkRedFlags(message);
  const hasRedFlags = redFlags.length > 0;

  try {
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    // Build conversation context
    const conversation = conversations.get(conversationId) || {
      messages: [],
      collectedData: { symptoms: [] },
    };

    // Add user message to history
    conversation.messages.push({ role: 'user', content: message });

    // If red flags detected, add context for immediate triage
    const userMessageWithContext = hasRedFlags
      ? `${message}\n\n[SYSTEM: RED FLAGS DETECTED - ${redFlags.map(f => f.condition).join(', ')}. Provide immediate ATS1/ATS2 triage.]`
      : message;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: conversation.messages.map((m: any) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    });

    const responseText = response.content[0].type === 'text' ? response.content[0].text : '';

    // Parse JSON response
    let parsed;
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { message: responseText, readyToTriage: false };
    } catch {
      parsed = { message: responseText.replace(/```json|```/g, '').trim(), readyToTriage: false };
    }

    // Apply safety envelope - if we detected red flags, ensure high severity
    if (hasRedFlags && parsed.triageResult) {
      parsed.triageResult.redFlags = { detected: true, flags: redFlags };
      if (parsed.triageResult.severity < 4) {
        parsed.triageResult.severity = 5;
        parsed.triageResult.category = 'ATS2';
        parsed.triageResult.categoryName = 'EMERGENCY';
        parsed.triageResult.urgency = 'EMERGENCY';
      }
    }

    // Force triage if red flags and LLM didn't trigger it
    if (hasRedFlags && !parsed.readyToTriage) {
      parsed.readyToTriage = true;
      parsed.triageResult = {
        category: 'ATS2',
        categoryName: 'EMERGENCY',
        maxWaitTime: '10 minutes',
        severity: 5,
        urgency: 'EMERGENCY',
        confidence: 0.95,
        redFlags: { detected: true, flags: redFlags },
        reasoning: `Red flag conditions detected: ${redFlags.map(f => f.condition).join(', ')}. Immediate medical attention required.`,
        recommendations: redFlags.map(f => f.action),
        doctorSummary: {
          headline: `URGENT: ${redFlags[0].condition} detected`,
          keySymptoms: redFlags.map(f => f.condition),
          differentialDiagnosis: redFlags.map(f => f.condition),
        },
      };
    }

    // Store conversation
    conversation.messages.push({ role: 'assistant', content: parsed.message });
    conversations.set(conversationId, conversation);

    return res.json({
      conversationId,
      message: parsed.message,
      stage: parsed.readyToTriage ? 'complete' : 'collecting',
      isComplete: parsed.readyToTriage,
      triageResult: parsed.triageResult ? {
        id: conversationId,
        timestamp: new Date().toISOString(),
        result: {
          severity: parsed.triageResult.severity,
          urgency: parsed.triageResult.urgency,
          confidence: parsed.triageResult.confidence,
          redFlags: parsed.triageResult.redFlags,
          specialtyMatch: ['Emergency Medicine'],
          reasoning: parsed.triageResult.reasoning,
          recommendations: parsed.triageResult.recommendations,
        },
        doctorSummary: {
          ...parsed.triageResult.doctorSummary,
          severity: parsed.triageResult.severity,
          urgency: parsed.triageResult.urgency,
          redFlags: parsed.triageResult.redFlags?.flags?.map((f: any) => f.condition) || [],
          relevantHistory: [],
          suggestedQuestions: ['What is the patient\'s medical history?'],
          triageReasoning: parsed.triageResult.reasoning,
        },
      } : undefined,
    });
  } catch (error: any) {
    console.error('API Error:', error);
    return res.status(500).json({
      error: 'Failed to process message',
      details: error.message,
    });
  }
}
