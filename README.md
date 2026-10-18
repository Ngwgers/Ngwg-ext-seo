# Ngwg-ext-seo

适用于主题的基本 SEO 扩展插件。

## 接口

| 能力 | 说明 |
| --- | --- |
| `{{{ @ seoMeta page site }}}` | 当前页面的完整 meta 块：description、canonical、OpenGraph（og:title/og:type/og:url/og:site_name/og:locale/og:image/article:published_time）、Twitter Card |
| `{{@ absoluteUrl path site }}` | origin + baseurl + path 的绝对 URL |
| `sitemap.xml` | 首页、文章、页面、归档、标签页、分类页（由 `generateSitemap` 控制） |
| `rss.xml` | 最近 20 篇文章的 RSS 2.0 feed（由 `generateRSS` 控制） |

`buildData` 会把选项与路径发布到 `site.extra.seo`：

```js
site.extra.seo = {
  generateSitemap: true,
  generateRSS: true,
  rssPath: "/rss.xml",
  sitemapPath: "/sitemap.xml",
  siteUrl: "https://example.com",   // 由 ngwg.yaml#url 决定
}
```

 `<head>` 引用示例：

```html
{{#if @ size site.extra.seo }}{{{ @ seoMeta page site }}}{{/if }}
{{#if site.extra.seo.generateRSS }}<link rel="alternate" type="application/rss+xml" href="{{ site.extra.seo.rssPath }}">{{/if }}
```

## 使用

```yaml
# ngwg.yaml
url: https://example.com
plugins:
  seo: https://github.com/Ngwgers/Ngwg-ext-seo
plugin:
  seo:
    generateSitemap: true
    generateRSS: true
```

## 许可证 / License

本项目基于 [GNU General Public License v3.0 (GPL-3.0)](LICENSE) 发布。
This project is licensed under the [GNU General Public License v3.0 (GPL-3.0)](LICENSE).

