var NPMap =  {
  baseLayers: [
    'nps-parkTiles',
    'nps-parkTilesImagery',
    'nps-parkTilesSlate',
    'nps-lightStreets',
    'nps-neutralTerrain',
    'nps-satelliteNight',
    'bing-aerial',
    'bing-aerialLabels',
    'bing-roads',
    'cartodb-darkMatter',
    'cartodb-darkMatterNoLabels',
    'cartodb-positron',
    'cartodb-positronNoLabels',
    'esri-gray',
    'esri-imagery',
    'esri-nationalGeographic',
    'esri-oceans',
    'esri-streets',
    'esri-topographic',
    'mapbox-dark',
    'mapbox-emerald',
    'mapbox-highContrast',
    'mapbox-landsatLive',
    'mapbox-light',
    'mapbox-outdoors',
    'mapbox-pencil',
    'mapbox-runBikeAndHike',
    'mapbox-satellite',
    'mapbox-satelliteLabels',
    'mapbox-streets',
    'mapbox-terrain',
    'openstreetmap',
    'stamen-terrain',
    'stamen-toner',
    'stamen-watercolor'
  ],
  div: 'map'
};

(function () {
  var s = document.createElement('script');
  s.src = '{{ path }}/npmap-bootstrap.js';
  document.body.appendChild(s);
})();
