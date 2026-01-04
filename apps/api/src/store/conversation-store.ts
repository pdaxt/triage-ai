import { Conversation, CollectedData, Message, ConversationStage } from '../types.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * In-memory conversation store
 * For production: Replace with Redis or PostgreSQL
 */
class ConversationStore {
  private conversations: Map<string, Conversation> = new Map();

  create(patientId?: string): Conversation {
    const id = uuidv4();
    const now = new Date().toISOString();

    const conversation: Conversation = {
      id,
      stage: 'greeting',
      messages: [],
      collectedData: {
        symptoms: [],
      },
      createdAt: now,
      updatedAt: now,
    };

    this.conversations.set(id, conversation);
    return conversation;
  }

  get(id: string): Conversation | undefined {
    return this.conversations.get(id);
  }

  addMessage(id: string, role: 'assistant' | 'user', content: string): void {
    const conversation = this.conversations.get(id);
    if (!conversation) throw new Error(`Conversation ${id} not found`);

    conversation.messages.push({
      role,
      content,
      timestamp: new Date().toISOString(),
    });
    conversation.updatedAt = new Date().toISOString();
  }

  updateStage(id: string, stage: ConversationStage): void {
    const conversation = this.conversations.get(id);
    if (!conversation) throw new Error(`Conversation ${id} not found`);

    conversation.stage = stage;
    conversation.updatedAt = new Date().toISOString();
  }

  updateCollectedData(id: string, data: Partial<CollectedData>): void {
    const conversation = this.conversations.get(id);
    if (!conversation) throw new Error(`Conversation ${id} not found`);

    conversation.collectedData = {
      ...conversation.collectedData,
      ...data,
    };
    conversation.updatedAt = new Date().toISOString();
  }

  setTriageResult(id: string, result: unknown): void {
    const conversation = this.conversations.get(id);
    if (!conversation) throw new Error(`Conversation ${id} not found`);

    conversation.triageResult = result;
    conversation.stage = 'complete';
    conversation.updatedAt = new Date().toISOString();
  }

  // Cleanup old conversations (call periodically)
  cleanup(maxAgeMs: number = 3600000): void {
    const now = Date.now();
    for (const [id, conv] of this.conversations) {
      if (now - new Date(conv.updatedAt).getTime() > maxAgeMs) {
        this.conversations.delete(id);
      }
    }
  }
}

export const conversationStore = new ConversationStore();
