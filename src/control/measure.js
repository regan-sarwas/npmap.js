/* global L */
/* jshint camelcase: false */

'use strict';

L.Polyline.include({
  intersects: function () {
    debugger;
    var points = this._layerGroupPath,
      len = points ? points.length : 0,
      i, p, p1;

    if (this._tooFewPointsForIntersection()) {
      return false;
    }

    for (i = len - 1; i >= 3; i--) {
      p = points[i - 1];
      p1 = points[i];


      if (this._lineSegmentsIntersectsRange(p, p1, i - 2)) {
        return true;
      }
    }

    return false;
  },

  // Check for intersection if new latlng was added to this polyline.
  // NOTE: does not support detecting intersection for degenerate cases.
  newLatLngIntersects: function (latLng, skipFirst) {
    // Cannot check a polyline for intersecting lats/lngs when not added to the map
    if (!this._map) {
      return false;
    }

    return this.newPointIntersects(this._map.latLngToLayerPoint(latLng), skipFirst);
  },

  // Check for intersection if new point was added to this polyline.
  // newPoint must be a layer point.
  // NOTE: does not support detecting intersection for degenerate cases.
  newPointIntersects: function (newPoint, skipFirst) {
    var points = this._layerGroupPath,
      len = points ? points.length : 0,
      lastPoint = points ? points[len - 1] : null,
      // The previous previous line segment. Previous line segment doesn't need testing.
      maxIndex = len - 2;

    if (this._tooFewPointsForIntersection(1)) {
      return false;
    }

    return this._lineSegmentsIntersectsRange(lastPoint, newPoint, maxIndex, skipFirst ? 1 : 0);
  },

  // Polylines with 2 sides can only intersect in cases where points are collinear (we don't support detecting these).
  // Cannot have intersection when < 3 line segments (< 4 points)
  _tooFewPointsForIntersection: function (extraPoints) {
    var points = this._layerGroupPath,
      len = points ? points.length : 0;
    // Increment length by extraPoints if present
    len += extraPoints || 0;

    return !this._layerGroupPath || len <= 3;
  },

  // Checks a line segment intersections with any line segments before its predecessor.
  // Don't need to check the predecessor as will never intersect.
  _lineSegmentsIntersectsRange: function (p, p1, maxIndex, minIndex) {
    var points = this._layerGroupPath,
      p2, p3;

    minIndex = minIndex || 0;

    // Check all previous line segments (beside the immediately previous) for intersections
    for (var j = maxIndex; j > minIndex; j--) {
      p2 = points[j - 1];
      p3 = points[j];

      if (L.LineUtil.segmentsIntersect(p, p1, p2, p3)) {
        return true;
      }
    }

    return false;
  }
});

L.Polygon.include({
  // Checks a polygon for any intersecting line segments. Ignores holes.
  intersects: function () {
    debugger;
    var polylineIntersects,
      points = this._layerGroupPath,
      len, firstPoint, lastPoint, maxIndex;

    if (this._tooFewPointsForIntersection()) {
      return false;
    }

    polylineIntersects = L.Polyline.prototype.intersects.call(this);

    // If already found an intersection don't need to check for any more.
    if (polylineIntersects) {
      return true;
    }

    len = points.length;
    firstPoint = points[0];
    lastPoint = points[len - 1];
    maxIndex = len - 2;

    // Check the line segment between last and first point. Don't need to check the first line segment (minIndex = 1)
    return this._lineSegmentsIntersectsRange(lastPoint, firstPoint, maxIndex, 1);
  }
});

