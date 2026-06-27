const THEME_MS = 520;
const EMAIL_FORMAT_RE = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
const LOADER_MAX_MS = 3500;
const LOADER_MIN_MS = 1100;
const LOADER_HOLD_MS = 450;
const LOADER_CURTAIN_MS = 2200;
const LOADER_REVEAL_MS = LOADER_CURTAIN_MS + 200;
const LOADER_OPEN_PERCENT = 100;
const prefersReducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

const waitLoaderCurtain = (loader, maxMs = LOADER_CURTAIN_MS + 300) => new Promise(resolve => {
    const curtains = [...(loader?.querySelectorAll('.site-loader__curtain') ?? [])];
    if (!curtains.length) return resolve();
    let settled = false;
    const finish = () => {
        if (settled) return;
        settled = true;
        resolve();
    };
    setTimeout(finish, maxMs);
    let remaining = curtains.length;
    const onEnd = () => {
        remaining -= 1;
        if (remaining <= 0) finish();
    };
    curtains.forEach(el => {
        el.addEventListener('animationend', onEnd, { once: true });
        el.addEventListener('webkitAnimationEnd', onEnd, { once: true });
    });
});
const loadImage = img => {
    if (!img?.dataset.src) return;
    img.src = img.dataset.src;
    img.removeAttribute('data-src');
};

const collectCriticalImageUrls = () => ['/images/pcilogo.png'];

const initInternalNavSkipLoader = () => {
    document.querySelectorAll('a[href]').forEach(a => {
        const href = a.getAttribute('href');
        if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('sms:') || a.target) return;
        try {
            const url = new URL(href, location.origin);
            if (url.origin === location.origin) {
                a.addEventListener('click', () => sessionStorage.setItem('pci-skip-loader', '1'));
            }
        } catch (_) {}
    });
};

const preloadImageUrl = url => new Promise(resolve => {
    const img = new Image();
    const finish = () => resolve();
    img.onload = finish;
    img.onerror = finish;
    img.src = url;
});

const isTouchUI = () =>
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) ||
    'ontouchstart' in window ||
    matchMedia('(hover: none) and (pointer: coarse)').matches;

const bindTap = (el, handler) => {
    if (!el) return;
    let touchAt = 0;
    const run = (e, fromTouch = false) => {
        if (fromTouch) {
            touchAt = Date.now();
        } else if (Date.now() - touchAt < 500) {
            return;
        }
        handler(e);
    };
    el.addEventListener('touchend', e => run(e, true), { passive: true });
    el.addEventListener('click', e => run(e, false));
};

const unlockBodyScroll = () => {
    const nav = document.getElementById('nav');
    const menuBtn = document.getElementById('menuBtn');
    document.body.classList.remove('nav-open', 'quote-picker-open');
    document.body.style.removeProperty('position');
    document.body.style.removeProperty('top');
    document.body.style.removeProperty('left');
    document.body.style.removeProperty('right');
    document.body.style.removeProperty('width');
    document.body.style.removeProperty('overflow');
    document.body.style.removeProperty('touch-action');
    document.documentElement.style.removeProperty('overflow');
    if (nav?.classList.contains('nav--open')) {
        nav.classList.remove('nav--open');
        nav.setAttribute('aria-hidden', 'true');
        nav.removeAttribute('inert');
        menuBtn?.classList.remove('menu-btn--open');
        menuBtn?.setAttribute('aria-expanded', 'false');
        menuBtn?.setAttribute('aria-label', 'Open menu');
    }
    nav?.style.removeProperty('pointer-events');
    nav?.style.removeProperty('z-index');
};

const initFaqAccordion = () => {
    const faqAccordion = document.getElementById('faqAccordion');
    if (!faqAccordion || faqAccordion.dataset.faqReady === '1') return;
    faqAccordion.dataset.faqReady = '1';

    faqAccordion.querySelectorAll('.faq-answer').forEach(answer => {
        if (!answer.closest('.faq-item')?.classList.contains('is-open')) {
            answer.setAttribute('aria-hidden', 'true');
        }
    });

    const closeFaqItem = btn => {
        const answer = document.getElementById(btn.getAttribute('aria-controls'));
        if (!answer) return;
        btn.setAttribute('aria-expanded', 'false');
        answer.setAttribute('aria-hidden', 'true');
        btn.closest('.faq-item')?.classList.remove('is-open');
    };

    faqAccordion.querySelectorAll('.faq-question').forEach(btn => {
        bindTap(btn, () => {
            const isOpen = btn.getAttribute('aria-expanded') === 'true';
            faqAccordion.querySelectorAll('.faq-question').forEach(other => {
                if (other !== btn) closeFaqItem(other);
            });
            if (isOpen) {
                closeFaqItem(btn);
                return;
            }
            const answer = document.getElementById(btn.getAttribute('aria-controls'));
            if (!answer) return;
            btn.setAttribute('aria-expanded', 'true');
            answer.setAttribute('aria-hidden', 'false');
            btn.closest('.faq-item')?.classList.add('is-open');
        });
    });
};

const playLoaderExit = async () => {
    const loader = document.getElementById('siteLoader');
    const root = document.documentElement;
    if (!loader || loader.classList.contains('is-exiting')) return;
    if (root.classList.contains('is-revealed')) return;

    const releasePage = () => {
        root.classList.remove('is-loading');
        root.classList.add('is-revealed');
        root.removeAttribute('aria-busy');
        document.body.style.overflow = '';
        document.documentElement.style.overflow = '';
    };

    loader.classList.add('is-exiting');
    loader.setAttribute('aria-hidden', 'true');

    await delay(LOADER_HOLD_MS);
    releasePage();
    await waitLoaderCurtain(loader);
    loader.remove();
};

window.__pciPlayLoaderExit = playLoaderExit;

const initSiteLoader = async () => {
    const loader = document.getElementById('siteLoader');
    const dots = loader ? [...loader.querySelectorAll('.site-loader__dot')] : [];
    const root = document.documentElement;

    const finishLoader = () => {
        root.classList.remove('is-loading');
        root.classList.add('is-revealed');
        root.removeAttribute('aria-busy');
        document.body.style.overflow = '';
        document.documentElement.style.overflow = '';
        loader?.setAttribute('aria-hidden', 'true');
        loader?.remove();
    };

    if (sessionStorage.getItem('pci-skip-loader') === '1') {
        sessionStorage.removeItem('pci-skip-loader');
        finishLoader();
        return;
    }

    if (prefersReducedMotion) {
        finishLoader();
        return;
    }

    if (!loader) return finishLoader();

    try {
        root.setAttribute('aria-busy', 'true');
        const urls = collectCriticalImageUrls();
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
                    if (Math.round((loaded / total) * 100) >= LOADER_OPEN_PERCENT) finish();
                });
            });
        });

        const elapsed = performance.now() - started;
        if (!prefersReducedMotion && elapsed < LOADER_MIN_MS) {
            await delay(LOADER_MIN_MS - elapsed);
        }

        if (prefersReducedMotion) return finishLoader();

        await playLoaderExit();
    } catch {
        finishLoader();
    }
};

