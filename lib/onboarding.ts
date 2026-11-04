// Conteúdo dos guias de onboarding (client-safe).
// "welcome" é o tour geral para quem chega; os demais explicam cada módulo na primeira visita
// e podem ser revistos a qualquer momento pelo botão "?" ou pela central de ajuda.

export type GuideId = "welcome" | "search" | "list" | "job" | "board" | "share" | "shared";

export type GuideStep = {
  icon: IconKey;
  title: string;
  body: string;
  bullets?: string[];
  /** dica específica para o celular (aparece só em telas pequenas) */
  mobile?: string;
};

export type Guide = { id: GuideId; label: string; summary: string; icon: IconKey; steps: GuideStep[] };

export type IconKey =
  | "radar" | "search" | "bot" | "star" | "users" | "kanban" | "mail" | "share" | "sparkles" | "filter"
  | "list" | "phone" | "clock" | "eye" | "copy" | "move" | "help" | "check" | "logout";

export const GUIDES: Record<GuideId, Guide> = {
  welcome: {
    id: "welcome",
    label: "Tour de boas-vindas",
    summary: "Visão geral do Namadi Vagas em 1 minuto",
    icon: "radar",
    steps: [
      {
        icon: "radar",
        title: "Bem-vindo ao seu radar de vagas",
        body: "Você diz o que procura, um robô vigia LinkedIn, Gupy e o Google por você e traz só as vagas que você ainda não viu. Em 1 minuto a gente te mostra tudo.",
      },
      {
        icon: "search",
        title: "1. Crie buscas personalizadas",
        body: "Cada busca é um radar com nome e cor próprios. Combine cargos com E/OU, escolha cidade ou remoto e de onde vêm as vagas.",
        bullets: ["Quer atalho? Envie seu currículo e a IA sugere a busca", "Exclua termos que não interessam (ex.: estágio)", "Até 30 buscas por conta"],
      },
      {
        icon: "bot",
        title: "2. O robô trabalha no seu ritmo",
        body: "De 30 minutos a uma vez por semana. A cada rodada ele grava só vagas inéditas e marca como NOVA. Quer agora? Toque em “Rodar agora”.",
        bullets: ["O selo “online” mostra que o robô está de pé", "O histórico mostra o resultado de cada rodada"],
      },
      {
        icon: "star",
        title: "3. Favoritou? Ganhou contatos",
        body: "Ao tocar na estrela, o robô procura no LinkedIn recrutadores, lideranças e pessoas do time daquela empresa, com uma mensagem pronta para você copiar.",
      },
      {
        icon: "kanban",
        title: "4. Acompanhe no Kanban",
        body: "Toda favorita entra no quadro em “A candidatar”. Mova entre as etapas até “Em processo” e nunca mais perca o fio das candidaturas.",
        mobile: "No celular, use o seletor “mover” de cada cartão em vez de arrastar.",
      },
      {
        icon: "mail",
        title: "5. Receba por e-mail e divida a busca",
        body: "Ligue o resumo a cada rodada ou diário às 8h. E compartilhe uma busca com quem também está procurando: cada pessoa tem suas favoritas e seu Kanban.",
      },
      {
        icon: "phone",
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
        title: "Atalho: preencha com seu currículo",
        body: "Envie um PDF, DOCX ou TXT (até 5 MB). A IA sugere nome, cargos em português e inglês, senioridade, exclusões e local. Tudo fica editável, e dá para desfazer.",
        bullets: ["O currículo não é guardado: é lido na hora e descartado", "Ela pode sugerir até 2 variações extras de busca"],
      },
      {
        icon: "search",
        title: "Palavras-chave em grupos",
        body: "Dentro de um grupo, escolha OU (qualquer um dos termos) ou E (todos). Entre grupos, outro E/OU. Termos com espaço viram frase exata.",
        bullets: ["Cada grupo procura no título e na descrição, ou só no título", "Ex.: (Product Designer OU UX Designer) E sênior"],
      },
      {
        icon: "filter",
        title: "Exclusões que não apagam nada",
        body: "“Não pode conter no título” descarta de cara. “Excluir também na descrição” manda a vaga para a aba Filtradas, com o motivo, e você pode mantê-la se quiser.",
      },
      {
        icon: "radar",
        title: "Onde e quando procurar",
        body: "LinkedIn e Gupy são lidos direto (rápido e sem CAPTCHA). Google aberto alcança qualquer outro site de vagas, mas é mais lento.",
        bullets: ["Janela: vagas das últimas 24 h, 7 dias, 30 dias ou qualquer data", "Frequência: 30 min até semanal, ou minutos personalizados"],
      },
      {
        icon: "mail",
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
        title: "Suas vagas, organizadas",
        body: "“Todas as vagas” junta o que todas as buscas encontraram. Escolha uma busca no menu para ver só as dela.",
        bullets: ["Novas: o que você ainda não abriu", "Favoritas: as que você marcou com ★", "Filtradas: barradas pela exclusão na descrição"],
        mobile: "No celular, as buscas ficam no menu (☰) no canto superior.",
      },
      {
        icon: "eye",
        title: "Selo NOVA e “Marcar vistas”",
        body: "Abrir uma vaga tira o selo NOVA. Se já passou o olho em tudo, “Marcar vistas” limpa a contagem da busca de uma vez.",
      },
      {
        icon: "star",
        title: "A estrela faz mais do que salvar",
        body: "Favoritar coloca a vaga no Kanban e dispara a busca de pessoas para conhecer na empresa. Toque no cartão para ver a descrição e os contatos.",
      },
      {
        icon: "bot",
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
        title: "A vaga por inteiro",
        body: "Veja empresa, local, fonte e a descrição com seus termos destacados. “Abrir vaga” leva ao anúncio original para se candidatar.",
      },
      {
        icon: "star",
        title: "Favorite para destravar pessoas",
        body: "Ao favoritar, o robô procura perfis públicos do LinkedIn ligados à empresa, separados em três grupos.",
        bullets: ["Recrutamento & People: quem abre a porta", "Liderança da área: quem decide", "Pessoas do time: quem conta como é por dentro"],
      },
      {
        icon: "copy",
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
        title: "Seu funil de candidaturas",
        body: "Cada favorita vira um cartão. São 5 etapas: A candidatar, Candidatando, Candidatura feita, Em processo e Encerradas.",
      },
      {
        icon: "move",
        title: "Mova os cartões",
        body: "No computador, arraste o cartão entre as colunas e solte na posição desejada. Em qualquer tela, o seletor do cartão também move.",
        mobile: "No celular, deslize para o lado para ver as colunas e use o seletor de cada cartão para mudar de etapa.",
      },
      {
        icon: "filter",
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
        title: "Convide por e-mail",
        body: "Digite o e-mail da pessoa. Ela vê o convite ao entrar no painel, ou pelo link que você pode copiar e mandar por onde quiser.",
        bullets: ["O convite só vale para quem entrar com aquele mesmo e-mail"],
      },
      {
        icon: "users",
        title: "O que cada um vê",
        body: "Quem aceita vê as vagas que o robô encontrar e recebe as novas por e-mail. Favoritas, Kanban e “visto” são individuais.",
      },
      {
        icon: "check",
        title: "Você continua no controle",
        body: "Só você edita, pausa, roda, exclui e convida. Para tirar o acesso de alguém, use o X ao lado do nome.",
      },
    ],
  },

  shared: {
    id: "shared",
    label: "Busca compartilhada comigo",
    summary: "O que dá para fazer numa busca de outra pessoa",
    icon: "users",
    steps: [
      {
        icon: "users",
        title: "Alguém dividiu um radar com você",
        body: "Você vê as vagas que o robô encontrar nesta busca a partir de agora. Quem cuida dela (editar, pausar, rodar) é quem compartilhou.",
      },
      {
        icon: "star",
        title: "Suas favoritas, seu Kanban",
        body: "Favorite, mova no Kanban e veja contatos à vontade: nada disso aparece para a outra pessoa.",
      },
      {
        icon: "mail",
        title: "E-mail só seu",
        body: "Escolha receber a cada rodada, um resumo diário às 8h ou desligar, no seletor de e-mail da barra da busca.",
      },
      {
        icon: "logout",
        title: "Pode sair quando quiser",
        body: "“Sair da busca” remove o acesso. Para voltar, a pessoa precisa te convidar de novo.",
      },
    ],
  },
};

export const MODULE_GUIDES: GuideId[] = ["search", "list", "job", "board", "share", "shared"];

export const isGuideId = (s: unknown): s is GuideId => typeof s === "string" && s in GUIDES;
