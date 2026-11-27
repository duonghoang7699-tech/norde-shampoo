// Lather: a soft mound of foam made of hundreds of small bubbles, plus iridescent
// bubbles that drift up. Drag to turn it.
import * as THREE from 'three';

export function createFoam(canvas, { shot } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: !!shot });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
  camera.position.set(0, 1.5, 5.6);
  camera.lookAt(0, 0.45, 0);

  // studio-ish environment: soft gradient room
  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = new THREE.Scene();
  const roomMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    uniforms: {},
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
    fragmentShader: 'varying vec3 vP; void main(){ float h = vP.y*.5+.5; vec3 c = mix(vec3(.55,.68,.78), vec3(1.6,1.6,1.55), smoothstep(.3,.9,h)); c += vec3(2.5,2.2,1.9)*smoothstep(.96,1.,dot(vP, normalize(vec3(.5,.6,.6)))); gl_FragColor = vec4(c,1.); }',
  });
  room.add(new THREE.Mesh(new THREE.SphereGeometry(10, 32, 16), roomMat));
  scene.environment = pmrem.fromScene(room).texture;

  const key = new THREE.DirectionalLight(0xffffff, 1.6);
  key.position.set(3, 5, 4);
  scene.add(key);

  // foam mound
  const COUNT = 900;
  const foamGeo = new THREE.SphereGeometry(1, 20, 14);
  const foamMat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.25, transmission: 0.35, thickness: 0.4, ior: 1.2, clearcoat: 1, clearcoatRoughness: 0.1, sheen: 0.6, sheenColor: new THREE.Color(0xdbeaff), iridescence: 0.5, iridescenceIOR: 1.3 });
  const foam = new THREE.InstancedMesh(foamGeo, foamMat, COUNT);
  const seeds = [];
  const rnd = (() => { let s = 42; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();
  for (let i = 0; i < COUNT; i++) {
    // points in a squashed dome, more and smaller near the surface
    const u = rnd(), v = rnd();
    const th = u * Math.PI * 2, ph = Math.acos(1 - v); // upper hemisphere bias
    const rr = 1.35 * Math.cbrt(rnd());
    const x = Math.sin(ph) * Math.cos(th) * rr * 1.25;
    const z = Math.sin(ph) * Math.sin(th) * rr * 1.0;
    const y = Math.cos(ph) * rr * 0.85;
    const s = 0.05 + Math.pow(rnd(), 2.2) * 0.2 * (1.1 - rr / 1.6);
    seeds.push({ x, y, z, s, ph: rnd() * 6.28 });
  }
  foam.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  const foamGroup = new THREE.Group();
  foamGroup.add(foam);
  scene.add(foamGroup);

  // floating bubbles
  const BUB = 26;
  const bubMat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0, metalness: 0, transmission: 1, thickness: 0.02, ior: 1.05, iridescence: 1, iridescenceIOR: 1.35, iridescenceThicknessRange: [180, 650], transparent: true, opacity: 0.9, envMapIntensity: 1.6 });
  const bubbles = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 40, 28), bubMat, BUB);
  const bseeds = [];
  for (let i = 0; i < BUB; i++) bseeds.push({ x: (rnd() - 0.5) * 3.6, z: (rnd() - 0.5) * 2, off: rnd() * 5, sp: 0.18 + rnd() * 0.25, s: 0.06 + rnd() * 0.2, w: rnd() * 6 });
  bubbles.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  scene.add(bubbles);

  const m = new THREE.Matrix4(), p = new THREE.Vector3(), q = new THREE.Quaternion(), sc = new THREE.Vector3();
  let grow = shot ? 1 : 0, visible = false, rotY = 0, vel = 0.12, dragging = false, lastX = 0;
  const clock = new THREE.Clock();

  function frame() {
    const dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime;
    if (visible) grow = Math.min(1, grow + dt * 0.5);
    const g = 1 - Math.pow(1 - grow, 3);
    for (let i = 0; i < COUNT; i++) {
      const s = seeds[i];
      const delay = Math.min(1, Math.max(0, g * 1.6 - (s.y / 1.2) * 0.6));
      const breathe = 1 + Math.sin(t * 1.4 + s.ph) * 0.04;
      p.set(s.x * (0.6 + 0.4 * delay), s.y * delay, s.z * (0.6 + 0.4 * delay));
      sc.setScalar(s.s * delay * breathe);
      m.compose(p, q, sc);
      foam.setMatrixAt(i, m);
    }
    foam.instanceMatrix.needsUpdate = true;
    for (let i = 0; i < BUB; i++) {
      const b = bseeds[i];
      const y = ((t * b.sp + b.off) % 4) - 0.6;
      const fade = Math.min(1, (y + 0.6) * 2) * Math.min(1, (3.4 - y) * 1.5);
      p.set(b.x + Math.sin(t * 0.8 + b.w) * 0.2, y, b.z + Math.cos(t * 0.6 + b.w) * 0.15);
      sc.setScalar(b.s * Math.max(0, fade) * g);
      m.compose(p, q, sc);
      bubbles.setMatrixAt(i, m);
    }
    bubbles.instanceMatrix.needsUpdate = true;
    if (!dragging) { rotY += vel * dt; vel += (0.12 - vel) * dt; }
    foamGroup.rotation.y = rotY;
    renderer.render(scene, camera);
  }

  let raf = 0;
  function loop() { frame(); raf = requestAnimationFrame(loop); }

  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(canvas);
  resize();

  canvas.addEventListener('pointerdown', (e) => { dragging = true; lastX = e.clientX; canvas.setPointerCapture(e.pointerId); canvas.style.cursor = 'grabbing'; });
  canvas.addEventListener('pointermove', (e) => { if (!dragging) return; const dx = e.clientX - lastX; lastX = e.clientX; rotY += dx * 0.01; vel = dx * 0.6; });
  const end = () => { dragging = false; canvas.style.cursor = ''; };
  canvas.addEventListener('pointerup', end); canvas.addEventListener('pointercancel', end);

  if (!shot) {
    new IntersectionObserver(([en]) => {
      visible = en.isIntersecting;
      if (visible && !raf) { clock.getDelta(); loop(); }
      if (!visible && raf) { cancelAnimationFrame(raf); raf = 0; }
    }, { rootMargin: '100px' }).observe(canvas);
  }
  return { renderNow(t = 3) { grow = 1; clock.elapsedTime = t; frame(); } };
}
