var NPMap = {
  center: {
    lat: 44.599,
    lng: -110.554
  },
  div: 'map',
  overlays: [{
    preset: 'nps-places-pois'
  }],
  zoom: 9
};

(function () {
  var s = document.createElement('script');
  s.src = '{{ path }}/npmap-bootstrap.js';
  document.body.appendChild(s);
})();
