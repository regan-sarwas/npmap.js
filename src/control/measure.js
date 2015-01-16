/* global L */
/* jshint camelcase: false */

'use strict';

require('leaflet-draw');

var MeasureControl = L.Control.extend({
  includes: L.Mixin.Events,
  options: {
    position: 'topleft'
  },
  onAdd: function() {
    var liArea, liDistance;

    this._container = L.DomUtil.create('div', 'npmap-control-measure leaflet-bar leaflet-control');
    this._button = L.DomUtil.create('button', 'leaflet-bar-single', this._container);
    this._button.setAttribute('alt', 'Measure distance or calculate area');
    this._menu = L.DomUtil.create('ul', '', this._container);
    liDistance = L.DomUtil.create('li', '', this._menu);
    liArea = L.DomUtil.create('li', '', this._menu);
    this._buttonArea = L.DomUtil.create('button', '', liArea);
    this._buttonArea.innerHTML = 'Area';
    this._buttonArea.setAttribute('alt', 'Calculate area');
    this._buttonDistance = L.DomUtil.create('button', 'pressed', liDistance);
    this._buttonDistance.innerHTML = 'Distance';
    this._buttonDistance.setAttribute('alt', 'Measure distance');
    this._activeMode = 'distance';

    L.DomEvent
      .disableClickPropagation(this._button)
      .disableClickPropagation(this._menu)
      .on(this._button, 'click', this._toggleMeasure, this)
      .on(this._buttonArea, 'click', this._buttonAreaClick, this)
      .on(this._buttonDistance, 'click', this._buttonDistanceClick, this);

    return this._container;
  },
  _activateMode: function(mode) {
    this._activeMode = mode;

    if (mode === 'area') {
      this._stopMeasuringDistance();
      this._startMeasuring('area');
    } else {
      this._stopMeasuringArea();
      this._startMeasuring('distance');
    }
  },
  _buttonAreaClick: function() {
    this._buttonClick(this._buttonArea);
  },
  _buttonClick: function(button) {
    if (L.DomUtil.hasClass(button, 'pressed')) {
      this._map._controllingInteractivity = true;
    } else {
      var add = this._buttonArea,
        mode = button.innerHTML.toLowerCase(),
        remove = this._buttonDistance;

      if (mode === 'distance') {
        add = this._buttonDistance;
        remove = this._buttonArea;
      }

      L.DomUtil.removeClass(remove, 'pressed');
      L.DomUtil.addClass(add, 'pressed');
      this._activateMode(mode);
      this._map._controllingInteractivity = false;
    }
  },
  _buttonDistanceClick: function() {
    this._buttonClick(this._buttonDistance);
  },
  _clearLastShape: function() {
    var i;

    if (this._layerGroupPath) {
      this._layerGroup.removeLayer(this._layerGroupPath);
      this._layerGroupPath = null;
    }

    if (this._currentCircles.length) {
      for (i = 0; i < this._currentCircles.length; i++) {
        this._layerGroup.removeLayer(this._currentCircles[i]);
      }
    }

    if (this._currentTooltips.length) {
      for (i = 0; i < this._currentTooltips.length; i++) {
        this._layerGroup.removeLayer(this._currentTooltips[i]);
      }
    }

    this._resetArea();
    this._resetDistance();
  },
  _createTooltip: function(latLng) {
    return new L.Marker(latLng, {
      clickable: false,
      icon: L.divIcon({
        className: 'leaflet-measure-tooltip',
        iconAnchor: [
          -5,
          -5
        ]
      })
    }).addTo(this._layerGroup);
  },
  _finishPathArea: function() {
    this._resetArea();
  },
  _finishPathDistance: function() {
    if (this._tooltip) {
      this._layerGroup.removeLayer(this._tooltip);
    }

    this._resetDistance();
  },
  _keyDown: function(e) {
    if (e.keyCode === 27) {
      this._toggleMeasure();
    }
  },
  _mouseClickArea: function(e) {
    var latLng = e.latlng,
      circle;

    if (!latLng) {
      return;
    }

    if (this._layerGroupPath) {
      this._layerGroupPath.addLatLng(latLng);
    } else {
      this._layerGroupPath = new L.Polygon([latLng], {
        clickable: false,
        color: 'red',
        fillColor: 'red',
        weight: 2
      }).addTo(this._layerGroup);
    }

    circle = new L.CircleMarker(latLng, {
      clickable: false,
      color: 'red',
      fill: true,
      fillOpacity: 1,
      opacity: 1,
      radius: 2,
      weight: 1
    }).addTo(this._layerGroup);
    this._currentCircles.push(circle);
    this._lastPointArea = latLng;

    if (this._currentCircles.length > 2) {
      this._area = L.GeometryUtil.geodesicArea(this._layerGroupPath.getLatLngs());

      if (!this._tooltip) {
        this._tooltip = this._createTooltip(latLng);
      }

      this._updateTooltipPosition(latLng);
      this._updateTooltipArea(this._area);
    }
  },
  _mouseClickDistance: function(e) {
    var latLng = e.latlng,
      circle;

    if (!latLng) {
      return;
    }

    if (this._lastPointDistance) {
      var distance;

      this._tooltip = this._createTooltip(latLng);
      this._currentTooltips.push(this._tooltip);

      if (!this._distance) {
        this._distance = 0;
      }

      this._updateTooltipPosition(latLng);
      distance = e.latlng.distanceTo(this._lastPointDistance);
      this._updateTooltipDistance(this._distance + distance, distance);
      this._distance += distance;

      if (!this._layerGroupPath) {
        this._layerGroupPath = new L.Polyline([this._lastPointDistance], {
          clickable: false,
          color: 'red',
          weight: 2
        }).addTo(this._layerGroup);
      }
    }

    if (this._layerGroupPath) {
      this._layerGroupPath.addLatLng(latLng);
    }

    circle = new L.CircleMarker(latLng, {
      clickable: false,
      color: 'red',
      fill: true,
      fillOpacity: 1,
      opacity: 1,
      radius: 2,
      weight: 1
    }).addTo(this._layerGroup);
    this._currentCircles.push(circle);
    this._lastPointDistance = latLng;
  },
  _resetArea: function() {
    this._area = 0;
    this._currentCircles = this._currentTooltips = [];
    this._lastPointArea = this._layerGroupPath = this._tooltip = undefined;
  },
  _resetDistance: function() {
    this._currentCircles = this._currentTooltips = [];
    this._distance = 0;
    this._lastPointDistance = this._layerGroupPath = this._tooltip = undefined;
  },
  _startMeasuring: function(type) {
    var clickFn = (type === 'area' ? this._mouseClickArea : this._mouseClickDistance),
      dblClickFn = (type === 'area' ? this._finishPathArea : this._finishPathDistance),
      map = this._map;

    if (typeof this._doubleClickZoom === 'undefined' || this._doubleClickZoom === null) {
      this._doubleClickZoom = map.doubleClickZoom.enabled();
    }

    map.doubleClickZoom.disable();
    L.DomEvent
      .on(document, 'keydown', this._keyDown, this)
      .on(map, 'click', clickFn, this)
      .on(map, 'dblclick', dblClickFn, this);

    this._currentCircles = this._currentTooltips = [];

    if (!this._layerGroup) {
      this._layerGroup = new L.LayerGroup().addTo(map);
    }
  },
  _stopMeasuringArea: function() {
    var map = this._map;

    L.DomEvent
      .off(document, 'keydown', this._keyDown, this)
      .off(map, 'click', this._mouseClickArea, this)
      .off(map, 'dblclick', this._finishPathArea, this);
    this._clearLastShape();
  },
  _stopMeasuringDistance: function() {
    var map = this._map;

    L.DomEvent
      .off(document, 'keydown', this._keyDown, this)
      .off(map, 'click', this._mouseClickDistance, this)
      .off(map, 'dblclick', this._finishPathDistance, this);
    this._clearLastShape();
  },
  _toggleMeasure: function() {
    var map = this._map;

    if (L.DomUtil.hasClass(this._button, 'pressed')) {
      L.DomUtil.removeClass(this._button, 'pressed');
      map._container.style.cursor = '';
      map._controllingCursor = map._controllingInteractivity = true;
      this._menu.style.display = 'none';

      if (this._activeMode === 'area') {
        this._stopMeasuringArea();
      } else {
        this._stopMeasuringDistance();
      }

      this._layerGroup.clearLayers();
      this._layerGroupPath = null;

      if (this._doubleClickZoom) {
        map.doubleClickZoom.enable();
      }

      this._doubleClickZoom = null;
    } else {
      L.DomUtil.addClass(this._button, 'pressed');
      map._container.style.cursor = 'crosshair';
      map._controllingCursor = false;
      map._controllingInteractivity = false;
      this._menu.style.display = 'block';
      this._startMeasuring(this._activeMode);
    }
  },
  _toAcres: function(meters) {
    return (meters / 4046.86).toFixed(2);
  },
  _toMiles: function(meters) {
    return (meters * 0.000621371).toFixed(2);
  },
  _updateTooltipArea: function(total) {
    this._tooltip._icon.innerHTML = '<div class="leaflet-measure-tooltip-total">' + this._toAcres(total) + ' acres</div>';
  },
  _updateTooltipDistance: function(total, difference) {
    var differenceMiles = this._toMiles(difference),
      totalMiles = this._toMiles(total),
      text = '<div class="leaflet-measure-tooltip-total">' + totalMiles + ' mi</div>';

    if ((differenceMiles > 0) && (totalMiles !== differenceMiles)) {
      text += '<div class="leaflet-measure-tooltip-difference">(+' + differenceMiles + ' mi)</div>';
    }

    this._tooltip._icon.innerHTML = text;
  },
  _updateTooltipPosition: function(latLng) {
    this._tooltip.setLatLng(latLng);
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
