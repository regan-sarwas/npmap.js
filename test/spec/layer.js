/* global afterEach, beforeEach, describe, expect, it, L, sinon */

describe('L.npmap.layer', function() {
  var element, server;

  afterEach(function() {
    element = null;
    server.restore();
  });
  beforeEach(function() {
    element = document.createElement('div');
    server = sinon.fakeServer.create();
  });
  describe('arcgisserver', function() {
    it('creates a dynamic layer and adds it to the map', function() {
      var map = L.npmap.map({
        baseLayers: false,
        div: element,
        overlays: [{
          tiled: false,
          type: 'arcgisserver',
          url: 'http://sampleserver6.arcgisonline.com/arcgis/rest/services/Hurricanes/MapServer'
        }]
      });

      expect(map.options.overlays[0].L).to.be.ok();
    });
    it('creates a tiled layer and adds it to the map', function() {
      var map = L.npmap.map({
        baseLayers: false,
        div: element,
        overlays: [{
          tiled: true,
          type: 'arcgisserver',
          url: 'http://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer'
        }]
      });

      expect(map.options.overlays[0].L).to.be.ok();
    });
  });
  describe('bing', function() {

  });
  describe('cartodb', function() {

  });
  describe('csv', function() {

  });
  describe('geojson', function() {

  });
  describe('github', function() {

  });
  describe('kml', function() {

  });
  describe('mapbox', function() {

  });
  describe('spot', function() {

  });
  describe('tiled', function() {

  });
  describe('wms', function() {

  });
  describe('zoomify', function() {

  });
});
