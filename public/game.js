
import * as THREE from "three";

// ==========================================
// THE GRINNER VR - GAME CLIENT
// ==========================================

const statusEl = document.getElementById("status");
const roomEl = document.getElementById("room");
const enterButton = document.getElementById("enterVR");

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x090b0d);
scene.fog = new THREE.FogExp2(0x090b0d, 0.027);

const camera = new THREE.PerspectiveCamera(
  70, window.innerWidth / window.innerHeight, 0.05, 100
);

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  powerPreference: "high-performance"
});

renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.setSize(innerWidth, innerHeight);
renderer.xr.enabled = true;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);

const clock = new THREE.Clock();

scene.add(new THREE.HemisphereLight(0x87909b, 0x17100d, 1.0));

const mainLight = new THREE.DirectionalLight(0xb8b3a6, 1.0);
mainLight.position.set(5, 10, 4);
mainLight.castShadow = true;
scene.add(mainLight);

const world = new THREE.Group();
scene.add(world);

// ==========================================
// MATERIALS
// ==========================================

const concrete = new THREE.MeshStandardMaterial({
  color: 0x383a37,
  roughness: 1
});

const darkConcrete = new THREE.MeshStandardMaterial({
  color: 0x202322,
  roughness: 1
});

const metal = new THREE.MeshStandardMaterial({
  color: 0x343b3d,
  metalness: 0.55,
  roughness: 0.75
});

const rustyMetal = new THREE.MeshStandardMaterial({
  color: 0x49312a,
  metalness: 0.25,
  roughness: 1
});

const warningMaterial = new THREE.MeshStandardMaterial({
  color: 0x8c171b,
  emissive: 0x5c080c,
  emissiveIntensity: 1.4
});

// ==========================================
// ROOM BUILDING HELPERS
// ==========================================

function block(parent, material, x, y, z, sx, sy, sz) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(sx, sy, sz),
    material
  );

  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function cylinder(parent, material, x, y, z, radius, height) {
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, height, 12),
    material
  );

  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function addLight(x, y, z, color, intensity, distance) {
  const light = new THREE.PointLight(color, intensity, distance);
  light.position.set(x, y, z);
  world.add(light);
  return light;
}

// ==========================================
// REDESIGNED ABANDONED INDUSTRIAL ROOM
// ==========================================

// Main floor
block(world, concrete, 0, -0.2, 0, 30, 0.4, 30);

// Lower floor panels
for (let x = -12; x <= 12; x += 3) {
  for (let z = -12; z <= 12; z += 3) {
    block(world, darkConcrete, x, 0.005, z, 2.85, 0.025, 2.85);
  }
}

// Main walls
block(world, darkConcrete, 0, 3, -15, 30, 6, 0.5);
block(world, darkConcrete, 0, 3, 15, 30, 6, 0.5);
block(world, darkConcrete, -15, 3, 0, 0.5, 6, 30);
block(world, darkConcrete, 15, 3, 0, 0.5, 6, 30);

// Ceiling beams
for (let z = -12; z <= 12; z += 4) {
  block(world, metal, 0, 5.5, z, 30, 0.22, 0.28);
}

// Side pillars
for (const x of [-12, -8, 8, 12]) {
  for (const z of [-10, -4, 4, 10]) {
    block(world, rustyMetal, x, 2.6, z, 0.45, 5.2, 0.45);
  }
}

// Raised platforms
block(world, rustyMetal, -7, 0.55, -5, 5, 1.1, 3);
block(world, rustyMetal, 7, 0.75, -8, 4, 1.5, 4);
block(world, metal, -8, 1.2, 6, 3, 2.4, 3);
block(world, metal, 8, 0.45, 7, 5, 0.9, 3);

// Platforms have dark tops
block(world, darkConcrete, -7, 1.12, -5, 4.8, 0.06, 2.8);
block(world, darkConcrete, 7, 1.52, -8, 3.8, 0.06, 3.8);
block(world, darkConcrete, -8, 2.42, 6, 2.8, 0.06, 2.8);
block(world, darkConcrete, 8, 0.92, 7, 4.8, 0.06, 2.8);

// Central industrial structure
block(world, metal, 0, 1.1, -5, 3.2, 2.2, 2.5);
block(world, darkConcrete, 0, 2.25, -5, 3.5, 0.15, 2.8);

