// Les mondes Lulu sortent de l'écran : manèges (Park), pièces du musée (Museum), animaux 3D animés (Zoo).
// Chaque élément jaillit du centre de l'écran vers sa place autour du téléphone, flotte, puis repart quand le jeu change.
// Tout est enfant du téléphone : les éléments suivent ses mouvements et passent devant ou derrière lui.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const range = (p, a, b) => clamp((p - a) / (b - a));
const outBack = (t) => { const c = 1.6; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };

// [image, position autour du téléphone (x, y, profondeur), taille, rotation par seconde]
const PARK = [['wheel', [-5.5, 6, -2], 6, .25], ['tower', [8.5, 3.5, 2], 7.5], ['carousel', [7, -5, 4.5], 5.5],
  ['castle', [-4.8, -6.5, 3.5], 4.8], ['orbital', [2, 10.5, -2], 6, -.18], ['volcano', [3, -10.5, 3], 4.8]];
const MUSEUM = [['trex', [8.5, -3, 4], 7.5], ['raptor', [7.5, 5.5, 2], 5], ['sarcophagus', [-4.8, -6.5, 4], 4.6],
  ['pavilion', [-5.2, 6, -1.5], 5], ['pod', [2.5, 10.5, -1], 4.5], ['case', [3, -10.5, 3.5], 4]];
// animaux : [modèle, position, hauteur, rotation Y] ; à gauche, rien ne dépasse x = -5.5 (le texte est de ce côté)
const ZOO = [['giraffe', [7.5, -3.5, 5], 7.5, -.5], ['flamingo', [-4.6, -6.5, 4], 4, .5], ['panda', [-5, 6, -1], 3.4, .6], ['penguin', [7.5, 5.5, 2], 3.2, -.5]];

