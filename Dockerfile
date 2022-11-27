FROM --platform=linux/arm/v7 node:16-alpine

WORKDIR /app

COPY . .

RUN npm i && npm run build && rm -r ./src

CMD [ "npm", "start" ]
