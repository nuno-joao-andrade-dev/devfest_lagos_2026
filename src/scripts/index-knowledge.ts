import 'dotenv/config';
import {
  EMBEDDING_MODEL,
  OLLAMA_SERVER_ADDRESS,
} from '../config/genkit.js';
import {
  loadLagosKnowledgeChunks,
  VECTOR_DB_FILE,
} from '../lib/knowledge-loader.js';
import { step02_indexLagosKnowledge } from '../../step-02-vector-rag/index.js';

async function main() {
  console.log('\n============================================================');
  console.log(' Indexing Lagos Knowledge Base into Local Vector Store');
  console.log('============================================================');

  const chunks = loadLagosKnowledgeChunks();
  console.log(
    `Loaded ${chunks.length} semantic Markdown chunks from data/lagos-knowledge/:`
  );
  for (const chunk of chunks) {
    console.log(
      `  - [${chunk.id}] ${chunk.documentTitle} -> "${chunk.sectionTitle}"`
    );
  }

  console.log(
    `\nEmbedding chunks via Ollama (${OLLAMA_SERVER_ADDRESS}) using '${EMBEDDING_MODEL}' (or local 768d fallback)...`
  );

  const result = await step02_indexLagosKnowledge({ forceReindex: true });
  console.log('\n✅ Vector Store Indexing Complete!');
  console.log(`   Chunks Indexed : ${result.indexedChunksCount}`);
  console.log(`   Database File  : ${VECTOR_DB_FILE}`);
  console.log(`   Source Files   : ${result.sampleSources.join(', ')}\n`);
}

main().catch((err) => {
  console.error('\n❌ Indexing failed:', err);
  process.exit(1);
});
