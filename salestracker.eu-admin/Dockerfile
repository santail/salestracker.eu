FROM node

LABEL maintainer="nikolai muhhin <nikolai.muhhin@gmail.com>"

# Install gem sass for  grunt-contrib-sass
RUN apt-get update -qq && apt-get install -y build-essential
RUN apt-get install -y ruby
RUN apt-get install -y ruby-dev
RUN gem install sass

RUN mkdir -p /usr/src/app

WORKDIR /usr/src/app

COPY package.json /usr/src/app

RUN npm install -g grunt-cli
RUN npm install -g bower

RUN npm install

COPY .bowerrc /usr/src/app/.bowerrc
COPY bower.json /usr/src/app/bower.json

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
