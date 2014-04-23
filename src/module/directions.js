/* globals L */

'use strict';

var route = require('../util/route');

var DirectionsModule = L.Class.extend({
  includes: [
    require('../mixin/module')
  ],
  initialize: function(options) {
    var div = document.createElement('div'),
      form = document.createElement('form'),
      p = document.createElement('p'),
      ul = document.createElement('ul');

    p.className = 'note';
    p.innerHTML = 'Search for a location or select a location from the map. Drag stops to reorder.';
    ul.className = 'stops';
    ul.innerHTML = '' +
      '<li>' +
        '<label for="stop-A">A</label>' +
        '<input id="stop-A" type="text">' +
        '<button class="btn-search ir" type="button">Search for a location</button>' +
      '</li>' +
    '';
    div.appendChild(p);
    div.appendChild(ul);
    this.content = div;
    this.icon = 'truck';
    this.title = this.type = 'Directions';
    this.visible = (options && options.visible) || false;
    L.Util.setOptions(this, options);

    //DISCLAIMER: These directions are for planning purposes only. While the National Park Service strives to provide the most accurate information possible, please use caution when driving in unfamiliar locations and check directions against the content provided by each Park's website. The National Park Service assumes no responsibility for information provided by NPS partners.

    return this;
  }
});

module.exports = function(options) {
  return new DirectionsModule(options);
};
