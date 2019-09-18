/*
 * node.js script to build the stylesheet for the npmap symbol library
 * Assumes the cwd is the project root (i.e. there is a ./examples directory for the source)
 */

'use strict';

const npmapSymbolLibrary = require('../node_modules/npmap-symbol-library/www/npmap-builder/npmap-symbol-library.json'); // relative to script not cwd
const sizes = {
  large: 24,
  medium: 18,
  small: 12
};
let cssNpmapSymbolLibrary = '';

npmapSymbolLibrary.forEach((symbol) => {
  for (const prop in sizes) {
    cssNpmapSymbolLibrary += '.' + symbol.icon + '-' + prop + ' {background-image: url(images/icon/npmap-symbol-library/' + symbol.icon + '-' + sizes[prop] + '.png);}\n';
    cssNpmapSymbolLibrary += '.' + symbol.icon + '-' + prop + '-2x {background-image: url(images/icon/npmap-symbol-library/' + symbol.icon + '-' + sizes[prop] + '@2x.png);}\n';
  }
});

console.log(cssNpmapSymbolLibrary);
