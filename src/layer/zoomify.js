/* global L */

'use strict';

var util = require('../util/util');

var ZoomifyLayer = L.TileLayer.extend({
  options: {
    continuousWorld: true,
    tolerance: 1
  },
  getTileUrl: function (tilePoint) {
    return this._url + 'TileGroup' + this._getTileGroup(tilePoint) + '/' + this._map.getZoom() + '-' + tilePoint.x + '-' + tilePoint.y + '.jpg';
  },
  initialize: function (options) {
    var imageSize, tileSize;

    options = L.setOptions(this, options);
    util.strict(options.height, 'number');
    util.strict(options.url, 'string');
    util.strict(options.width, 'number');
    this._url = options.url;
    imageSize = new L.Point(options.width, options.height);
    tileSize = options.tileSize;
    this._imageSize = [
      imageSize
    ];
    this._gridSize = [
      this._getGridSize(imageSize)
    ];

    while (parseInt(imageSize.x, 10) > tileSize || parseInt(imageSize.y, 10) > tileSize) {
      imageSize = imageSize.divideBy(2).floor();
      this._imageSize.push(imageSize);
      this._gridSize.push(this._getGridSize(imageSize));
    }

    this._imageSize.reverse();
    this._gridSize.reverse();
    this.options.maxZoom = this._gridSize.length - 1;
  },
  onAdd: function (map) {
    var mapSize = map.getSize();
    var zoom = this._getBestFitZoom(mapSize);
    var imageSize = this._imageSize[zoom];
    var center = map.options.crs.pointToLatLng(new L.Point(imageSize.x / 2, (imageSize.y + (map.getContainer().parentNode.parentNode.childNodes[0].style.display === 'block' ? 25 : 0)) / 2), zoom);

    L.TileLayer.prototype.onAdd.call(this, map);
    map.options.center = center;
    map.options.maxZoom = this.options.maxZoom;
    map.options.zoom = zoom;
    map.setView(center, zoom, false);
    this.fire('ready');
    this.readyFired = true;
  },
  _addTile: function (tilePoint, container) {
    var tile = this._getTile();
    var tilePos = this._getTilePos(tilePoint);
    var tileSize = this.options.tileSize;
    var zoom = this._map.getZoom();
    var imageSize = this._imageSize[zoom];
    var gridSize = this._gridSize[zoom];

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
    var tolerance = this.options.tolerance;
    var zoom = this._imageSize.length - 1;
    var imageSize;

    while (zoom) {
      imageSize = this._imageSize[zoom];

      if (((imageSize.x * tolerance) < mapSize.x) && ((imageSize.y * tolerance) < mapSize.y)) {
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
    var num = 0;
    var zoom = this._map.getZoom();
    var gridSize;

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

module.exports = function (options) {
  options = options || {};

  if (!options.type) {
    options.type = 'zoomify';
  }

  return new ZoomifyLayer(options);
};
