FROM node
LABEL maintainer="nikolai muhhin <nikolai.muhhin@gmail.com>"

RUN dpkg --add-architecture i386
RUN apt-get update
RUN apt-get install -y libc6:i386 libncurses5:i386 libstdc++6:i386

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

COPY package.json /usr/src/app

RUN npm install

COPY ./lib /tmp/lib
COPY . /usr/src/app

RUN cp -r /tmp/lib/* /usr/src/app/ && rm -rf /tmp/lib

ENV NODE_ENV development

CMD ["npm", "start"]
