import type { Request, Response } from 'express';
import { Readable } from 'node:stream';

function isLikelyHtml(contentType: string | null) {
  return !!contentType && contentType.toLowerCase().includes('text/html');
}

function extractConfirmToken(html: string) {
  const m =
    html.match(/confirm=([0-9A-Za-z_-]+)&amp;id=/) ??
    html.match(/confirm=([0-9A-Za-z_-]+)&id=/) ??
    html.match(/confirm=([0-9A-Za-z_.-]+)/);
  return m?.[1];
}

function extractDownloadWarningCookie(setCookieHeaders: string[]) {
  // Google Drive large-file interstitial often sets a cookie like:
  // download_warning_<random>=<token>
  for (const sc of setCookieHeaders) {
    const m = sc.match(/(?:^|;\s*)download_warning[^=]*=([^;]+)/i);
    if (m?.[1]) return { cookiePair: sc.split(';', 1)[0]!, token: m[1] };
  }
  return undefined;
}

function getSetCookieHeaders(headers: Headers): string[] {
  const anyHeaders = headers as unknown as { getSetCookie?: () => string[] };
  const viaMethod = anyHeaders.getSetCookie?.();
  if (Array.isArray(viaMethod) && viaMethod.length) return viaMethod;

  const single = headers.get('set-cookie');
  return single ? [single] : [];
}

async function fetchDriveFile(args: { fileId: string; range?: string; timeoutMs: number }) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), args.timeoutMs);
  try {
    const fileIdEnc = encodeURIComponent(args.fileId);
    const candidateBaseUrls = [
      // Newer direct host that often avoids the virus-scan interstitial.
      `https://drive.usercontent.google.com/download?id=${fileIdEnc}&export=download`,
      // Legacy host.
      `https://drive.google.com/uc?export=download&id=${fileIdEnc}`,
    ];

    const headers: Record<string, string> = {
      Accept: 'video/mp4,video/*;q=0.9,*/*;q=0.1',
    };
    if (args.range) headers.Range = args.range;

    let lastRes: Response | undefined;
    for (const baseUrl of candidateBaseUrls) {
      // First attempt (may return an HTML interstitial that requires a confirm token).
      let res = await fetch(baseUrl, {
        headers,
        cache: 'no-store',
        redirect: 'follow',
        signal: controller.signal,
      });
      lastRes = res;

      if (res.ok && isLikelyHtml(res.headers.get('content-type'))) {
        // Use clone() so we don't consume/lock the body stream.
        const html = await res.clone().text();
        const confirm = extractConfirmToken(html);
        const setCookies = getSetCookieHeaders(res.headers);
        const warningCookie = extractDownloadWarningCookie(setCookies);

        const confirmToken = confirm ?? warningCookie?.token ?? 't';
        const confirmUrl = `${baseUrl}&confirm=${encodeURIComponent(confirmToken)}`;
        const headers2: Record<string, string> = { ...headers };
        if (warningCookie?.cookiePair) headers2.Cookie = warningCookie.cookiePair;

        res = await fetch(confirmUrl, {
          headers: headers2,
          cache: 'no-store',
          redirect: 'follow',
          signal: controller.signal,
        });
        lastRes = res;
      }

      // If we got non-HTML or a partial-content response, take it.
      if (!isLikelyHtml(res.headers.get('content-type')) || res.status === 206) return res;
    }

    return lastRes!;
  } finally {
    clearTimeout(t);
  }
}

export async function videoHandler(req: Request, res: Response) {
  const fileId = process.env.VIDEO_DRIVE_FILE_ID?.trim();
  if (!fileId) {
    return res.status(501).json({
      error: 'video_not_configured',
      message: 'Set VIDEO_DRIVE_FILE_ID to a Google Drive file id (the part after /d/ in the share link).',
    });
  }

  const range = typeof req.headers.range === 'string' ? req.headers.range : undefined;

  try {
    const upstream = await fetchDriveFile({ fileId, range, timeoutMs: 20000 });

    // If Drive still returns HTML, it's not a streamable response for <video>.
    if (upstream.ok && isLikelyHtml(upstream.headers.get('content-type'))) {
      const html = await upstream.text().catch(() => '');
      return res.status(502).json({
        error: 'video_upstream_not_streamable',
        message: 'Google Drive returned an HTML page instead of video bytes (likely a confirm/download interstitial).',
        details: html.slice(0, 200),
      });
    }

    if (!upstream.ok && upstream.status !== 206) {
      const contentType = upstream.headers.get('content-type') ?? 'text/plain';
      const body = await upstream.text().catch(() => '');
      return res.status(502).type(contentType).send(body || `upstream_http_${upstream.status}`);
    }

    res.status(upstream.status);
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Accept-Ranges', 'bytes');

    const contentType = upstream.headers.get('content-type');
    if (contentType) res.setHeader('Content-Type', contentType);

    const contentLength = upstream.headers.get('content-length');
    if (contentLength) res.setHeader('Content-Length', contentLength);

    const contentRange = upstream.headers.get('content-range');
    if (contentRange) res.setHeader('Content-Range', contentRange);

    if (req.method === 'HEAD') return res.end();

    if (!upstream.body) return res.end();

    Readable.fromWeb(upstream.body as unknown as ReadableStream).pipe(res);
  } catch (e) {
    res.status(502).json({ error: 'video_fetch_failed', message: (e as Error)?.message ?? String(e) });
  }
}

