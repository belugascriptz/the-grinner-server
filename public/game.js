
import * as THREE from "three";

// ============================================
// THE GRINNER VR — MULTIPLAYER + ADMIN MENU
// ============================================

const statusEl = document.getElementById("status");
const roomEl = document.getElementById("room");
const enterButton = document.getElementById("enterVR");

const voteButtons = [
  ["voteForest", "Yellow Hall"],
  ["voteCaves", "Abandoned School"],
  ["voteFacility", "Red Tunnels"]
];

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x17191d);
scene.fog = new THREE.Fog(0x17191d, 12, 42);

const camera = new THREE.PerspectiveCamera(
  72,
  innerWidth / innerHeight,
  0.05,
  100
);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
renderer.setSize(innerWidth, innerHeight);
renderer.xr.enabled = true;
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

scene.add(new THREE.HemisphereLight(0xb8d3ff, 0x25202b, 1.8));

const keyLight = new THREE.DirectionalLight(0xffe7c7, 2.1);
keyLight.position.set(4, 9, 5);
keyLight.castShadow = true;
scene.add(keyLight);

// ============================================
// MAP
// ============================================

const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(42, 60),
  new THREE.MeshStandardMaterial({
    color: 0x6d685b,
    roughness: 0.95
  })
);

floor.rotation.x = -Math.PI / 2;
floor.position.z = -12;
floor.receiveShadow = true;
scene.add(floor);

function wall(x, y, z, w, h, d, color = 0xc9c08b) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshStandardMaterial({
      color,
      roughness: 0.9
    })
  );

  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);

  return mesh;
}

wall(-5, 2, -10, 0.35, 4, 38);
wall(5, 2, -10, 0.35, 4, 38);
wall(0, 4, -10, 10, 0.3, 38);

for (let z = -2; z > -29; z -= 5) {
  wall(0, 0.03, z, 9.5, 0.05, 0.08, 0x4b493f);

  const lamp = new THREE.PointLight(0xffedb0, 0.75, 8);
  lamp.position.set(0, 3.55, z - 1);
  scene.add(lamp);
}

function board(x, title, color, z = -1) {
  const group = new THREE.Group();

  const panel = new THREE.Mesh(
    new THREE.BoxGeometry(1.8, 1.15, 0.12),
    new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.12
    })
  );

  group.add(panel);

  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 180;

  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#101014";
  ctx.fillRect(0, 0, 512, 180);

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 44px Arial";
  ctx.textAlign = "center";
  ctx.fillText(title, 256, 105);

  const texture = new THREE.CanvasTexture(canvas);

  const label = new THREE.Mesh(
    new THREE.PlaneGeometry(1.65, 0.58),
    new THREE.MeshBasicMaterial({ map: texture })
  );

  label.position.z = 0.071;
  group.add(label);

  group.position.set(x, 1.7, z);
  scene.add(group);
}

board(-3, "YELLOW HALL", 0xc9b94e);
board(0, "SCHOOL", 0x6d8295);
board(3, "RED TUNNELS", 0x8e3d3d);

// ============================================
// PLAYER CHARACTERS
// ============================================

const players = new Map();
const dummyObjects = new Map();

let myId = null;
let ws = null;
let lastSend = 0;
let lastTelekinesisSend = 0;

let velocity = new THREE.Vector3();
let previousHands = [
  new THREE.Vector3(),
  new THREE.Vector3()
];

let handInitialized = false;

const rig = new THREE.Group();
scene.add(rig);
rig.add(camera);

camera.position.set(0, 1.65, 0);

