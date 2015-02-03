# Map

## L.npmap.map(config: object)

Create and configure a map with baseLayers, overlays, and controls.

_Extends_: [`L.Map`](http://leafletjs.com/reference.html#map-class)

_Arguments_:

The first, and only, argument is required. It must be a map config object with the following properties:

* (Required) `div` (Object or String): Either an HTML element or the id of an HTML element to render the map into.
* (Optional) `baseLayers` (Array): An array of baseLayer configuration objects AND/OR [baseLayer preset](#baseLayer-presets) strings.
* (Optional) `editControl` (Boolean or Object): Defaults to `undefined`.
* (Optional) `events` (Array): An array of event objects to attach to the map.
* (Optional) `fullscreenControl` (Boolean or Object): Defaults to `undefined`.
* (Optional) `geocoderControl` (Boolean or Object): Defaults to `undefined`.
* (Optional) `hashControl` (Boolean): Defaults to `undefined`.
* (Optional) `homeControl` (Boolean or Object): Defaults to `true`.
* (Optional) `hooks` (Object): Add `init` and/or `preinit` hooks to the map. These must be functions that accept a `callback` parameter, and execute the `callback` function.
* (Optional) `legendControl` (Boolean or Object): Defaults to `undefined`.
* (Optional) `locateControl` (Boolean or Object): Defaults to `undefined`.
* (Optional) `measureControl` (Boolean or Object): Defaults to `undefined`.
* (Optional) `overlays` (Array): An array of overlay configuration objects.
* (Optional) `overviewControl` (Boolean or Object): Defaults to `undefined`.
* (Optional) `printControl` (Boolean or Object): Defaults to `undefined`.
* (Optional) `scaleControl` (Boolean or Object): Defaults to `undefined`.
* (Optional) `smallzoomControl` (Boolean or Object): Defaults to `true`.
* (Optional) `zoomdisplayControl` (Boolean or Object): Defaults to `undefined`.

You can also (optionally) provide any of the options supported by [`L.Map`](http://leafletjs.com/reference.html#map-options).

_Returns_: a map object

_Example (Bootstrap)_:

    var NPMap = {
      div: 'map'
    });

_Example (API)_:

    var map = L.npmap.map({
      div: 'map'
    });

_Working Examples_:

* [Getting Started](http://www.nps.gov/npmap/npmap.js/2.0.0/examples/basic.html)
* [Events](http://www.nps.gov/npmap/npmap.js/2.0.0/examples/events.html)
* [Hooks](http://www.nps.gov/npmap/npmap.js/2.0.0/examples/hooks.html)
* [Multiple Maps on One Page](http://www.nps.gov/npmap/npmap.js/2.0.0/examples/multiple-maps.html)
* [Using Notifications](http://www.nps.gov/npmap/npmap.js/2.0.0/examples/notifications.html)

# Layers

Layers can be added to a map via either the `baseLayers` or `overlays` configs. Only one baseLayer can be visible at a time. Multiple overlays can be visible at the same time.

If adding via the `baseLayers` config, [baseLayer preset](#baseLayer-presets) strings are supported.

_Example (Bootstrap)_:

    var NPMap = {
      div: 'map',
      baseLayers: [
        'bing-aerial'
      ],
      overlays: [{
        table: 'parks',
        type: 'cartodb',
        user: 'nps'
      }]
    };

_Example (API)_:

    var map = L.npmap.map({
      div: 'map'
    });

    L.npmap.layer.bing().addTo(map);
    L.npmap.layer.cartodb({
      table: 'parks',
      type: 'cartodb',
      user: 'nps'
    }).addTo(map);

You can add events to a layer by adding an `events` array to the config. The array should contain event objects with `fn` and `type` properties. These objects can also be given a `single` property if the event should only be fired one time. An example:

    var NPMap = {
      div: 'map',
      overlays: [{
        events: [{
          fn: function() {
            console.log('tileloadstart');
          },
          type: 'tileloadstart'
        }],
        table: 'parks',
        type: 'cartodb',
        user: 'nps'
      }]
    };

Supported event "types" include all of the Leaflet layer events for a given layer type, as well as:

* `error`: Fired when a layer error occurs. Passes the error event object to the event function.
* `load`: Fired when a layer is loaded. Only available for layers that extend `L.GeoJson`.
* `ready`: Fires when a layer is "ready".

_Working Examples_:

* [baseLayer Presets](http://www.nps.gov/npmap/npmap.js/2.0.0/examples/baselayer-presets.html)
* [Events](http://www.nps.gov/npmap/npmap.js/2.0.0/examples/events.html)

## L.npmap.layer.arcgisserver(config: object)

Create a layer from an ArcGIS Server tiled or dynamic map service, including services hosted on ArcGIS Online, and add it to a map.

_Extends_:

* Tiled ArcGIS Server layers extend [`L.TileLayer`](http://leafletjs.com/reference.html#tilelayer).
* Dynamic ArcGIS Server layers extend [`L.Class`](http://leafletjs.com/reference.html#class).

_Arguments_:

The first, and only, argument is required. It must be a layer config object with the following properties:

* (Required) `tiled` (Boolean): Should be `true` if the service is tiled and `false` if it is not.
* (Required) `url` (String): A URL string ending with "MapServer" for the ArcGIS Server service.
* (Optional) `attribution` (String): An attribution string for the layer. HTML is allowed.
* (Optional) `clickable` (Boolean): Should interactivity (click) operations be enabled for this layer? Defaults to `true`.
* (Optional) `description` (String): Descriptive text for the layer. Used in legends, modules, and controls.
* (Optional) `dynamicAttribution` (String): The URL of a [dynamic attribution](http://blogs.esri.com/esri/arcgis/2012/08/15/dynamic-attribution-is-here/) endpoint for the service.
* (Optional) `layers` (String): A comma-delimited string of the ArcGIS Server integer layer identifiers to bring into the NPMap.js layer.
* (Optional) `name` (String): A name for the layer. Used in legends, modules, and controls.
* (Optional) `popup` (String OR Function): Configures the contents of the popup for an overlay. Either a Handlebars HTML template string or a function that is passed the data properties for a shape and returns an HTML string.

You can also (optionally) provide any of the options supported by [`L.TileLayer`](http://leafletjs.com/reference.html#tilelayer).

_Returns_: a layer object

_Example (Bootstrap)_:

    var NPMap = {
      div: 'map',
      overlays: [{
        attribution: '<a href="http://www.esri.com">Esri</a>',
        opacity: 0.5,
        tiled: true,
        type: 'arcgisserver',
        url: 'http://services.arcgisonline.com/ArcGIS/rest/services/Demographics/USA_Unemployment_Rate/MapServer'
      }]
    };

_Example (API)_:

    var map = L.npmap.map({
      div: 'map'
    });

    L.npmap.layer.arcgisserver({
      attribution: '<a href="http://www.esri.com">Esri</a>',
      opacity: 0.5,
      tiled: true,
      url: 'http://services.arcgisonline.com/ArcGIS/rest/services/Demographics/USA_Unemployment_Rate/MapServer'
    }).addTo(map);

_Working Examples_:

* [ArcGIS Server Layer](http://www.nps.gov/npmap/npmap.js/2.0.0/examples/arcgisserver-layer.html)

## L.npmap.layer.bing(config: object)

Create a layer from the [Bing Imagery API](http://msdn.microsoft.com/en-us/library/ff701721.aspx) and add it to a map.

_Extends_: [`L.TileLayer`](http://leafletjs.com/reference.html#tilelayer)

_Arguments_:

The first, and only, argument is required. It must be a layer config object with the following properties:

* (Optional) `attribution` (String): The attribution string for this layer. HTML is accepted.
- (Optional) `layer` (String): The layer you want to bring in from the Bing Imagery API. Defaults to `aerial`. Valid options are `aerial`, `aerialwithlabels`, and `road`.
* (Optional) `name` (String): A name for your layer. Used by a variety of map [controls](#controls), if present.

You can also (optionally) provide any of the options supported by [`L.TileLayer`](http://leafletjs.com/reference.html#tilelayer).

_Returns_: a layer object

_Example (Bootstrap)_:

    var NPMap = {
      div: 'map',
      baseLayers: [{
        layer: 'aerialwithlabels',
        type: 'bing'
      }]
    };

_Example (API)_:

    var map = L.npmap.map({
      div: 'map'
    });

    L.npmap.layer.bing({
      layer: 'aerialwithlabels'
    }).addTo(map);

_Working Examples_:

* [Bing Layer](http://www.nps.gov/npmap/npmap.js/2.0.0/examples/bing-layer.html)

## L.npmap.layer.cartodb(config: object)

Create a [CartoDB](http://cartodb.com) layer and add it to a map.

_Extends_: [`L.TileLayer`](http://leafletjs.com/reference.html#tilelayer)

_Arguments_:

The first, and only, argument is required. It must be a layer config object with the following properties:

* (Required) `table` (String): The name of the CartoDB table.
* (Required) `user` (String): The name of the CartoDB user.
* (Optional) `attribution` (String): The attribution string for this layer. HTML is accepted.
* (Optional) `cartocss` (String): A [CartoCSS](https://www.mapbox.com/tilemill/docs/manual/carto/) string to apply to the layer.
* (Optional) `clickable` (Boolean): Should interactivity (hover and click) operations be enabled for this layer? Defaults to `true`.
* (Optional) `interactivity` (String): A comma-delimited string of fields to pull from CartoDB for interactivity (available via mouseover and click operations).
* (Optional) `name` (String): A name for your layer. Used by a variety of map [controls](#controls), if present.
* (Optional) `sql` (String): A SQL query to pass to CartoDB.

You can also (optionally) provide any of the options supported by [`L.TileLayer`](http://leafletjs.com/reference.html#tilelayer).

_Returns_: a layer object

_Example (Bootstrap)_:

    var NPMap = {
      div: 'map',
      overlays: [{
        table: 'parks',
        type: 'cartodb',
        user: 'nps'
      }]
    };

_Example (API)_:

    var map = L.npmap.map({
      div: 'map'
    });

    L.npmap.layer.cartodb({
      table: 'parks',
      type: 'cartodb',
      user: 'nps'
    }).addTo(map);

_Working Examples_:

* [CartoDB Layer](http://www.nps.gov/npmap/npmap.js/2.0.0/examples/cartodb-layer.html)

## L.npmap.layer.csv(config: object)

Create a CSV layer and add it to a map.

_Extends_: [`L.GeoJSON`](http://leafletjs.com/reference.html#geojson)

_Arguments_:

The first, and only, argument is required. It must be a layer config object with the following properties:

* (Required) `data` (String): The string of CSV data.

_OR_

* (Required) `url` (String): A URL to load the CSV data from. Required if `data` is not provided.

_AND_

* (Optional) `attribution` (String): The attribution string for this layer. HTML is accepted.
* (Optional) `clickable` (Boolean): Should interactivity (hover and click) operations be enabled for this layer? Defaults to `true`.
* (Optional) `cluster` (Boolean): Should the layer's markers be clustered?
* (Optional) `popup` (Object): A popup config object.
* (Optional) `styles` (Object): A styles config object.
* (Optional) `name` (String): A name for your layer. Used by a variety of map [controls](#controls), if present.

You can also (optionally) provide any of the options supported by [`L.GeoJSON`](http://leafletjs.com/reference.html#geojson-options), minus these exceptions:

1. `pointToLayer`
2. `style`
3. `onEachFeature`

These three options are not supported because they are used internally by NPMap.js. If provided, they will be overwritten by NPMap.js.

_Example (Bootstrap)_:

    var NPMap = {
      div: 'map',
      overlays: [{
        type: 'csv',
        url: 'data/colorado_cities.csv'
      }]
    });

_Example (API)_:

    var map = L.npmap.map({
      div: 'map'
    });

    L.npmap.layer.csv({
      url: 'data/colorado_cities.csv'
    }).addTo(map);

_Working Examples_:

* [CSV Layer](http://www.nps.gov/npmap/npmap.js/2.0.0/examples/csv-layer.html)
* [CSV Layer (Clustered)](http://www.nps.gov/npmap/npmap.js/2.0.0/examples/csv-layer-clustered.html)

## L.npmap.layer.geojson(config: object)

Create a GeoJSON layer and add it to a map.

_Extends_: [`L.GeoJSON`](http://leafletjs.com/reference.html#geojson)

_Arguments_:

The first, and only, argument is required. It must be a layer config object with the following properties:

* (Required) `data` (Object): The GeoJSON object.

_OR_

* (Required) `url` (String): A URL to load the GeoJSON data from. Required if `data` is not provided.

_AND_

* (Optional) `attribution` (String): The attribution string for this layer. HTML is accepted.
* (Optional) `clickable` (Boolean): Should interactivity (hover and click) operations be enabled for this layer? Defaults to `true`.
* (Optional) `cluster` (Boolean): Should the layer's markers be clustered?
* (Optional) `popup` (Object): A popup config object.
* (Optional) `styles` (Object): A styles config object.
* (Optional) `name` (String): A name for your layer. Used by a variety of map [controls](#controls), if present.

You can also (optionally) provide any of the options supported by [`L.GeoJSON`](http://leafletjs.com/reference.html#geojson-options), minus these exceptions:

1. `pointToLayer`
2. `style`
3. `onEachFeature`

These three options are not supported because they are used internally by NPMap.js. If provided, they will be overwritten by NPMap.js.

_Example (Bootstrap)_:

    var NPMap = {
      div: 'map',
      overlays: [{
        type: 'geojson',
        url: 'data/national_parks.geojson'
      }]
    });

_Example (API)_:

    var map = L.npmap.map({
      div: 'map'
    });

    L.npmap.layer.geojson({
      url: 'data/national_parks.geojson'
    }).addTo(map);

_Working Examples_:

* [GeoJSON Layer](http://www.nps.gov/npmap/npmap.js/2.0.0/examples/geojson-layer.html)
* [GeoJSON Layer (Clustered)](http://www.nps.gov/npmap/npmap.js/2.0.0/examples/geojson-layer-clustered.html)

## L.npmap.layer.github(config: object)

Create a GitHub layer and add it to a map.

NOTE: This layer handler utilizes the GitHub API to pull data in. This API is limited to 60 requests per hour, so GitHub layers should only be used in development maps. For production maps, you should setup a [GitHub Pages](http://pages.github.com/) site and utilize the CSV, GeoJSON, or KML layer handlers.

_Arguments_:

The first, and only, argument is required, and must be a layer config object with the following properties:

* (Required) `path` (String): The path to your GitHub file. This _should not_ include your GitHub organization/user name or the name of the repository. This is the path to the GeoJSON file in your GitHub repository: e.g. `fire/CA-STF-HV2F.geojson`.
* (Required) `repo` (String): The name of the repository that contains the data.
* (Required) `user` (String): The name of the organization or user that owns the repository.
* (Optional) `attribution` (String): The attribution string for this layer. HTML is accepted.
* (Optional) `branch` (String) The name of the branch your GitHub file should be pulled in from. Defaults to `master`.
* (Optional) `clickable` (Boolean): Should interactivity (hover and click) operations be enabled for this layer? Defaults to `true`.
* (Optional) `name` (String): A name for your layer. Used by a variety of map [controls](#controls), if present.

You can also (optionally) provide any of the options supported by [`L.GeoJSON`](http://leafletjs.com/reference.html#geojson-options), minus these exceptions:

1. `pointToLayer`
2. `style`
3. `onEachFeature`

These three options are not supported because they are used internally by NPMap.js. If provided, they will be overwritten by NPMap.js.

_Example (Bootstrap)_:

    var NPMap = {
      div: 'map',
      overlays: [{
        branch: 'gh-pages',
        path: 'base_data/boundaries/parks/yose.topojson',
        repo: 'data',
        type: 'github',
        user: 'nationalparkservice'
      }]
    });

_Example (API)_:

    var map = L.npmap.map({
      div: 'map'
    });

    L.npmap.layer.github({
      branch: 'gh-pages',
      path: 'base_data/boundaries/parks/yose.topojson',
      repo: 'data',
      user: 'nationalparkservice'
    }).addTo(map);

_Working Examples_:

* [GitHub Layer](http://www.nps.gov/npmap/npmap.js/2.0.0/examples/github-layer.html)

## L.npmap.layer.kml(config: object)

Create a KML layer and add it to a map.

NOTE: For NPMap.js to load KML data, the data must be formatted properly.

_Arguments_:

The first, and only, argument is required, and must be a layer config object with the following properties:

* (Required) `data` (Object): The string of KML data.

_OR_

* (Required) `url` (String): A URL to load the KML data from. Required if `data` is not provided.

_AND_

* (Optional) `attribution` (String): The attribution string for this layer. HTML is accepted.
* (Optional) `clickable` (Boolean): Should interactivity (hover and click) operations be enabled for this layer? Defaults to `true`.
* (Optional) `cluster` (Boolean): Should the layer's markers be clustered?
* (Optional) `name` (String): A name for your layer. Used by a variety of map [controls](#controls), if present.
* (Optional) `popup` (Object): A popup config object.
* (Optional) `styles` (Object): A styles config object.

You can also (optionally) provide any of the options supported by [`L.GeoJSON`](http://leafletjs.com/reference.html#geojson-options), minus these exceptions:

1. `pointToLayer`
2. `style`
3. `onEachFeature`

These three options are not supported because they are used internally by NPMap.js. If provided, they will be overwritten by NPMap.js.

_Example (Bootstrap)_:

    var NPMap = {
      div: 'map',
      overlays: [{
        type: 'kml',
        url: 'data/national_parks.kml'
      }]
    });

_Example (API)_:

    var map = L.npmap.map({
      div: 'map'
    });

    L.npmap.layer.kml({
      url: 'data/national_parks.kml'
    }).addTo(map);

_Working Examples_:

* [KML Layer](http://www.nps.gov/npmap/npmap.js/2.0.0/examples/kml-layer.html)
* [KML Layer (Clustered)](http://www.nps.gov/npmap/npmap.js/2.0.0/examples/kml-layer-clustered.html)

## L.npmap.layer.mapbox(config: object)

Create a Mapbox layer and add it to a map.

_Arguments_:

The first, and only, argument is required, and must be a layer config object with the following properties:

* (Required) `id` (String): The id ("account.id") of the Mapbox map or dataset you want to add to the map. Can also be a comma-delimited string with multiple "account.id" strings if you want to take advantage of Mapbox's compositing feature. Required if `tileJson` is not provided.

OR

* (Required) `tileJson` (Object): A tileJson object for the Mapbox map or tileset you want to add to the map. Required if `id` is not provided.

AND

* (Optional) `attribution` (String): The attribution string for this layer. HTML is accepted.
* (Optional) `clickable` (Boolean): Should interactivity (hover and click) operations be enabled for this layer? Defaults to `true`.
* (Optional) `format` (String): One of the following: `jpg70`, `jpg80`, `jpg90`, `png`, `png32`, `png64`, `png128`, or `png256`. Dfaults to `png`.
* (Optional) `name` (String): A name for your layer. Used by a variety of map [controls](#controls), if present.

You can also (optionally) provide any of the options supported by [`L.TileLayer`](http://leafletjs.com/reference.html#tilelayer).

_Example (Bootstrap)_:

    var NPMap = {
      div: 'map',
      overlays: [{
        id: 'examples.map-20v6611k',
        type: 'mapbox'
      }]
    });

_Example (API)_:

    var map = L.npmap.map({
      div: 'map'
    });

    L.npmap.layer.mapbox({
      id: 'examples.map-20v6611k'
    }).addTo(map);

_Working Examples_:

* [Mapbox Layer](http://www.nps.gov/npmap/npmap.js/2.0.0/examples/mapbox-layer.html)

## L.npmap.layer.spot(config: object)

Create a SPOT layer and add it to a map.

_Arguments_:

The first, and only, argument is required, and must be a layer config object with the following properties:

* (Required) `id` (String): The id of the SPOT device whose data you want to add to the map.
* (Optional) `attribution` (String): The attribution string for this layer. HTML is accepted.
* (Optional) `clickable` (Boolean): Should interactivity (hover and click) operations be enabled for this layer? Defaults to `true`.
* (Optional) `cluster` (Boolean): Should the layer's markers be clustered?
* (Optional) `name` (String): A name for your layer. Used by a variety of map [controls](#controls), if present.
* (Optional) `popup` (Object): A popup config object.
* (Optional) `styles` (Object): A styles config object.
* (Optional) `zoomToBounds` (Boolean): Do you want to zoom the map to the extent of the points loaded from the SPOT device?

You can also (optionally) provide any of the options supported by [`L.GeoJSON`](http://leafletjs.com/reference.html#geojson-options), minus these exceptions:

1. `pointToLayer`
2. `style`
3. `onEachFeature`

These three options are not supported because they are used internally by NPMap.js. If provided, they will be overwritten by NPMap.js.

_Example (Bootstrap)_:

    var NPMap = {
      div: 'map',
      overlays: [{
        id: '08HVpMLpDksQjCeBL1FbTkqGHP4Bk7dfg',
        type: 'spot'
      }]
    });

_Example (API)_:

    var map = L.npmap.map({
      div: 'map'
    });

    L.npmap.layer.spot({
      id: '08HVpMLpDksQjCeBL1FbTkqGHP4Bk7dfg'
    }).addTo(map);

_Working Examples_:

* [SPOT Layer](http://www.nps.gov/npmap/npmap.js/2.0.0/examples/spot-layer.html)

## L.npmap.layer.tiled(config: object)

Create a tiled layer and add it to a map.

_Arguments_:

The first, and only, argument is required, and must be a layer config object with the following properties:

* (Required) `url` (String): The templated URL string. Accepted parameters are:
  * `{{s}}`: Subdomain
  * `{{x}}`: X coordinate
  * `{{y}}`: Y coordinate
  * `{{z}}`: Zoom level
* (Optional) `attribution` (String): The attribution string for this layer. HTML is accepted.
* (Optional) `name` (String): A name for your layer. Used by a variety of map [controls](#controls), if present.

You can also (optionally) provide any of the options supported by [`L.TileLayer`](http://leafletjs.com/reference.html#tilelayer).

_Example (Bootstrap)_:

    var NPMap = {
      div: 'map',
      overlays: [{
        attribution: '&copy; <a href="http://openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        type: 'tiled',
        url: 'http://{s}.tile.osm.org/{z}/{x}/{y}.png'
      }]
    });

_Example (API)_:

    var map = L.npmap.map({
      div: 'map'
    });

    L.npmap.layer.tiled({
      attribution: '&copy; <a href="http://openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      url: 'http://{s}.tile.osm.org/{z}/{x}/{y}.png'
    }).addTo(map);

_Working Examples_:

* [Tiled Layer](http://www.nps.gov/npmap/npmap.js/2.0.0/examples/tiled-layer.html)

## L.npmap.layer.wms(config: object)

Create a WMS layer and add it to a map.

_Arguments_:

The first, and only, argument is required, and must be a layer config object with the following properties:

* (Required) `layers` (String): A comma-delimited string of the layers from the WMS service to add to the layer.
* (Required) `url` (String): The URL to the WMS service.
* (Optional) `attribution` (String): The attribution string for this layer. HTML is accepted.
* (Optional) `name` (String): A name for your layer. Used by a variety of map [controls](#controls), if present.

You can also (optionally) provide any of the options supported by [`L.TileLayer.WMS`](http://leafletjs.com/reference.html#tilelayer-wms).

_Example (Bootstrap)_:

    var NPMap = {
      div: 'map',
      overlays: [{
        attribution: 'NOAA',
        format: 'image/png',
        layers: 'RAS_RIDGE_NEXRAD',
        transparent: true,
        type: 'wms',
        url: 'http://nowcoast.noaa.gov/wms/com.esri.wms.Esrimap/obs'
      }]
    });

_Example (API)_:

    var map = L.npmap.map({
      div: 'map'
    });

    L.npmap.layer.wms({
      attribution: 'NOAA',
      format: 'image/png',
      layers: 'RAS_RIDGE_NEXRAD',
      transparent: true,
      url: 'http://nowcoast.noaa.gov/wms/com.esri.wms.Esrimap/obs'
    }).addTo(map);

_Working Examples_:

* [WMS Layer](http://www.nps.gov/npmap/npmap.js/2.0.0/examples/wms-layer.html)

## L.npmap.layer.zoomify(config: object)

Create a Zoomify layer and add it to a map.

NOTE: Zoomify layers do not contain spatial reference information, so they will not work with other layers. Because of this, when a Zoomify layer is added to a map, NPMap.js ignores any other layers specified in the `baseLayers` and/or `overlays` configs.

_Arguments_:

The first, and only, argument is required, and must be a layer config object with the following properties:

* (Required) `height` (Number): The height of the Zoomify layer.
* (Required) `url` (String): The URL path to the directory that contains the Zoomify tiles.
* (Required) `width` (Number): The width of the Zoomify layer.
* (Optional) `attribution` (String): The attribution string for this layer. HTML is accepted.
* (Optional) `name` (String): A name for your layer. Used by a variety of map [controls](#controls), if present.
* (Optional) `tolerance` (Number): The tolerance to use when calculating the best initial zoom level. Defaults to `0.8`.

You can also (optionally) provide any of the options supported by [`L.TileLayer`](http://leafletjs.com/reference.html#tilelayer).

_Example (Bootstrap)_:

    var NPMap = {
      div: 'map',
      overlays: [{
        height: 2737,
        type: 'zoomify',
        url: 'data/parkmaps/maca/img/',
        width: 6543
      }]
    });

_Example (API)_:

    var map = L.npmap.map({
      div: 'map'
    });

    L.npmap.layer.zoomify({
      height: 2737,
      url: 'data/parkmaps/maca/img/',
      width: 6543
    }).addTo(map);

_Working Examples_:

* [Zoomify Layer](http://www.nps.gov/npmap/npmap.js/2.0.0/examples/zoomify-layer.html)

<h1 id="controls">Controls</h1>

## L.npmap.editControl(config: object)

Create an edit control that supports adding markup shapes (points, lines, and polygons), and add it to a map.

## L.npmap.fullscreenControl(config: object)

Create a fullscreen control that toggles the map in and out of fullscreen mode and add it to a map.

## L.npmap.geocoderControl(config: object)

Create a geocoder control that searches through both an index of National Parks and a more detailed geocoding service and add it to a map

_Arguments_:

* (Optional) `provider` (String): Which supported provider should be used? Defaults to `esri`. Valid options are `bing`, `esri`, `mapquest`, and `nominatim`.

You can also (optionally) provide any of the options supported by [`L.Control`](http://leafletjs.com/reference.html#control).

_Example_:

    var NPMap = {
      div: 'map',
      geocoderControl: true
    };

## L.npmap.hashControl(config: object)

Create a control that updates the URL with current location and zoom information and add it to a map.

_Arguments_:

No arguments are accepted.

_Example_:

    var NPMap = {
      div: 'map',
      hashControl: true
    };

## L.npmap.homeControl(config: object)

Create a control that zooms and/or pans the map back to its initial center and zoom and add it to a map. Is on, by default, for new maps.

_Arguments_:

You can (optionally) provide any of the options supported by [`L.Control`](http://leafletjs.com/reference.html#control).

_Example_:

    var NPMap = {
      div: 'map',
      homeControl: true
    };

## L.npmap.legendControl(config: object)

## L.npmap.locateControl(config: object)

## L.npmap.measureControl(config: object)

## L.npmap.overviewControl(config: object)

Create a map control that provides context for the currently-visible area of the map and it to a map. Adapted from the [Leaflet-MiniMap](https://github.com/Norkart/Leaflet-MiniMap) plugin.

_Arguments_:

The first, and only, argument is required, and must be a config object with the following properties:

* (Optional) `autoToggleDisplay` (Boolean): Should the overview hide automatically if the parent map bounds does not fit within the bounds of the overview map? Defaults to `false`.
* (Optional) `height` (Number): The height of the overview map. Defaults to 150 pixels.
* (Optional) `layer` (String|Object): A layer config object that you would like to add to the map. Can either be a layer preset string or a layer config object. If this is `undefined`, NPMap.js uses the baseLayer that is currently visible on the parent map.
* (Optional) `toggleDisplay` (Boolean): Should the overview map be togglable? Defaults to `true`.
* (Optional) `width` (Number): The width of the overview map. Defaults to 150 pixels.
* (Optional) `zoomLevelFixed` (Number): Overrides `zoomLevelOffset`, sets the map to a fixed zoom level.
* (Optional) `zoomLevelOffset` (Number): A positive or negative number that configures the overview map to a zoom level relative to the zoom level of the main map.

You can also (optionally) provide any of the options supported by [`L.Control`](http://leafletjs.com/reference.html#control).

_Example_:

    var NPMap = {
      div: 'map',
      overviewControl: {
        layer: 'mapbox-light'
      }
    };

## L.npmap.printControl(config: object)

## L.npmap.scaleControl(config: object)

## L.npmap.smallzoomControl(config: object)

Create a map control that contains zoom in/out buttons and add it to a map. Is on, by default, for new maps.

_Arguments_:

You can (optionally) provide any of the options supported by [`L.Control`](http://leafletjs.com/reference.html#control).

_Example_:

    var NPMap = {
      div: 'map',
      smallzoomControl: true
    }

## L.npmap.switcherControl(config: object)

The switcher control is used and controlled internally by NPMap.js. It is created and added to your map when more than one layer config is present in the `baseLayers` config of your map configuration object.

## L.npmap.zoomdisplayControl(config: object)

<h1 id="modules">Modules</h1>

Docs for `L.npmap.module` coming soon.

# Icons

## L.npmap.icon.maki(config: object)

## L.npmap.icon.npmaki(config: object)

# Presets

<h2 id="baseLayer-presets">baseLayer</h2>

## NPS

* `nps-darkStreets`
* `nps-lightStreets`
* `nps-neutralTerrain`
* `nps-parkTiles`
* `nps-parkTilesImagery`
* `nps-satelliteNight`

## Bing

* `bing-aerial`
* `bing-aerialLabels`
* `bing-roads`

## CartoDB

* `cartodb-darkMatter`
* `cartodb-darkMatterNoLabels`
* `cartodb-positron`
* `cartodb-positronNoLabels`

## Esri

* `esri-gray`
* `esri-imagery`
* `esri-nationalGeographic`
* `esri-oceans`
* `esri-shadedRelief`
* `esri-streets`
* `esri-terrain`
* `esri-topographic`

## Mapbox

* `mapbox-dark`
* `mapbox-emerald`
* `mapbox-highContrast`
* `mapbox-light`
* `mapbox-outdoors`
* `mapbox-pencil`
* `mapbox-satellite`
* `mapbox-satelliteLabels`
* `mapbox-streets`
* `mapbox-terrain`

## OpenStreetMap

* `openstreetmap`

## Stamen

* `stamen-terrain`
* `stamen-toner`
* `stamen-watercolor`

# Utils

Docs for `L.npmap.util` coming soon.

# Concepts

## Using Popups

Popups display when you click on a feature in an overlay. Each popup is made up of three markup sections, with each having one or more nested subsection:

1. Header
   1. Title
2. Content
   1. Media
   2. Description
3. Footer
   1. Actions

If you do not specify a `popup` property on your layer object, NPMap.js will use a set of sensible defaults to configure the popup. If, however, you specify a `popup` property on your layer object, NPMap.js will only implement what you have specified. For example, if your `popup` property looks like this:

    popup: {
      title: '{{Name}}'
    }

NPMap.js will only display the title in the popup and will not render any other popup elements.

### Configuration

The content for each of the sections of a popup should be specified individually via a `popup` configuration object:

    var NPMap = {
      ...
      overlays: [{
        ...
        popup: {
          // {Array}, {String}, or {Function}. If a {Function}, it must return an {Array} or {String}.
          actions: [{
            handler: function() {
              window.alert('Clicked!');
            },
            text: 'Click Me!' // No HTML, but Handlebars is supported
          },{
            menu: [{
              handler: function() {
                window.alert('You clicked Menu Item 1');
              },
              text: 'Menu Item 1' // No HTML, but Handlebars is supported
            },{
              handler: function() {
                window.alert('You clicked Menu Item 2');
              },
              text: 'Menu Item 2' // No HTML, but Handlebars is supported
            }],
            text: 'Menu' // No HTML, but Handlebars is supported
          }],
          // {Object}, {String} or {Function}. If a {Function}, it must return an {Object} or {String}.
          description: '<p style="color:red;">{{description}}</p>',
          // A config object
          description: {
            // {Array} (if null, defaults to 'all')
            fields: [
              'Name',
              'Description'
            ],
            // {String} ('table' or 'list')
            format: 'table'
          },
          // {Array}, {String}, or {Function} (that returns an {Array} or {String})
          media: [{
            id: '',
            type: 'focus'
          }],
          // No HTML, but Handlebars is supported
          more: '{{}}',
          // {String} or {Function} (that returns a {String}) - supports Handlebars and HTML )
          title: function(data) {
            if (data.level > 5) {
              return 'Greater than 5!';
            } else {
              return 'Less than 5!';
            }
          }
        }
      }]
    };

If you are embedding media (images, audio, and/or video) in your popup, you should hardcode the height and width of the media in your HTML so NPMap.js can size the popup appropriately:

    var NPMap = {
      ...
      overlays: [{
        ...
        popup: {
          description: '<img src="{{img_url}}" style="height:300px;width:400px;">'
        }
      }]
    };

[HTML](http://en.wikipedia.org/wiki/HTML) and [Handlebars](http://handlebarsjs.com/) are supported for most popup elements. NPMap.js also adds a number of "helpers" to Handlebars. These helpers can be used to format popups:

<ul>
  <li>ifCond<pre><code>// Available operators include '!=', '!==', '==', '===', '&lt;', '&lt;=', '&gt;', '&gt;=', '&&', and '||'
description: "I am {{#ifCond Name '===' 'A Rectangle'}}indeed{{else}}not{{/ifCond}} a rectangle! (Verified by a custom Handlebars helper.)"</code></pre></li>
  <li>toLowerCase<pre><code>title: '{{toUpperCase Name}}'</code></pre></li>
  <li>toUpperCase<pre><code>title: '{{toUpperCase Name}}'</code></pre></li>
</ul>

You can see examples of configuring popups for overlays in the [popups](https://github.com/nationalparkservice/npmap.js/blob/master/examples/popups.html) example map.

## Using Tooltips

Tooltips display when you hover over a feature in an overlay. Tooltips only work for layer handlers that support `mouseover` and `mouseout` operations (currently CartoDB, CSV, GeoJSON, GitHub, KML, Mapbox, and SPOT).

Tooltips should be short and succinct. Like popups, HTML and Handlebars strings are supported.

    var NPMap = {
      ...
      overlays: [{
        ...
        tooltip: '{{UnitCode}}'
      }]
    };

You can see examples of configuring tooltips for overlays in the [tooltips example](https://github.com/nationalparkservice/npmap.js/blob/master/examples/tooltips.html).

## Styling Vectors

NPMap.js uses the [simplestyle specification](https://github.com/mapbox/simplestyle-spec), which currently, at v1.1.0, includes the following properties:

    fill
    fill-opacity
    marker-color
    marker-size
    marker-symbol
    stroke
    stroke-opacity
    stroke-width

In addition, NPMap.js supports the following property that is not supported by the simplestyle specification:

    marker-library

This property is optional. It defaults to `maki`, and can also be `npmaki`.

Styles for vector shapes can be set in multiple ways. NPMap.js looks in the following order for styles:

1. In the properties pulled in for each feature from the data source. You can tell NPMap.js to ignore feature styles by setting the "ignoreFeatureStyles" property to true. For example, if a GeoJSON Point feature has a "marker-symbol" property, it will be used to style the marker on the map unless "ignoreFeatureStyles" is set to true in the styles geometry (`line`, `point`, or `polygon`) object of an overlay's configuration.
2. In an overlay's configuration object, via a "styles" property, with `line`, `point`, and/or `polygon` properties designated as:
   1. an object
   2. a function that is passed a data object for each feature and must returns a style object

If no styles are found in these two places, NPMap.js falls back to a set of default styles.

If you prefer not to use the simplestyle specification, you can utilize the out-of-the-box Leaflet styles for the `line` (L.Path), `point` (L.Icon), and `polygon` (L.Path) `styles` object on your overlay configuration. NPMap.js will then pass the object directly to Leaflet.

**An important note**: Style properties cascade. This means that if a "marker-symbol" property is passed in via the data source (e.g. a GeoJSON feature's properties) and a "marker-color" property is passed in via the overlay config object, the geometry will be styled with both the "marker-symbol" AND "marker-color" properties unless the "ignoreFeatureStyles" property is present.

Take a look at the [Styling Vectors example](https://github.com/nationalparkservice/npmap.js/blob/master/examples/styling-vectors.html) to see an example of using the different configuration options to style vector data.

# Notes

<ul>
  <li>NPMap.js extends Leaflet's classes and only provides the interfaces outlined above. It acts as a complement to the larger <a href="http://leafletjs.com/reference.html">Leaflet</a> API.</li>
  <li>NPMap.js adds an <code>L</code> property to every map config object and layer (baselayer or overlay) passed in via the <code>NPMap</code> object. You can use this property to interact programatically with objects created by Leaflet. A few examples:<ul>
    <li><code>NPMap.config.L</code> will get a reference to the <code><a href="http://leafletjs.com/reference.html#map-class">L.Map</a></code> object</li>
    <li><code>NPMap.config.baseLayers[0].L</code> will get a reference to the Leaflet layer object for the first baseLayer</li>
    <li><code>NPMap.config.overlays[0].L</code> will get a reference to the Leaflet layer object for the first overlay</li>
  </ul></li>
  <li>Unlike previous versions of the NPMap library, <code>npmap-bootstrap.js</code> now supports adding multiple maps to a page. Just make the <code>NPMap</code> property an array of map configuration objects:<pre><code>var NPMap = [{
  div: 'example-map-1'
},{
  div: 'example-map-2'
}];
</code></pre></li>
</ul>
