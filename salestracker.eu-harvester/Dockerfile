FROM node:9

LABEL maintainer="nikolai muhhin <nikolai.muhhin@gmail.com>"

RUN dpkg --add-architecture i386
RUN apt-get update
RUN apt-get install -y libc6:i386 libncurses5:i386 libstdc++6:i386

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

COPY package.json package-lock.json /usr/src/app/

RUN npm install

COPY . /usr/src/app

ENV NODE_ENV development
ENV PAGING_PAGES_LIMIT 1
ENV OFFERS_LIMIT 1

CMD ["npm", "start"]
