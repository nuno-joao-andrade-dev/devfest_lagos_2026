import 'dotenv/config';
import { fileURLToPath } from 'node:url';
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { MessageData, z } from 'genkit';
import {
  ai,
  EMBEDDING_MODEL,
  GEMMA_MODEL,
  OLLAMA_SERVER_ADDRESS,
} from '../src/config/genkit.js';
import { WeatherScenarioMode } from '../src/lib/weather-service.js';
import {
  generateWithToolsResilient,
  ToolCallTraceSchema,
} from '../src/lib/tool-execution-helper.js';
import {
  findLagosTours,
  getLagosWeatherAndMarine,
} from '../step-03-custom-tools/index.js';
import {
  AGENTIC_RAG_SYSTEM_PROMPT,
  searchLagosKnowledge,
} from '../step-04-agentic-rag/index.js';

/**
 * ============================================================================
 * STEP 5: Production-Ready Local Agent Execution
 *         (Multi-Turn Memory, Guardrails, Telemetry & Interactive CLI)
 * ============================================================================
 * Run this step directly with:
 *   npm run step 5               (Runs a 2-turn stateful production pipeline)
 *   npm run step 5 interactive   (Launches the interactive multi-turn CLI chat)
 */

export const AgentChatMessageSchema = z.object({
  role: z.enum(['user', 'model']),
  text: z.string(),
});

export const ProductionAgentInputSchema = z.object({
  question: z
    .string()
    .min(2)
    .max(1000)
    .default(
      'We are at DevFest Lagos 2026! What is Nuno Andrade’s secret workshop passphrase, and is the sea at Ponta da Piedade calm enough to kayak to A Catedral right now?'
    ),
  weatherScenario: z
    .enum(['live', 'calm', 'nortada_windy', 'atlantic_swell'])
    .default('live'),
  history: z.array(AgentChatMessageSchema).optional(),
  maxToolTurns: z.number().int().min(1).max(8).default(5),
});

export const ProductionAgentOutputSchema = z.object({
  answer: z.string(),
  autonomousToolsCalled: z.array(ToolCallTraceSchema),
  telemetry: z.object({
    model: z.string(),
    weatherScenarioUsed: z.string(),
    toolCallCount: z.number(),
    historyMessageCount: z.number(),
    latencyMs: z.number(),
    usedFallbackPlanner: z.boolean(),
  }),
  updatedHistory: z.array(AgentChatMessageSchema),
});

export const step05_productionLagosAgent = ai.defineFlow(
  {
    name: 'step05_productionLagosAgent',
    inputSchema: ProductionAgentInputSchema,
    outputSchema: ProductionAgentOutputSchema,
  },
  async (req) => {
    const startMs = Date.now();
    const prevMode = process.env.WEATHER_MODE;
    process.env.WEATHER_MODE = req.weatherScenario as WeatherScenarioMode;

    try {
      const priorMessages: MessageData[] | undefined =
        req.history && req.history.length > 0
          ? req.history.map((m) => ({
              role: m.role,
              content: [{ text: m.text }],
            }))
          : undefined;

      const result = await generateWithToolsResilient({
        system: AGENTIC_RAG_SYSTEM_PROMPT,
        prompt: req.question,
        messages: priorMessages,
        tools: [
          searchLagosKnowledge,
          getLagosWeatherAndMarine,
          findLagosTours,
        ],
        maxTurns: req.maxToolTurns, // Production guardrail against runaway tool loops
        temperature: 0.2,
      });

      const updatedHistory = [
        ...(req.history || []),
        { role: 'user' as const, text: req.question },
        { role: 'model' as const, text: result.text },
      ];

      return {
        answer: result.text,
        autonomousToolsCalled: result.toolTraces,
        telemetry: {
          model: `ollama/${GEMMA_MODEL}`,
          weatherScenarioUsed: req.weatherScenario,
          toolCallCount: result.toolTraces.length,
          historyMessageCount: updatedHistory.length,
          latencyMs: Date.now() - startMs,
          usedFallbackPlanner: result.usedFallbackPlanner,
        },
        updatedHistory,
      };
    } finally {
      if (prevMode === undefined) {
        delete process.env.WEATHER_MODE;
      } else {
        process.env.WEATHER_MODE = prevMode;
      }
    }
  }
);

