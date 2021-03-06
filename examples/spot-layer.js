var NPMap = {
  baseLayers: [
    'mapbox-satelliteLabels'
  ],
  div: 'map',
  homeControl: false,
  overlays: [{
    // id: '0ATnNuieqRyM7RYsOFdaHoTNOtoFy9Xq4',
    id: 0n1Y65XVrsTWYynEi0KEyCm1oxol448LB,
    popup: {
      description: '{{dateTime}}',
      title: '{{messengerName}}'
    },
    styles: {
      point: {
        'marker-symbol': 'dog-park'
      }
    },
    type: 'spot',
    zoomToBounds: true
  }]
};

(function () {
  var s = document.createElement('script');
  s.src = '{{ path }}/npmap-bootstrap.js';
  document.body.appendChild(s);
})();
