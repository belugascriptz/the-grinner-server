import * as THREE from "three";

const statusEl = document.getElementById("status");
const roomEl = document.getElementById("room");
const enterButton = document.getElementById("enterVR");

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x17191b);
scene.fog = new THREE.Fog(0x17191b, 14, 42);

const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 1.6, 5);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.xr.enabled = true;
renderer.xr.setReferenceSpaceType("local-floor");
document.body.appendChild(renderer.domElement);

scene.add(new THREE.HemisphereLight(0xcbd8e8, 0x29221d, 2.0));
const keyLight = new THREE.DirectionalLight(0xffffff, 1.4);
keyLight.position.set(3, 8, 4);
scene.add(keyLight);

const floorMat = new THREE.MeshStandardMaterial({ color: 0x343638, roughness: 0.95 });
const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), floorMat);
floor.rotation.x = -Math.PI / 2;
floor.position.y = 0;
scene.add(floor);

const wallMat = new THREE.MeshStandardMaterial({ color: 0x55504a, roughness: 0.95 });
function addWall(x, y, z, w, h, d) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);
  mesh.position.set(x, y, z);
  scene.add(mesh);
}
addWall(0, 2.2, -10, 20, 4.4, 0.5);
addWall(-10, 2.2, 0, 0.5, 4.4, 20);
addWall(10, 2.2, 0, 0.5, 4.4, 20);
addWall(0, 4.4, 0, 20, 0.25, 20);

// Physical-looking map voting boards.
const boardColors = [0x416c46, 0x526477, 0x76524a];
const boardNames = ["FOREST", "CAVES", "FACILITY"];
function makeLabelTexture(label) {
  const canvas = document.createElement("canvas");
  canvas.width = 512; canvas.height = 256;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#171717"; ctx.fillRect(0, 0, 512, 256);
  ctx.fillStyle = "#f4f0e8"; ctx.font = "bold 54px Arial";
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText(label, 256, 128);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
for (let i = 0; i < 3; i++) {
  const x = (i - 1) * 4.5;
  const post = new THREE.Mesh(
    new THREE.BoxGeometry(2.4, 2.1, 0.18),
    new THREE.MeshStandardMaterial({ color: boardColors[i], roughness: 0.8 })
  );
  post.position.set(x, 1.75, -7.5);
  scene.add(post);
  const label = new THREE.Mesh(
    new THREE.PlaneGeometry(2.2, 0.9),
    new THREE.MeshBasicMaterial({ map: makeLabelTexture(boardNames[i]) })
  );
  label.position.set(x, 2.15, -7.39);
  scene.add(label);
  const base = new THREE.Mesh(
    new THREE.BoxGeometry(2.8, 0.18, 0.7),
    new THREE.MeshStandardMaterial({ color: 0x242424 })
  );
  base.position.set(x, 0.09, -7.5);
  scene.add(base);
}

// Simple non-graphic Grinner placeholder statue.
const grinner = new THREE.Group();
const pale = new THREE.MeshStandardMaterial({ color: 0xe7e5df, roughness: 0.9 });
const dark = new THREE.MeshStandardMaterial({ color: 0x151515 });
const red = new THREE.MeshStandardMaterial({ color: 0x7d2027 });
const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.38, 0.75, 4, 8), pale);
torso.position.y = 1.05;
grinner.add(torso);
const head = new THREE.Mesh(new THREE.SphereGeometry(0.46, 18, 14), pale);
head.position.y = 2.0;
grinner.add(head);
const eye = new THREE.Mesh(new THREE.SphereGeometry(0.075, 12, 8), dark);
eye.position.set(-0.17, 2.08, 0.405);
grinner.add(eye);
const redDot = new THREE.Mesh(new THREE.SphereGeometry(0.025, 10, 8), red);
redDot.position.set(-0.17, 2.08, 0.47);
grinner.add(redDot);
const smile = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.055, 0.04), dark);
smile.position.set(0.02, 1.82, 0.42);
grinner.add(smile);
grinner.position.set(0, 0, -4.5);
scene.add(grinner);

// WebSocket client matches the server.js protocol in this repository.
let ws = null;
let myId = null;
let currentCount = 0;
function connectSocket() {
  const scheme = location.protocol === "https:" ? "wss:" : "ws:";
  ws = new WebSocket(`${scheme}//${location.host}`);
  ws.addEventListener("open", () => {
    statusEl.textContent = "Connected to game server";
  });
  ws.addEventListener("message", (event) => {
    let data;
    try { data = JSON.parse(event.data); } catch { return; }
    if (data.type === "welcome") myId = data.id;
    if (data.type === "state" || data.type === "welcome") {
      currentCount = data.count ?? currentCount;
      roomEl.textContent = `ROOM: ${currentCount} / ${data.maxPlayers ?? 12}`;
      if (data.phase) statusEl.textContent = `Lobby • ${data.phase}`;
    }
  });
  ws.addEventListener("close", () => {
    statusEl.textContent = "Game server disconnected — refresh to retry";
  });
  ws.addEventListener("error", () => {
    statusEl.textContent = "Could not connect to game server";
  });
}
connectSocket();

function sendVote(choice) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: "vote", choice }));
    statusEl.textContent = `Vote sent: ${choice}`;
  } else {
    statusEl.textContent = "Still connecting to server…";
  }
}
document.getElementById("voteForest").addEventListener("click", () => sendVote("forest"));
document.getElementById("voteCaves").addEventListener("click", () => sendVote("caves"));
document.getElementById("voteFacility").addEventListener("click", () => sendVote("facility"));

// Request the immersive session directly from the user's button press.
// Avoids a second XR request if a session is already active.
enterButton.addEventListener("click", async () => {
  if (!navigator.xr) {
    statusEl.textContent = "WebXR is unavailable in this browser. Use Meta Quest Browser.";
    return;
  }
  if (renderer.xr.isPresenting) {
    statusEl.textContent = "Already in VR.";
    return;
  }
  enterButton.disabled = true;
  enterButton.textContent = "STARTING VR…";
  try {
    const session = await navigator.xr.requestSession("immersive-vr", {
      optionalFeatures: ["local-floor", "bounded-floor"]
    });
    await renderer.xr.setSession(session);
    statusEl.textContent = "VR connected";
    session.addEventListener("end", () => {
      enterButton.disabled = false;
      enterButton.textContent = "ENTER VR";
      statusEl.textContent = "VR session ended";
    }, { once: true });
  } catch (err) {
    console.error("WebXR start failed:", err);
    statusEl.textContent = `VR error: ${err.name || "Unknown"} — ${err.message || "Could not start session"}`;
    enterButton.disabled = false;
    enterButton.textContent = "ENTER VR";
  }
});

renderer.setAnimationLoop(() => {
  grinner.rotation.y = Math.sin(performance.now() * 0.00025) * 0.12;
  renderer.render(scene, camera);
});

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