// Tunnel-like structure
block(world, darkConcrete, -3, 1.5, 11, 0.35, 3, 6);
block(world, darkConcrete, 3, 1.5, 11, 0.35, 3, 6);
block(world, metal, 0, 3.05, 11, 6.4, 0.35, 6);

// Red warning lights
for (const z of [-11, -5, 1, 7, 12]) {
  const glow = new THREE.Mesh(
    new THREE.BoxGeometry(1.1, 0.1, 0.2),
    warningMaterial
  );

  glow.position.set(0, 4.9, z);
  world.add(glow);

  addLight(0, 4.4, z, 0xff2525, 0.65, 7);
}

// Wall lights
for (const z of [-10, -2, 6, 12]) {
  for (const x of [-14.6, 14.6]) {
    block(world, rustyMetal, x, 3.6, z, 0.25, 0.7, 0.7);
    addLight(x * 0.96, 3.6, z, 0xff3830, 0.45, 5);
  }
}

// Random floor debris
for (let i = 0; i < 65; i++) {
  const size = 0.12 + Math.random() * 0.28;

  const debris = new THREE.Mesh(
    new THREE.BoxGeometry(size, size * 0.25, size),
    Math.random() > 0.5 ? rustyMetal : darkConcrete
  );

  debris.position.set(
    (Math.random() - 0.5) * 26,
    0.03,
    (Math.random() - 0.5) * 26
  );

  debris.rotation.y = Math.random() * Math.PI;
  world.add(debris);
}

// ==========================================
// DIRTY CHARACTER TEXTURE
// ==========================================

function makeFurTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;

  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#777568";
  ctx.fillRect(0, 0, 256, 256);

  for (let i = 0; i < 2400; i++) {
    const shade = Math.floor(30 + Math.random() * 120);

    ctx.fillStyle = `rgba(${shade},${shade},${shade},${Math.random() * 0.4})`;

    ctx.beginPath();
    ctx.arc(
      Math.random() * 256,
      Math.random() * 256,
      Math.random() * 4 + 0.5,
      0,
      Math.PI * 2
    );
    ctx.fill();
  }

  for (let i = 0; i < 100; i++) {
    ctx.strokeStyle = "rgba(30,24,20,0.3)";
    ctx.lineWidth = Math.random() * 3 + 1;
    ctx.beginPath();
    ctx.moveTo(Math.random() * 256, Math.random() * 256);
    ctx.lineTo(Math.random() * 256, Math.random() * 256);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

const furTexture = makeFurTexture();

// ==========================================
// CHARACTER MODEL
// ==========================================

function createAvatar(color = "#777568") {
  const group = new THREE.Group();

  const fur = new THREE.MeshStandardMaterial({
    color,
    map: furTexture,
    roughness: 1
  });

  const skin = new THREE.MeshStandardMaterial({
    color: 0x51443d,
    roughness: 1
  });

  const dark = new THREE.MeshStandardMaterial({
    color: 0x211c1b,
    roughness: 1
  });

  const eyeWhite = new THREE.MeshStandardMaterial({
    color: 0xe8dfca
  });

  const pupil = new THREE.MeshStandardMaterial({
    color: 0x090909
  });

  const mouthMaterial = new THREE.MeshStandardMaterial({
    color: 0x100d0d
  });

  const teeth = new THREE.MeshStandardMaterial({
    color: 0xd8d0b9
  });

  function part(geometry, material, x, y, z, sx = 1, sy = 1, sz = 1) {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    mesh.scale.set(sx, sy, sz);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  }

  function sphere(material, x, y, z, sx, sy, sz) {
    return part(
      new THREE.SphereGeometry(1, 20, 16),
      material, x, y, z, sx, sy, sz
    );
  }

  function capsule(material, x, y, z, radius, length, rotation = 0) {
    const mesh = part(
      new THREE.CapsuleGeometry(radius, length, 5, 12),
      material, x, y, z
    );
    mesh.rotation.z = rotation;
    return mesh;
  }

  // Torso
  sphere(fur, 0, 0.98, 0, 0.53, 0.67, 0.43);
  sphere(fur, 0, 1.18, 0.015, 0.62, 0.43, 0.42);
  sphere(fur, 0, 0.83, -0.035, 0.43, 0.43, 0.40);

  // Neck and head
  capsule(fur, 0, 1.48, 0, 0.25, 0.18);
  sphere(fur, 0, 1.77, -0.015, 0.39, 0.39, 0.36);

  // Face
  sphere(dark, 0, 1.86, -0.315, 0.32, 0.105, 0.085);
  sphere(skin, 0, 1.64, -0.325, 0.25, 0.17, 0.13);
  sphere(dark, 0, 1.70, -0.435, 0.105, 0.065, 0.045);

  // Eyes
  sphere(eyeWhite, -0.145, 1.82, -0.345, 0.09, 0.105, 0.055);
  sphere(eyeWhite, 0.145, 1.82, -0.345, 0.09, 0.105, 0.055);
  sphere(pupil, -0.145, 1.82, -0.394, 0.042, 0.055, 0.025);
  sphere(pupil, 0.145, 1.82, -0.394, 0.042, 0.055, 0.025);

  // Mouth
  sphere(mouthMaterial, 0, 1.49, -0.355, 0.205, 0.085, 0.075);

  for (let i = -2; i <= 2; i++) {
    const tooth = part(
      new THREE.BoxGeometry(0.045, 0.055, 0.025),
      teeth,
      i * 0.065,
      1.535,
      -0.414
    );

    tooth.rotation.z = i * -0.08;
  }

  // Ears
  sphere(fur, -0.39, 1.76, 0, 0.13, 0.17, 0.10);
  sphere(fur, 0.39, 1.76, 0, 0.13, 0.17, 0.10);
  sphere(skin, -0.405, 1.76, -0.065, 0.065, 0.09, 0.035);
  sphere(skin, 0.405, 1.76, -0.065, 0.065, 0.09, 0.035);

  // Long arms, palms and fingers
  for (const side of [-1, 1]) {
    sphere(fur, side * 0.49, 1.29, 0, 0.30, 0.30, 0.31);

    capsule(fur, side * 0.68, 0.91, 0, 0.205, 0.48, side * -0.12);
    capsule(fur, side * 0.88, 0.49, -0.015, 0.17, 0.38, side * -0.10);

    sphere(skin, side * 1.02, 0.22, -0.035, 0.20, 0.13, 0.16);

    for (let finger = 0; finger < 4; finger++) {
      const spread = (finger - 1.5) * 0.075;

      capsule(
        skin,
        side * (1.04 + Math.abs(spread) * 0.15),
        0.075,
        -0.045 + spread,
        0.035,
        0.105
      );
    }

    capsule(skin, side * 0.91, 0.19, -0.18, 0.045, 0.12, side * 0.8);

    // Legs
    sphere(fur, side * 0.25, 0.39, 0.025, 0.25, 0.34, 0.29);
    capsule(fur, side * 0.25, 0.19, -0.005, 0.16, 0.17);

    // Feet and toes
    sphere(skin, side * 0.25, 0.075, -0.13, 0.19, 0.09, 0.28);

    for (let toe = 0; toe < 3; toe++) {
      sphere(
        skin,
        side * 0.25 + (toe - 1) * 0.085,
        0.055,
        -0.34,
        0.045,
        0.045,
        0.085
      );
    }
  }

  // Dirt patches
  const dirt = new THREE.MeshStandardMaterial({
    color: 0x39332d,
    roughness: 1
  });

  sphere(dirt, -0.32, 1.10, -0.30, 0.12, 0.18, 0.035);
  sphere(dirt, 0.28, 0.82, -0.34, 0.10, 0.15, 0.035);
  sphere(dirt, -0.15, 1.95, -0.20, 0.09, 0.045, 0.035);

  return { group, arms: [] };
}

// ==========================================
// LOCAL PLAYER
// ==========================================

const rig = new THREE.Group();
scene.add(rig);
rig.position.set(0, 0, 2);

const localAvatar = createAvatar();
rig.add(localAvatar.group);

// ==========================================
// HANDS AND CONTROLLERS
// ==========================================

const handGeometry = new THREE.SphereGeometry(0.12, 12, 10);
const handMaterial = new THREE.MeshStandardMaterial({
  color: 0xcbbda6
});

const leftHand = new THREE.Mesh(handGeometry, handMaterial);
const rightHand = new THREE.Mesh(handGeometry, handMaterial);
scene.add(leftHand, rightHand);

const leftController = renderer.xr.getController(0);
const rightController = renderer.xr.getController(1);

scene.add(leftController, rightController);

const controllerRay = new THREE.Raycaster();

// ==========================================
// MULTIPLAYER
// ==========================================

let socket;
let myId = null;
let roomId = "connecting";
let players = [];
let dummies = [];

const remotePlayers = new Map();
const remoteDummies = new Map();

function send(data) {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(data));
  }
}

