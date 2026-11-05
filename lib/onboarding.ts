// Conteúdo dos guias de onboarding (client-safe).
// "welcome" é o tour geral para quem chega; os demais explicam cada módulo na primeira visita
// e podem ser revistos a qualquer momento pelo botão "?" ou pela central de ajuda.

export type GuideId = "welcome" | "search" | "list" | "job" | "board" | "share" | "shared" | "resume";

export type VisualKey =
  | "radar" | "searchForm" | "robot" | "favContacts" | "kanban" | "emailShare" | "phone" | "cv" | "groups" | "exclude" | "sources"
  | "emailPreview" | "tabs" | "newBadge" | "toolbar" | "jobDetail" | "contactGroups" | "message" | "kanbanMove" | "boardFilter"
  | "invite" | "members" | "owner" | "sharedBanner" | "notifySelect" | "leave"
  | "resumeScore" | "resumeChat" | "resumeFit" | "resumeLetter" | "resumeRefine" | "fitBulk" | "segments" | "listSort" | "cvTabs";

export type GuideStep = {
  icon: IconKey;
  /** mini-tela ilustrando o passo */
  visual: VisualKey;
  title: string;
  body: string;
  bullets?: string[];
  /** dica específica para o celular (aparece só em telas pequenas) */
  mobile?: string;
};

export type Guide = {
  id: GuideId; label: string; summary: string; icon: IconKey; steps: GuideStep[];
  /** sobe quando o guia ganha novidades: quem viu a versão anterior recebe o aviso "Novidades" */
  version?: number;
  /** o que mudou na versão atual (aparece no aviso de novidades) */
  news?: string;
};

export type IconKey =
  | "radar" | "search" | "bot" | "star" | "users" | "kanban" | "mail" | "share" | "sparkles" | "filter"
  | "list" | "phone" | "clock" | "eye" | "copy" | "move" | "help" | "check" | "logout" | "file" | "building";

