#!/usr/bin/env bash
set -euo pipefail

# Navigate to repository root regardless of where this script is invoked from
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${REPO_ROOT}"

echo "🚀 Launching Genkit Developer UI for Step 2 (Local Vector RAG & Gemma Model)..."
npx genkit start -- npx tsx --watch step-02-vector-rag/genkit-ui.ts