function setStatus(message) {
  if (statusEl) statusEl.textContent = message;
}

function connect() {
  const protocol = location.protocol === "https:" ? "wss:" : "ws:";
  socket = new WebSocket(`${protocol}//${location.host}`);

  socket.addEventListener("open", () => setStatus("Connected"));

  socket.addEventListener("close", () => {
    setStatus("Disconnected - reconnecting");
    setTimeout(connect, 2500);
  });

  socket.addEventListener("error", () => setStatus("Connection error"));

  socket.addEventListener("message", event => {
    let data;

    try {
      data = JSON.parse(event.data);
    } catch {
      return;
    }

    if (data.type === "welcome") {
      myId = data.id;
      roomId = data.roomId || "connecting";
      setStatus("Connected");
    }

    if (data.type === "state") {
      roomId = data.roomId;
      players = data.players || [];
      dummies = data.dummies || [];

      if (roomEl) {
        roomEl.textContent =
          `ROOM: ${roomId} | PLAYERS: ${data.count}/${data.slots}`;
      }

      updateRemotePlayers();
      updateDummies();

      if (menuOpen) refreshAdminMenu();
    }

    if (data.type === "kicked") {
      setStatus(data.reason || "You were removed");
    }

    if (data.type === "error") {
      setStatus(data.message || "Server error");
    }
  });
}

connect();

function updateRemotePlayers() {
  const active = new Set();

  for (const player of players) {
    if (player.id === myId) continue;
    active.add(player.id);

    let avatar = remotePlayers.get(player.id);

    if (!avatar) {
      avatar = createAvatar(player.color || "#777568");
      scene.add(avatar.group);

      avatar.leftHand = new THREE.Mesh(handGeometry, handMaterial);
      avatar.rightHand = new THREE.Mesh(handGeometry, handMaterial);

      scene.add(avatar.leftHand, avatar.rightHand);
      remotePlayers.set(player.id, avatar);
    }

    avatar.group.position.set(
      player.x || 0,
      player.y || 0,
      player.z || 0
    );

    if (player.leftHand) {
      avatar.leftHand.position.set(
        player.leftHand.x,
        player.leftHand.y,
        player.leftHand.z
      );
    }

    if (player.rightHand) {
      avatar.rightHand.position.set(
        player.rightHand.x,
        player.rightHand.y,
        player.rightHand.z
      );
    }
  }

  for (const [id, avatar] of remotePlayers) {
    if (!active.has(id)) {
      scene.remove(avatar.group);
      scene.remove(avatar.leftHand);
      scene.remove(avatar.rightHand);
      remotePlayers.delete(id);
    }
  }
}

function updateDummies() {
  const active = new Set();

  for (const dummy of dummies) {
    active.add(dummy.id);

    let avatar = remoteDummies.get(dummy.id);

    if (!avatar) {
      avatar = createAvatar(dummy.color || "#777568");
      scene.add(avatar.group);
      remoteDummies.set(dummy.id, avatar);
    }

    avatar.group.position.set(
      dummy.x || 0,
      dummy.y || 0,
      dummy.z || 0
    );
  }

  for (const [id, avatar] of remoteDummies) {
    if (!active.has(id)) {
      scene.remove(avatar.group);
      remoteDummies.delete(id);
    }
  }
}

// ==========================================
// WRIST ADMIN MENU
// ==========================================

let menu;
let menuButtons = [];
let menuOpen = false;
let menuTab = "PLAYERS";

let selectedPlayerId = null;
let heldPlayerId = null;
let playerPage = 0;

let previousX = false;
let previousTrigger = false;
let lastTouch = 0;
let lastTelekinesisSend = 0;

function makeMenuText(value, width = 0.7, height = 0.09) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 128;

  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, 512, 128);
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 38px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(String(value).slice(0, 24), 256, 64);

  const texture = new THREE.CanvasTexture(canvas);

  const text = new THREE.Mesh(
    new THREE.PlaneGeometry(width, height),
    new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      depthWrite: false
    })
  );

  text.position.z = 0.025;
  return text;
}

