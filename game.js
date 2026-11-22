import * as THREE from "three";

const statusEl = document.getElementById("status");
const playersEl = document.getElementById("players");
const mapEl = document.getElementById("mapName");
const errorEl = document.getElementById("error");

function showError(message) {
  errorEl.style.display = "block";
  errorEl.textContent = "GAME ERROR: " + message;
  statusEl.textContent = "Game failed to start";
}

let scene, camera, renderer;
try {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x77715d);
  scene.fog = new THREE.Fog(0x77715d, 18, 55);

  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(0, 1.65, 5);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;
  renderer.xr.setReferenceSpaceType("local-floor");
  document.body.appendChild(renderer.domElement);

  scene.add(new THREE.HemisphereLight(0xe8e0c5, 0x332b20, 2.2));
  const sun = new THREE.DirectionalLight(0xffffff, 1.7);
  sun.position.set(4, 9, 5);
  scene.add(sun);

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(50, 50),
    new THREE.MeshStandardMaterial({ color: 0x625d43, roughness: 1 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0;
  scene.add(floor);

  const wallMat = new THREE.MeshStandardMaterial({ color: 0xb8ae72, roughness: 1 });
  function wall(x, y, z, w, h, d) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);
    mesh.position.set(x, y, z);
    scene.add(mesh);
  }
  wall(0, 2, -10, 20, 4, 0.5);
  wall(-10, 2, 0, 0.5, 4, 20);
  wall(10, 2, 0, 0.5, 4, 20);
  wall(0, 4, 0, 20, 0.35, 20);

  // Lobby map voting boards.
  const boardColors = [0xd4bd55, 0x74839a, 0x873e3e];
  const boardNames = ["YELLOW HALL", "ABANDONED SCHOOL", "RED TUNNELS"];
  const boards = [];
  for (let i = 0; i < 3; i++) {
    const board = new THREE.Mesh(
      new THREE.BoxGeometry(2.3, 1.35, 0.12),
      new THREE.MeshStandardMaterial({ color: boardColors[i], roughness: 0.85 })
    );
    board.position.set((i - 1) * 3.2, 1.8, -7.8);
    scene.add(board);
    boards.push(board);
    const frame = new THREE.Mesh(
      new THREE.BoxGeometry(2.45, 1.5, 0.08),
      new THREE.MeshStandardMaterial({ color: 0x29251e })
    );
    frame.position.set((i - 1) * 3.2, 1.8, -7.9);
    scene.add(frame);
    board.position.z = -7.82;
  }

  // Simple Grinner display model, intentionally non-graphic.
  const monster = new THREE.Group();
  const pale = new THREE.MeshStandardMaterial({ color: 0xf1eee8, roughness: 0.9 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x100d0d });
  const red = new THREE.MeshStandardMaterial({ color: 0x851c24 });
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.42, 0.8, 4, 8), pale);
  torso.position.y = 1.15;
  monster.add(torso);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.48, 20, 16), pale);
  head.position.y = 2.05;
  monster.add(head);
  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 10), dark);
  eye.position.set(-0.18, 2.13, 0.43);
  monster.add(eye);
  const eyeDot = new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 8), red);
  eyeDot.position.set(-0.18, 2.13, 0.515);
  monster.add(eyeDot);
  const otherEye = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 10), red);
  otherEye.position.set(0.2, 2.12, 0.42);
  monster.add(otherEye);
  const smile = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.075, 0.06), dark);
  smile.position.set(0.02, 1.89, 0.45);
  monster.add(smile);
  monster.position.set(0, 0, -5.5);
  scene.add(monster);

  // Decorative computer prop.
  const desk = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.8, 0.7), new THREE.MeshStandardMaterial({ color: 0x37342b }));
  desk.position.set(-5.5, 0.4, -5);
  scene.add(desk);
  const screen = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.72, 0.08), new THREE.MeshStandardMaterial({ color: 0x263b3a, emissive: 0x102323 }));
  screen.position.set(-5.5, 1.18, -5.28);
  scene.add(screen);

  statusEl.textContent = "Lobby loaded";
} catch (err) {
  showError(err?.stack || err?.message || String(err));
  throw err;
}

// Native WebSocket client, matching the server's `ws` package.
let socket = null;
let myId = null;
const remotePlayers = new Map();
const wsProtocol = location.protocol === "https:" ? "wss:" : "ws:";
try {
  socket = new WebSocket(`${wsProtocol}//${location.host}`);
  socket.addEventListener("open", () => { statusEl.textContent = "Connected to lobby"; });
  socket.addEventListener("message", event => {
    let msg;
    try { msg = JSON.parse(event.data); } catch { return; }
    if (msg.type === "welcome") myId = msg.id;
    if (msg.type === "state") {
      playersEl.textContent = `ROOM: ${msg.count} / ${msg.slots}`;
      mapEl.textContent = `MAP: ${(msg.currentMap || "Yellow Hall").toUpperCase()}`;
      const alive = new Set();
      for (const p of msg.players || []) {
        if (p.id === myId) continue;
        alive.add(p.id);
        if (!remotePlayers.has(p.id)) {
          const material = new THREE.MeshStandardMaterial({ color: p.color || 0x777777 });
          const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.27, 0.55, 3, 7), material);
          body.position.y = 1;
          const avatar = new THREE.Group();
          avatar.add(body);
          scene.add(avatar);
          remotePlayers.set(p.id, avatar);
        }
        const avatar = remotePlayers.get(p.id);
        avatar.position.set(p.x, 0, p.z);
        avatar.children[0].material.color.set(p.color || "#777777");
      }
      for (const [id, avatar] of remotePlayers) {
        if (!alive.has(id)) {
          scene.remove(avatar);
          remotePlayers.delete(id);
        }
      }
    }
  });
  socket.addEventListener("close", () => { statusEl.textContent = "Offline — lobby still visible"; });
  socket.addEventListener("error", () => { statusEl.textContent = "Server connection unavailable — lobby still visible"; });
} catch (err) {
  statusEl.textContent = "Offline — lobby still visible";
}

const maps = ["Yellow Hall", "Abandoned School", "Red Tunnels"];
let mapIndex = 0;
document.getElementById("vote").addEventListener("click", () => {
  const choice = maps[mapIndex];
  if (socket && socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type: "vote", choice }));
  document.getElementById("vote").textContent = "VOTED: " + choice.toUpperCase();
  mapIndex = (mapIndex + 1) % maps.length;
});

document.getElementById("enterVR").addEventListener("click", async () => {
  try {
    if (!navigator.xr) {
      statusEl.textContent = "WebXR unavailable — open this page in Quest Browser";
      return;
    }
    const supported = await navigator.xr.isSessionSupported("immersive-vr");
    if (!supported) {
      statusEl.textContent = "Immersive VR is not supported by this browser";
      return;
    }
    const session = await navigator.xr.requestSession("immersive-vr", {
      optionalFeatures: ["local-floor", "bounded-floor"]
    });
    await renderer.xr.setSession(session);
    statusEl.textContent = "VR connected";
  } catch (err) {
    showError(err?.message || String(err));
  }
});

const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  const t = clock.getElapsedTime();
  monster.rotation.y = Math.sin(t * 0.25) * 0.08;
  renderer.render(scene, camera);
});

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
