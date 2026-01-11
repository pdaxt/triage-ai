/**
 * Debug the mild headache scenario from the demo
 */

const API_BASE = 'http://localhost:3001/api';

async function debugMildHeadache() {
  console.log('🔍 Debugging mild headache scenario...\n');

  // Start conversation
  const startRes = await fetch(`${API_BASE}/conversation/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({})
  });
  const { conversationId, message: greeting } = await startRes.json();
  console.log(`Conversation ID: ${conversationId}`);
  console.log(`🤖 Greeting: ${greeting}\n`);

  // Same messages as the demo recording
  const messages = [
    'I have a mild headache that started this morning',
    'The pain is about 3 out of 10, no fever, no vision changes, I just slept poorly',
    'It started about 4 hours ago. No history of migraines. I think it is just stress and lack of sleep.'
  ];

  for (let i = 0; i < messages.length; i++) {
    console.log(`\n${'═'.repeat(60)}`);
    console.log(`📝 USER [Turn ${i + 1}]: ${messages[i]}`);

    const res = await fetch(`${API_BASE}/conversation/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversationId, message: messages[i] })
    });
    const data = await res.json();

    console.log(`\n🤖 AI Response: ${data.message}`);
    console.log(`\n📊 Stage: ${data.stage}`);
    console.log(`📊 Complete: ${data.isComplete}`);

    if (data.isComplete && data.triageResult) {
      console.log('\n' + '═'.repeat(60));
      console.log('🏥 TRIAGE RESULT:');
      console.log(JSON.stringify(data.triageResult, null, 2));
    }
  }
}

debugMildHeadache().catch(console.error);
