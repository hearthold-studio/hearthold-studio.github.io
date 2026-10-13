// Le foyer de l'ouverture, en vraie 3D : arche au trait fin qui se dessine, flamme calculée en temps réel
// (bruit fractal qui monte, dégradé rouge → orange → or → blanc), étincelles fines. Net à toutes les tailles :
// la plongée fait traverser l'arche par la caméra au lieu d'agrandir une image.
import * as THREE from 'three';

const FLAME_VERT = `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const FLAME_FRAG = `
precision highp float;
varying vec2 vUv;
uniform float uTime, uAlpha, uSeed;
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
}
float fbm(vec2 p) { float v = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { v += a * noise(p); p = p * 2.03 + 17.0; a *= 0.5; } return v; }
void main() {
  vec2 uv = vUv; float y = uv.y, x = uv.x - 0.5;
  float t = uTime * 1.25 + uSeed;
  float n = fbm(vec2(x * 3.2, y * 2.4 - t));
  float n2 = fbm(vec2(x * 6.0 + 3.0, y * 4.0 - t * 1.7));
  float sway = (n - 0.5) * 0.22 * y + sin(t * 1.3 + y * 3.0) * 0.02 * y;
  float width = mix(0.47, 0.0, pow(y, 0.75)) * (0.8 + 0.4 * n2);
  float d = abs(x + sway) / max(width, 0.001);
  float body = smoothstep(1.0, 0.0, d);
  float tip = smoothstep(0.98, 0.35, y + (n - 0.5) * 0.45);
  float base = smoothstep(0.0, 0.1, y);
  float shape = body * tip * base;
  float heat = clamp(shape * (1.35 - y * 0.9) + (n2 - 0.5) * 0.25, 0.0, 1.2);
  vec3 col = mix(vec3(0.45, 0.04, 0.0), vec3(1.0, 0.36, 0.04), smoothstep(0.05, 0.45, heat));
  col = mix(col, vec3(1.0, 0.72, 0.25), smoothstep(0.45, 0.8, heat));
  col = mix(col, vec3(1.0, 0.96, 0.85), smoothstep(0.85, 1.1, heat));
  gl_FragColor = vec4(col * shape * 1.6 * uAlpha, 1.0);
}`;

export function createHearth() {
  const g = new THREE.Group();

  // arche : deux montants, un demi-cercle, et la base, au trait fin
  const W = 3, H = 2.2, base = -4.2;
  const path = new THREE.CurvePath();
  path.add(new THREE.LineCurve3(new THREE.Vector3(-W, base, 0), new THREE.Vector3(-W, H, 0)));
  path.add(arc3(W, H));
  path.add(new THREE.LineCurve3(new THREE.Vector3(W, H, 0), new THREE.Vector3(W, base, 0)));
  function arc3(r, cy) {
    const c = new THREE.Curve();
    c.getPoint = (t, out = new THREE.Vector3()) => out.set(-Math.cos(t * Math.PI) * r, cy + Math.sin(t * Math.PI) * r, 0);
    return c;
  }
  const lineMat = new THREE.MeshBasicMaterial({ color: '#f3e8d6', toneMapped: false });
  const arch = new THREE.Mesh(new THREE.TubeGeometry(path, 320, .075, 10, false), lineMat);
  const sill = new THREE.Mesh(new THREE.TubeGeometry(new THREE.LineCurve3(new THREE.Vector3(-W - 1.1, base, 0), new THREE.Vector3(W + 1.1, base, 0)), 60, .075, 10, false), lineMat);
  [arch, sill].forEach((m) => { m.geometry.setDrawRange(0, 0); g.add(m); });

  // flamme : deux couches décalées pour donner du volume
  const flames = [[0, 0, 5.4, 6.6], [7.3, .05, 4.2, 5.4], [3.1, -.9, 3, 4.2], [5.7, .9, 3, 4]].map(([seed, ox, w, h], i) => {
    const mat = new THREE.ShaderMaterial({ vertexShader: FLAME_VERT, fragmentShader: FLAME_FRAG, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { uTime: { value: 0 }, uAlpha: { value: 0 }, uSeed: { value: seed } } });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    m.position.set(ox, base + h / 2 - .05, i * .03); g.add(m);
    return mat;
  });

  // lueur chaude autour de la flamme
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const x = c.getContext('2d'), gr = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, 'rgba(255,150,60,.55)'); gr.addColorStop(1, 'rgba(255,90,20,0)'); x.fillStyle = gr; x.fillRect(0, 0, 128, 128);
  const glowTex = new THREE.CanvasTexture(c); glowTex.colorSpace = THREE.SRGBColorSpace;
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 }));
  glow.scale.set(16, 16, 1); glow.position.set(0, base + 2.2, -.2); g.add(glow);

  // étincelles : petits points nets, teintes du rouge à l'or, qui montent en tourbillonnant
  const N = 260, pos = new Float32Array(N * 3), vel = new Float32Array(N * 3), col = new Float32Array(N * 3), life = new Float32Array(N);
  const pal = [new THREE.Color('#ff5a1a'), new THREE.Color('#ff9a3c'), new THREE.Color('#ffd27a')];
  const reset = (i) => {
    pos[i * 3] = (Math.random() - .5) * 1.6; pos[i * 3 + 1] = base + .6 + Math.random() * 1.5; pos[i * 3 + 2] = (Math.random() - .5) * .8;
    vel[i * 3] = (Math.random() - .5) * .012; vel[i * 3 + 1] = .025 + Math.random() * .05; vel[i * 3 + 2] = (Math.random() - .5) * .01;
    life[i] = 0;
    const cc = pal[(Math.random() * 3) | 0]; col[i * 3] = cc.r; col[i * 3 + 1] = cc.g; col[i * 3 + 2] = cc.b;
  };
  for (let i = 0; i < N; i++) { reset(i); life[i] = Math.random(); pos[i * 3 + 1] += Math.random() * 9; }
  const sg = new THREE.BufferGeometry();
  sg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); sg.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const dot = document.createElement('canvas'); dot.width = dot.height = 32;
  const d = dot.getContext('2d'), dg = d.createRadialGradient(16, 16, 0, 16, 16, 16);
  dg.addColorStop(0, 'rgba(255,255,255,1)'); dg.addColorStop(.35, 'rgba(255,255,255,.9)'); dg.addColorStop(.6, 'rgba(255,255,255,.15)'); dg.addColorStop(1, 'rgba(255,255,255,0)');
  d.fillStyle = dg; d.fillRect(0, 0, 32, 32);
  const sparkMat = new THREE.PointsMaterial({ map: new THREE.CanvasTexture(dot), size: .16, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 });
  g.add(new THREE.Points(sg, sparkMat));

  const archCount = arch.geometry.index.count, sillCount = sill.geometry.index.count;
  // t : secondes depuis l'arrivée sur la page ; dive : 0..1 pendant la plongée
  function update(t, dt, dive) {
    const draw = Math.min(1, Math.max(0, (t - .3) / 1.6));
    const ease = 1 - Math.pow(1 - draw, 3);
    arch.geometry.setDrawRange(0, Math.floor(archCount * ease / 6) * 6);
    sill.geometry.setDrawRange(0, Math.floor(sillCount * Math.min(1, Math.max(0, (t - 1.1) / .7)) / 6) * 6);
    const lit = Math.min(1, Math.max(0, (t - 1.5) / 1.2));
    for (const f of flames) { f.uniforms.uTime.value = t; f.uniforms.uAlpha.value = lit * (1 + dive * 1.5); }
    glow.material.opacity = lit * (.85 + .15 * Math.sin(t * 7)) * (1 + dive);
    sparkMat.opacity = lit;
    for (let i = 0; i < N; i++) {
      const k = i * 3;
      life[i] += dt * .35;
      pos[k] += (vel[k] + Math.sin(t * 2.2 + i) * .006) * dt * 60;
      pos[k + 1] += vel[k + 1] * dt * 60;
      pos[k + 2] += vel[k + 2] * dt * 60;
      if (pos[k + 1] > 9 || life[i] > 1) reset(i);
    }
    sg.attributes.position.needsUpdate = true;
  }
  return { group: g, update };
}
