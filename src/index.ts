// Ngwg-ext-seo — SEO extension plugin implementing exactly one protocol:
//
//   ngwg-helper-v1
//     helpers     : seoMeta(page, site)   → OpenGraph/Twitter/canonical meta block
//     buildData   : exposes the plugin options to themes via site.extra.seo
//                   (generateSitemap / generateRSS / rssPath / sitemapPath / siteUrl)
//     afterDeploy : writes public/sitemap.xml and public/rss.xml after the
//                   primary deployer finished (Core invokes the optional hook)
//
// Options (ngwg.yaml, defaults true):
//   plugin:
//     seo:
//       generateSitemap: true
//       generateRSS: true
//
// Themes read site.extra.seo.* to decide whether to render RSS/Sitemap
// footer links, and call {{{ @ seoMeta page site }}} in <head> (guarded by
// {{#if @ size site.extra.seo }} so the theme still works without the plugin).

import { mkdir, writeFile } from "node:fs/promises";
import * as path from "node:path";

// --- small self-contained utilities (plugins stay dependency-free) ----------

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeXml(s: string): string {
  return escapeHtml(s);
}

function slugify(s: string): string {
  return (
    String(s)
      .trim()
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, "-")
      .replace(/^-+|-+$/g, "") || "untitled"
  );
}

function parseDate(v: any): Date {
  const d = v instanceof Date ? v : new Date(v);
  return isNaN(d.getTime()) ? new Date(0) : d;
}

function excerptOf(post: any, length = 160): string {
  const src = String(post?.html ?? post?.body ?? post?.meta?.description ?? "");
  return src
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, length);
}

interface SeoSite {
  title?: string;
  description?: string;
  baseurl?: string;
  extra?: { seo?: { siteUrl?: string; generateSitemap?: boolean; generateRSS?: boolean; rssPath?: string; sitemapPath?: string } };
}

interface SeoPage {
  url?: string;
  kind?: "post" | "page" | "asset";
  meta?: Record<string, any>;
  html?: string;
}

function joinUrl(base: string, p: string): string {
  if (!base || base === "/") return p;
  return base.replace(/\/+$/, "") + (p.startsWith("/") ? p : "/" + p);
}

function absolute(site: SeoSite, p: string): string {
  const origin = String(site?.extra?.seo?.siteUrl ?? "").replace(/\/+$/, "");
  return origin + joinUrl(site?.baseurl ?? "/", p);
}

function pageTitle(page: SeoPage, site: SeoSite): string {
  return (
    page?.meta?.title ??
    (page?.tag ? `#${page.tag}` : undefined) ??
    (page?.category ? `/${page.category}` : undefined) ??
    site?.title ??
    ""
  );
}

function descriptionOf(page: SeoPage, site: SeoSite): string {
  return (
    page?.meta?.description ??
    (excerptOf(page) || site?.description || "")
  );
}

// --- helper functions exposed to themes -------------------------------------

/** Full SEO meta block for the current page: description, canonical, OpenGraph, Twitter Card. */
export function seoMeta(page: SeoPage, site: SeoSite): string {
  const title = pageTitle(page, site);
  const description = descriptionOf(page, site);
  const url = absolute(site, page?.url ?? "/");
  const isPost = page?.kind === "post";
  const ogType = isPost ? "article" : "website";
  const image = page?.meta?.cover ?? page?.meta?.image;

  const tags: string[] = [
    `<meta name="description" content="${escapeHtml(description)}">`,
    `<meta property="og:title" content="${escapeHtml(title)}">`,
    `<meta property="og:type" content="${ogType}">`,
    `<meta property="og:site_name" content="${escapeHtml(site?.title ?? "")}">`,
    `<meta name="twitter:card" content="${image ? "summary_large_image" : "summary"}">`,
    `<meta name="twitter:title" content="${escapeHtml(title)}">`,
    `<meta name="twitter:description" content="${escapeHtml(description)}">`,
  ];
  if (originOf(site)) {
    tags.push(`<link rel="canonical" href="${escapeHtml(url)}">`);
    tags.push(`<meta property="og:url" content="${escapeHtml(url)}">`);
  }
  if (image) tags.push(`<meta property="og:image" content="${escapeHtml(String(image))}">`);
  if (isPost && page?.meta?.date) {
    tags.push(`<meta property="article:published_time" content="${parseDate(page.meta.date).toISOString()}">`);
  }
  return tags.join("\n  ");
}

function originOf(site: SeoSite): string {
  return String(site?.extra?.seo?.siteUrl ?? "").replace(/\/+$/, "");
}

