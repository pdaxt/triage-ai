import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

const outputDir = './recordings';
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

async function recordDemo() {
  console.log('🎬 Starting TriageAI demo recording (COMPLETE E2E)...\n');

  const browser = await chromium.launch({
    headless: false,
    channel: 'chrome',
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    recordVideo: {
      dir: outputDir,
      size: { width: 1280, height: 720 }
    }
  });

  const page = await context.newPage();
  const inputSelector = 'textarea, input[type="text"], [placeholder*="symptom"], [placeholder*="message"]';

  try {
    // ========== EMERGENCY SCENARIO ==========
    console.log('📍 Opening TriageAI...');
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    // Type emergency message
    const emergencyMessage = 'I have crushing chest pain radiating to my left arm and I feel dizzy';
    console.log(`📝 Emergency: "${emergencyMessage}"`);

    await page.waitForSelector(inputSelector, { timeout: 10000 });
    await page.click(inputSelector);
    await page.type(inputSelector, emergencyMessage, { delay: 35 });
    await page.waitForTimeout(1000);
    await page.keyboard.press('Enter');

    // Wait for complete triage result
    console.log('⏳ Waiting for emergency triage...');
    await page.waitForTimeout(12000);

    // Scroll to see the full result
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(3000);

    await page.screenshot({ path: `${outputDir}/01_emergency_triage.png`, fullPage: true });
    console.log('📸 Screenshot: 01_emergency_triage.png');

    // Hold on the result longer
    await page.waitForTimeout(8000);

    // ========== MILD HEADACHE - FULL CONVERSATION ==========
    console.log('\n📍 Starting new conversation for mild scenario...');

    // Click "Start New Assessment" if visible
    const newButton = await page.$('text=Start New Assessment');
    if (newButton) {
      await newButton.click();
      await page.waitForTimeout(2000);
    } else {
      await page.reload({ waitUntil: 'networkidle' });
      await page.waitForTimeout(3000);
    }

    // Turn 1: Initial symptom
    const msg1 = 'I have a mild headache that started this morning';
    console.log(`📝 Turn 1: "${msg1}"`);
    await page.waitForSelector(inputSelector, { timeout: 10000 });
    await page.click(inputSelector);
    await page.type(inputSelector, msg1, { delay: 35 });
    await page.keyboard.press('Enter');
    await page.waitForTimeout(6000);

    // Turn 2: More details
    const msg2 = 'The pain is about 3 out of 10, no fever, no vision changes, I just slept poorly';
    console.log(`📝 Turn 2: "${msg2}"`);
    await page.click(inputSelector);
    await page.type(inputSelector, msg2, { delay: 30 });
    await page.keyboard.press('Enter');
    await page.waitForTimeout(6000);

    // Turn 3: Duration and history
    const msg3 = 'It started about 4 hours ago. No history of migraines. I think it is just stress and lack of sleep.';
    console.log(`📝 Turn 3: "${msg3}"`);
    await page.click(inputSelector);
    await page.type(inputSelector, msg3, { delay: 30 });
    await page.keyboard.press('Enter');

    // Wait for final triage
    console.log('⏳ Waiting for final triage result...');
    await page.waitForTimeout(12000);

    // Scroll to see full result
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(3000);

    await page.screenshot({ path: `${outputDir}/02_mild_conversation.png`, fullPage: true });
    console.log('📸 Screenshot: 02_mild_conversation.png');

    // Hold on final result
    await page.waitForTimeout(8000);

    // Scroll up slowly to show whole conversation
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(3000);

    console.log('\n✅ COMPLETE Demo recording finished!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    await page.screenshot({ path: `${outputDir}/error.png` });
  } finally {
    await context.close();
    await browser.close();
  }

  // Find and rename the video
  const files = fs.readdirSync(outputDir);
  const videoFile = files.find(f => f.endsWith('.webm') && f !== 'demo-raw.webm');

  if (videoFile) {
    const videoPath = path.join(outputDir, videoFile);
    const finalPath = path.join(outputDir, 'demo-raw.webm');

    // Remove old file if exists
    if (fs.existsSync(finalPath)) {
      fs.unlinkSync(finalPath);
    }

    fs.renameSync(videoPath, finalPath);
    console.log(`\n📹 Video saved: ${finalPath}`);

    // Get duration
    const { execSync } = await import('child_process');
    try {
      const duration = execSync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 ${finalPath}`).toString().trim();
      console.log(`⏱️  Duration: ${Math.round(parseFloat(duration))}s`);
    } catch (e) {}
  }
}

recordDemo().catch(console.error);
