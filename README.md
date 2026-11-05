# Namadi Vagas

Radar de vagas: buscas personalizadas salvas por usuário, um robô que consulta o Google na frequência que você escolher, e — ao favoritar uma vaga — busca no Google os perfis públicos do LinkedIn de recrutadores, lideranças e pessoas do time.

**Stack:** Next.js 16 (App Router) · Clerk (login) · PostgreSQL · robô próprio com Playwright (sem API de terceiros) · Tailwind 4.

## Como funciona

- **Buscas**: nome, palavras-chave, local, fontes (Google aberto, LinkedIn e Gupy; o Google aberto já alcança qualquer outro site com página de vaga), janela de tempo e **frequência** (30 min → semanal, ou minutos customizados).
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

## Busca na descrição da vaga
Cada grupo de palavras escolhe onde procurar: **título e descrição** (padrão) ou **só no título**. Há duas listas de exclusão: *não pode conter no título* e *excluir também se estiver na descrição*. Vagas barradas pela descrição vão para a aba **Filtradas** (com o motivo e o botão "Manter na lista"), nada é apagado. A Gupy entrega a descrição na própria lista; no LinkedIn o robô lê a página da vaga (até 20 por rodada, com pausa entre as leituras) e guarda o texto.

## Resumo por e-mail (Resend)
Defina `RESEND_API_KEY`, `MAIL_FROM` (domínio verificado no Resend) e `APP_URL`. Em cada busca: desligado, a cada rodada com vagas novas, ou resumo diário às 8h (horário de São Paulo). Há um botão de e-mail de teste no editor da busca e um link de "parar de receber" em cada e-mail.

## Compartilhar buscas
No editor da busca (dono), **Compartilhar** convida por e-mail. A pessoa vê o convite no painel (ou pelo link `/convite/...`) e só consegue aceitar entrando com o mesmo e-mail verificado. Quem aceita vê as vagas da busca; **favoritos, etapas do Kanban e "visto" são individuais** (tabela `job_user`). Só o dono edita, pausa, roda, exclui e convida. **Cada convidado também recebe por e-mail as vagas novas** da busca (a cada rodada ou resumo diário às 8h; padrão: a cada rodada), com o seu próprio controle na barra da busca e o seu link de "parar de receber". Ao entrar, só recebe vagas encontradas dali em diante. O convidado pode sair a qualquer momento. Se o Resend estiver configurado, o convite também vai por e-mail.

## Currículo com IA (`/dashboard/curriculo`)
Envie o currículo (PDF, DOCX ou TXT, até 5 MB) e a IA devolve:
- **Nota de 0 a 100** e subnotas (abrangência, estrutura, clareza, impacto, leitura por ATS), pontos fortes e palavras-chave.
- **Sugestões seção por seção** (trecho atual → versão melhor). Aceitar troca o trecho no texto guardado; dá para editar antes ou ignorar. **Reanalisar** gera nova nota a partir do texto atual. O texto pode ser editado, baixado em .txt ou impresso/salvo em PDF.
- **Em cada vaga** (detalhes da vaga): análise completa com % de compatibilidade (Top match a partir de 85), requisitos atendidos e faltantes, dicas, resumo e destaques reescritos para a vaga e **carta de apresentação**.
- **Checagem rápida** (pouco token): só a nota e até 3 palavras-chave atendidas/faltantes, com o perfil compacto do currículo (~60 palavras) e 10 vagas por chamada, em `claude-haiku-5-5` sem raciocínio e com esforço baixo. Roda **sozinha a cada vaga nova** do robô (para a dona e convidados com currículo; desligável no módulo) e na lista do módulo, que mostra todas as vagas para verificar uma, várias selecionadas ou todas as que faltam. A % aparece no cartão da vaga, e a lista do painel ordena por compatibilidade (`o=fit`) e filtra por faixa (`c=top|good|none`).

Aqui, por escolha da pessoa, **o texto do currículo fica guardado** (tabela `resumes`; o arquivo nunca). "Apagar" remove o texto, a análise e todas as comparações (`job_fit`). A IA é instruída a não inventar experiência: quando falta um dado, marca o lugar com colchetes, como [X%].

Modelos, limites e liga/desliga ficam no painel **Admin · IA** (abaixo). Saída estruturada validada; com Opus/Sonnet 5.5, fallback do servidor ativado (`fallbacks: "default"`) para o caso de recusa por política. Requer `ANTHROPIC_API_KEY`.

