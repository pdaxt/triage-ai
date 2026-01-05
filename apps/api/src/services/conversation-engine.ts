import { conversationStore } from '../store/conversation-store.js';
import { ConversationResponse, Conversation, CollectedData } from '../types.js';
import { OllamaClient } from './ollama-client.js';

// Triage result types (matching the engine schema)
interface TriageSession {
  id: string;
  timestamp: string;
  result: {
    severity: number;
    urgency: 'EMERGENCY' | 'URGENT' | 'SEMI_URGENT' | 'STANDARD' | 'NON_URGENT';
    confidence: number;
    redFlags: {
      detected: boolean;
      flags: Array<{ condition: string; evidence: string; action: string }>;
    };
    specialtyMatch: string[];
    reasoning: string;
    recommendations: string[];
  };
  doctorSummary: {
    headline: string;
    keySymptoms: string[];
    severity: number;
    urgency: string;
    redFlags: string[];
    relevantHistory: string[];
    suggestedQuestions: string[];
    differentialDiagnosis: string[];
    triageReasoning: string;
  };
}

const CONVERSATION_SYSTEM_PROMPT = `You are TriageAI, a friendly and professional medical triage assistant. Your role is to gather information about a patient's symptoms through natural conversation.

IMPORTANT GUIDELINES:
1. Be warm, empathetic, and professional
2. Ask ONE question at a time - don't overwhelm the patient
3. Use simple, non-medical language when speaking to patients
4. Never diagnose or provide medical advice
5. If symptoms sound serious (chest pain, difficulty breathing, stroke signs), acknowledge urgency

CONVERSATION FLOW:
1. First, understand their main concern/symptoms
2. Ask about duration (how long they've had symptoms)
3. Ask about severity (scale 1-10 or descriptive)
4. Ask about relevant context (what makes it better/worse)
5. If appropriate, ask about age and relevant medical history

After gathering enough information (usually 3-5 exchanges), indicate you're ready to assess.

RESPONSE FORMAT:
Always respond with JSON:
{
  "message": "Your response to the patient",
  "extractedData": {
    "symptoms": ["list of symptoms mentioned"],
    "duration": "duration if mentioned",
    "severity": number if mentioned (1-10),
    "location": "body location if mentioned",
    "age": number if mentioned,
    "additionalContext": "any other relevant info"
  },
  "readyToTriage": true/false,
  "reasoning": "brief internal note about conversation state"
}

Set readyToTriage to true when you have enough information:
- Main symptoms are clear
- Duration is known
- Severity is understood
- At least 3-4 exchanges have occurred

For RED FLAG symptoms (chest pain, breathing difficulty, stroke signs, severe bleeding, suicidal thoughts), set readyToTriage to true immediately and express appropriate urgency in your message.`;

const GREETING_MESSAGE = "Hi, I'm TriageAI, your virtual health assistant. I'm here to help understand your symptoms and guide you to the right care. What's bringing you in today?";

export class ConversationEngine {
  private client: OllamaClient;

  constructor() {
    this.client = new OllamaClient();
  }

  async startConversation(patientId?: string): Promise<ConversationResponse> {
    const conversation = conversationStore.create(patientId);

    // Add greeting message
    conversationStore.addMessage(conversation.id, 'assistant', GREETING_MESSAGE);
    conversationStore.updateStage(conversation.id, 'collecting');

    return {
      conversationId: conversation.id,
      message: GREETING_MESSAGE,
      stage: 'collecting',
      isComplete: false,
    };
  }

