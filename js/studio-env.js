// Éclairage « studio photo » pour les reflets : pièce sombre avec des boîtes à lumière allongées.
// Ce sont ces bandes qui dessinent les longs reflets sur le métal et le verre (rendu produit haut de gamme).
import * as THREE from 'three';

export function studioEnvironment(renderer, { warm = '#ffb070', cool = '#9fb3ff' } = {}) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#050506');
  const box = (w, h, color, intensity, pos, look) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(intensity), side: THREE.DoubleSide }));
    m.position.set(...pos); m.lookAt(...look); scene.add(m);
  };
  const o = [0, 0, 0];
  box(3, 14, '#fff4ee', 4, [-7, 2, 6], o);      // grande bande verticale à gauche
  box(2, 14, '#ffece6', 2.5, [7, 1, 5], o);       // bande verticale à droite
  box(12, 2, '#ffffff', 3, [0, 9, 2], o);       // bande au plafond
  box(4, 8, warm, 5, [6, -5, -6], o);           // lumière chaude (feu) derrière
  box(4, 8, cool, 3, [-6, 4, -7], o);           // lumière froide (lune) derrière
  box(14, 3, '#1a1a22', 1, [0, -8, 0], o);      // sol à peine visible
  const pm = new THREE.PMREMGenerator(renderer);
  const tex = pm.fromScene(scene, .02).texture;
  pm.dispose();
  return tex;
}
