export type NewsCategory = 'cybersecurity' | 'forex' | 'markets' | 'general' | 'ai';

export interface NewsItem {
  id: string;
  title: string;
  source: string;
  url: string;

  publishedAt: string | null; // ISO-8601
  collectedAt: string; // ISO-8601

  category: NewsCategory;

  metadata?: {
    author?: string;
    snippet?: string;
    sourceId?: string;
    [key: string]: unknown;
  };

  // Reserved for later pipeline stages:
  status?: "confirmed" | "reported" | "unconfirmed" | "conflicting" | "unknown";
  summary?: string;
  relevance?: number;
  impact?: string;
  confidence?: number;
  relatedSources?: string[];
  tags?: string[];
  hash?: string;
}

export function validateNewsItem(item: Partial<NewsItem>): NewsItem {
  if (!item.id || typeof item.id !== 'string') throw new Error('Invalid or missing id');
  if (!item.title || typeof item.title !== 'string' || item.title.trim() === '') throw new Error('Invalid or empty title');
  if (!item.source || typeof item.source !== 'string') throw new Error('Invalid or missing source');
  
  if (!item.url || typeof item.url !== 'string') throw new Error('Invalid or missing url');
  try {
    new URL(item.url); // Validate URL format
  } catch {
    throw new Error(`Invalid URL: ${item.url}`);
  }

  if (item.publishedAt !== null) {
    if (typeof item.publishedAt !== 'string') throw new Error('publishedAt must be a string or null');
    const d = new Date(item.publishedAt);
    if (isNaN(d.getTime())) throw new Error(`Invalid publishedAt date: ${item.publishedAt}`);
  }

  if (!item.collectedAt || typeof item.collectedAt !== 'string') throw new Error('Invalid or missing collectedAt');
  const cd = new Date(item.collectedAt);
  if (isNaN(cd.getTime())) throw new Error(`Invalid collectedAt date: ${item.collectedAt}`);

  const validCategories: NewsCategory[] = ['cybersecurity', 'forex', 'markets', 'general', 'ai'];
  if (!item.category || !validCategories.includes(item.category as NewsCategory)) {
    throw new Error(`Invalid category: ${item.category}`);
  }

  return item as NewsItem;
}
