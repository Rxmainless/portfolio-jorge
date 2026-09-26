/**
 * Arquétipo arquitetônico: sugere, de forma abstrata, a natureza da skill.
 *   pipeline   — módulos empilhados ligados por dutos (automação)
 *   modular    — grade de blocos iguais, conexões entre vizinhos
 *   component  — unidades idênticas repetidas em anel
 *   storage    — silos e lajes empilhadas, fluxos de dados
 *   branching  — tronco com ramificações em alturas diferentes
 *   flow       — entrada → transformação → saída, em linha
 *   checkpoint — portais de validação em sequência
 *   network    — vários sistemas interconectados em malha
 *   beacon     — torre-farol alta cercada por salões baixos
 */
export type CityArchetype = 'pipeline' | 'modular' | 'component' | 'storage' | 'branching' | 'flow' | 'checkpoint' | 'network' | 'beacon';

export interface SkillCityConfig {
  id: string;
  name: string;
  category: string;
  description: string;

  position: {
    x: number;
    y: number;
    z: number;
  };

  /** 1–5: número de seções da torre, estágios de engrenagem, altura. */
  complexity: number;
  color: string;

  archetype: CityArchetype;
  /** Skills conectadas (por id) — usado pelo mapa para desenhar ligações. */
  connections?: string[];
}
