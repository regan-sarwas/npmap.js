module.exports = (function() {
  return {
    encode: function(a) {
      var b = '',
        c, d, f, g, h, e, k = 0;
      do c = a.charCodeAt(k++), d = a.charCodeAt(k++), f = a.charCodeAt(k++), g = c >> 2, c = (c & 3) << 4 | d >> 4, h = (d & 15) << 2 | f >> 6, e = f & 63, isNaN(d) ? h = e = 64 : isNaN(f) && (e = 64), b = b + 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/='.charAt(g) + 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/='.charAt(c) + 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/='.charAt(h) + 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/='.charAt(e); while (k < a.length);
      return b;
    },
    decode: function(a) {
      var b = '',
        c, d, f, g, h, e = 0;
      a = a.replace(/[^A-Za-z0-9\+\/\=]/g, '');
      do c = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/='.indexOf(a.charAt(e++)), d = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/='.indexOf(a.charAt(e++)), g = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/='.indexOf(a.charAt(e++)), h = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/='.indexOf(a.charAt(e++)), c = c << 2 | d >> 4, d = (d & 15) << 4 | g >> 2, f = (g & 3) << 6 | h, b += String.fromCharCode(c), 64 != g && (b += String.fromCharCode(d)), 64 != h && (b += String.fromCharCode(f)); while (e < a.length);
      return b;
    }
  };
})();
