
import * as THREE from "three";

// ================================================
// THE GRINNER VR
// Full game client
// ================================================

const statusEl = document.getElementById("status");
const roomEl = document.getElementById("room");
const enterButton = document.getElementById("enterVR");

const MAPS = [
  "Yellow Hall",
  "Abandoned School",
  "Red Tunnels"
];

const MAX_SPEED = 8;
const HAND_RADIUS = 0.15;
const FLOOR_Y = 0.15;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x17191c);
scene.fog = new THREE.Fog(0x17191c, 18, 48);

const camera = new THREE.PerspectiveCamera(
  75,
  innerWidth / innerHeight,
  0.05,
  100
);

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  powerPreference: "high-performance"
});

renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
renderer.setSize(innerWidth, innerHeight);
renderer.xr.enabled = true;
renderer.shadowMap.enabled = true;
renderer.outputColorSpace = THREE.SRGBColorSpace;

document.body.appendChild(renderer.domElement);

// ================================================
// LIGHTING
// ================================================

scene.add(
  new THREE.HemisphereLight(
    0xb7c9d8,
    0x28201c,
    1.7
  )
);

const mainLight = new THREE.DirectionalLight(
  0xffe7ca,
  2
);

mainLight.position.set(3, 9, 5);
mainLight.castShadow = true;
scene.add(mainLight);

// ================================================
// PLAYER RIG
// ================================================

const rig = new THREE.Group();
scene.add(rig);

rig.add(camera);
camera.position.set(0, 1.65, 0);

const velocity = new THREE.Vector3();
const previousHands = [
  new THREE.Vector3(),
  new THREE.Vector3()
];

let handsInitialized = false;

// ================================================
// TEXTURES
// ================================================

function createGrimeTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;

  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#b8b4a9";
  ctx.fillRect(0, 0, 512, 512);

  for (let i = 0; i < 6500; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const radius = Math.random() * 4 + 0.4;

    ctx.fillStyle =
      `rgba(34,27,23,${Math.random() * 0.35})`;

    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  for (let i = 0; i < 90; i++) {
    ctx.fillStyle =
      `rgba(25,20,18,${Math.random() * 0.15})`;

    ctx.beginPath();
    ctx.ellipse(
      Math.random() * 512,
      Math.random() * 512,
      Math.random() * 35 + 5,
      Math.random() * 18 + 4,
      Math.random() * 3,
      0,
      Math.PI * 2
    );
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;

  return texture;
}

const grimeTexture = createGrimeTexture();

function createSkinMaterial(color) {
  return new THREE.MeshStandardMaterial({
    color,
    map: grimeTexture,
    roughness: 0.96,
    metalness: 0
  });
}

// ================================================
// CHARACTER MODEL
// ================================================

function createCharacter(color = "#287f78", monster = false) {
  const root = new THREE.Group();

  const skin = createSkinMaterial(
    monster ? "#c9c1b6" : color
  );

  const face = createSkinMaterial("#b9b2a6");

  const dark = new THREE.MeshStandardMaterial({
    color: monster ? 0x21080c : 0x161d20,
    roughness: 0.9
  });

  const eye = new THREE.MeshStandardMaterial({
    color: monster ? 0xff1010 : 0x080808,
    emissive: monster ? 0xff0000 : 0x000000,
    emissiveIntensity: monster ? 2.4 : 0
  });

  const teeth = new THREE.MeshStandardMaterial({
    color: 0xe4dfd1,
    roughness: 0.7
  });

  const arms = [];
  const hands = [];
  const fingers = [];

  function addMesh(
    geometry,
    material,
    position,
    scale
  ) {
    const mesh = new THREE.Mesh(geometry, material);

    mesh.position.set(...position);

    if (scale) {
      mesh.scale.set(...scale);
    }

    mesh.castShadow = true;
    mesh.receiveShadow = true;

    root.add(mesh);
    return mesh;
  }

  // BODY

  addMesh(
    new THREE.SphereGeometry(0.43, 32, 24),
    skin,
    [0, 0.91, 0],
    [1, 1.3, 0.82]
  );

  addMesh(
    new THREE.SphereGeometry(0.3, 24, 20),
    face,
    [0, 0.98, 0.29],
    [0.8, 1.05, 0.18]
  );

  // HEAD

  addMesh(
    new THREE.SphereGeometry(0.34, 32, 24),
    skin,
    [0, 1.67, 0],
    [1.08, 1.08, 0.95]
  );

  // FACE

  addMesh(
    new THREE.SphereGeometry(0.21, 24, 20),
    face,
    [0, 1.51, 0.27],
    [1.15, 0.78, 0.65]
  );

  // EARS

  for (const side of [-1, 1]) {
    addMesh(
      new THREE.SphereGeometry(0.13, 20, 16),
      skin,
      [side * 0.35, 1.68, 0],
      [0.75, 1.1, 0.55]
    );
  }

  // EYES

  for (const side of [-1, 1]) {
    addMesh(
      new THREE.SphereGeometry(0.115, 20, 16),
      dark,
      [side * 0.14, 1.76, 0.285],
      [1.12, 1.15, 0.5]
    );

    if (!(monster && side === 1)) {
      addMesh(
        new THREE.SphereGeometry(0.073, 20, 16),
        eye,
        [side * 0.14, 1.76, 0.34],
        [1, 1, 0.65]
      );
    }
  }

  // MONSTER EYE COVER

  if (monster) {
    const patch = addMesh(
      new THREE.SphereGeometry(0.15, 20, 16),
      new THREE.MeshStandardMaterial({
        color: 0x481016,
        roughness: 1
      }),
      [0.14, 1.76, 0.31],
      [1.15, 0.9, 0.55]
    );

    patch.rotation.z = -0.25;

    const glow = new THREE.PointLight(
      0xff0808,
      1.5,
      2.5
    );

    glow.position.set(-0.14, 1.76, 0.5);
    root.add(glow);
  }

  // MOUTH

  addMesh(
    new THREE.SphereGeometry(0.19, 24, 16),
    dark,
    [0, 1.42, 0.32],
    [1.15, monster ? 0.48 : 0.2, 0.35]
  );

  // SHARP TEETH

  if (monster) {
    for (let i = 0; i < 11; i++) {
      const x = -0.16 + i * 0.032;

      const tooth = new THREE.Mesh(
        new THREE.ConeGeometry(0.024, 0.11, 6),
        teeth
      );

      tooth.position.set(x, 1.44, 0.41);
      tooth.rotation.x = Math.PI;
      root.add(tooth);
    }
  }

  // ARMS

  for (const side of [-1, 1]) {
    const arm = new THREE.Mesh(
      new THREE.CylinderGeometry(0.13, 0.17, 0.95, 18),
      skin
    );

    arm.position.set(side * 0.52, 0.92, 0);
    arm.rotation.z = side * -0.35;

    root.add(arm);
    arms.push(arm);

    // HAND

    const hand = new THREE.Group();

    hand.position.set(
      side * 0.75,
      0.48,
      0.1
    );

    const palm = new THREE.Mesh(
      new THREE.SphereGeometry(0.15, 18, 14),
      skin
    );

    palm.scale.set(1.15, 0.65, 0.85);
    hand.add(palm);

    // FOUR FINGERS

    for (let finger = 0; finger < 4; finger++) {
      const length =
        finger === 0 || finger === 3 ? 0.18 : 0.24;

      const group = new THREE.Group();

      group.position.set(
        (finger - 1.5) * 0.075,
        -0.1,
        0
      );

      for (let segment = 0; segment < 2; segment++) {
        const piece = new THREE.Mesh(
          new THREE.CapsuleGeometry(
            0.032,
            length / 2,
            4,
            8
          ),
          skin
        );

        piece.position.y = -segment * length * 0.48;
        group.add(piece);
      }

      hand.add(group);
      fingers.push(group);
    }

    // THUMB

    const thumb = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.04, 0.15, 4, 8),
      skin
    );

    thumb.position.set(0.17, -0.015, 0.035);
    thumb.rotation.z = -0.85;
    hand.add(thumb);

    root.add(hand);
    hands.push(hand);
  }

  // MONSTER DAMAGE MARKINGS

  if (monster) {
    const damage = new THREE.MeshStandardMaterial({
      color: 0x53151c,
      roughness: 1
    });

    for (let i = 0; i < 16; i++) {
      const mark = new THREE.Mesh(
        new THREE.SphereGeometry(
          0.055 + Math.random() * 0.04,
          10,
          8
        ),
        damage
      );

      mark.position.set(
        (Math.random() - 0.5) * 0.65,
        0.5 + Math.random() * 1.1,
        0.29
      );

      mark.scale.set(1.5, 0.55, 0.2);
      root.add(mark);
    }

    // TALLER MONSTER

    root.scale.set(1.12, 1.38, 1.08);
  }

  root.userData = {
    skin,
    arms,
    hands,
    fingers,
    monster
  };

  return root;
}

