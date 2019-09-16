# This is just an outline, not an actual working script

make_css(header):
 * Create theme/symbols.css
 * (echo $header; cat theme/symbols.css theme/nps.css) > dist/npmap-standalone.css
 * cssmin dist/npmap-standalone.css > dist/npmap-standalone.min.css
   - or if you don't want the header minified, try something like this:
   - (echo $header; cssmin theme/symbols.css theme/nps.css) > dist/npmap-standalone.min.css

make_js(header):
 * (echo $header; browserify main.js) > dist/npmap.js
 * (echo $header; browserify npmap.js) > dist/npmap-standalone.js
 * (echo $header; cat src/bootstrap.js) > dist/npmap-bootstrap.js
 * uglify dist/npmap.js > dist/npmap.min.js
 * uglify dist/npmap-standalone.js > dist/npmap-standalone.min.js
 * uglify src/bootstrap.js > dist/npmap-bootstrap.min.js

make_docs:
  # consider removing this function.  API docs are best viewed on github; no longer published on nps.gov
  * mkdir dist/api
  * npx showdown makehtml -i api/index.md -o dist/api/index.html

make_examples:
  * mkdir dist/examples
  * cp examples/data dist/examples/data
  * cp examples/img dist/examples/img
  * node build_examples.js

copy_assets:
  * cp plugins dist/plugins
  * cp theme/images dist/images
  * cp node_modules/npmap-symbol-library/renders/npmap-builder dist/images/icon/npmap-symbol-library

lint():
 * csslint theme/nps.css (optional)
 * eslint *.js src/**/*.js (optional)

build():
 * set cwd to root project folder (fixed relative to this file)
 * header = create_header(package.json)
 * rm -rf dist; mkdir dist
 * copy_assets()
 * make_secrets()
 * make_js(header)
 * make_css(header)
 * make_docs()
 * make_examples()
 * restore cwd

publish():
  * build()
  * deploy.sh

create_header(pkg):
  version = grep pkg
  license = grep pkg
  date = date +FORMAT
  time = date +FORMAT
  header = '/**\n * NPMap.js $version\n * Built on $date at $time\n * Copyright $year National Park Service\n * Licensed under $license */'
  return header

Create theme/symbols.css:
  if theme/symbols.css is newer than script and input then quit
  rm theme/symbols.css
  foreach icon in ./node_modules/npmap-symbol-library/www/npmap-builder/npmap-symbol-library.json
    foreach name,size in [(large,24),(medium,18),(small,12)]:
      echo '.' + icon.icon + '-' + name + ' {background-image: url(images/icon/npmap-symbol-library/' + icon.icon + '-' + size + '.png);}' >> theme/symbols.css
      echo '.' + icon.icon + '-' + name + '-2x {background-image: url(images/icon/npmap-symbol-library/' + icon.icon + '-' + size + '@2x.png);}' >>theme/symbols.css


      'examples-data': {
        cwd: 'examples/data/',
        dest: 'dist/examples/data',
        expand: true,
        src: [
          '**'
        ]
      },
      'examples-img': {
        cwd: 'examples/img/',
        dest: 'dist/examples/img',
        expand: true,
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
