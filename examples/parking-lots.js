var NPMap = {
  div: 'map',
  hashControl: true,
  locateControl: true
};

(function () {
  var s = document.createElement('script');
  s.src = '{{ path }}/npmap-bootstrap.js';
  document.body.appendChild(s);
})();
