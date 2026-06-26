const THEME_MS = 520;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const LOADER_MAX_MS = 15000;
const LOADER_MIN_MS = 400;
const LOADER_HOLD_MS = 450;
const LOADER_REVEAL_MS = 1200;
const LOADER_OPEN_AT = 70;
const prefersReducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const loadImage = img => img?.dataset.src && (img.src = img.dataset.src, img.removeAttribute('data-src'));

const collectPageImageUrls = () => {
    const urls = new Set();
    document.querySelectorAll('img[src], img[data-src]').forEach(img => {
        if (img.closest('#siteLoader')) return;
        if (img.getAttribute('loading') === 'lazy') return;
        const src = (img.getAttribute('data-src') || img.getAttribute('src'))?.trim();
        if (src) urls.add(src);
    });
    return [...urls];
};

const preloadImageUrl = url => new Promise(resolve => {
    const img = new Image();
    const finish = () => resolve();
    img.onload = finish;
    img.onerror = finish;
    img.src = url;
});

const initSiteLoader = async () => {
    const loader = document.getElementById('siteLoader');
    const dots = loader ? [...loader.querySelectorAll('.site-loader__dot')] : [];
    const root = document.documentElement;
    if (!loader) return void root.classList.remove('is-loading');

    root.setAttribute('aria-busy', 'true');
    const urls = collectPageImageUrls();
    const total = urls.length || 1;
    let loaded = 0;
    const dotCount = dots.length || 1;
    const setProgress = pct => {
        const clamped = Math.min(100, Math.max(0, pct));
        loader.setAttribute('aria-valuenow', String(clamped));
        const filled = Math.ceil((clamped / 100) * dotCount);
        dots.forEach((dot, i) => {
            dot.classList.toggle('is-filled', i < filled);
            dot.classList.toggle('is-active', i === filled - 1 && clamped > 0 && clamped < 100);
        });
    };

    setProgress(0);

    const started = performance.now();
    await new Promise(resolve => {
        let settled = false;
        const finish = () => {
            if (settled) return;
            settled = true;
            resolve();
        };

        const timeout = setTimeout(finish, LOADER_MAX_MS);
        if (!urls.length) {
            clearTimeout(timeout);
            finish();
            return;
        }

        urls.forEach(url => {
            preloadImageUrl(url).then(() => {
                loaded += 1;
                setProgress(Math.round((loaded / total) * 100));
                if (Math.round((loaded / total) * 100) >= LOADER_OPEN_AT) finish();
            });
        });
    });

    const elapsed = performance.now() - started;
    if (!prefersReducedMotion && elapsed < LOADER_MIN_MS) {
        await new Promise(resolve => setTimeout(resolve, LOADER_MIN_MS - elapsed));
    }

    if (prefersReducedMotion) {
        root.classList.remove('is-loading');
        root.removeAttribute('aria-busy');
        loader.remove();
        return;
    }

    await new Promise(resolve => setTimeout(resolve, LOADER_HOLD_MS));
    loader.classList.add('is-exiting');
    root.classList.remove('is-loading');
    root.classList.add('is-revealed');
    loader.setAttribute('aria-hidden', 'true');
    root.removeAttribute('aria-busy');

    await new Promise(resolve => setTimeout(resolve, LOADER_REVEAL_MS));
    loader.remove();
};

