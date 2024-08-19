
# Pull the Node.js image
FROM node:18-alpine AS builder

WORKDIR /usr/src/app

COPY ../../package*.json ./

RUN apk add --update python3 make g++ && rm -rf /var/cache/apk/*

RUN npm install --only=development --silent

COPY ../../ .

#Switch off local caching for NX
RUN NX_REJECT_UNKNOWN_LOCAL_CACHE=0 npx nx build public-portal-api --prod

FROM node:alpine

WORKDIR /usr/src/app

COPY package*.json ./

RUN apk add --update python3 make g++ && rm -rf /var/cache/apk/*

RUN npm install -g pm2@latest && npm install --only=production --silent

COPY --from=builder /usr/src/app/dist/apps/public-portal-api ./

EXPOSE 3000

ENTRYPOINT ["pm2-runtime","main.js"]
