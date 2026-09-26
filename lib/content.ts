/**
 * Conteúdo do portfólio. REGRA: só fatos verificáveis.
 * Fontes: textos do projeto original (perfil, formação), README do perfil e
 * repositórios públicos de github.com/Rxmainless, e os READMEs /
 * package.json dos projetos em D:\Projects (stacks, descrições, links).
 * O que ainda não foi informado aparece como "a forjar" — nunca inventado.
 */
export type Locale = 'pt-BR' | 'en'

export interface Project {
  id: string
  name: string
  kind: string
  summary: string
  stack: string[]
  links: { label: string; url: string }[]
  status: string
}

export interface SkillItem {
  name: string
  /** Projetos onde a tecnologia aparece de fato (README / package.json / repositório). */
  evidence: string[]
  /** Listada no README do perfil do GitHub. */
  declared?: boolean
  /** Foco declarado no GitHub: "Especializando-me em Backend com foco em Python, SQL, APIs e Automação". */
  focus?: boolean
}

export interface SkillGroup {
  title: string
  items: SkillItem[]
}

// Fontes: README do perfil github.com/Rxmainless (tecnologias e foco) + repositórios
const skillGroups = (l: Locale): SkillGroup[] => [
  {
    title: l === 'pt-BR' ? 'Backend · foco' : 'Backend · focus',
    items: [
      { name: 'Python', evidence: ['Dash Digital', 'RadarPME'], declared: true, focus: true },
      { name: 'SQL', evidence: ['ONDA Feedback', 'RadarPME'], declared: true, focus: true },
      { name: 'APIs REST', evidence: ['Desafio Itaú'], focus: true },
      { name: 'Java 17', evidence: ['Desafio Itaú'], declared: true },
      { name: 'Spring Boot 3', evidence: ['Desafio Itaú'] },
      { name: 'Flask', evidence: [], declared: true },
      { name: 'Django', evidence: [], declared: true },
      { name: 'Swagger / OpenAPI', evidence: ['Desafio Itaú'] },
      { name: 'JUnit 5 · Maven', evidence: ['Desafio Itaú'] },
    ],
  },
  {
    title: l === 'pt-BR' ? 'Dados e automação' : 'Data & automation',
    items: [
      { name: l === 'pt-BR' ? 'Automação de processos' : 'Process automation', evidence: ['RadarPME', 'Dash Digital'], focus: true },
      { name: 'Pandas', evidence: ['Dash Digital'], declared: true },
      { name: 'PostgreSQL', evidence: [], declared: true },
      { name: 'DuckDB', evidence: ['RadarPME'] },
      { name: 'Streamlit', evidence: ['RadarPME'] },
      { name: 'Drizzle ORM · Zod', evidence: ['ONDA Feedback'] },
    ],
  },
  {
    title: 'Frontend',
    items: [
      { name: 'TypeScript', evidence: ['Lumen', 'ONDA Feedback', 'Dash Digital', 'Spotify UX', 'Skill Map 3D'] },
      { name: 'React 19', evidence: ['Lumen', 'Dash Digital', 'Skill Map 3D'] },
      { name: 'Next.js', evidence: ['ONDA Feedback'] },
      { name: 'Vite', evidence: ['Lumen', 'Dash Digital', 'Spotify UX', 'Skill Map 3D'] },
      { name: 'Tailwind CSS', evidence: ['Lumen'] },
      { name: 'Zustand · Framer Motion', evidence: ['Lumen'] },
      { name: 'Recharts', evidence: ['Dash Digital'] },
      { name: 'Three.js · GSAP', evidence: ['Skill Map 3D'] },
    ],
  },
  {
    title: l === 'pt-BR' ? 'Infra, qualidade e entrega' : 'Infra, quality & delivery',
    items: [
      { name: 'Git / GitHub', evidence: ['Dash Digital', 'Lumen', 'Skill Map 3D'], declared: true },
      { name: 'GitHub Actions', evidence: ['Lumen', 'Dash Digital'] },
      { name: 'Docker', evidence: [], declared: true },
      { name: 'AWS', evidence: [], declared: true },
      { name: 'Linux', evidence: [], declared: true },
      { name: 'Cloudflare Pages · D1 · KV', evidence: ['Dash Digital', 'ONDA Feedback'] },
      { name: 'Vitest · pytest', evidence: ['Lumen', 'Dash Digital'] },
    ],
  },
]

