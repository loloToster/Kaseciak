FROM node:16-slim as builder

# Set work directory
WORKDIR /app

# needed for opus library
RUN apt-get update && apt-get -y install python3 build-essential

# Move package.json & package-lock.json
COPY package*.json .

# Install dependencies
RUN npm install

# Move source files
COPY src ./src
COPY tsconfig.json .

# Build project
RUN npm run build

# Remove source code
RUN rm tsconfig.json && rm -r ./src && rm -rf ./node_modules

ENV NODE_ENV=production

# Install dependencies
RUN npm install --omit=dev

# Remove build tools
RUN apt-get -y remove build-essential python3

# Add healthcheck
ENV HEALTHCHECK_PORT=80
COPY healthcheck.js .
HEALTHCHECK --start-period=30s --retries=1 --interval=10s CMD node healthcheck.js

# Start bot
CMD [ "npm", "run", "start" ]
