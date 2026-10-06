// =====================================================
// 1. DATA: nodes and connections. Add a node here to extend the diagram.
// =====================================================
const NODES = [
  { id: 'user',     label: 'User',          color: 0x38bdf8, pos: [-9,   0,   0],   labelY: 1.9,
    title: 'User', text: 'A person in a browser. Typing a name and pressing a button is the action that starts everything.' },
  { id: 'frontend', label: 'Frontend',      color: 0xa78bfa, pos: [-4.5, 0.8, -1],  labelY: 1.8,
    title: 'Frontend', text: 'HTML, CSS and JavaScript running in the browser. It shows the page and turns user actions into HTTP requests.' },
  { id: 'gate',     label: 'Security Gate', color: 0xfb7185, pos: [0,    0,   0.5], labelY: 2.1,
    title: 'Security Gate', text: 'The entrance to the server (HTTPS, firewall, rate limiting). It decides which requests are allowed in.' },
  { id: 'backend',  label: 'Backend',       color: 0x34d399, pos: [4.5, -0.3, 0],   labelY: 1.7,
    title: 'Backend', text: 'A server program. It validates data, applies the rules, and talks to the database.' },
  { id: 'database', label: 'Database',      color: 0xfbbf24, pos: [9,    0.4, -1],  labelY: 1.8,
    title: 'Database', text: 'Permanent storage for users, posts, orders. Only the backend is allowed to talk to it.' },
];
const CONNECTIONS = [['user', 'frontend'], ['frontend', 'gate'], ['gate', 'backend'], ['backend', 'database']];

// =====================================================
// 2. SCENE SETUP
// =====================================================
const container = document.getElementById('scene');
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(window.devicePixelRatio);
container.appendChild(renderer.domElement);

scene.add(new THREE.AmbientLight(0xffffff, 0.55));
const sun = new THREE.PointLight(0xffffff, 1.3);
sun.position.set(0, 8, 10);
scene.add(sun);

const grid = new THREE.GridHelper(40, 40, 0x1e293b, 0x1e293b);   // developer-style floor
grid.position.y = -2.6;
scene.add(grid);

function resize() {
  const w = container.clientWidth, h = container.clientHeight;
  renderer.setSize(w, h);
  camera.aspect = w / h;
  camera.position.z = Math.max(15, 24 / camera.aspect);          // pull back on narrow screens
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

// =====================================================
// 3. HELPERS
// =====================================================
const short = (s, n) => (s.length > n ? s.slice(0, n - 1) + '…' : s);
const escapeHtml = (s) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Text sprites (flat text that always faces the camera). setLabel redraws the text.
function makeLabel(text, color, w = 4.8) {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 96;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthTest: false }));
  s.scale.set(w, w * 0.1875, 1);
  s.userData.canvas = c;
  setLabel(s, text, color);
  return s;
}
function setLabel(s, text, color = '#e2e8f0') {
  const ctx = s.userData.canvas.getContext('2d');
  ctx.clearRect(0, 0, 512, 96);
  ctx.font = 'bold 38px monospace';
  ctx.textAlign = 'center';
  ctx.fillStyle = color;
  ctx.fillText(text, 256, 60);
  s.material.map.needsUpdate = true;
}

// part(): adds one shape to a model. "glow" parts light up when the node is highlighted.
function part(group, geometry, color, [x, y, z] = [0, 0, 0], glow = true) {
  const m = new THREE.MeshStandardMaterial({ color, emissive: glow ? color : 0x000000, emissiveIntensity: 0.25, roughness: 0.45, metalness: 0.2 });
  const mesh = new THREE.Mesh(geometry, m);
  mesh.position.set(x, y, z);
  group.add(mesh);
  if (glow) (group.userData.mats ||= []).push(m);
  return mesh;
}

// =====================================================
// 4. 3D MODELS: each one is a group of simple shapes
// =====================================================
let screenCanvas, screenTex;   // the browser's screen is drawn on a canvas (see drawScreen)