  async processMessage(conversationId: string, userMessage: string): Promise<ConversationResponse> {
    const conversation = conversationStore.get(conversationId);
    if (!conversation) {
      throw new Error('Conversation not found');
    }

    if (conversation.stage === 'complete') {
      return {
        conversationId,
        message: "This assessment has already been completed. Please start a new conversation for a new assessment.",
        stage: 'complete',
        isComplete: true,
        triageResult: conversation.triageResult,
      };
    }

    // Add user message
    conversationStore.addMessage(conversationId, 'user', userMessage);

    // CRITICAL: Check for red flags BEFORE LLM call (deterministic safety)
    const redFlags = this.checkRedFlagKeywords(userMessage);
    if (redFlags.length > 0) {
      // Force immediate triage for red flag conditions
      conversationStore.updateStage(conversationId, 'triaging');

      const urgentMessage = `I understand you're experiencing ${redFlags.join(' and ').toLowerCase()}. This is a serious symptom that requires immediate medical attention. Please call emergency services (000) or go to your nearest emergency department immediately.`;
      conversationStore.addMessage(conversationId, 'assistant', urgentMessage);

      // Build emergency triage result
      const emergencyResult = {
        id: conversationId,
        timestamp: new Date().toISOString(),
        result: {
          severity: 5,
          urgency: 'EMERGENCY' as const,
          confidence: 0.95,
          redFlags: {
            detected: true,
            flags: redFlags.map(flag => ({
              condition: flag,
              evidence: userMessage,
              action: 'CALL EMERGENCY SERVICES (000) IMMEDIATELY',
            })),
          },
          specialtyMatch: ['Emergency Medicine'],
          reasoning: `Red flag conditions detected: ${redFlags.join(', ')}. Immediate medical attention required.`,
          recommendations: [
            'Call emergency services (000) immediately',
            'Do not drive yourself to the hospital',
            'Stay calm and remain still',
          ],
        },
        doctorSummary: {
          headline: `URGENT: ${redFlags[0]} - Requires immediate attention`,
          keySymptoms: redFlags,
          severity: 5,
          urgency: 'EMERGENCY',
          redFlags: redFlags,
          relevantHistory: [],
          suggestedQuestions: ['What is the patient\'s medical history?', 'Any current medications?'],
          differentialDiagnosis: redFlags,
          triageReasoning: `Red flag symptoms detected requiring immediate emergency care.`,
        },
      };

      conversationStore.setTriageResult(conversationId, emergencyResult);

      return {
        conversationId,
        message: urgentMessage,
        stage: 'complete',
        isComplete: true,
        triageResult: emergencyResult,
      };
    }

    // Build conversation history for Ollama
    const messages = this.buildMessageHistory(conversation, userMessage);

    // Get AI response from Ollama
    const responseText = await this.client.chat([
      { role: 'system', content: CONVERSATION_SYSTEM_PROMPT },
      ...messages,
    ]);

    // Parse AI response
    let parsed: {
      message: string;
      extractedData?: Partial<CollectedData>;
      readyToTriage: boolean;
      reasoning?: string;
    };

    try {
      // Handle potential markdown code blocks
      let jsonStr = responseText;
      const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1];
      }
      // Try to extract JSON object from response
      const objectMatch = jsonStr.match(/\{[\s\S]*\}/);
      if (objectMatch) {
        jsonStr = objectMatch[0];
      }
      parsed = JSON.parse(jsonStr);

