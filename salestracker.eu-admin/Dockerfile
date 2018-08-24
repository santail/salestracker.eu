FROM node

LABEL maintainer="nikolai muhhin <nikolai.muhhin@gmail.com>"

# Install gem sass for  grunt-contrib-sass
RUN apt-get update -qq && apt-get install -y build-essential ruby ruby-dev && \
    gem install sass && \
    mkdir -p /usr/src/app

WORKDIR /usr/src/app

COPY package.json package-lock.json /usr/src/app/

RUN npm install -g grunt-cli && \
    npm install -g bower

RUN npm install

COPY .bowerrc bower.json /usr/src/app/

RUN bower install --config.interactive=false --allow-root

# Make everything available for start
COPY . /usr/src/app

# Set development environment as default
ENV NODE_ENV development
ENV MONGO_SEED true

# Port 8000 for server
# Port 35729 for livereload
EXPOSE 8000 35729

CMD ["grunt"]
