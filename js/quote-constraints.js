window.__quoteConstraints = {
    DIM: {
        width: { min: 1, max: 240 },
        height: { min: 1, max: 144 }
    },
    QTY: { min: 1, max: 10000 },
    PHONE_RE: /^[\d\s\-().+]{10,20}$/,

    parseDim(raw, kind) {
        const cleaned = String(raw ?? '').replace(/[^\d.]/g, '');
        const n = parseFloat(cleaned);
        const { min, max } = this.DIM[kind] || this.DIM.width;
        if (!Number.isFinite(n) || n < min || n > max) return null;
        return String(Math.round(n * 8) / 8);
    },

    isValidDim(raw, kind) {
        return this.parseDim(raw, kind) !== null;
    },

    parseQty(raw) {
        const n = parseInt(String(raw ?? '1'), 10);
        if (!Number.isFinite(n) || n < this.QTY.min || n > this.QTY.max) return null;
        return n;
    },

    isValidPhone(raw) {
        const s = String(raw ?? '').trim();
        if (!s || !this.PHONE_RE.test(s)) return false;
        const digits = s.replace(/\D/g, '');
        return digits.length >= 10 && digits.length <= 15;
    }
};
