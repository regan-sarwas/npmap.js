#!/bin/bash

# All functions execpt `build` assume that the cwd is the project root

function create_header() {
  if [ -z $npm_package_version ]; then
    npm_package_version=$(node -p "require('./package.json').version")
    npm_package_license=$(node -p "require('./package.json').license")
  fi
  year=`date +%Y`
  datetime=`date`
  local header="/* NPMap.js $npm_package_version\n * Built on $datetime\n * Copyright $year National Park Service\n * Licensed under $npm_package_license \n */"
  echo -e "$header"
}

function reset_dist {
  rm -rf dist
  mkdir dist
}

function copy_assets() {
  cp -r plugins dist/plugins
  cp -r theme/images dist/images
  cp -r node_modules/npmap-symbol-library/renders/npmap-builder dist/images/icon/npmap-symbol-library
}

function make_secrets() {
  if [ ! -f keys.json ]; then
    cp keys.sample.json keys.json
  fi
}

function make_js() {
  local header=$1
  (echo "$header"; npx browserify main.js) > dist/npmap.js
  (echo "$header"; npx browserify npmap.js) > dist/npmap-standalone.js
  (echo "$header"; cat src/bootstrap.js) > dist/npmap-bootstrap.js
  (echo "$header"; npx uglifyjs dist/npmap.js) > dist/npmap.min.js
  (echo "$header"; npx uglifyjs dist/npmap-standalone.js) > dist/npmap-standalone.min.js
  (echo "$header"; npx uglifyjs src/bootstrap.js) > dist/npmap-bootstrap.min.js
}

function make_css() {
  local header=$1
  local symbol_css="$(node build/build_symbol_css.js)"
  (echo "$header"; cat theme/nps.css) > dist/npmap-standalone.css
  (echo "$header"; echo "$symbol_css"; cat node_modules/leaflet/dist/leaflet.css theme/nps.css) > dist/npmap.css
  (echo "$header"; npx cssmin dist/npmap-standalone.css) > dist/npmap-standalone.min.css
  (echo "$header"; npx cssmin dist/npmap.css) > dist/npmap.min.css
}

function make_examples() {
  mkdir dist/examples
  cp -r examples/data dist/examples/data
  cp -r examples/img dist/examples/img
  node build/build_examples.js
}

function build() {
  cd "${0%/*}"/.. # set the cwd to the project directory, i.e. the parent of this script's directory
  local header="$(create_header)"
  reset_dist
  copy_assets
  make_secrets
  make_js "$header"
  make_css "$header"
  make_examples
  cd ~-  # quietly restore the old cwd
}

build
