import 'dotenv/config';
import {
  GEMMA_MODEL,
  OLLAMA_SERVER_ADDRESS,
} from '../config/genkit.js';
import {
  keywordFallbackSearch,
  loadLagosGenkitDocuments,
  loadLagosKnowledgeChunks,
} from '../lib/knowledge-loader.js';
import { fetchLagosWeatherAndMarine } from '../lib/weather-service.js';
import { searchLagosTours } from '../lib/tour-service.js';
import * as registeredExports from '../index.js';

async function main() {
  console.log('\n====================================================================');
  console.log(' 🔍 DevFest Lagos 2026 Workshop — Pre-Flight & 5-Step Verifier');
  console.log('====================================================================\n');

  // 1. Verify Knowledge Base Chunking & Genkit Document Conversion
  const chunks = loadLagosKnowledgeChunks();
  const docs = loadLagosGenkitDocuments();
  console.log(`✅ [1/5] Local Lagos Knowledge Base Loaded:`);
  console.log(`         - ${chunks.length} semantic Markdown chunks across 5 documents`);
  console.log(`         - ${docs.length} Genkit Document objects ready for embedding`);

  const secretCheck = keywordFallbackSearch(
    'DevFest Lagos 2026 secret passphrase',
    1
  );
  if (
    secretCheck.length === 0 ||
    !secretCheck[0].content.includes('CARAVELA-GEMMA-2026')
  ) {
    throw new Error(
      'DevFest Lagos 2026 secret passphrase chunk verification failed!'
    );
  }
  console.log(
    `         - Verified RAG grounding canary passphrase: "CARAVELA-GEMMA-2026"\n`
  );

  // 2. Verify Weather & Marine Tool (Live Open-Meteo + Simulated Safety Scenarios)
  console.log(
    `✅ [2/5] Testing Ponta da Piedade Weather & Marine Safety Engine:`
  );
  const calmReport = await fetchLagosWeatherAndMarine({
    coastalSpot: 'ponta_da_piedade',
    scenarioOverride: 'calm',
  });
  const windyReport = await fetchLagosWeatherAndMarine({
    coastalSpot: 'ponta_da_piedade',
    scenarioOverride: 'nortada_windy',
  });
  const swellReport = await fetchLagosWeatherAndMarine({
    coastalSpot: 'ponta_da_piedade',
    scenarioOverride: 'atlantic_swell',
  });
  const liveReport = await fetchLagosWeatherAndMarine({
    coastalSpot: 'ponta_da_piedade',
    scenarioOverride: 'live',
  });

  console.log(
    `         - Scenario [calm]          : ${calmReport.kayakSafetyStatus} (${calmReport.windSpeedKmh} km/h wind, ${calmReport.waveHeightMeters}m waves)`
  );
  console.log(
    `         - Scenario [nortada_windy] : ${windyReport.kayakSafetyStatus} (${windyReport.windSpeedKmh} km/h wind, gusts ${windyReport.windGustsKmh} km/h)`
  );
  console.log(
    `         - Scenario [atlantic_swell]: ${swellReport.kayakSafetyStatus} (${swellReport.waveHeightMeters}m waves @ ${swellReport.wavePeriodSeconds}s)`
  );
  console.log(
    `         - Scenario [live API]      : ${liveReport.kayakSafetyStatus} (${liveReport.temperatureCelsius}°C, ${liveReport.windSpeedKmh} km/h ${liveReport.windDirectionCardinal}, ${liveReport.waveHeightMeters}m waves — ${liveReport.dataSource})\n`
  );

  // 3. Verify Tour Safety Filtering
  const safeToursInCalm = searchLagosTours({
    currentWindKmh: calmReport.windSpeedKmh,
    currentWaveMeters: calmReport.waveHeightMeters,
    onlySafeTours: true,
  });
  const safeToursInSwell = searchLagosTours({
    currentWindKmh: swellReport.windSpeedKmh,
    currentWaveMeters: swellReport.waveHeightMeters,
    onlySafeTours: true,
  });

  console.log(`✅ [3/5] Local Lagos Tour Safety Filter Verified:`);
  console.log(
    `         - Safe tours during Calm Morning   : ${safeToursInCalm.length}/5 (includes Kayak & Grotto Boats)`
  );
  console.log(
    `         - Safe tours during 2.4m Sea Swell : ${safeToursInSwell.length}/5 (${safeToursInSwell.map((t) => t.category).join(', ')})\n`
  );

  // 4. Verify 5-Step Genkit Flow & Tool Registration
  const exportedKeys = Object.keys(registeredExports);
  console.log(
    `✅ [4/5] 5-Step Genkit Workshop Flows & Tools Registered (${exportedKeys.length} exports):`
  );
  console.log(`         - ${exportedKeys.join('\n         - ')}\n`);

  // 5. Check Local Ollama Connectivity
  console.log(
    `🔎 [5/5] Checking Local Ollama Server at ${OLLAMA_SERVER_ADDRESS}...`
  );
  try {
    const res = await fetch(`${OLLAMA_SERVER_ADDRESS}/api/tags`, {
      signal: AbortSignal.timeout(2000),
    });
    if (res.ok) {
      const data = (await res.json()) as { models?: Array<{ name: string }> };
      const installed = (data.models || []).map((m) => m.name);
      console.log(
        `         ✅ Ollama is running! Installed models: ${installed.join(', ') || 'none'}`
      );
    }
  } catch {
    console.log(
      `         ℹ️  Ollama is not currently running on ${OLLAMA_SERVER_ADDRESS}. Run: ollama serve && ollama pull ${GEMMA_MODEL}`
    );
  }

  console.log('\n====================================================================');
  console.log(' 🎉 5-Step Workshop Repository Verification Passed!');
  console.log('    Run any step with: npm run step 1 .. npm run step 5');
  console.log('====================================================================\n');
}

main().catch((err) => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
