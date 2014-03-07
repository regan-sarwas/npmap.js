/* global L */

'use strict';

var util = require('../util/util');

var FullscreenControl = L.Control.extend({
  initialize: function(options) {
    // TODO: NPS.gov should really reach into the iframe and hookup to the fullscreen enter and exit events.
    // OR: You can also just deploy an html page to each dev instance of nps.gov that is on the same domain so this works in testing.
    try {
      this._frame = window.frameElement || null;
    } catch (exception) {
      this._frame = 'EXCEPTION';
      console.log('ERROR: The iframe is embedded into a non-NPS web page. Fullscreen tool will not display.');
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
    if (this._frame !== 'EXCEPTION') {
      var toolbar = util.getChildElementsByClassName(map.getContainer().parentNode.parentNode, 'npmap-toolbar')[0];

      toolbar.childNodes[1].appendChild(this._button);
      toolbar.style.display = 'block';
      this._container = toolbar.parentNode.parentNode;
      this._isFullscreen = false;
      this._map = map;
      util.getChildElementsByClassName(this._container.parentNode, 'npmap-map-wrapper')[0].style.top = '26px';
    }

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
    var body = document.body;

    if (this._isFullscreen) {
      if (!this.resizeHandled) {
        if (this._frame) {
          this._frameBody.height = this._frameBodyHeight;
          this._frameBody.style.margin = this._frameBodyMargin;
          this._frameBody.style.overflow = this._frameBodyOverflow;
          this._frameBody.padding = this._frameBodyPadding;
          this._frameBody.width = this._frameBodyWidth;
          this._frame.height = this._frameHeight;
          this._frame.style.left = this._frameLeft;
          this._frame.style.position = this._framePosition;
          this._frame.style.top = this._frameTop;
          this._frame.width = this._frameWidth;
          this._frame.style.zIndex = this._frameZindex;
        }

        body.style.margin = this._bodyMargin;
        body.style.overflow = this._bodyOverflow;
        body.style.padding = this._bodyPadding;
        this._container.style.left = this._containerLeft;
        this._container.style.position = this._containerPosition;
        this._container.style.top = this._containerTop;
      }

      L.DomEvent.removeListener(document, 'keyup', this._onKeyUp);
      this._isFullscreen = false;
      L.DomUtil.removeClass(this._button, 'exit');
      L.DomUtil.addClass(this._button, 'enter');
      this._button.title = 'Enter fullscreen';
      this._map.fire('exitfullscreen');
    } else {
      if (!this.resizeHandled) {
        if (this._frame) {
          if (!this._frameBody) {
            this._frameBody = this._getParentDocumentBody(this._frame);
          }

          this._frameBodyMargin = this._frameBody.style.margin;
          this._frameBodyOverflow = this._frameBody.style.overflow;
          this._frameBodyPadding = this._frameBody.style.padding;
          this._frameBody.style.margin = '0';
          this._frameBody.style.overflow = 'hidden';
          this._frameBody.padding = '0';
          this._frameHeight = this._frame.height;
          this._frameLeft = this._frame.style.left;
          this._framePosition = this._frame.style.position;
          this._frameTop = this._frame.style.top;
          this._frameWidth = this._frame.width;
          this._frameZindex = this._frame.style.zIndex;
          this._frame.height = '100%';
          this._frame.style.left = '0';
          this._frame.style.position = 'fixed';
          this._frame.style.top = '0';
          this._frame.style.zIndex = 9999999999;
          this._frame.width = '100%';
        }

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
      }

      L.DomEvent.addListener(document, 'keyup', this._onKeyUp, this);
      this._isFullscreen = true;
      L.DomUtil.removeClass(this._button, 'enter');
      L.DomUtil.addClass(this._button, 'exit');
      this._button.title = 'Exit fullscreen';
      this._map.fire('enterfullscreen');
    }

    this._map.invalidateSize();
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
