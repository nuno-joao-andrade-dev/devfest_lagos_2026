import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Document } from 'genkit';
import { LAGOS_INDEX_NAME } from '../config/genkit.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const KNOWLEDGE_DIR = path.resolve(
  __dirname,
  '../../data/lagos-knowledge'
);

export const VECTOR_DB_FILE = path.resolve(
  process.cwd(),
  `__db_${LAGOS_INDEX_NAME}.json`
);

export interface KnowledgeChunk {
  id: string;
  sourceFile: string;
  documentTitle: string;
  sectionTitle: string;
  content: string;
}

/**
 * Reads all Markdown files in `data/lagos-knowledge/` and splits them by `## `
 * section headers into semantic chunks with rich metadata.
 */
export function loadLagosKnowledgeChunks(): KnowledgeChunk[] {
  if (!fs.existsSync(KNOWLEDGE_DIR)) {
    throw new Error(`Knowledge directory not found at: ${KNOWLEDGE_DIR}`);
  }

  const files = fs
    .readdirSync(KNOWLEDGE_DIR)
    .filter((file) => file.endsWith('.md'))
    .sort();

  const chunks: KnowledgeChunk[] = [];

  for (const file of files) {
    const fullPath = path.join(KNOWLEDGE_DIR, file);
    const rawMarkdown = fs.readFileSync(fullPath, 'utf-8').trim();

    // Extract H1 document title
    const titleMatch = rawMarkdown.match(/^#\s+(.+)$/m);
    const documentTitle = titleMatch ? titleMatch[1].trim() : file;

    // Split by H2 sections (`## Section Name`)
    const sections = rawMarkdown.split(/\n(?=##\s+)/);

    for (let i = 0; i < sections.length; i++) {
      const sectionRaw = sections[i].trim();
      if (!sectionRaw) continue;

      const h2Match = sectionRaw.match(/^##\s+(.+)$/m);
      const sectionTitle = h2Match ? h2Match[1].trim() : 'Overview';

      // Prefix chunk text with document & section title so embeddings capture full context
      const formattedContent = [
        `Document: ${documentTitle}`,
        `Section: ${sectionTitle}`,
        `Source: ${file}`,
        '',
        sectionRaw,
      ].join('\n');

      chunks.push({
        id: `${file}#section-${i + 1}`,
        sourceFile: file,
        documentTitle,
        sectionTitle,
        content: formattedContent,
      });
    }
  }

  return chunks;
}

/**
 * Converts our structured Lagos knowledge chunks into Genkit `Document` objects
 * ready for `ai.index()` with `@genkit-ai/dev-local-vectorstore`.
 */
export function loadLagosGenkitDocuments(): Document[] {
  const chunks = loadLagosKnowledgeChunks();
  return chunks.map((chunk) =>
    Document.fromText(chunk.content, {
      id: chunk.id,
      sourceFile: chunk.sourceFile,
      documentTitle: chunk.documentTitle,
      sectionTitle: chunk.sectionTitle,
    })
  );
}

/**
 * Checks whether the local vector database file (`__db_lagos_tourism.json`)
 * has already been created and populated on disk.
 */
export function isVectorStorePopulated(): boolean {
  if (!fs.existsSync(VECTOR_DB_FILE)) {
    return false;
  }
  try {
    const raw = fs.readFileSync(VECTOR_DB_FILE, 'utf-8');
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return Object.keys(parsed).length > 0;
  } catch {
    return false;
  }
}

/**
 * Lightweight lexical fallback search over the local Markdown chunks.
 * Used only as a safety net if an attendee runs a retrieval tool before
 * running the indexer or if the embedding server is unreachable.
 */
export function keywordFallbackSearch(
  query: string,
  topK = 3
): KnowledgeChunk[] {
  const chunks = loadLagosKnowledgeChunks();
  const terms = query
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 3);

  const scored = chunks.map((chunk) => {
    const haystack = chunk.content.toLowerCase();
    let score = 0;
    for (const term of terms) {
      if (haystack.includes(term)) {
        score += 2;
      }
      if (
        chunk.sectionTitle.toLowerCase().includes(term) ||
        chunk.documentTitle.toLowerCase().includes(term)
      ) {
        score += 3;
      }
    }
    return { chunk, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK).map((item) => item.chunk);
}
