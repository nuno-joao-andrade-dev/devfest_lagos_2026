import 'dotenv/config';
import { spawn } from 'node:child_process';
import { runStep01 } from '../../step-01-basic-prompt/index.js';
import { runStep02 } from '../../step-02-vector-rag/index.js';
import { runStep03 } from '../../step-03-custom-tools/index.js';
import { runStep04 } from '../../step-04-agentic-rag/index.js';
import { runStep05 } from '../../step-05-production-agent/index.js';

function normalizeStepNumber(rawArg: string | undefined): string {
  if (!rawArg) return '';
  const cleaned = rawArg.toLowerCase().trim();
  if (cleaned === 'all') return 'all';
  const match = cleaned.match(/([1-5])/);
  return match ? match[1] : '';
}

function isGenkitUiArg(arg: string | undefined): boolean {
  if (!arg) return false;
  const cleaned = arg.toLowerCase().trim().replace(/^--?/, '');
  return cleaned === 'ui' || cleaned === 'genkit' || cleaned === 'playground';
}

function launchGenkitUiForStep(step: string): Promise<void> {
  const stepTargets: Record<string, string> = {
    '1': 'step-01-basic-prompt/index.ts',
    '2': 'step-02-vector-rag/genkit-ui.ts',
    '3': 'step-03-custom-tools/index.ts',
    '4': 'step-04-agentic-rag/genkit-ui.ts',
    '5': 'step-05-production-agent/index.ts',
  };

  const targetFile = stepTargets[step] || 'step-02-vector-rag/genkit-ui.ts';
  console.log(`\n🚀 Launching "genkit start" for Step ${step} (${targetFile})...`);

  return new Promise((resolve, reject) => {
    const child = spawn(
      'npx',
      ['genkit', 'start', '--', 'npx', 'tsx', '--watch', targetFile],
      {
        stdio: 'inherit',
        env: { ...process.env, GENKIT_ENV: 'dev' },
      }
    );

    child.on('error', (err) => reject(err));
    child.on('exit', (code) => {
      if (code === 0 || code === null) {
        resolve();
      } else {
        process.exitCode = code;
        resolve();
      }
    });
  });
}

function printUsage() {
  console.log('\n====================================================================');
  console.log(' ⛵ DevFest Lagos 2026 — Gemma 4 & Genkit Workshop Step Runner');
  console.log('====================================================================');
  console.log(' Usage: npm run step <1 | 2 | 3 | 4 | 5 | all>\n');
  console.log(' Available Workshop Steps:');
  console.log('   npm run step 1      -> [step-01-basic-prompt]     Static Prompts & Structured Output');
  console.log('   npm run step 2      -> [step-02-vector-rag]       Local Vector DB & RAG Pipeline');
  console.log('   npm run step 2 ui   -> [step-02-vector-rag]       Launch "genkit start" to test RAG & Model directly in UI');
  console.log('   npm run step 3      -> [step-03-custom-tools]     Custom TypeScript Weather & Tour Tools');
  console.log('   npm run step 4      -> [step-04-agentic-rag]      Autonomous Agentic RAG Pipeline');
  console.log('   npm run step 4 ui   -> [step-04-agentic-rag]      Launch "genkit start" to test Agentic RAG & Tools in UI');
  console.log('   npm run step 5      -> [step-05-production-agent] Production Multi-Turn Agent & Telemetry');
  console.log('   npm run step 5 interactive -> Launch interactive CLI chat with Capitão Gil');
  console.log('====================================================================\n');
}

async function main() {
  const rawStep = process.argv[2];
  const extraArg = process.argv[3];
  const step = normalizeStepNumber(rawStep);

  // Check if user requested `npm run step 2 ui` (or `npm run step 2:ui`)
  if (
    step &&
    step !== 'all' &&
    (isGenkitUiArg(extraArg) || (rawStep && rawStep.toLowerCase().includes(':ui')))
  ) {
    await launchGenkitUiForStep(step);
    return;
  }

  // Shift process.argv so individual step runners see extra arguments at process.argv[3]
  if (process.argv.length > 3) {
    process.argv.splice(2, 1);
  } else {
    process.argv = [process.argv[0], process.argv[1]];
  }

  switch (step) {
    case '1':
      await runStep01();
      break;
    case '2':
      await runStep02();
      break;
    case '3':
      await runStep03();
      break;
    case '4':
      await runStep04();
      break;
    case '5':
      await runStep05();
      break;
    case 'all':
      await runStep01();
      await runStep02();
      await runStep03();
      await runStep04();
      await runStep05();
      break;
    default:
      printUsage();
      process.exitCode = rawStep ? 1 : 0;
      break;
  }
}

main().catch((err) => {
  console.error('\n❌ Workshop Step Execution Error:', err instanceof Error ? err.message : err);
  process.exit(1);
});