// --- plugin -----------------------------------------------------------------

const RSS_ITEMS = 20;

export const helper = {
  name: "seo",
  version: "0.1.0",

  helpers: {
    seoMeta,
    /** absolute URL for a site path (origin + baseurl + path) */
    absoluteUrl(p: string, site: SeoSite): string {
      return absolute(site, p);
    },
  },

  /** step 7: publish the option values to themes via site.extra.seo */
  buildData(ctx: any) {
    const opts = ctx?.config?.plugin?.seo ?? {};
    const flag = (v: any) => v !== false; // default on
    return {
      seo: {
        generateSitemap: flag(opts.generateSitemap),
        generateRSS: flag(opts.generateRSS),
        rssPath: "/rss.xml",
        sitemapPath: "/sitemap.xml",
        siteUrl: String(ctx?.config?.url ?? "").replace(/\/+$/, ""),
      },
    };
  },

  /** after deploy: generate sitemap.xml and/or rss.xml into public/ */
  async afterDeploy(ctx: any, env: any) {
    const seo = env.site?.extra?.seo ?? {};
    const opts = ctx?.config?.plugin?.seo ?? {};
    const wantSitemap = opts.generateSitemap !== false;
    const wantRss = opts.generateRSS !== false;

    if (wantSitemap) {
      const file = path.join(env.publicDir, "sitemap.xml");
      ctx.log.debug(`write ${file}`);
      await mkdir(env.publicDir, { recursive: true });
      await writeFile(file, buildSitemap(env.site));
    }
    if (wantRss) {
      const file = path.join(env.publicDir, "rss.xml");
      ctx.log.debug(`write ${file}`);
      await mkdir(env.publicDir, { recursive: true });
      await writeFile(file, buildRss(env.site));
    }
  },
};

// --- generators ---------------------------------------------------------------

interface UrlEntry {
  loc: string;
  lastmod?: string;
}

export function collectUrls(site: SeoSite & { posts?: any[]; pages?: any[]; tags?: Record<string, any[]>; categories?: Record<string, any[]> }): UrlEntry[] {
  const base = site?.baseurl ?? "/";
  const entries: UrlEntry[] = [{ loc: joinUrl(base, "/") }];
  for (const post of site.posts ?? []) {
    entries.push({ loc: joinUrl(base, post.url), lastmod: postDate(post) });
  }
  for (const page of site.pages ?? []) {
    entries.push({ loc: joinUrl(base, page.url) });
  }
  entries.push({ loc: joinUrl(base, "/archives/") });
  for (const tag of Object.keys(site.tags ?? {})) {
    entries.push({ loc: joinUrl(base, `/tags/${slugify(tag)}/`) });
  }
  for (const cat of Object.keys(site.categories ?? {})) {
    entries.push({ loc: joinUrl(base, `/categories/${slugify(cat)}/`) });
  }
  return entries;
}

function postDate(post: any): string | undefined {
  if (!post?.meta?.date) return undefined;
  return parseDate(post.meta.date).toISOString().slice(0, 10);
}

export function buildSitemap(site: any): string {
  const urls = collectUrls(site)
    .map((e) => {
      const abs = originOf(site) + e.loc;
      const mod = e.lastmod ? `\n    <lastmod>${e.lastmod}</lastmod>` : "";
      return `  <url>\n    <loc>${escapeXml(abs)}</loc>${mod}\n  </url>`;
    })
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

export function buildRss(site: any): string {
  const posts = (site?.posts ?? []).slice(0, RSS_ITEMS);
  const link = originOf(site) + joinUrl(site?.baseurl ?? "/", "/");
  const items = posts
    .map((post: any) => {
      const url = originOf(site) + joinUrl(site?.baseurl ?? "/", post.url);
      return `    <item>
      <title>${escapeXml(post.meta?.title ?? post.meta?.slug ?? "untitled")}</title>
      <link>${escapeXml(url)}</link>
      <guid isPermaLink="true">${escapeXml(url)}</guid>
      <pubDate>${parseDate(post.meta?.date).toUTCString()}</pubDate>
      <description>${escapeXml(excerptOf(post))}</description>
    </item>`;
    })
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(site?.title ?? "untitled site")}</title>
    <link>${escapeXml(link)}</link>
    <description>${escapeXml(site?.description ?? "")}</description>
    <atom:link href="${escapeXml(originOf(site) + (site?.extra?.seo?.rssPath ?? "/rss.xml"))}" rel="self" type="application/rss+xml"/>
${items}
  </channel>
</rss>
`;
}

export default { helpers: [helper] };