async function runInteractiveCli() {
  let weatherScenario: WeatherScenarioMode =
    (process.env.WEATHER_MODE as WeatherScenarioMode) || 'live';
  let history: Array<{ role: 'user' | 'model'; text: string }> = [];

  console.log('\n====================================================================');
  console.log(' ⛵ CAPITÃO GIL — Interactive Production Agent CLI (Step 5)');
  console.log('====================================================================');
  console.log(` Model         : ollama/${GEMMA_MODEL} (${OLLAMA_SERVER_ADDRESS})`);
  console.log(` Embedder      : ${EMBEDDING_MODEL}`);
  console.log(` Weather Mode  : ${weatherScenario.toUpperCase()}`);
  console.log('--------------------------------------------------------------------');
  console.log(' Commands: /weather [live|calm|windy|swell] | /clear | /exit');
  console.log('====================================================================\n');

  const rl = readline.createInterface({ input, output });
  try {
    while (true) {
      const line = (
        await rl.question(`\n[You | weather=${weatherScenario}] > `)
      ).trim();
      if (!line) continue;
      if (line === '/exit' || line === '/quit') break;
      if (line === '/clear') {
        history = [];
        console.log('🧹 Multi-turn history cleared.');
        continue;
      }
      if (line.startsWith('/weather')) {
        const arg = line.replace('/weather', '').trim().toLowerCase();
        if (arg === 'live') weatherScenario = 'live';
        else if (arg === 'calm') weatherScenario = 'calm';
        else if (arg === 'windy' || arg === 'nortada')
          weatherScenario = 'nortada_windy';
        else if (arg === 'swell' || arg === 'stormy')
          weatherScenario = 'atlantic_swell';
        console.log(`🌊 Weather mode set to: ${weatherScenario.toUpperCase()}`);
        continue;
      }

      const res = await step05_productionLagosAgent({
        question: line,
        weatherScenario,
        history,
        maxToolTurns: 5,
      });
      history = res.updatedHistory;

      console.log(
        `\n📊 Telemetry: ${res.telemetry.latencyMs}ms | Tools: ${res.telemetry.toolCallCount} | History Msgs: ${res.telemetry.historyMessageCount}`
      );
      for (const t of res.autonomousToolsCalled) {
        console.log(`   🛠️  ${t.toolName}(${JSON.stringify(t.input)})`);
      }
      console.log(`\n⛵ Capitão Gil:\n${res.answer}`);
    }
  } finally {
    rl.close();
  }
}

export async function runStep05() {
  const modeArg = (process.argv[3] || '').toLowerCase();
  if (modeArg === 'interactive' || modeArg === 'chat' || modeArg === '--interactive') {
    await runInteractiveCli();
    return;
  }

  console.log('\n====================================================================');
  console.log(' 🟪 STEP 5: Production-Ready Local Agent (Multi-Turn + Telemetry)');
  console.log('====================================================================');
  console.log(` Local Model  : ollama/${GEMMA_MODEL}`);
  console.log(' Guardrails   : maxToolTurns=5, Zod input/output validation, telemetry');
  console.log('--------------------------------------------------------------------');

  // Turn 1: Ask about DevFest passphrase + Kayak tour during simulated Atlantic swell
  const turn1Prompt =
    'We just finished Nuno Andrade’s DevFest Lagos 2026 workshop! What is the secret workshop passphrase, and can we celebrate with a kayak tour at Ponta da Piedade right now?';
  console.log(`\n🗣️  [Turn 1 | weather=atlantic_swell] User:\n   "${turn1Prompt}"`);

  const turn1 = await step05_productionLagosAgent({
    question: turn1Prompt,
    weatherScenario: 'atlantic_swell',
    history: [],
    maxToolTurns: 5,
  });

  console.log(
    `\n📊 Turn 1 Telemetry: ${turn1.telemetry.latencyMs}ms | Tools Called: ${turn1.telemetry.toolCallCount} | Memory Size: ${turn1.telemetry.historyMessageCount} msgs`
  );
  for (const trace of turn1.autonomousToolsCalled) {
    console.log(`   ├─ 🛠️  ${trace.toolName}(${JSON.stringify(trace.input)})`);
  }
  console.log(`\n⛵ Capitão Gil (Turn 1):\n${turn1.answer}`);

  // Turn 2: Stateful follow-up referencing Turn 1 memory ("What sweet should we eat on that walk instead?")
  const turn2Prompt =
    'Since the sea caves are closed by the swell, tell me about the traditional Lagos conventual sweet wrapped in colorful foil that we can eat after our walk!';
  console.log('\n--------------------------------------------------------------------');
  console.log(
    `\n🗣️  [Turn 2 (Multi-Turn Memory Follow-Up)] User:\n   "${turn2Prompt}"`
  );

  const turn2 = await step05_productionLagosAgent({
    question: turn2Prompt,
    weatherScenario: 'atlantic_swell',
    history: turn1.updatedHistory,
    maxToolTurns: 5,
  });

  console.log(
    `\n📊 Turn 2 Telemetry: ${turn2.telemetry.latencyMs}ms | Tools Called: ${turn2.telemetry.toolCallCount} | Memory Size: ${turn2.telemetry.historyMessageCount} msgs`
  );
  for (const trace of turn2.autonomousToolsCalled) {
    console.log(`   ├─ 🛠️  ${trace.toolName}(${JSON.stringify(trace.input)})`);
  }
  console.log(`\n⛵ Capitão Gil (Turn 2):\n${turn2.answer}`);

  console.log('\n--------------------------------------------------------------------');
  console.log('💡 Tip: Want to chat interactively with Capitão Gil in your terminal?');
  console.log('   Run: npm run step 5 interactive');
  console.log('====================================================================\n');
}

const isMain =
  process.argv[1] &&
  fileURLToPath(import.meta.url) === process.argv[1] &&
  process.env.GENKIT_ENV !== 'dev';
if (isMain) {
  runStep05().catch((err) => {
    console.error('\n❌ Step 5 Error:', err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
