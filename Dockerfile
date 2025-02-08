FROM node:18

WORKDIR /

COPY package.json yarn.lock ./

RUN yarn install --production

COPY . .

EXPOSE 8000

CMD ["node", "src/server.js"]