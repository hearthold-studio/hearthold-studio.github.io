// Téléphone « pro » générique modélisé en code (aucun modèle externe) : tranches plates en titane bordeaux brossé,
// dos en verre dépoli, bloc photo à 3 objectifs, îlot noir en haut de l'écran. Unité : le centimètre.
// Les couches (verre avant, écran, îlot, reflet) sont espacées de quelques centièmes pour éviter tout scintillement.
import * as THREE from 'three';

export const SIZE = { w: 7.15, h: 14.96, d: 0.83, r: 1.15 };

function rounded(w, h, r) {
  const s = new THREE.Shape(), x = -w / 2, y = -h / 2, k = .5523; // courbes de Bézier proches d'un quart de cercle
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y); s.bezierCurveTo(x + w - r + r * k, y, x + w, y + r - r * k, x + w, y + r);
  s.lineTo(x + w, y + h - r); s.bezierCurveTo(x + w, y + h - r + r * k, x + w - r + r * k, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h); s.bezierCurveTo(x + r - r * k, y + h, x, y + h - r + r * k, x, y + h - r);
  s.lineTo(x, y + r); s.bezierCurveTo(x, y + r - r * k, x + r - r * k, y, x + r, y);
  return s;
}

// forme plate dont les UV vont de 0 à 1 (pour y poser une image)
function flat(w, h, r, seg = 32) {
  const g = new THREE.ShapeGeometry(rounded(w, h, r), seg), p = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / w + .5, p.getY(i) / h + .5);
  return g;
}

