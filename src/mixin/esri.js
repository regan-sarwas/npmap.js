/* global L */
/* jshint camelcase: false */

'use strict';

var reqwest = require('reqwest');

module.exports = {
  _boundsToExtent: function(bounds) {
    var ne = bounds.getNorthEast(),
      sw = bounds.getSouthWest();

    return {
      spatalReference: {
        wkid: 4326
      },
      xmax: ne.lng,
      xmin: sw.lng,
      ymax: ne.lat,
      ymin: sw.lat
    };
  },
  _cleanUrl: function(url) {
    url = L.Util.trim(url);

    if (url[url.length - 1] !== '/') {
      url += '/';
    }

    return url;
  },
  _getMetadata: function() {
    // TODO: Implement timeout and set `loadError` property on layer to true if there is an error.
    var me = this;

    reqwest({
      success: function(response) {
        if (!response.error) {
          var capabilities = response.capabilities;

          if (typeof capabilities === 'string') {
            if (capabilities.toLowerCase().indexOf('query') === -1) {
              me._hasInteractivity = false;
            }
          }

          me._metadata = response;
          //me.fire('metadata', response);
        }
      },
      type: 'jsonp',
      url: me._serviceUrl + '?f=json'
    });
  },
  _handleClick: function(latLng, callback) {
    var me = this;

    me.identify(latLng, function(response) {
      if (response) {
        var results = response.results;

        if (results && results.length) {
          var obj = {
            layer: me,
            subLayers: []
          };

          for (var i = 0; i < results.length; i++) {
            var result = results[i],
              active;

            for (var j = 0; j < obj.subLayers.length; j++) {
              if (obj.subLayers[j].name === result.layerName) {
                active = obj.subLayers[j];
                break;
              }
            }

            if (active) {
              active.results.push(result.attributes);
            } else {
              var template = '{{' + result.displayFieldName + '}}';

              obj.subLayers.push({
                name: result.layerName,
                popup: {
                  description: {
                    format: 'table'
                  },
                  more: template,
                  title: template
                },
                results: [
                  result.attributes
                ]
              });
            }
          }

          callback(obj);
        } else {
          callback(null);
        }
      } else {
        callback(null);
      }
    });
  },
  _updateAttribution: function() {
    var map = this._map,
      bounds = map.getBounds(),
      include = [],
      zoom = map.getZoom();

    if (this.options.attribution) {
      this._map.attributionControl.removeAttribution(this.options.attribution);
    }

    for (var i = 0; i < this._dynamicAttributionData.length; i++) {
      var contributor = this._dynamicAttributionData[i];

      for (var j = 0; j < contributor.coverageAreas.length; j++) {
        var coverageArea = contributor.coverageAreas[j],
          coverageBounds = coverageArea.bbox;

        if (zoom >= coverageArea.zoomMin && zoom <= coverageArea.zoomMax) {
          if (bounds.intersects(L.latLngBounds(L.latLng(coverageBounds[0], coverageBounds[3]), L.latLng(coverageBounds[2], coverageBounds[1])))) {
            include.push(contributor.attribution);
            break;
          }
        }
      }
    }

    if (include.length) {
      this.options.attribution = include.join(', ');
      map.attributionControl.addAttribution(this.options.attribution);
    }
  },
  identify: function(latLng, callback) {
    var map = this._map,
      size = map.getSize(),
      params = {
        f: 'json',
        geometry: JSON.stringify({
          spatialReference: {
            wkid: 4326
          },
          x: latLng.lng,
          y: latLng.lat
        }),
        geometryType: 'esriGeometryPoint',
        imageDisplay: size.x + ',' + size.y + ',96',
        layers: 'visible:' + this.getLayers().split(':')[1],
        mapExtent: JSON.stringify(this._boundsToExtent(map.getBounds())),
        returnGeometry: false,
        sr: '4326',
        tolerance: 5
      };

    reqwest({
      data: params,
      error: function() {
        callback(null);
      },
      success: function(response) {
        callback(response);
      },
      type: 'jsonp',
      url: this._serviceUrl + 'identify'
    });
  }
};
