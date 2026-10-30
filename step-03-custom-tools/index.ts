import 'dotenv/config';
import { fileURLToPath } from 'node:url';
import { z } from 'genkit';
import { ai, GEMMA_MODEL } from '../src/config/genkit.js';
import {
  fetchLagosWeatherAndMarine,
  LagosWeatherReportSchema,
  WeatherScenarioMode,
} from '../src/lib/weather-service.js';
import { searchLagosTours, TourCategorySchema } from '../src/lib/tour-service.js';
import {
  generateWithToolsResilient,
  ToolCallTraceSchema,
} from '../src/lib/tool-execution-helper.js';

/**
 * ============================================================================
 * STEP 3: Equipping Local Gemma 4 with Custom TypeScript Tools (`ai.defineTool`)
 * ============================================================================
 * Run this step directly with:
 *   npm run step 3   (or: npm run step3)
 */

/**
 * TOOL 1: Live Weather & Atlantic Marine Conditions for Lagos / Ponta da Piedade
 */
export const getLagosWeatherAndMarine = ai.defineTool(
  {
    name: 'getLagosWeatherAndMarine',
    description:
      'Fetches live weather, wind speed, Nortada wind gusts, and Atlantic wave height/swell for Ponta da Piedade and Lagos beaches. MUST be called before recommending any kayak tour, boat trip, or outdoor coastal activity.',
    inputSchema: z.object({
      coastalSpot: z
        .enum([
          'ponta_da_piedade',
          'praia_da_batata',
          'marina_de_lagos',
          'praia_do_camilo',
        ])
        .optional()
        .describe(
          'Specific Lagos coastal location to check (defaults to ponta_da_piedade)'
        ),
    }),
    outputSchema: LagosWeatherReportSchema,
  },
  async (input) => {
    return await fetchLagosWeatherAndMarine({
      coastalSpot: input.coastalSpot || 'ponta_da_piedade',
    });
  }
);

/**
 * TOOL 2: Local Lagos Tour & Activity Finder
 */
export const findLagosTours = ai.defineTool(
  {
    name: 'findLagosTours',
    description:
      'Finds local tours and activities in Lagos, Portugal (kayak cave tours, grotto boats, Passadiços cliff boardwalk walks, and Old Town cultural/gastronomy walks) and checks if they are safe under current wind and wave conditions.',
    inputSchema: z.object({
      category: TourCategorySchema.optional().describe(
        'Filter by tour category: all, kayak, boat, land_outdoor, or culture_indoor'
      ),
      currentWindKmh: z
        .number()
        .optional()
        .describe('Current wind speed in km/h from getLagosWeatherAndMarine'),
      currentWaveMeters: z
        .number()
        .optional()
        .describe(
          'Current Atlantic wave height in meters from getLagosWeatherAndMarine'
        ),
      onlySafeTours: z
        .boolean()
        .optional()
        .describe('If true, only returns tours safe for current sea conditions'),
    }),
    outputSchema: z.object({
      matchingToursCount: z.number(),
      tours: z.array(z.record(z.unknown())),
    }),
  },
  async (input) => {
    const tours = searchLagosTours({
      category: input.category || 'all',
      currentWindKmh: input.currentWindKmh,
      currentWaveMeters: input.currentWaveMeters,
      onlySafeTours: input.onlySafeTours,
    });
    return {
      matchingToursCount: tours.length,
      tours,
    };
  }
);

export const Step3InputSchema = z.object({
  userRequest: z
    .string()
    .default(
      'We want to book a kayak tour to explore the Ponta da Piedade sea caves today. Check the weather and sea conditions right now and tell us which tour we should book!'
    ),
  weatherScenario: z
    .enum(['live', 'calm', 'nortada_windy', 'atlantic_swell'])
    .default('live'),
});

export const Step3OutputSchema = z.object({
  weatherScenarioTested: z.string(),
  toolsInvoked: z.array(ToolCallTraceSchema),
  recommendation: z.string(),
});

