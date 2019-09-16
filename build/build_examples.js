/*
 * node.js script to build dist/examples from examples
 * Assumes the cwd is the project root (i.e. there is a ./examples directory for the source)
 * Output will be in dist/examples, which will be created if necessary, but not cleaned.
 */

const fs = require('fs');
const examples = require('../examples/index.json'); // relative to script not cwd

fs.mkdirSync('dist/examples', { recursive: true });

const indexCategories = {
  'Getting Started': [],
  Presets: [],
  Layers: [],
  Controls: [],
  Modules: [],
  Examples: [],
  Advanced: []
};
const defaultCSS = fs.readFileSync('examples/default.css', 'utf8');
const defaultHTML = fs.readFileSync('examples/default.html', 'utf8');
const template = fs.readFileSync('examples/template.html', 'utf8');
let indexHtml = '<h1 style="display:none;">NPMap.js Examples</h1>';

examples.forEach((example) => {
  if (example.include && !example.under_development) {
    const js = fs.readFileSync('examples/' + example.id + '.js', 'utf8');
    const html = example.html ? fs.readFileSync('examples/' + example.id + '.html', 'utf8') : defaultHTML;
    const css = example.css ? defaultCSS + fs.readFileSync('examples/' + example.id + '.css', 'utf8') : defaultCSS;
    const content = template
      .replace(/{{ css }}/g, css)
      .replace(/{{ html }}/g, html)
      .replace(/{{ js }}/g, js)
      .replace(/{{ path }}/g, '..')
      .replace(/{{ title }}/g, example.title);
    fs.writeFileSync('dist/examples/' + example.id + '.html', content, 'utf8');

    if (indexCategories[example.category]) {
      indexCategories[example.category].push(example);
    }
  }
});

Object.keys(indexCategories).forEach((category) => {
  indexHtml += '<h2>' + category + '</h2><ul>';
  indexCategories[category].forEach((example) => {
    indexHtml += '<li><a href="' + example.id + '.html">' + example.title + '</a></li>';
  });
  indexHtml += '</ul>';
});

fs.writeFileSync('dist/examples/index.html', indexHtml, 'utf8');
