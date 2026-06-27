const EMAIL_STYLE = `body{font-family:Georgia,serif;background:#f0f7fc;margin:0;padding:24px}.card{background:#fff;border-radius:8px;margin:0 auto;border-top:4px solid #2EC4B6;padding:32px 36px;box-shadow:0 4px 20px rgba(10,35,66,.08)}h2{color:#0A2342;margin:0 0 8px}p{color:#5A7A94;line-height:1.7;margin:12px 0}table{width:100%;border-collapse:collapse}td{padding:10px 0;border-bottom:1px solid #e8f2f9;vertical-align:top}td:first-child{color:#5A7A94;font-size:12px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;width:130px;padding-right:16px}td:last-child{color:#0A2342;font-size:15px}.note,.contact{margin-top:24px;padding:16px;background:#ebf5fb;border-radius:6px}.note{font-size:13px;color:#5A7A94}.contact a{color:#2EC4B6;font-weight:600}`;

const escapeHtml = value => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const emailShell = (body, maxWidth = 560) => `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>${EMAIL_STYLE}.card{max-width:${maxWidth}px}h2{font-size:${maxWidth > 520 ? '1.4rem' : 'inherit'};margin-bottom:${maxWidth > 520 ? '4px' : '8px'}}.sub{color:#5A7A94;font-size:13px;margin:0 0 28px}</style></head><body><div class="card">${body}</div></body></html>`;

const row = ([label, val]) => `<tr><td>${escapeHtml(label)}</td><td>${val}</td></tr>`;

const formatItem = ({ product, type, width, height, quantity }) => {
    const qty = quantity && quantity !== '1' ? ` (×${escapeHtml(quantity)})` : '';
    return `${escapeHtml(width)}" × ${escapeHtml(height)}" — ${escapeHtml(product)} — ${escapeHtml(type)}${qty}`;
};

const ownerEmail = ({ name, company, email, phone, items, message }) => emailShell(
    `<h2>New Quote Request</h2><p class="sub">Submitted via pciglass.ca</p><table>${
        [
            ['Name', escapeHtml(name)],
            company && ['Company', escapeHtml(company)],
            ['Email', `<a href="mailto:${encodeURIComponent(email)}" style="color:#2EC4B6">${escapeHtml(email)}</a>`],
            ['Phone', `<a href="tel:${escapeHtml(phone)}" style="color:#2EC4B6">${escapeHtml(phone)}</a>`],
            items?.length && ['Items', items.map((item, i) => `<strong>#${i + 1}</strong> ${formatItem(item)}`).join('<br>')],
            message && ['Message', `<span style="white-space:pre-line">${escapeHtml(message)}</span>`]
        ].filter(Boolean).map(row).join('')
    }</table><p class="note">Reply directly to this email to respond to ${escapeHtml(name)}.</p>`
);

const customerEmail = name => emailShell(
    `<h2>Hi ${escapeHtml(name)},</h2><p>Thank you for reaching out to PCI Glass. We've received your quote request and will get back to you within <strong style="color:#0A2342">one business day</strong>.</p><p>If you need an immediate response, feel free to call us directly:</p><div class="contact"><p style="margin:4px 0">📞 <a href="tel:+14162975959">416-297-5959</a> &nbsp; EN / 粤</p><p style="margin:4px 0">📞 <a href="tel:+16479788894">647-978-8894</a> &nbsp; 中文</p><p style="margin:4px 0">✉️ <a href="mailto:Pciglass@gmail.com">Pciglass@gmail.com</a></p></div><p style="font-size:13px;margin-top:24px;color:#8AABB8">Planet Construction Industry Glass<br>Unit 15 – 75 Milliken Blvd, Scarborough, ON M1V 1R3</p>`,
    520
);

module.exports = { ownerEmail, customerEmail, escapeHtml };