function makeCreature(color = "#a9d6a0", monster = false) {
  const root = new THREE.Group();

  const skin = new THREE.MeshStandardMaterial({
    color: monster ? 0xd9d0c8 : color,
    roughness: 0.82,
    emissive: monster ? 0x210607 : 0x000000
  });

  const dark = new THREE.MeshStandardMaterial({
    color: monster ? 0x351015 : 0x26333a,
    roughness: 0.7
  });

  const eyeMat = new THREE.MeshStandardMaterial({
    color: monster ? 0xff2929 : 0x101820,
    emissive: monster ? 0x9d0000 : 0x000000,
    emissiveIntensity: monster ? 1.5 : 0
  });

  const torso = new THREE.Mesh(
    new THREE.SphereGeometry(0.34, 20, 16),
    skin
  );

  torso.scale.set(1, 1.25, 0.78);
  torso.position.y = 0.95;
  root.add(torso);

  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.29, 20, 16),
    skin
  );

  head.scale.set(1.05, 0.92, 0.92);
  head.position.set(0, 1.55, 0);
  root.add(head);

  for (const side of [-1, 1]) {
    const fin = new THREE.Mesh(
      new THREE.ConeGeometry(0.12, 0.38, 8),
      skin
    );

    fin.position.set(side * 0.23, 1.78, -0.02);
    fin.rotation.z = side * -0.7;
    fin.rotation.x = -0.35;
    root.add(fin);
  }

  const eye1 = new THREE.Mesh(
    new THREE.SphereGeometry(monster ? 0.075 : 0.055, 12, 10),
    eyeMat
  );

  eye1.position.set(-0.105, 1.59, 0.25);
  root.add(eye1);

  const eye2 = new THREE.Mesh(
    new THREE.SphereGeometry(monster ? 0.025 : 0.055, 12, 10),
    monster ? dark : eyeMat
  );

  eye2.position.set(0.105, 1.59, 0.25);
  root.add(eye2);

  const mouth = new THREE.Mesh(
    new THREE.TorusGeometry(
      monster ? 0.17 : 0.105,
      monster ? 0.035 : 0.018,
      8,
      24,
      Math.PI
    ),
    dark
  );

  mouth.position.set(0, 1.43, 0.255);
  mouth.rotation.z = Math.PI;
  root.add(mouth);

  const arms = [];
  const hands = [];

  for (const side of [-1, 1]) {
    const arm = new THREE.Mesh(
      new THREE.CylinderGeometry(0.075, 0.105, 0.78, 10),
      skin
    );

    arm.position.set(side * 0.39, 1.05, 0.02);
    arm.rotation.z = side * -0.48;
    root.add(arm);
    arms.push(arm);

    const hand = new THREE.Mesh(
      new THREE.SphereGeometry(0.17, 14, 12),
      skin
    );

    hand.scale.set(1.18, 0.75, 1);
    hand.position.set(side * 0.75, 0.72, 0.12);
    root.add(hand);
    hands.push(hand);
  }

  const badge = new THREE.Mesh(
    new THREE.SphereGeometry(0.09, 12, 10),
    new THREE.MeshStandardMaterial({
      color: monster ? 0x8b1018 : 0x42a9a0,
      emissive: monster ? 0x550008 : 0x123c39
    })
  );

  badge.position.set(0, 1.02, 0.27);
  root.add(badge);

  if (monster) {
    const grin = new THREE.Mesh(
      new THREE.TorusGeometry(0.22, 0.055, 8, 28, Math.PI * 1.25),
      new THREE.MeshStandardMaterial({ color: 0x21070b })
    );

    grin.position.set(0, 1.43, 0.27);
    grin.rotation.z = Math.PI * 0.9;
    root.add(grin);

    const glow = new THREE.PointLight(0xff2020, 1.1, 3);
    glow.position.set(0, 1.65, 0.45);
    root.add(glow);

    root.scale.set(1.12, 1.16, 1.08);
  }

  root.userData = {
    skin,
    arms,
    hands,
    monster
  };

  root.traverse(object => {
    if (object.isMesh) {
      object.castShadow = true;
      object.receiveShadow = true;
    }
  });

  return root;
}

const localAvatar = makeCreature();
rig.add(localAvatar);

let localMonster = null;

function createRemote(player) {
  const avatar = makeCreature(
    player.color,
    player.role === "monster"
  );

  scene.add(avatar);
  players.set(player.id, avatar);

  return avatar;
}

function updateRemote(player) {
  if (player.id === myId) return;

  let avatar = players.get(player.id);

  if (
    !avatar ||
    avatar.userData.monster !== (player.role === "monster")
  ) {
    if (avatar) scene.remove(avatar);
    avatar = createRemote(player);
  }

  avatar.position.set(
    player.x || 0,
    player.y || 0,
    player.z || 0
  );

  if (player.leftHand && player.rightHand) {
    const hands = [player.leftHand, player.rightHand];

    hands.forEach((hand, index) => {
      const target = new THREE.Vector3(
        hand.x,
        hand.y,
        hand.z
      );

      avatar.userData.hands[index].position.copy(
        avatar.worldToLocal(target)
      );
    });
  }

  if (!avatar.userData.monster) {
    avatar.userData.skin.color.set(
      player.color || "#a9d6a0"
    );
  }
}