export function createWorlds(phone, { front, narrow }) {
  const root = new THREE.Group(); phone.add(root);
  const loader = new THREE.TextureLoader(), items = [];
  const spread = () => (narrow() ? .9 : 1), shrink = () => (narrow() ? .6 : 1);

  const sprite = ([name, pos, size, spin = 0], i, win) => {
    const mat = new THREE.SpriteMaterial({ transparent: true, opacity: 0, depthWrite: false, toneMapped: false, color: new THREE.Color(.92, .92, .92) });
    const s = new THREE.Sprite(mat); s.visible = false; root.add(s);
    const it = { obj: s, mat, pos, size, spin, i, win, aspect: 1 };
    loader.load(`/img/worlds/${name}.webp`, (t) => { t.colorSpace = THREE.SRGBColorSpace; mat.map = t; mat.needsUpdate = true; it.aspect = t.image.width / t.image.height; });
    items.push(it);
  };
  PARK.forEach((d, i) => sprite(d, i, [.295, .385]));
  MUSEUM.forEach((d, i) => sprite(d, i, [.395, .475]));

  // jour First Light : cartes d'interface en verre dépoli (dessinées en code)
  const card = (draw) => {
    const c = document.createElement('canvas'); c.width = 512; c.height = 360;
    const x = c.getContext('2d');
    x.fillStyle = 'rgba(255,255,255,.72)'; x.beginPath(); x.roundRect(8, 8, 496, 344, 44); x.fill();
    x.strokeStyle = 'rgba(255,255,255,.95)'; x.lineWidth = 3; x.stroke();
    x.font = '700 34px -apple-system, Helvetica, sans-serif'; x.fillStyle = '#2b2f45';
    draw(x);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  };
  const dotRow = (x, y, done, label) => {
    x.fillStyle = done ? '#e8893a' : 'rgba(43,47,69,.18)'; x.beginPath(); x.arc(70, y, 15, 0, 7); x.fill();
    x.fillStyle = done ? 'rgba(43,47,69,.45)' : '#2b2f45'; x.font = '600 28px -apple-system, Helvetica, sans-serif'; x.fillText(label, 100, y + 10);
  };
  const CARDS = [
    [card((x) => { x.fillText('Today', 50, 80); dotRow(x, 140, true, 'Morning review'); dotRow(x, 200, true, 'Send the quote'); dotRow(x, 260, false, 'Call the workshop'); }), [-8.2, 4.2, 2.5], 5],
    [card((x) => { x.fillText('Focus', 50, 80); x.font = '800 96px -apple-system, Helvetica, sans-serif'; x.fillStyle = '#e8893a'; x.fillText('25:00', 50, 210);
      x.fillStyle = 'rgba(43,47,69,.15)'; x.beginPath(); x.roundRect(50, 260, 410, 18, 9); x.fill(); x.fillStyle = '#3b4a6b'; x.beginPath(); x.roundRect(50, 260, 250, 18, 9); x.fill(); }), [-7.8, -4.5, 4], 4.6],
    [card((x) => { x.fillText('This week', 50, 80); [.4, .7, .55, .9, .65, .3, .8].forEach((v, i) => { x.fillStyle = i === 3 ? '#e8893a' : '#3b4a6b'; x.beginPath(); x.roundRect(60 + i * 60, 300 - v * 190, 36, v * 190, 10); x.fill(); }); }), [2.5, 9.8, -1], 4.6],
    [card((x) => { x.fillText('Tomorrow', 50, 80); x.font = '600 28px -apple-system, Helvetica, sans-serif'; x.fillStyle = '#6b6f85';
      ['09:00  Team call', '11:30  Site visit', '15:00  Invoices'].forEach((l, i) => x.fillText(l, 50, 150 + i * 60)); }), [1.5, -9.8, 3], 4.4],
  ];
  CARDS.forEach(([map, pos, size], i) => {
    const mat = new THREE.SpriteMaterial({ map, transparent: true, opacity: 0, depthWrite: false, toneMapped: false });
    const s = new THREE.Sprite(mat); s.visible = false; root.add(s);
    items.push({ obj: s, mat, pos, size, i, win: [.705, .865], aspect: 512 / 360 });
  });

  // animaux 3D, chargés seulement quand on approche du zoo
  const mixers = [], zooWin = [.485, .565];
  let loading = false;
  function loadZoo() {
    if (loading) return; loading = true;
    const gl = new GLTFLoader();
    ZOO.forEach(([name, pos, height, ry], i) => gl.load(`/models/${name}.glb`, (g) => {
      const m = g.scene, box = new THREE.Box3().setFromObject(m), size = box.getSize(new THREE.Vector3()), c = box.getCenter(new THREE.Vector3());
      m.position.sub(new THREE.Vector3(c.x, box.min.y, c.z)); // pieds à l'origine
      const holder = new THREE.Group(); holder.add(m); holder.visible = false; root.add(holder);
      m.traverse((o) => { if (o.isMesh) { o.frustumCulled = false; if (o.material) o.material.envMapIntensity = .8; } });
      if (g.animations[0]) { const mx = new THREE.AnimationMixer(m); mx.clipAction(g.animations[0]).play(); mixers.push(mx); }
      items.push({ obj: holder, pos, size: height / size.y, i, win: zooWin, model: true, ry });
    }));
    // l'orque nage en cercle autour du téléphone
    gl.load('/models/orca.glb', (g) => {
      const m = g.scene, box = new THREE.Box3().setFromObject(m), size = box.getSize(new THREE.Vector3()), c = box.getCenter(new THREE.Vector3());
      m.position.sub(c); m.traverse((o) => { if (o.isMesh) o.frustumCulled = false; });
      const holder = new THREE.Group(); holder.add(m); holder.visible = false; root.add(holder);
      if (g.animations[0]) { const mx = new THREE.AnimationMixer(m); mx.clipAction(g.animations[0]).play(); mixers.push(mx); }
      items.push({ obj: holder, size: 8 / Math.max(size.x, size.z), i: 5, win: zooWin, model: true, orbit: true });
    });
  }

  const tmp = new THREE.Vector3(), origin = new THREE.Vector3(0, 0, front);
  function update(p, time, dt) {
    if (p > .4) loadZoo();
    const k = spread();
    for (const it of items) {
      const [a, b] = it.win, start = a + it.i * .008;
      const inn = range(p, start, start + .035), out = range(p, b - .025, b);
      const on = inn > 0 && out < 1;
      const hide = narrow() && it.pos && it.pos[1] < -9; // sur téléphone, le bas est réservé au texte
      it.obj.visible = on && !hide;
      if (!it.obj.visible) continue;
      const e = outBack(inn) * shrink(), bob = Math.sin(time * 1.3 + it.i * 1.7) * .25;
      if (it.orbit) {
        const ang = time * .55, r = 8 * k;
        it.obj.position.set(3 * k + Math.cos(ang) * r, 1.5 + Math.sin(ang * 2) * 1.2, Math.sin(ang) * r * .7 + 1);
        it.obj.rotation.set(0, -ang, Math.sin(ang * 2) * .15);
        it.obj.scale.setScalar(it.size * e * (1 - out));
        continue;
      }
      tmp.set(it.pos[0] * k, it.pos[1] * (narrow() ? .85 : 1) + (narrow() ? 1.5 : 0), it.pos[2]);
      if (narrow()) tmp.x = clamp(tmp.x, -5.4, 5.4); // reste dans le cadre d'un écran de téléphone
      // sortie : repart vers l'extérieur en s'éloignant de l'écran
      tmp.multiplyScalar(1 + out * .6); tmp.z += out * 6;
      it.obj.position.lerpVectors(origin, tmp, Math.min(1, outBack(inn))).add({ x: 0, y: bob * Math.min(1, inn * 2), z: 0 });
      if (it.model) {
        it.obj.scale.setScalar(it.size * Math.max(0, e) * (1 - out));
        it.obj.rotation.y = it.ry + Math.sin(time * .4 + it.i) * .15;
      } else {
        const s = it.size * Math.max(.01, e);
        it.obj.scale.set(s * Math.min(1, it.aspect), s / Math.max(1, it.aspect), 1);
        it.mat.opacity = Math.min(1, inn * 3) * (1 - out);
        it.mat.rotation = (it.spin || 0) * time;
      }
    }
    for (const mx of mixers) mx.update(dt);
  }
  return { update, preload: loadZoo };
}