const MODELS = {
  // A person at a laptop
  user(g, c) {
    part(g, new THREE.CylinderGeometry(0.45, 0.7, 1.3, 24), c, [0, -0.3, 0]);
    part(g, new THREE.SphereGeometry(0.42, 24, 24), c, [0, 0.7, 0]);
    part(g, new THREE.BoxGeometry(1, 0.07, 0.7), 0x94a3b8, [0, -0.7, 0.9], false);
    part(g, new THREE.BoxGeometry(1, 0.65, 0.06), 0x94a3b8, [0, -0.4, 0.6], false).rotation.x = -0.3;
  },
  // A browser window with three dots and a live screen
  frontend(g, c) {
    part(g, new THREE.BoxGeometry(2.6, 1.7, 0.15), c);
    screenCanvas = document.createElement('canvas');
    screenCanvas.width = 512; screenCanvas.height = 288;
    screenTex = new THREE.CanvasTexture(screenCanvas);
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 1.29), new THREE.MeshBasicMaterial({ map: screenTex }));
    screen.position.set(0, -0.1, 0.08);
    g.add(screen);
    [0xf87171, 0xfbbf24, 0x4ade80].forEach((col, i) => part(g, new THREE.SphereGeometry(0.05, 8, 8), col, [-1.1 + i * 0.17, 0.7, 0.08], false));
    part(g, new THREE.CylinderGeometry(0.15, 0.3, 0.5, 16), 0x475569, [0, -1.1, 0], false);
  },
  // Two pillars, a beam, and a see-through energy field
  gate(g, c) {
    [-1.2, 1.2].forEach((x) => part(g, new THREE.CylinderGeometry(0.2, 0.25, 2.4, 16), c, [x, 0, 0]));
    part(g, new THREE.BoxGeometry(2.9, 0.3, 0.4), c, [0, 1.25, 0]);
    const field = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 2.2), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.15, side: THREE.DoubleSide }));
    field.position.y = 0.1;
    g.add(field);
  },
  // A server rack: three units with LEDs and vents
  backend(g, c) {
    for (let i = 0; i < 3; i++) {
      const y = -0.65 + i * 0.62;
      part(g, new THREE.BoxGeometry(2, 0.5, 1.2), c, [0, y, 0]);
      part(g, new THREE.SphereGeometry(0.07, 8, 8), 0x4ade80, [0.75, y, 0.62], false);
      part(g, new THREE.BoxGeometry(0.9, 0.08, 0.02), 0x064e3b, [-0.35, y, 0.61], false);
    }
  },
  // The classic stacked-disks database icon
  database(g, c) {
    for (let i = 0; i < 3; i++) {
      const y = -0.7 + i * 0.7;
      part(g, new THREE.CylinderGeometry(0.95, 0.95, 0.55, 32), c, [0, y, 0]);
      part(g, new THREE.TorusGeometry(0.95, 0.04, 8, 32), 0xfde68a, [0, y + 0.28, 0], false).rotation.x = Math.PI / 2;
    }
  },
};

// =====================================================
// 5. BUILD NODES, CONNECTIONS, PACKET, COOKIE
// =====================================================
const nodeObjects = {};
NODES.forEach((d) => {
  const g = new THREE.Group();
  MODELS[d.id](g, d.color);
  g.position.set(...d.pos);
  const label = makeLabel(d.label);
  label.position.y = d.labelY;
  g.add(label);
  g.traverse((o) => (o.userData.id = d.id));      // so a click knows which node it hit
  scene.add(g);
  nodeObjects[d.id] = { data: d, group: g, basePos: g.position.clone() };
});

const lines = [];
CONNECTIONS.forEach(([a, b]) => {
  const geo = new THREE.BufferGeometry().setFromPoints([nodeObjects[a].basePos, nodeObjects[b].basePos]);
  const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0x475569 }));
  lines.push(line);
  scene.add(line);
});

// The packet: a small "envelope" with a text label showing what it carries
const packet = new THREE.Group();
packet.add(new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.5, 0.1), new THREE.MeshStandardMaterial({ color: 0xf59e0b, emissive: 0xf59e0b, emissiveIntensity: 1 })));
const packetLabel = makeLabel('', '#fbbf24');
packetLabel.position.y = 0.8;
packet.add(packetLabel);
packet.visible = false;
scene.add(packet);

