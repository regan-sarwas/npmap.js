/* global L */
/* jshint camelcase: false */

// get area measurement
// if don't draw circle then dont create tooltip
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
      showMetric: true,
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
    editId,
    editShape,
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
    this._buttonDistance = L.DomUtil.create('button', 'polyline', liDistance);
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
    map.on('click', function() {
      if (editShape) {
        editShape.editing.disable();
        editId = null;
        editShape = null;
      }
    });
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
  _clearLastShape: function() {
    var i;

    if (this._lastCircle) {
      this._drawnGroup.removeLayer(this._lastCircle);
    }
    if (this._drawnGroup && this._drawnGroupPathTemp) {
      this._drawnGroup.removeLayer(this._drawnGroupPathTemp);
    }

    // if (this._activeMode === 'Distance') {
    if (this._tooltip) {
      this._drawnGroup.removeLayer(this._tooltip);
    }
    // }

    // if (this._drawnGroupPath) {
    //   this._drawnGroup.removeLayer(this._drawnGroupPath);
    //   this._drawnGroupPath = null;
    // }

    if (this._currentCircles) {
      for (i = 0; i < this._currentCircles.length; i++) {
        this._drawnGroup.removeLayer(this._currentCircles[i]);
      }
    }

    if (this._currentTooltips.length) {
      for (i = 0; i < this._currentTooltips.length; i++) {
        this._drawnGroup.removeLayer(this._currentTooltips[i]);
      }
    }
    this._drawnGroup.clearLayers();
    this._currentTooltips.clearLayers();
    this._currentCircles.clearLayers();

    this._resetPath();
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
  },
  _startMeasuring: function(type){
    var clickFn = (type === 'polygon' ? this._mouseClickArea : this._mouseClickDistance),
    map = this._map;

    // this._currentCircles = this._currentTooltips = [];

    // if(!this._drawnGroup) {
    //   this._drawnGroup = L.drawnGroup().addTo(map);
    // }

    // if(!this._points) {
    //   this._points = [];
    // }
    if (typeof this._doubleClickZoom === 'undefined' || this._doubleClickZoom === null) {
      this._doubleClickZoom = map.doubleClickZoom.enabled();
    }

    map.doubleClickZoom.disable();

    L.DomEvent
      // .on(document, 'keydown', this._onKeyDown, this)
      .on(map, 'click', clickFn, this);
  },
  _mouseClickArea: function (e) {
    if (this._activeMode.button.innerHTML === 'Area'){
      console.log('Area');
      var latLng = e.latlng;

      if (!latLng) {
        return;
      }

      if (this._tooltip) {
        var latLngs = this._drawnGroup.getLatLngs();
        this._area = L.GeometryUtil.geodesicArea(latLngs);
        this._createTooltip(latLng);
        this._updateTooltipPosition(latLng);
        this._updateTooltipArea(this._area);
      }
    
      this._createTooltip(latLng);
      this._lastPoint = latLng;
    }
  },
  // _onKeyDown: function (e) {
  //   if(e.keyCode === 27) {
  //     if(!this._lastPoint) {
  //       this._toggleMeasure();
  //     }
  //   }
  // },
  _mouseClickDistance: function(e) {
    if (this._activeMode.button.innerHTML === 'Distance'){
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
      
      // if (this._lastPoint && !this._drawnGroupPath) {
      //   this._drawnGroupPath = new L.polyline([this._lastPoint], {
      //     color: 'red',
      //     weight: 2,
      //     clickable: false
      //   }).addTo(this._drawnGroup);
      // }

      // if (this._drawnGroupPath) {
      //   this._drawnGroupPath.addLatLng(latLng);
      // }

      // if (this._lastCircle) {
      //   this._drawnGroup.removeLayer(this._lastCircle);
      // }

      // this._lastCircle = new L.CircleMarker(latLng, {
      //   clickable: false,
      //   color: 'red',
      //   fill: true,
      //   fillOpacity: 1,
      //   opacity: 1,
      //   radius: 2,
      //   weight: 2
      // }).addTo(this._drawnGroup);
      
      // this._lastCircle.on('click', function() { this._finishPath(); }, this);
      this._lastPoint = latLng;
    }
  },
  _resetPath: function() {
    this._drawnGroupPath = null;
    this._currentCircles = this._currentTooltips = [];
    this._lastCircle = undefined;
    this._lastPoint = this._drawnGroupPath = this._tooltip = undefined;

    // if ( === 'Distance'){
    if (this._doubleClickZoom) {
      this._map.doubleClickZoom.enable();
    }
    // }

    // console.log(this._activeMode.button.innerHTML);
    // if (this._activeMode.button.innerHTML === 'Area'){
    //   this._area = 0;
    // } else {
    //   this._distance = 0;
    // }
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
  _toggleMeasure: function() {
    var map = this._map;

    if (L.DomUtil.hasClass(this._button, 'pressed')) {
      L.DomUtil.removeClass(this._button, 'pressed');
      this._menu.style.display = 'none';
      // map._container.style.cursor = '';
      // map._controllingCursor = map._controllingInteractivity = true;
      this._clearLastShape();

      if (this._doubleClickZoom) {
        map.doubleClickZoom.enable();
      }

      this._doubleClickZoom = null;
    } else {
      L.DomUtil.addClass(this._button, 'pressed');
      this._menu.style.display = 'block';

      L.DomEvent
        // .on(document, 'keydown', this._onKeyDown, this)
        .on(map, 'click', this._startMeasuring, this);
    }
  },
  _updateTooltipArea: function(total) {
    debugger;
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
