import 'dotenv/config';
import {
  EMBEDDING_MODEL,
  GEMMA_MODEL,
  lagosIndexer,
  OLLAMA_SERVER_ADDRESS,
  ai,
} from '../src/config/genkit.js';
import {
  isVectorStorePopulated,
  loadLagosGenkitDocuments,
  VECTOR_DB_FILE,
} from '../src/lib/knowledge-loader.js';
import {
  step02_indexLagosKnowledge,
  step02_ragLagosHistory,
} from '../step-02-vector-rag/index.js';
import {
  findLagosTours,
  getLagosWeatherAndMarine,
} from '../step-03-custom-tools/index.js';
import {
  searchLagosKnowledge,
  step04_agenticRagFlow,
} from './index.js';

/**
 * ============================================================================
 * STEP 4 — Genkit Developer UI Playground (`genkit start`)
 * ============================================================================
 * Launches the Genkit Reflection Server for Step 4 so you can test the
 * `searchLagosKnowledge` RAG tool, Weather & Tour tools, the local
 * `ollama/gemma4:e2b` model, and `step04_agenticRagFlow` directly in the
 * Genkit Developer UI (http://localhost:4000).
 *
 * Launch with:
 *   npm run step 4 ui
 *   (or: npm run step4:ui)
 */

async function bootstrapStep04GenkitUi() {
  if (!isVectorStorePopulated()) {
    const documents = loadLagosGenkitDocuments();
    await ai.index({
      indexer: lagosIndexer,
      documents,
    });
  }

  console.log('\n====================================================================');
  console.log(' 🧪 STEP 4: Genkit Developer UI — Test Agentic RAG & Model Directly');
  console.log('====================================================================');
  console.log(` 🌐 Genkit UI URL    : http://localhost:4000`);
  console.log(` 🤖 Local Model      : ollama/${GEMMA_MODEL} (${OLLAMA_SERVER_ADDRESS})`);
  console.log(` 🛠️  Registered Tools : searchLagosKnowledge, getLagosWeatherAndMarine, findLagosTours`);
  console.log(` 🧭 Vector Retriever : devLocalVectorstore/lagos_tourism (${VECTOR_DB_FILE})`);
  console.log(` 🧬 Embedder         : ${EMBEDDING_MODEL} (with 768d local fallback)`);
  console.log('--------------------------------------------------------------------');
  console.log(' What to test directly in http://localhost:4000:');
  console.log('  1️⃣  [Tools]      -> Select "searchLagosKnowledge"');
  console.log('      Test the RAG vector tool directly with {"query": "1913 lighthouse", "topK": 3}');
  console.log('  2️⃣  [Models]     -> Select "ollama/' + GEMMA_MODEL + '"');
  console.log('      Attach tools directly in the Model Playground and test tool calling.');
  console.log('  3️⃣  [Flows]      -> Select "step04_agenticRagFlow"');
  console.log('      Run the full Agentic RAG flow and inspect the multi-tool trace.');
  console.log('====================================================================\n');
}

bootstrapStep04GenkitUi().catch((err) => {
  console.error('⚠️ Could not pre-check vector store:', err);
});

export {
  step02_indexLagosKnowledge,
  step02_ragLagosHistory,
  getLagosWeatherAndMarine,
  findLagosTours,
  searchLagosKnowledge,
  step04_agenticRagFlow,
};
