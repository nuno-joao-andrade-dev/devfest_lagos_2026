import 'dotenv/config';
import { embedderRef, genkit } from 'genkit';
import { ollama } from 'genkitx-ollama';
import {
  devLocalIndexerRef,
  devLocalRetrieverRef,
  devLocalVectorstore,
} from '@genkit-ai/dev-local-vectorstore';

/**
 * Local Ollama server URL (defaults to standard localhost port 11434).
 */
export const OLLAMA_SERVER_ADDRESS =
  process.env.OLLAMA_SERVER_ADDRESS || 'http://127.0.0.1:11434';

/**
 * Default local Gemma model tag in Ollama.
 * - gemma4:e2b : Recommended default for workshop laptops (Gemma 4 E2B, ultra-fast with native tool calling)
 * - gemma4:e4b : Optional larger Gemma 4 variant for stronger machines
 */
export const GEMMA_MODEL = process.env.GEMMA_MODEL || 'gemma4:e2b';

/**
 * Local embedding model in Ollama used to vectorize and retrieve Lagos knowledge.
 */
export const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || 'nomic-embed-text';

/**
 * Name of the local JSON vector database file (__db_lagos_tourism.json).
 */
export const LAGOS_INDEX_NAME = 'lagos_tourism';

/**
 * Reference to our resilient local embedder (uses Ollama `nomic-embed-text` when pulled,
 * or automatically falls back to a built-in 768-dim local feature embedder so
 * `@genkit-ai/dev-local-vectorstore` works even when only `gemma4:e2b` is installed).
 */
export const gemmaEmbedder = embedderRef({
  name: 'lagos/local-embedder',
});

/**
 * Shared Genkit instance configured for 100% local execution with Ollama + Gemma 4
 * and a local file-backed vector store.
 */
export const ai = genkit({
  plugins: [
    ollama({
      serverAddress: OLLAMA_SERVER_ADDRESS,
      models: [
        {
          name: GEMMA_MODEL,
          type: 'chat',
          // CRITICAL: Tell Genkit that this Ollama model supports tool calling!
          supports: {
            tools: true,
          },
        },
      ],
      embedders: [
        {
          name: EMBEDDING_MODEL,
          dimensions: 768,
        },
      ],
    }),
    devLocalVectorstore([
      {
        indexName: LAGOS_INDEX_NAME,
        embedder: gemmaEmbedder,
      },
    ]),
  ],
});

/**
 * Deterministic 768-dimensional local text embedder (character trigram + word unigram/bigram hashing
 * with L2 normalization for cosine similarity). Used automatically if `nomic-embed-text` is not yet
 * pulled in Ollama so workshop attendees can run Vector RAG with only `gemma4:e2b` installed!
 */
const STOP_WORDS = new Set([
  'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'any', 'can', 'had',
  'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how',
  'man', 'new', 'now', 'old', 'see', 'two', 'way', 'who', 'boy', 'did', 'its',
  'let', 'put', 'say', 'she', 'too', 'use', 'what', 'why', 'where', 'when',
  'which', 'with', 'from', 'that', 'this', 'these', 'those', 'into', 'over',
  'after', 'before', 'about', 'between', 'through', 'during', 'under', 'again',
  'further', 'then', 'once', 'here', 'there', 'both', 'each', 'few', 'more',
  'most', 'other', 'some', 'such', 'only', 'own', 'same', 'than', 'very',
  'will', 'just', 'should', 'section', 'document', 'source',
]);

function computeLocal768Embedding(text: string): number[] {
  const dims = 768;
  const vec = new Float64Array(dims);
  const cleaned = text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ');

  const words = cleaned
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !STOP_WORDS.has(w));

  const hashToken = (token: string, weight: number) => {
    let h1 = 2166136261;
    let h2 = 16777619;
    for (let i = 0; i < token.length; i++) {
      const ch = token.charCodeAt(i);
      h1 ^= ch;
      h1 = Math.imul(h1, 16777619);
      h2 ^= ch;
      h2 = Math.imul(h2, 1099511628211 & 0xffffffff);
    }
    const idx = Math.abs(h1) % dims;
    const sign = (h2 & 1) === 0 ? 1 : -1;
    vec[idx] += sign * weight;
  };

  // Sublinear term frequency (1 + ln(tf)) so long chunks don't drown out specific keywords
  const wordCounts = new Map<string, number>();
  for (const w of words) {
    wordCounts.set(w, (wordCounts.get(w) || 0) + 1);
  }

  for (const [w, count] of wordCounts.entries()) {
    const tfWeight = 1 + Math.log(count);
    const idfBoost = w === 'lagos' || w === 'ponta' || w === 'piedade' ? 0.8 : 3.0;
    hashToken(`w:${w}`, tfWeight * idfBoost);
    for (let j = 0; j + 4 <= w.length; j++) {
      hashToken(`ng:${w.slice(j, j + 4)}`, 0.6);
    }
  }

  for (let i = 0; i + 1 < words.length; i++) {
    hashToken(`bg:${words[i]}_${words[i + 1]}`, 2.5);
  }

  let normSq = 0;
  for (let i = 0; i < dims; i++) {
    normSq += vec[i] * vec[i];
  }
  const norm = Math.sqrt(normSq) || 1;
  return Array.from(vec, (v) => Number((v / norm).toFixed(6)));
}

ai.defineEmbedder(
  {
    name: 'lagos/local-embedder',
    info: {
      label: `Lagos Local Embedder (Ollama ${EMBEDDING_MODEL} with built-in 768d fallback)`,
      dimensions: 768,
      supports: {
        input: ['text'],
      },
    },
  },
  async (input) => {
    try {
      const response = await fetch(`${OLLAMA_SERVER_ADDRESS}/api/embed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: EMBEDDING_MODEL,
          input: input.map((doc) => doc.text),
        }),
        signal: AbortSignal.timeout(4000),
      });

      if (response.ok) {
        const payload = (await response.json()) as { embeddings?: number[][] };
        if (payload.embeddings && payload.embeddings.length === input.length) {
          return {
            embeddings: payload.embeddings.map((embedding) => ({ embedding })),
          };
        }
      }
    } catch {
      // Fallback to built-in 768-dim cosine similarity embedder
    }

    return {
      embeddings: input.map((doc) => ({
        embedding: computeLocal768Embedding(doc.text),
      })),
    };
  }
);

/**
 * Typed references to our local Gemma model and local vector store.
 */
export const gemmaModel = ollama.model(GEMMA_MODEL);
export const lagosIndexer = devLocalIndexerRef(LAGOS_INDEX_NAME);
export const lagosRetriever = devLocalRetrieverRef(LAGOS_INDEX_NAME);
