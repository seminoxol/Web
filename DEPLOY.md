# Deploying PCI Glass

## Render (recommended — free tier)

### 1. Create the web service

1. Sign up at [render.com](https://render.com) → **Sign in with GitHub**
2. **New +** → **Web Service**
3. Connect repo **`seminoxol/Web`**
4. Settings:

| Field | Value |
|-------|--------|
| **Name** | `pci-glass` |
| **Region** | Oregon (or closest to you) |
| **Branch** | `main` |
| **Runtime** | Node |
| **Build Command** | `npm install && npm run build` |
| **Start Command** | `npm start` |
| **Plan** | Free |

5. **Environment Variables** (add these):

```
EMAIL_USER=Pciglass@gmail.com
EMAIL_PASS=your_gmail_app_password
EMAIL_TO=Pciglass@gmail.com
NODE_ENV=production
```

> Do **not** set `PORT` — Render sets it automatically.

6. Click **Create Web Service** — wait for the first deploy (~3–5 min).
7. Test the Render URL: `https://pci-glass.onrender.com` (name may vary).

**Free tier note:** the site sleeps after ~15 minutes with no visitors. The first visit may take 30–60 seconds to wake up.

### 2. Connect custom domain (pciglass.ca)

1. In Render → your service → **Settings** → **Custom Domains**
2. Add **`pciglass.ca`** and **`www.pciglass.ca`**
3. Render shows DNS records — use these in GoDaddy:

**Typical setup:**

| Type | Name | Value |
|------|------|--------|
| **CNAME** | `www` | `pci-glass.onrender.com` (your Render hostname) |
| **ALIAS** or **ANAME** | `@` | Render’s apex target (shown in dashboard) |

If GoDaddy has no ALIAS for `@`, use Render’s instructions — often an **A record** IP or forward `@` → `www`.

4. In GoDaddy → **DNS** → **delete** the old `www` CNAME to `pciglass.github.io`
5. Wait 15–60 min for SSL (Render provisions HTTPS automatically)

### 3. Verify

- https://pciglass.ca loads with styling
- https://pciglass.ca/faq/ works
- Submit a test quote
- GA4 Realtime shows a visit

### 4. Updates

Push to GitHub `main` — Render auto-redeploys.

---

## Oracle Cloud / VPS (alternative)

See steps below if you self-host on a VM instead of Render.

---

## Gmail App Password (required for quotes on any host)

1. Open [Google Account → Security](https://myaccount.google.com/security)
2. Enable **2-Step Verification** if it is off
3. Go to **App passwords** (search “App passwords” in Security)
4. Create a new app password: **Mail** / **Windows Computer** (or your server name)
5. Copy the 16-character password
6. Update `.env` on the **server** (never commit `.env`):

```env
EMAIL_USER=Pciglass@gmail.com
EMAIL_PASS=your_new_16_char_app_password
EMAIL_TO=Pciglass@gmail.com
PORT=8080
```

7. Revoke the old app password in the same App passwords screen

## 2. Push code to GitHub

From your dev machine:

```bash
git push origin main
```

## 3. Update the production server

SSH into the machine that runs pciglass.ca, then:

```bash
cd /path/to/Web   # your clone of github.com/seminoxol/Web
git pull origin main
npm install
```

Ensure `.env` exists on the server with the **new** `EMAIL_PASS`.

Restart the app:

```bash
# If using PM2
pm2 restart pci-glass

# Or plain Node
npm start
```

## 4. Verify

- Site loads: https://pciglass.ca
- Health: submit a test quote (use your own email)
- Check server logs for `Gmail connection ready`
- Confirm owner + customer emails arrive

## Notes

- `.env` stays on the server only — not in git
- Quote JSON fallbacks save to `data/quotes/` when email is not configured (also gitignored)
- Product images live in `images/` and are served by Express
