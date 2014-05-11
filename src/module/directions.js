/* globals L, NPMap */

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
    var button = document.createElement('button'),
      div = document.createElement('div'),
      divLi = document.createElement('div'),
      input = document.createElement('input'),
      label = document.createElement('label'),
      li = document.createElement('li'),
      me = this,
      p = document.createElement('p');

    L.Util.setOptions(this, options);
    p.innerHTML = 'Search for a location by address or name. Drag stops to reorder.';
    div.appendChild(p);
    this._ul = document.createElement('ul');
    div.appendChild(this._ul);
    label.htmlFor = 'stop-A';
    label.innerHTML = 'A';
    li.appendChild(label);
    input.className = 'search';
    input.id = 'stop-A';
    input.type = 'text';
    input.onkeypress = function(e) {
      var value = input.value;

      if (e.keyCode === 13 && value.length > 0) {
        me._geocode('a', input.value);
      }
    };
    divLi.appendChild(input);
    button.className = 'search ir';
    button.innerHTML = 'Search for a location';
    button.style.backgroundImage = 'url(' + NPMap.path + 'images/font-awesome/search' + (L.Browser.retina ? '@2x' : '') + '.png)';
    button.type = 'button';
    divLi.appendChild(button);
    li.appendChild(divLi);
    this._ul.appendChild(li);
    this._disclaimer = document.createElement('div');
    this._disclaimer.className = 'disclaimer';
    this._disclaimer.innerHTML = 'DISCLAIMER: These directions are for planning purposes only. While the National Park Service strives to provide the most accurate information possible, please use caution when driving in unfamiliar locations and check directions against the content provided by each Park\'s website. The National Park Service assumes no responsibility for information provided by NPS partners.';
    div.appendChild(this._disclaimer);
    this.content = div;
    this.icon = 'truck';
    this.title = this.type = 'Directions';
    this.visible = (options && options.visible) || false;

    return this;
  },
  _icon: {
    iconAnchor: [18.5, 37],
    iconRetinaUrl: NPMap.path  + 'images/module/directions/stop-{{letter}}@2x.png',
    iconSize: [27, 37],
    iconUrl: NPMap.path  + 'images/module/directions/stop-{{letter}}.png',
    popupAnchor: [18.5, 0]
  },
  _letters: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'],
  _addStop: function(latLng) {
    var childNodes = this._ul.childNodes,
      icon = L.extend({}, this._icon),
      letter = 'A';

    if (childNodes.length === 1) {
      // Replace this._ul.childNodes[0] with a regular input and a remove button
      // Add a second li in
      this._ul.removeChild(childNodes[0]);
      this._ul.appendChild(this._createLi());
    } else {
      letter = this._letters[childNodes.length - 1];
    }

    this._ul.appendChild(this._createLi());

    icon.iconRetinaUrl = util.handlebars(icon.iconRetinaUrl, {
      letter: letter
    });
    icon.iconUrl = util.handlebars(icon.iconUrl, {
      letter: letter
    });

    new L.Marker(latLng, {
      icon: new L.Icon(icon)
    }).addTo(this._map);
  },
  _createLi: function() {
    var button = document.createElement('button'),
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
    input.id = 'stop-' + letter;
    input.onkeypress = function(e) {
      var value = input.value;

      if (e.keyCode === 13 && value.length > 0) {
        me._geocode('a', input.value);
      }
    };
    input.type = 'text';
    div.appendChild(input);
    button.className = 'remove ir';
    button.innerHTML = 'Remove stop';
    button.style.backgroundImage = 'url(' + NPMap.path + 'images/font-awesome/times' + (L.Browser.retina ? '@2x' : '') + '.png)';
    button.type = 'button';
    li.appendChild(div);
    li.appendChild(button);
    return li;
  },
  _geocode: function(value) {
    var me = this;

    geocode.esri(value, function(response) {
      if (response && response.results) {
        var result = response.results[0];

        if (result) {
          me._addStop(result.latLng, value);
        }
      }
    });
  }
});

module.exports = function(options) {
  return new DirectionsModule(options);
};