const projects = (l: Locale): Project[] => {
  const pt = l === 'pt-BR'
  return [
    {
      id: 'desafio-itau',
      name: 'Desafio Itaú — API de Transações',
      kind: pt ? 'Backend · API REST' : 'Backend · REST API',
      summary: pt
        ? 'API REST em Java/Spring Boot para o desafio técnico do Itaú Unibanco: registra transações e calcula em tempo real as estatísticas dos últimos 60 segundos, com validação, respostas HTTP corretas, Swagger e healthcheck.'
        : "REST API in Java/Spring Boot for Itaú Unibanco's technical challenge: records transactions and computes real-time statistics for the last 60 seconds, with validation, correct HTTP responses, Swagger and health checks.",
      stack: ['Java 17', 'Spring Boot 3', 'Maven', 'Spring Validation', 'Swagger / OpenAPI', 'Actuator', 'JUnit 5'],
      links: [{ label: 'GitHub', url: 'https://github.com/Rxmainless/desafio-itau-backend' }],
      status: pt ? 'Desafio técnico' : 'Technical challenge',
    },
    {
      id: 'dash-digital',
      name: 'Dash Digital',
      kind: pt ? 'Dados · ETL · Dashboard' : 'Data · ETL · Dashboard',
      summary: pt
        ? 'Cruza os números oficiais do Porto Digital com dados abertos da Prefeitura do Recife e o diretório público de startups embarcadas, para medir o tamanho real do ecossistema de tecnologia da cidade.'
        : "Cross-references Porto Digital's official figures with Recife's open data and the public startup directory to measure the real size of the city's tech ecosystem.",
      stack: ['Python', 'Pandas', 'pytest', 'React', 'TypeScript', 'Vite', 'Recharts', 'GitHub Actions', 'Cloudflare Pages'],
      links: [
        { label: pt ? 'Ver ao vivo' : 'Live', url: 'https://dash-digital.pages.dev/' },
        { label: 'GitHub', url: 'https://github.com/Rxmainless/Dash-Digital' },
      ],
      status: pt ? 'Publicado' : 'Live',
    },
    {
      id: 'lumen',
      name: 'Lumen — Algorithm Lab',
      kind: pt ? 'Educação · Visualização' : 'Education · Visualization',
      summary: pt
        ? 'Laboratório interativo que visualiza o que o computador faz durante a execução: 6 algoritmos de ordenação, narrativa passo a passo, pilha de chamadas real, métricas ao vivo e som por ação.'
        : 'Interactive lab that shows what the computer is doing during execution: 6 sorting algorithms, step-by-step narrative, real call stack, live metrics and per-action sound.',
      stack: ['React 19', 'TypeScript', 'Vite', 'Tailwind CSS', 'Zustand', 'Framer Motion', 'Vitest', 'GitHub Actions'],
      links: [{ label: 'GitHub', url: 'https://github.com/Rxmainless/Lumen-Algorithm-Lab' }],
      status: pt ? 'Código no GitHub' : 'Code on GitHub',
    },
    {
      id: 'onda',
      name: 'ONDA Feedback',
      kind: pt ? 'Web · Segurança · Privacidade' : 'Web · Security · Privacy',
      summary: pt
        ? 'Correio de feedbacks estudantis 100% anônimo, com painel administrativo para a representação responder e gerenciar — login com Argon2id + JWT, rate limiting e exportação CSV/JSON.'
        : 'Fully anonymous student feedback inbox with an admin panel to reply and manage — Argon2id + JWT login, rate limiting and CSV/JSON export.',
      stack: ['Next.js', 'TypeScript', 'Drizzle ORM', 'Zod', 'Cloudflare D1', 'Cloudflare KV'],
      links: [],
      status: '',
    },
    {
      id: 'radarpme',
      name: 'RadarPME',
      kind: pt ? 'Dados · Automação' : 'Data · Automation',
      summary: pt
        ? 'Identifica, enriquece e classifica PMEs brasileiras com sinais objetivos de presença digital deficiente, a partir dos dados públicos do CNPJ — gera uma fila de ação priorizada. Local e com custo operacional zero.'
        : 'Finds, enriches and ranks Brazilian SMBs with objective signs of weak digital presence from public CNPJ data — producing a prioritized action queue. Local, zero operating cost.',
      stack: ['Python', 'DuckDB', 'Streamlit', 'Playwright'],
      links: [],
      status: '',
    },
    {
      id: 'spotify-ux',
      name: 'Spotify UX',
      kind: pt ? 'UX/UI · Análise' : 'UX/UI · Analysis',
      summary: pt ? 'Análise interativa de UX/UI do Spotify.' : 'Interactive UX/UI analysis of Spotify.',
      stack: ['TypeScript', 'Vite'],
      links: [{ label: 'GitHub', url: 'https://github.com/Rxmainless/spotify-ux-analise' }],
      status: '',
    },
    {
      id: 'skill-map',
      name: 'Skill Map 3D',
      kind: pt ? '3D · Animação mecânica' : '3D · Mechanical animation',
      summary: pt
        ? 'Mapa 3D em que cada habilidade é uma cidade erguida por engrenagens, cabos e plataformas — a mesma máquina que constrói as torres deste portfólio.'
        : 'A 3D map where each skill is a city raised by gears, cables and platforms — the same machine that builds the towers of this portfolio.',
      stack: ['Three.js', 'GSAP', 'React', 'TypeScript', 'Vite'],
      links: [],
      status: pt ? 'Repositório privado' : 'Private repository',
    },
  ]
}

