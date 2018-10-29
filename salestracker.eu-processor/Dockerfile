FROM node:9-alpine

LABEL maintainer="nikolai muhhin <nikolai.muhhin@gmail.com>"

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

COPY package.json package-lock.json /usr/src/app/

RUN npm install

COPY . /usr/src/app

ENV NODE_ENV development
ENV SHOULD_HARVEST_PICTURES true

CMD ["npm", "start"]
