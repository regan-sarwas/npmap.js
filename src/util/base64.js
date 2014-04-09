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



/*
(function(){function k(f){var a,b,d,e,c,h;d=f.length;b=0;for(a="";b<d;){e=f.charCodeAt(b++)&255;if(b==d){a+=g.charAt(e>>2);a+=g.charAt((e&3)<<4);a+="==";break}c=f.charCodeAt(b++);if(b==d){a+=g.charAt(e>>2);a+=g.charAt((e&3)<<4|(c&240)>>4);a+=g.charAt((c&15)<<2);a+="=";break}h=f.charCodeAt(b++);a+=g.charAt(e>>2);a+=g.charAt((e&3)<<4|(c&240)>>4);a+=g.charAt((c&15)<<2|(h&192)>>6);a+=g.charAt(h&63)}return a}function l(f){var a,b,d,e,c;e=f.length;d=0;for(c="";d<e;){do a=h[f.charCodeAt(d++)&255];while(d<e&&-1==a);if(-1==a)break;do b=h[f.charCodeAt(d++)&255];while(d<e&&-1==b);if(-1==b)break;c+=String.fromCharCode(a<<2|(b&48)>>4);do{a=f.charCodeAt(d++)&255;if(61==a)return c;a=h[a]}while(d<e&&-1==a);if(-1==a)break;c+=String.fromCharCode((b&15)<<4|(a&60)>>2);do{b=f.charCodeAt(d++)&255;if(61==b)return c;b=h[b]}while(d<e&&-1==b);if(-1==b)break;c+=String.fromCharCode((a&3)<<6|b)}return c}var g="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/",h=[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,62,-1,-1,-1,63,52,53,54,55,56,57,58,59,60,61,-1,-1,-1,-1,-1,-1,-1,0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,-1,-1,-1,-1,-1,-1,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,-1,-1,-1,-1,-1];window.btoa||(window.btoa=k);window.atob||(window.atob=l)})();
*/