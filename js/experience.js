// Expérience au défilement de l'accueil : foyer → plongée dans la flamme → le téléphone sort du feu →
// nuit Moon Beam (Park, Museum, Zoo) → lever du soleil → jour First Light → atterrissage.
// Une seule variable pilote tout : p (0 → 1), l'avancement dans la section .story, lissé pour la fluidité.
import * as THREE from 'three';
import { createPhone } from './phone.js';
import { studioEnvironment } from './studio-env.js';

const story = document.querySelector('.story'), canvas = document.querySelector('#stage');
const lowPower = (navigator.hardwareConcurrency || 4) <= 4 && matchMedia('(pointer: coarse)').matches;

// ---------- outils de chronologie ----------
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (t) => t * t * (3 - 2 * t);
const range = (p, a, b) => smooth(clamp((p - a) / (b - a)));
// piste : [[p, valeur], ...] ; valeur nombre ou tableau de nombres
function track(keys, p) {
  if (p <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    const [p1, v1] = keys[i], [p0, v0] = keys[i - 1];
    if (p <= p1) {
      const t = smooth((p - p0) / (p1 - p0));
      return Array.isArray(v0) ? v0.map((x, k) => x + (v1[k] - x) * t) : v0 + (v1 - v0) * t;
    }
  }
  return keys[keys.length - 1][1];
}
const hex = (h) => { const c = new THREE.Color(h); return [c.r, c.g, c.b]; };
const css = (a) => `rgb(${a.map((x) => Math.round(x * 255)).join(',')})`;

// ---------- rendu ----------
const renderer = new THREE.WebGLRenderer({ canvas, antialias: !lowPower, alpha: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, lowPower ? 1.25 : 1.75));
renderer.toneMapping = THREE.NeutralToneMapping;
const scene = new THREE.Scene();
scene.environment = studioEnvironment(renderer);
const camera = new THREE.PerspectiveCamera(30, 1, 2, 400);

// lumières : feu, lune, soleil (leur intensité suit l'histoire)
const key = new THREE.DirectionalLight('#ffffff', .6); key.position.set(-6, 8, 10); scene.add(key);
const fire = new THREE.PointLight('#ff7a2e', 0, 60); fire.position.set(4, -6, 8); scene.add(fire);
const moonL = new THREE.DirectionalLight('#8ea2ff', 0); moonL.position.set(-8, 10, 4); scene.add(moonL);
const sunL = new THREE.DirectionalLight('#ffc27a', 0); sunL.position.set(6, -2, -8); scene.add(sunL);

// ---------- téléphone ----------
const loader = new THREE.TextureLoader();
const tex = (n) => { const t = loader.load(`/img/screens/${n}.webp`); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };
const screens = { park: tex('park-1'), museum: tex('museum-2'), zoo: tex('zoo-2'), light: firstLightScreen() };
const phone = createPhone({ screen: screens.park });
const { screenMat, screen, z: front } = phone.userData;
// second écran par-dessus pour les fondus enchaînés entre deux jeux
const fadeMat = new THREE.MeshBasicMaterial({ map: screens.museum, transparent: true, opacity: 0, toneMapped: false, depthWrite: false });
const fadeScr = new THREE.Mesh(screen.geometry, fadeMat); fadeScr.position.z = front + .019; phone.add(fadeScr);
const rig = new THREE.Group(); rig.add(phone); scene.add(rig);

