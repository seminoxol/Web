require('dotenv').config();
const express = require('express');
const compression = require('compression');
const path = require('path');
const fs = require('fs');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { isEmailConfigured, saveQuoteLocally } = require('./lib/quotes');
const { verifyEmail, isFormatValid } = require('./lib/emailValidation');
const { renderPage, ASSET_VERSION } = require('./lib/pages');
const { initMail, getMailStatus, sendQuoteEmails } = require('./lib/mail');

const app = express();
const ROOT = __dirname;
const PORT = process.env.PORT || 8080;
const IS_DEV = process.env.NODE_ENV !== 'production';
const mailConfigured = isEmailConfigured();
const ROOT_HTML_ALLOWLIST = new Set(['index.html', '404.html']);

const sanitize = v => typeof v === 'string' ? v.replace(/<[^>]*>/g, '').trim().slice(0, 1000) : '';

const parseQuantity = v => {
    const n = parseInt(v, 10);
    return Number.isFinite(n) && n >= 1 && n <= 999 ? String(n) : '1';
};

const parseItems = body => (Array.isArray(body.items) ? body.items : [])
    .slice(0, 10)
    .map(item => ({
        width: sanitize(item?.width),
        height: sanitize(item?.height),
        product: sanitize(item?.product),
        type: sanitize(item?.type),
        quantity: parseQuantity(item?.quantity)
    }))
    .filter(item => item.width || item.height || item.product || item.type);

const quoteLimiter = rateLimit({ windowMs: 900000, max: 5, standardHeaders: true, legacyHeaders: false, message: { error: 'Too many requests. Please try again in 15 minutes.' } });
const emailVerifyLimiter = rateLimit({ windowMs: 900000, max: 30, standardHeaders: true, legacyHeaders: false, message: { error: 'Too many email checks. Please try again in a few minutes.' } });

const staticOpts = maxAge => ({
    dotfiles: 'deny',
    etag: true,
    lastModified: true,
    maxAge,
    setHeaders(res, filePath) {
        if (filePath.endsWith('.html')) {
            res.setHeader('Cache-Control', 'no-cache');
        }
    }
});

app.use(compression());
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", 'https://www.googletagmanager.com'],
            scriptSrcAttr: ["'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'", 'fonts.googleapis.com'],
            fontSrc: ["'self'", 'fonts.gstatic.com'],
            imgSrc: ["'self'", 'data:', 'https:'],
            frameSrc: ['maps.google.com', '*.google.com'],
            connectSrc: ["'self'", 'https://www.google-analytics.com', 'https://www.googletagmanager.com', 'https://region1.google-analytics.com'],
        }
    }
}));
app.use(express.json({ limit: '10kb' }));

app.get('/robots.txt', (_, res) => {
    res.type('text/plain');
    res.sendFile(path.join(ROOT, 'robots.txt'));
});
app.get('/sitemap.xml', (_, res) => {
    res.type('application/xml');
    res.sendFile(path.join(ROOT, 'sitemap.xml'));
});
app.get('/site.webmanifest', (_, res) => {
    res.type('application/manifest+json');
    res.sendFile(path.join(ROOT, 'site.webmanifest'));
});

const CSS_BUNDLE = [
    'css/tokens.css',
    'css/base.css',
    'css/components.css',
    'css/themes.css',
    'css/responsive.css',
];

const buildStylesheet = () => CSS_BUNDLE
    .map(file => fs.readFileSync(path.join(ROOT, file), 'utf8'))
    .join('\n');

let stylesheetCache = buildStylesheet();

const getStylesheet = () => {
    if (IS_DEV) stylesheetCache = buildStylesheet();
    return stylesheetCache;
};

app.get('/style.css', (_, res) => {
    res.type('text/css');
    res.set('Cache-Control', IS_DEV ? 'no-cache' : `public, max-age=31536000, immutable`);
    res.send(getStylesheet());
});
app.use('/css', express.static(path.join(ROOT, 'css'), staticOpts(IS_DEV ? '0' : '1y')));
app.use('/js', express.static(path.join(ROOT, 'js'), staticOpts(IS_DEV ? '0' : '1y')));
app.use('/images', express.static(path.join(ROOT, 'images'), staticOpts('30d')));

app.get('/api/health', (_, res) => {
    const mail = getMailStatus();
    res.json({
        ok: true,
        emailReady: mailConfigured && mail.verified !== false,
        emailProvider: mail.provider,
        emailVerified: mail.verified,
        emailError: mail.verified ? mail.lastSendError || null : mail.error,
        emailFrom: mail.sendFrom || null,
        emailTo: mail.ownerAddress || null,
        assetVersion: ASSET_VERSION
    });
});

app.get('/api/quote/status', (_, res) => {
    res.json({ emailReady: mailConfigured });
});

app.post('/api/quote/verify-email', emailVerifyLimiter, async (req, res) => {
    const email = sanitize(req.body.email);
    if (!email) return res.status(400).json({ ok: false, error: 'Email is required.' });
    if (!isFormatValid(email)) return res.status(400).json({ ok: false, error: 'Enter a valid email address.' });

    try {
        const result = await verifyEmail(email);
        if (!result.ok) return res.status(400).json({ ok: false, error: result.reason });
        res.json({ ok: true, email: result.email });
    } catch (err) {
        console.error('Email verify error:', err.message);
        res.status(500).json({ ok: false, error: 'Could not verify email right now. Try again shortly.' });
    }
});

