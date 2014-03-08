/* global L */

'use strict';

var util = require('../util/util');

var FullscreenControl = L.Control.extend({
  initialize: function(options) {
    this._supported = true;

    try {
      this._frame = window.frameElement || null;
    } catch (exception) {
      this._frame = true;

      if (!window.postMessage) {
        this._supported = false;
      }
    }

    // TODO: Also add ARIA attributes.
    this._button = L.DomUtil.create('button', 'fullscreen enter');
    this._button.title = 'Enter fullscreen';
    L.DomEvent.addListener(this._button, 'click', this.fullscreen, this);

    return this;
  },
  _onKeyUp: function(e) {
    if (!e) {
      e = window.event;
    }

    if (this._isFullscreen === true && e.keyCode === 27) {
      this.fullscreen();
    }
  },
  addTo: function(map) {
    var toolbar = util.getChildElementsByClassName(map.getContainer().parentNode.parentNode, 'npmap-toolbar')[0];

    toolbar.childNodes[1].appendChild(this._button);
    toolbar.style.display = 'block';
    this._container = toolbar.parentNode.parentNode;
    this._isFullscreen = false;
    this._map = map;
    util.getChildElementsByClassName(this._container.parentNode, 'npmap-map-wrapper')[0].style.top = '26px';

    return this;
  },
  _getParentDocumentBody: function(el) {
    var parent;

    do {
      parent = el.parentNode;
    } while (parent && !parent.previousElementSibling && !parent.nextElementSibling);

    return parent;
  },
  fullscreen: function() {
    if (this._supported) {
      var body = document.body;

      if (this._isFullscreen) {
        body.style.margin = this._bodyMargin;
        body.style.overflow = this._bodyOverflow;
        body.style.padding = this._bodyPadding;
        this._container.style.left = this._containerLeft;
        this._container.style.position = this._containerPosition;
        this._container.style.top = this._containerTop;
        L.DomEvent.removeListener(document, 'keyup', this._onKeyUp);
        this._isFullscreen = false;
        L.DomUtil.removeClass(this._button, 'exit');
        L.DomUtil.addClass(this._button, 'enter');
        this._button.title = 'Enter fullscreen';
        this._map.fire('exitfullscreen');

        if (this._frame && window.postMessage) {
          parent.postMessage('exitfullscreen', '*');
        }
      } else {
        this._bodyMargin = body.style.margin;
        this._bodyOverflow = body.style.overflow;
        this._bodyPadding = body.style.padding;
        body.style.margin = '0';
        body.style.overflow = 'hidden';
        body.style.padding = '0';
        this._containerLeft = this._container.style.left;
        this._containerPosition = this._container.style.position;
        this._containerTop = this._container.style.top;
        this._container.style.left = '0';
        this._container.style.position = 'fixed';
        this._container.style.top = '0';
        L.DomEvent.addListener(document, 'keyup', this._onKeyUp, this);
        this._isFullscreen = true;
        L.DomUtil.removeClass(this._button, 'enter');
        L.DomUtil.addClass(this._button, 'exit');
        this._button.title = 'Exit fullscreen';
        this._map.fire('enterfullscreen');

        if (this._frame && window.postMessage) {
          parent.postMessage('enterfullscreen', '*');
        }
      }

      this._map.invalidateSize();
    } else {
      window.alert('Sorry, but the fullscreen tool is not supported in your browser. Perhaps it is time for an upgrade?');
    }
  }
});

L.Map.mergeOptions({
  fullscreenControl: false
});
L.Map.addInitHook(function() {
  if (this.options.fullscreenControl) {
    var options = {};

    if (typeof this.options.fullscreenControl === 'object') {
      options = this.options.fullscreenControl;
    }

    this.fullscreenControl = L.npmap.control.fullscreen(options).addTo(this);
  }
});

module.exports = function(options) {
  return new FullscreenControl(options);
};
