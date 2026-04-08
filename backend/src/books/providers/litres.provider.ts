import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import * as cheerio from 'cheerio';
import type { BookLookupResult, BookProvider } from '../types';
import { HttpClient } from './http-client';
import { LookupCache } from './lookup-cache';
import {
  cleanDescription,
  extractAuthorsFromHtml,
  extractJsonLd,
  extractNextData,
  findByType,
  formatAge,
  formatSizeMm,
  pickImage,
  stripHtml,
} from './html-utils';

type LitresCopyrighter = {
  name?: string;
};

type LitresPerson = {
  full_name?: string;
  role?: string;
};

type LitresCharacteristics = {
  pages_count?: number;
  binding?: string;
  weight?: number;
  pages_format?: string;
  print_run?: number;
  isbn?: string;
  length?: number;
  width?: number;
  height?: number;
};

type LitresPaperBook = {
  title?: string;
  persons?: LitresPerson[];
  cover_image_url?: string;
  description?: string;
  publisher?: string;
  min_age_limit?: number;
  year?: number;
  isbn?: string;
  characteristics?: LitresCharacteristics;
};

type LitresArtData = {
  title?: string;
  persons?: LitresPerson[];
  html_annotation?: string;
  min_age?: number;
  date_written_at?: string;
  copyrighter?: LitresCopyrighter;
  paper_book?: LitresPaperBook;
};

type NextDataQueryEntry = {
  data?: LitresArtData;
};

type LitresInitialState = {
  rtkqApi?: {
    queries?: Record<string, NextDataQueryEntry>;
  };
};

type LitresNextData = {
  props?: {
    pageProps?: {
      initialState?: string | LitresInitialState;
    };
  };
};

type LitresJsonBook = {
  name?: string;
  headline?: string;
  image?: unknown;
  description?: string;
};

@Injectable()
export class LitResProvider implements BookProvider {
  readonly name = 'LitRes' as const;

  constructor(
    private readonly http: HttpClient,
    private readonly cache: LookupCache,
  ) {}

  supportsUrl(value: string): boolean {
    try {
      const host = new URL(value).hostname.toLowerCase();
      return host === 'litres.ru' || host.endsWith('.litres.ru');
    } catch {
      return false;
    }
  }

  supportsIsbn(): boolean {
    return false;
  }

  supportsTitle(): boolean {
    return false;
  }

  async lookupByUrl(rawUrl: string): Promise<BookLookupResult> {
    let url: URL;
    try {
      url = new URL(rawUrl);
    } catch {
      throw new UnprocessableEntityException('Invalid URL');
    }

    url.hash = '';
    const normalizedUrl = url.toString();
    const cacheKey = `litres:${normalizedUrl}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    const html = await this.http.fetchHtml(normalizedUrl);
    if (!html) throw new NotFoundException('Book not found on LitRes');

    const $ = cheerio.load(html);
    const canonical = $('link[rel="canonical"]').attr('href') ?? normalizedUrl;

    const nextData = extractNextData(html);
    const art = this.extractArt(nextData);
    const paper = art?.paper_book;
    const chars = paper?.characteristics;

    const jsonLd = extractJsonLd($);
    const jsonBook = findByType(
      jsonLd,
      (type) => type === 'book',
    ) as LitresJsonBook | null;

    const title =
      paper?.title ??
      art?.title ??
      jsonBook?.name ??
      jsonBook?.headline ??
      $('meta[property="og:title"]').attr('content') ??
      $('title').first().text().trim();

    if (!title) {
      throw new NotFoundException('Book not found on LitRes');
    }

    const authors =
      this.extractPersons(paper?.persons ?? art?.persons) ??
      extractAuthorsFromHtml(jsonBook as Record<string, unknown> | null, $);

    const coverUrl =
      paper?.cover_image_url ??
      pickImage(jsonBook?.image) ??
      $('meta[property="og:image"]').attr('content') ??
      undefined;

    const description =
      paper?.description ??
      stripHtml(art?.html_annotation) ??
      jsonBook?.description ??
      $('meta[property="og:description"]').attr('content') ??
      undefined;

    const result: BookLookupResult = {
      title,
      authors,
      coverUrl,
      description: cleanDescription(description),
      pagesCount: chars?.pages_count ?? undefined,
      coverType: chars?.binding ?? undefined,
      publisher: paper?.publisher ?? art?.copyrighter?.name ?? undefined,
      ageRestriction: formatAge(paper?.min_age_limit ?? art?.min_age),
      size: formatSizeMm(chars),
      weight: chars?.weight ?? undefined,
      pageSize: chars?.pages_format ?? undefined,
      printRun: chars?.print_run ?? undefined,
      year: this.extractYear(paper?.year, art?.date_written_at),
      isbn: paper?.isbn ?? chars?.isbn ?? undefined,
      sourceUrl: canonical,
      sourceName: 'LitRes',
    };

    this.cache.setMany(
      [
        cacheKey,
        ...(canonical !== normalizedUrl ? [`litres:${canonical}`] : []),
      ],
      result,
    );

    return result;
  }

  private extractArt(nextData: unknown): LitresArtData | null {
    try {
      if (!nextData || typeof nextData !== 'object') {
        return null;
      }

      const initialState = (nextData as LitresNextData).props?.pageProps
        ?.initialState;
      if (!initialState) {
        return null;
      }

      const state =
        typeof initialState === 'string'
          ? (JSON.parse(initialState) as LitresInitialState)
          : initialState;

      const queries = state.rtkqApi?.queries ?? {};
      const key = Object.keys(queries).find((queryKey) =>
        queryKey.startsWith('getArtData'),
      );

      return key ? (queries[key]?.data ?? null) : null;
    } catch {
      return null;
    }
  }

  private extractPersons(persons?: LitresPerson[]): string[] | null {
    if (!persons?.length) {
      return null;
    }

    const authors = persons
      .filter((person) => person.role === 'author')
      .map((person) => person.full_name)
      .filter((name): name is string => Boolean(name));

    if (authors.length) {
      return authors;
    }

    const all = persons
      .map((person) => person.full_name)
      .filter((name): name is string => Boolean(name));

    return all.length ? all : null;
  }

  private extractYear(
    explicitYear?: number,
    writtenAt?: string,
  ): number | undefined {
    if (explicitYear) {
      return explicitYear;
    }

    if (!writtenAt) {
      return undefined;
    }

    const parsed = new Date(writtenAt).getFullYear();
    return Number.isFinite(parsed) ? parsed : undefined;
  }
}
