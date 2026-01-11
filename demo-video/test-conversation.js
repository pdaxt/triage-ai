import { chromium } from 'playwright';

async function testConversation() {
  console.log('🧪 Testing ATS 4-5 conversation flow...\n');

  const browser = await chromium.launch({
    headless: false,
    channel: 'chrome',
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
  });

  const page = await context.newPage();
  const inputSelector = 'textarea, input[type="text"], [placeholder*="symptom"], [placeholder*="message"]';

  try {
    console.log('📍 Opening TriageAI...');
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // ATS 4-5 test case: mild headache
    const messages = [
      'I have a mild headache that started this morning',
      'The pain is about 3 out of 10, dull ache, no other symptoms',
      'Started 4 hours ago, probably from stress and lack of sleep',
      'No fever, no vision problems, no stiff neck, just tired'
    ];

    for (let i = 0; i < messages.length; i++) {
      console.log(`\n📝 Turn ${i + 1}: "${messages[i]}"`);

      await page.waitForSelector(inputSelector, { timeout: 10000 });
      await page.click(inputSelector);
      await page.fill(inputSelector, messages[i]);
      await page.keyboard.press('Enter');

      // Wait for response
      await page.waitForTimeout(8000);

      // Get the last assistant message
      const assistantMessages = await page.$$eval('[class*="assistant"], [class*="bot"], [class*="ai"]',
        elements => elements.map(el => el.textContent?.trim()).filter(Boolean)
      );

      if (assistantMessages.length > 0) {
        const lastMessage = assistantMessages[assistantMessages.length - 1];
        console.log(`🤖 Response: ${lastMessage?.substring(0, 200)}...`);
      }

      // Check if triage complete
      const triageResult = await page.$('[class*="triage"], [class*="result"], [class*="assessment"]');
      if (triageResult) {
        const resultText = await triageResult.textContent();
        if (resultText?.includes('ATS') || resultText?.includes('Severity')) {
          console.log(`\n✅ Triage complete after turn ${i + 1}`);
          console.log(`Result: ${resultText?.substring(0, 300)}...`);
          break;
        }
      }
    }

    await page.screenshot({ path: 'recordings/test-conversation.png', fullPage: true });
    console.log('\n📸 Screenshot saved: test-conversation.png');

    // Hold for viewing
    await page.waitForTimeout(10000);

  } catch (error) {
    console.error('❌ Error:', error.message);
    await page.screenshot({ path: 'recordings/error.png' });
  } finally {
    await context.close();
    await browser.close();
  }
}

testConversation().catch(console.error);
