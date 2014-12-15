/* global L */
/* jshint camelcase: false */
'use strict';

require('leaflet-draw');

var MeasureControl = L.Control.extend({
  includes: L.Mixin.Events,
  options: {
    polygon: {
      allowIntersection: false,
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
      metric: true,
      repeatMode: true
    },
    polyline: {
      shapeOptions: {
        color: '#d39800',
        weight: 2,
      },
      showLength: true,
      metric: true,
      repeatMode: true
    },
    marker:{

    },
    position:'topleft'
  },
  initialize: function(map, options) {
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
      this._drawnItems.clearLayers();
      map._controllingCursor = map._controllingInteractivity = true;
      this._menu.style.display = 'none';

      if (this._doubleClickZoom) {
        map.doubleClickZoom.enable();
      }
      this._doubleClickZoom = null;
    } else {
      L.DomUtil.addClass(this._button, 'pressed');
      this._menu.style.display = 'block';

    }
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
