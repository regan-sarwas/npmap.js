# the official Docker image for Ruby.
FROM buildpack-deps:stretch

# Add nodejs
# RUN curl -sL https://deb.nodesource.com/setup_7.x | bash -
RUN echo deb http://ftp.us.debian.org/debian/ sid main \
    > /etc/apt/sources.list.d/sid.list
RUN apt-get update && apt-get install -y --no-install-recommends \
  nodejs npm
RUN  ln -sv /usr/bin/nodejs /usr/bin/node || true

# Add DOI Certs
# RUN curl http://blockpage.doi.gov/images/DOIRootCA.crt -o /etc/ssl/certs/DOIRootCA.crt
ADD ./DOIRootCA.crt /etc/ssl/certs/DOIRootCA.crt
RUN npm config set cafile /etc/ssl/certs/DOIRootCA.crt
ENV SSL_CERT_FILE=/etc/ssl/certs/DOIRootCA.crt
ENV GIT_SSL_CAINFO=/etc/ssl/certs/DOIRootCA.crt

# Install script and serve site
RUN  npm config set strict-ssl false && \
     npm install http-server -g && \
     npm install grunt -g \
     npm install -g grunt-cli
