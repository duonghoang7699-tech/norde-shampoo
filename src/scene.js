// The beach: sky, moving sea, sand, a striped towel, oranges and the bottle.
// Scroll progress (0 → 1) moves the camera from the hero shot down to the product on the towel.
import * as THREE from 'three';
import { Water } from 'three/examples/jsm/objects/Water.js';
import { createBottle } from './bottle.js';
import { wordTexture, towelTextures, sandTextures, peelTextures, fleshTexture } from './textures.js';

const lerp = THREE.MathUtils.lerp;
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const clamp01 = (t) => Math.min(1, Math.max(0, t));

function sandHeight(x, z) {
  // flat beach in front, sloping into the sea behind the towel, soft wind ripples
  const slope = z < -2.5 ? -Math.pow((-2.5 - z) / 7, 1.4) * 1.1 : 0;
  const ripple = Math.sin(x * 2.1 + z * 0.6) * 0.012 + Math.sin(x * 0.7 - z * 1.3) * 0.02;
  const dune = Math.sin(x * 0.18 + 1.2) * Math.cos(z * 0.22) * 0.12 * clamp01((z + 1) / 6);
  return slope + ripple + dune;
}

export function createScene(canvas, { onReady, shot } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: !!shot });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, shot ? 2 : 1.75));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.95;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 20000);

  // --- sun + sky
  const sun = new THREE.Vector3();
  const elevation = 32, azimuth = 120;
  const phi = THREE.MathUtils.degToRad(90 - elevation), theta = THREE.MathUtils.degToRad(azimuth);
  sun.setFromSphericalCoords(1, phi, theta);

  // custom gradient sky: deep summer blue overhead, hazy near the horizon, soft glow toward the sun
  function makeSky() {
    const mat = new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false,
      uniforms: {
        zenith: { value: new THREE.Color(0x2f74b8) }, mid: { value: new THREE.Color(0x86b9df) },
        horizon: { value: new THREE.Color(0xdde8ef) }, below: { value: new THREE.Color(0xc9d9e2) },
        glow: { value: new THREE.Color(0xfff1d6) }, sunDir: { value: sun.clone() },
      },
      vertexShader: 'varying vec3 vDir; void main(){ vDir = normalize(position); vec4 p = projectionMatrix * modelViewMatrix * vec4(position,1.); gl_Position = p.xyww; }',
      fragmentShader: `uniform vec3 zenith, mid, horizon, below, glow, sunDir; varying vec3 vDir;
        void main(){
          float h = vDir.y;
          vec3 c = h > 0. ? mix(horizon, mid, smoothstep(0., .16, h)) : below;
          c = h > 0. ? mix(c, zenith, smoothstep(.16, .7, h)) : c;
          float s = max(dot(normalize(vDir), normalize(sunDir)), 0.);
          c += glow * (pow(s, 8.) * .35 + pow(s, 600.) * 6.);
          gl_FragColor = vec4(c, 1.);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    });
    const m = new THREE.Mesh(new THREE.SphereGeometry(9000, 48, 24), mat);
    m.frustumCulled = false;
    return m;
  }
  const sky = makeSky();
  scene.add(sky);

  // environment lighting baked from the same sky + a warm sand floor, so reflections match
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = new THREE.Scene();
  const skyEnv = makeSky(); skyEnv.scale.setScalar(0.05);
  envScene.add(skyEnv);
  const ground = new THREE.Mesh(new THREE.SphereGeometry(400, 32, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xb89a74, side: THREE.BackSide }));
  envScene.add(ground);
  scene.environment = pmrem.fromScene(envScene, 0.03).texture;
  scene.environmentIntensity = 1.0;

  const sunLight = new THREE.DirectionalLight(0xfff0d8, 2.8);
  sunLight.position.copy(sun).multiplyScalar(30);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.set(2048, 2048);
  const sc = sunLight.shadow.camera;
  sc.left = -4; sc.right = 4; sc.top = 4; sc.bottom = -4; sc.near = 1; sc.far = 80;
  sunLight.shadow.bias = -0.0004; sunLight.shadow.normalBias = 0.02; sunLight.shadow.radius = 4;
  scene.add(sunLight);
  const fill = new THREE.HemisphereLight(0xbfd8f2, 0xc49a6c, 0.3);
  scene.add(fill);

  // --- sea
  const waterNormals = new THREE.TextureLoader().load('/tex/waternormals.jpg', (t) => { t.wrapS = t.wrapT = THREE.RepeatWrapping; });
  const water = new Water(new THREE.PlaneGeometry(10000, 10000), {
    textureWidth: 512, textureHeight: 512, waterNormals, sunDirection: sun.clone(),
    sunColor: 0xfff2dd, waterColor: 0x0d4f78, distortionScale: 2.0, fog: false,
  });
  water.rotation.x = -Math.PI / 2;
  water.position.y = -0.55;
  water.material.uniforms.size.value = 3.2;
  scene.add(water);

  // --- sand
  const sandGeo = new THREE.PlaneGeometry(70, 40, 280, 200);
  sandGeo.rotateX(-Math.PI / 2);
  sandGeo.translate(0, 0, 8);
  const sp = sandGeo.attributes.position;
  for (let i = 0; i < sp.count; i++) sp.setY(i, sandHeight(sp.getX(i), sp.getZ(i)));
  sandGeo.computeVertexNormals();
  const sandTex = sandTextures(renderer);
  const sand = new THREE.Mesh(sandGeo, new THREE.MeshStandardMaterial({ map: sandTex.map, bumpMap: sandTex.bump, bumpScale: 0.6, roughness: 0.97, color: 0xf4e3c6 }));
  sand.receiveShadow = true;
  scene.add(sand);

  // --- towel (draped, with a soft bunched ridge at the back like it was dropped there)
  const towelTex = towelTextures(renderer);
  const tGeo = new THREE.PlaneGeometry(4.4, 3.0, 220, 150);
  tGeo.rotateX(-Math.PI / 2);
  const tp = tGeo.attributes.position;
  for (let i = 0; i < tp.count; i++) {
    const x = tp.getX(i), z = tp.getZ(i);
    const ridge = Math.exp(-Math.pow((z + 1.05) / 0.22, 2)) * 0.16 * (0.7 + 0.3 * Math.sin(x * 2.3));
    const folds = Math.sin(x * 3.1 + z * 0.8) * 0.018 + Math.sin(x * 7.3 - z * 2.1) * 0.006 + Math.sin(z * 5 + x) * 0.01;
    const edgeCurl = Math.pow(Math.max(0, Math.abs(x) - 1.9) / 0.3, 2) * 0.03;
    tp.setY(i, sandHeight(x + 0.1, z + 0.1) + 0.05 + ridge + folds + edgeCurl);
  }
  tGeo.computeVertexNormals();
  const towel = new THREE.Mesh(tGeo, new THREE.MeshPhysicalMaterial({
    map: towelTex.map, bumpMap: towelTex.bump, bumpScale: 0.8, roughness: 0.92,
    sheen: 1, sheenRoughness: 0.6, sheenColor: new THREE.Color(0xffffff), side: THREE.DoubleSide,
  }));
  towel.rotation.y = 0.12;
  towel.position.set(0.1, 0, 0.1);
  towel.receiveShadow = true; towel.castShadow = true;
  scene.add(towel);

  // fringe on the two short ends
  const fringeGeo = new THREE.CylinderGeometry(0.008, 0.006, 0.16, 5);
  fringeGeo.rotateX(Math.PI / 2);
  const fringe = new THREE.InstancedMesh(fringeGeo, new THREE.MeshStandardMaterial({ color: 0xe9ddc6, roughness: 1 }), 2 * 60);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
  let k = 0;
  for (const side of [-1, 1]) for (let i = 0; i < 60; i++) {
    const x = -2.15 + (i / 59) * 4.3;
    const z = side * 1.58;
    e.set(0, (Math.random() - 0.5) * 0.5, 0);
    q.setFromEuler(e);
    m4.compose(new THREE.Vector3(x, 0.015, z), q, new THREE.Vector3(1, 1, 1));
    fringe.setMatrixAt(k++, m4);
  }
  fringe.castShadow = true;
  towel.add(fringe);

  // --- oranges
  const peel = peelTextures();
  const peelMat = new THREE.MeshPhysicalMaterial({ map: peel.map, bumpMap: peel.bump, bumpScale: 1.2, roughness: 0.55, clearcoat: 0.35, clearcoatRoughness: 0.4 });
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x4f6b2c, roughness: 0.6, side: THREE.DoubleSide });

  function orange(r) {
    const g = new THREE.Group();
    const geo = new THREE.SphereGeometry(r, 96, 64);
    geo.scale(1, 0.93, 1);
    const m = new THREE.Mesh(geo, peelMat); m.castShadow = true; m.receiveShadow = true; g.add(m);
    const nub = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.026, 0.03, 12), new THREE.MeshStandardMaterial({ color: 0x6b5b2e, roughness: 0.8 }));
    nub.position.y = r * 0.93; g.add(nub);
    const leafShape = new THREE.Shape();
    leafShape.moveTo(0, 0); leafShape.quadraticCurveTo(0.08, 0.05, 0.2, 0); leafShape.quadraticCurveTo(0.08, -0.05, 0, 0);
    const leaf = new THREE.Mesh(new THREE.ShapeGeometry(leafShape, 12), leafMat);
    leaf.rotation.set(-1.2, 0.4, 0.2); leaf.position.set(0.01, r * 0.93 + 0.01, 0); leaf.castShadow = true;
    g.add(leaf);
    return g;
  }
  const o1 = orange(0.34);
  o1.position.set(-0.95, 0.36, 0.25); o1.rotation.set(0.15, 0.6, -0.1);
  scene.add(o1);
  const o2 = orange(0.26);
  o2.position.set(-1.45, 0.28, 0.75); o2.rotation.set(-0.3, 2, 0.2);
  scene.add(o2);

  // half orange, cut face toward camera
  const half = new THREE.Group();
  const hr = 0.3;
  const hemi = new THREE.Mesh(new THREE.SphereGeometry(hr, 96, 48, 0, Math.PI * 2, 0, Math.PI / 2), peelMat);
  hemi.castShadow = true;
  const face = new THREE.Mesh(new THREE.CircleGeometry(hr, 96), new THREE.MeshPhysicalMaterial({ map: fleshTexture(), roughness: 0.35, clearcoat: 0.8, clearcoatRoughness: 0.15, transmission: 0.0 }));
  face.rotation.x = Math.PI / 2;
  half.add(hemi, face);
  half.rotation.set(-1.25, 0.2, 0.1);
  half.position.set(0.95, 0.3, 0.45);
  scene.add(half);

  // --- bottle
  const bottle = createBottle(renderer);
  const bottleRig = new THREE.Group();
  bottleRig.add(bottle);
  bottle.position.y = 0; // base at rig origin
  scene.add(bottleRig);

  // --- big word behind the bottle (sits in the scene so the sea and bottle overlap it for real)
  const wordMat = new THREE.MeshBasicMaterial({ map: wordTexture('NORDE'), transparent: true, depthWrite: false, toneMapped: false, opacity: 0.96 });
  const word = new THREE.Mesh(new THREE.PlaneGeometry(9, 2.25), wordMat);
  scene.add(word);

  // --- keyframes
  const K = {
    hero: { cam: new THREE.Vector3(0, 1.55, 8.4), tgt: new THREE.Vector3(0, 1.5, 0), bPos: new THREE.Vector3(0, 0.32, 2.6), bRotY: -0.35, bRotZ: -0.16 },
    prod: { cam: new THREE.Vector3(1.6, 1.55, 6.2), tgt: new THREE.Vector3(1.25, 0.95, 0), bPos: new THREE.Vector3(0, 0.05, 0), bRotY: 0.28 - Math.PI * 2, bRotZ: 0 },
  };
  let mobile = false;
  function setLayout(w, h) {
    mobile = w < 820;
    if (mobile) {
      K.hero.cam.set(0, 1.6, 12.4); K.hero.tgt.set(0, 1.05, 0);
      K.prod.cam.set(0.3, 2.1, 9.2); K.prod.tgt.set(0.1, 0.75, 0);
    } else {
      K.hero.cam.set(0, 1.55, 8.6); K.hero.tgt.set(0, 1.36, 0);
      K.prod.cam.set(1.7, 1.75, 7.6); K.prod.tgt.set(1.45, 1.05, 0);
    }
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    // fit the word to the visible width at its depth
    const dist = (mobile ? K.hero.cam.z : K.hero.cam.z) - 0.4;
    const visW = 2 * dist * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect;
    word.scale.setScalar(Math.min(1, (visW * 0.94) / 9));
  }

  const state = { progress: 0, target: 0, mx: 0, my: 0, smx: 0, smy: 0, running: true };
  const tmpCam = new THREE.Vector3(), tmpTgt = new THREE.Vector3();
  const clock = new THREE.Clock();

  function frame() {
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;
    state.progress += (state.target - state.progress) * (shot ? 1 : Math.min(1, dt * 6));
    state.smx += (state.mx - state.smx) * Math.min(1, dt * 3);
    state.smy += (state.my - state.smy) * Math.min(1, dt * 3);
    const p = ease(clamp01(state.progress));

    tmpCam.lerpVectors(K.hero.cam, K.prod.cam, p);
    tmpTgt.lerpVectors(K.hero.tgt, K.prod.tgt, p);
    tmpCam.x += state.smx * 0.25; tmpCam.y += -state.smy * 0.12;
    camera.position.copy(tmpCam);
    camera.lookAt(tmpTgt);

    // bottle: floats in the hero, spins once as it drops, lands upright on the towel
    const bob = (1 - p) * Math.sin(t * 1.3) * 0.05;
    bottleRig.position.lerpVectors(K.hero.bPos, K.prod.bPos, p);
    bottleRig.position.y += bob;
    bottleRig.rotation.y = lerp(K.hero.bRotY, K.prod.bRotY, p) + (1 - p) * Math.sin(t * 0.6) * 0.12 + state.smx * 0.15 * (1 - p * 0.5);
    bottleRig.rotation.z = lerp(K.hero.bRotZ, K.prod.bRotZ, p) + (1 - p) * Math.sin(t * 0.9) * 0.025;
    bottleRig.rotation.x = (1 - p) * state.smy * 0.08;

    // word rises and fades as we leave the hero
    const wp = clamp01(state.progress / 0.45);
    word.position.set(0, (mobile ? 2.05 : 1.62) + wp * 1.4, 0.4);
    wordMat.opacity = 0.96 * (1 - wp);
    word.visible = wordMat.opacity > 0.01;
    word.lookAt(camera.position.x * 0.2, word.position.y, camera.position.z);

    water.material.uniforms.time.value += dt * 0.35;
    renderer.render(scene, camera);
  }

  function loop() {
    if (state.running) frame();
    raf = requestAnimationFrame(loop);
  }
  let raf;

  function resize() {
    const w = canvas.clientWidth || window.innerWidth, h = canvas.clientHeight || window.innerHeight;
    renderer.setSize(w, h, false);
    setLayout(w, h);
  }
  window.addEventListener('resize', resize);
  resize();

  // warm up, then start
  renderer.compile(scene, camera);
  if (!shot) loop();
  onReady && onReady();

  return {
    setProgress(v) { state.target = v; },
    setPointer(x, y) { state.mx = x; state.my = y; },
    setRunning(v) { state.running = v; if (v) clock.getDelta(); },
    renderNow(prog, cam, tgt) {
      state.target = state.progress = prog;
      frame();
      if (cam) { camera.position.copy(cam); camera.lookAt(tgt); renderer.render(scene, camera); }
    },
    renderer, camera, scene, bottleRig, water,
  };
}
