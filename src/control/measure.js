/* global L */
/* jshint camelcase: false */

'use strict';

require('leaflet-draw');

var MeasureControl = L.Control.extend({
  includes: L.Mixin.Events,
  options: {
    position: 'topleft'
  },
  onAdd: function () {
    var liArea, liDistance, liSelect;

    this._container = L.DomUtil.create('div', 'npmap-control-measure leaflet-bar leaflet-control');
    this._button = L.DomUtil.create('button', 'leaflet-bar-single', this._container);
    this._button.title = 'Measure distance or calculate area';

    this._menu = L.DomUtil.create('ul', '', this._container);

    liDistance = L.DomUtil.create('li', '', this._menu);
    liArea = L.DomUtil.create('li', '', this._menu);
    liSelect = L.DomUtil.create('li', '', this._menu);

    this._buttonArea = L.DomUtil.create('button', '', liArea);
    this._buttonArea.innerHTML = 'Area';
    this._buttonDistance = L.DomUtil.create('button', 'pressed', liDistance);
    this._buttonDistance.innerHTML = 'Distance';
    this._selectUnit = L.DomUtil.create('select','', liSelect);
    this._selectUnit.innerHTML =  '<option value="Feet" class="distance" selected>Feet</option><option value="Meters" class="distance">Meters</option>'+
    '<option value="Miles" class="distance">Miles</option>';

    this._activeMode = 'distance';

    L.DomEvent
      .on(this._button, 'click', L.DomEvent.stopPropagation)
      .on(this._button, 'click', L.DomEvent.preventDefault)
      .on(this._button, 'click', this._toggleMeasure, this)
      .on(this._button, 'dblclick', L.DomEvent.stopPropagation)

      .on(this._buttonArea, 'click', this._buttonAreaClick, this)
      .on(this._buttonDistance, 'click', this._buttonDistanceClick, this)

      .on(this._menu, 'click', L.DomEvent.stopPropagation)
      .on(this._menu, 'click', L.DomEvent.preventDefault)
      .on(this._menu, 'dblclick', L.DomEvent.stopPropagation);

    return this._container;
  },
  _activateMode: function(mode) {
    this._activeMode = mode;
    this._stopMeasuring();

    if (mode === 'area') {
      this._startMeasuring('area');
    } else {
      this._startMeasuring('distance');
    }
  },
  _buttonAreaClick: function() {
    this._buttonClick(this._buttonArea);
    this._selectUnit.innerHTML = '<option value="Acres" class="area">Acres</option>' +
    '<option value="Hectares" class="area">Hectares</option>';
  },
  _buttonClick: function(button) {
    if (!L.DomUtil.hasClass(button, 'pressed')) {
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
    }
    this._clearLastShape();
  },
  _buttonDistanceClick: function() {
    this._buttonClick(this._buttonDistance);
    this._selectUnit.innerHTML = '<option value="Feet" class="distance" selected>Feet</option><option value="Meters" class="distance">Meters</option>'+
   '<option value="Miles" class="distance">Miles</option>';
  },
  _calculateArea: function(val) {
    var options = this._selectUnit.options,
    unit = '';

    for (var i=0; i < options.length; i++){
      var option = options[options.selectedIndex].value;
      
      if (option === 'Hectares'){
        var hectares = (val / 10000).toFixed(2).toLocaleString();
        unit = ' ha';
        return hectares + unit;
      } else {
        var acres = (val / 4046.86).toFixed(2).toLocaleString();
        unit = ' acres';
        return acres + unit;
      }
    }
  },
  _calculateDistance: function(val) {
    var options = this._selectUnit.options,
    unit = '';
    for (var i=0; i < options.length; i++){
      var option = options[options.selectedIndex].value;
      if ( option === 'Miles'){
        var miles = (val * 0.000621371).toFixed(2).toLocaleString();
        unit = ' mi';
        return miles + unit;
      } else if (option === 'Feet') {
        var feet = (val * 3.28084).toFixed(2).toLocaleString();
        unit = ' ft';
        return feet + unit;
      } else {
        unit = ' meters';
        return val.toFixed(2) + unit;
      }
    }
  },
  _createTooltip: function(position) {
    var icon = L.divIcon({
      className: 'leaflet-measure-tooltip',
      iconAnchor: [-5, -5]
    });
    this._tooltip = L.marker(position, {
      icon: icon,
      clickable: false
    }).addTo(this._layerGroup);
  },
  _clearLastShape: function() {
    var i;

    if (this._layerGroupPath) {
      this._layerGroup.removeLayer(this._layerGroupPath);
      this._layerGroupPath = null;
    }

    if (this._currentCircles) {
      for (i = 0; i < this._currentCircles.length; i++) {
        this._layerGroup.removeLayer(this._currentCircles[i]);
      }
    }

    if (this._currentTooltips.length) {
      for (i = 0; i < this._currentTooltips.length; i++) {
        this._layerGroup.removeLayer(this._currentTooltips[i]);
      }
    }

    this._resetPath();
  },
  _finishPath: function() {
    if (this._activeMode === 'distance') {
      if (this._tooltip) {
        this._layerGroup.removeLayer(this._tooltip);
      }
    }
    if (this._lastCircle) {
      this._layerGroup.removeLayer(this._lastCircle);
    }
    if(this._layerGroup && this._layerGroupPathTemp) {
      this._layerGroup.removeLayer(this._layerGroupPathTemp);
    }

    this._resetPath();
  },
  _onKeyDown: function (e) {
    if(e.keyCode === 27) {
      // If not in path exit measuring mode, else just finish path
      if(!this._lastPoint) {
        this._toggleMeasure();
      } else {
        this._finishPath();
      }
    }
  },
  _mouseMove: function(e) {
    var latLng = e.latlng;

    if (!latLng || !this._lastPoint) {
      return;
    }
    
    if (!this._layerGroupPathTemp) {
      this._layerGroupPathTemp = L.polyline([this._lastPoint, latLng], {
        clickable: false,
        color: 'red',
        fillColor: 'red',
        weight: 2
      }).addTo(this._layerGroup);
    } else {
      this._layerGroupPathTemp.spliceLatLngs(0, 2, this._lastPoint, latLng);
    }

    if(this._tooltip) {
      var distance = latLng.distanceTo(this._lastPoint),
      area = L.GeometryUtil.geodesicArea(this._layerGroupPathTemp.getLatLngs());

      if(!this._distance) {
        this._distance = 0;
      }
      if(!this._area) {
        this._area = 0;
      }

      this._updateTooltipPosition(latLng);
      if (this._activeMode === 'distance') {
        this._updateTooltipDistance(this._distance + distance, distance);
      } else {
        // this._layerGroupPathTemp.addLatLng(latLng);
        // this._layerGroupPathTemp.spliceLatLngs(0, 2, this._lastPoint, latLng);
        this._updateTooltipArea(this._area + area);
      }
    }
  },
  _mouseClickArea: function(e){
    if (this._activeMode === 'area'){
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
      this._lastPoint = latLng;

      if (this._currentCircles.length > 2) {
        this._area = L.GeometryUtil.geodesicArea(this._layerGroupPath.getLatLngs());
        this._createTooltip(latLng);
        this._updateTooltipPosition(latLng);
        this._updateTooltipArea(this._area);
      }

      if (this._layerGroupPath) {
        this._layerGroupPath.addLatLng(latLng);
      }

      if (this._lastCircle) {
        this._layerGroup.removeLayer(this._lastCircle);
      }

      this._lastCircle = new L.CircleMarker(latLng, {
        clickable: false,
        color: 'red',
        fill: true,
        fillOpacity: 1,
        opacity: 1,
        radius: 2,
        weight: 1
      }).addTo(this._layerGroup);
      
      this._lastCircle.on('click', function() { this._finishPath(); }, this);
      this._lastPoint = latLng;
    }
  },
  _mouseClickDistance: function(e) {
    if (this._activeMode === 'distance'){
      var latLng = e.latlng;

      if (!latLng) {
        return;
      }

      if(this._lastPoint && this._tooltip) {
        var distance = latLng.distanceTo(this._lastPoint);
        if(!this._distance) {
          this._distance = 0;
        }
        this._updateTooltipPosition(latLng);
        this._updateTooltipDistance(this._distance + distance, distance);
        this._distance += distance;
      }
      this._createTooltip(latLng);
      
      if (this._lastPoint && !this._layerGroupPath) {
        this._layerGroupPath = L.polyline([this._lastPoint], {
          color: 'black',
          weight: 2,
          clickable: false
        }).addTo(this._layerGroup);
      }

      if (this._layerGroupPath) {
        this._layerGroupPath.addLatLng(latLng);
      }

      if (this._lastCircle) {
        this._layerGroup.removeLayer(this._lastCircle);
      }

      this._lastCircle = new L.CircleMarker(latLng, {
        clickable: false,
        color: 'red',
        fill: true,
        fillOpacity: 1,
        opacity: 1,
        radius: 2,
        weight: 1
      }).addTo(this._layerGroup);
      
      this._lastCircle.on('click', function() { this._finishPath(); }, this);
      this._lastPoint = latLng;
    }
  },
  _resetPath: function() {
    this._currentCircles = this._currentTooltips = [];
    this._lastCircle = undefined;
    this._layerGroupPathTemp = undefined;
    this._lastPoint = this._layerGroupPath = this._tooltip = undefined;

    if (this._activeMode === 'area'){
      this._area = 0;
    } else {
      this._distance = 0;
    }
  },
  _startMeasuring: function(type){
    var clickFn = (type === 'area' ? this._mouseClickArea : this._mouseClickDistance),
    map = this._map;

    if (typeof this._doubleClickZoom === 'undefined' || this._doubleClickZoom === null) {
      this._doubleClickZoom = map.doubleClickZoom.enabled();
    }

    map.doubleClickZoom.disable();

    L.DomEvent
      .on(document, 'keydown', this._onKeyDown, this)
      .on(map, 'mousemove', this._mouseMove, this)
      .on(map, 'click', clickFn, this)
      .on(map, 'dblclick', this._finishPath, this);
    this._currentCircles = this._currentTooltips = [];

    if(!this._layerGroup) {
      this._layerGroup = L.layerGroup().addTo(map);
    }

    if(!this._points) {
      this._points = [];
    }
  },
  _stopMeasuring: function() {
    var map = this._map;

    L.DomEvent
      .off(document, 'keydown', this._onKeyDown, this)
      .off(map, 'mousemove', this._mouseMove, this)
      .off(map, 'click', this._toggleMeasure, this)
      .off(map, 'dblclick', this._finishPath, this);

    if (this._activeMode === 'distance'){
      if (this._doubleClickZoom) {
        this._map.doubleClickZoom.enable();
      }
    }

    if (this._layerGroup) {
      this._layerGroup.clearLayers();
    }
    
    this._clearLastShape();
  },
  _toggleMeasure: function () {
    var map = this._map;

    if (L.DomUtil.hasClass(this._button, 'pressed')) {
      L.DomUtil.removeClass(this._button, 'pressed');
      map._container.style.cursor = '';
      map._controllingCursor = map._controllingInteractivity = true;
      this._menu.style.display = 'none';

      if (this._activeMode === 'area') {
        this._stopMeasuring('area');
      } else {
        this._stopMeasuring('distance');
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
  _updateTooltipArea: function(total) {
    this._tooltip._icon.innerHTML = '<div class="leaflet-measure-tooltip-total">' + this._calculateArea(total) + '</div>';
  },
  _updateTooltipDistance: function(total, difference) {
    var totalDistance = this._calculateDistance(total),
      differenceDistance = this._calculateDistance(difference);

    var text = '<div class="leaflet-measure-tooltip-total">' + totalDistance + '</div>';
    if (differenceDistance > 0 && totalDistance !== differenceDistance) {
      text += '<div class="leaflet-measure-tooltip-difference">(+' + differenceDistance + ')</div>';
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
