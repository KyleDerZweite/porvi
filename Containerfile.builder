FROM node:20-alpine

# Install pnpm and git
RUN corepack enable && corepack prepare pnpm@latest --activate \
    && apk add --no-cache git

WORKDIR /app

# The repo is bind-mounted at /app
# Entrypoint is the build-loop script
ENTRYPOINT ["sh", "/app/scripts/build-loop.sh"]