// ================================================
// LOCAL PLAYER
// ================================================

const localAvatar = createCharacter();
rig.add(localAvatar);

let monsterAvatar = null;
let myId = null;

// ================================================
// WORLD
// ================================================

const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(42, 60),
  new THREE.MeshStandardMaterial({
    color: 0x6b665c,
    roughness: 1
  })
);

floor.rotation.x = -Math.PI / 2;
floor.position.set(0, 0, -12);
floor.receiveShadow = true;
scene.add(floor);

function createWall(x, y, z, w, h, d, color = 0xc5bd91) {
  const wall = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshStandardMaterial({
      color,
      roughness: 0.9
    })
  );

  wall.position.set(x, y, z);
  wall.castShadow = true;
  wall.receiveShadow = true;
  scene.add(wall);

  return wall;
}

createWall(-5, 2, -10, 0.35, 4, 38);
createWall(5, 2, -10, 0.35, 4, 38);
createWall(0, 4, -10, 10, 0.3, 38);

for (let z = -2; z > -29; z -= 5) {
  createWall(0, 0.04, z, 9.5, 0.05, 0.08, 0x46443d);

  const lamp = new THREE.PointLight(
    0xffe6a5,
    0.8,
    8
  );

  lamp.position.set(0, 3.5, z);
  scene.add(lamp);
}

// ================================================
// MULTIPLAYER
// ================================================

const remotePlayers = new Map();
const dummyObjects = new Map();

let ws = null;
let latestPlayers = [];
let latestDummies = [];

function send(data) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(data));
  }
}

function connect() {
  const protocol =
    location.protocol === "https:" ? "wss:" : "ws:";

  ws = new WebSocket(
    `${protocol}//${location.host}`
  );

  ws.addEventListener("open", () => {
    statusEl.textContent = "Connected";
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
      statusEl.textContent = data.message;
    }

    if (data.type === "kicked") {
      statusEl.textContent = "You were kicked";
    }

    if (data.type === "banned") {
      statusEl.textContent = "You were banned";
    }

    if (data.type === "state") {
      latestPlayers = data.players || [];
      latestDummies = data.dummies || [];

      roomEl.textContent =
        `ROOM: ${data.count}/${data.slots}`;

      statusEl.textContent =
        `${data.map} • ${data.roundActive ? "ROUND LIVE" : "LOBBY"}`;

      updateRemotePlayers();
      updateDummies();

      const me = latestPlayers.find(
        player => player.id === myId
      );

      if (me && me.role === "monster") {
        localAvatar.visible = false;

        if (!monsterAvatar) {
          monsterAvatar = createCharacter(
            "#c9c1b6",
            true
          );

          rig.add(monsterAvatar);
        }
      } else {
        localAvatar.visible = true;

        if (monsterAvatar) {
          rig.remove(monsterAvatar);
          monsterAvatar = null;
        }
      }

      if (
        selectedPlayerId &&
        !latestPlayers.some(
          p => p.id === selectedPlayerId
        )
      ) {
        selectedPlayerId = null;
      }

      buildAdminMenu();
    }
  });

  ws.addEventListener("close", () => {
    statusEl.textContent = "Disconnected";
  });

  ws.addEventListener("error", () => {
    statusEl.textContent = "Connection error";
  });
}

