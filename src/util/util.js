/* global L */

'use strict';

var handlebars = require('handlebars'),
  reqwest = require('reqwest');

/*
handlebars.registerHelper('if', function(v1, operator, v2, opts) {
  var isTrue = false;

  switch (operator) {
  case '===':
    isTrue = v1 === v2;
    break;
  case '!==':
    isTrue = v1 !== v2;
    break;
  case '<':
    isTrue = v1 < v2;
    break;
  case '<=':
    isTrue = v1 <= v2;
    break;
  case '>':
    isTrue = v1 > v2;
    break;
  case '>=':
    isTrue = v1 >= v2;
    break;
  case '||':
    isTrue = v1 || v2;
    break;
  case '&&':
    isTrue = v1 && v2;
    break;
  }

  return isTrue ? opts.fn(this) : opts.inverse(this);
});
*/
handlebars.registerHelper('toLowerCase', function(str) {
  return str.toLowerCase();
});

if (!Array.prototype.indexOf) {
  Array.prototype.indexOf = function (searchElement, fromIndex) {
    if ( this === undefined || this === null ) {
      throw new TypeError( '"this" is null or not defined' );
    }

    var length = this.length >>> 0; // Hack to convert object.length to a UInt32

    fromIndex = +fromIndex || 0;

    if (Math.abs(fromIndex) === Infinity) {
      fromIndex = 0;
    }

    if (fromIndex < 0) {
      fromIndex += length;
      if (fromIndex < 0) {
        fromIndex = 0;
      }
    }

    for (;fromIndex < length; fromIndex++) {
      if (this[fromIndex] === searchElement) {
        return fromIndex;
      }
    }

    return -1;
  };
}

