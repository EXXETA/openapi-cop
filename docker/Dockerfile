FROM node:18 AS builder
WORKDIR /app
COPY . .
RUN npm ci --unsafe-perm
RUN npm run compile

FROM node:18 AS main

ENV TARGET ""
ENV FILE ""
ENV DEFAULT_FORBID_ADDITIONAL_PROPERTIES ""
ENV SILENT ""
ENV VERBOSE ""
ENV NODE_ENV "production"

WORKDIR /openapi-cop-docker
COPY package.json .
COPY package-lock.json .
RUN npm ci --only=prod
COPY --from=builder /app/build .
COPY docker/entrypoint.bash .

EXPOSE 8888

ENTRYPOINT ["/bin/bash", "./entrypoint.bash"]
