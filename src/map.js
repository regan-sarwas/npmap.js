/* global L, NPMap */
/* jshint camelcase: false */

'use strict';

var baselayerPresets = require('./preset/baselayers.json'),
  colorPresets = require('./preset/colors.json'),
  humane = require('humane-js'),
  nanobar = require('nanobar'),
  overlayPresets = require('./preset/overlays.json'),
  util = require('./util/util');

require('./popup.js');

(function() {
  var style = colorPresets.gold;

  L.Circle.mergeOptions(style);
  L.CircleMarker.mergeOptions(style);
  L.Control.Attribution.mergeOptions({
    prefix: '<a href="http://www.nps.gov/npmap/disclaimer.html" target="_blank">Disclaimer</a>'
  });
  L.Map.addInitHook(function() {
    var container = this.getContainer(),
      elAttribution = util.getChildElementsByClassName(container, 'leaflet-control-attribution')[0],
      elControl = util.getChildElementsByClassName(container, 'leaflet-control-container')[0],
      me = this;

    function resize() {
      var left = util.getOuterDimensions(elControl.childNodes[2]).width,
        overviewControl = util.getChildElementsByClassName(container, 'leaflet-control-overview')[0];

      if (left) {
        left = left + 15;
      } else {
        left = 10;
      }

      if (overviewControl && !util.isHidden(overviewControl)) {
        elAttribution.style['margin-right'] = util.getOuterDimensions(overviewControl).width + 'px';
      } else {
        elAttribution.style['margin-right'] = 0;
      }

      elAttribution.style['max-width'] = (util.getOuterDimensions(container).width - left) + 'px';
    }

    if (this.options.attributionControl) {
      this.attributionControl._update = function() {
        var attribs = [],
          prefixAndAttribs = [];

        for (var attribution in this._attributions) {
          if (this._attributions[attribution] > 0) {
            var i = -1;

            if (attribution) {
              for (var j = 0; j < attribs.length; j++) {
                if (attribs[j] === attribution) {
                  i = j;
                  break;
                }
              }

              if (i === -1) {
                attribs.push(attribution);
              }
            }
          }
        }

        if (this.options.prefix) {
          prefixAndAttribs.push(this.options.prefix);
        }

        if (attribs.length) {
          prefixAndAttribs.push(attribs.join(' | '));
        }

        this._container.innerHTML = prefixAndAttribs.join(' | ');

        if (typeof me._updateImproveLinks === 'function') {
          me._updateImproveLinks();
        }
      };
      this.on('resize', resize);
      resize();
    }

    if (typeof me._updateImproveLinks === 'function') {
      me.on('moveend', me._updateImproveLinks);
    }
  });
  L.Polygon.mergeOptions(style);
  L.Polyline.mergeOptions({
    color: style.color,
    opacity: style.opacity,
    weight: style.weight
  });
})();