connect();

// ================================================
// REMOTE PLAYERS
// ================================================

function updateRemotePlayers() {
  const seen = new Set();

  for (const player of latestPlayers) {
    if (player.id === myId) continue;

    seen.add(player.id);

    let avatar = remotePlayers.get(player.id);

    const monster = player.role === "monster";

    if (
      !avatar ||
      avatar.userData.monster !== monster
    ) {
      if (avatar) scene.remove(avatar);

      avatar = createCharacter(
        player.color,
        monster
      );

      scene.add(avatar);
      remotePlayers.set(player.id, avatar);
    }

    avatar.position.set(
      player.x || 0,
      player.y || 0,
      player.z || 0
    );

    if (!monster) {
      avatar.userData.skin.color.set(
        player.color || "#287f78"
      );
    }

    const handData = [
      player.leftHand,
      player.rightHand
    ];

    handData.forEach((data, index) => {
      if (!data) return;

      const hand = avatar.userData.hands[index];

      hand.position.set(
        data.x - player.x,
        data.y - player.y,
        data.z - player.z
      );
    });
  }

  for (const [id, avatar] of remotePlayers) {
    if (!seen.has(id)) {
      scene.remove(avatar);
      remotePlayers.delete(id);
    }
  }
}

// ================================================
// DUMMIES
// ================================================

function updateDummies() {
  const seen = new Set();

  for (const dummy of latestDummies) {
    seen.add(dummy.id);

    let object = dummyObjects.get(dummy.id);

    if (!object) {
      object = createCharacter(dummy.color);
      scene.add(object);
      dummyObjects.set(dummy.id, object);
    }

    object.position.set(
      dummy.x || 0,
      dummy.y || 0,
      dummy.z || 0
    );
  }

  for (const [id, object] of dummyObjects) {
    if (!seen.has(id)) {
      scene.remove(object);
      dummyObjects.delete(id);
    }
  }
}

// ================================================
// VR CONTROLLERS
// ================================================

const controllers = [
  renderer.xr.getController(0),
  renderer.xr.getController(1)
];

for (const controller of controllers) {
  rig.add(controller);

  const hand = new THREE.Mesh(
    new THREE.SphereGeometry(0.09, 16, 12),
    new THREE.MeshStandardMaterial({
      color: 0x9bc9ba,
      roughness: 0.8
    })
  );

  controller.add(hand);
}

// ================================================
// ARM MOVEMENT
// ================================================

function worldHandPosition(controller) {
  const position = new THREE.Vector3();

  controller.getWorldPosition(position);

  return position;
}

function handPhysics(dt) {
  if (!renderer.xr.isPresenting) return;

  const hands = controllers.map(worldHandPosition);

  if (!handsInitialized) {
    hands.forEach((hand, i) => {
      previousHands[i].copy(hand);
    });

    handsInitialized = true;
    return;
  }

  let totalPush = new THREE.Vector3();

  for (let i = 0; i < 2; i++) {
    const hand = hands[i];
    const previous = previousHands[i];

    const push = new THREE.Vector3();
    let touching = false;

    // FLOOR PUSH

    if (hand.y < HAND_RADIUS) {
      push.copy(previous).sub(hand);
      touching = true;
    }

    // WALL PUSH

    if (hand.x < -4.82) {
      push.x = previous.x - hand.x;
      touching = true;
    }

    if (hand.x > 4.82) {
      push.x = previous.x - hand.x;
      touching = true;
    }

    // LIMIT CORRECTION

    if (push.length() > 0.3) {
      push.setLength(0.3);
    }

    if (touching) {
      totalPush.add(push);
    }

    previousHands[i].copy(hand);
  }

  // ARM FORCE

  velocity.addScaledVector(totalPush, 1);

  if (velocity.length() > MAX_SPEED) {
    velocity.setLength(MAX_SPEED);
  }

  // FRICTION

  velocity.multiplyScalar(
    Math.pow(0.985, dt * 60)
  );

  // GRAVITY

  velocity.y -= 9.8 * dt;

  rig.position.addScaledVector(velocity, dt);

  // GROUND

  if (rig.position.y < 0) {
    rig.position.y = 0;

    if (velocity.y < 0) {
      velocity.y = 0;
    }
  }

  // WORLD BOUNDS

  rig.position.x = THREE.MathUtils.clamp(
    rig.position.x,
    -4.2,
    4.2
  );

  rig.position.z = THREE.MathUtils.clamp(
    rig.position.z,
    -29,
    5
  );
}

