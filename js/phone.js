// Téléphone « pro » générique modélisé en code (aucun modèle externe) : bords plats en titane bordeaux,
// dos en verre dépoli, bloc photo à 3 objectifs, îlot noir en haut de l'écran. Unité : le centimètre.
import * as THREE from 'three';

export const SIZE = { w: 7.15, h: 14.96, d: 0.83, r: 1.1 };

function rounded(w, h, r) {
  const s = new THREE.Shape(), x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

// forme plate dont les UV vont de 0 à 1 (pour y poser une image)
function flat(w, h, r, seg = 24) {
  const g = new THREE.ShapeGeometry(rounded(w, h, r), seg), p = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / w + .5, p.getY(i) / h + .5);
  return g;
}

export function createPhone({ color = '#4c0c19', screen } = {}) {
  const { w, h, d, r } = SIZE, g = new THREE.Group();
  const bevel = .07;

  const titanium = new THREE.MeshPhysicalMaterial({ color: new THREE.Color(color).multiplyScalar(1.25), metalness: 1, roughness: .34, anisotropy: .7, anisotropyRotation: Math.PI / 2, clearcoat: .3, clearcoatRoughness: .25, envMapIntensity: .8 });
  const ringMetal = new THREE.MeshPhysicalMaterial({ color: new THREE.Color(color).multiplyScalar(.9), metalness: 1, roughness: .22, envMapIntensity: .6 });
  const backGlass = new THREE.MeshPhysicalMaterial({ color, metalness: .05, roughness: .42, clearcoat: .7, clearcoatRoughness: .3, envMapIntensity: .55, sheen: .4, sheenColor: new THREE.Color(color).multiplyScalar(2), sheenRoughness: .5 });
  const blackGlass = new THREE.MeshPhysicalMaterial({ color: '#020203', metalness: 0, roughness: .08, clearcoat: 1, clearcoatRoughness: .03, envMapIntensity: .25 });
  const lensGlass = new THREE.MeshPhysicalMaterial({ color: '#010103', metalness: .4, roughness: .04, clearcoat: 1, iridescence: .35, iridescenceIOR: 1.5, envMapIntensity: 1.2 });

  // cadre : extrusion du contour arrondi, chanfreins doux
  const body = new THREE.Mesh(
    new THREE.ExtrudeGeometry(rounded(w - bevel * 2, h - bevel * 2, r - bevel), { depth: d - bevel * 2, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 5, curveSegments: 48 }),
    [blackGlass, titanium]);
  body.geometry.translate(0, 0, -(d - bevel * 2) / 2);
  g.add(body);

  // face avant : verre noir + écran + îlot
  const front = new THREE.Mesh(flat(w - .1, h - .1, r - .05, 48), blackGlass);
  front.position.z = d / 2 + .002; g.add(front);
  const sw = w - .34, sh = h - .34;
  const screenMat = new THREE.MeshBasicMaterial({ map: screen || null, color: screen ? '#ffffff' : '#111', toneMapped: false });
  const scr = new THREE.Mesh(flat(sw, sh, r - .17, 48), screenMat);
  scr.position.z = d / 2 + .004; g.add(scr);
  const island = new THREE.Mesh(flat(2.05, .62, .31), new THREE.MeshBasicMaterial({ color: '#000' }));
  island.position.set(0, sh / 2 - .55, d / 2 + .006); g.add(island);

  // dos : verre dépoli teinté
  const back = new THREE.Mesh(flat(w - .1, h - .1, r - .05, 48), backGlass);
  back.rotation.y = Math.PI; back.position.z = -d / 2 - .002; g.add(back);

  // bloc photo en relief, en haut à gauche vu de dos
  const cam = new THREE.Group(), bw = 3.35;
  const plate = new THREE.Mesh(new THREE.ExtrudeGeometry(rounded(bw - .1, bw - .1, .78), { depth: .1, bevelEnabled: true, bevelThickness: .04, bevelSize: .05, bevelSegments: 4, curveSegments: 32 }),
    new THREE.MeshPhysicalMaterial({ color, metalness: .1, roughness: .18, clearcoat: 1, clearcoatRoughness: .08, envMapIntensity: .7 }));
  cam.add(plate);
  const lens = (x, y) => {
    const L = new THREE.Group();
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(.6, .62, .22, 48), ringMetal); ring.rotation.x = Math.PI / 2; ring.position.z = .2;
    const glass = new THREE.Mesh(new THREE.CylinderGeometry(.48, .48, .05, 48), lensGlass); glass.rotation.x = Math.PI / 2; glass.position.z = .32;
    const iris = new THREE.Mesh(new THREE.CircleGeometry(.2, 32), new THREE.MeshBasicMaterial({ color: '#0a0f1f' })); iris.position.z = .346;
    const glint = new THREE.Mesh(new THREE.CircleGeometry(.07, 16), new THREE.MeshBasicMaterial({ color: '#6c7cff', transparent: true, opacity: .5 })); glint.position.set(.12, .14, .348); L.add(glint);
    L.add(ring, glass, iris); L.position.set(x, y, 0); return L;
  };
  const o = .78;
  cam.add(lens(-o, o), lens(-o, -o), lens(o, 0));
  const flash = new THREE.Mesh(new THREE.CircleGeometry(.2, 32), new THREE.MeshStandardMaterial({ color: '#f3ead8', emissive: '#3a2f1c', roughness: .3 }));
  flash.position.set(o, o, .145); cam.add(flash);
  const lidar = new THREE.Mesh(new THREE.CircleGeometry(.16, 32), lensGlass); lidar.position.set(o, -o, .145); cam.add(lidar);
  cam.rotation.y = Math.PI;
  cam.position.set(w / 2 - bw / 2 - .25, h / 2 - bw / 2 - .25, -d / 2 - .01);
  g.add(cam);

  // boutons sur les tranches
  const btn = (len, y, side) => {
    const m = new THREE.Mesh(new THREE.CapsuleGeometry(.07, len, 6, 12), titanium);
    m.position.set(side * (w / 2 + .02), y, 0); g.add(m);
  };
  btn(.55, 3.9, -1); btn(1.05, 2.5, -1); btn(1.05, 1.1, -1); btn(1.7, 2.6, 1); btn(.9, -1.6, 1);

  g.userData = { screenMat, titanium };
  return g;
}