function addMenuButton(label, x, y, width, action, color = 0x343a43) {
  const button = new THREE.Mesh(
    new THREE.BoxGeometry(width, 0.105, 0.025),
    new THREE.MeshStandardMaterial({
      color,
      roughness: 0.8
    })
  );

  button.position.set(x, y, 0.012);
  button.userData.action = action;
  button.userData.baseColor = color;

  menu.add(button);

  const text = makeMenuText(label, width - 0.035, 0.075);
  text.position.set(x, y, 0.03);
  menu.add(text);

  menuButtons.push(button);
}

function clearMenu() {
  if (!menu) return;

  for (const child of [...menu.children]) {
    if (child.geometry) child.geometry.dispose();

    if (child.material) {
      if (child.material.map) child.material.map.dispose();
      child.material.dispose();
    }
  }

  menu.clear();
  menuButtons = [];
}

function buildAdminMenu() {
  menu = new THREE.Group();

  const panel = new THREE.Mesh(
    new THREE.BoxGeometry(0.92, 0.94, 0.035),
    new THREE.MeshStandardMaterial({
      color: 0x17191e,
      roughness: 0.85
    })
  );

  menu.add(panel);

  const border = new THREE.Mesh(
    new THREE.BoxGeometry(0.95, 0.97, 0.018),
    new THREE.MeshBasicMaterial({ color: 0x9d222c })
  );

  border.position.z = -0.035;
  menu.add(border);

  menu.position.set(0.02, 0.10, -0.19);
  menu.rotation.set(-0.25, 0, 0);
  menu.visible = false;

  leftController.add(menu);
  refreshAdminMenu();
}

function addTab(label, x, tab) {
  addMenuButton(
    label,
    x,
    0.36,
    0.20,
    () => {
      menuTab = tab;
      refreshAdminMenu();
    },
    menuTab === tab ? 0x96323b : 0x343a43
  );
}

function refreshAdminMenu() {
  if (!menu) return;

  clearMenu();

  const heading = makeMenuText("THE GRINNER", 0.65, 0.09);
  heading.position.set(0, 0.405, 0.025);
  menu.add(heading);

  addTab("PLAYERS", -0.32, "PLAYERS");
  addTab("DUMMIES", -0.105, "DUMMIES");
  addTab("TELE", 0.105, "TELE");
  addTab("SERVER", 0.32, "SERVER");

  if (menuTab === "PLAYERS") {
    const others = players.filter(p => p.id !== myId);
    const pages = Math.max(1, Math.ceil(others.length / 3));

    addMenuButton(
      `PAGE ${playerPage + 1}/${pages}`,
      0, 0.20, 0.72,
      () => {
        playerPage = (playerPage + 1) % pages;
        refreshAdminMenu();
      },
      0x45404b
    );

    const shown = others.slice(playerPage * 3, playerPage * 3 + 3);

    shown.forEach((player, index) => {
      const selected = selectedPlayerId === player.id;

      addMenuButton(
        `${selected ? "> " : ""}${player.name || "PLAYER"}`,
        0,
        0.055 - index * 0.13,
        0.72,
        () => {
          selectedPlayerId = player.id;
          refreshAdminMenu();
        },
        selected ? 0x76512a : 0x343a43
      );
    });

    addMenuButton(
      "KICK SELECTED",
      0, -0.35, 0.72,
      () => {
        if (!selectedPlayerId) return;
        send({ type: "kick-player", targetId: selectedPlayerId });
        selectedPlayerId = null;
      },
      0x74343a
    );

    addMenuButton(
      "BAN SELECTED",
      0, -0.49, 0.72,
      () => {
        if (!selectedPlayerId) return;
        send({ type: "ban-player", targetId: selectedPlayerId });
        selectedPlayerId = null;
      },
      0x74343a
    );
  }

  if (menuTab === "DUMMIES") {
    addMenuButton(
      "SPAWN DUMMY",
      0, 0.13, 0.72,
      () => send({ type: "spawn-dummy" }),
      0x315c42
    );

    addMenuButton(
      "REMOVE ALL DUMMIES",
      0, -0.04, 0.72,
      () => send({ type: "remove-dummies" }),
      0x74343a
    );

    addMenuButton(
      `DUMMIES: ${dummies.length}`,
      0, -0.21, 0.72,
      () => {},
      0x45404b
    );
  }

  if (menuTab === "TELE") {
    addMenuButton(
      "SELECT PLAYER IN PLAYERS",
      0, 0.17, 0.72,
      () => {
        menuTab = "PLAYERS";
        refreshAdminMenu();
      }
    );

    addMenuButton(
      "GRAB SELECTED",
      0, 0, 0.72,
      () => {
        if (!selectedPlayerId) return;
        heldPlayerId = selectedPlayerId;
        send({ type: "grab-player", targetId: heldPlayerId });
      },
      0x315c42
    );

    addMenuButton(
      "RELEASE PLAYER",
      0, -0.17, 0.72,
      () => {
        if (!heldPlayerId) return;
        send({ type: "release-player", targetId: heldPlayerId });
        heldPlayerId = null;
      },
      0x74343a
    );
  }

  if (menuTab === "SERVER") {
    addMenuButton(
      `ROOM: ${roomId}`,
      0, 0.15, 0.72,
      () => {},
      0x45404b
    );

    addMenuButton(
      `PLAYERS: ${players.length}`,
      0, -0.02, 0.72,
      () => {},
      0x45404b
    );

    addMenuButton(
      "CLOSE MENU",
      0, -0.19, 0.72,
      toggleMenu,
      0x74343a
    );
  }
}

