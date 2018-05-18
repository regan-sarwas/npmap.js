/* global L */

'use strict';

// Modified options to support passing a layer in.

require('leaflet-easyprint');

// You can create additional print sizes by passing in some options. Width & Height are defined in pixels at 90DPI.
// var sizes = {
//   'Letter Portrait': {
//     height: (8 * 90),
//     width: (10.5 * 90),
//     name: 'Letter Portrait',
//     className: 'letterPortrait',
//     orientation: 'portrait'
//   },
//   'Letter Landscape': {
//     height: (10.5 * 90),
//     width: (8 * 90),
//     name: 'Letter Landscape',
//     className: 'letterLandscape',
//     orientation: 'landscape'
//   }
// };

var EasyPrintControl = function(options) {
  return L.easyPrint({
    position: 'topleft',
    sizeModes: ['Current', 'LetterPortrait', 'LetterLandscape']
  });
};

L.Map.addInitHook(function () {
  if (this.options.printControl) {
    var options = {};

    if (typeof this.options.printControl === 'object') {
      options = this.options.printControl;
    }

    this.printControl = L.npmap.control.print(options).addTo(this);
  }
});


module.exports = function (options) {
  return new EasyPrintControl(options);
};
