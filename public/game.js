import * as THREE from "three";
import { Reflector } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/objects/Reflector.js";

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x17191b);

const statusEl = document.getElementById("status");
const roomEl = document.getElementById("room");
const enterButton = document.getElementById("enterVR");

const camera = new THREE.PerspectiveCamera(
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
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
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
  const mirror = new Reflector(new THREE.PlaneGeometry(3.8, 3.1), {
    clipBias: 0.003,
    textureWidth: 512,
    textureHeight: 512,
    color: 0xc5d0d8
  });
  mirror.position.set(0, 2, 6.86);
  mirror.rotation.y = Math.PI;
  scene.add(mirror);
} catch (error) {
  console.warn("Mirror could not load:", error);
  box("Mirror fallback", 0, 2, 6.86, 3.8, 3.1, 0.05, material(0x66727d, 0.15));
}

// BACKROOMS CORRIDOR
const yellowWall = material(0xc5b66e);
const yellowFloor = material(0x9d8d4d);
const yellowCeiling = material(0xb5a45d);

box("Backrooms floor", 0, -0.08, -11, 7, 0.15, 9, yellowFloor);
box("Backrooms ceiling", 0, 3.8, -11, 7, 0.15, 9, yellowCeiling);
box("Backrooms left", -3.5, 1.9, -11, 0.15, 3.8, 9, yellowWall);
box("Backrooms right", 3.5, 1.9, -11, 0.15, 3.8, 9, yellowWall);
box("Backrooms end", 0, 1.9, -15.5, 7, 3.8, 0.15, yellowWall);
box("Short wall A", -1.8, 1.3, -10, 0.15, 2.6, 2, yellowWall);
box("Short wall B", 1.8, 1.3, -13, 0.15, 2.6, 2, yellowWall);

const lightMat = new THREE.MeshBasicMaterial({ color: 0xfff6cf });
for (const z of [-8.5, -11, -13.5]) {
  const lamp = new THREE.Mesh(
    new THREE.BoxGeometry(1.7, 0.06, 0.55),
    lightMat
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

// GRINNER DISPLAY
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

// PLAYER AVATARS
const players = new Map();
let myId = null;

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

  // Name tag above each avatar
  const tagCanvas = document.createElement("canvas");
  tagCanvas.width = 512;
  tagCanvas.height = 128;

  const tagTexture = new THREE.CanvasTexture(tagCanvas);
  const tagMaterial = new THREE.SpriteMaterial({
    map: tagTexture,
    transparent: true,
    depthTest: false
  });

  const nameTag = new THREE.Sprite(tagMaterial);
  nameTag.position.set(0, 2.05, 0);
  nameTag.scale.set(1.7, 0.42, 1);
  group.add(nameTag);

  group.userData.id = id;
  group.userData.playerMaterial = playerMat;
  group.userData.tagCanvas = tagCanvas;
  group.userData.tagTexture = tagTexture;

  scene.add(group);
  players.set(id, group);
  return group;
}

function updateNameTag(avatar, player) {
  const canvas = avatar.userData.tagCanvas;
  const texture = avatar.userData.tagTexture;
  if (!canvas || !texture) return;

  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  if (player.isOwner) {
    ctx.font = "bold 34px Arial";
    ctx.fillStyle = "#ff3030";
    ctx.fillText("[OWNER]", 256, 35);
  }

  if (player.role === "monster") {
    ctx.font = "bold 32px Arial";
    ctx.fillStyle = "#ff5555";
    ctx.fillText("MONSTER", 256, player.isOwner ? 72 : 35);
  }

  ctx.font = "bold 42px Arial";
  ctx.fillStyle = "#ffffff";
  ctx.fillText(
    String(player.name || "Player").slice(0, 18),
    256,
    player.isOwner || player.role === "monster" ? 103 : 64
  );

  texture.needsUpdate = true;
}

function updatePlayers(list) {
  const seen = new Set();

  for (const p of list || []) {
    if (p.id === myId) continue;
    seen.add(p.id);

    let avatar = players.get(p.id);
    if (!avatar) avatar = createPlayer(p.id, p.color);

    avatar.position.set(p.x || 0, p.y || 0, p.z || 0);

    if (p.role === "monster") {
      avatar.userData.playerMaterial.color.set(0xe8e0dc);
    } else {
      avatar.userData.playerMaterial.color.set(p.color || "#a9d6a0");
    }

    updateNameTag(avatar, p);
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
let lastMoveSent = 0;
let isOwner = false;

function sendMessage(data) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(data));
    return true;
  }
  statusEl.textContent = "Not connected to the server";
  return false;
}