// écran First Light dessiné en code (les apps sont en préparation)
function firstLightScreen() {
  const c = document.createElement('canvas'); c.width = 720; c.height = 1564;
  const x = c.getContext('2d');
  const bg = x.createLinearGradient(0, 0, 0, 1564); bg.addColorStop(0, '#fff8ec'); bg.addColorStop(1, '#ffe2b8');
  x.fillStyle = bg; x.fillRect(0, 0, 720, 1564);
  x.fillStyle = '#e8893a'; x.beginPath(); x.arc(360, 360, 110, Math.PI, 0); x.fill();
  x.strokeStyle = '#e8893a'; x.lineWidth = 14; x.lineCap = 'round';
  [[360, 200, 360, 160], [230, 250, 205, 222], [490, 250, 515, 222], [180, 330, 140, 330], [540, 330, 580, 330]].forEach(([a, b, c2, d]) => { x.beginPath(); x.moveTo(a, b); x.lineTo(c2, d); x.stroke(); });
  x.strokeStyle = '#3b4a6b'; x.beginPath(); x.moveTo(170, 372); x.lineTo(550, 372); x.stroke();
  x.fillStyle = '#2b2f45'; x.font = '700 64px -apple-system, Helvetica, sans-serif'; x.textAlign = 'center'; x.fillText('First Light', 360, 500);
  x.font = '500 30px -apple-system, Helvetica, sans-serif'; x.fillStyle = '#6b6f85'; x.fillText('Good morning', 360, 552);
  const card = (y, h, title, lines, accent) => {
    x.fillStyle = 'rgba(255,255,255,.85)'; x.beginPath(); x.roundRect(60, y, 600, h, 36); x.fill();
    x.fillStyle = accent; x.beginPath(); x.roundRect(96, y + 36, 64, 64, 18); x.fill();
    x.fillStyle = '#2b2f45'; x.textAlign = 'left'; x.font = '700 32px -apple-system, Helvetica, sans-serif'; x.fillText(title, 184, y + 80);
    x.fillStyle = '#d9dbe6'; lines.forEach((wd, i) => { x.beginPath(); x.roundRect(96, y + 132 + i * 40, wd, 18, 9); x.fill(); });
  };
  card(620, 260, 'Today', [460, 380, 300], '#e8893a');
  card(910, 260, 'Projects', [420, 480, 260], '#3b4a6b');
  card(1200, 220, 'Notes', [500, 340], '#f2b84b');
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

// ---------- particules : braises puis étincelles ----------
function softDot() {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const x = c.getContext('2d'), g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.25, 'rgba(255,255,255,.8)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c);
}
const dot = softDot();
const N = lowPower ? 260 : 520;
const ePos = new Float32Array(N * 3), eVel = new Float32Array(N * 3), eLife = new Float32Array(N);
const resetEmber = (i, spread = 1) => {
  ePos[i * 3] = (Math.random() - .5) * 6 * spread; ePos[i * 3 + 1] = -8 + Math.random() * 3; ePos[i * 3 + 2] = (Math.random() - .5) * 10;
  eVel[i * 3] = (Math.random() - .5) * .02; eVel[i * 3 + 1] = .03 + Math.random() * .06; eVel[i * 3 + 2] = (Math.random() - .5) * .02;
  eLife[i] = Math.random();
};
for (let i = 0; i < N; i++) { resetEmber(i); ePos[i * 3 + 1] = -8 + Math.random() * 22; }
const emberGeo = new THREE.BufferGeometry(); emberGeo.setAttribute('position', new THREE.BufferAttribute(ePos, 3));
const emberMat = new THREE.PointsMaterial({ map: dot, color: '#ff9a4a', size: .35, transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false });
const embers = new THREE.Points(emberGeo, emberMat); scene.add(embers);

// ---------- ciel de nuit : étoiles, lune ; aube : soleil ----------
const S = lowPower ? 700 : 1400, sPos = new Float32Array(S * 3);
for (let i = 0; i < S; i++) { sPos[i * 3] = (Math.random() - .5) * 260; sPos[i * 3 + 1] = (Math.random() - .3) * 150; sPos[i * 3 + 2] = -120 - Math.random() * 60; }
const starGeo = new THREE.BufferGeometry(); starGeo.setAttribute('position', new THREE.BufferAttribute(sPos, 3));
const starMat = new THREE.PointsMaterial({ map: dot, color: '#dfe6ff', size: 1.1, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
const stars = new THREE.Points(starGeo, starMat); scene.add(stars);

function glowSprite(inner, outer, core = .18) {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const x = c.getContext('2d'), g = x.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0, inner); g.addColorStop(core, inner); g.addColorStop(core + .02, outer); g.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = g; x.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
}
const moon = glowSprite('#fff8e6', 'rgba(150,165,255,.16)', .09); moon.scale.set(70, 70, 1); scene.add(moon);
const sun = glowSprite('#fff4d6', 'rgba(255,170,80,.4)', .04); sun.scale.set(120, 120, 1); scene.add(sun);

// ---------- couleurs du ciel (dégradé CSS derrière le canvas) ----------
const sky = document.querySelector('.sky');
const SKY = [ // [p, haut, bas, encre du texte]
  [0, hex('#08080b'), hex('#1a0b05'), hex('#f2f3f5')],
  [.2, hex('#0a0708'), hex('#2a0f06'), hex('#f2f3f5')],
  [.32, hex('#05071a'), hex('#14123a'), hex('#f2f3f5')],
  [.55, hex('#070a24'), hex('#1d1846'), hex('#f2f3f5')],
  [.64, hex('#2a2150'), hex('#f08a5a'), hex('#ffffff')],
  [.72, hex('#9cc4f0'), hex('#ffd9a0'), hex('#1d2033')],
  [.9, hex('#cfe3fb'), hex('#fff1dc'), hex('#1d2033')],
  [1, hex('#f5f5f2'), hex('#f5f5f2'), hex('#121419')],
];

// ---------- chapitres de texte (apparaissent sur leur plage de p) ----------
const chapters = [...document.querySelectorAll('[data-at]')].map((el) => { const [a, b] = el.dataset.at.split(',').map(Number); return { el, a, b }; });
const intro = document.querySelector('.intro');

// ---------- mise en page selon l'écran ----------
let narrow = false;
function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false); camera.aspect = w / h;
  narrow = w / h < .9;
  camera.position.set(0, 0, narrow ? 62 : 44); camera.updateProjectionMatrix();
}
addEventListener('resize', resize); resize();

