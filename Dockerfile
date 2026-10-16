# A versão deve bater com o playwright-core do package.json. ARG usado em FROM precisa vir antes do 1º FROM.
ARG PLAYWRIGHT_VERSION=1.64.1

# Build para Coolify / VPS (Next.js standalone)
FROM node:22-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Chaves públicas do Clerk precisam existir em build time
ARG NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
ARG NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
ARG NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
ENV NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=$NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY \
    NEXT_PUBLIC_CLERK_SIGN_IN_URL=$NEXT_PUBLIC_CLERK_SIGN_IN_URL \
    NEXT_PUBLIC_CLERK_SIGN_UP_URL=$NEXT_PUBLIC_CLERK_SIGN_UP_URL \
    NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Imagem oficial do Playwright: já traz Chromium + dependências do sistema.
FROM mcr.microsoft.com/playwright:v${PLAYWRIGHT_VERSION}-noble AS run
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
COPY --from=build /app/public ./public
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
# O robô abre o Chromium: dê ao container --ipc=host (ou shm_size >= 1gb) se o Chromium cair
EXPOSE 3000
CMD ["node", "server.js"]
