## build runner
FROM node:16-slim as build-runner

# Set temp directory
WORKDIR /tmp/app

RUN apt-get update && apt-get -y install python3 build-essential

# Move package.json
COPY package*.json .

# Install dependencies
RUN npm install

# Move source files
COPY src ./src
COPY tsconfig.json .

# Build project
RUN npm run build

## production runner
FROM node:16-slim as prod-runner

# Set work directory
WORKDIR /app

# Copy package.json from build-runner
COPY --from=build-runner /tmp/app/package*.json /app

# Install dependencies
RUN apt-get update && \
    apt-get -y install python3 build-essential && \
    npm install --omit=dev && \
    apt-get -y remove build-essential python3

# Move build files
COPY --from=build-runner /tmp/app/build /app/build

# Add healthcheck
ENV HEALTHCHECK_PORT=80
COPY healthcheck.js .
HEALTHCHECK --start-period=30s --retries=1 --interval=10s CMD node healthcheck.js

# Start bot
CMD [ "npm", "run", "start" ]
