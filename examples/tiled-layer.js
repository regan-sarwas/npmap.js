var NPMap = {
  baseLayers: false,
  div: 'map',
  maxZoom: 13,
  overlays: [{
    attribution: '&copy; <a href="http://openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    type: 'tiled',
    url: 'http://{s}.tile.osm.org/{z}/{x}/{y}.png'
  }]
};

(function () {
  var s = document.createElement('script');
  s.src = '{{ path }}/npmap-bootstrap.js';
  document.body.appendChild(s);
})();
