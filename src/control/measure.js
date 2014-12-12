/* global L */
/* jshint camelcase: false */
'use strict';

// require the leaflet draw library
require('leaflet-draw');

var MeasureControl = L.Control.extend({
  includes: L.Mixin.Events,
  options: {
    polygon: {
      allowIntersection: false,
      icon: new L.DivIcon({
        iconSize: new L.Point(8, 8),
        className: 'leaflet-div-icon leaflet-editing-icon'
      }),
      drawError: {
        color: '#b00b00',
        timeout: 1000,
        message: '<strong>Oh snap!<strong> you can\'t draw that!'
      },
      shapeOptions: {
        color: '#d39800',
        weight: 2,
      },
      showArea: true,
      metric: true
    },
    polyline: {
      shapeOptions: {
        clickable: false,
        weight: 2,
      },
      showLength: true,
      metric:true,
    },
    position:'topleft'
  },
  initialize: function(options) {
    L.Util.setOptions(this, options);
    this._activeMode = null;
    this._drawnItems = new L.FeatureGroup();
    this._modes = {};
    
    return this;
  },
  onAdd: function(map) {
    var  container = L.DomUtil.create('div', 'npmap-control-measure leaflet-bar leaflet-control'),
      editId,
      editShape,
      liArea, liDistance, liSelect,
      me = this;

    this._button = L.DomUtil.create('button', 'leaflet-bar-single', container);
    this._button.title = 'Measure distance or calculate area';

    this._menu = L.DomUtil.create('ul', '', container);

    liDistance = L.DomUtil.create('li', '', this._menu);
    liArea = L.DomUtil.create('li', '', this._menu);
    liSelect = L.DomUtil.create('li', '', this._menu);

    this._buttonArea = L.DomUtil.create('button', 'polygon', liArea);
    this._buttonArea.innerHTML = 'Area';
    this._buttonDistance = L.DomUtil.create('button', 'pressed polyline', liDistance);
    this._buttonDistance.innerHTML = 'Distance';
    this._selectUnit = L.DomUtil.create('select','', liSelect);
    this._selectUnit.innerHTML =  '<option value="Feet" class="polygon" selected>Feet</option><option value="Meters" class="distance">Meters</option>'+
    '<option value="Miles" class="distance">Miles</option>';

    this._initializeMode(this._buttonDistance, new L.Draw.Polyline(map, this.options.polyline));
    this._initializeMode(this._buttonArea, new L.Draw.Polygon(map, this.options.polygon));
    
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

    this._drawnItems.on('click', function(e) {
      var editing = e.layer.editing,
        leafletId;
      if (editing) {
        if (editing._poly) {
          leafletId = editing._poly._leaflet_id;
        } else {
          leafletId = editing._shape._leaflet_id;
        }

        if (editId === leafletId) {
          e.layer.editing.disable();
          editId = null;
          editShape = null;
        } else {
          if (editShape) {
            editShape.editing.disable();
          }
          e.layer.editing.enable();
          editId = leafletId;
          editShape = e.layer;
        }
      } else {
        if (editShape) {
          editShape.editing.disable();
          editId = null;
          editShape = null;
        }
      }
    });
    map.addLayer(this._drawnItems);
    map.on('click', function() {
      if (editShape){
        editShape.editing.disable();
        editId = null;
        editShape = null;
      }
    });
    map.on('draw:created', function(e) {
      me._drawnItems.addLayer(e.layer);
    });
    map.on('draw:drawstart', function() {
      if (editShape){
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
    }
  },
  _buttonDistanceClick: function() {
    this._selectUnit.innerHTML = '<option value="Feet" class="distance" selected>Feet</option><option value="Meters" class="distance">Meters</option>'+
   '<option value="Miles" class="polyline">Miles</option>';
    this._buttonClick(this._buttonDistance);
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
  // _createTooltip: function(position, layer) {
    // L.drawLocal.draw.handlers.polygon.tooltip.cont = position;
    // L.drawLocal.draw.handlers.polygon.tooltip.cont = position;
    // var icon = L.divIcon({
    //   className: 'leaflet-measure-tooltip',
    //   iconAnchor: [-5, -5]
    // });
    // this._tooltip = L.marker(position, {
    //   icon: icon,
    //   clickable: false
    // }).addTo(layer);
  // },
  _handlerActivated: function(e) {
    if (this._activeMode && this._activeMode.handler.enabled()) {
      this._activeMode.handler.disable();
    }
    this._activeMode = this._modes[e.handler];

    this.fire('enable');
    this._map.on('draw:mouseover', function(e) {
      me._onMouseMove(e);
    });
    debugger;

  },
  _handlerDeactivated: function() {
    this._activeMode = null;
    this.fire('disable');
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
  _onMouseMove: function(e) {
    var latLng = e.latlng;
    console.log(latLng);
    console.log(this._activemode);

    // if (this._markers >3){
    //   L.drawLocal.draw.handlers.polygon.error = this.options.polygon.drawError.message;
    // }

    // L.drawLocal.draw.handlers.polygon.tooltip.cont = latlng;

    // if (!latLng || !this._lastPoint) {
    //   this._layerGroupTemp = {};
    //   return;
    // }

    //   debugger;
    // if (!this._layerGroupPathTemp) {
    //   this._layerGroupTemp = L.layerGroup().addTo(this._map);

    //   if (this._activeMode === 'polygon') {
    //     this._layerGroupPathTemp.addLatLng(latLng);
    //   }

    //   this._layerGroupPathTemp.addTo(this._layerGroupTemp);
    // } else {
    //   this._layerGroupPathTemp.spliceLatLngs(0, 2, this._lastPoint, latLng);
    // }

    // if() {
    //   var distance = latLng.distanceTo(this._lastPoint),
    //   area = L.GeometryUtil.geodesicArea(this._layerGroupPathTemp.getLatLngs());

    //   if (!this._distance) {
    //     this._distance = 0;
    //   }

    //   this._updateTooltipPosition(latLng);
    //   if (this._activeMode === 'polyline') {
    //     this._updateTooltipDistance(this._distance + distance, distance);
    //   } else {
    //     this._updateTooltipArea(this._area + area);
    //   }
    // }
  },
  _toggleMeasure: function() {
    var map = this._map;

    if (L.DomUtil.hasClass(this._button, 'pressed')) {
      L.DomUtil.removeClass(this._button, 'pressed');
      this._drawnItems.clearLayers();
      // map._container.style.cursor = '';
      map._controllingCursor = map._controllingInteractivity = true;
      this._menu.style.display = 'none';

      // if (this._activeMode === 'polygon') {
      //   this._map.fire('draw:drawstop', { layerType: 'polygon' });
      // } else {
      //   this._map.fire('draw:drawstop', { layerType: 'polyline' });
      // }
      if (this._doubleClickZoom) {
        map.doubleClickZoom.enable();
      }
      this._doubleClickZoom = null;
    } else {
      L.DomUtil.addClass(this._button, 'pressed');
      // map._container.style.cursor = 'crosshair';
      // map._controllingCursor = false;
      // map._controllingInteractivity = false;
      this._menu.style.display = 'block';
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
  },
  activateMode: function(type) {
    this._modes[type].handler.enable();
  },
  clearShapes: function() {
    this._drawnItems.clearLayers();
  },
  deactivateMode: function(type) {
    this._modes[type].handler.disable();
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