function updatePlayers(list) {
  const seen = new Set();

  for (const player of list || []) {
    if (player.id === myId) continue;

    seen.add(player.id);
    updateRemote(player);
  }

  for (const [id, avatar] of players) {
    if (!seen.has(id)) {
      scene.remove(avatar);
      players.delete(id);
    }
  }
}

// ============================================
// DUMMY CHARACTERS
// ============================================

function updateDummies(list) {
  const seen = new Set();

  for (const dummy of list || []) {
    seen.add(dummy.id);

    let object = dummyObjects.get(dummy.id);

    if (!object) {
      object = makeCreature(dummy.color || "#b9b9bd");
      scene.add(object);
      dummyObjects.set(dummy.id, object);
    }

    object.position.set(
      dummy.x || 0,
      dummy.y || 0,
      dummy.z || 0
    );

    object.userData.skin.color.set(
      dummy.color || "#b9b9bd"
    );
  }

  for (const [id, object] of dummyObjects) {
    if (!seen.has(id)) {
      scene.remove(object);
      dummyObjects.delete(id);
    }
  }
}

// ============================================
// WEBSOCKET
// ============================================

function send(data) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(data));
  }
}

let latestPlayers = [];
let latestDummies = [];
let isAdmin = false;
let adminLoginAttempted = false;
let selectedPlayerId = null;
let activeTab = "Players";
let playerPage = 0;
let heldPlayerId = null;

function connect() {
  const scheme = location.protocol === "https:" ? "wss:" : "ws:";

  ws = new WebSocket(`${scheme}//${location.host}`);

  ws.addEventListener("open", () => {
    statusEl.textContent = "Connected • The Grinner";
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

    if (data.type === "admin-result") {
      isAdmin = data.success;

      statusEl.textContent = isAdmin
        ? "ADMIN ACCESS GRANTED"
        : "ADMIN LOGIN FAILED";

      buildAdminMenu();
    }

    if (data.type === "error") {
      statusEl.textContent = data.message || "Server error";
    }

    if (data.type === "kicked") {
      statusEl.textContent = "You were kicked.";
    }

    if (data.type === "banned") {
      statusEl.textContent = "You were banned.";
    }

    if (data.type === "state") {
      latestPlayers = data.players || [];
      latestDummies = data.dummies || [];

      roomEl.textContent =
        `ROOM: ${data.count} / ${data.slots}`;

      statusEl.textContent =
        `${data.roundActive ? "ROUND LIVE" : "LOBBY"} • ${data.map}`;

      updatePlayers(latestPlayers);
      updateDummies(latestDummies);

      const me = latestPlayers.find(p => p.id === myId);

      if (me) {
        isAdmin = !!me.admin;

        if (me.role === "monster") {
          localAvatar.visible = false;

          if (!localMonster) {
            localMonster = makeCreature("#d9d0c8", true);
            rig.add(localMonster);
          }
        } else {
          localAvatar.visible = true;

          if (localMonster) {
            rig.remove(localMonster);
            localMonster = null;
          }
        }
      }

      if (
        selectedPlayerId &&
        !latestPlayers.some(p => p.id === selectedPlayerId)
      ) {
        selectedPlayerId = null;
      }

      buildAdminMenu();
    }
  });

  ws.addEventListener("close", () => {
    statusEl.textContent = "Disconnected — refresh to reconnect";
  });

  ws.addEventListener("error", () => {
    statusEl.textContent = "Could not connect to server";
  });
}

connect();

// ============================================
// ADMIN LOGIN
// ============================================

function loginAdmin() {
  const token = window.prompt(
    "Enter the ADMIN_TOKEN you configured in Render:"
  );

  if (!token) return;

  adminLoginAttempted = true;

  send({
    type: "admin-login",
    name: "gamingforfun69",
    token
  });
}

// ============================================
// 3D ADMIN MENU
// ============================================

