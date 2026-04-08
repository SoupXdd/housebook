import {
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import type { BookLookupResult, BookProvider } from '../types';
import { HttpClient } from './http-client';
import { LookupCache } from './lookup-cache';
import { cleanDescription, normalizeIsbn, isValidIsbn } from './html-utils';

@Injectable()
export class OpenLibraryProvider implements BookProvider {
  readonly name = 'OpenLibrary' as const;
  private readonly logger = new Logger(OpenLibraryProvider.name);

  constructor(
    private readonly http: HttpClient,
    private readonly cache: LookupCache,
  ) {}

  supportsUrl(): boolean {
    return false;
  }

  supportsIsbn(): boolean {
    return true;
  }

  supportsTitle(): boolean {
    return true;
  }

  async lookupByIsbn(rawIsbn: string): Promise<BookLookupResult> {
    const isbn = normalizeIsbn(rawIsbn);
    if (!isValidIsbn(isbn)) {
      throw new UnprocessableEntityException('Invalid ISBN');
    }

    const cacheKey = `ol:isbn:${isbn}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    const data = await this.http.fetchJson<{
      title?: string;
      authors?: Array<{ key: string }>;
      covers?: number[];
      description?: string | { value?: string };
      number_of_pages?: number;
      publishers?: string[];
      publish_date?: string;
      subjects?: string[];
      languages?: Array<{ key: string }>;
    }>(`https://openlibrary.org/isbn/${isbn}.json`);

    if (!data?.title) {
      throw new NotFoundException('Book not found on OpenLibrary');
    }

    const authors = await this.fetchAuthors(data.authors ?? []);

    const coverId = data.covers?.[0];
    const coverUrl = coverId
      ? `https://covers.openlibrary.org/b/id/${coverId}-L.jpg`
      : `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`;

    const description =
      typeof data.description === 'string'
        ? data.description
        : data.description?.value;

    const year = this.extractYear(data.publish_date);
    const language = this.extractLanguage(data.languages);

    const rating = await this.fetchRating(isbn);

    const result: BookLookupResult = {
      title: data.title,
      authors,
      coverUrl,
      isbn,
      description: cleanDescription(description),
      pagesCount: data.number_of_pages,
      publisher: data.publishers?.[0],
      year,
      language,
      subjects: data.subjects?.slice(0, 5),
      rating: rating?.average,
      ratingsCount: rating?.count,
      sourceUrl: `https://openlibrary.org/isbn/${isbn}`,
      sourceName: 'OpenLibrary',
    };

    this.cache.set(cacheKey, result);
    return result;
  }

  async searchByTitle(title: string): Promise<BookLookupResult[]> {
    const cacheKey = `ol:title:${title.toLowerCase().trim()}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return [cached];

    const encoded = encodeURIComponent(title.trim());
    const data = await this.http.fetchJson<{
      numFound?: number;
      docs?: Array<{
        key?: string;
        title?: string;
        author_name?: string[];
        cover_i?: number;
        isbn?: string[];
        first_publish_year?: number;
        publisher?: string[];
        number_of_pages_median?: number;
        language?: string[];
        subject?: string[];
        ratings_average?: number;
        ratings_count?: number;
        first_sentence?: string[];
      }>;
    }>(
      `https://openlibrary.org/search.json?title=${encoded}&limit=10&fields=key,title,author_name,cover_i,isbn,first_publish_year,publisher,number_of_pages_median,language,subject,ratings_average,ratings_count,first_sentence`,
    );

    if (!data?.docs?.length) {
      throw new NotFoundException('No books found on OpenLibrary');
    }

    return data.docs
      .filter((doc) => doc.title)
      .map((doc): BookLookupResult => {
        const isbn = doc.isbn?.[0];
        const coverId = doc.cover_i;
        const coverUrl = coverId
          ? `https://covers.openlibrary.org/b/id/${coverId}-L.jpg`
          : isbn
            ? `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`
            : undefined;

        const workKey = doc.key;

        return {
          title: doc.title!,
          authors: doc.author_name ?? [],
          coverUrl,
          isbn,
          description: doc.first_sentence?.[0],
          pagesCount: doc.number_of_pages_median,
          publisher: doc.publisher?.[0],
          year: doc.first_publish_year,
          language: this.mapLanguageCode(doc.language?.[0]),
          subjects: doc.subject?.slice(0, 5),
          rating: doc.ratings_average
            ? Math.round(doc.ratings_average * 10) / 10
            : undefined,
          ratingsCount: doc.ratings_count,
          sourceUrl: workKey
            ? `https://openlibrary.org${workKey}`
            : `https://openlibrary.org/search?title=${encoded}`,
          sourceName: 'OpenLibrary',
        };
      });
  }

  private async fetchAuthors(
    authors: Array<{ key: string }>,
  ): Promise<string[]> {
    if (!authors.length) return [];

    const results = await Promise.all(
      authors.map(async (a) => {
        try {
          const data = await this.http.fetchJson<{ name?: string }>(
            `https://openlibrary.org${a.key}.json`,
          );
          return data?.name ?? null;
        } catch {
          return null;
        }
      }),
    );

    return results.filter((n): n is string => Boolean(n));
  }

  private async fetchRating(
    isbn: string,
  ): Promise<{ average?: number; count?: number } | null> {
    try {
      const data = await this.http.fetchJson<{
        summary?: { average?: number; count?: number };
      }>(`https://openlibrary.org/isbn/${isbn}/ratings.json`);

      if (!data?.summary) return null;
      return {
        average: data.summary.average
          ? Math.round(data.summary.average * 10) / 10
          : undefined,
        count: data.summary.count || undefined,
      };
    } catch {
      return null;
    }
  }

  private extractYear(publishDate?: string): number | undefined {
    if (!publishDate) return undefined;
    const match = publishDate.match(/(\d{4})/);
    return match ? parseInt(match[1], 10) : undefined;
  }

  private extractLanguage(
    languages?: Array<{ key: string }>,
  ): string | undefined {
    if (!languages?.length) return undefined;
    return this.mapLanguageCode(languages[0].key.replace('/languages/', ''));
  }

  private mapLanguageCode(code?: string): string | undefined {
    if (!code) return undefined;
    const map: Record<string, string> = {
      eng: 'English',
      rus: 'Русский',
      fre: 'Français',
      ger: 'Deutsch',
      spa: 'Español',
      ita: 'Italiano',
      jpn: '日本語',
      chi: '中文',
      kor: '한국어',
      ara: 'العربية',
    };
    return map[code.toLowerCase()] ?? code;
  }
}
