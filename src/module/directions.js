/* globals L */

'use strict';

var route = require('../util/route');

var DirectionsModule = L.Class.extend({
  includes: [
    require('../mixin/module')
  ],
  initialize: function(options) {
    options = options || {};
    this.content = 'Testing';
    this.icon = 'truck';
    this.title = this.type = 'Directions';
    this.visible = options.visible || false;
    L.Util.setOptions(this, options);

    return this;
  }
});

module.exports = function(options) {
  return new DirectionsModule(options);
};
