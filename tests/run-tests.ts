/**
 * Iterative Test Runner for TriageAI
 *
 * Tests all 100 edge cases against the local Ollama API
 * Tracks results and generates improvement recommendations
 */

import { TEST_CASES, TestCase, getTestStats } from './edge-cases.js';

const API_BASE = 'http://localhost:3001/api';

interface TestResult {
  testCase: TestCase;
  actualATS: number | null;
  actualUrgency: string | null;
  actualRedFlags: string[];
  passed: boolean;
  passedATS: boolean;
  passedUrgency: boolean;
  passedRedFlags: boolean;
  responseTime: number;
  error?: string;
  response?: any;
}

interface TestSummary {
  total: number;
  passed: number;
  failed: number;
  passRate: number;
  byATS: Record<number, { total: number; passed: number; rate: number }>;
  redFlagAccuracy: { detected: number; missed: number; rate: number };
  avgResponseTime: number;
  criticalFailures: TestResult[];  // ATS 1-2 cases that were under-triaged
}

async function startConversation(): Promise<string> {
  const response = await fetch(`${API_BASE}/conversation/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({})
  });
  const data = await response.json();
  return data.conversationId;
}

async function sendMessage(conversationId: string, message: string): Promise<any> {
  const response = await fetch(`${API_BASE}/conversation/message`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ conversationId, message })
  });
  return response.json();
}

async function runSingleTest(testCase: TestCase): Promise<TestResult> {
  const startTime = Date.now();

  try {
    // Start a new conversation
    const conversationId = await startConversation();

    // Send the test input
    const response = await sendMessage(conversationId, testCase.input);

    const responseTime = Date.now() - startTime;

    // Extract actual values
    let actualATS: number | null = null;
    let actualUrgency: string | null = null;
    let actualRedFlags: string[] = [];

    if (response.triageResult) {
      actualATS = response.triageResult.result?.atsCategory ||
        response.triageResult.doctorSummary?.atsCategory ||
        null;
      actualUrgency = response.triageResult.result?.urgency || null;
      actualRedFlags = response.triageResult.result?.redFlags?.flags?.map((f: any) => f.condition) || [];
    } else if (response.isComplete === false) {
      // Conversation not complete yet - for now we'll mark as needs more turns
      // For single-message tests, we expect immediate triage for red flags
    }

    // Check pass conditions
    // ATS pass: actual <= expected (can be more urgent, not less)
    const passedATS = actualATS !== null && actualATS <= testCase.expectedATS;

    // Urgency mapping
    const urgencyRank: Record<string, number> = {
      'EMERGENCY': 1,
      'URGENT': 2,
      'SEMI_URGENT': 3,
      'STANDARD': 4,
      'NON_URGENT': 5
    };

    const expectedRank = urgencyRank[testCase.expectedUrgency];
    const actualRank = actualUrgency ? urgencyRank[actualUrgency] : 99;
    const passedUrgency = actualRank <= expectedRank;

    // Red flag pass: if expected has red flags, actual should detect them
    let passedRedFlags = true;
    if (testCase.expectedRedFlags.length > 0) {
      // At least one expected red flag should be detected
      passedRedFlags = testCase.expectedRedFlags.some(ef =>
        actualRedFlags.some(af =>
          af.toLowerCase().includes(ef.toLowerCase()) ||
          ef.toLowerCase().includes(af.toLowerCase())
        )
      );
    }

    const passed = passedATS && passedUrgency;

    return {
      testCase,
      actualATS,
      actualUrgency,
      actualRedFlags,
      passed,
      passedATS,
      passedUrgency,
      passedRedFlags,
      responseTime,
      response
    };
  } catch (error: any) {
    return {
      testCase,
      actualATS: null,
      actualUrgency: null,
      actualRedFlags: [],
      passed: false,
      passedATS: false,
      passedUrgency: false,
      passedRedFlags: false,
      responseTime: Date.now() - startTime,
      error: error.message
    };
  }
}

function analyzeSummary(results: TestResult[]): TestSummary {
  const passed = results.filter(r => r.passed).length;
  const failed = results.length - passed;

  // Group by ATS
  const byATS: Record<number, { total: number; passed: number; rate: number }> = {};
  for (let ats = 1; ats <= 5; ats++) {
    const atsResults = results.filter(r => r.testCase.expectedATS === ats);
    const atsPassed = atsResults.filter(r => r.passed).length;
    byATS[ats] = {
      total: atsResults.length,
      passed: atsPassed,
      rate: atsResults.length > 0 ? (atsPassed / atsResults.length) * 100 : 0
    };
  }

  // Red flag accuracy
  const casesWithExpectedRedFlags = results.filter(r => r.testCase.expectedRedFlags.length > 0);
  const detectedRedFlags = casesWithExpectedRedFlags.filter(r => r.passedRedFlags).length;

  // Critical failures (ATS 1-2 under-triaged)
  const criticalFailures = results.filter(r =>
    (r.testCase.expectedATS === 1 || r.testCase.expectedATS === 2) &&
    r.actualATS !== null &&
    r.actualATS > r.testCase.expectedATS
  );

  // Average response time
  const avgResponseTime = results.reduce((sum, r) => sum + r.responseTime, 0) / results.length;

  return {
    total: results.length,
    passed,
    failed,
    passRate: (passed / results.length) * 100,
    byATS,
    redFlagAccuracy: {
      detected: detectedRedFlags,
      missed: casesWithExpectedRedFlags.length - detectedRedFlags,
      rate: casesWithExpectedRedFlags.length > 0
        ? (detectedRedFlags / casesWithExpectedRedFlags.length) * 100
        : 100
    },
    avgResponseTime,
    criticalFailures
  };
}

async function runAllTests(limit?: number): Promise<{ results: TestResult[], summary: TestSummary }> {
  const testCases = limit ? TEST_CASES.slice(0, limit) : TEST_CASES;

  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║           TRIAGEAI EDGE CASE TEST RUNNER                   ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const stats = getTestStats();
  console.log(`📊 Test Cases: ${testCases.length}/${stats.total}`);
  console.log('─'.repeat(60));

  const results: TestResult[] = [];

  for (let i = 0; i < testCases.length; i++) {
    const tc = testCases[i];
    process.stdout.write(`[${String(i + 1).padStart(3)}/${testCases.length}] ${tc.name.padEnd(35)} `);

    const result = await runSingleTest(tc);
    results.push(result);

    // Status indicator
    if (result.error) {
      console.log(`❌ ERROR: ${result.error}`);
    } else if (result.passed) {
      console.log(`✅ ATS ${result.actualATS} (${result.responseTime}ms)`);
    } else {
      const actual = result.actualATS ?? 'N/A';
      const expected = tc.expectedATS;
      console.log(`❌ Got ATS ${actual}, expected ≤${expected} (${result.responseTime}ms)`);
    }

    // Small delay to not overwhelm Ollama
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log('\n' + '═'.repeat(60));

  const summary = analyzeSummary(results);
  printSummary(summary);

  return { results, summary };
}

function printSummary(summary: TestSummary) {
  console.log('\n📈 TEST SUMMARY');
  console.log('─'.repeat(60));
  console.log(`Total: ${summary.total} | Passed: ${summary.passed} | Failed: ${summary.failed}`);
  console.log(`Pass Rate: ${summary.passRate.toFixed(1)}%`);
  console.log(`Avg Response Time: ${summary.avgResponseTime.toFixed(0)}ms`);

  console.log('\n📊 BY ATS CATEGORY:');
  for (let ats = 1; ats <= 5; ats++) {
    const data = summary.byATS[ats];
    const bar = '█'.repeat(Math.round(data.rate / 10)) + '░'.repeat(10 - Math.round(data.rate / 10));
    console.log(`  ATS ${ats}: ${bar} ${data.rate.toFixed(0)}% (${data.passed}/${data.total})`);
  }

  console.log(`\n🚨 RED FLAG DETECTION: ${summary.redFlagAccuracy.rate.toFixed(1)}%`);
  console.log(`  Detected: ${summary.redFlagAccuracy.detected} | Missed: ${summary.redFlagAccuracy.missed}`);

  if (summary.criticalFailures.length > 0) {
    console.log('\n⚠️  CRITICAL FAILURES (Emergency cases under-triaged):');
    for (const failure of summary.criticalFailures.slice(0, 5)) {
      console.log(`  - [${failure.testCase.id}] ${failure.testCase.name}: Got ATS ${failure.actualATS}, expected ATS ${failure.testCase.expectedATS}`);
    }
    if (summary.criticalFailures.length > 5) {
      console.log(`  ... and ${summary.criticalFailures.length - 5} more`);
    }
  } else {
    console.log('\n✅ No critical failures (all ATS 1-2 cases properly escalated)');
  }
}

async function runIterative(iterations: number = 3, casesPerIteration: number = 20) {
  console.log(`\n🔄 ITERATIVE TESTING (${iterations} iterations, ${casesPerIteration} cases each)\n`);

  for (let i = 1; i <= iterations; i++) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`ITERATION ${i}/${iterations}`);
    console.log('='.repeat(60));

    // Run tests
    const { results, summary } = await runAllTests(casesPerIteration);

    // Generate recommendations based on failures
    if (summary.failed > 0) {
      console.log('\n💡 IMPROVEMENT RECOMMENDATIONS:');

      // Check for under-triage issues
      const underTriaged = results.filter(r =>
        r.actualATS !== null &&
        r.actualATS > r.testCase.expectedATS
      );
      if (underTriaged.length > 0) {
        console.log(`  1. Add keywords for: ${[...new Set(underTriaged.map(u => u.testCase.category))].join(', ')}`);
      }

      // Check for missed red flags
      const missedRedFlags = results.filter(r => !r.passedRedFlags && r.testCase.expectedRedFlags.length > 0);
      if (missedRedFlags.length > 0) {
        const missingKeywords = [...new Set(missedRedFlags.flatMap(m => m.testCase.expectedRedFlags))];
        console.log(`  2. Enhance red flag detection for: ${missingKeywords.join(', ')}`);
      }

      // Check for response quality
      const noTriage = results.filter(r => r.actualATS === null && !r.error);
      if (noTriage.length > 0) {
        console.log(`  3. ${noTriage.length} cases did not complete triage - check forceTriageAfter threshold`);
      }
    }

    // Wait between iterations
    if (i < iterations) {
      console.log('\n⏳ Waiting 5 seconds before next iteration...');
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
}

// Main execution
const args = process.argv.slice(2);

if (args.includes('--iterative')) {
  const iterations = parseInt(args[args.indexOf('--iterations') + 1]) || 3;
  const cases = parseInt(args[args.indexOf('--cases') + 1]) || 20;
  runIterative(iterations, cases);
} else {
  const limit = args.includes('--limit') ? parseInt(args[args.indexOf('--limit') + 1]) : undefined;
  runAllTests(limit).then(({ summary }) => {
    process.exit(summary.failed > summary.total * 0.3 ? 1 : 0);  // Fail if >30% fail
  });
}
