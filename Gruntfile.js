/* globals grunt */
/* jshint camelcase: false */

module.exports = function(grunt) {
  'use strict';

  var npmapBaseUrl = 'http://www.nps.gov/npmap/npmap.js';

  /**
   * Read the dev dependencies to detect and register suite of grunt
   * tasks, assuming they follow the `grunt-` naming convention
   */
  var loadNpmTasks = function() {
      var gruntTasks = Object.keys(pkg.devDependencies).filter(function(moduleName) { 
          return /(^grunt-)/.test(moduleName);
      });

      gruntTasks.forEach(function(task) {
          grunt.loadNpmTasks(task);
      });
  }
  
  var cssNpmaki = '',
    npmaki = require('./node_modules/npmaki/_includes/maki.json'),
    pkg = require('./package.json'),
    secrets = require('./secrets.json'),
    sizes = {
      large: 24,
      medium: 18,
      small: 12
    };

  for (var i = 0; i < npmaki.length; i++) {
    var icon = npmaki[i];

    for (var prop in sizes) {
      cssNpmaki += '.' + icon.icon + '-' + prop + ' {background-image: url(images/icon/npmaki/' + icon.icon + '-' + sizes[prop] + '.png);}\n';
      cssNpmaki += '.' + icon.icon + '-' + prop + '-2x {background-image: url(images/icon/npmaki/' + icon.icon + '-' + sizes[prop] + '@2x.png);}\n';
    }
  }

  grunt.util.linefeed = '\n';
  grunt.initConfig({
    akamai_rest_purge: {
      all: {
        objects: ['npmap-bootstrap.js', 
                  'npmap-bootstrap.min.js', 
                  'npmap.css', 
                  'npmap.min.css', 
                  'npmap.js', 
                  'npmap-standalone.css',
                  'npmap-standalone.min.css', 
                  'npmap-standalone.js', 
                  'npmap-standalone.min.js'].map(function(fileName) { return npmapBaseUrl + '/<%= pkg.version %>/' + fileName; })
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
      nps: {
        options: {
          force: true
        },
        src: [
          '/Volumes/npmap/npmap.js/<%= pkg.version %>'
        ]
      }
    },
    compress: {
      production: {
        options: {
          mode: 'gzip'
        },
        files: [{
          cwd: 'dist/',
          dest: 'dist/gzip/',
          expand: true,
          ext: '.css',
          src: [
            'npmap-standalone.css',
            'npmap.css'
          ]
        },{
          cwd: 'dist/',
          dest: 'dist/gzip/',
          expand: true,
          ext: '.min.css',
          src: [
            'npmap-standalone.min.css',
            'npmap.min.css'
          ]
        },{
          cwd: 'dist/',
          dest: 'dist/gzip/',
          expand: true,
          ext: '.js',
          src: [
            'npmap-bootstrap.js',
            'npmap-standalone.js',
            'npmap.js'
          ]
        },{
          cwd: 'dist/',
          dest: 'dist/gzip/',
          expand: true,
          ext: '.min.js',
          src: [
            'npmap-bootstrap.min.js',
            'npmap-standalone.min.js',
            'npmap.min.js'
          ]
        }]
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
        dest: 'dist/',
        options: {
          process: function(content) {
            return content.replace(/..\/dist\//g, '../');
          }
        },
        src: 'examples/**/*'
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
      npmaki: {
        cwd: 'node_modules/npmaki/renders/',
        dest: 'dist/images/icon/npmaki',
        expand: true,
        src: [
          '**/*'
        ]
      },
      nps: {
        cwd: 'dist/',
        dest: '/Volumes/npmap/npmap.js/<%= pkg.version %>/',
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
      examples: {
        options: {
          url: 'http://ncrcms.nps.doi.net/purge/akam_build_eccu.jsp?path=%2Fnpmap%2Fnpmap.js%2F<%= pkg.version %>%2Fexamples%2F*&Submit%3DSubmit'
        }
      },
      images: {
        options: {
          url: 'http://ncrcms.nps.doi.net/purge/akam_build_eccu.jsp?path=%2Fnpmap%2Fnpmap.js%2F<%= pkg.version %>%2Fimages%2F*&Submit%3DSubmit'
        }
      }
    },
    mkdir: {
      nps: {
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
    /*
    mount: {
      share: {
        options: {
          mountPoint: '/Volumes/npmap-deploy',
          share: {
            folder: '/nps_prod/other/static/npmap',
            host: 'dencmscontent'
          },
          username: 'nirwin',
          password: 'It\'s ski season!'
        }
      }
    },
    */
    pkg: pkg,
    uglify: {
      npmap: {
        dest: 'dist/npmap.min.js',
        src: 'dist/npmap.js'
      },
      'npmap-bootstrap': {
        dest: 'dist/npmap-bootstrap.min.js',
        src: 'dist/npmap-bootstrap.js'
      },
      'npmap-standalone': {
        dest: 'dist/npmap-standalone.min.js',
        src: 'dist/npmap-standalone.js'
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

   //TODO: csscomb, validation
  grunt.registerTask('build', ['clean:dist', 'copy:css', 'copy:examples', 'copy:images', 'copy:javascript', 'copy:npmaki', 'concat', 'browserify', 'uglify', 'cssmin', 'usebanner']);
  grunt.registerTask('deploy', ['clean:nps', 'mkdir:nps', 'copy:nps', 'akamai_rest_purge', 'http']);
  grunt.registerTask('lint', ['csslint']); //TODO: jshint
  //grunt.registerTask('mount', ['mount']);
  grunt.registerTask('test', ['mocha_phantomjs']);
};
