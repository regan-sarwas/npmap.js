/* global L */

'use strict';

var util = require('../util/util');

var PrintControl = L.Control.extend({
  options: {
    ui: true,
    url: 'http://www.nps.gov/maps/print.html'
  },
  initialize: function(options) {
    L.Util.setOptions(this, options);

    if (this.options.ui === true) {
      this._li = L.DomUtil.create('li', '');
      this._button = L.DomUtil.create('button', 'print', this._li);
      this._button.title = 'Print the map';
      L.DomEvent.addListener(this._button, 'click', this.print, this);
    }

    return this;
  },
  addTo: function(map) {
    if (this.options.ui === true) {
      var toolbar = util.getChildElementsByClassName(map.getContainer().parentNode.parentNode, 'npmap-toolbar')[0];
      toolbar.childNodes[1].appendChild(this._li);
      toolbar.style.display = 'block';
      this._container = toolbar.parentNode.parentNode;
      util.getChildElementsByClassName(this._container.parentNode, 'npmap-map-wrapper')[0].style.top = '26px';
    }

    this._map = map;
    return this;
  },
  _clean: function(layer) {
    delete layer.L;

    // TODO: Move layer type-specific code.
    switch (layer.type) {
    case 'arcgisserver':
      delete layer.service;
      break;
    }

    if (layer.popup) {
      delete layer.popup.actions;

      if (typeof layer.popup.description === 'string') {
        layer.popup.description = util.escapeHtml(layer.popup.description);
      }

      if (typeof layer.popup.title === 'string') {
        layer.popup.title = util.escapeHtml(layer.popup.title);
      }
    }

    if (layer.tooltip) {
      layer.tooltip = util.escapeHtml(layer.tooltip);
    }
  },
  print: function() {
    var map = this._map,
      center = map.getCenter(),
      options = map.options,
      params = {
        c: JSON.stringify({
          lat: center.lat,
          lng: center.lng
        }),
        z: map.getZoom()
      },
      win;

    if (options.mapId) {
      params.mapId = options.mapId;
    } else {
      var configCenter = options.center,
        config = {
          baseLayers: [],
          center: {
            lat: configCenter.lat,
            lng: configCenter.lng
          },
          overlays: [],
          zoom: options.zoom
        },
        active, i, layer;

      for (i = 0; i < options.baseLayers.length; i++) {
        layer = options.baseLayers[i];

        if (typeof layer.L === 'object') {
          active = L.extend({}, layer);
          this._clean(active);
          config.baseLayers.push(active);
          break;
        }
      }

      for (i = 0; i < options.overlays.length; i++) {
        layer = options.overlays[i];

        if (typeof layer.L === 'object') {
          active = L.extend({}, layer);
          this._clean(active);
          config.overlays.push(active);
        }
      }

      params.b = JSON.stringify(config);
    }

    params = L.Util.getParamString(params);

    // TODO: Base64 encode and compress string.
    win = window.open(this.options.url + (this.options.url.indexOf('?') === -1 ? params : '&' + params.slice(1, params.length)), '_blank');
    win.focus();
  }
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
