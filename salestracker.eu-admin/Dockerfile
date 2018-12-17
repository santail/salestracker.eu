FROM node:9

LABEL maintainer="nikolai muhhin <nikolai.muhhin@gmail.com>"

# Install gem sass for  grunt-contrib-sass
RUN apt-get update -qq && apt-get install -y build-essential ruby ruby-dev && \
    gem install sass && \
    mkdir -p /usr/src/app

WORKDIR /usr/src/app

COPY package.json package-lock.json /usr/src/app/

RUN npm install

ENV NODE_ENV development

COPY . /usr/src/app

CMD ["npm", "run", "dev"]
