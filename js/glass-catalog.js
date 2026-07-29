(() => {
    const grid = document.getElementById('catalogGrid');
    if (!grid) return;

    const countEl = document.getElementById('catalogCount');
    const emptyEl = document.getElementById('catalogEmpty');
    const filters = [...document.querySelectorAll('.catalog-filter')];
    const cards = [...grid.querySelectorAll('.catalog-card')];
    const dialog = document.getElementById('catalogDialog');
    const dialogImg = document.getElementById('catalogDialogImg');
    const dialogTitle = document.getElementById('catalogDialogTitle');
    const dialogCn = document.getElementById('catalogDialogCn');
    const dialogDesc = document.getElementById('catalogDialogDesc');
    const dialogCategory = document.getElementById('catalogDialogCategory');
    const closeBtn = document.getElementById('catalogDialogClose');
    const dismissBtn = document.getElementById('catalogDialogDismiss');

    const categoryLabel = {
        sheet: 'Sheet Glass',
        insulated: 'Insulated Glass',
        safety: 'Safety Glass',
        specialty: 'Specialty Glass'
    };

    const setFilter = filter => {
        filters.forEach(btn => {
            const active = btn.dataset.filter === filter;
            btn.classList.toggle('is-active', active);
            btn.setAttribute('aria-pressed', String(active));
        });

        let visible = 0;
        cards.forEach(card => {
            const show = filter === 'all' || card.dataset.category === filter;
            card.hidden = !show;
            if (show) visible += 1;
        });

        if (countEl) {
            countEl.innerHTML = `Showing <strong>${visible}</strong> product${visible === 1 ? '' : 's'}`;
        }
        if (emptyEl) emptyEl.hidden = visible > 0;
    };

    filters.forEach(btn => {
        btn.addEventListener('click', () => setFilter(btn.dataset.filter || 'all'));
    });

    const openCard = card => {
        if (!dialog) return;
        const name = card.dataset.name || '';
        const cn = card.dataset.cn || '';
        const desc = card.dataset.desc || '';
        const img = card.dataset.img || '';
        const category = categoryLabel[card.dataset.category] || '';

        if (dialogImg) {
            dialogImg.src = img;
            dialogImg.alt = name;
        }
        if (dialogTitle) dialogTitle.textContent = name;
        if (dialogCn) dialogCn.textContent = cn;
        if (dialogDesc) dialogDesc.textContent = desc;
        if (dialogCategory) dialogCategory.textContent = category;

        if (typeof dialog.showModal === 'function') dialog.showModal();
        else dialog.setAttribute('open', '');
    };

    const closeDialog = () => {
        if (!dialog) return;
        if (typeof dialog.close === 'function') dialog.close();
        else dialog.removeAttribute('open');
    };

    grid.addEventListener('click', e => {
        const openBtn = e.target.closest('[data-catalog-open]');
        if (!openBtn) return;
        const card = openBtn.closest('.catalog-card');
        if (card) openCard(card);
    });

    closeBtn?.addEventListener('click', closeDialog);
    dismissBtn?.addEventListener('click', closeDialog);
    dialog?.addEventListener('click', e => {
        if (e.target === dialog) closeDialog();
    });
    dialog?.addEventListener('cancel', e => {
        e.preventDefault();
        closeDialog();
    });
})();
