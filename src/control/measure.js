/* global L */
/* jshint camelcase: false */

// remove tooltip if intersecting lines
'use strict';

require('leaflet-draw');

var MeasureControl = L.Control.extend({
  includes: L.Mixin.Events,
  options: {
    polygon: {
      allowIntersection: false,
      drawError: {
        color: '#f06eaa',
        timeout: 1000,
        message: '<strong>Oh snap!<strong> you can\'t draw that!'
      },
      shapeOptions: {
        color: 'rgb(255, 0, 0)',
        weight: 2,
      },
      repeatMode: true
    },
    polyline: {
      shapeOptions: {
        color: 'rgb(255, 0, 0)',
        weight: 2,
      },
      repeatMode: true
    },
    position:'topleft'
  },
  initialize: function(map, options) {
    L.Util.setOptions(this, options);
    this._activeMode = null;
    this._drawnGroup = new L.FeatureGroup();
    this._modes = {};

    return this;
  },
  onAdd: function(map) {
    var  container = L.DomUtil.create('div', 'npmap-control-measure leaflet-bar leaflet-control'),
    editShape, editId,
    liArea, liDistance, liSelect,
    me = this;

    this._button = L.DomUtil.create('button', 'leaflet-bar-single measure-control', container);
    this._button.title = '';

    this._menu = L.DomUtil.create('ul', '', container);
    liDistance = L.DomUtil.create('li', '', this._menu);
    liArea = L.DomUtil.create('li', '', this._menu);
    liSelect = L.DomUtil.create('li', '', this._menu);

    this._buttonArea = L.DomUtil.create('button', 'polygon', liArea);
    this._buttonArea.innerHTML = 'Area';
    this._buttonDistance = L.DomUtil.create('button', 'pressed polyline', liDistance);
    this._clicked = 'polyline';
    this._buttonDistance.innerHTML = 'Distance';
    
    this._selectUnit = L.DomUtil.create('select','measure-units', liSelect);
    this._selectUnit.id = 'measure-units';
    this._selectUnit.innerHTML =  '<option value="Feet" class="polyline" selected>Feet</option><option value="Meters" class="polyline">Meters</option>'+
    '<option value="Miles" class="polyline">Miles</option>';

    this._initializeMode(this._buttonDistance, new L.Draw.Polyline(map, this.options.polyline));
    this._initializeMode(this._buttonArea, new L.Draw.Polygon(map, this.options.polygon));
    
    L.DomEvent
      .on(this._button, 'click', this._toggleMeasure, this)
      .on(this._button, 'click', L.DomEvent.stopPropagation)
      .on(this._button, 'click', L.DomEvent.preventDefault)
      .on(this._button, 'dblclick', L.DomEvent.stopPropagation)
      .on(this._button, 'dblclick', L.DomEvent.preventDefault)
      .on(this._buttonArea, 'click', this._buttonAreaClick, this)
      .on(this._buttonDistance, 'click', this._buttonDistanceClick, this)

      .on(this._menu, 'click', L.DomEvent.stopPropagation)
      .on(this._menu, 'click', L.DomEvent.preventDefault)
      .on(this._menu, 'dblclick', L.DomEvent.stopPropagation);

    map.addLayer(this._drawnGroup);

    map.on('draw:created', function(e) {
      me._drawnGroup.addLayer(e.layer);
    });
    map.on('draw:drawstart', function() {
      if (editShape) {
        editShape.editing.disable();
        editId = null;
        editShape = null;
      }
    });

    return container;
  },
  _buttonAreaClick: function() {
    this._selectUnit.innerHTML = '<option value="Acres" class="area">Acres</option>' +
    '<option value="Hectares" class="polygon">Hectares</option>';
    this._buttonClick(this._buttonArea);
  },
  _buttonClick: function(button) {
    if (!L.DomUtil.hasClass(button, 'pressed')) {
      var add = this._buttonArea,
        mode = button.className,
        remove = this._buttonDistance;

      if (mode === 'polyline') {
        add = this._buttonDistance;
        remove = this._buttonArea;
      }

      L.DomUtil.removeClass(remove, 'pressed');
      L.DomUtil.addClass(add, 'pressed');
      this._startMeasuring(mode);
      this._clicked = mode;
    }
  },
  _buttonDistanceClick: function() {
    this._selectUnit.innerHTML = '<option value="Feet" class="distance" selected>Feet</option><option value="Meters" class="distance">Meters</option>'+
   '<option value="Miles" class="polyline">Miles</option>';
    this._buttonClick(this._buttonDistance);
  },
  _createTooltip: function(position) {
    var icon = L.divIcon({
      className: 'leaflet-measure-tooltip',
      iconAnchor: [-5, -5]
    });
    this._tooltip = L.marker(position, {
      icon: icon,
      clickable: false
    }).addTo(this._drawnGroup);
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
  _handlerActivated: function(e) {
    if (this._activeMode && this._activeMode.handler.enabled()) {
      this._activeMode.handler.disable();
    }
    this._activeMode = this._modes[e.handler];

    this.fire('enable');
  },
  _handlerDeactivated: function() {
    this._activeMode = null;
    this.fire('disable');

    this._currentCircles = [];
    this._lastCircle = undefined;
    this._layerGroupPathTemp = undefined;
    this._lastPoint = undefined;

    if (this._clicked === 'polygon'){
      this._area = 0;
    } else {
      this._distance = 0;
    }
  },
  _initializeMode: function(button, handler) {
    var type = handler.type,
      me = this;

    this._modes[type] = {};
    this._modes[type].handler = handler;
    this._modes[type].button = this._buttonDistance;

    L.DomEvent.on(button, 'click', function() {
      if (me._activeMode === type) {
        me._modes[type].handler.disable();
      } else {
        me._modes[type].handler.enable();
      }
    }, this._modes[type].handler);

    this._modes[type].handler
      .on('disabled', this._handlerDeactivated, this)
      .on('enabled', this._handlerActivated, this);
  },
  _onKeyDown: function (e) {
    if(e.keyCode === 27) {
      this._toggleMeasure();
    }
  },
  _mouseMove: function(e) {
    var latLng = e.latlng;

    if (!latLng || !this._lastPoint) {
      return;
    }

    if (!this._layerGroupPathTemp) {
      this._layerGroupPathTemp = L.polyline([this._lastPoint, latLng]);

      // if (this._clicked === 'polygon') {
      //   this._layerGroupPathTemp.addLatLng(latLng);
      // }
    } else {
      this._layerGroupPathTemp.spliceLatLngs(0, 2, this._lastPoint, latLng);
    }

    if (this._tooltip) {
      var distance = latLng.distanceTo(this._lastPoint),
      area = L.GeometryUtil.geodesicArea(this._layerGroupPathTemp.getLatLngs());

      if (!this._distance) {
        this._distance = 0;
      }
      if (!this._area) {
        this._area = 0;
      }

      this._updateTooltipPosition(latLng);

      if (this._clicked === 'polyline') {
        this._updateTooltipDistance(this._distance + distance, distance);
      } else {
        this._updateTooltipArea(this._area + area);
      }
    }
  },
  _mouseClickArea: function(e){
    if (this._clicked === 'polygon'){
      var latLng = e.latlng,
      circle;

      if (!latLng){
        return;
      }

      if (this._layerGroupPath){
        this._layerGroupPath.addLatLng(latLng);
      } else {
        this._layerGroupPath = L.polygon([latLng]);
      }

      circle = new L.CircleMarker(latLng);

      this._currentCircles.push(circle);
      this._lastPointArea = latLng;

      if (this._currentCircles.length > 2){
        this._area = L.GeometryUtil.geodesicArea(this._layerGroupPath.getLatLngs());
        this._createTooltip(latLng)
        this._updateTooltipPosition(latLng);
        this._updateTooltipArea(this._area);
      }
    }
  },
  _mouseClickDistance: function(e) {
    if (this._clicked === 'polyline'){
      var latLng = e.latlng;

      if (!latLng) {
        return;
      }

      if (this._lastPoint && this._tooltip) {
        var distance = latLng.distanceTo(this._lastPoint);
        
        if(!this._distance) {
          this._distance = 0;
        }
        this._updateTooltipPosition(latLng);
        this._updateTooltipDistance(this._distance + distance, distance);
        this._distance += distance;
      }
      this._createTooltip(latLng);

      if (this._lastCircle) {
        this._drawnGroup.removeLayer(this._lastCircle);
      }

      this._lastCircle = new L.CircleMarker(latLng);
      this._lastCircle.on('click', function() { this._handlerDeactivated(); }, this);
      this._lastPoint = latLng;
    }
  },
  _startMeasuring: function(type){
    var clickFn = (type === 'polygon' ? this._mouseClickArea : this._mouseClickDistance),
    map = this._map;

    if (typeof this._doubleClickZoom === 'undefined' || this._doubleClickZoom === null) {
      this._doubleClickZoom = map.doubleClickZoom.enabled();
    }
    map.doubleClickZoom.disable();

    if (this._clicked === 'polygon'){
      this._area = 0;
    } else {
      this._distance = 0;
    }

    this._currentCircles = [];
    this._tooltip = undefined;

    L.DomEvent
      .on(document, 'keydown', this._onKeyDown, this)
      .on(map, 'mousemove', this._mouseMove, this)
      .on(map, 'click', clickFn, this)
      .on(map, 'dblclick', this._handlerDeactivated, this);
  },
  _stopMeasuring: function(type) {
    var clickFn = (type === 'polygon' ? this._mouseClickArea : this._mouseClickDistance),
    map = this._map;

    if (this._clicked === 'polyline'){
      if (this._doubleClickZoom) {
        this._map.doubleClickZoom.enable();
      }
    }

    if (this._drawnGroup) {
      this._drawnGroup.clearLayers();
    }

    L.DomEvent
      .off(document, 'keydown', this._onKeyDown, this)
      .off(map, 'mousemove', this._mouseMove, this)
      .off(map, 'click', clickFn, this)
      .off(map, 'dblclick', this._handlerDeactivated, this);
  },
  _toggleMeasure: function() {
    var map = this._map;

    if (L.DomUtil.hasClass(this._button, 'pressed')) {
      L.DomUtil.removeClass(this._button, 'pressed');
      this._menu.style.display = 'none';
      this._activeMode.handler.disable();
      this._stopMeasuring(this._clicked);
      this._drawnGroup.clearLayers();

      if (this._doubleClickZoom) {
        map.doubleClickZoom.enable();
      }

      this._doubleClickZoom = null;
    } else {
      L.DomUtil.addClass(this._button, 'pressed');
      this._menu.style.display = 'block';
      this._buttonDistance.click();
      this._startMeasuring('polyline');
    }
  },
  _updateTooltipArea: function(total) {
    var totalArea = this._calculateArea(total),
      // differenceArea = this._calculateArea(difference),
      text = '<div class="leaflet-measure-tooltip-total">' + totalArea + '</div>';
    
    // if (differenceArea !== totalArea && difference !== 0) {
    //   text += '<div class="leaflet-measure-tooltip-difference">(+' + differenceArea + ')</div>';
    // }

    this._tooltip._icon.innerHTML = text;
  },
  _updateTooltipDistance: function(total, difference) {
    var totalDistance = this._calculateDistance(total),
      differenceDistance = this._calculateDistance(difference),
      text = '<div class="leaflet-measure-tooltip-total">' + totalDistance + '</div>';
    
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
