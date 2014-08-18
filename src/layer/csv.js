/* global L */

'use strict';

var csv2geojson = require('csv2geojson'),
  util = require('../util/util');

var CsvLayer = L.GeoJSON.extend({
  includes: [
    require('../mixin/geojson')
  ],
  initialize: function(options) {
    var me = this;

    L.Util.setOptions(this, this._toLeaflet(options));

    if (typeof options.data === 'string') {
      me._create(options, options.data);
      return this;
    } else {
      var url = options.url;

      util.strict(url, 'string');
      util.loadFile(url, 'text', function(response) {
        if (response) {
          me._create(options, response);
        } else {
          me.fire('error', {
            message: 'There was an error loading the CSV file.'
          });
        }
      });
    }
  },
  _create: function(options, csv) {
    var me = this;

    csv2geojson.csv2geojson(csv, {}, function(error, data) {
      if (error) {
        me.fire('error', {
          message: error
        });
      } else {
        L.GeoJSON.prototype.initialize.call(me, data, options);
        me.fire('ready');
        me._loaded = true;
      }

      return me;
    });
  }
});

module.exports = function(options) {
  options = options || {};

  if (options.cluster) {
    return L.npmap.layer._cluster(options);
  } else {
    return new CsvLayer(options);
  }
};
