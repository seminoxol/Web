# PCI Glass Website

Official website for **Planet Construction Industry Glass** — insulated glass manufacturer in Scarborough, ON.

**Live site:** https://pciglass.ca

---

## Tech Stack

- **Frontend:** Vanilla HTML5, CSS3, JavaScript
- **Backend:** Node.js + Express
- **Email:** Nodemailer (Gmail) for quote form submissions
- **Security:** Helmet (HTTP headers) + express-rate-limit

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
| `PORT` | Server port (default: 3000) |

**How to get a Gmail App Password:**
1. Go to [myaccount.google.com](https://myaccount.google.com)
2. Security → 2-Step Verification (enable if not already)
3. Security → App passwords
4. Generate one for "Mail / Windows Computer"

### 4. Run the server

```bash
# Production
npm start

# Development (auto-restarts on file changes)
npm run dev
```

Open http://localhost:3000

---

## Project Structure

```
.
├── index.html          # Main page (all sections)
├── style.css           # Styles + design system
├── script.js           # Client-side behavior
├── server.js           # Express server + /api/quote route
├── package.json
├── .env                # Secrets — DO NOT commit
├── .env.example        # Template for .env
├── robots.txt
└── sitemap.xml
```

---

## Quote Form API

`POST /api/quote`

Rate limited to **5 requests per IP per 15 minutes**.

**Body fields:**

| Field | Required | Description |
|---|---|---|
| `name` | Yes | Customer name |
| `email` | Yes | Customer email |
| `phone` | Yes | Customer phone |
| `company` | No | Company name |
| `products` | No | Array of selected products |
| `dimensions` | No | Glass dimensions |
| `message` | No | Additional notes |

---

## Deployment

The site is served by Express as static files. To run in production:

```bash
npm start
```

For a managed production server, consider using [PM2](https://pm2.keymetrics.io/):

```bash
npm install -g pm2
pm2 start server.js --name pci-glass
pm2 save
```