const adminMenu = new THREE.Group();
camera.add(adminMenu);

adminMenu.position.set(0, 0, -1.25);
adminMenu.scale.setScalar(0.85);
adminMenu.visible = false;

const menuButtons = [];
const menuRaycaster = new THREE.Raycaster();

function makeMenuTexture(text, background = "#252a33") {
  const canvas = document.createElement("canvas");

  canvas.width = 512;
  canvas.height = 128;

  const ctx = canvas.getContext("2d");

  ctx.fillStyle = background;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = "#829caa";
  ctx.lineWidth = 5;
  ctx.strokeRect(4, 4, 504, 120);

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 38px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 256, 64, 470);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;

  return texture;
}

function addMenuButton(label, x, y, action, color = "#252a33") {
  const material = new THREE.MeshBasicMaterial({
    map: makeMenuTexture(label, color),
    transparent: true
  });

  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(0.47, 0.115),
    material
  );

  mesh.position.set(x, y, 0.025);
  mesh.userData.action = action;

  adminMenu.add(mesh);
  menuButtons.push(mesh);

  return mesh;
}

function addMenuTitle() {
  const canvas = document.createElement("canvas");

  canvas.width = 1024;
  canvas.height = 180;

  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#11151c";
  ctx.fillRect(0, 0, 1024, 180);

  ctx.fillStyle = "#e7eeee";
  ctx.font = "bold 76px Arial";
  ctx.textAlign = "center";
  ctx.fillText("ADMIN MOD MENU", 512, 105);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;

  const title = new THREE.Mesh(
    new THREE.PlaneGeometry(1.08, 0.19),
    new THREE.MeshBasicMaterial({ map: texture })
  );

  title.position.set(0, 0.39, 0.02);
  adminMenu.add(title);
}

function addMenuBackground() {
  const background = new THREE.Mesh(
    new THREE.PlaneGeometry(1.15, 0.95),
    new THREE.MeshBasicMaterial({
      color: 0x10141c,
      transparent: true,
      opacity: 0.96
    })
  );

  background.position.z = -0.01;
  adminMenu.add(background);
}

function addMenuText(text, x, y, width = 0.95) {
  const canvas = document.createElement("canvas");

  canvas.width = 1024;
  canvas.height = 100;

  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, 1024, 100);

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 40px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 512, 50, 1000);

  const texture = new THREE.CanvasTexture(canvas);

  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(width, 0.09),
    new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true
    })
  );

  mesh.position.set(x, y, 0.02);
  adminMenu.add(mesh);
}

function clearAdminMenu() {
  while (adminMenu.children.length) {
    const object = adminMenu.children[0];

    adminMenu.remove(object);

    if (object.geometry) object.geometry.dispose();

    if (object.material) {
      if (object.material.map) object.material.map.dispose();
      object.material.dispose();
    }
  }

  menuButtons.length = 0;
}

function getSelectedPlayer() {
  return latestPlayers.find(
    player => player.id === selectedPlayerId
  );
}

function buildAdminMenu() {
  if (!adminMenu.visible) return;

  clearAdminMenu();
  addMenuBackground();
  addMenuTitle();

  if (!isAdmin) {
    addMenuText("ADMIN LOGIN REQUIRED", 0, 0.17);

    addMenuButton(
      "LOGIN",
      0,
      -0.04,
      () => loginAdmin(),
      "#245c49"
    );

    addMenuText(
      "Only the configured admin token grants access.",
      0,
      -0.23
    );

    return;
  }

  addMenuButton(
    "PLAYERS",
    -0.36,
    0.25,
    () => {
      activeTab = "Players";
      buildAdminMenu();
    },
    activeTab === "Players" ? "#315b75" : "#252a33"
  );

  addMenuButton(
    "DUMMIES",
    0,
    0.25,
    () => {
      activeTab = "Dummies";
      buildAdminMenu();
    },
    activeTab === "Dummies" ? "#315b75" : "#252a33"
  );

  addMenuButton(
    "TELEKINESIS",
    0.36,
    0.25,
    () => {
      activeTab = "Telekinesis";
      buildAdminMenu();
    },
    activeTab === "Telekinesis" ? "#315b75" : "#252a33"
  );

  if (activeTab === "Players") {
    buildPlayersTab();
  }

  if (activeTab === "Dummies") {
    buildDummiesTab();
  }

  if (activeTab === "Telekinesis") {
    buildTelekinesisTab();
  }
}

