var zxy,marker;

var NPMap = {
  div: 'map',
  locateControl: true
};

// If there is a hash, use it to draw a point and center/zoom the map
if (window.location.hash) {
  // The hash comes back as #{z}/{x}/{y} use substr(1) to drop that initial #
  zxy = window.location.hash.substr(1).split('/');

  // Add the marker as a geojson point
  marker = {
    'type': 'FeatureCollection',
    'features': [{
      'type': 'Feature',
      'properties': {},
      'geometry': {
        'type': 'Point',
        'coordinates': [zxy[2], zxy[1]]
      }
    }]
  };

  // Set the map center
  NPMap.center = {
    'lat': zxy[1],
    'lng': zxy[2]
  };

  // Set the map zoom
  NPMap.zoom = parseInt(zxy[0], 10);

  // Add the marker GeoJSON as an overlay
  NPMap.overlays = [{
    type: 'geojson',
    data: window.location.hash && marker
  }];
}

(function() {
  var s = document.createElement('script');
  s.src = '{{ path }}/npmap-bootstrap.js';
  document.body.appendChild(s);
})();
