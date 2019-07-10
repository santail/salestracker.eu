FROM node:10-alpine

LABEL maintainer="nikolai muhhin <nikolai.muhhin@gmail.com>"

RUN apk add python g++ make

RUN apk add vips-dev fftw-dev build-base --update-cache \
  --repository http://dl-3.alpinelinux.org/alpine/edge/community \
  --repository http://dl-3.alpinelinux.org/alpine/edge/main

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

COPY package.json package-lock.json /usr/src/app/

RUN npm install

COPY . /usr/src/app

CMD ["npm", "start"]
