/* global L */
/* jshint camelcase: false */

'use strict';

var MeasureControl = L.Control.extend({
  includes: L.Mixin.Events,
  options: {
    position: 'topleft'
  },
  onAdd: function() {
    var button;

    this._container = L.DomUtil.create('div', 'npmap-control-measure leaflet-bar leaflet-control');
    this._button = L.DomUtil.create('button', 'leaflet-bar-single', this._container);
    this._button.title = 'Measure distance';

    L.DomEvent
      .on(this._button, 'click', L.DomEvent.stopPropagation)
      .on(this._button, 'click', L.DomEvent.preventDefault)
      .on(this._button, 'click', this._toggleMeasure, this)
      .on(this._button, 'dblclick', L.DomEvent.stopPropagation);

    return this._container;
  },
  _createTooltip: function(position) {
    this._tooltip = L.marker(position, {
      icon: L.divIcon({
        className: 'leaflet-measure-tooltip',
        iconAnchor: [-5, -5]
      }),
      clickable: false
    }).addTo(this._layerPaint);
  },
  _finishPath: function() {
    if (this._lastCircle) {
      this._layerPaint.removeLayer(this._lastCircle);
    }

    if (this._tooltip) {
      this._layerPaint.removeLayer(this._tooltip);
    }

    if (this._layerPaint && this._layerPaintPathTemp) {
      this._layerPaint.removeLayer(this._layerPaintPathTemp);
    }

    this._restartPath();
  },
  _mouseClick: function(e) {
    if (!e.latlng) {
      return;
    }

    if (this._lastPoint && this._tooltip) {
      var distance;

      if (!this._distance) {
        this._distance = 0;
      }

      this._updateTooltipPosition(e.latlng);

      distance = e.latlng.distanceTo(this._lastPoint);
      this._updateTooltipDistance(this._distance + distance, distance);
      this._distance += distance;
    }

    this._createTooltip(e.latlng);

    if (this._lastPoint && !this._layerPaintPath) {
      this._layerPaintPath = L.polyline([this._lastPoint], {
        clickable: false,
        color: 'red',
        weight: 2
      }).addTo(this._layerPaint);
    }

    if (this._layerPaintPath) {
      this._layerPaintPath.addLatLng(e.latlng);
    }

    if (this._lastCircle) {
      this._layerPaint.removeLayer(this._lastCircle);
    }

    this._lastCircle = new L.CircleMarker(e.latlng, {
      clickable: this._lastCircle ? true : false,
      color: 'red',
      fill: true,
      fillOpacity: 1,
      opacity: 1,
      radius: 2,
      weight: 1
    }).addTo(this._layerPaint);
    
    this._lastCircle.on('click', function() { this._finishPath(); }, this);
    this._lastPoint = e.latlng;
  },
  _mouseMove: function(e) {
    if (!e.latlng || !this._lastPoint) {
      return;
    }
    
    if (!this._layerPaintPathTemp) {
      this._layerPaintPathTemp = L.polyline([this._lastPoint, e.latlng], {
        clickable: false,
        color: 'red',
        dashArray: '6,3',
        weight: 1.5
      }).addTo(this._layerPaint);
    } else {
      this._layerPaintPathTemp.spliceLatLngs(0, 2, this._lastPoint, e.latlng);
    }

    if (this._tooltip) {
      var distance;

      if(!this._distance) {
        this._distance = 0;
      }

      this._updateTooltipPosition(e.latlng);
      distance = e.latlng.distanceTo(this._lastPoint);
      this._updateTooltipDistance(this._distance + distance, distance);
    }
  },
  _onKeyDown: function(e) {
    if (e.keyCode === 27) {
      if (!this._lastPoint) {
        this._toggleMeasure();
      } else {
        this._finishPath();
      }
    }
  },
  _restartPath: function() {
    this._distance = 0;
    this._tooltip = undefined;
    this._lastCircle = undefined;
    this._lastPoint = undefined;
    this._layerPaintPath = undefined;
    this._layerPaintPathTemp = undefined;
  },
  _round: function(val) {
    return Math.round((val / 1852) * 10) / 10;
  },
  _startMeasuring: function() {
    this._oldCursor = this._map._container.style.cursor;
    this._map._container.style.cursor = 'crosshair';
    this._doubleClickZoom = this._map.doubleClickZoom.enabled();
    this._map.doubleClickZoom.disable();

    L.DomEvent
      .on(this._map, 'mousemove', this._mouseMove, this)
      .on(this._map, 'click', this._mouseClick, this)
      .on(this._map, 'dblclick', this._finishPath, this)
      .on(document, 'keydown', this._onKeyDown, this);

    if (!this._layerPaint) {
      this._layerPaint = L.layerGroup().addTo(this._map);
    }

    if (!this._points) {
      this._points = [];
    }
  },
  _stopMeasuring: function() {
    this._map._container.style.cursor = this._oldCursor;

    L.DomEvent
      .off(document, 'keydown', this._onKeyDown, this)
      .off(this._map, 'mousemove', this._mouseMove, this)
      .off(this._map, 'click', this._mouseClick, this)
      .off(this._map, 'dblclick', this._mouseClick, this);

    if (this._doubleClickZoom) {
      this._map.doubleClickZoom.enable();
    }

    if (this._layerPaint) {
      this._layerPaint.clearLayers();
    }
    
    this._restartPath();
  },
  _toggleMeasure: function () {
    this._measuring = !this._measuring;

    if (this._measuring) {
      L.DomUtil.addClass(this._button, 'pressed');
      this._startMeasuring();
    } else {
      L.DomUtil.removeClass(this._button, 'pressed');
      this._stopMeasuring();
    }
  },
  _toMiles: function(meters) {
    return (meters * 0.000621371).toFixed(2);
  },
  _updateTooltipDistance: function(total, difference) {
    var differenceMiles = this._toMiles(difference),
      totalMiles = this._toMiles(total),
      text = '<div class="leaflet-measure-tooltip-total">' + totalMiles + ' mi</div>';

    if (differenceMiles > 0 && totalMiles !== differenceMiles) {
      text += '<div class="leaflet-measure-tooltip-difference">(+' + differenceMiles + ' mi)</div>';
    }

    this._tooltip._icon.innerHTML = text;
  },
  _updateTooltipPosition: function(position) {
    this._tooltip.setLatLng(position);
  }
});

L.Map.mergeOptions({
  measureControl: false
});
L.Map.addInitHook(function() {
  if (this.options.measureControl) {
    var options = {};

    if (typeof this.options.measureControl === 'object') {
      options = this.options.measureControl;
    }

    this.measureControl = L.npmap.control.measure(options).addTo(this);
  }
});

module.exports = function(options) {
  return new MeasureControl(options);
};