export const step03_weatherAndTourAdvisor = ai.defineFlow(
  {
    name: 'step03_weatherAndTourAdvisor',
    inputSchema: Step3InputSchema,
    outputSchema: Step3OutputSchema,
  },
  async (input) => {
    const prevMode = process.env.WEATHER_MODE;
    process.env.WEATHER_MODE = input.weatherScenario as WeatherScenarioMode;

    try {
      const result = await generateWithToolsResilient({
        system: [
          'You are Capitão Gil, an autonomous coastal safety and tour advisor in Lagos, Portugal.',
          'Before recommending any kayak or boat tour at Ponta da Piedade:',
          '1. Always call `getLagosWeatherAndMarine` to inspect live wind speed, gusts, and Atlantic wave height.',
          '2. Call `findLagosTours` to find appropriate tours (pass the current wind speed and wave height so unsafe sea tours are flagged).',
          '3. If kayakSafetyStatus is UNSAFE_CAVES_CLOSED, strictly warn the visitor NOT to kayak and recommend a safe land alternative such as the Passadiços da Ponta da Piedade cliff boardwalk or the Age of Discoveries & Dom Rodrigo cultural walk.',
        ].join('\n'),
        prompt: input.userRequest,
        tools: [getLagosWeatherAndMarine, findLagosTours],
        maxTurns: 5,
      });

      return {
        weatherScenarioTested: input.weatherScenario,
        toolsInvoked: result.toolTraces,
        recommendation: result.text,
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

export async function runStep03() {
  const userRequest =
    'We want to book a kayak tour to explore the Ponta da Piedade sea caves today. Check the weather and sea conditions right now and tell us which tour we should book!';

  const scenarioArg = process.argv[3] as WeatherScenarioMode | undefined;
  const scenariosToRun: WeatherScenarioMode[] = scenarioArg
    ? [scenarioArg]
    : ['live', 'nortada_windy'];

  console.log('\n====================================================================');
  console.log(' 🟨 STEP 3: Equipping Local Gemma 4 with Custom TypeScript Tools');
  console.log('====================================================================');
  console.log(` Local Model    : ollama/${GEMMA_MODEL}`);
  console.log(' Equipped Tools : [getLagosWeatherAndMarine, findLagosTours]');
  console.log(` User Request   : "${userRequest}"`);
  console.log('--------------------------------------------------------------------');

  for (const scenario of scenariosToRun) {
    console.log(`\n🌊 Running Scenario: [${scenario.toUpperCase()}]...`);
    const startTime = Date.now();
    const res = await step03_weatherAndTourAdvisor({
      userRequest,
      weatherScenario: scenario,
    });
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log(`🔧 Tools Autonomously Called by Gemma (${res.toolsInvoked.length}):`);
    for (const trace of res.toolsInvoked) {
      console.log(`   ├─ 🛠️  ${trace.toolName}(${JSON.stringify(trace.input)})`);
      console.log(`   │      ↳ ${trace.outputPreview}`);
    }
    console.log(`\n⛵ Capitão Gil's Recommendation [${scenario}] (${elapsed}s):`);
    console.log(res.recommendation);
    console.log('--------------------------------------------------------------------');
  }

  console.log('💡 Key Takeaway:');
  console.log('   Gemma 4 autonomously calls TypeScript functions to inspect live');
  console.log('   Atlantic wave height & Nortada winds before recommending a kayak tour!');
  console.log('   👉 Next: Run `npm run step 4` to combine Vector RAG + Live Tools!');
  console.log('====================================================================\n');
}

const isMain =
  process.argv[1] &&
  fileURLToPath(import.meta.url) === process.argv[1] &&
  process.env.GENKIT_ENV !== 'dev';
if (isMain) {
  runStep03().catch((err) => {
    console.error('\n❌ Step 3 Error:', err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