// reflet du verre de l'écran : diagonale claire très douce, ajoutée par-dessus l'image
function glareTexture() {
  const c = document.createElement('canvas'); c.width = 256; c.height = 512;
  const x = c.getContext('2d'), g = x.createLinearGradient(0, 0, 256, 512);
  g.addColorStop(0, 'rgba(255,255,255,.55)'); g.addColorStop(.32, 'rgba(255,255,255,.08)');
  g.addColorStop(.33, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 256, 512);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

// ombre douce sur les bords de l'écran (centre transparent)
function edgeShadow() {
  const c = document.createElement('canvas'); c.width = 256; c.height = 512;
  const x = c.getContext('2d');
  [[0, 0, 256, 0], [0, 0, 0, 512]].forEach(([a, b, cc, d], i) => {
    const len = i ? 512 : 256, g = x.createLinearGradient(a, b, cc, d), e = 18 / len;
    g.addColorStop(0, 'rgba(0,0,0,.32)'); g.addColorStop(e, 'rgba(0,0,0,0)'); g.addColorStop(1 - e, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.32)');
    x.fillStyle = g; x.fillRect(0, 0, 256, 512);
  });
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

export function createPhone({ color = '#4c0c19', screen, mark } = {}) {
  const { w, h, d, r } = SIZE, g = new THREE.Group(), base = new THREE.Color(color);
  const bevel = .09, z = d / 2;

  const titanium = new THREE.MeshPhysicalMaterial({ color: base.clone().multiplyScalar(1.3), metalness: 1, roughness: .28, anisotropy: .8, anisotropyRotation: Math.PI / 2 });
  const backGlass = new THREE.MeshPhysicalMaterial({ color: base, metalness: 0, roughness: .55, clearcoat: .5, clearcoatRoughness: .6, envMapIntensity: .3 });
  const blackGlass = new THREE.MeshPhysicalMaterial({ color: '#010102', metalness: 0, roughness: .04, clearcoat: 1, clearcoatRoughness: 0, envMapIntensity: .5 });
  const lensRing = new THREE.MeshPhysicalMaterial({ color: base.clone().multiplyScalar(1.1), metalness: 1, roughness: .18 });
  const chrome = new THREE.MeshPhysicalMaterial({ color: '#d9c2c6', metalness: 1, roughness: .08 });
  const lensGlass = new THREE.MeshPhysicalMaterial({ color: '#010103', metalness: .5, roughness: .02, clearcoat: 1, iridescence: .3, iridescenceIOR: 1.4 });

  // coque : contour arrondi extrudé ; la face arrière est le verre dépoli, la tranche le titane
  const body = new THREE.Mesh(
    new THREE.ExtrudeGeometry(rounded(w - bevel * 2, h - bevel * 2, r - bevel), { depth: d - bevel * 2, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 8, curveSegments: 64 }),
    [backGlass, titanium]);
  body.geometry.translate(0, 0, -(d - bevel * 2) / 2);
  g.add(body);

  // face avant, du fond vers le dessus
  const front = new THREE.Mesh(flat(w - bevel * 1.6, h - bevel * 1.6, r - bevel * .8, 64), blackGlass);
  front.position.z = z + .01; g.add(front);
  const sw = w - .36, sh = h - .36;
  const screenMat = new THREE.MeshBasicMaterial({ map: screen || null, color: screen ? '#ffffff' : '#0d0d10', toneMapped: false });
  const scr = new THREE.Mesh(flat(sw, sh, r - .2, 64), screenMat);
  scr.position.z = z + .016; g.add(scr);
  const island = new THREE.Mesh(flat(2.05, .6, .3), new THREE.MeshBasicMaterial({ color: '#000' }));
  island.position.set(0, sh / 2 - .58, z + .022); g.add(island);
  const glare = new THREE.Mesh(flat(sw, sh, r - .2, 64), new THREE.MeshBasicMaterial({ map: glareTexture(), transparent: true, opacity: .05, blending: THREE.AdditiveBlending, depthWrite: false }));
  glare.position.z = z + .026; g.add(glare);
  // ombre intérieure sur les bords de l'écran : donne de la profondeur et du contraste à l'image
  const inner = new THREE.Mesh(flat(sw, sh, r - .2, 64), new THREE.MeshBasicMaterial({ map: edgeShadow(), transparent: true, depthWrite: false, toneMapped: false }));
  inner.position.z = z + .02; g.add(inner);

  // logo Moon Beam incrusté au dos : brillant sur le verre dépoli, comme un logo gravé
  if (mark) {
    const logo = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 3.4), new THREE.MeshPhysicalMaterial({ color: base.clone().multiplyScalar(1.7), metalness: .85, roughness: .16, alphaMap: mark, transparent: true, depthWrite: false }));
    logo.rotation.y = Math.PI; logo.position.set(0, -.3, -z - .006); g.add(logo);
  }

  // bloc photo en relief, en haut à gauche vu de dos
  const cam = new THREE.Group(), bw = 3.3;
  const plate = new THREE.Mesh(new THREE.ExtrudeGeometry(rounded(bw - .1, bw - .1, .8), { depth: .06, bevelEnabled: true, bevelThickness: .05, bevelSize: .05, bevelSegments: 6, curveSegments: 48 }),
    new THREE.MeshPhysicalMaterial({ color: base, metalness: 0, roughness: .35, clearcoat: .5, clearcoatRoughness: .35, envMapIntensity: .35 }));
  cam.add(plate);
  const lens = (x, y) => {
    const L = new THREE.Group();
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(.56, .58, .2, 64), lensRing); ring.rotation.x = Math.PI / 2; ring.position.z = .2;
    const edge = new THREE.Mesh(new THREE.TorusGeometry(.53, .03, 12, 64), chrome); edge.position.z = .3;
    const glass = new THREE.Mesh(new THREE.CircleGeometry(.5, 64), lensGlass); glass.position.z = .302;
    const iris = new THREE.Mesh(new THREE.CircleGeometry(.2, 48), new THREE.MeshBasicMaterial({ color: '#070b18' })); iris.position.z = .306;
    const dot = new THREE.Mesh(new THREE.CircleGeometry(.06, 16), new THREE.MeshBasicMaterial({ color: '#8090ff', transparent: true, opacity: .45 })); dot.position.set(.13, .15, .31);
    L.add(ring, edge, glass, iris, dot); L.position.set(x, y, 0); return L;
  };
  const o = .76;
  cam.add(lens(-o, o), lens(-o, -o), lens(o, 0));
  const flash = new THREE.Mesh(new THREE.CircleGeometry(.19, 32), new THREE.MeshStandardMaterial({ color: '#f5eedd', emissive: '#2a2416', roughness: .25 }));
  flash.position.set(o, o, .115); cam.add(flash);
  const lidar = new THREE.Mesh(new THREE.CircleGeometry(.15, 32), lensGlass); lidar.position.set(o, -o, .115); cam.add(lidar);
  cam.rotation.y = Math.PI;
  cam.position.set(w / 2 - bw / 2 - .28, h / 2 - bw / 2 - .28, -z + .005);
  g.add(cam);

  // boutons sur les tranches (gélules couchées dans l'épaisseur)
  const btn = (len, y, side) => {
    const m = new THREE.Mesh(new THREE.CapsuleGeometry(.11, len, 8, 16), titanium);
    m.scale.set(.55, 1, 1); m.position.set(side * (w / 2 - .01), y, 0); g.add(m);
  };
  btn(.45, 4, -1); btn(1, 2.6, -1); btn(1, 1.2, -1); btn(1.7, 2.7, 1); btn(.8, -1.5, 1);

  g.userData = { screenMat, titanium, screen: scr, z };
  return g;
}
