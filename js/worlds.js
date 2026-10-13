// Les mondes sortent de l'écran : pour chaque jeu, un îlot-diorama jaillit de l'écran à plat, bascule en avant
// pour devenir une île flottante devant le téléphone, puis ses bâtiments surgissent un à un comme un livre pop-up.
// Quand le jeu change, tout se replie et rentre dans l'écran. Le jour, des cartes en verre dépoli (First Light).
import * as THREE from 'three';

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const range = (p, a, b) => clamp((p - a) / (b - a));
const smooth = (t) => t * t * (3 - 2 * t);
const spring = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : 1 - Math.cos(t * Math.PI * 2.5) * Math.exp(-t * 5.5)); // rebond amorti

// [image, angle sur l'île (degrés), distance au centre (0..1), hauteur]
const ISLANDS = [
  { ground: 'park', win: [.295, .385], side: '#6b4a2b', glow: '#ffcf7a', items: [
    ['carousel', 0, 0, 3.3], ['church', 140, .62, 3.6], ['house', 205, .6, 2.9], ['booth', 60, .62, 2.3],
    ['candy', 290, .58, 2.1], ['tree', 100, .82, 2.5], ['poplar', 250, .85, 2.7], ['tree', 330, .84, 2.2]] },
  { ground: 'museum', win: [.395, .475], side: '#8a6a3c', glow: '#ffd9a0', items: [
    ['sphinx', 0, 0, 2.6], ['temple', 150, .6, 3], ['trex', 230, .58, 3.4], ['anubis', 70, .62, 3],
    ['sarcophagus', 300, .6, 1.8]] },
  { ground: 'zoo', win: [.485, .565], side: '#7a5a32', glow: '#ffe2a6', items: [
    ['lulu-zoo', 0, .05, 1.9], ['giraffe', 150, .6, 4.2], ['lion', 230, .55, 2.1], ['hippo', 75, .58, 2],
    ['flamingo', 300, .62, 2.4], ['meerkat', 20, .7, 1.4]] },
];