function connectSocket() {
  const scheme = location.protocol === "https:" ? "wss:" : "ws:";
  ws = new WebSocket(`${scheme}//${location.host}`);

  ws.addEventListener("open", () => {
    statusEl.textContent = "Connected to game server";
  });

  ws.addEventListener("message", event => {
    let data;

    try {
      data = JSON.parse(event.data);
    } catch {
      return;
    }

    if (data.type === "welcome") {
      myId = data.id;
    }

    if (data.type === "admin-auth-ok") {
      isOwner = true;
      ownerHud.style.display = "block";
      statusEl.textContent = "OWNER access granted";
      adminLoginButton.textContent = "OWNER VERIFIED";
    }

    if (data.type === "admin-success") {
      statusEl.textContent = data.message || "Admin action accepted";
    }

    if (data.type === "admin-error") {
      statusEl.textContent = data.message || "Admin action rejected";
    }

    if (data.type === "movement-rejected") {
      statusEl.textContent = data.reason || "Movement rejected by server";
    }

    if (data.type === "state") {
      roomEl.textContent =
        `ROOM: ${data.count ?? 0} / ${data.slots ?? 12}`;

      statusEl.textContent =
        `Lobby • ${data.map || "Waiting for players"}`;

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

// OWNER HUD
const ownerHud = document.createElement("div");
ownerHud.textContent = "[OWNER] gamingforfun69";

Object.assign(ownerHud.style, {
  display: "none",
  position: "fixed",
  top: "12px",
  right: "12px",
  zIndex: "10000",
  color: "#ff3030",
  background: "#151515",
  padding: "8px 12px",
  font: "bold 15px Arial",
  borderRadius: "8px",
  pointerEvents: "none"
});

document.body.appendChild(ownerHud);

// ADMIN PANEL
const adminPanel = document.createElement("div");

Object.assign(adminPanel.style, {
  position: "fixed",
  right: "12px",
  bottom: "58px",
  zIndex: "10000",
  display: "none",
  background: "rgba(15,18,22,.96)",
  color: "white",
  padding: "12px",
  borderRadius: "10px",
  font: "14px Arial",
  maxWidth: "230px",
  lineHeight: "2"
});

adminPanel.innerHTML = `
  <b style="color:#ff4040">THE GRINNER • ADMIN</b>
  <br>
  <button id="ownerLogin">OWNER LOGIN</button>
  <br>
  <button data-admin="becomeMonster">BECOME MONSTER</button>
  <br>
  <button data-admin="returnPlayer">RETURN TO PLAYER</button>
  <br>
  <button data-admin="startRound">START ROUND</button>
  <br>
  <button data-admin="endRound">END ROUND</button>
  <br>
  <select id="adminMap">
    <option>Yellow Hall</option>
    <option>Abandoned School</option>
    <option>Red Tunnels</option>
  </select>
  <button id="changeMap">CHANGE MAP</button>
`;

document.body.appendChild(adminPanel);

const adminToggle = document.createElement("button");
adminToggle.textContent = "ADMIN";

Object.assign(adminToggle.style, {
  position: "fixed",
  right: "12px",
  bottom: "12px",
  zIndex: "10001",
  padding: "9px 14px",
  background: "#292929",
  color: "white",
  border: "1px solid #777",
  borderRadius: "8px"
});

document.body.appendChild(adminToggle);

adminToggle.addEventListener("click", () => {
  adminPanel.style.display =
    adminPanel.style.display === "none" ? "block" : "none";
});

const adminLoginButton = adminPanel.querySelector("#ownerLogin");

adminLoginButton.addEventListener("click", () => {
  const token = prompt("Enter your OWNER token:");

  if (!token) return;

  sendMessage({
    type: "admin-auth",
    token
  });
});

adminPanel.querySelectorAll("[data-admin]").forEach(button => {
  button.addEventListener("click", () => {
    if (!isOwner) {
      statusEl.textContent = "OWNER login required";
      return;
    }

    sendMessage({
      type: "admin",
      action: button.dataset.admin
    });
  });
});

adminPanel.querySelector("#changeMap").addEventListener("click", () => {
  if (!isOwner) {
    statusEl.textContent = "OWNER login required";
    return;
  }

  sendMessage({
    type: "admin",
    action: "setMap",
    map: adminPanel.querySelector("#adminMap").value
  });
});

// VOTING
function sendVote(choice) {
  sendMessage({ type: "vote", choice });
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
    statusEl.textContent =
      "WebXR unavailable. Open this in Meta Quest Browser.";
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
      optionalFeatures: [
        "local-floor",
        "bounded-floor",
        "dom-overlay"
      ],
      domOverlay: { root: document.body }
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

// GAME LOOP
renderer.setAnimationLoop(() => {
  const now = performance.now();

  grinner.rotation.y = Math.sin(now * 0.00025) * 0.12;

  if (
    ws &&
    ws.readyState === WebSocket.OPEN &&
    now - lastMoveSent > 100
  ) {
    const position = renderer.xr.isPresenting
      ? renderer.xr.getCamera().position
      : camera.position;

    sendMessage({
      type: "move",
      x: position.x,
      y: position.y,
      z: position.z
    });

    lastMoveSent = now;
  }

  renderer.render(scene, camera);
});

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