function toggleMenu() {
  menuOpen = !menuOpen;

  if (menu) menu.visible = menuOpen;

  if (menuOpen) {
    refreshAdminMenu();
    setStatus("Wrist menu opened");
  } else {
    setStatus("Wrist menu closed");
  }
}

buildAdminMenu();

// ==========================================
// VR INPUT
// ==========================================

function getXRInputSources() {
  const session = renderer.xr.getSession();
  return session ? [...session.inputSources] : [];
}

function findInput(handedness) {
  return getXRInputSources().find(
    source => source.handedness === handedness
  );
}

function getGamepadButton(source, index) {
  return !!source?.gamepad?.buttons?.[index]?.pressed;
}

function clickMenuWithRightController() {
  const origin = new THREE.Vector3();
  rightController.getWorldPosition(origin);

  const direction = new THREE.Vector3(0, 0, -1);
  direction.applyQuaternion(rightController.quaternion);

  controllerRay.set(origin, direction);

  const hits = controllerRay.intersectObjects(menuButtons, false);

  if (hits.length && hits[0].object.userData.action) {
    hits[0].object.userData.action();
  }
}

function activateTouchedButton(position) {
  if (!menuOpen || !menu) return;

  for (const button of menuButtons) {
    const bounds = new THREE.Box3().setFromObject(button);

    if (bounds.containsPoint(position)) {
      const now = performance.now();

      if (now - lastTouch > 350) {
        lastTouch = now;
        button.userData.action?.();
      }

      return;
    }
  }
}

function handleXRButtons(time, frame) {
  const left = findInput("left");
  const right = findInput("right");

  const xPressed = getGamepadButton(left, 4);

  if (xPressed && !previousX) {
    toggleMenu();
  }

  previousX = xPressed;

  const triggerPressed = getGamepadButton(right, 0);

  if (triggerPressed && !previousTrigger && menuOpen) {
    clickMenuWithRightController();
  }

  previousTrigger = triggerPressed;

  // Quest hand-tracking fingertip selection
  if (menuOpen && right?.hand && frame) {
    const joint = right.hand.get("index-finger-tip");
    const referenceSpace = renderer.xr.getReferenceSpace();

    if (joint && referenceSpace) {
      const pose = frame.getJointPose(joint, referenceSpace);

      if (pose) {
        const tip = new THREE.Vector3(
          pose.transform.position.x,
          pose.transform.position.y,
          pose.transform.position.z
        );

        activateTouchedButton(tip);
      }
    }
  }
}

// ==========================================
// MOVEMENT
// ==========================================

let velocity = new THREE.Vector3();
let previousLeft = new THREE.Vector3();
let previousRight = new THREE.Vector3();
let lastMoveSend = 0;

function getHandPosition(controller) {
  const position = new THREE.Vector3();
  controller.getWorldPosition(position);
  return position;
}

function touchingBoundary(position) {
  return (
    position.y < 0.2 ||
    Math.abs(position.x) > 14.5 ||
    Math.abs(position.z) > 14.5
  );
}

function applyHandPush(position, previous, pressed) {
  if (!pressed || !touchingBoundary(position)) return;

  const push = new THREE.Vector3().subVectors(previous, position);
  velocity.addScaledVector(push, 5);
}

