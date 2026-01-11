import textToSpeech from '@google-cloud/text-to-speech';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import util from 'util';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// TTS segments for the demo
const segments = [
  {
    id: '01_intro',
    text: 'TriageAI. AI-powered patient triage for Australian healthcare.',
    duration: 5
  },
  {
    id: '02_problem',
    text: 'Australian emergency departments handle 8.9 million presentations each year. 30% are non-urgent. Triage nurses are overwhelmed, and telehealth lacks standardized pre-screening.',
    duration: 12
  },
  {
    id: '03_solution',
    text: 'TriageAI implements the official Australian Triage Scale with a 4-layer safety architecture. Deterministic guardrails catch red flags in under 1 millisecond. The LLM can never under-triage a critical patient.',
    duration: 15
  },
  {
    id: '04_demo_intro',
    text: 'Watch what happens when a patient reports chest pain radiating to their left arm.',
    duration: 5
  },
  {
    id: '05_demo_result',
    text: 'The system immediately detects the cardiac red flag, assigns ATS Category 2, and recommends urgent assessment within 10 minutes. All in real-time.',
    duration: 10
  },
  {
    id: '06_safe_demo',
    text: 'For a mild headache without red flags, the AI asks clarifying questions and appropriately triages as non-urgent, ATS Category 5.',
    duration: 10
  },
  {
    id: '07_close',
    text: 'TriageAI. Safe, explainable, production-ready. Built with React, Node.js, and AWS. Let\'s build the future of healthcare AI together.',
    duration: 10
  }
];

async function generateTTS() {
  const client = new textToSpeech.TextToSpeechClient();
  const outputDir = path.join(__dirname, 'audio');

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log('Generating TTS audio segments...\n');

  for (const segment of segments) {
    const request = {
      input: { text: segment.text },
      voice: {
        languageCode: 'en-AU',  // Australian English
        name: 'en-AU-Neural2-B', // Professional male voice
        ssmlGender: 'MALE'
      },
      audioConfig: {
        audioEncoding: 'MP3',
        speakingRate: 0.95,  // Slightly slower for clarity
        pitch: -1.0,  // Slightly lower pitch for authority
        effectsProfileId: ['headphone-class-device']
      }
    };

    try {
      const [response] = await client.synthesizeSpeech(request);
      const outputPath = path.join(outputDir, `${segment.id}.mp3`);

      const writeFile = util.promisify(fs.writeFile);
      await writeFile(outputPath, response.audioContent, 'binary');

      console.log(`✅ Generated: ${segment.id}.mp3`);
    } catch (error) {
      console.error(`❌ Error generating ${segment.id}:`, error.message);
    }
  }

  console.log('\nDone! Audio files saved to:', outputDir);

  // Create a timings file for video sync
  const timings = segments.map((s, i) => ({
    id: s.id,
    startTime: segments.slice(0, i).reduce((acc, seg) => acc + seg.duration, 0),
    duration: s.duration,
    text: s.text
  }));

  fs.writeFileSync(
    path.join(outputDir, 'timings.json'),
    JSON.stringify(timings, null, 2)
  );
  console.log('Timings saved to: timings.json');
}

generateTTS().catch(console.error);
