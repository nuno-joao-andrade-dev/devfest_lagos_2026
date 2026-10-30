import 'dotenv/config';
import { fileURLToPath } from 'node:url';
import { z } from 'genkit';
import {
  ai,
  GEMMA_MODEL,
  lagosIndexer,
  lagosRetriever,
} from '../src/config/genkit.js';
import {
  isVectorStorePopulated,
  keywordFallbackSearch,
  loadLagosGenkitDocuments,
} from '../src/lib/knowledge-loader.js';
import { WeatherScenarioMode } from '../src/lib/weather-service.js';
import {
  generateWithToolsResilient,
  ToolCallTraceSchema,
} from '../src/lib/tool-execution-helper.js';
import {
  findLagosTours,
  getLagosWeatherAndMarine,
} from '../step-03-custom-tools/index.js';

/**
 * ============================================================================
 * STEP 4: Autonomous Agentic RAG (Vector Search as a Tool + Live Weather Tools)
 * ============================================================================
 * Run this step directly with:
 *   npm run step 4   (or: npm run step4)
 */

/**
 * TOOL 3: Agentic Vector RAG Tool (`searchLagosKnowledge`)
 *
 * Wraps `ai.retrieve()` inside `ai.defineTool()` so local Gemma 4 autonomously
 * decides WHEN to query the local vector database and WHAT search query to formulate!
 */
export const searchLagosKnowledge = ai.defineTool(
  {
    name: 'searchLagosKnowledge',
    description:
      'Queries the local Lagos & Ponta da Piedade vector knowledge base for historical facts (1913 Lighthouse, Ermida dispute, Gil Eanes, Lacobriga, Igreja de Santo António), named sea caves (A Catedral, A Cozinha, Gruta dos Amores, O Submarino), kayak safety rules, traditional gastronomy (Dom Rodrigo, Cataplana), and DevFest Lagos 2026 insider info.',
    inputSchema: z.object({
      searchQuery: z
        .string()
        .describe(
          'Semantic search query to look up in the local Lagos vector database'
        ),
      topK: z
        .number()
        .int()
        .min(1)
        .max(5)
        .optional()
        .describe('Number of knowledge chunks to retrieve (default: 3)'),
    }),
    outputSchema: z.object({
      retrievalMethod: z.string(),
      results: z.array(
        z.object({
          source: z.string(),
          section: z.string(),
          content: z.string(),
        })
      ),
    }),
  },
  async (input) => {
    const k = input.topK ?? 3;

    try {
      if (!isVectorStorePopulated()) {
        const docs = loadLagosGenkitDocuments();
        await ai.index({
          indexer: lagosIndexer,
          documents: docs,
        });
      }

      const retrievedDocs = await ai.retrieve({
        retriever: lagosRetriever,
        query: input.searchQuery,
        options: { k },
      });

      return {
        retrievalMethod: 'devLocalVectorstore (768d cosine similarity)',
        results: retrievedDocs.map((doc) => ({
          source: String(doc.metadata?.sourceFile || 'lagos-knowledge'),
          section: String(doc.metadata?.sectionTitle || 'Section'),
          content: doc.text,
        })),
      };
    } catch {
      const fallbackChunks = keywordFallbackSearch(input.searchQuery, k);
      return {
        retrievalMethod: 'keyword-fallback',
        results: fallbackChunks.map((chunk) => ({
          source: chunk.sourceFile,
          section: chunk.sectionTitle,
          content: chunk.content,
        })),
      };
    }
  }
);

export const AGENTIC_RAG_SYSTEM_PROMPT = `You are Capitão Gil, an autonomous AI Tourism & Maritime Guide for Lagos, Portugal (built with Google Genkit & local Gemma 4 for DevFest Lagos 2026).

You have 3 specialized tools at your disposal:
1. \`searchLagosKnowledge\`: Call this whenever the user asks about the history, geology, or legends of Ponta da Piedade, the 1913 Lighthouse & 16th-century Ermida, sea cave names (A Catedral, A Cozinha, Gruta dos Amores, Arco do Triunfo, O Submarino), Gil Eanes & the Age of Discoveries, beaches, traditional sweets (Dom Rodrigo, Cataplana), kayak safety thresholds, or DevFest Lagos 2026 secrets.
2. \`getLagosWeatherAndMarine\`: Call this whenever the user asks about current weather, wind, waves, or whether it is safe to kayak, boat, or visit the coast today.
3. \`findLagosTours\`: Call this whenever recommending a kayak tour, boat cruise, Passadiços cliff boardwalk walk, or Old Town cultural/gastronomy tour.

SAFETY & GROUNDING RULES:
- Never guess sea conditions: always call \`getLagosWeatherAndMarine\` before recommending a kayak tour.
- Respect Capitania do Porto de Lagos limits: if wind > 20-25 km/h, gusts > 28-30 km/h (especially afternoon Nortada offshore gusts), or wave height > 1.2m, warn the visitor that kayaking is UNSAFE and recommend the Passadiços da Ponta da Piedade boardwalks or an Old Town cultural & Dom Rodrigo tour instead.
- Ground all historical and local claims in facts returned by \`searchLagosKnowledge\`.`;