const initGalleryCarousel = () => {
    const galleryCarousel = document.getElementById('galleryCarousel');
    if (!galleryCarousel) return;

    const track = document.getElementById('galleryTrack');
    const prevBtn = document.getElementById('galleryPrev');
    const nextBtn = document.getElementById('galleryNext');
    const status = document.getElementById('galleryStatus');
    const dotsContainer = document.getElementById('galleryDots');
    const viewport = galleryCarousel.querySelector('.gallery__viewport');
    const cells = track ? [...track.querySelectorAll('.gallery__cell')] : [];
    if (!track || !prevBtn || !nextBtn || !viewport || !cells.length) return;

    viewport.classList.add('gallery__viewport--scroll');

    const GAP = 12;
    let page = 0;
    let resizeTimer;
    let scrollSyncTimer;

    const perPage = () => (window.innerWidth < 600 ? 1 : window.innerWidth < 1024 ? 2 : 3);
    const totalPages = () => Math.ceil(cells.length / perPage());
    const pageCellIndex = p => Math.min(p * perPage(), cells.length - 1);

    const cellScrollLeft = cell => Math.round(cell.offsetLeft - track.offsetLeft);

    const resetHorizontalPageScroll = () => {
        document.documentElement.scrollLeft = 0;
        document.body.scrollLeft = 0;
    };

    const layoutCells = () => {
        const per = perPage();
        const vw = viewport.clientWidth;
        if (vw < 48) return false;
        const cellW = per === 1
            ? vw
            : Math.max(0, (vw - GAP * (per - 1)) / per);
        cells.forEach(cell => {
            cell.style.width = `${cellW}px`;
            cell.style.flexBasis = `${cellW}px`;
            cell.style.maxHeight = '';
        });
        return true;
    };

    const loadVisibleImages = () => {
        const per = perPage();
        const start = page * per;
        for (let i = start; i < start + per && i < cells.length; i++) {
            const img = cells[i].querySelector('img[data-src]');
            if (img) loadImage(img);
        }
    };

    const updateUi = () => {
        const per = perPage();
        const maxPage = totalPages() - 1;
        page = Math.max(0, Math.min(page, maxPage));
        prevBtn.disabled = page <= 0;
        nextBtn.disabled = page >= maxPage;
        if (status) {
            status.textContent = `Showing ${page * per + 1}–${Math.min((page + 1) * per, cells.length)} of ${cells.length}`;
        }
        dotsContainer?.querySelectorAll('.gallery__dot').forEach((dot, i) => {
            dot.classList.toggle('gallery__dot--active', i === page);
        });
        loadVisibleImages();
    };

    const scrollToPage = (targetPage, instant = true) => {
        const maxPage = totalPages() - 1;
        page = Math.max(0, Math.min(targetPage, maxPage));
        if (!layoutCells()) {
            requestAnimationFrame(() => scrollToPage(page, instant));
            return;
        }
        const cell = cells[pageCellIndex(page)];
        if (!cell) return;
        updateUi();
        const left = cellScrollLeft(cell);
        try {
            viewport.scrollTo({ left, behavior: instant || isTouchUI() ? 'auto' : 'smooth' });
        } catch {
            viewport.scrollLeft = left;
        }
        if (isTouchUI()) resetHorizontalPageScroll();
    };

    const syncPageFromScroll = () => {
        const left = viewport.scrollLeft;
        let nearest = 0;
        let nearestDist = Infinity;
        for (let p = 0; p < totalPages(); p++) {
            const cell = cells[pageCellIndex(p)];
            if (!cell) continue;
            const dist = Math.abs(cellScrollLeft(cell) - left);
            if (dist < nearestDist) {
                nearestDist = dist;
                nearest = p;
            }
        }
        if (nearest !== page) {
            page = nearest;
            updateUi();
        }
    };

    const bindGalleryBtn = (el, handler) => {
        if (!el) return;
        const run = e => {
            e.preventDefault();
            e.stopPropagation();
            handler(e);
        };
        el.addEventListener('click', run);
        el.addEventListener('touchend', run, { passive: false });
    };

    const buildDots = () => {
        if (!dotsContainer) return;
        dotsContainer.replaceChildren(...Array.from({ length: totalPages() }, (_, i) => {
            const dot = document.createElement('button');
            dot.type = 'button';
            dot.className = `gallery__dot${i === page ? ' gallery__dot--active' : ''}`;
            dot.setAttribute('aria-label', `Go to page ${i + 1}`);
            bindGalleryBtn(dot, () => scrollToPage(i, true));
            return dot;
        }));
    };

    bindGalleryBtn(prevBtn, () => {
        if (page > 0) scrollToPage(page - 1, true);
    });
    bindGalleryBtn(nextBtn, () => {
        if (page < totalPages() - 1) scrollToPage(page + 1, true);
    });

    viewport.addEventListener('scroll', () => {
        clearTimeout(scrollSyncTimer);
        scrollSyncTimer = setTimeout(syncPageFromScroll, 80);
    }, { passive: true });

    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            buildDots();
            scrollToPage(page, true);
        }, 150);
    }, { passive: true });

    document.getElementById('galleryFooter')?.classList.add('gallery__footer--ready');
    buildDots();
    updateUi();
    layoutCells();
    viewport.scrollLeft = 0;
    resetHorizontalPageScroll();
    scrollToPage(0, true);

    window.__galleryPrev = e => {
        e?.preventDefault?.();
        if (page > 0) scrollToPage(page - 1, true);
    };
    window.__galleryNext = e => {
        e?.preventDefault?.();
        if (page < totalPages() - 1) scrollToPage(page + 1, true);
    };
    window.__galleryGo = p => scrollToPage(Number(p), true);
};

