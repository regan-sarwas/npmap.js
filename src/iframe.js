'use strict';

var NPMapIframe = (function() {
  return {
    fullscreenControl: {
      hookUp: function(iframe) {
        var body = document.body,
          eventMethod = window.addEventListener ? 'addEventListener' : 'attachEvent',
          eventer = window[eventMethod],
          messageEvent = (eventMethod === 'attachEvent' ? 'onmessage' : 'message'),
          storage = {
            body: {},
            iframe: {}
          };

        iframe = typeof iframe === 'string' ? document.getElementById(iframe) : iframe;

        eventer(messageEvent, function(e) {
          if (e.data === 'enterfullscreen') {
            storage.body.margin = body.style.margin;
            storage.body.overflow = body.style.overflow;
            storage.body.padding = body.style.padding;
            body.style.margin = '0';
            body.style.overflow = 'hidden';
            body.style.padding = '0';
            storage.iframe.height = iframe.height;
            storage.iframe.left = iframe.style.left;
            storage.iframe.position = iframe.style.position;
            storage.iframe.top = iframe.style.top;
            storage.iframe.width = iframe.width;
            storage.iframe.zIndex = iframe.style.zIndex;
            iframe.height = '100%';
            iframe.style.left = '0';
            iframe.style.position = 'fixed';
            iframe.style.top = '0';
            iframe.style.zIndex = 9999999999;
            iframe.width = '100%';
          } else if (e.data === 'exitfullscreen') {
            body.style.margin = storage.body.margin;
            body.style.overflow = storage.body.overflow;
            body.style.padding = storage.body.padding;
            iframe.height = storage.iframe.height;
            iframe.style.left = storage.iframe.left;
            iframe.style.position = storage.iframe.position;
            iframe.style.top = storage.iframe.top;
            iframe.style.zIndex = storage.iframe.zIndex;
            iframe.width = storage.iframe.width;
          }
        }, false);
      }
    }
  };
})();
