# Deploying PCI Glass

## 1. Rotate Gmail App Password (do this first if the old one was shared)

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