(async () => {
    await initSiteLoader();
    initInternalNavSkipLoader();
    if (isTouchUI()) document.documentElement.classList.add('touch-ui');
    if (matchMedia('(max-width: 768px)').matches) document.documentElement.classList.add('mobile-ui');
    unlockBodyScroll();
    window.addEventListener('pageshow', unlockBodyScroll);

    try { initGalleryCarousel(); } catch (galleryErr) {
        console.error('Gallery init failed:', galleryErr);
    }

    try {

    const html = document.documentElement;
    const themeBtn = document.getElementById('themeBtn');
    const [themeIconDark, themeIconLight] = ['themeIconDark', 'themeIconLight'].map(id => document.getElementById(id));
    const themeOverlay = document.getElementById('themeOverlay');

    const setTheme = theme => {
        html.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
        const isDark = theme === 'dark';
        themeIconDark?.classList.toggle('is-visible', isDark);
        themeIconDark?.classList.toggle('is-hidden', !isDark);
        themeIconLight?.classList.toggle('is-visible', !isDark);
        themeIconLight?.classList.toggle('is-hidden', isDark);
        themeBtn?.setAttribute('aria-label', isDark ? 'Switch to light mode' : 'Switch to dark mode');
    };

    const applyTheme = (theme, animate) => {
        const update = () => setTheme(theme);
        if (!animate || prefersReducedMotion) return update();
        if (document.startViewTransition) return document.startViewTransition(update);
        if (!themeOverlay) return update();
        themeOverlay.style.backgroundColor = theme === 'light' ? '#EDE7DC' : '#061528';
        themeOverlay.classList.add('is-active');
        setTimeout(() => (update(), themeOverlay.classList.remove('is-active')), THEME_MS);
    };

    applyTheme(localStorage.getItem('theme') ?? 'dark', false);
    themeBtn?.addEventListener('click', () => applyTheme(html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark', true));

    const header = document.getElementById('header');
    const menuBtn = document.getElementById('menuBtn');
    const nav = document.getElementById('nav');
    let scrollPending = false;

    if (header) {
        const isSolid = header.classList.contains('header--solid');
        const syncHeader = () => {
            if (!isSolid) header.classList.toggle('header--scrolled', scrollY > 60);
        };
        window.addEventListener('scroll', () => {
            if (scrollPending || isSolid) return;
            scrollPending = true;
            requestAnimationFrame(() => (syncHeader(), scrollPending = false));
        }, { passive: true });
        syncHeader();
    }

    const OVERLAP_EPS = 1;
    const CLEARANCE_MIN = 8;
    const MENU_MQ = '(max-width: 1024px)';
    const menuMq = matchMedia(MENU_MQ);
    const isTouchDevice = () => matchMedia('(hover: none) and (pointer: coarse)').matches;
    let menuScrollY = 0;

    const isMobileNav = () =>
        (header?.classList.contains('header--mobile-nav') ?? false)
        || menuMq.matches;

    const headerSegments = () => [
        header?.querySelector('.brand'),
        nav,
        header?.querySelector('.header__actions'),
        header?.querySelector('.theme-btn'),
    ].filter(el => el && el.getBoundingClientRect().width > 0);

    const segmentGap = (a, b) => b.getBoundingClientRect().left - a.getBoundingClientRect().right;

    const headerHasOverlap = () => {
        const segments = headerSegments();
        for (let i = 0; i < segments.length - 1; i++) {
            if (segmentGap(segments[i], segments[i + 1]) < -OVERLAP_EPS) return true;
        }
        const links = [...(nav?.querySelectorAll('.nav__link:not(.nav__link--mobile-cta)') ?? [])];
        for (let i = 0; i < links.length - 1; i++) {
            const a = links[i].getBoundingClientRect();
            const b = links[i + 1].getBoundingClientRect();
            if (a.right > b.left + OVERLAP_EPS) return true;
        }
        if (nav && nav.scrollWidth > nav.clientWidth + OVERLAP_EPS) return true;
        return false;
    };

    const headerHasClearance = minGap => {
        const segments = headerSegments();
        for (let i = 0; i < segments.length - 1; i++) {
            if (segmentGap(segments[i], segments[i + 1]) < minGap) return false;
        }
        const links = [...(nav?.querySelectorAll('.nav__link:not(.nav__link--mobile-cta)') ?? [])];
        for (let i = 0; i < links.length - 1; i++) {
            const a = links[i].getBoundingClientRect();
            const b = links[i + 1].getBoundingClientRect();
            if (b.left - a.right < minGap) return false;
        }
        return true;
    };

    const syncNavHitTarget = open => {
        if (!nav || !isMobileNav()) {
            nav?.style.removeProperty('pointer-events');
            nav?.style.removeProperty('z-index');
            return;
        }
        if (open) {
            nav.style.pointerEvents = 'auto';
            nav.style.zIndex = '401';
        } else {
            nav.style.pointerEvents = 'none';
            nav.style.zIndex = '-1';
        }
    };

    const setMenuOpen = open => {
        nav?.classList.toggle('nav--open', open);
        menuBtn?.classList.toggle('menu-btn--open', open);
        menuBtn?.setAttribute('aria-expanded', String(open));
        menuBtn?.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
        if (isMobileNav()) {
            nav?.setAttribute('aria-hidden', String(!open));
            if (open) nav?.removeAttribute('inert');
            else nav?.removeAttribute('inert');
        } else {
            nav?.removeAttribute('inert');
            nav?.setAttribute('aria-hidden', 'false');
        }
        document.body.classList.toggle('nav-open', open);
        if (open && isMobileNav()) {
            if (isTouchDevice()) {
                menuScrollY = window.scrollY;
                document.body.style.position = 'fixed';
                document.body.style.top = `-${menuScrollY}px`;
                document.body.style.left = '0';
                document.body.style.right = '0';
                document.body.style.width = '100%';
            } else {
                document.body.style.overflow = 'hidden';
            }
            syncNavHitTarget(true);
            return;
        }
        if (isTouchDevice()) {
            document.body.style.removeProperty('position');
            document.body.style.removeProperty('top');
            document.body.style.removeProperty('left');
            document.body.style.removeProperty('right');
            document.body.style.removeProperty('width');
            window.scrollTo(0, menuScrollY);
        }
        document.body.style.overflow = '';
        syncNavHitTarget(open);
    };

    const syncNavMode = () => {
        if (!header) return;

        if (menuMq.matches) {
            header.classList.add('header--mobile-nav');
            if (!nav?.classList.contains('nav--open')) {
                nav?.setAttribute('aria-hidden', 'true');
                nav?.removeAttribute('inert');
            }
            syncNavHitTarget(nav?.classList.contains('nav--open'));
            syncHeaderPhone();
            return;
        }

        const wasMobile = header.classList.contains('header--mobile-nav');
        if (wasMobile) header.classList.remove('header--mobile-nav');

        const overlap = headerHasOverlap();
        const needsMobile = wasMobile
            ? overlap || !headerHasClearance(CLEARANCE_MIN)
            : overlap;

        header.classList.toggle('header--mobile-nav', needsMobile);

        if (!needsMobile) {
            setMenuOpen(false);
            nav?.removeAttribute('inert');
            nav?.setAttribute('aria-hidden', 'false');
            syncNavHitTarget(false);
            syncHeaderPhone();
            return;
        }
        if (!nav?.classList.contains('nav--open')) {
            nav?.setAttribute('aria-hidden', 'true');
            nav?.removeAttribute('inert');
        }
        syncNavHitTarget(nav?.classList.contains('nav--open'));
        syncHeaderPhone();
    };

    const syncHeaderPhone = () => {
        if (!header) return;
        const brand = header.querySelector('.brand');
        const actions = header.querySelector('.header__actions');
        const phone = actions?.querySelector('.header__phone');
        if (!brand || !actions || !phone || !isMobileNav()) {
            header.classList.remove('header--hide-phone');
            return;
        }
        const gap = phone.getBoundingClientRect().left - brand.getBoundingClientRect().right;
        const wasHidden = header.classList.contains('header--hide-phone');
        const hide = wasHidden ? gap < 20 : gap <= 10;
        header.classList.toggle('header--hide-phone', hide);
    };

    syncNavMode();
    window.addEventListener('resize', syncNavMode);
    menuMq.addEventListener('change', syncNavMode);
    window.visualViewport?.addEventListener('resize', syncNavMode);
    document.fonts?.ready.then(syncNavMode);

    const headerInner = header?.querySelector('.header__inner');
    if (headerInner && typeof ResizeObserver !== 'undefined') {
        const headerObserver = new ResizeObserver(() => syncNavMode());
        headerObserver.observe(headerInner);
        headerSegments().forEach(el => headerObserver.observe(el));
    }

    const toggleMenu = () => setMenuOpen(!nav?.classList.contains('nav--open'));
    bindTap(menuBtn, e => {
        e.preventDefault();
        toggleMenu();
    });
    nav?.querySelectorAll('.nav__link').forEach(link => {
        link.addEventListener('click', e => {
            const href = link.getAttribute('href');
            const wasOpen = nav?.classList.contains('nav--open');
            setMenuOpen(false);
            if (!wasOpen || !href) return;

            try {
                const url = new URL(href, location.origin);
                const onHome = location.pathname === '/' || location.pathname.endsWith('/index.html');
                const linkHome = url.pathname === '/' || url.pathname.endsWith('/index.html');
                if (onHome && linkHome && url.hash) {
                    e.preventDefault();
                    requestAnimationFrame(() => {
                        requestAnimationFrame(() => {
                            document.querySelector(url.hash)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                            history.replaceState(null, '', url.hash);
                        });
                    });
                }
            } catch (_) {}
        });
    });

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
        if (!imageSlides.length) return;
        const next = ((index % imageSlides.length) + imageSlides.length) % imageSlides.length;
        if (next === current) return armTimer();
        slideSets.forEach((set, i) => set[current].classList.remove(activeClasses[i]));
        current = next;
        loadImage(imageSlides[current].querySelector('.hero__img'));
        slideSets.forEach((set, i) => set[current].classList.add(activeClasses[i]));
        armTimer();
    };

    tabs.forEach(tab => tab.addEventListener('click', () => goTo(+tab.dataset.slide)));
    if (imageSlides.length) {
        armTimer();
        (requestIdleCallback ?? (cb => setTimeout(cb, 1500)))(() => loadImage(imageSlides[1]?.querySelector('.hero__img[data-src]')), requestIdleCallback ? { timeout: 2000 } : undefined);
    }

    let counted = false;
    const runCounters = () => {
        if (counted) return;
        counted = true;
        const inline = document.querySelector('.inline-stat');
        if (!inline) return;
        const target = +inline.dataset.target;
        if (prefersReducedMotion) {
            inline.textContent = `${target}+`;
            return;
        }
        const startVal = Math.round(target * 0.92);
        inline.textContent = `${startVal}+`;
        const start = performance.now();
        const tick = now => {
            const t = Math.min((now - start) / 1400, 1);
            inline.textContent = Math.round(startVal + (1 - (1 - t) ** 3) * (target - startVal)) + '+';
            if (t < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
    };

    const lazyIo = new IntersectionObserver(entries => entries.forEach(({ isIntersecting, target: el }) => {
        if (!isIntersecting) return;
        if (el.dataset.bg) (el.style.backgroundImage = `url('${el.dataset.bg}')`, el.classList.add('bento__bg--loaded'), el.removeAttribute('data-bg'));
        else if (el.tagName === 'IMG' && el.dataset.src) loadImage(el);
        else if (el.tagName === 'IFRAME' && el.dataset.src) (el.src = el.dataset.src, el.removeAttribute('data-src'));
        lazyIo.unobserve(el);
    }), { rootMargin: '200px' });
    document.querySelectorAll('[data-bg], iframe[data-src], img[data-src]').forEach(el => lazyIo.observe(el));

    const revealIo = new IntersectionObserver(entries => entries.forEach(({ isIntersecting, target: el }) => {
        if (!isIntersecting) return;
        el.classList.add('reveal--visible');
        revealIo.unobserve(el);
        if (el.closest('#about') || el.classList.contains('about__grid')) runCounters();
    }), { threshold: 0.12, rootMargin: '0px 0px -32px 0px' });
    document.querySelectorAll('.reveal').forEach(el => revealIo.observe(el));

    const productCatalog = document.querySelector('.product-list--catalog');
    /* Exclusive accordion uses details[name=catalog] — no JS toggle needed */

    try {

    const quoteForm = document.getElementById('quoteForm');
    const qfSubmit = document.getElementById('qfSubmit');
    const qfWidth = document.getElementById('qf-width');
    const qfHeight = document.getElementById('qf-height');
    const qfQuantity = document.getElementById('qf-quantity');
    const qfProductPicker = document.getElementById('qfProductPicker');
    const qfTypePicker = document.getElementById('qfTypePicker');
    const qfTypeStandard = document.getElementById('qfTypeStandard');
    const qfTypeGlass = document.getElementById('qfTypeGlass');
    const qfTypeLabel = document.getElementById('qf-type-label');
    const qfGlassTypePicker = document.getElementById('qfGlassTypePicker');
    const qfPanePicker = document.getElementById('qfPanePicker');
    const qfThicknessPicker = document.getElementById('qfThicknessPicker');
    const qfAddItem = document.getElementById('qfAddItem');
    const qfInquiryList = document.getElementById('qfInquiryList');
    const qfInquiryEmpty = document.getElementById('qfInquiryEmpty');
    const qfStatus = document.getElementById('qfStatus');
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
        { value: 'Clear', name: 'Clear', cn: '透明' },
        { value: 'Low-e', name: 'Low-e', cn: '低辐射' },
        { value: 'Tempered', name: 'Tempered', cn: '钢化' },
        { value: 'Frosted', name: 'Frosted', cn: '磨砂' },
        { value: 'Fluted', name: 'Fluted', cn: '凹槽' },
        { value: 'Rain', name: 'Rain', cn: '雨纹' },
        { value: 'Acid Etch', name: 'Acid Etch', cn: '酸蚀' },
        { value: 'Special-Shaped', name: 'Special-Shaped', cn: '异形' },
        { value: 'Other', name: 'Other', cn: '其他' }
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
    const useNativePickers = isTouchUI() || matchMedia('(max-width: 768px)').matches;

    const NATIVE_HIDDEN_PAIRS = [
        ['qf-product-native', 'qf-product'],
        ['qf-type-native', 'qf-type'],
        ['qf-glass-type-native', 'qf-glass-type'],
        ['qf-pane-native', 'qf-pane'],
        ['qf-thickness-native', 'qf-thickness']
    ];

    const readNativeSelect = id => {
        const sel = document.getElementById(id);
        if (!sel) return '';
        if (sel.disabled && id === 'qf-type-native') {
            const glassPanel = document.getElementById('qfTypeGlass');
            if (glassPanel && !glassPanel.hidden && !glassPanel.hasAttribute('hidden')) return 'n/a';
            return '';
        }
        const direct = sel.value?.trim() ?? '';
        if (direct) return direct;
        for (const opt of sel.options) {
            if (opt.selected && opt.value?.trim()) return opt.value.trim();
        }
        const idx = sel.selectedIndex;
        if (idx > 0 && sel.options[idx]?.value?.trim()) return sel.options[idx].value.trim();
        const opt = sel.selectedOptions?.[0] ?? sel.options?.[idx];
        if (opt?.value?.trim()) return opt.value.trim();
        const label = opt?.textContent?.trim() ?? '';
        if (label) {
            for (const option of sel.options) {
                if (option.value && option.textContent?.trim() === label) return option.value.trim();
            }
            const token = label.split('—')[0].split('–')[0].trim();
            if (token && ['Glass', 'Window', 'Doors'].includes(token)) return token;
        }
        return '';
    };

    const readDimValue = el => {
        if (!el) return '';
        return String(el.value ?? '').trim();
    };

    const syncQuoteHiddenFields = () => {
        NATIVE_HIDDEN_PAIRS.forEach(([selectId, hiddenId]) => {
            const select = document.getElementById(selectId);
            const hidden = document.getElementById(hiddenId);
            if (!select || !hidden) return;
            const fromNative = readNativeSelect(selectId);
            if (fromNative) hidden.value = fromNative;
        });
    };

    const readFieldValue = (nativeId, picker, hiddenId) => {
        const fromNative = readNativeSelect(nativeId);
        if (fromNative) return fromNative;
        const fromPicker = picker?.getValue?.()?.trim();
        if (fromPicker) return fromPicker;
        return document.getElementById(hiddenId)?.value?.trim() ?? '';
    };

    const bindQuoteBtn = (el, handler) => {
        if (!el) return;
        let touchAt = 0;
        const run = e => {
            if (e?.type === 'touchend') {
                touchAt = Date.now();
            } else if (e?.type === 'click' && Date.now() - touchAt < 500) {
                return;
            }
            e?.preventDefault?.();
            e?.stopPropagation?.();
            syncQuoteHiddenFields();
            handler(e);
        };
        el.addEventListener('click', run);
        el.addEventListener('touchend', run, { passive: false });
        el.addEventListener('pointerup', run);
    };

    const closePicker = picker => {
        if (!picker) return;
        picker.classList.remove('is-open');
        const panel = picker.querySelector('.qf-picker__panel');
        if (panel) panel.hidden = true;
        picker.querySelector('.qf-picker__trigger')?.setAttribute('aria-expanded', 'false');
        if (openPicker === picker) openPicker = null;
        document.body.classList.toggle('quote-picker-open', Boolean(openPicker));
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
        if (!hidden) return null;
        const trigger = picker.querySelector('.qf-picker__trigger');
        const valueEl = picker.querySelector('.qf-picker__value');
        const panel = picker.querySelector('.qf-picker__panel');
        const list = picker.querySelector('.qf-picker__list');
        const track = picker.querySelector('.qf-picker__scroll-track');
        const rail = picker.querySelector('.qf-picker__scroll-rail');

        if (useNativePickers) {
            picker.classList.add('qf-picker--native');
            let select = picker.querySelector('.qf-picker__native');
            if (!select) {
                select = document.createElement('select');
                select.className = 'qf-picker__native';
                if (hidden.id) select.id = `${hidden.id}-native`;
                const labelledBy = trigger?.getAttribute('aria-labelledby');
                if (labelledBy) select.setAttribute('aria-labelledby', labelledBy);
                picker.insertBefore(select, trigger ?? picker.firstChild);
            }

            let currentPlaceholder = placeholder;

            const clearSelect = () => {
                while (select.firstChild) select.removeChild(select.firstChild);
            };

            const syncPlaceholder = () => {
                const first = select.options[0];
                if (first?.value === '') first.textContent = currentPlaceholder;
            };

            const setValue = (value, _label, placeholderText = currentPlaceholder) => {
                hidden.value = value;
                if (placeholderText) currentPlaceholder = placeholderText;
                if (!value) {
                    select.selectedIndex = 0;
                    syncPlaceholder();
                    return;
                }
                select.value = value;
                if (select.value !== value) select.selectedIndex = 0;
            };

            const renderOptions = options => {
                const htmlPopulated = new Set([
                    'qf-product-native',
                    'qf-glass-type-native',
                    'qf-pane-native',
                    'qf-thickness-native'
                ]);
                if (options.length && select.options.length > 1 && htmlPopulated.has(select.id)) {
                    return;
                }
                clearSelect();
                const placeholderOpt = document.createElement('option');
                placeholderOpt.value = '';
                placeholderOpt.textContent = currentPlaceholder;
                select.appendChild(placeholderOpt);
                options.forEach(opt => {
                    const option = document.createElement('option');
                    option.value = opt.value;
                    option.textContent = `${opt.name} — ${opt.cn}`;
                    select.appendChild(option);
                });
                if (hidden.value && [...select.options].some(o => o.value === hidden.value)) {
                    select.value = hidden.value;
                } else {
                    select.selectedIndex = 0;
                    syncPlaceholder();
                }
            };

            const setDisabled = disabled => {
                picker.classList.toggle('qf-picker--disabled', disabled);
                if (disabled) {
                    select.disabled = true;
                    trigger?.setAttribute('disabled', '');
                } else {
                    select.disabled = false;
                    select.removeAttribute('disabled');
                    trigger?.removeAttribute('disabled');
                    if (typeof activateNativeSelect === 'function') activateNativeSelect(select);
                }
            };

            const reset = (placeholderText = placeholder) => {
                currentPlaceholder = placeholderText;
                hidden.value = '';
                const htmlPopulated = new Set([
                    'qf-product-native',
                    'qf-glass-type-native',
                    'qf-pane-native',
                    'qf-thickness-native'
                ]);
                if (htmlPopulated.has(select.id) && select.options.length > 1) {
                    select.selectedIndex = 0;
                    syncPlaceholder();
                    return;
                }
                clearSelect();
                const placeholderOpt = document.createElement('option');
                placeholderOpt.value = '';
                placeholderOpt.textContent = placeholderText;
                select.appendChild(placeholderOpt);
                select.selectedIndex = 0;
            };

            const onNativeChange = () => {
                syncQuoteHiddenFields();
                onSelect?.(select.value);
                scheduleAddBtnUpdate();
            };
            select.addEventListener('change', onNativeChange);
            select.addEventListener('input', onNativeChange);

            trigger?.setAttribute('hidden', '');
            panel?.setAttribute('hidden', '');
            trigger?.setAttribute('tabindex', '-1');
            trigger?.setAttribute('aria-hidden', 'true');
            trigger?.setAttribute('disabled', '');
            const htmlPopulated = ['qf-product-native', 'qf-glass-type-native', 'qf-pane-native', 'qf-thickness-native'];
            if (select.options.length <= 1 && !htmlPopulated.includes(select.id)) reset();
            return { renderOptions, setDisabled, reset, getValue: () => hidden.value || select.value };
        }

        if (!trigger || !valueEl || !list) return null;

        picker.addEventListener('click', e => e.stopPropagation());

        const syncPickerListHeight = () => {
            if (!list) return;
            const rows = [...list.querySelectorAll('.qf-picker__option')];
            if (!rows.length || !picker.classList.contains('is-open')) {
                list.style.removeProperty('max-height');
                return;
            }
            const rowH = Math.max(...rows.map(row => row.getBoundingClientRect().height), 36);
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
                row.className = 'qf-picker__option-wrap';
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'product-row qf-picker__option';
                btn.role = 'option';
                btn.dataset.value = opt.value;
                btn.setAttribute('aria-selected', String(hidden.value === opt.value));
                btn.classList.toggle('is-selected', hidden.value === opt.value);
                btn.innerHTML = `<span class="product-row__label"><span class="product-row__name">${opt.name}</span><span class="product-row__sep"> — </span><span class="product-row__cn">${opt.cn}</span></span>`;
                const selectOption = e => {
                    e.preventDefault();
                    e.stopPropagation();
                    setValue(opt.value, opt.name, placeholder);
                    list.querySelectorAll('.qf-picker__option').forEach(el => {
                        const selected = el.dataset.value === opt.value;
                        el.classList.toggle('is-selected', selected);
                        el.setAttribute('aria-selected', String(selected));
                    });
                    closePicker(picker);
                    onSelect?.(opt.value);
                    updateAddItemBtn();
                };
                bindTap(btn, selectOption);
                row.appendChild(btn);
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
            closePicker(picker);
        };

        bindTap(trigger, e => {
            e.preventDefault();
            e.stopPropagation();
            if (picker.classList.contains('qf-picker--disabled')) return;
            if (picker.classList.contains('is-open')) return closePicker(picker);
            closeAllPickers();
            picker.classList.add('is-open');
            if (panel) panel.hidden = false;
            list.scrollTop = 0;
            trigger.setAttribute('aria-expanded', 'true');
            openPicker = picker;
            document.body.classList.add('quote-picker-open');
            requestAnimationFrame(() => {
                updateScrollRail();
                requestAnimationFrame(updateScrollRail);
            });
        });

        let highlightedIndex = -1;

        const setHighlighted = index => {
            const options = [...list.querySelectorAll('.qf-picker__option')];
            highlightedIndex = index;
            options.forEach((row, i) => row.classList.toggle('is-highlighted', i === index));
            if (index >= 0 && options[index]) options[index].scrollIntoView({ block: 'nearest' });
        };

        trigger.addEventListener('keydown', e => {
            const options = [...list.querySelectorAll('.qf-picker__option')];
            if (!picker.classList.contains('is-open')) {
                if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    if (!options.length) return;
                    trigger.click();
                    setHighlighted(Math.max(0, options.findIndex(row => row.classList.contains('is-selected'))));
                }
                return;
            }
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setHighlighted(Math.min(highlightedIndex + 1, options.length - 1));
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setHighlighted(Math.max(highlightedIndex - 1, 0));
            } else if (e.key === 'Enter' && highlightedIndex >= 0) {
                e.preventDefault();
                options[highlightedIndex]?.click();
            } else if (e.key === 'Escape') {
                closePicker(picker);
            }
        });

        list?.addEventListener('keydown', e => {
            if (e.key === 'Escape') closePicker(picker);
        });

        reset();
        return { renderOptions, setDisabled, reset, getValue: () => hidden.value };
    };

    const productPicker = qfProductPicker ? initPicker(qfProductPicker, {
        placeholder: 'Select product',
        onSelect: value => updateTypeFields(value)
    }) : null;

    const typePicker = qfTypePicker ? initPicker(qfTypePicker, {
        placeholder: 'Select product first',
        onSelect: () => updateAddItemBtn()
    }) : null;

    const glassTypePicker = qfGlassTypePicker ? initPicker(qfGlassTypePicker, {
        placeholder: 'Choose type',
        onSelect: () => updateAddItemBtn()
    }) : null;

    const panePicker = qfPanePicker ? initPicker(qfPanePicker, {
        placeholder: 'Choose pane',
        onSelect: () => updateAddItemBtn()
    }) : null;

    const thicknessPicker = qfThicknessPicker ? initPicker(qfThicknessPicker, {
        placeholder: 'Choose mm',
        onSelect: () => updateAddItemBtn()
    }) : null;

    const parseQuantity = value => {
        const n = parseInt(String(value ?? '1'), 10);
        return Number.isFinite(n) && n >= 1 && n <= 999 ? n : 1;
    };

    const isValidDim = value => {
        const n = parseFloat(value);
        return Number.isFinite(n) && n > 0;
    };

    const getProductValue = () => {
        syncQuoteHiddenFields();
        const raw = productPicker?.getValue() || readNativeSelect('qf-product-native');
        if (!raw) {
            const glassPanel = document.getElementById('qfTypeGlass');
            if (glassPanel && !glassPanel.hidden && !glassPanel.hasAttribute('hidden')) return 'Glass';
            return '';
        }
        if (raw === 'Glass' || raw === 'Window' || raw === 'Doors') return raw;
        const token = raw.split('—')[0].split('–')[0].trim();
        return ['Glass', 'Window', 'Doors'].includes(token) ? token : raw;
    };

    const isGlassEntry = product => product === 'Glass' || (
        !product && document.getElementById('qfTypeGlass')
        && !document.getElementById('qfTypeGlass').hidden
        && !document.getElementById('qfTypeGlass').hasAttribute('hidden')
    );

    const isEntryComplete = () => {
        syncQuoteHiddenFields();
        if (!isValidDim(readDimValue(qfWidth)) || !isValidDim(readDimValue(qfHeight))) return false;
        const product = getProductValue();
        if (!product && !isGlassEntry('')) return false;
        if (isGlassEntry(product)) {
            return Boolean(
                readFieldValue('qf-glass-type-native', glassTypePicker, 'qf-glass-type')
                && readFieldValue('qf-pane-native', panePicker, 'qf-pane')
                && readFieldValue('qf-thickness-native', thicknessPicker, 'qf-thickness')
            );
        }
        return Boolean(readFieldValue('qf-type-native', typePicker, 'qf-type'));
    };

    const getMissingEntryFields = () => {
        syncQuoteHiddenFields();
        const missing = [];
        if (!isValidDim(readDimValue(qfWidth))) missing.push('width');
        if (!isValidDim(readDimValue(qfHeight))) missing.push('height');
        const product = getProductValue();
        if (!product && !isGlassEntry('')) missing.push('product');
        else if (isGlassEntry(product)) {
            if (!readFieldValue('qf-glass-type-native', glassTypePicker, 'qf-glass-type')) missing.push('glass type');
            if (!readFieldValue('qf-pane-native', panePicker, 'qf-pane')) missing.push('pane');
            if (!readFieldValue('qf-thickness-native', thicknessPicker, 'qf-thickness')) missing.push('thickness');
        } else if (!readFieldValue('qf-type-native', typePicker, 'qf-type')) {
            missing.push('type');
        }
        return missing;
    };

    const entryStatusMessage = () => {
        if (inquiryItems.length >= MAX_QUOTE_ITEMS) {
            return `Maximum ${MAX_QUOTE_ITEMS} items per request.`;
        }
        const missing = getMissingEntryFields();
        if (!missing.length) return '';
        const labels = {
            width: 'width',
            height: 'height',
            product: 'product',
            type: 'type',
            'glass type': 'glass type',
            pane: 'pane',
            thickness: 'thickness'
        };
        const pretty = missing.map(key => labels[key] ?? key);
        if (pretty.length === 1) return `Enter ${pretty[0]} to add an item.`;
        return `Enter ${pretty.slice(0, -1).join(', ')} and ${pretty[pretty.length - 1]} to add an item.`;
    };

    const scheduleAddBtnUpdate = () => {
        requestAnimationFrame(() => requestAnimationFrame(updateAddItemBtn));
    };

    const updateAddItemBtn = () => {
        if (window.__quoteInquiryApi?.updateButton) {
            window.__quoteInquiryApi.updateButton();
            return;
        }
        if (!qfAddItem) return;
        const canAdd = isEntryComplete() && inquiryItems.length < MAX_QUOTE_ITEMS;
        const hint = document.getElementById('qf-add-item-hint');
        if (useNativePickers) {
            qfAddItem.disabled = false;
            qfAddItem.removeAttribute('disabled');
            qfAddItem.setAttribute('aria-disabled', canAdd ? 'false' : 'true');
            qfAddItem.classList.toggle('qf__add-item--inactive', !canAdd);
            qfAddItem.classList.toggle('qf__add-item--ready', canAdd);
        } else {
            qfAddItem.disabled = !canAdd;
            qfAddItem.setAttribute('aria-disabled', canAdd ? 'false' : 'true');
            qfAddItem.classList.toggle('qf__add-item--inactive', !canAdd);
            qfAddItem.classList.toggle('qf__add-item--ready', canAdd);
        }
        if (hint) {
            const message = entryStatusMessage();
            hint.textContent = message;
            hint.hidden = !message || canAdd;
        }
    };

    const activateNativeSelect = sel => {
        sel.disabled = false;
        sel.removeAttribute('disabled');
        if (!useNativePickers) return;
        const prevDisplay = sel.style.display;
        sel.style.display = 'none';
        void sel.offsetHeight;
        sel.style.display = prevDisplay;
    };

    const setGlassPickersEnabled = enabled => {
        const glassPanel = document.getElementById('qfTypeGlass');
        const glassPanelOpen = glassPanel && !glassPanel.hidden && !glassPanel.hasAttribute('hidden');
        if (window.__quoteInquiryManaged && glassPanelOpen && !enabled) return;

        ['qf-glass-type-native', 'qf-pane-native', 'qf-thickness-native'].forEach(id => {
            const sel = document.getElementById(id);
            const picker = sel?.closest('.qf-picker');
            if (!sel) return;
            if (enabled) {
                activateNativeSelect(sel);
                picker?.classList.remove('qf-picker--disabled');
            } else {
                sel.disabled = true;
                sel.setAttribute('disabled', '');
                if (!window.__quoteInquiryManaged) sel.selectedIndex = 0;
                picker?.classList.add('qf-picker--disabled');
            }
        });
    };

    const getTypeOptionCatalog = () => {
        const tpl = document.getElementById('qfTypeOptionsTpl');
        if (!tpl) return [];
        return [...tpl.content.querySelectorAll('option')].map(opt => ({
            value: opt.value,
            text: opt.textContent,
            product: opt.dataset.product
        }));
    };

    const syncTypeNativeSelect = product => {
        const sel = document.getElementById('qf-type-native');
        const hidden = document.getElementById('qf-type');
        const picker = sel?.closest('.qf-picker');
        if (!sel) return;
        const isStd = product === 'Window' || product === 'Doors';
        const catalog = getTypeOptionCatalog();
        sel.replaceChildren();
        const placeholder = document.createElement('option');
        placeholder.value = '';
        placeholder.textContent = product ? 'Select type' : 'Select product first';
        sel.appendChild(placeholder);
        if (isStd) {
            catalog.filter(opt => opt.product === product).forEach(opt => {
                const node = document.createElement('option');
                node.value = opt.value;
                node.textContent = opt.text;
                sel.appendChild(node);
            });
            activateNativeSelect(sel);
            picker?.classList.remove('qf-picker--disabled');
        } else {
            sel.disabled = true;
            sel.setAttribute('disabled', '');
            picker?.classList.add('qf-picker--disabled');
        }
        if (hidden) hidden.value = '';
    };

    const updateTypeFields = product => {
        product = product?.trim() || readNativeSelect('qf-product-native') || '';
        const glassPanel = document.getElementById('qfTypeGlass');
        const glassPanelOpen = glassPanel && !glassPanel.hidden && !glassPanel.hasAttribute('hidden');
        if (!product && glassPanelOpen) product = 'Glass';

        const isGlass = product === 'Glass';
        if (qfTypeStandard) {
            qfTypeStandard.hidden = isGlass;
            if (isGlass) qfTypeStandard.setAttribute('hidden', '');
            else qfTypeStandard.removeAttribute('hidden');
        }
        if (qfTypeGlass) {
            qfTypeGlass.hidden = !isGlass;
            if (isGlass) qfTypeGlass.removeAttribute('hidden');
            else qfTypeGlass.setAttribute('hidden', '');
        }
        if (qfTypeLabel) qfTypeLabel.hidden = isGlass;

        if (!product) {
            if (glassPanelOpen) {
                setGlassPickersEnabled(true);
                updateAddItemBtn();
                return;
            }
            if (qfTypeStandard) qfTypeStandard.hidden = false;
            if (qfTypeGlass) qfTypeGlass.hidden = true;
            if (qfTypeLabel) qfTypeLabel.hidden = false;
            typePicker?.setDisabled(true);
            typePicker?.reset('Select product first');
            if (!useNativePickers) typePicker?.renderOptions([]);
            else syncTypeNativeSelect('');
            setGlassPickersEnabled(false);
            if (!useNativePickers) {
                glassTypePicker?.reset('Choose type');
                panePicker?.reset('Choose pane');
                thicknessPicker?.reset('Choose mm');
                glassTypePicker?.renderOptions([]);
                panePicker?.renderOptions([]);
                thicknessPicker?.renderOptions([]);
            } else {
                ['qf-glass-type-native', 'qf-pane-native', 'qf-thickness-native'].forEach(id => {
                    document.getElementById(id).selectedIndex = 0;
                });
            }
            updateAddItemBtn();
            return;
        }

        if (isGlass) {
            typePicker?.setDisabled(true);
            syncTypeNativeSelect('');
            if (useNativePickers && qfTypeGlass) void qfTypeGlass.offsetHeight;
            setGlassPickersEnabled(true);
            glassTypePicker?.renderOptions(GLASS_TYPE_OPTIONS);
            panePicker?.renderOptions(PANE_OPTIONS);
            thicknessPicker?.renderOptions(THICKNESS_OPTIONS);
            updateAddItemBtn();
            return;
        }

        setGlassPickersEnabled(false);
        if (!useNativePickers) {
            glassTypePicker?.reset('Choose type');
            panePicker?.reset('Choose pane');
            thicknessPicker?.reset('Choose mm');
            glassTypePicker?.renderOptions([]);
            panePicker?.renderOptions([]);
            thicknessPicker?.renderOptions([]);
        } else {
            ['qf-glass-type-native', 'qf-pane-native', 'qf-thickness-native'].forEach(id => {
                const sel = document.getElementById(id);
                if (sel) sel.selectedIndex = 0;
            });
        }
        const types = TYPE_OPTIONS[product] ?? [];
        if (useNativePickers) {
            syncTypeNativeSelect(product);
        } else {
            typePicker?.reset(product ? 'Select type' : 'Select product first');
            typePicker?.renderOptions(types);
            typePicker?.setDisabled(!types.length);
        }
        updateAddItemBtn();
    };

    if (productPicker) {
        const productNative = document.getElementById('qf-product-native');
        if (!(useNativePickers && productNative && productNative.options.length > 1)) {
            productPicker.renderOptions(PRODUCT_OPTIONS);
        }
        if (productNative) {
            const syncProduct = () => {
                syncQuoteHiddenFields();
                updateTypeFields(productNative.value);
            };
            ['change', 'input', 'blur'].forEach(ev => productNative.addEventListener(ev, syncProduct));
        }
    }
    const typeNative = document.getElementById('qf-type-native');
    if (typeNative) {
        const syncType = () => {
            syncQuoteHiddenFields();
            scheduleAddBtnUpdate();
        };
        ['change', 'input', 'blur'].forEach(ev => typeNative.addEventListener(ev, syncType));
    }
    ['qf-glass-type-native', 'qf-pane-native', 'qf-thickness-native'].forEach(id => {
        const sel = document.getElementById(id);
        if (!sel) return;
        ['change', 'input', 'blur'].forEach(ev => sel.addEventListener(ev, () => {
            syncQuoteHiddenFields();
            scheduleAddBtnUpdate();
        }));
    });
    document.getElementById('quoteForm')?.addEventListener('focusin', scheduleAddBtnUpdate);
    window.visualViewport?.addEventListener('resize', scheduleAddBtnUpdate);
    document.addEventListener('qf-product-change', e => {
        updateTypeFields(e.detail?.value ?? '');
    });

    const initialProduct =
        readNativeSelect('qf-product-native')
        || document.getElementById('qf-product')?.value
        || '';
    if (initialProduct || !window.__quoteInquiryManaged) {
        updateTypeFields(initialProduct);
    }

    if (!useNativePickers) {
        document.addEventListener('click', e => {
            if (!e.target.closest('.qf-picker')) closeAllPickers();
        });
    }

    if (!useNativePickers) {
        const closeQuotePickersOnScroll = () => closeAllPickers();
        window.addEventListener('scroll', closeQuotePickersOnScroll, { passive: true, capture: true });
        document.getElementById('quote')?.addEventListener('scroll', closeQuotePickersOnScroll, { passive: true, capture: true });
    }

    if (!useNativePickers) {
        document.addEventListener('keydown', e => {
            if (e.key === 'Escape') closeAllPickers();
        });
    }

    const addCurrentItem = () => {
        syncQuoteHiddenFields();
        if (!isEntryComplete() || inquiryItems.length >= MAX_QUOTE_ITEMS) return false;
        const product = getProductValue();
        const base = {
            width: readDimValue(qfWidth),
            height: readDimValue(qfHeight),
            product,
            quantity: parseQuantity(qfQuantity?.value)
        };
        if (product === 'Glass') {
            const glassType = readNativeSelect('qf-glass-type-native') || glassTypePicker?.getValue();
            const pane = readNativeSelect('qf-pane-native') || panePicker?.getValue();
            const thickness = readNativeSelect('qf-thickness-native') || thicknessPicker?.getValue();
            if (!glassType || !pane || !thickness) return false;
            inquiryItems.push({
                ...base,
                glassType,
                pane,
                thickness,
                type: `${pane} - ${glassType} - ${thickness}`
            });
        } else {
            const type = readNativeSelect('qf-type-native') || typePicker?.getValue();
            if (!type) return false;
            inquiryItems.push({ ...base, type });
        }
        renderInquiryList();
        clearEntryFields();
        return true;
    };

    const setFormStatus = (message, type = 'info') => {
        if (!qfStatus) return;
        if (!message) {
            qfStatus.hidden = true;
            qfStatus.textContent = '';
            qfStatus.className = 'qf__status';
            return;
        }
        qfStatus.hidden = false;
        qfStatus.textContent = message;
        qfStatus.className = `qf__status qf__status--${type}`;
    };

    const clearEntryFields = () => {
        closeAllPickers();
        if (qfWidth) qfWidth.value = '';
        if (qfHeight) qfHeight.value = '';
        if (qfQuantity) qfQuantity.value = '1';
        productPicker?.reset('Select product');
        updateTypeFields('');
        updateAddItemBtn();
    };

    const formatInquiryLine = ({ width, height, product, type, glassType, pane, thickness, quantity }) => {
        const size = `${width}" × ${height}"`;
        const qty = quantity && quantity > 1 ? ` × ${quantity}` : '';
        if (product === 'Glass') {
            if (glassType && pane && thickness) return `${size} - Glass - ${pane} - ${glassType} - ${thickness}${qty}`;
            if (glassType && thickness) return `${size} - Glass - ${glassType} - ${thickness}${qty}`;
            if (type) return `${size} - Glass - ${type}${qty}`;
        }
        return `${size} - ${product} - ${type}${qty}`;
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
        if (window.__quoteInquiryApi?.reset) {
            window.__quoteInquiryApi.reset();
            return;
        }
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
            ['input', 'change', 'blur', 'keyup', 'focusout'].forEach(ev => el.addEventListener(ev, () => {
                sanitizeDimensionInput(el);
                scheduleAddBtnUpdate();
            }));
        });
    }

    qfQuantity?.addEventListener('input', () => {
        let cleaned = qfQuantity.value.replace(/\D/g, '').slice(0, 3);
        if (cleaned && parseInt(cleaned, 10) < 1) cleaned = '1';
        if (qfQuantity.value !== cleaned) qfQuantity.value = cleaned;
        scheduleAddBtnUpdate();
    });
    qfQuantity?.addEventListener('change', scheduleAddBtnUpdate);
    qfQuantity?.addEventListener('blur', scheduleAddBtnUpdate);

    const setAddItemFeedback = (message, type = 'info') => {
        const hint = document.getElementById('qf-add-item-hint');
        if (hint) {
            hint.textContent = message;
            hint.hidden = !message;
            hint.className = `qf__field-hint qf__field-hint--entry${type ? ` qf__field-hint--${type}` : ''}`;
        }
        if (type === 'error') setFormStatus(message, 'error');
        else if (type === 'success') setFormStatus(message, 'success');
        else if (!message) setFormStatus('');
    };

    let addItemLock = 0;
    const handleAddItem = () => {
        const now = Date.now();
        if (now - addItemLock < 400) return;
        addItemLock = now;
        syncQuoteHiddenFields();
        updateAddItemBtn();
        if (!addCurrentItem()) {
            const message = entryStatusMessage() || 'Enter width, height, product, and type before adding an item.';
            setAddItemFeedback(message, 'error');
            const missing = getMissingEntryFields();
            const focusMap = {
                width: qfWidth,
                height: qfHeight,
                product: document.getElementById('qf-product-native'),
                type: document.getElementById('qf-type-native'),
                'glass type': document.getElementById('qf-glass-type-native'),
                pane: document.getElementById('qf-pane-native'),
                thickness: document.getElementById('qf-thickness-native')
            };
            focusMap[missing[0]]?.focus?.();
            return;
        }
        setAddItemFeedback('Item added to your inquiry list.', 'success');
        qfInquiryList?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        scheduleAddBtnUpdate();
    };

    if (!window.__quoteInquiryManaged) {
        bindQuoteBtn(qfAddItem, handleAddItem);
        window.__qfAddItem = e => {
            e?.preventDefault?.();
            handleAddItem();
        };
        window.__qfHandleAddItem = handleAddItem;
    }
    window.__qfUpdateAddBtn = updateAddItemBtn;

    if (!window.__quoteInquiryManaged) {
        renderInquiryList();
    } else {
        updateAddItemBtn();
    }

    const qfEmail = document.getElementById('qf-email');
    const qfEmailHint = document.getElementById('qf-email-hint');
    let emailVerifyToken = 0;
    let emailVerifyTimer;
    let emailVerifiedValue = '';

    const setEmailHint = (message, type = '') => {
        if (!qfEmailHint) return;
        qfEmailHint.textContent = message;
        qfEmailHint.className = `qf__field-hint${type ? ` qf__field-hint--${type}` : ''}`;
        qfEmailHint.hidden = !message;
    };

    const setEmailFieldState = valid => {
        qfEmail?.classList.toggle('qf__input--invalid', valid === false);
        qfEmail?.setAttribute('aria-invalid', valid === false ? 'true' : 'false');
    };

    const verifyQuoteEmail = async ({ quiet = false } = {}) => {
        const email = qfEmail?.value.trim() ?? '';
        if (!email) {
            emailVerifiedValue = '';
            setEmailFieldState(null);
            setEmailHint('');
            return { ok: false, reason: 'Email is required.' };
        }
        if (!EMAIL_FORMAT_RE.test(email)) {
            emailVerifiedValue = '';
            setEmailFieldState(false);
            if (!quiet) setEmailHint('Enter a valid email address.', 'error');
            return { ok: false, reason: 'Enter a valid email address.' };
        }
        if (location.protocol === 'file:') {
            emailVerifiedValue = email.toLowerCase();
            setEmailFieldState(true);
            setEmailHint('');
            return { ok: true, email: emailVerifiedValue };
        }
        if (emailVerifiedValue === email.toLowerCase()) {
            setEmailFieldState(true);
            setEmailHint('');
            return { ok: true, email: emailVerifiedValue };
        }

        const token = ++emailVerifyToken;
        if (!quiet) {
            setEmailHint('Checking email…', 'pending');
            setEmailFieldState(null);
        }

        try {
            const res = await fetch('/api/quote/verify-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            const data = await res.json().catch(() => ({}));
            if (token !== emailVerifyToken) return { ok: false, reason: 'Verification cancelled.' };
            if (!res.ok || !data.ok) {
                emailVerifiedValue = '';
                setEmailFieldState(false);
                const reason = data.error ?? 'That email could not be verified.';
                if (!quiet) setEmailHint(reason, 'error');
                return { ok: false, reason };
            }
            emailVerifiedValue = data.email ?? email.toLowerCase();
            setEmailFieldState(true);
            setEmailHint('');
            return { ok: true, email: emailVerifiedValue };
        } catch {
            if (token !== emailVerifyToken) return { ok: false, reason: 'Verification cancelled.' };
            emailVerifiedValue = '';
            setEmailFieldState(false);
            if (!quiet) setEmailHint('Could not verify email. Check your connection and try again.', 'error');
            return { ok: false, reason: 'Could not verify email.' };
        }
    };

    if (qfEmail) {
        qfEmail.addEventListener('blur', () => {
            void verifyQuoteEmail({ quiet: false });
        });
        qfEmail.addEventListener('input', () => {
            emailVerifiedValue = '';
            setEmailFieldState(null);
            setEmailHint('');
            clearTimeout(emailVerifyTimer);
            emailVerifyTimer = setTimeout(() => {
                void verifyQuoteEmail({ quiet: true });
            }, 500);
        });
    }

    if (quoteForm && qfSubmit && qfSubmit.querySelector('.qf__submit-text')) {
        const qfSubmitText = qfSubmit.querySelector('.qf__submit-text');
        const SUBMIT_LABEL = 'Send Quote Request';
        const setSubmitLabel = (text, resetMs) => (qfSubmitText.textContent = text, resetMs && setTimeout(() => qfSubmitText.textContent = SUBMIT_LABEL, resetMs));

        const fetchWithTimeout = (url, options, ms = 45000) => {
            const ctrl = new AbortController();
            const timer = setTimeout(() => ctrl.abort(), ms);
            return fetch(url, { ...options, signal: ctrl.signal }).finally(() => clearTimeout(timer));
        };

        if (location.protocol === 'file:') {
            qfSubmit.disabled = true;
            qfSubmitText.textContent = 'Run npm start to submit';
            setFormStatus('Start the server with npm start to use the quote form.', 'info');
        } else {
            fetch('/api/quote/status')
                .then(res => res.ok ? res.json() : null)
                .then(data => {
                    if (data && !data.emailReady) {
                        setFormStatus('Email is not configured yet — submissions are saved locally until Gmail credentials are added to .env.', 'info');
                    }
                })
                .catch(() => {});
        }

        const handleQuoteSubmit = async e => {
            e?.preventDefault?.();
            if (location.protocol === 'file:') return setSubmitLabel('Run npm start to submit.', 4000);

            const name = quoteForm.name.value.trim();
            const phone = quoteForm.phone.value.trim();
            const message = quoteForm.message.value.trim();
            const consent = quoteForm.consent?.checked;

            if (!consent) {
                setFormStatus('Please accept the privacy policy to continue.', 'error');
                return void quoteForm.consent?.focus();
            }

            if (!name || !quoteForm.email.value.trim() || !phone) {
                setFormStatus('Name, email, and phone are required.', 'error');
                return void (!name ? quoteForm.name : !quoteForm.email.value.trim() ? quoteForm.email : quoteForm.phone).focus();
            }

            const emailCheck = await verifyQuoteEmail({ quiet: false });
            if (!emailCheck.ok) {
                setFormStatus(emailCheck.reason, 'error');
                return void (qfEmail?.focus(), setSubmitLabel(emailCheck.reason, 4000));
            }
            const email = emailCheck.email;

            if (window.__quoteInquiryApi?.tryAddCurrent) window.__quoteInquiryApi.tryAddCurrent();
            else if (isEntryComplete()) addCurrentItem();

            const submitItems = window.__quoteInquiryApi?.getItems?.() ?? inquiryItems;
            if (!submitItems.length && !message) {
                setFormStatus('Add at least one product to your inquiry list, or write a note below.', 'error');
                return void setSubmitLabel('Add a product or note first.', 4000);
            }

            qfSubmit.disabled = true;
            setFormStatus('');
            setSubmitLabel('Sending…');
            try {
                const res = await fetchWithTimeout('/api/quote', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name, email, phone,
                        company: quoteForm.company.value.trim(),
                        website: quoteForm.website?.value.trim() ?? '',
                        consent: true,
                        items: submitItems.map(({ width, height, product, type, quantity }) => ({
                            width, height, product, type, quantity
                        })),
                        message
                    })
                }, 45000);
                const data = await res.json().catch(() => ({}));
                if (!res.ok || !data.success) throw new Error(data.error ?? 'Could not send. Please call us.');
                quoteForm.reset();
                resetInquiry();
                const successMsg = data.storedLocally
                    ? (data.emailPending
                        ? 'Request received! Email delivery is delayed — we saved your inquiry and will follow up.'
                        : 'Request saved! We will follow up once email is configured.')
                    : 'Request sent! We will reply within one business day.';
                setFormStatus(successMsg, 'success');
                setSubmitLabel('Request sent!', 4000);
            } catch (err) {
                const msg = err.name === 'AbortError'
                    ? 'Request timed out. Please try again or call us at 437-779-9799.'
                    : (err.message ?? 'Could not send. Please call us.');
                setFormStatus(msg, 'error');
                setSubmitLabel(msg, 4000);
            } finally {
                qfSubmit.disabled = location.protocol !== 'file:';
            }
        };

        window.__quoteSubmitHandler = handleQuoteSubmit;
        if (quoteForm.dataset.submitQueued === '1') {
            delete quoteForm.dataset.submitQueued;
            void handleQuoteSubmit(new Event('submit'));
        }
    }

    } catch (quoteErr) {
        console.error('Quote form init failed:', quoteErr);
    }

    } catch (err) {
        console.error('Site init error:', err);
        if (!document.documentElement.classList.contains('is-revealed')) {
            document.documentElement.classList.remove('is-loading');
            document.documentElement.classList.add('is-revealed');
        }
    }

    initFaqAccordion();
})();
