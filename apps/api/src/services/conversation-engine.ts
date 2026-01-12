import { conversationStore } from '../store/conversation-store.js';
import { ConversationResponse, Conversation } from '../types.js';
import { llmClient } from './llm-client.js';

/**
 * ConversationEngine - Core triage conversation handler
 *
 * Implements 4-layer safety architecture:
 * - Layer 1: Deterministic keyword detection (<1ms)
 * - Layer 2: Clinical rules engine
 * - Layer 3: LLM reasoning with RAG
 * - Layer 4: Safety envelope (prevents under-triage)
 *
 * Full implementation available under commercial license.
 * Contact: pranjal@dataxlr8.ai
 */

const GREETING_MESSAGE = "Hi, I'm TriageAI, your virtual health assistant. I'm here to help understand your symptoms and guide you to the right care. What's bringing you in today?";

export class ConversationEngine {
  constructor() {
    // LLM client auto-detects provider (Ollama local, Gemini cloud, or Groq)
    console.log(`[ConversationEngine] Using LLM provider: ${llmClient.getProvider()}`);
  }

  async startConversation(patientId?: string): Promise<ConversationResponse> {
    const conversation = await conversationStore.create(patientId);
    await conversationStore.addMessage(conversation.id, 'assistant', GREETING_MESSAGE);
    await conversationStore.updateStage(conversation.id, 'collecting');

    return {
      conversationId: conversation.id,
      message: GREETING_MESSAGE,
      stage: 'collecting',
      isComplete: false,
    };
  }

  async processMessage(conversationId: string, userMessage: string): Promise<ConversationResponse> {
    const conversation = await conversationStore.get(conversationId);
    if (!conversation) {
      throw new Error('Conversation not found');
    }

    if (conversation.stage === 'complete') {
      return {
        conversationId,
        message: "This assessment has already been completed. Please start a new conversation.",
        stage: 'complete',
        isComplete: true,
        triageResult: conversation.triageResult,
      };
    }

    await conversationStore.addMessage(conversationId, 'user', userMessage);

    // LAYER 1: Deterministic red flag detection
    // Implementation details proprietary - detects 50+ critical conditions in <1ms
    const redFlags = this.checkRedFlagKeywords(userMessage);
    if (redFlags.length > 0) {
      return this.handleEmergencyTriage(conversationId, userMessage, redFlags);
    }

    // LAYER 2-4: Clinical reasoning with safety envelope
    // Full implementation handles RAG retrieval, LLM reasoning, and safety checks
    return this.continueConversation(conversationId, userMessage, conversation);
  }

  /**
   * Red flag keyword detection - Layer 1
   * Detects critical conditions requiring immediate escalation
   *
   * Categories covered:
   * - Cardiovascular emergencies
   * - Respiratory distress
   * - Neurological emergencies
   * - Anaphylaxis
   * - Mental health crises
   * - Trauma & bleeding
   * - Toxicology
   *
   * Full pattern library proprietary.
   */
  private checkRedFlagKeywords(text: string): string[] {
    // Simplified demo - full implementation has 50+ patterns
    const lowerText = text.toLowerCase();
    const flags: string[] = [];

    if (/chest pain|crushing.*chest/.test(lowerText)) flags.push('Chest pain');
    if (/can't breathe|difficulty breathing/.test(lowerText)) flags.push('Difficulty breathing');
    if (/worst headache/.test(lowerText)) flags.push('Sudden severe headache');
    if (/suicide|kill myself/.test(lowerText)) flags.push('Suicidal ideation');

    return flags;
  }

  private async handleEmergencyTriage(
    conversationId: string,
    userMessage: string,
    redFlags: string[]
  ): Promise<ConversationResponse> {
    // Emergency triage logic - escalates to ATS 1-2
    // Full implementation includes differential diagnosis and doctor summaries
    throw new Error('Full implementation required - contact pranjal@dataxlr8.ai');
  }

  private async continueConversation(
    conversationId: string,
    userMessage: string,
    conversation: Conversation
  ): Promise<ConversationResponse> {
    // Conversation continuation with clinical context
    // Implements OPQRST assessment framework
    throw new Error('Full implementation required - contact pranjal@dataxlr8.ai');
  }

  async getConversation(conversationId: string): Promise<Conversation | undefined> {
    return conversationStore.get(conversationId);
  }
}

export const conversationEngine = new ConversationEngine();
