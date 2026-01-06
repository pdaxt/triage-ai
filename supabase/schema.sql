-- Triage AI Conversation Tracking
-- Run this in your Supabase SQL editor

-- Conversations table
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stage TEXT NOT NULL DEFAULT 'greeting',
  collected_data JSONB DEFAULT '{"symptoms": []}',
  triage_result JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversations_created ON conversations(created_at DESC);

-- RLS policies (allow all for demo - tighten for production)
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Allow anonymous access for demo
CREATE POLICY "Allow all conversations" ON conversations FOR ALL USING (true);
CREATE POLICY "Allow all messages" ON messages FOR ALL USING (true);

-- View for analytics
CREATE OR REPLACE VIEW conversation_analytics AS
SELECT
  DATE(created_at) as date,
  COUNT(*) as total_conversations,
  COUNT(CASE WHEN triage_result IS NOT NULL THEN 1 END) as completed_triages,
  COUNT(CASE WHEN triage_result->>'category' = 'ATS1' THEN 1 END) as ats1_count,
  COUNT(CASE WHEN triage_result->>'category' = 'ATS2' THEN 1 END) as ats2_count,
  COUNT(CASE WHEN triage_result->>'category' = 'ATS3' THEN 1 END) as ats3_count,
  COUNT(CASE WHEN triage_result->>'category' = 'ATS4' THEN 1 END) as ats4_count,
  COUNT(CASE WHEN triage_result->>'category' = 'ATS5' THEN 1 END) as ats5_count
FROM conversations
GROUP BY DATE(created_at)
ORDER BY date DESC;