export const GUIDES: Record<GuideId, Guide> = {
  welcome: {
    id: "welcome",
    label: "Tour de boas-vindas",
    summary: "Visão geral do Namadi Vagas em 1 minuto",
    icon: "radar",
    steps: [
      {
        icon: "radar",
        visual: "radar",
        title: "Bem-vindo ao seu radar de vagas",
        body: "Você diz o que procura, um robô vigia LinkedIn, Gupy e o Google por você e traz só as vagas que você ainda não viu. Em 1 minuto a gente te mostra tudo.",
      },
      {
        icon: "search",
        visual: "searchForm",
        title: "1. Crie buscas personalizadas",
        body: "Cada busca é um radar com nome e cor próprios. Combine cargos com E/OU, escolha cidade ou remoto e de onde vêm as vagas.",
        bullets: ["Quer atalho? Envie seu currículo e a IA sugere a busca", "Exclua termos que não interessam (ex.: estágio)", "Até 30 buscas por conta"],
      },
      {
        icon: "bot",
        visual: "robot",
        title: "2. O robô trabalha no seu ritmo",
        body: "De 30 minutos a uma vez por semana. A cada rodada ele grava só vagas inéditas e marca como NOVA. Quer agora? Toque em “Rodar agora”.",
        bullets: ["O selo “online” mostra que o robô está de pé", "O histórico mostra o resultado de cada rodada"],
      },
      {
        icon: "star",
        visual: "favContacts",
        title: "3. Favoritou? Ganhou contatos",
        body: "Ao tocar na estrela, o robô procura no LinkedIn recrutadores, lideranças e pessoas do time daquela empresa, com uma mensagem pronta para você copiar.",
      },
      {
        icon: "kanban",
        visual: "kanban",
        title: "4. Acompanhe no Kanban",
        body: "Toda favorita entra no quadro em “A candidatar”. Mova entre as etapas até “Em processo” e nunca mais perca o fio das candidaturas.",
        mobile: "No celular, use o seletor “mover” de cada cartão em vez de arrastar.",
      },
      {
        icon: "mail",
        visual: "emailShare",
        title: "5. Receba por e-mail e divida a busca",
        body: "Ligue o resumo a cada rodada ou diário às 8h. E compartilhe uma busca com quem também está procurando: cada pessoa tem suas favoritas e seu Kanban.",
      },
      {
        icon: "file",
        visual: "resumeScore",
        title: "6. Seu currículo com IA",
        body: "Na área Currículo, envie o seu e receba uma nota de 0 a 100 e sugestões seção por seção. Depois, cada vaga mostra a % de compatibilidade e gera carta de apresentação.",
      },
      {
        icon: "phone",
        visual: "phone",
        title: "Tudo pronto!",
        body: "Cada área tem um guia rápido que aparece na primeira visita. Para rever qualquer um, use o botão “?” ou “Ajuda e guias” no menu.",
        mobile: "Dica: no navegador do celular, use “Adicionar à tela de início” para abrir o radar como um app.",
      },
    ],
  },

  search: {
    id: "search",
    label: "Criar e editar buscas",
    summary: "Palavras-chave, E/OU, exclusões, segmentos de empresa, fontes, frequência e e-mail",
    icon: "search",
    version: 2,
    news: "Agora dá para segmentar as empresas da busca: B2B ou B2C, setor e porte.",
    steps: [
      {
        icon: "sparkles",
        visual: "cv",
        title: "Atalho: preencha com seu currículo",
        body: "Envie um PDF, DOCX ou TXT (até 5 MB). A IA sugere nome, cargos em português e inglês, senioridade, exclusões e local. Tudo fica editável, e dá para desfazer.",
        bullets: ["Aqui o currículo não é guardado: é lido na hora e descartado", "Ela pode sugerir até 2 variações extras de busca"],
      },
      {
        icon: "search",
        visual: "groups",
        title: "Palavras-chave em grupos",
        body: "Dentro de um grupo, escolha OU (qualquer um dos termos) ou E (todos). Entre grupos, outro E/OU. Termos com espaço viram frase exata.",
        bullets: ["Cada grupo procura no título e na descrição, ou só no título", "Ex.: (Product Designer OU UX Designer) E sênior"],
      },
      {
        icon: "filter",
        visual: "exclude",
        title: "Exclusões que não apagam nada",
        body: "“Não pode conter no título” descarta de cara. “Excluir também na descrição” manda a vaga para a aba Filtradas, com o motivo, e você pode mantê-la se quiser.",
      },
      {
        icon: "building",
        visual: "segments",
        title: "Novo: segmente as empresas",
        body: "Em “Segmentar empresas”, escolha o modelo de negócio (B2B, B2C, B2B2C), o porte e os setores. A IA classifica cada empresa uma vez e as vagas fora do segmento vão para Filtradas, com o motivo.",
        bullets: ["Empresa que a IA não conhece continua na lista", "“Manter na lista” vale mais que o segmento", "O cartão da vaga mostra as etiquetas da empresa"],
      },
      {
        icon: "radar",
        visual: "sources",
        title: "Onde e quando procurar",
        body: "LinkedIn e Gupy são lidos direto (rápido e sem CAPTCHA). Google aberto alcança qualquer outro site de vagas, mas é mais lento.",
        bullets: ["Janela: vagas das últimas 24 h, 7 dias, 30 dias ou qualquer data", "Frequência: 30 min até semanal, ou minutos personalizados"],
      },
      {
        icon: "mail",
        visual: "emailPreview",
        title: "Resumo por e-mail e prévia",
        body: "Escolha receber a cada rodada com vaga nova ou um resumo diário às 8h. No fim do formulário, a prévia mostra exatamente o que o robô vai pesquisar.",
        bullets: ["Depois de criar, há um botão de e-mail de teste", "Ao criar, a primeira rodada começa na hora"],
      },
    ],
  },
  list: {
    id: "list",
    label: "Lista de vagas",
    summary: "Abas, vagas novas, compatibilidade, favoritas e ações da busca",
    icon: "list",
    version: 3,
    news: "Cada busca agora compara as vagas com o currículo que você escolher na barra da busca.",
    steps: [
      {
        icon: "list",
        visual: "tabs",
        title: "Suas vagas, organizadas",
        body: "“Todas as vagas” junta o que todas as buscas encontraram. Escolha uma busca no menu para ver só as dela.",
        bullets: ["Novas: o que você ainda não abriu", "Favoritas: as que você marcou com ★", "Filtradas: barradas por exclusão ou segmento, com o motivo"],
        mobile: "No celular, as buscas ficam no menu (☰) no canto superior.",
      },
      {
        icon: "star",
        visual: "listSort",
        title: "Novo: o quanto cada vaga combina com você",
        body: "Com o seu currículo na área Currículo, cada vaga ganha um anel com a % de compatibilidade. Ordene por “Mais compatíveis” ou filtre por Top match (85+), Boa ou mais (70+) ou Sem nota.",
        bullets: ["Vagas novas já chegam com a nota", "A nota usa o currículo escolhido em “Currículo” na barra da busca", "As antigas você verifica na área Currículo, uma a uma ou todas de uma vez"],
      },
      {
        icon: "eye",
        visual: "newBadge",
        title: "Selo NOVA e “Marcar vistas”",
        body: "Abrir uma vaga tira o selo NOVA. Se já passou o olho em tudo, “Marcar vistas” limpa a contagem da busca de uma vez.",
      },
      {
        icon: "star",
        visual: "favContacts",
        title: "A estrela faz mais do que salvar",
        body: "Favoritar coloca a vaga no Kanban e dispara a busca de pessoas para conhecer na empresa. Toque no cartão para ver a descrição, os contatos e a análise com o seu currículo.",
      },
      {
        icon: "bot",
        visual: "toolbar",
        title: "Comandos da busca",
        body: "Com uma busca aberta: Rodar agora, Pausar/Retomar, Editar, Compartilhar e Excluir (o que aparece depende do seu nível de acesso). Logo abaixo, o histórico mostra cada rodada do robô.",
        bullets: ["Se uma rodada falhar, o robô tenta de novo em até 30 min", "Sem nada novo? Aumente a janela de tempo"],
        mobile: "No celular, deslize a barra de comandos para o lado para ver todos.",
      },
    ],
  },
  job: {
    id: "job",
    label: "Detalhes da vaga",
    summary: "Descrição, análise com o seu currículo, carta, favoritar e contatos",
    icon: "users",
    version: 2,
    news: "Agora a vaga traz a análise completa com o seu currículo e gera carta de apresentação.",
    steps: [
      {
        icon: "eye",
        visual: "jobDetail",
        title: "A vaga por inteiro",
        body: "Veja empresa, local, fonte e a descrição com seus termos destacados. “Abrir vaga” leva ao anúncio original para se candidatar.",
      },
      {
        icon: "star",
        visual: "resumeFit",
        title: "Novo: seu currículo x esta vaga",
        body: "A nota rápida já aparece aqui. “Ver análise completa” mostra os requisitos que você atende, os que faltam, como adaptar o currículo e um resumo reescrito para esta vaga.",
        bullets: ["Mudou o currículo? “Refazer” atualiza a análise"],
      },
      {
        icon: "copy",
        visual: "resumeLetter",
        title: "Novo: carta de apresentação",
        body: "“Gerar carta” escreve uma carta curta a partir do seu currículo e dos requisitos da vaga. Copie, ajuste e envie; dá para pedir outra versão.",
      },
      {
        icon: "users",
        visual: "contactGroups",
        title: "Favorite para destravar pessoas",
        body: "Ao favoritar, o robô procura perfis públicos do LinkedIn ligados à empresa, separados em três grupos.",
        bullets: ["Recrutamento & People: quem abre a porta", "Liderança da área: quem decide", "Pessoas do time: quem conta como é por dentro"],
      },
      {
        icon: "copy",
        visual: "message",
        title: "Mensagem pronta para cada contato",
        body: "“Copiar mensagem” copia um texto curto, adaptado ao papel da pessoa e à vaga. Cole no LinkedIn, ajuste e envie.",
        bullets: ["Não achou ninguém? Use “Buscar de novo” ou a busca manual no Google"],
      },
    ],
  },
  board: {
    id: "board",
    label: "Kanban de candidaturas",
    summary: "Etapas, como mover as vagas e filtros",
    icon: "kanban",
    steps: [
      {
        icon: "kanban",
        visual: "kanban",
        title: "Seu funil de candidaturas",
        body: "Cada favorita vira um cartão. São 5 etapas: A candidatar, Candidatando, Candidatura feita, Em processo e Encerradas.",
      },
      {
        icon: "move",
        visual: "kanbanMove",
        title: "Mova os cartões",
        body: "No computador, arraste o cartão entre as colunas e solte na posição desejada. Em qualquer tela, o seletor do cartão também move.",
        mobile: "No celular, deslize para o lado para ver as colunas e use o seletor de cada cartão para mudar de etapa.",
      },
      {
        icon: "filter",
        visual: "boardFilter",
        title: "Encontre rápido",
        body: "Filtre o quadro por busca ou digite parte do cargo ou da empresa. Toque no título do cartão para abrir os detalhes e os contatos.",
        bullets: ["Etapas e favoritas são só suas, mesmo em busca compartilhada"],
      },
    ],
  },

  share: {
    id: "share",
    label: "Compartilhar uma busca",
    summary: "Convide pessoas para acompanhar o mesmo radar",
    icon: "share",
    steps: [
      {
        icon: "share",
        visual: "invite",
        title: "Convide por e-mail",
        body: "Digite o e-mail da pessoa e escolha o nível de acesso. Ela vê o convite ao entrar no painel, ou pelo link que você pode copiar e mandar por onde quiser.",
        bullets: ["O convite só vale para quem entrar com aquele mesmo e-mail", "Não chegou? Use “Reenviar” ou copie o link"],
      },
      {
        icon: "users",
        visual: "members",
        title: "O que cada um vê",
        body: "Quem aceita vê as vagas que o robô encontrar e recebe as novas por e-mail. Favoritas, Kanban e “visto” são individuais.",
      },
      {
        icon: "check",
        visual: "owner",
        title: "Níveis de acesso",
        body: "Mude o nível de cada pessoa quando quiser. Para tirar o acesso, use o X ao lado do nome. Excluir a busca é sempre só com você.",
        bullets: ["Pode ver: vagas e e-mails", "Pode editar: também edita, roda e pausa a busca", "Pode gerenciar: também convida e muda acessos"],
      },
    ],
  },

  resume: {
    id: "resume",
    label: "Currículo com IA",
    summary: "Um currículo por objetivo, nota, sugestões, refinar com a IA, compatibilidade e carta",
    icon: "file",
    version: 3,
    news: "Agora você pode ter até 5 currículos, cada um para um cargo, e escolher qual cada busca usa.",
    steps: [
      {
        icon: "file",
        visual: "resumeScore",
        title: "Uma nota para o seu currículo",
        body: "Envie PDF, DOCX ou TXT. A IA dá uma nota de 0 a 100 e mostra onde você vai bem e onde perde pontos: abrangência, estrutura, clareza, impacto e leitura por sistemas de triagem (ATS).",
        bullets: ["Diga o cargo-alvo: a nota e as sugestões passam a ser para aquele cargo", "Guardamos só o texto, nunca o arquivo; “Apagar” remove tudo"],
      },
      {
        icon: "file",
        visual: "cvTabs",
        title: "Novo: um currículo para cada objetivo",
        body: "Tenha até 5 versões, cada uma com um cargo-alvo (ex.: Growth e Product). Crie enviando outro arquivo ou toque em “Adaptar um existente”: a IA reescreve o currículo para o novo cargo, sem inventar nada.",
        bullets: ["Um deles é o principal", "Em cada busca, escolha na barra qual currículo comparar com as vagas"],
      },
      {
        icon: "sparkles",
        visual: "resumeChat",
        title: "Um especialista ao seu lado",
        body: "Cada sugestão mostra o trecho atual e uma versão melhor. Aceite, edite antes de aplicar ou ignore. Depois, “Reanalisar” mostra a nova nota.",
        bullets: ["A IA não inventa experiência: quando falta um número, ela marca [X%] para você completar"],
      },
      {
        icon: "sparkles",
        visual: "resumeRefine",
        title: "Novo: refine com a IA",
        body: "Em qualquer sugestão, toque em “Refinar com a IA” e conte o que ela não sabe: um resultado, uma correção, um contexto. Ela responde levando em conta o item inteiro e ajusta a sugestão, pronta para aceitar.",
        bullets: ["Converse quantas vezes quiser: a conversa fica guardada na sugestão"],
      },
      {
        icon: "star",
        visual: "resumeFit",
        title: "Novo: nota em cada vaga, sozinha",
        body: "Toda vaga nova que o robô encontra já ganha a % de compatibilidade com o seu currículo, e ela aparece no cartão. É uma checagem rápida, feita para gastar pouco.",
        bullets: ["Dá para desligar em “Verificar sozinho as vagas novas”"],
      },
      {
        icon: "check",
        visual: "fitBulk",
        title: "Novo: verifique várias de uma vez",
        body: "Em “Suas vagas x seu currículo”, veja todas as vagas com a nota. Verifique uma, selecione várias ou toque em “Verificar as que faltam”. Filtre por verificadas ou pendentes.",
        mobile: "No celular, a barra de seleção aparece no rodapé da tela.",
      },
      {
        icon: "copy",
        visual: "resumeLetter",
        title: "Análise completa e carta na vaga",
        body: "Abra uma vaga para a análise completa (o que falta e o currículo adaptado) e para gerar uma carta de apresentação a partir do seu currículo.",
        mobile: "“Imprimir / PDF” na área Currículo salva a versão atual do currículo como PDF.",
      },
    ],
  },
  shared: {
    id: "shared",
    label: "Busca compartilhada comigo",
    summary: "Seu nível de acesso e o que dá para fazer",
    icon: "users",
    steps: [
      {
        icon: "users",
        visual: "sharedBanner",
        title: "Alguém dividiu um radar com você",
        body: "Você vê as vagas que o robô encontrar nesta busca. O que mais dá para fazer depende do seu nível, que aparece na barra da busca: pode ver, pode editar ou pode gerenciar.",
        bullets: ["Pode editar: muda palavras-chave, roda e pausa", "Pode gerenciar: também convida pessoas", "Excluir a busca é só com quem criou"],
      },
      {
        icon: "star",
        visual: "members",
        title: "Suas favoritas, seu Kanban",
        body: "Favorite, mova no Kanban e veja contatos à vontade: nada disso aparece para a outra pessoa.",
      },
      {
        icon: "mail",
        visual: "notifySelect",
        title: "E-mail só seu",
        body: "Escolha receber a cada rodada, um resumo diário às 8h ou desligar, no seletor de e-mail da barra da busca.",
      },
      {
        icon: "logout",
        visual: "leave",
        title: "Pode sair quando quiser",
        body: "“Sair da busca” remove o acesso. Para voltar, a pessoa precisa te convidar de novo.",
      },
    ],
  },
};

export const MODULE_GUIDES: GuideId[] = ["search", "list", "job", "board", "resume", "share", "shared"];

export const isGuideId = (s: unknown): s is GuideId => typeof s === "string" && s in GUIDES;

/** Chave guardada como "visto": o id na versão 1 e "id@versão" depois (assim a versão nova volta a aparecer). */
export const seenKey = (id: GuideId) => ((GUIDES[id].version ?? 1) > 1 ? `${id}@${GUIDES[id].version}` : id);

/** new = nunca viu; updated = viu uma versão anterior; seen = em dia. */
export function guideState(seen: Set<string>, id: GuideId): "new" | "updated" | "seen" {
  if (seen.has(seenKey(id))) return "seen";
  if (seen.has(id) || [...seen].some((k) => k.startsWith(`${id}@`))) return "updated";
  return "new";
}

/** Valida o que o navegador manda marcar como visto: só a chave da versão atual de um guia existente. */
export const isSeenKey = (s: unknown): s is string => typeof s === "string" && (Object.keys(GUIDES) as GuideId[]).some((id) => seenKey(id) === s);
