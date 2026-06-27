# PCI Glass Website

Official website for **Planet Construction Industry Glass** — insulated glass manufacturer in Scarborough, ON.

**Live site:** https://pciglass.ca

---

## Tech Stack

- **Frontend:** Vanilla HTML5, CSS3, JavaScript (`js/site.js`)
- **Styles:** Bundled `/style.css` (concatenates `css/*.css` at runtime)
- **Backend:** Node.js + Express (`server.js`)
- **Email:** Nodemailer (Gmail) for quote form submissions
- **Security:** Helmet (HTTP headers) + express-rate-limit + honeypot

---

## Local Setup

### 1. Install Node.js

Download from https://nodejs.org (LTS version recommended).

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

```bash
cp .env.example .env
```

Then edit `.env` and fill in:

| Variable | Description |
|---|---|
| `EMAIL_USER` | Gmail address that sends emails |
| `EMAIL_PASS` | Gmail App Password (not your regular password) |
| `EMAIL_TO` | Where quote emails are delivered |
| `PORT` | Server port (default: 8080) |

**How to get a Gmail App Password:**
1. Go to [myaccount.google.com](https://myaccount.google.com)
2. Security → 2-Step Verification (enable if not already)
3. Security → App passwords
4. Generate one for "Mail / Windows Computer"

### 4. Run the server

```bash
# Production
npm start

# Development (auto-restarts on file changes; CSS bundle rebuilds each request)
npm run dev
```

Open http://localhost:8080

---

## Project Structure

```
.
├── index.html              # Homepage (sections: hero, about, products, quote, etc.)
├── 404.html                # Not found page
├── server.js               # Express server + /api/quote route
├── lib/
│   ├── email.js            # Owner + customer email templates
│   ├── pages.js            # renderPage(), ASSET_VERSION, partial injection
│   └── quotes.js           # Local quote fallback storage
├── partials/
│   ├── header.html         # Shared site header
│   ├── footer.html         # Shared site footer
│   ├── head-common.html    # Manifest, fonts, bundled CSS link
│   ├── head-theme.html     # Early theme script (FOUC prevention)
│   ├── loader.html         # Splash loader markup
│   ├── loader-critical.html
│   └── loader-fallback.html
├── css/                    # Source stylesheets (bundled into /style.css)
├── js/
│   └── site.js             # Client-side behavior
├── faq/index.html          # FAQ page
├── privacy/index.html      # Privacy policy
├── terms/index.html        # Terms of service
├── images/                 # Static images
├── package.json
├── .env                    # Secrets — DO NOT commit
├── .env.example
├── robots.txt
└── sitemap.xml
```

Asset cache busting uses `ASSET_VERSION` in `lib/pages.js` (currently `17`), injected as `?v=` on CSS/JS links.

---

## Quote Form API

`POST /api/quote`

Rate limited to **5 requests per IP per 15 minutes**. Honeypot field `website` must be empty; `consent` must be `true`.

**Body fields:**

| Field | Required | Description |
|---|---|---|
| `name` | Yes | Customer name |
| `email` | Yes | Customer email |
| `phone` | Yes | Customer phone |
| `company` | No | Company name |
| `consent` | Yes | Must be `true` (privacy policy acceptance) |
| `items` | No* | Array of line items (`width`, `height`, `product`, `type`, `quantity`) |
| `message` | No* | Additional notes |

\* At least one item or a message is required.

---

## Deployment

The site is served by Express. To run in production:

```bash
npm start
```

For a managed production server, consider using [PM2](https://pm2.keymetrics.io/):

```bash
npm install -g pm2
pm2 start server.js --name pci-glass
pm2 save
```

See `DEPLOY.md` for server pull/restart steps.