var MeasureControl = L.Control.extend({
  includes: L.Mixin.Events,
  options: {
    allowIntersection: false,
    drawError: {
      color: 'orange',
      timeout: 1000
    },
    position: 'topleft'
  },
  onAdd: function() {
    var liArea, liDistance, liSelect;

    this._container = L.DomUtil.create('div', 'npmap-control-measure leaflet-bar leaflet-control');
    this._button = L.DomUtil.create('button', 'leaflet-bar-single', this._container);
    this._button.title = 'Measure distance or calculate area';

    this._menu = L.DomUtil.create('ul', '', this._container);

    liDistance = L.DomUtil.create('li', '', this._menu);
    liArea = L.DomUtil.create('li', '', this._menu);
    liSelect = L.DomUtil.create('li', '', this._menu);

    this._buttonArea = L.DomUtil.create('button', 'polygon', liArea);
    this._buttonArea.innerHTML = 'Area';
    this._buttonDistance = L.DomUtil.create('button', 'pressed polyline', liDistance);
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
      .on(this._button, 'dblclick', L.DomEvent.preventDefault)
      .on(this._buttonArea, 'click', this._buttonAreaClick, this)
      .on(this._buttonDistance, 'click', this._buttonDistanceClick, this)

      .on(this._menu, 'click', L.DomEvent.stopPropagation)
      .on(this._menu, 'click', L.DomEvent.preventDefault)
      .on(this._menu, 'dblclick', L.DomEvent.stopPropagation);

    return this._container;
  },
  _activateMode: function(mode) {
    this._activeMode = mode;
    this._resetPath();

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
    this._resetPath();
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
    if (this._lastCircle) {
      this._layerGroup.removeLayer(this._lastCircle);
    }
    if (this._layerGroup && this._layerGroupPathTemp) {
      this._layerGroup.removeLayer(this._layerGroupPathTemp);
    }

    if (this._activeMode === 'distance') {
      if (this._tooltip) {
        this._layerGroup.removeLayer(this._tooltip);
      }
    }
    this._resetPath();
  },
  _onKeyDown: function (e) {
    if(e.keyCode === 27) {
      if(!this._lastPoint) {
        this._toggleMeasure();
      }
    }
  },
  _mouseMove: function(e) {
    var latLng = e.latlng;

    if (!latLng || !this._lastPoint) {
      return;
    }

    if (!this._layerGroupPathTemp) {
      this._layerGroupTemp = L.layerGroup().addTo(this._map);
      this._layerGroupPathTemp = new L.polyline([this._lastPoint, latLng], {
        clickable: false,
        color: 'red',
        weight: 1.5,
        dashArray: '6,3'
      }).addTo(this._layerGroupTemp);
      if (this._activeMode === 'area') {
        this._layerGroupPathTemp.addLatLng(latLng);
      }
    } else {
      this._layerGroupPathTemp.spliceLatLngs(0, 2, this._lastPoint, latLng);
    }

    if(this._tooltip) {
      var distance = latLng.distanceTo(this._lastPoint),
      area = L.GeometryUtil.geodesicArea(this._layerGroupPathTemp.getLatLngs());

      if (!this._distance) {
        this._distance = 0;
      }

      this._updateTooltipPosition(latLng);
      if (this._activeMode === 'distance') {
        this._updateTooltipDistance(this._distance + distance, distance);
      } else {
        this._updateTooltipArea(this._area + area);
      }
    }
  },
  _mouseClickArea: function (e) {
    var latLng = e.latlng,
      circle,
      markersLength = this._currentCircles.length;

    if (!latLng) {
      return;
    }
    if (this._layerGroupPath) {
      var intersects = this._layerGroupPath.newLatLngIntersects(latLng);
      if (markersLength > 2 && intersects){
        this._tooltip._icon.innerHTML = '<p style="color:red">Error: Lines cannot cross!</p>';
        return;
      } else {
        this._layerGroupPath.addLatLng(latLng);
      }
    } else {
      this._layerGroupPath = new L.Polygon([latLng], {
        clickable: false,
        color: 'red',
        fillColor: 'red',
        weight: 2,
      }).addTo(this._layerGroup);
    }

    circle = new L.CircleMarker(latLng, {
      clickable: false,
      color: 'red',
      fill: true,
      fillOpacity: 1,
      opacity: 1,
      radius: 2,
      weight: 2
    }).addTo(this._layerGroup);
    this._currentCircles.push(circle);
    this._lastPoint = latLng;

    if (this._currentCircles.length > 2) {
      var latLngs = this._layerGroupPath.getLatLngs();
      this._area = L.GeometryUtil.geodesicArea(latLngs);
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
      weight: 2
    }).addTo(this._layerGroup);
  
    this._lastCircle.on('click', function() {
      this._finishPath();
    }, this);
    
    this._lastPoint = latLng;
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
        this._layerGroupPath = new L.polyline([this._lastPoint], {
          color: 'red',
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
        weight: 2
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
      .off(map, 'click', clickFn, this)
      .off(map, 'dblclick', this._finishPath, this);

    if (this._activeMode === 'distance'){
      if (this._doubleClickZoom) {
        this._map.doubleClickZoom.enable();
      }
    }

    if (this._layerGroup) {
      this._layerGroup.clearLayers();
    }
    this._resetPath();
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
    var totalArea = this._calculateArea(total);

    this._tooltip._icon.innerHTML = '<div class="leaflet-measure-tooltip-total">' + totalArea + '</div>';
  },
  _updateTooltipDistance: function(total, difference) {
    var totalDistance = this._calculateDistance(total),
      differenceDistance = this._calculateDistance(difference);

    var text = '<div class="leaflet-measure-tooltip-total">' + totalDistance + '</div>';
    if (differenceDistance !== totalDistance && difference !== 0) {
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