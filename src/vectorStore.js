import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);
const VECTOR_FILE = path.join(DATA_DIR, 'vectors.json');

// Memory cache for vectors
let vectors = [];

// Load on start
try {
  if (fs.existsSync(VECTOR_FILE)) {
    vectors = JSON.parse(fs.readFileSync(VECTOR_FILE, 'utf8'));
    console.log(`Loaded ${vectors.length} vectors from local store`);
  }
} catch (e) {
  console.error('Failed to load vector store:', e);
}

// Function to calculate Cosine Similarity
function cosineSimilarity(vecA, vecB) {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Save to disk
function saveStore() {
  try {
    fs.writeFileSync(VECTOR_FILE, JSON.stringify(vectors));
  } catch (e) {
    console.error('Failed to save vector store:', e);
  }
}

/**
 * Add a new embedded memory
 * @param {string} text - The raw text of the memory (e.g. "I learned about Neo4j graph databases today")
 * @param {number[]} embedding - The vector representing the text
 * @param {object} metadata - Things like date, type ('diary', 'history_cluster')
 */
export function addMemory(text, embedding, metadata = {}) {
  // Prevent exact duplicates
  if (vectors.some(v => v.text === text)) return;

  vectors.push({ id: Date.now().toString(), text, embedding, metadata });
  saveStore();
}

/**
 * Returns number of vectors
 */
export function getVectorCount() {
  return vectors.length;
}

/**
 * Find top N similar memories to a given query embedding
 */
export function searchMemories(queryEmbedding, topK = 5) {
  if (vectors.length === 0) return [];

  const results = vectors.map(vec => ({
    ...vec,
    score: cosineSimilarity(queryEmbedding, vec.embedding)
  }));

  // Sort descending by score
  results.sort((a, b) => b.score - a.score);

  // Return the closest matches, dropping the massive embedding array to save memory passing it around
  return results.slice(0, topK).map(r => ({
    id: r.id,
    text: r.text,
    metadata: r.metadata,
    score: r.score
  }));
}
