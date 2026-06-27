const fs = require('fs');
const path = require('path');

const ASSET_VERSION = '70';
const ROOT = path.join(__dirname, '..');
const headerTemplate = fs.readFileSync(path.join(ROOT, 'partials', 'header.html'), 'utf8');
const footerTemplate = fs.readFileSync(path.join(ROOT, 'partials', 'footer.html'), 'utf8');
const loaderCriticalTemplate = fs.readFileSync(path.join(ROOT, 'partials', 'loader-critical.html'), 'utf8');
const loaderTemplate = fs.readFileSync(path.join(ROOT, 'partials', 'loader.html'), 'utf8');
const loaderFallbackTemplate = fs.readFileSync(path.join(ROOT, 'partials', 'loader-fallback.html'), 'utf8');
const googleAnalyticsTemplate = fs.readFileSync(path.join(ROOT, 'partials', 'google-analytics.html'), 'utf8');

const buildHeader = ({ activePage = null, solid = false } = {}) => {
    const headerClass = solid ? 'header header--solid' : 'header';
    const faqClass = activePage === 'faq' ? ' nav__link--active' : '';
    const faqAria = activePage === 'faq' ? ' aria-current="page"' : '';

    return headerTemplate
        .replace('{{HEADER_CLASS}}', headerClass)
        .replace('{{NAV_FAQ_CLASS}}', faqClass)
        .replace('{{NAV_FAQ_ARIA}}', faqAria);
};

const buildFooter = ({ activePage = null } = {}) => {
    const faqAria = activePage === 'faq' ? ' aria-current="page"' : '';
    const privacyAria = activePage === 'privacy' ? ' aria-current="page"' : '';
    const termsAria = activePage === 'terms' ? ' aria-current="page"' : '';

    return footerTemplate
        .replace('{{FOOTER_FAQ_ARIA}}', faqAria)
        .replace('{{FOOTER_PRIVACY_ARIA}}', privacyAria)
        .replace('{{FOOTER_TERMS_ARIA}}', termsAria);
};

const injectAssetVersion = html => html.replace(/\{\{ASSET_VERSION\}\}/g, ASSET_VERSION);

const renderPage = (file, opts = {}) => {
    let html = fs.readFileSync(path.resolve(ROOT, file), 'utf8');
    html = html.replace(/<!-- @include google-analytics -->/g, googleAnalyticsTemplate);
    html = html.replace(/<!-- @include loader-critical -->/g, loaderCriticalTemplate);
    html = html.replace(/<!-- @include loader -->/g, loaderTemplate);
    html = html.replace(/<!-- @include loader-fallback -->/g, loaderFallbackTemplate);
    html = html.replace(/<!-- @include header -->/g, buildHeader(opts.header));
    html = html.replace(/<!-- @include footer -->/g, buildFooter(opts.footer));
    return injectAssetVersion(html);
};

module.exports = { renderPage, ASSET_VERSION };