// The session cookie: a golden disc with chocolate chips
const cookie = new THREE.Group();
part(cookie, new THREE.CylinderGeometry(0.4, 0.4, 0.12, 24), 0xd97706).rotation.x = Math.PI / 2;
[[-0.12, 0.1], [0.14, 0.05], [0, -0.18], [-0.2, -0.08]].forEach(([x, y]) => part(cookie, new THREE.SphereGeometry(0.06, 8, 8), 0x451a03, [x, y, 0.08], false));
const cookieLabel = makeLabel('session cookie', '#fbbf24');
cookieLabel.position.y = 0.9;
cookie.add(cookieLabel);
cookie.position.copy(nodeObjects.frontend.basePos).add(new THREE.Vector3(2.2, -1.3, 1));
cookie.visible = false;
scene.add(cookie);

// The browser screen
function drawScreen(line1, line2, color = '#38bdf8') {
  const ctx = screenCanvas.getContext('2d');
  ctx.fillStyle = '#0f172a'; ctx.fillRect(0, 0, 512, 288);
  ctx.fillStyle = '#1e293b'; ctx.fillRect(40, 150, 432, 56);
  ctx.font = '28px monospace';
  ctx.fillStyle = '#94a3b8'; ctx.fillText(line1, 40, 110);
  ctx.fillStyle = color;     ctx.fillText(short(line2, 22), 56, 188);
  screenTex.needsUpdate = true;
}
drawScreen('Enter your name', '> _');

// =====================================================
// 6. SELECTION (click a node -> info card)
// =====================================================
let selectedId = 'user';
let highlightedId = null;     // node lit up by the simulation

function selectNode(id) {
  selectedId = id;
  document.getElementById('info-title').textContent = nodeObjects[id].data.title;
  document.getElementById('info-text').textContent = nodeObjects[id].data.text;
}
selectNode('user');

const raycaster = new THREE.Raycaster();
renderer.domElement.addEventListener('click', (e) => {
  const r = renderer.domElement.getBoundingClientRect();
  const mouse = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  raycaster.setFromCamera(mouse, camera);
  const hits = raycaster.intersectObjects(Object.values(nodeObjects).map((n) => n.group), true);
  if (hits.length) selectNode(hits[0].object.userData.id);
});

