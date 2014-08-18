/* global L */

'use strict';

var corslite = require('corslite'),
  util = require('../util/util');

var GitHubLayer = L.GeoJSON.extend({
  includes: [
    require('../mixin/geojson')
  ],
  options: {
    branch: 'master'
  },
  initialize: function(options) {
    L.Util.setOptions(this, this._toLeaflet(options));

    if (typeof options.data === 'object') {
      this._create(options, options.data);
    } else {
      var me = this;

      util.strict(options.path, 'string');
      util.strict(options.repo, 'string');
      util.strict(options.user, 'string');
      corslite('https://api.github.com/repos/' + options.user + '/' + options.repo + '/contents/' + options.path + '?ref=' + options.branch, function(error, response) {
        if (error) {
          me.fire('error', L.extend(error, {
            message: 'There was an error loading the data from GitHub.'
          }));
        } else {
          me._create(options, JSON.parse(window.atob(JSON.parse(response.responseText).content.replace(/\s/g, ''))));
        }
      }, true);
    }
  },
  _create: function(options, data) {
    L.GeoJSON.prototype.initialize.call(this, data, options);
    this.fire('ready');
    this._loaded = true;
    return this;
  }
});

module.exports = function(options) {
  options = options || {};

  if (options.cluster) {
    return L.npmap.layer._cluster(options);
  } else {
    return new GitHubLayer(options);
  }
};
