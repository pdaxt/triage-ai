import { chromium, Browser, Page } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

interface DemoStep {
  action: 'navigate' | 'type' | 'click' | 'wait' | 'screenshot';
  selector?: string;
  value?: string;
  duration?: number;
  description: string;
}

const demoSteps: DemoStep[] = [
  // Intro - show landing page
  { action: 'navigate', value: 'http://localhost:5173', description: 'Open TriageAI' },
  { action: 'wait', duration: 3000, description: 'Show landing page' },
  { action: 'screenshot', value: '01_landing', description: 'Landing screenshot' },

  // Emergency scenario - chest pain
  { action: 'wait', duration: 2000, description: 'Pause before demo' },
  { action: 'type', selector: 'textarea, input[type="text"]', value: 'I have crushing chest pain radiating to my left arm', description: 'Type chest pain message' },
  { action: 'wait', duration: 1000, description: 'Show typed message' },
  { action: 'click', selector: 'button[type="submit"], button:has-text("Send")', description: 'Send message' },
  { action: 'wait', duration: 5000, description: 'Wait for AI response and triage' },
  { action: 'screenshot', value: '02_emergency_triage', description: 'Emergency triage result' },
  { action: 'wait', duration: 5000, description: 'Show emergency result' },

  // Start new conversation for non-emergency
  { action: 'click', selector: 'button:has-text("New")', description: 'Start new conversation' },
  { action: 'wait', duration: 2000, description: 'Wait for new conversation' },

  // Non-emergency scenario - mild headache
  { action: 'type', selector: 'textarea, input[type="text"]', value: 'I have a mild headache that started this morning', description: 'Type headache message' },
  { action: 'wait', duration: 1000, description: 'Show typed message' },
  { action: 'click', selector: 'button[type="submit"], button:has-text("Send")', description: 'Send message' },
  { action: 'wait', duration: 4000, description: 'Wait for AI response' },
  { action: 'screenshot', value: '03_followup_question', description: 'Follow-up question' },

  // Answer follow-up
  { action: 'type', selector: 'textarea, input[type="text"]', value: 'No fever, no nausea, just dull pain behind my eyes. I slept poorly last night.', description: 'Answer follow-up' },
  { action: 'click', selector: 'button[type="submit"], button:has-text("Send")', description: 'Send answer' },
  { action: 'wait', duration: 5000, description: 'Wait for triage' },
  { action: 'screenshot', value: '04_non_urgent_triage', description: 'Non-urgent triage result' },
  { action: 'wait', duration: 5000, description: 'Show final result' },
];

async function recordDemo() {
  const outputDir = path.join(__dirname, 'recordings');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log('🎬 Starting demo recording with Playwright + Chrome...\n');

  const browser: Browser = await chromium.launch({
    headless: false,  // Show browser for recording
    channel: 'chrome',  // Use installed Chrome
    args: [
      '--window-size=1280,720',
      '--disable-blink-features=AutomationControlled',
    ]
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    recordVideo: {
      dir: outputDir,
      size: { width: 1280, height: 720 }
    }
  });

  const page: Page = await context.newPage();

  try {
    for (let i = 0; i < demoSteps.length; i++) {
      const step = demoSteps[i];
      console.log(`[${i + 1}/${demoSteps.length}] ${step.description}`);

      switch (step.action) {
        case 'navigate':
          await page.goto(step.value!, { waitUntil: 'networkidle' });
          break;

        case 'type':
          await page.waitForSelector(step.selector!, { timeout: 10000 });
          // Type slowly for demo effect
          await page.fill(step.selector!, '');
          for (const char of step.value!) {
            await page.type(step.selector!, char, { delay: 50 });
          }
          break;

        case 'click':
          await page.waitForSelector(step.selector!, { timeout: 10000 });
          await page.click(step.selector!);
          break;

        case 'wait':
          await page.waitForTimeout(step.duration!);
          break;

        case 'screenshot':
          await page.screenshot({
            path: path.join(outputDir, `${step.value}.png`),
            fullPage: false
          });
          break;
      }
    }

    console.log('\n✅ Demo recording complete!');

  } catch (error) {
    console.error('❌ Error during recording:', error);
    throw error;
  } finally {
    await context.close();
    await browser.close();
  }

  // Find the recorded video
  const files = fs.readdirSync(outputDir);
  const videoFile = files.find(f => f.endsWith('.webm'));

  if (videoFile) {
    console.log(`\n📹 Video saved: ${path.join(outputDir, videoFile)}`);
    console.log('\nNext steps:');
    console.log('1. Generate TTS audio: node generate-tts.js');
    console.log('2. Combine video + audio with ffmpeg');
  }
}

recordDemo().catch(console.error);
