/* global L */

'use strict'

var util = require('../util/util');

var ZoomifyLayer = L.TileLayer.extend({
  options: {
    continuousWorld: true,
    tolerance: 0.8
  },
  initialize: function(options) {
    var imageSize, tileSize;

    options = L.setOptions(this, options);
    util.strict(options.height, 'number');
    util.strict(options.url, 'string');
    util.strict(options.width, 'number');
    this._url = options.url;
    imageSize = new L.Point(options.width, options.height);
    tileSize = options.tileSize;
    this._imageSize = [imageSize];
    this._gridSize = [this._getGridSize(imageSize)];

    while (parseInt(imageSize.x, 10) > tileSize || parseInt(imageSize.y, 10) > tileSize) {
      imageSize = imageSize.divideBy(2).floor();
      this._imageSize.push(imageSize);
      this._gridSize.push(this._getGridSize(imageSize));
    }

    this._imageSize.reverse();
    this._gridSize.reverse();
    this.options.maxZoom = this._gridSize.length - 1;
  },
  getTileUrl: function (tilePoint) {
    return this._url + 'TileGroup' + this._getTileGroup(tilePoint) + '/' + this._map.getZoom() + '-' + tilePoint.x + '-' + tilePoint.y + '.jpg';
  },
  onAdd: function(map) {
    var mapSize = map.getSize(),
      zoom = this._getBestFitZoom(mapSize),
      imageSize = this._imageSize[zoom],
      center = map.options.crs.pointToLatLng(L.point(imageSize.x / 2, imageSize.y / 2), zoom);

    L.TileLayer.prototype.onAdd.call(this, map);
    map.options.center = center;
    map.options.zoom = zoom;
    map.setView(center, zoom, true);
  },
  _addTile: function (tilePoint, container) {
    var tilePos = this._getTilePos(tilePoint),
      tile = this._getTile(),
      zoom = this._map.getZoom(),
      imageSize = this._imageSize[zoom],
      gridSize = this._gridSize[zoom],
      tileSize = this.options.tileSize;

    if (tilePoint.x === gridSize.x - 1) {
      tile.style.width = imageSize.x - (tileSize * (gridSize.x - 1)) + 'px';
    }

    if (tilePoint.y === gridSize.y - 1) {
      tile.style.height = imageSize.y - (tileSize * (gridSize.y - 1)) + 'px';
    }

    L.DomUtil.setPosition(tile, tilePos, L.Browser.chrome || L.Browser.android23);
    this._tiles[tilePoint.x + ':' + tilePoint.y] = tile;
    this._loadTile(tile, tilePoint);

    if (tile.parentNode !== this._tileContainer) {
      container.appendChild(tile);
    }
  },
  _getBestFitZoom: function (mapSize) {
    var tolerance = this.options.tolerance,
      zoom = this._imageSize.length - 1,
      imageSize;

    while (zoom) {
      imageSize = this._imageSize[zoom];

      if (imageSize.x * tolerance < mapSize.x && imageSize.y * tolerance < mapSize.y) {
        return zoom;
      }

      zoom--;
    }

    return zoom;
  },
  _getGridSize: function (imageSize) {
    var tileSize = this.options.tileSize;

    return L.point(Math.ceil(imageSize.x / tileSize), Math.ceil(imageSize.y / tileSize));
  },
  _getTileGroup: function (tilePoint) {
    var zoom = this._map.getZoom(),
      num = 0,
      gridSize;

    for (var z = 0; z < zoom; z++) {
      gridSize = this._gridSize[z];
      num += gridSize.x * gridSize.y;
    }

    num += tilePoint.y * this._gridSize[zoom].x + tilePoint.x;

    return Math.floor(num / 256);
  },
  _tileShouldBeLoaded: function (tilePoint) {
    var gridSize = this._gridSize[this._map.getZoom()];

    return (tilePoint.x >= 0 && tilePoint.x < gridSize.x && tilePoint.y >= 0 && tilePoint.y < gridSize.y);
  }
});

module.exports = function(options) {
  return new ZoomifyLayer(options);
};
