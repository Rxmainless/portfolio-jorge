/**
 * O Reino: tema do portfólio. Homenagem inspirada em Game of Thrones:
 * casas, sedes e lemas são referências temáticas; toda arte (sigilos ASCII,
 * mapa, cidades) é original e procedural.
 *
 * Cada seção do portfólio é uma casa, e cada casa tem uma cidade que é
 * construída mecanicamente quando o scroll chega até ela.
 */
import type { CityArchetype } from './realm/types/skill'

export type SectionId = 'perfil' | 'formacao' | 'cursos' | 'habilidades' | 'projetos' | 'contato'

export interface House {
  section: SectionId
  house: string
  seat: string
  /** Lema curto (referência temática). */
  words: string
  sigil: SigilId
  /** Cor heráldica principal e metal secundário. */
  color: string
  metal: string
  /** Tecido do estandarte, quando difere da cor (ex.: preto Targaryen). */
  cloth?: string
  /** Posição da sede no continente (x, z). Norte = z negativo. */
  position: { x: number; z: number }
  archetype: CityArchetype
  complexity: number
}

export type SigilId = 'wolf' | 'tower' | 'rose' | 'lion' | 'dragon' | 'raven'

export const houses: House[] = [
  { section: 'perfil', house: 'Casa Stark', seat: 'Winterfell', words: 'O inverno está chegando', sigil: 'wolf', color: '#9fb4c2', metal: '#d9dde0', position: { x: -6, z: -56 }, archetype: 'network', complexity: 4 },
  { section: 'formacao', house: 'Casa Hightower', seat: 'Vilavelha', words: 'Nós iluminamos o caminho', sigil: 'tower', color: '#d8d2c2', metal: '#e0a04a', position: { x: -30, z: 80 }, archetype: 'beacon', complexity: 5 },
  { section: 'cursos', house: 'Casa Tyrell', seat: 'Jardim de Cima', words: 'Crescendo fortes', sigil: 'rose', color: '#7e9b58', metal: '#c9a24a', position: { x: -8, z: 46 }, archetype: 'component', complexity: 3 },
  { section: 'habilidades', house: 'Casa Lannister', seat: 'Rochedo Casterly', words: 'Ouça-me rugir', sigil: 'lion', color: '#a3312a', metal: '#d4ab52', position: { x: -30, z: 2 }, archetype: 'storage', complexity: 4 },
  { section: 'projetos', house: 'Casa Targaryen', seat: 'Pedra do Dragão', words: 'Fogo e sangue', sigil: 'dragon', color: '#c0392b', metal: '#1a1414', cloth: '#16110f', position: { x: 58, z: -14 }, archetype: 'branching', complexity: 5 },
  { section: 'contato', house: 'Patrulha da Noite', seat: 'Castelo Negro', words: 'Envie um corvo', sigil: 'raven', color: '#8a8a88', metal: '#1c1c1c', cloth: '#121212', position: { x: 2, z: -92 }, archetype: 'checkpoint', complexity: 3 },
]

/** Estradas do reino (pares de seções). Travessias marítimas viram rotas pontilhadas. */
export const roads: [SectionId, SectionId][] = [
  ['perfil', 'contato'],
  ['perfil', 'habilidades'],
  ['habilidades', 'cursos'],
  ['cursos', 'formacao'],
  ['habilidades', 'projetos'],
  ['perfil', 'projetos'],
]

/** Paleta base (moodboard). */
export const palette = [
  { name: 'Obsidiana', hex: '#0b0a09', use: 'Fundo, noite do reino' },
  { name: 'Ferro', hex: '#2b2a28', use: 'Superfícies, estruturas' },
  { name: 'Pergaminho', hex: '#d9ccae', use: 'Texto principal, mapa' },
  { name: 'Cinza de meistre', hex: '#8c8577', use: 'Texto secundário' },
  { name: 'Latão', hex: '#b08d57', use: 'Engrenagens, ornamentos, destaques' },
  { name: 'Brasa', hex: '#e0a04a', use: 'Luz, faróis, estado ativo' },
  { name: 'Sangue', hex: '#8b1e1e', use: 'Acentos dramáticos, com parcimônia' },
  { name: 'Gelo', hex: '#a9c4d4', use: 'Norte, a Muralha, foco' },
] as const
