#! /bin/bash

# Change to the root directory
cd /npmapjs

# install the npm reqs
npm install
grunt build

# Serve the website (make the directory to serve from in the case that it's not there)
mkdir -p /npmapjs/dist
http-server /npmapjs/dist -p 8080

# Start grunt watch task
# grunt serve
