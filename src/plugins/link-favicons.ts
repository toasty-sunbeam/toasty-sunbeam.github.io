import { visit } from 'unist-util-visit';
import type { Node } from 'unist';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

interface Element extends Node {
    type: 'element';
    tagName: string;
    properties: Record<string, unknown>;
    children: Node[];
}

interface Favicon {
    src: string;
    /** The icon's dominant color as a hex string, if it has one. */
    color: string | null;
}

interface Options {
    /** Hosts treated as internal; links to these get no icon. */
    internalHosts?: string[];
    /**
     * Hosts that serve several products under one domain, told apart by the
     * first path segment (docs.google.com/spreadsheets vs /document). Links to
     * these take their icon from the linked page itself.
     */
    perPathHosts?: string[];
    /** Where fetched icons are kept between builds. */
    cacheDir?: string;
}

// --- Server-side Rehype Plugin ---
//
// Prefixes external links with the favicon of the site they point to. Icons are
// fetched at build time and inlined as data URIs, so readers never make a
// request to a third party, and a dead site just means a link without an icon.
// Each link also gets its icon's dominant color as --link-accent, which the
// stylesheet uses for the underline.

const DEFAULT_CACHE_DIR = path.resolve('node_modules/.cache/link-favicons');

// One lookup per host per build, shared across every page.
const lookups = new Map<string, Promise<Favicon | null>>();

const DEFAULT_PER_PATH_HOSTS = ['docs.google.com'];

export function rehypeLinkFavicons(options: Options = {}) {
    const internalHosts = new Set((options.internalHosts ?? []).map(normalizeHost));
    const perPathHosts = new Set((options.perPathHosts ?? DEFAULT_PER_PATH_HOSTS).map(normalizeHost));
    const cacheDir = options.cacheDir ?? DEFAULT_CACHE_DIR;

    return async (tree: Node) => {
        const links: { node: Element; url: URL }[] = [];

        visit(tree, 'element', (node: Element) => {
            if (node.tagName !== 'a') return;
            const url = externalUrl(node.properties.href);
            if (!url || internalHosts.has(normalizeHost(url.hostname))) return;
            // Leave image links alone; an icon next to a picture is just noise.
            if (node.children.some((child) => (child as Element).tagName === 'img')) return;
            links.push({ node, url });
        });

        await Promise.all(
            links.map(async ({ node, url }) => {
                const favicon = await faviconFor(url, perPathHosts, cacheDir);
                if (!favicon) return;
                const { src, color } = favicon;
                if (color) node.properties.style = `--link-accent: ${color}`;
                node.children.unshift({
                    type: 'element',
                    tagName: 'img',
                    properties: {
                        className: ['link-favicon'],
                        src,
                        alt: '',
                        width: 16,
                        height: 16,
                        ariaHidden: 'true',
                    },
                    children: [],
                } as Element);
            }),
        );
    };
}

