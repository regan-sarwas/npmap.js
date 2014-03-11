'use strict';

var NPMapIframe = (function() {
  var currentId = 0,
    events = {};

  return {
    addEventListener: function(component, eventType, handler) {
      if (component === 'fullscreenControl' && (eventType === 'enterfullscreen' || eventType === 'exitfullscreen')) {
        var id;

        currentId++;
        id = handler.id = currentId;

        events[id] = {
          component: component,
          eventType: eventType,
          handler: handler
        };
      } else {
        // Throw error.
      }
    },
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

        function captureProperty(elementType, propertyName, propertyValue) {
          if (typeof propertyValue !== 'undefined' && propertyValue !== '' && propertyValue !== null) {
            storage[elementType][propertyName] = propertyValue;
          }
        }

        iframe = typeof iframe === 'string' ? document.getElementById(iframe) : iframe;

        eventer(messageEvent, function(e) {
          var bodyProps = [
              'margin',
              'marginBottom',
              'marginLeft',
              'marginRight',
              'marginTop',
              'overflow',
              'padding',
              'paddingBottom',
              'paddingLeft',
              'paddingRight',
              'paddingTop'
            ],
            iframeProps = [
              'bottom',
              'height',
              'left',
              'marginBottom',
              'marginLeft',
              'marginRight',
              'marginTop',
              'padding',
              'paddingBottom',
              'paddingLeft',
              'paddingRight',
              'paddingTop',
              'position',
              'right',
              'top',
              'width',
              'zIndex'
            ],
            handler, height, i, prop, width;

          if (e.data === 'enterfullscreen') {
            if (body && body.style) {
              for (i = 0; i < bodyProps.length; i++) {
                prop = bodyProps[i];
                captureProperty('body', prop, body.style[prop]);
              }
            }

            if (iframe && iframe.style) {
              for (i = 0; i < iframeProps.length; i++) {
                prop = iframeProps[i];
                captureProperty('iframe', prop, iframe.style[prop]);
              }
            }

            height = iframe.height;

            if (typeof height !== 'undefined' && height !== '100%') {
              if (height.length && (height.indexOf('%') === height.length - 1)) {
                storage.iframeHeight = height;
                iframe.height = '100%';
              } else {
                height = parseFloat(height);

                if (!isNaN(height)) {
                  storage.iframeHeight = height;
                  iframe.height = '100%';
                }
              }
            }

            width = iframe.width;

            if (typeof width !== 'undefined' && width !== '100%') {
              if (width.length && (width.indexOf('%') === width.length - 1)) {
                storage.iframeHeight = width;
                iframe.width = '100%';
              } else {
                width = parseFloat(width);

                if (!isNaN(width)) {
                  storage.iframeWidth = width;
                  iframe.width = '100%';
                }
              }
            }

            body.style.margin = '0';
            body.style.overflow = 'hidden';
            body.style.padding = '0';
            iframe.style.height = '100%';
            iframe.style.left = '0';
            iframe.style.margin = '0';
            iframe.style.padding = '0';
            iframe.style.position = 'fixed';
            iframe.style.top = '0';
            iframe.style.width = '100%';
            iframe.style.zIndex = 9999999999;

            for (prop in events) {
              handler = events[prop];

              if (handler.component === 'fullscreenControl' && handler.eventType === 'enterfullscreen') {
                handler.handler();
              }
            }
          } else if (e.data === 'exitfullscreen') {
            for (i = 0; i < iframeProps.length; i++) {
              prop = iframeProps[i];
              iframe.style[prop] = (typeof storage.iframe[prop] === 'undefined' ? null : storage.iframe[prop]);
            }

            if (typeof storage.iframeHeight !== 'undefined') {
              height = storage.iframeHeight;

              if (typeof height === 'number') {
                iframe.height = height + (height === 0 ? '' : 'px');
              } else if (typeof height === 'string') {
                if (height.indexOf('%') === -1) {
                  height = parseFloat(height);

                  if (!isNaN(height)) {
                    iframe.height = height + (height === 0 ? '' : 'px');
                  }
                } else {
                  iframe.height = height;
                }
              }
            }

            if (typeof storage.iframeWidth !== 'undefined') {
              width = storage.iframeWidth;

              if (typeof width === 'number') {
                iframe.width = width + (width === 0 ? '' : 'px');
              } else if (typeof width === 'string') {
                if (width.indexOf('%') === -1) {
                  width = parseFloat(width);

                  if (!isNaN(width)) {
                    iframe.width = width + (width === 0 ? '' : 'px');
                  }
                } else {
                  iframe.width = width;
                }
              }
            }

            for (i = 0; i < bodyProps.length; i++) {
              prop = bodyProps[i];
              body.style[prop] = (typeof storage.body[prop] === 'undefined' ? null : storage.body[prop]);
            }

            for (prop in events) {
              handler = events[prop];

              if (handler.component === 'fullscreenControl' && handler.eventType === 'exitfullscreen') {
                handler.handler();
              }
            }
          }
        }, false);
      }
    },
    removeEventListener: function(component, eventType, handler) {
      if (component === 'fullscreenControl' && (eventType === 'enterfullscreen' || eventType === 'exitfullscreen')) {
        for (var prop in events) {
          if (parseInt(handler.id, 10) === parseInt(prop, 10)) {
            delete events[handler.id];
            break;
          }
        }
      } else {
        // Throw error.
      }
    }
  };
})();