function buildPlayersTab() {
  const others = latestPlayers.filter(p => p.id !== myId);
  const pageSize = 4;
  const start = playerPage * pageSize;
  const visible = others.slice(start, start + pageSize);

  addMenuText(
    `PLAYERS IN ROOM: ${others.length}`,
    0,
    0.13
  );

  visible.forEach((player, index) => {
    const selected = player.id === selectedPlayerId;

    addMenuButton(
      `${player.name || "Player"} ${player.role === "monster" ? "[MONSTER]" : ""}`,
      0,
      0.015 - index * 0.115,
      () => {
        selectedPlayerId = player.id;
        buildAdminMenu();
      },
      selected ? "#426c43" : "#252a33"
    );
  });

  addMenuButton(
    "PREVIOUS",
    -0.25,
    -0.48,
    () => {
      playerPage = Math.max(0, playerPage - 1);
      buildAdminMenu();
    }
  );

  addMenuButton(
    "NEXT",
    0.25,
    -0.48,
    () => {
      if ((playerPage + 1) * pageSize < others.length) {
        playerPage++;
      }
      buildAdminMenu();
    }
  );

  const selected = getSelectedPlayer();

  if (selected) {
    addMenuText(
      `SELECTED: ${selected.name}`,
      0,
      -0.60
    );

    addMenuButton(
      "KICK",
      -0.25,
      -0.72,
      () => {
        send({
          type: "kick-player",
          targetId: selected.id
        });
      },
      "#8b3939"
    );

    addMenuButton(
      "BAN",
      0.25,
      -0.72,
      () => {
        if (window.confirm(`Ban ${selected.name}?`)) {
          send({
            type: "ban-player",
            targetId: selected.id
          });
        }
      },
      "#a52e35"
    );
  }
}

function buildDummiesTab() {
  addMenuText(
    `DUMMIES: ${latestDummies.length} / 10`,
    0,
    0.12
  );

  addMenuButton(
    "SPAWN DUMMY",
    0,
    -0.05,
    () => send({ type: "spawn-dummy" }),
    "#315b75"
  );

  addMenuButton(
    "REMOVE ALL",
    0,
    -0.22,
    () => send({ type: "remove-dummies" }),
    "#8b3939"
  );

  addMenuText(
    "Dummies appear in your current room.",
    0,
    -0.43
  );
}

function buildTelekinesisTab() {
  const selected = getSelectedPlayer();

  addMenuText(
    selected
      ? `TARGET: ${selected.name}`
      : "SELECT A PLAYER FIRST",
    0,
    0.12
  );

  addMenuButton(
    "SELECT PLAYER",
    0,
    -0.03,
    () => {
      activeTab = "Players";
      buildAdminMenu();
    },
    "#315b75"
  );

  addMenuButton(
    "GRAB",
    -0.25,
    -0.20,
    () => {
      if (!selected) return;

      heldPlayerId = selected.id;

      send({
        type: "grab-player",
        targetId: selected.id
      });
    },
    "#426c43"
  );

  addMenuButton(
    "RELEASE",
    0.25,
    -0.20,
    () => {
      if (!heldPlayerId) return;

      send({
        type: "release-player",
        targetId: heldPlayerId
      });

      heldPlayerId = null;
    },
    "#8b3939"
  );

  addMenuText(
    heldPlayerId ? "HOLDING PLAYER" : "NOT HOLDING ANYONE",
    0,
    -0.40
  );
}

// ============================================
// ADMIN MENU CONTROLLER RAY
// ============================================

const controllers = [
  renderer.xr.getController(0),
  renderer.xr.getController(1)
];

const controllerGrips = [
  renderer.xr.getControllerGrip(0),
  renderer.xr.getControllerGrip(1)
];

const controllerRays = [];

