# the official Docker image for Ruby.
FROM ruby:2.1

# Add nodejs
# RUN curl -sL https://deb.nodesource.com/setup_7.x | bash -
RUN echo deb http://ftp.us.debian.org/debian/ sid main \
    > /etc/apt/sources.list.d/sid.list
RUN apt-get update && apt-get install -y --no-install-recommends \
  nodejs npm && \
  ln -sv /usr/bin/nodejs /usr/bin/node

# Add DOI Certs
# RUN curl http://blockpage.doi.gov/images/DOIRootCA.crt -o /etc/ssl/certs/DOIRootCA.crt
ADD ./DOIRootCA.crt /etc/ssl/certs/DOIRootCA.crt
RUN npm config set cafile /etc/ssl/certs/DOIRootCA.crt
ENV SSL_CERT_FILE=/etc/ssl/certs/DOIRootCA.crt
ENV GIT_SSL_CAINFO=/etc/ssl/certs/DOIRootCA.crt

# Install Bundler
RUN gem install bundler jekyll

# ADD ./v2 ./v2

# Install script and serve site
RUN  npm install http-server -g && \
     npm install grunt -g

# install and serve
CMD cd /v2 && \
    npm install && \
    bundle install && \
    grunt serve & \
    http-server /v2/_site -p 8000 && \
    fg
