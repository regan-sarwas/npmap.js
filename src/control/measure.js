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
        color: '#f06eaa',
        message: 'Invalid geometry',
        timeout: 400
      },
      repeatMode: true,
      shapeOptions: {
        color: 'rgb(255, 0, 0)',
        weight: 2
      }
    },
    polyline: {
      repeatMode: true,
      shapeOptions: {
        color: 'rgb(255, 0, 0)',
        weight: 2
      }
    },
    position:'topleft'
  },
  initialize: function(map, options) {
    L.Util.setOptions(this, options);
    this._activeMode = null;
    this._drawnGroup = new L.FeatureGroup();
    this._lastUnitArea = 'acres';
    this._lastUnitDistance = 'miles';
    this._modes = {};

    return this;
  },
  onAdd: function(map) {
    var me = this,
      liArea, liDistance, liSelect;

    this._container = L.DomUtil.create('div', 'npmap-control-measure leaflet-bar leaflet-control');
    this._menu = L.DomUtil.create('ul', '', this._container);
    liArea = L.DomUtil.create('li', '', this._menu);
    liDistance = L.DomUtil.create('li', '', this._menu);
    liSelect = L.DomUtil.create('li', '', this._menu);
    this._button = L.DomUtil.create('button', 'leaflet-bar-single measure-control', this._container);
    this._buttonArea = L.DomUtil.create('button', 'polygon', liArea);
    this._buttonArea.innerHTML = 'Area';
    this._buttonDistance = L.DomUtil.create('button', 'pressed polyline', liDistance);
    this._buttonDistance.innerHTML = 'Distance';
    this._selectUnitArea = L.DomUtil.create('select', 'measure-units', liSelect);
    this._selectUnitArea.innerHTML = '' +
      '<option value="acres" selected>Acres</option>' +
      '<option value="ha">Hectares</option>' +
    '';
    this._selectUnitDistance = L.DomUtil.create('select','measure-units', liSelect);
    this._selectUnitDistance.innerHTML = '' +
      '<option value="mi" selected>Miles</option>' +
      '<option value="meters" class="distance">Meters</option>' +
      '<option value="ft" class="distance">Feet</option>' +
    '';
    this._setupListeners(map, me);
    this._initializeMode(this._buttonArea, new L.Draw.Polygon(map, this.options.polygon));
    this._initializeMode(this._buttonDistance, new L.Draw.Polyline(map, this.options.polyline));

    return this._container;
  },
  /*
  _buttonAreaClick: function() {
    //this._buttonDistance.disabled = false;
    //this._buttonArea.disabled = true;
    this._buttonClick(this._buttonArea);
    //this._selectVal();
  },
  */
  _buttonClick: function(e, manual) {
    var button = e.target;

    if (manual || !L.DomUtil.hasClass(button, 'pressed')) {
      var add, mode, remove;

      if (button.innerHTML.toLowerCase() === 'distance') {
        add = this._buttonDistance;
        mode = 'distance';
        remove = this._buttonArea;
        this._selectUnitArea.style.display = 'none';
        this._selectUnitDistance.style.display = 'block';
      } else {
        add = this._buttonArea;
        mode = 'area';
        remove = this._buttonDistance;
        this._selectUnitArea.style.display = 'block';
        this._selectUnitDistance.style.display = 'none';
      }

      L.DomUtil.addClass(add, 'pressed');
      L.DomUtil.removeClass(remove, 'pressed');
      this._startMeasuring(mode);
    }
  },
  /*
  _buttonDistanceClick: function() {
    //this._buttonArea.disabled = false;
    //this._buttonDistance.disabled = true;
    this._buttonClick(this._buttonDistance);
    //this._pastUnit = 'm';
    //this._selectVal();
  },
  */
  _calculateArea: function(val) {
    var options = this._selectUnitArea.options;

    for (var i = 0; i < options.length; i++) {
      var selected = options[options.selectedIndex].value,
        unitChange;

      if (this._lastUnitArea === 'acres') {
        if (selected === 'ha') {
          unitChange = val * 0.404686;
        } else if (selected === 'acres') {
          unitChange = val;
        }
      } else if (this._lastUnitArea === 'ha') {
        if (selected === 'acres') {
          unitChange = val * 2.47105;
        } else if (selected === 'ha') {
          unitChange = val;
        }
      }

      return unitChange.toFixed(2) + ' ' + selected;
    }
  },
  _calculateDistance: function(val) {
    var options = this._selectUnitDistance.options;

    for (var i = 0; i < options.length; i++) {
      var selected = options[options.selectedIndex].value,
        unitChange;

      if (this._pastUnit === 'meters') {
        if (selected === 'mi') {
          unitChange = val * 0.000621371;
        } else if (selected === 'ft') {
          unitChange = val * 3.28084;
        } else if (selected === 'meters') {
          unitChange = val;
        }
      } else if (this._pastUnit === 'mi') {
        if (selected === 'ft') {
          unitChange = val * 5280;
        } else if (selected === 'meters') {
          unitChange = val * 1609.34;
        } else if (selected === 'mi') {
          unitChange = val;
        }
      } else if (this._pastUnit === 'ft') {
        if (selected === 'mi') {
          unitChange = val * 0.000189394;
        } else if (selected === 'meters') {
          unitChange = val * 0.3048;
        } else if (selected === 'ft') {
          unitChange = val;
        }
      }

      return unitChange.toFixed(2) + ' ' + selected;
    }
  },
  _createTooltip: function(position) {
    var icon = L.divIcon({
      className: 'leaflet-measure-tooltip unit-'+ this._unit,
      iconAnchor: [-5, -5]
    });

    this._tooltip = L.marker(position, {
      clickable: false,
      icon: icon
    }).addTo(this._drawnGroup);
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
    this._lastCircle = undefined;
    this._currentCircles = [];
    this._layerGroupPathTemp = this._layerGroupPath = undefined;
    this._lastPoint = undefined;
    this._area = 0;
    this._distance = 0;
  },
  _initializeMode: function(button, handler) {
    var type = handler.type,
      me = this;
   
    this._modes[type] = {
      button: button,
      handler: handler
    };
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
  _mouseArea: function(latLng) {
    this._layerGroupPath.addLatLng(latLng);

    if (this._currentCircles !== undefined) {
      this._area = L.GeometryUtil.geodesicArea(this._layerGroupPath.getLatLngs()) * 0.000247105;
    } else {
      this._area = 0;
    }

    if (this._tooltip && this._currentCircles.length > 2) {
      this._updateTooltipPosition(latLng);
      this._updateTooltipArea(this._area);
    }
  },
  _mouseClickArea: function(e) {
    if (L.DomUtil.hasClass(this._buttonArea, 'pressed')) {
      var latLng = e.latlng,
        circle;

      this._unit = this._lastUnitArea;

      if (this._layerGroupPath) {
        if (this._pointLength === document.getElementsByClassName('leaflet-div-icon').length) {
          return;
        } else {
          var metersSq;

          this._layerGroupPath.addLatLng(latLng);
          metersSq = L.GeometryUtil.geodesicArea(this._layerGroupPath.getLatLngs());
          this._area = metersSq * 0.000247105;
          circle = new L.CircleMarker(latLng);
          this._currentCircles.push(circle);
          this._pointLength = document.getElementsByClassName('leaflet-div-icon').length;
          
          if (this._currentCircles.length > 1) {
            this._updateTooltipPosition(latLng);
            this._updateTooltipArea(this._area);
            L.DomEvent.on(this._map, 'mousemove', this._mouseMove, this);
          }
        }
      } else {
        this._layerGroupPath = L.polygon([latLng]);
      }

      if (this._currentCircles.length > 0) {
        this._createTooltip(latLng);
      }

      this._lastPoint = latLng;
    }
  },
  _mouseClickDistance: function(e) {
    if (L.DomUtil.hasClass(this._buttonDistance, 'pressed')) {
      var latLng = e.latlng;

      this._unit = this._lastUnitDistance;

      if (!this._tooltip) {
        this._tooltip = this._createTooltip(latLng);
      }

      if (this._lastPoint) {
        var distance = latLng.distanceTo(this._lastPoint);

        this._updateTooltipPosition(latLng);
        this._updateTooltipDistance(this._distance + distance, distance);
        this._distance += distance;
      }

      if (this._distance !== 0) {
        this._createTooltip(latLng);
      }

      if (this._lastCircle) {
        this._drawnGroup.removeLayer(this._lastCircle);
      }

      this._lastPoint = latLng;
      this._lastCircle = new L.CircleMarker(latLng);
      this._lastCircle.on('click', this._handlerDeactivated(), this);
    }
  },
  _mouseDistance: function(latLng) {
    if (this._layerGroupPathTemp) {
      this._layerGroupPathTemp.spliceLatLngs(0, 2, this._lastPoint, latLng);
    } else {
      this._layerGroupPathTemp = L.polyline([
        this._lastPoint,
        latLng
      ]);
    }

    if (this._tooltip) {
      var distance = latLng.distanceTo(this._lastPoint);

      if (!this._distance) {
        this._distance = 0;
      }

      this._updateTooltipPosition(latLng);
      this._updateTooltipDistance(this._distance + distance, distance);
    }
  },
  _mouseMove: function(e) {
    var latLng = e.latlng;

    if (!latLng || !this._lastPoint) {
      return;
    }

    if (L.DomUtil.hasClass(this._buttonDistance, 'pressed')) {
      this._mouseDistance(latLng);
    } else {
      this._mouseArea(latLng);
    }
  },
  _onKeyDown: function (e) {
    if (e.keyCode === 27) {
      this._toggleMeasure();
    }
  },
  _selectUnitArea: function(tooltip) {
    if (tooltip.innerHTML !== '') {
      var newArea, newTotal;

      if (tooltip !== undefined || tooltip !== null){
        newTotal = tooltip.innerHTML.match(/\d+\.\d\d(?!\d)/)[0];
      }

      newArea = this._calculateArea(newTotal);

      if (newArea !== undefined){
        tooltip.innerHTML = newArea;
      }
    }
  },
  _selectUnitDistance: function(tooltip) {
    var total = tooltip.innerHTML;

    if (total !== '') {
      var difference = L.npmap.util._.getNextSibling(tooltip),
        newDifference, newDistance, newMeasurement, newTotal;

      if (tooltip !== undefined) {
        newTotal = tooltip.innerHTML.match(/\d+\.\d\d(?!\d)/)[0];
        newDistance = this._calculateDistance(newTotal);
      }

      if (difference !== null) {
        newMeasurement = difference.innerHTML.match(/\d+\.\d\d(?!\d)/)[0];
        newDifference = this._calculateDistance(newMeasurement);
      }

      if (newDistance !== undefined) {
        tooltip.innerHTML = newDistance;

        if (difference !== null) {
          difference.innerHTML = '(+' + newDifference + ')';
        }
      }
    }
  },
  _selectVal: function() {
    var area = L.npmap.util._.getElementsByClassName('leaflet-measure-tooltip unit-acres'),
      distance = L.npmap.util._.getElementsByClassName('leaflet-measure-tooltip unit-meters'),
      total = L.npmap.util._.getElementsByClassName('leaflet-measure-tooltip-total');

    if (this._selectUnit) {
      for (var i = 0; i < total.length; i++) {
        var parentElement = total[i].parentNode;

        if (area.indexOf(parentElement) > -1) {
          this._selectUnitArea(total[i]);
        }
        if (distance.indexOf(parentElement) > -1) {
          this._selectUnitDistance(total[i]);
        }
      }

      this._pastUnit = this._selectUnit.options[this._selectUnit.options.selectedIndex].value;
    }
  },
  _setupListeners: function(map, me) {
    L.DomEvent
      .on(this._button, 'click', this._toggleMeasure, this)
      .disableClickPropagation(this._button)
      .on(this._buttonArea, 'click', this._buttonClick, this)
      .on(this._buttonDistance, 'click', this._buttonClick, this)
      .on(this._map, 'mousemove', this._mouseMove, this)
      .disableClickPropagation(this._menu);
    map.addLayer(this._drawnGroup);
    map.on('draw:created', function(e) {
      me._drawnGroup.addLayer(e.layer);
    });
  },
  _startMeasuring: function(type) {
    var fn = (type === 'area' ? this._mouseClickArea : this._mouseClickDistance),
      map = this._map;

    this._currentCircles = [];
    this._tooltip = undefined;

    L.DomEvent
      .on(document, 'keydown', this._onKeyDown, this)
      .on(map, 'click', fn, this)
      .on(map, 'dblclick', this._handlerDeactivated, this)
      .on(map, 'mousemove', this._mouseMove, this);
  },
  _stopMeasuring: function(type) {
    var fn = (type === 'area' ? this._mouseClickArea : this._mouseClickDistance),
      map = this._map;

    if (this._drawnGroup) {
      this._drawnGroup.clearLayers();
    }

    L.DomEvent
      .off(document, 'keydown', this._onKeyDown, this)
      .off(map, 'click', fn, this)
      .off(map, 'dblclick', this._handlerDeactivated, this)
      .off(map, 'mousemove', this._mouseMove, this);
  },
  _toggleMeasure: function() {
    var map = this._map;

    if (L.DomUtil.hasClass(this._button, 'pressed')) {
      L.DomUtil.removeClass(this._button, 'pressed');
      this._menu.style.display = 'none';
      this._activeMode.handler.disable();
      this._stopMeasuring(this._clicked);
      this._drawnGroup.clearLayers();
      map._controllingInteractivity = true;
    } else {
      L.DomUtil.addClass(this._button, 'pressed');
      this._menu.style.display = 'block';
      
      if (L.DomUtil.hasClass(this._buttonArea, 'pressed')) {
        this._buttonClick({
          target: this._buttonArea
        }, true);
      } else {
        this._buttonClick({
          target: this._buttonDistance
        }, true);
      }

      map._controllingInteractivity = false;
    }
  },
  _updateTooltipArea: function(total) {
    this._tooltip._icon.innerHTML = '' +
      '<div class="leaflet-measure-tooltip-total" id="draw-tooltip-total">' +
        this._calculateArea(total) +
      '</div>' +
    '';
  },
  _updateTooltipDistance: function(total, difference) {
    var differenceDistance = this._calculateDistance(difference),
      totalDistance = this._calculateDistance(total),
      text = '<div id="draw-tooltip-total" class="leaflet-measure-tooltip-total">' + totalDistance + '</div>';

    if ((differenceDistance !== totalDistance) && (difference !== 0)) {
      text += '' +
        '<div class="leaflet-measure-tooltip-difference" id="draw-tooltip-difference">' +
          '(+' + differenceDistance + ')' +
        '</div>' +
      '';
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

    if (typeof this.options.measureControl === 'object'){
      options = this.options.measureControl;
    }

    this.measureControl = L.npmap.control.measure(options).addTo(this);
  }
});

module.exports = function(options){
  return new MeasureControl(options);
};