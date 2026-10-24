FROM node:22-alpine
WORKDIR /srv/naukas
COPY server.js package.json ./
COPY app ./app
COPY vendor ./vendor
ENV PORT=8080 DATA_DIR=/data
VOLUME ["/data"]
EXPOSE 8080
CMD ["node", "server.js"]
