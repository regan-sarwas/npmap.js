/* globals L */

var reqwest = require('reqwest'),
  tileMath = require('../util/tilemath');

module.exports = {
  _cache: {},
  _getTileCoords: function(latLng) {
    var zoom = this._map.getZoom();

    return {
      x: tileMath.long2tile(latLng.lng, zoom),
      y: tileMath.lat2tile(latLng.lat, zoom),
      z: zoom
    };
  },
  _getTileGrid: function (url, latLng, callback) {
    if (this._cache[url]) {
      var response = this._cache[url];

      if (response === 'empty') {
        callback(null, null);
      } else if (response === 'loading') {
        callback('loading', this._getTileGridPoint(latLng, response));
      } else {
        callback(response, this._getTileGridPoint(latLng, response));
      }
    } else {
      var me = this;

      me._cache[url] = 'loading';
      reqwest({
        error: function() {
          me._cache[url] = 'empty';
          callback(null, null);
        },
        success: function(response) {
          if (response) {
            me._cache[url] = response;
            callback(response, me._getTileGridPoint(latLng, response));
          } else {
            me._cache[url] = 'empty';
            callback(null, null);
          }
        },
        timeout: 2000,
        type: 'jsonp',
        url: url
      });
    }
  },
  _getTileGridPoint: function(latLng, response) {
    var map = this._map;

    if (map && typeof response === 'object') {
      var point = map.project(latLng.wrap()),
        resolution = 4,
        tileSize = 256,
        max = map.options.crs.scale(map.getZoom()) / tileSize;

      return (response.data[response.keys[this._utfDecode(response.grid[Math.floor((point.y - (((Math.floor(point.y / tileSize) + max) % max) * tileSize)) / resolution)].charCodeAt(Math.floor((point.x - (((Math.floor(point.x / tileSize) + max) % max) * tileSize)) / resolution)))]]);
    }

    return null;
  },
  _getTileGridUrl: function(latLng) {
    var grids = this.options.grids,
      gridTileCoords = this._getTileCoords(latLng);

    return L.Util.template(grids[Math.floor(Math.abs(gridTileCoords.x + gridTileCoords.y) % grids.length)], gridTileCoords);
  },
  _handleClick: function(latLng, callback) {
    this._getGridData(latLng, callback);
  },
  _handleMousemove: function (latLng, callback) {
    this._getGridData(latLng, callback);
  },
  _utfDecode: function(key) {
    if (key >= 93) {
      key--;
    }

    if (key >= 35) {
      key--;
    }

    return key - 32;
  }
};
