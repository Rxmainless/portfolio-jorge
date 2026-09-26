import * as THREE from 'three';

/** Paleta central: industrial / arquitetônica. */
export const palette = {
  background: 0x0a0a0b,
  fog: 0x0c0c0d,
  terrain: 0x1d1e20,
  terrainEdge: 0x3a3024,
  shaft: 0x121314,
  steel: 0x8e8b86,
  steelLight: 0xb4b0a8,
  darkSteel: 0x404144,
  iron: 0x26272a,
  cable: 0x1a1a1b,
  amber: 0xffb45e,
  warmWhite: 0xfff0d8,
} as const;

/**
 * Materiais compartilhados. Um único conjunto para toda a cena:
 * nenhum mesh cria material próprio, exceto os que precisam animar emissive.
 */
export const materials = {
  terrain: new THREE.MeshStandardMaterial({ color: palette.terrain, roughness: 0.94, metalness: 0.05 }),
  terrainEdge: new THREE.MeshStandardMaterial({ color: palette.terrainEdge, roughness: 0.8, metalness: 0.2 }),
  shaft: new THREE.MeshStandardMaterial({ color: palette.shaft, roughness: 0.9, metalness: 0.3 }),
  brass: new THREE.MeshStandardMaterial({ color: 0xb08d57, roughness: 0.32, metalness: 0.95 }),
  steel: new THREE.MeshStandardMaterial({ color: palette.steel, roughness: 0.36, metalness: 0.85 }),
  steelLight: new THREE.MeshStandardMaterial({ color: palette.steelLight, roughness: 0.3, metalness: 0.9 }),
  darkSteel: new THREE.MeshStandardMaterial({ color: palette.darkSteel, roughness: 0.55, metalness: 0.75 }),
  iron: new THREE.MeshStandardMaterial({ color: palette.iron, roughness: 0.7, metalness: 0.6 }),
  concrete: new THREE.MeshStandardMaterial({ color: 0x55555a, roughness: 0.85, metalness: 0.1 }),
  architecture: new THREE.MeshStandardMaterial({ color: 0x6d6e72, roughness: 0.5, metalness: 0.55 }),
  cable: new THREE.MeshStandardMaterial({ color: palette.cable, roughness: 0.45, metalness: 0.7 }),
};

/** Material emissivo animável (lâmpadas, janelas). Criado por instância de sistema. */
export function createLampMaterial(color: number = palette.amber): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: 0x2a2520,
    emissive: new THREE.Color(color),
    emissiveIntensity: 0,
    roughness: 0.4,
    metalness: 0.2,
  });
}

export function disposeMaterials(): void {
  Object.values(materials).forEach((m) => m.dispose());
}