controllers.forEach((controller, index) => {
  rig.add(controller);

  const sphere = new THREE.Mesh(
    new THREE.SphereGeometry(0.13, 12, 10),
    new THREE.MeshStandardMaterial({
      color: 0x9ce2d5,
      roughness: 0.7
    })
  );

  controller.add(sphere);

  const rayGeometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 0, -5)
  ]);

  const ray = new THREE.Line(
    rayGeometry,
    new THREE.LineBasicMaterial({
      color: 0x9ce2d5,
      transparent: true,
      opacity: 0.8
    })
  );

  controller.add(ray);
  controllerRays.push(ray);

  rig.add(controllerGrips[index]);
});

function selectAdminButton(controller) {
  if (!adminMenu.visible) return;

  const origin = new THREE.Vector3();
  const direction = new THREE.Vector3(0, 0, -1);

  controller.getWorldPosition(origin);
  direction.applyQuaternion(controller.getWorldQuaternion(new THREE.Quaternion()));

  menuRaycaster.set(origin, direction);
  menuRaycaster.far = 5;

  const hits = menuRaycaster.intersectObjects(menuButtons, false);

  if (!hits.length) return;

  const action = hits[0].object.userData.action;

  if (typeof action === "function") {
    action();
  }
}

controllers[1].addEventListener("selectstart", () => {
  selectAdminButton(controllers[1]);
});

// ============================================
// LEFT X BUTTON TO OPEN / CLOSE MENU
// ============================================

let menuOpen = false;
let xWasPressed = false;

function checkXButton() {
  const session = renderer.xr.getSession();

  if (!session) return;

  const source = [...session.inputSources].find(
    input => input.handedness === "left"
  );

  if (!source || !source.gamepad) return;

  const pressed = !!source.gamepad.buttons[4]?.pressed;

  if (pressed && !xWasPressed) {
    menuOpen = !menuOpen;
    adminMenu.visible = menuOpen;

    if (menuOpen) {
      buildAdminMenu();

      if (!isAdmin && !adminLoginAttempted) {
        loginAdmin();
      }
    }
  }

  xWasPressed = pressed;
}

// ============================================
// TELEKINESIS MOVEMENT
// ============================================

function updateTelekinesis(now) {
  if (!isAdmin || !heldPlayerId) return;

  if (now - lastTelekinesisSend < 80) return;

  const targetPosition = new THREE.Vector3();
  const forward = new THREE.Vector3();

  camera.getWorldPosition(targetPosition);
  camera.getWorldDirection(forward);

  targetPosition.addScaledVector(forward, 1.7);

  send({
    type: "move-held-player",
    targetId: heldPlayerId,
    x: targetPosition.x,
    y: THREE.MathUtils.clamp(targetPosition.y - 1.2, 0, 3),
    z: targetPosition.z
  });

  lastTelekinesisSend = now;
}

// ============================================
// MOVEMENT
// ============================================

const keys = {};

addEventListener("keydown", event => {
  keys[event.code] = true;
});

addEventListener("keyup", event => {
  keys[event.code] = false;
});

function desktopMove(dt) {
  const speed = 3.4 * dt;

  const forward =
    (keys.KeyW ? 1 : 0) - (keys.KeyS ? 1 : 0);

  const side =
    (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0);

  rig.position.x += side * speed;
  rig.position.z -= forward * speed;
}

function worldHandPosition(controller) {
  const position = new THREE.Vector3();
  controller.getWorldPosition(position);
  return position;
}

function handPhysics(dt) {
  if (!renderer.xr.isPresenting) return;

  const hands = controllers.map(worldHandPosition);

  if (!handInitialized) {
    previousHands = hands.map(hand => hand.clone());
    handInitialized = true;
    return;
  }

  for (let i = 0; i < 2; i++) {
    const hand = hands[i];
    const previous = previousHands[i];

    const nearFloor = hand.y < 1.05;

    const nearBody =
      Math.abs(hand.x - rig.position.x) < 1.25 &&
      Math.abs(hand.z - (rig.position.z + 0.2)) < 1.5;

    if (nearFloor && nearBody) {
      const delta = new THREE.Vector3().subVectors(
        previous,
        hand
      );

      delta.y = 0;
      velocity.addScaledVector(delta, 7.5);
    }

    previousHands[i].copy(hand);
  }

  velocity.y -= 9.8 * dt;
  velocity.multiplyScalar(Math.pow(0.985, dt * 60));

  const maxSpeed = 7.2;

  if (velocity.length() > maxSpeed) {
    velocity.setLength(maxSpeed);
  }

  rig.position.addScaledVector(velocity, dt);

  if (rig.position.y < 0) {
    rig.position.y = 0;
    velocity.y = 0;
  }

  rig.position.x = THREE.MathUtils.clamp(
    rig.position.x,
    -4.1,
    4.1
  );

  rig.position.z = THREE.MathUtils.clamp(
    rig.position.z,
    -29,
    5
  );
}

