/* global L */
/* jshint camelcase: false */
'use strict';

var util = require('../util/util');

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
    this._activePoint = null;
    this._activeTooltip = null;
    this._activeUnitArea = 'ac';
    this._activeUnitDistance = 'mi';
    this._drawnGroup = new L.FeatureGroup();
    this._lastUnitArea = 'ac';
    this._lastUnitDistance = 'mi';
    this._modes = {};

    return this;
  },
  onAdd: function(map) {
    var liArea, liDistance, liSelect;

    this._container = L.DomUtil.create('div', 'leaflet-bar leaflet-control npmap-control-measure');
    this._map = map;
    this._menu = L.DomUtil.create('ul', '', this._container);
    liArea = L.DomUtil.create('li', '', this._menu);
    liDistance = L.DomUtil.create('li', '', this._menu);
    liSelect = L.DomUtil.create('li', '', this._menu);
    this._button = L.DomUtil.create('button', 'leaflet-bar-single measure-control', this._container);
    this._buttonArea = L.DomUtil.create('button', '', liArea);
    this._buttonArea.innerHTML = 'Area';
    this._buttonDistance = L.DomUtil.create('button', '', liDistance);
    this._buttonDistance.innerHTML = 'Distance';
    this._selectUnitArea = L.DomUtil.create('select', '', liSelect);
    this._selectUnitArea.innerHTML = '' +
      '<option value="ac" selected>Acres</option>' +
      '<option value="ha">Hectares</option>' +
    '';
    this._selectUnitDistance = L.DomUtil.create('select','', liSelect);
    this._selectUnitDistance.innerHTML = '' +
      '<option value="mi" selected>Miles</option>' +
      '<option value="m" class="distance">Meters</option>' +
      '<option value="ft" class="distance">Feet</option>' +
    '';

    map.addLayer(this._drawnGroup);
    this._initializeMode(this._buttonArea, new L.Draw.Polygon(map, this.options.polygon));
    this._initializeMode(this._buttonDistance, new L.Draw.Polyline(map, this.options.polyline));
    this._setupListeners();

    return this._container;
  },
  _buildTooltipDistance: function(total, difference) {
    var html = '' +
        '<div class="leaflet-measure-tooltip-distance">' +
          '<div class="leaflet-measure-tooltip-total">' +
            '<span>' +
              total.toFixed(2) + ' ' + this._activeUnitDistance +
            '</span>' +
            '<span>' +
              total +
            '</span>' +
          '</div>' +
        '' +
      '',
      number = total;

    if (typeof difference !== 'undefined' && (difference !== 0) && (difference !== total)) {
      html += '' +
        '' +
          '<div class="leaflet-measure-tooltip-difference">' +
            '<span>' +
              '(+' + difference.toFixed(2) + ' ' + this._activeUnitDistance + ')' +
            '</span>' +
            '<span>' +
              difference +
            '</span>' +
          '</div>' +
        '' +
      '';
      number = difference;
    }

    return html + '</div>';
  },
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
        this._modes.polygon.handler.disable();
        this._modes.polyline.handler.enable();
      } else {
        add = this._buttonArea;
        mode = 'area';
        remove = this._buttonDistance;
        this._selectUnitArea.style.display = 'block';
        this._selectUnitDistance.style.display = 'none';
        this._modes.polyline.handler.disable();
        this._modes.polygon.handler.enable();
      }

      L.DomUtil.addClass(add, 'pressed');
      L.DomUtil.removeClass(remove, 'pressed');
      this._startMeasuring(mode);
    }
  },
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

    return null;
  },
  _calculateDistance: function(to, val, from) {
    from = from || 'm';

    if (from !== to) {
      if (from === 'ft') {
        switch (to) {
        case 'm':
          val = val / 3.28084;
          break;
        case 'mi':
          val = val / 5280;
          break;
        }
      } else if (from === 'm') {
        switch (to) {
        case 'ft':
          val = val * 3.28084;
          break;
        case 'mi':
          val = val * 0.000621371192;
          break;
        }
      } else if (from === 'mi') {
        switch (to) {
        case 'ft':
          val = val * 5280;
          break;
        case 'm':
          val = val * 1609.344;
          break;
        }
      }
    }

    return val;
  },
  _createTooltip: function(latLng, text) {
    return new L.Marker(latLng, {
      clickable: false,
      icon: new L.DivIcon({
        className: 'leaflet-measure-tooltip',
        html: text,
        iconAnchor: [
          -5,
          -5
        ]
      })
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
    this._area = 0;
    this._currentCircles = [];
    this._distance = 0;
    this._activeMode = null;
    this._activePoint = null;
    this._activeTooltip = null;
    this._layerGroupPath = null;
    this._tempTooltip = null;
    this.fire('disable');
  },
  _initializeMode: function(button, handler) {
    var type = handler.type;

    this._modes[type] = {
      button: button,
      handler: handler
    };
    this._modes[type].handler
      .on('disabled', this._handlerDeactivated, this)
      .on('enabled', this._handlerActivated, this);
  },
  _mouseClickArea: function(e) {
    var latLng = e.latLng;

    // TODO: Geometry edits are not contained in _drawnGroup.

    if (!this._activePolygon) {
      var layers = this._drawnGroup.getLayers();

      console.log(layers.length);
      //this._activePolygon = layers[layers.length - 1];
    }

    //console.log(this._activePolygon);
    //console.log(L.GeometryUtil.geodesicArea(this._activePolygon.getLatLngs()));

    //console.log(this._activePolygon);
    //console.log(this._activePolygon.getLatLngs().length);


    /*
    var latLng = e.latlng,
      circle;

    console.log('mouseClickArea');

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
      this._layerGroupPath = new L.Polygon([
        latLng
      ]);
    }

    if (this._currentCircles.length > 0) {
      this._createTooltip(latLng);
    }

    this._activePoint = latLng;
    */
  },
  _mouseClickDistance: function(e) {
    var latLng = e.latlng;

    if (this._activePoint) {
      var distance = this._calculateDistance(this._activeUnitDistance, latLng.distanceTo(this._activePoint));

      this._distance = this._distance + distance;
      this._activeTooltip = this._createTooltip(latLng, this._buildTooltipDistance(this._distance, distance));
    } else {
      this._distance = 0;
    }

    this._activePoint = latLng;

    if (this._tempTooltip) {
      this._removeTempTooltip();
    }
  },
  _mouseMove: function(e) {
    var latLng = e.latlng;

    if (!latLng || !this._activePoint) {
      return;
    }

    if (L.DomUtil.hasClass(this._buttonArea, 'pressed')) {
      //this._mouseMoveArea(latLng);
    } else {
      this._mouseMoveDistance(latLng);
    }
  },
  _mouseMoveArea: function(latLng) {
    /*
    this._layerGroupPath.addLatLng(latLng);

    if (this._currentCircles !== undefined) {
      this._area = L.GeometryUtil.geodesicArea(this._layerGroupPath.getLatLngs()) * 0.000247105;
    } else {
      this._area = 0;
    }

    if (this._activeTooltip && this._currentCircles.length > 2) {
      this._updateTooltipPosition(latLng);
      this._updateTooltipArea(this._area);
    }
    */
  },
  _mouseMoveDistance: function(latLng) {
    var distance = this._calculateDistance(this._activeUnitDistance, latLng.distanceTo(this._activePoint)),
      html = this._buildTooltipDistance(this._distance + distance);

    if (this._tempTooltip) {
      this._updateTooltip(latLng, html, this._tempTooltip);
    } else {
      this._tempTooltip = this._createTooltip(latLng, html);
    }
  },
  _onKeyDown: function (e) {
    if (e.keyCode === 27) {
      this._toggleMeasure();
    }
  },
  _onSelectUnitArea: function(tooltip) {
    this._lastUnitArea = this._activeUnitArea;
    this._activeUnitArea = this._selectUnitDistance.options[this._selectUnitArea.selectedIndex].value;

    /*
    if (tooltip && tooltip.innerHTML !== '') {
      var total = tooltip.innerHTML.match(/\d+\.\d\d(?!\d)/)[0],
        area = this._calculateArea(total);

      if (area !== null) {
        tooltip.innerHTML = area;
      }
    }
    */
  },
  _onSelectUnitDistance: function() {
    var tooltips = util.getElementsByClassName('leaflet-measure-tooltip-distance');

    this._lastUnitDistance = this._activeUnitDistance;
    this._activeUnitDistance = this._selectUnitDistance.options[this._selectUnitDistance.selectedIndex].value;

    for (var i = 0; i < tooltips.length; i++) {
      var tooltip = tooltips[i],
        childNodes = tooltip.childNodes,
        difference, differenceNode, total, totalNode;

      if (childNodes.length === 2) {
        differenceNode = childNodes[1].childNodes[1];
        totalNode = childNodes[0].childNodes[1];
      } else {
        differenceNode = childNodes[0].childNodes[1];
      }

      difference = this._calculateDistance(this._activeUnitDistance, parseFloat(differenceNode.innerHTML), this._lastUnitDistance);

      if (totalNode) {
        total = this._calculateDistance(this._activeUnitDistance, parseFloat(totalNode.innerHTML), this._lastUnitDistance);
        tooltip.parentNode.innerHTML = this._buildTooltipDistance(total, difference);
      } else {
        tooltip.parentNode.innerHTML = this._buildTooltipDistance(difference);
      }
    }

    if (this._activeTooltip) {
      this._distance = parseFloat(this._activeTooltip._icon.childNodes[0].childNodes[0].childNodes[1].innerHTML);

      // TODO: You should really just update this._tempTooltip with the new distance.
      if (this._tempTooltip) {
        this._removeTempTooltip();
      }
    }
  },
  _removeTempTooltip: function() {
    this._drawnGroup.removeLayer(this._tempTooltip);
    this._tempTooltip = null;
  },
  _setupListeners: function() {
    var me = this;

    L.DomEvent
      .disableClickPropagation(this._button)
      .disableClickPropagation(this._menu)
      .on(this._button, 'click', this._toggleMeasure, this)
      .on(this._buttonArea, 'click', this._buttonClick, this)
      .on(this._buttonDistance, 'click', this._buttonClick, this)
      .on(this._selectUnitArea, 'change', this._onSelectUnitArea, this)
      .on(this._selectUnitDistance, 'change', this._onSelectUnitDistance, this);
    this._map.on('draw:created', function(e) {
      me._drawnGroup.addLayer(e.layer);
    });
  },
  _startMeasuring: function(type) {
    var map = this._map,
      off = (type === 'area' ? this._mouseClickDistance : this._mouseClickArea),
      on = (type === 'area' ? this._mouseClickArea : this._mouseClickDistance);

    //this._currentCircles = [];
    //this._activeTooltip = null;
    L.DomEvent
      .off(map, 'click', off)
      .on(document, 'keydown', this._onKeyDown, this)
      .on(map, 'click', on, this)
      .on(map, 'dblclick', this._handlerDeactivated, this)
      .on(map, 'mousemove', this._mouseMove, this);
  },
  _stopMeasuring: function(type) {
    var map = this._map,
      off = (type === 'area' ? this._mouseClickArea : this._mouseClickDistance);

    L.DomEvent
      .off(document, 'keydown', this._onKeyDown, this)
      .off(map, 'click', off, this)
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
  _updateTooltip: function(latLng, html, tooltip) {
    tooltip = tooltip || this._activeTooltip;
    tooltip.setLatLng(latLng);
    tooltip._icon.innerHTML = html;
  }
  /*
  _updateTooltipArea: function(total) {
    this._activeTooltip._icon.innerHTML = '' +
      '<div class="leaflet-measure-tooltip-total">' +
        this._calculateArea(total) +
      '</div>' +
    '';
  },
  _updateTooltipPosition: function(latLng) {
    this._activeTooltip.setLatLng(latLng);
  }
  */
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
