# PCI Glass — Pre-launch checklist

Updated when fixes land. **Done** items are struck through.

## Broken / buggy (code)

- ~~**Mobile** — phone + Get a Quote hidden on small screens~~ ✅
- ~~**Catalog rapid-click** — product panel glitches~~ ✅ (border on image; no width animation)
- ~~**Gallery** — may not work until user scrolls near it~~ ✅
- **Catalog** — “Image goes here” placeholders (needs real product photos)
- ~~**Quote form** — Acid Etch in catalog, not in glass picker~~ ✅
- ~~**Quote form** — Spacers in services, not quotable~~ ✅
- ~~**Quote form** — no quantity per line~~ ✅
- ~~**Quote form** — no spam protection~~ ✅ (honeypot + rate limit)
- ~~**About stat** — 5000+ animates from 0~~ ✅
- ~~**404** — bad URLs serve homepage~~ ✅
- ~~**Email** — inputs not fully sanitized~~ ✅

## Missing (content / pages)

- ~~**Legal** — privacy policy, terms, warranty pages~~ ✅ (privacy + terms live; warranty still open)
- ~~**Legal** — consent checkbox on quote form~~ ✅
- ~~**Content** — FAQ page at `/faq/`~~ ✅
- **Content** — install photos, service area list
- ~~**Nav** — footer Contact + legal links~~ ✅
- **SEO** — `#quote` in sitemap, GA4, social links
- **Trust** — Google Business embed
- **Chinese** — full page or toggle
- **Quotes** — file upload for drawings

## Weak / external

- **Photos** — factory JPGs still on CDN; host locally
- **Email** — Gmail vs `@pciglass.ca`
- **Security** — rotate app password; server `.env` only
- **Deploy** — production server pull + restart
- ~~**Docs** — README partly outdated~~ ✅

## Fine as-is

- Layout, quote flow, catalog images, theme, `tel:` links, rate limit, basic SEO