// ============================================
// SEND PLAYER POSITION
// ============================================

function sendPose(now) {
  if (now - lastSend < 75) return;

  const left = worldHandPosition(controllers[0]);
  const right = worldHandPosition(controllers[1]);

  send({
    type: "move",
    x: rig.position.x,
    y: rig.position.y,
    z: rig.position.z,

    leftHand: {
      x: left.x,
      y: left.y,
      z: left.z
    },

    rightHand: {
      x: right.x,
      y: right.y,
      z: right.z
    }
  });

  lastSend = now;
}

// ============================================
// PLAYER COLOR MENU
// ============================================

const menu = document.createElement("div");

menu.innerHTML = `
  <b>THE GRINNER</b><br>
  <small>PLAYER MENU</small>
  <hr>
  <label>
    Creature colour
    <input id="creatureColor" type="color" value="#a9d6a0">
  </label>
  <br>
  <button id="menuStart">START ROUND</button>
  <button id="menuEnd">BACK TO LOBBY</button>
  <p style="font-size:11px">
    Push your hands against the floor to move.
  </p>
`;

Object.assign(menu.style, {
  display: "none",
  position: "fixed",
  left: "12px",
  top: "12px",
  zIndex: "10000",
  padding: "14px",
  width: "210px",
  color: "white",
  background: "rgba(12,15,20,.94)",
  border: "1px solid #76b9ae",
  borderRadius: "12px",
  font: "14px Arial",
  lineHeight: "2"
});

document.body.appendChild(menu);

menu.querySelector("#creatureColor").addEventListener("input", event => {
  const color = event.target.value;

  localAvatar.userData.skin.color.set(color);

  send({
    type: "color",
    color
  });
});

menu.querySelector("#menuStart").addEventListener("click", () => {
  send({ type: "start-round" });
});

menu.querySelector("#menuEnd").addEventListener("click", () => {
  send({ type: "end-round" });
});

// ============================================
// MAP VOTING
// ============================================

voteButtons.forEach(([id, choice]) => {
  const element = document.getElementById(id);

  if (element) {
    element.addEventListener("click", () => {
      send({
        type: "vote",
        choice
      });
    });
  }
});

// ============================================
// ENTER VR
// ============================================

if (enterButton) {
  enterButton.addEventListener("click", async () => {
    if (!navigator.xr) {
      statusEl.textContent =
        "Open this game in Meta Quest Browser for VR.";
      return;
    }

    try {
      const session = await navigator.xr.requestSession(
        "immersive-vr",
        {
          optionalFeatures: [
            "local-floor",
            "bounded-floor",
            "hand-tracking"
          ]
        }
      );

      await renderer.xr.setSession(session);
    } catch (error) {
      statusEl.textContent = `VR error: ${error.message}`;
    }
  });
}

// ============================================
// VR SESSION EVENTS
// ============================================

renderer.xr.addEventListener("sessionstart", () => {
  statusEl.textContent = "VR ready • Push hands to move";
  handInitialized = false;
  xWasPressed = false;
});

renderer.xr.addEventListener("sessionend", () => {
  statusEl.textContent = "VR session ended";

  adminMenu.visible = false;
  menuOpen = false;
  xWasPressed = false;
});

// ============================================
// MAIN GAME LOOP
// ============================================

let lastFrame = 0;

renderer.setAnimationLoop(() => {
  const now = performance.now();

  const dt = Math.min(
    (now - (lastFrame || now)) / 1000,
    0.04
  );

  lastFrame = now;

  if (renderer.xr.isPresenting) {
    handPhysics(dt);
    checkXButton();
    updateTelekinesis(now);
  } else {
    desktopMove(dt);
  }

  sendPose(now);

  renderer.render(scene, camera);
});

// ============================================
// RESIZE
// ============================================

addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(innerWidth, innerHeight);
});
