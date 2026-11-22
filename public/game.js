import * as THREE from "three";
import { Reflector } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/objects/Reflector.js";

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x17191b);

const statusEl = document.getElementById("status");
const roomEl = document.getElementById("room");
const enterButton = document.getElementById("enterVR");const camera = new THREE.PerspectiveCamera(
  70, window.innerWidth / window.innerHeight, 0.1, 100
);
camera.position.set(0, 1.6, 3);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.xr.enabled = true;
renderer.xr.setReferenceSpaceType("local-floor");
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);

scene.add(new THREE.HemisphereLight(0xffffff, 0x777777, 2.2));

const sunlight = new THREE.DirectionalLight(0xffffff, 1.4);
sunlight.position.set(4, 9, 5);
scene.add(sunlight);

function material(color, roughness = 0.85) {
  return new THREE.MeshStandardMaterial({ color, roughness });
}

function box(name, x, y, z, w, h, d, mat) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d), mat
  );
  mesh.name = name;
  mesh.position.set(x, y, z);
  scene.add(mesh);
  return mesh;
}

// WHITE TEST ROOM
const white = material(0xf4f4f4);
const whiteFloor = material(0xffffff);
const whiteWall = material(0xe5e7e9);

box("Test floor", 0, -0.12, 0, 14, 0.2, 14, whiteFloor);
box("Back wall", 0, 2, -7, 14, 4, 0.2, whiteWall);
box("Front wall", 0, 2, 7, 14, 4, 0.2, whiteWall);
box("Left wall", -7, 2, 0, 0.2, 4, 14, whiteWall);
box("Right wall", 7, 2, 0, 0.2, 4, 14, whiteWall);
box("Ceiling", 0, 4.05, 0, 14, 0.15, 14, white);

// MIRROR
try {
  const mirror = new Reflector(
    new THREE.PlaneGeometry(3.8, 3.1),
    {
      clipBias: 0.003,
      textureWidth: 512,
      textureHeight: 512,
      color: 0xc5d0d8
    }
  );
  mirror.position.set(0, 2, 6.86);
  mirror.rotation.y = Math.PI;
  scene.add(mirror);
} catch (error) {
  console.warn("Mirror could not load:", error);
  box("Mirror fallback", 0, 2, 6.86, 3.8, 3.1, 0.05, material(0x66727d, 0.15));
}

// Small yellow Backrooms corridor
const yellowWall = material(0xc5b66e);
const yellowFloor = material(0x9d8d4d);
const yellowCeiling = material(0xb5a45d);

box("Backrooms floor", 0, -0.08, -11, 7, 0.15, 9, yellowFloor);
box("Backrooms ceiling", 0, 3.8, -11, 7, 0.15, 9, yellowCeiling);
box("Backrooms left", -3.5, 1.9, -11, 0.15, 3.8, 9, yellowWall);
box("Backrooms right", 3.5, 1.9, -11, 0.15, 3.8, 9, yellowWall);
box("Backrooms end", 0, 1.9, -15.5, 7, 3.8, 0.15, yellowWall);

// A couple of short side walls make the corridor less empty.
box("Short wall A", -1.8, 1.3, -10, 0.15, 2.6, 2, yellowWall);
box("Short wall B", 1.8, 1.3, -13, 0.15, 2.6, 2, yellowWall);

// Ceiling lights
const lightMat = new THREE.MeshBasicMaterial({ color: 0xfff6cf });
for (const z of [-8.5, -11, -13.5]) {
  const lamp = new THREE.Mesh(
    new THREE.BoxGeometry(1.7, 0.06, 0.55), lightMat
  );
  lamp.position.set(0, 3.68, z);
  scene.add(lamp);
}

// VOTING BOARDS
function makeLabelTexture(label) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#20252a";
  ctx.fillRect(0, 0, 512, 256);
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 48px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, 256, 128);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

const boardNames = [
  "YELLOW HALL",
  "ABANDONED SCHOOL",
  "RED TUNNELS"
];

const boardColors = [0xc4ad58, 0x647b91, 0x874c4c];

for (let i = 0; i < 3; i++) {
  const x = (i - 1) * 4.2;

  box(
    "Voting board", x, 1.55, -5.9,
    2.5, 1.8, 0.18, material(boardColors[i])
  );

  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(2.35, 0.8),
    new THREE.MeshBasicMaterial({ map: makeLabelTexture(boardNames[i]) })
  );
  sign.position.set(x, 1.8, -5.79);
  scene.add(sign);
}

// GRINNER DISPLAY — separate from the player spawn.
const grinner = new THREE.Group();
const pale = material(0xe7e5df);
const dark = material(0x151515);
const red = material(0x8b2028);

const body = new THREE.Mesh(
  new THREE.CapsuleGeometry(0.38, 0.65, 4, 8), pale
);
body.position.y = 1;
grinner.add(body);

const head = new THREE.Mesh(
  new THREE.SphereGeometry(0.43, 18, 14), pale
);
head.position.y = 1.9;
grinner.add(head);

const eye = new THREE.Mesh(
  new THREE.SphereGeometry(0.075, 12, 8), dark
);
eye.position.set(-0.16, 1.98, 0.38);
grinner.add(eye);

