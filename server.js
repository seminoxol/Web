require('dotenv').config();
const express = require('express');
const compression = require('compression');
const nodemailer = require('nodemailer');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { ownerEmail, customerEmail } = require('./lib/email');
const { isEmailConfigured, saveQuoteLocally } = require('./lib/quotes');

const app = express();
const ROOT = __dirname;
const PORT = process.env.PORT || 3000;
const mailConfigured = isEmailConfigured();
const sanitize = v => typeof v === 'string' ? v.replace(/<[^>]*>/g, '').trim().slice(0, 1000) : '';
const quoteLimiter = rateLimit({ windowMs: 900000, max: 5, standardHeaders: true, legacyHeaders: false, message: { error: 'Too many requests. Please try again in 15 minutes.' } });
const transporter = mailConfigured ? nodemailer.createTransport({
    service: 'gmail',
    pool: true,
    maxConnections: 2,
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
}) : null;

const parseItems = body => (Array.isArray(body.items) ? body.items : [])
    .slice(0, 10)
    .map(item => ({
        width: sanitize(item?.width),
        height: sanitize(item?.height),
        product: sanitize(item?.product),
        type: sanitize(item?.type)
    }))
    .filter(item => item.width || item.height || item.product || item.type);

const staticOpts = (maxAge) => ({
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
            scriptSrc: ["'self'", "'unsafe-inline'", 'maps.googleapis.com'],
            styleSrc: ["'self'", "'unsafe-inline'", 'fonts.googleapis.com'],
            fontSrc: ["'self'", 'fonts.gstatic.com'],
            imgSrc: ["'self'", 'data:', 'https:'],
            frameSrc: ['maps.google.com', '*.google.com'],
            connectSrc: ["'self'"],
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

app.get('/style.css', (_, res) => {
    res.set('Cache-Control', 'public, max-age=86400');
    res.sendFile(path.join(ROOT, 'style.css'));
});
app.use('/css', express.static(path.join(ROOT, 'css'), staticOpts('7d')));
app.use('/js', express.static(path.join(ROOT, 'js'), staticOpts('7d')));
app.use('/images', express.static(path.join(ROOT, 'images'), staticOpts('30d')));

app.get('/api/quote/status', (_, res) => {
    res.json({ emailReady: mailConfigured });
});

app.post('/api/quote', quoteLimiter, async (req, res) => {
    const name = sanitize(req.body.name);
    const company = sanitize(req.body.company);
    const email = sanitize(req.body.email);
    const phone = sanitize(req.body.phone);
    const message = sanitize(req.body.message);
    const items = parseItems(req.body);

    if (!name || !email || !phone) return res.status(400).json({ error: 'Name, email and phone are required.' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Invalid email address.' });
    if (!items.length && !message) {
        return res.status(400).json({ error: 'Add at least one product to your inquiry list, or include a note.' });
    }

    const payload = { name, company, email, phone, items, message };

    if (!mailConfigured) {
        try {
            const file = saveQuoteLocally(payload, ROOT);
            console.log(`📋  Quote saved locally (email not configured): ${file}`);
            return res.json({ success: true, storedLocally: true });
        } catch (err) {
            console.error('Quote save error:', err.message);
            return res.status(500).json({ error: 'Could not save your request. Please call us directly.' });
        }
    }

    const mailFrom = `"PCI Glass Website" <${process.env.EMAIL_USER}>`;

    try {
        const mailTo = process.env.EMAIL_TO ?? 'Pciglass@gmail.com';
        await Promise.all([
            transporter.sendMail({
                from: mailFrom, to: mailTo, replyTo: email,
                subject: `New Quote Request — ${name}${company ? ` (${company})` : ''}`,
                html: ownerEmail(payload)
            }),
            transporter.sendMail({
                from: `"PCI Glass" <${process.env.EMAIL_USER}>`, to: email,
                subject: 'We received your quote request — PCI Glass',
                html: customerEmail(name)
            })
        ]);
        res.json({ success: true });
    } catch (err) {
        console.error('Email error:', err.message);
        res.status(500).json({ error: 'Could not send email. Please call us directly.' });
    }
});

app.get('*', (req, res) => {
    if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'Not found.' });
    res.set('Cache-Control', 'no-cache');
    res.sendFile(path.join(ROOT, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`✅  PCI Glass server running → http://localhost:${PORT}`);
    if (!mailConfigured) {
        console.warn('⚠️  Email not configured — quotes will be saved to data/quotes/ until EMAIL_USER and EMAIL_PASS are set in .env');
        return;
    }
    transporter.verify()
        .then(() => console.log('📧  Gmail connection ready'))
        .catch(err => console.warn('⚠️  Gmail connection check failed:', err.message));
});
