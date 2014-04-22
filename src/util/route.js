/* globals L */
/* jshint camelcase: false */

'use strict';

var reqwest = require('reqwest');

module.exports = ({
  mapbox: (function() {
    return {
      route: function(latLngs, callback) {
        var locations = '';

        for (var i = 0; i < latLngs.length; i++) {
          var latLng = latLngs[i];

          if (i) {
            locations += ';';
          }

          locations += latLng.lng + ',' + latLng.lat;
        }

        reqwest({
          error: function() {
            callback({
              message: 'The route failed. Please check your network connection.',
              success: false
            });
          },
          success: function(response) {
            console.log(response);
            callback(response);
          },
          type: 'jsonp',
          url: 'http://api.tiles.mapbox.com/v3/nps.map-06dnxzq5/directions/driving/' + locations + '.json'
        });
      }
    };
  })()
});