// =====================================================
// 7. THE STEPS. buildSteps() uses the visitor's real name.
//    path   = nodes the packet travels through
//    node   = node to highlight (defaults to the end of the path)
//    security = shows the red "Security step" badge
// =====================================================
function buildSteps(name) {
  const safe = escapeHtml(name);
  const tag = short(name, 18);
  return [
    { node: 'user', packet: `"${tag}"`, screen: ['Enter your name', `> ${name}`],
      title: 'You type your name and press Submit',
      desc: 'Everything starts with a human action. For now your name is just a piece of text in the browser\'s memory.',
      code: `name = "${name}"` },

    { path: ['user', 'frontend'], packet: `"${tag}"`, security: true,
      title: 'Frontend checks the input',
      desc: 'The page checks the name before sending it: not empty, not too long. This gives instant feedback, but it is NOT real security. Anyone can skip the browser and send requests directly, so the server must check again.',
      code: `if (name.length < 1 || name.length > 30) showError();\n// passed` },

    { node: 'frontend', packet: 'POST /api/users',
      title: 'The frontend builds an HTTP request',
      desc: 'JavaScript packs the name into a request: a method (POST = "create something"), a path, headers, and a JSON body.',
      code: `POST /api/users HTTP/1.1\nHost: example.com\nContent-Type: application/json\n\n{ "name": "${name}" }` },

    { path: ['frontend', 'gate'], packet: '17 03 03 9f e1 b4 2c', security: true,
      title: 'HTTPS encrypts the request',
      desc: 'Before leaving the browser, the request is encrypted with TLS. Someone spying on the network (public Wi-Fi, a provider) sees only scrambled bytes, never your name.',
      code: `Before: {"name":"${name}"}\nAfter : 17 03 03 00 5a 9f e1 b4 2c 7d ...` },

    { node: 'gate', packet: 'checks passed', security: true,
      title: 'The gate runs security checks',
      desc: 'The gate decrypts the request and checks it: rate limiting (is this a bot sending too many requests?), CORS (does it come from an allowed website?) and a CSRF token (was it really sent by our own form?).',
      code: `rate limit : 3 of 10 per minute  OK\nOrigin     : https://example.com  OK\nCSRF token : valid  OK` },

    { path: ['gate', 'backend'], packet: 'POST /api/users',
      title: 'The request reaches the backend',
      desc: 'The backend program receives the readable request and routes it: POST /api/users runs the "create user" function.',
      code: `app.post('/api/users', createUser);` },

    { node: 'backend', packet: `"${short(safe, 18)}"`, security: true,
      title: 'The server validates and cleans the name',
      desc: 'Never trust the client. The server checks the name again and escapes dangerous characters, so a name like <script>...</script> can never run as code in someone\'s page (this attack is called XSS).',
      code: `input : ${name}\nsafe  : ${safe}` },

    { path: ['backend', 'database'], packet: 'INSERT ... $1', security: true,
      title: 'A safe database query',
      desc: 'The name travels as a parameter, separate from the SQL text. Even if someone typed SQL code as their name, the database treats it as plain data. This stops SQL injection.',
      code: `INSERT INTO users (name)\nVALUES ($1);\n-- $1 = "${safe}"` },

    { node: 'database', packet: 'saved: id 42',
      title: 'The database stores the row',
      desc: 'The name is now saved permanently, in a table, with a new unique id.',
      code: ` id | name\n----+----------\n 42 | ${safe}` },

    { path: ['database', 'backend'], packet: '{ id: 42 }',
      title: 'The database answers',
      desc: 'The database confirms the save and returns the new id to the backend.',
      code: `{ id: 42, name: "${safe}" }` },

    { node: 'backend', packet: '201 + Set-Cookie', security: true,
      title: 'The server creates a session',
      desc: 'The backend generates a long random session ID and remembers on the server that this ID means user 42. It sends only the ID to the browser, inside a cookie.',
      code: `sessions["a8f3...c91"] = { userId: 42 }\n\nHTTP/1.1 201 Created\nSet-Cookie: session=a8f3...c91;\n  HttpOnly; Secure; SameSite=Strict` },

    { path: ['backend', 'gate', 'frontend'], packet: '201 Created',
      title: 'The HTTP response travels back',
      desc: 'The response is encrypted again and travels back through the gate to your browser.',
      code: `HTTP/1.1 201 Created\nContent-Type: application/json\n\n{ "id": 42, "name": "${safe}" }` },

    { node: 'frontend', packet: 'cookie saved', cookie: true, security: true,
      title: 'The browser stores the cookie',
      desc: 'HttpOnly: JavaScript cannot read the cookie, so an attacker\'s script cannot steal it. Secure: it is only sent over HTTPS. SameSite: it is not sent from other websites.',
      code: `Cookie jar for example.com:\n  session=a8f3...c91\n  HttpOnly  Secure  SameSite=Strict` },

    { node: 'frontend', packet: 'done', screen: ['Welcome,', `${name}!`, '#4ade80'],
      title: 'The page updates',
      desc: 'The frontend reads the JSON and updates the screen. On every next request the browser attaches the cookie automatically, so the server knows who you are without asking again.',
      code: `Next request:\nGET /api/me\nCookie: session=a8f3...c91` },
  ];
}

// =====================================================
// 8. ANIMATION OF THE PACKET
// =====================================================
// Packets fly slightly in front of the models so they stay visible.
const stop = (id) => nodeObjects[id].basePos.clone().add(new THREE.Vector3(0, 0.3, 1.7));

let activeMove = null;
function movePacket(fromId, toId, ms) {
  return new Promise((resolve) => {
    activeMove = { from: stop(fromId), to: stop(toId), start: performance.now(), ms, resolve };
  });
}

// =====================================================
// 9. SIMULATION CONTROL (form, Next step, Reset)
// =====================================================
const $ = (id) => document.getElementById(id);
let steps = [], stepIndex = -1, busy = false;

