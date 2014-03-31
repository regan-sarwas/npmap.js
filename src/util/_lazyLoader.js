module.exports = function(i, j) {
  function k(a) {
    a = a.toLowerCase();
    var b = a.indexOf('js');
    a = a.indexOf('css');
    return -1 === b && -1 === a ? !1 : b > a ? 'js' : 'css';
  }

  function m(a) {
    var b = document.createElement('link');
    b.href = a;
    b.rel = 'stylesheet';
    b.type = 'text/css';
    b.onload = c;
    b.onreadystatechange = function() {
      ('loaded' === this.readyState || 'complete' === this.readyState) && c()
    };
    document.getElementsByTagName('head')[0].appendChild(b);
  }

  function f(a) {
    try {
      document.styleSheets[a].cssRules ? c() : document.styleSheets[a].rules && document.styleSheets[a].rules.length ? c() : setTimeout(function() {
        f(a);
      }, 250)
    } catch (b) {
      setTimeout(function() {
        f(a);
      }, 250)
    }
  }

  function c() {
    g--;
    0 === g && j && j()
  }
  for (var g = 0, d, l = document.styleSheets.length - 1, h = 0; h < i.length; h++)
    if (g++, d = i[h], 'css' === k(d) && (m(d), l++, !window.opera && -1 === navigator.userAgent.indexOf('MSIE') && f(l)), 'js' === k(d)) {
      var e = document.createElement('script');
      e.type = 'text/javascript';
      e.src = d;
      e.onload = c;
      document.getElementsByTagName('head')[0].appendChild(e);
    }
};
