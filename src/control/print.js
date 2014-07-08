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
    if ('localStorage' in window && window.localStorage !== null) {
      var map = this._map,
        center = map.getCenter(),
        options = map.options,
        printId = localStorage['npmap.printId'],
        storage = {},
        win;

      if (typeof printId === 'undefined') {
        printId = 0;
      } else {
        printId = parseInt(printId, 10) + 1;
      }

      if (options.mapId) {
        storage.mapId = options.mapId;
      } else {
        var config = {
          baseLayers: [],
          center: options.center,
          overlays: [],
          zoom: options.zoom
        }, active, i, layer;

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

        storage.config = JSON.stringify(config);
      }

      window.localStorage['npmap.print' + printId] = JSON.stringify(storage);
      window.localStorage['npmap.printId'] = printId;
      win = window.open(this.options.url + '?lat=' + center.lat.toFixed(4) + '&lng=' + center.lng.toFixed(4) + '&printId=' + printId + '&zoom=' + map.getZoom(), '_blank');
      win.focus();
    } else {
      this._map.notify.danger('Can\'t print because your browser does not support LocalStorage.');
    }
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
