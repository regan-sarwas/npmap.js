/** 
  1. Create module html
  2. Create button html
  3. Add both to modules container
  4. Also need to hookup to popups
*/

/* globals L */

'use strict';

require('./Module');

var DirectionsModule = L.npmap.Module.extend({
  initialize: function(options) {
    L.Util.setOptions(this, options);
    options.content = 'Testing';
    options.title = 'Directions';
    L.npmap.Module.prototype.initialize.call(this, options);

    return this;
  }
});

module.exports = function(options) {
  return new DirectionsModule(options);
};