(async () => {
    initSiteLoader();

    const html = document.documentElement;
    const themeBtn = document.getElementById('themeBtn');
    const [themeIconDark, themeIconLight] = ['themeIconDark', 'themeIconLight'].map(id => document.getElementById(id));
    const themeOverlay = document.getElementById('themeOverlay');

    const setTheme = theme => {
        html.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
        const isDark = theme === 'dark';
        themeIconDark.classList.toggle('is-visible', isDark);
        themeIconDark.classList.toggle('is-hidden', !isDark);
        themeIconLight.classList.toggle('is-visible', !isDark);
        themeIconLight.classList.toggle('is-hidden', isDark);
        themeBtn.setAttribute('aria-label', isDark ? 'Switch to light mode' : 'Switch to dark mode');
    };

    const applyTheme = (theme, animate) => {
        const update = () => setTheme(theme);
        if (!animate || prefersReducedMotion) return update();
        if (document.startViewTransition) return document.startViewTransition(update);
        themeOverlay.style.backgroundColor = theme === 'light' ? '#F5EFE6' : '#061528';
        themeOverlay.classList.add('is-active');
        setTimeout(() => (update(), themeOverlay.classList.remove('is-active')), THEME_MS);
    };

    applyTheme(localStorage.getItem('theme') ?? 'dark', false);
    themeBtn.addEventListener('click', () => applyTheme(html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark', true));

    const header = document.getElementById('header');
    const menuBtn = document.getElementById('menuBtn');
    const nav = document.getElementById('nav');
    let scrollPending = false;

    window.addEventListener('scroll', () => {
        if (scrollPending) return;
        scrollPending = true;
        requestAnimationFrame(() => (header.classList.toggle('header--scrolled', scrollY > 60), scrollPending = false));
    }, { passive: true });
    header.classList.toggle('header--scrolled', scrollY > 60);

    const setMenuOpen = open => {
        nav.classList.toggle('nav--open', open);
        menuBtn.classList.toggle('menu-btn--open', open);
        menuBtn.setAttribute('aria-expanded', String(open));
        menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
        document.body.style.overflow = open ? 'hidden' : '';
    };

    menuBtn.addEventListener('click', () => setMenuOpen(!nav.classList.contains('nav--open')));
    nav.querySelectorAll('.nav__link').forEach(link => link.addEventListener('click', () => setMenuOpen(false)));

    const imageSlides = document.querySelectorAll('.hero__slide');
    const textSlides = document.querySelectorAll('.hero__text');
    const tabs = document.querySelectorAll('.hero__tab');
    const slideSets = [imageSlides, textSlides, tabs];
    const activeClasses = ['hero__slide--active', 'hero__text--active', 'hero__tab--active'];
    let current = 0, timer;

    const restartTabAnimation = tab => (tab.classList.remove('hero__tab--active'),
        requestAnimationFrame(() => requestAnimationFrame(() => tab.classList.add('hero__tab--active'))));

    const armTimer = () => {
        clearInterval(timer);
        tabs.forEach(t => t.classList.remove('hero__tab--active'));
        restartTabAnimation(tabs[current]);
        timer = setInterval(() => goTo((current + 1) % imageSlides.length), 6000);
    };

    const goTo = index => {
        if (index === current) return armTimer();
        slideSets.forEach((set, i) => set[current].classList.remove(activeClasses[i]));
        current = index;
        loadImage(imageSlides[current].querySelector('.hero__img'));
        slideSets.forEach((set, i) => set[current].classList.add(activeClasses[i]));
        armTimer();
    };

    tabs.forEach(tab => tab.addEventListener('click', () => goTo(+tab.dataset.slide)));
    armTimer();
    (requestIdleCallback ?? (cb => setTimeout(cb, 1500)))(() => loadImage(imageSlides[1]?.querySelector('.hero__img[data-src]')), requestIdleCallback ? { timeout: 2000 } : undefined);

    let counted = false;
    const runCounters = () => {
        if (counted) return;
        counted = true;
        const inline = document.querySelector('.inline-stat');
        if (!inline) return;
        const target = +inline.dataset.target, start = performance.now();
        const tick = now => {
            const t = Math.min((now - start) / 1400, 1);
            inline.textContent = Math.round((1 - (1 - t) ** 3) * target) + '+';
            if (t < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
    };

    const lazyIo = new IntersectionObserver(entries => entries.forEach(({ isIntersecting, target: el }) => {
        if (!isIntersecting) return;
        if (el.dataset.bg) (el.style.backgroundImage = `url('${el.dataset.bg}')`, el.classList.add('bento__bg--loaded'), el.removeAttribute('data-bg'));
        else if (el.tagName === 'IFRAME' && el.dataset.src) (el.src = el.dataset.src, el.removeAttribute('data-src'));
        lazyIo.unobserve(el);
    }), { rootMargin: '200px' });
    document.querySelectorAll('[data-bg], iframe[data-src]').forEach(el => lazyIo.observe(el));

    const revealIo = new IntersectionObserver(entries => entries.forEach(({ isIntersecting, target: el }) => {
        if (!isIntersecting) return;
        el.classList.add('reveal--visible');
        revealIo.unobserve(el);
        if (el.closest('#about') || el.classList.contains('about__grid')) runCounters();
    }), { threshold: 0.12, rootMargin: '0px 0px -32px 0px' });
    document.querySelectorAll('.reveal').forEach(el => revealIo.observe(el));

    const productCatalog = document.querySelector('.product-list--catalog');

    const setProductPanelImage = (item, btn) => {
        const img = item.querySelector('.product-panel__img');
        const ph = item.querySelector('.product-panel__img-ph');
        if (!img || !ph) return;
        const src = btn.dataset.image?.trim();
        const alt = btn.querySelector('.product-row__label')?.textContent.trim() ?? '';
        if (src) {
            img.src = src;
            img.alt = alt;
            img.hidden = false;
            ph.hidden = true;
        } else {
            img.removeAttribute('src');
            img.hidden = true;
            ph.hidden = false;
        }
    };

    const closeProductItem = item => {
        item.classList.remove('is-open');
        const btn = item.querySelector('.product-row');
        const panel = item.querySelector('.product-panel');
        btn?.setAttribute('aria-expanded', 'false');
        panel?.setAttribute('aria-hidden', 'true');
    };

    if (productCatalog) {
        productCatalog.querySelectorAll('.product-item').forEach(item => {
            const btn = item.querySelector('.product-row');
            btn?.addEventListener('click', () => {
                const wasOpen = item.classList.contains('is-open');
                productCatalog.querySelectorAll('.product-item.is-open').forEach(closeProductItem);
                if (!wasOpen) {
                    item.classList.add('is-open');
                    btn.setAttribute('aria-expanded', 'true');
                    item.querySelector('.product-panel')?.setAttribute('aria-hidden', 'false');
                    setProductPanelImage(item, btn);
                }
            });
        });
        document.addEventListener('keydown', e => {
            if (e.key !== 'Escape') return;
            productCatalog.querySelectorAll('.product-item.is-open').forEach(closeProductItem);
        });
    }

    const galleryCarousel = document.getElementById('galleryCarousel');
    if (galleryCarousel) {
        const track = document.getElementById('galleryTrack');
        const [prevBtn, nextBtn, status, dotsContainer] = ['galleryPrev', 'galleryNext', 'galleryStatus', 'galleryDots'].map(id => document.getElementById(id));
        const cells = track ? [...track.querySelectorAll('.gallery__cell')] : [];
        if (track && prevBtn && nextBtn && status && cells.length) {
        const GAP = 12;
        const CELL_EXTRA_H = 5;
        let page = 0, resizeTimer;

        const perPage = () => innerWidth < 600 ? 1 : innerWidth < 1024 ? 2 : 3;
        const totalPages = () => Math.ceil(cells.length / perPage());

        const updateGallery = () => {
            const per = perPage(), maxPage = totalPages() - 1;
            page = Math.min(page, maxPage);
            const vw = galleryCarousel.querySelector('.gallery__viewport').offsetWidth;
            const startIdx = page * per;
            const visibleCount = Math.min(per, cells.length - startIdx);
            const isPartial = visibleCount < per;
            const standardW = (vw - GAP * (per - 1)) / per;
            const activeW = isPartial ? (vw - GAP * (visibleCount - 1)) / visibleCount : standardW;
            cells.forEach((cell, i) => {
                const onPage = i >= startIdx && i < startIdx + visibleCount;
                const w = isPartial && onPage ? activeW : standardW;
                cell.style.width = `${w}px`;
                cell.style.height = `${w * 2 / 3 + CELL_EXTRA_H}px`;
            });
            track.style.transform = `translate3d(-${startIdx * (standardW + GAP)}px, 0, 0)`;
            prevBtn.disabled = page === 0;
            nextBtn.disabled = page >= maxPage;
            status.textContent = `Showing ${page * per + 1}–${Math.min((page + 1) * per, cells.length)} of ${cells.length}`;
            dotsContainer?.querySelectorAll('.gallery__dot').forEach((dot, i) => (dot.classList.toggle('gallery__dot--active', i === page), dot.setAttribute('aria-selected', i === page)));
        };

        const buildDots = () => {
            if (!dotsContainer) return;
            dotsContainer.replaceChildren(...Array.from({ length: totalPages() }, (_, i) => {
                const dot = document.createElement('button');
                dot.type = 'button';
                dot.className = `gallery__dot${i === page ? ' gallery__dot--active' : ''}`;
                dot.setAttribute('aria-label', `Go to page ${i + 1}`);
                dot.setAttribute('role', 'tab');
                dot.setAttribute('aria-selected', i === page);
                dot.addEventListener('click', () => (page = i, updateGallery()));
                return dot;
            }));
        };

        prevBtn.addEventListener('click', () => page > 0 && (page--, updateGallery()));
        nextBtn.addEventListener('click', () => page < totalPages() - 1 && (page++, updateGallery()));
        window.addEventListener('resize', () => (clearTimeout(resizeTimer), resizeTimer = setTimeout(() => (buildDots(), updateGallery()), 150)), { passive: true });
        buildDots();
        updateGallery();
        }
    }

    const quoteForm = document.getElementById('quoteForm');
    const qfSubmit = document.getElementById('qfSubmit');
    const qfWidth = document.getElementById('qf-width');
    const qfHeight = document.getElementById('qf-height');
    const qfProductPicker = document.getElementById('qfProductPicker');
    const qfTypePicker = document.getElementById('qfTypePicker');
    const qfTypeStandard = document.getElementById('qfTypeStandard');
    const qfTypeGlass = document.getElementById('qfTypeGlass');
    const qfGlassTypePicker = document.getElementById('qfGlassTypePicker');
    const qfPanePicker = document.getElementById('qfPanePicker');
    const qfThicknessPicker = document.getElementById('qfThicknessPicker');
    const qfAddItem = document.getElementById('qfAddItem');
    const qfInquiryList = document.getElementById('qfInquiryList');
    const qfInquiryEmpty = document.getElementById('qfInquiryEmpty');
    const PRODUCT_OPTIONS = [
        { value: 'Glass', name: 'Glass', cn: '玻璃' },
        { value: 'Window', name: 'Window', cn: '窗户' },
        { value: 'Doors', name: 'Doors', cn: '门' }
    ];
    const TYPE_OPTIONS = {
        Window: [
            { value: 'Awning', name: 'Awning', cn: '上悬窗' },
            { value: 'Casement', name: 'Casement', cn: '平开窗' },
            { value: 'Sliding', name: 'Sliding', cn: '推拉窗' },
            { value: 'Double Sliding', name: 'Double Sliding', cn: '双推拉窗' },
            { value: 'Single Hung', name: 'Single Hung', cn: '单悬窗' },
            { value: 'Double Hung', name: 'Double Hung', cn: '双悬窗' },
            { value: 'Fixed', name: 'Fixed', cn: '固定窗' }
        ],
        Doors: [
            { value: 'Entrance Door', name: 'Entrance Door', cn: '入户门' },
            { value: 'Patio Door', name: 'Patio Door', cn: '庭院门' },
            { value: 'Side Door', name: 'Side Door', cn: '侧门' }
        ]
    };
    const GLASS_TYPE_OPTIONS = [
        { value: 'Clear & Low-e', name: 'Clear & Low-e', cn: '透明及低辐射' },
        { value: 'Tempered', name: 'Tempered', cn: '钢化' },
        { value: 'Frosted', name: 'Frosted', cn: '磨砂' },
        { value: 'Fluted', name: 'Fluted', cn: '凹槽' },
        { value: 'Rain', name: 'Rain', cn: '雨纹' },
        { value: 'Special-Shaped', name: 'Special-Shaped', cn: '异形' }
    ];
    const PANE_OPTIONS = [
        { value: 'Single Pane', name: 'Single Pane', cn: '单层玻璃' },
        { value: 'Double Pane', name: 'Double Pane', cn: '双层玻璃' },
        { value: 'Triple Pane', name: 'Triple Pane', cn: '三层玻璃' }
    ];
    const THICKNESS_OPTIONS = [3, 4, 5, 6, 7, 8, 9, 10].map(n => ({
        value: `${n}mm`,
        name: `${n}mm`,
        cn: `${n}毫米`
    }));
    const MAX_QUOTE_ITEMS = 10;
    let inquiryItems = [];
    let openPicker = null;

    const closePicker = picker => {
        if (!picker) return;
        picker.classList.remove('is-open');
        const panel = picker.querySelector('.qf-picker__panel');
        if (panel) panel.hidden = true;
        picker.querySelector('.qf-picker__trigger').setAttribute('aria-expanded', 'false');
        if (openPicker === picker) openPicker = null;
    };

    const closeAllPickers = () => {
        closePicker(qfProductPicker);
        closePicker(qfTypePicker);
        closePicker(qfGlassTypePicker);
        closePicker(qfPanePicker);
        closePicker(qfThicknessPicker);
    };

    const PICKER_VISIBLE_ROWS = 4;

    const initPicker = (picker, { placeholder, onSelect }) => {
        const hidden = picker.querySelector('input[type="hidden"]');
        const trigger = picker.querySelector('.qf-picker__trigger');
        const valueEl = picker.querySelector('.qf-picker__value');
        const panel = picker.querySelector('.qf-picker__panel');
        const list = picker.querySelector('.qf-picker__list');
        const track = picker.querySelector('.qf-picker__scroll-track');
        const rail = picker.querySelector('.qf-picker__scroll-rail');

        const syncPickerListHeight = () => {
            if (!list) return;
            const rows = [...list.querySelectorAll('.qf-picker__option')];
            if (!rows.length) {
                list.style.removeProperty('max-height');
                return;
            }
            const rowH = Math.max(...rows.map(row => row.getBoundingClientRect().height));
            list.style.maxHeight = `${rowH * PICKER_VISIBLE_ROWS + 12}px`;
        };

        const updateScrollRail = () => {
            if (!panel || !list || !track || !rail) return;
            syncPickerListHeight();
            const canScroll = list.scrollHeight > list.clientHeight + 2;
            track.hidden = !canScroll;
            panel.classList.toggle('is-scrollable', canScroll);
            panel.classList.toggle('is-scroll-top', list.scrollTop <= 2);
            panel.classList.toggle('is-scroll-end', list.scrollTop + list.clientHeight >= list.scrollHeight - 2);
            if (!canScroll) {
                rail.style.transform = 'translate(-50%, 0)';
                return;
            }
            const maxScroll = list.scrollHeight - list.clientHeight;
            const ratio = maxScroll > 0 ? list.scrollTop / maxScroll : 0;
            const travel = track.clientHeight - rail.offsetHeight;
            rail.style.transform = `translate(-50%, ${ratio * travel}px)`;
        };

        list?.addEventListener('scroll', updateScrollRail, { passive: true });

        const setValue = (value, label, placeholderText) => {
            hidden.value = value;
            valueEl.textContent = label || placeholderText;
            valueEl.classList.toggle('qf-picker__value--placeholder', !value);
        };

        const renderOptions = options => {
            list.replaceChildren();
            options.forEach(opt => {
                const row = document.createElement('li');
                row.className = 'product-row qf-picker__option';
                row.role = 'option';
                row.dataset.value = opt.value;
                row.setAttribute('aria-selected', String(hidden.value === opt.value));
                row.classList.toggle('is-selected', hidden.value === opt.value);
                row.innerHTML = `<span class="product-row__label"><span class="product-row__name">${opt.name}</span><span class="product-row__sep"> — </span><span class="product-row__cn">${opt.cn}</span></span>`;
                row.addEventListener('click', () => {
                    setValue(opt.value, opt.name, placeholder);
                    list.querySelectorAll('.qf-picker__option').forEach(el => {
                        const selected = el.dataset.value === opt.value;
                        el.classList.toggle('is-selected', selected);
                        el.setAttribute('aria-selected', String(selected));
                    });
                    closePicker(picker);
                    onSelect?.(opt.value);
                    updateAddItemBtn();
                });
                list.appendChild(row);
            });
            list.scrollTop = 0;
            requestAnimationFrame(updateScrollRail);
        };

        const setDisabled = disabled => {
            picker.classList.toggle('qf-picker--disabled', disabled);
            trigger.disabled = disabled;
            if (disabled) closePicker(picker);
        };

        const reset = (placeholderText = placeholder) => {
            setValue('', '', placeholderText);
            list.replaceChildren();
            closePicker(picker);
        };

        trigger.addEventListener('click', () => {
            if (picker.classList.contains('qf-picker--disabled')) return;
            if (picker.classList.contains('is-open')) return closePicker(picker);
            closeAllPickers();
            picker.classList.add('is-open');
            if (panel) panel.hidden = false;
            list.scrollTop = 0;
            trigger.setAttribute('aria-expanded', 'true');
            openPicker = picker;
            requestAnimationFrame(updateScrollRail);
        });

        reset();
        return { renderOptions, setDisabled, reset, getValue: () => hidden.value };
    };

    const productPicker = qfProductPicker ? initPicker(qfProductPicker, {
        placeholder: 'Select product',
        onSelect: () => updateTypeFields(productPicker.getValue())
    }) : null;

    const typePicker = qfTypePicker ? initPicker(qfTypePicker, {
        placeholder: 'Select product first',
        onSelect: () => updateAddItemBtn()
    }) : null;

    const glassTypePicker = qfGlassTypePicker ? initPicker(qfGlassTypePicker, {
        placeholder: 'Select glass',
        onSelect: () => updateAddItemBtn()
    }) : null;

    const panePicker = qfPanePicker ? initPicker(qfPanePicker, {
        placeholder: 'Select pane',
        onSelect: () => updateAddItemBtn()
    }) : null;

    const thicknessPicker = qfThicknessPicker ? initPicker(qfThicknessPicker, {
        placeholder: 'Select thickness',
        onSelect: () => updateAddItemBtn()
    }) : null;

    const updateTypeFields = product => {
        const isGlass = product === 'Glass';
        if (qfTypeStandard) qfTypeStandard.hidden = isGlass;
        if (qfTypeGlass) qfTypeGlass.hidden = !isGlass;

        if (!product) {
            if (qfTypeStandard) qfTypeStandard.hidden = false;
            if (qfTypeGlass) qfTypeGlass.hidden = true;
            typePicker?.setDisabled(true);
            typePicker?.reset('Select product first');
            glassTypePicker?.setDisabled(true);
            panePicker?.setDisabled(true);
            thicknessPicker?.setDisabled(true);
            glassTypePicker?.reset('Select glass');
            panePicker?.reset('Select pane');
            thicknessPicker?.reset('Select thickness');
            updateAddItemBtn();
            return;
        }

        if (isGlass) {
            typePicker?.setDisabled(true);
            typePicker?.reset('Select type');
            glassTypePicker?.setDisabled(false);
            panePicker?.setDisabled(false);
            thicknessPicker?.setDisabled(false);
            glassTypePicker?.renderOptions(GLASS_TYPE_OPTIONS);
            panePicker?.renderOptions(PANE_OPTIONS);
            thicknessPicker?.renderOptions(THICKNESS_OPTIONS);
            glassTypePicker?.reset('Select glass');
            panePicker?.reset('Select pane');
            thicknessPicker?.reset('Select thickness');
        } else {
            glassTypePicker?.setDisabled(true);
            panePicker?.setDisabled(true);
            thicknessPicker?.setDisabled(true);
            glassTypePicker?.reset('Select glass');
            panePicker?.reset('Select pane');
            thicknessPicker?.reset('Select thickness');
            const types = TYPE_OPTIONS[product] ?? [];
            typePicker?.reset(product ? 'Select type' : 'Select product first');
            typePicker?.renderOptions(types);
            typePicker?.setDisabled(!types.length);
        }
        updateAddItemBtn();
    };

    if (productPicker) productPicker.renderOptions(PRODUCT_OPTIONS);
    if (typePicker) typePicker.setDisabled(true);
    if (glassTypePicker) glassTypePicker.setDisabled(true);
    if (panePicker) panePicker.setDisabled(true);
    if (thicknessPicker) thicknessPicker.setDisabled(true);

    document.addEventListener('click', e => {
        if (!e.target.closest('.qf-picker')) closeAllPickers();
    });
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') closeAllPickers();
    });

    const isEntryComplete = () => {
        if (!qfWidth?.value.trim() || !qfHeight?.value.trim() || !productPicker?.getValue()) return false;
        if (productPicker.getValue() === 'Glass') {
            return Boolean(glassTypePicker?.getValue() && panePicker?.getValue() && thicknessPicker?.getValue());
        }
        return Boolean(typePicker?.getValue());
    };

    const updateAddItemBtn = () => {
        if (!qfAddItem) return;
        qfAddItem.disabled = !isEntryComplete() || inquiryItems.length >= MAX_QUOTE_ITEMS;
    };

    const clearEntryFields = () => {
        closeAllPickers();
        if (qfWidth) qfWidth.value = '';
        if (qfHeight) qfHeight.value = '';
        productPicker?.reset('Select product');
        updateTypeFields('');
        updateAddItemBtn();
    };

    const formatInquiryLine = ({ width, height, product, type, glassType, pane, thickness }) => {
        const size = `${width} x ${height}`;
        if (product === 'Glass') {
            if (glassType && pane && thickness) return `${size} - Glass - ${pane} - ${glassType} - ${thickness}`;
            if (glassType && thickness) return `${size} - Glass - ${glassType} - ${thickness}`;
            if (type) return `${size} - Glass - ${type}`;
        }
        return `${size} - ${product} - ${type}`;
    };

    const renderInquiryList = () => {
        if (!qfInquiryList || !qfInquiryEmpty) return;
        qfInquiryList.querySelectorAll('.qf__inquiry-item').forEach(el => el.remove());
        qfInquiryEmpty.hidden = inquiryItems.length > 0;
        inquiryItems.forEach((item, index) => {
            const row = document.createElement('div');
            row.className = 'qf__inquiry-item';
            const text = document.createElement('span');
            text.className = 'qf__inquiry-text';
            text.textContent = formatInquiryLine(item);
            const removeBtn = document.createElement('button');
            removeBtn.type = 'button';
            removeBtn.className = 'qf__inquiry-remove';
            removeBtn.setAttribute('aria-label', 'Remove item');
            removeBtn.textContent = 'Remove';
            removeBtn.addEventListener('click', () => {
                inquiryItems.splice(index, 1);
                renderInquiryList();
                updateAddItemBtn();
            });
            row.append(text, removeBtn);
            qfInquiryList.appendChild(row);
        });
        updateAddItemBtn();
    };

    const resetInquiry = () => {
        inquiryItems = [];
        clearEntryFields();
        renderInquiryList();
    };

    const sanitizeDimensionInput = el => {
        let cleaned = el.value.replace(/[^\d.]/g, '');
        const dot = cleaned.indexOf('.');
        if (dot !== -1) cleaned = cleaned.slice(0, dot + 1) + cleaned.slice(dot + 1).replace(/\./g, '');
        if (el.value !== cleaned) el.value = cleaned;
    };

    if (qfWidth && qfHeight) {
        [qfWidth, qfHeight].forEach(el => {
            el.addEventListener('input', () => {
                sanitizeDimensionInput(el);
                updateAddItemBtn();
            });
        });
    }

    qfAddItem?.addEventListener('click', () => {
        if (!productPicker || !isEntryComplete() || inquiryItems.length >= MAX_QUOTE_ITEMS) return;
        const product = productPicker.getValue();
        const base = {
            width: qfWidth.value.trim(),
            height: qfHeight.value.trim(),
            product
        };
        if (product === 'Glass') {
            const glassType = glassTypePicker?.getValue();
            const pane = panePicker?.getValue();
            const thickness = thicknessPicker?.getValue();
            if (!glassType || !pane || !thickness) return;
            inquiryItems.push({
                ...base,
                glassType,
                pane,
                thickness,
                type: `${pane} - ${glassType} - ${thickness}`
            });
        } else {
            const type = typePicker?.getValue();
            if (!type) return;
            inquiryItems.push({ ...base, type });
        }
        renderInquiryList();
        clearEntryFields();
    });

    renderInquiryList();

    if (quoteForm && qfSubmit && qfSubmit.querySelector('.qf__submit-text')) {
        const qfSubmitText = qfSubmit.querySelector('.qf__submit-text');
        const SUBMIT_LABEL = 'Send Quote Request';
        const setSubmitLabel = (text, resetMs) => (qfSubmitText.textContent = text, resetMs && setTimeout(() => qfSubmitText.textContent = SUBMIT_LABEL, resetMs));

        if (location.protocol === 'file:') {
            qfSubmit.disabled = true;
            qfSubmitText.textContent = 'Run npm start to submit';
        }

        quoteForm.addEventListener('submit', async e => {
            e.preventDefault();
            if (location.protocol === 'file:') return setSubmitLabel('Run npm start to submit.', 4000);

            const name = quoteForm.name.value.trim();
            const email = quoteForm.email.value.trim();
            const phone = quoteForm.phone.value.trim();
            if (!name || !email || !phone) return void (!name ? quoteForm.name : !email ? quoteForm.email : quoteForm.phone).focus();
            if (!EMAIL_RE.test(email)) return void (quoteForm.email.focus(), setSubmitLabel('Invalid email address.', 4000));

            qfSubmit.disabled = true;
            setSubmitLabel('Sending…');
            try {
                const res = await fetch('/api/quote', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name, email, phone,
                        company: quoteForm.company.value.trim(),
                        items: inquiryItems.map(({ width, height, product, type }) => ({ width, height, product, type })),
                        message: quoteForm.message.value.trim()
                    })
                });
                const data = await res.json().catch(() => ({}));
                if (!res.ok || !data.success) throw new Error(data.error ?? 'Could not send. Please call us.');
                quoteForm.reset();
                resetInquiry();
                setSubmitLabel('Request sent!', 4000);
            } catch (err) {
                setSubmitLabel(err.message ?? 'Could not send. Please call us.', 4000);
            } finally {
                qfSubmit.disabled = location.protocol !== 'file:';
            }
        });
    }
})();
