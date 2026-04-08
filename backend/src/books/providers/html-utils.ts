import * as cheerio from 'cheerio';

type JsonObject = Record<string, unknown>;

export function stripHtml(value?: string): string | undefined {
  if (!value) return undefined;
  const stripped = value
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return stripped || undefined;
}

export function cleanDescription(value?: string): string | undefined {
  if (!value) return undefined;
  const lower = value.toLowerCase();
  if (lower.includes('предлагает купить')) return undefined;
  if (lower.includes('₽') || /цена/i.test(value)) return undefined;
  return value.trim() || undefined;
}

export function formatAge(value?: number | null): string | undefined {
  if (!value) return undefined;
  return `${value}+`;
}

export function formatSizeMm(dims?: {
  length?: number;
  width?: number;
  height?: number;
}): string | undefined {
  if (!dims) return undefined;
  const { length, width, height } = dims;
  if (!length || !width || !height) return undefined;
  const cm = (v: number) => (v / 10).toFixed(1);
  return `${cm(length)}x${cm(width)}x${cm(height)}`;
}

export function formatSizeCm(dims?: {
  width?: number;
  height?: number;
  depth?: number;
}): string | undefined {
  if (!dims) return undefined;
  const { width, height, depth } = dims;
  if (!width || !height) return undefined;
  const parts = [width, height, ...(depth ? [depth] : [])];
  return parts.join('x');
}

export function extractJsonLd($: cheerio.CheerioAPI): unknown[] {
  const results: unknown[] = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    const text = $(el).contents().text();
    if (!text) return;
    try {
      results.push(JSON.parse(text));
    } catch {
      return;
    }
  });
  return results;
}

export function findByType(
  items: unknown[],
  predicate: (t: string) => boolean,
): JsonObject | null {
  for (const item of items) {
    const found = walkNode(item, predicate);
    if (found) return found;
  }
  return null;
}

function walkNode(
  node: unknown,
  predicate: (t: string) => boolean,
): JsonObject | null {
  if (!node) return null;

  if (Array.isArray(node)) {
    for (const entry of node) {
      const found = walkNode(entry, predicate);
      if (found) return found;
    }
    return null;
  }

  if (typeof node === 'object') {
    const obj = node as JsonObject;
    const type = obj['@type'];
    if (type && matchesType(type, predicate)) return obj;
    if (obj['@graph']) return walkNode(obj['@graph'], predicate);
  }

  return null;
}

function matchesType(
  type: unknown,
  predicate: (t: string) => boolean,
): boolean {
  if (Array.isArray(type)) {
    return type.some((value) => predicate(String(value).toLowerCase()));
  }

  return predicate(String(type).toLowerCase());
}

export function extractNextData(html: string): unknown {
  const match = html.match(
    /<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/,
  );
  if (!match) return null;
  try {
    return JSON.parse(match[1]);
  } catch {
    return null;
  }
}

export function pickImage(image: unknown): string | undefined {
  if (!image) return undefined;
  if (typeof image === 'string') return image;

  if (Array.isArray(image)) {
    const first = image.find((item) => typeof item === 'string');
    return typeof first === 'string' ? first : undefined;
  }

  if (typeof image === 'object') {
    const url = (image as JsonObject).url;
    return typeof url === 'string' ? url : undefined;
  }

  return undefined;
}

export function extractAuthorName(author: unknown): string | null {
  if (!author) return null;
  if (typeof author === 'string') return author;

  if (typeof author === 'object') {
    const name = (author as JsonObject).name;
    return typeof name === 'string' ? name : null;
  }

  return null;
}

export function extractAuthorsFromHtml(
  jsonBook: JsonObject | null,
  $: cheerio.CheerioAPI,
): string[] {
  const authors: string[] = [];

  const authorField = jsonBook?.author;
  if (authorField) {
    const items = Array.isArray(authorField) ? authorField : [authorField];
    for (const item of items) {
      const name = extractAuthorName(item);
      if (name) authors.push(name);
    }
  }

  if (!authors.length) {
    $('meta[name="author"]').each((_, el) => {
      const value = $(el).attr('content');
      if (value) authors.push(value);
    });
  }

  return [...new Set(authors)];
}

export function normalizeIsbn(raw: string): string {
  return raw.toUpperCase().replace(/[^0-9X]/g, '');
}

export function isValidIsbn(isbn: string): boolean {
  return isbn.length === 10 || isbn.length === 13;
}