export const Step4InputSchema = z.object({
  question: z
    .string()
    .default(
      'Tell me the history of the 1913 Ponta da Piedade lighthouse and the cave called A Cozinha. Also, check the live weather right now—can we take a kayak tour to see it today, or what tour do you recommend instead?'
    ),
  weatherScenario: z
    .enum(['live', 'calm', 'nortada_windy', 'atlantic_swell'])
    .default('live'),
});

export const Step4OutputSchema = z.object({
  answer: z.string(),
  autonomousToolsCalled: z.array(ToolCallTraceSchema),
  weatherScenarioUsed: z.string(),
});

export const step04_agenticRagFlow = ai.defineFlow(
  {
    name: 'step04_agenticRagFlow',
    inputSchema: Step4InputSchema,
    outputSchema: Step4OutputSchema,
  },
  async (input) => {
    const prevMode = process.env.WEATHER_MODE;
    process.env.WEATHER_MODE = input.weatherScenario as WeatherScenarioMode;

    try {
      const result = await generateWithToolsResilient({
        system: AGENTIC_RAG_SYSTEM_PROMPT,
        prompt: input.question,
        tools: [
          searchLagosKnowledge,
          getLagosWeatherAndMarine,
          findLagosTours,
        ],
        maxTurns: 5,
        temperature: 0.2,
      });

      return {
        answer: result.text,
        autonomousToolsCalled: result.toolTraces,
        weatherScenarioUsed: input.weatherScenario,
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

export async function runStep04() {
  const weatherScenario =
    (process.argv[3] as WeatherScenarioMode | undefined) || 'live';
  const question =
    process.argv[4] ||
    'Tell me the history of the 1913 Ponta da Piedade lighthouse and the cave called A Cozinha. Also, check the live weather right now—can we take a kayak tour to see it today, or what tour do you recommend instead?';

  console.log('\n====================================================================');
  console.log(' 🟧 STEP 4: Autonomous Agentic RAG (Vector DB Tool + Live Weather)');
  console.log('====================================================================');
  console.log(` Local Model    : ollama/${GEMMA_MODEL}`);
  console.log(
    ' Equipped Tools : [searchLagosKnowledge, getLagosWeatherAndMarine, findLagosTours]'
  );
  console.log(` Weather Mode   : ${weatherScenario.toUpperCase()}`);
  console.log(` Visitor Prompt : "${question}"`);
  console.log('--------------------------------------------------------------------');
  console.log(
    '⏳ Gemma 4 is autonomously planning & executing vector RAG + live API tools...'
  );

  const startTime = Date.now();
  const res = await step04_agenticRagFlow({
    question,
    weatherScenario,
  });
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log(
    `\n🔧 Autonomous Tool Execution Trace (${res.autonomousToolsCalled.length} tool calls):`
  );
  for (const trace of res.autonomousToolsCalled) {
    console.log(`   ├─ 🛠️  ${trace.toolName}(${JSON.stringify(trace.input)})`);
    console.log(`   │      ↳ ${trace.outputPreview}`);
  }

  console.log(`\n⛵ Capitão Gil's Synthesized Response (${elapsed}s):\n`);
  console.log(res.answer);
  console.log('\n--------------------------------------------------------------------');
  console.log('💡 Key Takeaway:');
  console.log('   In Agentic RAG, Gemma 4 autonomously decided to query the local');
  console.log('   vector DB (`searchLagosKnowledge`) for Ponta da Piedade history');
  console.log('   AND invoke `getLagosWeatherAndMarine` before recommending a tour!');
  console.log('   👉 Next: Run `npm run step 5` for Production Multi-Turn & CLI!');
  console.log('====================================================================\n');
}

const isMain =
  process.argv[1] &&
  fileURLToPath(import.meta.url) === process.argv[1] &&
  process.env.GENKIT_ENV !== 'dev';
if (isMain) {
  runStep04().catch((err) => {
    console.error('\n❌ Step 4 Error:', err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
