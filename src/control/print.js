/* global L */

'use strict';

var util = require('../util/util');

var PrintControl = L.Control.extend({
  initialize: function(options) {
    this._button = L.DomUtil.create('button', 'print');
    this._button.title = 'Print the map';
    L.DomEvent.addListener(this._button, 'click', this.print, this);

    return this;
  },
  addTo: function(map) {
    var toolbar = util.getChildElementsByClassName(map.getContainer().parentNode.parentNode, 'npmap-toolbar')[0];

    toolbar.childNodes[1].appendChild(this._button);
    toolbar.style.display = 'block';
    this._container = toolbar.parentNode.parentNode;
    this._map = map;
    util.getChildElementsByClassName(this._container.parentNode, 'npmap-map-wrapper')[0].style.top = '26px';
    return this;
  },
  print: function() {

  }
});

L.Map.mergeOptions({
  printControl: false
});
L.Map.addInitHook(function() {
  if (this.options.printControl) {
    var options = {};

    if (typeof this.options.printControl === 'object') {
      options = this.options.printControl;
    }

    this.printControl = L.npmap.control.print(options).addTo(this);
  }
});

module.exports = function(options) {
  return new PrintControl(options);
};