// ---------- la chronologie ----------
let p = 0, target = 0, time = 0, pointerX = 0, pointerY = 0;
function readScroll() {
  const r = story.getBoundingClientRect(), total = r.height - innerHeight;
  target = clamp(-r.top / total);
}
addEventListener('scroll', readScroll, { passive: true }); readScroll(); p = target;
addEventListener('pointermove', (e) => { pointerX = e.clientX / innerWidth - .5; pointerY = e.clientY / innerHeight - .5; }, { passive: true });

function apply(p, dt) {
  const side = narrow ? 0 : 1;
  // téléphone : sort du feu (de dos, en tournant), se retourne, se place, pivote vers l'aube, puis se pose
  const pos = track([[0, [0, -2, -90]], [.1, [0, -1, -55]], [.22, [0, 0, 0]], [.3, [4.6 * side, 0, 0]], [.55, [4.6 * side, 0, 0]],
    [.64, [0, 0, 4]], [.72, [-4.6 * side, 0, 0]], [.86, [-4.6 * side, 0, 0]], [1, [0, narrow ? 20 : -16, -24]]], p);
  const rot = track([[0, [.3, Math.PI * 3, .2]], [.22, [-.08, Math.PI * 1.1, .05]], [.3, [-.06, -.32, 0]], [.55, [-.06, -.42, 0]],
    [.64, [-.05, -1.25, 0]], [.72, [-.05, .34, 0]], [.86, [-.05, .42, 0]], [1, [-1.1, .2, .3]]], p);
  const float = Math.sin(time * .9) * .18;
  rig.position.set(pos[0], pos[1] + float * range(p, .22, .3), pos[2]);
  rig.rotation.set(rot[0] + pointerY * .08, rot[1] + pointerX * .14, rot[2]);
  if (narrow) rig.position.y += track([[.25, 0], [.3, 3.2]], p);

  // écran : s'allume, enchaîne Park → Museum → Zoo, puis First Light
  screenMat.color.setScalar(range(p, .24, .3));
  const fades = [[.36, .4, screens.park, screens.museum], [.45, .49, screens.museum, screens.zoo], [.66, .7, screens.zoo, screens.light]];
  let a = screens.park, b = screens.museum, f = 0;
  for (const [s0, s1, x, y] of fades) { if (p >= s0) { a = x; b = y; f = range(p, s0, s1); } }
  if (screenMat.map !== (f >= 1 ? b : a)) { screenMat.map = f >= 1 ? b : a; screenMat.needsUpdate = true; }
  fadeMat.map = b; fadeMat.opacity = f > 0 && f < 1 ? f : 0;

  // lumières
  const night = range(p, .26, .34) * (1 - range(p, .58, .68));
  const dawn = range(p, .56, .64) * (1 - range(p, .74, .82));
  const day = range(p, .66, .76);
  fire.intensity = 260 * (1 - range(p, .24, .34)) + 40 * Math.sin(time * 9) * (1 - range(p, .2, .3));
  moonL.intensity = 1.6 * night;
  sunL.intensity = 3 * dawn + 1.2 * day;
  key.intensity = .5 + 1.4 * day;
  scene.environmentIntensity = .7 + .5 * day;

  // braises : montent doucement, puis filent vers la caméra pendant la plongée, s'éteignent ensuite
  const warp = range(p, .04, .16) * (1 - range(p, .2, .26));
  emberMat.opacity = 1 - range(p, .24, .32);
  emberMat.size = .35 + warp * .5;
  if (emberMat.opacity > 0) {
    for (let i = 0; i < N; i++) {
      const k = i * 3;
      ePos[k] += eVel[k] * dt * 60 + Math.sin(time * 2 + i) * .004;
      ePos[k + 1] += eVel[k + 1] * dt * 60 * (1 - warp * .7);
      ePos[k + 2] += warp * 1.6 * dt * 60;
      if (ePos[k + 1] > 16 || ePos[k + 2] > 40) resetEmber(i, 1 + warp * 3);
    }
    emberGeo.attributes.position.needsUpdate = true;
  }

  // ciel : étoiles, lune qui monte, soleil qui se lève derrière le téléphone
  starMat.opacity = night * .9 * (.85 + .15 * Math.sin(time * 1.7));
  moon.material.opacity = night;
  moon.position.set(narrow ? -20 : 50, track([[.28, -30], [.52, narrow ? 62 : 34]], p), -130);
  sun.material.opacity = dawn + day * .5;
  sun.position.set(0, track([[.56, -60], [.66, -6], [.86, 26]], p), -150);

  let i = 1; while (i < SKY.length - 1 && p > SKY[i][0]) i++;
  const [p0, t0, b0, i0] = SKY[i - 1], [p1, t1, b1, i1] = SKY[i], t = smooth(clamp((p - p0) / (p1 - p0)));
  const mix = (u, v) => u.map((x, k) => x + (v[k] - x) * t);
  sky.style.setProperty('--top', css(mix(t0, t1))); sky.style.setProperty('--bottom', css(mix(b0, b1)));
  document.documentElement.style.setProperty('--ink', css(mix(i0, i1)));

  // plongée : le foyer grossit et s'efface, puis les chapitres apparaissent à leur tour
  const dive = range(p, 0, .12);
  intro.style.transform = `scale(${1 + dive * dive * 9})`; intro.style.opacity = 1 - range(p, .05, .11);
  for (const c of chapters) {
    const len = c.b - c.a, v = range(p, c.a, c.a + len * .2) * (1 - range(p, c.b - len * .2, c.b));
    c.el.style.opacity = v; c.el.style.transform = `translateY(${(1 - v) * 30}px)`;
    c.el.style.visibility = v > .01 ? 'visible' : 'hidden';
  }
  document.querySelectorAll('[data-game]').forEach((el) => {
    const [g0, g1] = el.dataset.game.split(',').map(Number); el.classList.toggle('on', p >= g0 && p < g1);
  });
}

// ---------- boucle : ne tourne que si la section est visible ----------
let visible = true, last = performance.now();
new IntersectionObserver((e) => { visible = e[0].isIntersecting; }).observe(story);
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(.05, (now - last) / 1000); last = now;
  if (!visible || document.hidden) return;
  time += dt;
  p += (target - p) * (1 - Math.exp(-dt * 7));
  apply(p, dt);
  renderer.render(scene, camera);
}
requestAnimationFrame(frame);

// banc d'essai : forcer une position (captures automatiques)
window.__exp = { set(v) { p = target = v; time = 2; apply(v, 1 / 60); renderer.render(scene, camera); } };
