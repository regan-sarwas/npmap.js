/* globals L */

'use strict';

var util = require('./util/util');

var Tooltip = L.Class.extend({
  options: {
    maxWidth: '',
    minWidth: '',
    mouseOffset: L.point(15, 0),
    padding: '2px 4px',
    trackMouse: true,
    width: 'auto'
  },
  initialize: function(options) {
    L.setOptions(this, options);
    this._createTip();
  },
  _createTip: function() {
    this._map = this.options.map;

    if (!this._map) {
      throw new Error('No map configured for tooltip');
    }

    this._container = L.DomUtil.create('div', 'leaflet-tooltip');
    this._container.style.maxWidth = this._isNumeric(this.options.maxWidth) ? this.options.maxWidth + 'px' : this.options.maxWidth;
    this._container.style.minWidth = this._isNumeric(this.options.minWidth) ? this.options.minWidth + 'px' : this.options.minWidth;
    this._container.style.padding = this._isNumeric(this.options.padding) ? this.options.padding + 'px' : this.options.padding;
    this._container.style.position = 'absolute';
    this._container.style.width = this._isNumeric(this.options.width) ? this.options.width + 'px' : this.options.width;

    if (this.options.html) {
      this.setHtml(this.options.html);
    }

    this._map._tooltipContainer.appendChild(this._container);
  },
  _getElementSize: function(el) {
    var size = this._size;

    if (!size || this._sizeChanged) {
      var visible = this.isVisible();

      if (!visible) {
        el.style.left = '-999999px';
        el.style.right = 'auto';
        el.style.display = 'inline-block';
      }

      this._size = {
        x: el.offsetWidth,
        y: el.offsetHeight
      };

      if (!visible) {
        el.style.display = 'none';
        el.style.left = 'auto';
      }

      this._sizeChanged = false;
    }

    return this._size;
  },
  _hide: function() {
    this._container.style.display = 'none';
    L.DomUtil.removeClass(this._container, 'leaflet-tooltip-fade');

    if (this._map.activeTip === this) {
      delete this._map.activeTip;
    }
  },
  _isNumeric: function(val) {
    return !isNaN(parseFloat(val)) && isFinite(val);
  },
  _show: function() {
    this._container.style.display = 'inline-block';
    L.DomUtil.addClass(this._container, 'leaflet-tooltip-fade');
  },
  getHtml: function() {
    return this._container.innerHTML;
  },
  hide: function() {
    this._hide();
  },
  isVisible: function() {
    return this._container.style.display !== 'none';
  },
  remove: function() {
    this._container.parentNode.removeChild(this._container);
    delete this._container;
  },
  setHtml: function(html) {
    if (typeof html === 'string') {
      this._container.innerHTML = util.unescapeHtml(html);
    } else {
      while (this._container.hasChildNodes()) {
        this._container.removeChild(this._container.firstChild);
      }

      this._container.appendChild(this._content);
    }

    this._sizeChanged = true;
  },
  setPosition: function(point) {
    var container = this._container,
      containerSize = this._getElementSize(this._container),
      mapSize = this._map.getSize(),
      offset = this.options.mouseOffset || {x: 0, y: 0};

    if (point.x + containerSize.x > mapSize.x - offset.x - 5) {
      container.style.left = 'auto';
      container.style.right = (mapSize.x - point.x + (offset.x - 5)) + 'px';
    } else {
      container.style.left = point.x + offset.x + 'px';
      container.style.right = 'auto';
    }
    
    if (point.y + containerSize.y > mapSize.y) {
      container.style.top = 'auto';
      container.style.bottom = (mapSize.y - point.y) + 'px';
    } else {
      container.style.top = point.y + 'px';
      container.style.bottom = 'auto';
    }
  },
  show: function(point, html) {
    if (this._map.activeTip && (this._map.activeTip !== this)) {
      this._map.activeTip._hide();
    }

    this._map.activeTip = this;
    
    if (html) {
      this.setHtml(html);
    }

    this.setPosition(point);
    this._show();
  }
});

L.Map.addInitHook(function() {
  this._tooltipContainer = L.DomUtil.create('div', 'leaflet-tooltip-container', this._container);
});

module.exports = function(options) {
  return new Tooltip(options);
};
