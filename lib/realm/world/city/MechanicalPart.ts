import * as THREE from 'three';

/**
 * Peça móvel da construção. Toda peça tem posição inicial (escondida /
 * recolhida) e posição final (montada). A animação move de uma para a outra
 * e nunca usa fade ou escala.
 */
export interface MechanicalPart {
  id: string;
  object: THREE.Object3D;
  initialPosition: THREE.Vector3;
  finalPosition: THREE.Vector3;
}

export function part(id: string, object: THREE.Object3D, initial: THREE.Vector3Like, final: THREE.Vector3Like): MechanicalPart {
  const p: MechanicalPart = {
    id,
    object,
    initialPosition: new THREE.Vector3(initial.x, initial.y, initial.z),
    finalPosition: new THREE.Vector3(final.x, final.y, final.z),
  };
  object.position.copy(p.initialPosition);
  return p;
}

export function resetParts(parts: Iterable<MechanicalPart>): void {
  for (const p of parts) p.object.position.copy(p.initialPosition);
}
