/**
 * Standalone quote "Add item" handler for touch browsers (iOS Chrome, Safari, Android).
 * Reads fields directly from the DOM — does not depend on site.js picker init.
 */
(() => {
    const MAX_ITEMS = 10;
    const IDS = {
        width: 'qf-width',
        height: 'qf-height',
        quantity: 'qf-quantity',
        product: 'qf-product-native',
        type: 'qf-type-native',
        glassType: 'qf-glass-type-native',
        pane: 'qf-pane-native',
        thickness: 'qf-thickness-native',
        addBtn: 'qfAddItem',
        hint: 'qf-add-item-hint',
        status: 'qfStatus',
        list: 'qfInquiryList',
        empty: 'qfInquiryEmpty',
        form: 'quoteForm',
        glassPanel: 'qfTypeGlass'
    };

    const HIDDEN_PAIRS = [
        [IDS.product, 'qf-product'],
        [IDS.type, 'qf-type'],
        [IDS.glassType, 'qf-glass-type'],
        [IDS.pane, 'qf-pane'],
        [IDS.thickness, 'qf-thickness']
    ];

    const PRODUCT_VALUES = ['Glass', 'Window', 'Doors'];

    const $ = id => document.getElementById(id);

    const isTouchUI = () =>
        /iPad|iPhone|iPod|Android/i.test(navigator.userAgent)
        || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
        || matchMedia('(hover: none) and (pointer: coarse)').matches
        || matchMedia('(max-width: 768px)').matches;

    let items = [];
    let tapLock = 0;
    let refreshTimer = 0;

    // Mobile/touch only — desktop uses custom pickers via site.js (hidden inputs).
    if (!$('quoteForm') || !$(IDS.addBtn) || !isTouchUI()) return;

    const readSelectRaw = el => {
        if (!el) return '';

        const direct = (el.value || '').trim();
        if (direct) return direct;

        for (const opt of el.options) {
            if (opt.selected && opt.value?.trim()) return opt.value.trim();
        }

        const idx = el.selectedIndex;
        if (idx > 0 && el.options[idx]?.value?.trim()) {
            return el.options[idx].value.trim();
        }

        const selected = el.selectedOptions?.[0];
        if (selected?.value?.trim()) return selected.value.trim();
        if (selected?.index > 0 && selected.value?.trim()) return selected.value.trim();

        const label = (selected?.textContent || el.options[idx]?.textContent || '').trim();
        if (label) {
            for (const opt of el.options) {
                if (opt.value && opt.textContent?.trim() === label) return opt.value.trim();
            }
            const token = label.split('—')[0].split('–')[0].trim();
            if (token) {
                for (const opt of el.options) {
                    if (opt.value === token) return opt.value;
                }
            }
        }

        return '';
    };

    const readSelect = id => {
        const el = $(id);
        if (!el) return '';
        if (el.disabled && id === IDS.type && isGlassMode()) return 'n/a';

        const hiddenId = HIDDEN_PAIRS.find(([selectId]) => selectId === id)?.[1];
        const fromHidden = hiddenId && $(hiddenId)?.value?.trim();
        const fromSelect = readSelectRaw(el);
        if (fromSelect) return fromSelect;
        if (fromHidden) return fromHidden;
        return '';
    };

    const syncHiddens = () => {
        HIDDEN_PAIRS.forEach(([selectId, hiddenId]) => {
            const sel = $(selectId);
            const hidden = $(hiddenId);
            if (!sel || !hidden) return;
            const fromNative = readSelectRaw(sel);
            if (fromNative) {
                hidden.value = fromNative;
                return;
            }
            const fromHidden = hidden.value?.trim() || '';
            if (fromHidden) {
                sel.value = fromHidden;
                if (sel.value !== fromHidden) {
                    for (let i = 0; i < sel.options.length; i++) {
                        if (sel.options[i].value === fromHidden) {
                            sel.selectedIndex = i;
                            break;
                        }
                    }
                }
            }
        });
    };

    const readDim = id => {
        const el = $(id);
        if (!el) return '';
        return String(el.value ?? '').replace(/[^\d.]/g, '').trim();
    };

    const validDim = v => {
        const n = parseFloat(v);
        return Number.isFinite(n) && n > 0;
    };

    const parseQty = v => {
        const n = parseInt(String(v ?? '1'), 10);
        return Number.isFinite(n) && n >= 1 && n <= 999 ? n : 1;
    };

    const normalizeProduct = raw => {
        if (!raw) return '';
        if (PRODUCT_VALUES.includes(raw)) return raw;
        const token = raw.split('—')[0].split('–')[0].trim();
        if (PRODUCT_VALUES.includes(token)) return token;
        const sel = $(IDS.product);
        if (sel && sel.selectedIndex > 0) {
            const optVal = sel.options[sel.selectedIndex]?.value?.trim();
            if (optVal) return optVal;
        }
        return token;
    };

    const isGlassPanelVisible = () => {
        const panel = $(IDS.glassPanel);
        return Boolean(panel && !panel.hidden && !panel.hasAttribute('hidden'));
    };

    const isGlassMode = () => {
        if (isGlassPanelVisible()) return true;
        return normalizeProduct(readSelect(IDS.product)) === 'Glass';
    };

    const getProduct = () => {
        if (isGlassPanelVisible()) {
            const fromSelect = normalizeProduct(readSelect(IDS.product));
            return fromSelect || 'Glass';
        }
        return normalizeProduct(readSelect(IDS.product));
    };

    const getMissing = () => {
        syncHiddens();
        const missing = [];
        if (!validDim(readDim(IDS.width))) missing.push('width');
        if (!validDim(readDim(IDS.height))) missing.push('height');
        const product = getProduct();
        if (!product) missing.push('product');
        else if (isGlassMode()) {
            if (!readSelect(IDS.glassType)) missing.push('glass type');
            if (!readSelect(IDS.pane)) missing.push('pane');
            if (!readSelect(IDS.thickness)) missing.push('thickness');
        } else if (!readSelect(IDS.type)) {
            missing.push('type');
        }
        return missing;
    };

    const missingMessage = () => {
        if (items.length >= MAX_ITEMS) return `Maximum ${MAX_ITEMS} items per request.`;
        const missing = getMissing();
        if (!missing.length) return '';
        if (missing.length === 1) return `Enter ${missing[0]} to add an item.`;
        return `Enter ${missing.slice(0, -1).join(', ')} and ${missing[missing.length - 1]} to add an item.`;
    };

    const isComplete = () => getMissing().length === 0 && items.length < MAX_ITEMS;

    const setHint = (text, type = '') => {
        const hint = $(IDS.hint);
        if (!hint) return;
        hint.textContent = text;
        hint.hidden = !text;
        hint.className = `qf__field-hint qf__field-hint--entry${type ? ` qf__field-hint--${type}` : ''}`;
    };

    const setStatus = (text, type = 'info') => {
        const el = $(IDS.status);
        if (!el) return;
        if (!text) {
            el.hidden = true;
            el.textContent = '';
            el.className = 'qf__status';
            return;
        }
        el.hidden = false;
        el.textContent = text;
        el.className = `qf__status qf__status--${type}`;
    };

    const formatLine = item => {
        const size = `${item.width}" × ${item.height}"`;
        const qty = item.quantity > 1 ? ` × ${item.quantity}` : '';
        if (item.product === 'Glass') {
            return `${size} - Glass - ${item.pane} - ${item.glassType} - ${item.thickness}${qty}`;
        }
        return `${size} - ${item.product} - ${item.type}${qty}`;
    };

    const renderList = () => {
        const list = $(IDS.list);
        const empty = $(IDS.empty);
        if (!list || !empty) return;
        list.querySelectorAll('.qf__inquiry-item').forEach(el => el.remove());
        empty.hidden = items.length > 0;
        items.forEach((item, index) => {
            const row = document.createElement('div');
            row.className = 'qf__inquiry-item';
            const text = document.createElement('span');
            text.className = 'qf__inquiry-text';
            text.textContent = formatLine(item);
            const remove = document.createElement('button');
            remove.type = 'button';
            remove.className = 'qf__inquiry-remove';
            remove.textContent = 'Remove';
            remove.setAttribute('aria-label', 'Remove item');
            remove.addEventListener('click', () => {
                items.splice(index, 1);
                renderList();
                updateButton();
            });
            row.append(text, remove);
            list.appendChild(row);
        });
    };

    const clearEntry = () => {
        const w = $(IDS.width);
        const h = $(IDS.height);
        const q = $(IDS.quantity);
        const product = $(IDS.product);
        if (w) w.value = '';
        if (h) h.value = '';
        if (q) q.value = '1';
        if (product) {
            product.selectedIndex = 0;
            product.dispatchEvent(new Event('change', { bubbles: true }));
        }
        syncHiddens();
    };

    const updateButton = () => {
        const btn = $(IDS.addBtn);
        if (!btn) return;
        syncHiddens();
        const ready = isComplete();
        const touch = isTouchUI();
        btn.disabled = false;
        btn.removeAttribute('disabled');
        btn.setAttribute('aria-disabled', ready ? 'false' : 'true');
        // On touch: always look tappable — iOS often shows filled selects before .value updates.
        btn.classList.toggle('qf__add-item--inactive', touch ? false : !ready);
        btn.classList.toggle('qf__add-item--ready', touch ? true : ready);
        const msg = missingMessage();
        if (!ready && msg) setHint(msg, '');
        else if (ready) setHint('', '');
    };

    const focusMissing = () => {
        const map = {
            width: $(IDS.width),
            height: $(IDS.height),
            product: $(IDS.product),
            type: $(IDS.type),
            'glass type': $(IDS.glassType),
            pane: $(IDS.pane),
            thickness: $(IDS.thickness)
        };
        map[getMissing()[0]]?.focus?.();
    };

    const addCurrent = () => {
        syncHiddens();
        if (!isComplete()) return false;
        const product = getProduct();
        const base = {
            width: readDim(IDS.width),
            height: readDim(IDS.height),
            product,
            quantity: parseQty($(IDS.quantity)?.value)
        };
        if (isGlassMode()) {
            const glassType = readSelect(IDS.glassType);
            const pane = readSelect(IDS.pane);
            const thickness = readSelect(IDS.thickness);
            items.push({
                ...base,
                product: 'Glass',
                glassType,
                pane,
                thickness,
                type: `${pane} - ${glassType} - ${thickness}`
            });
        } else {
            items.push({ ...base, type: readSelect(IDS.type) });
        }
        renderList();
        clearEntry();
        updateButton();
        return true;
    };

    const handleAdd = () => {
        const now = Date.now();
        if (now - tapLock < 350) return;
        tapLock = now;
        syncHiddens();
        updateButton();
        if (addCurrent()) {
            setHint('Item added to your inquiry list.', 'success');
            setStatus('Item added to your inquiry list.', 'success');
            $(IDS.list)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            return;
        }
        const msg = missingMessage() || 'Enter width, height, product, and type before adding an item.';
        setHint(msg, 'error');
        setStatus(msg, 'error');
        focusMissing();
    };

    const bindAddButton = () => {
        const btn = $(IDS.addBtn);
        if (!btn) return;
        if (btn.dataset.qeReady === '1') return;
        btn.dataset.qeReady = '1';
        let touchAt = 0;
        const run = e => {
            if (e.type === 'touchend') touchAt = Date.now();
            else if (e.type === 'click' && Date.now() - touchAt < 600) return;
            e.preventDefault();
            e.stopPropagation();
            handleAdd();
        };
        btn.addEventListener('touchend', run, { passive: false });
        btn.addEventListener('pointerup', run);
        btn.addEventListener('click', run);
    };

    const bindForm = () => {
        const form = $(IDS.form);
        if (!form || form.dataset.qeBound === '1') return;
        form.dataset.qeBound = '1';
        const refresh = () => {
            syncHiddens();
            requestAnimationFrame(updateButton);
        };
        const delayedRefresh = () => {
            refresh();
            setTimeout(refresh, 0);
            setTimeout(refresh, 120);
            setTimeout(refresh, 400);
        };
        form.addEventListener('input', refresh, true);
        form.addEventListener('change', delayedRefresh, true);
        form.addEventListener('blur', delayedRefresh, true);
        form.addEventListener('focusout', delayedRefresh, true);
        document.addEventListener('qf-product-change', delayedRefresh);
        window.visualViewport?.addEventListener('resize', refresh);
        window.addEventListener('pageshow', () => {
            bindAddButton();
            delayedRefresh();
        });
        if (isTouchUI()) {
            form.addEventListener('focusin', () => {
                clearInterval(refreshTimer);
                refreshTimer = window.setInterval(refresh, 450);
            }, true);
            form.addEventListener('focusout', () => {
                setTimeout(() => {
                    if (!form.contains(document.activeElement)) {
                        clearInterval(refreshTimer);
                        refreshTimer = 0;
                    }
                }, 250);
            }, true);
        }
    };

    const exposeApi = () => {
        window.__quoteInquiryApi = {
            getItems: () => items.map(({ width, height, product, type, quantity }) => ({
                width, height, product, type, quantity: String(quantity)
            })),
            reset: () => {
                items = [];
                renderList();
                clearEntry();
                updateButton();
                setHint('');
                setStatus('');
            },
            tryAddCurrent: () => addCurrent(),
            updateButton,
            isManaged: true
        };
        window.__quoteInquiryManaged = true;
        window.__qfHandleAddItem = e => {
            e?.preventDefault?.();
            handleAdd();
        };
        window.__qfAddItem = window.__qfHandleAddItem;
        window.__qfUpdateAddBtn = updateButton;
    };

    const init = () => {
        exposeApi();
        bindAddButton();
        bindForm();
        renderList();
        syncHiddens();
        updateButton();
        setTimeout(updateButton, 0);
        setTimeout(updateButton, 300);
        setTimeout(updateButton, 1200);
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
