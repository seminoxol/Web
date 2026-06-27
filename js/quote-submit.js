/**
 * Standalone quote form submit — does not wait for site.js loader.
 */
(() => {
    const EMAIL_RE = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
    const SUBMIT_LABEL = 'Send Quote Request';
    const VERIFY_TIMEOUT_MS = 12000;
    const POST_TIMEOUT_MS = 28000;

    const form = document.getElementById('quoteForm');
    const submitBtn = document.getElementById('qfSubmit');
    const statusEl = document.getElementById('qfStatus');
    const submitText = submitBtn?.querySelector('.qf__submit-text');
    const emailInput = document.getElementById('qf-email');
    const emailHint = document.getElementById('qf-email-hint');

    if (!form || !submitBtn || !submitText) return;

    let emailVerified = '';
    let submitting = false;

    const setStatus = (message, type = 'info') => {
        if (!statusEl) return;
        if (!message) {
            statusEl.hidden = true;
            statusEl.textContent = '';
            statusEl.className = 'qf__status';
            return;
        }
        statusEl.hidden = false;
        statusEl.textContent = message;
        statusEl.className = `qf__status qf__status--${type}`;
    };

    const setSubmitLabel = (text, resetMs = 0) => {
        submitText.textContent = text;
        if (resetMs) {
            setTimeout(() => {
                submitText.textContent = SUBMIT_LABEL;
            }, resetMs);
        }
    };

    const setEmailHint = (message, type = '') => {
        if (!emailHint) return;
        emailHint.textContent = message;
        emailHint.className = `qf__field-hint${type ? ` qf__field-hint--${type}` : ''}`;
        emailHint.hidden = !message;
    };

    const fetchWithTimeout = (url, options, ms) => {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), ms);
        return fetch(url, { ...options, signal: ctrl.signal }).finally(() => clearTimeout(timer));
    };

    const verifyEmail = async email => {
        if (!email) return { ok: false, reason: 'Email is required.' };
        if (!EMAIL_RE.test(email)) return { ok: false, reason: 'Enter a valid email address.' };
        if (location.protocol === 'file:') return { ok: true, email: email.toLowerCase() };
        if (emailVerified === email.toLowerCase()) return { ok: true, email: emailVerified };

        setEmailHint('Checking email…', 'pending');
        try {
            const res = await fetchWithTimeout('/api/quote/verify-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            }, VERIFY_TIMEOUT_MS);
            const data = await res.json().catch(() => ({}));
            if (!res.ok || !data.ok) {
                emailVerified = '';
                const reason = data.error ?? 'That email could not be verified.';
                setEmailHint(reason, 'error');
                return { ok: false, reason };
            }
            emailVerified = data.email ?? email.toLowerCase();
            setEmailHint('', '');
            return { ok: true, email: emailVerified };
        } catch (err) {
            emailVerified = '';
            const reason = err.name === 'AbortError'
                ? 'Email check timed out. Try again or call 437-779-9799.'
                : 'Could not verify email. Check your connection and try again.';
            setEmailHint(reason, 'error');
            return { ok: false, reason };
        }
    };

    const handleSubmit = async e => {
        e?.preventDefault?.();
        if (submitting) return;
        if (location.protocol === 'file:') {
            setSubmitLabel('Run npm start to submit.', 4000);
            return;
        }

        const name = form.name?.value?.trim() ?? '';
        const phone = form.phone?.value?.trim() ?? '';
        const message = form.message?.value?.trim() ?? '';
        const consent = form.consent?.checked;

        if (!consent) {
            setStatus('Please accept the privacy policy to continue.', 'error');
            form.consent?.focus();
            return;
        }

        if (!name || !emailInput?.value?.trim() || !phone) {
            setStatus('Name, email, and phone are required.', 'error');
            (!name ? form.name : !emailInput?.value?.trim() ? emailInput : form.phone)?.focus();
            return;
        }

        submitting = true;
        submitBtn.disabled = true;
        setSubmitLabel('Sending…');

        try {
            const emailCheck = await verifyEmail(emailInput.value.trim());
            if (!emailCheck.ok) {
                setStatus(emailCheck.reason, 'error');
                setSubmitLabel(emailCheck.reason, 4000);
                emailInput?.focus();
                return;
            }

            if (window.__quoteInquiryApi?.tryAddCurrent) {
                window.__quoteInquiryApi.tryAddCurrent();
            }

            const items = window.__quoteInquiryApi?.getItems?.() ?? [];
            if (!items.length && !message) {
                setStatus('Add at least one product to your inquiry list, or write a note below.', 'error');
                setSubmitLabel('Add a product or note first.', 4000);
                return;
            }

            setStatus('');
            const res = await fetchWithTimeout('/api/quote', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name,
                    email: emailCheck.email,
                    phone,
                    company: form.company?.value?.trim() ?? '',
                    website: form.website?.value?.trim() ?? '',
                    consent: true,
                    items: items.map(({ width, height, product, type, quantity }) => ({
                        width, height, product, type, quantity
                    })),
                    message
                })
            }, POST_TIMEOUT_MS);

            const data = await res.json().catch(() => ({}));
            if (!res.ok || !data.success) {
                throw new Error(data.error ?? 'Could not send. Please call us.');
            }

            form.reset();
            emailVerified = '';
            if (window.__quoteInquiryApi?.reset) {
                window.__quoteInquiryApi.reset();
            }

            const successMsg = !data.emailSent
                ? 'Request received! We saved your inquiry — email delivery is being fixed and we will follow up.'
                : (data.storedLocally && data.emailPending
                    ? 'Request received! Email delivery was delayed — we saved your inquiry and will follow up.'
                    : (data.storedLocally
                        ? 'Request saved! We will follow up once email is configured.'
                        : 'Request sent! We will reply within one business day.'));
            setStatus(successMsg, 'success');
            setSubmitLabel('Request sent!', 4000);
        } catch (err) {
            const msg = err.name === 'AbortError'
                ? 'Request timed out. Please try again or call 437-779-9799.'
                : (err.message ?? 'Could not send. Please call us.');
            setStatus(msg, 'error');
            setSubmitLabel(msg, 5000);
        } finally {
            submitting = false;
            submitBtn.disabled = location.protocol === 'file:';
        }
    };

    window.__quoteSubmitHandler = handleSubmit;
    window.__quoteSubmitManaged = true;

    form.addEventListener('submit', e => {
        e.preventDefault();
        e.stopPropagation();
        void handleSubmit(e);
    }, true);

    if (emailInput) {
        emailInput.addEventListener('input', () => {
            emailVerified = '';
            setEmailHint('');
        });
    }

    if (form.dataset.submitQueued === '1') {
        delete form.dataset.submitQueued;
        void handleSubmit(new Event('submit'));
    }
})();
