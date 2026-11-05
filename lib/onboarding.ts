// Conteúdo dos guias de onboarding (client-safe).
// "welcome" é o tour geral para quem chega; os demais explicam cada módulo na primeira visita
// e podem ser revistos a qualquer momento pelo botão "?" ou pela central de ajuda.

export type GuideId = "welcome" | "search" | "list" | "job" | "board" | "share" | "shared" | "resume";

export type VisualKey =
  | "radar" | "searchForm" | "robot" | "favContacts" | "kanban" | "emailShare" | "phone" | "cv" | "groups" | "exclude" | "sources"
  | "emailPreview" | "tabs" | "newBadge" | "toolbar" | "jobDetail" | "contactGroups" | "message" | "kanbanMove" | "boardFilter"
  | "invite" | "members" | "owner" | "sharedBanner" | "notifySelect" | "leave"
  | "resumeScore" | "resumeChat" | "resumeFit" | "resumeLetter";

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

export type Guide = { id: GuideId; label: string; summary: string; icon: IconKey; steps: GuideStep[] };

export type IconKey =
  | "radar" | "search" | "bot" | "star" | "users" | "kanban" | "mail" | "share" | "sparkles" | "filter"
  | "list" | "phone" | "clock" | "eye" | "copy" | "move" | "help" | "check" | "logout" | "file";

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
    summary: "Palavras-chave, E/OU, exclusões, fontes, frequência e e-mail",
    icon: "search",
    steps: [
      {
        icon: "sparkles",
        visual: "cv",
        title: "Atalho: preencha com seu currículo",
        body: "Envie um PDF, DOCX ou TXT (até 5 MB). A IA sugere nome, cargos em português e inglês, senioridade, exclusões e local. Tudo fica editável, e dá para desfazer.",
        bullets: ["O currículo não é guardado: é lido na hora e descartado", "Ela pode sugerir até 2 variações extras de busca"],
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
    summary: "Abas, vagas novas, favoritas e ações da busca",
    icon: "list",
    steps: [
      {
        icon: "list",
        visual: "tabs",
        title: "Suas vagas, organizadas",
        body: "“Todas as vagas” junta o que todas as buscas encontraram. Escolha uma busca no menu para ver só as dela.",
        bullets: ["Novas: o que você ainda não abriu", "Favoritas: as que você marcou com ★", "Filtradas: barradas pela exclusão na descrição"],
        mobile: "No celular, as buscas ficam no menu (☰) no canto superior.",
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
        body: "Favoritar coloca a vaga no Kanban e dispara a busca de pessoas para conhecer na empresa. Toque no cartão para ver a descrição e os contatos.",
      },
      {
        icon: "bot",
        visual: "toolbar",
        title: "Comandos da busca",
        body: "Com uma busca aberta: Rodar agora, Pausar/Retomar, Editar, Compartilhar e Excluir. Logo abaixo, o histórico mostra cada rodada do robô.",
        bullets: ["Se uma rodada falhar, o robô tenta de novo em até 30 min", "Sem nada novo? Aumente a janela de tempo"],
        mobile: "No celular, deslize a barra de comandos para o lado para ver todos.",
      },
    ],
  },

  job: {
    id: "job",
    label: "Detalhes da vaga e pessoas",
    summary: "Descrição, favoritar e contatos com mensagem pronta",
    icon: "users",
    steps: [
      {
        icon: "eye",
        visual: "jobDetail",
        title: "A vaga por inteiro",
        body: "Veja empresa, local, fonte e a descrição com seus termos destacados. “Abrir vaga” leva ao anúncio original para se candidatar.",
      },
      {
        icon: "star",
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
    summary: "Nota, sugestões, compatibilidade com vagas e carta",
    icon: "file",
    steps: [
      {
        icon: "file",
        visual: "resumeScore",
        title: "Uma nota para o seu currículo",
        body: "Envie PDF, DOCX ou TXT. A IA dá uma nota de 0 a 100 e mostra onde você vai bem e onde perde pontos: abrangência, estrutura, clareza, impacto e leitura por ATS.",
        bullets: ["Guardamos só o texto, nunca o arquivo", "“Apagar” remove o currículo e todas as análises"],
      },
      {
        icon: "sparkles",
        visual: "resumeChat",
        title: "Um especialista ao seu lado",
        body: "Cada sugestão mostra o trecho atual e uma versão melhor. Aceite, edite antes de aplicar ou ignore. Depois, “Reanalisar” mostra a nova nota.",
        bullets: ["A IA não inventa experiência: quando falta um número, ela marca [X%] para você completar"],
      },
      {
        icon: "star",
        visual: "resumeFit",
        title: "Compatibilidade com cada vaga",
        body: "Abra uma vaga e toque em “Ver compatibilidade”: a % de match, os requisitos que você atende, os que faltam e um resumo do currículo reescrito para aquela vaga.",
        bullets: ["A % aparece também no cartão da vaga", "As mais compatíveis ficam listadas na área Currículo"],
      },
      {
        icon: "copy",
        visual: "resumeLetter",
        title: "Carta de apresentação pronta",
        body: "Na mesma vaga, “Gerar carta” escreve uma carta curta a partir do seu currículo e dos requisitos. Copie, ajuste e envie.",
        mobile: "No celular, “Imprimir / PDF” na área Currículo salva a versão atual como PDF.",
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