// ================================================
// PLAYER POSITION SYNC
// ================================================

let lastPose = 0;

function sendPose(now) {
  if (now - lastPose < 50) return;

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

  lastPose = now;
}

// ================================================
// ADMIN LOGIN
// ================================================

let isAdmin = false;
let selectedPlayerId = null;
let heldPlayerId = null;
let activeTab = "Players";

function loginAdmin() {
  const token = prompt(
    "Enter your Render ADMIN_TOKEN:"
  );

  if (!token) return;

  send({
    type: "admin-login",
    name: "gamingforfun69",
    token
  });
}

// ================================================
// ADMIN 3D MENU
// ================================================

const adminMenu = new THREE.Group();

camera.add(adminMenu);

adminMenu.position.set(0, 0, -1.2);
adminMenu.scale.setScalar(0.85);
adminMenu.visible = false;

let menuOpen = false;

const menuButtons = [];
const raycaster = new THREE.Raycaster();

function makeMenuTexture(label, color) {
  const canvas = document.createElement("canvas");

  canvas.width = 512;
  canvas.height = 128;

  const ctx = canvas.getContext("2d");

  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 512, 128);

  ctx.strokeStyle = "#849ba9";
  ctx.lineWidth = 5;
  ctx.strokeRect(3, 3, 506, 122);

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 36px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, 256, 64, 480);

  return new THREE.CanvasTexture(canvas);
}

function clearAdminMenu() {
  while (adminMenu.children.length) {
    const child = adminMenu.children[0];

    adminMenu.remove(child);

    child.geometry?.dispose();

    if (child.material) {
      child.material.map?.dispose();
      child.material.dispose();
    }
  }

  menuButtons.length = 0;
}

function addButton(label, x, y, callback, color = "#252c35") {
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(0.48, 0.12),
    new THREE.MeshBasicMaterial({
      map: makeMenuTexture(label, color)
    })
  );

  mesh.position.set(x, y, 0.03);
  mesh.userData.callback = callback;

  adminMenu.add(mesh);
  menuButtons.push(mesh);
}

function addText(label, x, y) {
  const canvas = document.createElement("canvas");

  canvas.width = 1024;
  canvas.height = 100;

  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 42px Arial";
  ctx.textAlign = "center";
  ctx.fillText(label, 512, 62);

  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(0.95, 0.09),
    new THREE.MeshBasicMaterial({
      map: new THREE.CanvasTexture(canvas),
      transparent: true
    })
  );

  mesh.position.set(x, y, 0.025);
  adminMenu.add(mesh);
}

function getSelectedPlayer() {
  return latestPlayers.find(
    p => p.id === selectedPlayerId
  );
}

