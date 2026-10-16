# Namadi Vagas

Radar de vagas: buscas personalizadas salvas por usuário, um robô que consulta o Google na frequência que você escolher, e — ao favoritar uma vaga — busca no Google os perfis públicos do LinkedIn de recrutadores, lideranças e pessoas do time.

**Stack:** Next.js 16 (App Router) · Clerk (login) · PostgreSQL · Serper.dev (API de Google Search) · Tailwind 4.

## Como funciona

- **Buscas**: nome, palavras-chave, local, fontes (Google aberto, LinkedIn, Gupy, Greenhouse, Lever…), janela de tempo e **frequência** (30 min → semanal, ou minutos customizados).
- **Robô**: `instrumentation.ts` sobe um agendador interno (tick de 1 min) que roda as buscas vencidas. Deduplica por URL e só grava vagas novas. Também há `GET /api/cron` (com `Authorization: Bearer $CRON_SECRET`) para disparo externo.
- **Favoritou → contatos**: `lib/contacts.ts` faz 3 consultas `site:linkedin.com/in "<empresa>" …` (recrutadores, lideranças, time), filtra homônimos pela empresa, classifica e salva. A UI mostra cada pessoa com link e mensagem sugerida.
- Sem `SERPER_API_KEY` o app roda em **modo demo** (dados fictícios, sinalizado na UI).

> Por que Serper e não raspar o Google direto? O Google bloqueia scraping de HTML e proíbe nos termos de uso; uma API de SERP é o caminho estável. Plano grátis: 2.500 consultas. Cada rodada de busca usa 2 consultas; cada favorito, 3.

## Rodando localmente

```bash
cp .env.example .env.local   # preencha Clerk, DATABASE_URL e SERPER_API_KEY
npm install
npm run dev
```

Precisa de um Postgres acessível em `DATABASE_URL`. As tabelas são criadas automaticamente no primeiro acesso.

## Deploy na VPS (Hostinger) com Coolify

1. **Postgres**: no Coolify, *New Resource → Database → PostgreSQL*. Copie a **Postgres URL (internal)**.
2. **App**: *New Resource → Public/Private Repository* (este repositório), **Build Pack: Dockerfile**, porta **3000**.
3. **Variáveis de ambiente** (aba *Environment Variables*):
   - `DATABASE_URL` = URL interna do Postgres
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` — marque **"Build Variable"** (é lida no build)
   - `CLERK_SECRET_KEY`
   - `NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in`, `NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up`
   - `NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/dashboard`, `NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/dashboard`
   - `SERPER_API_KEY`
4. **Domínio**: aponte o DNS para a VPS e configure o domínio no app (o Coolify emite o HTTPS). No Clerk, use as chaves de **produção** e adicione o domínio.
5. **Deploy**. Como o container fica sempre ligado, o agendador interno já cuida do robô — não precisa de cron externo. Mantenha **1 réplica** (com várias, as buscas rodariam em duplicidade).
