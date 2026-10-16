# Namadi Vagas

Radar de vagas: buscas personalizadas salvas por usuário, um robô que consulta o Google na frequência que você escolher, e — ao favoritar uma vaga — busca no Google os perfis públicos do LinkedIn de recrutadores, lideranças e pessoas do time.

**Stack:** Next.js 16 (App Router) · Clerk (login) · PostgreSQL · robô próprio com Playwright (sem API de terceiros) · Tailwind 4.

## Como funciona

- **Buscas**: nome, palavras-chave, local, fontes (Google aberto, LinkedIn, Gupy, Greenhouse, Lever…), janela de tempo e **frequência** (30 min → semanal, ou minutos customizados).
- **Robô**: `instrumentation.ts` sobe um agendador interno (tick de 1 min) que roda as buscas vencidas. Deduplica por URL e só grava vagas novas. Também há `GET /api/cron` (com `Authorization: Bearer $CRON_SECRET`) para disparo externo.
- **Confiabilidade**: a trava de cada busca fica no banco (atômica, expira em 15 min se o processo morrer), então duas réplicas não duplicam rodadas. Se uma busca falha, tenta de novo em até 30 min. O agendador grava um sinal de vida a cada minuto; o painel mostra "Robô online/parado" e o histórico das últimas rodadas de cada busca.
- **Favoritou → contatos**: `lib/contacts.ts` faz 3 consultas `site:linkedin.com/in "<empresa>" …` (recrutadores, lideranças, time), filtra homônimos pela empresa, classifica e salva. A UI mostra cada pessoa com link e mensagem sugerida.
- **Robô próprio** (`lib/serp.ts`): abre o Google num Chromium headless (Playwright), lê os resultados e resolve os links `/goto` para a URL real. Se o Google pedir CAPTCHA, ele entra em pausa por 30 min e o robô cai para DuckDuckGo e depois Bing (`SEARCH_ENGINES`).
- `DEMO_MODE=1` mostra dados fictícios (sinalizado na UI).

> **Limites reais de scraping do Google:** o Google dificulta automação e os termos de uso não permitem. De IP residencial costuma passar com poucas consultas; de IP de VPS/datacenter o CAPTCHA é bem mais frequente. O robô espaça as consultas (1,5–3,5 s) e roda uma por vez para reduzir isso, mas não há garantia. Mantenha frequências moderadas (≥ 1–3 h). Se o bloqueio for constante na VPS, a saída é um proxy residencial (não incluído).

## Rodando localmente

```bash
cp .env.example .env.local   # preencha Clerk e DATABASE_URL
npm install
npx playwright-core install chromium   # ou defina PLAYWRIGHT_CHANNEL=chrome para usar o Chrome instalado
npm run dev
```

Precisa de um Postgres acessível em `DATABASE_URL`. As tabelas são criadas automaticamente no primeiro acesso.

## Deploy na VPS (Hostinger) com Coolify

1. **Postgres**: no Coolify, *New Resource → Database → PostgreSQL*. Copie a **Postgres URL (internal)**.
2. **App**: *New Resource → Public/Private Repository* (este repositório), **Build Pack: Dockerfile**, porta **3000**. O Dockerfile usa a imagem do Playwright (traz o Chromium); em *Advanced*, ative **Custom Docker Options** `--ipc=host` para o Chromium não cair por falta de memória compartilhada.
3. **Variáveis de ambiente** (aba *Environment Variables*):
   - `DATABASE_URL` = URL interna do Postgres
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` — marque **"Build Variable"** (é lida no build)
   - `CLERK_SECRET_KEY`
   - `NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in`, `NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up`
   - `NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/dashboard`, `NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/dashboard`
4. **Domínio**: aponte o DNS para a VPS e configure o domínio no app (o Coolify emite o HTTPS). No Clerk, use as chaves de **produção** e adicione o domínio.
5. **Deploy**. Como o container fica sempre ligado, o agendador interno já cuida do robô — não precisa de cron externo. Pode manter 1 réplica (recomendado: o Chromium consome memória); com mais, a trava no banco evita rodadas duplicadas.
