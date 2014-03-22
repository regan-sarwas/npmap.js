/* global L */

'use strict';

var util = require('./util/util');

var Popup = L.Popup.extend({
  options: {
    autoPanPaddingBottomRight: [20, 20],
    autoPanPaddingTopLeft: [20, 20],
    offset: [1, -3]
  },
  _html: null,
  _results: [],
  _back: function() {
    this.setContent(this._html).update();
    this._html = null;
  },
  _createAction: function(divActions, handler, text, items) {
    var action = document.createElement('a');

    action.innerHTML = text;
    //a.style.cssText = 'margin-left:5px;';

    if (items) {
      var menu = L.DomUtil.create('ul', 'menu', divActions);

      for (var i = 0; i < items.length; i++) {
        var a = document.createElement('a'),
          item = items[i],
          li = document.createElement('li');

        a.innerHTML = item.text;
        L.DomEvent.addListener(a, 'click', function() {
          menu.style.display = 'none';
          this.fn();
        }, item);
        li.appendChild(a);
        menu.appendChild(li);
      }

      L.DomEvent.addListener(action, 'click' , function(e) {
        this._toggleMenu(menu, e);
      }, this);
    } else if (handler) {
      L.DomEvent.addListener(action, 'click' , handler, this);
    }

    return action;
  },
  _toggleMenu: function(menu, e) {
    if (!menu.style.display || menu.style.display === 'none') {
      var to = e.toElement;

      menu.style.display = 'block';
      menu.style.left = to.offsetLeft + 'px';
      menu.style.top = (to.offsetTop + 18) + 'px';
    } else {
      menu.style.display = 'none';
    }
  },






  _handleResults: function(results) {
    var div;

    if (results.length > 1) {
      div = this._resultsToHtml(results);
    } else {
      var result = results[0],
        options = (function() {
          if (result.layer && result.layer.options && result.layer.options.popup) {
            return result.layer.options.popup;
          } else {
            return null;
          }
        })();
      div = this._resultToHtml(result.results[0], options);
    }

    return div;
  },
  _more: function(index) {
    this._html = this.getContent();
    this.setContent(this._results[index]).update();
  },
  _resultsToHtml: function(results) {
    var div = document.createElement('div'),
      index = 0,
      me = this;

    for (var i = 0; i < results.length; i++) {
      var divLayer = L.DomUtil.create('div', 'layer', div),
        divLayerTitle = L.DomUtil.create('div', 'title', divLayer),
        resultLayer = results[i],
        layerConfig = {},
        divLayerContent;

      if (resultLayer.layer && resultLayer.layer.options && resultLayer.layer.options.popup) {
        layerConfig = resultLayer.layer.options.popup;
      }

      if (resultLayer.layer && resultLayer.layer.options && resultLayer.layer.options.name) {
        divLayerTitle.innerHTML = resultLayer.layer.options.name;
      } else {
        divLayerTitle.innerHTML = 'Unnamed';
      }

      if (resultLayer.results && resultLayer.results.length) {
        var ul = document.createElement('ul');

        divLayerContent = L.DomUtil.create('div', 'content', divLayer);

        for (var j = 0; j < resultLayer.results.length; j++) {
          var a = document.createElement('a'),
            li = document.createElement('li'),
            result = resultLayer.results[j],
            resultConfig = {},
            more, single;

          // TODO: Figure out how you are going to pass "resultConfig" in from individual layer handlers.

          single = this._resultToHtml(result, layerConfig, true);

          if (typeof layerConfig.more === 'string') {
            more = util.handlebars(layerConfig.more, result);
          } else if (typeof resultConfig.more === 'string') {
            more = util.handlebars(resultConfig.more, result);
          } else {
            for (var k = 0; k < single.childNodes.length; k++) {
              var childNode = single.childNodes[k];

              if (L.DomUtil.hasClass(childNode, 'title')) {
                more = util.stripHtml(childNode.innerHTML);
                break;
              }
            }
          }

          if (!more) {
            more = 'Untitled';
          }

          L.DomEvent.addListener(a, 'click', function() {
            me._more(this.id);
          });
          this._results[index] = single;
          a.id = index;
          a.innerHTML = more;
          li.appendChild(a);
          ul.appendChild(li);
          divLayerContent.appendChild(ul);
          index++;
        }
      } else if (resultLayer.subLayers && resultLayer.subLayers.length) {
        divLayerContent = L.DomUtil.create('div', 'content', divLayer);

        /*
        for (j = 0; j < layerResult.subLayers.length; j++) {
          var divSubLayer = L.DomUtil.create('div', 'sublayer', divLayerContent),
            divSubLayerTitle = L.DomUtil.create('div', 'title', divSubLayer),
            divSubLayerContent = L.DomUtil.create('div', 'content', divSubLayer),
            subLayerResult = layerResult.subLayers[j],
            ulSubLayer = document.createElement('ul');

          divSubLayerContent.appendChild(ulSubLayer);
          divSubLayerTitle.innerHTML = subLayerResult.name;

          for (k = 0; k < subLayerResult.results.length; k++) {
            a = document.createElement('a');
            html = this._popupDataToHtml(subLayerResult.results[k], layerOptions.popup, subLayerResult.results[k].popup);
            li = document.createElement('li');
            this._clickResults[index] = html;
            L.DomEvent.addListener(a, 'click', function() {
              this._popupMore(layerResult.layer, this._clickResults[this.id]);
            });

            for (l = 0; l < html.childNodes.length; l++) {
              childNode = html.childNodes[l];

              if (L.DomUtil.hasClass(childNode, 'title')) {
                title = util.stripHtml(childNode.innerHTML);
                break;
              }
            }

            console.log(subLayerResult);


            // TODO: Pass the title in and use it if title isn't set via popup config.




            if ((!title || title === 'Untitled') && subLayerResult.titleField) {
              title = subLayerResult.results[k][subLayerResult.titleField];
            }

            a.id = index;
            a.innerHTML = title;
            li.appendChild(a);
            ulSubLayer.appendChild(li);
            index++;
          }
        }
        */
      }
    }

    return div;
  },
  _resultToHtml: function(result, layerConfig, addBackAction) {
    var config = layerConfig,
      div = L.DomUtil.create('div', 'layer'),
      // TODO: Pass in resultConfig
      resultConfig = {},
      actions, description, divContent, media, obj, title;

    if (!config) {
      config = {
        description: {
          format: 'table'
        },
        title: (function() {
          if (resultConfig) {
            return resultConfig.title || resultConfig.more || 'Untitled';
          } else {
            return 'Untitled';
          }
        })()
      };
    }

    if (config.title) {
      obj = null;

      if (typeof config.title === 'function') {
        obj = config.title(result);
      } else {
        obj = config.title;
      }

      if (obj && typeof obj === 'string') {
        title = L.DomUtil.create('div', 'title', div);
        title.innerHTML = util.handlebars(obj, result);
      }
    }

    if (config.media) {
      media = null;
    }

    if (config.description) {
      obj = null;

      if (typeof config.description === 'function') {
        obj = config.description(result);
      } else {
        obj = config.description;
      }

      if (typeof obj === 'object') {
        if (obj.format === 'list') {
          obj = util.dataToList(result, obj.fields);
        } else if (obj.format === 'table') {
          obj = util.dataToTable(result, obj.fields);
        }
      }

      if (obj) {
        if (!divContent) {
          divContent = L.DomUtil.create('div', 'content', div);
        }

        description = L.DomUtil.create('div', 'description', divContent);

        if (typeof obj === 'string') {
          description.innerHTML = util.handlebars(obj, result);
        } else if ('nodeType' in obj) {
          description.appendChild(obj);
        }
      }
    }

    if (config.actions) {
      obj = null;

      if (typeof config.actions === 'function') {
        obj = config.actions(result);
      } else {
        obj = config.actions;
      }

      if (L.Util.isArray(obj)) {
        for (var i = 0; i < obj.length; i++) {
          
        }

/*
_createAction: function(divActions, handler, text, items) {
*/

        

        // Iterate through and create markup
      }

      if (obj) {
        if (typeof obj === 'string') {
          actions = L.DomUtil.create('div', 'actions', div);
          actions.innerHTML = util.handlebars(obj, result);
        } else if ('nodeType' in obj) {
          actions.appendChild(obj);
        }
      }
    }

    if (addBackAction) {
      var a = document.createElement('a'),
        li = document.createElement('li');

      L.DomEvent.addListener(a, 'click', this._back, this);
      a.innerHTML = '&#171; Back';
      li.appendChild(a);

      if (actions) {
        actions.childNodes[0].insertBefore(li, actions.childNodes[0].childNodes[0]);
      } else {
        var ul = document.createElement('ul');

        actions = L.DomUtil.create('div', 'actions', div);
        ul.appendChild(li);
        actions.appendChild(ul);
      }
    }

    return div;
  }
});

module.exports = function(options) {
  return new Popup(options);
};

/*
if (me.options.edit && me.options.edit.layers.split(',').indexOf(subLayerId) !== -1) {
  var userRole = me.options.edit.userRole;

  if (typeof userRole === 'undefined' || userRole === 'Admin' || userRole === 'Writer') {
    var objectId = parseInt(el.getAttribute('data-objectid'), 10);

    subLayerId = parseInt(subLayerId, 10);

    actions.push(me._createAction('edit', 'Edit &#9656;', null, [{
      fn: function() {
        me.options.edit.handlers.editAttributes(subLayerId, objectId);
      },
      text: 'Attributes'
    },{
      fn: function() {
        me.options.edit.handlers.editGeometry(subLayerId, objectId);
      },
      text: 'Geometry'
    }], divActions));
    actions.push(me._createAction('delete', 'Delete', function() {
      me.options.edit.handlers['delete'](subLayerId, objectId);
    }));
  }
}
*/

