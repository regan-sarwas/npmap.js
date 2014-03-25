/* global L */
/* jshint camelcase: false */

'use strict';

var util = require('./util/util');

var Popup = L.Popup.extend({
  options: {
    autoPanPaddingBottomRight: [20, 20],
    autoPanPaddingTopLeft: [20, 20],
    offset: [1, -3]
  },
  _data: [],
  _html: null,
  _results: [],
  _back: function() {
    this.setContent(this._html).update();
    this._html = null;
  },
  _createAction: function(config, data, div) {
    var a = document.createElement('a'),
      li = document.createElement('li');

    li.appendChild(a);
    a.innerHTML = util.handlebars(config.text, data);

    if (config.menu) {
      var menu = L.DomUtil.create('ul', 'menu', div);

      for (var i = 0; i < config.menu.length; i++) {
        var item = config.menu[i],
          itemA = document.createElement('a'),
          itemLi = document.createElement('li');

        itemA.innerHTML = util.handlebars(item.text, data);
        L.DomEvent.addListener(itemA, 'click', function() {
          var data = null;

          try {
            data = this.parentNode.parentNode.parentNode.parentNode.npmap_data;
          } catch (exception) {}

          menu.style.display = 'none';
          item.handler(data);
        });
        itemLi.appendChild(itemA);
        menu.appendChild(itemLi);
      }

      L.DomEvent.addListener(a, 'click', function(e) {
        this._toggleMenu(menu, e);
      }, this);
    } else if (config.handler) {
      L.DomEvent.addListener(a, 'click', function() {
        var data = null;

        try {
          data = this.parentNode.parentNode.parentNode.parentNode.npmap_data;
        } catch (exception) {}

        config.handler(data);
      });
    }

    return li;
  },
  _handleResults: function(results) {
    var div;

    function getLayerConfig(layer) {
      if (layer.options && layer.options.popup) {
        return layer.options.popup;
      } else {
        return null;
      }
    }

    if (results.length > 1) {
      div = this._resultsToHtml(results);
    } else {
      var all = [],
        result = results[0],
        i;

      if (result.results && result.results.length) {
        for (i = 0; i < result.results.length; i++) {
          all.push({
            layerConfig: getLayerConfig(result.layer),
            result: result.results[i],
            resultConfig: null
          });
        }
      } else if (result.subLayers && result.subLayers.length) {
        for (i = 0; i < result.subLayers.length; i++) {
          var subLayer = result.subLayers[i];

          if (subLayer.results && subLayer.results.length) {
            for (var j = 0; j < subLayer.results.length; j++) {
              all.push({
                layerConfig: getLayerConfig(result.layer),
                result: subLayer.results[j],
                resultConfig: subLayer.popup || null
              });
            }
          }
        }
      }

      if (all.length === 1) {
        var first = all[0];

        // TODO: If a "subLayer" result, pass in subLayer.name and add to title of popup.
        div = this._resultToHtml(first.result, first.layerConfig, first.resultConfig);
      } else {
        div = this._resultsToHtml(results);
      }
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
      me = this,
      listener = function() {
        me._more(this.id);
      };
    for (var i = 0; i < results.length; i++) {
      var divLayer = L.DomUtil.create('div', 'layer', div),
        divLayerTitle = L.DomUtil.create('div', 'title', divLayer),
        resultLayer = results[i],
        layerConfig = null,
        resultConfig = null,
        a, childNode, divLayerContent, j, k, li, more, single, ul;

      if (resultLayer.layer.options) {
        if (resultLayer.layer.options.popup) {
          layerConfig = resultLayer.layer.options.popup;
        }

        if (resultLayer.layer.options.name) {
          divLayerTitle.innerHTML = resultLayer.layer.options.name;
        } else {
          divLayerTitle.innerHTML = 'Unnamed';
        }
      }

      if (resultLayer.results && resultLayer.results.length) {
        divLayerContent = L.DomUtil.create('div', 'content', divLayer);
        ul = document.createElement('ul');

        for (j = 0; j < resultLayer.results.length; j++) {
          var result = resultLayer.results[j];

          a = document.createElement('a');
          li = document.createElement('li');
          single = this._resultToHtml(result, layerConfig, resultConfig, true);

          if (layerConfig && typeof layerConfig.more === 'string') {
            more = util.handlebars(layerConfig.more, result);
          } else if (resultConfig && typeof resultConfig.more === 'string') {
            more = util.handlebars(resultConfig.more, result);
          } else {
            for (k = 0; k < single.childNodes.length; k++) {
              childNode = single.childNodes[k];

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

        for (j = 0; j < resultLayer.subLayers.length; j++) {
          var divSubLayer = L.DomUtil.create('div', 'sublayer', divLayerContent),
            divSubLayerTitle = L.DomUtil.create('div', 'title', divSubLayer),
            divSubLayerContent = L.DomUtil.create('div', 'content', divSubLayer),
            resultSubLayer = resultLayer.subLayers[j];

          divSubLayerTitle.innerHTML = resultSubLayer.name;
          ul = document.createElement('ul');
          divSubLayerContent.appendChild(ul);

          for (k = 0; k < resultSubLayer.results.length; k++) {
            var resultFinal = resultSubLayer.results[k];

            if (resultSubLayer.popup) {
              resultConfig = resultSubLayer.popup;
            }

            a = document.createElement('a');
            li = document.createElement('li');
            single = this._resultToHtml(resultFinal, layerConfig, resultConfig, true);

            if (layerConfig && typeof layerConfig.more === 'string') {
              more = util.handlebars(layerConfig.more, resultFinal);
            } else if (resultConfig && typeof resultConfig.more === 'string') {
              more = util.handlebars(resultConfig.more, resultFinal);
            } else {
              for (k = 0; k < single.childNodes.length; k++) {
                childNode = single.childNodes[k];

                if (L.DomUtil.hasClass(childNode, 'title')) {
                  more = util.stripHtml(childNode.innerHTML);
                  break;
                }
              }
            }

            if (!more) {
              more = 'Untitled';
            }

            L.DomEvent.addListener(a, 'click', listener);
            this._results[index] = single;
            a.id = index;
            a.innerHTML = more;
            li.appendChild(a);
            ul.appendChild(li);
            index++;
          }
        }
      }
    }

    return div;
  },
  _resultToHtml: function(result, layerConfig, resultConfig, addBack) {
    var config = layerConfig,
      div = L.DomUtil.create('div', 'layer'),
      actions, description, divContent, media, obj, title, ul;

    div.npmap_data = result;

    if (!config) {
      if (resultConfig) {
        config = resultConfig;
      } else {
        config = {
          description: {
            format: 'table'
          },
          title: 'Untitled'
        };
      }
    }

    if (typeof config === 'string') {
      div.innerHTML = util.handlebars(config, result);
    } else {
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

      if (!divContent) {
        divContent = L.DomUtil.create('div', 'content', div);
      }

      if (config.description) {
        obj = null;

        if (typeof config.description === 'function') {
          obj = config.description(result);
        } else {
          obj = config.description;
        }

        if (obj && typeof obj === 'object') {
          if (obj.format === 'list') {
            obj = util.dataToList(result, obj.fields);
          } else {
            obj = util.dataToTable(result, obj.fields);
          }
        }

        if (obj) {
          description = L.DomUtil.create('div', 'description', divContent);

          if (typeof obj === 'string') {
            description.innerHTML = util.handlebars(obj, result);
          } else if ('nodeType' in obj) {
            description.appendChild(obj);
          }
        }
      }

      if (config.media) {
        var mediaObj, mediaDiv;
        media = [];
        for (var i = 0; i < config.media.length; i++) {
          if (result[config.media[i].id]) {
            media.push(config.media[i]);
          }
        }
        mediaObj = util.mediaToList(result, media);
        if (mediaObj) {
          mediaDiv = L.DomUtil.create('div', 'mediaDiv', divContent);
          mediaDiv.appendChild(mediaObj);
        }
      }



      if (config.actions) {
        obj = null;

        if (typeof config.actions === 'function') {
          obj = config.actions(result);
        } else {
          obj = config.actions;
        }

        if (obj) {
          actions = L.DomUtil.create('div', 'actions', div);

          if (L.Util.isArray(obj)) {
            ul = document.createElement('ul');
            actions.appendChild(ul);

            for (var j = 0; j < obj.length; j++) {
              ul.appendChild(this._createAction(obj[j], result, actions));
            }
          } else if (typeof obj === 'string') {
            actions.innerHTML = util.handlebars(obj, result);
          } else if ('nodeType' in obj) {
            actions.appendChild(obj);
          }
        }
      }
    }

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

    if (addBack) {
      var a = document.createElement('a'),
        li = document.createElement('li');

      L.DomEvent.addListener(a, 'click', this._back, this);
      a.innerHTML = '&#171; Back';
      li.appendChild(a);

      if (actions) {
        actions.childNodes[0].insertBefore(li, actions.childNodes[0].childNodes[0]);
      } else {
        ul = document.createElement('ul');
        ul.appendChild(li);
        L.DomUtil.create('div', 'actions', div).appendChild(ul);
      }
    }

    return div;
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
  }
});

module.exports = function(options) {
  return new Popup(options);
};
