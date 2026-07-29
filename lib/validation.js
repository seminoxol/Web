const FIELD_LIMITS = {
    name: 100,
    company: 100,
    email: 254,
    phone: 20,
    message: 2000,
    product: 50,
    type: 200
};

const DIM_LIMITS = {
    width: { min: 1, max: 240 },
    height: { min: 1, max: 144 }
};

const QTY_LIMITS = { min: 1, max: 10000 };
const MAX_ITEMS = 10;

const PHONE_RE = /^[\d\s\-().+]{10,20}$/;
const ALLOWED_PRODUCTS = new Set(['Glass', 'Window', 'Doors']);

const stripHtml = v => (typeof v === 'string' ? v.replace(/<[^>]*>/g, '').trim() : '');

const sanitizeField = (v, maxLen) => {
    const s = stripHtml(v);
    return s.length > maxLen ? s.slice(0, maxLen) : s;
};

const parseDimension = (raw, kind) => {
    const cleaned = stripHtml(String(raw ?? '')).replace(/[^\d.]/g, '');
    const n = parseFloat(cleaned);
    const { min, max } = DIM_LIMITS[kind] || DIM_LIMITS.width;
    if (!Number.isFinite(n) || n < min || n > max) {
        return { ok: false, error: `${kind} must be between ${min} and ${max} inches.` };
    }
    return { ok: true, value: String(Math.round(n * 8) / 8) };
};

const parseQuantity = v => {
    const n = parseInt(String(v ?? '1'), 10);
    if (!Number.isFinite(n) || n < QTY_LIMITS.min || n > QTY_LIMITS.max) {
        return { ok: false, error: `Quantity must be between ${QTY_LIMITS.min} and ${QTY_LIMITS.max}.` };
    }
    return { ok: true, value: String(n) };
};

const isValidPhone = phone => {
    const s = sanitizeField(phone, FIELD_LIMITS.phone);
    if (!s || !PHONE_RE.test(s)) return false;
    const digits = s.replace(/\D/g, '');
    return digits.length >= 10 && digits.length <= 15;
};

const parseItems = body => {
    const raw = Array.isArray(body.items) ? body.items.slice(0, MAX_ITEMS) : [];
    const items = [];

    for (const item of raw) {
        const product = sanitizeField(item?.product, FIELD_LIMITS.product);
        const type = sanitizeField(item?.type, FIELD_LIMITS.type);
        const hasContent = item?.width || item?.height || product || type;
        if (!hasContent) continue;

        const widthResult = parseDimension(item?.width, 'width');
        if (!widthResult.ok) return { ok: false, error: widthResult.error };

        const heightResult = parseDimension(item?.height, 'height');
        if (!heightResult.ok) return { ok: false, error: heightResult.error };

        const qtyResult = parseQuantity(item?.quantity);
        if (!qtyResult.ok) return { ok: false, error: qtyResult.error };

        if (product && !ALLOWED_PRODUCTS.has(product)) {
            return { ok: false, error: 'Invalid product selection.' };
        }

        if (widthResult.value || heightResult.value || product || type) {
            items.push({
                width: widthResult.value,
                height: heightResult.value,
                product,
                type,
                quantity: qtyResult.value
            });
        }
    }

    return { ok: true, items };
};

const validateQuoteBody = body => {
    const name = sanitizeField(body.name, FIELD_LIMITS.name);
    const company = sanitizeField(body.company, FIELD_LIMITS.company);
    const email = sanitizeField(body.email, FIELD_LIMITS.email);
    const phone = sanitizeField(body.phone, FIELD_LIMITS.phone);
    const message = sanitizeField(body.message, FIELD_LIMITS.message);

    if (!name) return { ok: false, error: 'Name is required.' };
    if (!email) return { ok: false, error: 'Email is required.' };
    if (!phone) return { ok: false, error: 'Phone is required.' };
    if (!isValidPhone(phone)) return { ok: false, error: 'Enter a valid phone number (at least 10 digits).' };

    const itemsResult = parseItems(body);
    if (!itemsResult.ok) return itemsResult;

    if (!itemsResult.items.length && !message) {
        return { ok: false, error: 'Add at least one product to your inquiry list, or include a note.' };
    }

    return {
        ok: true,
        data: { name, company, email, phone, message, items: itemsResult.items }
    };
};

const isAllowedOrigin = (req, port = 8080) => {
    const origin = req.get('origin');
    const referer = req.get('referer');
    const isProd = process.env.NODE_ENV === 'production';
    if (!origin && !referer) return !isProd;

    const hosts = new Set([
        'https://pciglass.ca',
        'https://www.pciglass.ca',
        `http://localhost:${port}`,
        `http://127.0.0.1:${port}`
    ]);

    const check = url => {
        try {
            const { origin: o } = new URL(url);
            return hosts.has(o);
        } catch {
            return false;
        }
    };

    if (origin && !check(origin)) return false;
    if (referer && !check(referer)) return false;
    return true;
};

module.exports = {
    FIELD_LIMITS,
    DIM_LIMITS,
    QTY_LIMITS,
    sanitizeField,
    parseDimension,
    parseQuantity,
    isValidPhone,
    validateQuoteBody,
    isAllowedOrigin
};