module.exports = {
  /**
   * DEPRECATED: Builds an HTML attribute table.
   */
  _buildAttributeTable: function(name, data) {
    var div = L.DomUtil.create('div', 'result');

    if (!L.Util.isArray(data)) {
      data = [data];
    }

    for (var index in data) {
      var dataLayer = data[index],
        divTitle = L.DomUtil.create('div', 'title'),
        tableResults = L.DomUtil.create('table', null),
        tableResultsBody = L.DomUtil.create('tbody', null);

      divTitle.textContent = name;

      for (var fieldName in dataLayer) {
        var tableData = L.DomUtil.create('td', null),
          tableField = L.DomUtil.create('td', null),
          tableRow = L.DomUtil.create('tr', null);

        tableField.style.paddingRight = '10px';
        tableField.textContent = fieldName;
        tableRow.appendChild(tableField);
        tableData.textContent = dataLayer[fieldName];
        tableRow.appendChild(tableData);
        tableResultsBody.appendChild(tableRow);
      }

      tableResults.appendChild(tableResultsBody);
      div.appendChild(divTitle);
      div.appendChild(tableResults);
    }

    return div;
  },
  _checkDisplay: function(node, changed) {
    if (node.style && node.style.display === 'none') {
      changed.push(node);
      node.style.display = 'block';
    }
  },
  _getAutoPanPaddingTopLeft: function(el) {
    var containers = this.getChildElementsByClassName(el, 'leaflet-top');

    return [this.getOuterDimensions(containers[0]).width + 20, this.getOuterDimensions(containers[1]).height + 20];
  },
  _lazyLoader: function(i,j){function k(a){var a=a.toLowerCase(),b=a.indexOf("js"),a=a.indexOf("css");return-1==b&&-1==a?!1:b>a?"js":"css"}function m(a){var b=document.createElement("link");b.href=a;b.rel="stylesheet";b.type="text/css";b.onload=c;b.onreadystatechange=function(){("loaded"==this.readyState||"complete"==this.readyState)&&c()};document.getElementsByTagName("head")[0].appendChild(b)}function f(a){try{document.styleSheets[a].cssRules?c():document.styleSheets[a].rules&&document.styleSheets[a].rules.length?c():setTimeout(function(){f(a)},250)}catch(b){setTimeout(function(){f(a)},250)}}function c(){g--;0==g&&j&&j()}for(var g=0,d,l=document.styleSheets.length-1,h=0;h<i.length;h++)if(g++,d=i[h],"css"==k(d)&&(m(d),l++,!window.opera&&-1==navigator.userAgent.indexOf("MSIE")&&f(l)),"js"==k(d)){var e=document.createElement("script");e.type="text/javascript";e.src=d;e.onload=c;document.getElementsByTagName("head")[0].appendChild(e)}},
  appendCssFile: function(urls, callback) {
    if (typeof urls === 'string') {
      urls = [
        urls
      ];
    }

    this._lazyLoader(urls, callback);
  },
  appendJsFile: function(urls, callback) {
    if (typeof urls === 'string') {
      urls = [
        urls
      ];
    }

    this._lazyLoader(urls, callback);
  },
  base64: (function(){return{encode:function(a){var b="",c,d,f,g,h,e,k=0;do c=a.charCodeAt(k++),d=a.charCodeAt(k++),f=a.charCodeAt(k++),g=c>>2,c=(c&3)<<4|d>>4,h=(d&15)<<2|f>>6,e=f&63,isNaN(d)?h=e=64:isNaN(f)&&(e=64),b=b+"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=".charAt(g)+"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=".charAt(c)+"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=".charAt(h)+"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=".charAt(e);while(k<a.length);return b},decode:function(a){var b="",c,d,f,g,h,e=0;a=a.replace(/[^A-Za-z0-9\+\/\=]/g,"");do c="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=".indexOf(a.charAt(e++)),d="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=".indexOf(a.charAt(e++)),g="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=".indexOf(a.charAt(e++)),h="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=".indexOf(a.charAt(e++)),c=c<<2|d>>4,d=(d&15)<<4|g>>2,f=(g&3)<<6|h,b+=String.fromCharCode(c),64!=g&&(b+=String.fromCharCode(d)),64!=h&&(b+=String.fromCharCode(f));while(e<a.length);return b}}})(),
  buildUrl: function(base, params) {
    var returnArray = [];

    if (params) {
      returnArray.push(base + '?');
    } else {
      return base;
    }

    for (var param in params) {
      returnArray.push(encodeURIComponent(param));
      returnArray.push('=');
      returnArray.push(encodeURIComponent(params[param]));
      returnArray.push('&');
    }

    returnArray.pop();
    return returnArray.join('');
  },
  dataToHtml: function(config, data, type) {
    var html, options;

    type = type || 'popup';
    options = config[type];

    if (options) {
      switch (typeof options) {
      case 'function':
        html = options(data);
        break;
      case 'object':
        var div = document.createElement('div');

        if (options.title) {
          var title = L.DomUtil.create('div', 'title', div);

          if (typeof options.title === 'function') {
            title.innerHTML = this.unescapeHtml(options.title(data));
          } else if (typeof options.title === 'string') {
            title.innerHTML = this.unescapeHtml(this.handlebars(options.title, data));
          }
        }

        if (options.description) {
          var description = L.DomUtil.create('div', 'content', div);

          if (typeof options.description === 'function') {
            description.innerHTML = this.unescapeHtml(options.description(data));
          } else if (typeof options.description === 'string') {
            description.innerHTML = this.unescapeHtml(this.handlebars(options.description, data));
          }
        }

        if (options.actions && L.Util.isArray(options.actions)) {
          var actions = L.DomUtil.create('div', 'actions', div),
            ul = L.DomUtil.create('ul', null, actions),
            a, action, li;

          for (var i = 0; i < options.actions.length; i++) {
            action = options.actions[i];
            li = L.DomUtil.create('li', null, ul);
            a = L.DomUtil.create('a', null, li);
            a.innerHTML = action.title;
            L.DomEvent.addListener(a, 'click', action.handler);
          }
        }

        if (typeof options.width === 'number') {
          div.style.width = options.width + 'px';
        }

        html = div;
        break;
      case 'string':
        html = this.handlebars(options, data);
        break;
      }
    } else if (type === 'popup') {
      var count = 0,
        name = config.name || 'Layer';

      for (var prop in data) {
        count++;
        break;
      }

      if (count) {
        html = this._buildAttributeTable(name, data);
      }
    }

    return html;
  },
  dataToList: function(data) {
    var dl = document.createElement('dl');

    for (var prop in data) {
      var dd = document.createElement('dd'),
        dt = document.createElement('dt');

      dt.innerHTML = prop;
      dd.innerHTML = data[prop];
      dl.appendChild(dt);
      dl.appendChild(dd);
    }

    return dl;
  },
  dataToTable: function(data) {
    var table = document.createElement('table'),
      tableBody = document.createElement('tbody');

    table.appendChild(tableBody);

    for (var prop in data) {
      var tdProperty = document.createElement('td'),
        tdValue = document.createElement('td'),
        tr = document.createElement('tr');

      tdProperty.style.paddingRight = '10px';
      tdProperty.innerHTML = prop;
      tdValue.innerHTML = data[prop];
      tr.appendChild(tdProperty);
      tr.appendChild(tdValue);
      tableBody.appendChild(tr);
    }

    return table;
  },
  escapeHtml: function(unsafe) {
    return unsafe
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  },
  getChildElementsByClassName: function(parentNode, className) {
    var children = parentNode.childNodes,
      matches = [];

    function recurse(el) {
      var grandChildren = el.children;

      if (typeof el.className === 'string' && el.className.indexOf(className) !== -1) {
        var classNames = el.className.split(' ');

        for (var k = 0; k < classNames.length; k++) {
          if (classNames[k] === className) {
            matches.push(el);
            break;
          }
        }
      }

      if (grandChildren && grandChildren.length) {
        for (var j = 0; j < grandChildren.length; j++) {
          recurse(grandChildren[j]);
        }
      }
    }

    for (var i = 0; i < children.length; i++) {
      recurse(children[i]);
    }

    return matches;
  },
  getChildElementsByNodeName: function(parentNode, nodeName) {
    var children = parentNode.childNodes,
      matches = [];

    nodeName = nodeName.toLowerCase();

    function recurse(el) {
      var grandChildren = el.children;

      if (typeof el.nodeName === 'string' && el.nodeName.toLowerCase() === nodeName) {
        matches.push(el);
      }

      if (grandChildren && grandChildren.length) {
        for (var j = 0; j < grandChildren.length; j++) {
          recurse(grandChildren[j]);
        }
      }
    }

    for (var i = 0; i < children.length; i++) {
      recurse(children[i]);
    }

    return matches;
  },
  getElementsByClassName: function(className) {
    var matches = [],
      regex = new RegExp('(^|\\s)' + className + '(\\s|$)'),
      tmp = document.getElementsByTagName('*');
    
    for (var i = 0; i < tmp.length; i++) {
      if (regex.test(tmp[i].className)) {
        matches.push(tmp[i]);
      }
    }

    return matches;
  },
  getEventObject: function(e) {
    if (!e) {
      e = window.event;
    }

    return e;
  },
  getEventObjectTarget: function(e) {
    var target;

    if (e.target) {
      target = e.target;
    } else {
      target = e.srcElement;
    }

    if (target.nodeType === 3) {
      target = target.parentNode;
    }

    return target;
  },
  getNextSibling: function(el) {
    do {
      el = el.nextSibling;
    } while (el && el.nodeType != 1);

    return el;
  },
  getOffset: function(el) {
    for (var lx = 0, ly = 0; el !== null; lx += el.offsetLeft, ly += el.offsetTop, el = el.offsetParent);

    return {left: lx, top: ly};
  },
  getOuterDimensions: function(el) {
    var height = 0,
      width = 0;

    if (el) {
      var changed = [],
        parentNode = el.parentNode;

      this._checkDisplay(el, changed);

      if (el.id !== 'npmap' && parentNode) {
        this._checkDisplay(parentNode, changed);

        while (parentNode.id && parentNode.id !== 'npmap' && parentNode.id !== 'npmap-map') {
          parentNode = parentNode.parentNode;

          if (parentNode) {
            this._checkDisplay(parentNode, changed);
          }
        }
      }

      height = el.offsetHeight;
      width = el.offsetWidth;

      changed.reverse();

      for (var i = 0; i < changed.length; i++) {
        changed[i].style.display = 'none';
      }
    }

    return {height: height, width: width};
  },
  getOuterHtml: function(el) {
    if (!el || !el.tagName) {
      return '';
    }

    var div = document.createElement('div'),
      ax, txt;

    div.appendChild(el.cloneNode(false));
    txt = div.innerHTML;
    ax = txt.indexOf('>') + 1;
    txt = txt.substring(0, ax) + el.innerHTML + txt.substring(ax);
    div = null;
    return txt;
  },
  getPosition: function(el) {
    var obj = {left: 0, top: 0},
      offset = this.getOffset(el),
      offsetParent = this.getOffset(el.parentNode);

    obj.left = offset.left - offsetParent.left;
    obj.top = offset.top - offsetParent.top;

    return obj;
  },
  getPreviousSibling: function(el) {
    do {
      el = el.previousSibling;
    } while (el && el.nodeType != 1);

    return el;
  },
  getPropertyCount: function(obj) {
    if (!Object.keys) {
      var keys = [],
        k;

      for (k in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, k)) {
          keys.push(k);
        }
      }

      return keys.length;
    } else {
      return Object.keys(obj).length;
    }
  },
  handlebars: function(template, data) {
    template = handlebars.compile(template);

    return template(data);
  },
  isLocalUrl: function(url) {
    if (url.indexOf(location.origin) === 0) {
      return true;
    } else {
      return !(/^(?:[a-z]+:)?\/\//i.test(url));
    }
  },
  _parseLocalUrl: function(url) {
    return url.replace(location.origin, '');
  },
  loadFile: function(url, type, callback) {
    if (this.isLocalUrl(url)) {
      if (type === 'xml') {
        var request = new XMLHttpRequest();

        request.onload = function() {
          var text = this.responseText;

          if (text) {
            callback(text);
          } else {
            callback(false);
          }
        };
        request.open('get', this._parseLocalUrl(url), true);
        request.send();
      } else {
        reqwest({
          error: function() {
            callback(false);
          },
          success: function(response) {
            if (response) {
              if (type === 'text') {
                callback(response.responseText);
              } else {
                callback(response);
              }
            } else {
              callback(false);
            }
          },
          type: type,
          url: this._parseLocalUrl(url)
        });
      }
    } else {
      reqwest({
        error: function() {
          callback(false);
        },
        success: function(response) {
          if (response) {
            callback(response);
          } else {
            callback(false);
          }
        },
        type: 'jsonp',
        url: 'http://npmap-proxy.herokuapp.com?callback=?&type=' + type + '&url=' + url
      });
    }
  },
  parseDomainFromUrl: function(url) {
    var matches = url.match(/^https?\:\/\/([^\/?#]+)(?:[\/?#]|$)/i);

    return matches && matches[1];
  },
  putCursorAtEndOfInput: function(input) {
    if (input.setSelectionRange) {
      var length = input.value.length * 2;
      input.setSelectionRange(length, length);
    } else {
      input.value = input.value;
    }
  },
  reqwest: reqwest,
  strict: function(_, type) {
    if (typeof _ !== type) {
      throw new Error('Invalid argument: ' + type + ' expected');
    }
  },
  strictInstance: function(_, klass, name) {
    if (!(_ instanceof klass)) {
      throw new Error('Invalid argument: ' + name + ' expected');
    }
  },
  strictOneOf: function(_, values) {
    if (values.indexOf(_) === -1) {
      throw new Error('Invalid argument: ' + _ + ' given, valid values are ' + values.join(', '));
    }
  },
  stripHtml: function(html) {
    var tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  },
  unescapeHtml: function(unsafe) {
    return unsafe
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '\"')
      .replace(/&#039;/g, '\'');
  }
};
