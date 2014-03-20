/* global L */

'use strict';

var util = require('../util/util');

var PrintControl = L.Control.extend({
  initialize: function() {
    this._li = L.DomUtil.create('li', '');
    this._button = L.DomUtil.create('button', 'print', this._li);
    this._button.title = 'Print the map';
    L.DomEvent.addListener(this._button, 'click', this.print, this);

    return this;
  },
  addTo: function(map) {
    var toolbar = util.getChildElementsByClassName(map.getContainer().parentNode.parentNode, 'npmap-toolbar')[0];

    toolbar.childNodes[1].appendChild(this._li);
    toolbar.style.display = 'block';
    this._container = toolbar.parentNode.parentNode;
    this._map = map;
    util.getChildElementsByClassName(this._container.parentNode, 'npmap-map-wrapper')[0].style.top = '26px';
    return this;
  },
  _escapeHtml: function(layer) {
    if (layer.popup) {
      if (typeof layer.popup === 'string') {
        layer.popup = util.escapeHtml(layer.popup);
      } else {
        if (typeof layer.popup.description === 'string') {
          layer.popup.description = util.escapeHtml(layer.popup.description);
        }

        if (typeof layer.popup.title === 'string') {
          layer.popup.title = util.escapeHtml(layer.popup.title);
        }
      }
    }

    if (layer.tooltip) {
      layer.tooltip = util.escapeHtml(layer.popup);
    }
  },
  print: function() {
    var map = this._map,
      me = this,
      options = map.options,
      center = map.getCenter(),
      configCenter = options.center,
      zoom = map.getZoom(),
      params = {
        b: {
          baseLayers: [],
          center: {
            lat: configCenter.lat,
            lng: configCenter.lng
          },
          overlays: [],
          zoom: options.zoom
        },
        c: JSON.stringify({
          lat: center.lat,
          lng: center.lng
        }),
        z: zoom
      },
      active, i, layer, win;

    for (i = 0; i < options.baseLayers.length; i++) {
      layer = options.baseLayers[i];

      if (typeof layer.L === 'object') {
        active = L.extend({}, layer);
        delete active.L;
        me._escapeHtml(active);
        params.b.baseLayers.push(active);
        break;
      }
    }

    for (i = 0; i < options.overlays.length; i++) {
      layer = options.overlays[i];

      if (typeof layer.L === 'object') {
        active = L.extend({}, layer);
        delete active.L;
        me._escapeHtml(active);
        params.b.overlays.push(active);
      }
    }

    params.b = JSON.stringify(params.b);
    win = window.open('http://www.nps.gov/maps/print.html' + L.Util.getParamString(params), '_blank');
    win.focus();
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
