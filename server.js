require('dotenv').config();
const express = require('express');
const nodemailer = require('nodemailer');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { ownerEmail, customerEmail } = require('./lib/email');

const app = express();
const ROOT = __dirname;
const PORT = process.env.PORT || 3000;
const mailConfigured = Boolean(process.env.EMAIL_USER && process.env.EMAIL_PASS);
const sanitize = v => typeof v === 'string' ? v.replace(/<[^>]*>/g, '').trim().slice(0, 1000) : '';
const quoteLimiter = rateLimit({ windowMs: 900000, max: 5, standardHeaders: true, legacyHeaders: false, message: { error: 'Too many requests. Please try again in 15 minutes.' } });
const transporter = mailConfigured ? nodemailer.createTransport({ service: 'gmail', auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS } }) : null;

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

app.get('/style.css', (_, res) => res.sendFile(path.join(ROOT, 'style.css')));
app.use('/css', express.static(path.join(ROOT, 'css'), { dotfiles: 'deny' }));
app.use('/js', express.static(path.join(ROOT, 'js'), { dotfiles: 'deny' }));
app.use('/images', express.static(path.join(ROOT, 'images'), { dotfiles: 'deny' }));

app.post('/api/quote', quoteLimiter, async (req, res) => {
    if (!mailConfigured) return res.status(503).json({ error: 'Email is not configured. Please call us directly.' });

    const name = sanitize(req.body.name);
    const company = sanitize(req.body.company);
    const email = sanitize(req.body.email);
    const phone = sanitize(req.body.phone);
    const dimensions = sanitize(req.body.dimensions);
    const message = sanitize(req.body.message);
    const products = (Array.isArray(req.body.products) ? req.body.products : [req.body.products]).map(sanitize).filter(Boolean);

    if (!name || !email || !phone) return res.status(400).json({ error: 'Name, email and phone are required.' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Invalid email address.' });

    const productList = products.join(', ') || 'Not specified';
    const mailFrom = `"PCI Glass Website" <${process.env.EMAIL_USER}>`;
    const payload = { name, company, email, phone, productList, dimensions, message };

    try {
        await transporter.sendMail({
            from: mailFrom, to: process.env.EMAIL_TO ?? 'Pciglass@gmail.com', replyTo: email,
            subject: `New Quote Request — ${name}${company ? ` (${company})` : ''}`,
            html: ownerEmail(payload)
        });
        await transporter.sendMail({
            from: `"PCI Glass" <${process.env.EMAIL_USER}>`, to: email,
            subject: 'We received your quote request — PCI Glass',
            html: customerEmail(name)
        });
        res.json({ success: true });
    } catch (err) {
        console.error('Email error:', err.message);
        res.status(500).json({ error: 'Could not send email. Please call us directly.' });
    }
});

app.get('*', (req, res) => {
    if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'Not found.' });
    res.sendFile(path.join(ROOT, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`✅  PCI Glass server running → http://localhost:${PORT}`);
    if (!mailConfigured) console.warn('⚠️  EMAIL_USER / EMAIL_PASS missing in .env — quote emails disabled.');
});
