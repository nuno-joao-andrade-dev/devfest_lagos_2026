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
} from './index.js';

/**
 * ============================================================================
 * STEP 2 — Genkit Developer UI Playground (`genkit start`)
 * ============================================================================
 * Launches the Genkit Reflection Server for Step 2 so you can test the local
 * `ollama/gemma4:e2b` model, the `devLocalVectorstore/lagos_tourism` retriever,
 * and the `step02_ragLagosHistory` flow directly in the Genkit Developer UI
 * (http://localhost:4000) instead of the terminal app.
 *
 * Launch with:
 *   npm run step 2 ui
 *   (or: npm run step2:ui / npm run rag:ui)
 */

async function bootstrapStep02GenkitUi() {
  // Ensure the local vector store (__db_lagos_tourism.json) is populated on boot
  // so the "Retrievers" tab in the Genkit UI works immediately.
  if (!isVectorStorePopulated()) {
    const documents = loadLagosGenkitDocuments();
    await ai.index({
      indexer: lagosIndexer,
      documents,
    });
  }

  console.log('\n====================================================================');
  console.log(' 🧪 STEP 2: Genkit Developer UI — Test RAG & Local Model Directly');
  console.log('====================================================================');
  console.log(` 🌐 Genkit UI URL    : http://localhost:4000`);
  console.log(` 🤖 Local Model      : ollama/${GEMMA_MODEL} (${OLLAMA_SERVER_ADDRESS})`);
  console.log(` 🧭 Vector Retriever : devLocalVectorstore/lagos_tourism`);
  console.log(` 🗄️  Vector DB File   : ${VECTOR_DB_FILE}`);
  console.log(` 🧬 Embedder         : ${EMBEDDING_MODEL} (with 768d local fallback)`);
  console.log('--------------------------------------------------------------------');
  console.log(' What to test directly in http://localhost:4000:');
  console.log('  1️⃣  [Models]     -> Select "ollama/' + GEMMA_MODEL + '"');
  console.log('      Test raw prompts directly on the model without RAG context.');
  console.log('  2️⃣  [Retrievers] -> Select "devLocalVectorstore/lagos_tourism"');
  console.log('      Test semantic vector search directly (e.g. query: "1913 lighthouse"');
  console.log('      or "DevFest Lagos 2026 passphrase") and inspect top-K chunks.');
  console.log('  3️⃣  [Flows]      -> Select "step02_ragLagosHistory"');
  console.log('      Run the RAG pipeline and inspect the full trace step-by-step.');
  console.log('====================================================================\n');
}

bootstrapStep02GenkitUi().catch((err) => {
  console.error('⚠️ Could not pre-check vector store:', err);
});

export { step02_indexLagosKnowledge, step02_ragLagosHistory };
