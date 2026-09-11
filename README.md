# Ngwg-ext-seo

SEO 扩展插件，只实现 **ngwg-helper-v1** 协议（含可选的 `afterDeploy` 钩子）。

## 提供什么

| 能力 | 说明 |
| --- | --- |
| `{{{ @ seoMeta page site }}}` | 当前页面的完整 meta 块：description、canonical、OpenGraph（og:title/og:type/og:url/og:site_name/og:image/article:published_time）、Twitter Card |
| `{{@ absoluteUrl path site }}` | origin + baseurl + path 的绝对 URL |
| `sitemap.xml` | 首页、文章、页面、归档、标签页、分类页（`generateSitemap` 控制，默认开） |
| `rss.xml` | 最近 20 篇文章的 RSS 2.0 feed（`generateRSS` 控制，默认开） |

`buildData` 会把选项与路径发布到 `site.extra.seo`：

```js
site.extra.seo = {
  generateSitemap: true,
  generateRSS: true,
  rssPath: "/rss.xml",
  sitemapPath: "/sitemap.xml",
  siteUrl: "https://example.com",   // 来自 ngwg.yaml 的 url 字段
}
```

主题据此决定页脚是否渲染 RSS/Sitemap 链接（pacific 已内置）。

## 使用

```yaml
# ngwg.yaml
url: https://example.com        # 绝对 URL 的来源；省略时 canonical/og:url 跳过
plugins:
  seo: ../Ngwg-ext-seo          # 或任何远程 URL
plugin:
  seo:
    generateSitemap: true
    generateRSS: true
```

主题在 `<head>` 中引用（pacific 已内置，用 `size` 守卫，插件缺席时主题照常工作）：

```html
{{#if @ size site.extra.seo }}{{{ @ seoMeta page site }}}{{/if }}
{{#if site.extra.seo.generateRSS }}<link rel="alternate" type="application/rss+xml" href="{{ site.extra.seo.rssPath }}">{{/if }}
```

验收：构建后检查 `public/sitemap.xml`、`public/rss.xml` 与页面 `<head>` 中的
og:* 标签；无需浏览器。

## 许可证 / License

本项目基于 [GNU General Public License v3.0 (GPL-3.0)](LICENSE) 发布。
This project is licensed under the [GNU General Public License v3.0 (GPL-3.0)](LICENSE).

---

## English

# Ngwg-ext-seo

The SEO extension plugin. It only implements the **ngwg-helper-v1** protocol (including the optional `afterDeploy` hook).

## What It Provides

| Capability | Description |
| --- | --- |
| `{{{ @ seoMeta page site }}}` | A complete meta block for the current page: description, canonical, OpenGraph (og:title/og:type/og:url/og:site_name/og:image/article:published_time), Twitter Card |
| `{{@ absoluteUrl path site }}` | Absolute URL from origin + baseurl + path |
| `sitemap.xml` | Home page, posts, pages, archive, tag and category pages (controlled by `generateSitemap`, on by default) |
| `rss.xml` | An RSS 2.0 feed of the 20 most recent posts (controlled by `generateRSS`, on by default) |

`buildData` publishes the options and paths to `site.extra.seo`:

```js
site.extra.seo = {
  generateSitemap: true,
  generateRSS: true,
  rssPath: "/rss.xml",
  sitemapPath: "/sitemap.xml",
  siteUrl: "https://example.com",   // from the url field in ngwg.yaml
}
```

Themes use this to decide whether to render RSS/Sitemap links in the footer (built into pacific).

## Usage

```yaml
# ngwg.yaml
url: https://example.com        # source of absolute URLs; canonical/og:url are skipped when omitted
plugins:
  seo: ../Ngwg-ext-seo          # or any remote URL
plugin:
  seo:
    generateSitemap: true
    generateRSS: true
```

Themes reference it in `<head>` (built into pacific, guarded with `size`, so the theme still works when the plugin is absent):

```html
{{#if @ size site.extra.seo }}{{{ @ seoMeta page site }}}{{/if }}
{{#if site.extra.seo.generateRSS }}<link rel="alternate" type="application/rss+xml" href="{{ site.extra.seo.rssPath }}">{{/if }}
```

Acceptance: after building, check `public/sitemap.xml`, `public/rss.xml` and the og:* tags in each page's `<head>`; no browser needed.

## License

This project is licensed under the [GNU General Public License v3.0 (GPL-3.0)](LICENSE).
