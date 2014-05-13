/* globals L, NPMap */
/* jshint quotmark: false */

'use strict';

var geocode = require('../util/geocode'),
  route = require('../util/route'),
  util = require('../util/util');

require('../icon/maki');

var DirectionsModule = L.Class.extend({
  options: {
    visible: true
  },
  includes: [
    require('../mixin/module')
  ],
  initialize: function(options) {
    var buttonClear = document.createElement('button'),
      div = document.createElement('div'),
      me = this,
      p = document.createElement('p');

    L.Util.setOptions(this, options);
    p.innerHTML = 'Search for a location by address or name. Drag stops to reorder.';
    div.appendChild(p);
    this._ul = document.createElement('ul');
    div.appendChild(this._ul);
    this._addLiFirst();
    this._actions = document.createElement('div');
    this._actions.className = 'actions';
    this._buttonPrimary = document.createElement('button');
    this._buttonPrimary.className = 'btn btn-primary';
    this._buttonPrimary.innerHTML = 'Add Stop';
    this._buttonPrimary.type = 'button';
    L.DomEvent.addListener(this._buttonPrimary, 'click', function() {
      if (me._buttonPrimary.innerHTML === 'Add Stop') {
        var value = this._ul.childNodes[0].childNodes[1].childNodes[0].value || null;

        this._ul.innerHTML = '';
        this._addLi(value);
        this._addLi();
        me._buttonPrimary.innerHTML = 'Get Directions';
      } else {

      }
    }, this);
    this._actions.appendChild(this._buttonPrimary);
    buttonClear.className = 'btn btn-link';
    buttonClear.innerHTML = 'clear';
    buttonClear.type = 'button';
    L.DomEvent.addListener(buttonClear, 'click', this._clear, this);
    this._actions.appendChild(buttonClear);
    div.appendChild(this._actions);
    this._disclaimer = document.createElement('div');
    this._disclaimer.className = 'disclaimer';
    this._disclaimer.innerHTML = 'DISCLAIMER: These directions are for planning purposes only. While the National Park Service strives to provide the most accurate information possible, please use caution when driving in unfamiliar locations and check directions against the content provided by each Park\'s website. The National Park Service assumes no responsibility for information provided by NPS partners.';
    div.appendChild(this._disclaimer);
    this.content = div;
    this.icon = 'truck';
    this.title = this.type = 'Directions';
    this.visible = (options && options.visible) || false;
    this._addDraggableListeners();

    return this;
  },
  _dragSource: null,
  _icon: {
    iconAnchor: [13.5, 37],
    iconRetinaUrl: NPMap.path  + 'images/module/directions/stop-{{letter}}@2x.png',
    iconSize: [27, 37],
    iconUrl: NPMap.path  + 'images/module/directions/stop-{{letter}}.png',
    popupAnchor: [0, -40]
  },
  _letters: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'],
  _markers: [],
  _route: null,
  _addDraggableListeners: function() {
    for (var i = 0; i < this._ul.childNodes.length; i++) {
      var li = this._ul.childNodes[i];

      L.DomEvent
        .addListener(li, 'dragend', this._handleDragEnd, this)
        .addListener(li, 'dragenter', this._handleDragEnter, this)
        .addListener(li, 'dragleave', this._handleDragLeave, this)
        .addListener(li, 'dragover', this._handleDragOver, this)
        .addListener(li, 'dragstart', this._handleDragStart, this);
    }
  },
  _addLi: function(value) {
    var backgroundImage = 'url(' + NPMap.path + 'images/module/directions/times' + (L.Browser.retina ? '@2x' : '') + '.png)',
      button = document.createElement('button'),
      div = document.createElement('div'),
      input = document.createElement('input'),
      label = document.createElement('label'),
      letter = this._letters[this._ul.childNodes.length],
      li = document.createElement('li'),
      me = this;

    div.className = 'remove';
    label.htmlFor = 'stop-' + letter;
    label.innerHTML = letter;
    li.appendChild(label);
    li.draggable = true;
    input.id = 'stop-' + letter;
    input.onkeypress = function(e) {
      if (e.keyCode === 13 && input.value && input.value.length > 0) {
        geocode.esri(input.value, function(response) {
          if (response && response.results) {
            var result = response.results[0];

            if (result) {
              input.value = result.name;
              result.letter = letter;
              me._addMarker(result);

              if (me._markers.length > 1) {
                var latLngs = [];

                for (var i = 0; i < me._markers.length; i++) {
                  latLngs.push(me._markers[i].getLatLng());
                }

                route.mapbox.route(latLngs, function(route) {
                  if (route && route.routes && route.routes.length) {
                    me._route = new L.GeoJSON({
                      type: 'Feature',
                      geometry: route.routes[0].geometry,
                      properties: {}
                    }, {
                      clickable: false,
                      color: '#c16b2b',
                      opacity: 1
                    }).addTo(me._map);
                    me._map.fitBounds(me._route.getBounds(), {
                      padding: [30, 30]
                    });
                  }
                });
              }
            }
          }
        });
      }
    };
    input.type = 'text';

    if (value) {
      input.value = value;
    }

    div.appendChild(input);
    button.className = 'remove ir';
    button.innerHTML = 'Remove stop';
    L.DomEvent
      .addListener(button, 'click', function() {
        console.log(this.parentNode);
      })
      .addListener(button, 'onmouseout', function() {
        this.style.backgroundImage = backgroundImage;
      })
      .addListener(button, 'onmouseover', function() {
        this.style.backgroundImage = 'url(' + NPMap.path + 'images/module/directions/times-over' + (L.Browser.retina ? '@2x' : '') + '.png)';
      });
    button.style.backgroundImage = backgroundImage;
    button.type = 'button';
    li.appendChild(div);
    li.appendChild(button);
    this._ul.appendChild(li);
  },
  _addLiFirst: function() {
    var button = document.createElement('button'),
      divLi = document.createElement('div'),
      input = document.createElement('input'),
      label = document.createElement('label'),
      li = document.createElement('li'),
      me = this;

    label.htmlFor = 'stop-A';
    label.innerHTML = 'A';
    li.appendChild(label);
    input.className = 'search';
    input.id = 'stop-A';
    input.type = 'text';
    input.onkeypress = function(e) {
      if (e.keyCode === 13 && input.value && input.value.length > 0) {
        geocode.esri(input.value, function(response) {
          if (response && response.results) {
            var result = response.results[0];

            if (result) {
              result.letter = 'A';
              me._ul.innerHTML = '';
              me._addLi(result.name);
              me._addLi();
              me._addMarker(result);
            }
          }
        });
      }
    };
    divLi.appendChild(input);
    button.className = 'search ir';
    button.innerHTML = 'Search for a location';
    button.style.backgroundImage = 'url(' + NPMap.path + 'images/font-awesome/search' + (L.Browser.retina ? '@2x' : '') + '.png)';
    button.type = 'button';
    L.DomEvent.addListener(button, 'click', function() {
      if (input.value && input.value.length > 0) {
        me._geocode(input);
      }
    });
    divLi.appendChild(button);
    li.appendChild(divLi);
    li.draggable = true;
    this._ul.appendChild(li);
  },
  _addMarker: function(result) {
    var icon = L.extend({}, this._icon),
      latLng = result.latLng,
      letter = result.letter;

    L.extend(icon, {
      iconRetinaUrl: util.handlebars(icon.iconRetinaUrl, {
        letter: letter
      }),
      iconUrl: util.handlebars(icon.iconUrl, {
        letter: letter
      })
    });
    this._markers.push(new L.Marker({
      lat: latLng[0],
      lng: latLng[1]
    }, {
      icon: new L.Icon(icon)
    }).bindPopup('<div class="title">' + result.name + '</div>').addTo(this._map));
  },
  _clear: function() {
    var i;

    this._ul.innerHTML = '';
    this._addLiFirst();
    this._buttonPrimary.innerHTML = 'Add Stop';

    for (i = 0; i < this._markers.length; i++) {
      this._map.removeLayer(this._markers[i]);
    }

    if (this._route) {
      this._map.removeLayer(this._route);
      this._route = null;
    }
  },
  _handleDragEnd: function(e) {
    e.target.style.opacity = '1';
  },
  _handleDragEnter: function(e) {
    e.target.classList.add('over');
  },
  _handleDragLeave: function(e) {
    e.target.classList.remove('over');
  },
  _handleDrop: function(e) {
    var target = e.target;

    if (e.stopPropagation) {
      e.stopPropagation();
    }

    if (target._dragSource != target) {
      target._dragSource.innerHTML = target.innerHTML;
      target.innerHTML = e.dataTransfer.getData('text/html');
    }

    return false;
  },
  _handleDragOver: function(e) {
    if (e.preventDefault) {
      e.preventDefault();
    }

    e.dataTransfer.dropEffect = 'move';

    return false;
  },
  _handleDragStart: function(e) {
    var target = e.target;

    target.style.opacity = '0.4';
    target._dragSource = target;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', target.innerHTML);
  }
});

module.exports = function(options) {
  return new DirectionsModule(options);
};