export function createWorlds(phone, { front, narrow }) {
  const root = new THREE.Group(); phone.add(root);
  const loader = new THREE.TextureLoader();
  const tex = (name, done) => { const t = loader.load(`/img/worlds/${name}.webp`, done); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };

  const R = 5, T = .55; // rayon et épaisseur du dessus de l'île
  const islands = ISLANDS.map((d) => {
    const g = new THREE.Group(); g.visible = false; root.add(g);
    const tilt = new THREE.Group(); g.add(tilt);
    const spin = new THREE.Group(); tilt.add(spin);
    const sideMat = new THREE.MeshStandardMaterial({ color: d.side, roughness: .85 });
    const top = new THREE.Mesh(new THREE.CylinderGeometry(R, R * .94, T, 96, 1),
      [sideMat, new THREE.MeshBasicMaterial({ map: tex(`${d.ground}-ground`), toneMapped: false }), sideMat]);
    spin.add(top);
    // dessous rocheux de l'île flottante
    const under = new THREE.Mesh(new THREE.ConeGeometry(R * .94, R * 1.05, 64, 1), new THREE.MeshStandardMaterial({ color: new THREE.Color(d.side).multiplyScalar(.7), roughness: .95, flatShading: true }));
    under.rotation.x = Math.PI; under.position.y = -T / 2 - R * .52; spin.add(under);
    // liseré doré sur le bord
    const rim = new THREE.Mesh(new THREE.TorusGeometry(R * 1.003, .045, 8, 128), new THREE.MeshStandardMaterial({ color: '#d9b47a', metalness: .9, roughness: .3 }));
    rim.rotation.x = Math.PI / 2; rim.position.y = T / 2; spin.add(rim);
    // halo de lumière sous l'île
    const glow = glowSprite(d.glow); glow.scale.set(R * 4.2, R * 2.4, 1); glow.position.y = -1.5; tilt.add(glow);
    // éléments debout (toujours face à la caméra), ancrés par la base
    const items = d.items.map(([name, deg, dist, h], i) => {
      const it = { h, i, aspect: 1 };
      it.mat = new THREE.SpriteMaterial({ map: tex(name, (t) => { it.aspect = t.image.width / t.image.height; }), transparent: true, depthWrite: false, toneMapped: false, alphaTest: .02 });
      it.s = new THREE.Sprite(it.mat); it.s.center.set(.5, .04);
      const a = deg * Math.PI / 180;
      it.s.position.set(Math.sin(a) * dist * R * .82, T / 2, Math.cos(a) * dist * R * .82);
      it.s.scale.set(0, 0, 1); spin.add(it.s);
      return it;
    });
    return { ...d, g, tilt, spin, items, glow };
  });

  function glowSprite(color) {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const x = c.getContext('2d'), gr = x.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, color); gr.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = gr; x.globalAlpha = .55; x.fillRect(0, 0, 128, 128);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    return new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 }));
  }

  // ---------- jour First Light : cartes d'interface en verre dépoli ----------
  const card = (draw) => {
    const c = document.createElement('canvas'); c.width = 512; c.height = 360;
    const x = c.getContext('2d');
    x.fillStyle = 'rgba(255,255,255,.74)'; x.beginPath(); x.roundRect(8, 8, 496, 344, 44); x.fill();
    x.strokeStyle = 'rgba(255,255,255,.95)'; x.lineWidth = 3; x.stroke();
    x.font = '700 34px -apple-system, Helvetica, sans-serif'; x.fillStyle = '#2b2f45';
    draw(x);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  };
  const row = (x, y, done, label) => {
    x.fillStyle = done ? '#e8893a' : 'rgba(43,47,69,.18)'; x.beginPath(); x.arc(70, y, 15, 0, 7); x.fill();
    x.fillStyle = done ? 'rgba(43,47,69,.45)' : '#2b2f45'; x.font = '600 28px -apple-system, Helvetica, sans-serif'; x.fillText(label, 100, y + 10);
  };
  const cards = [
    [card((x) => { x.fillText('Today', 50, 80); row(x, 140, true, 'Morning review'); row(x, 200, true, 'Send the quote'); row(x, 260, false, 'Call the workshop'); }), [-8.2, 4.2, 2.5], 5],
    [card((x) => { x.fillText('Focus', 50, 80); x.font = '800 96px -apple-system, Helvetica, sans-serif'; x.fillStyle = '#e8893a'; x.fillText('25:00', 50, 210);
      x.fillStyle = 'rgba(43,47,69,.15)'; x.beginPath(); x.roundRect(50, 260, 410, 18, 9); x.fill(); x.fillStyle = '#3b4a6b'; x.beginPath(); x.roundRect(50, 260, 250, 18, 9); x.fill(); }), [-7.8, -4.5, 4], 4.6],
    [card((x) => { x.fillText('This week', 50, 80); [.4, .7, .55, .9, .65, .3, .8].forEach((v, i) => { x.fillStyle = i === 3 ? '#e8893a' : '#3b4a6b'; x.beginPath(); x.roundRect(60 + i * 60, 300 - v * 190, 36, v * 190, 10); x.fill(); }); }), [2.5, 9.8, -1], 4.6],
    [card((x) => { x.fillText('Tomorrow', 50, 80); x.font = '600 28px -apple-system, Helvetica, sans-serif'; x.fillStyle = '#6b6f85';
      ['09:00  Team call', '11:30  Site visit', '15:00  Invoices'].forEach((l, i) => x.fillText(l, 50, 150 + i * 60)); }), [1.5, -9.8, 3], 4.4],
  ].map(([map, pos, size], i) => {
    const mat = new THREE.SpriteMaterial({ map, transparent: true, opacity: 0, depthWrite: false, toneMapped: false });
    const s = new THREE.Sprite(mat); s.visible = false; root.add(s);
    return { s, mat, pos, size, i };
  });

  const target = new THREE.Vector3(), origin = new THREE.Vector3(0, 0, front + .2);
  function update(p, time) {
    const n = narrow();
    for (const isl of islands) {
      const [a, b] = isl.win;
      const open = smooth(range(p, a, a + .03)), close = smooth(range(p, b - .022, b));
      const k = open * (1 - close);
      isl.g.visible = k > .001;
      if (!isl.g.visible) continue;
      // sort de l'écran à plat (dessus tourné vers nous), bascule en île flottante devant le téléphone
      target.set(n ? 0 : -1.6, n ? -3.6 : -4.1, 7.5);
      isl.g.position.lerpVectors(origin, target, k);
      isl.g.scale.setScalar((n ? .62 : .9) * (.08 + .92 * k));
      isl.tilt.rotation.x = Math.PI / 2 * (1 - k) + .72 * k;
      isl.spin.rotation.y = time * .12 + (p - a) * 9;
      isl.glow.material.opacity = k * .9;
      // les bâtiments surgissent un à un, puis se replient avant que l'île ne rentre
      const born = range(p, a + .022, a + .05);
      for (const it of isl.items) {
        const local = clamp(born * (isl.items.length + 2) - it.i);
        const up = spring(local) * (1 - range(p, b - .03, b - .016));
        const h = it.h * 1.35 * Math.max(0, up);
        it.s.scale.set(h * it.aspect, h, 1);
        it.s.position.y = T / 2 + Math.sin(time * 2 + it.i) * .04 * up;
      }
    }
    // cartes First Light
    for (const c of cards) {
      const s0 = .705 + c.i * .008, inn = range(p, s0, s0 + .035), out = range(p, .84, .865);
      c.s.visible = inn > 0 && out < 1;
      if (!c.s.visible) continue;
      const e = spring(inn) * (n ? .6 : 1);
      target.set(clamp(c.pos[0] * (n ? .9 : 1), n ? -5.4 : -99, n ? 5.4 : 99), c.pos[1] * (n ? .85 : 1) + (n ? 1.5 : 0), c.pos[2]);
      target.multiplyScalar(1 + out * .5);
      c.s.position.lerpVectors(origin, target, Math.min(1, spring(inn))); c.s.position.y += Math.sin(time * 1.2 + c.i) * .2;
      const s = c.size * e; c.s.scale.set(s, s / 1.42, 1);
      c.mat.opacity = Math.min(1, inn * 3) * (1 - out);
    }
  }
  return { update, preload() {} };
}
