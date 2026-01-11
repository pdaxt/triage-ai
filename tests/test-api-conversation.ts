/**
 * Test the conversation flow for ATS 4-5 cases
 * to debug repeated questions issue
 */

const API_BASE = 'http://localhost:3001/api';

async function startConversation(): Promise<{ conversationId: string; message: string }> {
  const response = await fetch(`${API_BASE}/conversation/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({})
  });
  return response.json();
}

async function sendMessage(conversationId: string, message: string): Promise<any> {
  const response = await fetch(`${API_BASE}/conversation/message`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ conversationId, message })
  });
  return response.json();
}

async function testConversation() {
  console.log('🧪 Testing ATS 4-5 conversation flow...\n');

  const { conversationId, message: greeting } = await startConversation();
  console.log(`🤖 Greeting: ${greeting}\n`);
  console.log('═'.repeat(60));

  const userMessages = [
    'I have a mild headache that started this morning',
    'The pain is about 3 out of 10, dull ache, no other symptoms',
    'Started 4 hours ago, probably from stress and lack of sleep',
    'No fever, no vision problems, no stiff neck, just tired',
    'No medications, no allergies'
  ];

  for (let i = 0; i < userMessages.length; i++) {
    console.log(`\n📝 USER [Turn ${i + 1}]: ${userMessages[i]}`);

    const response = await sendMessage(conversationId, userMessages[i]);

    console.log(`🤖 AI: ${response.message}`);
    console.log(`   [Stage: ${response.stage}, Complete: ${response.isComplete}]`);

    if (response.isComplete) {
      console.log('\n' + '═'.repeat(60));
      console.log('✅ TRIAGE COMPLETED!');
      console.log(`   ATS Category: ${response.triageResult?.result?.atsCategory}`);
      console.log(`   Urgency: ${response.triageResult?.result?.urgency}`);
      console.log(`   Max Wait: ${response.triageResult?.result?.maxWaitTime}`);
      console.log(`   Reasoning: ${response.triageResult?.result?.reasoning?.substring(0, 200)}...`);
      break;
    }

    console.log('─'.repeat(60));
  }
}

testConversation().catch(console.error);
