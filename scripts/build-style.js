const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const CSS_BUNDLE = [
    'css/tokens.css',
    'css/base.css',
    'css/components.css',
    'css/themes.css',
    'css/responsive.css',
];

const css = CSS_BUNDLE
    .map(file => fs.readFileSync(path.join(ROOT, file), 'utf8'))
    .join('\n');

fs.writeFileSync(path.join(ROOT, 'style.css'), css, 'utf8');
console.log(`Wrote style.css (${(css.length / 1024).toFixed(1)} KB)`);