app.post('/api/quote', quoteLimiter, async (req, res) => {
    if (sanitize(req.body.website)) {
        return res.status(400).json({ error: 'Invalid submission.' });
    }

    const name = sanitize(req.body.name);
    const company = sanitize(req.body.company);
    const email = sanitize(req.body.email);
    const phone = sanitize(req.body.phone);
    const message = sanitize(req.body.message);
    const items = parseItems(req.body);
    const consent = req.body.consent === true || req.body.consent === 'true';

    if (!consent) return res.status(400).json({ error: 'Please accept the privacy policy to continue.' });
    if (!name || !email || !phone) return res.status(400).json({ error: 'Name, email and phone are required.' });

    let verifiedEmail;
    try {
        const emailResult = await verifyEmail(email);
        if (!emailResult.ok) return res.status(400).json({ error: emailResult.reason });
        verifiedEmail = emailResult.email;
    } catch (err) {
        console.error('Email verify error:', err.message);
        return res.status(400).json({ error: 'Could not verify that email address. Check for typos and try again.' });
    }

    if (!items.length && !message) {
        return res.status(400).json({ error: 'Add at least one product to your inquiry list, or include a note.' });
    }

    const payload = { name, company, email: verifiedEmail, phone, items, message };

    let savedFile = null;
    try {
        savedFile = saveQuoteLocally(payload, ROOT);
        console.log(`📋  Quote saved: ${savedFile}`);
    } catch (err) {
        console.error('Quote save error:', err.message);
    }

    if (!mailConfigured) {
        if (savedFile) return res.json({ success: true, storedLocally: true, emailSent: false });
        return res.status(500).json({ error: 'Could not save your request. Please call us directly.' });
    }

    const result = await sendQuoteEmails(payload);

    if (result.ownerSent) {
        return res.json({
            success: true,
            emailSent: true,
            provider: result.provider,
            customerSent: result.customerSent,
            storedLocally: Boolean(savedFile)
        });
    }

    if (savedFile || result.webhookSent) {
        return res.json({
            success: true,
            storedLocally: true,
            emailSent: false,
            emailPending: true,
            webhookSent: result.webhookSent,
            error: result.error
        });
    }

    res.status(500).json({ error: result.error || 'Could not send email. Please call us directly.' });
});

const sendHtml = (res, file, opts = {}) => {
    res.set('Cache-Control', 'no-cache');
    res.type('html').send(renderPage(file, opts));
};

app.get('/', (_, res) => sendHtml(res, 'index.html'));
app.get('/index.html', (_, res) => sendHtml(res, 'index.html'));
const faqPage = (_, res) => sendHtml(res, path.join('faq', 'index.html'), {
    header: { solid: true, activePage: 'faq' },
    footer: { activePage: 'faq' }
});
app.get('/faq/', faqPage);
app.get('/faq/index.html', faqPage);
app.get('/faq', (_, res) => res.redirect(301, '/faq/'));
app.get('/faq.html', (_, res) => res.redirect(301, '/faq/'));
const termsPage = (_, res) => sendHtml(res, path.join('terms', 'index.html'), {
    header: { solid: true },
    footer: { activePage: 'terms' }
});
app.get('/terms/', termsPage);
app.get('/terms/index.html', termsPage);
app.get('/terms', (_, res) => res.redirect(301, '/terms/'));
app.get('/terms.html', (_, res) => res.redirect(301, '/terms/'));
const privacyPage = (_, res) => sendHtml(res, path.join('privacy', 'index.html'), {
    header: { solid: true },
    footer: { activePage: 'privacy' }
});
app.get('/privacy/', privacyPage);
app.get('/privacy/index.html', privacyPage);
app.get('/privacy', (_, res) => res.redirect(301, '/privacy/'));
app.get('/privacy.html', (_, res) => res.redirect(301, '/privacy/'));

app.get('*', (req, res) => {
    if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'Not found.' });
    const base = path.basename(req.path);
    if (base.endsWith('.html')) {
        if (base === 'faq.html') return res.redirect(301, '/faq/');
        if (base === 'terms.html') return res.redirect(301, '/terms/');
        if (base === 'privacy.html') return res.redirect(301, '/privacy/');
        if (ROOT_HTML_ALLOWLIST.has(base)) {
            const file = path.resolve(ROOT, base);
            if (file.startsWith(ROOT) && fs.existsSync(file)) {
                return sendHtml(res, base, base === '404.html' ? { header: { solid: true } } : {});
            }
        }
    }
    res.status(404);
    sendHtml(res, '404.html', { header: { solid: true } });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅  PCI Glass server running → http://localhost:${PORT}`);
    void initMail().then(mail => {
        if (!mail.ready) {
            console.warn('⚠️  Email not configured — quotes will be saved to data/quotes/ until credentials are added.');
            return;
        }
        if (mail.provider === 'resend') {
            console.log('📧  Resend email ready');
            return;
        }
        if (mail.verified) console.log('📧  Gmail SMTP ready');
        else console.warn('⚠️  Gmail SMTP check failed:', mail.error);
    });
});