      // Ensure message exists and is a string
      if (!parsed.message || typeof parsed.message !== 'string') {
        throw new Error('Invalid message in response');
      }
    } catch {
      // If JSON parsing fails, clean up the response and use it as message
      // Remove any JSON-like content from the response
      let cleanMessage = responseText;

      // If it looks like raw JSON was returned, try to extract the message field
      const messageMatch = responseText.match(/"message"\s*:\s*"([^"]+)"/);
      if (messageMatch) {
        cleanMessage = messageMatch[1];
      } else {
        // Remove JSON artifacts
        cleanMessage = cleanMessage
          .replace(/\{[\s\S]*\}/g, '')  // Remove JSON objects
          .replace(/```[\s\S]*?```/g, '') // Remove code blocks
          .trim();

        // If nothing left, use a fallback
        if (!cleanMessage) {
          cleanMessage = "I understand. Can you tell me more about your symptoms?";
        }
      }

      parsed = {
        message: cleanMessage,
        readyToTriage: false,
      };
    }

    // Update collected data
    if (parsed.extractedData) {
      const currentData = conversation.collectedData;
      conversationStore.updateCollectedData(conversationId, {
        symptoms: [...new Set([...currentData.symptoms, ...(parsed.extractedData.symptoms || [])])],
        duration: parsed.extractedData.duration || currentData.duration,
        severity: parsed.extractedData.severity || currentData.severity,
        location: parsed.extractedData.location || currentData.location,
        age: parsed.extractedData.age || currentData.age,
        additionalContext: parsed.extractedData.additionalContext
          ? `${currentData.additionalContext || ''} ${parsed.extractedData.additionalContext}`.trim()
          : currentData.additionalContext,
      });
    }

    // Add assistant message
    conversationStore.addMessage(conversationId, 'assistant', parsed.message);

    // Check if ready to triage
    if (parsed.readyToTriage) {
      conversationStore.updateStage(conversationId, 'triaging');

      // Perform triage
      const triageResult = await this.performTriage(conversationId);

      return {
        conversationId,
        message: parsed.message,
        stage: 'complete',
        isComplete: true,
        triageResult,
      };
    }

    // Update stage based on conversation progress
    const updatedConversation = conversationStore.get(conversationId)!;
    const messageCount = updatedConversation.messages.filter(m => m.role === 'user').length;

    if (messageCount >= 2) {
      conversationStore.updateStage(conversationId, 'clarifying');
    }

    return {
      conversationId,
      message: parsed.message,
      stage: updatedConversation.stage,
      isComplete: false,
    };
  }

  private buildMessageHistory(conversation: Conversation, latestMessage: string): Array<{ role: 'user' | 'assistant'; content: string }> {
    const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [];

    // Add previous messages (excluding the greeting which is implicit)
    for (const msg of conversation.messages) {
      if (msg.role === 'assistant' && messages.length === 0) continue; // Skip greeting
      messages.push({
        role: msg.role,
        content: msg.content,
      });
    }

    // Add context about what we've collected so far
    const contextNote = this.buildContextNote(conversation);

    // Ensure the latest user message is included
    if (messages.length === 0 || messages[messages.length - 1].role !== 'user') {
      messages.push({
        role: 'user',
        content: `${latestMessage}\n\n[Context: ${contextNote}]`,
      });
    }

    return messages;
  }

  private buildContextNote(conversation: Conversation): string {
    const data = conversation.collectedData;
    const parts: string[] = [];

    if (data.symptoms.length > 0) {
      parts.push(`Symptoms mentioned: ${data.symptoms.join(', ')}`);
    }
    if (data.duration) {
      parts.push(`Duration: ${data.duration}`);
    }
    if (data.severity) {
      parts.push(`Severity: ${data.severity}/10`);
    }
    if (data.age) {
      parts.push(`Age: ${data.age}`);
    }

    const messageCount = conversation.messages.filter(m => m.role === 'user').length;
    parts.push(`Exchange count: ${messageCount}`);

    return parts.join('. ') || 'No data collected yet';
  }

  private async performTriage(conversationId: string): Promise<TriageSession> {
    const conversation = conversationStore.get(conversationId)!;
    const data = conversation.collectedData;

    // Build raw input from conversation
    const userMessages = conversation.messages
      .filter(m => m.role === 'user')
      .map(m => m.content)
      .join(' ');

    // Add collected data context
    const contextParts: string[] = [userMessages];
    if (data.duration) contextParts.push(`Duration: ${data.duration}`);
    if (data.severity) contextParts.push(`Severity: ${data.severity}/10`);
    if (data.location) contextParts.push(`Location: ${data.location}`);
    if (data.age) contextParts.push(`Age: ${data.age}`);

    const rawInput = contextParts.join('. ');

    // Call Ollama for triage
    const triagePrompt = `You are a medical triage AI. Analyze the following patient symptoms and provide a triage assessment.

PATIENT INFORMATION:
${rawInput}

RED FLAG CONDITIONS (require immediate escalation):
1. Chest pain with radiation to arm/jaw/back
2. Difficulty breathing / shortness of breath
3. Sudden severe headache ("worst headache of my life")
4. Signs of stroke (Face drooping, Arm weakness, Speech difficulty)
5. Severe allergic reaction
6. Suicidal ideation
7. Heavy bleeding
8. Confusion or altered mental status

URGENCY LEVELS:
- EMERGENCY: Immediate attention required (ambulance/ER)
- URGENT: Within 1 hour
- SEMI_URGENT: Within 4 hours
- STANDARD: Same day
- NON_URGENT: Can be scheduled

Respond with ONLY valid JSON in this exact format:
{
  "severity": <number 1-5>,
  "urgency": "<EMERGENCY|URGENT|SEMI_URGENT|STANDARD|NON_URGENT>",
  "confidence": <number 0-1>,
  "redFlags": {
    "detected": <boolean>,
    "flags": [{"condition": "<name>", "evidence": "<from patient>", "action": "<recommendation>"}]
  },
  "specialtyMatch": ["<specialty1>", "<specialty2>"],
  "reasoning": "<brief clinical reasoning>",
  "recommendations": ["<recommendation1>", "<recommendation2>"],
  "doctorSummary": {
    "headline": "<one line summary for doctor>",
    "keySymptoms": ["<symptom1>", "<symptom2>"],
    "suggestedQuestions": ["<question1>", "<question2>"],
    "differentialDiagnosis": ["<diagnosis1>", "<diagnosis2>"]
  }
}`;

    const responseText = await this.client.chat([
      { role: 'user', content: triagePrompt }
    ], { temperature: 0.3 });

    // Parse response
    let triageData;
    try {
      let jsonStr = responseText;
      const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1];
      }
      // Try to extract JSON object from response
      const objectMatch = jsonStr.match(/\{[\s\S]*\}/);
      if (objectMatch) {
        jsonStr = objectMatch[0];
      }
      triageData = JSON.parse(jsonStr);
    } catch {
      // Fallback if parsing fails
      triageData = {
        severity: 3,
        urgency: 'STANDARD',
        confidence: 0.6,
        redFlags: { detected: false, flags: [] },
        specialtyMatch: ['General Practice'],
        reasoning: 'Unable to parse detailed assessment. Please consult a healthcare provider.',
        recommendations: ['Schedule an appointment with your doctor'],
        doctorSummary: {
          headline: 'Patient requires evaluation',
          keySymptoms: data.symptoms,
          suggestedQuestions: ['Can you describe your symptoms in more detail?'],
          differentialDiagnosis: ['Requires clinical evaluation']
        }
      };
    }

    // Build full session
    const session: TriageSession = {
      id: conversationId,
      timestamp: new Date().toISOString(),
      result: {
        severity: triageData.severity || 3,
        urgency: triageData.urgency || 'STANDARD',
        confidence: triageData.confidence || 0.7,
        redFlags: triageData.redFlags || { detected: false, flags: [] },
        specialtyMatch: triageData.specialtyMatch || ['General Practice'],
        reasoning: triageData.reasoning || '',
        recommendations: triageData.recommendations || [],
      },
      doctorSummary: {
        headline: triageData.doctorSummary?.headline || 'Patient assessment complete',
        keySymptoms: triageData.doctorSummary?.keySymptoms || data.symptoms,
        severity: triageData.severity || 3,
        urgency: triageData.urgency || 'STANDARD',
        redFlags: triageData.redFlags?.flags?.map((f: { condition: string }) => f.condition) || [],
        relevantHistory: data.medicalHistory || [],
        suggestedQuestions: triageData.doctorSummary?.suggestedQuestions || [],
        differentialDiagnosis: triageData.doctorSummary?.differentialDiagnosis || [],
        triageReasoning: triageData.reasoning || '',
      }
    };

    // Apply red flag keyword safety net
    const additionalFlags = this.checkRedFlagKeywords(rawInput);
    if (additionalFlags.length > 0 && !session.result.redFlags.detected) {
      session.result.redFlags = {
        detected: true,
        flags: additionalFlags.map(flag => ({
          condition: flag,
          evidence: 'Keyword detection',
          action: 'Escalate to URGENT or higher',
        })),
      };
      session.result.urgency = 'URGENT';
      if (session.result.severity < 4) {
        session.result.severity = 4;
      }
    }

    // Store result
    conversationStore.setTriageResult(conversationId, session);

    return session;
  }

  private checkRedFlagKeywords(text: string): string[] {
    const lowerText = text.toLowerCase();
    const flags: string[] = [];

    const keywordPatterns = [
      { pattern: /chest pain|chest tightness|chest pressure|crushing.*chest|radiating.*arm/, flag: 'Chest pain' },
      { pattern: /can't breathe|cannot breathe|hard to breathe|shortness of breath|gasping|difficulty breathing/, flag: 'Difficulty breathing' },
      { pattern: /worst headache|thunderclap headache|sudden severe headache/, flag: 'Sudden severe headache' },
      { pattern: /passed out|fainted|lost consciousness|blacked out/, flag: 'Loss of consciousness' },
      { pattern: /face droop|face.*droop|arm weak|arm.*weak|slurred speech|can't speak|one side|stroke/, flag: 'Possible stroke symptoms' },
      { pattern: /can't swallow|throat closing|swelling.*throat/, flag: 'Possible anaphylaxis' },
      { pattern: /want to die|kill myself|suicide|self.?harm|ending my life|end my life/, flag: 'Suicidal ideation' },
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

  getConversation(conversationId: string): Conversation | undefined {
    return conversationStore.get(conversationId);
  }
}

export const conversationEngine = new ConversationEngine();