function externalUrl(href: unknown): URL | null {
    if (typeof href !== 'string' || !/^https?:\/\//i.test(href)) return null;
    try {
        return new URL(href);
    } catch {
        return null;
    }
}

function normalizeHost(host: string): string {
    return host.toLowerCase().replace(/^www\./, '');
}

function faviconFor(url: URL, perPathHosts: Set<string>, cacheDir: string): Promise<Favicon | null> {
    const host = normalizeHost(url.hostname);
    const section = perPathHosts.has(host) ? url.pathname.split('/')[1] : '';
    const key = section ? `${host}/${section}` : host;
    let lookup = lookups.get(key);
    if (!lookup) {
        lookup = loadFavicon(key, cacheDir, async () => {
            if (section) {
                const icon = await fetchPageIcon(url);
                if (icon !== undefined) return icon;
            }
            return fetchGoogleIcon(host);
        }).then(async (src) => (src ? { src, color: await dominantColor(src) } : null));
        lookups.set(key, lookup);
    }
    return lookup;
}

// Icons are cached as data URIs in text files; an empty file is a remembered
// miss. `fetchIcon` resolves to undefined when it couldn't find out either way.
async function loadFavicon(
    key: string,
    cacheDir: string,
    fetchIcon: () => Promise<string | null | undefined>,
): Promise<string | null> {
    const file = path.join(cacheDir, `${key.replaceAll('/', '_')}.txt`);
    try {
        return (await readFile(file, 'utf8')) || null;
    } catch {}

    try {
        const icon = await fetchIcon();
        if (icon === undefined) return null;
        await mkdir(cacheDir, { recursive: true });
        await writeFile(file, icon ?? '');
        return icon;
    } catch {
        // Offline or timed out: build without the icon, and try again next time.
        return null;
    }
}

async function fetchGoogleIcon(host: string): Promise<string | null | undefined> {
    const res = await fetchWithTimeout(
        `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=32`,
    );
    // Google answers 404 (with a generic globe) when it has no icon for the
    // host. Remember that, so we don't ask again every build.
    if (res.status === 404) return null;
    if (!res.ok) return undefined;
    return toDataUri(res);
}

// Reads the icon a page declares for itself, e.g. the green Sheets icon on a
// spreadsheet rather than Google's generic one.
async function fetchPageIcon(url: URL): Promise<string | undefined> {
    const page = await fetchWithTimeout(url.href);
    if (!page.ok) return undefined;
    const html = await page.text();
    for (const tag of html.match(/<link\b[^>]*>/gi) ?? []) {
        if (!/\brel=["'][^"']*\bicon\b/i.test(tag)) continue;
        const href = tag.match(/\bhref=["']([^"']+)["']/i)?.[1];
        if (!href) continue;
        const icon = await fetchWithTimeout(new URL(href.replaceAll('&amp;', '&'), page.url).href);
        if (icon.ok) return toDataUri(icon);
    }
    return undefined;
}

function fetchWithTimeout(url: string): Promise<Response> {
    return fetch(url, { signal: AbortSignal.timeout(5000) });
}

async function toDataUri(res: Response): Promise<string> {
    const type = res.headers.get('content-type')?.split(';')[0] || 'image/png';
    const data = Buffer.from(await res.arrayBuffer());
    return `data:${type};base64,${data.toString('base64')}`;
}

// Picks the icon's brand color: the most common hue among its saturated pixels,
// ignoring transparency, white, black and greys. Icons with no real color (a
// black GitHub cat, say) get null and keep the default underline.
async function dominantColor(dataUri: string): Promise<string | null> {
    try {
        const image = unwrapIco(Buffer.from(dataUri.slice(dataUri.indexOf(',') + 1), 'base64'));
        if (!image) return null;
        const pixels = await sharp(image)
            .resize(32, 32, { fit: 'fill' })
            .ensureAlpha()
            .raw()
            .toBuffer();

        const bins = Array.from({ length: 12 }, () => ({ weight: 0, r: 0, g: 0, b: 0, n: 0 }));
        let opaque = 0;
        let colorful = 0;
        for (let i = 0; i < pixels.length; i += 4) {
            const [r, g, b, a] = [pixels[i], pixels[i + 1], pixels[i + 2], pixels[i + 3]];
            if (a < 128) continue;
            opaque++;
            const max = Math.max(r, g, b);
            const min = Math.min(r, g, b);
            const saturation = max ? (max - min) / max : 0;
            if (saturation < 0.3 || max < 64) continue;
            colorful++;
            const bin = bins[Math.floor(hue(r, g, b, max, min) / 30) % 12];
            bin.weight += saturation;
            bin.r += r;
            bin.g += g;
            bin.b += b;
            bin.n++;
        }
        // A few stray colored pixels on an otherwise grey icon don't count.
        if (!opaque || colorful / opaque < 0.05) return null;

        const best = bins.reduce((a, b) => (b.weight > a.weight ? b : a));
        const hex = (sum: number) => Math.round(sum / best.n).toString(16).padStart(2, '0');
        return `#${hex(best.r)}${hex(best.g)}${hex(best.b)}`;
    } catch {
        return null;
    }
}

function hue(r: number, g: number, b: number, max: number, min: number): number {
    const d = max - min;
    if (!d) return 0;
    const h = max === r ? (g - b) / d + 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return (h * 60) % 360;
}

// Sharp can't read .ico files, but modern ones are just a wrapper around PNGs.
// Returns the largest PNG inside, the buffer itself if it isn't an .ico, or
// null for an old bitmap-only .ico.
function unwrapIco(data: Buffer): Buffer | null {
    if (data.readUInt32BE(0) !== 0x00000100) return data;
    let best: Buffer | null = null;
    let bestSize = 0;
    for (let i = 0; i < data.readUInt16LE(4); i++) {
        const entry = 6 + i * 16;
        const size = (data[entry] || 256) * (data[entry + 1] || 256);
        const offset = data.readUInt32LE(entry + 12);
        const image = data.subarray(offset, offset + data.readUInt32LE(entry + 8));
        const isPng = image.readUInt32BE(0) === 0x89504e47;
        if (isPng && size > bestSize) {
            best = image;
            bestSize = size;
        }
    }
    return best;
}
