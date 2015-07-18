/* globals grunt */
/* jshint camelcase: false */

module.exports = function(grunt) {
  'use strict';

  var cssNpmaki = '',
    npmaki = require('./node_modules/npmap-symbol-library/www/npmaki.json'),
    npmapBaseUrl = 'http://www.nps.gov/npmap/npmap.js',
    pkg = require('./package.json'),
    sizes = {
      large: 24,
      medium: 18,
      small: 12
    },
    secrets;

  function loadNpmTasks() {
    var gruntTasks = Object.keys(pkg.devDependencies).filter(function(moduleName) {
      return /(^grunt-)/.test(moduleName);
    });

    gruntTasks.forEach(function(task) {
      grunt.loadNpmTasks(task);
    });
  }

  for (var i = 0; i < npmaki.length; i++) {
    var icon = npmaki[i];

    for (var prop in sizes) {
      cssNpmaki += '.' + icon.icon + '-' + prop + ' {background-image: url(images/icon/npmaki/' + icon.icon + '-' + sizes[prop] + '.png);}\n';
      cssNpmaki += '.' + icon.icon + '-' + prop + '-2x {background-image: url(images/icon/npmaki/' + icon.icon + '-' + sizes[prop] + '@2x.png);}\n';
    }
  }

  (function() {
    try {
      secrets = require('./secrets.json');
    } catch (e) {
      secrets = require('./secrets.sample.json');
    }
  })();

  grunt.util.linefeed = '\n';
  grunt.initConfig({
    akamai_rest_purge: {
      lib: {
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
        ].map(function(fileName) {
          return 'http://www.nps.gov/lib/npmap.js/<%= pkg.version %>/' + fileName;
        })
      },
      npmap: {
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
        ].map(function(fileName) {
          return npmapBaseUrl + '/<%= pkg.version %>/' + fileName;
        })
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
      },
      npmap: {
        options: {
          force: true
        },
        src: [
          '/Volumes/npmap/npmap.js/<%= pkg.version %>'
        ]
      }
    },
    concat: {
      css: {
        dest: 'dist/npmap.css',
        options: {
          banner: cssNpmaki
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
          process: function(content) {
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
      npmaki: {
        cwd: 'node_modules/npmap-symbol-library/renders/',
        dest: 'dist/images/icon/npmaki',
        expand: true,
        src: [
          '**/*'
        ]
      },
      npmap: {
        cwd: 'dist/',
        dest: '/Volumes/npmap/npmap.js/<%= pkg.version %>/',
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
        'dist/npmap.css'
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
    // TODO: Find a better way to hit the Akamai ECCU API. Required because the CCU API doesn't support wildcards.
    http: {
      lib_examples: {
        options: {
          url: 'http://ncrcms.nps.doi.net/purge/akam_build_eccu.jsp?path=%2Flib%2Fnpmap.js%2F<%= pkg.version %>%2Fexamples%2F*&Submit%3DSubmit'
        }
      },
      lib_images: {
        options: {
          url: 'http://ncrcms.nps.doi.net/purge/akam_build_eccu.jsp?path=%2Flib%2Fnpmap.js%2F<%= pkg.version %>%2Fimages%2F*&Submit%3DSubmit'
        }
      },
      npmap_examples: {
        options: {
          url: 'http://ncrcms.nps.doi.net/purge/akam_build_eccu.jsp?path=%2Fnpmap%2Fnpmap.js%2F<%= pkg.version %>%2Fexamples%2F*&Submit%3DSubmit'
        }
      },
      npmap_images: {
        options: {
          url: 'http://ncrcms.nps.doi.net/purge/akam_build_eccu.jsp?path=%2Fnpmap%2Fnpmap.js%2F<%= pkg.version %>%2Fimages%2F*&Submit%3DSubmit'
        }
      }
    },
    mkdir: {
      lib: {
        create: [
          '/Volumes/lib/npmap.js/<%= pkg.version %>/'
        ]
      },
      npmap: {
        create: [
          '/Volumes/npmap/npmap.js/<%= pkg.version %>/'
        ]
      }
    },
    mocha_phantomjs: {
      all: [
        'test/index.html'
      ]
    },
    pkg: pkg,
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
  grunt.registerTask('build', ['clean:dist', 'copy:css', 'copy:examples', 'copy:images', 'copy:javascript', 'copy:npmaki', 'copy:plugins', 'concat', 'browserify', 'uglify', 'cssmin', 'usebanner']); //TODO: csscomb, validation
  grunt.registerTask('deploy-lib', ['clean:lib', 'mkdir:lib', 'copy:lib', 'akamai_rest_purge:lib', 'http:lib_examples', 'http:lib_images']);
  grunt.registerTask('deploy-npmap', ['clean:npmap', 'mkdir:npmap', 'copy:npmap', 'akamai_rest_purge:npmap', 'http:npmap_examples', 'http:npmap_images']);
  grunt.registerTask('lint', ['csslint']); //TODO: jshint
  grunt.registerTask('test', ['mocha_phantomjs']);
};
