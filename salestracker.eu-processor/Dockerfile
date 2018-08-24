FROM node
LABEL maintainer="nikolai muhhin <nikolai.muhhin@gmail.com>"

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

COPY package.json /usr/src/app

RUN npm install

COPY . /usr/src/app

ENV NODE_ENV development

CMD ["npm", "start"]
