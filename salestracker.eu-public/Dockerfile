FROM node

LABEL maintainer="nikolai muhhin <nikolai.muhhin@gmail.com>"

# Install gem sass for  grunt-contrib-sass
RUN apt-get update -qq && apt-get install -y build-essential ruby ruby-dev && \
    gem install sass && \
    mkdir -p /usr/src/app

WORKDIR /usr/src/app

COPY package.json package-lock.json /usr/src/app/

RUN npm install

# Make everything available for start
COPY . /usr/src/app

# Set development environment as default
ENV NODE_ENV development
ENV MONGO_SEED true

# Port 9000 for server
# Port 35729 for livereload
EXPOSE 9000 35729

CMD [ "npm", "run", "dev" ]