const THEME_MS = 520;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const prefersReducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const loadImage = img => img?.dataset.src && (img.src = img.dataset.src, img.removeAttribute('data-src'));

(() => {
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

    const galleryCarousel = document.getElementById('galleryCarousel');
    if (galleryCarousel) {
        const track = document.getElementById('galleryTrack');
        const [prevBtn, nextBtn, status, dotsContainer] = ['galleryPrev', 'galleryNext', 'galleryStatus', 'galleryDots'].map(id => document.getElementById(id));
        const cells = track ? [...track.querySelectorAll('.gallery__cell')] : [];
        if (track && prevBtn && nextBtn && status && cells.length) {
        const GAP = 12;
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
                cell.style.width = `${isPartial && onPage ? activeW : standardW}px`;
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
                        products: [...quoteForm.querySelectorAll('input[name="products"]:checked')].map(cb => cb.value),
                        dimensions: quoteForm.dimensions.value.trim(),
                        message: quoteForm.message.value.trim()
                    })
                });
                const data = await res.json().catch(() => ({}));
                if (!res.ok || !data.success) throw new Error(data.error ?? 'Could not send. Please call us.');
                quoteForm.reset();
                setSubmitLabel('Request sent!', 4000);
            } catch (err) {
                setSubmitLabel(err.message ?? 'Could not send. Please call us.', 4000);
            } finally {
                qfSubmit.disabled = location.protocol !== 'file:';
            }
        });
    }
})();
