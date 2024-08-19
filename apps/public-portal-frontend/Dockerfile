
# Pull the Node.js image
FROM node:18-alpine AS builder

WORKDIR /usr/src/app

COPY ../../package*.json ./

RUN apk add --update python3 make g++ && rm -rf /var/cache/apk/*

RUN npm install --only=development --silent

COPY ../../ .

#Switch off local caching for NX
RUN NX_REJECT_UNKNOWN_LOCAL_CACHE=0 npx nx build public-portal-frontend --prod

FROM nginx:stable-alpine

WORKDIR /usr/share/nginx/html

RUN rm -rf ./*

COPY --from=builder /usr/src/app/dist/apps/public-portal-frontend ./

RUN sed -i '10i \\ttry_files $uri $uri/ /index.html;' /etc/nginx/conf.d/default.conf

ENTRYPOINT ["nginx", "-g", "daemon off;"]
