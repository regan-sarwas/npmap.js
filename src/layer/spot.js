/* global L */

'use strict';

var reqwest = require('reqwest'),
  util = require('../util/util');

var SpotLayer = L.GeoJSON.extend({
  includes: [
    require('../mixin/geojson')
  ],
  initialize: function(options) {
    var me = this;

    util.strict(options.id, 'string');
    L.Util.setOptions(this, this._toLeaflet(options));
    reqwest({
      success: function(response) {
        var message;

        response = response.response;

        if (response) {
          if (response.feedMessageResponse && response.feedMessageResponse.messages && response.feedMessageResponse.messages.message) {
            var geoJson = {
              features: [],
              type: 'FeatureCollection'
            },
            messages = response.feedMessageResponse.messages.message;

            for (var i = 0; i < messages.length; i++) {
              message = messages[i];

              geoJson.features.push({
                geometry: {
                  coordinates: [message.longitude, message.latitude],
                  type: 'Point'
                },
                properties: message,
                type: 'Feature'
              });
            }

            if (geoJson.features.length) {
              me._create(me.options, geoJson);
            } else {
              var obj;

              message = 'The SPOT service returned invalid data.';
              obj = {
                message: message
              };

              me.fire('error', obj);
              me.errorFired = obj;

              if (me._map) {
                me._map.notify.danger(message);
              }
            }
          } else {
            message = response.errors.error.text;

            me.fire('error', {
              message: message
            });

            if (me._map) {
              me._map.notify.danger(message);
            }
          }
        } else {
          message = 'The SPOT service is unresponsive.';
          me.fire('error', {
            message: message
          });

          if (me._map) {
            me._map.notify.danger(message);
          }
        }
      },
      type: 'jsonp',
      url: 'https://api.findmespot.com/spot-main-web/consumer/rest-api/2.0/public/feed/' + options.id + '/message?callback=?&dir=DESC&sort=timeInMili'
    });

    return this;
  },
  _create: function(options, data) {
    L.GeoJSON.prototype.initialize.call(this, data, options);

    if (options.zoomToBounds) {
      this._map.fitBounds(this.getBounds());
    }

    this.fire('ready');
    this.readyFired = true;
    this._loaded = true;
    return this;
  }
});

module.exports = function(options) {
  return new SpotLayer(options);
};
