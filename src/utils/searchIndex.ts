/**
 * Custom lightweight client-side Full-Text Search (FTS) engine.
 * Provides instant tokenized and ranked prefix searching over document titles, tags, and raw content.
 */

import { Document } from '../types';

interface SearchResult {
  document: Document;
  score: number;
  matchedTerms: string[];
}

// Simple English stop words to filter out for better keyword relevance
const STOP_WORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', 'arent',
  'as', 'at', 'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by',
  'cant', 'cannot', 'could', 'couldnt', 'did', 'didnt', 'do', 'does', 'doesnt', 'doing', 'dont', 'down',
  'during', 'each', 'few', 'for', 'from', 'further', 'had', 'hadnt', 'has', 'hasnt', 'have', 'havent',
  'having', 'he', 'hed', 'hell', 'hes', 'her', 'here', 'heres', 'hers', 'herself', 'him', 'himself',
  'his', 'how', 'hows', 'i', 'id', 'ill', 'im', 'ive', 'if', 'in', 'into', 'is', 'isnt', 'it', 'its',
  'itself', 'lets', 'me', 'more', 'most', 'mustnt', 'my', 'myself', 'no', 'nor', 'not', 'of', 'off',
  'on', 'once', 'only', 'or', 'other', 'ought', 'our', 'ours', 'ourselves', 'out', 'over', 'own',
  'same', 'shant', 'she', 'shed', 'shell', 'shes', 'should', 'shouldnt', 'so', 'some', 'such', 'than',
  'that', 'thats', 'the', 'their', 'theirs', 'them', 'themselves', 'then', 'there', 'theres', 'these',
  'they', 'theyd', 'theyll', 'theyre', 'theyve', 'this', 'those', 'through', 'to', 'too', 'under',
  'until', 'up', 'very', 'was', 'wasnt', 'we', 'wed', 'well', 'were', 'weve', 'werent', 'what', 'whats',
  'when', 'whens', 'where', 'wheres', 'which', 'while', 'who', 'whos', 'whom', 'why', 'whys', 'with',
  'wont', 'would', 'wouldnt', 'you', 'youd', 'youll', 'youre', 'youve', 'your', 'yours', 'yourself', 'yourselves'
]);

/**
 * Tokenizes text into lowercase alphanumeric terms, filtering short/invalid terms.
 */
export function tokenize(text: string): string[] {
  if (!text) return [];
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, ' ') // Replace punctuation with space
    .split(/[\s_]+/)           // Split on spaces and underscores
    .map(token => token.trim())
    .filter(token => token.length > 0);
}

export class DocumentSearchIndex {
  private documents: Document[] = [];

  constructor(documents: Document[]) {
    this.documents = documents;
  }

  /**
   * Updates the indexed documents.
   */
  public updateDocuments(documents: Document[]) {
    this.documents = documents;
  }

  /**
   * Performs full-text search against the index.
   * Matches query tokens against title, tags, and content, supporting prefix matches for fast typing.
   * Ranks results by a weighted score.
   */
  public search(query: string): SearchResult[] {
    const queryTokens = tokenize(query).filter(token => !STOP_WORDS.has(token) || query.length < 4);
    if (queryTokens.length === 0) {
      // If query is empty or only contains stop words, return all documents with score 0
      return this.documents.map(doc => ({
        document: doc,
        score: 0,
        matchedTerms: [],
      }));
    }

    const results: SearchResult[] = [];

    for (const doc of this.documents) {
      let score = 0;
      const matchedTerms = new Set<string>();

      const titleTokens = tokenize(doc.title);
      const tagTokens = doc.tags.flatMap(tag => tokenize(tag));
      const contentTokens = tokenize(doc.content);

      for (const qToken of queryTokens) {
        let matchedInDoc = false;

        // 1. Search in Title (Highest Weight)
        for (const tToken of titleTokens) {
          if (tToken === qToken) {
            score += 12; // Direct match in title
            matchedTerms.add(qToken);
            matchedInDoc = true;
          } else if (tToken.startsWith(qToken)) {
            score += 6;  // Prefix match in title
            matchedTerms.add(qToken);
            matchedInDoc = true;
          }
        }

        // 2. Search in Tags (High Weight)
        for (const tagToken of tagTokens) {
          if (tagToken === qToken) {
            score += 8;  // Direct match in tag
            matchedTerms.add(qToken);
            matchedInDoc = true;
          } else if (tagToken.startsWith(qToken)) {
            score += 4;  // Prefix match in tag
            matchedTerms.add(qToken);
            matchedInDoc = true;
          }
        }

        // 3. Search in Raw Content (Normal Weight)
        let contentMatches = 0;
        for (const cToken of contentTokens) {
          if (cToken === qToken) {
            contentMatches += 1;
            matchedTerms.add(qToken);
            matchedInDoc = true;
          } else if (cToken.startsWith(qToken)) {
            contentMatches += 0.5; // Prefix match in content
            matchedTerms.add(qToken);
            matchedInDoc = true;
          }
        }
        
        // Add content matches with diminishing returns to avoid long documents dominating
        if (contentMatches > 0) {
          score += Math.min(8, contentMatches * 1); // Cap content contributions
        }
      }

      if (score > 0) {
        results.push({
          document: doc,
          score,
          matchedTerms: Array.from(matchedTerms),
        });
      }
    }

    // Sort by score descending
    return results.sort((a, b) => b.score - a.score);
  }
}
