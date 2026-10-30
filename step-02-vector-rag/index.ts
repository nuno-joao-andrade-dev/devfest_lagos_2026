import 'dotenv/config';
import { fileURLToPath } from 'node:url';
import { z } from 'genkit';
import {
  ai,
  EMBEDDING_MODEL,
  gemmaModel,
  GEMMA_MODEL,
  lagosIndexer,
  lagosRetriever,
} from '../src/config/genkit.js';
import {
  isVectorStorePopulated,
  loadLagosGenkitDocuments,
  VECTOR_DB_FILE,
} from '../src/lib/knowledge-loader.js';

/**
 * ============================================================================
 * STEP 2: Local Vector Database & RAG Pipeline (`@genkit-ai/dev-local-vectorstore`)
 * ============================================================================
 * Run this step directly with:
 *   npm run step 2   (or: npm run step2)
 */

export const IndexKnowledgeOutputSchema = z.object({
  indexedChunksCount: z.number(),
  vectorStoreFile: z.string(),
  sampleSources: z.array(z.string()),
  message: z.string(),
});

export const step02_indexLagosKnowledge = ai.defineFlow(
  {
    name: 'step02_indexLagosKnowledge',
    inputSchema: z.object({
      forceReindex: z.boolean().default(false),
    }),
    outputSchema: IndexKnowledgeOutputSchema,
  },
  async () => {
    const documents = loadLagosGenkitDocuments();

    await ai.index({
      indexer: lagosIndexer,
      documents,
    });

    const uniqueSources = Array.from(
      new Set(
        documents.map((doc) => String(doc.metadata?.sourceFile || 'unknown'))
      )
    );

    return {
      indexedChunksCount: documents.length,
      vectorStoreFile: VECTOR_DB_FILE,
      sampleSources: uniqueSources,
      message: `Successfully embedded and indexed ${documents.length} Lagos knowledge chunks into ${VECTOR_DB_FILE}.`,
    };
  }
);

export const RagQueryInputSchema = z.object({
  question: z
    .string()
    .default(
      'Why was the 1913 Ponta da Piedade lighthouse delayed for 30 years, what are the fishermen names of the sea caves, and what is the DevFest Lagos 2026 secret passphrase?'
    )
    .describe('Historical or local question about Lagos & Ponta da Piedade'),
  topK: z.number().int().min(1).max(8).default(3),
});

export const RagQueryOutputSchema = z.object({
  answer: z.string(),
  retrievedSources: z.array(
    z.object({
      id: z.string(),
      sectionTitle: z.string(),
      preview: z.string(),
    })
  ),
});

export const step02_ragLagosHistory = ai.defineFlow(
  {
    name: 'step02_ragLagosHistory',
    inputSchema: RagQueryInputSchema,
    outputSchema: RagQueryOutputSchema,
  },
  async (input) => {
    if (!isVectorStorePopulated()) {
      const documents = loadLagosGenkitDocuments();
      await ai.index({
        indexer: lagosIndexer,
        documents,
      });
    }

    // 1. Retrieve semantically relevant documents from our local vector store
    const retrievedDocs = await ai.retrieve({
      retriever: lagosRetriever,
      query: input.question,
      options: {
        k: input.topK,
      },
    });

    // 2. Pass the retrieved documents (`docs`) directly to `ai.generate()`
    const response = await ai.generate({
      model: gemmaModel,
      docs: retrievedDocs,
      system: [
        'You are Capitão Gil, a local historian and tourism guide in Lagos, Portugal.',
        'Answer the user question ONLY using facts from the provided context documents.',
        'Cite specific local names (such as Ermida de Nossa Senhora da Piedade, A Cozinha, A Catedral, Gil Eanes, Dom Rodrigo, or the DevFest passphrase) when relevant.',
      ].join(' '),
      prompt: input.question,
      config: {
        temperature: 0.2,
      },
    });

    return {
      answer: response.text,
      retrievedSources: retrievedDocs.map((doc) => ({
        id: String(doc.metadata?.id || 'chunk'),
        sectionTitle: String(doc.metadata?.sectionTitle || 'Lagos Knowledge'),
        preview: doc.text.slice(0, 180).replace(/\s+/g, ' ') + '...',
      })),
    };
  }
);

export async function runStep02() {
  const question =
    process.argv[3] ||
    'Why was the 1913 Ponta da Piedade lighthouse delayed for decades, what are the famous named grottos and rock formations, and what is the DevFest Lagos 2026 secret passphrase?';

  console.log('\n====================================================================');
  console.log(' 🟩 STEP 2: Local Vector Database & RAG Pipeline');
  console.log('====================================================================');
  console.log(` Local Model    : ollama/${GEMMA_MODEL}`);
  console.log(` Local Embedder : ${EMBEDDING_MODEL} (via @genkit-ai/dev-local-vectorstore)`);
  console.log(` Vector DB File : ${VECTOR_DB_FILE}`);
  console.log('--------------------------------------------------------------------');

  console.log('📚 [1/2] Indexing hyper-local Lagos Markdown documents into Vector Store...');
  const indexRes = await step02_indexLagosKnowledge({ forceReindex: false });
  console.log(
    `   ✅ Indexed ${indexRes.indexedChunksCount} semantic chunks from: ${indexRes.sampleSources.join(', ')}`
  );

  console.log(`\n🔍 [2/2] Retrieving Top-4 Vector Chunks & Generating Grounded Answer...`);
  console.log(`   Query: "${question}"`);
  const startTime = Date.now();
  const ragRes = await step02_ragLagosHistory({ question, topK: 4 });
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log(`\n📄 Retrieved Vector Chunks (${ragRes.retrievedSources.length}):`);
  for (const src of ragRes.retrievedSources) {
    console.log(`   ├─ [${src.id}] "${src.sectionTitle}"`);
    console.log(`   │    ${src.preview}`);
  }

  console.log(`\n💬 Grounded RAG Answer (${elapsed}s):\n${ragRes.answer}`);
  console.log('\n--------------------------------------------------------------------');
  console.log('💡 Key Takeaway:');
  console.log('   Local Vector RAG grounds Gemma in authentic Lagos history and');
  console.log('   verifies the secret passphrase ("CARAVELA-GEMMA-2026")!');
  console.log('   👉 Next: Run `npm run step 3` to give Gemma live TypeScript tools!');
  console.log('====================================================================\n');
}

const isMain =
  process.argv[1] &&
  fileURLToPath(import.meta.url) === process.argv[1] &&
  process.env.GENKIT_ENV !== 'dev';
if (isMain) {
  runStep02().catch((err) => {
    console.error('\n❌ Step 2 Error:', err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
