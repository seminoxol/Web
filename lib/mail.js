const nodemailer = require('nodemailer');
const { ownerEmail, customerEmail } = require('./email');

const PLACEHOLDER_RE = /your_gmail|your_16_char|placeholder|example\.com/i;
const MAIL_SEND_TIMEOUT_MS = 25000;

const clean = v => (typeof v === 'string' ? v.trim() : '');

const hasResend = () => Boolean(clean(process.env.RESEND_API_KEY));

const hasGmail = () => {
    const user = clean(process.env.EMAIL_USER);
    const pass = clean(process.env.EMAIL_PASS).replace(/\s+/g, '');
    return Boolean(user && pass && !PLACEHOLDER_RE.test(user) && !PLACEHOLDER_RE.test(pass));
};

const ownerAddress = () => clean(process.env.EMAIL_TO) || 'Pciglass@gmail.com';

const gmailUser = () => clean(process.env.EMAIL_USER);

const resendFrom = () =>
    clean(process.env.RESEND_FROM)
    || clean(process.env.EMAIL_FROM)
    || `PCI Glass <quotes@${clean(process.env.RESEND_DOMAIN) || 'pciglass.ca'}>`;

let gmailTransporter = null;
let status = {
    ready: false,
    provider: null,
    verified: false,
    error: null
};

const withTimeout = (promise, ms, label = 'MAIL_TIMEOUT') => Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(label)), ms))
]);

const buildGmailTransporter = () => {
    if (!hasGmail()) return null;
    return nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        pool: false,
        family: 4,
        connectionTimeout: 12000,
        greetingTimeout: 12000,
        socketTimeout: 22000,
        auth: {
            user: gmailUser(),
            pass: clean(process.env.EMAIL_PASS).replace(/\s+/g, '')
        }
    });
};

const initMail = async () => {
    if (hasResend()) {
        status = { ready: true, provider: 'resend', verified: true, error: null };
        return status;
    }

    if (!hasGmail()) {
        status = { ready: false, provider: null, verified: false, error: 'Email credentials not configured.' };
        return status;
    }

    try {
        gmailTransporter = buildGmailTransporter();
        await withTimeout(gmailTransporter.verify(), 15000, 'GMAIL_VERIFY_TIMEOUT');
        status = { ready: true, provider: 'gmail', verified: true, error: null };
    } catch (err) {
        gmailTransporter = null;
        const msg = err.message || 'Gmail connection failed.';
        const renderBlocked = /timeout|ENETUNREACH|ECONNREFUSED|network is unreachable/i.test(msg);
        status = {
            ready: true,
            provider: 'gmail',
            verified: false,
            error: renderBlocked
                ? 'Gmail SMTP is blocked on Render free tier (ports 465/587). Add RESEND_API_KEY or upgrade Render to a paid plan.'
                : msg
        };
    }
    return status;
};

const sendViaResend = async ({ from, to, subject, html, replyTo }) => {
    const res = await withTimeout(fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${clean(process.env.RESEND_API_KEY)}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            from,
            to: [to],
            subject,
            html,
            reply_to: replyTo || undefined
        })
    }), MAIL_SEND_TIMEOUT_MS);

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        const msg = data?.message || data?.error || `Resend error (${res.status})`;
        throw new Error(msg);
    }
    return data;
};

const sendViaGmail = async ({ from, to, subject, html, replyTo }) => {
    if (!gmailTransporter) gmailTransporter = buildGmailTransporter();
    if (!gmailTransporter) throw new Error('Gmail not configured.');
    await withTimeout(gmailTransporter.sendMail({ from, to, subject, html, replyTo }), MAIL_SEND_TIMEOUT_MS);
};

const sendMessage = async ({ from, to, subject, html, replyTo }) => {
    if (hasResend()) {
        await sendViaResend({ from: resendFrom(), to, subject, html, replyTo });
        return 'resend';
    }
    if (hasGmail()) {
        await sendViaGmail({ from, to, subject, html, replyTo });
        return 'gmail';
    }
    throw new Error('No email provider configured.');
};

const formatWebhookText = payload => {
    const lines = [
        '**New quote request — pciglass.ca**',
        `Name: ${payload.name}`,
        payload.company ? `Company: ${payload.company}` : null,
        `Email: ${payload.email}`,
        `Phone: ${payload.phone}`,
        payload.items?.length
            ? `Items:\n${payload.items.map((item, i) => `${i + 1}. ${item.width}"×${item.height}" ${item.product} — ${item.type}${item.quantity !== '1' ? ` ×${item.quantity}` : ''}`).join('\n')}`
            : null,
        payload.message ? `Notes: ${payload.message}` : null
    ].filter(Boolean);
    return lines.join('\n');
};

const notifyWebhook = async payload => {
    const url = clean(process.env.QUOTE_WEBHOOK_URL);
    if (!url) return false;
    try {
        await withTimeout(fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: formatWebhookText(payload) })
        }), 8000);
        return true;
    } catch (err) {
        console.error('Webhook notify failed:', err.message);
        return false;
    }
};

const sendQuoteEmails = async payload => {
    const mailTo = ownerAddress();
    const customer = payload.email;
    const ownerSubject = `New Quote Request — ${payload.name}${payload.company ? ` (${payload.company})` : ''}`;
    const ownerHtml = ownerEmail(payload);
    const customerHtml = customerEmail(payload.name);

    let provider = null;
    let ownerSent = false;
    let customerSent = false;
    let error = null;

    const webhookSent = await notifyWebhook(payload);

    try {
        if (hasResend()) {
            provider = await sendMessage({
                from: resendFrom(),
                to: mailTo,
                subject: ownerSubject,
                html: ownerHtml,
                replyTo: customer
            });
            ownerSent = true;
        } else if (hasGmail()) {
            const from = `"PCI Glass Website" <${gmailUser()}>`;
            provider = await sendMessage({
                from,
                to: mailTo,
                subject: ownerSubject,
                html: ownerHtml,
                replyTo: customer
            });
            ownerSent = true;
        } else {
            throw new Error('No email provider configured.');
        }
    } catch (err) {
        error = err.message || 'Owner email failed.';
        console.error('Owner email error:', error);
    }

    if (ownerSent) {
        try {
            if (hasResend()) {
                await sendMessage({
                    from: resendFrom(),
                    to: customer,
                    subject: 'We received your quote request — PCI Glass',
                    html: customerHtml
                });
            } else {
                await sendMessage({
                    from: `"PCI Glass" <${gmailUser()}>`,
                    to: customer,
                    subject: 'We received your quote request — PCI Glass',
                    html: customerHtml
                });
            }
            customerSent = true;
        } catch (err) {
            console.error('Customer confirmation email failed:', err.message);
        }
    }

    return { provider, ownerSent, customerSent, webhookSent, error };
};

const getMailStatus = () => ({
    ...status,
    resendConfigured: hasResend(),
    gmailConfigured: hasGmail(),
    ownerAddress: ownerAddress()
});

module.exports = {
    initMail,
    getMailStatus,
    hasResend,
    hasGmail,
    sendQuoteEmails,
    notifyWebhook
};
