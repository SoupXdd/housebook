import { BadGatewayException, Injectable, Logger } from '@nestjs/common';

const BROWSER_UA =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';

@Injectable()
export class HttpClient {
  private readonly logger = new Logger(HttpClient.name);
  private readonly timeoutMs = 15_000;
  private readonly userAgent = BROWSER_UA;

  async fetch(url: string, init?: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      return await fetch(url, {
        ...init,
        signal: controller.signal,
        headers: {
          'User-Agent': this.userAgent,
          'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
          ...(init?.headers ?? {}),
        },
      });
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        this.logger.error(`Timeout fetching: ${url}`);
        throw new BadGatewayException(`External service timeout: ${url}`);
      }
      this.logger.error(`Error fetching: ${url}`, err);
      throw new BadGatewayException(`External service error: ${url}`);
    } finally {
      clearTimeout(timeout);
    }
  }

  async fetchJson<T>(url: string, init?: RequestInit): Promise<T | null> {
    const res = await this.fetch(url, init);

    if (res.status === 404) return null;

    if (!res.ok) {
      this.logger.error(`External service returned ${res.status}: ${url}`);
      throw new BadGatewayException(
        `External service returned ${res.status}: ${url}`,
      );
    }

    try {
      return (await res.json()) as T;
    } catch (err) {
      this.logger.error(`Failed to parse JSON from: ${url}`, err);
      throw new BadGatewayException(`Invalid JSON response from: ${url}`);
    }
  }

  async fetchHtml(url: string, init?: RequestInit): Promise<string | null> {
    const urlObj = new URL(url);
    const origin = `${urlObj.protocol}//${urlObj.hostname}`;

    const res = await this.fetch(url, {
      ...init,
      headers: {
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
        'Cache-Control': 'max-age=0',
        Referer: origin,
        'Sec-Ch-Ua':
          '"Chromium";v="125", "Not.A/Brand";v="24", "Google Chrome";v="125"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"Linux"',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'same-origin',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1',
        ...(init?.headers ?? {}),
      },
    });

    if (res.status === 404) return null;

    if (!res.ok) {
      this.logger.error(`External service returned ${res.status}: ${url}`);
      throw new BadGatewayException(
        `External service returned ${res.status}: ${url}`,
      );
    }

    return res.text();
  }
}
