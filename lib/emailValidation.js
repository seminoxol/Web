const dns = require('dns').promises;

const DNS_TIMEOUT_MS = 5000;

const EMAIL_FORMAT_RE = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

const BLOCKED_DOMAINS = new Set([
    'example.com',
    'example.org',
    'example.net',
    'test.com',
    'invalid.com',
    'localhost',
    'mailinator.com',
    'guerrillamail.com',
    'guerrillamail.net',
    'guerrillamail.org',
    'sharklasers.com',
    'grr.la',
    'guerrillamailblock.com',
    'tempmail.com',
    'temp-mail.org',
    'throwaway.email',
    'yopmail.com',
    'yopmail.fr',
    'yopmail.net',
    '10minutemail.com',
    '10minutemail.net',
    'trashmail.com',
    'trashmail.me',
    'dispostable.com',
    'maildrop.cc',
    'getnada.com',
    'fakeinbox.com',
    'mintemail.com',
    'emailondeck.com',
    'tempail.com',
    'burnermail.io',
    'mailnesia.com',
    'mytemp.email',
    'tmpmail.net',
    'tmpmail.org',
    'discard.email',
    'spamgourmet.com',
    'mailcatch.com',
    'inboxkitten.com',
    'getairmail.com'
]);

const parseEmail = raw => {
    const normalized = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
    const at = normalized.lastIndexOf('@');
    if (at <= 0 || at === normalized.length - 1) return null;

    const local = normalized.slice(0, at);
    const domain = normalized.slice(at + 1);

    if (!local || !domain || local.length > 64 || domain.length > 253) return null;
    if (local.startsWith('.') || local.endsWith('.') || local.includes('..')) return null;
    if (domain.startsWith('.') || domain.endsWith('.') || domain.includes('..')) return null;
    if (!domain.includes('.')) return null;

    const tld = domain.split('.').pop();
    if (!tld || tld.length < 2 || !/^[a-z0-9-]+$/i.test(tld)) return null;

    return { local, domain, normalized };
};

const isFormatValid = email => {
    const parsed = parseEmail(email);
    if (!parsed) return false;
    return EMAIL_FORMAT_RE.test(parsed.normalized);
};

const isBlockedDomain = domain =>
    BLOCKED_DOMAINS.has(domain)
    || domain.endsWith('.test')
    || domain.endsWith('.invalid')
    || domain.endsWith('.local');

const withTimeout = (promise, ms) => Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('DNS_TIMEOUT')), ms))
]);

const domainAcceptsMail = async domain => {
    try {
        const mx = await withTimeout(dns.resolveMx(domain), DNS_TIMEOUT_MS);
        if (Array.isArray(mx) && mx.length > 0) return true;
    } catch (err) {
        if (err.message !== 'DNS_TIMEOUT' && err.code !== 'ENOTFOUND' && err.code !== 'ENODATA') {
            throw err;
        }
    }

    try {
        const records = await withTimeout(dns.resolve(domain), DNS_TIMEOUT_MS);
        return Array.isArray(records) && records.length > 0;
    } catch (err) {
        if (err.message === 'DNS_TIMEOUT') return false;
        if (err.code === 'ENOTFOUND' || err.code === 'ENODATA') return false;
        throw err;
    }
};

const verifyEmail = async rawEmail => {
    const parsed = parseEmail(rawEmail);
    if (!parsed) {
        return { ok: false, reason: 'Enter a valid email address.' };
    }

    if (!EMAIL_FORMAT_RE.test(parsed.normalized)) {
        return { ok: false, reason: 'Enter a valid email address.' };
    }

    if (isBlockedDomain(parsed.domain)) {
        return { ok: false, reason: 'Please use a real email address you check regularly.' };
    }

    let deliverable = false;
    try {
        deliverable = await domainAcceptsMail(parsed.domain);
    } catch {
        return { ok: false, reason: 'Could not verify that email domain. Try again in a moment.' };
    }

    if (!deliverable) {
        return { ok: false, reason: 'That email domain does not look valid. Check for typos.' };
    }

    return { ok: true, email: parsed.normalized };
};

module.exports = {
    parseEmail,
    isFormatValid,
    verifyEmail
};
