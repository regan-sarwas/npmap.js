/**
 * NPMap.js 2.0.0
 * Built on 04/07/2014 at 09:57AM MDT
 * Copyright 2014 National Park Service
 * Licensed under MIT (https://github.com/nationalparkservice/npmap.js/blob/master/LICENSE.md)
 */
(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){

},{}],2:[function(require,module,exports){
module.exports=require(1)
},{}],3:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};

process.nextTick = (function () {
    var canSetImmediate = typeof window !== 'undefined'
    && window.setImmediate;
    var canPost = typeof window !== 'undefined'
    && window.postMessage && window.addEventListener
    ;

    if (canSetImmediate) {
        return function (f) { return window.setImmediate(f) };
    }

    if (canPost) {
        var queue = [];
        window.addEventListener('message', function (ev) {
            var source = ev.source;
            if ((source === window || source === null) && ev.data === 'process-tick') {
                ev.stopPropagation();
                if (queue.length > 0) {
                    var fn = queue.shift();
                    fn();
                }
            }
        }, true);

        return function nextTick(fn) {
            queue.push(fn);
            window.postMessage('process-tick', '*');
        };
    }

    return function nextTick(fn) {
        setTimeout(fn, 0);
    };
})();

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];

function noop() {}

process.on = noop;
process.once = noop;
process.off = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
}

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};

},{}],4:[function(require,module,exports){
var dsv = require('dsv'),
    sexagesimal = require('sexagesimal');

function isLat(f) { return !!f.match(/(Lat)(itude)?/gi); }
function isLon(f) { return !!f.match(/(L)(on|ng)(gitude)?/i); }

function keyCount(o) {
    return (typeof o == 'object') ? Object.keys(o).length : 0;
}

function autoDelimiter(x) {
    var delimiters = [',', ';', '\t', '|'];
    var results = [];

    delimiters.forEach(function(delimiter) {
        var res = dsv(delimiter).parse(x);
        if (res.length >= 1) {
            var count = keyCount(res[0]);
            for (var i = 0; i < res.length; i++) {
                if (keyCount(res[i]) !== count) return;
            }
            results.push({
                delimiter: delimiter,
                arity: Object.keys(res[0]).length,
            });
        }
    });

    if (results.length) {
        return results.sort(function(a, b) {
            return b.arity - a.arity;
        })[0].delimiter;
    } else {
        return null;
    }
}

function auto(x) {
    var delimiter = autoDelimiter(x);
    if (!delimiter) return null;
    return dsv(delimiter).parse(x);
}

function csv2geojson(x, options, callback) {

    if (!callback) {
        callback = options;
        options = {};
    }

    options.delimiter = options.delimiter || ',';

    var latfield = options.latfield || '',
        lonfield = options.lonfield || '';

    var features = [],
        featurecollection = { type: 'FeatureCollection', features: features };

    if (options.delimiter === 'auto' && typeof x == 'string') {
        options.delimiter = autoDelimiter(x);
        if (!options.delimiter) return callback({
            type: 'Error',
            message: 'Could not autodetect delimiter'
        });
    }

    var parsed = (typeof x == 'string') ? dsv(options.delimiter).parse(x) : x;

    if (!parsed.length) return callback(null, featurecollection);

    if (!latfield || !lonfield) {
        for (var f in parsed[0]) {
            if (!latfield && isLat(f)) latfield = f;
            if (!lonfield && isLon(f)) lonfield = f;
        }
        if (!latfield || !lonfield) {
            var fields = [];
            for (var k in parsed[0]) fields.push(k);
            return callback({
                type: 'Error',
                message: 'Latitude and longitude fields not present',
                data: parsed,
                fields: fields
            });
        }
    }

    var errors = [];

    for (var i = 0; i < parsed.length; i++) {
        if (parsed[i][lonfield] !== undefined &&
            parsed[i][lonfield] !== undefined) {

            var lonk = parsed[i][lonfield],
                latk = parsed[i][latfield],
                lonf, latf,
                a;

            a = sexagesimal(lonk, 'EW');
            if (a) lonk = a;
            a = sexagesimal(latk, 'NS');
            if (a) latk = a;

            lonf = parseFloat(lonk);
            latf = parseFloat(latk);

            if (isNaN(lonf) ||
                isNaN(latf)) {
                errors.push({
                    message: 'A row contained an invalid value for latitude or longitude',
                    row: parsed[i]
                });
            } else {
                if (!options.includeLatLon) {
                    delete parsed[i][lonfield];
                    delete parsed[i][latfield];
                }

                features.push({
                    type: 'Feature',
                    properties: parsed[i],
                    geometry: {
                        type: 'Point',
                        coordinates: [
                            parseFloat(lonf),
                            parseFloat(latf)
                        ]
                    }
                });
            }
        }
    }

    callback(errors.length ? errors: null, featurecollection);
}

function toLine(gj) {
    var features = gj.features;
    var line = {
        type: 'Feature',
        geometry: {
            type: 'LineString',
            coordinates: []
        }
    };
    for (var i = 0; i < features.length; i++) {
        line.geometry.coordinates.push(features[i].geometry.coordinates);
    }
    line.properties = features[0].properties;
    return {
        type: 'FeatureCollection',
        features: [line]
    };
}

function toPolygon(gj) {
    var features = gj.features;
    var poly = {
        type: 'Feature',
        geometry: {
            type: 'Polygon',
            coordinates: [[]]
        }
    };
    for (var i = 0; i < features.length; i++) {
        poly.geometry.coordinates[0].push(features[i].geometry.coordinates);
    }
    poly.properties = features[0].properties;
    return {
        type: 'FeatureCollection',
        features: [poly]
    };
}

module.exports = {
    isLon: isLon,
    isLat: isLat,
    csv: dsv.csv.parse,
    tsv: dsv.tsv.parse,
    dsv: dsv,
    auto: auto,
    csv2geojson: csv2geojson,
    toLine: toLine,
    toPolygon: toPolygon
};

},{"dsv":5,"sexagesimal":6}],5:[function(require,module,exports){
var fs = require("fs");

module.exports = new Function("dsv.version = \"0.0.3\";\n\ndsv.tsv = dsv(\"\\t\");\ndsv.csv = dsv(\",\");\n\nfunction dsv(delimiter) {\n  var dsv = {},\n      reFormat = new RegExp(\"[\\\"\" + delimiter + \"\\n]\"),\n      delimiterCode = delimiter.charCodeAt(0);\n\n  dsv.parse = function(text, f) {\n    var o;\n    return dsv.parseRows(text, function(row, i) {\n      if (o) return o(row, i - 1);\n      var a = new Function(\"d\", \"return {\" + row.map(function(name, i) {\n        return JSON.stringify(name) + \": d[\" + i + \"]\";\n      }).join(\",\") + \"}\");\n      o = f ? function(row, i) { return f(a(row), i); } : a;\n    });\n  };\n\n  dsv.parseRows = function(text, f) {\n    var EOL = {}, // sentinel value for end-of-line\n        EOF = {}, // sentinel value for end-of-file\n        rows = [], // output rows\n        N = text.length,\n        I = 0, // current character index\n        n = 0, // the current line number\n        t, // the current token\n        eol; // is the current token followed by EOL?\n\n    function token() {\n      if (I >= N) return EOF; // special case: end of file\n      if (eol) return eol = false, EOL; // special case: end of line\n\n      // special case: quotes\n      var j = I;\n      if (text.charCodeAt(j) === 34) {\n        var i = j;\n        while (i++ < N) {\n          if (text.charCodeAt(i) === 34) {\n            if (text.charCodeAt(i + 1) !== 34) break;\n            ++i;\n          }\n        }\n        I = i + 2;\n        var c = text.charCodeAt(i + 1);\n        if (c === 13) {\n          eol = true;\n          if (text.charCodeAt(i + 2) === 10) ++I;\n        } else if (c === 10) {\n          eol = true;\n        }\n        return text.substring(j + 1, i).replace(/\"\"/g, \"\\\"\");\n      }\n\n      // common case: find next delimiter or newline\n      while (I < N) {\n        var c = text.charCodeAt(I++), k = 1;\n        if (c === 10) eol = true; // \\n\n        else if (c === 13) { eol = true; if (text.charCodeAt(I) === 10) ++I, ++k; } // \\r|\\r\\n\n        else if (c !== delimiterCode) continue;\n        return text.substring(j, I - k);\n      }\n\n      // special case: last token before EOF\n      return text.substring(j);\n    }\n\n    while ((t = token()) !== EOF) {\n      var a = [];\n      while (t !== EOL && t !== EOF) {\n        a.push(t);\n        t = token();\n      }\n      if (f && !(a = f(a, n++))) continue;\n      rows.push(a);\n    }\n\n    return rows;\n  };\n\n  dsv.format = function(rows) {\n    if (Array.isArray(rows[0])) return dsv.formatRows(rows); // deprecated; use formatRows\n    var fieldSet = {}, fields = [];\n\n    // Compute unique fields in order of discovery.\n    rows.forEach(function(row) {\n      for (var field in row) {\n        if (!(field in fieldSet)) {\n          fields.push(fieldSet[field] = field);\n        }\n      }\n    });\n\n    return [fields.map(formatValue).join(delimiter)].concat(rows.map(function(row) {\n      return fields.map(function(field) {\n        return formatValue(row[field]);\n      }).join(delimiter);\n    })).join(\"\\n\");\n  };\n\n  dsv.formatRows = function(rows) {\n    return rows.map(formatRow).join(\"\\n\");\n  };\n\n  function formatRow(row) {\n    return row.map(formatValue).join(delimiter);\n  }\n\n  function formatValue(text) {\n    return reFormat.test(text) ? \"\\\"\" + text.replace(/\\\"/g, \"\\\"\\\"\") + \"\\\"\" : text;\n  }\n\n  return dsv;\n}\n" + ";return dsv")();

},{"fs":1}],6:[function(require,module,exports){
module.exports = function(x, dims) {
    if (!dims) dims = 'NSEW';
    if (typeof x !== 'string') return null;
    var r = /^([0-9.]+)°? *(?:([0-9.]+)['’′‘] *)?(?:([0-9.]+)(?:''|"|”|″) *)?([NSEW])?/,
        m = x.match(r);
    if (!m) return null;
    else if (m[4] && dims.indexOf(m[4]) === -1) return null;
    else return (((m[1]) ? parseFloat(m[1]) : 0) +
        ((m[2] ? parseFloat(m[2]) / 60 : 0)) +
        ((m[3] ? parseFloat(m[3]) / 3600 : 0))) *
        ((m[4] && m[4] === 'S' || m[4] === 'W') ? -1 : 1);
};

},{}],7:[function(require,module,exports){
"use strict";
/*globals Handlebars: true */
var Handlebars = require("./handlebars.runtime")["default"];

// Compiler imports
var AST = require("./handlebars/compiler/ast")["default"];
var Parser = require("./handlebars/compiler/base").parser;
var parse = require("./handlebars/compiler/base").parse;
var Compiler = require("./handlebars/compiler/compiler").Compiler;
var compile = require("./handlebars/compiler/compiler").compile;
var precompile = require("./handlebars/compiler/compiler").precompile;
var JavaScriptCompiler = require("./handlebars/compiler/javascript-compiler")["default"];

var _create = Handlebars.create;
var create = function() {
  var hb = _create();

  hb.compile = function(input, options) {
    return compile(input, options, hb);
  };
  hb.precompile = function (input, options) {
    return precompile(input, options, hb);
  };

  hb.AST = AST;
  hb.Compiler = Compiler;
  hb.JavaScriptCompiler = JavaScriptCompiler;
  hb.Parser = Parser;
  hb.parse = parse;

  return hb;
};

Handlebars = create();
Handlebars.create = create;

exports["default"] = Handlebars;
},{"./handlebars.runtime":8,"./handlebars/compiler/ast":10,"./handlebars/compiler/base":11,"./handlebars/compiler/compiler":12,"./handlebars/compiler/javascript-compiler":13}],8:[function(require,module,exports){
"use strict";
/*globals Handlebars: true */
var base = require("./handlebars/base");

// Each of these augment the Handlebars object. No need to setup here.
// (This is done to easily share code between commonjs and browse envs)
var SafeString = require("./handlebars/safe-string")["default"];
var Exception = require("./handlebars/exception")["default"];
var Utils = require("./handlebars/utils");
var runtime = require("./handlebars/runtime");

// For compatibility and usage outside of module systems, make the Handlebars object a namespace
var create = function() {
  var hb = new base.HandlebarsEnvironment();

  Utils.extend(hb, base);
  hb.SafeString = SafeString;
  hb.Exception = Exception;
  hb.Utils = Utils;

  hb.VM = runtime;
  hb.template = function(spec) {
    return runtime.template(spec, hb);
  };

  return hb;
};

var Handlebars = create();
Handlebars.create = create;

exports["default"] = Handlebars;
},{"./handlebars/base":9,"./handlebars/exception":17,"./handlebars/runtime":18,"./handlebars/safe-string":19,"./handlebars/utils":20}],9:[function(require,module,exports){
"use strict";
var Utils = require("./utils");
var Exception = require("./exception")["default"];

var VERSION = "1.3.0";
exports.VERSION = VERSION;var COMPILER_REVISION = 4;
exports.COMPILER_REVISION = COMPILER_REVISION;
var REVISION_CHANGES = {
  1: '<= 1.0.rc.2', // 1.0.rc.2 is actually rev2 but doesn't report it
  2: '== 1.0.0-rc.3',
  3: '== 1.0.0-rc.4',
  4: '>= 1.0.0'
};
exports.REVISION_CHANGES = REVISION_CHANGES;
var isArray = Utils.isArray,
    isFunction = Utils.isFunction,
    toString = Utils.toString,
    objectType = '[object Object]';

function HandlebarsEnvironment(helpers, partials) {
  this.helpers = helpers || {};
  this.partials = partials || {};

  registerDefaultHelpers(this);
}

exports.HandlebarsEnvironment = HandlebarsEnvironment;HandlebarsEnvironment.prototype = {
  constructor: HandlebarsEnvironment,

  logger: logger,
  log: log,

  registerHelper: function(name, fn, inverse) {
    if (toString.call(name) === objectType) {
      if (inverse || fn) { throw new Exception('Arg not supported with multiple helpers'); }
      Utils.extend(this.helpers, name);
    } else {
      if (inverse) { fn.not = inverse; }
      this.helpers[name] = fn;
    }
  },

  registerPartial: function(name, str) {
    if (toString.call(name) === objectType) {
      Utils.extend(this.partials,  name);
    } else {
      this.partials[name] = str;
    }
  }
};

function registerDefaultHelpers(instance) {
  instance.registerHelper('helperMissing', function(arg) {
    if(arguments.length === 2) {
      return undefined;
    } else {
      throw new Exception("Missing helper: '" + arg + "'");
    }
  });

  instance.registerHelper('blockHelperMissing', function(context, options) {
    var inverse = options.inverse || function() {}, fn = options.fn;

    if (isFunction(context)) { context = context.call(this); }

    if(context === true) {
      return fn(this);
    } else if(context === false || context == null) {
      return inverse(this);
    } else if (isArray(context)) {
      if(context.length > 0) {
        return instance.helpers.each(context, options);
      } else {
        return inverse(this);
      }
    } else {
      return fn(context);
    }
  });

  instance.registerHelper('each', function(context, options) {
    var fn = options.fn, inverse = options.inverse;
    var i = 0, ret = "", data;

    if (isFunction(context)) { context = context.call(this); }

    if (options.data) {
      data = createFrame(options.data);
    }

    if(context && typeof context === 'object') {
      if (isArray(context)) {
        for(var j = context.length; i<j; i++) {
          if (data) {
            data.index = i;
            data.first = (i === 0);
            data.last  = (i === (context.length-1));
          }
          ret = ret + fn(context[i], { data: data });
        }
      } else {
        for(var key in context) {
          if(context.hasOwnProperty(key)) {
            if(data) { 
              data.key = key; 
              data.index = i;
              data.first = (i === 0);
            }
            ret = ret + fn(context[key], {data: data});
            i++;
          }
        }
      }
    }

    if(i === 0){
      ret = inverse(this);
    }

    return ret;
  });

  instance.registerHelper('if', function(conditional, options) {
    if (isFunction(conditional)) { conditional = conditional.call(this); }

    // Default behavior is to render the positive path if the value is truthy and not empty.
    // The `includeZero` option may be set to treat the condtional as purely not empty based on the
    // behavior of isEmpty. Effectively this determines if 0 is handled by the positive path or negative.
    if ((!options.hash.includeZero && !conditional) || Utils.isEmpty(conditional)) {
      return options.inverse(this);
    } else {
      return options.fn(this);
    }
  });

  instance.registerHelper('unless', function(conditional, options) {
    return instance.helpers['if'].call(this, conditional, {fn: options.inverse, inverse: options.fn, hash: options.hash});
  });

  instance.registerHelper('with', function(context, options) {
    if (isFunction(context)) { context = context.call(this); }

    if (!Utils.isEmpty(context)) return options.fn(context);
  });

  instance.registerHelper('log', function(context, options) {
    var level = options.data && options.data.level != null ? parseInt(options.data.level, 10) : 1;
    instance.log(level, context);
  });
}

var logger = {
  methodMap: { 0: 'debug', 1: 'info', 2: 'warn', 3: 'error' },

  // State enum
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  level: 3,

  // can be overridden in the host environment
  log: function(level, obj) {
    if (logger.level <= level) {
      var method = logger.methodMap[level];
      if (typeof console !== 'undefined' && console[method]) {
        console[method].call(console, obj);
      }
    }
  }
};
exports.logger = logger;
function log(level, obj) { logger.log(level, obj); }

exports.log = log;var createFrame = function(object) {
  var obj = {};
  Utils.extend(obj, object);
  return obj;
};
exports.createFrame = createFrame;
},{"./exception":17,"./utils":20}],10:[function(require,module,exports){
"use strict";
var Exception = require("../exception")["default"];

function LocationInfo(locInfo){
  locInfo = locInfo || {};
  this.firstLine   = locInfo.first_line;
  this.firstColumn = locInfo.first_column;
  this.lastColumn  = locInfo.last_column;
  this.lastLine    = locInfo.last_line;
}

var AST = {
  ProgramNode: function(statements, inverseStrip, inverse, locInfo) {
    var inverseLocationInfo, firstInverseNode;
    if (arguments.length === 3) {
      locInfo = inverse;
      inverse = null;
    } else if (arguments.length === 2) {
      locInfo = inverseStrip;
      inverseStrip = null;
    }

    LocationInfo.call(this, locInfo);
    this.type = "program";
    this.statements = statements;
    this.strip = {};

    if(inverse) {
      firstInverseNode = inverse[0];
      if (firstInverseNode) {
        inverseLocationInfo = {
          first_line: firstInverseNode.firstLine,
          last_line: firstInverseNode.lastLine,
          last_column: firstInverseNode.lastColumn,
          first_column: firstInverseNode.firstColumn
        };
        this.inverse = new AST.ProgramNode(inverse, inverseStrip, inverseLocationInfo);
      } else {
        this.inverse = new AST.ProgramNode(inverse, inverseStrip);
      }
      this.strip.right = inverseStrip.left;
    } else if (inverseStrip) {
      this.strip.left = inverseStrip.right;
    }
  },

  MustacheNode: function(rawParams, hash, open, strip, locInfo) {
    LocationInfo.call(this, locInfo);
    this.type = "mustache";
    this.strip = strip;

    // Open may be a string parsed from the parser or a passed boolean flag
    if (open != null && open.charAt) {
      // Must use charAt to support IE pre-10
      var escapeFlag = open.charAt(3) || open.charAt(2);
      this.escaped = escapeFlag !== '{' && escapeFlag !== '&';
    } else {
      this.escaped = !!open;
    }

    if (rawParams instanceof AST.SexprNode) {
      this.sexpr = rawParams;
    } else {
      // Support old AST API
      this.sexpr = new AST.SexprNode(rawParams, hash);
    }

    this.sexpr.isRoot = true;

    // Support old AST API that stored this info in MustacheNode
    this.id = this.sexpr.id;
    this.params = this.sexpr.params;
    this.hash = this.sexpr.hash;
    this.eligibleHelper = this.sexpr.eligibleHelper;
    this.isHelper = this.sexpr.isHelper;
  },

  SexprNode: function(rawParams, hash, locInfo) {
    LocationInfo.call(this, locInfo);

    this.type = "sexpr";
    this.hash = hash;

    var id = this.id = rawParams[0];
    var params = this.params = rawParams.slice(1);

    // a mustache is an eligible helper if:
    // * its id is simple (a single part, not `this` or `..`)
    var eligibleHelper = this.eligibleHelper = id.isSimple;

    // a mustache is definitely a helper if:
    // * it is an eligible helper, and
    // * it has at least one parameter or hash segment
    this.isHelper = eligibleHelper && (params.length || hash);

    // if a mustache is an eligible helper but not a definite
    // helper, it is ambiguous, and will be resolved in a later
    // pass or at runtime.
  },

  PartialNode: function(partialName, context, strip, locInfo) {
    LocationInfo.call(this, locInfo);
    this.type         = "partial";
    this.partialName  = partialName;
    this.context      = context;
    this.strip = strip;
  },

  BlockNode: function(mustache, program, inverse, close, locInfo) {
    LocationInfo.call(this, locInfo);

    if(mustache.sexpr.id.original !== close.path.original) {
      throw new Exception(mustache.sexpr.id.original + " doesn't match " + close.path.original, this);
    }

    this.type = 'block';
    this.mustache = mustache;
    this.program  = program;
    this.inverse  = inverse;

    this.strip = {
      left: mustache.strip.left,
      right: close.strip.right
    };

    (program || inverse).strip.left = mustache.strip.right;
    (inverse || program).strip.right = close.strip.left;

    if (inverse && !program) {
      this.isInverse = true;
    }
  },

  ContentNode: function(string, locInfo) {
    LocationInfo.call(this, locInfo);
    this.type = "content";
    this.string = string;
  },

  HashNode: function(pairs, locInfo) {
    LocationInfo.call(this, locInfo);
    this.type = "hash";
    this.pairs = pairs;
  },

  IdNode: function(parts, locInfo) {
    LocationInfo.call(this, locInfo);
    this.type = "ID";

    var original = "",
        dig = [],
        depth = 0;

    for(var i=0,l=parts.length; i<l; i++) {
      var part = parts[i].part;
      original += (parts[i].separator || '') + part;

      if (part === ".." || part === "." || part === "this") {
        if (dig.length > 0) {
          throw new Exception("Invalid path: " + original, this);
        } else if (part === "..") {
          depth++;
        } else {
          this.isScoped = true;
        }
      } else {
        dig.push(part);
      }
    }

    this.original = original;
    this.parts    = dig;
    this.string   = dig.join('.');
    this.depth    = depth;

    // an ID is simple if it only has one part, and that part is not
    // `..` or `this`.
    this.isSimple = parts.length === 1 && !this.isScoped && depth === 0;

    this.stringModeValue = this.string;
  },

  PartialNameNode: function(name, locInfo) {
    LocationInfo.call(this, locInfo);
    this.type = "PARTIAL_NAME";
    this.name = name.original;
  },

  DataNode: function(id, locInfo) {
    LocationInfo.call(this, locInfo);
    this.type = "DATA";
    this.id = id;
  },

  StringNode: function(string, locInfo) {
    LocationInfo.call(this, locInfo);
    this.type = "STRING";
    this.original =
      this.string =
      this.stringModeValue = string;
  },

  IntegerNode: function(integer, locInfo) {
    LocationInfo.call(this, locInfo);
    this.type = "INTEGER";
    this.original =
      this.integer = integer;
    this.stringModeValue = Number(integer);
  },

  BooleanNode: function(bool, locInfo) {
    LocationInfo.call(this, locInfo);
    this.type = "BOOLEAN";
    this.bool = bool;
    this.stringModeValue = bool === "true";
  },

  CommentNode: function(comment, locInfo) {
    LocationInfo.call(this, locInfo);
    this.type = "comment";
    this.comment = comment;
  }
};

// Must be exported as an object rather than the root of the module as the jison lexer
// most modify the object to operate properly.
exports["default"] = AST;
},{"../exception":17}],11:[function(require,module,exports){
"use strict";
var parser = require("./parser")["default"];
var AST = require("./ast")["default"];

exports.parser = parser;

function parse(input) {
  // Just return if an already-compile AST was passed in.
  if(input.constructor === AST.ProgramNode) { return input; }

  parser.yy = AST;
  return parser.parse(input);
}

exports.parse = parse;
},{"./ast":10,"./parser":14}],12:[function(require,module,exports){
"use strict";
var Exception = require("../exception")["default"];

function Compiler() {}

exports.Compiler = Compiler;// the foundHelper register will disambiguate helper lookup from finding a
// function in a context. This is necessary for mustache compatibility, which
// requires that context functions in blocks are evaluated by blockHelperMissing,
// and then proceed as if the resulting value was provided to blockHelperMissing.

Compiler.prototype = {
  compiler: Compiler,

  disassemble: function() {
    var opcodes = this.opcodes, opcode, out = [], params, param;

    for (var i=0, l=opcodes.length; i<l; i++) {
      opcode = opcodes[i];

      if (opcode.opcode === 'DECLARE') {
        out.push("DECLARE " + opcode.name + "=" + opcode.value);
      } else {
        params = [];
        for (var j=0; j<opcode.args.length; j++) {
          param = opcode.args[j];
          if (typeof param === "string") {
            param = "\"" + param.replace("\n", "\\n") + "\"";
          }
          params.push(param);
        }
        out.push(opcode.opcode + " " + params.join(" "));
      }
    }

    return out.join("\n");
  },

  equals: function(other) {
    var len = this.opcodes.length;
    if (other.opcodes.length !== len) {
      return false;
    }

    for (var i = 0; i < len; i++) {
      var opcode = this.opcodes[i],
          otherOpcode = other.opcodes[i];
      if (opcode.opcode !== otherOpcode.opcode || opcode.args.length !== otherOpcode.args.length) {
        return false;
      }
      for (var j = 0; j < opcode.args.length; j++) {
        if (opcode.args[j] !== otherOpcode.args[j]) {
          return false;
        }
      }
    }

    len = this.children.length;
    if (other.children.length !== len) {
      return false;
    }
    for (i = 0; i < len; i++) {
      if (!this.children[i].equals(other.children[i])) {
        return false;
      }
    }

    return true;
  },

  guid: 0,

  compile: function(program, options) {
    this.opcodes = [];
    this.children = [];
    this.depths = {list: []};
    this.options = options;

    // These changes will propagate to the other compiler components
    var knownHelpers = this.options.knownHelpers;
    this.options.knownHelpers = {
      'helperMissing': true,
      'blockHelperMissing': true,
      'each': true,
      'if': true,
      'unless': true,
      'with': true,
      'log': true
    };
    if (knownHelpers) {
      for (var name in knownHelpers) {
        this.options.knownHelpers[name] = knownHelpers[name];
      }
    }

    return this.accept(program);
  },

  accept: function(node) {
    var strip = node.strip || {},
        ret;
    if (strip.left) {
      this.opcode('strip');
    }

    ret = this[node.type](node);

    if (strip.right) {
      this.opcode('strip');
    }

    return ret;
  },

  program: function(program) {
    var statements = program.statements;

    for(var i=0, l=statements.length; i<l; i++) {
      this.accept(statements[i]);
    }
    this.isSimple = l === 1;

    this.depths.list = this.depths.list.sort(function(a, b) {
      return a - b;
    });

    return this;
  },

  compileProgram: function(program) {
    var result = new this.compiler().compile(program, this.options);
    var guid = this.guid++, depth;

    this.usePartial = this.usePartial || result.usePartial;

    this.children[guid] = result;

    for(var i=0, l=result.depths.list.length; i<l; i++) {
      depth = result.depths.list[i];

      if(depth < 2) { continue; }
      else { this.addDepth(depth - 1); }
    }

    return guid;
  },

  block: function(block) {
    var mustache = block.mustache,
        program = block.program,
        inverse = block.inverse;

    if (program) {
      program = this.compileProgram(program);
    }

    if (inverse) {
      inverse = this.compileProgram(inverse);
    }

    var sexpr = mustache.sexpr;
    var type = this.classifySexpr(sexpr);

    if (type === "helper") {
      this.helperSexpr(sexpr, program, inverse);
    } else if (type === "simple") {
      this.simpleSexpr(sexpr);

      // now that the simple mustache is resolved, we need to
      // evaluate it by executing `blockHelperMissing`
      this.opcode('pushProgram', program);
      this.opcode('pushProgram', inverse);
      this.opcode('emptyHash');
      this.opcode('blockValue');
    } else {
      this.ambiguousSexpr(sexpr, program, inverse);

      // now that the simple mustache is resolved, we need to
      // evaluate it by executing `blockHelperMissing`
      this.opcode('pushProgram', program);
      this.opcode('pushProgram', inverse);
      this.opcode('emptyHash');
      this.opcode('ambiguousBlockValue');
    }

    this.opcode('append');
  },

  hash: function(hash) {
    var pairs = hash.pairs, pair, val;

    this.opcode('pushHash');

    for(var i=0, l=pairs.length; i<l; i++) {
      pair = pairs[i];
      val  = pair[1];

      if (this.options.stringParams) {
        if(val.depth) {
          this.addDepth(val.depth);
        }
        this.opcode('getContext', val.depth || 0);
        this.opcode('pushStringParam', val.stringModeValue, val.type);

        if (val.type === 'sexpr') {
          // Subexpressions get evaluated and passed in
          // in string params mode.
          this.sexpr(val);
        }
      } else {
        this.accept(val);
      }

      this.opcode('assignToHash', pair[0]);
    }
    this.opcode('popHash');
  },

  partial: function(partial) {
    var partialName = partial.partialName;
    this.usePartial = true;

    if(partial.context) {
      this.ID(partial.context);
    } else {
      this.opcode('push', 'depth0');
    }

    this.opcode('invokePartial', partialName.name);
    this.opcode('append');
  },

  content: function(content) {
    this.opcode('appendContent', content.string);
  },

  mustache: function(mustache) {
    this.sexpr(mustache.sexpr);

    if(mustache.escaped && !this.options.noEscape) {
      this.opcode('appendEscaped');
    } else {
      this.opcode('append');
    }
  },

  ambiguousSexpr: function(sexpr, program, inverse) {
    var id = sexpr.id,
        name = id.parts[0],
        isBlock = program != null || inverse != null;

    this.opcode('getContext', id.depth);

    this.opcode('pushProgram', program);
    this.opcode('pushProgram', inverse);

    this.opcode('invokeAmbiguous', name, isBlock);
  },

  simpleSexpr: function(sexpr) {
    var id = sexpr.id;

    if (id.type === 'DATA') {
      this.DATA(id);
    } else if (id.parts.length) {
      this.ID(id);
    } else {
      // Simplified ID for `this`
      this.addDepth(id.depth);
      this.opcode('getContext', id.depth);
      this.opcode('pushContext');
    }

    this.opcode('resolvePossibleLambda');
  },

  helperSexpr: function(sexpr, program, inverse) {
    var params = this.setupFullMustacheParams(sexpr, program, inverse),
        name = sexpr.id.parts[0];

    if (this.options.knownHelpers[name]) {
      this.opcode('invokeKnownHelper', params.length, name);
    } else if (this.options.knownHelpersOnly) {
      throw new Exception("You specified knownHelpersOnly, but used the unknown helper " + name, sexpr);
    } else {
      this.opcode('invokeHelper', params.length, name, sexpr.isRoot);
    }
  },

  sexpr: function(sexpr) {
    var type = this.classifySexpr(sexpr);

    if (type === "simple") {
      this.simpleSexpr(sexpr);
    } else if (type === "helper") {
      this.helperSexpr(sexpr);
    } else {
      this.ambiguousSexpr(sexpr);
    }
  },

  ID: function(id) {
    this.addDepth(id.depth);
    this.opcode('getContext', id.depth);

    var name = id.parts[0];
    if (!name) {
      this.opcode('pushContext');
    } else {
      this.opcode('lookupOnContext', id.parts[0]);
    }

    for(var i=1, l=id.parts.length; i<l; i++) {
      this.opcode('lookup', id.parts[i]);
    }
  },

  DATA: function(data) {
    this.options.data = true;
    if (data.id.isScoped || data.id.depth) {
      throw new Exception('Scoped data references are not supported: ' + data.original, data);
    }

    this.opcode('lookupData');
    var parts = data.id.parts;
    for(var i=0, l=parts.length; i<l; i++) {
      this.opcode('lookup', parts[i]);
    }
  },

  STRING: function(string) {
    this.opcode('pushString', string.string);
  },

  INTEGER: function(integer) {
    this.opcode('pushLiteral', integer.integer);
  },

  BOOLEAN: function(bool) {
    this.opcode('pushLiteral', bool.bool);
  },

  comment: function() {},

  // HELPERS
  opcode: function(name) {
    this.opcodes.push({ opcode: name, args: [].slice.call(arguments, 1) });
  },

  declare: function(name, value) {
    this.opcodes.push({ opcode: 'DECLARE', name: name, value: value });
  },

  addDepth: function(depth) {
    if(depth === 0) { return; }

    if(!this.depths[depth]) {
      this.depths[depth] = true;
      this.depths.list.push(depth);
    }
  },

  classifySexpr: function(sexpr) {
    var isHelper   = sexpr.isHelper;
    var isEligible = sexpr.eligibleHelper;
    var options    = this.options;

    // if ambiguous, we can possibly resolve the ambiguity now
    if (isEligible && !isHelper) {
      var name = sexpr.id.parts[0];

      if (options.knownHelpers[name]) {
        isHelper = true;
      } else if (options.knownHelpersOnly) {
        isEligible = false;
      }
    }

    if (isHelper) { return "helper"; }
    else if (isEligible) { return "ambiguous"; }
    else { return "simple"; }
  },

  pushParams: function(params) {
    var i = params.length, param;

    while(i--) {
      param = params[i];

      if(this.options.stringParams) {
        if(param.depth) {
          this.addDepth(param.depth);
        }

        this.opcode('getContext', param.depth || 0);
        this.opcode('pushStringParam', param.stringModeValue, param.type);

        if (param.type === 'sexpr') {
          // Subexpressions get evaluated and passed in
          // in string params mode.
          this.sexpr(param);
        }
      } else {
        this[param.type](param);
      }
    }
  },

  setupFullMustacheParams: function(sexpr, program, inverse) {
    var params = sexpr.params;
    this.pushParams(params);

    this.opcode('pushProgram', program);
    this.opcode('pushProgram', inverse);

    if (sexpr.hash) {
      this.hash(sexpr.hash);
    } else {
      this.opcode('emptyHash');
    }

    return params;
  }
};

function precompile(input, options, env) {
  if (input == null || (typeof input !== 'string' && input.constructor !== env.AST.ProgramNode)) {
    throw new Exception("You must pass a string or Handlebars AST to Handlebars.precompile. You passed " + input);
  }

  options = options || {};
  if (!('data' in options)) {
    options.data = true;
  }

  var ast = env.parse(input);
  var environment = new env.Compiler().compile(ast, options);
  return new env.JavaScriptCompiler().compile(environment, options);
}

exports.precompile = precompile;function compile(input, options, env) {
  if (input == null || (typeof input !== 'string' && input.constructor !== env.AST.ProgramNode)) {
    throw new Exception("You must pass a string or Handlebars AST to Handlebars.compile. You passed " + input);
  }

  options = options || {};

  if (!('data' in options)) {
    options.data = true;
  }

  var compiled;

  function compileInput() {
    var ast = env.parse(input);
    var environment = new env.Compiler().compile(ast, options);
    var templateSpec = new env.JavaScriptCompiler().compile(environment, options, undefined, true);
    return env.template(templateSpec);
  }

  // Template is only compiled on first use and cached after that point.
  return function(context, options) {
    if (!compiled) {
      compiled = compileInput();
    }
    return compiled.call(this, context, options);
  };
}

exports.compile = compile;
},{"../exception":17}],13:[function(require,module,exports){
"use strict";
var COMPILER_REVISION = require("../base").COMPILER_REVISION;
var REVISION_CHANGES = require("../base").REVISION_CHANGES;
var log = require("../base").log;
var Exception = require("../exception")["default"];

function Literal(value) {
  this.value = value;
}

function JavaScriptCompiler() {}

JavaScriptCompiler.prototype = {
  // PUBLIC API: You can override these methods in a subclass to provide
  // alternative compiled forms for name lookup and buffering semantics
  nameLookup: function(parent, name /* , type*/) {
    var wrap,
        ret;
    if (parent.indexOf('depth') === 0) {
      wrap = true;
    }

    if (/^[0-9]+$/.test(name)) {
      ret = parent + "[" + name + "]";
    } else if (JavaScriptCompiler.isValidJavaScriptVariableName(name)) {
      ret = parent + "." + name;
    }
    else {
      ret = parent + "['" + name + "']";
    }

    if (wrap) {
      return '(' + parent + ' && ' + ret + ')';
    } else {
      return ret;
    }
  },

  compilerInfo: function() {
    var revision = COMPILER_REVISION,
        versions = REVISION_CHANGES[revision];
    return "this.compilerInfo = ["+revision+",'"+versions+"'];\n";
  },

  appendToBuffer: function(string) {
    if (this.environment.isSimple) {
      return "return " + string + ";";
    } else {
      return {
        appendToBuffer: true,
        content: string,
        toString: function() { return "buffer += " + string + ";"; }
      };
    }
  },

  initializeBuffer: function() {
    return this.quotedString("");
  },

  namespace: "Handlebars",
  // END PUBLIC API

  compile: function(environment, options, context, asObject) {
    this.environment = environment;
    this.options = options || {};

    log('debug', this.environment.disassemble() + "\n\n");

    this.name = this.environment.name;
    this.isChild = !!context;
    this.context = context || {
      programs: [],
      environments: [],
      aliases: { }
    };

    this.preamble();

    this.stackSlot = 0;
    this.stackVars = [];
    this.registers = { list: [] };
    this.hashes = [];
    this.compileStack = [];
    this.inlineStack = [];

    this.compileChildren(environment, options);

    var opcodes = environment.opcodes, opcode;

    this.i = 0;

    for(var l=opcodes.length; this.i<l; this.i++) {
      opcode = opcodes[this.i];

      if(opcode.opcode === 'DECLARE') {
        this[opcode.name] = opcode.value;
      } else {
        this[opcode.opcode].apply(this, opcode.args);
      }

      // Reset the stripNext flag if it was not set by this operation.
      if (opcode.opcode !== this.stripNext) {
        this.stripNext = false;
      }
    }

    // Flush any trailing content that might be pending.
    this.pushSource('');

    if (this.stackSlot || this.inlineStack.length || this.compileStack.length) {
      throw new Exception('Compile completed with content left on stack');
    }

    return this.createFunctionContext(asObject);
  },

  preamble: function() {
    var out = [];

    if (!this.isChild) {
      var namespace = this.namespace;

      var copies = "helpers = this.merge(helpers, " + namespace + ".helpers);";
      if (this.environment.usePartial) { copies = copies + " partials = this.merge(partials, " + namespace + ".partials);"; }
      if (this.options.data) { copies = copies + " data = data || {};"; }
      out.push(copies);
    } else {
      out.push('');
    }

    if (!this.environment.isSimple) {
      out.push(", buffer = " + this.initializeBuffer());
    } else {
      out.push("");
    }

    // track the last context pushed into place to allow skipping the
    // getContext opcode when it would be a noop
    this.lastContext = 0;
    this.source = out;
  },

  createFunctionContext: function(asObject) {
    var locals = this.stackVars.concat(this.registers.list);

    if(locals.length > 0) {
      this.source[1] = this.source[1] + ", " + locals.join(", ");
    }

    // Generate minimizer alias mappings
    if (!this.isChild) {
      for (var alias in this.context.aliases) {
        if (this.context.aliases.hasOwnProperty(alias)) {
          this.source[1] = this.source[1] + ', ' + alias + '=' + this.context.aliases[alias];
        }
      }
    }

    if (this.source[1]) {
      this.source[1] = "var " + this.source[1].substring(2) + ";";
    }

    // Merge children
    if (!this.isChild) {
      this.source[1] += '\n' + this.context.programs.join('\n') + '\n';
    }

    if (!this.environment.isSimple) {
      this.pushSource("return buffer;");
    }

    var params = this.isChild ? ["depth0", "data"] : ["Handlebars", "depth0", "helpers", "partials", "data"];

    for(var i=0, l=this.environment.depths.list.length; i<l; i++) {
      params.push("depth" + this.environment.depths.list[i]);
    }

    // Perform a second pass over the output to merge content when possible
    var source = this.mergeSource();

    if (!this.isChild) {
      source = this.compilerInfo()+source;
    }

    if (asObject) {
      params.push(source);

      return Function.apply(this, params);
    } else {
      var functionSource = 'function ' + (this.name || '') + '(' + params.join(',') + ') {\n  ' + source + '}';
      log('debug', functionSource + "\n\n");
      return functionSource;
    }
  },
  mergeSource: function() {
    // WARN: We are not handling the case where buffer is still populated as the source should
    // not have buffer append operations as their final action.
    var source = '',
        buffer;
    for (var i = 0, len = this.source.length; i < len; i++) {
      var line = this.source[i];
      if (line.appendToBuffer) {
        if (buffer) {
          buffer = buffer + '\n    + ' + line.content;
        } else {
          buffer = line.content;
        }
      } else {
        if (buffer) {
          source += 'buffer += ' + buffer + ';\n  ';
          buffer = undefined;
        }
        source += line + '\n  ';
      }
    }
    return source;
  },

  // [blockValue]
  //
  // On stack, before: hash, inverse, program, value
  // On stack, after: return value of blockHelperMissing
  //
  // The purpose of this opcode is to take a block of the form
  // `{{#foo}}...{{/foo}}`, resolve the value of `foo`, and
  // replace it on the stack with the result of properly
  // invoking blockHelperMissing.
  blockValue: function() {
    this.context.aliases.blockHelperMissing = 'helpers.blockHelperMissing';

    var params = ["depth0"];
    this.setupParams(0, params);

    this.replaceStack(function(current) {
      params.splice(1, 0, current);
      return "blockHelperMissing.call(" + params.join(", ") + ")";
    });
  },

  // [ambiguousBlockValue]
  //
  // On stack, before: hash, inverse, program, value
  // Compiler value, before: lastHelper=value of last found helper, if any
  // On stack, after, if no lastHelper: same as [blockValue]
  // On stack, after, if lastHelper: value
  ambiguousBlockValue: function() {
    this.context.aliases.blockHelperMissing = 'helpers.blockHelperMissing';

    var params = ["depth0"];
    this.setupParams(0, params);

    var current = this.topStack();
    params.splice(1, 0, current);

    this.pushSource("if (!" + this.lastHelper + ") { " + current + " = blockHelperMissing.call(" + params.join(", ") + "); }");
  },

  // [appendContent]
  //
  // On stack, before: ...
  // On stack, after: ...
  //
  // Appends the string value of `content` to the current buffer
  appendContent: function(content) {
    if (this.pendingContent) {
      content = this.pendingContent + content;
    }
    if (this.stripNext) {
      content = content.replace(/^\s+/, '');
    }

    this.pendingContent = content;
  },

  // [strip]
  //
  // On stack, before: ...
  // On stack, after: ...
  //
  // Removes any trailing whitespace from the prior content node and flags
  // the next operation for stripping if it is a content node.
  strip: function() {
    if (this.pendingContent) {
      this.pendingContent = this.pendingContent.replace(/\s+$/, '');
    }
    this.stripNext = 'strip';
  },

  // [append]
  //
  // On stack, before: value, ...
  // On stack, after: ...
  //
  // Coerces `value` to a String and appends it to the current buffer.
  //
  // If `value` is truthy, or 0, it is coerced into a string and appended
  // Otherwise, the empty string is appended
  append: function() {
    // Force anything that is inlined onto the stack so we don't have duplication
    // when we examine local
    this.flushInline();
    var local = this.popStack();
    this.pushSource("if(" + local + " || " + local + " === 0) { " + this.appendToBuffer(local) + " }");
    if (this.environment.isSimple) {
      this.pushSource("else { " + this.appendToBuffer("''") + " }");
    }
  },

  // [appendEscaped]
  //
  // On stack, before: value, ...
  // On stack, after: ...
  //
  // Escape `value` and append it to the buffer
  appendEscaped: function() {
    this.context.aliases.escapeExpression = 'this.escapeExpression';

    this.pushSource(this.appendToBuffer("escapeExpression(" + this.popStack() + ")"));
  },

  // [getContext]
  //
  // On stack, before: ...
  // On stack, after: ...
  // Compiler value, after: lastContext=depth
  //
  // Set the value of the `lastContext` compiler value to the depth
  getContext: function(depth) {
    if(this.lastContext !== depth) {
      this.lastContext = depth;
    }
  },

  // [lookupOnContext]
  //
  // On stack, before: ...
  // On stack, after: currentContext[name], ...
  //
  // Looks up the value of `name` on the current context and pushes
  // it onto the stack.
  lookupOnContext: function(name) {
    this.push(this.nameLookup('depth' + this.lastContext, name, 'context'));
  },

  // [pushContext]
  //
  // On stack, before: ...
  // On stack, after: currentContext, ...
  //
  // Pushes the value of the current context onto the stack.
  pushContext: function() {
    this.pushStackLiteral('depth' + this.lastContext);
  },

  // [resolvePossibleLambda]
  //
  // On stack, before: value, ...
  // On stack, after: resolved value, ...
  //
  // If the `value` is a lambda, replace it on the stack by
  // the return value of the lambda
  resolvePossibleLambda: function() {
    this.context.aliases.functionType = '"function"';

    this.replaceStack(function(current) {
      return "typeof " + current + " === functionType ? " + current + ".apply(depth0) : " + current;
    });
  },

  // [lookup]
  //
  // On stack, before: value, ...
  // On stack, after: value[name], ...
  //
  // Replace the value on the stack with the result of looking
  // up `name` on `value`
  lookup: function(name) {
    this.replaceStack(function(current) {
      return current + " == null || " + current + " === false ? " + current + " : " + this.nameLookup(current, name, 'context');
    });
  },

  // [lookupData]
  //
  // On stack, before: ...
  // On stack, after: data, ...
  //
  // Push the data lookup operator
  lookupData: function() {
    this.pushStackLiteral('data');
  },

  // [pushStringParam]
  //
  // On stack, before: ...
  // On stack, after: string, currentContext, ...
  //
  // This opcode is designed for use in string mode, which
  // provides the string value of a parameter along with its
  // depth rather than resolving it immediately.
  pushStringParam: function(string, type) {
    this.pushStackLiteral('depth' + this.lastContext);

    this.pushString(type);

    // If it's a subexpression, the string result
    // will be pushed after this opcode.
    if (type !== 'sexpr') {
      if (typeof string === 'string') {
        this.pushString(string);
      } else {
        this.pushStackLiteral(string);
      }
    }
  },

  emptyHash: function() {
    this.pushStackLiteral('{}');

    if (this.options.stringParams) {
      this.push('{}'); // hashContexts
      this.push('{}'); // hashTypes
    }
  },
  pushHash: function() {
    if (this.hash) {
      this.hashes.push(this.hash);
    }
    this.hash = {values: [], types: [], contexts: []};
  },
  popHash: function() {
    var hash = this.hash;
    this.hash = this.hashes.pop();

    if (this.options.stringParams) {
      this.push('{' + hash.contexts.join(',') + '}');
      this.push('{' + hash.types.join(',') + '}');
    }

    this.push('{\n    ' + hash.values.join(',\n    ') + '\n  }');
  },

  // [pushString]
  //
  // On stack, before: ...
  // On stack, after: quotedString(string), ...
  //
  // Push a quoted version of `string` onto the stack
  pushString: function(string) {
    this.pushStackLiteral(this.quotedString(string));
  },

  // [push]
  //
  // On stack, before: ...
  // On stack, after: expr, ...
  //
  // Push an expression onto the stack
  push: function(expr) {
    this.inlineStack.push(expr);
    return expr;
  },

  // [pushLiteral]
  //
  // On stack, before: ...
  // On stack, after: value, ...
  //
  // Pushes a value onto the stack. This operation prevents
  // the compiler from creating a temporary variable to hold
  // it.
  pushLiteral: function(value) {
    this.pushStackLiteral(value);
  },

  // [pushProgram]
  //
  // On stack, before: ...
  // On stack, after: program(guid), ...
  //
  // Push a program expression onto the stack. This takes
  // a compile-time guid and converts it into a runtime-accessible
  // expression.
  pushProgram: function(guid) {
    if (guid != null) {
      this.pushStackLiteral(this.programExpression(guid));
    } else {
      this.pushStackLiteral(null);
    }
  },

  // [invokeHelper]
  //
  // On stack, before: hash, inverse, program, params..., ...
  // On stack, after: result of helper invocation
  //
  // Pops off the helper's parameters, invokes the helper,
  // and pushes the helper's return value onto the stack.
  //
  // If the helper is not found, `helperMissing` is called.
  invokeHelper: function(paramSize, name, isRoot) {
    this.context.aliases.helperMissing = 'helpers.helperMissing';
    this.useRegister('helper');

    var helper = this.lastHelper = this.setupHelper(paramSize, name, true);
    var nonHelper = this.nameLookup('depth' + this.lastContext, name, 'context');

    var lookup = 'helper = ' + helper.name + ' || ' + nonHelper;
    if (helper.paramsInit) {
      lookup += ',' + helper.paramsInit;
    }

    this.push(
      '('
        + lookup
        + ',helper '
          + '? helper.call(' + helper.callParams + ') '
          + ': helperMissing.call(' + helper.helperMissingParams + '))');

    // Always flush subexpressions. This is both to prevent the compounding size issue that
    // occurs when the code has to be duplicated for inlining and also to prevent errors
    // due to the incorrect options object being passed due to the shared register.
    if (!isRoot) {
      this.flushInline();
    }
  },

  // [invokeKnownHelper]
  //
  // On stack, before: hash, inverse, program, params..., ...
  // On stack, after: result of helper invocation
  //
  // This operation is used when the helper is known to exist,
  // so a `helperMissing` fallback is not required.
  invokeKnownHelper: function(paramSize, name) {
    var helper = this.setupHelper(paramSize, name);
    this.push(helper.name + ".call(" + helper.callParams + ")");
  },

  // [invokeAmbiguous]
  //
  // On stack, before: hash, inverse, program, params..., ...
  // On stack, after: result of disambiguation
  //
  // This operation is used when an expression like `{{foo}}`
  // is provided, but we don't know at compile-time whether it
  // is a helper or a path.
  //
  // This operation emits more code than the other options,
  // and can be avoided by passing the `knownHelpers` and
  // `knownHelpersOnly` flags at compile-time.
  invokeAmbiguous: function(name, helperCall) {
    this.context.aliases.functionType = '"function"';
    this.useRegister('helper');

    this.emptyHash();
    var helper = this.setupHelper(0, name, helperCall);

    var helperName = this.lastHelper = this.nameLookup('helpers', name, 'helper');

    var nonHelper = this.nameLookup('depth' + this.lastContext, name, 'context');
    var nextStack = this.nextStack();

    if (helper.paramsInit) {
      this.pushSource(helper.paramsInit);
    }
    this.pushSource('if (helper = ' + helperName + ') { ' + nextStack + ' = helper.call(' + helper.callParams + '); }');
    this.pushSource('else { helper = ' + nonHelper + '; ' + nextStack + ' = typeof helper === functionType ? helper.call(' + helper.callParams + ') : helper; }');
  },

  // [invokePartial]
  //
  // On stack, before: context, ...
  // On stack after: result of partial invocation
  //
  // This operation pops off a context, invokes a partial with that context,
  // and pushes the result of the invocation back.
  invokePartial: function(name) {
    var params = [this.nameLookup('partials', name, 'partial'), "'" + name + "'", this.popStack(), "helpers", "partials"];

    if (this.options.data) {
      params.push("data");
    }

    this.context.aliases.self = "this";
    this.push("self.invokePartial(" + params.join(", ") + ")");
  },

  // [assignToHash]
  //
  // On stack, before: value, hash, ...
  // On stack, after: hash, ...
  //
  // Pops a value and hash off the stack, assigns `hash[key] = value`
  // and pushes the hash back onto the stack.
  assignToHash: function(key) {
    var value = this.popStack(),
        context,
        type;

    if (this.options.stringParams) {
      type = this.popStack();
      context = this.popStack();
    }

    var hash = this.hash;
    if (context) {
      hash.contexts.push("'" + key + "': " + context);
    }
    if (type) {
      hash.types.push("'" + key + "': " + type);
    }
    hash.values.push("'" + key + "': (" + value + ")");
  },

  // HELPERS

  compiler: JavaScriptCompiler,

  compileChildren: function(environment, options) {
    var children = environment.children, child, compiler;

    for(var i=0, l=children.length; i<l; i++) {
      child = children[i];
      compiler = new this.compiler();

      var index = this.matchExistingProgram(child);

      if (index == null) {
        this.context.programs.push('');     // Placeholder to prevent name conflicts for nested children
        index = this.context.programs.length;
        child.index = index;
        child.name = 'program' + index;
        this.context.programs[index] = compiler.compile(child, options, this.context);
        this.context.environments[index] = child;
      } else {
        child.index = index;
        child.name = 'program' + index;
      }
    }
  },
  matchExistingProgram: function(child) {
    for (var i = 0, len = this.context.environments.length; i < len; i++) {
      var environment = this.context.environments[i];
      if (environment && environment.equals(child)) {
        return i;
      }
    }
  },

  programExpression: function(guid) {
    this.context.aliases.self = "this";

    if(guid == null) {
      return "self.noop";
    }

    var child = this.environment.children[guid],
        depths = child.depths.list, depth;

    var programParams = [child.index, child.name, "data"];

    for(var i=0, l = depths.length; i<l; i++) {
      depth = depths[i];

      if(depth === 1) { programParams.push("depth0"); }
      else { programParams.push("depth" + (depth - 1)); }
    }

    return (depths.length === 0 ? "self.program(" : "self.programWithDepth(") + programParams.join(", ") + ")";
  },

  register: function(name, val) {
    this.useRegister(name);
    this.pushSource(name + " = " + val + ";");
  },

  useRegister: function(name) {
    if(!this.registers[name]) {
      this.registers[name] = true;
      this.registers.list.push(name);
    }
  },

  pushStackLiteral: function(item) {
    return this.push(new Literal(item));
  },

  pushSource: function(source) {
    if (this.pendingContent) {
      this.source.push(this.appendToBuffer(this.quotedString(this.pendingContent)));
      this.pendingContent = undefined;
    }

    if (source) {
      this.source.push(source);
    }
  },

  pushStack: function(item) {
    this.flushInline();

    var stack = this.incrStack();
    if (item) {
      this.pushSource(stack + " = " + item + ";");
    }
    this.compileStack.push(stack);
    return stack;
  },

  replaceStack: function(callback) {
    var prefix = '',
        inline = this.isInline(),
        stack,
        createdStack,
        usedLiteral;

    // If we are currently inline then we want to merge the inline statement into the
    // replacement statement via ','
    if (inline) {
      var top = this.popStack(true);

      if (top instanceof Literal) {
        // Literals do not need to be inlined
        stack = top.value;
        usedLiteral = true;
      } else {
        // Get or create the current stack name for use by the inline
        createdStack = !this.stackSlot;
        var name = !createdStack ? this.topStackName() : this.incrStack();

        prefix = '(' + this.push(name) + ' = ' + top + '),';
        stack = this.topStack();
      }
    } else {
      stack = this.topStack();
    }

    var item = callback.call(this, stack);

    if (inline) {
      if (!usedLiteral) {
        this.popStack();
      }
      if (createdStack) {
        this.stackSlot--;
      }
      this.push('(' + prefix + item + ')');
    } else {
      // Prevent modification of the context depth variable. Through replaceStack
      if (!/^stack/.test(stack)) {
        stack = this.nextStack();
      }

      this.pushSource(stack + " = (" + prefix + item + ");");
    }
    return stack;
  },

  nextStack: function() {
    return this.pushStack();
  },

  incrStack: function() {
    this.stackSlot++;
    if(this.stackSlot > this.stackVars.length) { this.stackVars.push("stack" + this.stackSlot); }
    return this.topStackName();
  },
  topStackName: function() {
    return "stack" + this.stackSlot;
  },
  flushInline: function() {
    var inlineStack = this.inlineStack;
    if (inlineStack.length) {
      this.inlineStack = [];
      for (var i = 0, len = inlineStack.length; i < len; i++) {
        var entry = inlineStack[i];
        if (entry instanceof Literal) {
          this.compileStack.push(entry);
        } else {
          this.pushStack(entry);
        }
      }
    }
  },
  isInline: function() {
    return this.inlineStack.length;
  },

  popStack: function(wrapped) {
    var inline = this.isInline(),
        item = (inline ? this.inlineStack : this.compileStack).pop();

    if (!wrapped && (item instanceof Literal)) {
      return item.value;
    } else {
      if (!inline) {
        if (!this.stackSlot) {
          throw new Exception('Invalid stack pop');
        }
        this.stackSlot--;
      }
      return item;
    }
  },

  topStack: function(wrapped) {
    var stack = (this.isInline() ? this.inlineStack : this.compileStack),
        item = stack[stack.length - 1];

    if (!wrapped && (item instanceof Literal)) {
      return item.value;
    } else {
      return item;
    }
  },

  quotedString: function(str) {
    return '"' + str
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\u2028/g, '\\u2028')   // Per Ecma-262 7.3 + 7.8.4
      .replace(/\u2029/g, '\\u2029') + '"';
  },

  setupHelper: function(paramSize, name, missingParams) {
    var params = [],
        paramsInit = this.setupParams(paramSize, params, missingParams);
    var foundHelper = this.nameLookup('helpers', name, 'helper');

    return {
      params: params,
      paramsInit: paramsInit,
      name: foundHelper,
      callParams: ["depth0"].concat(params).join(", "),
      helperMissingParams: missingParams && ["depth0", this.quotedString(name)].concat(params).join(", ")
    };
  },

  setupOptions: function(paramSize, params) {
    var options = [], contexts = [], types = [], param, inverse, program;

    options.push("hash:" + this.popStack());

    if (this.options.stringParams) {
      options.push("hashTypes:" + this.popStack());
      options.push("hashContexts:" + this.popStack());
    }

    inverse = this.popStack();
    program = this.popStack();

    // Avoid setting fn and inverse if neither are set. This allows
    // helpers to do a check for `if (options.fn)`
    if (program || inverse) {
      if (!program) {
        this.context.aliases.self = "this";
        program = "self.noop";
      }

      if (!inverse) {
        this.context.aliases.self = "this";
        inverse = "self.noop";
      }

      options.push("inverse:" + inverse);
      options.push("fn:" + program);
    }

    for(var i=0; i<paramSize; i++) {
      param = this.popStack();
      params.push(param);

      if(this.options.stringParams) {
        types.push(this.popStack());
        contexts.push(this.popStack());
      }
    }

    if (this.options.stringParams) {
      options.push("contexts:[" + contexts.join(",") + "]");
      options.push("types:[" + types.join(",") + "]");
    }

    if(this.options.data) {
      options.push("data:data");
    }

    return options;
  },

  // the params and contexts arguments are passed in arrays
  // to fill in
  setupParams: function(paramSize, params, useRegister) {
    var options = '{' + this.setupOptions(paramSize, params).join(',') + '}';

    if (useRegister) {
      this.useRegister('options');
      params.push('options');
      return 'options=' + options;
    } else {
      params.push(options);
      return '';
    }
  }
};

var reservedWords = (
  "break else new var" +
  " case finally return void" +
  " catch for switch while" +
  " continue function this with" +
  " default if throw" +
  " delete in try" +
  " do instanceof typeof" +
  " abstract enum int short" +
  " boolean export interface static" +
  " byte extends long super" +
  " char final native synchronized" +
  " class float package throws" +
  " const goto private transient" +
  " debugger implements protected volatile" +
  " double import public let yield"
).split(" ");

var compilerWords = JavaScriptCompiler.RESERVED_WORDS = {};

for(var i=0, l=reservedWords.length; i<l; i++) {
  compilerWords[reservedWords[i]] = true;
}

JavaScriptCompiler.isValidJavaScriptVariableName = function(name) {
  if(!JavaScriptCompiler.RESERVED_WORDS[name] && /^[a-zA-Z_$][0-9a-zA-Z_$]*$/.test(name)) {
    return true;
  }
  return false;
};

exports["default"] = JavaScriptCompiler;
},{"../base":9,"../exception":17}],14:[function(require,module,exports){
"use strict";
/* jshint ignore:start */
/* Jison generated parser */
var handlebars = (function(){
var parser = {trace: function trace() { },
yy: {},
symbols_: {"error":2,"root":3,"statements":4,"EOF":5,"program":6,"simpleInverse":7,"statement":8,"openInverse":9,"closeBlock":10,"openBlock":11,"mustache":12,"partial":13,"CONTENT":14,"COMMENT":15,"OPEN_BLOCK":16,"sexpr":17,"CLOSE":18,"OPEN_INVERSE":19,"OPEN_ENDBLOCK":20,"path":21,"OPEN":22,"OPEN_UNESCAPED":23,"CLOSE_UNESCAPED":24,"OPEN_PARTIAL":25,"partialName":26,"partial_option0":27,"sexpr_repetition0":28,"sexpr_option0":29,"dataName":30,"param":31,"STRING":32,"INTEGER":33,"BOOLEAN":34,"OPEN_SEXPR":35,"CLOSE_SEXPR":36,"hash":37,"hash_repetition_plus0":38,"hashSegment":39,"ID":40,"EQUALS":41,"DATA":42,"pathSegments":43,"SEP":44,"$accept":0,"$end":1},
terminals_: {2:"error",5:"EOF",14:"CONTENT",15:"COMMENT",16:"OPEN_BLOCK",18:"CLOSE",19:"OPEN_INVERSE",20:"OPEN_ENDBLOCK",22:"OPEN",23:"OPEN_UNESCAPED",24:"CLOSE_UNESCAPED",25:"OPEN_PARTIAL",32:"STRING",33:"INTEGER",34:"BOOLEAN",35:"OPEN_SEXPR",36:"CLOSE_SEXPR",40:"ID",41:"EQUALS",42:"DATA",44:"SEP"},
productions_: [0,[3,2],[3,1],[6,2],[6,3],[6,2],[6,1],[6,1],[6,0],[4,1],[4,2],[8,3],[8,3],[8,1],[8,1],[8,1],[8,1],[11,3],[9,3],[10,3],[12,3],[12,3],[13,4],[7,2],[17,3],[17,1],[31,1],[31,1],[31,1],[31,1],[31,1],[31,3],[37,1],[39,3],[26,1],[26,1],[26,1],[30,2],[21,1],[43,3],[43,1],[27,0],[27,1],[28,0],[28,2],[29,0],[29,1],[38,1],[38,2]],
performAction: function anonymous(yytext,yyleng,yylineno,yy,yystate,$$,_$) {

var $0 = $$.length - 1;
switch (yystate) {
case 1: return new yy.ProgramNode($$[$0-1], this._$); 
break;
case 2: return new yy.ProgramNode([], this._$); 
break;
case 3:this.$ = new yy.ProgramNode([], $$[$0-1], $$[$0], this._$);
break;
case 4:this.$ = new yy.ProgramNode($$[$0-2], $$[$0-1], $$[$0], this._$);
break;
case 5:this.$ = new yy.ProgramNode($$[$0-1], $$[$0], [], this._$);
break;
case 6:this.$ = new yy.ProgramNode($$[$0], this._$);
break;
case 7:this.$ = new yy.ProgramNode([], this._$);
break;
case 8:this.$ = new yy.ProgramNode([], this._$);
break;
case 9:this.$ = [$$[$0]];
break;
case 10: $$[$0-1].push($$[$0]); this.$ = $$[$0-1]; 
break;
case 11:this.$ = new yy.BlockNode($$[$0-2], $$[$0-1].inverse, $$[$0-1], $$[$0], this._$);
break;
case 12:this.$ = new yy.BlockNode($$[$0-2], $$[$0-1], $$[$0-1].inverse, $$[$0], this._$);
break;
case 13:this.$ = $$[$0];
break;
case 14:this.$ = $$[$0];
break;
case 15:this.$ = new yy.ContentNode($$[$0], this._$);
break;
case 16:this.$ = new yy.CommentNode($$[$0], this._$);
break;
case 17:this.$ = new yy.MustacheNode($$[$0-1], null, $$[$0-2], stripFlags($$[$0-2], $$[$0]), this._$);
break;
case 18:this.$ = new yy.MustacheNode($$[$0-1], null, $$[$0-2], stripFlags($$[$0-2], $$[$0]), this._$);
break;
case 19:this.$ = {path: $$[$0-1], strip: stripFlags($$[$0-2], $$[$0])};
break;
case 20:this.$ = new yy.MustacheNode($$[$0-1], null, $$[$0-2], stripFlags($$[$0-2], $$[$0]), this._$);
break;
case 21:this.$ = new yy.MustacheNode($$[$0-1], null, $$[$0-2], stripFlags($$[$0-2], $$[$0]), this._$);
break;
case 22:this.$ = new yy.PartialNode($$[$0-2], $$[$0-1], stripFlags($$[$0-3], $$[$0]), this._$);
break;
case 23:this.$ = stripFlags($$[$0-1], $$[$0]);
break;
case 24:this.$ = new yy.SexprNode([$$[$0-2]].concat($$[$0-1]), $$[$0], this._$);
break;
case 25:this.$ = new yy.SexprNode([$$[$0]], null, this._$);
break;
case 26:this.$ = $$[$0];
break;
case 27:this.$ = new yy.StringNode($$[$0], this._$);
break;
case 28:this.$ = new yy.IntegerNode($$[$0], this._$);
break;
case 29:this.$ = new yy.BooleanNode($$[$0], this._$);
break;
case 30:this.$ = $$[$0];
break;
case 31:$$[$0-1].isHelper = true; this.$ = $$[$0-1];
break;
case 32:this.$ = new yy.HashNode($$[$0], this._$);
break;
case 33:this.$ = [$$[$0-2], $$[$0]];
break;
case 34:this.$ = new yy.PartialNameNode($$[$0], this._$);
break;
case 35:this.$ = new yy.PartialNameNode(new yy.StringNode($$[$0], this._$), this._$);
break;
case 36:this.$ = new yy.PartialNameNode(new yy.IntegerNode($$[$0], this._$));
break;
case 37:this.$ = new yy.DataNode($$[$0], this._$);
break;
case 38:this.$ = new yy.IdNode($$[$0], this._$);
break;
case 39: $$[$0-2].push({part: $$[$0], separator: $$[$0-1]}); this.$ = $$[$0-2]; 
break;
case 40:this.$ = [{part: $$[$0]}];
break;
case 43:this.$ = [];
break;
case 44:$$[$0-1].push($$[$0]);
break;
case 47:this.$ = [$$[$0]];
break;
case 48:$$[$0-1].push($$[$0]);
break;
}
},
table: [{3:1,4:2,5:[1,3],8:4,9:5,11:6,12:7,13:8,14:[1,9],15:[1,10],16:[1,12],19:[1,11],22:[1,13],23:[1,14],25:[1,15]},{1:[3]},{5:[1,16],8:17,9:5,11:6,12:7,13:8,14:[1,9],15:[1,10],16:[1,12],19:[1,11],22:[1,13],23:[1,14],25:[1,15]},{1:[2,2]},{5:[2,9],14:[2,9],15:[2,9],16:[2,9],19:[2,9],20:[2,9],22:[2,9],23:[2,9],25:[2,9]},{4:20,6:18,7:19,8:4,9:5,11:6,12:7,13:8,14:[1,9],15:[1,10],16:[1,12],19:[1,21],20:[2,8],22:[1,13],23:[1,14],25:[1,15]},{4:20,6:22,7:19,8:4,9:5,11:6,12:7,13:8,14:[1,9],15:[1,10],16:[1,12],19:[1,21],20:[2,8],22:[1,13],23:[1,14],25:[1,15]},{5:[2,13],14:[2,13],15:[2,13],16:[2,13],19:[2,13],20:[2,13],22:[2,13],23:[2,13],25:[2,13]},{5:[2,14],14:[2,14],15:[2,14],16:[2,14],19:[2,14],20:[2,14],22:[2,14],23:[2,14],25:[2,14]},{5:[2,15],14:[2,15],15:[2,15],16:[2,15],19:[2,15],20:[2,15],22:[2,15],23:[2,15],25:[2,15]},{5:[2,16],14:[2,16],15:[2,16],16:[2,16],19:[2,16],20:[2,16],22:[2,16],23:[2,16],25:[2,16]},{17:23,21:24,30:25,40:[1,28],42:[1,27],43:26},{17:29,21:24,30:25,40:[1,28],42:[1,27],43:26},{17:30,21:24,30:25,40:[1,28],42:[1,27],43:26},{17:31,21:24,30:25,40:[1,28],42:[1,27],43:26},{21:33,26:32,32:[1,34],33:[1,35],40:[1,28],43:26},{1:[2,1]},{5:[2,10],14:[2,10],15:[2,10],16:[2,10],19:[2,10],20:[2,10],22:[2,10],23:[2,10],25:[2,10]},{10:36,20:[1,37]},{4:38,8:4,9:5,11:6,12:7,13:8,14:[1,9],15:[1,10],16:[1,12],19:[1,11],20:[2,7],22:[1,13],23:[1,14],25:[1,15]},{7:39,8:17,9:5,11:6,12:7,13:8,14:[1,9],15:[1,10],16:[1,12],19:[1,21],20:[2,6],22:[1,13],23:[1,14],25:[1,15]},{17:23,18:[1,40],21:24,30:25,40:[1,28],42:[1,27],43:26},{10:41,20:[1,37]},{18:[1,42]},{18:[2,43],24:[2,43],28:43,32:[2,43],33:[2,43],34:[2,43],35:[2,43],36:[2,43],40:[2,43],42:[2,43]},{18:[2,25],24:[2,25],36:[2,25]},{18:[2,38],24:[2,38],32:[2,38],33:[2,38],34:[2,38],35:[2,38],36:[2,38],40:[2,38],42:[2,38],44:[1,44]},{21:45,40:[1,28],43:26},{18:[2,40],24:[2,40],32:[2,40],33:[2,40],34:[2,40],35:[2,40],36:[2,40],40:[2,40],42:[2,40],44:[2,40]},{18:[1,46]},{18:[1,47]},{24:[1,48]},{18:[2,41],21:50,27:49,40:[1,28],43:26},{18:[2,34],40:[2,34]},{18:[2,35],40:[2,35]},{18:[2,36],40:[2,36]},{5:[2,11],14:[2,11],15:[2,11],16:[2,11],19:[2,11],20:[2,11],22:[2,11],23:[2,11],25:[2,11]},{21:51,40:[1,28],43:26},{8:17,9:5,11:6,12:7,13:8,14:[1,9],15:[1,10],16:[1,12],19:[1,11],20:[2,3],22:[1,13],23:[1,14],25:[1,15]},{4:52,8:4,9:5,11:6,12:7,13:8,14:[1,9],15:[1,10],16:[1,12],19:[1,11],20:[2,5],22:[1,13],23:[1,14],25:[1,15]},{14:[2,23],15:[2,23],16:[2,23],19:[2,23],20:[2,23],22:[2,23],23:[2,23],25:[2,23]},{5:[2,12],14:[2,12],15:[2,12],16:[2,12],19:[2,12],20:[2,12],22:[2,12],23:[2,12],25:[2,12]},{14:[2,18],15:[2,18],16:[2,18],19:[2,18],20:[2,18],22:[2,18],23:[2,18],25:[2,18]},{18:[2,45],21:56,24:[2,45],29:53,30:60,31:54,32:[1,57],33:[1,58],34:[1,59],35:[1,61],36:[2,45],37:55,38:62,39:63,40:[1,64],42:[1,27],43:26},{40:[1,65]},{18:[2,37],24:[2,37],32:[2,37],33:[2,37],34:[2,37],35:[2,37],36:[2,37],40:[2,37],42:[2,37]},{14:[2,17],15:[2,17],16:[2,17],19:[2,17],20:[2,17],22:[2,17],23:[2,17],25:[2,17]},{5:[2,20],14:[2,20],15:[2,20],16:[2,20],19:[2,20],20:[2,20],22:[2,20],23:[2,20],25:[2,20]},{5:[2,21],14:[2,21],15:[2,21],16:[2,21],19:[2,21],20:[2,21],22:[2,21],23:[2,21],25:[2,21]},{18:[1,66]},{18:[2,42]},{18:[1,67]},{8:17,9:5,11:6,12:7,13:8,14:[1,9],15:[1,10],16:[1,12],19:[1,11],20:[2,4],22:[1,13],23:[1,14],25:[1,15]},{18:[2,24],24:[2,24],36:[2,24]},{18:[2,44],24:[2,44],32:[2,44],33:[2,44],34:[2,44],35:[2,44],36:[2,44],40:[2,44],42:[2,44]},{18:[2,46],24:[2,46],36:[2,46]},{18:[2,26],24:[2,26],32:[2,26],33:[2,26],34:[2,26],35:[2,26],36:[2,26],40:[2,26],42:[2,26]},{18:[2,27],24:[2,27],32:[2,27],33:[2,27],34:[2,27],35:[2,27],36:[2,27],40:[2,27],42:[2,27]},{18:[2,28],24:[2,28],32:[2,28],33:[2,28],34:[2,28],35:[2,28],36:[2,28],40:[2,28],42:[2,28]},{18:[2,29],24:[2,29],32:[2,29],33:[2,29],34:[2,29],35:[2,29],36:[2,29],40:[2,29],42:[2,29]},{18:[2,30],24:[2,30],32:[2,30],33:[2,30],34:[2,30],35:[2,30],36:[2,30],40:[2,30],42:[2,30]},{17:68,21:24,30:25,40:[1,28],42:[1,27],43:26},{18:[2,32],24:[2,32],36:[2,32],39:69,40:[1,70]},{18:[2,47],24:[2,47],36:[2,47],40:[2,47]},{18:[2,40],24:[2,40],32:[2,40],33:[2,40],34:[2,40],35:[2,40],36:[2,40],40:[2,40],41:[1,71],42:[2,40],44:[2,40]},{18:[2,39],24:[2,39],32:[2,39],33:[2,39],34:[2,39],35:[2,39],36:[2,39],40:[2,39],42:[2,39],44:[2,39]},{5:[2,22],14:[2,22],15:[2,22],16:[2,22],19:[2,22],20:[2,22],22:[2,22],23:[2,22],25:[2,22]},{5:[2,19],14:[2,19],15:[2,19],16:[2,19],19:[2,19],20:[2,19],22:[2,19],23:[2,19],25:[2,19]},{36:[1,72]},{18:[2,48],24:[2,48],36:[2,48],40:[2,48]},{41:[1,71]},{21:56,30:60,31:73,32:[1,57],33:[1,58],34:[1,59],35:[1,61],40:[1,28],42:[1,27],43:26},{18:[2,31],24:[2,31],32:[2,31],33:[2,31],34:[2,31],35:[2,31],36:[2,31],40:[2,31],42:[2,31]},{18:[2,33],24:[2,33],36:[2,33],40:[2,33]}],
defaultActions: {3:[2,2],16:[2,1],50:[2,42]},
parseError: function parseError(str, hash) {
    throw new Error(str);
},
parse: function parse(input) {
    var self = this, stack = [0], vstack = [null], lstack = [], table = this.table, yytext = "", yylineno = 0, yyleng = 0, recovering = 0, TERROR = 2, EOF = 1;
    this.lexer.setInput(input);
    this.lexer.yy = this.yy;
    this.yy.lexer = this.lexer;
    this.yy.parser = this;
    if (typeof this.lexer.yylloc == "undefined")
        this.lexer.yylloc = {};
    var yyloc = this.lexer.yylloc;
    lstack.push(yyloc);
    var ranges = this.lexer.options && this.lexer.options.ranges;
    if (typeof this.yy.parseError === "function")
        this.parseError = this.yy.parseError;
    function popStack(n) {
        stack.length = stack.length - 2 * n;
        vstack.length = vstack.length - n;
        lstack.length = lstack.length - n;
    }
    function lex() {
        var token;
        token = self.lexer.lex() || 1;
        if (typeof token !== "number") {
            token = self.symbols_[token] || token;
        }
        return token;
    }
    var symbol, preErrorSymbol, state, action, a, r, yyval = {}, p, len, newState, expected;
    while (true) {
        state = stack[stack.length - 1];
        if (this.defaultActions[state]) {
            action = this.defaultActions[state];
        } else {
            if (symbol === null || typeof symbol == "undefined") {
                symbol = lex();
            }
            action = table[state] && table[state][symbol];
        }
        if (typeof action === "undefined" || !action.length || !action[0]) {
            var errStr = "";
            if (!recovering) {
                expected = [];
                for (p in table[state])
                    if (this.terminals_[p] && p > 2) {
                        expected.push("'" + this.terminals_[p] + "'");
                    }
                if (this.lexer.showPosition) {
                    errStr = "Parse error on line " + (yylineno + 1) + ":\n" + this.lexer.showPosition() + "\nExpecting " + expected.join(", ") + ", got '" + (this.terminals_[symbol] || symbol) + "'";
                } else {
                    errStr = "Parse error on line " + (yylineno + 1) + ": Unexpected " + (symbol == 1?"end of input":"'" + (this.terminals_[symbol] || symbol) + "'");
                }
                this.parseError(errStr, {text: this.lexer.match, token: this.terminals_[symbol] || symbol, line: this.lexer.yylineno, loc: yyloc, expected: expected});
            }
        }
        if (action[0] instanceof Array && action.length > 1) {
            throw new Error("Parse Error: multiple actions possible at state: " + state + ", token: " + symbol);
        }
        switch (action[0]) {
        case 1:
            stack.push(symbol);
            vstack.push(this.lexer.yytext);
            lstack.push(this.lexer.yylloc);
            stack.push(action[1]);
            symbol = null;
            if (!preErrorSymbol) {
                yyleng = this.lexer.yyleng;
                yytext = this.lexer.yytext;
                yylineno = this.lexer.yylineno;
                yyloc = this.lexer.yylloc;
                if (recovering > 0)
                    recovering--;
            } else {
                symbol = preErrorSymbol;
                preErrorSymbol = null;
            }
            break;
        case 2:
            len = this.productions_[action[1]][1];
            yyval.$ = vstack[vstack.length - len];
            yyval._$ = {first_line: lstack[lstack.length - (len || 1)].first_line, last_line: lstack[lstack.length - 1].last_line, first_column: lstack[lstack.length - (len || 1)].first_column, last_column: lstack[lstack.length - 1].last_column};
            if (ranges) {
                yyval._$.range = [lstack[lstack.length - (len || 1)].range[0], lstack[lstack.length - 1].range[1]];
            }
            r = this.performAction.call(yyval, yytext, yyleng, yylineno, this.yy, action[1], vstack, lstack);
            if (typeof r !== "undefined") {
                return r;
            }
            if (len) {
                stack = stack.slice(0, -1 * len * 2);
                vstack = vstack.slice(0, -1 * len);
                lstack = lstack.slice(0, -1 * len);
            }
            stack.push(this.productions_[action[1]][0]);
            vstack.push(yyval.$);
            lstack.push(yyval._$);
            newState = table[stack[stack.length - 2]][stack[stack.length - 1]];
            stack.push(newState);
            break;
        case 3:
            return true;
        }
    }
    return true;
}
};


function stripFlags(open, close) {
  return {
    left: open.charAt(2) === '~',
    right: close.charAt(0) === '~' || close.charAt(1) === '~'
  };
}

/* Jison generated lexer */
var lexer = (function(){
var lexer = ({EOF:1,
parseError:function parseError(str, hash) {
        if (this.yy.parser) {
            this.yy.parser.parseError(str, hash);
        } else {
            throw new Error(str);
        }
    },
setInput:function (input) {
        this._input = input;
        this._more = this._less = this.done = false;
        this.yylineno = this.yyleng = 0;
        this.yytext = this.matched = this.match = '';
        this.conditionStack = ['INITIAL'];
        this.yylloc = {first_line:1,first_column:0,last_line:1,last_column:0};
        if (this.options.ranges) this.yylloc.range = [0,0];
        this.offset = 0;
        return this;
    },
input:function () {
        var ch = this._input[0];
        this.yytext += ch;
        this.yyleng++;
        this.offset++;
        this.match += ch;
        this.matched += ch;
        var lines = ch.match(/(?:\r\n?|\n).*/g);
        if (lines) {
            this.yylineno++;
            this.yylloc.last_line++;
        } else {
            this.yylloc.last_column++;
        }
        if (this.options.ranges) this.yylloc.range[1]++;

        this._input = this._input.slice(1);
        return ch;
    },
unput:function (ch) {
        var len = ch.length;
        var lines = ch.split(/(?:\r\n?|\n)/g);

        this._input = ch + this._input;
        this.yytext = this.yytext.substr(0, this.yytext.length-len-1);
        //this.yyleng -= len;
        this.offset -= len;
        var oldLines = this.match.split(/(?:\r\n?|\n)/g);
        this.match = this.match.substr(0, this.match.length-1);
        this.matched = this.matched.substr(0, this.matched.length-1);

        if (lines.length-1) this.yylineno -= lines.length-1;
        var r = this.yylloc.range;

        this.yylloc = {first_line: this.yylloc.first_line,
          last_line: this.yylineno+1,
          first_column: this.yylloc.first_column,
          last_column: lines ?
              (lines.length === oldLines.length ? this.yylloc.first_column : 0) + oldLines[oldLines.length - lines.length].length - lines[0].length:
              this.yylloc.first_column - len
          };

        if (this.options.ranges) {
            this.yylloc.range = [r[0], r[0] + this.yyleng - len];
        }
        return this;
    },
more:function () {
        this._more = true;
        return this;
    },
less:function (n) {
        this.unput(this.match.slice(n));
    },
pastInput:function () {
        var past = this.matched.substr(0, this.matched.length - this.match.length);
        return (past.length > 20 ? '...':'') + past.substr(-20).replace(/\n/g, "");
    },
upcomingInput:function () {
        var next = this.match;
        if (next.length < 20) {
            next += this._input.substr(0, 20-next.length);
        }
        return (next.substr(0,20)+(next.length > 20 ? '...':'')).replace(/\n/g, "");
    },
showPosition:function () {
        var pre = this.pastInput();
        var c = new Array(pre.length + 1).join("-");
        return pre + this.upcomingInput() + "\n" + c+"^";
    },
next:function () {
        if (this.done) {
            return this.EOF;
        }
        if (!this._input) this.done = true;

        var token,
            match,
            tempMatch,
            index,
            col,
            lines;
        if (!this._more) {
            this.yytext = '';
            this.match = '';
        }
        var rules = this._currentRules();
        for (var i=0;i < rules.length; i++) {
            tempMatch = this._input.match(this.rules[rules[i]]);
            if (tempMatch && (!match || tempMatch[0].length > match[0].length)) {
                match = tempMatch;
                index = i;
                if (!this.options.flex) break;
            }
        }
        if (match) {
            lines = match[0].match(/(?:\r\n?|\n).*/g);
            if (lines) this.yylineno += lines.length;
            this.yylloc = {first_line: this.yylloc.last_line,
                           last_line: this.yylineno+1,
                           first_column: this.yylloc.last_column,
                           last_column: lines ? lines[lines.length-1].length-lines[lines.length-1].match(/\r?\n?/)[0].length : this.yylloc.last_column + match[0].length};
            this.yytext += match[0];
            this.match += match[0];
            this.matches = match;
            this.yyleng = this.yytext.length;
            if (this.options.ranges) {
                this.yylloc.range = [this.offset, this.offset += this.yyleng];
            }
            this._more = false;
            this._input = this._input.slice(match[0].length);
            this.matched += match[0];
            token = this.performAction.call(this, this.yy, this, rules[index],this.conditionStack[this.conditionStack.length-1]);
            if (this.done && this._input) this.done = false;
            if (token) return token;
            else return;
        }
        if (this._input === "") {
            return this.EOF;
        } else {
            return this.parseError('Lexical error on line '+(this.yylineno+1)+'. Unrecognized text.\n'+this.showPosition(),
                    {text: "", token: null, line: this.yylineno});
        }
    },
lex:function lex() {
        var r = this.next();
        if (typeof r !== 'undefined') {
            return r;
        } else {
            return this.lex();
        }
    },
begin:function begin(condition) {
        this.conditionStack.push(condition);
    },
popState:function popState() {
        return this.conditionStack.pop();
    },
_currentRules:function _currentRules() {
        return this.conditions[this.conditionStack[this.conditionStack.length-1]].rules;
    },
topState:function () {
        return this.conditionStack[this.conditionStack.length-2];
    },
pushState:function begin(condition) {
        this.begin(condition);
    }});
lexer.options = {};
lexer.performAction = function anonymous(yy,yy_,$avoiding_name_collisions,YY_START) {


function strip(start, end) {
  return yy_.yytext = yy_.yytext.substr(start, yy_.yyleng-end);
}


var YYSTATE=YY_START
switch($avoiding_name_collisions) {
case 0:
                                   if(yy_.yytext.slice(-2) === "\\\\") {
                                     strip(0,1);
                                     this.begin("mu");
                                   } else if(yy_.yytext.slice(-1) === "\\") {
                                     strip(0,1);
                                     this.begin("emu");
                                   } else {
                                     this.begin("mu");
                                   }
                                   if(yy_.yytext) return 14;
                                 
break;
case 1:return 14;
break;
case 2:
                                   this.popState();
                                   return 14;
                                 
break;
case 3:strip(0,4); this.popState(); return 15;
break;
case 4:return 35;
break;
case 5:return 36;
break;
case 6:return 25;
break;
case 7:return 16;
break;
case 8:return 20;
break;
case 9:return 19;
break;
case 10:return 19;
break;
case 11:return 23;
break;
case 12:return 22;
break;
case 13:this.popState(); this.begin('com');
break;
case 14:strip(3,5); this.popState(); return 15;
break;
case 15:return 22;
break;
case 16:return 41;
break;
case 17:return 40;
break;
case 18:return 40;
break;
case 19:return 44;
break;
case 20:// ignore whitespace
break;
case 21:this.popState(); return 24;
break;
case 22:this.popState(); return 18;
break;
case 23:yy_.yytext = strip(1,2).replace(/\\"/g,'"'); return 32;
break;
case 24:yy_.yytext = strip(1,2).replace(/\\'/g,"'"); return 32;
break;
case 25:return 42;
break;
case 26:return 34;
break;
case 27:return 34;
break;
case 28:return 33;
break;
case 29:return 40;
break;
case 30:yy_.yytext = strip(1,2); return 40;
break;
case 31:return 'INVALID';
break;
case 32:return 5;
break;
}
};
lexer.rules = [/^(?:[^\x00]*?(?=(\{\{)))/,/^(?:[^\x00]+)/,/^(?:[^\x00]{2,}?(?=(\{\{|\\\{\{|\\\\\{\{|$)))/,/^(?:[\s\S]*?--\}\})/,/^(?:\()/,/^(?:\))/,/^(?:\{\{(~)?>)/,/^(?:\{\{(~)?#)/,/^(?:\{\{(~)?\/)/,/^(?:\{\{(~)?\^)/,/^(?:\{\{(~)?\s*else\b)/,/^(?:\{\{(~)?\{)/,/^(?:\{\{(~)?&)/,/^(?:\{\{!--)/,/^(?:\{\{![\s\S]*?\}\})/,/^(?:\{\{(~)?)/,/^(?:=)/,/^(?:\.\.)/,/^(?:\.(?=([=~}\s\/.)])))/,/^(?:[\/.])/,/^(?:\s+)/,/^(?:\}(~)?\}\})/,/^(?:(~)?\}\})/,/^(?:"(\\["]|[^"])*")/,/^(?:'(\\[']|[^'])*')/,/^(?:@)/,/^(?:true(?=([~}\s)])))/,/^(?:false(?=([~}\s)])))/,/^(?:-?[0-9]+(?=([~}\s)])))/,/^(?:([^\s!"#%-,\.\/;->@\[-\^`\{-~]+(?=([=~}\s\/.)]))))/,/^(?:\[[^\]]*\])/,/^(?:.)/,/^(?:$)/];
lexer.conditions = {"mu":{"rules":[4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32],"inclusive":false},"emu":{"rules":[2],"inclusive":false},"com":{"rules":[3],"inclusive":false},"INITIAL":{"rules":[0,1,32],"inclusive":true}};
return lexer;})()
parser.lexer = lexer;
function Parser () { this.yy = {}; }Parser.prototype = parser;parser.Parser = Parser;
return new Parser;
})();exports["default"] = handlebars;
/* jshint ignore:end */
},{}],15:[function(require,module,exports){
"use strict";
var Visitor = require("./visitor")["default"];

function print(ast) {
  return new PrintVisitor().accept(ast);
}

exports.print = print;function PrintVisitor() {
  this.padding = 0;
}

exports.PrintVisitor = PrintVisitor;PrintVisitor.prototype = new Visitor();

PrintVisitor.prototype.pad = function(string, newline) {
  var out = "";

  for(var i=0,l=this.padding; i<l; i++) {
    out = out + "  ";
  }

  out = out + string;

  if(newline !== false) { out = out + "\n"; }
  return out;
};

PrintVisitor.prototype.program = function(program) {
  var out = "",
      statements = program.statements,
      i, l;

  for(i=0, l=statements.length; i<l; i++) {
    out = out + this.accept(statements[i]);
  }

  this.padding--;

  return out;
};

PrintVisitor.prototype.block = function(block) {
  var out = "";

  out = out + this.pad("BLOCK:");
  this.padding++;
  out = out + this.accept(block.mustache);
  if (block.program) {
    out = out + this.pad("PROGRAM:");
    this.padding++;
    out = out + this.accept(block.program);
    this.padding--;
  }
  if (block.inverse) {
    if (block.program) { this.padding++; }
    out = out + this.pad("{{^}}");
    this.padding++;
    out = out + this.accept(block.inverse);
    this.padding--;
    if (block.program) { this.padding--; }
  }
  this.padding--;

  return out;
};

PrintVisitor.prototype.sexpr = function(sexpr) {
  var params = sexpr.params, paramStrings = [], hash;

  for(var i=0, l=params.length; i<l; i++) {
    paramStrings.push(this.accept(params[i]));
  }

  params = "[" + paramStrings.join(", ") + "]";

  hash = sexpr.hash ? " " + this.accept(sexpr.hash) : "";

  return this.accept(sexpr.id) + " " + params + hash;
};

PrintVisitor.prototype.mustache = function(mustache) {
  return this.pad("{{ " + this.accept(mustache.sexpr) + " }}");
};

PrintVisitor.prototype.partial = function(partial) {
  var content = this.accept(partial.partialName);
  if(partial.context) { content = content + " " + this.accept(partial.context); }
  return this.pad("{{> " + content + " }}");
};

PrintVisitor.prototype.hash = function(hash) {
  var pairs = hash.pairs;
  var joinedPairs = [], left, right;

  for(var i=0, l=pairs.length; i<l; i++) {
    left = pairs[i][0];
    right = this.accept(pairs[i][1]);
    joinedPairs.push( left + "=" + right );
  }

  return "HASH{" + joinedPairs.join(", ") + "}";
};

PrintVisitor.prototype.STRING = function(string) {
  return '"' + string.string + '"';
};

PrintVisitor.prototype.INTEGER = function(integer) {
  return "INTEGER{" + integer.integer + "}";
};

PrintVisitor.prototype.BOOLEAN = function(bool) {
  return "BOOLEAN{" + bool.bool + "}";
};

PrintVisitor.prototype.ID = function(id) {
  var path = id.parts.join("/");
  if(id.parts.length > 1) {
    return "PATH:" + path;
  } else {
    return "ID:" + path;
  }
};

PrintVisitor.prototype.PARTIAL_NAME = function(partialName) {
    return "PARTIAL:" + partialName.name;
};

PrintVisitor.prototype.DATA = function(data) {
  return "@" + this.accept(data.id);
};

PrintVisitor.prototype.content = function(content) {
  return this.pad("CONTENT[ '" + content.string + "' ]");
};

PrintVisitor.prototype.comment = function(comment) {
  return this.pad("{{! '" + comment.comment + "' }}");
};
},{"./visitor":16}],16:[function(require,module,exports){
"use strict";
function Visitor() {}

Visitor.prototype = {
  constructor: Visitor,

  accept: function(object) {
    return this[object.type](object);
  }
};

exports["default"] = Visitor;
},{}],17:[function(require,module,exports){
"use strict";

var errorProps = ['description', 'fileName', 'lineNumber', 'message', 'name', 'number', 'stack'];

function Exception(message, node) {
  var line;
  if (node && node.firstLine) {
    line = node.firstLine;

    message += ' - ' + line + ':' + node.firstColumn;
  }

  var tmp = Error.prototype.constructor.call(this, message);

  // Unfortunately errors are not enumerable in Chrome (at least), so `for prop in tmp` doesn't work.
  for (var idx = 0; idx < errorProps.length; idx++) {
    this[errorProps[idx]] = tmp[errorProps[idx]];
  }

  if (line) {
    this.lineNumber = line;
    this.column = node.firstColumn;
  }
}

Exception.prototype = new Error();

exports["default"] = Exception;
},{}],18:[function(require,module,exports){
"use strict";
var Utils = require("./utils");
var Exception = require("./exception")["default"];
var COMPILER_REVISION = require("./base").COMPILER_REVISION;
var REVISION_CHANGES = require("./base").REVISION_CHANGES;

function checkRevision(compilerInfo) {
  var compilerRevision = compilerInfo && compilerInfo[0] || 1,
      currentRevision = COMPILER_REVISION;

  if (compilerRevision !== currentRevision) {
    if (compilerRevision < currentRevision) {
      var runtimeVersions = REVISION_CHANGES[currentRevision],
          compilerVersions = REVISION_CHANGES[compilerRevision];
      throw new Exception("Template was precompiled with an older version of Handlebars than the current runtime. "+
            "Please update your precompiler to a newer version ("+runtimeVersions+") or downgrade your runtime to an older version ("+compilerVersions+").");
    } else {
      // Use the embedded version info since the runtime doesn't know about this revision yet
      throw new Exception("Template was precompiled with a newer version of Handlebars than the current runtime. "+
            "Please update your runtime to a newer version ("+compilerInfo[1]+").");
    }
  }
}

exports.checkRevision = checkRevision;// TODO: Remove this line and break up compilePartial

function template(templateSpec, env) {
  if (!env) {
    throw new Exception("No environment passed to template");
  }

  // Note: Using env.VM references rather than local var references throughout this section to allow
  // for external users to override these as psuedo-supported APIs.
  var invokePartialWrapper = function(partial, name, context, helpers, partials, data) {
    var result = env.VM.invokePartial.apply(this, arguments);
    if (result != null) { return result; }

    if (env.compile) {
      var options = { helpers: helpers, partials: partials, data: data };
      partials[name] = env.compile(partial, { data: data !== undefined }, env);
      return partials[name](context, options);
    } else {
      throw new Exception("The partial " + name + " could not be compiled when running in runtime-only mode");
    }
  };

  // Just add water
  var container = {
    escapeExpression: Utils.escapeExpression,
    invokePartial: invokePartialWrapper,
    programs: [],
    program: function(i, fn, data) {
      var programWrapper = this.programs[i];
      if(data) {
        programWrapper = program(i, fn, data);
      } else if (!programWrapper) {
        programWrapper = this.programs[i] = program(i, fn);
      }
      return programWrapper;
    },
    merge: function(param, common) {
      var ret = param || common;

      if (param && common && (param !== common)) {
        ret = {};
        Utils.extend(ret, common);
        Utils.extend(ret, param);
      }
      return ret;
    },
    programWithDepth: env.VM.programWithDepth,
    noop: env.VM.noop,
    compilerInfo: null
  };

  return function(context, options) {
    options = options || {};
    var namespace = options.partial ? options : env,
        helpers,
        partials;

    if (!options.partial) {
      helpers = options.helpers;
      partials = options.partials;
    }
    var result = templateSpec.call(
          container,
          namespace, context,
          helpers,
          partials,
          options.data);

    if (!options.partial) {
      env.VM.checkRevision(container.compilerInfo);
    }

    return result;
  };
}

exports.template = template;function programWithDepth(i, fn, data /*, $depth */) {
  var args = Array.prototype.slice.call(arguments, 3);

  var prog = function(context, options) {
    options = options || {};

    return fn.apply(this, [context, options.data || data].concat(args));
  };
  prog.program = i;
  prog.depth = args.length;
  return prog;
}

exports.programWithDepth = programWithDepth;function program(i, fn, data) {
  var prog = function(context, options) {
    options = options || {};

    return fn(context, options.data || data);
  };
  prog.program = i;
  prog.depth = 0;
  return prog;
}

exports.program = program;function invokePartial(partial, name, context, helpers, partials, data) {
  var options = { partial: true, helpers: helpers, partials: partials, data: data };

  if(partial === undefined) {
    throw new Exception("The partial " + name + " could not be found");
  } else if(partial instanceof Function) {
    return partial(context, options);
  }
}

exports.invokePartial = invokePartial;function noop() { return ""; }

exports.noop = noop;
},{"./base":9,"./exception":17,"./utils":20}],19:[function(require,module,exports){
"use strict";
// Build out our basic SafeString type
function SafeString(string) {
  this.string = string;
}

SafeString.prototype.toString = function() {
  return "" + this.string;
};

exports["default"] = SafeString;
},{}],20:[function(require,module,exports){
"use strict";
/*jshint -W004 */
var SafeString = require("./safe-string")["default"];

var escape = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#x27;",
  "`": "&#x60;"
};

var badChars = /[&<>"'`]/g;
var possible = /[&<>"'`]/;

function escapeChar(chr) {
  return escape[chr] || "&amp;";
}

function extend(obj, value) {
  for(var key in value) {
    if(Object.prototype.hasOwnProperty.call(value, key)) {
      obj[key] = value[key];
    }
  }
}

exports.extend = extend;var toString = Object.prototype.toString;
exports.toString = toString;
// Sourced from lodash
// https://github.com/bestiejs/lodash/blob/master/LICENSE.txt
var isFunction = function(value) {
  return typeof value === 'function';
};
// fallback for older versions of Chrome and Safari
if (isFunction(/x/)) {
  isFunction = function(value) {
    return typeof value === 'function' && toString.call(value) === '[object Function]';
  };
}
var isFunction;
exports.isFunction = isFunction;
var isArray = Array.isArray || function(value) {
  return (value && typeof value === 'object') ? toString.call(value) === '[object Array]' : false;
};
exports.isArray = isArray;

function escapeExpression(string) {
  // don't escape SafeStrings, since they're already safe
  if (string instanceof SafeString) {
    return string.toString();
  } else if (!string && string !== 0) {
    return "";
  }

  // Force a string conversion as this will be done by the append regardless and
  // the regex test will do this transparently behind the scenes, causing issues if
  // an object's to string has escaped characters in it.
  string = "" + string;

  if(!possible.test(string)) { return string; }
  return string.replace(badChars, escapeChar);
}

exports.escapeExpression = escapeExpression;function isEmpty(value) {
  if (!value && value !== 0) {
    return true;
  } else if (isArray(value) && value.length === 0) {
    return true;
  } else {
    return false;
  }
}

exports.isEmpty = isEmpty;
},{"./safe-string":19}],21:[function(require,module,exports){
// USAGE:
// var handlebars = require('handlebars');

// var local = handlebars.create();

var handlebars = require('../dist/cjs/handlebars')["default"];

handlebars.Visitor = require('../dist/cjs/handlebars/compiler/visitor')["default"];

var printer = require('../dist/cjs/handlebars/compiler/printer');
handlebars.PrintVisitor = printer.PrintVisitor;
handlebars.print = printer.print;

module.exports = handlebars;

// Publish a Node.js require() handler for .handlebars and .hbs files
if (typeof require !== 'undefined' && require.extensions) {
  var extension = function(module, filename) {
    var fs = require("fs");
    var templateString = fs.readFileSync(filename, "utf8");
    module.exports = handlebars.compile(templateString);
  };
  require.extensions[".handlebars"] = extension;
  require.extensions[".hbs"] = extension;
}

},{"../dist/cjs/handlebars":7,"../dist/cjs/handlebars/compiler/printer":15,"../dist/cjs/handlebars/compiler/visitor":16,"fs":1}],22:[function(require,module,exports){
/**
 * humane.js
 * Humanized Messages for Notifications
 * @author Marc Harter (@wavded)
 * @example
 *   humane.log('hello world');
 * See more usage examples at: http://wavded.github.com/humane-js/
 */

;!function (name, context, definition) {
   if (typeof module !== 'undefined') module.exports = definition(name, context)
   else if (typeof define === 'function' && typeof define.amd  === 'object') define(definition)
   else context[name] = definition(name, context)
}('humane', this, function (name, context) {
   var win = window
   var doc = document

   var ENV = {
      on: function (el, type, cb) {
         'addEventListener' in win ? el.addEventListener(type,cb,false) : el.attachEvent('on'+type,cb)
      },
      off: function (el, type, cb) {
         'removeEventListener' in win ? el.removeEventListener(type,cb,false) : el.detachEvent('on'+type,cb)
      },
      bind: function (fn, ctx) {
         return function () { fn.apply(ctx,arguments) }
      },
      isArray: Array.isArray || function (obj) { return Object.prototype.toString.call(obj) === '[object Array]' },
      config: function (preferred, fallback) {
         return preferred != null ? preferred : fallback
      },
      transSupport: false,
      useFilter: /msie [678]/i.test(navigator.userAgent), // sniff, sniff
      _checkTransition: function () {
         var el = doc.createElement('div')
         var vendors = { webkit: 'webkit', Moz: '', O: 'o', ms: 'MS' }

         for (var vendor in vendors)
            if (vendor + 'Transition' in el.style) {
               this.vendorPrefix = vendors[vendor]
               this.transSupport = true
            }
      }
   }
   ENV._checkTransition()

   var Humane = function (o) {
      o || (o = {})
      this.queue = []
      this.baseCls = o.baseCls || 'humane'
      this.addnCls = o.addnCls || ''
      this.timeout = 'timeout' in o ? o.timeout : 2500
      this.waitForMove = o.waitForMove || false
      this.clickToClose = o.clickToClose || false
      this.timeoutAfterMove = o.timeoutAfterMove || false 
      this.container = o.container

      try { this._setupEl() } // attempt to setup elements
      catch (e) {
        ENV.on(win,'load',ENV.bind(this._setupEl, this)) // dom wasn't ready, wait till ready
      }
   }

   Humane.prototype = {
      constructor: Humane,
      _setupEl: function () {
         var el = doc.createElement('div')
         el.style.display = 'none'
         if (!this.container){
           if(doc.body) this.container = doc.body;
           else throw 'document.body is null'
         }
         this.container.appendChild(el)
         this.el = el
         this.removeEvent = ENV.bind(function(){ if (!this.timeoutAfterMove){this.remove()} else {setTimeout(ENV.bind(this.remove,this),this.timeout);}},this)
         this.transEvent = ENV.bind(this._afterAnimation,this)
         this._run()
      },
      _afterTimeout: function () {
         if (!ENV.config(this.currentMsg.waitForMove,this.waitForMove)) this.remove()

         else if (!this.removeEventsSet) {
            ENV.on(doc.body,'mousemove',this.removeEvent)
            ENV.on(doc.body,'click',this.removeEvent)
            ENV.on(doc.body,'keypress',this.removeEvent)
            ENV.on(doc.body,'touchstart',this.removeEvent)
            this.removeEventsSet = true
         }
      },
      _run: function () {
         if (this._animating || !this.queue.length || !this.el) return

         this._animating = true
         if (this.currentTimer) {
            clearTimeout(this.currentTimer)
            this.currentTimer = null
         }

         var msg = this.queue.shift()
         var clickToClose = ENV.config(msg.clickToClose,this.clickToClose)

         if (clickToClose) {
            ENV.on(this.el,'click',this.removeEvent)
            ENV.on(this.el,'touchstart',this.removeEvent)
         }

         var timeout = ENV.config(msg.timeout,this.timeout)

         if (timeout > 0)
            this.currentTimer = setTimeout(ENV.bind(this._afterTimeout,this), timeout)

         if (ENV.isArray(msg.html)) msg.html = '<ul><li>'+msg.html.join('<li>')+'</ul>'

         this.el.innerHTML = msg.html
         this.currentMsg = msg
         this.el.className = this.baseCls
         if (ENV.transSupport) {
            this.el.style.display = 'block'
            setTimeout(ENV.bind(this._showMsg,this),50)
         } else {
            this._showMsg()
         }

      },
      _setOpacity: function (opacity) {
         if (ENV.useFilter){
            try{
               this.el.filters.item('DXImageTransform.Microsoft.Alpha').Opacity = opacity*100
            } catch(err){}
         } else {
            this.el.style.opacity = String(opacity)
         }
      },
      _showMsg: function () {
         var addnCls = ENV.config(this.currentMsg.addnCls,this.addnCls)
         if (ENV.transSupport) {
            this.el.className = this.baseCls+' '+addnCls+' '+this.baseCls+'-animate'
         }
         else {
            var opacity = 0
            this.el.className = this.baseCls+' '+addnCls+' '+this.baseCls+'-js-animate'
            this._setOpacity(0) // reset value so hover states work
            this.el.style.display = 'block'

            var self = this
            var interval = setInterval(function(){
               if (opacity < 1) {
                  opacity += 0.1
                  if (opacity > 1) opacity = 1
                  self._setOpacity(opacity)
               }
               else clearInterval(interval)
            }, 30)
         }
      },
      _hideMsg: function () {
         var addnCls = ENV.config(this.currentMsg.addnCls,this.addnCls)
         if (ENV.transSupport) {
            this.el.className = this.baseCls+' '+addnCls
            ENV.on(this.el,ENV.vendorPrefix ? ENV.vendorPrefix+'TransitionEnd' : 'transitionend',this.transEvent)
         }
         else {
            var opacity = 1
            var self = this
            var interval = setInterval(function(){
               if(opacity > 0) {
                  opacity -= 0.1
                  if (opacity < 0) opacity = 0
                  self._setOpacity(opacity);
               }
               else {
                  self.el.className = self.baseCls+' '+addnCls
                  clearInterval(interval)
                  self._afterAnimation()
               }
            }, 30)
         }
      },
      _afterAnimation: function () {
         if (ENV.transSupport) ENV.off(this.el,ENV.vendorPrefix ? ENV.vendorPrefix+'TransitionEnd' : 'transitionend',this.transEvent)

         if (this.currentMsg.cb) this.currentMsg.cb()
         this.el.style.display = 'none'

         this._animating = false
         this._run()
      },
      remove: function (e) {
         var cb = typeof e == 'function' ? e : null

         ENV.off(doc.body,'mousemove',this.removeEvent)
         ENV.off(doc.body,'click',this.removeEvent)
         ENV.off(doc.body,'keypress',this.removeEvent)
         ENV.off(doc.body,'touchstart',this.removeEvent)
         ENV.off(this.el,'click',this.removeEvent)
         ENV.off(this.el,'touchstart',this.removeEvent)
         this.removeEventsSet = false

         if (cb && this.currentMsg) this.currentMsg.cb = cb
         if (this._animating) this._hideMsg()
         else if (cb) cb()
      },
      log: function (html, o, cb, defaults) {
         var msg = {}
         if (defaults)
           for (var opt in defaults)
               msg[opt] = defaults[opt]

         if (typeof o == 'function') cb = o
         else if (o)
            for (var opt in o) msg[opt] = o[opt]

         msg.html = html
         if (cb) msg.cb = cb
         this.queue.push(msg)
         this._run()
         return this
      },
      spawn: function (defaults) {
         var self = this
         return function (html, o, cb) {
            self.log.call(self,html,o,cb,defaults)
            return self
         }
      },
      create: function (o) { return new Humane(o) }
   }
   return new Humane()
})

},{}],23:[function(require,module,exports){
/*
	Leaflet.draw, a plugin that adds drawing and editing tools to Leaflet powered maps.
	(c) 2012-2013, Jacob Toye, Smartrak

	https://github.com/Leaflet/Leaflet.draw
	http://leafletjs.com
	https://github.com/jacobtoye
*/
(function(t,e){L.drawVersion="0.2.2",L.drawLocal={draw:{toolbar:{actions:{title:"Cancel drawing",text:"Cancel"},buttons:{polyline:"Draw a polyline",polygon:"Draw a polygon",rectangle:"Draw a rectangle",circle:"Draw a circle",marker:"Draw a marker"}},handlers:{circle:{tooltip:{start:"Click and drag to draw circle."}},marker:{tooltip:{start:"Click map to place marker."}},polygon:{tooltip:{start:"Click to start drawing shape.",cont:"Click to continue drawing shape.",end:"Click first point to close this shape."}},polyline:{error:"<strong>Error:</strong> shape edges cannot cross!",tooltip:{start:"Click to start drawing line.",cont:"Click to continue drawing line.",end:"Click last point to finish line."}},rectangle:{tooltip:{start:"Click and drag to draw rectangle."}},simpleshape:{tooltip:{end:"Release mouse to finish drawing."}}}},edit:{toolbar:{actions:{save:{title:"Save changes.",text:"Save"},cancel:{title:"Cancel editing, discards all changes.",text:"Cancel"}},buttons:{edit:"Edit layers.",editDisabled:"No layers to edit.",remove:"Delete layers.",removeDisabled:"No layers to delete."}},handlers:{edit:{tooltip:{text:"Drag handles, or marker to edit feature.",subtext:"Click cancel to undo changes."}},remove:{tooltip:{text:"Click on a feature to remove"}}}}},L.Draw={},L.Draw.Feature=L.Handler.extend({includes:L.Mixin.Events,initialize:function(t,e){this._map=t,this._container=t._container,this._overlayPane=t._panes.overlayPane,this._popupPane=t._panes.popupPane,e&&e.shapeOptions&&(e.shapeOptions=L.Util.extend({},this.options.shapeOptions,e.shapeOptions)),L.Util.extend(this.options,e)},enable:function(){this._enabled||(L.Handler.prototype.enable.call(this),this.fire("enabled",{handler:this.type}),this._map.fire("draw:drawstart",{layerType:this.type}))},disable:function(){this._enabled&&(L.Handler.prototype.disable.call(this),this.fire("disabled",{handler:this.type}),this._map.fire("draw:drawstop",{layerType:this.type}))},addHooks:function(){this._map&&(L.DomUtil.disableTextSelection(),this._tooltip=new L.Tooltip(this._map),L.DomEvent.addListener(this._container,"keyup",this._cancelDrawing,this))},removeHooks:function(){this._map&&(L.DomUtil.enableTextSelection(),this._tooltip.dispose(),this._tooltip=null,L.DomEvent.removeListener(this._container,"keyup",this._cancelDrawing))},setOptions:function(t){L.setOptions(this,t)},_fireCreatedEvent:function(t){this._map.fire("draw:created",{layer:t,layerType:this.type})},_cancelDrawing:function(t){27===t.keyCode&&this.disable()}}),L.Draw.Polyline=L.Draw.Feature.extend({statics:{TYPE:"polyline"},Poly:L.Polyline,options:{allowIntersection:!0,repeatMode:!1,drawError:{color:"#b00b00",timeout:2500},icon:new L.DivIcon({iconSize:new L.Point(8,8),className:"leaflet-div-icon leaflet-editing-icon"}),guidelineDistance:20,shapeOptions:{stroke:!0,color:"#f06eaa",weight:4,opacity:.5,fill:!1,clickable:!0},metric:!0,showLength:!0,zIndexOffset:2e3},initialize:function(t,e){this.options.drawError.message=L.drawLocal.draw.handlers.polyline.error,e&&e.drawError&&(e.drawError=L.Util.extend({},this.options.drawError,e.drawError)),this.type=L.Draw.Polyline.TYPE,L.Draw.Feature.prototype.initialize.call(this,t,e)},addHooks:function(){L.Draw.Feature.prototype.addHooks.call(this),this._map&&(this._markers=[],this._markerGroup=new L.LayerGroup,this._map.addLayer(this._markerGroup),this._poly=new L.Polyline([],this.options.shapeOptions),this._tooltip.updateContent(this._getTooltipText()),this._mouseMarker||(this._mouseMarker=L.marker(this._map.getCenter(),{icon:L.divIcon({className:"leaflet-mouse-marker",iconAnchor:[20,20],iconSize:[40,40]}),opacity:0,zIndexOffset:this.options.zIndexOffset})),this._mouseMarker.on("click",this._onClick,this).addTo(this._map),this._map.on("mousemove",this._onMouseMove,this).on("zoomend",this._onZoomEnd,this))},removeHooks:function(){L.Draw.Feature.prototype.removeHooks.call(this),this._clearHideErrorTimeout(),this._cleanUpShape(),this._map.removeLayer(this._markerGroup),delete this._markerGroup,delete this._markers,this._map.removeLayer(this._poly),delete this._poly,this._mouseMarker.off("click",this._onClick,this),this._map.removeLayer(this._mouseMarker),delete this._mouseMarker,this._clearGuides(),this._map.off("mousemove",this._onMouseMove,this).off("zoomend",this._onZoomEnd,this)},_finishShape:function(){var t=this._poly.newLatLngIntersects(this._poly.getLatLngs()[0],!0);return!this.options.allowIntersection&&t||!this._shapeIsValid()?(this._showErrorTooltip(),undefined):(this._fireCreatedEvent(),this.disable(),this.options.repeatMode&&this.enable(),undefined)},_shapeIsValid:function(){return!0},_onZoomEnd:function(){this._updateGuide()},_onMouseMove:function(t){var e=t.layerPoint,i=t.latlng;this._currentLatLng=i,this._updateTooltip(i),this._updateGuide(e),this._mouseMarker.setLatLng(i),L.DomEvent.preventDefault(t.originalEvent)},_onClick:function(t){var e=t.target.getLatLng(),i=this._markers.length;return i>0&&!this.options.allowIntersection&&this._poly.newLatLngIntersects(e)?(this._showErrorTooltip(),undefined):(this._errorShown&&this._hideErrorTooltip(),this._markers.push(this._createMarker(e)),this._poly.addLatLng(e),2===this._poly.getLatLngs().length&&this._map.addLayer(this._poly),this._updateFinishHandler(),this._vertexAdded(e),this._clearGuides(),this._updateTooltip(),undefined)},_updateFinishHandler:function(){var t=this._markers.length;t>1&&this._markers[t-1].on("click",this._finishShape,this),t>2&&this._markers[t-2].off("click",this._finishShape,this)},_createMarker:function(t){var e=new L.Marker(t,{icon:this.options.icon,zIndexOffset:2*this.options.zIndexOffset});return this._markerGroup.addLayer(e),e},_updateGuide:function(t){var e=this._markers.length;e>0&&(t=t||this._map.latLngToLayerPoint(this._currentLatLng),this._clearGuides(),this._drawGuide(this._map.latLngToLayerPoint(this._markers[e-1].getLatLng()),t))},_updateTooltip:function(t){var e=this._getTooltipText();t&&this._tooltip.updatePosition(t),this._errorShown||this._tooltip.updateContent(e)},_drawGuide:function(t,e){var i,o,a,s,r=Math.floor(Math.sqrt(Math.pow(e.x-t.x,2)+Math.pow(e.y-t.y,2)));for(this._guidesContainer||(this._guidesContainer=L.DomUtil.create("div","leaflet-draw-guides",this._overlayPane)),i=this.options.guidelineDistance;r>i;i+=this.options.guidelineDistance)o=i/r,a={x:Math.floor(t.x*(1-o)+o*e.x),y:Math.floor(t.y*(1-o)+o*e.y)},s=L.DomUtil.create("div","leaflet-draw-guide-dash",this._guidesContainer),s.style.backgroundColor=this._errorShown?this.options.drawError.color:this.options.shapeOptions.color,L.DomUtil.setPosition(s,a)},_updateGuideColor:function(t){if(this._guidesContainer)for(var e=0,i=this._guidesContainer.childNodes.length;i>e;e++)this._guidesContainer.childNodes[e].style.backgroundColor=t},_clearGuides:function(){if(this._guidesContainer)for(;this._guidesContainer.firstChild;)this._guidesContainer.removeChild(this._guidesContainer.firstChild)},_getTooltipText:function(){var t,e,i=this.options.showLength;return 0===this._markers.length?t={text:L.drawLocal.draw.handlers.polyline.tooltip.start}:(e=i?this._getMeasurementString():"",t=1===this._markers.length?{text:L.drawLocal.draw.handlers.polyline.tooltip.cont,subtext:e}:{text:L.drawLocal.draw.handlers.polyline.tooltip.end,subtext:e}),t},_getMeasurementString:function(){var t,e=this._currentLatLng,i=this._markers[this._markers.length-1].getLatLng();return t=this._measurementRunningTotal+e.distanceTo(i),L.GeometryUtil.readableDistance(t,this.options.metric)},_showErrorTooltip:function(){this._errorShown=!0,this._tooltip.showAsError().updateContent({text:this.options.drawError.message}),this._updateGuideColor(this.options.drawError.color),this._poly.setStyle({color:this.options.drawError.color}),this._clearHideErrorTimeout(),this._hideErrorTimeout=setTimeout(L.Util.bind(this._hideErrorTooltip,this),this.options.drawError.timeout)},_hideErrorTooltip:function(){this._errorShown=!1,this._clearHideErrorTimeout(),this._tooltip.removeError().updateContent(this._getTooltipText()),this._updateGuideColor(this.options.shapeOptions.color),this._poly.setStyle({color:this.options.shapeOptions.color})},_clearHideErrorTimeout:function(){this._hideErrorTimeout&&(clearTimeout(this._hideErrorTimeout),this._hideErrorTimeout=null)},_vertexAdded:function(t){1===this._markers.length?this._measurementRunningTotal=0:this._measurementRunningTotal+=t.distanceTo(this._markers[this._markers.length-2].getLatLng())},_cleanUpShape:function(){this._markers.length>1&&this._markers[this._markers.length-1].off("click",this._finishShape,this)},_fireCreatedEvent:function(){var t=new this.Poly(this._poly.getLatLngs(),this.options.shapeOptions);L.Draw.Feature.prototype._fireCreatedEvent.call(this,t)}}),L.Draw.Polygon=L.Draw.Polyline.extend({statics:{TYPE:"polygon"},Poly:L.Polygon,options:{showArea:!1,shapeOptions:{stroke:!0,color:"#f06eaa",weight:4,opacity:.5,fill:!0,fillColor:null,fillOpacity:.2,clickable:!0}},initialize:function(t,e){L.Draw.Polyline.prototype.initialize.call(this,t,e),this.type=L.Draw.Polygon.TYPE},_updateFinishHandler:function(){var t=this._markers.length;1===t&&this._markers[0].on("click",this._finishShape,this),t>2&&(this._markers[t-1].on("dblclick",this._finishShape,this),t>3&&this._markers[t-2].off("dblclick",this._finishShape,this))},_getTooltipText:function(){var t,e;return 0===this._markers.length?t=L.drawLocal.draw.handlers.polygon.tooltip.start:3>this._markers.length?t=L.drawLocal.draw.handlers.polygon.tooltip.cont:(t=L.drawLocal.draw.handlers.polygon.tooltip.end,e=this._getMeasurementString()),{text:t,subtext:e}},_getMeasurementString:function(){var t=this._area;return t?L.GeometryUtil.readableArea(t,this.options.metric):null},_shapeIsValid:function(){return this._markers.length>=3},_vertexAdded:function(){if(!this.options.allowIntersection&&this.options.showArea){var t=this._poly.getLatLngs();this._area=L.GeometryUtil.geodesicArea(t)}},_cleanUpShape:function(){var t=this._markers.length;t>0&&(this._markers[0].off("click",this._finishShape,this),t>2&&this._markers[t-1].off("dblclick",this._finishShape,this))}}),L.SimpleShape={},L.Draw.SimpleShape=L.Draw.Feature.extend({options:{repeatMode:!1},initialize:function(t,e){this._endLabelText=L.drawLocal.draw.handlers.simpleshape.tooltip.end,L.Draw.Feature.prototype.initialize.call(this,t,e)},addHooks:function(){L.Draw.Feature.prototype.addHooks.call(this),this._map&&(this._map.dragging.disable(),this._container.style.cursor="crosshair",this._tooltip.updateContent({text:this._initialLabelText}),this._map.on("mousedown",this._onMouseDown,this).on("mousemove",this._onMouseMove,this))},removeHooks:function(){L.Draw.Feature.prototype.removeHooks.call(this),this._map&&(this._map.dragging.enable(),this._container.style.cursor="",this._map.off("mousedown",this._onMouseDown,this).off("mousemove",this._onMouseMove,this),L.DomEvent.off(e,"mouseup",this._onMouseUp),this._shape&&(this._map.removeLayer(this._shape),delete this._shape)),this._isDrawing=!1},_onMouseDown:function(t){this._isDrawing=!0,this._startLatLng=t.latlng,L.DomEvent.on(e,"mouseup",this._onMouseUp,this).preventDefault(t.originalEvent)},_onMouseMove:function(t){var e=t.latlng;this._tooltip.updatePosition(e),this._isDrawing&&(this._tooltip.updateContent({text:this._endLabelText}),this._drawShape(e))},_onMouseUp:function(){this._shape&&this._fireCreatedEvent(),this.disable(),this.options.repeatMode&&this.enable()}}),L.Draw.Rectangle=L.Draw.SimpleShape.extend({statics:{TYPE:"rectangle"},options:{shapeOptions:{stroke:!0,color:"#f06eaa",weight:4,opacity:.5,fill:!0,fillColor:null,fillOpacity:.2,clickable:!0}},initialize:function(t,e){this.type=L.Draw.Rectangle.TYPE,this._initialLabelText=L.drawLocal.draw.handlers.rectangle.tooltip.start,L.Draw.SimpleShape.prototype.initialize.call(this,t,e)},_drawShape:function(t){this._shape?this._shape.setBounds(new L.LatLngBounds(this._startLatLng,t)):(this._shape=new L.Rectangle(new L.LatLngBounds(this._startLatLng,t),this.options.shapeOptions),this._map.addLayer(this._shape))},_fireCreatedEvent:function(){var t=new L.Rectangle(this._shape.getBounds(),this.options.shapeOptions);L.Draw.SimpleShape.prototype._fireCreatedEvent.call(this,t)}}),L.Draw.Circle=L.Draw.SimpleShape.extend({statics:{TYPE:"circle"},options:{shapeOptions:{stroke:!0,color:"#f06eaa",weight:4,opacity:.5,fill:!0,fillColor:null,fillOpacity:.2,clickable:!0},showRadius:!0,metric:!0},initialize:function(t,e){this.type=L.Draw.Circle.TYPE,this._initialLabelText=L.drawLocal.draw.handlers.circle.tooltip.start,L.Draw.SimpleShape.prototype.initialize.call(this,t,e)},_drawShape:function(t){this._shape?this._shape.setRadius(this._startLatLng.distanceTo(t)):(this._shape=new L.Circle(this._startLatLng,this._startLatLng.distanceTo(t),this.options.shapeOptions),this._map.addLayer(this._shape))},_fireCreatedEvent:function(){var t=new L.Circle(this._startLatLng,this._shape.getRadius(),this.options.shapeOptions);L.Draw.SimpleShape.prototype._fireCreatedEvent.call(this,t)},_onMouseMove:function(t){var e,i=t.latlng,o=(this.options.metric,this.options.showRadius),a=this.options.metric;this._tooltip.updatePosition(i),this._isDrawing&&(this._drawShape(i),e=this._shape.getRadius().toFixed(1),this._tooltip.updateContent({text:this._endLabelText,subtext:o?"Radius: "+L.GeometryUtil.readableDistance(e,a):""}))}}),L.Draw.Marker=L.Draw.Feature.extend({statics:{TYPE:"marker"},options:{icon:new L.Icon.Default,repeatMode:!1,zIndexOffset:2e3},initialize:function(t,e){this.type=L.Draw.Marker.TYPE,L.Draw.Feature.prototype.initialize.call(this,t,e)},addHooks:function(){L.Draw.Feature.prototype.addHooks.call(this),this._map&&(this._tooltip.updateContent({text:L.drawLocal.draw.handlers.marker.tooltip.start}),this._mouseMarker||(this._mouseMarker=L.marker(this._map.getCenter(),{icon:L.divIcon({className:"leaflet-mouse-marker",iconAnchor:[20,20],iconSize:[40,40]}),opacity:0,zIndexOffset:this.options.zIndexOffset})),this._mouseMarker.on("click",this._onClick,this).addTo(this._map),this._map.on("mousemove",this._onMouseMove,this))},removeHooks:function(){L.Draw.Feature.prototype.removeHooks.call(this),this._map&&(this._marker&&(this._marker.off("click",this._onClick,this),this._map.off("click",this._onClick,this).removeLayer(this._marker),delete this._marker),this._mouseMarker.off("click",this._onClick,this),this._map.removeLayer(this._mouseMarker),delete this._mouseMarker,this._map.off("mousemove",this._onMouseMove,this))},_onMouseMove:function(t){var e=t.latlng;this._tooltip.updatePosition(e),this._mouseMarker.setLatLng(e),this._marker?this._marker.setLatLng(e):(this._marker=new L.Marker(e,{icon:this.options.icon,zIndexOffset:this.options.zIndexOffset}),this._marker.on("click",this._onClick,this),this._map.on("click",this._onClick,this).addLayer(this._marker))},_onClick:function(){this._fireCreatedEvent(),this.disable(),this.options.repeatMode&&this.enable()},_fireCreatedEvent:function(){var t=new L.Marker(this._marker.getLatLng(),{icon:this.options.icon});L.Draw.Feature.prototype._fireCreatedEvent.call(this,t)}}),L.Edit=L.Edit||{},L.Edit.Poly=L.Handler.extend({options:{icon:new L.DivIcon({iconSize:new L.Point(8,8),className:"leaflet-div-icon leaflet-editing-icon"})},initialize:function(t,e){this._poly=t,L.setOptions(this,e)},addHooks:function(){this._poly._map&&(this._markerGroup||this._initMarkers(),this._poly._map.addLayer(this._markerGroup))},removeHooks:function(){this._poly._map&&(this._poly._map.removeLayer(this._markerGroup),delete this._markerGroup,delete this._markers)},updateMarkers:function(){this._markerGroup.clearLayers(),this._initMarkers()},_initMarkers:function(){this._markerGroup||(this._markerGroup=new L.LayerGroup),this._markers=[];var t,e,i,o,a=this._poly._latlngs;for(t=0,i=a.length;i>t;t++)o=this._createMarker(a[t],t),o.on("click",this._onMarkerClick,this),this._markers.push(o);var s,r;for(t=0,e=i-1;i>t;e=t++)(0!==t||L.Polygon&&this._poly instanceof L.Polygon)&&(s=this._markers[e],r=this._markers[t],this._createMiddleMarker(s,r),this._updatePrevNext(s,r))},_createMarker:function(t,e){var i=new L.Marker(t,{draggable:!0,icon:this.options.icon});return i._origLatLng=t,i._index=e,i.on("drag",this._onMarkerDrag,this),i.on("dragend",this._fireEdit,this),this._markerGroup.addLayer(i),i},_removeMarker:function(t){var e=t._index;this._markerGroup.removeLayer(t),this._markers.splice(e,1),this._poly.spliceLatLngs(e,1),this._updateIndexes(e,-1),t.off("drag",this._onMarkerDrag,this).off("dragend",this._fireEdit,this).off("click",this._onMarkerClick,this)},_fireEdit:function(){this._poly.edited=!0,this._poly.fire("edit")},_onMarkerDrag:function(t){var e=t.target;L.extend(e._origLatLng,e._latlng),e._middleLeft&&e._middleLeft.setLatLng(this._getMiddleLatLng(e._prev,e)),e._middleRight&&e._middleRight.setLatLng(this._getMiddleLatLng(e,e._next)),this._poly.redraw()},_onMarkerClick:function(t){if(!(3>this._poly._latlngs.length)){var e=t.target;this._removeMarker(e),this._updatePrevNext(e._prev,e._next),e._middleLeft&&this._markerGroup.removeLayer(e._middleLeft),e._middleRight&&this._markerGroup.removeLayer(e._middleRight),e._prev&&e._next?this._createMiddleMarker(e._prev,e._next):e._prev?e._next||(e._prev._middleRight=null):e._next._middleLeft=null,this._fireEdit()}},_updateIndexes:function(t,e){this._markerGroup.eachLayer(function(i){i._index>t&&(i._index+=e)})},_createMiddleMarker:function(t,e){var i,o,a,s=this._getMiddleLatLng(t,e),r=this._createMarker(s);r.setOpacity(.6),t._middleRight=e._middleLeft=r,o=function(){var o=e._index;r._index=o,r.off("click",i,this).on("click",this._onMarkerClick,this),s.lat=r.getLatLng().lat,s.lng=r.getLatLng().lng,this._poly.spliceLatLngs(o,0,s),this._markers.splice(o,0,r),r.setOpacity(1),this._updateIndexes(o,1),e._index++,this._updatePrevNext(t,r),this._updatePrevNext(r,e)},a=function(){r.off("dragstart",o,this),r.off("dragend",a,this),this._createMiddleMarker(t,r),this._createMiddleMarker(r,e)},i=function(){o.call(this),a.call(this),this._fireEdit()},r.on("click",i,this).on("dragstart",o,this).on("dragend",a,this),this._markerGroup.addLayer(r)},_updatePrevNext:function(t,e){t&&(t._next=e),e&&(e._prev=t)},_getMiddleLatLng:function(t,e){var i=this._poly._map,o=i.latLngToLayerPoint(t.getLatLng()),a=i.latLngToLayerPoint(e.getLatLng());return i.layerPointToLatLng(o._add(a)._divideBy(2))}}),L.Polyline.addInitHook(function(){this.editing||(L.Edit.Poly&&(this.editing=new L.Edit.Poly(this),this.options.editable&&this.editing.enable()),this.on("add",function(){this.editing&&this.editing.enabled()&&this.editing.addHooks()}),this.on("remove",function(){this.editing&&this.editing.enabled()&&this.editing.removeHooks()}))}),L.Edit=L.Edit||{},L.Edit.SimpleShape=L.Handler.extend({options:{moveIcon:new L.DivIcon({iconSize:new L.Point(8,8),className:"leaflet-div-icon leaflet-editing-icon leaflet-edit-move"}),resizeIcon:new L.DivIcon({iconSize:new L.Point(8,8),className:"leaflet-div-icon leaflet-editing-icon leaflet-edit-resize"})},initialize:function(t,e){this._shape=t,L.Util.setOptions(this,e)},addHooks:function(){this._shape._map&&(this._map=this._shape._map,this._markerGroup||this._initMarkers(),this._map.addLayer(this._markerGroup))},removeHooks:function(){if(this._shape._map){this._unbindMarker(this._moveMarker);for(var t=0,e=this._resizeMarkers.length;e>t;t++)this._unbindMarker(this._resizeMarkers[t]);this._resizeMarkers=null,this._map.removeLayer(this._markerGroup),delete this._markerGroup}this._map=null},updateMarkers:function(){this._markerGroup.clearLayers(),this._initMarkers()},_initMarkers:function(){this._markerGroup||(this._markerGroup=new L.LayerGroup),this._createMoveMarker(),this._createResizeMarker()},_createMoveMarker:function(){},_createResizeMarker:function(){},_createMarker:function(t,e){var i=new L.Marker(t,{draggable:!0,icon:e,zIndexOffset:10});return this._bindMarker(i),this._markerGroup.addLayer(i),i},_bindMarker:function(t){t.on("dragstart",this._onMarkerDragStart,this).on("drag",this._onMarkerDrag,this).on("dragend",this._onMarkerDragEnd,this)},_unbindMarker:function(t){t.off("dragstart",this._onMarkerDragStart,this).off("drag",this._onMarkerDrag,this).off("dragend",this._onMarkerDragEnd,this)},_onMarkerDragStart:function(t){var e=t.target;e.setOpacity(0)},_fireEdit:function(){this._shape.edited=!0,this._shape.fire("edit")},_onMarkerDrag:function(t){var e=t.target,i=e.getLatLng();e===this._moveMarker?this._move(i):this._resize(i),this._shape.redraw()},_onMarkerDragEnd:function(t){var e=t.target;e.setOpacity(1),this._fireEdit()},_move:function(){},_resize:function(){}}),L.Edit=L.Edit||{},L.Edit.Rectangle=L.Edit.SimpleShape.extend({_createMoveMarker:function(){var t=this._shape.getBounds(),e=t.getCenter();this._moveMarker=this._createMarker(e,this.options.moveIcon)},_createResizeMarker:function(){var t=this._getCorners();this._resizeMarkers=[];for(var e=0,i=t.length;i>e;e++)this._resizeMarkers.push(this._createMarker(t[e],this.options.resizeIcon)),this._resizeMarkers[e]._cornerIndex=e},_onMarkerDragStart:function(t){L.Edit.SimpleShape.prototype._onMarkerDragStart.call(this,t);var e=this._getCorners(),i=t.target,o=i._cornerIndex;this._oppositeCorner=e[(o+2)%4],this._toggleCornerMarkers(0,o)},_onMarkerDragEnd:function(t){var e,i,o=t.target;o===this._moveMarker&&(e=this._shape.getBounds(),i=e.getCenter(),o.setLatLng(i)),this._toggleCornerMarkers(1),this._repositionCornerMarkers(),L.Edit.SimpleShape.prototype._onMarkerDragEnd.call(this,t)},_move:function(t){for(var e,i=this._shape.getLatLngs(),o=this._shape.getBounds(),a=o.getCenter(),s=[],r=0,n=i.length;n>r;r++)e=[i[r].lat-a.lat,i[r].lng-a.lng],s.push([t.lat+e[0],t.lng+e[1]]);this._shape.setLatLngs(s),this._repositionCornerMarkers()},_resize:function(t){var e;this._shape.setBounds(L.latLngBounds(t,this._oppositeCorner)),e=this._shape.getBounds(),this._moveMarker.setLatLng(e.getCenter())},_getCorners:function(){var t=this._shape.getBounds(),e=t.getNorthWest(),i=t.getNorthEast(),o=t.getSouthEast(),a=t.getSouthWest();return[e,i,o,a]},_toggleCornerMarkers:function(t){for(var e=0,i=this._resizeMarkers.length;i>e;e++)this._resizeMarkers[e].setOpacity(t)},_repositionCornerMarkers:function(){for(var t=this._getCorners(),e=0,i=this._resizeMarkers.length;i>e;e++)this._resizeMarkers[e].setLatLng(t[e])}}),L.Rectangle.addInitHook(function(){L.Edit.Rectangle&&(this.editing=new L.Edit.Rectangle(this),this.options.editable&&this.editing.enable())}),L.Edit=L.Edit||{},L.Edit.Circle=L.Edit.SimpleShape.extend({_createMoveMarker:function(){var t=this._shape.getLatLng();this._moveMarker=this._createMarker(t,this.options.moveIcon)},_createResizeMarker:function(){var t=this._shape.getLatLng(),e=this._getResizeMarkerPoint(t);this._resizeMarkers=[],this._resizeMarkers.push(this._createMarker(e,this.options.resizeIcon))},_getResizeMarkerPoint:function(t){var e=this._shape._radius*Math.cos(Math.PI/4),i=this._map.project(t);return this._map.unproject([i.x+e,i.y-e])},_move:function(t){var e=this._getResizeMarkerPoint(t);this._resizeMarkers[0].setLatLng(e),this._shape.setLatLng(t)},_resize:function(t){var e=this._moveMarker.getLatLng(),i=e.distanceTo(t);this._shape.setRadius(i)}}),L.Circle.addInitHook(function(){L.Edit.Circle&&(this.editing=new L.Edit.Circle(this),this.options.editable&&this.editing.enable()),this.on("add",function(){this.editing&&this.editing.enabled()&&this.editing.addHooks()}),this.on("remove",function(){this.editing&&this.editing.enabled()&&this.editing.removeHooks()})}),L.LatLngUtil={cloneLatLngs:function(t){for(var e=[],i=0,o=t.length;o>i;i++)e.push(this.cloneLatLng(t[i]));return e},cloneLatLng:function(t){return L.latLng(t.lat,t.lng)}},L.GeometryUtil={geodesicArea:function(t){var e,i,o=t.length,a=0,s=L.LatLng.DEG_TO_RAD;if(o>2){for(var r=0;o>r;r++)e=t[r],i=t[(r+1)%o],a+=(i.lng-e.lng)*s*(2+Math.sin(e.lat*s)+Math.sin(i.lat*s));a=6378137*6378137*a/2}return Math.abs(a)},readableArea:function(t,e){var i;return e?i=t>=1e4?(1e-4*t).toFixed(2)+" ha":t.toFixed(2)+" m&sup2;":(t*=.836127,i=t>=3097600?(t/3097600).toFixed(2)+" mi&sup2;":t>=4840?(t/4840).toFixed(2)+" acres":Math.ceil(t)+" yd&sup2;"),i},readableDistance:function(t,e){var i;return e?i=t>1e3?(t/1e3).toFixed(2)+" km":Math.ceil(t)+" m":(t*=1.09361,i=t>1760?(t/1760).toFixed(2)+" miles":Math.ceil(t)+" yd"),i}},L.Util.extend(L.LineUtil,{segmentsIntersect:function(t,e,i,o){return this._checkCounterclockwise(t,i,o)!==this._checkCounterclockwise(e,i,o)&&this._checkCounterclockwise(t,e,i)!==this._checkCounterclockwise(t,e,o)},_checkCounterclockwise:function(t,e,i){return(i.y-t.y)*(e.x-t.x)>(e.y-t.y)*(i.x-t.x)}}),L.Polyline.include({intersects:function(){var t,e,i,o=this._originalPoints,a=o?o.length:0;if(this._tooFewPointsForIntersection())return!1;for(t=a-1;t>=3;t--)if(e=o[t-1],i=o[t],this._lineSegmentsIntersectsRange(e,i,t-2))return!0;return!1},newLatLngIntersects:function(t,e){return this._map?this.newPointIntersects(this._map.latLngToLayerPoint(t),e):!1},newPointIntersects:function(t,e){var i=this._originalPoints,o=i?i.length:0,a=i?i[o-1]:null,s=o-2;return this._tooFewPointsForIntersection(1)?!1:this._lineSegmentsIntersectsRange(a,t,s,e?1:0)},_tooFewPointsForIntersection:function(t){var e=this._originalPoints,i=e?e.length:0;return i+=t||0,!this._originalPoints||3>=i},_lineSegmentsIntersectsRange:function(t,e,i,o){var a,s,r=this._originalPoints;o=o||0;for(var n=i;n>o;n--)if(a=r[n-1],s=r[n],L.LineUtil.segmentsIntersect(t,e,a,s))return!0;return!1}}),L.Polygon.include({intersects:function(){var t,e,i,o,a,s=this._originalPoints;return this._tooFewPointsForIntersection()?!1:(t=L.Polyline.prototype.intersects.call(this))?!0:(e=s.length,i=s[0],o=s[e-1],a=e-2,this._lineSegmentsIntersectsRange(o,i,a,1))}}),L.Control.Draw=L.Control.extend({options:{position:"topleft",draw:{},edit:!1},initialize:function(t){if("0.5.1">=L.version)throw Error("Leaflet.draw 0.2.0+ requires Leaflet 0.6.0+. Download latest from https://github.com/Leaflet/Leaflet/");L.Control.prototype.initialize.call(this,t);var e,i;this._toolbars={},L.DrawToolbar&&this.options.draw&&(i=new L.DrawToolbar(this.options.draw),e=L.stamp(i),this._toolbars[e]=i,this._toolbars[e].on("enable",this._toolbarEnabled,this)),L.EditToolbar&&this.options.edit&&(i=new L.EditToolbar(this.options.edit),e=L.stamp(i),this._toolbars[e]=i,this._toolbars[e].on("enable",this._toolbarEnabled,this))},onAdd:function(t){var e,i=L.DomUtil.create("div","leaflet-draw"),o=!1,a="leaflet-draw-toolbar-top";for(var s in this._toolbars)this._toolbars.hasOwnProperty(s)&&(e=this._toolbars[s].addToolbar(t),o||(L.DomUtil.hasClass(e,a)||L.DomUtil.addClass(e.childNodes[0],a),o=!0),i.appendChild(e));return i},onRemove:function(){for(var t in this._toolbars)this._toolbars.hasOwnProperty(t)&&this._toolbars[t].removeToolbar()},setDrawingOptions:function(t){for(var e in this._toolbars)this._toolbars[e]instanceof L.DrawToolbar&&this._toolbars[e].setOptions(t)},_toolbarEnabled:function(t){var e=""+L.stamp(t.target);for(var i in this._toolbars)this._toolbars.hasOwnProperty(i)&&i!==e&&this._toolbars[i].disable()}}),L.Map.mergeOptions({drawControlTooltips:!0,drawControl:!1}),L.Map.addInitHook(function(){this.options.drawControl&&(this.drawControl=new L.Control.Draw,this.addControl(this.drawControl))}),L.Toolbar=L.Class.extend({includes:[L.Mixin.Events],initialize:function(t){L.setOptions(this,t),this._modes={},this._actionButtons=[],this._activeMode=null},enabled:function(){return null!==this._activeMode},disable:function(){this.enabled()&&this._activeMode.handler.disable()},removeToolbar:function(){for(var t in this._modes)this._modes.hasOwnProperty(t)&&(this._disposeButton(this._modes[t].button,this._modes[t].handler.enable),this._modes[t].handler.disable(),this._modes[t].handler.off("enabled",this._handlerActivated,this).off("disabled",this._handlerDeactivated,this));this._modes={};for(var e=0,i=this._actionButtons.length;i>e;e++)this._disposeButton(this._actionButtons[e].button,this._actionButtons[e].callback);this._actionButtons=[],this._actionsContainer=null},_initModeHandler:function(t,e,i,o,a){var s=t.type;this._modes[s]={},this._modes[s].handler=t,this._modes[s].button=this._createButton({title:a,className:o+"-"+s,container:e,callback:this._modes[s].handler.enable,context:this._modes[s].handler}),this._modes[s].buttonIndex=i,this._modes[s].handler.on("enabled",this._handlerActivated,this).on("disabled",this._handlerDeactivated,this)},_createButton:function(t){var e=L.DomUtil.create("a",t.className||"",t.container);return e.href="#",t.text&&(e.innerHTML=t.text),t.title&&(e.title=t.title),L.DomEvent.on(e,"click",L.DomEvent.stopPropagation).on(e,"mousedown",L.DomEvent.stopPropagation).on(e,"dblclick",L.DomEvent.stopPropagation).on(e,"click",L.DomEvent.preventDefault).on(e,"click",t.callback,t.context),e},_disposeButton:function(t,e){L.DomEvent.off(t,"click",L.DomEvent.stopPropagation).off(t,"mousedown",L.DomEvent.stopPropagation).off(t,"dblclick",L.DomEvent.stopPropagation).off(t,"click",L.DomEvent.preventDefault).off(t,"click",e)},_handlerActivated:function(t){this._activeMode&&this._activeMode.handler.enabled()&&this._activeMode.handler.disable(),this._activeMode=this._modes[t.handler],L.DomUtil.addClass(this._activeMode.button,"leaflet-draw-toolbar-button-enabled"),this._showActionsToolbar(),this.fire("enable")},_handlerDeactivated:function(){this._hideActionsToolbar(),L.DomUtil.removeClass(this._activeMode.button,"leaflet-draw-toolbar-button-enabled"),this._activeMode=null,this.fire("disable")},_createActions:function(t){for(var e,i,o=L.DomUtil.create("ul","leaflet-draw-actions"),a=t.length,s=0;a>s;s++)e=L.DomUtil.create("li","",o),i=this._createButton({title:t[s].title,text:t[s].text,container:e,callback:t[s].callback,context:t[s].context}),this._actionButtons.push({button:i,callback:t[s].callback});return o},_showActionsToolbar:function(){var t=this._activeMode.buttonIndex,e=this._lastButtonIndex,i=26,o=1,a=t*i+t*o-1;this._actionsContainer.style.top=a+"px",0===t&&(L.DomUtil.addClass(this._toolbarContainer,"leaflet-draw-toolbar-notop"),L.DomUtil.addClass(this._actionsContainer,"leaflet-draw-actions-top")),t===e&&(L.DomUtil.addClass(this._toolbarContainer,"leaflet-draw-toolbar-nobottom"),L.DomUtil.addClass(this._actionsContainer,"leaflet-draw-actions-bottom")),this._actionsContainer.style.display="block"},_hideActionsToolbar:function(){this._actionsContainer.style.display="none",L.DomUtil.removeClass(this._toolbarContainer,"leaflet-draw-toolbar-notop"),L.DomUtil.removeClass(this._toolbarContainer,"leaflet-draw-toolbar-nobottom"),L.DomUtil.removeClass(this._actionsContainer,"leaflet-draw-actions-top"),L.DomUtil.removeClass(this._actionsContainer,"leaflet-draw-actions-bottom")}}),L.Tooltip=L.Class.extend({initialize:function(t){this._map=t,this._popupPane=t._panes.popupPane,this._container=t.options.drawControlTooltips?L.DomUtil.create("div","leaflet-draw-tooltip",this._popupPane):null,this._singleLineLabel=!1},dispose:function(){this._container&&(this._popupPane.removeChild(this._container),this._container=null)},updateContent:function(t){return this._container?(t.subtext=t.subtext||"",0!==t.subtext.length||this._singleLineLabel?t.subtext.length>0&&this._singleLineLabel&&(L.DomUtil.removeClass(this._container,"leaflet-draw-tooltip-single"),this._singleLineLabel=!1):(L.DomUtil.addClass(this._container,"leaflet-draw-tooltip-single"),this._singleLineLabel=!0),this._container.innerHTML=(t.subtext.length>0?'<span class="leaflet-draw-tooltip-subtext">'+t.subtext+"</span>"+"<br />":"")+"<span>"+t.text+"</span>",this):this},updatePosition:function(t){var e=this._map.latLngToLayerPoint(t);return this._container&&L.DomUtil.setPosition(this._container,e),this},showAsError:function(){return this._container&&L.DomUtil.addClass(this._container,"leaflet-error-draw-tooltip"),this},removeError:function(){return this._container&&L.DomUtil.removeClass(this._container,"leaflet-error-draw-tooltip"),this}}),L.DrawToolbar=L.Toolbar.extend({options:{polyline:{},polygon:{},rectangle:{},circle:{},marker:{}},initialize:function(t){for(var e in this.options)this.options.hasOwnProperty(e)&&t[e]&&(t[e]=L.extend({},this.options[e],t[e]));
L.Toolbar.prototype.initialize.call(this,t)},addToolbar:function(t){var e=L.DomUtil.create("div","leaflet-draw-section"),i=0,o="leaflet-draw-draw";return this._toolbarContainer=L.DomUtil.create("div","leaflet-draw-toolbar leaflet-bar"),this.options.polyline&&this._initModeHandler(new L.Draw.Polyline(t,this.options.polyline),this._toolbarContainer,i++,o,L.drawLocal.draw.toolbar.buttons.polyline),this.options.polygon&&this._initModeHandler(new L.Draw.Polygon(t,this.options.polygon),this._toolbarContainer,i++,o,L.drawLocal.draw.toolbar.buttons.polygon),this.options.rectangle&&this._initModeHandler(new L.Draw.Rectangle(t,this.options.rectangle),this._toolbarContainer,i++,o,L.drawLocal.draw.toolbar.buttons.rectangle),this.options.circle&&this._initModeHandler(new L.Draw.Circle(t,this.options.circle),this._toolbarContainer,i++,o,L.drawLocal.draw.toolbar.buttons.circle),this.options.marker&&this._initModeHandler(new L.Draw.Marker(t,this.options.marker),this._toolbarContainer,i++,o,L.drawLocal.draw.toolbar.buttons.marker),this._lastButtonIndex=--i,this._actionsContainer=this._createActions([{title:L.drawLocal.draw.toolbar.actions.title,text:L.drawLocal.draw.toolbar.actions.text,callback:this.disable,context:this}]),e.appendChild(this._toolbarContainer),e.appendChild(this._actionsContainer),e},setOptions:function(t){L.setOptions(this,t);for(var e in this._modes)this._modes.hasOwnProperty(e)&&t.hasOwnProperty(e)&&this._modes[e].handler.setOptions(t[e])}}),L.EditToolbar=L.Toolbar.extend({options:{edit:{selectedPathOptions:{color:"#fe57a1",opacity:.6,dashArray:"10, 10",fill:!0,fillColor:"#fe57a1",fillOpacity:.1}},remove:{},featureGroup:null},initialize:function(t){t.edit&&(t.edit.selectedPathOptions===undefined&&(t.edit.selectedPathOptions=this.options.edit.selectedPathOptions),t.edit=L.extend({},this.options.edit,t.edit)),t.remove&&(t.remove=L.extend({},this.options.remove,t.remove)),L.Toolbar.prototype.initialize.call(this,t),this._selectedFeatureCount=0},addToolbar:function(t){var e=L.DomUtil.create("div","leaflet-draw-section"),i=0,o="leaflet-draw-edit",a=this.options.featureGroup;return this._toolbarContainer=L.DomUtil.create("div","leaflet-draw-toolbar leaflet-bar"),this._map=t,this.options.edit&&this._initModeHandler(new L.EditToolbar.Edit(t,{featureGroup:a,selectedPathOptions:this.options.edit.selectedPathOptions}),this._toolbarContainer,i++,o,L.drawLocal.edit.toolbar.buttons.edit),this.options.remove&&this._initModeHandler(new L.EditToolbar.Delete(t,{featureGroup:a}),this._toolbarContainer,i++,o,L.drawLocal.edit.toolbar.buttons.remove),this._lastButtonIndex=--i,this._actionsContainer=this._createActions([{title:L.drawLocal.edit.toolbar.actions.save.title,text:L.drawLocal.edit.toolbar.actions.save.text,callback:this._save,context:this},{title:L.drawLocal.edit.toolbar.actions.cancel.title,text:L.drawLocal.edit.toolbar.actions.cancel.text,callback:this.disable,context:this}]),e.appendChild(this._toolbarContainer),e.appendChild(this._actionsContainer),this._checkDisabled(),a.on("layeradd layerremove",this._checkDisabled,this),e},removeToolbar:function(){L.Toolbar.prototype.removeToolbar.call(this),this.options.featureGroup.off("layeradd layerremove",this._checkDisabled,this)},disable:function(){this.enabled()&&(this._activeMode.handler.revertLayers(),L.Toolbar.prototype.disable.call(this))},_save:function(){this._activeMode.handler.save(),this._activeMode.handler.disable()},_checkDisabled:function(){var t,e=this.options.featureGroup,i=0===e.getLayers().length;this.options.edit&&(t=this._modes[L.EditToolbar.Edit.TYPE].button,L.DomUtil.toggleClass(t,"leaflet-disabled"),t.setAttribute("title",i?L.drawLocal.edit.toolbar.buttons.edit:L.drawLocal.edit.toolbar.buttons.editDisabled)),this.options.remove&&(t=this._modes[L.EditToolbar.Delete.TYPE].button,L.DomUtil.toggleClass(t,"leaflet-disabled"),t.setAttribute("title",i?L.drawLocal.edit.toolbar.buttons.remove:L.drawLocal.edit.toolbar.buttons.removeDisabled))}}),L.DomUtil.toggleClass||L.Util.extend(L.DomUtil,{toggleClass:function(t,e){this.hasClass(t,e)?this.removeClass(t,e):this.addClass(t,e)}}),L.EditToolbar.Edit=L.Handler.extend({statics:{TYPE:"edit"},includes:L.Mixin.Events,initialize:function(t,e){if(L.Handler.prototype.initialize.call(this,t),this._selectedPathOptions=e.selectedPathOptions,this._featureGroup=e.featureGroup,!(this._featureGroup instanceof L.FeatureGroup))throw Error("options.featureGroup must be a L.FeatureGroup");this._uneditedLayerProps={},this.type=L.EditToolbar.Edit.TYPE},enable:function(){!this._enabled&&this._hasAvailableLayers()&&(L.Handler.prototype.enable.call(this),this._featureGroup.on("layeradd",this._enableLayerEdit,this).on("layerremove",this._disableLayerEdit,this),this.fire("enabled",{handler:this.type}),this._map.fire("draw:editstart",{handler:this.type}))},disable:function(){this._enabled&&(this.fire("disabled",{handler:this.type}),this._map.fire("draw:editstop",{handler:this.type}),this._featureGroup.off("layeradd",this._enableLayerEdit,this).off("layerremove",this._disableLayerEdit,this),L.Handler.prototype.disable.call(this))},addHooks:function(){this._map&&(this._featureGroup.eachLayer(this._enableLayerEdit,this),this._tooltip=new L.Tooltip(this._map),this._tooltip.updateContent({text:L.drawLocal.edit.handlers.edit.tooltip.text,subtext:L.drawLocal.edit.handlers.edit.tooltip.subtext}),this._map.on("mousemove",this._onMouseMove,this))},removeHooks:function(){this._map&&(this._featureGroup.eachLayer(this._disableLayerEdit,this),this._uneditedLayerProps={},this._tooltip.dispose(),this._tooltip=null,this._map.off("mousemove",this._onMouseMove,this))},revertLayers:function(){this._featureGroup.eachLayer(function(t){this._revertLayer(t)},this)},save:function(){var t=new L.LayerGroup;this._featureGroup.eachLayer(function(e){e.edited&&(t.addLayer(e),e.edited=!1)}),this._map.fire("draw:edited",{layers:t})},_backupLayer:function(t){var e=L.Util.stamp(t);this._uneditedLayerProps[e]||(this._uneditedLayerProps[e]=t instanceof L.Polyline||t instanceof L.Polygon||t instanceof L.Rectangle?{latlngs:L.LatLngUtil.cloneLatLngs(t.getLatLngs())}:t instanceof L.Circle?{latlng:L.LatLngUtil.cloneLatLng(t.getLatLng()),radius:t.getRadius()}:{latlng:L.LatLngUtil.cloneLatLng(t.getLatLng())})},_revertLayer:function(t){var e=L.Util.stamp(t);t.edited=!1,this._uneditedLayerProps.hasOwnProperty(e)&&(t instanceof L.Polyline||t instanceof L.Polygon||t instanceof L.Rectangle?t.setLatLngs(this._uneditedLayerProps[e].latlngs):t instanceof L.Circle?(t.setLatLng(this._uneditedLayerProps[e].latlng),t.setRadius(this._uneditedLayerProps[e].radius)):t.setLatLng(this._uneditedLayerProps[e].latlng))},_toggleMarkerHighlight:function(t){if(t._icon){var e=t._icon;e.style.display="none",L.DomUtil.hasClass(e,"leaflet-edit-marker-selected")?(L.DomUtil.removeClass(e,"leaflet-edit-marker-selected"),this._offsetMarker(e,-4)):(L.DomUtil.addClass(e,"leaflet-edit-marker-selected"),this._offsetMarker(e,4)),e.style.display=""}},_offsetMarker:function(t,e){var i=parseInt(t.style.marginTop,10)-e,o=parseInt(t.style.marginLeft,10)-e;t.style.marginTop=i+"px",t.style.marginLeft=o+"px"},_enableLayerEdit:function(t){var e,i=t.layer||t.target||t,o=i instanceof L.Marker;(!o||i._icon)&&(this._backupLayer(i),this._selectedPathOptions&&(e=L.Util.extend({},this._selectedPathOptions),o?this._toggleMarkerHighlight(i):(i.options.previousOptions=i.options,i instanceof L.Circle||i instanceof L.Polygon||i instanceof L.Rectangle||(e.fill=!1),i.setStyle(e))),o?(i.dragging.enable(),i.on("dragend",this._onMarkerDragEnd)):i.editing.enable())},_disableLayerEdit:function(t){var e=t.layer||t.target||t;e.edited=!1,this._selectedPathOptions&&(e instanceof L.Marker?this._toggleMarkerHighlight(e):(e.setStyle(e.options.previousOptions),delete e.options.previousOptions)),e instanceof L.Marker?(e.dragging.disable(),e.off("dragend",this._onMarkerDragEnd,this)):e.editing.disable()},_onMarkerDragEnd:function(t){var e=t.target;e.edited=!0},_onMouseMove:function(t){this._tooltip.updatePosition(t.latlng)},_hasAvailableLayers:function(){return 0!==this._featureGroup.getLayers().length}}),L.EditToolbar.Delete=L.Handler.extend({statics:{TYPE:"remove"},includes:L.Mixin.Events,initialize:function(t,e){if(L.Handler.prototype.initialize.call(this,t),L.Util.setOptions(this,e),this._deletableLayers=this.options.featureGroup,!(this._deletableLayers instanceof L.FeatureGroup))throw Error("options.featureGroup must be a L.FeatureGroup");this.type=L.EditToolbar.Delete.TYPE},enable:function(){!this._enabled&&this._hasAvailableLayers()&&(L.Handler.prototype.enable.call(this),this._deletableLayers.on("layeradd",this._enableLayerDelete,this).on("layerremove",this._disableLayerDelete,this),this.fire("enabled",{handler:this.type}),this._map.fire("draw:editstart",{handler:this.type}))},disable:function(){this._enabled&&(L.Handler.prototype.disable.call(this),this._deletableLayers.off("layeradd",this._enableLayerDelete,this).off("layerremove",this._disableLayerDelete,this),this.fire("disabled",{handler:this.type}),this._map.fire("draw:editstop",{handler:this.type}))},addHooks:function(){this._map&&(this._deletableLayers.eachLayer(this._enableLayerDelete,this),this._deletedLayers=new L.layerGroup,this._tooltip=new L.Tooltip(this._map),this._tooltip.updateContent({text:L.drawLocal.edit.handlers.remove.tooltip.text}),this._map.on("mousemove",this._onMouseMove,this))},removeHooks:function(){this._map&&(this._deletableLayers.eachLayer(this._disableLayerDelete,this),this._deletedLayers=null,this._tooltip.dispose(),this._tooltip=null,this._map.off("mousemove",this._onMouseMove,this))},revertLayers:function(){this._deletedLayers.eachLayer(function(t){this._deletableLayers.addLayer(t)},this)},save:function(){this._map.fire("draw:deleted",{layers:this._deletedLayers})},_enableLayerDelete:function(t){var e=t.layer||t.target||t;e.on("click",this._removeLayer,this)},_disableLayerDelete:function(t){var e=t.layer||t.target||t;e.off("click",this._removeLayer,this),this._deletedLayers.removeLayer(e)},_removeLayer:function(t){var e=t.layer||t.target||t;this._deletableLayers.removeLayer(e),this._deletedLayers.addLayer(e)},_onMouseMove:function(t){this._tooltip.updatePosition(t.latlng)},_hasAvailableLayers:function(){return 0!==this._deletableLayers.getLayers().length}})})(this,document);
},{}],24:[function(require,module,exports){
/*
 Leaflet.markercluster, Provides Beautiful Animated Marker Clustering functionality for Leaflet, a JS library for interactive maps.
 https://github.com/Leaflet/Leaflet.markercluster
 (c) 2012-2013, Dave Leaver, smartrak
*/
!function(t,e){L.MarkerClusterGroup=L.FeatureGroup.extend({options:{maxClusterRadius:80,iconCreateFunction:null,spiderfyOnMaxZoom:!0,showCoverageOnHover:!0,zoomToBoundsOnClick:!0,singleMarkerMode:!1,disableClusteringAtZoom:null,removeOutsideVisibleBounds:!0,animateAddingMarkers:!1,spiderfyDistanceMultiplier:1,polygonOptions:{}},initialize:function(t){L.Util.setOptions(this,t),this.options.iconCreateFunction||(this.options.iconCreateFunction=this._defaultIconCreateFunction),this._featureGroup=L.featureGroup(),this._featureGroup.on(L.FeatureGroup.EVENTS,this._propagateEvent,this),this._nonPointGroup=L.featureGroup(),this._nonPointGroup.on(L.FeatureGroup.EVENTS,this._propagateEvent,this),this._inZoomAnimation=0,this._needsClustering=[],this._needsRemoving=[],this._currentShownBounds=null,this._queue=[]},addLayer:function(t){if(t instanceof L.LayerGroup){var e=[];for(var i in t._layers)e.push(t._layers[i]);return this.addLayers(e)}if(!t.getLatLng)return this._nonPointGroup.addLayer(t),this;if(!this._map)return this._needsClustering.push(t),this;if(this.hasLayer(t))return this;this._unspiderfy&&this._unspiderfy(),this._addLayer(t,this._maxZoom);var n=t,s=this._map.getZoom();if(t.__parent)for(;n.__parent._zoom>=s;)n=n.__parent;return this._currentShownBounds.contains(n.getLatLng())&&(this.options.animateAddingMarkers?this._animationAddLayer(t,n):this._animationAddLayerNonAnimated(t,n)),this},removeLayer:function(t){if(t instanceof L.LayerGroup){var e=[];for(var i in t._layers)e.push(t._layers[i]);return this.removeLayers(e)}return t.getLatLng?this._map?t.__parent?(this._unspiderfy&&(this._unspiderfy(),this._unspiderfyLayer(t)),this._removeLayer(t,!0),this._featureGroup.hasLayer(t)&&(this._featureGroup.removeLayer(t),t.setOpacity&&t.setOpacity(1)),this):this:(!this._arraySplice(this._needsClustering,t)&&this.hasLayer(t)&&this._needsRemoving.push(t),this):(this._nonPointGroup.removeLayer(t),this)},addLayers:function(t){var e,i,n,s=this._map,r=this._featureGroup,o=this._nonPointGroup;for(e=0,i=t.length;i>e;e++)if(n=t[e],n.getLatLng){if(!this.hasLayer(n))if(s){if(this._addLayer(n,this._maxZoom),n.__parent&&2===n.__parent.getChildCount()){var a=n.__parent.getAllChildMarkers(),h=a[0]===n?a[1]:a[0];r.removeLayer(h)}}else this._needsClustering.push(n)}else o.addLayer(n);return s&&(r.eachLayer(function(t){t instanceof L.MarkerCluster&&t._iconNeedsUpdate&&t._updateIcon()}),this._topClusterLevel._recursivelyAddChildrenToMap(null,this._zoom,this._currentShownBounds)),this},removeLayers:function(t){var e,i,n,s=this._featureGroup,r=this._nonPointGroup;if(!this._map){for(e=0,i=t.length;i>e;e++)n=t[e],this._arraySplice(this._needsClustering,n),r.removeLayer(n);return this}for(e=0,i=t.length;i>e;e++)n=t[e],n.__parent?(this._removeLayer(n,!0,!0),s.hasLayer(n)&&(s.removeLayer(n),n.setOpacity&&n.setOpacity(1))):r.removeLayer(n);return this._topClusterLevel._recursivelyAddChildrenToMap(null,this._zoom,this._currentShownBounds),s.eachLayer(function(t){t instanceof L.MarkerCluster&&t._updateIcon()}),this},clearLayers:function(){return this._map||(this._needsClustering=[],delete this._gridClusters,delete this._gridUnclustered),this._noanimationUnspiderfy&&this._noanimationUnspiderfy(),this._featureGroup.clearLayers(),this._nonPointGroup.clearLayers(),this.eachLayer(function(t){delete t.__parent}),this._map&&this._generateInitialClusters(),this},getBounds:function(){var t=new L.LatLngBounds;if(this._topClusterLevel)t.extend(this._topClusterLevel._bounds);else for(var e=this._needsClustering.length-1;e>=0;e--)t.extend(this._needsClustering[e].getLatLng());return t.extend(this._nonPointGroup.getBounds()),t},eachLayer:function(t,e){var i,n=this._needsClustering.slice();for(this._topClusterLevel&&this._topClusterLevel.getAllChildMarkers(n),i=n.length-1;i>=0;i--)t.call(e,n[i]);this._nonPointGroup.eachLayer(t,e)},getLayers:function(){var t=[];return this.eachLayer(function(e){t.push(e)}),t},getLayer:function(t){var e=null;return this.eachLayer(function(i){L.stamp(i)===t&&(e=i)}),e},hasLayer:function(t){if(!t)return!1;var e,i=this._needsClustering;for(e=i.length-1;e>=0;e--)if(i[e]===t)return!0;for(i=this._needsRemoving,e=i.length-1;e>=0;e--)if(i[e]===t)return!1;return!(!t.__parent||t.__parent._group!==this)||this._nonPointGroup.hasLayer(t)},zoomToShowLayer:function(t,e){var i=function(){if((t._icon||t.__parent._icon)&&!this._inZoomAnimation)if(this._map.off("moveend",i,this),this.off("animationend",i,this),t._icon)e();else if(t.__parent._icon){var n=function(){this.off("spiderfied",n,this),e()};this.on("spiderfied",n,this),t.__parent.spiderfy()}};t._icon&&this._map.getBounds().contains(t.getLatLng())?e():t.__parent._zoom<this._map.getZoom()?(this._map.on("moveend",i,this),this._map.panTo(t.getLatLng())):(this._map.on("moveend",i,this),this.on("animationend",i,this),this._map.setView(t.getLatLng(),t.__parent._zoom+1),t.__parent.zoomToBounds())},onAdd:function(t){this._map=t;var e,i,n;if(!isFinite(this._map.getMaxZoom()))throw"Map has no maxZoom specified";for(this._featureGroup.onAdd(t),this._nonPointGroup.onAdd(t),this._gridClusters||this._generateInitialClusters(),e=0,i=this._needsRemoving.length;i>e;e++)n=this._needsRemoving[e],this._removeLayer(n,!0);for(this._needsRemoving=[],e=0,i=this._needsClustering.length;i>e;e++)n=this._needsClustering[e],n.getLatLng?n.__parent||this._addLayer(n,this._maxZoom):this._featureGroup.addLayer(n);this._needsClustering=[],this._map.on("zoomend",this._zoomEnd,this),this._map.on("moveend",this._moveEnd,this),this._spiderfierOnAdd&&this._spiderfierOnAdd(),this._bindEvents(),this._zoom=this._map.getZoom(),this._currentShownBounds=this._getExpandedVisibleBounds(),this._topClusterLevel._recursivelyAddChildrenToMap(null,this._zoom,this._currentShownBounds)},onRemove:function(t){t.off("zoomend",this._zoomEnd,this),t.off("moveend",this._moveEnd,this),this._unbindEvents(),this._map._mapPane.className=this._map._mapPane.className.replace(" leaflet-cluster-anim",""),this._spiderfierOnRemove&&this._spiderfierOnRemove(),this._hideCoverage(),this._featureGroup.onRemove(t),this._nonPointGroup.onRemove(t),this._featureGroup.clearLayers(),this._map=null},getVisibleParent:function(t){for(var e=t;e&&!e._icon;)e=e.__parent;return e||null},_arraySplice:function(t,e){for(var i=t.length-1;i>=0;i--)if(t[i]===e)return t.splice(i,1),!0},_removeLayer:function(t,e,i){var n=this._gridClusters,s=this._gridUnclustered,r=this._featureGroup,o=this._map;if(e)for(var a=this._maxZoom;a>=0&&s[a].removeObject(t,o.project(t.getLatLng(),a));a--);var h,_=t.__parent,u=_._markers;for(this._arraySplice(u,t);_&&(_._childCount--,!(_._zoom<0));)e&&_._childCount<=1?(h=_._markers[0]===t?_._markers[1]:_._markers[0],n[_._zoom].removeObject(_,o.project(_._cLatLng,_._zoom)),s[_._zoom].addObject(h,o.project(h.getLatLng(),_._zoom)),this._arraySplice(_.__parent._childClusters,_),_.__parent._markers.push(h),h.__parent=_.__parent,_._icon&&(r.removeLayer(_),i||r.addLayer(h))):(_._recalculateBounds(),i&&_._icon||_._updateIcon()),_=_.__parent;delete t.__parent},_isOrIsParent:function(t,e){for(;e;){if(t===e)return!0;e=e.parentNode}return!1},_propagateEvent:function(t){if(t.layer instanceof L.MarkerCluster){if(t.originalEvent&&this._isOrIsParent(t.layer._icon,t.originalEvent.relatedTarget))return;t.type="cluster"+t.type}this.fire(t.type,t)},_defaultIconCreateFunction:function(t){var e=t.getChildCount(),i=" marker-cluster-";return i+=10>e?"small":100>e?"medium":"large",new L.DivIcon({html:"<div><span>"+e+"</span></div>",className:"marker-cluster"+i,iconSize:new L.Point(40,40)})},_bindEvents:function(){var t=this._map,e=this.options.spiderfyOnMaxZoom,i=this.options.showCoverageOnHover,n=this.options.zoomToBoundsOnClick;(e||n)&&this.on("clusterclick",this._zoomOrSpiderfy,this),i&&(this.on("clustermouseover",this._showCoverage,this),this.on("clustermouseout",this._hideCoverage,this),t.on("zoomend",this._hideCoverage,this))},_zoomOrSpiderfy:function(t){var e=this._map;e.getMaxZoom()===e.getZoom()?this.options.spiderfyOnMaxZoom&&t.layer.spiderfy():this.options.zoomToBoundsOnClick&&t.layer.zoomToBounds(),t.originalEvent&&13===t.originalEvent.keyCode&&e._container.focus()},_showCoverage:function(t){var e=this._map;this._inZoomAnimation||(this._shownPolygon&&e.removeLayer(this._shownPolygon),t.layer.getChildCount()>2&&t.layer!==this._spiderfied&&(this._shownPolygon=new L.Polygon(t.layer.getConvexHull(),this.options.polygonOptions),e.addLayer(this._shownPolygon)))},_hideCoverage:function(){this._shownPolygon&&(this._map.removeLayer(this._shownPolygon),this._shownPolygon=null)},_unbindEvents:function(){var t=this.options.spiderfyOnMaxZoom,e=this.options.showCoverageOnHover,i=this.options.zoomToBoundsOnClick,n=this._map;(t||i)&&this.off("clusterclick",this._zoomOrSpiderfy,this),e&&(this.off("clustermouseover",this._showCoverage,this),this.off("clustermouseout",this._hideCoverage,this),n.off("zoomend",this._hideCoverage,this))},_zoomEnd:function(){this._map&&(this._mergeSplitClusters(),this._zoom=this._map._zoom,this._currentShownBounds=this._getExpandedVisibleBounds())},_moveEnd:function(){if(!this._inZoomAnimation){var t=this._getExpandedVisibleBounds();this._topClusterLevel._recursivelyRemoveChildrenFromMap(this._currentShownBounds,this._zoom,t),this._topClusterLevel._recursivelyAddChildrenToMap(null,this._map._zoom,t),this._currentShownBounds=t}},_generateInitialClusters:function(){var t=this._map.getMaxZoom(),e=this.options.maxClusterRadius;this.options.disableClusteringAtZoom&&(t=this.options.disableClusteringAtZoom-1),this._maxZoom=t,this._gridClusters={},this._gridUnclustered={};for(var i=t;i>=0;i--)this._gridClusters[i]=new L.DistanceGrid(e),this._gridUnclustered[i]=new L.DistanceGrid(e);this._topClusterLevel=new L.MarkerCluster(this,-1)},_addLayer:function(t,e){var i,n,s=this._gridClusters,r=this._gridUnclustered;for(this.options.singleMarkerMode&&(t.options.icon=this.options.iconCreateFunction({getChildCount:function(){return 1},getAllChildMarkers:function(){return[t]}}));e>=0;e--){i=this._map.project(t.getLatLng(),e);var o=s[e].getNearObject(i);if(o)return o._addChild(t),t.__parent=o,void 0;if(o=r[e].getNearObject(i)){var a=o.__parent;a&&this._removeLayer(o,!1);var h=new L.MarkerCluster(this,e,o,t);s[e].addObject(h,this._map.project(h._cLatLng,e)),o.__parent=h,t.__parent=h;var _=h;for(n=e-1;n>a._zoom;n--)_=new L.MarkerCluster(this,n,_),s[n].addObject(_,this._map.project(o.getLatLng(),n));for(a._addChild(_),n=e;n>=0&&r[n].removeObject(o,this._map.project(o.getLatLng(),n));n--);return}r[e].addObject(t,i)}this._topClusterLevel._addChild(t),t.__parent=this._topClusterLevel},_enqueue:function(t){this._queue.push(t),this._queueTimeout||(this._queueTimeout=setTimeout(L.bind(this._processQueue,this),300))},_processQueue:function(){for(var t=0;t<this._queue.length;t++)this._queue[t].call(this);this._queue.length=0,clearTimeout(this._queueTimeout),this._queueTimeout=null},_mergeSplitClusters:function(){this._processQueue(),this._zoom<this._map._zoom&&this._currentShownBounds.contains(this._getExpandedVisibleBounds())?(this._animationStart(),this._topClusterLevel._recursivelyRemoveChildrenFromMap(this._currentShownBounds,this._zoom,this._getExpandedVisibleBounds()),this._animationZoomIn(this._zoom,this._map._zoom)):this._zoom>this._map._zoom?(this._animationStart(),this._animationZoomOut(this._zoom,this._map._zoom)):this._moveEnd()},_getExpandedVisibleBounds:function(){if(!this.options.removeOutsideVisibleBounds)return this.getBounds();var t=this._map,e=t.getBounds(),i=e._southWest,n=e._northEast,s=L.Browser.mobile?0:Math.abs(i.lat-n.lat),r=L.Browser.mobile?0:Math.abs(i.lng-n.lng);return new L.LatLngBounds(new L.LatLng(i.lat-s,i.lng-r,!0),new L.LatLng(n.lat+s,n.lng+r,!0))},_animationAddLayerNonAnimated:function(t,e){if(e===t)this._featureGroup.addLayer(t);else if(2===e._childCount){e._addToMap();var i=e.getAllChildMarkers();this._featureGroup.removeLayer(i[0]),this._featureGroup.removeLayer(i[1])}else e._updateIcon()}}),L.MarkerClusterGroup.include(L.DomUtil.TRANSITION?{_animationStart:function(){this._map._mapPane.className+=" leaflet-cluster-anim",this._inZoomAnimation++},_animationEnd:function(){this._map&&(this._map._mapPane.className=this._map._mapPane.className.replace(" leaflet-cluster-anim","")),this._inZoomAnimation--,this.fire("animationend")},_animationZoomIn:function(t,e){var i,n=this._getExpandedVisibleBounds(),s=this._featureGroup;this._topClusterLevel._recursively(n,t,0,function(r){var o,a=r._latlng,h=r._markers;for(n.contains(a)||(a=null),r._isSingleParent()&&t+1===e?(s.removeLayer(r),r._recursivelyAddChildrenToMap(null,e,n)):(r.setOpacity(0),r._recursivelyAddChildrenToMap(a,e,n)),i=h.length-1;i>=0;i--)o=h[i],n.contains(o._latlng)||s.removeLayer(o)}),this._forceLayout(),this._topClusterLevel._recursivelyBecomeVisible(n,e),s.eachLayer(function(t){t instanceof L.MarkerCluster||!t._icon||t.setOpacity(1)}),this._topClusterLevel._recursively(n,t,e,function(t){t._recursivelyRestoreChildPositions(e)}),this._enqueue(function(){this._topClusterLevel._recursively(n,t,0,function(t){s.removeLayer(t),t.setOpacity(1)}),this._animationEnd()})},_animationZoomOut:function(t,e){this._animationZoomOutSingle(this._topClusterLevel,t-1,e),this._topClusterLevel._recursivelyAddChildrenToMap(null,e,this._getExpandedVisibleBounds()),this._topClusterLevel._recursivelyRemoveChildrenFromMap(this._currentShownBounds,t,this._getExpandedVisibleBounds())},_animationZoomOutSingle:function(t,e,i){var n=this._getExpandedVisibleBounds();t._recursivelyAnimateChildrenInAndAddSelfToMap(n,e+1,i);var s=this;this._forceLayout(),t._recursivelyBecomeVisible(n,i),this._enqueue(function(){if(1===t._childCount){var r=t._markers[0];r.setLatLng(r.getLatLng()),r.setOpacity(1)}else t._recursively(n,i,0,function(t){t._recursivelyRemoveChildrenFromMap(n,e+1)});s._animationEnd()})},_animationAddLayer:function(t,e){var i=this,n=this._featureGroup;n.addLayer(t),e!==t&&(e._childCount>2?(e._updateIcon(),this._forceLayout(),this._animationStart(),t._setPos(this._map.latLngToLayerPoint(e.getLatLng())),t.setOpacity(0),this._enqueue(function(){n.removeLayer(t),t.setOpacity(1),i._animationEnd()})):(this._forceLayout(),i._animationStart(),i._animationZoomOutSingle(e,this._map.getMaxZoom(),this._map.getZoom())))},_forceLayout:function(){L.Util.falseFn(e.body.offsetWidth)}}:{_animationStart:function(){},_animationZoomIn:function(t,e){this._topClusterLevel._recursivelyRemoveChildrenFromMap(this._currentShownBounds,t),this._topClusterLevel._recursivelyAddChildrenToMap(null,e,this._getExpandedVisibleBounds())},_animationZoomOut:function(t,e){this._topClusterLevel._recursivelyRemoveChildrenFromMap(this._currentShownBounds,t),this._topClusterLevel._recursivelyAddChildrenToMap(null,e,this._getExpandedVisibleBounds())},_animationAddLayer:function(t,e){this._animationAddLayerNonAnimated(t,e)}}),L.markerClusterGroup=function(t){return new L.MarkerClusterGroup(t)},L.MarkerCluster=L.Marker.extend({initialize:function(t,e,i,n){L.Marker.prototype.initialize.call(this,i?i._cLatLng||i.getLatLng():new L.LatLng(0,0),{icon:this}),this._group=t,this._zoom=e,this._markers=[],this._childClusters=[],this._childCount=0,this._iconNeedsUpdate=!0,this._bounds=new L.LatLngBounds,i&&this._addChild(i),n&&this._addChild(n)},getAllChildMarkers:function(t){t=t||[];for(var e=this._childClusters.length-1;e>=0;e--)this._childClusters[e].getAllChildMarkers(t);for(var i=this._markers.length-1;i>=0;i--)t.push(this._markers[i]);return t},getChildCount:function(){return this._childCount},zoomToBounds:function(){for(var t,e=this._childClusters.slice(),i=this._group._map,n=i.getBoundsZoom(this._bounds),s=this._zoom+1,r=i.getZoom();e.length>0&&n>s;){s++;var o=[];for(t=0;t<e.length;t++)o=o.concat(e[t]._childClusters);e=o}n>s?this._group._map.setView(this._latlng,s):r>=n?this._group._map.setView(this._latlng,r+1):this._group._map.fitBounds(this._bounds)},getBounds:function(){var t=new L.LatLngBounds;return t.extend(this._bounds),t},_updateIcon:function(){this._iconNeedsUpdate=!0,this._icon&&this.setIcon(this)},createIcon:function(){return this._iconNeedsUpdate&&(this._iconObj=this._group.options.iconCreateFunction(this),this._iconNeedsUpdate=!1),this._iconObj.createIcon()},createShadow:function(){return this._iconObj.createShadow()},_addChild:function(t,e){this._iconNeedsUpdate=!0,this._expandBounds(t),t instanceof L.MarkerCluster?(e||(this._childClusters.push(t),t.__parent=this),this._childCount+=t._childCount):(e||this._markers.push(t),this._childCount++),this.__parent&&this.__parent._addChild(t,!0)},_expandBounds:function(t){var e,i=t._wLatLng||t._latlng;t instanceof L.MarkerCluster?(this._bounds.extend(t._bounds),e=t._childCount):(this._bounds.extend(i),e=1),this._cLatLng||(this._cLatLng=t._cLatLng||i);var n=this._childCount+e;this._wLatLng?(this._wLatLng.lat=(i.lat*e+this._wLatLng.lat*this._childCount)/n,this._wLatLng.lng=(i.lng*e+this._wLatLng.lng*this._childCount)/n):this._latlng=this._wLatLng=new L.LatLng(i.lat,i.lng)},_addToMap:function(t){t&&(this._backupLatlng=this._latlng,this.setLatLng(t)),this._group._featureGroup.addLayer(this)},_recursivelyAnimateChildrenIn:function(t,e,i){this._recursively(t,0,i-1,function(t){var i,n,s=t._markers;for(i=s.length-1;i>=0;i--)n=s[i],n._icon&&(n._setPos(e),n.setOpacity(0))},function(t){var i,n,s=t._childClusters;for(i=s.length-1;i>=0;i--)n=s[i],n._icon&&(n._setPos(e),n.setOpacity(0))})},_recursivelyAnimateChildrenInAndAddSelfToMap:function(t,e,i){this._recursively(t,i,0,function(n){n._recursivelyAnimateChildrenIn(t,n._group._map.latLngToLayerPoint(n.getLatLng()).round(),e),n._isSingleParent()&&e-1===i?(n.setOpacity(1),n._recursivelyRemoveChildrenFromMap(t,e)):n.setOpacity(0),n._addToMap()})},_recursivelyBecomeVisible:function(t,e){this._recursively(t,0,e,null,function(t){t.setOpacity(1)})},_recursivelyAddChildrenToMap:function(t,e,i){this._recursively(i,-1,e,function(n){if(e!==n._zoom)for(var s=n._markers.length-1;s>=0;s--){var r=n._markers[s];i.contains(r._latlng)&&(t&&(r._backupLatlng=r.getLatLng(),r.setLatLng(t),r.setOpacity&&r.setOpacity(0)),n._group._featureGroup.addLayer(r))}},function(e){e._addToMap(t)})},_recursivelyRestoreChildPositions:function(t){for(var e=this._markers.length-1;e>=0;e--){var i=this._markers[e];i._backupLatlng&&(i.setLatLng(i._backupLatlng),delete i._backupLatlng)}if(t-1===this._zoom)for(var n=this._childClusters.length-1;n>=0;n--)this._childClusters[n]._restorePosition();else for(var s=this._childClusters.length-1;s>=0;s--)this._childClusters[s]._recursivelyRestoreChildPositions(t)},_restorePosition:function(){this._backupLatlng&&(this.setLatLng(this._backupLatlng),delete this._backupLatlng)},_recursivelyRemoveChildrenFromMap:function(t,e,i){var n,s;this._recursively(t,-1,e-1,function(t){for(s=t._markers.length-1;s>=0;s--)n=t._markers[s],i&&i.contains(n._latlng)||(t._group._featureGroup.removeLayer(n),n.setOpacity&&n.setOpacity(1))},function(t){for(s=t._childClusters.length-1;s>=0;s--)n=t._childClusters[s],i&&i.contains(n._latlng)||(t._group._featureGroup.removeLayer(n),n.setOpacity&&n.setOpacity(1))})},_recursively:function(t,e,i,n,s){var r,o,a=this._childClusters,h=this._zoom;if(e>h)for(r=a.length-1;r>=0;r--)o=a[r],t.intersects(o._bounds)&&o._recursively(t,e,i,n,s);else if(n&&n(this),s&&this._zoom===i&&s(this),i>h)for(r=a.length-1;r>=0;r--)o=a[r],t.intersects(o._bounds)&&o._recursively(t,e,i,n,s)},_recalculateBounds:function(){var t,e=this._markers,i=this._childClusters;for(this._bounds=new L.LatLngBounds,delete this._wLatLng,t=e.length-1;t>=0;t--)this._expandBounds(e[t]);for(t=i.length-1;t>=0;t--)this._expandBounds(i[t])},_isSingleParent:function(){return this._childClusters.length>0&&this._childClusters[0]._childCount===this._childCount}}),L.DistanceGrid=function(t){this._cellSize=t,this._sqCellSize=t*t,this._grid={},this._objectPoint={}},L.DistanceGrid.prototype={addObject:function(t,e){var i=this._getCoord(e.x),n=this._getCoord(e.y),s=this._grid,r=s[n]=s[n]||{},o=r[i]=r[i]||[],a=L.Util.stamp(t);this._objectPoint[a]=e,o.push(t)},updateObject:function(t,e){this.removeObject(t),this.addObject(t,e)},removeObject:function(t,e){var i,n,s=this._getCoord(e.x),r=this._getCoord(e.y),o=this._grid,a=o[r]=o[r]||{},h=a[s]=a[s]||[];for(delete this._objectPoint[L.Util.stamp(t)],i=0,n=h.length;n>i;i++)if(h[i]===t)return h.splice(i,1),1===n&&delete a[s],!0},eachObject:function(t,e){var i,n,s,r,o,a,h,_=this._grid;for(i in _){o=_[i];for(n in o)for(a=o[n],s=0,r=a.length;r>s;s++)h=t.call(e,a[s]),h&&(s--,r--)}},getNearObject:function(t){var e,i,n,s,r,o,a,h,_=this._getCoord(t.x),u=this._getCoord(t.y),l=this._objectPoint,d=this._sqCellSize,p=null;for(e=u-1;u+1>=e;e++)if(s=this._grid[e])for(i=_-1;_+1>=i;i++)if(r=s[i])for(n=0,o=r.length;o>n;n++)a=r[n],h=this._sqDist(l[L.Util.stamp(a)],t),d>h&&(d=h,p=a);return p},_getCoord:function(t){return Math.floor(t/this._cellSize)},_sqDist:function(t,e){var i=e.x-t.x,n=e.y-t.y;return i*i+n*n}},function(){L.QuickHull={getDistant:function(t,e){var i=e[1].lat-e[0].lat,n=e[0].lng-e[1].lng;return n*(t.lat-e[0].lat)+i*(t.lng-e[0].lng)},findMostDistantPointFromBaseLine:function(t,e){var i,n,s,r=0,o=null,a=[];for(i=e.length-1;i>=0;i--)n=e[i],s=this.getDistant(n,t),s>0&&(a.push(n),s>r&&(r=s,o=n));return{maxPoint:o,newPoints:a}},buildConvexHull:function(t,e){var i=[],n=this.findMostDistantPointFromBaseLine(t,e);return n.maxPoint?(i=i.concat(this.buildConvexHull([t[0],n.maxPoint],n.newPoints)),i=i.concat(this.buildConvexHull([n.maxPoint,t[1]],n.newPoints))):[t[0]]},getConvexHull:function(t){var e,i=!1,n=!1,s=null,r=null;for(e=t.length-1;e>=0;e--){var o=t[e];(i===!1||o.lat>i)&&(s=o,i=o.lat),(n===!1||o.lat<n)&&(r=o,n=o.lat)}var a=[].concat(this.buildConvexHull([r,s],t),this.buildConvexHull([s,r],t));return a}}}(),L.MarkerCluster.include({getConvexHull:function(){var t,e,i=this.getAllChildMarkers(),n=[];for(e=i.length-1;e>=0;e--)t=i[e].getLatLng(),n.push(t);return L.QuickHull.getConvexHull(n)}}),L.MarkerCluster.include({_2PI:2*Math.PI,_circleFootSeparation:25,_circleStartAngle:Math.PI/6,_spiralFootSeparation:28,_spiralLengthStart:11,_spiralLengthFactor:5,_circleSpiralSwitchover:9,spiderfy:function(){if(this._group._spiderfied!==this&&!this._group._inZoomAnimation){var t,e=this.getAllChildMarkers(),i=this._group,n=i._map,s=n.latLngToLayerPoint(this._latlng);this._group._unspiderfy(),this._group._spiderfied=this,e.length>=this._circleSpiralSwitchover?t=this._generatePointsSpiral(e.length,s):(s.y+=10,t=this._generatePointsCircle(e.length,s)),this._animationSpiderfy(e,t)}},unspiderfy:function(t){this._group._inZoomAnimation||(this._animationUnspiderfy(t),this._group._spiderfied=null)},_generatePointsCircle:function(t,e){var i,n,s=this._group.options.spiderfyDistanceMultiplier*this._circleFootSeparation*(2+t),r=s/this._2PI,o=this._2PI/t,a=[];for(a.length=t,i=t-1;i>=0;i--)n=this._circleStartAngle+i*o,a[i]=new L.Point(e.x+r*Math.cos(n),e.y+r*Math.sin(n))._round();return a},_generatePointsSpiral:function(t,e){var i,n=this._group.options.spiderfyDistanceMultiplier*this._spiralLengthStart,s=this._group.options.spiderfyDistanceMultiplier*this._spiralFootSeparation,r=this._group.options.spiderfyDistanceMultiplier*this._spiralLengthFactor,o=0,a=[];for(a.length=t,i=t-1;i>=0;i--)o+=s/n+5e-4*i,a[i]=new L.Point(e.x+n*Math.cos(o),e.y+n*Math.sin(o))._round(),n+=this._2PI*r/o;return a},_noanimationUnspiderfy:function(){var t,e,i=this._group,n=i._map,s=i._featureGroup,r=this.getAllChildMarkers();for(this.setOpacity(1),e=r.length-1;e>=0;e--)t=r[e],s.removeLayer(t),t._preSpiderfyLatlng&&(t.setLatLng(t._preSpiderfyLatlng),delete t._preSpiderfyLatlng),t.setZIndexOffset&&t.setZIndexOffset(0),t._spiderLeg&&(n.removeLayer(t._spiderLeg),delete t._spiderLeg);i._spiderfied=null}}),L.MarkerCluster.include(L.DomUtil.TRANSITION?{SVG_ANIMATION:function(){return e.createElementNS("http://www.w3.org/2000/svg","animate").toString().indexOf("SVGAnimate")>-1}(),_animationSpiderfy:function(t,i){var n,s,r,o,a=this,h=this._group,_=h._map,u=h._featureGroup,l=_.latLngToLayerPoint(this._latlng);for(n=t.length-1;n>=0;n--)s=t[n],s.setOpacity?(s.setZIndexOffset(1e6),s.setOpacity(0),u.addLayer(s),s._setPos(l)):u.addLayer(s);h._forceLayout(),h._animationStart();var d=L.Path.SVG?0:.3,p=L.Path.SVG_NS;for(n=t.length-1;n>=0;n--)if(o=_.layerPointToLatLng(i[n]),s=t[n],s._preSpiderfyLatlng=s._latlng,s.setLatLng(o),s.setOpacity&&s.setOpacity(1),r=new L.Polyline([a._latlng,o],{weight:1.5,color:"#222",opacity:d}),_.addLayer(r),s._spiderLeg=r,L.Path.SVG&&this.SVG_ANIMATION){var c=r._path.getTotalLength();r._path.setAttribute("stroke-dasharray",c+","+c);var m=e.createElementNS(p,"animate");m.setAttribute("attributeName","stroke-dashoffset"),m.setAttribute("begin","indefinite"),m.setAttribute("from",c),m.setAttribute("to",0),m.setAttribute("dur",.25),r._path.appendChild(m),m.beginElement(),m=e.createElementNS(p,"animate"),m.setAttribute("attributeName","stroke-opacity"),m.setAttribute("attributeName","stroke-opacity"),m.setAttribute("begin","indefinite"),m.setAttribute("from",0),m.setAttribute("to",.5),m.setAttribute("dur",.25),r._path.appendChild(m),m.beginElement()}if(a.setOpacity(.3),L.Path.SVG)for(this._group._forceLayout(),n=t.length-1;n>=0;n--)s=t[n]._spiderLeg,s.options.opacity=.5,s._path.setAttribute("stroke-opacity",.5);setTimeout(function(){h._animationEnd(),h.fire("spiderfied")},200)},_animationUnspiderfy:function(t){var e,i,n,s=this._group,r=s._map,o=s._featureGroup,a=t?r._latLngToNewLayerPoint(this._latlng,t.zoom,t.center):r.latLngToLayerPoint(this._latlng),h=this.getAllChildMarkers(),_=L.Path.SVG&&this.SVG_ANIMATION;for(s._animationStart(),this.setOpacity(1),i=h.length-1;i>=0;i--)e=h[i],e._preSpiderfyLatlng&&(e.setLatLng(e._preSpiderfyLatlng),delete e._preSpiderfyLatlng,e.setOpacity?(e._setPos(a),e.setOpacity(0)):o.removeLayer(e),_&&(n=e._spiderLeg._path.childNodes[0],n.setAttribute("to",n.getAttribute("from")),n.setAttribute("from",0),n.beginElement(),n=e._spiderLeg._path.childNodes[1],n.setAttribute("from",.5),n.setAttribute("to",0),n.setAttribute("stroke-opacity",0),n.beginElement(),e._spiderLeg._path.setAttribute("stroke-opacity",0)));setTimeout(function(){var t=0;for(i=h.length-1;i>=0;i--)e=h[i],e._spiderLeg&&t++;for(i=h.length-1;i>=0;i--)e=h[i],e._spiderLeg&&(e.setOpacity&&(e.setOpacity(1),e.setZIndexOffset(0)),t>1&&o.removeLayer(e),r.removeLayer(e._spiderLeg),delete e._spiderLeg);s._animationEnd()},200)}}:{_animationSpiderfy:function(t,e){var i,n,s,r,o=this._group,a=o._map,h=o._featureGroup;for(i=t.length-1;i>=0;i--)r=a.layerPointToLatLng(e[i]),n=t[i],n._preSpiderfyLatlng=n._latlng,n.setLatLng(r),n.setZIndexOffset&&n.setZIndexOffset(1e6),h.addLayer(n),s=new L.Polyline([this._latlng,r],{weight:1.5,color:"#222"}),a.addLayer(s),n._spiderLeg=s;this.setOpacity(.3),o.fire("spiderfied")},_animationUnspiderfy:function(){this._noanimationUnspiderfy()}}),L.MarkerClusterGroup.include({_spiderfied:null,_spiderfierOnAdd:function(){this._map.on("click",this._unspiderfyWrapper,this),this._map.options.zoomAnimation&&this._map.on("zoomstart",this._unspiderfyZoomStart,this),this._map.on("zoomend",this._noanimationUnspiderfy,this),L.Path.SVG&&!L.Browser.touch&&this._map._initPathRoot()},_spiderfierOnRemove:function(){this._map.off("click",this._unspiderfyWrapper,this),this._map.off("zoomstart",this._unspiderfyZoomStart,this),this._map.off("zoomanim",this._unspiderfyZoomAnim,this),this._unspiderfy()},_unspiderfyZoomStart:function(){this._map&&this._map.on("zoomanim",this._unspiderfyZoomAnim,this)},_unspiderfyZoomAnim:function(t){L.DomUtil.hasClass(this._map._mapPane,"leaflet-touching")||(this._map.off("zoomanim",this._unspiderfyZoomAnim,this),this._unspiderfy(t))},_unspiderfyWrapper:function(){this._unspiderfy()},_unspiderfy:function(t){this._spiderfied&&this._spiderfied.unspiderfy(t)},_noanimationUnspiderfy:function(){this._spiderfied&&this._spiderfied._noanimationUnspiderfy()},_unspiderfyLayer:function(t){t._spiderLeg&&(this._featureGroup.removeLayer(t),t.setOpacity(1),t.setZIndexOffset(0),this._map.removeLayer(t._spiderLeg),delete t._spiderLeg)}})}(window,document);
},{}],25:[function(require,module,exports){
module.exports=[
    {
        "name": "Circle stroked",
        "tags": [
            "circle",
            "disc",
            "shape",
            "shapes",
            "geometric",
            "stroke",
            "round"
        ],
        "icon": "circle-stroked"
    },
    {
        "name": "Circle solid",
        "tags": [
            "circle",
            "shape",
            "shapes",
            "geometric",
            "round"
        ],
        "icon": "circle"
    },
    {
        "name": "Square stroked",
        "tags": [
            "box",
            "square",
            "shapes",
            "shape",
            "geometric",
            "stroke"
        ],
        "icon": "square-stroked"
    },
    {
        "name": "Square solid",
        "tags": [
            "box",
            "square",
            "shape",
            "shapes",
            "geometric"
        ],
        "icon": "square"
    },
    {
        "name": "Triangle stroked",
        "tags": [
            "triangle",
            "shape",
            "shapes",
            "geometric",
            "stroke"
        ],
        "icon": "triangle-stroked"
    },
    {
        "name": "Triangle solid",
        "tags": [
            "triangle",
            "shape",
            "shapes",
            "geometric"
        ],
        "icon": "triangle"
    },
    {
        "name": "Star stroked",
        "tags": [
            "star",
            "shape",
            "shapes",
            "geometric",
            "stroke"
        ],
        "icon": "star-stroked"
    },
    {
        "name": "Star solid",
        "tags": [
            "star",
            "shape",
            "shapes",
            "geometric"
        ],
        "icon": "star"
    },
    {
        "name": "Cross",
        "tags": [
            "cross",
            "x",
            "ex",
            "shape",
            "shapes",
            "geometric"
        ],
        "icon": "cross"
    },
    {
        "name": "Marker Stroke",
        "tags": [
            "marker",
            "point",
            "shape",
            "shapes",
            "stroke"
        ],
        "icon": "marker-stroked"
    },
    {
        "name": "Marker Solid",
        "tags": [
            "marker",
            "point",
            "shape",
            "shapes"
        ],
        "icon": "marker"
    },
    {
        "name": "Religious Jewish",
        "tags": [
            "jewish",
            "judaism",
            "hebrew",
            "star",
            "david",
            "religious",
            "religion",
            "temple",
            "synagogue"
        ],
        "icon": "religious-jewish"
    },
    {
        "name": "Religious Christian",
        "tags": [
            "christian",
            "cross",
            "religious",
            "religion",
            "church",
            "cathedral"
        ],
        "icon": "religious-christian"
    },
    {
        "name": "Religious Muslim",
        "tags": [
            "muslim",
            "crescent",
            "star",
            "religious",
            "religion",
            "mosque"
        ],
        "icon": "religious-muslim"
    },
    {
        "name": "Cemetery",
        "tags": [
            "cemetery",
            "graveyard",
            "funeral",
            "religious",
            "religion",
            "memorial"
        ],
        "icon": "cemetery"
    },
    {
        "name": "Rocket",
        "tags": [
            "rocket",
            "space",
            "launch",
            "transportation"
        ],
        "icon": "rocket"
    },
    {
        "name": "Airport",
        "tags": [
            "airplane",
            "plane",
            "airport",
            "transportation"
        ],
        "icon": "airport"
    },
    {
        "name": "Heliport",
        "tags": [
            "heliport",
            "helicopter",
            "transportation"
        ],
        "icon": "heliport"
    },
    {
        "name": "Rail",
        "tags": [
            "rail",
            "train",
            "transportation"
        ],
        "icon": "rail"
    },
    {
        "name": "Rail Metro",
        "tags": [
            "rail",
            "train",
            "metro",
            "subway",
            "rapid-transit",
            "transportation"
        ],
        "icon": "rail-metro"
    },
    {
        "name": "Rail Light",
        "tags": [
            "rail",
            "train",
            "light-rail",
            "transportation"
        ],
        "icon": "rail-light"
    },
    {
        "name": "Bus",
        "tags": [
            "vehicle",
            "bus",
            "transportation"
        ],
        "icon": "bus"
    },
    {
        "name": "Fuel",
        "tags": [
            "petrol",
            "fuel",
            "gas",
            "transportation",
            "station"
        ],
        "icon": "fuel"
    },
    {
        "name": "Parking",
        "tags": [
            "parking",
            "transportation"
        ],
        "icon": "parking"
    },
    {
        "name": "Parking Garage",
        "tags": [
            "parking",
            "transportation",
            "garage"
        ],
        "icon": "parking-garage"
    },
    {
        "name": "Airfield",
        "tags": [
            "airfield",
            "airport",
            "plane",
            "landing strip"
        ],
        "icon": "airfield"
    },
    {
        "name": "Roadblock",
        "tags": [
            "roadblock",
            "stop",
            "warning",
            "dead end"
        ],
        "icon": "roadblock"
    },
    {
        "name": "Ferry",
        "tags": [
            "ship",
            "boat",
            "water",
            "ferry",
            "transportation"
        ],
        "icon": "ferry"
    },
    {
        "name": "Harbor",
        "tags": [
            "marine",
            "dock",
            "water",
            "wharf"
        ],
        "icon": "harbor"
    },
    {
        "name": "Bicycle",
        "tags": [
            "cycling",
            "cycle",
            "transportation"
        ],
        "icon": "bicycle"
    },
    {
        "name": "Park",
        "tags": [
            "recreation",
            "park",
            "forest",
            "tree",
            "green",
            "woods",
            "nature"
        ],
        "icon": "park"
    },
    {
        "name": "Park 2",
        "tags": [
            "recreation",
            "park",
            "forest",
            "tree",
            "green",
            "woods",
            "nature"
        ],
        "icon": "park2"
    },
    {
        "name": "Museum",
        "tags": [
            "recreation",
            "museum",
            "tourism"
        ],
        "icon": "museum"
    },
    {
        "name": "Lodging",
        "tags": [
            "lodging",
            "hotel",
            "recreation",
            "motel",
            "tourism"
        ],
        "icon": "lodging"
    },
    {
        "name": "Monument",
        "tags": [
            "recreation",
            "statue",
            "monument",
            "tourism"
        ],
        "icon": "monument"
    },
    {
        "name": "Zoo",
        "tags": [
            "recreation",
            "zoo",
            "animal",
            "giraffe"
        ],
        "icon": "zoo"
    },
    {
        "name": "Garden",
        "tags": [
            "recreation",
            "garden",
            "park",
            "flower",
            "nature"
        ],
        "icon": "garden"
    },
    {
        "name": "Campsite",
        "tags": [
            "recreation",
            "campsite",
            "camp",
            "camping",
            "tent",
            "nature"
        ],
        "icon": "campsite"
    },
    {
        "name": "Theatre",
        "tags": [
            "recreation",
            "theatre",
            "theater",
            "entertainment",
            "play",
            "performance"
        ],
        "icon": "theatre"
    },
    {
        "name": "Art gallery",
        "tags": [
            "art",
            "center",
            "museum",
            "gallery",
            "creative",
            "recreation",
            "entertainment",
            "studio"
        ],
        "icon": "art-gallery"
    },
    {
        "name": "Pitch",
        "tags": [
            "pitch",
            "track",
            "athletic",
            "sports",
            "field"
        ],
        "icon": "pitch"
    },
    {
        "name": "Soccer",
        "tags": [
            "soccer",
            "sports"
        ],
        "icon": "soccer"
    },
    {
        "name": "American Football",
        "tags": [
            "football",
            "sports"
        ],
        "icon": "america-football"
    },
    {
        "name": "Tennis",
        "tags": [
            "tennis",
            "court",
            "ball",
            "sports"
        ],
        "icon": "tennis"
    },
    {
        "name": "Basketball",
        "tags": [
            "basketball",
            "ball",
            "sports"
        ],
        "icon": "basketball"
    },
    {
        "name": "Baseball",
        "tags": [
            "baseball",
            "softball",
            "ball",
            "sports"
        ],
        "icon": "baseball"
    },
    {
        "name": "Golf",
        "tags": [
            "golf",
            "sports",
            "course"
        ],
        "icon": "golf"
    },
    {
        "name": "Swimming",
        "tags": [
            "swimming",
            "water",
            "swim",
            "sports"
        ],
        "icon": "swimming"
    },
    {
        "name": "Cricket",
        "tags": [
            "cricket",
            "sports"
        ],
        "icon": "cricket"
    },
    {
        "name": "Skiing",
        "tags": [
            "winter",
            "skiing",
            "ski",
            "sports"
        ],
        "icon": "skiing"
    },
    {
        "name": "School",
        "tags": [
            "school",
            "highschool",
            "elementary",
            "children",
            "amenity",
            "middle"
        ],
        "icon": "school"
    },
    {
        "name": "College",
        "tags": [
            "college",
            "school",
            "amenity",
            "university"
        ],
        "icon": "college"
    },
    {
        "name": "Library",
        "tags": [
            "library",
            "books",
            "amenity"
        ],
        "icon": "library"
    },
    {
        "name": "Post",
        "tags": [
            "post",
            "office",
            "amenity",
            "mail",
            "letter"
        ],
        "icon": "post"
    },
    {
        "name": "Fire station",
        "tags": [
            "fire",
            "station",
            "amenity"
        ],
        "icon": "fire-station"
    },
    {
        "name": "Town hall",
        "tags": [
            "townhall",
            "mayor",
            "building",
            "amenity",
            "government"
        ],
        "icon": "town-hall"
    },
    {
        "name": "Police",
        "tags": [
            "police",
            "jail",
            "arrest",
            "amenity",
            "station"
        ],
        "icon": "police"
    },
    {
        "name": "Prison",
        "tags": [
            "prison",
            "jail",
            "amenity"
        ],
        "icon": "prison"
    },
    {
        "name": "Embassy",
        "tags": [
            "embassy",
            "diplomacy",
            "consulate",
            "amenity",
            "flag"
        ],
        "icon": "embassy"
    },
    {
        "name": "Beer",
        "tags": [
            "bar",
            "beer",
            "drink",
            "commercial",
            "biergarten",
            "pub"
        ],
        "icon": "beer"
    },
    {
        "name": "Restaurant",
        "tags": [
            "restaurant",
            "commercial"
        ],
        "icon": "restaurant"
    },
    {
        "name": "Cafe",
        "tags": [
            "cafe",
            "coffee",
            "commercial",
            "tea"
        ],
        "icon": "cafe"
    },
    {
        "name": "Shop",
        "tags": [
            "shop",
            "mall",
            "commercial",
            "store"
        ],
        "icon": "shop"
    },
    {
        "name": "Fast Food",
        "tags": [
            "food",
            "fast",
            "commercial",
            "burger",
            "drive-through"
        ],
        "icon": "fast-food"
    },
    {
        "name": "Bar",
        "tags": [
            "bar",
            "drink",
            "commercial",
            "club",
            "martini",
            "lounge"
        ],
        "icon": "bar"
    },
    {
        "name": "Bank",
        "tags": [
            "bank",
            "atm",
            "commercial",
            "money"
        ],
        "icon": "bank"
    },
    {
        "name": "Grocery",
        "tags": [
            "food",
            "grocery",
            "commercial",
            "store",
            "market"
        ],
        "icon": "grocery"
    },
    {
        "name": "Cinema",
        "tags": [
            "cinema",
            "theatre",
            "film",
            "movie",
            "commercial",
            "theater",
            "entertainment"
        ],
        "icon": "cinema"
    },
    {
        "name": "Pharmacy",
        "tags": [
            "pharmacy",
            "drugs",
            "medication",
            "social",
            "medicine",
            "prescription"
        ],
        "icon": "pharmacy"
    },
    {
        "name": "Hospital",
        "tags": [
            "hospital",
            "health",
            "medication",
            "social",
            "medicine",
            "medical",
            "clinic"
        ],
        "icon": "hospital"
    },
    {
        "name": "Danger",
        "tags": [
            "minefield",
            "landmine",
            "disaster",
            "dangerous",
            "hazard"
        ],
        "icon": "danger"
    },
    {
        "name": "Industrial",
        "tags": [
            "industrial",
            "factory",
            "property",
            "building"
        ],
        "icon": "industrial"
    },
    {
        "name": "Warehouse",
        "tags": [
            "warehouse",
            "property",
            "storage",
            "building"
        ],
        "icon": "warehouse"
    },
    {
        "name": "Commercial",
        "tags": [
            "commercial",
            "property",
            "business",
            "building"
        ],
        "icon": "commercial"
    },
    {
        "name": "Building",
        "tags": [
            "building",
            "property",
            "structure",
            "business",
            "building"
        ],
        "icon": "building"
    },
    {
        "name": "Place of worship",
        "tags": [
            "religion",
            "ceremony",
            "religious",
            "nondenominational",
            "church",
            "temple"
        ],
        "icon": "place-of-worship"
    },
    {
        "name": "Alcohol shop",
        "tags": [
            "alcohol",
            "liquor",
            "store",
            "shop",
            "beer",
            "wine",
            "vodka"
        ],
        "icon": "alcohol-shop"
    },
    {
        "name": "Logging",
        "tags": [
            "logger",
            "chainsaw",
            "woods",
            "industry"
        ],
        "icon": "logging"
    },
    {
        "name": "Oil well",
        "tags": [
            "oil",
            "natural",
            "environment",
            "industry",
            "resources"
        ],
        "icon": "oil-well"
    },
    {
        "name": "Slaughterhouse",
        "tags": [
            "cows",
            "cattle",
            "food",
            "meat",
            "industry",
            "resources"
        ],
        "icon": "slaughterhouse"
    },
    {
        "name": "Dam",
        "tags": [
            "water",
            "natural",
            "hydro",
            "hydroelectric",
            "energy",
            "environment",
            "industry",
            "resources"
        ],
        "icon": "dam"
    },
    {
    "name": "Water",
    "tags": [
        "water",
        "natural",
        "hydro",
        "lake",
        "river",
        "ocean",
        "resources"
    ],
    "icon": "water"
    },
    {
    "name": "Wetland",
    "tags": [
        "water",
        "swamp",
        "natural"
    ],
    "icon": "wetland"
    },
    {
    "name": "Disability",
    "tags": [
        "handicap",
        "wheelchair",
        "access"
    ],
    "icon": "disability"
    },
    {
    "name": "Telephone",
    "tags": [
        "payphone",
        "call"
    ],
    "icon": "telephone"
    },
    {
    "name": "Emergency Telephone",
    "tags": [
        "payphone",
        "danger",
        "safety",
        "call"
    ],
    "icon": "emergency-telephone"
    },
    {
    "name": "Toilets",
    "tags": [
        "bathroom",
        "men",
        "women",
        "sink",
        "washroom",
        "lavatory"
    ],
    "icon": "toilets"
    },
    {
    "name": "Waste Basket",
    "tags": [
        "trash",
        "rubbish",
        "bin",
        "garbage"
    ],
    "icon": "waste-basket"
    },
    {
    "name": "Music",
    "tags": [
        "stage",
        "performance",
        "band",
        "concert",
        "venue"
    ],
    "icon": "music"
    },
    {
    "name": "Land Use",
    "tags": [
        "zoning",
        "usage",
        "area"
    ],
    "icon": "land-use"
    },
    {
    "name": "City",
    "tags": [
        "area",
        "point",
        "place",
        "urban"
    ],
    "icon": "city"
    },
    {
    "name": "Town",
    "tags": [
        "area",
        "point",
        "place",
        "small"
    ],
    "icon": "town"
    },
    {
    "name": "Village",
    "tags": [
        "area",
        "point",
        "place",
        "small",
        "rural"
    ],
    "icon": "village"
    },
    {
    "name": "Farm",
    "tags": [
        "building",
        "farming",
        "crops",
        "plants",
        "agriculture",
        "rural"
    ],
    "icon": "farm"
    },
    {
    "name": "Bakery",
    "tags": [
        "bakery",
        "pastry",
        "croissant",
        "food",
        "shop",
        "bread"
    ],
    "icon": "bakery"
    },
	{
    "name": "Dog Park",
    "tags": [
        "dog",
        "pet"
    ],
    "icon": "dog-park"
    },
   {
    "name": "Lighthouse",
    "tags": [
        "building",
        "navigation",
        "nautical",
        "ocean",
        "logistics"
    ],
    "icon": "lighthouse"
    },
    {
    "name": "Clothing Store",
    "tags": [
        "clothing",
        "store",
        "shop"
    ],
    "icon": "clothing-store"
    },
    {
    "name": "Polling Place",
    "tags": [
        "poll",
        "polling",
        "vote"
    ],
    "icon": "polling-place"
    },
    {
    "name": "Playground",
    "tags": [
        "playground",
        "play",
        "park",
        "children"
    ],
    "icon": "playground"
    },
    {
    "name": "Entrance",
    "tags": [
        "entrance",
        "enter",
        "subway",
        "rail"
    ],
    "icon": "entrance"
    },
    {
    "name": "Heart",
    "tags": [
        "heart",
        "love",
        "shape",
        "shapes",
        "wedding"
    ],
    "icon": "heart"
    },
    {
    "name": "London Underground",
    "tags": [
        "deprecated"
    ],
    "icon": "london-underground"
    },
    {
    "name": "Minefield",
    "tags": [
        "deprecated"
    ],
    "icon": "minefield"
    },
    {
    "name": "Rail Underground",
    "tags": [
        "deprecated"
    ],
    "icon": "rail-underground"
    },
    {
    "name": "Rail Above",
    "tags": [
        "deprecated"
    ],
    "icon": "rail-above"
    },
    {
     "name": "Camera",
     "tags": [
         "camera",
         "photo",
         "commercial",
         "shop"
     ],
     "icon": "camera"
    },
    {
    "name": "Laundry",
    "tags": [
        "laundry",
        "washing machine",
        "dry_cleaning",
        "commercial",
        "store"
    ],
    "icon": "laundry"
    },
    {
        "name": "Car",
        "tags": [
            "car",
            "auto",
            "vehicle",
            "transportation"
        ],
        "icon": "car"
    },
    {
    "name": "Suitcase",
    "tags": [
      "suitcase",
      "travel",
      "travel agency",
      "commercial",
      "store"
    ],
    "icon": "suitcase"
    }
]

},{}],26:[function(require,module,exports){
/* http://nanobar.micronube.com/  ||  https://github.com/jacoborus/nanobar/    MIT LICENSE */
var Nanobar = (function () {

	'use strict';
	var addCss, animation, transEvent, createBar, Nanobar,
		css = '.nanobar{float:left;width:100%;height:4px;z-index:9999;}.nanobarbar{width:0;height:100%;float:left;transition:all .3s;}',
		head = document.head || document.getElementsByTagName( 'head' )[0];


	// Create and insert style element in head if not exists
	addCss = function () {
		var s = document.getElementById( 'nanobar-style' );

		if (s === null) {
			s = document.createElement( 'style' );
			s.type = 'text/css';
			s.id = 'nanobar-style';

			head.insertBefore(s, head.firstChild);

			if (s.styleSheet) {   // IE
				s.styleSheet.cssText = css;
			} else {              // the world
				s.appendChild( document.createTextNode( css ));
			}
		}
	}


	// crossbrowser transition animation
	animation = function (){
		var el = document.createElement('fakeelement'),
			transitions = {
			'transition':'transitionend',
			'OTransition':'oTransitionEnd',
			'MozTransition':'transitionend',
			'WebkitTransition':'webkitTransitionEnd'
		}, t;

		for(t in transitions){
			if( el.style[t] !== undefined ){
				return transitions[t];
			}
		}
	};

	// get specific browser animation transition
	transEvent = animation();



	createBar = function ( cont ) {
		// create progress element
		var bar = document.createElement( 'div' );
		bar.setAttribute( 'class', 'nanobarbar' );
		bar.style.background = cont.opts.bg;
		bar.setAttribute( 'on' , '1');
		cont.cont.appendChild( bar );


		// detect transitions ends
		transEvent && bar.addEventListener( transEvent, function() {
			if (bar.style.width === '100%' && bar.getAttribute( 'on' ) === '1' ) {
				bar.setAttribute( 'on' , 0);

				// remove bar from array list
				cont.bars.pop();

				// reduce bar and remove DOM element with delay
				bar.style.height = 0;
				setTimeout( function () {
					cont.cont.removeChild( bar );
				}, 300);
			}
		});

		return bar;
	}



	Nanobar = function (opt) {

		var opts = this.opts = opt || {},
			cont;

		// set options
		opts.bg = opts.bg || '#000';
		this.bars = [];

		// append style
		addCss();

		// create bar container
		cont = this.cont = document.createElement( 'div' );
		cont.setAttribute( 'class', 'nanobar' );
		if (opts.id) {
			cont.id = opts.id;
		}
		if (!opts.target) {
			cont.style.position = 'fixed';
			cont.style.top = '0';
		} else {
			cont.style.position = 'relative';
		}

		// insert container
		if (!opts.target) {
			document.getElementsByTagName( 'body' )[0].appendChild( cont );
		} else {
			opts.target.insertBefore( cont, opts.target.firstChild);
		}

		return this.init();
	};



	Nanobar.prototype.init = function () {
		// create and insert bar in DOM and this.bars array
		var bar =  createBar( this );
		this.bars.unshift( bar);
	};


	Nanobar.prototype.go = function (p) {
		// expand bar
		this.bars[0].style.width = p + '%';

		// create new bar at progress end
		if (p == 100) {
			this.init();
		}
	};

	return Nanobar;
})();


module.exports = Nanobar;

},{}],27:[function(require,module,exports){
module.exports=[{
  "name": "Airport (Black)",
  "tags": [
    "airport",
    "plane",
    "travel"
  ],
  "icon": "airport-black"
},{
  "name": "Airport (White)",
  "tags": [
    "airport",
    "plane",
    "travel"
  ],
  "icon": "airport-white"
},{
  "name": "Amphitheater (Black)",
  "tags": [
    "amphitheater",
    "theater",
    "leisure"
  ],
  "icon": "amphitheater-black"
},{
  "name": "Amphitheater (White)",
  "tags": [
    "amphitheater",
    "theater",
    "leisure"
  ],
  "icon": "amphitheater-white"
},{
  "name": "Boat Launch (Black)",
  "tags": [
    "boats",
    "sailing",
    "recreation"
  ],
  "icon": "boat-launch-black"
},{
  "name": "Boat Launch (White)",
  "tags": [
    "boats",
    "sailing",
    "recreation"
  ],
  "icon": "boat-launch-white"
},{
  "name": "Bike Trail (Black)",
  "tags": [
    "bike",
    "cycling",
    "trail"
  ],
  "icon": "bike-trail-black"
},{
  "name": "Bike Trail (White)",
  "tags": [
    "bike",
    "cycling",
    "trail"
  ],
  "icon": "bike-trail-white"
},{
  "name": "Camping (Black)",
  "tags": [
    "camp",
    "campsite",
    "tent"
  ],
  "icon": "camping-black"
},{
  "name": "Camping (White)",
  "tags": [
    "camp",
    "campsite",
    "tent"
  ],
  "icon": "camping-white"
},{
  "name": "Bus and Shuttle Stop (Black)",
  "tags": [
    "bus",
    "shuttle",
    "transportation"
  ],
  "icon": "bus-shuttle-stop-black"
},{
  "name": "Bus and Shuttle Stop (White)",
  "tags": [
    "bus",
    "shuttle",
    "transportation"
  ],
  "icon": "bus-shuttle-stop-white"
},{
  "name": "Food Service (Black)",
  "tags": [
    "food",
    "restaurant",
    "dining"
  ],
  "icon": "food-service-black"
},{
  "name": "Food Service (White)",
  "tags": [
    "food",
    "restaurant",
    "dining"
  ],
  "icon": "food-service-white"
},{
  "name": "Gas Station (Black)",
  "tags": [
    "gas",
    "fuel",
    "service"
  ],
  "icon": "gas-station-black"
},{
  "name": "Gas Station (White)",
  "tags": [
    "gas",
    "fuel",
    "service"
  ],
  "icon": "gas-station-white"
},{
  "name": "Information (Black)",
  "tags": [
    "information",
    "sevice",
    ""
  ],
  "icon": "information-black"
},{
  "name": "Information (White)",
  "tags": [
    "information",
    "sevice",
    ""
  ],
  "icon": "information-white"
},{
  "name": "Lodging (Black)",
  "tags": [
    "hotel",
    "motel",
    "lodging"
  ],
  "icon": "lodging-black"
},{
  "name": "Lodging (White)",
  "tags": [
    "hotel",
    "motel",
    "lodging"
  ],
  "icon": "lodging-white"
},{
  "name": "Parking (Black)",
  "tags": [
    "parking",
    "park",
    ""
  ],
  "icon": "parking-black"
},{
  "name": "Parking (White)",
  "tags": [
    "parking",
    "park",
    ""
  ],
  "icon": "parking-white"
},{
  "name": "Picnic Area (Black)",
  "tags": [
    "picnic",
    "recreation",
    ""
  ],
  "icon": "picnic-black"
},{
  "name": "Picnic Area (White)",
  "tags": [
    "picnic",
    "recreation",
    ""
  ],
  "icon": "picnic-white"
},{
  "name": "Ranger Station (Black)",
  "tags": [
    "ranger station",
    "ranger",
    ""
  ],
  "icon": "ranger-station-black"
},{
  "name": "Ranger Station (White)",
  "tags": [
    "ranger station",
    "ranger",
    ""
  ],
  "icon": "ranger-station-white"
},{
  "name": "Restroom (Black)",
  "tags": [
    "restroom",
    "bathroom",
    "toilet"
  ],
  "icon": "restroom-black"
},{
  "name": "Restroom (White)",
  "tags": [
    "restroom",
    "bathroom",
    "toilet"
  ],
  "icon": "restroom-white"
},{
  "name": "Store (Black)",
  "tags": [
    "store",
    "food",
    "shopping"
  ],
  "icon": "store-black"
},{
  "name": "Store (White)",
  "tags": [
    "store",
    "food",
    "shopping"
  ],
  "icon": "store-white"
},{
  "name": "First Aid (Black)",
  "tags": [
    "first aid",
    "medical",
    ""
  ],
  "icon": "first-aid-black"
},{
  "name": "First Aid (White)",
  "tags": [
    "first aid",
    "medical",
    ""
  ],
  "icon": "first-aid-white"
},{
  "name": "Campfire (Black)",
  "tags": [
    "campfire",
    "",
    ""
  ],
  "icon": "campfire-black"
},{
  "name": "Campfire (White)",
  "tags": [
    "campfire",
    "",
    ""
  ],
  "icon": "campfire-white"
},{
  "name": "Canoe Access (Black)",
  "tags": [
    "canoe access",
    "canoe",
    "recreation"
  ],
  "icon": "canoe-access-black"
},{
  "name": "Canoe Access (White)",
  "tags": [
    "canoe access",
    "canoe",
    "recreation"
  ],
  "icon": "canoe-access-white"
},{
  "name": "Cross Country Ski Trail (Black)",
  "tags": [
    "cross country ski trail",
    "skiing",
    "cross country"
  ],
  "icon": "cross-country-ski-trail-black"
},{
    "name": "Cross Country Ski Trail (White)",
    "tags": [
      "cross country ski trail",
      "skiing",
      "cross country"
    ],
    "icon": "cross-country-ski-trail-white"
},{
    "name": "Drinking Water (Black)",
    "tags": [
      "drinking water",
      "water"
    ],
    "icon": "drinking-water-black"
},{
    "name": "Drinking Water (White)",
    "tags": [
      "drinking water",
      "water"
    ],
    "icon": "drinking-water-white"
},{
    "name": "Fishing (Black)",
    "tags": [
      "fishing",
      "recreation"
    ],
    "icon": "fishing-black"
},{
    "name": "Fishing (White)",
    "tags": [
      "fishing",
      "recreation",
      ""
    ],
    "icon": "fishing-white"
},{
    "name": "Downhill Skiing (Black)",
    "tags": [
      "downhill skiing",
      "ski",
      "recreation"
    ],
    "icon": "downhill-skiing-black"
},{
    "name": "Downhill Skiing (White)",
    "tags": [
      "downhill skiing",
      "ski",
      "recreation"
    ],
    "icon": "downhill-skiing-white"
},{
    "name": "4 Wheel Drive (Black)",
    "tags": [
      "4 wheel drive",
      "off road",
      ""
    ],
    "icon": "4-wheel-drive-black"
},{
    "name": "4 Wheel Drive (White)",
    "tags": [
      "4 wheel drive",
      "off road",
      ""
    ],
    "icon": "4-wheel-drive-white"
},{
    "name": "Golfing (Black)",
    "tags": [
      "golfing",
      "golf",
      ""
    ],
    "icon": "golfing-black"
},{
    "name": "Golfing (White)",
    "tags": [
      "golifing",
      "golf",
      ""
    ],
    "icon": "golfing-white"
},{
    "name": "Horseback Riding (Black)",
    "tags": [
      "horseback riding",
      "horeseback rental",
      "horseback tour"
    ],
    "icon": "horseback-riding-black"
},{
    "name": "Horseback Riding (White)",
    "tags": [
      "horseback riding",
      "horeseback rental",
      "horseback tour"
    ],
    "icon": "horseback-riding-white"
},{
    "name": "Hospital (Black)",
    "tags": [
      "hospital",
      "",
      ""
    ],
    "icon": "hospital-black"
},{
    "name": "Hospital (White)",
    "tags": [
      "hospital",
      "",
      ""
    ],
    "icon": "hospital-white"
},{
    "name": "Ice Skating (Black)",
    "tags": [
      "ice skating",
      "skating",
      ""
    ],
    "icon": "ice-skating-black"
},{
  "name": "Ice Skating (White)",
  "tags": [
    "ice skating",
    "skating"
  ],
  "icon": "ice-skating-white"
},{
  "name": "Litter Receptacle (Black)",
  "tags": [
    "litter receptacle",
    "trash can"
  ],
  "icon": "litter-receptacle-black"
},{
  "name": "Litter Receptacle (White)",
  "tags": [
    "litter receptacle",
    "trash can"
  ],
  "icon": "litter-receptacle-white"
},{
  "name": "Motor Bike Trail (Black)",
  "tags": [
    "motor bike trail"
  ],
  "icon": "motor-bike-trail-black"
},{
  "name": "Motor Bike Trail (White)",
  "tags": [
    "motor bike trail"
  ],
  "icon": "motor-bike-trail-white"
},{
  "name": "Marina (Black)",
  "tags": [
    "marina"
  ],
  "icon": "marina-black"
},{
  "name": "Marina (White)",
  "tags": [
    "marina"
  ],
  "icon": "marina-white"
},{
  "name": "Pets on Leash (Black)",
  "tags": [
    "pets on leash"
  ],
  "icon": "pets-on-leash-black"
},{
  "name": "Pets on Leash (White)",
  "tags": [
    "pets on leash"
  ],
  "icon": "pets-on-leash-white"
},{
  "name": "Bear (Black)",
  "tags": [
    "bear"
  ],
  "icon": "bear-black"
},{
  "name": "Bear (White)",
  "tags": [
    "bear"
  ],
  "icon": "bear-white"
}]

},{}],28:[function(require,module,exports){
/*!
  * Reqwest! A general purpose XHR connection manager
  * license MIT (c) Dustin Diaz 2014
  * https://github.com/ded/reqwest
  */

!function (name, context, definition) {
  if (typeof module != 'undefined' && module.exports) module.exports = definition()
  else if (typeof define == 'function' && define.amd) define(definition)
  else context[name] = definition()
}('reqwest', this, function () {

  var win = window
    , doc = document
    , twoHundo = /^(20\d|1223)$/
    , byTag = 'getElementsByTagName'
    , readyState = 'readyState'
    , contentType = 'Content-Type'
    , requestedWith = 'X-Requested-With'
    , head = doc[byTag]('head')[0]
    , uniqid = 0
    , callbackPrefix = 'reqwest_' + (+new Date())
    , lastValue // data stored by the most recent JSONP callback
    , xmlHttpRequest = 'XMLHttpRequest'
    , xDomainRequest = 'XDomainRequest'
    , noop = function () {}

    , isArray = typeof Array.isArray == 'function'
        ? Array.isArray
        : function (a) {
            return a instanceof Array
          }

    , defaultHeaders = {
          'contentType': 'application/x-www-form-urlencoded'
        , 'requestedWith': xmlHttpRequest
        , 'accept': {
              '*':  'text/javascript, text/html, application/xml, text/xml, */*'
            , 'xml':  'application/xml, text/xml'
            , 'html': 'text/html'
            , 'text': 'text/plain'
            , 'json': 'application/json, text/javascript'
            , 'js':   'application/javascript, text/javascript'
          }
      }

    , xhr = function(o) {
        // is it x-domain
        if (o['crossOrigin'] === true) {
          var xhr = win[xmlHttpRequest] ? new XMLHttpRequest() : null
          if (xhr && 'withCredentials' in xhr) {
            return xhr
          } else if (win[xDomainRequest]) {
            return new XDomainRequest()
          } else {
            throw new Error('Browser does not support cross-origin requests')
          }
        } else if (win[xmlHttpRequest]) {
          return new XMLHttpRequest()
        } else {
          return new ActiveXObject('Microsoft.XMLHTTP')
        }
      }
    , globalSetupOptions = {
        dataFilter: function (data) {
          return data
        }
      }

  function handleReadyState(r, success, error) {
    return function () {
      // use _aborted to mitigate against IE err c00c023f
      // (can't read props on aborted request objects)
      if (r._aborted) return error(r.request)
      if (r.request && r.request[readyState] == 4) {
        r.request.onreadystatechange = noop
        if (twoHundo.test(r.request.status)) success(r.request)
        else
          error(r.request)
      }
    }
  }

  function setHeaders(http, o) {
    var headers = o['headers'] || {}
      , h

    headers['Accept'] = headers['Accept']
      || defaultHeaders['accept'][o['type']]
      || defaultHeaders['accept']['*']

    // breaks cross-origin requests with legacy browsers
    if (!o['crossOrigin'] && !headers[requestedWith]) headers[requestedWith] = defaultHeaders['requestedWith']
    if (!headers[contentType]) headers[contentType] = o['contentType'] || defaultHeaders['contentType']
    for (h in headers)
      headers.hasOwnProperty(h) && 'setRequestHeader' in http && http.setRequestHeader(h, headers[h])
  }

  function setCredentials(http, o) {
    if (typeof o['withCredentials'] !== 'undefined' && typeof http.withCredentials !== 'undefined') {
      http.withCredentials = !!o['withCredentials']
    }
  }

  function generalCallback(data) {
    lastValue = data
  }

  function urlappend (url, s) {
    return url + (/\?/.test(url) ? '&' : '?') + s
  }

  function handleJsonp(o, fn, err, url) {
    var reqId = uniqid++
      , cbkey = o['jsonpCallback'] || 'callback' // the 'callback' key
      , cbval = o['jsonpCallbackName'] || reqwest.getcallbackPrefix(reqId)
      , cbreg = new RegExp('((^|\\?|&)' + cbkey + ')=([^&]+)')
      , match = url.match(cbreg)
      , script = doc.createElement('script')
      , loaded = 0
      , isIE10 = navigator.userAgent.indexOf('MSIE 10.0') !== -1

    if (match) {
      if (match[3] === '?') {
        url = url.replace(cbreg, '$1=' + cbval) // wildcard callback func name
      } else {
        cbval = match[3] // provided callback func name
      }
    } else {
      url = urlappend(url, cbkey + '=' + cbval) // no callback details, add 'em
    }

    win[cbval] = generalCallback

    script.type = 'text/javascript'
    script.src = url
    script.async = true
    if (typeof script.onreadystatechange !== 'undefined' && !isIE10) {
      // need this for IE due to out-of-order onreadystatechange(), binding script
      // execution to an event listener gives us control over when the script
      // is executed. See http://jaubourg.net/2010/07/loading-script-as-onclick-handler-of.html
      script.htmlFor = script.id = '_reqwest_' + reqId
    }

    script.onload = script.onreadystatechange = function () {
      if ((script[readyState] && script[readyState] !== 'complete' && script[readyState] !== 'loaded') || loaded) {
        return false
      }
      script.onload = script.onreadystatechange = null
      script.onclick && script.onclick()
      // Call the user callback with the last value stored and clean up values and scripts.
      fn(lastValue)
      lastValue = undefined
      head.removeChild(script)
      loaded = 1
    }

    // Add the script to the DOM head
    head.appendChild(script)

    // Enable JSONP timeout
    return {
      abort: function () {
        script.onload = script.onreadystatechange = null
        err({}, 'Request is aborted: timeout', {})
        lastValue = undefined
        head.removeChild(script)
        loaded = 1
      }
    }
  }

  function getRequest(fn, err) {
    var o = this.o
      , method = (o['method'] || 'GET').toUpperCase()
      , url = typeof o === 'string' ? o : o['url']
      // convert non-string objects to query-string form unless o['processData'] is false
      , data = (o['processData'] !== false && o['data'] && typeof o['data'] !== 'string')
        ? reqwest.toQueryString(o['data'])
        : (o['data'] || null)
      , http
      , sendWait = false

    // if we're working on a GET request and we have data then we should append
    // query string to end of URL and not post data
    if ((o['type'] == 'jsonp' || method == 'GET') && data) {
      url = urlappend(url, data)
      data = null
    }

    if (o['type'] == 'jsonp') return handleJsonp(o, fn, err, url)

    // get the xhr from the factory if passed
    // if the factory returns null, fall-back to ours
    http = (o.xhr && o.xhr(o)) || xhr(o)

    http.open(method, url, o['async'] === false ? false : true)
    setHeaders(http, o)
    setCredentials(http, o)
    if (win[xDomainRequest] && http instanceof win[xDomainRequest]) {
        http.onload = fn
        http.onerror = err
        // NOTE: see
        // http://social.msdn.microsoft.com/Forums/en-US/iewebdevelopment/thread/30ef3add-767c-4436-b8a9-f1ca19b4812e
        http.onprogress = function() {}
        sendWait = true
    } else {
      http.onreadystatechange = handleReadyState(this, fn, err)
    }
    o['before'] && o['before'](http)
    if (sendWait) {
      setTimeout(function () {
        http.send(data)
      }, 200)
    } else {
      http.send(data)
    }
    return http
  }

  function Reqwest(o, fn) {
    this.o = o
    this.fn = fn

    init.apply(this, arguments)
  }

  function setType(header) {
    // json, javascript, text/plain, text/html, xml
    if (header.match('json')) return 'json'
    if (header.match('javascript')) return 'js'
    if (header.match('text')) return 'html'
    if (header.match('xml')) return 'xml'
  }

  function init(o, fn) {

    this.url = typeof o == 'string' ? o : o['url']
    this.timeout = null

    // whether request has been fulfilled for purpose
    // of tracking the Promises
    this._fulfilled = false
    // success handlers
    this._successHandler = function(){}
    this._fulfillmentHandlers = []
    // error handlers
    this._errorHandlers = []
    // complete (both success and fail) handlers
    this._completeHandlers = []
    this._erred = false
    this._responseArgs = {}

    var self = this

    fn = fn || function () {}

    if (o['timeout']) {
      this.timeout = setTimeout(function () {
        self.abort()
      }, o['timeout'])
    }

    if (o['success']) {
      this._successHandler = function () {
        o['success'].apply(o, arguments)
      }
    }

    if (o['error']) {
      this._errorHandlers.push(function () {
        o['error'].apply(o, arguments)
      })
    }

    if (o['complete']) {
      this._completeHandlers.push(function () {
        o['complete'].apply(o, arguments)
      })
    }

    function complete (resp) {
      o['timeout'] && clearTimeout(self.timeout)
      self.timeout = null
      while (self._completeHandlers.length > 0) {
        self._completeHandlers.shift()(resp)
      }
    }

    function success (resp) {
      var type = o['type'] || setType(resp.getResponseHeader('Content-Type'))
      resp = (type !== 'jsonp') ? self.request : resp
      // use global data filter on response text
      var filteredResponse = globalSetupOptions.dataFilter(resp.responseText, type)
        , r = filteredResponse
      try {
        resp.responseText = r
      } catch (e) {
        // can't assign this in IE<=8, just ignore
      }
      if (r) {
        switch (type) {
        case 'json':
          try {
            resp = win.JSON ? win.JSON.parse(r) : eval('(' + r + ')')
          } catch (err) {
            return error(resp, 'Could not parse JSON in response', err)
          }
          break
        case 'js':
          resp = eval(r)
          break
        case 'html':
          resp = r
          break
        case 'xml':
          resp = resp.responseXML
              && resp.responseXML.parseError // IE trololo
              && resp.responseXML.parseError.errorCode
              && resp.responseXML.parseError.reason
            ? null
            : resp.responseXML
          break
        }
      }

      self._responseArgs.resp = resp
      self._fulfilled = true
      fn(resp)
      self._successHandler(resp)
      while (self._fulfillmentHandlers.length > 0) {
        resp = self._fulfillmentHandlers.shift()(resp)
      }

      complete(resp)
    }

    function error(resp, msg, t) {
      resp = self.request
      self._responseArgs.resp = resp
      self._responseArgs.msg = msg
      self._responseArgs.t = t
      self._erred = true
      while (self._errorHandlers.length > 0) {
        self._errorHandlers.shift()(resp, msg, t)
      }
      complete(resp)
    }

    this.request = getRequest.call(this, success, error)
  }

  Reqwest.prototype = {
    abort: function () {
      this._aborted = true
      this.request.abort()
    }

  , retry: function () {
      init.call(this, this.o, this.fn)
    }

    /**
     * Small deviation from the Promises A CommonJs specification
     * http://wiki.commonjs.org/wiki/Promises/A
     */

    /**
     * `then` will execute upon successful requests
     */
  , then: function (success, fail) {
      success = success || function () {}
      fail = fail || function () {}
      if (this._fulfilled) {
        this._responseArgs.resp = success(this._responseArgs.resp)
      } else if (this._erred) {
        fail(this._responseArgs.resp, this._responseArgs.msg, this._responseArgs.t)
      } else {
        this._fulfillmentHandlers.push(success)
        this._errorHandlers.push(fail)
      }
      return this
    }

    /**
     * `always` will execute whether the request succeeds or fails
     */
  , always: function (fn) {
      if (this._fulfilled || this._erred) {
        fn(this._responseArgs.resp)
      } else {
        this._completeHandlers.push(fn)
      }
      return this
    }

    /**
     * `fail` will execute when the request fails
     */
  , fail: function (fn) {
      if (this._erred) {
        fn(this._responseArgs.resp, this._responseArgs.msg, this._responseArgs.t)
      } else {
        this._errorHandlers.push(fn)
      }
      return this
    }
  }

  function reqwest(o, fn) {
    return new Reqwest(o, fn)
  }

  // normalize newline variants according to spec -> CRLF
  function normalize(s) {
    return s ? s.replace(/\r?\n/g, '\r\n') : ''
  }

  function serial(el, cb) {
    var n = el.name
      , t = el.tagName.toLowerCase()
      , optCb = function (o) {
          // IE gives value="" even where there is no value attribute
          // 'specified' ref: http://www.w3.org/TR/DOM-Level-3-Core/core.html#ID-862529273
          if (o && !o['disabled'])
            cb(n, normalize(o['attributes']['value'] && o['attributes']['value']['specified'] ? o['value'] : o['text']))
        }
      , ch, ra, val, i

    // don't serialize elements that are disabled or without a name
    if (el.disabled || !n) return

    switch (t) {
    case 'input':
      if (!/reset|button|image|file/i.test(el.type)) {
        ch = /checkbox/i.test(el.type)
        ra = /radio/i.test(el.type)
        val = el.value
        // WebKit gives us "" instead of "on" if a checkbox has no value, so correct it here
        ;(!(ch || ra) || el.checked) && cb(n, normalize(ch && val === '' ? 'on' : val))
      }
      break
    case 'textarea':
      cb(n, normalize(el.value))
      break
    case 'select':
      if (el.type.toLowerCase() === 'select-one') {
        optCb(el.selectedIndex >= 0 ? el.options[el.selectedIndex] : null)
      } else {
        for (i = 0; el.length && i < el.length; i++) {
          el.options[i].selected && optCb(el.options[i])
        }
      }
      break
    }
  }

  // collect up all form elements found from the passed argument elements all
  // the way down to child elements; pass a '<form>' or form fields.
  // called with 'this'=callback to use for serial() on each element
  function eachFormElement() {
    var cb = this
      , e, i
      , serializeSubtags = function (e, tags) {
          var i, j, fa
          for (i = 0; i < tags.length; i++) {
            fa = e[byTag](tags[i])
            for (j = 0; j < fa.length; j++) serial(fa[j], cb)
          }
        }

    for (i = 0; i < arguments.length; i++) {
      e = arguments[i]
      if (/input|select|textarea/i.test(e.tagName)) serial(e, cb)
      serializeSubtags(e, [ 'input', 'select', 'textarea' ])
    }
  }

  // standard query string style serialization
  function serializeQueryString() {
    return reqwest.toQueryString(reqwest.serializeArray.apply(null, arguments))
  }

  // { 'name': 'value', ... } style serialization
  function serializeHash() {
    var hash = {}
    eachFormElement.apply(function (name, value) {
      if (name in hash) {
        hash[name] && !isArray(hash[name]) && (hash[name] = [hash[name]])
        hash[name].push(value)
      } else hash[name] = value
    }, arguments)
    return hash
  }

  // [ { name: 'name', value: 'value' }, ... ] style serialization
  reqwest.serializeArray = function () {
    var arr = []
    eachFormElement.apply(function (name, value) {
      arr.push({name: name, value: value})
    }, arguments)
    return arr
  }

  reqwest.serialize = function () {
    if (arguments.length === 0) return ''
    var opt, fn
      , args = Array.prototype.slice.call(arguments, 0)

    opt = args.pop()
    opt && opt.nodeType && args.push(opt) && (opt = null)
    opt && (opt = opt.type)

    if (opt == 'map') fn = serializeHash
    else if (opt == 'array') fn = reqwest.serializeArray
    else fn = serializeQueryString

    return fn.apply(null, args)
  }

  reqwest.toQueryString = function (o, trad) {
    var prefix, i
      , traditional = trad || false
      , s = []
      , enc = encodeURIComponent
      , add = function (key, value) {
          // If value is a function, invoke it and return its value
          value = ('function' === typeof value) ? value() : (value == null ? '' : value)
          s[s.length] = enc(key) + '=' + enc(value)
        }
    // If an array was passed in, assume that it is an array of form elements.
    if (isArray(o)) {
      for (i = 0; o && i < o.length; i++) add(o[i]['name'], o[i]['value'])
    } else {
      // If traditional, encode the "old" way (the way 1.3.2 or older
      // did it), otherwise encode params recursively.
      for (prefix in o) {
        if (o.hasOwnProperty(prefix)) buildParams(prefix, o[prefix], traditional, add)
      }
    }

    // spaces should be + according to spec
    return s.join('&').replace(/%20/g, '+')
  }

  function buildParams(prefix, obj, traditional, add) {
    var name, i, v
      , rbracket = /\[\]$/

    if (isArray(obj)) {
      // Serialize array item.
      for (i = 0; obj && i < obj.length; i++) {
        v = obj[i]
        if (traditional || rbracket.test(prefix)) {
          // Treat each array item as a scalar.
          add(prefix, v)
        } else {
          buildParams(prefix + '[' + (typeof v === 'object' ? i : '') + ']', v, traditional, add)
        }
      }
    } else if (obj && obj.toString() === '[object Object]') {
      // Serialize object item.
      for (name in obj) {
        buildParams(prefix + '[' + name + ']', obj[name], traditional, add)
      }

    } else {
      // Serialize scalar item.
      add(prefix, obj)
    }
  }

  reqwest.getcallbackPrefix = function () {
    return callbackPrefix
  }

  // jQuery and Zepto compatibility, differences can be remapped here so you can call
  // .ajax.compat(options, callback)
  reqwest.compat = function (o, fn) {
    if (o) {
      o['type'] && (o['method'] = o['type']) && delete o['type']
      o['dataType'] && (o['type'] = o['dataType'])
      o['jsonpCallback'] && (o['jsonpCallbackName'] = o['jsonpCallback']) && delete o['jsonpCallback']
      o['jsonp'] && (o['jsonpCallback'] = o['jsonp'])
    }
    return new Reqwest(o, fn)
  }

  reqwest.ajaxSetup = function (options) {
    options = options || {}
    for (var k in options) {
      globalSetupOptions[k] = options[k]
    }
  }

  return reqwest
});

},{}],29:[function(require,module,exports){
(function (process){
toGeoJSON = (function() {
    'use strict';

    var removeSpace = (/\s*/g),
        trimSpace = (/^\s*|\s*$/g),
        splitSpace = (/\s+/);
    // generate a short, numeric hash of a string
    function okhash(x) {
        if (!x || !x.length) return 0;
        for (var i = 0, h = 0; i < x.length; i++) {
            h = ((h << 5) - h) + x.charCodeAt(i) | 0;
        } return h;
    }
    // all Y children of X
    function get(x, y) { return x.getElementsByTagName(y); }
    function attr(x, y) { return x.getAttribute(y); }
    function attrf(x, y) { return parseFloat(attr(x, y)); }
    // one Y child of X, if any, otherwise null
    function get1(x, y) { var n = get(x, y); return n.length ? n[0] : null; }
    // https://developer.mozilla.org/en-US/docs/Web/API/Node.normalize
    function norm(el) { if (el.normalize) { el.normalize(); } return el; }
    // cast array x into numbers
    function numarray(x) {
        for (var j = 0, o = []; j < x.length; j++) o[j] = parseFloat(x[j]);
        return o;
    }
    function clean(x) {
        var o = {};
        for (var i in x) if (x[i]) o[i] = x[i];
        return o;
    }
    // get the content of a text node, if any
    function nodeVal(x) { if (x) {norm(x);} return x && x.firstChild && x.firstChild.nodeValue; }
    // get one coordinate from a coordinate array, if any
    function coord1(v) { return numarray(v.replace(removeSpace, '').split(',')); }
    // get all coordinates from a coordinate array as [[],[]]
    function coord(v) {
        var coords = v.replace(trimSpace, '').split(splitSpace),
            o = [];
        for (var i = 0; i < coords.length; i++) {
            o.push(coord1(coords[i]));
        }
        return o;
    }
    function coordPair(x) {
        var ll = [attrf(x, 'lon'), attrf(x, 'lat')],
            ele = get1(x, 'ele');
        if (ele) ll.push(parseFloat(nodeVal(ele)));
        return ll;
    }

    // create a new feature collection parent object
    function fc() {
        return {
            type: 'FeatureCollection',
            features: []
        };
    }

    var serializer;
    if (typeof XMLSerializer !== 'undefined') {
        serializer = new XMLSerializer();
    // only require xmldom in a node environment
    } else if (typeof exports === 'object' && typeof process === 'object' && !process.browser) {
        serializer = new (require('xmldom').XMLSerializer)();
    }
    function xml2str(str) { return serializer.serializeToString(str); }

    var t = {
        kml: function(doc, o) {
            o = o || {};

            var gj = fc(),
                // styleindex keeps track of hashed styles in order to match features
                styleIndex = {},
                // atomic geospatial types supported by KML - MultiGeometry is
                // handled separately
                geotypes = ['Polygon', 'LineString', 'Point', 'Track'],
                // all root placemarks in the file
                placemarks = get(doc, 'Placemark'),
                styles = get(doc, 'Style');

            for (var k = 0; k < styles.length; k++) {
                styleIndex['#' + attr(styles[k], 'id')] = okhash(xml2str(styles[k])).toString(16);
            }
            for (var j = 0; j < placemarks.length; j++) {
                gj.features = gj.features.concat(getPlacemark(placemarks[j]));
            }
            function kmlColor(v) {
                var color, opacity;
                v = v || "";
                if (v.substr(0, 1) === "#") v = v.substr(1);
                if (v.length === 6 || v.length === 3) color = v;
                if (v.length === 8) {
                    opacity = parseInt(v.substr(0, 2), 16) / 255;
                    color = v.substr(2);
                }
                return [color, isNaN(opacity) ? undefined : opacity];
            }
            function gxCoord(v) { return numarray(v.split(' ')); }
            function gxCoords(root) {
                var elems = get(root, 'coord', 'gx'), coords = [];
                for (var i = 0; i < elems.length; i++) coords.push(gxCoord(nodeVal(elems[i])));
                return coords;
            }
            function getGeometry(root) {
                var geomNode, geomNodes, i, j, k, geoms = [];
                if (get1(root, 'MultiGeometry')) return getGeometry(get1(root, 'MultiGeometry'));
                if (get1(root, 'MultiTrack')) return getGeometry(get1(root, 'MultiTrack'));
                for (i = 0; i < geotypes.length; i++) {
                    geomNodes = get(root, geotypes[i]);
                    if (geomNodes) {
                        for (j = 0; j < geomNodes.length; j++) {
                            geomNode = geomNodes[j];
                            if (geotypes[i] == 'Point') {
                                geoms.push({
                                    type: 'Point',
                                    coordinates: coord1(nodeVal(get1(geomNode, 'coordinates')))
                                });
                            } else if (geotypes[i] == 'LineString') {
                                geoms.push({
                                    type: 'LineString',
                                    coordinates: coord(nodeVal(get1(geomNode, 'coordinates')))
                                });
                            } else if (geotypes[i] == 'Polygon') {
                                var rings = get(geomNode, 'LinearRing'),
                                    coords = [];
                                for (k = 0; k < rings.length; k++) {
                                    coords.push(coord(nodeVal(get1(rings[k], 'coordinates'))));
                                }
                                geoms.push({
                                    type: 'Polygon',
                                    coordinates: coords
                                });
                            } else if (geotypes[i] == 'Track') {
                                geoms.push({
                                    type: 'LineString',
                                    coordinates: gxCoords(geomNode)
                                });
                            }
                        }
                    }
                }
                return geoms;
            }
            function getPlacemark(root) {
                var geoms = getGeometry(root), i, properties = {},
                    name = nodeVal(get1(root, 'name')),
                    styleUrl = nodeVal(get1(root, 'styleUrl')),
                    description = nodeVal(get1(root, 'description')),
                    timeSpan = get1(root, 'TimeSpan'),
                    extendedData = get1(root, 'ExtendedData'),
                    lineStyle = get1(root, 'LineStyle'),
                    polyStyle = get1(root, 'PolyStyle');

                if (!geoms.length) return [];
                if (name) properties.name = name;
                if (styleUrl && styleIndex[styleUrl]) {
                    properties.styleUrl = styleUrl;
                    properties.styleHash = styleIndex[styleUrl];
                }
                if (description) properties.description = description;
                if (timeSpan) {
                    var begin = nodeVal(get1(timeSpan, 'begin'));
                    var end = nodeVal(get1(timeSpan, 'end'));
                    properties.timespan = { begin: begin, end: end };
                }
                if (lineStyle) {
                    var linestyles = kmlColor(nodeVal(get1(lineStyle, 'color'))),
                        color = linestyles[0],
                        opacity = linestyles[1],
                        width = parseFloat(nodeVal(get1(lineStyle, 'width')));
                    if (color) properties.stroke = color;
                    if (!isNaN(opacity)) properties['stroke-opacity'] = opacity;
                    if (!isNaN(width)) properties['stroke-width'] = width;
                }
                if (polyStyle) {
                    var polystyles = kmlColor(nodeVal(get1(polyStyle, 'color'))),
                        pcolor = polystyles[0],
                        popacity = polystyles[1],
                        fill = nodeVal(get1(polyStyle, 'fill')),
                        outline = nodeVal(get1(polyStyle, 'outline'));
                    if (pcolor) properties.fill = pcolor;
                    if (!isNaN(popacity)) properties['fill-opacity'] = popacity;
                    if (fill) properties['fill-opacity'] = fill === "1" ? 1 : 0;
                    if (outline) properties['stroke-opacity'] = outline === "1" ? 1 : 0;
                }
                if (extendedData) {
                    var datas = get(extendedData, 'Data'),
                        simpleDatas = get(extendedData, 'SimpleData');

                    for (i = 0; i < datas.length; i++) {
                        properties[datas[i].getAttribute('name')] = nodeVal(get1(datas[i], 'value'));
                    }
                    for (i = 0; i < simpleDatas.length; i++) {
                        properties[simpleDatas[i].getAttribute('name')] = nodeVal(simpleDatas[i]);
                    }
                }
                return [{
                    type: 'Feature',
                    geometry: (geoms.length === 1) ? geoms[0] : {
                        type: 'GeometryCollection',
                        geometries: geoms
                    },
                    properties: properties
                }];
            }
            return gj;
        },
        gpx: function(doc, o) {
            var i,
                tracks = get(doc, 'trk'),
                routes = get(doc, 'rte'),
                waypoints = get(doc, 'wpt'),
                // a feature collection
                gj = fc();
            for (i = 0; i < tracks.length; i++) {
                gj.features.push(getTrack(tracks[i]));
            }
            for (i = 0; i < routes.length; i++) {
                gj.features.push(getRoute(routes[i]));
            }
            for (i = 0; i < waypoints.length; i++) {
                gj.features.push(getPoint(waypoints[i]));
            }
            function getPoints(node, pointname) {
                var pts = get(node, pointname), line = [];
                for (var i = 0; i < pts.length; i++) {
                    line.push(coordPair(pts[i]));
                }
                return line;
            }
            function getTrack(node) {
                var segments = get(node, 'trkseg'), track = [];
                for (var i = 0; i < segments.length; i++) {
                    track.push(getPoints(segments[i], 'trkpt'));
                }
                return {
                    type: 'Feature',
                    properties: getProperties(node),
                    geometry: {
                        type: track.length === 1 ? 'LineString' : 'MultiLineString',
                        coordinates: track.length === 1 ? track[0] : track
                    }
                };
            }
            function getRoute(node) {
                return {
                    type: 'Feature',
                    properties: getProperties(node),
                    geometry: {
                        type: 'LineString',
                        coordinates: getPoints(node, 'rtept')
                    }
                };
            }
            function getPoint(node) {
                var prop = getProperties(node);
                prop.sym = nodeVal(get1(node, 'sym'));
                return {
                    type: 'Feature',
                    properties: prop,
                    geometry: {
                        type: 'Point',
                        coordinates: coordPair(node)
                    }
                };
            }
            function getProperties(node) {
                var meta = ['name', 'desc', 'author', 'copyright', 'link',
                            'time', 'keywords'],
                    prop = {},
                    k;
                for (k = 0; k < meta.length; k++) {
                    prop[meta[k]] = nodeVal(get1(node, meta[k]));
                }
                return clean(prop);
            }
            return gj;
        }
    };
    return t;
})();

if (typeof module !== 'undefined') module.exports = toGeoJSON;

}).call(this,require("/Development/npmap/npmap.js/node_modules/browserify/node_modules/insert-module-globals/node_modules/process/browser.js"))
},{"/Development/npmap/npmap.js/node_modules/browserify/node_modules/insert-module-globals/node_modules/process/browser.js":3,"xmldom":2}],30:[function(require,module,exports){
/* global L */

var version = require('./package.json').version;

window.L.Icon.Default.imagePath = 'http://www.nps.gov/npmap/npmap.js/' + version + '/images';

L.npmap = module.exports = {
  VERSION: version,
  // Preserve order of controls because it affects the display hierarchy.
  control: {
    download: require('./src/control/download'),
    home: require('./src/control/home'),
    smallzoom: require('./src/control/smallzoom'),
    locate: require('./src/control/locate'),
    measure: require('./src/control/measure'),
    edit: require('./src/control/edit'),
    fullscreen: require('./src/control/fullscreen'),
    geocoder: require('./src/control/geocoder'),
    legend: require('./src/control/legend'),
    overview: require('./src/control/overview'),
    print: require('./src/control/print'),
    scale: require('./src/control/scale'),
    share: require('./src/control/share'),
    switcher: require('./src/control/switcher')
  },
  icon: {
    maki: require('./src/icon/maki'),
    npmaki: require('./src/icon/npmaki')
  },
  layer: {
    _cluster: require('./src/layer/cluster'),
    arcgisserver: {
      dynamic: require('./src/layer/arcgisserver/dynamic'),
      tiled: require('./src/layer/arcgisserver/tiled')
    },
    bing: require('./src/layer/bing'),
    cartodb: require('./src/layer/cartodb'),
    csv: require('./src/layer/csv'),
    geojson: require('./src/layer/geojson'),
    github: require('./src/layer/github'),
    kml: require('./src/layer/kml'),
    mapbox: require('./src/layer/mapbox'),
    spot: require('./src/layer/spot'),
    tiled: require('./src/layer/tiled'),
    wms: require('./src/layer/wms'),
    zoomify: require('./src/layer/zoomify')
  },
  map: require('./src/map'),
  popup: require('./src/popup'),
  preset: {
    baselayers: require('./src/preset/baselayers.json'),
    colors: require('./src/preset/colors.json'),
    layers: require('./src/preset/overlays.json'),
    maki: require('./node_modules/maki/_includes/maki.json'),
    npmaki: require('./node_modules/npmaki/_includes/maki.json')
  },
  tooltip: require('./src/tooltip'),
  util: {
    _: require('./src/util/util'),
    geocode: require('./src/util/geocode'),
    topojson: require('./src/util/topojson')
  }
};

},{"./node_modules/maki/_includes/maki.json":25,"./node_modules/npmaki/_includes/maki.json":27,"./package.json":31,"./src/control/download":32,"./src/control/edit":33,"./src/control/fullscreen":34,"./src/control/geocoder":35,"./src/control/home":36,"./src/control/legend":37,"./src/control/locate":38,"./src/control/measure":39,"./src/control/overview":40,"./src/control/print":41,"./src/control/scale":42,"./src/control/share":43,"./src/control/smallzoom":44,"./src/control/switcher":45,"./src/icon/maki":46,"./src/icon/npmaki":47,"./src/layer/arcgisserver/dynamic":48,"./src/layer/arcgisserver/tiled":49,"./src/layer/bing":50,"./src/layer/cartodb":51,"./src/layer/cluster":52,"./src/layer/csv":53,"./src/layer/geojson":54,"./src/layer/github":55,"./src/layer/kml":56,"./src/layer/mapbox":57,"./src/layer/spot":58,"./src/layer/tiled":59,"./src/layer/wms":60,"./src/layer/zoomify":61,"./src/map":62,"./src/popup":65,"./src/preset/baselayers.json":66,"./src/preset/colors.json":67,"./src/preset/overlays.json":68,"./src/tooltip":69,"./src/util/geocode":70,"./src/util/topojson":73,"./src/util/util":75}],31:[function(require,module,exports){
module.exports={
  "author": {
    "email": "nate_irwin@nps.gov",
    "name": "Nate Irwin",
    "url": "http://www.nps.gov/npmap/team/nate-irwin.html"
  },
  "bugs": {
    "email": "npmap@nps.gov",
    "url": "https://github.com/nationalparkservice/npmap.js/issues"
  },
  "contributors": [
    {
      "email": "james_mcandrew@partner.nps.gov",
      "name": "Jim McAndrew",
      "url": "http://www.nps.gov/npmap/team/jim-mcandrew.html"
    },
    {
      "email": "mamata_akella@partner.nps.gov",
      "name": "Mamata Akella",
      "url": "http://www.nps.gov/npmap/team/mamata-akella.html"
    }
  ],
  "dependencies": {
    "csv2geojson": "3.7.0",
    "handlebars": "1.3.0",
    "humane-js": "https://github.com/wavded/humane-js/archive/3.2.0.tar.gz",
    "leaflet": "0.7.2",
    "leaflet-draw": "0.2.2",
    "leaflet-markercluster": "https://github.com/Leaflet/Leaflet.markercluster/archive/0.4.tar.gz",
    "maki": "~0.4.0",
    "nanobar": "0.0.6",
    "npmaki": "0.4.1",
    "reqwest": "1.1.0",
    "togeojson": "0.7.0"
  },
  "description": "A JavaScript web mapping library, built as a Leaflet plugin, for the National Park Service.",
  "devDependencies": {
    "brfs": "1.0.0",
    "browserify": "3.38.0",
    "expect.js": "0.3.1",
    "grunt": "0.4.4",
    "grunt-aws-s3": "0.8.1",
    "grunt-banner": "0.2.2",
    "grunt-browserify": "2.0.1",
    "grunt-contrib-clean": "0.5.0",
    "grunt-contrib-compress": "0.7.0",
    "grunt-contrib-concat": "0.4.0",
    "grunt-contrib-copy": "0.5.0",
    "grunt-contrib-csslint": "0.2.0",
    "grunt-contrib-cssmin": "0.9.0",
    "grunt-contrib-uglify": "0.4.0",
    "grunt-curl": "1.4.0",
    "grunt-http": "1.1.0",
    "grunt-invalidate-cloudfront": "0.1.4",
    "grunt-mkdir": "0.1.1",
    "grunt-mocha-phantomjs": "0.4.3",
    "happen": "0.1.3",
    "mocha": "1.18.2",
    "mocha-phantomjs": "3.3.2",
    "sinon": "1.9.0",
    "uglify-js": "2.4.13"
  },
  "engines": {
    "node": "*"
  },
  "homepage": "http://www.nps.gov/npmap",
  "keywords": [
    "Cartography",
    "Department of Interior",
    "JavaScript",
    "Leaflet",
    "Map",
    "National Park Service",
    "NPMaki",
    "NPMap",
    "Park Tiles",
    "Places",
    "US Government",
    "Web Map"
  ],
  "licenses": [
    {
      "type": "MIT",
      "url": "https://github.com/nationalparkservice/npmap.js/blob/master/LICENSE.md"
    }
  ],
  "main": "main.js",
  "name": "npmap.js",
  "repository": {
    "type": "git",
    "url": "https://github.com/nationalparkservice/npmap.js.git"
  },
  "version": "2.0.0"
}

},{}],32:[function(require,module,exports){
/* global L */

'use strict';

var util = require('../util/util');

var DownloadControl = L.Control.extend({
  initialize: function() {
    this._li = L.DomUtil.create('li', '');
    this._button = L.DomUtil.create('button', 'download', this._li);
    this._button.title = 'Download data';
    L.DomEvent.addListener(this._button, 'click', this.download, this);

    return this;
  },
  addTo: function(map) {
    var toolbar = util.getChildElementsByClassName(map.getContainer().parentNode.parentNode, 'npmap-toolbar')[0];

    toolbar.childNodes[1].appendChild(this._li);
    toolbar.style.display = 'block';
    this._container = toolbar.parentNode.parentNode;
    this._map = map;
    util.getChildElementsByClassName(this._container.parentNode, 'npmap-map-wrapper')[0].style.top = '26px';
    return this;
  },
  download: function() {
    window.alert('The download tool has not yet been implemented.');
  }
});

L.Map.mergeOptions({
  downloadControl: false
});
L.Map.addInitHook(function() {
  if (this.options.downloadControl) {
    var options = {};

    if (typeof this.options.downloadControl === 'object') {
      options = this.options.downloadControl;
    }

    this.downloadControl = L.npmap.control.download(options).addTo(this);
  }
});

module.exports = function(options) {
  return new DownloadControl(options);
};

},{"../util/util":75}],33:[function(require,module,exports){
/* global L */
/* jshint camelcase: false */

'use strict';

var Maki = require('../icon/maki');

require('leaflet-draw');

var EditControl = L.Control.extend({
  includes: L.Mixin.Events,
  options: {
    circle: {
      metric: false
    },
    marker: {
      icon: new Maki()
    },
    polygon: {
      metric: false
    },
    polyline: {
      metric: false
    },
    position: 'topleft',
    rectangle: {
      metric: false
    }
  },
  initialize: function(options) {
    L.Util.setOptions(this, options);
    this._activeMode = null;
    this._featureGroup = new L.FeatureGroup();
    this._modes = {};
    return this;
  },
  onAdd: function(map) {
    var container = L.DomUtil.create('div', 'leaflet-control-edit leaflet-bar'),
      editId,
      editShape,
      me = this;

    if (this.options.marker) {
      this._initializeMode(container, new L.Draw.Marker(map, this.options.marker), 'Draw a marker');
    }

    if (this.options.polyline) {
      this._initializeMode(container, new L.Draw.Polyline(map, this.options.polyline), 'Draw a line');
    }

    if (this.options.polygon) {
      this._initializeMode(container, new L.Draw.Polygon(map, this.options.polygon), 'Draw a polygon');
    }

    if (this.options.rectangle) {
      this._initializeMode(container, new L.Draw.Rectangle(map, this.options.rectangle), 'Draw a rectangle');
    }

    if (this.options.circle) {
      this._initializeMode(container, new L.Draw.Circle(map, this.options.circle), 'Draw a circle');
    }

    this._featureGroup.on('click', function(e) {
      var editing = e.layer.editing,
        leafletId;

      if (editing) {
        if (editing._poly) {
          leafletId = editing._poly._leaflet_id;
        } else {
          leafletId = editing._shape._leaflet_id;
        }

        if (editId === leafletId) {
          e.layer.editing.disable();
          editId = null;
          editShape = null;
        } else {
          if (editShape) {
            editShape.editing.disable();
          }

          e.layer.editing.enable();
          editId = leafletId;
          editShape = e.layer;
        }
      } else {
        if (editShape) {
          editShape.editing.disable();
          editId = null;
          editShape = null;
        }
      }
    });
    map.addLayer(this._featureGroup);
    map.on('click', function() {
      if (editShape) {
        editShape.editing.disable();
        editId = null;
        editShape = null;
      }
    });
    map.on('draw:created', function(e) {
      me._featureGroup.addLayer(e.layer);

      if (e.layerType === 'marker') {
        e.layer.dragging.enable();
        e.layer.on('dragstart', function() {
          if (editShape) {
            editShape.editing.disable();
            editId = null;
            editShape = null;
          }
        });
      }
    });
    map.on('draw:drawstart', function() {
      if (editShape) {
        editShape.editing.disable();
        editId = null;
        editShape = null;
      }
    });

    return container;
  },
  _handlerActivated: function(e) {
    if (this._activeMode && this._activeMode.handler.enabled()) {
      this._activeMode.handler.disable();
    }

    this._activeMode = this._modes[e.handler];
    
    if (this._activeMode.button) {
      L.DomUtil.addClass(this._activeMode.button, 'pressed');
    }

    this.fire('enable');
  },
  _handlerDeactivated: function() {
    if (this._activeMode.button) {
      L.DomUtil.removeClass(this._activeMode.button, 'pressed');
    }

    this._activeMode = null;
    this.fire('disable');
  },
  _initializeMode: function(container, handler, title) {
    var type = handler.type,
      me = this,
      button = null;

    this._modes[type] = {};
    this._modes[type].handler = handler;

    if (this.options.ui) {
      button = L.DomUtil.create('button', type, container);
      button.title = title;
      L.DomEvent.disableClickPropagation(button);
      L.DomEvent.on(button, 'click', function() {
        if (me._activeMode && me._activeMode.handler.type === type) {
          me._modes[type].handler.disable();
        } else {
          me._modes[type].handler.enable();
        }
      }, this._modes[type].handler);
    }

    this._modes[type].button = button;
    this._modes[type].handler
      .on('disabled', this._handlerDeactivated, this)
      .on('enabled', this._handlerActivated, this);
  },
  activateMode: function(type) {
    this._modes[type].handler.enable();
  },
  clearShapes: function() {
    this._featureGroup.clearLayers();
  },
  deactivateMode: function(type) {
    this._modes[type].handler.disable();
  }
});

L.Map.mergeOptions({
  editControl: false
});
L.Map.addInitHook(function() {
  if (this.options.editControl) {
    var options = {};

    if (typeof this.options.drawControl === 'object') {
      options = this.options.drawControl;
    }

    options.ui = true;
    this.editControl = L.npmap.control.edit(options).addTo(this);
  } else {
    var edit = false,
      overlays = this.options.overlays;

    if (overlays && L.Util.isArray(overlays)) {
      for (var i = 0; i < overlays.length; i++) {
        if (overlays[i].edit) {
          edit = true;
          break;
        }
      }
    }

    if (edit) {
      this.editControl = L.npmap.control.edit({
        ui: false
      }).addTo(this);
    }
  }
});

module.exports = function(options) {
  return new EditControl(options);
};

},{"../icon/maki":46,"leaflet-draw":23}],34:[function(require,module,exports){
/* global L */
/*
  TODO:
    - Detect if map is in an iframe
      - If map is in an iframe, detect if it is cross-domain
        - If it is, detect if window.postMessage is supported
          - If it is, enable it (this may work, but what if there are multiple maps on a page? the parent page may need to know which map has called fullscreen,, and there is no way to do this currently)
          - If it isn't, disable the tool
        - If it isn't, try to bubble up and set necessary CSS styles on window.parent

    window.postMessage should always be called for 'enterfullscreen' and 'exitfullscreen'
    You should provide a library that makes it easy to hook up to these postMessage calls
*/

'use strict';

var util = require('../util/util');

var FullscreenControl = L.Control.extend({
  initialize: function(options) {
    this._frame = null;
    this._supported = true;

    if ((window.self !== window.top) && document.referrer !== '') {
      // The map is in an iframe.

      if (util.parseDomainFromUrl(document.referrer) === util.parseDomainFromUrl(window.location.href)) {
        try {
          this._frame = window.frameElement;

          if (this._frame) {
            this._frameBody = this._getParentDocumentBody(this._frame);
          }
        } catch (exception) {
          this._supported = false;
        }
      } else {
        this._supported = false;
      }
    }

    // TODO: Also add ARIA attributes.
    this._li = L.DomUtil.create('li', '');
    this._button = L.DomUtil.create('button', 'fullscreen enter', this._li);
    this._button.title = 'Enter fullscreen';
    L.DomEvent.addListener(this._button, 'click', this.fullscreen, this);

    return this;
  },
  _onKeyUp: function(e) {
    if (!e) {
      e = window.event;
    }

    if (this._isFullscreen === true && e.keyCode === 27) {
      this.fullscreen();
    }
  },
  addTo: function(map) {
    var toolbar = util.getChildElementsByClassName(map.getContainer().parentNode.parentNode, 'npmap-toolbar')[0];

    toolbar.childNodes[1].appendChild(this._li);
    toolbar.style.display = 'block';
    this._container = toolbar.parentNode.parentNode;
    this._isFullscreen = false;
    this._map = map;
    util.getChildElementsByClassName(this._container.parentNode, 'npmap-map-wrapper')[0].style.top = '26px';

    return this;
  },
  _getParentDocumentBody: function(el) {
    while (el.parentNode) {
      el = el.parentNode;

      if (el.tagName.toLowerCase() === 'body') {
        return el;
      }
    }

    return null;
  },
  fullscreen: function() {
    if (this._supported) {
      var body = document.body,
        utils;

      if (this._isFullscreen) {
        if (this._frame) {
          this._frameBody.style.height = this._frameBodyHeight;
          this._frameBody.style.margin = this._frameBodyMargin;
          this._frameBody.style.overflow = this._frameBodyOverflow;
          this._frameBody.style.padding = this._frameBodyPadding;
          this._frameBody.style.width = this._frameBodyWidth;
          this._frame.height = this._frameHeight;
          this._frame.style.height = this._frameHeightStyle;
          this._frame.style.left = this._frameLeft;
          this._frame.style.margin = this._frameMargin;
          this._frame.style.padding = this._framePadding;
          this._frame.style.position = this._framePosition;
          this._frame.style.top = this._frameTop;
          this._frame.style.width = this._frameWidthStyle;
          this._frame.style.zIndex = this._frameZindex;
          this._frame.width = this._frameWidth;
        }

        body.style.margin = this._bodyMargin;
        body.style.overflow = this._bodyOverflow;
        body.style.padding = this._bodyPadding;
        this._container.style.left = this._containerLeft;
        this._container.style.position = this._containerPosition;
        this._container.style.top = this._containerTop;
        L.DomEvent.removeListener(document, 'keyup', this._onKeyUp);
        this._isFullscreen = false;
        L.DomUtil.removeClass(this._button, 'exit');
        L.DomUtil.addClass(this._button, 'enter');
        this._button.title = 'Enter fullscreen';
        this._map.fire('exitfullscreen');

        if (this._frame && window.postMessage) {
          parent.postMessage('exitfullscreen', '*');

          if (this._frameBody) {
            utils = window.parent.NPMapUtils;

            if (utils && utils.fullscreenControl && utils.fullscreenControl.listeners && typeof utils.fullscreenControl.listeners.exitfullscreen === 'function') {
              utils.fullscreenControl.listeners.exitfullscreen();
            }
          }
        }
      } else {
        // TODO: You should probably capture each margin and padding side individually (e.g. padding-left).

        if (this._frame) {
          this._frameBodyHeight = this._frameBody.style.height;
          this._frameBodyMargin = this._frameBody.style.margin;
          this._frameBodyOverflow = this._frameBody.style.overflow;
          this._frameBodyPadding = this._frameBody.style.padding;
          this._frameBodyWidth = this._frameBody.style.width;
          this._frameBody.style.height = '100%';
          this._frameBody.style.margin = '0';
          this._frameBody.style.overflow = 'hidden';
          this._frameBody.style.padding = '0';
          this._frameBody.style.width = '100%';
          this._frameHeight = this._frame.height;
          this._frameHeightStyle = this._frame.style.height;
          this._frameLeft = this._frame.style.left;
          this._frameMargin = this._frame.style.margin;
          this._framePadding = this._frame.style.padding;
          this._framePosition = this._frame.style.position;
          this._frameTop = this._frame.style.top;
          this._frameWidth = this._frame.width;
          this._frameWidthStyle = this._frame.style.width;
          this._frameZindex = this._frame.style.zIndex;
          this._frame.height = '100%';
          this._frame.style.height = '100%';
          this._frame.style.left = '0';
          this._frame.style.margin = '0';
          this._frame.style.padding = '0';
          this._frame.style.position = 'fixed';
          this._frame.style.top = '0';
          this._frame.style.width = '100%';
          this._frame.style.zIndex = 9999999999;
          this._frame.width = '100%';
        }

        this._bodyMargin = body.style.margin;
        this._bodyOverflow = body.style.overflow;
        this._bodyPadding = body.style.padding;
        body.style.margin = '0';
        body.style.overflow = 'hidden';
        body.style.padding = '0';
        this._containerLeft = this._container.style.left;
        this._containerPosition = this._container.style.position;
        this._containerTop = this._container.style.top;
        this._container.style.left = '0';
        this._container.style.position = 'fixed';
        this._container.style.top = '0';
        L.DomEvent.addListener(document, 'keyup', this._onKeyUp, this);
        this._isFullscreen = true;
        L.DomUtil.removeClass(this._button, 'enter');
        L.DomUtil.addClass(this._button, 'exit');
        this._button.title = 'Exit fullscreen';
        this._map.fire('enterfullscreen');

        if (this._frame && window.postMessage) {
          parent.postMessage('enterfullscreen', '*');

          if (this._frameBody) {
            utils = window.parent.NPMapUtils;

            if (utils && utils.fullscreenControl && utils.fullscreenControl.listeners && typeof utils.fullscreenControl.listeners.enterfullscreen === 'function') {
              utils.fullscreenControl.listeners.enterfullscreen();
            }
          }
        }
      }

      this._map.invalidateSize();
    } else {
      window.alert('Sorry, but the fullscreen tool does not work for maps that are loaded in an iframe hosted from another domain.');
    }
  }
});

L.Map.mergeOptions({
  fullscreenControl: false
});
L.Map.addInitHook(function() {
  if (this.options.fullscreenControl) {
    var options = {};

    if (typeof this.options.fullscreenControl === 'object') {
      options = this.options.fullscreenControl;
    }

    this.fullscreenControl = L.npmap.control.fullscreen(options).addTo(this);
  }
});

module.exports = function(options) {
  return new FullscreenControl(options);
};

},{"../util/util":75}],35:[function(require,module,exports){
/* global L */

'use strict';

var geocode = require('../util/geocode'),
  reqwest = require('reqwest'),
  util = require('../util/util');

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
  initialize: function(options) {
    L.Util.setOptions(this, options);
    return this;
  },
  onAdd: function(map) {
    var attribution = GeocoderControl.ATTRIBUTIONS[this.options.provider.toUpperCase()],
      container = L.DomUtil.create('div', 'leaflet-control-geocoder'),
      button = this._button = L.DomUtil.create('button', 'search', container),
      input = this._input = L.DomUtil.create('input', null, container),
      stopPropagation = L.DomEvent.stopPropagation,
      ul = this._ul = L.DomUtil.create('ul', 'leaflet-control', container);

    this._initalizeNpsIndex();
    L.DomEvent.disableClickPropagation(button);
    L.DomEvent.disableClickPropagation(input);
    L.DomEvent.disableClickPropagation(ul);
    L.DomEvent
      .on(button, 'click', this._geocodeRequest, this)
      .on(button, 'mousewheel', stopPropagation)
      .on(input, 'focus', function() {
        this.value = this.value;
      })
      .on(input, 'mousewheel', stopPropagation)
      .on(ul, 'mousewheel', stopPropagation);

    this._container = container;
    button.title = 'Search';
    input.setAttribute('aria-activedescendant', null);
    input.setAttribute('aria-autocomplete', 'list');
    input.setAttribute('aria-expanded', false);
    input.setAttribute('aria-label', 'Geocode');
    input.setAttribute('aria-owns', 'geocoder_listbox');
    input.setAttribute('placeholder', 'Find a location');
    input.setAttribute('role', 'combobox');
    input.setAttribute('type', 'text');
    ul.setAttribute('id', 'geocoder_listbox');
    ul.setAttribute('role', 'listbox');

    if (attribution) {
      if (L.Util.isArray(attribution)) {
        for (var i = 0; i < attribution.length; i++) {
          map.attributionControl.addAttribution(attribution[i]);
        }
      } else {
        map.attributionControl.addAttribution(attribution);
      }
    }

    return container;
  },
  onRemove: function(map) {
    var attribution = GeocoderControl.ATTRIBUTIONS[this.options.provider.toUpperCase()];

    if (attribution) {
      if (L.Util.isArray(attribution)) {
        for (var i = 0; i < attribution.length; i++) {
          map.attributionControl.removeAttribution(attribution[i]);
        }
      } else {
        map.attributionControl.removeAttribution(attribution);
      }
    }
  },
  _checkScroll: function() {
    if (this._selected) {
      var top = util.getPosition(this._selected).top,
        bottom = top + util.getOuterDimensions(this._selected).height,
        scrollTop = this._ul.scrollTop,
        visible = [
          scrollTop,
          scrollTop + util.getOuterDimensions(this._ul).height
        ];

      if (top < visible[0]) {
        this._ul.scrollTop = top - 10;
      } else if (bottom > visible[1]) {
        this._ul.scrollTop = top - 10;
      }
    }
  },
  _clearResults: function() {
    this._ul.innerHTML = '';
    this._ul.scrollTop = 0;
    this._ul.style.display = 'none';
    this._input.setAttribute('aria-activedescendant', null);
    this._input.setAttribute('aria-expanded', false);
    this._selected = null;
    this._oldValue = '';
  },
  _geocodeRequest: function() {
    var value = this._input.value;

    if (value.length) {
      var me = this;

      me._clearResults();
      L.DomEvent.off(me._button, 'click', me._geocodeRequest);
      L.DomUtil.removeClass(me._button, 'search');
      L.DomUtil.addClass(me._button, 'working');
      geocode[me.options.provider](value, function(result) {
        L.DomEvent.on(me._button, 'click', me._geocodeRequest, me);
        L.DomUtil.addClass(me._button, 'search');
        L.DomUtil.removeClass(me._button, 'working');

        if (result && result.success) {
          if (result.results && result.results.length) {
            me._map.fitBounds(result.results[0].bounds);
          } else {
            if (result.message) {
              //NPMap.Map.notify(response.message, null, 'info');
            } else {
              //NPMap.Map.notify('That location could not be found.', null, 'info');
            }
          }
        } else {
          //NPMap.Map.notify(response.message, null, 'error');
        }
      });
    }
  },
  _handleSelect: function(li) {
    var id = li.id;

    this._clearResults();
    this._isDirty = false;
    this._input.value = this._oldValue = id;
    this._input.focus();
    this._map.fitBounds(this._bounds[id]);
    this._input.setAttribute('aria-activedescendant', id);
  },
  _initalizeNpsIndex: function() {
    var me = this;

    reqwest({
      jsonpCallbackName: 'callback',
      success: function(response) {
        me._bounds = {};
        me._oldValue = me._input.value;

        for (var key in response) {
          var value = response[key];

          if (value) {
            me._bounds[key] = [
              [value[2], value[3]],
              [value[1], value[0]]
            ];
          }
        }

        L.DomEvent.on(me._input, 'keyup', function(e) {
          var value = this.value;

          if (value) {
            var keyCode = e.keyCode;

            if (keyCode !== 13 && keyCode !== 27 && keyCode !== 38 && keyCode !== 40) {
              if (value !== me._oldValue) {
                me._isDirty = true;
                me._oldValue = value;

                if (value.length) {
                  var results = [];

                  for (var key in me._bounds) {
                    if (key.toLowerCase().indexOf(value.toLowerCase()) !== -1) {
                      results.push({
                        b: me._bounds[key],
                        d: key
                      });
                    }
                  }

                  if (results.length > 0) {
                    me._clearResults();

                    for (var i = 0; i < results.length; i++) {
                      var d = results[i].d,
                        j = d.toLowerCase().indexOf(value.toLowerCase()),
                        li = L.DomUtil.create('li', null, me._ul);

                      li.id = d;
                      li.innerHTML = (d.slice(0, j) + '<strong>' + d.slice(j, j + value.length) + '</strong>' + d.slice(j + value.length));
                      L.DomEvent.on(li, 'click', function() {
                        me._handleSelect(this);
                      });
                    }

                    me._ul.style.display = 'block';
                    me._input.setAttribute('aria-expanded', true);
                  } else {
                    me._clearResults();
                  }
                }
              }
            }
          } else {
            me._clearResults();
          }
        });
        L.DomEvent.on(me._input, 'keydown', function(e) {
          switch (e.keyCode) {
          case 13:
            if (me._selected) {
              me._handleSelect(me._selected);
            } else {
              me._geocodeRequest();
            }
            break;
          case 27:
            // Escape
            me._clearResults();
            break;
          case 38:
            // Up
            if (me._ul.style.display === 'block') {
              if (me._selected) {
                L.DomUtil.removeClass(me._selected, 'selected');
                me._selected = util.getPreviousSibling(me._selected);
              }

              if (!me._selected) {
                me._selected = me._ul.childNodes[me._ul.childNodes.length - 1];
              }

              L.DomUtil.addClass(me._selected, 'selected');
              me._checkScroll();
            }

            L.DomEvent.preventDefault(e);
            break;
          case 40:
            // Down
            if (me._ul.style.display === 'block') {
              if (me._selected) {
                L.DomUtil.removeClass(me._selected, 'selected');
                me._selected = util.getNextSibling(me._selected);
              }

              if (!me._selected) {
                me._selected = me._ul.childNodes[0];
              }

              L.DomUtil.addClass(me._selected, 'selected');
              me._checkScroll();
            }

            L.DomEvent.preventDefault(e);
            break;
          }
        });
      },
      type: 'jsonp',
      url: 'http://www.nps.gov/npmap/data/park-bounds.js'
    });
  }
});

L.Map.mergeOptions({
  geocoderControl: false
});
L.Map.addInitHook(function() {
  if (this.options.geocoderControl) {
    var options = {};

    if (typeof this.options.geocoderControl === 'object') {
      options = this.options.geocoderControl;
    }

    this.geocoderControl = L.npmap.control.geocoder(options).addTo(this);
  }
});

module.exports = function(options) {
  return new GeocoderControl(options);
};

},{"../util/geocode":70,"../util/util":75,"reqwest":28}],36:[function(require,module,exports){
/* global L */

'use strict';

var HomeControl = L.Control.extend({
  options: {
    position: 'topleft'
  },
  initialize: function(options) {
    L.Util.extend(this.options, options);
    return this;
  },
  onAdd: function() {
    var container = L.DomUtil.create('div', 'leaflet-control-home leaflet-bar leaflet-control'),
      button = L.DomUtil.create('button', 'leaflet-bar-single', container);

    button.title = 'Pan/zoom to initial extent';

    L.DomEvent.disableClickPropagation(button);
    L.DomEvent
      .on(button, 'click', L.DomEvent.preventDefault)
      .on(button, 'click', this.toHome, this);

    return container;
  },
  toHome: function() {
    var map = this._map,
      options = map.options;

    map.setView(options.center, options.zoom);
    map.closePopup();
  }
});

L.Map.mergeOptions({
  homeControl: true
});
L.Map.addInitHook(function() {
  if (this.options.homeControl) {
    var options = {};

    if (typeof this.options.homeControl === 'object') {
      options = this.options.homeControl;
    }

    this.homeControl = L.npmap.control.home(options).addTo(this);
  }
});

module.exports = function(options) {
  return new HomeControl(options);
};

},{}],37:[function(require,module,exports){
/* globals L */

var LegendControl = L.Control.extend({
  options: {
    position: 'topright'
  },
  _html: null,
  initialize: function(options) {
    L.Util.setOptions(this, options);
    this._container = L.DomUtil.create('div', 'leaflet-control-legend');
    L.DomEvent.disableClickPropagation(this._container);

    if (options.html) {
      if (typeof options.html === 'string') {
        this._html = options.html;
        this._container.innerHTML = this._html;
      } else if (typeof options.html === 'function') {
        this._html = options.html();
        this._container.innerHTML = this._html;
      } else {
        // A DOM object.
        this._html = options.html;
        this._container.appendChild(this._html);
      }
    } else if (options.overlays) {
      this._html = this._createLegend(options.overlays);
      this._container.innerHTML = this._html;
    }
  },
  onAdd: function(map) {
    this._map = map;

    if (!this._html) {
      // TODO: Add 'ready' event to map, then iterate through all baselayers and shapes, per individual overlay, on the map, dynamically building a legend.
    }

    return this._container;
  },
  _createLegend: function(overlays) {
    var html = '',
      options = this.options;

    if (options.title) {
      html += '<h3>' + options.title  + '</h3>';
    }

    for (var i = 0; i < overlays.length; i++) {
      var overlay = overlays[i];

      if (overlay.name) {
        html += '<h4>' + overlay.name + '</h4>';
      }

      if (overlay.icons) {
        html += '<ul>';

        for (var icon in overlay.icons) {
          html += '<li><span style="background-color:' + overlay.icons[icon]  + ';">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span> ' + icon + '</li>';
        }
      }

      /*
      if (overlay.clustered) {
        var bottomValue = 0,
          clusterHtml = '<h6>Groups</h6>',
          lastColor = '',
          upperValue = 0;

        for (var group = 0; group < options.layers[layer].clustered.length; group++) {
          if (lastColor && options.layers[layer].clustered[group].color !== lastColor) {
            if (!lastColor.match(/^#/g)) {lastColor = '#' + lastColor;}
            clusterHtml += '<span style="background-color: ' + lastColor  + '; border-radius: 8px;">&nbsp;&nbsp;&nbsp;&nbsp;</span> ' + bottomValue + ' - ' + upperValue + ' points</br>';
            bottomValue = upperValue + 1;
          }
          upperValue = options.layers[layer].clustered[group].maxNodes;
          lastColor = options.layers[layer].clustered[group].color;
        }

        if (!lastColor.match(/^#/g)) {
          lastColor = '#' + lastColor;
        }

        if (bottomValue === 0) {
          clusterHtml = '<span style="background-color: ' + lastColor  + '; border-radius: 8px;">&nbsp;&nbsp;&nbsp;&nbsp;</span> Grouped Points</br>';
        } else {
          clusterHtml += '<span style="background-color: ' + lastColor  + '; border-radius: 8px;">&nbsp;&nbsp;&nbsp;&nbsp;</span> &gt; ' + bottomValue + ' points</br>';
        }

        html += clusterHtml;
      }
      */
    }

    return html;
  }
  /*
  _update: function() {
    function cssString(css) {
      var returnValue = '';

      for (var item in css) {
        returnValue += item + ': ' + css[item] + ';';
      }

      return returnValue;
    }

    if (this._div) {
      this._div.innerHTML = this._html;
      this._div.setAttribute('style', cssString(this.options.style));
    }

    return this;
  },
  _addLegend: function(html, options) {
    this.options.style = {
      'background-color': 'rgba(255,255,255,.8)',
      'background-color': '#fff',
      'padding': '5px'
    };

    options = L.Util.extend(this.options, options);
    html = html || this._html;
    this._html = html;

    return this._update();
  },
  */
});

L.Map.mergeOptions({
  legendControl: false
});
L.Map.addInitHook(function() {
  if (this.options.legendControl) {
    var options = {};

    if (typeof this.options.legendControl === 'object') {
      options = this.options.legendControl;
    }

    this.legendControl = L.npmap.control.legend(options).addTo(this);
  }
});

module.exports = function(options) {
  return new LegendControl(options);
};

},{}],38:[function(require,module,exports){
/* global alert, L */

'use strict';

var LocateControl = L.Control.extend({
  options: {
    circlePadding: [0, 0],
    circleStyle: {
      color: '#136aec',
      fillColor: '#136aec',
      fillOpacity: 0.15,
      opacity: 0.5,
      weight: 2
    },
    drawCircle: true,
    follow: false,
    followCircleStyle: {},
    followMarkerStyle: {},
    locateOptions: {},
    markerStyle: {
      color: '#136aec',
      fillColor: '#2a93ee',
      fillOpacity: 0.7,
      opacity: 0.9,
      radius: 5,
      weight: 2
    },
    metric: true,
    onLocationError: function(err) {
      alert(err.message);
    },
    onLocationOutsideMapBounds: function(context) {
      alert(context.options.strings.outsideMapBoundsMsg);
    },
    position: 'topleft',
    setView: true,
    stopFollowingOnDrag: true,
    strings: {
      outsideMapBoundsMsg: 'You seem to be located outside of the boundaries of the map',
      popup: 'You are within {distance} {unit} of this point',
      title: 'Show me where I am'
    }
  },
  onAdd: function (map) {
    var me = this,
      obj = {};

    this._container = L.DomUtil.create('div', 'npmap-control-locate leaflet-bar leaflet-control');
    this._event = undefined;
    this._layer = new L.LayerGroup().addTo(map);
    this._locateOptions = {
      watch: true
    };
    L.extend(this._locateOptions, this.options.locateOptions);
    L.extend(this._locateOptions, {
      setView: false
    });
    L.extend(obj, this.options.markerStyle, this.options.followMarkerStyle);
    this.options.followMarkerStyle = obj;
    obj = {};
    L.extend(obj, this.options.circleStyle, this.options.followCircleStyle);
    this.options.followCircleStyle = obj;
    me._button = L.DomUtil.create('button', 'leaflet-bar-single', this._container);
    me._button.title = this.options.strings.title;
    L.DomEvent
      .on(me._button, 'click', L.DomEvent.stopPropagation)
      .on(me._button, 'click', L.DomEvent.preventDefault)
      .on(me._button, 'click', function() {
        if (me._active && (me._event === undefined || map.getBounds().contains(me._event.latlng) || !me.options.setView || isOutsideMapBounds())) {
          stopLocate();
        } else {
          locate();
        }
      })
      .on(me._button, 'dblclick', L.DomEvent.stopPropagation);

    function isOutsideMapBounds() {
      if (me._event === undefined) {
        return false;
      }

      return map.options.maxBounds && !map.options.maxBounds.contains(me._event.latlng);
    }
    function locate() {
      if (me.options.setView) {
        me._locateOnNextLocationFound = true;
      }

      if (!me._active) {
        map.locate(me._locateOptions);
      }

      me._active = true;

      if (me.options.follow) {
        startFollowing();
      }

      if (!me._event) {
        L.DomUtil.addClass(me._button, 'requesting');
        L.DomUtil.addClass(me._button, 'pressed');
        L.DomUtil.removeClass(me._button, 'following');
      } else {
        visualizeLocation();
      }
    }
    function onLocationError(err) {
      if (err.code === 3 && me._locateOptions.watch) {
        return;
      }

      stopLocate();
      me.options.onLocationError(err);
    }
    function onLocationFound(e) {
      if (me._event && (me._event.latlng.lat === e.latlng.lat && me._event.latlng.lng === e.latlng.lng && me._event.accuracy === e.accuracy)) {
        return;
      }

      if (!me._active) {
        return;
      }

      me._event = e;

      if (me.options.follow && me._following) {
        me._locateOnNextLocationFound = true;
      }

      visualizeLocation();
    }
    function resetVariables() {
      me._active = false;
      me._following = false;
      me._locateOnNextLocationFound = me.options.setView;
    }
    function startFollowing() {
      map.fire('startfollowing');
      me._following = true;

      if (me.options.stopFollowingOnDrag) {
        map.on('dragstart', stopFollowing);
      }
    }
    function stopFollowing() {
      map.fire('stopfollowing');
      me._following = false;

      if (me.options.stopFollowingOnDrag) {
        map.off('dragstart', stopFollowing);
      }

      visualizeLocation();
    }
    function stopLocate() {
      map.stopLocate();
      map.off('dragstart', stopFollowing);
      //L.DomUtil.removeClass(me._button, 'requesting');
      L.DomUtil.removeClass(me._button, 'pressed');
      L.DomUtil.removeClass(me._button, 'following');
      resetVariables();
      me._layer.clearLayers();
      me._circleMarker = undefined;
      me._circle = undefined;
    }
    function visualizeLocation() {
      var distance, mStyle, o, radius, style, unit;

      if (me._event.accuracy === undefined) {
        me._event.accuracy = 0;
      }

      radius = me._event.accuracy;

      if (me._locateOnNextLocationFound) {
        if (isOutsideMapBounds()) {
          me.options.onLocationOutsideMapBounds(me);
        } else {
          map.fitBounds(me._event.bounds, {
            padding: me.options.circlePadding
          });
        }

        me._locateOnNextLocationFound = false;
      }

      if (me.options.drawCircle) {
        if (me._following) {
          style = me.options.followCircleStyle;
        } else {
          style = me.options.circleStyle;
        }

        if (!me._circle) {
          me._circle = L.circle(me._event.latlng, radius, style).addTo(me._layer);
        } else {
          me._circle.setLatLng(me._event.latlng).setRadius(radius);
          
          for (o in style) {
            me._circle.options[o] = style[o];
          }
        }
      }

      if (me.options.metric) {
        distance = radius.toFixed(0);
        unit = 'meters';
      } else {
        distance = (radius * 3.2808399).toFixed(0);
        unit = 'feet';
      }

      if (me._following) {
        mStyle = me.options.followMarkerStyle;
      } else {
        mStyle = me.options.markerStyle;
      }

      if (!me._circleMarker) {
        me._circleMarker = L.circleMarker(me._event.latlng, mStyle)
          .addTo(me._layer);
      } else {
        me._circleMarker.setLatLng(me._event.latlng);

        for (o in mStyle) {
          me._circleMarker.options[o] = mStyle[o];
        }
      }

      if (!me._container) {
        return;
      }

      L.DomUtil.removeClass(me._button, 'requesting');
      L.DomUtil.addClass(me._button, 'pressed');

      if (me._following) {
        L.DomUtil.addClass(me._button, 'following');
      } else {
        L.DomUtil.removeClass(me._button, 'following');
      }
    }

    resetVariables();
    map.on('locationerror', onLocationError, me);
    map.on('locationfound', onLocationFound, me);
    this.locate = locate;
    this.stopFollowing = stopFollowing;
    this.stopLocate = stopLocate;
    return this._container;
  }
});

L.Map.addInitHook(function () {
  if (this.options.locateControl) {
    var options = {};

    if (typeof this.options.locateControl === 'object') {
      options = this.options.locateControl;
    }

    this.locateControl = L.npmap.control.locate(options).addTo(this);
  }
});

module.exports = function (options) {
  return new LocateControl(options);
};

},{}],39:[function(require,module,exports){
/* global L */
/* jshint camelcase: false */

'use strict';

require('leaflet-draw');

var MeasureControl = L.Control.extend({
  includes: L.Mixin.Events,
  options: {
    position: 'topleft'
  },
  onAdd: function() {
    var liArea, liDistance;

    this._container = L.DomUtil.create('div', 'npmap-control-measure leaflet-bar leaflet-control');
    this._button = L.DomUtil.create('button', 'leaflet-bar-single', this._container);
    this._button.title = 'Measure distance or calculate area';
    this._menu = L.DomUtil.create('ul', '', this._container);
    liDistance = L.DomUtil.create('li', '', this._menu);
    liArea = L.DomUtil.create('li', '', this._menu);
    this._buttonArea = L.DomUtil.create('button', '', liArea);
    this._buttonArea.innerHTML = 'Area';
    this._buttonDistance = L.DomUtil.create('button', 'pressed', liDistance);
    this._buttonDistance.innerHTML = 'Distance';
    this._activeMode = 'distance';

    L.DomEvent
      .on(this._button, 'click', L.DomEvent.stopPropagation)
      .on(this._button, 'click', L.DomEvent.preventDefault)
      .on(this._button, 'click', this._toggleMeasure, this)
      .on(this._button, 'dblclick', L.DomEvent.stopPropagation)
      .on(this._buttonArea, 'click', this._buttonAreaClick, this)
      .on(this._buttonDistance, 'click', this._buttonDistanceClick, this)
      .on(this._menu, 'click', L.DomEvent.stopPropagation)
      .on(this._menu, 'click', L.DomEvent.preventDefault)
      .on(this._menu, 'dblclick', L.DomEvent.stopPropagation);

    return this._container;
  },
  _activateMode: function(mode) {
    this._activeMode = mode;

    if (mode === 'area') {
      this._stopMeasuringDistance();
      this._startMeasuringArea();
    } else {
      this._stopMeasuringArea();
      this._startMeasuringDistance();
    }
  },
  _buttonAreaClick: function() {
    this._buttonClick(this._buttonArea);
  },
  _buttonClick: function(button) {
    if (!L.DomUtil.hasClass(button, 'pressed')) {
      var add = this._buttonArea,
        mode = button.innerHTML.toLowerCase(),
        remove = this._buttonDistance;

      if (mode === 'distance') {
        add = this._buttonDistance;
        remove = this._buttonArea;
      }

      L.DomUtil.removeClass(remove, 'pressed');
      L.DomUtil.addClass(add, 'pressed');
      this._activateMode(mode);
    }
  },
  _buttonDistanceClick: function() {
    this._buttonClick(this._buttonDistance);
  },
  _clearLastShape: function() {
    var i;

    if (this._layerGroupPath) {
      this._layerGroup.removeLayer(this._layerGroupPath);
      this._layerGroupPath = null;
    }

    if (this._currentCircles.length) {
      for (i = 0; i < this._currentCircles.length; i++) {
        this._layerGroup.removeLayer(this._currentCircles[i]);
      }
    }

    if (this._currentTooltips.length) {
      for (i = 0; i < this._currentTooltips.length; i++) {
        this._layerGroup.removeLayer(this._currentTooltips[i]);
      }
    }

    this._resetArea();
    this._resetDistance();
  },
  _createTooltip: function(latLng) {
    return new L.Marker(latLng, {
      clickable: false,
      icon: L.divIcon({
        className: 'leaflet-measure-tooltip',
        iconAnchor: [
          -5,
          -5
        ]
      })
    }).addTo(this._layerGroup);
  },
  _finishPathArea: function() {
    this._resetArea();
  },
  _finishPathDistance: function() {
    if (this._tooltip) {
      this._layerGroup.removeLayer(this._tooltip);
    }

    this._resetDistance();
  },
  _keyDown: function(e) {
    if (e.keyCode === 27) {
      this._toggleMeasure();
    }
  },
  _mouseClickArea: function(e) {
    var latLng = e.latlng,
      circle;

    if (!latLng) {
      return;
    }

    if (this._layerGroupPath) {
      this._layerGroupPath.addLatLng(latLng);
    } else {
      this._layerGroupPath = new L.Polygon([latLng], {
        clickable: false,
        color: 'red',
        fillColor: 'red',
        weight: 2
      }).addTo(this._layerGroup);
    }

    circle = new L.CircleMarker(latLng, {
      clickable: false,
      color: 'red',
      fill: true,
      fillOpacity: 1,
      opacity: 1,
      radius: 2,
      weight: 1
    }).addTo(this._layerGroup);
    this._currentCircles.push(circle);
    this._lastPointArea = latLng;

    if (this._currentCircles.length > 2) {
      this._area = L.GeometryUtil.geodesicArea(this._layerGroupPath.getLatLngs());

      if (!this._tooltip) {
        this._tooltip = this._createTooltip(latLng);
      }

      this._updateTooltipPosition(latLng);
      this._updateTooltipArea(this._area);
    }
  },
  _mouseClickDistance: function(e) {
    var latLng = e.latlng,
      circle;

    if (!latLng) {
      return;
    }

    if (this._lastPointDistance) {
      var distance;

      this._tooltip = this._createTooltip(latLng);
      this._currentTooltips.push(this._tooltip);

      if (!this._distance) {
        this._distance = 0;
      }

      this._updateTooltipPosition(latLng);
      distance = e.latlng.distanceTo(this._lastPointDistance);
      this._updateTooltipDistance(this._distance + distance, distance);
      this._distance += distance;

      if (!this._layerGroupPath) {
        this._layerGroupPath = new L.Polyline([this._lastPointDistance], {
          clickable: false,
          color: 'red',
          weight: 2
        }).addTo(this._layerGroup);
      }
    }

    if (this._layerGroupPath) {
      this._layerGroupPath.addLatLng(latLng);
    }

    circle = new L.CircleMarker(latLng, {
      clickable: false,
      color: 'red',
      fill: true,
      fillOpacity: 1,
      opacity: 1,
      radius: 2,
      weight: 1
    }).addTo(this._layerGroup);
    this._currentCircles.push(circle);
    this._lastPointDistance = latLng;
  },
  _resetArea: function() {
    this._area = 0;
    this._currentCircles = this._currentTooltips = [];
    this._lastPointArea = this._layerGroupPath = this._tooltip = undefined;
  },
  _resetDistance: function() {
    this._currentCircles = this._currentTooltips = [];
    this._distance = 0;
    this._lastPointDistance = this._layerGroupPath = this._tooltip = undefined;
  },
  _startMeasuringArea: function() {
    var map = this._map;

    this._doubleClickZoom = map.doubleClickZoom.enabled();
    map.doubleClickZoom.disable();
    L.DomEvent
      .on(document, 'keydown', this._keyDown, this)
      .on(map, 'click', this._mouseClickArea, this)
      .on(map, 'dblclick', this._finishPathArea, this);

    this._currentCircles = this._currentTooltips = [];

    if (!this._layerGroup) {
      this._layerGroup = new L.LayerGroup().addTo(map);
    }
  },
  _startMeasuringDistance: function() {
    var map = this._map;

    this._doubleClickZoom = map.doubleClickZoom.enabled();
    map.doubleClickZoom.disable();
    L.DomEvent
      .on(document, 'keydown', this._keyDown, this)
      .on(map, 'click', this._mouseClickDistance, this)
      .on(map, 'dblclick', this._finishPathDistance, this);

    this._currentCircles = this._currentTooltips = [];

    if (!this._layerGroup) {
      this._layerGroup = new L.LayerGroup().addTo(map);
    }
  },
  _stopMeasuringArea: function() {
    var map = this._map;

    L.DomEvent
      .off(document, 'keydown', this._keyDown, this)
      .off(map, 'click', this._mouseClickArea, this)
      .off(map, 'dblclick', this._finishPathArea, this);
    this._clearLastShape();
  },
  _stopMeasuringDistance: function() {
    var map = this._map;

    L.DomEvent
      .off(document, 'keydown', this._keyDown, this)
      .off(map, 'click', this._mouseClickDistance, this)
      .off(map, 'dblclick', this._finishPathDistance, this);
    this._clearLastShape();
  },
  _toggleMeasure: function() {
    var map = this._map;

    if (L.DomUtil.hasClass(this._button, 'pressed')) {
      L.DomUtil.removeClass(this._button, 'pressed');
      map._container.style.cursor = '';
      map._controllingCursor = true;
      map._controllingInteractivity = true;
      this._menu.style.display = 'none';

      if (this._activeMode === 'area') {
        this._stopMeasuringArea();
      } else {
        this._stopMeasuringDistance();
      }

      this._layerGroup.clearLayers();
      this._layerGroupPath = null;

      if (this._doubleClickZoom) {
        map.doubleClickZoom.enable();
      }
    } else {
      L.DomUtil.addClass(this._button, 'pressed');
      map._container.style.cursor = 'crosshair';
      map._controllingCursor = false;
      map._controllingInteractivity = false;
      this._menu.style.display = 'block';

      if (this._activeMode === 'area') {
        this._startMeasuringArea();
      } else {
        this._startMeasuringDistance();
      }
    }
  },
  _toAcres: function(meters) {
    return (meters / 4046.86).toFixed(2);
  },
  _toMiles: function(meters) {
    return (meters * 0.000621371).toFixed(2);
  },
  _updateTooltipArea: function(total) {
    this._tooltip._icon.innerHTML = '<div class="leaflet-measure-tooltip-total">' + this._toAcres(total) + ' acres</div>';
  },
  _updateTooltipDistance: function(total, difference) {
    var differenceMiles = this._toMiles(difference),
      totalMiles = this._toMiles(total),
      text = '<div class="leaflet-measure-tooltip-total">' + totalMiles + ' mi</div>';

    if ((differenceMiles > 0) && (totalMiles !== differenceMiles)) {
      text += '<div class="leaflet-measure-tooltip-difference">(+' + differenceMiles + ' mi)</div>';
    }

    this._tooltip._icon.innerHTML = text;
  },
  _updateTooltipPosition: function(latLng) {
    this._tooltip.setLatLng(latLng);
  }
});

L.Map.mergeOptions({
  measureControl: false
});
L.Map.addInitHook(function() {
  if (this.options.measureControl) {
    var options = {};

    if (typeof this.options.measureControl === 'object') {
      options = this.options.measureControl;
    }

    this.measureControl = L.npmap.control.measure(options).addTo(this);
  }
});

module.exports = function(options) {
  return new MeasureControl(options);
};

},{"leaflet-draw":23}],40:[function(require,module,exports){
/* global L */

'use strict';

var layerPresets = require('../preset/baselayers.json'),
  util = require('../util/util');

var OverviewControl = L.Control.extend({
  options: {
    autoToggleDisplay: false,
    height: 150,
    position: 'bottomright',
    toggleDisplay: true,
    width: 150,
    zoomAnimation: false,
    zoomLevelFixed: false,
    zoomLevelOffset: -5
  },
  addTo: function(map) {
    L.Control.prototype.addTo.call(this, map);
    this._miniMap.setView(this._mainMap.getCenter(), this._decideZoom(true));
    this._setDisplay(this._decideMinimized());
    return this;
  },
  initialize: function(options) {
    util.strict(options, 'object');

    if (typeof options.layer === 'string') {
      var name = options.layer.split('-');

      options.layer = layerPresets[name[0]][name[1]];
    }

    L.Util.setOptions(this, options);
    this._layer = options.layer.L = L.npmap.layer[options.layer.type](options.layer);
    return this;
  },
  onAdd: function(map) {
    this._mainMap = map;
    this._attributionContainer = this._mainMap.attributionControl._container;
    this._container = L.DomUtil.create('div', 'leaflet-control-overview');
    this._container.style.margin = '0 0 ' + -this._attributionContainer.offsetHeight + 'px 0';
    this._container.style.width = this.options.width + 'px';
    this._container.style.height = this.options.height + 'px';
    L.DomEvent.disableClickPropagation(this._container);
    L.DomEvent.on(this._container, 'mousewheel', L.DomEvent.stopPropagation);
    this._miniMap = this.L = new L.Map(this._container, {
      attributionControl: false,
      autoToggleDisplay: this.options.autoToggleDisplay,
      boxZoom: !this.options.zoomLevelFixed,
      crs: map.options.crs,
      doubleClickZoom: !this.options.zoomLevelFixed,
      homeControl: false,
      scrollWheelZoom: !this.options.zoomLevelFixed,
      smallzoomControl: false,
      touchZoom: !this.options.zoomLevelFixed,
      zoomAnimation: this.options.zoomAnimation,
      zoomControl: false
    });
    this._attributionContainer.style.marginRight = (this.options.width + 3) + 'px';
    this._miniMap.addLayer(this._layer);
    this._mainMapMoving = false;
    this._miniMapMoving = false;
    this._userToggledDisplay = false;
    this._minimized = false;

    if (this.options.toggleDisplay) {
      this._addToggleButton();
    }

    this._miniMap.whenReady(L.Util.bind(function() {
      this._aimingRect = L.rectangle(this._mainMap.getBounds(), {
        clickable: false,
        color: '#d29700',
        weight: 3
      }).addTo(this._miniMap);
      this._shadowRect = L.rectangle(this._mainMap.getBounds(), {
        clickable: false,
        color: '#454545',
        fillOpacity: 0,
        opacity: 0,
        weight: 3
      }).addTo(this._miniMap);
      this._mainMap.on('moveend', this._onMainMapMoved, this);
      this._mainMap.on('move', this._onMainMapMoving, this);
      this._miniMap.on('movestart', this._onMiniMapMoveStarted, this);
      this._miniMap.on('move', this._onMiniMapMoving, this);
      this._miniMap.on('moveend', this._onMiniMapMoved, this);
    }, this));

    return this._container;
  },
  onRemove: function() {
    this._mainMap.off('moveend', this._onMainMapMoved, this);
    this._mainMap.off('move', this._onMainMapMoving, this);
    this._miniMap.off('moveend', this._onMiniMapMoved, this);
    this._miniMap.removeLayer(this._layer);
    this._attributionContainer.style.marginRight = '0px';
  },
  _addToggleButton: function() {
    this._toggleDisplayButton = this._createButton('', 'Hide Overview', null, this._container, this._toggleDisplayButtonClicked, this);
    this._toggleDisplayButtonImage = L.DomUtil.create('span', null, this._toggleDisplayButton);
  },
  _createButton: function(html, title, className, container, fn, context) {
    var button = L.DomUtil.create('button', className, container),
        stop = L.DomEvent.stopPropagation;

    button.innerHTML = html;
    button.title = title;

    L.DomEvent
      .on(button, 'click', stop)
      .on(button, 'mousedown', stop)
      .on(button, 'dblclick', stop)
      .on(button, 'click', L.DomEvent.preventDefault)
      .on(button, 'click', fn, context);

    return button;
  },
  _decideMinimized: function() {
    if (this._userToggledDisplay) {
      return this._minimized;
    }

    if (this.options.autoToggleDisplay) {
      if (this._mainMap.getBounds().contains(this._miniMap.getBounds())) {
        return true;
      }

      return false;
    }

    return this._minimized;
  },
  _decideZoom: function(fromMaintoMini) {
    if (!this.options.zoomLevelFixed) {
      if (fromMaintoMini) {
        return this._mainMap.getZoom() + this.options.zoomLevelOffset;
      } else {
        var currentDiff = this._miniMap.getZoom() - this._mainMap.getZoom(),
            proposedZoom = this._miniMap.getZoom() - this.options.zoomLevelOffset,
            toRet;
        
        if (currentDiff > this.options.zoomLevelOffset && this._mainMap.getZoom() < this._miniMap.getMinZoom() - this.options.zoomLevelOffset) {
          if (this._miniMap.getZoom() > this._lastMiniMapZoom) {
            toRet = this._mainMap.getZoom() + 1;
            this._miniMap.setZoom(this._miniMap.getZoom() -1);
          } else {
            toRet = this._mainMap.getZoom();
          }
        } else {
          toRet = proposedZoom;
        }

        this._lastMiniMapZoom = this._miniMap.getZoom();
        return toRet;
      }
    } else {
      if (fromMaintoMini) {
        return this.options.zoomLevelFixed;
      } else {
        return this._mainMap.getZoom();
      }
    }
  },
  _minimize: function() {
    var me = this;

    this._toggleDisplayButton.style.display = 'none';
    this._toggleDisplayButton.style.height = '47px';
    this._toggleDisplayButton.style.width = '47px';
    this._toggleDisplayButtonImage.className += ' minimized';
    this._toggleDisplayButtonImage.style.bottom = 'auto';
    this._toggleDisplayButtonImage.style.right = 'auto';
    this._toggleDisplayButtonImage.style.left = '10px';
    this._toggleDisplayButtonImage.style.top = '10px';
    this._container.style.width = '47px';
    this._container.style.height = '47px';
    this._attributionContainer.style.marginRight = '50px';
    this._minimized = true;

    setTimeout(function() {
      me._toggleDisplayButton.style.display = 'block';
      me._aimingRect.setStyle({
        fillOpacity: 0,
        opacity: 0
      });
      me._miniMap.invalidateSize();
    }, 200);
  },
  _onMainMapMoved: function() {
    if (!this._miniMapMoving) {
      this._mainMapMoving = true;
      this._miniMap.setView(this._mainMap.getCenter(), this._decideZoom(true));
      this._setDisplay(this._decideMinimized());
    } else {
      this._miniMapMoving = false;
    }

    this._aimingRect.setBounds(this._mainMap.getBounds());
  },
  _onMainMapMoving: function() {
    this._aimingRect.setBounds(this._mainMap.getBounds());
  },
  _onMiniMapMoved: function() {
    if (!this._mainMapMoving) {
      this._miniMapMoving = true;
      this._mainMap.setView(this._miniMap.getCenter(), this._decideZoom(false));
      this._shadowRect.setStyle({
        fillOpacity: 0,
        opacity: 0
      });
    } else {
      this._mainMapMoving = false;
    }
  },
  _onMiniMapMoveStarted:function() {
    var lastAimingRect = this._aimingRect.getBounds();

    this._lastAimingRectPosition = {
      sw: this._miniMap.latLngToContainerPoint(lastAimingRect.getSouthWest()),
      ne: this._miniMap.latLngToContainerPoint(lastAimingRect.getNorthEast())
    };
  },
  _onMiniMapMoving: function() {
    if (!this._mainMapMoving && this._lastAimingRectPosition) {
      this._shadowRect.setBounds(new L.LatLngBounds(this._miniMap.containerPointToLatLng(this._lastAimingRectPosition.sw),this._miniMap.containerPointToLatLng(this._lastAimingRectPosition.ne)));
      this._shadowRect.setStyle({
        fillOpacity: 0.3,
        opacity:1
      });
    }
  },
  _restore: function() {
    var me = this;

    this._toggleDisplayButton.style.display = 'none';
    this._toggleDisplayButton.style.height = '20px';
    this._toggleDisplayButton.style.bottom = '0';
    this._toggleDisplayButton.style.left = 'auto';
    this._toggleDisplayButton.style.position = 'absolute';
    this._toggleDisplayButton.style.right = '0';
    this._toggleDisplayButton.style.top = 'auto';
    this._toggleDisplayButton.style.width = '20px';
    this._toggleDisplayButtonImage.className = this._toggleDisplayButtonImage.className.replace(/(?:^|\s)minimized(?!\S)/g, '');
    this._toggleDisplayButtonImage.style.bottom = '10px';
    this._toggleDisplayButtonImage.style.left = 'auto';
    this._toggleDisplayButtonImage.style.right = '10px';
    this._toggleDisplayButtonImage.style.top = 'auto';
    this._container.style.width = this.options.width + 'px';
    this._container.style.height = this.options.height + 'px';
    this._attributionContainer.style.marginRight = (this.options.width + 3) + 'px';
    this._minimized = false;

    setTimeout(function() {
      me._toggleDisplayButton.style.display = 'block';
      me._aimingRect.setStyle({
        fillOpacity: 0.2,
        opacity: 0.5
      });
      me._miniMap.invalidateSize();
    }, 200);
  },
  _setDisplay: function(minimize) {
    if (minimize !== this._minimized) {
      if (!this._minimized) {
        this._minimize();
      } else {
        this._restore();
      }
    }
  },
  _toggleDisplayButtonClicked: function() {
    this._userToggledDisplay = true;

    if (!this._minimized) {
      this._minimize();
      this._toggleDisplayButton.title = 'Show Overview';
    } else {
      this._restore();
      this._toggleDisplayButton.title = 'Hide Overview';
    }
  }
});

L.Map.mergeOptions({
  overviewControl: false
});
L.Map.addInitHook(function() {
  if (this.options.overviewControl) {
    var options = {};

    if (typeof this.options.overviewControl === 'object') {
      options = this.options.overviewControl;
    }

    this.overviewControl = new L.npmap.control.overview(options).addTo(this);
  }
});

module.exports = function(options) {
  return new OverviewControl(options);
};

},{"../preset/baselayers.json":66,"../util/util":75}],41:[function(require,module,exports){
/* global L */

'use strict';

var util = require('../util/util');

var PrintControl = L.Control.extend({
  initialize: function() {
    this._li = L.DomUtil.create('li', '');
    this._button = L.DomUtil.create('button', 'print', this._li);
    this._button.title = 'Print the map';
    L.DomEvent.addListener(this._button, 'click', this.print, this);

    return this;
  },
  addTo: function(map) {
    var toolbar = util.getChildElementsByClassName(map.getContainer().parentNode.parentNode, 'npmap-toolbar')[0];

    toolbar.childNodes[1].appendChild(this._li);
    toolbar.style.display = 'block';
    this._container = toolbar.parentNode.parentNode;
    this._map = map;
    util.getChildElementsByClassName(this._container.parentNode, 'npmap-map-wrapper')[0].style.top = '26px';
    return this;
  },
  _escapeHtml: function(layer) {
    if (layer.popup) {
      if (typeof layer.popup === 'string') {
        layer.popup = util.escapeHtml(layer.popup);
      } else {
        if (typeof layer.popup.description === 'string') {
          layer.popup.description = util.escapeHtml(layer.popup.description);
        }

        if (typeof layer.popup.title === 'string') {
          layer.popup.title = util.escapeHtml(layer.popup.title);
        }
      }
    }

    if (layer.tooltip) {
      layer.tooltip = util.escapeHtml(layer.popup);
    }
  },
  print: function() {
    var map = this._map,
      me = this,
      options = map.options,
      center = map.getCenter(),
      configCenter = options.center,
      zoom = map.getZoom(),
      params = {
        b: {
          baseLayers: [],
          center: {
            lat: configCenter.lat,
            lng: configCenter.lng
          },
          overlays: [],
          zoom: options.zoom
        },
        c: JSON.stringify({
          lat: center.lat,
          lng: center.lng
        }),
        z: zoom
      },
      active, i, layer, win;

    for (i = 0; i < options.baseLayers.length; i++) {
      layer = options.baseLayers[i];

      if (typeof layer.L === 'object') {
        active = L.extend({}, layer);
        delete active.L;
        me._escapeHtml(active);
        params.b.baseLayers.push(active);
        break;
      }
    }

    for (i = 0; i < options.overlays.length; i++) {
      layer = options.overlays[i];

      if (typeof layer.L === 'object') {
        active = L.extend({}, layer);
        delete active.L;
        me._escapeHtml(active);
        params.b.overlays.push(active);
      }
    }

    params.b = JSON.stringify(params.b);
    win = window.open('http://www.nps.gov/maps/print.html' + L.Util.getParamString(params), '_blank');
    win.focus();
  }
});

L.Map.mergeOptions({
  printControl: false
});
L.Map.addInitHook(function() {
  if (this.options.printControl) {
    var options = {};

    if (typeof this.options.printControl === 'object') {
      options = this.options.printControl;
    }

    this.printControl = L.npmap.control.print(options).addTo(this);
  }
});

module.exports = function(options) {
  return new PrintControl(options);
};

},{"../util/util":75}],42:[function(require,module,exports){
/* global L */

'use strict';

var ScaleControl = L.Control.Scale.extend({
  options: {
    metric: false
  }
});

L.Map.mergeOptions({
  scaleControl: false
});
L.Map.addInitHook(function() {
  if (this.options.scaleControl) {
    var options = {};

    if (typeof this.options.scaleControl === 'object') {
      options = this.options.scaleControl;
    }

    this.scaleControl = L.npmap.control.scale(options).addTo(this);
  }
});

module.exports = function(options) {
  return new ScaleControl(options);
};

},{}],43:[function(require,module,exports){
/* global L */

'use strict';

var util = require('../util/util');

var ShareControl = L.Control.extend({
  initialize: function() {
    this._li = L.DomUtil.create('li', '');
    this._button = L.DomUtil.create('button', 'share', this._li);
    this._button.title = 'Share the map';
    L.DomEvent.addListener(this._button, 'click', this.share, this);

    return this;
  },
  addTo: function(map) {
    var toolbar = util.getChildElementsByClassName(map.getContainer().parentNode.parentNode, 'npmap-toolbar')[0];

    toolbar.childNodes[1].appendChild(this._li);
    toolbar.style.display = 'block';
    this._container = toolbar.parentNode.parentNode;
    this._map = map;
    util.getChildElementsByClassName(this._container.parentNode, 'npmap-map-wrapper')[0].style.top = '26px';
    return this;
  },
  share: function() {
    window.alert('The share tool has not yet been implemented.');
  }
});

L.Map.mergeOptions({
  shareControl: false
});
L.Map.addInitHook(function() {
  if (this.options.shareControl) {
    var options = {};

    if (typeof this.options.shareControl === 'object') {
      options = this.options.shareControl;
    }

    this.shareControl = L.npmap.control.share(options).addTo(this);
  }
});

module.exports = function(options) {
  return new ShareControl(options);
};

},{"../util/util":75}],44:[function(require,module,exports){
/* global L */

'use strict';

var SmallZoomControl = L.Control.extend({
  options: {
    position: 'topleft'
  },
  initialize: function(options) {
    L.Util.extend(this.options, options);
    return this;
  },
  onAdd: function(map) {
    this._container = L.DomUtil.create('div', 'leaflet-control-zoom leaflet-bar');
    this._zoomInButton = this._createButton('Zoom in', 'in', this._container, this._zoomIn, this);
    this._zoomOutButton = this._createButton('Zoom out', 'out', this._container, this._zoomOut, this);
    map.on('zoomend zoomlevelschange', this._updateDisabled, this);
    this._updateDisabled();

    return this._container;
  },
  onRemove: function(map) {
    map.off('zoomend zoomlevelschange', this._updateDisabled, this);
  },
  _createButton: function(title, clsName, container, handler, context) {
    var button = L.DomUtil.create('button', clsName, container);

    button.title = title;

    L.DomEvent.disableClickPropagation(button);
    L.DomEvent
      .on(button, 'click', L.DomEvent.preventDefault)
      .on(button, 'click', handler, context);

    return button;
  },
  _updateDisabled: function() {
    var clsName = 'leaflet-disabled',
      map = this._map;

    L.DomUtil.removeClass(this._zoomInButton, clsName);
    L.DomUtil.removeClass(this._zoomOutButton, clsName);

    if (map._zoom === map.getMinZoom()) {
      L.DomUtil.addClass(this._zoomOutButton, clsName);
    }
    if (map._zoom === map.getMaxZoom()) {
      L.DomUtil.addClass(this._zoomInButton, clsName);
    }
  },
  _zoomIn: function(e) {
    this._map.zoomIn(e.shiftKey ? 3 : 1);
  },
  _zoomOut: function(e) {
    this._map.zoomOut(e.shiftKey ? 3 : 1);
  }
});

L.Map.mergeOptions({
  smallzoomControl: true
});
L.Map.addInitHook(function() {
  if (this.options.smallzoomControl) {
    var options = {};

    if (typeof this.options.smallzoomControl === 'object') {
      options = this.options.smallzoomControl;
    }

    this.smallzoomControl = L.npmap.control.smallzoom(options).addTo(this);
  }
});

module.exports = function(options) {
  return new SmallZoomControl(options);
};

},{}],45:[function(require,module,exports){
/* global L */
/* jshint camelcase: false */

'use strict';

var util = require('../util/util');

var SwitcherControl = L.Control.extend({
  options: {
    position: 'topright'
  },
  statics: {
    SELECTED_ID: 'basemap_listbox_selected'
  },
  initialize: function(baseLayers) {
    this._baseLayers = baseLayers;
  },
  _addLi: function(baseLayer) {
    var li = L.DomUtil.create('li', (baseLayer.visible ? 'selected' : null));

    if (baseLayer.visible) {
      li.setAttribute('id', SwitcherControl.SELECTED_ID);
      this._active.setAttribute('aria-activedescendant', SwitcherControl.SELECTED_ID);
    }

    li.innerHTML = baseLayer.name;
    li.layerId = L.stamp(baseLayer);

    this._list.appendChild(li);
  },
  _initLayout: function() {
    var container = this._container = L.DomUtil.create('div', 'npmap-control-switcher');

    if (!L.Browser.touch) {
      L.DomEvent.disableClickPropagation(container);
      L.DomEvent.on(container, 'mousewheel', L.DomEvent.stopPropagation);
    } else {
      L.DomEvent.on(container, 'click', L.DomEvent.stopPropagation);
    }

    this._active = L.DomUtil.create('div', null, container);
    this._active.setAttribute('aria-expanded', false);
    this._active.setAttribute('aria-haspopup', true);
    this._active.setAttribute('aria-label', 'Switch base maps');
    this._active.setAttribute('aria-owns', 'basemap_listbox');
    this._active.setAttribute('role', 'combobox');
    this._list = L.DomUtil.create('ul', null, container);
    this._list.setAttribute('id', 'basemap_listbox');
    this._list.setAttribute('role', 'listbox');
    this._list.style.display = 'none';
    this._activeIcon = L.DomUtil.create('span', null, this._active);
    L.DomUtil.create('ico', null, this._activeIcon);
    this._activeText = L.DomUtil.create('div', null, this._active);
    this._activeDropdown = L.DomUtil.create('span', null, this._active);
    L.DomEvent.addListener(this._active, 'click', this._toggleList, this);
  },
  _onLayerChange: function(e) {
    var obj = this._baseLayers[L.stamp(e.layer)],
      type;

    if (!obj) {
      return;
    }

    if (!obj.overlay) {
      type = (e.type === 'layeradd' ? 'baselayerchange' : null);
    }

    if (type) {
      this._map.fire(type, obj);
    }
  },
  _onClick: function(e) {
    var target = util.getEventObjectTarget(e);

    if (!L.DomUtil.hasClass(target, 'selected')) {
      var added = false,
        children = util.getChildElementsByNodeName(this._list, 'li'),
        removed = false,
        i;

      for (i = 0; i < children.length; i++) {
        var li = children[i];

        if (L.DomUtil.hasClass(li, 'selected')) {
          li.removeAttribute('id');
          L.DomUtil.removeClass(li, 'selected');
          break;
        }
      }

      target.setAttribute('id', SwitcherControl.SELECTED_ID);
      this._active.setAttribute('aria-activedescendant', SwitcherControl.SELECTED_ID);

      for (i = 0; i < this._baseLayers.length; i++) {
        var baseLayer = this._baseLayers[i];

        if (baseLayer.L) {
          this._map.removeLayer(baseLayer.L);
          baseLayer.visible = false;
          removed = true;
          delete baseLayer.L;
        } else if (target.layerId === baseLayer._leaflet_id) {
          baseLayer.visible = true;

          if (baseLayer.type === 'arcgisserver') {
            baseLayer.L = L.npmap.layer[baseLayer.type][baseLayer.tiled === true ? 'tiled' : 'dynamic'](baseLayer);
          } else {
            baseLayer.L = L.npmap.layer[baseLayer.type](baseLayer);
          }

          this._map.addLayer(baseLayer.L, true);
          L.DomUtil.addClass(target, 'selected');
          this._setActive(baseLayer);
          added = true;
        }

        if (added && removed) {
          break;
        }
      }
    }

    this._toggleList();
  },
  _setActive: function(baseLayer) {
    var active = this._activeIcon.childNodes[0],
      icon = baseLayer.icon;

    if (!icon) {
      icon = 'generic';
    }

    active.className = '';
    L.DomUtil.addClass(active, icon + '-small');
    this._activeText.innerHTML = baseLayer.name;
  },
  _toggleList: function() {
    if (this._list.style.display && this._list.style.display === 'none') {
      this._list.style.display = 'block';
      L.DomUtil.addClass(this._activeDropdown, 'open');
    } else {
      this._list.style.display = 'none';
      L.DomUtil.removeClass(this._activeDropdown, 'open');
    }
  },
  _update: function() {
    var children, i;

    this._activeIcon.childNodes[0].innerHTML = '';
    this._activeText.innerHTML = '';
    this._list.innerHTML = '';

    for (i = 0; i < this._baseLayers.length; i++) {
      var baseLayer = this._baseLayers[i];

      this._addLi(baseLayer);

      if (baseLayer.visible) {
        this._setActive(baseLayer);
      }
    }

    children = util.getChildElementsByNodeName(this._list, 'li');

    for (i = 0; i < children.length; i++) {
      L.DomEvent.addListener(children[i], 'click', this._onClick, this);
    }
  },
  onAdd: function(map) {
    this._initLayout();
    this._update();
    map
      .on('layeradd', this._onLayerChange, this)
      .on('layerremove', this._onLayerChange, this);

    return this._container;
  },
  onRemove: function(map) {
    map
      .off('layeradd', this._onLayerChange, this)
      .off('layerremove', this._onLayerChange, this);
  }
});

L.Map.addInitHook(function() {
  if (this.options.baseLayers && this.options.baseLayers.length > 1) {
    this.switcherControl = L.npmap.control.switcher(this.options.baseLayers).addTo(this);
  }
});

module.exports = function(baseLayers) {
  return new SwitcherControl(baseLayers);
};

},{"../util/util":75}],46:[function(require,module,exports){
/* global L */

'use strict';

var util = require('../util/util');

var MakiIcon = L.Icon.extend({
  options: {
    'marker-color': '#000000',
    'marker-size': 'medium'
  },
  statics: {
    CSS_TEMPLATE: 'url(https://a.tiles.mapbox.com/v3/marker/pin-{{size}}{{symbol}}+{{color}}{{retina}}.png)'
  },
  initialize: function(options) {
    options = options || {};

    var size = options['marker-size'] || 'medium',
      sizes = {
        large: {
          iconAnchor: [17.5, 49],
          iconSize: [35, 55],
          popupAnchor: [2, -45]
        },
        medium: {
          iconAnchor: [14, 36],
          iconSize: [28, 41],
          popupAnchor: [2, -34]
        },
        small: {
          iconAnchor: [10, 24],
          iconSize: [20, 30],
          popupAnchor: [2, -24]
        }
      };

    L.Util.extend(options, sizes[size]);
    L.setOptions(this, options);
  },
  createIcon: function(oldIcon) {
    var div = (oldIcon && oldIcon.tagName === 'DIV') ? oldIcon : document.createElement('div'),
      options = this.options;

    //options.className = null;
    //options.html = null;
    this._setIconStyles(div, 'icon');
    div.style.backgroundImage = util.handlebars(MakiIcon.CSS_TEMPLATE, {
      color: options['marker-color'].replace('#', ''),
      retina: L.Browser.retina ? '@2x' : '',
      size: options['marker-size'].slice(0, 1),
      symbol: options['marker-symbol'] ? '-' + options['marker-symbol'] : ''
    });
    return div;
  },
  createShadow: function() {
    return null;
  }
});

L.Marker.mergeOptions({
  icon: new MakiIcon()
});

module.exports = function(options) {
  return new MakiIcon(options);
};

},{"../util/util":75}],47:[function(require,module,exports){
/* global L */

'use strict';

var util = require('../util/util');

var NpmakiIcon = L.Icon.extend({
  options: {
    'marker-color': '#000000',
    'marker-size': 'medium'
  },
  statics: {
    MAKI_TEMPLATE: 'url(https://a.tiles.mapbox.com/v3/marker/pin-{{size}}+{{color}}{{retina}}.png)'
  },
  initialize: function(options) {
    options = options || {};

    var size = options['marker-size'] || 'medium',
      sizes = {
        large: {
          iconAnchor: [17.5, 49],
          iconSize: [35, 55],
          popupAnchor: [2, -45]
        },
        medium: {
          iconAnchor: [14, 36],
          iconSize: [28, 41],
          popupAnchor: [2, -34]
        },
        small: {
          iconAnchor: [10, 24],
          iconSize: [20, 30],
          popupAnchor: [2, -24]
        }
      };

    L.Util.extend(options, sizes[size]);
    L.Util.setOptions(this, options);
  },
  createIcon: function(oldIcon) {
    var options = this.options,
      divIcon = L.DomUtil.create('div', 'npmaki-icon ' + options['marker-size'] + ' ' + options['marker-symbol'] + '-' + options['marker-size'] + (L.Browser.retina ? '-2x': '')),
      divMarker = (oldIcon && oldIcon.tagName === 'DIV') ? oldIcon : document.createElement('div');

    //options.className = null;
    //options.html = null;
    this._setIconStyles(divMarker, 'icon');
    divMarker.style.backgroundImage = util.handlebars(NpmakiIcon.MAKI_TEMPLATE, {
      color: options['marker-color'].replace('#', ''),
      retina: L.Browser.retina ? '@2x' : '',
      size: options['marker-size'].slice(0, 1)
    });
    divMarker.appendChild(divIcon);
    return divMarker;
  },
  createShadow: function() {
    return null;
  }
});

module.exports = function(options) {
  return new NpmakiIcon(options);
};

},{"../util/util":75}],48:[function(require,module,exports){
/* globals L */

var util = require('../../util/util');

var ArcGisServerDynamicLayer = L.Class.extend({
  includes: [
    require('../../mixin/esri')
  ],
  options: {
    opacity: 1,
    position: 'front'
  },
  _defaultLayerParams: {
    bboxSR: 3857,
    f: 'image',
    format: 'png24',
    imageSR: 3857,
    layers: '',
    transparent: true
  },
  initialize: function(options) {
    util.strict(options.url, 'string');

    this._layerParams = L.Util.extend({}, this._defaultLayerParams);
    this._serviceUrl = this._cleanUrl(options.url);

    for (var option in options) {
      if (this._defaultLayerParams.hasOwnProperty(option)) {
        this._layerParams[option] = options[option];
      }
    }

    this._parseLayers();
    L.Util.setOptions(this, options);

    if (!this._layerParams.transparent) {
      this.options.opacity = 1;
    }

    if (options.clickable === false) {
      this._hasInteractivity = false;
    }

    this._getMetadata();
  },
  onAdd: function(map) {
    this._map = map;
    this._moveHandler = this._debounce(this._update, 150, this);

    if (map.options.crs && map.options.crs.code) {
      var sr = map.options.crs.code.split(':')[1];

      this._layerParams.bboxSR = sr;
      this._layerParams.imageSR = sr;
    }

    map.on('moveend', this._moveHandler, this);
    this._update();
  },
  onRemove: function(map) {
    if (this._currentImage) {
      this._map.removeLayer(this._currentImage);
    }

    map.off('moveend', this._moveHandler, this);
  },
  _debounce: function(fn, delay) {
    var timer = null;

    return function() {
      var context = this || context, args = arguments;

      clearTimeout(timer);

      timer = setTimeout(function () {
        fn.apply(context, args);
      }, delay);
    };
  },
  _getImageUrl: function () {
    var map = this._map,
      bounds = map.getBounds(),
      crs = map.options.crs,
      layerParams = this._layerParams,
      size = map.getSize(),
      ne = crs.project(bounds._northEast),
      options = this.options,
      sw = crs.project(bounds._southWest);

    layerParams.bbox = [sw.x, sw.y, ne.x, ne.y].join(',');
    layerParams.size = size.x + ',' + size.y;

    if (options.edit) {
      layerParams.nocache = new Date().getTime();
    }

    if (options.token) {
      layerParams.token = options.token;
    }

    return this._serviceUrl + 'export' + L.Util.getParamString(layerParams);
  },
  _parseLayers: function () {
    if (typeof this._layerParams.layers === 'undefined') {
      delete this._layerParams.layerOption;
      return;
    }

    var action = this._layerParams.layerOption || null,
      layers = this._layerParams.layers || null,
      verb = 'show',
      verbs = ['exclude', 'hide', 'include', 'show'];

    delete this._layerParams.layerOption;

    if (!action) {
      if (L.Util.isArray(layers)) {
        this._layerParams.layers = verb + ':' + layers.join(',');
      } else if (typeof layers === 'string') {
        var match = layers.match(':');

        if (match) {
          layers = layers.split(match[0]);

          if (Number(layers[1].split(',')[0])) {
            if (verbs.indexOf(layers[0]) !== -1) {
              verb = layers[0];
            }

            layers = layers[1];
          }
        }

        this._layerParams.layers = verb + ':' + layers;
      }
    } else {
      if (verbs.indexOf(action) !== -1) {
        verb = action;
      }

      this._layerParams.layers = verb + ':' + layers;
    }
  },
  _update: function() {
    var bounds, image, zoom;

    if (this._animatingZoom) {
      return;
    }

    if (this._map._panTransition && this._map._panTransition._inProgress) {
      return;
    }

    zoom = this._map.getZoom();

    if (zoom > this.options.maxZoom || zoom < this.options.minZoom) {
      return;
    }

    bounds = this._map.getBounds();
    bounds._southWest.wrap();
    bounds._northEast.wrap();
    image = new L.ImageOverlay(this._getImageUrl(), bounds, {
      opacity: 0
    }).addTo(this._map);
    image.on('load', function(e){
      var newImage = e.target,
        oldImage = this._currentImage;

      
      if (newImage._bounds.equals(bounds)) {
        this._currentImage = newImage;

        if (this.options.position === 'front') {
          this._currentImage.bringToFront();
        } else {
          this._currentImage.bringToBack();
        }

        this._currentImage.setOpacity(this.options.opacity);

        if (oldImage) {
          this._map.removeLayer(oldImage);
        }
      } else {
        this._map.removeLayer(newImage);
      }
    }, this);
  },
  bringToBack: function(){
    this.options.position = 'back';
    this._currentImage.bringToBack();
    return this;
  },
  bringToFront: function(){
    this.options.position = 'front';
    this._currentImage.bringToFront();
    return this;
  },
  getLayers: function() {
    return this._layerParams.layers;
  },
  redraw: function() {
    this._update();
  },
  setLayers: function(layers) {
    if (typeof layers === 'number') {
      layers = layers.toString();
    }

    this._layerParams.layers = layers;
    this._parseLayers();
    this._map.removeLayer(this._currentImage);
    this._update();
  },
  setOpacity: function(opacity) {
    this.options.opacity = opacity;
    this._currentImage.setOpacity(opacity);
  }
});

module.exports = function(options) {
  return new ArcGisServerDynamicLayer(options);
};

},{"../../mixin/esri":63,"../../util/util":75}],49:[function(require,module,exports){
/* global L */

'use strict';

var util = require('../../util/util');

var ArcGisServerTiledLayer = L.TileLayer.extend({
  includes: [
    require('../../mixin/esri')
  ],
  options: {
    errorTileUrl: L.Util.emptyImageUrl
  },
  initialize: function(options) {
    L.Util.setOptions(this, options);
    util.strict(options.url, 'string');
    this._serviceUrl = this._cleanUrl(options.url);
    this.tileUrl = this._cleanUrl(options.url) + 'tile/{z}/{y}/{x}';

    if (options.clickable === false) {
      this._hasInteractivity = false;
    }

    L.TileLayer.prototype.initialize.call(this, this.tileUrl, options);
    this._getMetadata();
  },
});

module.exports = function(options) {
  return new ArcGisServerTiledLayer(options);
};

},{"../../mixin/esri":63,"../../util/util":75}],50:[function(require,module,exports){
/* global L */

'use strict';

var BingLayer = L.TileLayer.extend({
  options: {
    attribution: 'Bing',
    culture: 'en-US',
    layer: 'aerial',
    subdomains: [0, 1, 2, 3]
  },
  initialize: function(options) {
    L.Util.setOptions(this, options);

    this._key = 'Ag4-2f0g7bcmcVgKeNYvH_byJpiPQSx4F9l0aQaz9pDYMORbeBFZ0N3C3A5LSf65';
    this._url = null;
    this.meta = {};
    this.loadMetadata();
  },
  onRemove: function(map) {
    for (var i = 0; i < this._providers.length; i++) {
      var p = this._providers[i];

      if (p.active && this._map.attributionControl) {
        this._map.attributionControl.removeAttribution(p.attrib);
        p.active = false;
      }
    }

    L.TileLayer.prototype.onRemove.apply(this, [map]);
  },
  _update: function() {
    if (this._url == null || !this._map) {
      return;
    }

    this._updateAttribution();
    L.TileLayer.prototype._update.apply(this, []);
  },
  _updateAttribution: function() {
    var bounds = this._map.getBounds(),
      zoom = this._map.getZoom();

    for (var i = 0; i < this._providers.length; i++) {
      var p = this._providers[i];

      if ((zoom <= p.zoomMax && zoom >= p.zoomMin) && bounds.intersects(p.bounds)) {
        if (!p.active && this._map.attributionControl) {
          this._map.attributionControl.addAttribution(p.attrib);
        }

        p.active = true;
      } else {
        if (p.active && this._map.attributionControl) {
          this._map.attributionControl.removeAttribution(p.attrib);
        }

        p.active = false;
      }
    }
  },
  getTileUrl: function(p) {
    var subdomains = this.options.subdomains,
      s = this.options.subdomains[Math.abs((p.x + p.y) % subdomains.length)],
      z = this._getZoomForUrl();

    return this._url.replace('{subdomain}', s)
      .replace('{quadkey}', this.tile2quad(p.x, p.y, z))
      .replace('http:', document.location.protocol)
      .replace('{culture}', this.options.culture);
  },
  initMetadata: function() {
    var r = this.meta.resourceSets[0].resources[0];

    this.options.subdomains = r.imageUrlSubdomains;
    this._url = r.imageUrl;
    this._providers = [];

    if (r.imageryProviders) {
      for (var i = 0; i < r.imageryProviders.length; i++) {
        var p = r.imageryProviders[i];

        for (var j = 0; j < p.coverageAreas.length; j++) {
          var c = p.coverageAreas[j],
            coverage = {zoomMin: c.zoomMin, zoomMax: c.zoomMax, active: false},
            bounds = new L.LatLngBounds(
              new L.LatLng(c.bbox[0]+0.01, c.bbox[1]+0.01),
              new L.LatLng(c.bbox[2]-0.01, c.bbox[3]-0.01)
            );

          coverage.bounds = bounds;
          coverage.attrib = p.attribution;
          this._providers.push(coverage);
        }
      }
    }

    this._update();
  },
  loadMetadata: function() {
    var cbid = '_bing_metadata_' + L.Util.stamp(this),
      me = this,
      script = document.createElement('script');

    window[cbid] = function(meta) {
      var e = document.getElementById(cbid);

      me.meta = meta;
      window[cbid] = undefined;
      e.parentNode.removeChild(e);

      if (meta.errorDetails) {
        if (window.console) {
          console.error('Error: ' + meta.errorDetails);
        }

        return;
      }

      me.initMetadata();
    };

    script.src = document.location.protocol + '//dev.virtualearth.net/REST/v1/Imagery/Metadata/' + this.options.layer + '?include=ImageryProviders&jsonp=' + cbid + '&key=' + this._key;
    script.id = cbid;
    document.getElementsByTagName('head')[0].appendChild(script);
  },
  tile2quad: function(x, y, z) {
    var quad = '';

    for (var i = z; i > 0; i--) {
      var digit = 0,
        mask = 1 << (i - 1);

      if ((x & mask) !== 0) {
        digit += 1;
      }

      if ((y & mask) !== 0) {
        digit += 2;
      }

      quad = quad + digit;
    }

    return quad;
  }
});

module.exports = function(options) {
  return new BingLayer(options);
};

},{}],51:[function(require,module,exports){
/* global document, L */
/* jshint camelcase: false */

'use strict';

var reqwest = require('reqwest'),
  utfGrid = require('../util/utfgrid'),
  util = require('../util/util');

var CartoDbLayer = L.TileLayer.extend({
  options: {
    errorTileUrl: L.Util.emptyImageUrl,
    format: 'png',
    subdomains: [
      0,
      1,
      2,
      3
    ]
  },
  initialize: function(options) {
    if (!L.Browser.retina || !options.detectRetina) {
      options.detectRetina = false;
    }

    L.Util.setOptions(this, options);
    util.strict(this.options.table, 'string');
    util.strict(this.options.user, 'string');
    L.TileLayer.prototype.initialize.call(this, undefined, this.options);
    this._build();
  },
  _update: function() {
    if (this._urlTile) {
      L.TileLayer.prototype._update.call(this);
    }
  },
  _build: function() {
    var me = this;

    this._urlApi = 'https://' + this.options.user + '.cartodb.com/api/v2/sql';
    reqwest({
      success: function(response) {
        var cartocss;

        me._hasInteractivity = false;
        me._interactivity = null;

        if (me.options.interactivity) {
          me._interactivity = me.options.interactivity.split(',');
        } else if (me.options.clickable !== false && response.fields) {
          me._interactivity = [];

          for (var field in response.fields) {
            if (response.fields[field].type !== 'geometry') {
              me._interactivity.push(field);
            }
          }

          if (me._interactivity.length) {
            me._hasInteractivity = true;
          }
        }

        if (me.options.cartocss) {
          cartocss = me.options.cartocss;
        } else if (me.options.styles) {
          cartocss = me._stylesToCartoCss(me.options.styles);
        } else {
          cartocss = '#layer{line-color:#d39800;line-opacity:0.8;line-width:3;marker-fill:#d39800;marker-height:8;polygon-fill:#d39800;polygon-opacity:0.2;}';
        }

        me._cartocss = cartocss;
        me._sql = (me.options.sql || ('SELECT * FROM ' + me.options.table + ';'));

        reqwest({
          success: function(response) {
            var root = 'http://{s}.api.cartocdn.com/' + me.options.user + '/tiles/layergroup/' + response.layergroupid,
              template = '{z}/{x}/{y}';

            if (me._hasInteractivity && me._interactivity.length) {
              me._urlGrid = root + '/0/' + template + '.grid.json';
              me._grid = new utfGrid(me);
            }

            me._urlTile = root + '/' + template + '.png';
            me.setUrl(me._urlTile);
            me.redraw();
            return me;
          },
          type: 'jsonp',
          url: util.buildUrl('http://' + me.options.user + '.cartodb.com/tiles/layergroup', {
            config: JSON.stringify({
              layers: [{
                options: {
                  cartocss: me._cartocss,
                  cartocss_version: '2.1.0',
                  interactivity: me._interactivity,
                  sql: me._sql
                },
                stat_tag: 'API',
                type: 'cartodb'
              }],
              version: '1.0.0'
            })
          })
        });
      },
      type: 'jsonp',
      url: util.buildUrl(this._urlApi, {
        q: 'select * from ' + this.options.table + ' limit 1;'
      })
    });
  },
  _getGridData: function(latLng, callback) {
    var me = this;

    if (this._urlGrid) {
      this._grid.getTileGrid(L.Util.template(this._urlGrid, L.Util.extend({
        s: this.options.subdomains[Math.floor(Math.random() * this.options.subdomains.length)]
      }, this._grid.getTileCoords(latLng))), latLng, function(resultData, gridData) {
        if (gridData) {
          callback({
            layer: me,
            results: [
              gridData
            ]
          });
        } else {
          callback(null);
        }
      });
    } else {
      callback(null);
    }
  },
  _handleClick: function(latLng, callback) {
    this._getGridData(latLng, callback);
  },
  _handleMousemove: function(latLng, callback) {
    this._getGridData(latLng, callback);
  },
  _stylesToCartoCss: function(styles) {
    var cartoCss = {},
      match = {
        'fill': 'polygon-fill',
        'fill-opacity': 'polygon-opacity',
        'marker-color': 'marker-fill',
        'marker-size': function(value) {
          var size = 8;

          if (value === 'large') {
            size = 16;
          } else if (value === 'medium') {
            size = 12;
          }

          cartoCss['marker-height'] = size;
          cartoCss['marker-width'] = size;
        },
        'stroke': 'line-color',
        'stroke-opacity': 'line-opacity',
        'stroke-width': 'line-width'
      };

    for (var property in styles) {
      var value = styles[property];

      if (typeof match[property] === 'function') {
        match[property](value);
      } else if (typeof match[property] === 'string') {
        cartoCss[match[property]] = value;
      }
    }

    return '#layer' + JSON.stringify(cartoCss).replace(/"/g, '').replace(/,/g, ';');
  }
});

module.exports = function(config) {
  return new CartoDbLayer(config);
};

},{"../util/utfgrid":74,"../util/util":75,"reqwest":28}],52:[function(require,module,exports){
/* global L */

'use strict';

require('leaflet.markercluster');

var ClusterLayer = L.MarkerClusterGroup.extend({
  options: {
    showCoverageOnHover: false
  },
  initialize: function(options) {
    var me = this;

    L.Util.setOptions(this, options);

    if (options.cluster === true) {
      options.cluster = {};
    }

    options.cluster.iconCreateFunction = new this.createCustomIconFunction(options.cluster.clusterIcon);
    L.Util.setOptions(this, options.cluster);
    options.clustered = options.cluster.iconCreateFunction('getInfo');
    delete options.cluster;
    this.L = L.npmap.layer[options.type](options);
    this._currentShownBounds = null;
    this._featureGroup = new L.FeatureGroup();
    this._featureGroup.on(L.FeatureGroup.EVENTS, this._propagateEvent, this);
    this._inZoomAnimation = 0;
    this._needsClustering = [];
    this._needsRemoving = [];
    this._nonPointGroup = L.featureGroup();
    this._nonPointGroup.on(L.FeatureGroup.EVENTS, this._propagateEvent, this);
    this._queue = [];
    this.L.on('ready', function(that) {
      me.addLayer(that.target);
    }, this);

    return this;
  },
  onAdd: function(map) {
    this._map = map;
    this._addAttribution();
    L.MarkerClusterGroup.prototype.onAdd.call(this, map);
  },
  onRemove: function() {
    delete this._map;
    this._removeAttribution();
    L.MarkerClusterGroup.prototype.onRemove.call(this);
  },
  _addAttribution: function() {
    var attribution = this.options.attribution;

    if (attribution && this._map.attributionControl) {
      this._map.attributionControl.addAttribution(attribution);
    }
  },
  _removeAttribution: function() {
    var attribution = this.options.attribution;

    if (attribution && this._map.attributionControl) {
      this._map.attributionControl.removeAttribution(attribution);
    }
  },
  createCustomIconFunction: function(settings) {
    var defaultSettings = [{
      name: 'small',
      maxNodes: 9,
      color: '#7A904F',
      size: 20,
      outerRing: 22,
      fontColor: '#fff'
    },{
      name: 'medium',
      maxNodes: 99,
      color: '#D49900',
      size: 35,
      outerRing: 24,
      fontColor: '#fff'
    },{
      name: 'large',
      maxNodes: Infinity,
      color: '#814705',
      size: 50,
      outerRing: 24,
      fontColor: '#fff'
    }];

    function addStyles() {
      var style = document.createElement('style');

      for (var i = 0; i < defaultSettings.length; i++) {
        var currStyle = createStyle(defaultSettings[i]);

        for (var styleType in currStyle) {
          style.textContent += '.' + 'marker-cluster-custom-' + defaultSettings[i].maxNodes.toString() + ' ' + (styleType === 'main' ? '' : styleType)  + ' {' + currStyle[styleType]  + '}\n';
        }
      }

      style.type = 'text/css';
      style.textContent += '.leaflet-cluster-anim .leaflet-marker-icon, .leaflet-cluster-anim .leaflet-marker-shadow {';
      style.textContent += '-webkit-transition: -webkit-transform 0.2s ease-out, opacity 0.2s ease-in;';
      style.textContent += '-moz-transition: -moz-transform 0.2s ease-out, opacity 0.2s ease-in;';
      style.textContent += '-o-transition: -o-transform 0.2s ease-out, opacity 0.2s ease-in;';
      style.textContent += 'transition: transform 0.2s ease-out, opacity 0.2s ease-in;';
      style.textContent += '}';
      document.getElementsByTagName('head')[0].appendChild(style);
    }
    function autoTextColor(rgb) {
      if (Object.prototype.toString.call(rgb) !== '[object Array]') {
        rgb = hexToArray(rgb);
      }

      if (rgb) {
        var brightness = (((rgb[0] * 299) + (rgb[1] * 587) + (rgb[2]* 144)) / 1000);

        if (brightness > 127) {
          return '#000';
        } else {
          return '#fff';
        }
      } else {
        return false;
      }
    }
    function createStyle(style) {
      var styles = {
        main: {
          'background-clip': 'padding-box',
          'background-color': supportsRgba('rgba(' +  hexToArray(style.color)[0] +', ' +  hexToArray(style.color)[1] + ', ' +  hexToArray(style.color)[2] + ', 0.4)'),
          'border-radius': ((style.size + style.outerRing)*0.5) + 'px'
        },
        div: {
          'text-align': 'center',
          'background-color': supportsRgba('rgba(' +  hexToArray(style.color)[0] +', ' +  hexToArray(style.color)[1] + ', ' +  hexToArray(style.color)[2] + ', 0.9)'),
          width: style.size + 'px',
          height: style.size + 'px',
          'margin-left': (style.outerRing / 2) + 'px',
          'margin-top': (style.outerRing / 2) + 'px',
          'border-radius': (style.size / 2) + 'px'
        },
        span: {
          font: '12px Frutiger, "Frutiger Linotype", Univers, Calibri, "Gill Sans", "Gill Sans MT", "Myriad Pro", Myriad, "DejaVu Sans Condensed", "Liberation Sans", "Nimbus Sans L", Tahoma, Geneva, "Helvetica Neue", Helvetica, Arial, sans-serif',
          color: 'rgb(' +  hexToArray(style.fontColor)[0] +', ' +  hexToArray(style.fontColor)[1] + ', ' +  hexToArray(style.fontColor)[2] + ')',
          'line-height': style.size + 'px'
        }
      };

      function cssStyle(fields) {
        var returnValue = [];
        for (var field in fields) {
          returnValue.push(field + ': ' + fields[field] +'; ');
        }
        return returnValue.join('');
      }
      function styleLoop(fields, process) {
        var returnValue = {};

        for (var field in fields) {
          returnValue[field] = process(fields[field]);
        }

        return returnValue;
      }

      return styleLoop(styles, cssStyle);
    }
    function customIconCreateFunction(cluster) {
      if (cluster === 'getInfo') {
        return defaultSettings;
      }

      var childCount = cluster.getChildCount(),
        className, size;

      for (var markerIndex = 0; markerIndex < defaultSettings.length; markerIndex++) {
        if (childCount <= defaultSettings[markerIndex].maxNodes) {
          className = 'marker-cluster-custom-' + defaultSettings[markerIndex].maxNodes.toString();
          size = defaultSettings[markerIndex].size + defaultSettings[markerIndex].outerRing;
          break;
        }
      }

      return new L.DivIcon({html: '<div><span>' + childCount + '</span></div>', className: className, iconSize: new L.Point(size, size) });
    }
    function hexToArray(hexValue) {
      var returnValue = false;

      if (typeof(hexValue) === 'string') {
        hexValue = hexValue.replace('#', '');

        if (hexValue.length === 3) {
          hexValue = hexValue.replace(/(.)(.)(.)/g, '$1$1$2$2$3$3');
        }

        if (hexValue.match(/[\da-fA-F]{6}$/)) {
          returnValue = [
            parseInt(hexValue.substr(0,2), 16),
            parseInt(hexValue.substr(2,2), 16),
            parseInt(hexValue.substr(4,2), 16)
          ];
        }
      }

      return returnValue;
    }
    function supportsRgba(color) {
      var returnValue = false,
        rgbaTestVal = 'rgba(0,0,0,0.1)',
        testDiv = document.createElement('div'),
        newColor;

      testDiv.style.color = rgbaTestVal;

      if (testDiv.style.color.substr(0,4) === 'rgba') {
        returnValue = true;
      }

      if (color) {
        if (returnValue) {
          return color;
        } else {
          newColor = color.replace(/^rgba\(/g, 'rgb(,').replace(')','').split(',');
          newColor[1] = Math.floor(parseInt(newColor[1],10) + (255 * (1 - parseFloat(newColor[4], 10))));
          newColor[2] = Math.floor(parseInt(newColor[2],10) + (255 * (1 - parseFloat(newColor[4], 10))));
          newColor[3] = Math.floor(parseInt(newColor[3],10) + (255 * (1 - parseFloat(newColor[4], 10))));
          if (newColor[1] > 255) {newColor[1] = 255;}
          if (newColor[2] > 255) {newColor[2] = 255;}
          if (newColor[3] > 255) {newColor[3] = 255;}
          newColor = newColor.slice(0,4).join(',').replace('(,','(') + ')';

          return newColor;
        }
      } else {
        return returnValue;
      }
    }
    function updateDefaults(newSettings) {
      for (var j = 0; j < defaultSettings.length; j++) {
        if (defaultSettings[j].name && newSettings[defaultSettings[j].name]) {
          L.Util.extend(defaultSettings[j], newSettings[defaultSettings[j].name]);

          if (!newSettings[defaultSettings[j].name].fontColor && newSettings[defaultSettings[j].name].color) {
            defaultSettings[j].fontColor = autoTextColor(hexToArray(newSettings[defaultSettings[j].name].color));
          }
        }
      }
    }

    if (settings) {
      if (typeof settings === 'string') {
        updateDefaults({'small': {'color': settings}, 'medium': {'color': settings}, 'large': {'color': settings}});
      } else if (Object.prototype.toString.call(settings) === '[object Object]') {
        updateDefaults(settings);
      } else if (Object.prototype.toString.call(settings) === '[object Array]') {
        defaultSettings = settings;
      }
    }

    addStyles();
    return customIconCreateFunction;
  }
});

module.exports = function(options) {
  return new ClusterLayer(options);
};

},{"leaflet.markercluster":24}],53:[function(require,module,exports){
/* global L */

'use strict';

var reqwest = require('reqwest'),
  csv2geojson = require('csv2geojson'),
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
          // TODO: Display load error.
        }
      });
    }
  },
  _create: function(options, csv) {
    var me = this;

    csv2geojson.csv2geojson(csv, {}, function(error, data) {
      L.GeoJSON.prototype.initialize.call(me, data, options);
      me.fire('ready');
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

},{"../mixin/geojson":64,"../util/util":75,"csv2geojson":4,"reqwest":28}],54:[function(require,module,exports){
/* global L */

'use strict';

var reqwest = require('reqwest'),
  util = require('../util/util');

var GeoJsonLayer = L.GeoJSON.extend({
  includes: [
    require('../mixin/geojson')
  ],
  initialize: function(options) {
    L.Util.setOptions(this, this._toLeaflet(options));

    if (typeof options.data === 'object') {
      this._create(options, options.data);
    } else {
      var me = this,
        url = options.url;

      util.strict(url, 'string');
      util.loadFile(url, 'json', function(response) {
        if (response) {
          me._create(options, response);
        } else {
          // TODO: Display load error.
        }
      });
    }
  },
  _create: function(options, data) {
    L.GeoJSON.prototype.initialize.call(this, data, options);
    this.fire('ready');
    return this;
  }
});

module.exports = function(options) {
  options = options || {};

  if (options.cluster) {
    return L.npmap.layer._cluster(options);
  } else {
    return new GeoJsonLayer(options);
  }
};

},{"../mixin/geojson":64,"../util/util":75,"reqwest":28}],55:[function(require,module,exports){
/* global L */

'use strict';

var reqwest = require('reqwest'),
  util = require('../util/util');

var GitHubLayer = L.GeoJSON.extend({
  includes: [
    require('../mixin/geojson')
  ],
  initialize: function(options) {
    L.Util.setOptions(this, this._toLeaflet(options));

    if (typeof options.data === 'object') {
      this._create(options, options.data);
    } else {
      var branch = options.branch || 'master',
        me = this;

      util.strict(options.path, 'string');
      util.strict(options.repo, 'string');
      util.strict(options.user, 'string');

      // TODO: Support CORS here for "modern" browsers.
      reqwest({
        success: function(response) {
          me._create(options, JSON.parse(util.base64.decode(response.data.content.replace(/\n|\r/g, ''))));
        },
        type: 'jsonp',
        url: 'https://api.github.com/repos/' + options.user + '/' + options.repo + '/contents/' + options.path + '?ref=' + branch
      });
    }
  },
  _create: function(options, data) {
    L.GeoJSON.prototype.initialize.call(this, data, options);
    this.fire('ready');
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

},{"../mixin/geojson":64,"../util/util":75,"reqwest":28}],56:[function(require,module,exports){
/* global L */

'use strict';

var reqwest = require('reqwest'),
  togeojson = require('togeojson'),
  util = require('../util/util');

var KmlLayer = L.GeoJSON.extend({
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
      util.loadFile(url, 'xml', function(response) {
        if (response) {
          me._create(options, response);
        } else {
          // TODO: Display load error.
        }
      });
    }
  },
  _create: function(options, data) {
    L.GeoJSON.prototype.initialize.call(this, togeojson.kml(new DOMParser().parseFromString(data, 'text/xml')), options);
    this.fire('ready');
    return this;
  }
});

module.exports = function(options) {
  options = options || {};

  if (options.cluster) {
    return L.npmap.layer._cluster(options);
  } else {
    return new KmlLayer(options);
  }
};

},{"../mixin/geojson":64,"../util/util":75,"reqwest":28,"togeojson":29}],57:[function(require,module,exports){
/* global document, L */
/* jslint node: true */

'use strict';

var reqwest = require('reqwest'),
  utfGrid = require('../util/utfgrid'),
  util = require('../util/util');

var MapBoxLayer = L.TileLayer.extend({
  options: {
    errorTileUrl: L.Util.emptyImageUrl,
    format: 'png',
    subdomains: [
      'a',
      'b',
      'c',
      'd'
    ]
  },
  statics: {
    FORMATS: [
      'jpg70',
      'jpg80',
      'jpg90',
      'png',
      'png32',
      'png64',
      'png128',
      'png256'
    ]
  },
  initialize: function(options) {
    var load;

    if (!options.id && !options.tileJson) {
      throw new Error('MapBox layers require either an "id" or "tileJson" property.');
    }

    if (options.format) {
      util.strictOneOf(options.format, MapBoxLayer.FORMATS);
    }

    if (L.Browser.retina && options.retinaVersion) {
      load = options.retinaVersion;
      options.detectRetina = true;
    } else {
      load = options.tileJson || options.id;

      // Retina is opt-in for now.
      if (!L.Browser.retina || !options.detectRetina) {
        options.detectRetina = false;
      }
    }

    L.Util.setOptions(this, options);
    L.TileLayer.prototype.initialize.call(this, undefined, options);
    this._hasInteractivity = false;
    this._loadTileJson(load);
  },
  getTileUrl: function(tilePoint) {
    var tiles = this.options.tiles,
      templated = L.Util.template(tiles[Math.floor(Math.abs(tilePoint.x + tilePoint.y) % tiles.length)], tilePoint);

    if (!templated) {
      return templated;
    } else {
      return templated.replace('.png', (this._autoScale() ? '@2x' : '') + '.' + this.options.format);
    }
  },
  onAdd: function onAdd(map) {
    this._map = map;
    L.TileLayer.prototype.onAdd.call(this, map);
  },
  onRemove: function onRemove() {
    L.TileLayer.prototype.onRemove.call(this, this._map);
  },
  _autoScale: function() {
    return L.Browser.retina && this.options.autoscale && this.options.detectRetina;
  },
  _getGridData: function(latLng, callback) {
    var me = this;

    this._grid.getTileGrid(this._getTileGridUrl(latLng), latLng, function(resultData, gridData) {
      if (gridData) {
        callback({
          layer: me,
          results: [
            gridData
          ]
        });
      } else {
        callback(null);
      }
    });
  },
  _getTileGridUrl: function(latLng) {
    var grids = this.options.grids,
      gridTileCoords = this._grid.getTileCoords(latLng);

    return L.Util.template(grids[Math.floor(Math.abs(gridTileCoords.x + gridTileCoords.y) % grids.length)], gridTileCoords);
  },
  _handleClick: function(latLng, callback) {
    this._getGridData(latLng, callback);
  },
  _handleMousemove: function (latLng, callback) {
    this._getGridData(latLng, callback);
  },
  _loadTileJson: function(from) {
    if (typeof from === 'string') {
      var me = this;

      if (from.indexOf('/') === -1) {
        from = (function(hash) {
          var urls = (function() {
            var endpoints = [
              'a.tiles.mapbox.com/v3/',
              'b.tiles.mapbox.com/v3/',
              'c.tiles.mapbox.com/v3/',
              'd.tiles.mapbox.com/v3/'
            ];

            for (var i = 0; i < endpoints.length; i++) {
              endpoints[i] = [document.location.protocol, '//', endpoints[i]].join('');
            }

            return endpoints;
          })();

          if (hash === undefined || typeof hash !== 'number') {
            return urls[0];
          } else {
            return urls[hash % urls.length];
          }
        })() + from + '.json';
      }

      reqwest({
        error: function(error) {
          me.fire('error', {
            error: error
          });
        },
        success: function(response) {
          if (response) {
            me._setTileJson(response);
            me.fire('ready');
          } else {
            me.fire('error', {
              error: 'Error'
            });
          }
        },
        type: 'jsonp',
        url: (function(url) {
          if ('https:' !== document.location.protocol) {
            return url;
          } else if (url.match(/(\?|&)secure/)) {
            return url;
          } else if (url.indexOf('?') !== -1) {
            return url + '&secure';
          } else {
            return url + '?secure';
          }
        })(from)
      });
    } else if (typeof _ === 'object') {
      this._setTileJson(from);
    }
  },
  _setTileJson: function(json) {
    var me = this,
      extend;

    util.strict(json, 'object');

    extend = {
      attribution: (function() {
        if (me.options.attribution) {
          return me.options.attribution;
        } else if (json.attribution) {
          return json.attribution;
        } else {
          return null;
        }
      })(),
      autoscale: json.autoscale || false,
      bounds: json.bounds ? this._toLeafletBounds(json.bounds) : null,
      grids: json.grids ? json.grids : null,
      maxZoom: json.maxzoom,
      minZoom: json.minzoom,
      tiles: json.tiles,
      tms: json.scheme === 'tms'
    };

    if (typeof this.options.attribution === 'undefined') {
      extend.attribution = json.attribution;
    }

    if (this.options.clickable !== false) {
      this._hasInteractivity = typeof json.grids === 'object';

      if (this._hasInteractivity) {
        this._grid = new utfGrid(this);
      }
    }

    if (typeof this.options.maxZoom === 'undefined') {
      extend.maxZoom = json.maxzoom;
    }

    if (typeof this.options.minZoom === 'undefined') {
      extend.minZoom = json.minzoom;
    }

    L.extend(this.options, extend);
    this.tileJson = json;
    this.redraw();
    return this;
  },
  _toLeafletBounds: function(_) {
    return new L.LatLngBounds([[_[1], _[0]], [_[3], _[2]]]);
  },
  _update: function() {
    if (this.options.tiles) {
      L.TileLayer.prototype._update.call(this);
    }
  }
});

module.exports = function(options) {
  return new MapBoxLayer(options);
};

},{"../util/utfgrid":74,"../util/util":75,"reqwest":28}],58:[function(require,module,exports){
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
        response = response.response;

        if (response && response.feedMessageResponse && response.feedMessageResponse.messages && response.feedMessageResponse.messages.message) {
          var geoJson = {
              features: [],
              type: 'FeatureCollection'
            },
            messages = response.feedMessageResponse.messages.message;

          for (var i = 0; i < messages.length; i++) {
            var message = messages[i];

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
            // TODO: Display nonmodal error.
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
    return this;
  }
});

module.exports = function(options) {
  return new SpotLayer(options);
};

},{"../mixin/geojson":64,"../util/util":75,"reqwest":28}],59:[function(require,module,exports){
/* global L */

'use strict';

var util = require('../util/util');

var TiledLayer = L.TileLayer.extend({
  options: {
    errorTileUrl: L.Util.emptyImageUrl
  },
  initialize: function(options) {
    util.strict(options.url, 'string');
    L.Util.setOptions(this, options);
    L.TileLayer.prototype.initialize.call(this, options.url, options);
    return this;
  }
});

module.exports = function(options) {
  return new TiledLayer(options);
};

},{"../util/util":75}],60:[function(require,module,exports){
/* global L */

'use strict';

var util = require('../util/util');

var WmsLayer = L.TileLayer.WMS.extend({
  initialize: function(options) {
    util.strict(options.layers, 'string');
    util.strict(options.url, 'string');
    L.Util.setOptions(this, options);
    L.TileLayer.WMS.prototype.initialize.call(this, options.url, options);
    return this;
  }
});

module.exports = function(options) {
  return new WmsLayer(options);
};

},{"../util/util":75}],61:[function(require,module,exports){
/* global L */

'use strict'

var util = require('../util/util');

var ZoomifyLayer = L.TileLayer.extend({
  options: {
    continuousWorld: true,
    tolerance: 0.8
  },
  initialize: function(options) {
    var imageSize, tileSize;

    options = L.setOptions(this, options);
    util.strict(options.height, 'number');
    util.strict(options.url, 'string');
    util.strict(options.width, 'number');
    this._url = options.url;
    imageSize = new L.Point(options.width, options.height);
    tileSize = options.tileSize;
    this._imageSize = [
      imageSize
    ];
    this._gridSize = [
      this._getGridSize(imageSize)
    ];

    while (parseInt(imageSize.x, 10) > tileSize || parseInt(imageSize.y, 10) > tileSize) {
      imageSize = imageSize.divideBy(2).floor();
      this._imageSize.push(imageSize);
      this._gridSize.push(this._getGridSize(imageSize));
    }

    this._imageSize.reverse();
    this._gridSize.reverse();
    this.options.maxZoom = this._gridSize.length - 1;
  },
  getTileUrl: function (tilePoint) {
    return this._url + 'TileGroup' + this._getTileGroup(tilePoint) + '/' + this._map.getZoom() + '-' + tilePoint.x + '-' + tilePoint.y + '.jpg';
  },
  onAdd: function(map) {
    var zoom = this._getBestFitZoom(map.getSize()),
      imageSize = this._imageSize[zoom],
      center = map.options.crs.pointToLatLng(L.point(imageSize.x / 2, imageSize.y / 2), zoom);

    L.TileLayer.prototype.onAdd.call(this, map);
    map.options.center = center;
    map.options.zoom = zoom - 1;
    map.setView(center, zoom - 1, true);
  },
  _addTile: function (tilePoint, container) {
    var tilePos = this._getTilePos(tilePoint),
      tile = this._getTile(),
      zoom = this._map.getZoom(),
      imageSize = this._imageSize[zoom],
      gridSize = this._gridSize[zoom],
      tileSize = this.options.tileSize;

    if (tilePoint.x === gridSize.x - 1) {
      tile.style.width = imageSize.x - (tileSize * (gridSize.x - 1)) + 'px';
    }

    if (tilePoint.y === gridSize.y - 1) {
      tile.style.height = imageSize.y - (tileSize * (gridSize.y - 1)) + 'px';
    }

    L.DomUtil.setPosition(tile, tilePos, L.Browser.chrome || L.Browser.android23);
    this._tiles[tilePoint.x + ':' + tilePoint.y] = tile;
    this._loadTile(tile, tilePoint);

    if (tile.parentNode !== this._tileContainer) {
      container.appendChild(tile);
    }
  },
  _getBestFitZoom: function (mapSize) {
    var tolerance = this.options.tolerance,
      zoom = this._imageSize.length - 1,
      imageSize;

    while (zoom) {
      imageSize = this._imageSize[zoom];

      if (imageSize.x * tolerance < mapSize.x && imageSize.y * tolerance < mapSize.y) {
        return zoom;
      }

      zoom--;
    }

    return zoom;
  },
  _getGridSize: function (imageSize) {
    var tileSize = this.options.tileSize;

    return L.point(Math.ceil(imageSize.x / tileSize), Math.ceil(imageSize.y / tileSize));
  },
  _getTileGroup: function (tilePoint) {
    var zoom = this._map.getZoom(),
      num = 0,
      gridSize;

    for (var z = 0; z < zoom; z++) {
      gridSize = this._gridSize[z];
      num += gridSize.x * gridSize.y;
    }

    num += tilePoint.y * this._gridSize[zoom].x + tilePoint.x;

    return Math.floor(num / 256);
  },
  _tileShouldBeLoaded: function (tilePoint) {
    var gridSize = this._gridSize[this._map.getZoom()];

    return (tilePoint.x >= 0 && tilePoint.x < gridSize.x && tilePoint.y >= 0 && tilePoint.y < gridSize.y);
  }
});

module.exports = function(options) {
  return new ZoomifyLayer(options);
};

},{"../util/util":75}],62:[function(require,module,exports){
/* global L, NPMap */

'use strict';

var baselayerPresets = require('./preset/baselayers.json'),
  colorPresets = require('./preset/colors.json'),
  humane = require('humane-js'),
  nanobar = require('nanobar'),
  overlayPresets = require('./preset/overlays.json'),
  util = require('./util/util');

require('./popup.js');

(function() {
  var style = colorPresets.gold;

  L.Circle.mergeOptions(style);
  L.CircleMarker.mergeOptions(style);
  L.Control.Attribution.mergeOptions({
    prefix: '<a href="http://www.nps.gov/npmap/disclaimer.html" target="_blank">Disclaimer</a>'
  });
  L.Map.addInitHook(function() {
    var me = this;

    function resize() {
      var container = me.getContainer(),
        left = util.getOuterDimensions(util.getChildElementsByClassName(container, 'leaflet-control-container')[0].childNodes[2]).width;

      if (left) {
        left = left + 20;
      }

      util.getChildElementsByClassName(container, 'leaflet-control-attribution')[0].style['max-width'] = (util.getOuterDimensions(container).width - left) + 'px';
    }

    if (this.options.attributionControl) {
      this.attributionControl._update = function() {
        var attribs = [],
          prefixAndAttribs = [];

        for (var attribution in this._attributions) {
          if (this._attributions[attribution] > 0) {
            var i = -1;

            if (attribution) {
              for (var j = 0; j < attribs.length; j++) {
                if (attribs[j] === attribution) {
                  i = j;
                  break;
                }
              }

              if (i === -1) {
                attribs.push(attribution);
              }
            }
          }
        }

        if (this.options.prefix) {
          prefixAndAttribs.push(this.options.prefix);
        }

        if (attribs.length) {
          prefixAndAttribs.push(attribs.join(' | '));
        }

        this._container.innerHTML = prefixAndAttribs.join(' | ');
      };
      this.on('resize', resize);
      resize();
    }
  });
  L.Polygon.mergeOptions(style);
  L.Polyline.mergeOptions({
    color: style.color,
    opacity: style.opacity,
    weight: style.weight
  });
})();

var Map = L.Map.extend({
  initialize: function(config) {
    var baseLayerSet = false,
      container = L.DomUtil.create('div', 'npmap-container'),
      map = L.DomUtil.create('div', 'npmap-map'),
      mapWrapper = L.DomUtil.create('div', 'npmap-map-wrapper'),
      me = this,
      modules = L.DomUtil.create('div', 'npmap-modules'),
      npmap = L.DomUtil.create('div', 'npmap' + ((L.Browser.ie6 || L.Browser.ie7) ? ' npmap-oldie' : '') + (L.Browser.retina ? ' npmap-retina' : '')),
      toolbar = L.DomUtil.create('div', 'npmap-toolbar'),
      toolbarLeft = L.DomUtil.create('ul', 'left'),
      toolbarRight = L.DomUtil.create('ul', 'right'),
      zoomifyMode = false;

    config = me._toLeaflet(config);
    config.div.insertBefore(npmap, config.div.hasChildNodes() ? config.div.childNodes[0] : null);
    npmap.appendChild(modules);
    npmap.appendChild(container);
    toolbar.appendChild(toolbarLeft);
    toolbar.appendChild(toolbarRight);
    container.appendChild(toolbar);
    container.appendChild(mapWrapper);
    mapWrapper.appendChild(map);
    config.div = map;
    config.zoomControl = false;
    L.Map.prototype.initialize.call(me, config.div, config);
    me._controllingCursor = true;
    me._controllingInteractivity = true;
    me._defaultCursor = me.getContainer().style.cursor;
    me.on('autopanstart', function() {
      me._setCursor('');
    });
    this._notify = humane.create({
      baseCls: 'humane-bootstrap',
      container: map,
    });
    this._notify.danger = this._notify.spawn({
      addnCls: 'humane-bootstrap-danger'
    });
    this._notify.info = this._notify.spawn({
      addnCls: 'humane-bootstrap-info'
    });
    this._notify.success = this._notify.spawn({
      addnCls: 'humane-bootstrap-success'
    });
    this._notify.warning = this._notify.spawn({
      addnCls: 'humane-bootstrap-warning'
    });
    this._progress = new nanobar({
      bg: '#d29700',
      id: 'npmap-progress',
      target: map
    });

    if (!me._loaded) {
      me.setView(config.center, config.zoom);
    }

    if (config.baseLayers.length) {
      var zoomify = [],
        baseLayer, i;

      for (i = 0; i < config.baseLayers.length; i++) {
        baseLayer = config.baseLayers[i];

        if (baseLayer.type === 'zoomify') {
          zoomify.push(baseLayer);
        }
      }

      if (zoomify.length) {
        zoomifyMode = true;

        for (i = 0; i < zoomify.length; i++) {
          baseLayer = zoomify[i];

          if (baseLayer.visible || typeof baseLayer.visible === 'undefined') {
            baseLayer.visible = true;
            baseLayer.L = L.npmap.layer.zoomify(baseLayer).addTo(me);
            break;
          }
        }
      } else {
        for (i = 0; i < config.baseLayers.length; i++) {
          baseLayer = config.baseLayers[i];
          baseLayer.zIndex = 0;

          if (!baseLayerSet && (baseLayer.visible || typeof baseLayer.visible === 'undefined')) {
            baseLayer.visible = true;
            baseLayerSet = true;

            if (baseLayer.type === 'arcgisserver') {
              baseLayer.L = L.npmap.layer[baseLayer.type][baseLayer.tiled === true ? 'tiled' : 'dynamic'](baseLayer);
            } else {
              baseLayer.L = L.npmap.layer[baseLayer.type](baseLayer);
            }

            me.addLayer(baseLayer.L);
          } else {
            baseLayer.visible = false;
          }
        }
      }
    }

    if (!zoomifyMode && config.overlays.length) {
      var zIndex = 1;

      for (var j = 0; j < config.overlays.length; j++) {
        var overlay = config.overlays[j];

        if (overlay.type === 'zoomify') {
          throw new Error('Zoomify layers can only be added in the "baseLayers" config property.');
        } else {
          if (overlay.visible || typeof overlay.visible === 'undefined') {
            overlay.visible = true;
            overlay.zIndex = zIndex;

            if (overlay.type === 'arcgisserver') {
              overlay.L = L.npmap.layer[overlay.type][overlay.tiled === true ? 'tiled' : 'dynamic'](overlay);
            } else {
              overlay.L = L.npmap.layer[overlay.type](overlay);
            }

            me.addLayer(overlay.L);
            zIndex++;
          } else {
            overlay.visible = false;
          }
        }
      }
    }

    me._initializeModules();
    me._setupPopup();
    me._setupTooltip();

    return this;
  },
  _initializeModules: function() {
    if (this.options && this.options.modules && L.Util.isArray(this.options.modules) && this.options.modules.length) {
      var initialize = null,
        me = this,
        modules = this.options.modules,
        button, i;

      this._divWrapper = this._container.parentNode.parentNode;
      this._divModules = util.getChildElementsByClassName(this._divWrapper.parentNode.parentNode, 'npmap-modules')[0];
      this._divModuleButtons = L.DomUtil.create('div', 'npmap-modules-buttons', this._container.parentNode);
      this._buttonCloseModules = L.DomUtil.create('button', 'npmap-modules-buttons-button', this._divModuleButtons);
      this._buttonCloseModules.style['background-image'] = 'url(' + NPMap.path + '/images/font-awesome/times' + (L.Browser.retina ? '@2x' : '') + '.png)';
      this._buttonCloseModules.title = 'Close';
      L.DomEvent.addListener(this._buttonCloseModules, 'click', me.closeModules, this);

      for (i = 0; i < modules.length; i++) {
        var module = modules[i],
          title = module.title,
          div = L.DomUtil.create('div', 'module', this._divModules);

        button = L.DomUtil.create('button', 'npmap-modules-buttons-button', this._divModuleButtons);
        button.id = 'npmap-modules-buttons|' + title.replace(/ /g, '_');
        button.title = title;
        button.style['background-image'] = 'url(' + NPMap.path + '/images/font-awesome/' + module.icon + (L.Browser.retina ? '@2x' : '') + '.png)';
        div.id = 'npmap-module|' + title.replace(/ /g, '_');

        if (module.type === 'custom') {
          div.innerHTML = '<h2 class="title">' + title + '</h2><div class="content">' + module.content + '</div>';
        } else {
          // TODO: Get HTML from NPMap.js module.
        }

        L.DomEvent.addListener(button, 'click', function() {
          me.showModule(this.id.replace('npmap-modules-buttons|', ''));
        });

        if (!initialize && module.visible === true) {
          initialize = module.title;
        }
      }

      if (initialize) {
        this.showModule(initialize);
      } else {
        for (i = 1; i < this._divModuleButtons.childNodes.length; i++) {
          button = this._divModuleButtons.childNodes[i];
          button.style.display = 'inline-block';
        }
      }
    }
  },
  _setCursor: function(type) {
    this._container.style.cursor = type;
  },
  _setupPopup: function() {
    var clicks = 0,
      delayClick = false,
      me = this,
      canceled, changed, hasArcGisServer;

    function done() {
      me
        .off('click', setCanceled)
        .off('dragstart', setChanged)
        .off('movestart', setChanged)
        .off('zoomstart', setChanged);

      if (hasArcGisServer) {
        me._progress.go(100);
      }
    }
    function go(e) {
      var queryable = [];

      canceled = false;
      changed = false;
      me
        .on('click', setCanceled)
        .on('dragstart', setChanged)
        .on('movestart', setChanged)
        .on('zoomstart', setChanged);

      for (var layerId in me._layers) {
        layer = me._layers[layerId];

        if (typeof layer.options === 'object' && (typeof layer.options.popup === 'undefined' || layer.options.popup !== false) && typeof layer._handleClick === 'function' && layer._hasInteractivity !== false) {
          queryable.push(layer);
        }
      }

      if (queryable.length) {
        var completed = 0,
          intervals = 0,
          latLng = e.latlng.wrap(),
          results = [],
          i, interval;

        hasArcGisServer = false;

        for (i = 0; i < queryable.length; i++) {
          layer = queryable[i];

          if (layer.options && layer.options.type === 'arcgisserver') {
            hasArcGisServer = true;
          }

          layer._handleClick(latLng, function(result) {
            if (result) {
              results.push(result);
            }

            completed++;
          });
        }

        if (hasArcGisServer) {
          me._progress.go(1);
        }

        interval = setInterval(function() {
          intervals++;

          if (hasArcGisServer) {
            me._progress.go(intervals);
          }

          if (canceled || changed) {
            clearInterval(interval);
            done();
          } else if ((queryable.length === completed) || intervals > 98) {
            clearInterval(interval);
            done();

            if (intervals > 98) {
              // TODO: Show non-modal alert about the timeout.
            }

            if (results.length) {
              var popup = L.npmap.popup({
                autoPanPaddingTopLeft: util._getAutoPanPaddingTopLeft(me.getContainer()),
                maxHeight: util._getAvailableVerticalSpace(me) - 74
              });
              popup.setContent(popup._handleResults(results)).setLatLng(latLng).openOn(me);
            }
          }
        }, 100);
      }
    }
    function setCanceled() {
      canceled = true;
    }
    function setChanged() {
      changed = true;
    }

    for (var layerId in me._layers) {
      var layer = me._layers[layerId];

      if (typeof layer.options === 'object' && layer.options.type === 'arcgisserver') {
        delayClick = true;
        break;
      }
    }

    if (delayClick) {
      me.on('dblclick', function() {
        clicks++;
      });
    }

    me.on('click', function(e) {
      clicks = 0;

      if (me._controllingInteractivity) {
        if (delayClick) {
          setTimeout(function() {
            if (!clicks) {
              go(e);
            }
          }, 200);
        } else {
          go(e);
        }
      }
    });
  },
  _setupTooltip: function() {
    var activeTips = [],
      me = this,
      tooltip = L.npmap.tooltip({
        map: me,
        padding: '7px 10px'
      });

    me._tooltips = [];

    L.DomEvent.on(util.getChildElementsByClassName(me.getContainer(), 'leaflet-popup-pane')[0], 'mousemove', function(e) {
      L.DomEvent.stopPropagation(e);
      tooltip.hide();
    });
    me.on('mousemove', function(e) {
      if (this._controllingCursor) {
        var hasData = false,
          latLng = e.latlng.wrap(),
          newActiveTips = [];

        tooltip.hide();
        
        if (me.getContainer().style.cursor !== 'wait') {
          me._setCursor('');
        }

        for (var i = 0; i < me._tooltips.length; i++) {
          if (activeTips.indexOf(me._tooltips[i]) === -1) {
            newActiveTips.push(me._tooltips[i]);
          }
        }

        activeTips = [];
        me._tooltips = newActiveTips;

        for (var layerId in me._layers) {
          var layer = me._layers[layerId];

          if (typeof layer._handleMousemove === 'function' && layer._hasInteractivity !== false) {
            layer._handleMousemove(latLng, function(result) {
              if (result) {
                var l = result.layer;

                hasData = true;

                if (l.options && l.options.tooltip) {
                  for (var i = 0; i < result.results.length; i++) {
                    var data = result.results[i],
                      tip;

                    if (typeof l.options.tooltip === 'function') {
                      tip = util.handlebars(l.options.tooltip(data));
                    } else if (typeof l.options.tooltip === 'string') {
                      tip = util.unescapeHtml(util.handlebars(l.options.tooltip, data));
                    }

                    if (tip) {
                      me._tooltips.push(tip);
                      activeTips.push(tip);
                    }
                  }
                }
              }
            });
          }
        }

        if (hasData) {
          me._setCursor('pointer');
        }

        if (me._tooltips.length) {
          tooltip.show(e.containerPoint, me._tooltips.join('<br>'));
        }
      }
    });
    me.on('mouseout', function() {
      tooltip.hide();
    });
  },
  _toLeaflet: function(config) {
    if (!config.div) {
      throw new Error('The map config object must have a div property');
    } else if (typeof config.div !== 'string' && typeof config.div !== 'object') {
      throw new Error('The map config object must be either a string or object');
    }

    if (config.baseLayers === false || (L.Util.isArray(config.baseLayers) && !config.baseLayers.length)) {
      config.baseLayers = [];
    } else {
      config.baseLayers = (function() {
        var visible = false;

        if (config.baseLayers && L.Util.isArray(config.baseLayers) && config.baseLayers.length) {
          for (var i = 0; i < config.baseLayers.length; i++) {
            var baseLayer = config.baseLayers[i];

            if (typeof baseLayer === 'string') {
              var name = baseLayer.split('-');

              if (name[1]) {
                baseLayer = baselayerPresets[name[0]][name[1]];
              } else {
                baseLayer = baselayerPresets[name];
              }
            }

            if (baseLayer.visible === true || typeof baseLayer.visible === 'undefined') {
              if (visible) {
                baseLayer.visible = false;
              } else {
                baseLayer.visible = true;
                visible = true;
              }
            } else {
              baseLayer.visible = false;
            }

            baseLayer.zIndex = 0;
            config.baseLayers[i] = baseLayer;
          }
        }

        if (visible) {
          return config.baseLayers;
        } else {
          var active = baselayerPresets.nps.lightStreets;
          active.visible = true;
          active.zIndex = 0;
          return [
            active
          ];
        }
      })();
    }

    config.center = (function() {
      var c = config.center;

      if (c) {
        return new L.LatLng(c.lat, c.lng);
      } else {
        return new L.LatLng(39, -96);
      }
    })();

    if (typeof config.div === 'string') {
      config.div = document.getElementById(config.div);
    }

    if (config.layers && L.Util.isArray(config.layers) && config.layers.length) {
      config.overlays = config.layers;

      for (var j = 0; j < config.overlays.length; j++) {
        var overlay = config.overlays[j];

        if (typeof overlay === 'string') {
          overlay = config.overlays[j] = overlayPresets[overlay];
        }
      }
    } else if (!config.overlays || !L.Util.isArray(config.overlays)) {
      config.overlays = [];
    }

    delete config.layers;
    config.zoom = typeof config.zoom === 'number' ? config.zoom : 4;
    return config;
  },
  closeModules: function() {
    var buttons = this._divModuleButtons.childNodes;

    this._buttonCloseModules.style.display = 'none';
    this._divWrapper.style.left = '0';
    this._divModules.style.display = 'none';

    for (var i = 1; i < buttons.length; i++) {
      var button = buttons[i];

      L.DomUtil.removeClass(button, 'active');
      button.style.display = 'inline-block';
    }

    this.invalidateSize();
  },
  showModule: function(title) {
    var divModules = this._divModules,
      childNodes = divModules.childNodes,
      modules = this.options.modules,
      i;

    title = title.replace(/_/g, ' ');

    for (i = 0; i < modules.length; i++) {
      var module = modules[i],
        visibility = 'none';

      if (module.title === title) {
        visibility = 'block';
      }

      module.visible = (visibility === 'block');
      childNodes[i].style.display = visibility;
    }

    divModules.style.display = 'block';
    this._divWrapper.style.left = '300px';
    this.invalidateSize();

    for (i = 0; i < this._divModuleButtons.childNodes.length; i++) {
      var button = this._divModuleButtons.childNodes[i];

      if (i === 0) {
        button.style.display = 'inline-block';
      } else {
        if (modules.length > 1) {
          button.style.display = 'inline-block';
        } else {
          button.style.display = 'none';
        }
      }

      if (button.id.replace('npmap-modules-buttons|', '').replace(/_/g, ' ') === title) {
        L.DomUtil.addClass(button, 'active');
      } else {
        L.DomUtil.removeClass(button, 'active');
      }
    }

    // TODO: Fire module 'show' event.
  },
  showModules: function() {
    var buttons = this._divModuleButtons.childNodes;

    this._buttonCloseModules.style.display = 'inline-block';
    this._divWrapper.style.left = '300px';
    this._divModules.style.display = 'block';

    for (var i = 1; i < buttons.length; i++) {
      buttons[i].style.display = 'inline-block';
    }

    this.invalidateSize();
  }
});

module.exports = function(config) {
  return new Map(config);
};

},{"./popup.js":65,"./preset/baselayers.json":66,"./preset/colors.json":67,"./preset/overlays.json":68,"./util/util":75,"humane-js":22,"nanobar":26}],63:[function(require,module,exports){
/* global L */
/* jshint camelcase: false */

'use strict';

var reqwest = require('reqwest');

module.exports = {
  _boundsToExtent: function(bounds) {
    var ne = bounds.getNorthEast(),
      sw = bounds.getSouthWest();

    return {
      spatalReference: {
        wkid: 4326
      },
      xmax: ne.lng,
      xmin: sw.lng,
      ymax: ne.lat,
      ymin: sw.lat
    };
  },
  _cleanUrl: function(url) {
    url = L.Util.trim(url);

    if (url[url.length - 1] !== '/') {
      url += '/';
    }

    return url;
  },
  _getMetadata: function() {
    // TODO: Implement timeout and set `loadError` property on layer to true if there is an error.
    var me = this;

    reqwest({
      success: function(response) {
        if (!response.error) {
          var capabilities = response.capabilities;

          if (typeof capabilities === 'string') {
            if (capabilities.toLowerCase().indexOf('query') === -1) {
              me._hasInteractivity = false;
            }
          }

          me._metadata = response;
          //me.fire('metadata', response);
        }
      },
      type: 'jsonp',
      url: me._serviceUrl + '?f=json'
    });
  },
  _handleClick: function(latLng, callback) {
    var me = this;

    me.identify(latLng, function(response) {
      if (response) {
        var results = response.results;

        if (results && results.length) {
          var obj = {
            layer: me,
            subLayers: []
          };

          for (var i = 0; i < results.length; i++) {
            var result = results[i],
              active;

            for (var j = 0; j < obj.subLayers.length; j++) {
              if (obj.subLayers[j].name === result.layerName) {
                active = obj.subLayers[j];
                break;
              }
            }

            if (active) {
              active.results.push(result.attributes);
            } else {
              var template = '{{' + result.displayFieldName + '}}';

              obj.subLayers.push({
                name: result.layerName,
                popup: {
                  description: {
                    format: 'table'
                  },
                  more: template,
                  title: template
                },
                results: [
                  result.attributes
                ]
              });
            }
          }

          callback(obj);
        } else {
          callback(null);
        }
      } else {
        callback(null);
      }
    });
  },
  _updateAttribution: function() {
    var map = this._map,
      bounds = map.getBounds(),
      include = [],
      zoom = map.getZoom();

    if (this.options.attribution) {
      this._map.attributionControl.removeAttribution(this.options.attribution);
    }

    for (var i = 0; i < this._dynamicAttributionData.length; i++) {
      var contributor = this._dynamicAttributionData[i];

      for (var j = 0; j < contributor.coverageAreas.length; j++) {
        var coverageArea = contributor.coverageAreas[j],
          coverageBounds = coverageArea.bbox;

        if (zoom >= coverageArea.zoomMin && zoom <= coverageArea.zoomMax) {
          if (bounds.intersects(L.latLngBounds(L.latLng(coverageBounds[0], coverageBounds[3]), L.latLng(coverageBounds[2], coverageBounds[1])))) {
            include.push(contributor.attribution);
            break;
          }
        }
      }
    }

    if (include.length) {
      this.options.attribution = include.join(', ');
      map.attributionControl.addAttribution(this.options.attribution);
    }
  },
  identify: function(latLng, callback) {
    var map = this._map,
      size = map.getSize(),
      params = {
        f: 'json',
        geometry: JSON.stringify({
          spatialReference: {
            wkid: 4326
          },
          x: latLng.lng,
          y: latLng.lat
        }),
        geometryType: 'esriGeometryPoint',
        imageDisplay: size.x + ',' + size.y + ',96',
        layers: 'visible:' + this.getLayers().split(':')[1],
        mapExtent: JSON.stringify(this._boundsToExtent(map.getBounds())),
        returnGeometry: false,
        sr: '4326',
        tolerance: 5
      };

    reqwest({
      data: params,
      error: function() {
        callback(null);
      },
      success: function(response) {
        callback(response);
      },
      type: 'jsonp',
      url: this._serviceUrl + 'identify'
    });
  }
};

},{"reqwest":28}],64:[function(require,module,exports){
/* global L */

'use strict';

var topojson = require('../util/topojson'),
  util = require('../util/util');

module.exports = {
  addData: function(feature) {
    if (/\btopology\b/i.test(feature.type)) {
      for (var prop in feature.objects) {
        L.GeoJSON.prototype.addData.call(this, topojson.feature(feature, feature.objects[prop]));
      }
    } else {
      L.GeoJSON.prototype.addData.call(this, feature);
    }
  },
  onAdd: function(map) {
    this._map = map;
    this._addAttribution();
    L.GeoJSON.prototype.onAdd.call(this, map);
  },
  onRemove: function() {
    delete this._map;
    this._removeAttribution();
    L.GeoJSON.prototype.onRemove.call(this);
  },
  _addAttribution: function() {
    var attribution = this.options.attribution;

    if (attribution && this._map.attributionControl) {
      this._map.attributionControl.addAttribution(attribution);
    }
  },
  _removeAttribution: function() {
    var attribution = this.options.attribution;

    if (attribution && this._map.attributionControl) {
      this._map.attributionControl.removeAttribution(attribution);
    }
  },
  _toLeaflet: function(config) {
    // TODO: Support preset colors. Setup a "colorProperties" array that contains the name of the properties that can contain colors, then use those to pull in presets.
    // TODO: Support handlebars templates.
    var configStyles,
      matchSimpleStyles = {
        'fill': 'fillColor',
        'fill-opacity': 'fillOpacity',
        'stroke': 'color',
        'stroke-opacity': 'opacity',
        'stroke-width': 'weight'
      };

    if (typeof config.clickable === 'undefined' || config.clickable === true) {
      var activeTip, lastTarget;

      config.onEachFeature = function(feature, layer) {
        layer.on('click', function(e) {
          var target = e.target,
            map = target._map,
            container = map.getContainer(),
            padding = util._getAutoPanPaddingTopLeft(container),
            popup = L.npmap.popup({
              autoPanPaddingTopLeft: padding,
              maxHeight: util._getAvailableVerticalSpace(map) - 74
            }),
            properties = feature.properties,
            html;

          html = popup._resultToHtml(properties, config.popup);

          if (lastTarget) {
            lastTarget.closePopup().unbindPopup();
            lastTarget = target;
          }

          if (html) {
            if (typeof html === 'string') {
              html = util.unescapeHtml(html);
            }

            if (feature.geometry.type === 'Point') {
              popup.setContent(html);
              target.bindPopup(popup).openPopup();
              lastTarget = target;
            } else {
              popup.setContent(html).setLatLng(e.latlng.wrap()).openOn(target._map);
            }
          }
        });
        layer.on('mouseout', function(e) {
          if (activeTip) {
            var tooltips = e.target._map._tooltips;

            tooltips.splice(tooltips.indexOf(activeTip), 1);
          }
        });
        layer.on('mouseover', function(e) {
          var tooltipConfig = config.tooltip;

          if (tooltipConfig) {
            var properties = feature.properties,
              tip;

            if (typeof tooltipConfig === 'function') {
              tip = tooltipConfig(properties);
            } else if (typeof tooltipConfig === 'string') {
              tip = util.handlebars(tooltipConfig, properties);
            }

            if (tip) {
              e.target._map._tooltips.push(tip);
              activeTip = tip;
            }
          }
        });
      };
    }

    config.pointToLayer = function(feature, latLng) {
      // TODO: Support L.CircleMarker and L.Icon
      var configStyles,
        icon = {
          'marker-color': '#000000',
          'marker-size': 'medium',
          'marker-library': 'maki',
          'marker-symbol': null
        },
        properties = feature.properties,
        property, value;

      configStyles = typeof config.styles === 'function' ? config.styles(properties) : config.styles;

      if (!configStyles || !configStyles.point) {
        for (property in icon) {
          value = properties[property];

          if (value) {
            icon[property] = value;
          }
        }

        icon = L.npmap.icon[icon['marker-library']](icon);
      } else {
        configStyles = typeof configStyles.point === 'function' ? configStyles.point(properties) : configStyles.point;

        if (configStyles) {
          if (typeof configStyles.iconUrl === 'string') {
            icon = new L.Icon(configStyles);
          } else {
            for (property in icon) {
              value = configStyles[property];

              if (value) {
                icon[property] = value;
              }
            }

            if (!configStyles.ignoreFeatureStyles) {
              for (property in icon) {
                value = properties[property];

                if (value) {
                  icon[property] = value;
                }
              }
            }

            icon = L.npmap.icon[icon['marker-library']](icon);
          }
        } else {
          if (!configStyles.ignoreFeatureStyles) {
            for (property in icon) {
              value = properties[property];

              if (value) {
                icon[property] = value;
              }
            }
          }

          icon = L.npmap.icon[icon['marker-library']](icon);
        }
      }

      return new L.Marker(latLng, L.extend(config, {
        icon: icon
      }));
    };
    config.style = function(feature) {
      var type = (function() {
        var t = feature.geometry.type.toLowerCase();

        if (t.indexOf('line') !== -1) {
          return 'line';
        } else if (t.indexOf('point') !== -1) {
          return 'point';
        } else if (t.indexOf('polygon') !== -1) {
          return 'polygon';
        }
      })();

      if (type !== 'point') {
        // TODO: Add support for passing Leaflet styles in.
        var count = 0,
          properties = feature.properties,
          style = {},
          property;

        for (property in matchSimpleStyles) {
          if (typeof properties[property] !== 'undefined' && properties[property] !== null && properties[property] !== '') {
            style[matchSimpleStyles[property]] = properties[property];
          }
        }

        configStyles = typeof config.styles === 'function' ? config.styles(properties) : config.styles;

        if (configStyles) {
          configStyles = typeof configStyles[type] === 'function' ? configStyles[type](properties) : configStyles[type];

          if (configStyles) {
            for (property in matchSimpleStyles) {
              if (typeof configStyles[property] !== 'undefined' && configStyles[property] !== null && configStyles[property] !== '') {
                style[matchSimpleStyles[property]] = configStyles[property];
              }
            }
          }
        }

        for (property in style) {
          count++;
          break;
        }

        if (count) {
          return style;
        }
      }
    };

    return config;
  }
};

},{"../util/topojson":73,"../util/util":75}],65:[function(require,module,exports){
/* global L */
/* jshint camelcase: false */

'use strict';

var util = require('./util/util');

var Popup = L.Popup.extend({
  options: {
    autoPanPaddingBottomRight: [20, 20],
    autoPanPaddingTopLeft: [20, 20],
    offset: [1, -3]
  },
  _data: [],
  _html: null,
  _results: [],
  onAdd: function(map) {
    var content = this._content;

    if (window.addEventListener) {
      content.addEventListener('DOMMouseScroll', this._handleMouseWheel, false);
    }

    content.onmousewheel = this._handleMouseWheel;
    L.Popup.prototype.onAdd.apply(this, [map]);
  },
  _back: function() {
    this.setContent(this._html).update();
    this._html = null;
  },
  _createAction: function(config, data, div) {
    var a = document.createElement('a'),
      li = document.createElement('li');

    li.appendChild(a);
    a.innerHTML = util.handlebars(config.text, data);

    if (config.menu) {
      var menu = L.DomUtil.create('ul', 'menu', div);

      for (var i = 0; i < config.menu.length; i++) {
        var item = config.menu[i],
          itemA = document.createElement('a'),
          itemLi = document.createElement('li');

        itemA.innerHTML = util.handlebars(item.text, data);
        L.DomEvent.addListener(itemA, 'click', function() {
          var data = null;

          try {
            data = this.parentNode.parentNode.parentNode.parentNode.npmap_data;
          } catch (exception) {}

          menu.style.display = 'none';
          item.handler(data);
        });
        itemLi.appendChild(itemA);
        menu.appendChild(itemLi);
      }

      L.DomEvent.addListener(a, 'click', function(e) {
        this._toggleMenu(menu, e);
      }, this);
    } else if (config.handler) {
      L.DomEvent.addListener(a, 'click', function() {
        var data = null;

        try {
          data = this.parentNode.parentNode.parentNode.parentNode.npmap_data;
        } catch (exception) {}

        config.handler(data);
      });
    }

    return li;
  },
  _handleMouseWheel: function(e) {
    var delta = e.wheelDelta,
      parentNode = this.parentNode;

    if (L.DomUtil.hasClass(parentNode, 'leaflet-popup-scrolled')) {
      if (parentNode.scrollTop === 0 && delta > 0) {
        util.cancelEvent();
      } else if ((parentNode.scrollTop === parentNode.scrollHeight - util.getOuterDimensions(parentNode).height) && delta < 0) {
        util.cancelEvent();
      }
    }
  },
  _handleResults: function(results) {
    var div;

    function getLayerConfig(layer) {
      if (layer.options && layer.options.popup) {
        return layer.options.popup;
      } else {
        return null;
      }
    }

    if (results.length > 1) {
      div = this._resultsToHtml(results);
    } else {
      var all = [],
        result = results[0],
        i;

      if (result.results && result.results.length) {
        for (i = 0; i < result.results.length; i++) {
          all.push({
            layerConfig: getLayerConfig(result.layer),
            result: result.results[i],
            resultConfig: null
          });
        }
      } else if (result.subLayers && result.subLayers.length) {
        for (i = 0; i < result.subLayers.length; i++) {
          var subLayer = result.subLayers[i];

          if (subLayer.results && subLayer.results.length) {
            for (var j = 0; j < subLayer.results.length; j++) {
              all.push({
                layerConfig: getLayerConfig(result.layer),
                result: subLayer.results[j],
                resultConfig: subLayer.popup || null
              });
            }
          }
        }
      }

      if (all.length === 1) {
        var first = all[0];

        // TODO: If a "subLayer" result, pass in subLayer.name and add to title of popup.
        div = this._resultToHtml(first.result, first.layerConfig, first.resultConfig);
      } else {
        div = this._resultsToHtml(results);
      }
    }

    return div;
  },
  _more: function(index) {
    this._html = this.getContent();
    this.setContent(this._results[index]).update();
  },
  _resultsToHtml: function(results) {
    var div = document.createElement('div'),
      index = 0,
      me = this;

    function listener() {
      me._more(this.id);
    }

    for (var i = 0; i < results.length; i++) {
      var divLayer = L.DomUtil.create('div', 'layer', div),
        divLayerTitle = L.DomUtil.create('div', 'title', divLayer),
        resultLayer = results[i],
        layerConfig = null,
        resultConfig = null,
        a, childNode, divLayerContent, j, k, li, more, single, ul;

      if (resultLayer.layer.options) {
        if (resultLayer.layer.options.popup) {
          layerConfig = resultLayer.layer.options.popup;
        }

        if (resultLayer.layer.options.name) {
          divLayerTitle.innerHTML = resultLayer.layer.options.name;
        } else {
          divLayerTitle.innerHTML = 'Unnamed';
        }
      }

      if (resultLayer.results && resultLayer.results.length) {
        divLayerContent = L.DomUtil.create('div', 'content', divLayer);
        ul = document.createElement('ul');

        for (j = 0; j < resultLayer.results.length; j++) {
          var result = resultLayer.results[j];

          a = document.createElement('a');
          li = document.createElement('li');
          single = this._resultToHtml(result, layerConfig, resultConfig, true);

          if (layerConfig && typeof layerConfig.more === 'string') {
            more = util.unescapeHtml(util.handlebars(layerConfig.more, result));
          } else if (resultConfig && typeof resultConfig.more === 'string') {
            more = util.unescapeHtml(util.handlebars(resultConfig.more, result));
          } else {
            for (k = 0; k < single.childNodes.length; k++) {
              childNode = single.childNodes[k];

              if (L.DomUtil.hasClass(childNode, 'title')) {
                more = util.stripHtml(childNode.innerHTML);
                break;
              }
            }
          }

          if (!more) {
            more = 'Untitled';
          }

          L.DomEvent.addListener(a, 'click', function() {
            me._more(this.id);
          });
          this._results[index] = single;
          a.id = index;
          a.innerHTML = more;
          li.appendChild(a);
          ul.appendChild(li);
          divLayerContent.appendChild(ul);
          index++;
        }
      } else if (resultLayer.subLayers && resultLayer.subLayers.length) {
        divLayerContent = L.DomUtil.create('div', 'content', divLayer);

        for (j = 0; j < resultLayer.subLayers.length; j++) {
          var divSubLayer = L.DomUtil.create('div', 'sublayer', divLayerContent),
            divSubLayerTitle = L.DomUtil.create('div', 'title', divSubLayer),
            divSubLayerContent = L.DomUtil.create('div', 'content', divSubLayer),
            resultSubLayer = resultLayer.subLayers[j];

          divSubLayerTitle.innerHTML = resultSubLayer.name;
          ul = document.createElement('ul');
          divSubLayerContent.appendChild(ul);

          for (k = 0; k < resultSubLayer.results.length; k++) {
            var resultFinal = resultSubLayer.results[k];

            if (resultSubLayer.popup) {
              resultConfig = resultSubLayer.popup;
            }

            a = document.createElement('a');
            li = document.createElement('li');
            single = this._resultToHtml(resultFinal, layerConfig, resultConfig, true);

            if (layerConfig && typeof layerConfig.more === 'string') {
              more = util.unescapeHtml(util.handlebars(layerConfig.more, resultFinal));
            } else if (resultConfig && typeof resultConfig.more === 'string') {
              more = util.unescapeHtml(util.handlebars(resultConfig.more, resultFinal));
            } else {
              for (k = 0; k < single.childNodes.length; k++) {
                childNode = single.childNodes[k];

                if (L.DomUtil.hasClass(childNode, 'title')) {
                  more = util.stripHtml(childNode.innerHTML);
                  break;
                }
              }
            }

            if (!more) {
              more = 'Untitled';
            }

            L.DomEvent.addListener(a, 'click', listener);
            this._results[index] = single;
            a.id = index;
            a.innerHTML = more;
            li.appendChild(a);
            ul.appendChild(li);
            index++;
          }
        }
      }
    }

    return div;
  },
  _resultToHtml: function(result, layerConfig, resultConfig, addBack) {
    var config = layerConfig,
      div = L.DomUtil.create('div', 'layer'),
      actions, description, divContent, media, obj, title, ul;

    div.npmap_data = result;

    if (!config) {
      if (resultConfig) {
        config = resultConfig;
      } else {
        config = {
          description: {
            format: 'table'
          }
        };
      }
    }

    if (typeof config === 'string') {
      div.innerHTML = util.unescapeHtml(util.handlebars(config, result));
    } else if (typeof config === 'function') {
      div.innerHTML = util.unescapeHtml(util.handlebars(config(result), result));
    } else {
      if (config.title) {
        obj = null;

        if (typeof config.title === 'function') {
          obj = config.title(result);
        } else {
          obj = config.title;
        }

        if (obj && typeof obj === 'string') {
          title = L.DomUtil.create('div', 'title', div);
          title.innerHTML = util.unescapeHtml(util.handlebars(obj, result));
        }
      }

      if (config.description) {
        divContent = L.DomUtil.create('div', 'content', div);
        obj = null;

        if (typeof config.description === 'function') {
          obj = config.description(result);
        } else {
          obj = config.description;
        }

        if (obj && typeof obj === 'object') {
          if (obj.format === 'list') {
            obj = util.dataToList(result, obj.fields);
          } else {
            obj = util.dataToTable(result, obj.fields);
          }
        }

        if (obj) {
          description = L.DomUtil.create('div', 'description', divContent);

          if (typeof obj === 'string') {
            description.innerHTML = util.unescapeHtml(util.handlebars(obj, result));
          } else if ('nodeType' in obj) {
            description.appendChild(obj);
          }
        }
      }

      // TODO: Needs more work to support {string}s and possibly other config options
      if (config.media) {
        var mediaObj, mediaDiv;

        if (!divContent) {
          divContent = L.DomUtil.create('div', 'content', div);
        }

        media = [];

        for (var i = 0; i < config.media.length; i++) {
          if (result[config.media[i].id]) {
            media.push(config.media[i]);
          }
        }

        if (media.length) {
          mediaObj = util.mediaToList(result, media);

          if (mediaObj) {
            mediaDiv = L.DomUtil.create('div', 'media clearfix', divContent);
            mediaDiv.appendChild(mediaObj);
          }
        }
      }

      if (config.actions) {
        obj = null;

        if (typeof config.actions === 'function') {
          obj = config.actions(result);
        } else {
          obj = config.actions;
        }

        if (obj) {
          actions = L.DomUtil.create('div', 'actions', div);

          if (L.Util.isArray(obj)) {
            ul = document.createElement('ul');
            actions.appendChild(ul);

            for (var j = 0; j < obj.length; j++) {
              ul.appendChild(this._createAction(obj[j], result, actions));
            }
          } else if (typeof obj === 'string') {
            actions.innerHTML = util.unescapeHtml(util.handlebars(obj, result));
          } else if ('nodeType' in obj) {
            actions.appendChild(obj);
          }
        }
      }
    }

    /*
    if (me.options.edit && me.options.edit.layers.split(',').indexOf(subLayerId) !== -1) {
      var userRole = me.options.edit.userRole;

      if (typeof userRole === 'undefined' || userRole === 'Admin' || userRole === 'Writer') {
        var objectId = parseInt(el.getAttribute('data-objectid'), 10);

        subLayerId = parseInt(subLayerId, 10);

        actions.push(me._createAction('edit', 'Edit &#9656;', null, [{
          fn: function() {
            me.options.edit.handlers.editAttributes(subLayerId, objectId);
          },
          text: 'Attributes'
        },{
          fn: function() {
            me.options.edit.handlers.editGeometry(subLayerId, objectId);
          },
          text: 'Geometry'
        }], divActions));
        actions.push(me._createAction('delete', 'Delete', function() {
          me.options.edit.handlers['delete'](subLayerId, objectId);
        }));
      }
    }
    */

    if (addBack) {
      var a = document.createElement('a'),
        li = document.createElement('li');

      L.DomEvent.addListener(a, 'click', this._back, this);
      a.innerHTML = '&#171; Back';
      li.appendChild(a);

      if (actions) {
        actions.childNodes[0].insertBefore(li, actions.childNodes[0].childNodes[0]);
      } else {
        ul = document.createElement('ul');
        ul.appendChild(li);
        L.DomUtil.create('div', 'actions', div).appendChild(ul);
      }
    }

    return div;
  },
  _toggleMenu: function(menu, e) {
    if (!menu.style.display || menu.style.display === 'none') {
      var to = e.toElement;

      menu.style.display = 'block';
      menu.style.left = to.offsetLeft + 'px';
      menu.style.top = (to.offsetTop + 18) + 'px';
    } else {
      menu.style.display = 'none';
    }
  }
});

module.exports = function(options) {
  return new Popup(options);
};

},{"./util/util":75}],66:[function(require,module,exports){
module.exports={
  "bing": {
    "aerial": {
      "icon": "aerial",
      "layer": "aerial",
      "maxZoom": 19,
      "minZoom": 0,
      "name": "Bing Aerial",
      "type": "bing"
    },
    "aerialLabels": {
      "icon": "aerial",
      "layer": "aerialwithlabels",
      "maxZoom": 19,
      "minZoom": 0,
      "name": "Bing Aerial w/Labels",
      "type": "bing"
    },
    "roads": {
      "icon": "street",
      "layer": "road",
      "maxZoom": 19,
      "minZoom": 0,
      "name": "Bing Roads",
      "type": "bing"
    }
  },
  "esri": {
    "gray": {
      "attribution": "Copyright: &copy;2013 Esri, DeLorme, NAVTEQ",
      "maxZoom": 16,
      "minZoom": 1,
      "name": "Esri Light Gray",
      "tiled": true,
      "type": "arcgisserver",
      "url": "http://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer"
    },
    "grayLabels": {
      "attribution": "Copyright: &copy;2013 Esri, DeLorme, NAVTEQ",
      "maxZoom": 16,
      "minZoom": 1,
      "name": "Esri Light Gray Labels",
      "tiled": true,
      "type": "arcgisserver",
      "url": "http://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer"
    },
    "imagery": {
      "attribution": "Esri, DigitalGlobe, GeoEye, i-cubed, USDA, USGS, AEX, Getmapping, Aerogrid, IGN, IGP, swisstopo, and the GIS User Community",
      "icon": "aerial",
      "maxZoom": 19,
      "minZoom": 1,
      "name": "Esri Imagery",
      "popup": false,
      "tiled": true,
      "type": "arcgisserver",
      "url": "http://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer"
    },
    "imageryLabels": {
      "attribution": "Esri, DigitalGlobe, GeoEye, i-cubed, USDA, USGS, AEX, Getmapping, Aerogrid, IGN, IGP, swisstopo, and the GIS User Community",
      "maxZoom": 19,
      "minZoom": 1,
      "popup": false,
      "name": "Esri Boundaries & Places",
      "tiled": true,
      "type": "arcgisserver",
      "url": "http://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer"
    },
    "nationalGeographic": {
      "attribution": "Esri",
      "maxZoom": 16,
      "minZoom": 1,
      "name": "Esri National Geographic",
      "popup": false,
      "tiled": true,
      "type": "arcgisserver",
      "url": "http://server.arcgisonline.com/ArcGIS/rest/services/NatGeo_World_Map/MapServer"
    },
    "oceans": {
      "attribution": "Esri",
      "dynamicAttribution": "http://static.arcgis.com/attribution/World_Street_Map?f=json",
      "maxZoom": 16,
      "minZoom": 1,
      "name": "Esri Oceans",
      "tiled": true,
      "type": "arcgisserver",
      "url": "http://server.arcgisonline.com/ArcGIS/rest/services/Ocean_Basemap/MapServer"
    },
    "streets": {
      "attribution": "Esri",
      "dynamicAttribution": "http://static.arcgis.com/attribution/World_Street_Map?f=json",
      "icon": "street",
      "maxZoom": 19,
      "minZoom": 1,
      "name": "Esri Streets",
      "tiled": true,
      "type": "arcgisserver",
      "url": "http://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer"
    },
    "topographic": {
      "attribution": "Esri",
      "dynamicAttribution": "http://static.arcgis.com/attribution/World_Street_Map?f=json",
      "icon": "topo",
      "maxZoom": 17,
      "minZoom": 1,
      "name": "Esri Topo",
      "popup": false,
      "tiled": true,
      "type": "arcgisserver",
      "url": "http://services.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer"
    }
  },
  "mapbox": {
    "light": {
      "attribution": "<a href='http://mapbox.com/about/maps' target='_blank'>MapBox</a>, &copy; <a href='http://openstreetmap.org/copyright'>OpenStreetMap</a> contributors",
      "detectRetina": true,
      "icon": "street",
      "id": "nps.map-sligp1fr",
      "name": "MapBox Light",
      "type": "mapbox"
    },
    "satellite": {
      "attribution": "<a href='http://mapbox.com/about/maps' target='_blank'>MapBox</a>",
      "detectRetina": true,
      "icon": "aerial",
      "id": "nps.map-n9nxe12m",
      "name": "MapBox Satellite",
      "type": "mapbox"
    },
    "satelliteLabels": {
      "attribution": "<a href='http://mapbox.com/about/maps' target='_blank'>MapBox</a>, &copy; <a href='http://openstreetmap.org/copyright'>OpenStreetMap</a> contributors",
      "detectRetina": true,
      "icon": "aerial",
      "id": "nps.map-r3ilza09",
      "name": "MapBox Satellite w/Labels",
      "type": "mapbox"
    },
    "streets": {
      "attribution": "<a href='http://mapbox.com/about/maps' target='_blank'>MapBox</a>, &copy; <a href='http://openstreetmap.org/copyright'>OpenStreetMap</a> contributors",
      "detectRetina": true,
      "icon": "street",
      "id": "nps.map-06dnxzq5",
      "name": "MapBox Streets",
      "type": "mapbox"
    },
    "terrain": {
      "attribution": "<a href='http://mapbox.com/about/maps' target='_blank'>MapBox</a>, &copy; <a href='http://openstreetmap.org/copyright'>OpenStreetMap</a> contributors",
      "detectRetina": true,
      "icon": "topo",
      "id": "nps.map-lj6szvbq",
      "name": "MapBox Terrain",
      "type": "mapbox"
    }
  },
  "nps": {
    "darkStreets": {
      "attribution": "&copy; <a href='http://openstreetmap.org/copyright'>OpenStreetMap</a> contributors",
      "detectRetina": true,
      "icon": "nps",
      "id": "nps.gajjemg7",
      "name": "NPS Dark",
      "type": "mapbox"
    },
    "lightStreets": {
      "attribution": "&copy; <a href='http://openstreetmap.org/copyright'>OpenStreetMap</a> contributors",
      "detectRetina": true,
      "icon": "nps",
      "id": "nps.g9ndno9j",
      "name": "NPS Light",
      "type": "mapbox"
    },
    "neutralTerrain": {
      "attribution": "&copy; <a href='http://openstreetmap.org/copyright'>OpenStreetMap</a> contributors",
      "detectRetina": true,
      "icon": "nps",
      "id": "nps.g9nccg3d",
      "name": "NPS Neutral Terrain",
      "type": "mapbox"
    },
    "satelliteNight": {
      "attribution": "&copy; <a href='http://openstreetmap.org/copyright'>OpenStreetMap</a> contributors",
      "detectRetina": true,
      "icon": "nps",
      "id": "nps.g9o0im10",
      "name": "NPS Satellite at Night",
      "type": "mapbox"
    }
  },
  "openstreetmap": {
    "attribution": "&copy; <a href='http://openstreetmap.org/copyright'>OpenStreetMap</a> contributors",
    "icon": "street",
    "name": "OpenStreetMap",
    "type": "tiled",
    "url": "http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
  },
  "stamen": {
    "toner": {
      "attribution": "Map tiles by <a href='http://stamen.com'>Stamen Design</a>, under <a href='http://creativecommons.org/licenses/by/3.0'>CC BY 3.0</a>. Data &copy; <a href='http://openstreetmap.org/copyright'>OpenStreetMap</a> contributors.",
      "icon": "street",
      "maxZoom": 20,
      "minZoom": 0,
      "name": "Stamen Toner",
      "subdomains": "abcd",
      "type": "tiled",
      "url": "http://{s}.tile.stamen.com/toner/{z}/{x}/{y}.png"
    },
    "watercolor": {
      "attribution": "Map tiles by <a href='http://stamen.com'>Stamen Design</a>, under <a href='http://creativecommons.org/licenses/by/3.0'>CC BY 3.0</a>. Data &copy; <a href='http://openstreetmap.org/copyright'>OpenStreetMap</a> contributors.",
      "maxZoom": 16,
      "minZoom": 3,
      "name": "Stamen Watercolor",
      "subdomains": "abcd",
      "type": "tiled",
      "url": "http://{s}.tile.stamen.com/watercolor/{z}/{x}/{y}.jpg"
    }
  }
}

},{}],67:[function(require,module,exports){
module.exports={
  "chesnut": {
    "color": "#bf815d",
    "fill": true,
    "fillColor": "#bf815d",
    "fillOpacity": 0.2,
    "opacity": 0.5,
    "stroke": true,
    "weight": 3
  },
  "chill": {
    "color": "#1b99aa",
    "colorBlindGroups": [
      "a",
      "b"
    ],
    "fill": true,
    "fillColor": "#1b99aa",
    "fillOpacity": 0.2,
    "opacity": 0.5,
    "stroke": true,
    "weight": 3
  },
  "currant": {
    "color": "#5f3663",
    "colorBlindGroups": [
      "a",
      "b",
      "c"
    ],
    "fill": true,
    "fillColor": "#5f3663",
    "fillOpacity": 0.2,
    "opacity": 0.5,
    "stroke": true,
    "weight": 3
  },
  "eucalyptus": {
    "color": "#558877",
    "colorBlindGroups": [
      "a",
      "b"
    ],
    "fill": true,
    "fillColor": "#558877",
    "fillOpacity": 0.2,
    "opacity": 0.5,
    "stroke": true,
    "weight": 3
  },
  "gold": {
    "color": "#d39800",
    "colorBlindGroups": [
      "a",
      "b",
      "c"
    ],
    "fill": true,
    "fillColor": "#d39800",
    "fillOpacity": 0.2,
    "opacity": 0.5,
    "stroke": true,
    "weight": 3
  },
  "lilac": {
    "color": "#896c9c",
    "fill": true,
    "fillColor": "#896c9c",
    "fillOpacity": 0.2,
    "opacity": 0.5,
    "stroke": true,
    "weight": 3
  },
  "mustard": {
    "color": "#d98d38",
    "colorBlindGroups": [
      "a",
      "b",
      "c"
    ],
    "fill": true,
    "fillColor": "#d98d38",
    "fillOpacity": 0.2,
    "opacity": 0.5,
    "stroke": true,
    "weight": 3
  },
  "parks": {
    "color": "#7a9052",
    "colorBlindGroups": [
      "a"
    ],
    "fill": true,
    "fillColor": "#7a9052",
    "fillOpacity": 0.2,
    "opacity": 0.5,
    "stroke": true,
    "weight": 3
  },
  "rose": {
    "color": "#d46655",
    "colorBlindGroups": [
      "a",
      "c"
    ],
    "fill": true,
    "fillColor": "#d46655",
    "fillOpacity": 0.2,
    "opacity": 0.5,
    "stroke": true,
    "weight": 3
  },
  "russett": {
    "color": "#7a4810",
    "colorBlindGroups": [
      "a",
      "b"
    ],
    "fill": true,
    "fillColor": "#7a4810",
    "fillOpacity": 0.2,
    "opacity": 0.5,
    "stroke": true,
    "weight": 3
  },
  "black": {
    "color": "#000000"
  }
}

},{}],68:[function(require,module,exports){
module.exports={
  
}

},{}],69:[function(require,module,exports){
/* globals L */

'use strict';

var util = require('./util/util');

var Tooltip = L.Class.extend({
  options: {
    fadeAnimation: false,
    hideDelay: 0,
    maxWidth: '',
    minWidth: '',
    mouseOffset: L.point(15, 0),
    padding: '2px 4px',
    showDelay: 0,
    trackMouse: true,
    width: 'auto'
  },
  initialize: function(options) {
    L.setOptions(this, options);
    this._createTip();
  },
  _bindTarget: function(target) {
    L.DomEvent
      .on(target, 'mouseover', this._onTargetMouseover, this)
      .on(target, 'mouseout', this._onTargetMouseout, this)
      .on(target, 'mousemove', this._onTargetMousemove, this);
  },
  _createTip: function() {
    this._map = this.options.map;

    if (!this._map) {
      throw new Error('No map configured for tooltip');
    }

    this._container = L.DomUtil.create('div', 'leaflet-tooltip');
    this._container.style.maxWidth = this._isNumeric(this.options.maxWidth) ? this.options.maxWidth + 'px' : this.options.maxWidth;
    this._container.style.minWidth = this._isNumeric(this.options.minWidth) ? this.options.minWidth + 'px' : this.options.minWidth;
    this._container.style.padding = this._isNumeric(this.options.padding) ? this.options.padding + 'px' : this.options.padding;
    this._container.style.position = 'absolute';
    this._container.style.width = this._isNumeric(this.options.width) ? this.options.width + 'px' : this.options.width;

    if (this.options.html) {
      this.setHtml(this.options.html);
    }

    if (this.options.target) {
      this.setTarget(this.options.target);
    }

    this._map._tooltipContainer.appendChild(this._container);
  },
  _delay: function(func, scope, delay) {
    var me = this;

    if (this._timeout) {
      clearTimeout(this._timeout);
    }

    this._timeout = setTimeout(function() {
      func.call(scope);
      delete me._timeout;
    }, delay);
  },
  _getElementSize: function(el) {
    var size = this._size;

    if (!size || this._sizeChanged) {
      size = {};
      el.style.left = '-999999px';
      el.style.right = 'auto';
      el.style.display = 'inline-block';
      size.x = el.offsetWidth;
      size.y = el.offsetHeight;
      el.style.left = 'auto';
      el.style.display = 'none';
      this._sizeChanged = false;
    }
    return size;
  },
  _hide: function() {
    if (this._timeout) {
      clearTimeout(this._timeout);
    }

    L.DomUtil.removeClass(this._container, 'leaflet-tooltip-fade');
    this._container.style.display = 'none';
    this.showing = false;

    if (this._map.activeTip === this) {
      delete this._map.activeTip;
    }
  },
  _isNumeric: function(val) {
    return !isNaN(parseFloat(val)) && isFinite(val);
  },
  _onTargetMousemove: function(e) {
    L.DomEvent.stopPropagation(e);

    if (this.options.trackMouse) {
      this.setPosition(this._map.mouseEventToContainerPoint(e));
    }
  },
  _onTargetMouseout: function() {
    this.hide();
  },
  _onTargetMouseover: function(e) {
    this.show(this._map.mouseEventToContainerPoint(e));
  },
  _show: function() {
    this._container.style.display = 'inline-block';
    L.DomUtil.addClass(this._container, 'leaflet-tooltip-fade');
    this._showing = true;
  },
  _unbindTarget: function(target) {
    L.DomEvent
      .off(target, 'mouseover', this._onTargetMouseover, this)
      .off(target, 'mouseout', this._onTargetMouseout, this)
      .off(target, 'mousemove', this._onTargetMousemove, this);
  },
  hide: function() {
    if (this.options.hideDelay) {
      this._delay(this._hide, this, this.options.hideDelay);
    } else {
      this._hide();
    }
  },
  isVisible: function() {
    return this._showing;
  },
  remove: function() {
    this._container.parentNode.removeChild(this._container);
    delete this._container;

    if (this._target) {
      this._unbindTarget(this._target);
    }
  },
  setHtml: function(html) {
    if (typeof html === 'string') {
      this._container.innerHTML = util.unescapeHtml(html);
    } else {
      while (this._container.hasChildNodes()) {
        this._container.removeChild(this._container.firstChild);
      }

      this._container.appendChild(this._content);
    }
    
    this._sizeChanged = true;
  },
  setPosition: function(point) {
    var container = this._container,
      containerSize = this._getElementSize(this._container),
      mapSize = this._map.getSize(),
      offset = this.options.mouseOffset || {x: 0, y: 0};

    if (point.x + containerSize.x > mapSize.x - offset.x - 5) {
      container.style.left = 'auto';
      container.style.right = (mapSize.x - point.x + (offset.x - 5)) + 'px';
    } else {
      container.style.left = point.x + offset.x + 'px';
      container.style.right = 'auto';
    }
    
    if (point.y + containerSize.y > mapSize.y) {
      container.style.top = 'auto';
      container.style.bottom = (mapSize.y - point.y) + 'px';
    } else {
      container.style.top = point.y + 'px';
      container.style.bottom = 'auto';
    }
  },
  setTarget: function(target) {
    if (target._icon) {
      target = target._icon;
    }

    if (target === this._target) {
      return;
    }

    if (this._target) {
      this._unbindTarget(this._target);
    }

    this._bindTarget(target);
    this._target = target;
  },
  show: function(point, html) {
    if (this._map.activeTip && (this._map.activeTip !== this)) {
      this._map.activeTip._hide();
    }

    this._map.activeTip = this;
    
    if (html) {
      this.setHtml(html);
    }

    this.setPosition(point);

    if (this.options.showDelay) {
      this._delay(this._show, this, this.options.hideDelay);
    } else {
      this._show();
    }
  }
});

L.Map.addInitHook(function() {
  this._tooltipContainer = L.DomUtil.create('div', 'leaflet-tooltip-container', this._container);
});

module.exports = function(options) {
  return new Tooltip(options);
};

},{"./util/util":75}],70:[function(require,module,exports){
/* globals L */
/* jshint camelcase: false */

'use strict';

var reqwest = require('reqwest'),
  util = require('../util/util');

module.exports = ({
  _formatBingResult: function(result) {
    var bbox = result.bbox,
      coordinates = result.geocodePoints[0].coordinates;

    return {
      bounds: [
        [bbox[0], bbox[1]],
        [bbox[2], bbox[3]]
      ],
      latLng: [coordinates[0], coordinates[1]],
      name: result.name
    };
  },
  _formatEsriResult: function(result) {
    var extent = result.extent,
      geometry = result.feature.geometry;

    return {
      bounds: [
        [extent.ymin, extent.xmin],
        [extent.ymax, extent.xmax]
      ],
      latLng: [geometry.y, geometry.x],
      name: result.name
    };
  },
  _formatMapquestResult: function(result) {
    var city = result.adminArea5 || null,
      county = result.adminArea4 || null,
      country = result.adminArea1 || null,
      postal = result.postalCode || null,
      street = result.street || null,
      state = result.adminArea3 || null,
      name = (street ? street + ', ' : '') + (city ? city : county) + ', ' + state + ' ' + country;

    return {
      bounds: null,
      latLng: [result.latLng.lat, result.latLng.lng],
      name: name
    };
  },
  _formatNominatimResult: function(result) {
    var bbox = result.boundingbox;

    return {
      bounds: [
        [bbox[0], bbox[3]],
        [bbox[1], bbox[2]]
      ],
      latLng: [result.lat, result.lon],
      name: result.display_name
    };
  },
  bing: function(value, callback) {
    var me = this,
      options = {
        include: 'queryParse',
        includeNeighborhood: 1,
        key: 'Ag4-2f0g7bcmcVgKeNYvH_byJpiPQSx4F9l0aQaz9pDYMORbeBFZ0N3C3A5LSf65',
        query: value
      };

    reqwest({
      error: function() {
        callback({
          message: 'The location search failed. Please check your network connection.',
          success: false
        });
      },
      jsonpCallback: 'jsonp',
      success: function(response) {
        var obj = {};

        if (response) {
          var results = [];

          for (var i = 0; i < response.resourceSets[0].resources.length; i++) {
            results.push(me._formatBingResult(response.resourceSets[0].resources[i]));
          }

          obj.results = results;
          obj.success = true;
        } else {
          obj.message = 'The response from the Bing service was invalid. Please try again.';
          obj.success = false;
        }

        callback(obj);
      },
      type: 'jsonp',
      url: util.buildUrl('https://dev.virtualearth.net/REST/v1/Locations', options)
    });
  },
  esri: function(value, callback, options) {
    var me = this,
      defaults = {
        //bbox: options && options.bbox ? options.bbox : null,
        //center: me._map.getCenter(),
        //distance: Math.min(Math.max(center.distanceTo(ne), 2000), 50000),
        f: 'json',
        //location: options && options.center ? options.center.lat + ',' + options.center.lng : null,
        //maxLocations: 5,
        //outFields: 'Subregion, Region, PlaceName, Match_addr, Country, Addr_type, City',
        text: value
      };

    options = options ? L.extend(defaults, options) : defaults;

    reqwest({
      error: function() {
        callback({
          message: 'The location search failed. Please check your network connection.',
          success: false
        });
      },
      success: function(response) {
        var obj = {};

        if (response) {
          var results = [];

          for (var i = 0; i < response.locations.length; i++) {
            results.push(me._formatEsriResult(response.locations[i]));
          }

          obj.results = results;
          obj.success = true;
        } else {
          obj.message = 'The response from the Esri service was invalid. Please try again.';
          obj.success = false;
        }

        callback(obj);
      },
      type: 'jsonp',
      url: util.buildUrl('https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/find', options)
    });
  },
  mapquest: function(value, callback) {
    var me = this;

    reqwest({
      error: function() {
        callback({
          message: 'The location search failed. Please check your network connection.',
          success: false
        });
      },
      success: function(response) {
        if (response) {
          if (response.results && response.results[0] && response.results[0].locations && response.results[0].locations.length) {
            var results = [];

            for (var i = 0; i < response.results[0].locations.length; i++) {
              results.push(me._formatMapquestResult(response.results[0].locations[i]));
            }

            callback({
              results: results,
              success: true
            });
          } else {
            callback({
              message: 'No locations found.',
              success: true
            });
          }
        } else {
          callback({
            message: 'The geocode failed. Please try again.',
            success: false
          });
        }
      },
      type: 'jsonp',
      url: 'https://www.mapquestapi.com/geocoding/v1/address?location=' + value + '&key=Gmjtd%7Cluubn1u1nq%2C85%3Do5-lr7x9&thumbMaps=false'
    });
  },
  nominatim: function(value, callback) {
    var me = this;

    reqwest({
      error: function() {
        callback({
          message: 'The location search failed. Please check your network connection.',
          success: false
        });
      },
      jsonpCallback: 'json_callback',
      success: function(response) {
        var obj = {};

        if (response) {
          var results = [];

          for (var i = 0; i < response.length; i++) {
            results.push(me._formatNominatimResult(response[i]));
          }

          obj.results = results;
          obj.success = true;
        } else {
          obj.message = 'The response from the Nominatim service was invalid. Please try again.';
          obj.success = false;
        }

        callback(obj);
      },
      type: 'jsonp',
      url: 'https://open.mapquestapi.com/nominatim/v1/search.php?format=json&addressdetails=1&dedupe=1&q=' + value + '&key=Gmjtd%7Cluubn1u1nq%2C85%3Do5-lr7x9'
    });
  }
});

},{"../util/util":75,"reqwest":28}],71:[function(require,module,exports){
module.exports = function(i, j) {
  function k(a) {
    a = a.toLowerCase();
    var b = a.indexOf('js');
    a = a.indexOf('css');
    return -1 === b && -1 === a ? !1 : b > a ? 'js' : 'css';
  }

  function m(a) {
    var b = document.createElement('link');
    b.href = a;
    b.rel = 'stylesheet';
    b.type = 'text/css';
    b.onload = c;
    b.onreadystatechange = function() {
      ('loaded' === this.readyState || 'complete' === this.readyState) && c()
    };
    document.getElementsByTagName('head')[0].appendChild(b);
  }

  function f(a) {
    try {
      document.styleSheets[a].cssRules ? c() : document.styleSheets[a].rules && document.styleSheets[a].rules.length ? c() : setTimeout(function() {
        f(a);
      }, 250)
    } catch (b) {
      setTimeout(function() {
        f(a);
      }, 250)
    }
  }

  function c() {
    g--;
    0 === g && j && j()
  }
  for (var g = 0, d, l = document.styleSheets.length - 1, h = 0; h < i.length; h++)
    if (g++, d = i[h], 'css' === k(d) && (m(d), l++, !window.opera && -1 === navigator.userAgent.indexOf('MSIE') && f(l)), 'js' === k(d)) {
      var e = document.createElement('script');
      e.type = 'text/javascript';
      e.src = d;
      e.onload = c;
      document.getElementsByTagName('head')[0].appendChild(e);
    }
};

},{}],72:[function(require,module,exports){
'use strict';

/**
 * http://wiki.openstreetmap.org/wiki/Slippy_map_tilenames#ECMAScript_.28JavaScript.2FActionScript.2C_etc..29
 */
module.exports = ({
  lat2tile: function(lat, zoom) {
    return (Math.floor((1-Math.log(Math.tan(lat*Math.PI/180) + 1/Math.cos(lat*Math.PI/180))/Math.PI)/2 *Math.pow(2,zoom)));
  },
  long2tile: function(lon, zoom) {
    return (Math.floor((lon+180)/360*Math.pow(2,zoom)));
  },
  tile2lat: function (y, z) {
    var n=Math.PI-2*Math.PI*y/Math.pow(2,z);
    return (180/Math.PI*Math.atan(0.5*(Math.exp(n)-Math.exp(-n))));
  },
  tile2long: function(x, z) {
    return (x/Math.pow(2,z)*360-180);
  }
});

},{}],73:[function(require,module,exports){
module.exports = (function() {
  function merge(topology, arcs) {
    var fragmentByStart = {},
        fragmentByEnd = {};

    arcs.forEach(function(i) {
      var e = ends(i),
          start = e[0],
          end = e[1],
          f, g;

      if (f = fragmentByEnd[start]) {
        delete fragmentByEnd[f.end];
        f.push(i);
        f.end = end;
        if (g = fragmentByStart[end]) {
          delete fragmentByStart[g.start];
          var fg = g === f ? f : f.concat(g);
          fragmentByStart[fg.start = f.start] = fragmentByEnd[fg.end = g.end] = fg;
        } else if (g = fragmentByEnd[end]) {
          delete fragmentByStart[g.start];
          delete fragmentByEnd[g.end];
          var fg = f.concat(g.map(function(i) { return ~i; }).reverse());
          fragmentByStart[fg.start = f.start] = fragmentByEnd[fg.end = g.start] = fg;
        } else {
          fragmentByStart[f.start] = fragmentByEnd[f.end] = f;
        }
      } else if (f = fragmentByStart[end]) {
        delete fragmentByStart[f.start];
        f.unshift(i);
        f.start = start;
        if (g = fragmentByEnd[start]) {
          delete fragmentByEnd[g.end];
          var gf = g === f ? f : g.concat(f);
          fragmentByStart[gf.start = g.start] = fragmentByEnd[gf.end = f.end] = gf;
        } else if (g = fragmentByStart[start]) {
          delete fragmentByStart[g.start];
          delete fragmentByEnd[g.end];
          var gf = g.map(function(i) { return ~i; }).reverse().concat(f);
          fragmentByStart[gf.start = g.end] = fragmentByEnd[gf.end = f.end] = gf;
        } else {
          fragmentByStart[f.start] = fragmentByEnd[f.end] = f;
        }
      } else if (f = fragmentByStart[start]) {
        delete fragmentByStart[f.start];
        f.unshift(~i);
        f.start = end;
        if (g = fragmentByEnd[end]) {
          delete fragmentByEnd[g.end];
          var gf = g === f ? f : g.concat(f);
          fragmentByStart[gf.start = g.start] = fragmentByEnd[gf.end = f.end] = gf;
        } else if (g = fragmentByStart[end]) {
          delete fragmentByStart[g.start];
          delete fragmentByEnd[g.end];
          var gf = g.map(function(i) { return ~i; }).reverse().concat(f);
          fragmentByStart[gf.start = g.end] = fragmentByEnd[gf.end = f.end] = gf;
        } else {
          fragmentByStart[f.start] = fragmentByEnd[f.end] = f;
        }
      } else if (f = fragmentByEnd[end]) {
        delete fragmentByEnd[f.end];
        f.push(~i);
        f.end = start;
        if (g = fragmentByEnd[start]) {
          delete fragmentByStart[g.start];
          var fg = g === f ? f : f.concat(g);
          fragmentByStart[fg.start = f.start] = fragmentByEnd[fg.end = g.end] = fg;
        } else if (g = fragmentByStart[start]) {
          delete fragmentByStart[g.start];
          delete fragmentByEnd[g.end];
          var fg = f.concat(g.map(function(i) { return ~i; }).reverse());
          fragmentByStart[fg.start = f.start] = fragmentByEnd[fg.end = g.start] = fg;
        } else {
          fragmentByStart[f.start] = fragmentByEnd[f.end] = f;
        }
      } else {
        f = [i];
        fragmentByStart[f.start = start] = fragmentByEnd[f.end = end] = f;
      }
    });

    function ends(i) {
      var arc = topology.arcs[i], p0 = arc[0], p1 = [0, 0];
      arc.forEach(function(dp) { p1[0] += dp[0], p1[1] += dp[1]; });
      return [p0, p1];
    }

    var fragments = [];
    for (var k in fragmentByEnd) fragments.push(fragmentByEnd[k]);
    return fragments;
  }

  function mesh(topology, o, filter) {
    var arcs = [];

    if (arguments.length > 1) {
      var geomsByArc = [],
          geom;

      function arc(i) {
        if (i < 0) i = ~i;
        (geomsByArc[i] || (geomsByArc[i] = [])).push(geom);
      }

      function line(arcs) {
        arcs.forEach(arc);
      }

      function polygon(arcs) {
        arcs.forEach(line);
      }

      function geometry(o) {
        if (o.type === "GeometryCollection") o.geometries.forEach(geometry);
        else if (o.type in geometryType) {
          geom = o;
          geometryType[o.type](o.arcs);
        }
      }

      var geometryType = {
        LineString: line,
        MultiLineString: polygon,
        Polygon: polygon,
        MultiPolygon: function(arcs) { arcs.forEach(polygon); }
      };

      geometry(o);

      geomsByArc.forEach(arguments.length < 3
          ? function(geoms, i) { arcs.push(i); }
          : function(geoms, i) { if (filter(geoms[0], geoms[geoms.length - 1])) arcs.push(i); });
    } else {
      for (var i = 0, n = topology.arcs.length; i < n; ++i) arcs.push(i);
    }

    return object(topology, {type: "MultiLineString", arcs: merge(topology, arcs)});
  }

  function featureOrCollection(topology, o) {
    return o.type === "GeometryCollection" ? {
      type: "FeatureCollection",
      features: o.geometries.map(function(o) { return feature(topology, o); })
    } : feature(topology, o);
  }

  function feature(topology, o) {
    var f = {
      type: "Feature",
      id: o.id,
      properties: o.properties || {},
      geometry: object(topology, o)
    };
    if (o.id == null) delete f.id;
    return f;
  }

  function object(topology, o) {
    var absolute = transformAbsolute(topology.transform),
        arcs = topology.arcs;

    function arc(i, points) {
      if (points.length) points.pop();
      for (var a = arcs[i < 0 ? ~i : i], k = 0, n = a.length, p; k < n; ++k) {
        points.push(p = a[k].slice());
        absolute(p, k);
      }
      if (i < 0) reverse(points, n);
    }

    function point(p) {
      p = p.slice();
      absolute(p, 0);
      return p;
    }

    function line(arcs) {
      var points = [];
      for (var i = 0, n = arcs.length; i < n; ++i) arc(arcs[i], points);
      if (points.length < 2) points.push(points[0].slice());
      return points;
    }

    function ring(arcs) {
      var points = line(arcs);
      while (points.length < 4) points.push(points[0].slice());
      return points;
    }

    function polygon(arcs) {
      return arcs.map(ring);
    }

    function geometry(o) {
      var t = o.type;
      return t === "GeometryCollection" ? {type: t, geometries: o.geometries.map(geometry)}
          : t in geometryType ? {type: t, coordinates: geometryType[t](o)}
          : null;
    }

    var geometryType = {
      Point: function(o) { return point(o.coordinates); },
      MultiPoint: function(o) { return o.coordinates.map(point); },
      LineString: function(o) { return line(o.arcs); },
      MultiLineString: function(o) { return o.arcs.map(line); },
      Polygon: function(o) { return polygon(o.arcs); },
      MultiPolygon: function(o) { return o.arcs.map(polygon); }
    };

    return geometry(o);
  }

  function reverse(array, n) {
    var t, j = array.length, i = j - n; while (i < --j) t = array[i], array[i++] = array[j], array[j] = t;
  }

  function bisect(a, x) {
    var lo = 0, hi = a.length;
    while (lo < hi) {
      var mid = lo + hi >>> 1;
      if (a[mid] < x) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  }

  function neighbors(objects) {
    var indexesByArc = {}, // arc index -> array of object indexes
        neighbors = objects.map(function() { return []; });

    function line(arcs, i) {
      arcs.forEach(function(a) {
        if (a < 0) a = ~a;
        var o = indexesByArc[a];
        if (o) o.push(i);
        else indexesByArc[a] = [i];
      });
    }

    function polygon(arcs, i) {
      arcs.forEach(function(arc) { line(arc, i); });
    }

    function geometry(o, i) {
      if (o.type === "GeometryCollection") o.geometries.forEach(function(o) { geometry(o, i); });
      else if (o.type in geometryType) geometryType[o.type](o.arcs, i);
    }

    var geometryType = {
      LineString: line,
      MultiLineString: polygon,
      Polygon: polygon,
      MultiPolygon: function(arcs, i) { arcs.forEach(function(arc) { polygon(arc, i); }); }
    };

    objects.forEach(geometry);

    for (var i in indexesByArc) {
      for (var indexes = indexesByArc[i], m = indexes.length, j = 0; j < m; ++j) {
        for (var k = j + 1; k < m; ++k) {
          var ij = indexes[j], ik = indexes[k], n;
          if ((n = neighbors[ij])[i = bisect(n, ik)] !== ik) n.splice(i, 0, ik);
          if ((n = neighbors[ik])[i = bisect(n, ij)] !== ij) n.splice(i, 0, ij);
        }
      }
    }

    return neighbors;
  }

  function presimplify(topology, triangleArea) {
    var absolute = transformAbsolute(topology.transform),
        relative = transformRelative(topology.transform),
        heap = minHeap(compareArea),
        maxArea = 0,
        triangle;

    if (!triangleArea) triangleArea = cartesianArea;

    topology.arcs.forEach(function(arc) {
      var triangles = [];

      arc.forEach(absolute);

      for (var i = 1, n = arc.length - 1; i < n; ++i) {
        triangle = arc.slice(i - 1, i + 2);
        triangle[1][2] = triangleArea(triangle);
        triangles.push(triangle);
        heap.push(triangle);
      }

      // Always keep the arc endpoints!
      arc[0][2] = arc[n][2] = Infinity;

      for (var i = 0, n = triangles.length; i < n; ++i) {
        triangle = triangles[i];
        triangle.previous = triangles[i - 1];
        triangle.next = triangles[i + 1];
      }
    });

    while (triangle = heap.pop()) {
      var previous = triangle.previous,
          next = triangle.next;

      // If the area of the current point is less than that of the previous point
      // to be eliminated, use the latter's area instead. This ensures that the
      // current point cannot be eliminated without eliminating previously-
      // eliminated points.
      if (triangle[1][2] < maxArea) triangle[1][2] = maxArea;
      else maxArea = triangle[1][2];

      if (previous) {
        previous.next = next;
        previous[2] = triangle[2];
        update(previous);
      }

      if (next) {
        next.previous = previous;
        next[0] = triangle[0];
        update(next);
      }
    }

    topology.arcs.forEach(function(arc) {
      arc.forEach(relative);
    });

    function update(triangle) {
      heap.remove(triangle);
      triangle[1][2] = triangleArea(triangle);
      heap.push(triangle);
    }

    return topology;
  };

  function cartesianArea(triangle) {
    return Math.abs(
      (triangle[0][0] - triangle[2][0]) * (triangle[1][1] - triangle[0][1])
      - (triangle[0][0] - triangle[1][0]) * (triangle[2][1] - triangle[0][1])
    );
  }

  function compareArea(a, b) {
    return a[1][2] - b[1][2];
  }

  function minHeap(compare) {
    var heap = {},
        array = [];

    heap.push = function() {
      for (var i = 0, n = arguments.length; i < n; ++i) {
        var object = arguments[i];
        up(object.index = array.push(object) - 1);
      }
      return array.length;
    };

    heap.pop = function() {
      var removed = array[0],
          object = array.pop();
      if (array.length) {
        array[object.index = 0] = object;
        down(0);
      }
      return removed;
    };

    heap.remove = function(removed) {
      var i = removed.index,
          object = array.pop();
      if (i !== array.length) {
        array[object.index = i] = object;
        (compare(object, removed) < 0 ? up : down)(i);
      }
      return i;
    };

    function up(i) {
      var object = array[i];
      while (i > 0) {
        var up = ((i + 1) >> 1) - 1,
            parent = array[up];
        if (compare(object, parent) >= 0) break;
        array[parent.index = i] = parent;
        array[object.index = i = up] = object;
      }
    }

    function down(i) {
      var object = array[i];
      while (true) {
        var right = (i + 1) << 1,
            left = right - 1,
            down = i,
            child = array[down];
        if (left < array.length && compare(array[left], child) < 0) child = array[down = left];
        if (right < array.length && compare(array[right], child) < 0) child = array[down = right];
        if (down === i) break;
        array[child.index = i] = child;
        array[object.index = i = down] = object;
      }
    }

    return heap;
  }

  function transformAbsolute(transform) {
    if (!transform) return noop;
    var x0,
        y0,
        kx = transform.scale[0],
        ky = transform.scale[1],
        dx = transform.translate[0],
        dy = transform.translate[1];
    return function(point, i) {
      if (!i) x0 = y0 = 0;
      point[0] = (x0 += point[0]) * kx + dx;
      point[1] = (y0 += point[1]) * ky + dy;
    };
  }

  function transformRelative(transform) {
    if (!transform) return noop;
    var x0,
        y0,
        kx = transform.scale[0],
        ky = transform.scale[1],
        dx = transform.translate[0],
        dy = transform.translate[1];
    return function(point, i) {
      if (!i) x0 = y0 = 0;
      var x1 = (point[0] - dx) / kx | 0,
          y1 = (point[1] - dy) / ky | 0;
      point[0] = x1 - x0;
      point[1] = y1 - y0;
      x0 = x1;
      y0 = y1;
    };
  }

  function noop() {}

  return {
    version: "1.4.0",
    mesh: mesh,
    feature: featureOrCollection,
    neighbors: neighbors,
    presimplify: presimplify
  };
})();

},{}],74:[function(require,module,exports){
var reqwest = require('reqwest'),
  tileMath = require('../util/tilemath');

module.exports = function(layer) {
  var cache = {};

  return {
    getTileCoords: function(latLng) {
      var zoom = layer._map.getZoom();

      return {
        x: tileMath.long2tile(latLng.lng, zoom),
        y: tileMath.lat2tile(latLng.lat, zoom),
        z: zoom
      };
    },
    getTileGrid: function (url, latLng, callback) {
      if (cache[url]) {
        var response = cache[url];

        if (response === 'empty' || response === 'loading') {
          callback(null, null);
        } else {
          callback(response, this.getTileGridPoint(latLng, response));
        }
      } else {
        var me = this;

        cache[url] = 'loading';

        reqwest({
          error: function() {
            cache[url] = 'empty';
            callback(null, null);
          },
          success: function(response) {
            if (response) {
              cache[url] = response;
              callback(response, me.getTileGridPoint(latLng, response));
            } else {
              cache[url] = 'empty';
              callback(null, null);
            }
          },
          timeout: 2000,
          type: 'jsonp',
          url: url
        });
      }
    },
    getTileGridPoint: function(latLng, response) {
      var map = layer._map;

      if (map) {
        var point = map.project(latLng.wrap()),
          resolution = 4,
          tileSize = 256,
          max = map.options.crs.scale(map.getZoom()) / tileSize,
          x = Math.floor(point.x / tileSize),
          y = Math.floor(point.y / tileSize);

        x = (x + max) % max;
        y = (y + max) % max;

        return (response.data[response.keys[this.utfDecode(response.grid[Math.floor((point.y - (y * tileSize)) / resolution)].charCodeAt(Math.floor((point.x - (x * tileSize)) / resolution)))]]);
      }

      return null;
    },
    hasUtfData: function(url, latLng) {
      var cache = reqwest.getCache(url),
        returnValue = {'cursor': 'default'};

      if (cache) {
        if (cache.cacheStatus === 'success' && cache.response) {
          returnValue = this.getTileGridPoint(latLng, cache.response) ? {'cursor': 'pointer'} : false;
        } else if (cache.cacheStatus === 'error') {
          returnValue = false;
        }
      }

      return returnValue;
    },
    utfDecode: function(key) {
      if (key >= 93) {
        key--;
      }

      if (key >= 35) {
        key--;
      }

      return key - 32;
    }
  };
};

},{"../util/tilemath":72,"reqwest":28}],75:[function(require,module,exports){
/* global L */

'use strict';

var handlebars = require('handlebars'),
  reqwest = require('reqwest');

handlebars.registerHelper('toLowerCase', function(str) {
  return str.toLowerCase();
});

// Shim for Array.indexOf
if (!Array.prototype.indexOf) {
  Array.prototype.indexOf = function(searchElement, fromIndex) {
    if (this === undefined || this === null) {
      throw new TypeError('"this" is null or not defined');
    }

    var length = this.length >>> 0;

    fromIndex = +fromIndex || 0;

    if (Math.abs(fromIndex) === Infinity) {
      fromIndex = 0;
    }

    if (fromIndex < 0) {
      fromIndex += length;
      if (fromIndex < 0) {
        fromIndex = 0;
      }
    }

    for (; fromIndex < length; fromIndex++) {
      if (this[fromIndex] === searchElement) {
        return fromIndex;
      }
    }

    return -1;
  };
}

// Shim for window.atob/window.btoa
(function() {
  var decodeChars = new Array(-1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, 62, -1, -1, -1, 63, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, -1, -1, -1, -1, -1, -1, -1,  0,  1,  2,  3,  4,  5,  6,  7,  8,  9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, -1, -1, -1, -1, -1, -1, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, -1, -1, -1, -1, -1),
    encodeChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

  function base64decode(str) {
    var c1, c2, c3, c4, i, len, out;

    len = str.length;
    i = 0;
    out = '';

    while (i < len) {
      do {
        c1 = decodeChars[str.charCodeAt(i++) & 0xff];
      } while(i < len && c1 === -1);
      
      if (c1 === -1) {
        break;
      }

      do {
        c2 = decodeChars[str.charCodeAt(i++) & 0xff];
      } while(i < len && c2 === -1);

      if (c2 === -1) {
        break;
      }

      out += String.fromCharCode((c1 << 2) | ((c2 & 0x30) >> 4));

      do {
        c3 = str.charCodeAt(i++) & 0xff;

        if (c3 === 61) {
          return out;
        }

        c3 = decodeChars[c3];
      } while (i < len && c3 === -1);

      if (c3 === -1) {
        break;
      }

      out += String.fromCharCode(((c2 & 0XF) << 4) | ((c3 & 0x3C) >> 2));

      do {
        c4 = str.charCodeAt(i++) & 0xff;

        if (c4 === 61) {
          return out;
        }

        c4 = decodeChars[c4];
      } while (i < len && c4 === -1);

      if (c4 === -1) {
        break;
      }

      out += String.fromCharCode(((c3 & 0x03) << 6) | c4);

    }

    return out;
  }
  function base64encode(str) {
    var c1, c2, c3, i, len, out;

    len = str.length;
    i = 0;
    out = '';

    while (i < len) {
      c1 = str.charCodeAt(i++) & 0xff;

      if (i === len) {
        out += encodeChars.charAt(c1 >> 2);
        out += encodeChars.charAt((c1 & 0x3) << 4);
        out += '==';
        break;
      }

      c2 = str.charCodeAt(i++);

      if (i === len) {
        out += encodeChars.charAt(c1 >> 2);
        out += encodeChars.charAt(((c1 & 0x3)<< 4) | ((c2 & 0xF0) >> 4));
        out += encodeChars.charAt((c2 & 0xF) << 2);
        out += '=';
        break;
      }

      c3 = str.charCodeAt(i++);
      out += encodeChars.charAt(c1 >> 2);
      out += encodeChars.charAt(((c1 & 0x3)<< 4) | ((c2 & 0xF0) >> 4));
      out += encodeChars.charAt(((c2 & 0xF) << 2) | ((c3 & 0xC0) >>6));
      out += encodeChars.charAt(c3 & 0x3F);
    }

    return out;
  }

  if (!window.btoa) {
    window.btoa = base64encode;
  }

  if (!window.atob) {
    window.atob = base64decode;
  }
})();

module.exports = {
  _checkDisplay: function(node, changed) {
    if (node.style && node.style.display === 'none') {
      changed.push(node);
      node.style.display = 'block';
    }
  },
  _getAutoPanPaddingTopLeft: function(el) {
    var containers = this.getChildElementsByClassName(el, 'leaflet-top');

    return [this.getOuterDimensions(containers[0]).width + 20, this.getOuterDimensions(containers[1]).height + 20];
  },
  _getAvailableVerticalSpace: function(map) {
    var container = map.getContainer(),
      bottomLeft = this.getChildElementsByClassName(container, 'leaflet-bottom')[0],
      bottomRight = this.getChildElementsByClassName(container, 'leaflet-bottom')[1],
      bottomHeight = this.getOuterDimensions(bottomLeft).height,
      available;

    if (this.getOuterDimensions(bottomRight).height > bottomHeight) {
      bottomHeight = this.getOuterDimensions(bottomRight).height;
    }

    available = this.getOuterDimensions(container).height - bottomHeight - this.getOuterDimensions(this.getChildElementsByClassName(container, 'leaflet-top')[1]).height;

    if (available > 149) {
      return available;
    } else {
      return 150;
    }
  },
  _lazyLoader: require('./lazyloader.js'),
  _parseLocalUrl: function(url) {
    return url.replace(location.origin, '');
  },
  appendCssFile: function(urls, callback) {
    if (typeof urls === 'string') {
      urls = [
        urls
      ];
    }

    this._lazyLoader(urls, callback);
  },
  appendJsFile: function(urls, callback) {
    if (typeof urls === 'string') {
      urls = [
        urls
      ];
    }

    this._lazyLoader(urls, callback);
  },
  buildUrl: function(base, params) {
    var returnArray = [];

    if (params) {
      returnArray.push(base + '?');
    } else {
      return base;
    }

    for (var param in params) {
      returnArray.push(encodeURIComponent(param));
      returnArray.push('=');
      returnArray.push(encodeURIComponent(params[param]));
      returnArray.push('&');
    }

    returnArray.pop();
    return returnArray.join('');
  },
  cancelEvent: function(e) {
    e = e || window.event;

    if (e.preventDefault) {
      e.preventDefault();
    }

    e.returnValue = false;
  },
  dataToList: function(data, fields) {
    var dl = document.createElement('dl');

    for (var prop in data) {
      var add = true;

      if (fields && L.Util.isArray(fields)) {
        if (fields.indexOf(prop) === -1) {
          add = false;
        }
      }

      if (add) {
        var dd = document.createElement('dd'),
          dt = document.createElement('dt');

        dt.innerHTML = prop;
        dd.innerHTML = data[prop];
        dl.appendChild(dt);
        dl.appendChild(dd);
      }
    }

    return dl;
  },
  // TODO: Needs a lot of cleanup, and also need to document fields option.
  dataToTable: function(data, fields) {
    var table = document.createElement('table'),
      tableBody = document.createElement('tbody'),
      field, fieldTitles;

    table.appendChild(tableBody);

    if (L.Util.isArray(fields)) {
      fieldTitles = {};

      for (var i = 0; i < fields.length; i++) {
        field = fields[i];

        if (typeof(field) === 'string') {
          fieldTitles[field] = {
            'title': field
          };
        } else {
          fieldTitles[field.field] = field;
        }
      }
    }

    for (var prop in data) {
      var add = false;

      if (fieldTitles) {
        for (field in fieldTitles) {
          if (field === prop) {
            add = true;
            break;
          }
        }
      } else {
        add = true;
      }

      if (add) {
        var tdProperty = document.createElement('td'),
          tdValue = document.createElement('td'),
          tr = document.createElement('tr');

        tdProperty.style.paddingRight = '10px';

        if (fieldTitles) {
          tdProperty.innerHTML = fieldTitles[prop].title;
        } else {
          tdProperty.innerHTML = prop;
        }

        if (fieldTitles && fieldTitles[prop] && fieldTitles[prop].separator) {
          tdValue.innerHTML = data[prop].replace(fieldTitles[prop].separator, '<br/>');
        } else {
          tdValue.innerHTML = data[prop];
        }

        if (fieldTitles && fieldTitles[prop] && fieldTitles[prop].process) {
          tdValue.innerHTML = fieldTitles[prop].process(tdValue.innerHTML);
        }

        tr.appendChild(tdProperty);
        tr.appendChild(tdValue);
        tableBody.appendChild(tr);
      }
    }

    return table;
  },
  escapeHtml: function(unsafe) {
    return unsafe
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  },
  getChildElementsByClassName: function(parentNode, className) {
    var children = parentNode.childNodes,
      matches = [];

    function recurse(el) {
      var grandChildren = el.children;

      if (typeof el.className === 'string' && el.className.indexOf(className) !== -1) {
        var classNames = el.className.split(' ');

        for (var k = 0; k < classNames.length; k++) {
          if (classNames[k] === className) {
            matches.push(el);
            break;
          }
        }
      }

      if (grandChildren && grandChildren.length) {
        for (var j = 0; j < grandChildren.length; j++) {
          recurse(grandChildren[j]);
        }
      }
    }

    for (var i = 0; i < children.length; i++) {
      recurse(children[i]);
    }

    return matches;
  },
  getChildElementsByNodeName: function(parentNode, nodeName) {
    var children = parentNode.childNodes,
      matches = [];

    nodeName = nodeName.toLowerCase();

    function recurse(el) {
      var grandChildren = el.children;

      if (typeof el.nodeName === 'string' && el.nodeName.toLowerCase() === nodeName) {
        matches.push(el);
      }

      if (grandChildren && grandChildren.length) {
        for (var j = 0; j < grandChildren.length; j++) {
          recurse(grandChildren[j]);
        }
      }
    }

    for (var i = 0; i < children.length; i++) {
      recurse(children[i]);
    }

    return matches;
  },
  getElementsByClassName: function(className) {
    var matches = [],
      regex = new RegExp('(^|\\s)' + className + '(\\s|$)'),
      tmp = document.getElementsByTagName('*');

    for (var i = 0; i < tmp.length; i++) {
      if (regex.test(tmp[i].className)) {
        matches.push(tmp[i]);
      }
    }

    return matches;
  },
  getEventObject: function(e) {
    if (!e) {
      e = window.event;
    }

    return e;
  },
  getEventObjectTarget: function(e) {
    var target;

    if (e.target) {
      target = e.target;
    } else {
      target = e.srcElement;
    }

    if (target.nodeType === 3) {
      target = target.parentNode;
    }

    return target;
  },
  getNextSibling: function(el) {
    do {
      el = el.nextSibling;
    } while (el && el.nodeType !== 1);

    return el;
  },
  getOffset: function(el) {
    for (var lx = 0, ly = 0; el !== null; lx += el.offsetLeft, ly += el.offsetTop, el = el.offsetParent);

    return {
      left: lx,
      top: ly
    };
  },
  getOuterDimensions: function(el) {
    var height = 0,
      width = 0;

    if (el) {
      var changed = [],
        parentNode = el.parentNode;

      this._checkDisplay(el, changed);

      if (el.id !== 'npmap' && parentNode) {
        this._checkDisplay(parentNode, changed);

        while (parentNode.id && parentNode.id !== 'npmap' && parentNode.id !== 'npmap-map') {
          parentNode = parentNode.parentNode;

          if (parentNode) {
            this._checkDisplay(parentNode, changed);
          }
        }
      }

      height = el.offsetHeight;
      width = el.offsetWidth;

      changed.reverse();

      for (var i = 0; i < changed.length; i++) {
        changed[i].style.display = 'none';
      }
    }

    return {
      height: height,
      width: width
    };
  },
  getOuterHtml: function(el) {
    if (!el || !el.tagName) {
      return '';
    }

    var div = document.createElement('div'),
      ax, txt;

    div.appendChild(el.cloneNode(false));
    txt = div.innerHTML;
    ax = txt.indexOf('>') + 1;
    txt = txt.substring(0, ax) + el.innerHTML + txt.substring(ax);
    div = null;
    return txt;
  },
  getPosition: function(el) {
    var obj = {
      left: 0,
      top: 0
    },
      offset = this.getOffset(el),
      offsetParent = this.getOffset(el.parentNode);

    obj.left = offset.left - offsetParent.left;
    obj.top = offset.top - offsetParent.top;

    return obj;
  },
  getPreviousSibling: function(el) {
    do {
      el = el.previousSibling;
    } while (el && el.nodeType !== 1);

    return el;
  },
  getPropertyCount: function(obj) {
    if (!Object.keys) {
      var keys = [],
        k;

      for (k in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, k)) {
          keys.push(k);
        }
      }

      return keys.length;
    } else {
      return Object.keys(obj).length;
    }
  },
  handlebars: function(template, data) {
    template = handlebars.compile(template);

    return template(data);
  },
  isLocalUrl: function(url) {
    if (url.indexOf(location.origin) === 0) {
      return true;
    } else {
      return !(/^(?:[a-z]+:)?\/\//i.test(url));
    }
  },
  linkify: function(text, shorten, target) {
    var regexRoot = '\\b(https?:\/\/[-A-Z0-9+&@#/%?=~_|!:,.;]*[A-Z0-9+&@#/%=~_|])',
      regexLink = new RegExp(regexRoot, 'gi'),
      regexShorten = new RegExp('>' + regexRoot +'</a>', 'gi'),
      textLinked = text.replace(regexLink, '<a href="$1"' + (target ? ' target="' + target + '"' : '') + '>$1</a>');

    if (shorten) {
      var matchArray = textLinked.match(regexShorten);

      if (matchArray) {
        for (var i = 0; i < matchArray.length; i++) {
          var newBase = matchArray[i].substr(1, matchArray[i].length - 5).replace(/https?:\/\//gi, ''),
            newName = newBase.substr(0, shorten) + (newBase.length > shorten ? '&hellip;' : '');

          if (newBase.length-1 === shorten) {
            newName = newName.substr(0, shorten) + newBase.substr(shorten, 1);
          }

          textLinked = textLinked.replace(matchArray[i], '>' + newName + '</a>');
        }
      }
    }

    return textLinked;
  },
  loadFile: function(url, type, callback) {
    if (this.isLocalUrl(url)) {
      if (type === 'xml') {
        var request = new XMLHttpRequest();

        request.onload = function() {
          var text = this.responseText;

          if (text) {
            callback(text);
          } else {
            callback(false);
          }
        };
        request.open('get', this._parseLocalUrl(url), true);
        request.send();
      } else {
        reqwest({
          error: function() {
            callback(false);
          },
          success: function(response) {
            if (response) {
              if (type === 'text') {
                callback(response.responseText);
              } else {
                callback(response);
              }
            } else {
              callback(false);
            }
          },
          type: type,
          url: this._parseLocalUrl(url)
        });
      }
    } else {
      reqwest({
        error: function() {
          callback(false);
        },
        success: function(response) {
          if (response) {
            callback(response);
          } else {
            callback(false);
          }
        },
        type: 'jsonp',
        url: 'http://npmap-proxy.herokuapp.com?callback=?&type=' + type + '&url=' + url
      });
    }
  },
  mediaToList: function(data, media) {
    var imageDiv = [],
      imageLi = [],
      imageList = document.createElement('ul'),
      imageTypes = {
        focus: function(guids) {
          var imgs = [],
            regex = new RegExp('[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}(}){0,1}', 'g'),
            attrs, guidArray, i;

          guidArray = guids.match(regex);

          for (i = 0; i < guidArray.length; i++) {
            attrs = {
              src: 'http://focus.nps.gov/GetAsset/' + guidArray[i] + '/proxy/lores',
              href: 'http://focus.nps.gov/AssetDetail?assetID=' + guidArray[i]
            };
            imgs.push(attrs);
          }

          return imgs;
        }
      },
      mediaNavDiv = document.createElement('div'),
      btnDiv, imageAttrs, mediaIndex, next, prev;

    function changeImage(direction) {
      var lis = imageList.childNodes,
        maxImg = lis.length,
        next = btnDiv.childNodes[1],
        previous = btnDiv.childNodes[0],
        curImg, i, li;

      for (i = 0; i < lis.length; i++) {
        li = lis[i];

        if (li.style.display !== 'none') {
          curImg = i;
          break;
        }
      }

      if ((curImg + direction) < maxImg && (curImg + direction) > -1) {
        for (i = 0; i < lis.length; i++) {
          li = lis[i];

          if (i === (curImg + direction)) {
            li.style.display = 'inherit';
          } else {
            li.style.display = 'none';
          }
        }
      }

      if ((curImg + direction) <= 0) {
        L.DomUtil.addClass(previous, 'disabled');
      } else {
        L.DomUtil.removeClass(previous, 'disabled');
      }

      if ((curImg + direction + 1) >= maxImg) {
        L.DomUtil.addClass(next, 'disabled');
      } else {
        L.DomUtil.removeClass(next, 'disabled');
      }
    }

    for (mediaIndex = 0; mediaIndex < media.length; mediaIndex++) {
      var newAnchor = [],
        newImage = [];

      if (imageTypes[media[mediaIndex].type]) {
        imageAttrs = imageTypes[media[mediaIndex].type](data[media[mediaIndex].id]);

        for (var k = 0; k < imageAttrs.length; k++) {
          imageLi.push(document.createElement('li'));
          imageLi[k].style.float = 'left';
          imageLi[k].style.display = k > 0 ? 'none' : 'inherit';
          imageDiv.push(document.createElement('div'));
          imageDiv[k].style.width = '250px';
          imageDiv[k].style.height = (250 * 0.75) + 'px';
          imageDiv[k].style.marginLeft = 'auto';
          imageDiv[k].style.marginRight = 'auto';
          newAnchor.push(document.createElement('a'));
          newAnchor[k].href = imageAttrs[k].href;
          newImage.push(document.createElement('img'));
          newImage[k].src = imageAttrs[k].src;
          newAnchor[k].appendChild(newImage[k]);
          imageDiv[k].appendChild(newAnchor[k]);
          imageLi[k].appendChild(imageDiv[k]);
          imageList.appendChild(imageLi[k]);
        }
      }
    }

    imageList.className = 'clearfix';
    mediaNavDiv.appendChild(imageList);
    btnDiv = document.createElement('div');
    btnDiv.style.float = 'right';
    prev = document.createElement('button');
    prev.setAttribute('class', 'btn btn-circle disabled prev');
    prev.innerHTML = '&lt;';
    next = document.createElement('button');
    next.setAttribute('class', 'btn btn-circle next');
    next.innerHTML = '&gt;';
    L.DomEvent.addListener(prev, 'click', function() {
      changeImage(-1);
    });
    L.DomEvent.addListener(next, 'click', function() {
      changeImage(1);
    });
    btnDiv.appendChild(prev);
    btnDiv.appendChild(next);

    if (imageAttrs.length > 1) {
      mediaNavDiv.appendChild(btnDiv);
    }

    return mediaNavDiv;
  },
  parseDomainFromUrl: function(url) {
    var matches = url.match(/^https?\:\/\/([^\/?#]+)(?:[\/?#]|$)/i);

    return matches && matches[1];
  },
  putCursorAtEndOfInput: function(input) {
    if (input.setSelectionRange) {
      var length = input.value.length * 2;
      input.setSelectionRange(length, length);
    } else {
      input.value = input.value;
    }
  },
  reqwest: reqwest,
  strict: function(_, type) {
    if (typeof _ !== type) {
      throw new Error('Invalid argument: ' + type + ' expected');
    }
  },
  strictInstance: function(_, klass, name) {
    if (!(_ instanceof klass)) {
      throw new Error('Invalid argument: ' + name + ' expected');
    }
  },
  strictOneOf: function(_, values) {
    if (values.indexOf(_) === -1) {
      throw new Error('Invalid argument: ' + _ + ' given, valid values are ' + values.join(', '));
    }
  },
  stripHtml: function(html) {
    var tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  },
  unescapeHtml: function(unsafe) {
    return unsafe
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '\"')
      .replace(/&#039;/g, '\'');
  }
};

},{"./lazyloader.js":71,"handlebars":21,"reqwest":28}]},{},[30]);