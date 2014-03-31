/* global L */

'use strict';

var handlebars = require('handlebars'),
  reqwest = require('reqwest');

handlebars.registerHelper('toLowerCase', function(str) {
  return str.toLowerCase();
});

if (!Array.prototype.indexOf) {
  Array.prototype.indexOf = function(searchElement, fromIndex) {
    if (this === undefined || this === null) {
      throw new TypeError('"this" is null or not defined');
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

    for (; fromIndex < length; fromIndex++) {
      if (this[fromIndex] === searchElement) {
        return fromIndex;
      }
    }

    return -1;
  };
}

module.exports = {
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
  _lazyLoader: require('./_lazyLoader.js'),
  _parseLocalUrl: function(url) {
    return url.replace(location.origin, '');
  },
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
  base64: require('./base64.js'),
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
  dataToList: function(data, fields) {
    var dl = document.createElement('dl');

    for (var prop in data) {
      var add = true;

      if (fields && L.Util.isArray(fields)) {
        if (fields.indexOf(prop) === -1) {
          add = false;
        }
      }

      if (add) {
        var dd = document.createElement('dd'),
          dt = document.createElement('dt');

        dt.innerHTML = prop;
        dd.innerHTML = data[prop];
        dl.appendChild(dt);
        dl.appendChild(dd);
      }
    }

    return dl;
  },
  dataToTable: function(data, fields) {
    var table = document.createElement('table'),
      tableBody = document.createElement('tbody');

    table.appendChild(tableBody);

    var fieldTitles = {};
    if (L.Util.isArray(fields)) {
      for (var i = 0; i < fields.length; i++) {
        if (typeof(fields[i]) === 'string') {
          fieldTitles[fields[i]] = {
            'title': fields[i]
          };
        } else {
          fieldTitles[fields[i].field] = fields[i];
        }
      }
    }

    for (var prop in data) {
      var add = false;

      if (fields && L.Util.isArray(fields)) {
        for (var field in fieldTitles) {
          if (field === prop) {
            add = true;
            break;
          }
        }
      }

      if (add) {
        var tdProperty = document.createElement('td'),
          tdValue = document.createElement('td'),
          tr = document.createElement('tr');

        tdValue.style.wordBreak = 'break-all';
        tdProperty.style.paddingRight = '5px';
        tdProperty.innerHTML = fieldTitles[prop].title;
        if (fieldTitles[prop].separator) {
          tdValue.innerHTML = data[prop].replace(fieldTitles[prop].separator, '<br/>');
        } else {
          tdValue.innerHTML = data[prop];
        }
        if (fieldTitles[prop].process) {
          tdValue.innerHTML = fieldTitles[prop].process(tdValue.innerHTML);
        }

        tr.appendChild(tdProperty);
        tr.appendChild(tdValue);
        tableBody.appendChild(tr);
      }
    }

    return table;
  },
  mediaToList: function(data, media) {
    var imageTypes = {
      focus: function(guids) {
        var attrs, guidArray, i, imgs = [],
          regex = new RegExp('[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}(}){0,1}', 'g'); //{ Fix Vim brackets
        guidArray = guids.match(regex);
        for (i = 0; i < guidArray.length; i++) {
          attrs = {
            src: 'http://focus.nps.gov/GetAsset/' + guidArray[i] + '/proxy/lores',
            href: 'http://focus.nps.gov/AssetDetail?assetID=' + guidArray[i]
          };
          imgs.push(attrs);
        }
        return imgs;
      }
    },
      mediaNavDiv = document.createElement('div'),
      imageList = document.createElement('ul'),
      imageLi = [],
      imageDiv = [],
      imageAttrs,
      mediaIndex;
    imageList.setAttribute('class', 'mediaPopup');
    imageList.style.listStyleType = 'none';
    imageList.style.margin = '16px 0 0 -10px';
    imageList.style.height = (250 * 0.75) + 'px';
    for (mediaIndex = 0; mediaIndex < media.length; mediaIndex++) {
      var newAnchor = [],
        newImage = [];
      if (imageTypes[media[mediaIndex].type]) {
        imageAttrs = imageTypes[media[mediaIndex].type](data[media[mediaIndex].id]);
        for (var k = 0; k < imageAttrs.length; k++) {
          imageLi.push(document.createElement('li')); //, null, imageList));
          imageLi[k].style.float = 'left';
          imageLi[k].style.display = k > 0 ? 'none' : 'inherit';
          imageDiv.push(document.createElement('div')); //, null, imageLi[k]));
          imageDiv[k].style.width = '250px';
          imageDiv[k].style.height = (250 * 0.75) + 'px';
          imageDiv[k].style.marginLeft = 'auto';
          imageDiv[k].style.marginRight = 'auto';
          newAnchor.push(document.createElement('a')); //, '', imageDiv[k]));
          newAnchor[k].href = imageAttrs[k].href;
          newImage.push(document.createElement('img')); //, '', newAnchor[k]));
          newImage[k].src = imageAttrs[k].src;
          newImage[k].style.width = '100%';
          newAnchor[k].appendChild(newImage[k]);
          imageDiv[k].appendChild(newAnchor[k]);
          imageLi[k].appendChild(imageDiv[k]);
          imageList.appendChild(imageLi[k]);
        }
      }
    }
    mediaNavDiv.appendChild(imageList);
    // Buttons
    //
    var changeImage = function(direction) {
      var curImg;
      var maxImg = $('ul.mediaPopup li').length;
      $('ul.mediaPopup li').each(function(a, b) {
        if (b.style.display !== 'none') {
          curImg = a;
        }
      });
      if ((curImg + direction) < maxImg && (curImg + direction) > -1) {
        $('ul.mediaPopup li').each(function(a, b) {
          if (a === (curImg + direction)) {
            b.style.display = 'inherit';
          } else {
            b.style.display = 'none';
          }
        });
      }
      if ((curImg + direction) <= 0) {
        $('div.mediaDiv button.prev').addClass('disabled');
      } else {
        $('div.mediaDiv button.prev').removeClass('disabled');
      }
      if ((curImg + direction + 1) >= maxImg) {
        $('div.mediaDiv button.next').addClass('disabled');
      } else {
        $('div.mediaDiv button.next').removeClass('disabled');
      }
    };
    var btnDiv = document.createElement('div');
    btnDiv.style.float = 'right';
    var prev = document.createElement('button');
    prev.setAttribute('class', 'btn btn-primary disabled prev btn-circle');
    prev.textContent = '<';
    var next = document.createElement('button');
    next.setAttribute('class', 'btn btn-primary next btn-circle');
    next.textContent = '>';
    L.DomEvent.addListener(prev, 'click', function() {
      changeImage(-1);
    });
    L.DomEvent.addListener(next, 'click', function() {
      changeImage(1);
    });
    btnDiv.appendChild(prev);
    btnDiv.appendChild(next);
    if (imageAttrs.length > 1) {
      mediaNavDiv.appendChild(btnDiv);
    }


    return mediaNavDiv;
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
    } while (el && el.nodeType !== 1);

    return el;
  },
  getOffset: function(el) {
    for (var lx = 0, ly = 0; el !== null; lx += el.offsetLeft, ly += el.offsetTop, el = el.offsetParent);

    return {
      left: lx,
      top: ly
    };
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

    return {
      height: height,
      width: width
    };
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
    var obj = {
      left: 0,
      top: 0
    },
      offset = this.getOffset(el),
      offsetParent = this.getOffset(el.parentNode);

    obj.left = offset.left - offsetParent.left;
    obj.top = offset.top - offsetParent.top;

    return obj;
  },
  getPreviousSibling: function(el) {
    do {
      el = el.previousSibling;
    } while (el && el.nodeType !== 1);

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
  linkify: function(text, shorten, target) {
    // There are probably better libraries to do this, but this
    // works for our cases
    // Text text, finds links in it and makes them into HTML links
    // the shorten parameter is a number that accepts a value for
    // how short the link should be
     // target allows the link to be opened in a different target
    var regexRoot = '\\b(https?:\/\/[-A-Z0-9+&@#/%?=~_|!:,.;]*[A-Z0-9+&@#/%=~_|])',
      regexLink = new RegExp(regexRoot, 'gi'),
      regexShorten = new RegExp('>' + regexRoot +'</a>', 'gi'),
      textLinked = text.replace(regexLink, '<a href="$1"' + (target ? ' target="' + target + '"' : '') + '>$1</a>');
    if (shorten) {
      var matchArray = textLinked.match(regexShorten);
      console.log(matchArray, textLinked);
      if (matchArray) {
        for (var i = 0; i < matchArray.length; i++) {
          var newBase = matchArray[i].substr(1, matchArray[i].length - 5).replace(/https?:\/\//gi, ''),
            newName = newBase.substr(0, shorten) + (newBase.length > shorten ? '&hellip;' : '');
          if (newBase.length-1 === shorten) {newName = newName.substr(0, shorten) + newBase.substr(shorten, 1);}
          textLinked = textLinked.replace(matchArray[i], '>' + newName + '</a>');
        }
      }
    }

    return textLinked;
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
