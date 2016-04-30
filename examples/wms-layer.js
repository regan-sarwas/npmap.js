var NPMap = {
  div: 'map',
  hooks: {
    init: function (callback) {
      if (window.location.protocol === 'https:') {
        NPMap.config.L.notify.warning('The WMS layer is not available via https, so it won\'t load properly in this example.');
      }

      callback();
    },
    preinit: function (callback) {
      if (!window.location.protocol === 'https:') {
        NPMap.config.overlays = [{
          attribution: 'NOAA',
          format: 'image/png',
          layers: '0',
          transparent: true,
          type: 'wms',
          url: 'http://gis.srh.noaa.gov/arcgis/services/RIDGERadar/MapServer/WMSServer'
        }];
      }

      callback();
    }
  }
};

(function () {
  var s = document.createElement('script');
  s.src = '{{ path }}/npmap-bootstrap.js';
  document.body.appendChild(s);
})();