const redEye = new THREE.Mesh(
  new THREE.SphereGeometry(0.035, 10, 8), red
);
redEye.position.set(-0.16, 1.98, 0.445);
grinner.add(redEye);

const otherEye = new THREE.Mesh(
  new THREE.SphereGeometry(0.07, 12, 8), dark
);
otherEye.position.set(0.16, 1.98, 0.38);
grinner.add(otherEye);

const mouth = new THREE.Mesh(
  new THREE.BoxGeometry(0.4, 0.07, 0.04), dark
);
mouth.position.set(0, 1.72, 0.4);
grinner.add(mouth);

const leftHand = new THREE.Mesh(
  new THREE.SphereGeometry(0.2, 12, 8), red
);
leftHand.position.set(-0.48, 0.65, 0.05);
grinner.add(leftHand);

const rightHand = leftHand.clone();
rightHand.position.x = 0.48;
grinner.add(rightHand);

grinner.position.set(5.2, 0, -12);
scene.add(grinner);

// PLAYER DUMMIES
const players = new Map();
const dummyMaterial = material(0xa9d6a0);

function createPlayer(id, color = "#a9d6a0") {
  const group = new THREE.Group();
  const playerMat = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.8
  });

  const torso = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.28, 0.48, 4, 8),
    playerMat
  );
  torso.position.y = 0.85;
  group.add(torso);

  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.29, 16, 12),
    playerMat
  );
  head.position.y = 1.55;
  group.add(head);

  const armGeometry = new THREE.CapsuleGeometry(0.11, 0.55, 4, 8);

  const leftArm = new THREE.Mesh(armGeometry, playerMat);
  leftArm.position.set(-0.42, 0.9, 0);
  leftArm.rotation.z = -0.45;
  group.add(leftArm);

  const rightArm = new THREE.Mesh(armGeometry, playerMat);
  rightArm.position.set(0.42, 0.9, 0);
  rightArm.rotation.z = 0.45;
  group.add(rightArm);

  group.userData.id = id;
  scene.add(group);
  players.set(id, group);
  return group;
}

function updatePlayers(list) {
  const seen = new Set();

  for (const p of list || []) {
    if (p.id === myId) continue;
    seen.add(p.id);

    let avatar = players.get(p.id);
    if (!avatar) avatar = createPlayer(p.id, p.color);

    avatar.position.set(p.x || 0, p.y || 0, p.z || 0);
    avatar.rotation.y = 0;
  }

  for (const [id, avatar] of players) {
    if (!seen.has(id)) {
      scene.remove(avatar);
      players.delete(id);
    }
  }
}

// NETWORK
let ws = null;
let myId = null;
let lastMoveSent = 0;

function connectSocket() {
  const scheme = location.protocol === "https:" ? "wss:" : "ws:";
  ws = new WebSocket(`${scheme}//${location.host}`);

  ws.addEventListener("open", () => {
    statusEl.textContent = "Connected to game server";
  });

  ws.addEventListener("message", (event) => {
    let data;
    try {
      data = JSON.parse(event.data);
    } catch {
      return;
    }

    if (data.type === "welcome") {
      myId = data.id;
    }

    if (data.type === "state") {
      roomEl.textContent = `ROOM: ${data.count ?? 0} / ${data.slots ?? 12}`;
      statusEl.textContent = `Lobby • ${data.map || "Waiting for players"}`;
      updatePlayers(data.players);
    }
  });

  ws.addEventListener("close", () => {
    statusEl.textContent = "Disconnected — refresh to reconnect";
  });

  ws.addEventListener("error", () => {
    statusEl.textContent = "Could not connect to game server";
  });
}

connectSocket();

// VOTING — names match the current server.js whitelist.
function sendVote(choice) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: "vote", choice }));
    statusEl.textContent = `Vote sent: ${choice}`;
  } else {
    statusEl.textContent = "Still connecting to server…";
  }
}

document.getElementById("voteForest").addEventListener("click", () => {
  sendVote("Yellow Hall");
});
document.getElementById("voteCaves").addEventListener("click", () => {
  sendVote("Abandoned School");
});
document.getElementById("voteFacility").addEventListener("click", () => {
  sendVote("Red Tunnels");
});

// VR
enterButton.addEventListener("click", async () => {
  if (!navigator.xr) {
    statusEl.textContent = "WebXR unavailable. Open this in Meta Quest Browser.";
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
  } catch (error) {
    console.error(error);
    statusEl.textContent =
      `VR error: ${error.name || "Unknown"} — ${error.message || ""}`;
    enterButton.disabled = false;
    enterButton.textContent = "ENTER VR";
  }
});

renderer.setAnimationLoop(() => {
  const now = performance.now();

  grinner.rotation.y = Math.sin(now * 0.00025) * 0.12;

  // Send the headset position to the server periodically.
  if (
    ws &&
    ws.readyState === WebSocket.OPEN &&
    now - lastMoveSent > 100
  ) {
    const position = renderer.xr.isPresenting
      ? renderer.xr.getCamera().position
      : camera.position;

    ws.send(JSON.stringify({
      type: "move",
      x: position.x,
      y: position.y,
      z: position.z
    }));

    lastMoveSent = now;
  }

  renderer.render(scene, camera);
});

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
 to
