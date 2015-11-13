module.exports = function (grunt) {
  'use strict';

  var cssNpmapSymbolLibrary = '';
  var npmapSymbolLibrary = require('./node_modules/npmap-symbol-library/www/npmap-builder/npmap-symbol-library.json');
  var pkg = require('./package.json');
  var sizes = {
    large: 24,
    medium: 18,
    small: 12
  };
  var secrets;

  function loadNpmTasks () {
    var gruntTasks = Object.keys(pkg.devDependencies).filter(function (moduleName) {
      return /(^grunt-)/.test(moduleName);
    });

    gruntTasks.forEach(function (task) {
      grunt.loadNpmTasks(task);
    });
  }

  for (var i = 0; i < npmapSymbolLibrary.length; i++) {
    var icon = npmapSymbolLibrary[i];

    for (var prop in sizes) {
      cssNpmapSymbolLibrary += '.' + icon.icon + '-' + prop + ' {background-image: url(images/icon/npmap-symbol-library/' + icon.icon + '-' + sizes[prop] + '.png);}\n';
      cssNpmapSymbolLibrary += '.' + icon.icon + '-' + prop + '-2x {background-image: url(images/icon/npmap-symbol-library/' + icon.icon + '-' + sizes[prop] + '@2x.png);}\n';
    }
  }

  try {
    secrets = require('./secrets.json');
  } catch (e) {
    secrets = require('./secrets.sample.json');
  }

  grunt.util.linefeed = '\n';
  grunt.initConfig({
    akamai_rest_purge: {
      lib: {
        /*
        objects: [
          'npmap-bootstrap.js',
          'npmap-bootstrap.min.js',
          'npmap.css',
          'npmap.min.css',
          'npmap.js',
          'npmap.min.js',
          'npmap-standalone.css',
          'npmap-standalone.min.css',
          'npmap-standalone.js',
          'npmap-standalone.min.js'
        ].map(function (fileName) {
          return 'http://www.nps.gov/lib/npmap.js/<%= pkg.version %>/' + fileName;
        })
        */
        objects: [
          'http://www.nps.gov/lib/npmap.js/<%= pkg.version %>/*'
        ]
      },
      options: {
        action: 'invalidate',
        auth: {
          pass: secrets.akamai.password,
          user: secrets.akamai.user
        }
      }
    },
    browserify: {
      all: {
        files: {
          'dist/npmap.js': [
            'main.js'
          ],
          'dist/npmap-standalone.js': [
            'npmap.js'
          ]
        }
      }
    },
    clean: {
      dist: {
        src: [
          'dist/**/*'
        ]
      },
      lib: {
        options: {
          force: true
        },
        src: [
          '/Volumes/lib/npmap.js/<%= pkg.version %>'
        ]
      }
    },
    concat: {
      css: {
        dest: 'dist/npmap.css',
        options: {
          banner: cssNpmapSymbolLibrary
        },
        src: [
          'node_modules/leaflet/dist/leaflet.css',
          'theme/nps.css'
        ]
      }
    },
    copy: {
      css: {
        dest: 'dist/npmap-standalone.css',
        src: 'theme/nps.css'
      },
      examples: {
        cwd: 'examples/',
        dest: 'dist/examples',
        expand: true,
        options: {
          process: function (content) {
            return content.replace(/..\/dist\//g, '../');
          }
        },
        src: [
          '**'
        ]
      },
      images: {
        cwd: 'theme/images/',
        dest: 'dist/images',
        expand: true,
        src: [
          '**/*'
        ]
      },
      javascript: {
        dest: 'dist/npmap-bootstrap.js',
        src: 'src/bootstrap.js'
      },
      lib: {
        cwd: 'dist/',
        dest: '/Volumes/lib/npmap.js/<%= pkg.version %>/',
        expand: true,
        src: [
          '**/*'
        ]
      },
      npmapSymbolLibrary: {
        cwd: 'node_modules/npmap-symbol-library/renders/npmap-builder/',
        dest: 'dist/images/icon/npmap-symbol-library',
        expand: true,
        src: [
          '**/*'
        ]
      },
      plugins: {
        cwd: 'plugins/',
        dest: 'dist/plugins/',
        expand: true,
        src: [
          '**/*'
        ]
      }
    },
    csslint: {
      src: [
        'theme/nps.css'
      ]
    },
    cssmin: {
      dist: {
        cwd: 'dist/',
        dest: 'dist/',
        expand: true,
        ext: '.min.css',
        src: [
          '*.css',
          '!*.min.css'
        ]
      }
    },
    mkdir: {
      lib: {
        create: [
          '/Volumes/lib/npmap.js/<%= pkg.version %>/'
        ]
      }
    },
    mocha_phantomjs: {
      all: [
        'test/index.html'
      ]
    },
    pkg: pkg,
    semistandard: {
      src: [
        'src/**/*.js'
      ]
    },
    uglify: {
      all: {
        cwd: 'dist/',
        expand: true,
        dest: 'dist/',
        ext: '.min.js',
        src: ['**/*.js', '!*.min.js']
      }
    },
    usebanner: {
      dist: {
        options: {
          banner: '/**\n * NPMap.js <%= pkg.version %>\n * Built on <%= grunt.template.today("mm/dd/yyyy") %> at <%= grunt.template.today("hh:MMTT Z") %>\n * Copyright <%= grunt.template.today("yyyy") %> National Park Service\n * Licensed under ' + pkg.licenses[0].type + ' (' + pkg.licenses[0].url + ')\n */',
          position: 'top'
        },
        files: {
          src: [
            'dist/*.css',
            'dist/*.js'
          ]
        }
      }
    }
  });
  loadNpmTasks();
  // TODO: csscomb, validation
  grunt.registerTask('build', [
    'clean:dist',
    'copy:css',
    'copy:examples',
    'copy:images',
    'copy:javascript',
    'copy:npmapSymbolLibrary',
    'copy:plugins',
    'concat',
    'browserify',
    'uglify',
    'cssmin',
    'usebanner'
  ]);
  grunt.registerTask('deploy', [
    'clean:lib',
    'mkdir:lib',
    'copy:lib',
    'akamai_rest_purge:lib'
  ]);
  grunt.registerTask('lint', [
    'csslint',
    'semistandard'
  ]);
  grunt.registerTask('test', [
    'mocha_phantomjs'
  ]);
};