function showStepCard(step, i) {
  $('step-card').classList.remove('hidden');
  $('step-count').textContent = `Step ${i + 1} of ${steps.length}`;
  $('step-badge').classList.toggle('hidden', !step.security);
  $('progress-bar').style.width = `${((i + 1) / steps.length) * 100}%`;
  $('step-title').textContent = step.title;
  $('step-desc').textContent = step.desc;
  $('step-code').textContent = step.code;
}

async function runStep() {
  busy = true;
  $('next-btn').disabled = true;
  const step = steps[stepIndex];
  showStepCard(step, stepIndex);
  setLabel(packetLabel, step.packet, '#fbbf24');
  if (step.screen) drawScreen(step.screen[0], step.screen[1], step.screen[2]);

  const path = step.path || [step.node];
  highlightedId = path.length === 1 ? step.node : null;
  if (stepIndex === 0) packet.position.copy(stop(path[0]));
  packet.visible = true;

  for (let i = 0; i < path.length - 1; i++) await movePacket(path[i], path[i + 1], 1400);
  highlightedId = step.node || path[path.length - 1];
  if (step.cookie) cookie.visible = true;

  busy = false;
  if (stepIndex < steps.length - 1) {
    $('next-btn').disabled = false;
  } else {
    $('next-btn').classList.add('hidden');
  }
}

$('name-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const name = $('name-input').value.trim();
  if (!name) return ($('form-error').textContent = 'Please type a name first.');
  if (name.length > 30) return ($('form-error').textContent = 'Max 30 characters.');
  $('form-error').textContent = '';

  steps = buildSteps(name);
  stepIndex = 0;
  $('name-form').classList.add('hidden');
  $('next-btn').classList.remove('hidden');
  $('reset-btn').classList.remove('hidden');
  runStep();
});

$('next-btn').addEventListener('click', () => {
  if (busy) return;
  stepIndex++;
  runStep();
});

$('reset-btn').addEventListener('click', () => {
  activeMove = null; busy = false; steps = []; stepIndex = -1; highlightedId = null;
  packet.visible = false; cookie.visible = false;
  drawScreen('Enter your name', '> _');
  $('step-card').classList.add('hidden');
  $('next-btn').classList.add('hidden'); $('next-btn').disabled = false;
  $('reset-btn').classList.add('hidden');
  $('name-form').classList.remove('hidden');
  $('name-input').value = ''; $('name-input').focus();
});

// =====================================================
// 10. MAIN LOOP (about 60 times per second)
// =====================================================
let mx = 0, my = 0;
container.addEventListener('pointermove', (e) => {
  const r = container.getBoundingClientRect();
  mx = ((e.clientX - r.left) / r.width - 0.5) * 2;
  my = ((e.clientY - r.top) / r.height - 0.5) * 2;
});

function animate(now) {
  requestAnimationFrame(animate);
  const t = now / 1000;

  Object.values(nodeObjects).forEach(({ data, group, basePos }, i) => {
    group.position.y = basePos.y + Math.sin(t + i) * 0.12;      // float
    group.rotation.y = Math.sin(t * 0.5 + i) * 0.35;            // gentle sway so the 3D shape is visible
    const lit = data.id === highlightedId, sel = data.id === selectedId;
    const glow = lit ? 1.1 : sel ? 0.55 : 0.25, scale = lit ? 1.18 : 1;
    group.userData.mats.forEach((m) => (m.emissiveIntensity += (glow - m.emissiveIntensity) * 0.1));
    group.scale.setScalar(group.scale.x + (scale - group.scale.x) * 0.1);
  });

  if (activeMove) {
    const p = Math.min(1, (now - activeMove.start) / activeMove.ms);
    packet.position.lerpVectors(activeMove.from, activeMove.to, p);
    packet.position.y += Math.sin(p * Math.PI) * 0.7;           // small arc
    if (p === 1) { const done = activeMove.resolve; activeMove = null; done(); }
  }
  packet.rotation.y = Math.sin(t * 3) * 0.4;
  cookie.rotation.y = t;

  camera.position.x += (mx * 2 - camera.position.x) * 0.05;     // mouse parallax
  camera.position.y += (3 - my * 1.5 - camera.position.y) * 0.05;
  camera.lookAt(0, 0, 0);
  renderer.render(scene, camera);
}
requestAnimationFrame(animate);
