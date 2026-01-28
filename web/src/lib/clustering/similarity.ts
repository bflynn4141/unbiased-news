/**
 * Text Similarity using TF-IDF
 *
 * Computes semantic similarity between articles using Term Frequency-Inverse
 * Document Frequency (TF-IDF) vectors and cosine similarity.
 *
 * This is the core algorithm for grouping related articles into stories.
 */

import natural from 'natural';

const TfIdf = natural.TfIdf;
const tokenizer = new natural.WordTokenizer();
const stemmer = natural.PorterStemmer;

/**
 * Preprocess text for TF-IDF analysis
 * - Lowercase
 * - Remove punctuation
 * - Remove stop words
 * - Stem words (e.g., "running" -> "run")
 */
function preprocessText(text: string): string[] {
  if (!text) return [];

  const lowered = text.toLowerCase();
  const tokens = tokenizer.tokenize(lowered) || [];

  // Common English stop words to filter out
  const stopWords = new Set([
    'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
    'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
    'could', 'should', 'may', 'might', 'can', 'shall', 'this', 'that',
    'these', 'those', 'it', 'its', "it's", 'he', 'she', 'his', 'her',
    'they', 'their', 'them', 'we', 'our', 'us', 'you', 'your', 'i', 'my',
    'me', 'what', 'which', 'who', 'whom', 'when', 'where', 'why', 'how',
    'all', 'each', 'every', 'both', 'few', 'more', 'most', 'other', 'some',
    'such', 'no', 'nor', 'not', 'only', 'same', 'so', 'than', 'too', 'very',
    'just', 'also', 'now', 'here', 'there', 'then', 'once', 'if', 'because',
    'about', 'into', 'through', 'during', 'before', 'after', 'above', 'below',
    'between', 'under', 'again', 'further', 'any', 'says', 'said', 'new',
  ]);

  return tokens
    .filter((token) => {
      // Remove short tokens and stop words
      if (token.length < 3) return false;
      if (stopWords.has(token)) return false;
      // Remove tokens that are just numbers
      if (/^\d+$/.test(token)) return false;
      return true;
    })
    .map((token) => stemmer.stem(token));
}

/**
 * Calculate cosine similarity between two vectors
 */
function cosineSimilarity(vec1: Map<string, number>, vec2: Map<string, number>): number {
  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;

  // Calculate dot product and first norm
  for (const [term, value] of vec1) {
    norm1 += value * value;
    if (vec2.has(term)) {
      dotProduct += value * vec2.get(term)!;
    }
  }

  // Calculate second norm
  for (const [, value] of vec2) {
    norm2 += value * value;
  }

  // Avoid division by zero
  const denom = Math.sqrt(norm1) * Math.sqrt(norm2);
  if (denom === 0) return 0;

  return dotProduct / denom;
}

export interface DocumentVector {
  id: string;
  vector: Map<string, number>;
  text: string; // Original combined text
}

/**
 * Build TF-IDF vectors for a set of documents
 */
export function buildTfIdfVectors(
  documents: { id: string; title: string; description?: string | null }[]
): DocumentVector[] {
  const tfidf = new TfIdf();

  // Add all documents to the TF-IDF model
  const processedDocs = documents.map((doc) => {
    const combinedText = `${doc.title} ${doc.description || ''}`;
    const processed = preprocessText(combinedText);
    tfidf.addDocument(processed);
    return { id: doc.id, text: combinedText, processed };
  });

  // Extract TF-IDF vectors for each document
  return processedDocs.map((doc, index) => {
    const vector = new Map<string, number>();

    tfidf.listTerms(index).forEach((item) => {
      if (item.tfidf > 0) {
        vector.set(item.term, item.tfidf);
      }
    });

    return {
      id: doc.id,
      vector,
      text: doc.text,
    };
  });
}

/**
 * Calculate pairwise similarity matrix for documents
 */
export function calculateSimilarityMatrix(
  vectors: DocumentVector[]
): Map<string, Map<string, number>> {
  const matrix = new Map<string, Map<string, number>>();

  for (let i = 0; i < vectors.length; i++) {
    const row = new Map<string, number>();

    for (let j = 0; j < vectors.length; j++) {
      if (i === j) {
        row.set(vectors[j].id, 1.0); // Self-similarity is 1
      } else if (j < i) {
        // Use already calculated value (symmetric matrix)
        row.set(vectors[j].id, matrix.get(vectors[j].id)!.get(vectors[i].id)!);
      } else {
        const similarity = cosineSimilarity(vectors[i].vector, vectors[j].vector);
        row.set(vectors[j].id, similarity);
      }
    }

    matrix.set(vectors[i].id, row);
  }

  return matrix;
}

/**
 * Find similar documents above a threshold
 */
export function findSimilarDocuments(
  docId: string,
  matrix: Map<string, Map<string, number>>,
  threshold: number = 0.3
): string[] {
  const row = matrix.get(docId);
  if (!row) return [];

  const similar: string[] = [];
  for (const [otherId, similarity] of row) {
    if (otherId !== docId && similarity >= threshold) {
      similar.push(otherId);
    }
  }

  return similar;
}