function buildAdminMenu() {
  if (!menuOpen) return;

  clearAdminMenu();

  const background = new THREE.Mesh(
    new THREE.PlaneGeometry(1.15, 0.98),
    new THREE.MeshBasicMaterial({
      color: 0x10151c,
      transparent: true,
      opacity: 0.97
    })
  );

  background.position.z = -0.01;
  adminMenu.add(background);

  addText("ADMIN MOD MENU", 0, 0.39);

  if (!isAdmin) {
    addText("ADMIN LOGIN REQUIRED", 0, 0.12);

    addButton(
      "LOGIN",
      0,
      -0.08,
      loginAdmin,
      "#245c49"
    );

    return;
  }

  addButton(
    "PLAYERS",
    -0.36,
    0.24,
    () => {
      activeTab = "Players";
      buildAdminMenu();
    },
    activeTab === "Players" ? "#315b75" : "#252c35"
  );

  addButton(
    "DUMMIES",
    0,
    0.24,
    () => {
      activeTab = "Dummies";
      buildAdminMenu();
    },
    activeTab === "Dummies" ? "#315b75" : "#252c35"
  );

  addButton(
    "TELEKINESIS",
    0.36,
    0.24,
    () => {
      activeTab = "Telekinesis";
      buildAdminMenu();
    },
    activeTab === "Telekinesis" ? "#315b75" : "#252c35"
  );

  if (activeTab === "Players") {
    const others = latestPlayers.filter(
      p => p.id !== myId
    );

    addText(`PLAYERS: ${others.length}`, 0, 0.12);

    others.slice(0, 4).forEach((player, i) => {
      addButton(
        player.name,
        0,
        0.01 - i * 0.13,
        () => {
          selectedPlayerId = player.id;
          buildAdminMenu();
        },
        selectedPlayerId === player.id
          ? "#426c43"
          : "#252c35"
      );
    });

    const selected = getSelectedPlayer();

    if (selected) {
      addText(
        `SELECTED: ${selected.name}`,
        0,
        -0.53
      );

      addButton(
        "KICK",
        -0.25,
        -0.69,
        () => {
          send({
            type: "kick-player",
            targetId: selected.id
          });
        },
        "#8b3939"
      );

      addButton(
        "BAN",
        0.25,
        -0.69,
        () => {
          if (confirm(`Ban ${selected.name}?`)) {
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

  if (activeTab === "Dummies") {
    addText(
      `DUMMIES: ${latestDummies.length}/10`,
      0,
      0.1
    );

    addButton(
      "SPAWN DUMMY",
      0,
      -0.08,
      () => send({ type: "spawn-dummy" }),
      "#315b75"
    );

    addButton(
      "REMOVE ALL",
      0,
      -0.26,
      () => send({ type: "remove-dummies" }),
      "#8b3939"
    );
  }

  if (activeTab === "Telekinesis") {
    const selected = getSelectedPlayer();

    addText(
      selected
        ? `TARGET: ${selected.name}`
        : "SELECT A PLAYER FIRST",
      0,
      0.1
    );

    addButton(
      "SELECT PLAYER",
      0,
      -0.03,
      () => {
        activeTab = "Players";
        buildAdminMenu();
      },
      "#315b75"
    );

    addButton(
      "GRAB",
      -0.25,
      -0.2,
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

    addButton(
      "RELEASE",
      0.25,
      -0.2,
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

    addText(
      heldPlayerId ? "HOLDING PLAYER" : "NOT HOLDING",
      0,
      -0.4
    );
  }
}

// ================================================
// ADMIN CONTROLLER RAY
// ================================================

const rightController = controllers[1];

const ray = new THREE.Line(
  new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 0, -5)
  ]),
  new THREE.LineBasicMaterial({
    color: 0x9ce2d5
  })
);

rightController.add(ray);

rightController.addEventListener("selectstart", () => {
  if (!menuOpen) return;

  const origin = new THREE.Vector3();
  const direction = new THREE.Vector3(0, 0, -1);

  rightController.getWorldPosition(origin);

  direction.applyQuaternion(
    rightController.getWorldQuaternion(
      new THREE.Quaternion()
    )
  );

  raycaster.set(origin, direction);
  raycaster.far = 5;

  const hits = raycaster.intersectObjects(
    menuButtons,
    false
  );

  if (hits.length) {
    hits[0].object.userData.callback?.();
  }
});

// ================================================
// LEFT CONTROLLER X BUTTON
// ================================================

let xWasPressed = false;

function checkXButton() {
  const session = renderer.xr.getSession();

  if (!session) return;

  const leftSource = [...session.inputSources].find(
    source => source.handedness === "left"
  );

  if (!leftSource?.gamepad) return;

  const pressed = !!leftSource.gamepad.buttons[4]?.pressed;

  if (pressed && !xWasPressed) {
    menuOpen = !menuOpen;
    adminMenu.visible = menuOpen;

    if (menuOpen) {
      buildAdminMenu();

      if (!isAdmin) {
        loginAdmin();
      }
    }
  }

  xWasPressed = pressed;
}

// ================================================
// TELEKINESIS
// ================================================

let lastTelekinesis = 0;

function updateTelekinesis(now) {
  if (!isAdmin || !heldPlayerId) return;

  if (now - lastTelekinesis < 80) return;

  const position = new THREE.Vector3();
  const direction = new THREE.Vector3();

  camera.getWorldPosition(position);
  camera.getWorldDirection(direction);

  position.addScaledVector(direction, 1.8);

  send({
    type: "move-held-player",
    targetId: heldPlayerId,
    x: position.x,
    y: THREE.MathUtils.clamp(position.y - 1.2, 0, 3),
    z: position.z
  });

  lastTelekinesis = now;
}

// ================================================
// DESKTOP CONTROLS
// ================================================

const keys = {};

addEventListener("keydown", event => {
  keys[event.code] = true;
});

addEventListener("keyup", event => {
  keys[event.code] = false;
});

function desktopMovement(dt) {
  const speed = 3 * dt;

  if (keys.KeyW) rig.position.z -= speed;
  if (keys.KeyS) rig.position.z += speed;
  if (keys.KeyA) rig.position.x -= speed;
  if (keys.KeyD) rig.position.x += speed;
}

// ================================================
// PLAYER COLOUR
// ================================================

let playerColor = "#287f78";

function changeColor(color) {
  playerColor = color;
  localAvatar.userData.skin.color.set(color);

  send({
    type: "color",
    color
  });
}

// ================================================
// PLAYER SETTINGS MENU
// ================================================

const playerMenu = document.createElement("div");

playerMenu.innerHTML = `
  <b>THE GRINNER VR</b>
  <hr>
  <label>
    Player colour
    <input id="playerColor" type="color" value="#287f78">
  </label>
`;

Object.assign(playerMenu.style, {
  position: "fixed",
  top: "12px",
  left: "12px",
  zIndex: "10000",
  padding: "12px",
  color: "white",
  background: "rgba(10,14,19,.92)",
  border: "1px solid #7ca99f",
  borderRadius: "10px",
  font: "14px Arial"
});

document.body.appendChild(playerMenu);

playerMenu.querySelector("#playerColor")
  .addEventListener("input", event => {
    changeColor(event.target.value);
  });

// ================================================
// MAP VOTING
// ================================================

const voteIds = [
  "voteForest",
  "voteCaves",
  "voteFacility"
];

voteIds.forEach((id, index) => {
  const button = document.getElementById(id);

  if (!button) return;

  button.addEventListener("click", () => {
    send({
      type: "vote",
      choice: MAPS[index]
    });
  });
});

// ================================================
// ENTER VR
// ================================================

if (enterButton) {
  enterButton.addEventListener("click", async () => {
    if (!navigator.xr) {
      statusEl.textContent =
        "Use Meta Quest Browser for VR.";
      return;
    }

    try {
      const session = await navigator.xr.requestSession(
        "immersive-vr",
        {
          optionalFeatures: [
            "local-floor",
            "bounded-floor"
          ]
        }
      );

      await renderer.xr.setSession(session);
    } catch (error) {
      statusEl.textContent =
        `VR error: ${error.message}`;
    }
  });
}

// ================================================
// VR EVENTS
// ================================================

renderer.xr.addEventListener("sessionstart", () => {
  statusEl.textContent = "VR CONNECTED";
  handsInitialized = false;
  xWasPressed = false;
});

renderer.xr.addEventListener("sessionend", () => {
  statusEl.textContent = "VR DISCONNECTED";

  menuOpen = false;
  adminMenu.visible = false;
  handsInitialized = false;
});

// ================================================
// MAIN LOOP
// ================================================

let lastFrame = 0;
let lastPoseSend = 0;

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
    desktopMovement(dt);
  }

  if (now - lastPoseSend > 50) {
    sendPose(now);
    lastPoseSend = now;
  }

  renderer.render(scene, camera);
});

// ================================================
// RESIZE
// ================================================

addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(innerWidth, innerHeight);
});
