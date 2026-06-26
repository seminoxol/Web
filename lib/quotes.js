const fs = require('fs');
const path = require('path');

const PLACEHOLDER_RE = /your_gmail|your_16_char|placeholder|example\.com/i;

const isEmailConfigured = () => {
    const user = process.env.EMAIL_USER?.trim();
    const pass = process.env.EMAIL_PASS?.trim();
    return Boolean(user && pass && !PLACEHOLDER_RE.test(user) && !PLACEHOLDER_RE.test(pass));
};

const saveQuoteLocally = (payload, rootDir) => {
    const dir = path.join(rootDir, 'data', 'quotes');
    fs.mkdirSync(dir, { recursive: true });
    const safe = String(payload.email || 'quote').replace(/[^a-z0-9]+/gi, '_').slice(0, 40) || 'quote';
    const file = path.join(dir, `${Date.now()}-${safe}.json`);
    fs.writeFileSync(file, JSON.stringify({ ...payload, receivedAt: new Date().toISOString() }, null, 2), 'utf8');
    return file;
};

module.exports = { isEmailConfigured, saveQuoteLocally, PLACEHOLDER_RE };