export const copy = {
  'pt-BR': {
    metaTitle: 'Jorge Mesquita | O Reino dos Sistemas',
    nav: { capa: 'Capa', perfil: 'Perfil', formacao: 'Formação', cursos: 'Cursos', habilidades: 'Habilidades', projetos: 'Projetos', contato: 'Contato' },
    loading: 'Forjando o reino',
    cover: {
      eyebrow: 'Portfólio · Análise e Desenvolvimento de Sistemas',
      title: 'Jorge Mesquita',
      subtitle: 'O Reino dos Sistemas',
      lead: 'Cada parte da minha trajetória é uma cidade. Role a página e veja a máquina erguê-las, uma a uma.',
      cue: 'Role para começar a jornada',
      location: 'Recife · PE',
    },
    stage: 'Construção',
    perfil: {
      title: 'Perfil',
      lead: 'Sou Jorge Mesquita, estudante de Análise e Desenvolvimento de Sistemas e desenvolvedor interessado na interseção entre código, dados, design e automação.',
      body: 'Ainda estou no começo, mas nunca estive parado. Minha formação é o ponto de partida para construir coisas úteis, bonitas e bem pensadas.',
      facts: [['Base', 'Recife · PE'], ['Foco', 'Backend · Python · SQL · APIs · Automação'], ['Idiomas', 'Inglês fluente'], ['Busca', 'Estágio ou primeira vaga júnior em Backend']],
    },
    formacao: {
      title: 'Formação',
      degree: 'Análise e Desenvolvimento de Sistemas',
      level: 'Graduação · em curso',
      pending: 'Instituição e período: a forjar',
      note: 'Na Cidadela, cada meistre forja sua corrente elo a elo. A formação é o primeiro elo.',
    },
    cursos: {
      title: 'Cursos',
      lead: 'Cada curso concluído vira um elo da corrente de meistre.',
      // Informados por Jorge. Detalhes (idioma, linguagens, nome exato do curso Cisco) a completar.
      items: [
        { name: 'Cibersegurança', provider: 'Cisco', metal: 'aço' },
        { name: 'Idiomas', provider: 'Curso de idioma', metal: 'prata' },
        { name: 'Linguagens de programação', provider: 'Cursos de linguagens', metal: 'ferro' },
      ],
      metalLabel: 'elo de',
      empty: 'Próximo elo',
    },
    habilidades: {
      title: 'Habilidades',
      lead: 'Plataformas, linguagens e ferramentas que usei em projetos reais. Cada uma aponta onde foi usada.',
      used: 'usado em',
      declared: 'perfil GitHub',
      legend: '◆ foco declarado · nomes = projetos onde usei · perfil GitHub = listada no perfil, ainda sem repositório público',
    },
    projetos: {
      title: 'Projetos',
      lead: 'O que já foi forjado de fato.',
      stack: 'Stack',
    },
    contato: {
      title: 'Contato',
      lead: 'Envie um corvo. Respondo por aqui:',
      github: 'GitHub',
      linkedin: 'LinkedIn',
      email: 'E-mail profissional: a definir',
    },
    epilogue: { title: 'O reino está de pé', body: 'Seis casas, uma máquina. As habilidades não são uma lista: elas formam um sistema.', top: 'Voltar à capa', footer: 'Jorge Mesquita © 2026 · Homenagem inspirada em Game of Thrones — arte e código originais.' },
    moodboard: 'Moodboard',
    language: 'Idioma',
    menu: 'Abrir menu',
    close: 'Fechar menu',
    canvasAlt: 'Mapa 3D de um continente onde engrenagens de latão erguem uma cidade para cada seção do portfólio.',
    skillGroups: skillGroups('pt-BR'),
    projects: projects('pt-BR'),
  },
  en: {
    metaTitle: 'Jorge Mesquita | The Realm of Systems',
    nav: { capa: 'Cover', perfil: 'Profile', formacao: 'Education', cursos: 'Courses', habilidades: 'Skills', projetos: 'Projects', contato: 'Contact' },
    loading: 'Forging the realm',
    cover: {
      eyebrow: 'Portfolio · Analysis and Systems Development',
      title: 'Jorge Mesquita',
      subtitle: 'The Realm of Systems',
      lead: 'Every part of my path is a city. Scroll and watch the machine raise them, one by one.',
      cue: 'Scroll to begin the journey',
      location: 'Recife · Brazil',
    },
    stage: 'Construction',
    perfil: {
      title: 'Profile',
      lead: 'I am Jorge Mesquita, an Analysis and Systems Development student interested in the intersection of code, data, design and automation.',
      body: 'I am still at the beginning, but never standing still. My degree is the starting point for building things that are useful, beautiful and well-considered.',
      facts: [['Based in', 'Recife · Brazil'], ['Focus', 'Backend · Python · SQL · APIs · Automation'], ['Languages', 'Fluent English'], ['Seeking', 'Internship or first junior Backend role']],
    },
    formacao: {
      title: 'Education',
      degree: 'Analysis and Systems Development',
      level: 'Degree · in progress',
      pending: 'Institution and dates: to be forged',
      note: "At the Citadel, every maester forges a chain link by link. The degree is the first link.",
    },
    cursos: {
      title: 'Courses',
      lead: "Every finished course becomes a link in the maester's chain.",
      items: [
        { name: 'Cybersecurity', provider: 'Cisco', metal: 'steel' },
        { name: 'Languages', provider: 'Language course', metal: 'silver' },
        { name: 'Programming languages', provider: 'Programming courses', metal: 'iron' },
      ],
      metalLabel: 'link of',
      empty: 'Next link',
    },
    habilidades: {
      title: 'Skills',
      lead: 'Platforms, languages and tools I have used in real projects. Each one points to where it was used.',
      used: 'used in',
      declared: 'GitHub profile',
      legend: '◆ declared focus · names = projects where I used it · GitHub profile = listed on my profile, no public repo yet',
    },
    projetos: { title: 'Projects', lead: 'What has actually been forged.', stack: 'Stack' },
    contato: { title: 'Contact', lead: 'Send a raven. Reach me here:', github: 'GitHub', linkedin: 'LinkedIn', email: 'Professional e-mail: to be defined' },
    epilogue: { title: 'The realm stands', body: 'Six houses, one machine. Skills are not a list: they form a system.', top: 'Back to cover', footer: 'Jorge Mesquita © 2026 · Tribute inspired by Game of Thrones — original art and code.' },
    moodboard: 'Moodboard',
    language: 'Language',
    menu: 'Open menu',
    close: 'Close menu',
    canvasAlt: '3D map of a continent where brass gears raise one city for each portfolio section.',
    skillGroups: skillGroups('en'),
    projects: projects('en'),
  },
}

export type Copy = (typeof copy)['pt-BR']
export const getCopy = (l: Locale): Copy => copy[l] as Copy
export const GITHUB = 'https://github.com/Rxmainless'
export const LINKEDIN = 'https://www.linkedin.com/in/mesquitaforall'
