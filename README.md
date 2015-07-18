<p align="center">
  <img src="http://www.nps.gov/npmap/img/nps-arrowhead-medium.png" alt="NPS Arrowhead">
</p>

# NPMap.js

[![Circle CI](https://circleci.com/gh/nationalparkservice/npmap.js.svg?style=svg)](https://circleci.com/gh/nationalparkservice/npmap.js)

Extends [Leaflet](http://leafletjs.com) to include functionality and a look-and-feel built specifically for the National Park Service.

This library is under active development, so please help test and [report issues](https://github.com/nationalparkservice/npmap.js/issues).

## Builder

You may also want to take a look at [NPMap Builder](https://github.com/nationalparkservice/npmap-builder). It is a graphical interface that walks through the process of building a map with NPMap.js, step-by-step.

## Thanks

Heavily inspired (cough cough) by [Mapbox.js](https://github.com/mapbox/mapbox.js), and, of course, built on the great [Leaflet](http://leafletjs.com) library. Standing on the shoulders of giants. Also, many thanks to the authors of all the great plugins used in/by the library (take a look at [LICENSE.md](https://github.com/nationalparkservice/npmap.js/blob/master/LICENSE.md) for a list).

## Versioning

NPMap.js is versioned using [semantic versioining](http://semver.org). This means that releases are numbered: `major.minor.patch` and follow these guidelines:

- Breaking backward compatibility bumps the major (and resets the minor and patch to zero)
- New additions that don't break backward compatibility bumps the minor (and resets the patch to zero)
- Bug fixes and miscellaneous changes bumps the patch

2.0.0 is the first official NPMap.js version. All versions < 2.0.0 are part of the original [NPMap JavaScript library](https://github.com/nationalparkservice/npmap), which has now been deprecated.

## Changelog

- [v2.0.0](https://github.com/nationalparkservice/npmap.js/issues?milestone=1&page=1&state=closed): Under Development

## Hosted Version

NPMap.js is hosted on the National Park Service's content delivery network. Feel free to load the library directly from there. You can access hosted versions at http://www.nps.gov/lib/npmap.js/major.minor.patch/npmap-bootstrap.min.js. You should replace "major.minor.patch" with the number of the version you want to access (e.g. 2.0.0).

## Building

You must have [node.js](http://nodejs.org/) installed to run the build. After installing node.js:

    git clone https://github.com/nationalparkservice/npmap.js
    cd npmap.js
    npm install

Install the [Grunt](http://gruntjs.com/) command line tool (do this once as an admin user after installing node.js):

    npm install -g grunt-cli

Copy secrets.sample.json to a file called secrets.json for development and testing:

    cp secrets.sample.json secrets.json

Then use Grunt to build the library:

    grunt build

Internally, the Grunt task uses [browserify](https://github.com/substack/node-browserify) to combine dependencies. It is installed locally, along with other required packages, when you run `npm install`. The build task also uses [uglify](https://github.com/gruntjs/grunt-contrib-uglify) and [cssmin](https://npmjs.org/package/grunt-contrib-cssmin) to create minified versions in `dist/`.

## Testing

NPMap.js uses the [Mocha](http://mochajs.org) JavaScript test framework, with the [expect.js](https://github.com/Automattic/expect.js) assertion library, and [PhantomJS](http://phantomjs.org/) to run the tests. You can run the tests with either of the following commands:

    grunt test

OR

    npm test

We are working to expand test coverage for the library.

## Documentation

Take a look at [API.md](https://github.com/nationalparkservice/npmap.js/blob/master/API.md).

## Examples

Simple and targeted examples reside in the `examples` directory. This is a great starting point if you haven't used NPMap.js before.

## Support

You can get in touch with the NPMap team by contacting us via Twitter ([@npmap](http://twitter.com/npmap)) or email ([npmap@nps.gov](mailto:npmap@nps.gov)). We are happy to help with any questions, and feedback is welcome as well!