function updateMovement(delta) {
  const leftPosition = getHandPosition(leftController);
  const rightPosition = getHandPosition(rightController);

  const left = findInput("left");
  const right = findInput("right");

  const leftGrip = getGamepadButton(left, 1);
  const rightGrip = getGamepadButton(right, 1);

  applyHandPush(leftPosition, previousLeft, leftGrip);
  applyHandPush(rightPosition, previousRight, rightGrip);

  previousLeft.copy(leftPosition);
  previousRight.copy(rightPosition);

  velocity.y -= 9.8 * delta;
  rig.position.addScaledVector(velocity, delta);

  if (rig.position.y < 0) {
    rig.position.y = 0;
    velocity.y = Math.max(0, velocity.y);
  }

  rig.position.x = THREE.MathUtils.clamp(rig.position.x, -14, 14);
  rig.position.z = THREE.MathUtils.clamp(rig.position.z, -14, 14);

  velocity.multiplyScalar(Math.pow(0.985, delta * 60));

  leftHand.position.copy(leftPosition);
  rightHand.position.copy(rightPosition);

  const now = performance.now();

  if (now - lastMoveSend > 50) {
    lastMoveSend = now;

    send({
      type: "move",
      x: rig.position.x,
      y: rig.position.y,
      z: rig.position.z,
      leftHand: {
        x: leftPosition.x,
        y: leftPosition.y,
        z: leftPosition.z
      },
      rightHand: {
        x: rightPosition.x,
        y: rightPosition.y,
        z: rightPosition.z
      }
    });
  }
}

function updateTelekinesis() {
  if (!heldPlayerId) return;

  const now = performance.now();
  if (now - lastTelekinesisSend < 80) return;
  lastTelekinesisSend = now;

  const direction = new THREE.Vector3();
  camera.getWorldDirection(direction);

  const position = new THREE.Vector3();
  camera.getWorldPosition(position);

  position.add(direction.multiplyScalar(1.8));

  send({
    type: "move-held-player",
    targetId: heldPlayerId,
    x: position.x,
    y: Math.max(0, position.y - 1.2),
    z: position.z
  });
}

// ==========================================
// MAP VOTING
// ==========================================

function setupVoting() {
  const votes = [
    ["voteForest", "Yellow Hall"],
    ["voteCaves", "Abandoned School"],
    ["voteFacility", "Red Tunnels"]
  ];

  for (const [id, mapName] of votes) {
    const button = document.getElementById(id);
    if (!button) continue;

    button.textContent = mapName;

    button.addEventListener("click", () => {
      send({ type: "vote", map: mapName });
    });
  }
}

setupVoting();

// ==========================================
// ENTER VR
// ==========================================

if (enterButton) {
  enterButton.addEventListener("click", async () => {
    try {
      if (!navigator.xr) {
        setStatus("WebXR unavailable");
        return;
      }

      const supported =
        await navigator.xr.isSessionSupported("immersive-vr");

      if (!supported) {
        setStatus("VR not supported");
        return;
      }

      const session = await navigator.xr.requestSession("immersive-vr", {
        optionalFeatures: [
          "local-floor",
          "bounded-floor",
          "hand-tracking"
        ]
      });

      await renderer.xr.setSession(session);

      const hud = document.getElementById("hud");
      if (hud) hud.style.display = "none";

      setStatus("Entered VR");
    } catch (error) {
      console.error(error);
      setStatus("Could not enter VR");
    }
  });
}

// ==========================================
// DESKTOP TESTING
// ==========================================

const keys = {};

window.addEventListener("keydown", event => {
  keys[event.key.toLowerCase()] = true;
});

window.addEventListener("keyup", event => {
  keys[event.key.toLowerCase()] = false;
});

function desktopMovement(delta) {
  if (renderer.xr.isPresenting) return;

  if (keys.w) rig.position.z -= delta * 3;
  if (keys.s) rig.position.z += delta * 3;
  if (keys.a) rig.position.x -= delta * 3;
  if (keys.d) rig.position.x += delta * 3;
}

// ==========================================
// RESIZE AND MAIN LOOP
// ==========================================

window.addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

function animate(time, frame) {
  const delta = Math.min(clock.getDelta(), 0.04);

  if (renderer.xr.isPresenting) {
    handleXRButtons(time, frame);
    updateMovement(delta);
  } else {
    desktopMovement(delta);
  }

  updateTelekinesis();

  renderer.render(scene, camera);
}

renderer.setAnimationLoop(animate);
