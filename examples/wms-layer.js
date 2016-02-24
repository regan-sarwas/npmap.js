var NPMap = {
  div: 'map',
  overlays: [{
    attribution: 'NOAA',
    format: 'image/png',
    layers: '0',
    transparent: true,
    type: 'wms',
    url: 'http://gis.srh.noaa.gov/arcgis/services/RIDGERadar/MapServer/WMSServer'
  }]
};

(function () {
  var s = document.createElement('script');
  s.src = '{{ path }}/npmap-bootstrap.js';
  document.body.appendChild(s);
})();
