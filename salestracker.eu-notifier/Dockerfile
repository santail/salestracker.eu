FROM node:9-alpine

LABEL maintainer="nikolai muhhin <nikolai.muhhin@gmail.com>"

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

COPY package.json package-lock.json /usr/src/app/

RUN npm install

COPY . /usr/src/app

ENV NODE_ENV development
ENV TELEGRAM_API_TOKEN 527574719:AAE8yYNFlGnDhFfuh0Wx912UPUDfZ9i5ArY

CMD ["npm", "start"]
