var NPMap = {
  baseLayers: [{
    attribution: 'Harpers Ferry Center',
    height: 6738,
    type: 'zoomify',
    url: 'http://www.nps.gov/parkmaps/yell/img/',
    width: 5069
  }],
  div: 'map'
};

(function () {
  var s = document.createElement('script');
  s.src = '{{ path }}/npmap-bootstrap.js';
  document.body.appendChild(s);
})();
