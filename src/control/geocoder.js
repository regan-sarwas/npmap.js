/* globals L, module, require */

'use strict'

var geocode = require('../util/geocode')
var reqwest = require('reqwest')
var util = require('../util/util')
var GeocoderControl = L.Control.extend({
  includes: L.Mixin.Events,
  options: {
    position: 'topright',
    provider: 'esri'
  },
  statics: {
    ATTRIBUTIONS: {
      BING: 'Geocoding by Microsoft',
      ESRI: 'Geocoding by Esri',
      MAPQUEST: 'Geocoding by MapQuest',
      NOMINATIM: [
        'Geocoding by Nominatim',
        '&copy; <a href=\'http://openstreetmap.org/copyright\'>OpenStreetMap</a> contributors'
      ]
    }
  },
  initialize: function (options) {
    L.Util.setOptions(this, options)
    return this
  },
  onAdd: function (map) {
    var attribution = GeocoderControl.ATTRIBUTIONS[this.options.provider.toUpperCase()]
    var container = L.DomUtil.create('div', 'leaflet-control-geocoder')
    var stopPropagation = L.DomEvent.stopPropagation

    this._button = L.DomUtil.create('button', 'search', container)
    this._input = L.DomUtil.create('input', '', container)
    this._ul = L.DomUtil.create('ul', 'leaflet-control', container)
    this._initalizeNpsIndex()
    L.DomEvent.disableClickPropagation(this._button)
    L.DomEvent.disableClickPropagation(this._input)
    L.DomEvent.disableClickPropagation(this._ul)
    L.DomEvent
      .on(this._button, 'click', this._geocodeRequest, this)
      .on(this._button, 'mousewheel', stopPropagation)
      .on(this._input, 'focus', function () {
        this.value = this.value
      })
      .on(this._input, 'mousewheel', stopPropagation)
      .on(this._ul, 'mousewheel', stopPropagation)

    this._container = container
    this._button.setAttribute('alt', 'Search')
    this._input.setAttribute('aria-activedescendant', null)
    this._input.setAttribute('aria-autocomplete', 'list')
    this._input.setAttribute('aria-expanded', false)
    this._input.setAttribute('aria-label', 'Geocode')
    this._input.setAttribute('aria-owns', 'geocoder_listbox')
    this._input.setAttribute('placeholder', 'Find a location')
    this._input.setAttribute('role', 'combobox')
    this._input.setAttribute('type', 'text')
    this._ul.setAttribute('id', 'geocoder_listbox')
    this._ul.setAttribute('role', 'listbox')

    if (attribution) {
      if (L.Util.isArray(attribution)) {
        for (var i = 0; i < attribution.length; i++) {
          map.attributionControl.addAttribution(attribution[i])
        }
      } else {
        map.attributionControl.addAttribution(attribution)
      }
    }

    return container
  },
  onRemove: function (map) {
    var attribution = GeocoderControl.ATTRIBUTIONS[this.options.provider.toUpperCase()]

    if (attribution) {
      if (L.Util.isArray(attribution)) {
        for (var i = 0; i < attribution.length; i++) {
          map.attributionControl.removeAttribution(attribution[i])
        }
      } else {
        map.attributionControl.removeAttribution(attribution)
      }
    }
  },
  _checkScroll: function () {
    if (this._selected) {
      var top = util.getPosition(this._selected).top
      var bottom = top + util.getOuterDimensions(this._selected).height
      var scrollTop = this._ul.scrollTop
      var visible = [
        scrollTop,
        scrollTop + util.getOuterDimensions(this._ul).height
      ]

      if (top < visible[0]) {
        this._ul.scrollTop = top - 10
      } else if (bottom > visible[1]) {
        this._ul.scrollTop = top - 10
      }
    }
  },
  _clearResults: function () {
    this._ul.innerHTML = ''
    this._ul.scrollTop = 0
    this._ul.style.display = 'none'
    this._input.setAttribute('aria-activedescendant', null)
    this._input.setAttribute('aria-expanded', false)
    this._selected = null
    this._oldValue = ''
  },
  _geocodeRequest: function () {
    var value = this._input.value

    if (value.length) {
      var me = this

      me._clearResults()
      L.DomEvent.off(me._button, 'click', me._geocodeRequest)
      L.DomUtil.removeClass(me._button, 'search')
      L.DomUtil.addClass(me._button, 'working')
      geocode[me.options.provider](value, function (result) {
        L.DomEvent.on(me._button, 'click', me._geocodeRequest, me)
        L.DomUtil.addClass(me._button, 'search')
        L.DomUtil.removeClass(me._button, 'working')

        if (result && result.success) {
          if (result.results && result.results.length) {
            me._map.fitBounds(result.results[0].bounds)
          } else {
            if (result.message) {

            } else {

            }
          }
        } else {

        }
      })
    }
  },
  _handleSelect: function (li) {
    var id = li.id

    this._clearResults()
    this._isDirty = false
    this._input.value = this._oldValue = id
    this._input.focus()
    this._map.fitBounds(this._bounds[id])
    this._input.setAttribute('aria-activedescendant', id)
  },
  _initalizeNpsIndex: function () {
    var me = this

    reqwest({
      jsonpCallbackName: 'callback',
      success: function (response) {
        me._bounds = {}
        me._oldValue = me._input.value

        for (var key in response) {
          var value = response[key]

          if (value) {
            me._bounds[key] = [
              [value[2], value[3]],
              [value[1], value[0]]
            ]
          }
        }

        L.DomEvent.on(me._input, 'keyup', function (e) {
          var value = this.value

          if (value) {
            var keyCode = e.keyCode

            if (keyCode !== 13 && keyCode !== 27 && keyCode !== 38 && keyCode !== 40) {
              if (value !== me._oldValue) {
                me._isDirty = true
                me._oldValue = value

                if (value.length) {
                  var results = []

                  for (var key in me._bounds) {
                    if (key.toLowerCase().indexOf(value.toLowerCase()) !== -1) {
                      results.push({
                        b: me._bounds[key],
                        d: key
                      })
                    }
                  }

                  if (results.length > 0) {
                    me._clearResults()

                    for (var i = 0; i < results.length; i++) {
                      var d = results[i].d
                      var j = d.toLowerCase().indexOf(value.toLowerCase())
                      var li = L.DomUtil.create('li', null, me._ul)

                      li.id = d
                      li.innerHTML = (d.slice(0, j) + '<strong>' + d.slice(j, j + value.length) + '</strong>' + d.slice(j + value.length))
                      L.DomEvent.on(li, 'click', function () {
                        me._handleSelect(this)
                      })
                    }

                    me._ul.style.display = 'block'
                    me._input.setAttribute('aria-expanded', true)
                  } else {
                    me._clearResults()
                  }
                }
              }
            }
          } else {
            me._clearResults()
          }
        })
        L.DomEvent.on(me._input, 'keydown', function (e) {
          switch (e.keyCode) {
          case 13:
            if (me._selected) {
              me._handleSelect(me._selected)
            } else {
              me._geocodeRequest()
            }
            break
          case 27:
            // Escape
            me._clearResults()
            break
          case 38:
            // Up
            if (me._ul.style.display === 'block') {
              if (me._selected) {
                L.DomUtil.removeClass(me._selected, 'selected')
                me._selected = util.getPreviousSibling(me._selected)
              }

              if (!me._selected) {
                me._selected = me._ul.childNodes[me._ul.childNodes.length - 1]
              }

              L.DomUtil.addClass(me._selected, 'selected')
              me._checkScroll()
            }

            L.DomEvent.preventDefault(e)
            break
          case 40:
            // Down
            if (me._ul.style.display === 'block') {
              if (me._selected) {
                L.DomUtil.removeClass(me._selected, 'selected')
                me._selected = util.getNextSibling(me._selected)
              }

              if (!me._selected) {
                me._selected = me._ul.childNodes[0]
              }

              L.DomUtil.addClass(me._selected, 'selected')
              me._checkScroll()
            }

            L.DomEvent.preventDefault(e)
            break
          }
        })
      },
      type: 'jsonp',
      url: 'http://www.nps.gov/npmap/data/park-bounds.js'
    })
  }
})

L.Map.mergeOptions({
  geocoderControl: false
})
L.Map.addInitHook(function () {
  if (this.options.geocoderControl) {
    var options = {}

    if (typeof this.options.geocoderControl === 'object') {
      options = this.options.geocoderControl
    }

    this.geocoderControl = L.npmap.control.geocoder(options).addTo(this)
  }
})

module.exports = function (options) {
  return new GeocoderControl(options)
}