var Map = L.Map.extend({
  options: {
    bounceAtZoomLimits: false,
    worldCopyJump: true
  },
  initialize: function(options) {
    var baseLayerSet = false,
      container = L.DomUtil.create('div', 'npmap-container'),
      map = L.DomUtil.create('div', 'npmap-map'),
      mapWrapper = L.DomUtil.create('div', 'npmap-map-wrapper'),
      me = this,
      modules = L.DomUtil.create('div', 'npmap-modules'),
      npmap = L.DomUtil.create('div', 'npmap' + ((L.Browser.ie6 || L.Browser.ie7) ? ' npmap-oldie' : '') + (L.Browser.retina ? ' npmap-retina' : '')),
      toolbar = L.DomUtil.create('div', 'npmap-toolbar'),
      toolbarLeft = L.DomUtil.create('ul', 'left'),
      toolbarRight = L.DomUtil.create('ul', 'right'),
      zoomifyMode = false;

    options = me._toLeaflet(options);
    L.Util.setOptions(this, options);
    options.div.insertBefore(npmap, options.div.hasChildNodes() ? options.div.childNodes[0] : null);
    npmap.appendChild(modules);
    npmap.appendChild(container);
    toolbar.appendChild(toolbarLeft);
    toolbar.appendChild(toolbarRight);
    container.appendChild(toolbar);
    container.appendChild(mapWrapper);
    mapWrapper.appendChild(map);
    options.div = map;
    options.zoomControl = false;
    L.Map.prototype.initialize.call(me, options.div, options);
    me._addEvents(me, options);
    me._controllingCursor = 'map';
    me._controllingInteractivity = 'map';
    me._defaultCursor = me.getContainer().style.cursor;

    me.on('autopanstart', function() {
      me._setCursor('');
    });
    me.notify = humane.create({
      baseCls: 'humane-bootstrap',
      container: map,
    });
    me.notify.danger = me.notify.spawn({
      addnCls: 'humane-bootstrap-danger'
    });
    me.notify.info = me.notify.spawn({
      addnCls: 'humane-bootstrap-info'
    });
    me.notify.success = me.notify.spawn({
      addnCls: 'humane-bootstrap-success'
    });
    me.notify.warning = me.notify.spawn({
      addnCls: 'humane-bootstrap-warning'
    });
    me._progress = new nanobar({
      bg: '#d29700',
      id: 'npmap-progress',
      target: map
    });

    if (!me._loaded) {
      me.setView(options.center, options.zoom);
    }

    if (options.baseLayers.length) {
      var zoomify = [],
        baseLayer, i;

      for (i = 0; i < options.baseLayers.length; i++) {
        baseLayer = options.baseLayers[i];

        if (baseLayer.type === 'zoomify') {
          zoomify.push(baseLayer);
        }
      }

      if (zoomify.length) {
        zoomifyMode = true;

        for (i = 0; i < zoomify.length; i++) {
          baseLayer = zoomify[i];

          if (baseLayer.visible || typeof baseLayer.visible === 'undefined') {
            baseLayer.visible = true;
            baseLayer.L = L.npmap.layer.zoomify(baseLayer);
            me._addEvents(baseLayer.L, baseLayer);
            baseLayer.L.addTo(me);
            break;
          }
        }
      } else {
        for (i = 0; i < options.baseLayers.length; i++) {
          baseLayer = options.baseLayers[i];
          baseLayer.zIndex = 0;

          if (!baseLayerSet && (baseLayer.visible || typeof baseLayer.visible === 'undefined')) {
            baseLayer.visible = true;
            baseLayerSet = true;

            if (baseLayer.type === 'arcgisserver') {
              baseLayer.L = me._createArcGisServerLayer(baseLayer);
            } else {
              baseLayer.L = L.npmap.layer[baseLayer.type](baseLayer);
            }

            me._addEvents(baseLayer.L, baseLayer);
            me.addLayer(baseLayer.L);
          } else {
            baseLayer.visible = false;
          }
        }
      }
    }

    if (!zoomifyMode && options.overlays.length) {
      var zIndex = 1;

      for (var j = 0; j < options.overlays.length; j++) {
        var overlay = options.overlays[j];

        if (overlay.type === 'zoomify') {
          throw new Error('Zoomify layers can only be added in the "baseLayers" config property.');
        } else {
          if (overlay.visible || typeof overlay.visible === 'undefined') {
            overlay.visible = true;
            overlay.zIndex = zIndex;

            if (overlay.type === 'arcgisserver') {
              overlay.L = me._createArcGisServerLayer(overlay);
            } else {
              overlay.L = L.npmap.layer[overlay.type](overlay);
            }

            me._addEvents(overlay.L, overlay);
            me.addLayer(overlay.L);
            zIndex++;
          } else {
            overlay.visible = false;
          }
        }
      }
    }

    util.checkNpsNetwork(function(on) {
      me._onNpsNetwork = on;

      if (typeof me._updateImproveLinks === 'function') {
        me._updateImproveLinks();
      }
    });
    me._initializeModules();
    me._setupPopup();
    me._setupTooltip();

    return this;
  },
  _addEvents: function(obj, config) {
    if (config.events && config.events.length) {
      for (var i = 0; i < config.events.length; i++) {
        var e = config.events[i],
          context = e.context || null;

        if (e.single === true) {
          obj.once(e.type, e.fn, context);
        } else {
          obj.on(e.type, e.fn, context);
        }

        if (e.type === 'error' && obj.errorFired) {
          obj.fire('error', obj.errorFired);
        } else if (e.type === 'load' && obj._loaded) {
          obj.fire('load');
        } else if (e.type === 'ready' && obj.readyFired) {
          obj.fire('ready');
        }
      }
    }
  },
  _createArcGisServerLayer: function(config) {
    return L.npmap.layer[config.type][config.tiled === true ? 'tiled' : 'dynamic'](config);
  },
  _initializeModules: function() {
    if (this.options && this.options.modules && L.Util.isArray(this.options.modules) && this.options.modules.length) {
      var initialize = null,
        me = this,
        modules = this.options.modules,
        width = 0,
        button, i;

      this._divWrapper = this._container.parentNode.parentNode;
      this._divModules = util.getChildElementsByClassName(this._divWrapper.parentNode.parentNode, 'npmap-modules')[0];
      this._divModuleButtons = L.DomUtil.create('div', 'npmap-modules-buttons', this._container.parentNode);
      this._buttonCloseModules = L.DomUtil.create('button', 'npmap-modules-buttons-button', this._divModuleButtons);
      this._buttonCloseModules.style.backgroundImage = 'url(' + window.L.Icon.Default.imagePath + '/font-awesome/times' + (L.Browser.retina ? '@2x' : '') + '.png)';
      this._buttonCloseModules.setAttribute('alt', 'Close');
      L.DomEvent.addListener(this._buttonCloseModules, 'click', me.closeModules, this);

      for (i = 0; i < modules.length; i++) {
        var div = L.DomUtil.create('div', 'module', this._divModules),
          divTitle = L.DomUtil.create('h2', 'title', div),
          divContent = L.DomUtil.create('div', 'content', div),
          module = modules[i],
          content, icon, title;

        if (module.type !== 'custom') {
          this.options.modules[i] = module = L.npmap.module[module.type](module).addTo(this);
        }

        content = module.content;
        icon = module.icon;
        title = divTitle.innerHTML = module.title;

        if (typeof content === 'string') {
          divContent.innerHTML = content;
        } else if ('nodeType' in content) {
          divContent.appendChild(content);
        }

        button = L.DomUtil.create('button', 'npmap-modules-buttons-button', this._divModuleButtons);
        button.id = 'npmap-modules-buttons_' + title.replace(/ /g, '_');
        button.setAttribute('alt', title);
        button.style.backgroundImage = 'url(' + window.L.Icon.Default.imagePath + '/font-awesome/' + icon + (L.Browser.retina ? '@2x' : '') + '.png)';
        div.id = 'npmap-module_' + title.replace(/ /g, '_');

        if (typeof module.width === 'number') {
          if (module.width > width) {
            width = module.width;
          }
        }

        L.DomEvent.addListener(button, 'click', function() {
          me.showModule(this.id.replace('npmap-modules-buttons_', ''));
        });

        if (!initialize && module.visible === true) {
          initialize = title;
        }
      }

      if (width !== 0) {
        this._divModules.style.width = width + 'px';
      }

      if (initialize) {
        this.showModule(initialize);
      } else {
        for (i = 1; i < this._divModuleButtons.childNodes.length; i++) {
          button = this._divModuleButtons.childNodes[i];
          button.style.display = 'inline-block';
        }
      }
    }
  },
  _setCursor: function(type) {
    this._container.style.cursor = type;
  },
  _setupPopup: function() {
    var clicks = 0,
      me = this,
      canceled, changed, hasArcGisServer;

    function done() {
      me
        .off('click', setCanceled)
        .off('dragstart', setChanged)
        .off('movestart', setChanged)
        .off('zoomstart', setChanged);

      if (hasArcGisServer) {
        me._progress.go(100);
        me._setCursor('');
      }
    }
    function go(e) {
      var queryable = [],
        layer;

      canceled = false;
      changed = false;
      me
        .on('click', setCanceled)
        .on('dragstart', setChanged)
        .on('movestart', setChanged)
        .on('zoomstart', setChanged);

      for (var layerId in me._layers) {
        layer = me._layers[layerId];

        if (typeof layer.options === 'object' && (typeof layer.options.popup === 'undefined' || layer.options.popup !== false) && typeof layer._handleClick === 'function' && layer._hasInteractivity !== false) {
          queryable.push(layer);
        }
      }

      if (queryable.length) {
        var completed = 0,
          intervals = 0,
          latLng = e.latlng.wrap(),
          results = [],
          i, interval;

        hasArcGisServer = false;

        for (i = 0; i < queryable.length; i++) {
          layer = queryable[i];

          if (layer.options && layer.options.type === 'arcgisserver') {
            hasArcGisServer = true;
          }

          layer._handleClick(latLng, function(result) {
            if (result) {
              results.push(result);
            }

            completed++;
          });
        }

        if (hasArcGisServer) {
          me._progress.go(1);
          me._setCursor('wait');
        }

        interval = setInterval(function() {
          intervals++;

          if (hasArcGisServer) {
            me._progress.go(intervals);
          }

          if (canceled || changed) {
            clearInterval(interval);
            done();
          } else if ((queryable.length === completed) || intervals > 98) {
            clearInterval(interval);
            done();

            if (intervals > 98) {
              me.notify.danger('One or more servers failed to respond.');
            }

            if (results.length) {
              var actual = [];

              for (var i = 0; i < results.length; i++) {
                var result = results[i];

                if (typeof result.results !== 'undefined') {
                  if (result.results && result.results !== 'loading') {
                    actual.push(result);
                  }
                } else {
                  actual.push(result);
                }
              }

              if (actual.length) {
                var popup = L.npmap.popup({
                  autoPanPaddingTopLeft: util._getAutoPanPaddingTopLeft(me.getContainer()),
                  maxHeight: util._getAvailableVerticalSpace(me) - 84,
                  maxWidth: util._getAvailableHorizontalSpace(me) - 77
                });

                popup
                  .setContent(popup._handleResults(actual, me.options.popup))
                  .setLatLng(latLng).openOn(me);
              }
            }
          }
        }, 100);
      }
    }
    function setCanceled() {
      canceled = true;
    }
    function setChanged() {
      changed = true;
    }

    me.on('dblclick', function() {
      clicks++;
    });
    me.on('click', function(e) {
      clicks = 0;

      if (me._controllingInteractivity === 'map') {
        setTimeout(function() {
          if (!clicks) {
            go(e);
          }
        }, 200);
      }
    });
  },
  _setupTooltip: function() {
    var me = this,
      overData = [],
      tooltip = (me.infoboxControl ? me.infoboxControl : L.npmap.tooltip({map: me}));

    function handle() {
      if (me._controllingCursor === 'map') {
        updateCursor();
      }

      if (me._tooltips.length) {
        var changed = false,
          childNodes = tooltip._container.childNodes,
          html = '',
          i, obj;

        if (childNodes.length) {
          var remove = [];

          for (i = 0; i < childNodes.length; i++) {
            var childNode = childNodes[i],
              removeNode = true;

            for (var j = 0; j < me._tooltips.length; j++) {
              obj = me._tooltips[j];

              // Also do comparison of html to see.
              if (obj.added && (obj.layerId === parseInt(childNode.id.replace('tooltip-', ''), 10))) {
                removeNode = false;
                break;
              }
            }

            if (removeNode) {
              remove.push(childNode);
            }
          }

          if (remove.length) {
            for (i = 0; i < remove.length; i++) {
              var div = remove[i];

              div.parentNode.removeChild(div);
            }

            changed = true;
          }

          html = tooltip.getHtml();
        }

        for (i = 0; i < me._tooltips.length; i++) {
          obj = me._tooltips[i];

          if (!obj.added) {
            changed = true;
            html += '<div id="tooltip-' + obj.layerId + '">' + util.unescapeHtml(obj.html) + '</div>';
            obj.added = true;
          }
        }

        if (tooltip.isVisible()) {
          if (changed) {
            tooltip.setHtml(html);
          }

          tooltip.setPosition(me._cursorEvent.containerPoint);
        } else {
          tooltip.show(me._cursorEvent.containerPoint, html);
        }
      } else {
        tooltip.hide();
        tooltip.setHtml('');
      }
    }
    function removeOverData(layerId) {
      var remove = [],
        i;

      for (i = 0; i < overData.length; i++) {
        if (overData[i] === layerId) {
          remove.push(layerId);
        }
      }

      if (remove.length) {
        for (i = 0; i < remove.length; i++) {
          overData.splice(overData.indexOf(remove[i]), 1);
        }
      }
    }
    function removeTooltip(layerId) {
      var remove = [],
        i;

      for (i = 0; i < me._tooltips.length; i++) {
        var obj = me._tooltips[i];

        if (obj.layerId === layerId) {
          remove.push(obj);
        }
      }

      if (remove.length) {
        for (i = 0; i < remove.length; i++) {
          me._tooltips.splice(me._tooltips.indexOf(remove[i]), 1);
        }
      }
    }
    function updateCursor() {
      if (overData.length) {
        me._setCursor('pointer');
      } else {
        if (me.getContainer().style.cursor !== 'wait') {
          me._setCursor('');
        }
      }
    }

    me._tooltips = [];
    L.DomEvent.on(util.getChildElementsByClassName(me.getContainer(), 'leaflet-popup-pane')[0], 'mousemove', function(e) {
      L.DomEvent.stopPropagation(e);
      tooltip.hide();
    });
    me.on('mousemove', function(e) {
      me._cursorEvent = e;

      if (me._controllingCursor === 'map') {
        handle();

        for (var layerId in me._layers) {
          var layer = me._layers[layerId];

          if (typeof layer._handleMousemove === 'function' && layer._hasInteractivity !== false) {
            layer._handleMousemove(me._cursorEvent.latlng.wrap(), function(result) {
              if (result.results !== 'loading') {
                var l = result.layer,
                  leafletId = l._leaflet_id;

                removeOverData(leafletId);
                removeTooltip(leafletId);

                if (result.results) {
                  overData.push(leafletId);

                  if (l.options && l.options.tooltip) {
                    for (var i = 0; i < result.results.length; i++) {
                      var data = result.results[i],
                        tip;

                      if (typeof l.options.tooltip === 'function') {
                        tip = util.handlebars(l.options.tooltip(data));
                      } else if (typeof l.options.tooltip === 'string') {
                        tip = util.unescapeHtml(util.handlebars(l.options.tooltip, data));
                      }

                      if (tip && me._tooltips.indexOf(tip) === -1) {
                        me._tooltips.push({
                          html: tip,
                          layerId: leafletId
                        });
                      }
                    }
                  }
                }

                handle();
              }
            });
          }
        }
      }
    });
    me.on('mouseout', function() {
      tooltip.hide();
    });
  },
  _toLeaflet: function(config) {
    if (!config.div) {
      throw new Error('The map config object must have a div property');
    } else if (typeof config.div !== 'string' && typeof config.div !== 'object') {
      throw new Error('The map config object must be either a string or object');
    }

    if (config.baseLayers === false || (L.Util.isArray(config.baseLayers) && !config.baseLayers.length)) {
      config.baseLayers = [];
    } else {
      config.baseLayers = (function() {
        var visible = false;

        if (config.baseLayers && L.Util.isArray(config.baseLayers) && config.baseLayers.length) {
          for (var i = 0; i < config.baseLayers.length; i++) {
            var baseLayer = config.baseLayers[i];

            if (typeof baseLayer === 'string') {
              var name = baseLayer.split('-');

              if (name[1]) {
                baseLayer = util.clone(baselayerPresets[name[0]][name[1]]);
              } else {
                baseLayer = util.clone(baselayerPresets[name]);
              }
            }

            if (baseLayer.visible === true || typeof baseLayer.visible === 'undefined') {
              if (visible) {
                baseLayer.visible = false;
              } else {
                baseLayer.visible = true;
                visible = true;
              }
            } else {
              baseLayer.visible = false;
            }

            baseLayer.zIndex = 0;
            config.baseLayers[i] = baseLayer;
          }
        }

        if (visible) {
          return config.baseLayers;
        } else {
          var active = util.clone(baselayerPresets.nps.parkTiles);
          active.visible = true;
          active.zIndex = 0;
          return [
            active
          ];
        }
      })();
    }

    config.center = (function() {
      var c = config.center;

      if (c) {
        return new L.LatLng(c.lat, c.lng);
      } else {
        return new L.LatLng(39.06, -96.02);
      }
    })();

    if (typeof config.div === 'string') {
      config.div = document.getElementById(config.div);
    }

    if (config.layers && L.Util.isArray(config.layers) && config.layers.length) {
      config.overlays = config.layers;

      for (var j = 0; j < config.overlays.length; j++) {
        var overlay = config.overlays[j];

        if (typeof overlay === 'string') {
          overlay = config.overlays[j] = util.clone(overlayPresets[overlay]);
        }
      }
    } else if (!config.overlays || !L.Util.isArray(config.overlays)) {
      config.overlays = [];
    }

    if (typeof config.maxZoom !== 'number') {
      config.maxZoom = 19;
    }

    if (config.baseLayers.length !== 0 && config.maxZoom > config.baseLayers[0].maxZoom) {
      config.maxZoom = config.baseLayers[0].maxZoom;
    }

    delete config.layers;
    config.zoom = typeof config.zoom === 'number' ? config.zoom : 4;

    if (config.baseLayers.length !== 0) {
      if (config.baseLayers[0].minZoom > config.zoom) {
        config.zoom = config.baseLayers[0].minZoom;
      } else if (config.baseLayers[0].maxZoom < config.zoom) {
        config.zoom = config.baseLayers[0].maxZoom;
      }
    }

    return config;
  },
  _updateImproveLinks: function() {
    if (this.attributionControl) {
      var els = util.getChildElementsByClassName(this.attributionControl._container, 'improve-park-tiles');

      if (els && els.length) {
        var center = this.getCenter(),
          el = els[0],
          lat = center.lat.toFixed(5),
          lng = center.lng.toFixed(5),
          zoom = this.getZoom();

        el.href = (this._onNpsNetwork ? ('http://insidemaps.nps.gov/places/edit/#background=mapbox-satellite&map=' + zoom + '/' + lng + '/' + lat) : ('http://www.nps.gov/npmap/park-tiles/improve/#' + zoom + '/' + lat + '/' + lng)) + '&overlays=park-tiles-overlay';
      }
    }
  },
  closeModules: function() {
    var buttons = this._divModuleButtons.childNodes;

    this._buttonCloseModules.style.display = 'none';
    this._divWrapper.style.left = '0';
    this._divModules.style.display = 'none';

    for (var i = 1; i < buttons.length; i++) {
      var button = buttons[i];

      L.DomUtil.removeClass(button, 'active');
      button.style.display = 'inline-block';
    }

    this.invalidateSize();
  },
  showModule: function(title) {
    var divModules = this._divModules,
      childNodes = divModules.childNodes,
      modules = this.options.modules,
      i;

    title = title.replace(/_/g, ' ');

    for (i = 0; i < modules.length; i++) {
      var module = modules[i],
        visibility = 'none';

      if (module.title === title) {
        visibility = 'block';
      }

      module.visible = (visibility === 'block');
      childNodes[i].style.display = visibility;
    }

    divModules.style.display = 'block';
    this._divWrapper.style.left = util.getOuterDimensions(divModules).width + 'px';
    this.invalidateSize();

    for (i = 0; i < this._divModuleButtons.childNodes.length; i++) {
      var button = this._divModuleButtons.childNodes[i];

      if (i === 0) {
        button.style.display = 'inline-block';
      } else {
        if (modules.length > 1) {
          button.style.display = 'inline-block';
        } else {
          button.style.display = 'none';
        }
      }

      if (button.id.replace('npmap-modules-buttons_', '').replace(/_/g, ' ') === title) {
        L.DomUtil.addClass(button, 'active');
      } else {
        L.DomUtil.removeClass(button, 'active');
      }
    }

    // TODO: Fire module 'show' event.
  },
  showModules: function() {
    var buttons = this._divModuleButtons.childNodes;

    this._buttonCloseModules.style.display = 'inline-block';
    this._divModules.style.display = 'block';
    this._divWrapper.style.left = util.getOuterDimensions(this._divModules).width + 'px';

    for (var i = 1; i < buttons.length; i++) {
      buttons[i].style.display = 'inline-block';
    }

    this.invalidateSize();
  }
});

module.exports = function(config) {
  return new Map(config);
};