## Admin · IA (`/admin`)
Só para administradores: e-mails **verificados** listados em `ADMIN_EMAILS` (separados por vírgula). Para os demais a página não existe (404) e o link não aparece no menu; salvar também é conferido no servidor.
- **Chave geral** que desliga toda a IA, e por recurso (preencher busca com CV, análise de currículo, compatibilidade completa, checagem rápida, checagem automática, carta, classificação de empresas): **ligado/desligado, modelo** (Opus/Sonnet/Haiku 5.5) e **limite diário por pessoa**. Fica no `kv` (`ai:config`) e vale em até 20 s; as telas escondem o que está desligado e o servidor recusa.
- **Consumo** registrado a cada chamada (tabela `ai_usage`: chamadas, erros, tokens por dia, recurso e modelo) com custo estimado pelo preço de tabela (hoje, 7 e 30 dias). A fatura real fica no Claude Console.
- As variáveis `AI_MODEL_*` e `*_DAILY_LIMIT` continuam valendo como **padrão** enquanto nada for salvo no painel.

## Preencher a busca com o CV
No formulário da busca, **Preencher com meu currículo** (PDF, DOCX ou TXT, até 5 MB): o Claude (`claude-sonnet-5-5`, saída estruturada validada) lê o CV e sugere nome, grupos de palavras (cargos em português e inglês, senioridade), exclusões, local e até 2 variações que o CV sustente. Tudo fica editável e nada é criado até você confirmar. **O CV não é guardado**: é lido na hora e descartado. Requer `ANTHROPIC_API_KEY`; limite diário por usuário em `CV_DAILY_LIMIT` (padrão 10).

## Segurança

- **Segredos** (`CLERK_SECRET_KEY`, `DATABASE_URL`, `RESEND_API_KEY`, `ANTHROPIC_API_KEY`, `EMAIL_SECRET`, `CRON_SECRET`): no Coolify, **não** marque como "Build variable"; só os `NEXT_PUBLIC_*` precisam existir no build.
- Em produção use as chaves **Production** do Clerk e defina `EMAIL_SECRET` (aleatório, 32+ caracteres). Sem ele os links de cancelamento de e-mail falham, de propósito.
- `/api/cron` fica fechado (404) enquanto `CRON_SECRET` não existir; com ele, só responde a `Authorization: Bearer <segredo>`.
- Links de vagas e contatos só viram clicáveis se forem `http(s)`. Cabeçalhos de segurança (anti-clickjacking, nosniff, HSTS, Referrer/Permissions-Policy) vêm do `next.config.ts`.
- Limites por conta: os de IA são configurados no painel Admin · IA; 30 buscas, 20 criações/h, 20 convites/dia, 10 e-mails de teste/dia, 40 buscas de contatos/dia, leitura de CV por dia (`CV_DAILY_LIMIT`).
- O container roda como `pwuser` (não-root).

## Onboarding e guias
Na primeira visita ao painel abre um **tour de boas-vindas** (7 passos; termina com "Criar minha primeira busca" para quem ainda não tem nenhuma). Cada módulo — **editor de busca, lista de vagas, detalhes da vaga, Kanban, compartilhar e busca compartilhada comigo** — mostra um aviso "Primeira vez aqui?" até a pessoa abrir ou dispensar o guia dele. O botão **?** de cada tela reabre o guia correspondente e **Ajuda e guias** (menu lateral ou topo no celular) lista todos, com a opção de mostrar as dicas de novo. O que cada pessoa já viu fica no banco (`kv`, chave `onb:<userId>`), então vale em qualquer aparelho. O conteúdo dos guias está em `lib/onboarding.ts`.

### Níveis de acesso
Ao convidar, quem gerencia escolhe o nível (dá para mudar depois, na lista de pessoas):
- **Pode ver**: vê as vagas e recebe os e-mails; favoritas e Kanban são próprios.
- **Pode editar**: também edita a busca, roda agora, pausa/retoma e mantém vagas filtradas. O resumo por e-mail da busca continua sendo de quem a criou.
- **Pode gerenciar**: também convida, reenvia convites e muda o acesso de leitores e editores.

Só quem criou a busca pode excluí-la e mudar o acesso de quem gerencia. As permissões são conferidas no servidor (`roleFor` + `lib/roles.ts`). Convites pendentes podem ser **reenviados** por e-mail (intervalo mínimo de 10 min, conta no limite diário de convites) ou ter o link copiado.
