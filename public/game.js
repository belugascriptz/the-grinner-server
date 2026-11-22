
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

// ==========================================
// THE GRINNER VR - CHARACTER UPDATE
// Legless characters, controller-driven arms,
// larger monster, multiplayer and wrist menu.
// ==========================================

const statusEl = document.getElementById("status");
const roomEl = document.getElementById("room");
const enterButton = document.getElementById("enterVR");

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x090b0d);
scene.fog = new THREE.FogExp2(0x090b0d, 0.027);

const camera = new THREE.PerspectiveCamera(
  70, innerWidth / innerHeight, 0.05, 100
);
camera.position.set(0, 1.6, 0);

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

scene.add(new THREE.HemisphereLight(0x87909b, 0x17100d, 1.1));

const mainLight = new THREE.DirectionalLight(0xb8b3a6, 1.1);
mainLight.position.set(5, 10, 4);
mainLight.castShadow = true;
scene.add(mainLight);

const world = new THREE.Group();
scene.add(world);

// ==========================================
// ROOM
// ==========================================

const concrete = new THREE.MeshStandardMaterial({
  color: 0x383a37, roughness: 1
});
const darkConcrete = new THREE.MeshStandardMaterial({
  color: 0x202322, roughness: 1
});
const metal = new THREE.MeshStandardMaterial({
  color: 0x343b3d, metalness: 0.55, roughness: 0.75
});
const rustyMetal = new THREE.MeshStandardMaterial({
  color: 0x49312a, metalness: 0.25, roughness: 1
});
const warningMaterial = new THREE.MeshStandardMaterial({
  color: 0x8c171b,
  emissive: 0x5c080c,
  emissiveIntensity: 1.4
});

function block(parent, material, x, y, z, sx, sy, sz) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(sx, sy, sz), material
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
}

block(world, concrete, 0, -0.2, 0, 30, 0.4, 30);

for (let x = -12; x <= 12; x += 3) {
  for (let z = -12; z <= 12; z += 3) {
    block(world, darkConcrete, x, 0.005, z, 2.85, 0.025, 2.85);
  }
}

block(world, darkConcrete, 0, 3, -15, 30, 6, 0.5);
block(world, darkConcrete, 0, 3, 15, 30, 6, 0.5);
block(world, darkConcrete, -15, 3, 0, 0.5, 6, 30);
block(world, darkConcrete, 15, 3, 0, 0.5, 6, 30);

for (let z = -12; z <= 12; z += 4) {
  block(world, metal, 0, 5.5, z, 30, 0.22, 0.28);
}

for (const x of [-12, -8, 8, 12]) {
  for (const z of [-10, -4, 4, 10]) {
    block(world, rustyMetal, x, 2.6, z, 0.45, 5.2, 0.45);
  }
}

block(world, rustyMetal, -7, 0.55, -5, 5, 1.1, 3);
block(world, rustyMetal, 7, 0.75, -8, 4, 1.5, 4);
block(world, metal, -8, 1.2, 6, 3, 2.4, 3);
block(world, metal, 8, 0.45, 7, 5, 0.9, 3);

block(world, darkConcrete, -7, 1.12, -5, 4.8, 0.06, 2.8);
block(world, darkConcrete, 7, 1.52, -8, 3.8, 0.06, 3.8);
block(world, darkConcrete, -8, 2.42, 6, 2.8, 0.06, 2.8);
block(world, darkConcrete, 8, 0.92, 7, 4.8, 0.06, 2.8);

block(world, metal, 0, 1.1, -5, 3.2, 2.2, 2.5);
block(world, darkConcrete, 0, 2.25, -5, 3.5, 0.15, 2.8);

block(world, darkConcrete, -3, 1.5, 11, 0.35, 3, 6);
block(world, darkConcrete, 3, 1.5, 11, 0.35, 3, 6);
block(world, metal, 0, 3.05, 11, 6.4, 0.35, 6);

for (const z of [-11, -5, 1, 7, 12]) {
  const glow = new THREE.Mesh(
    new THREE.BoxGeometry(1.1, 0.1, 0.2),
    warningMaterial
  );
  glow.position.set(0, 4.9, z);
  world.add(glow);
  addLight(0, 4.4, z, 0xff2525, 0.65, 7);
}

for (const z of [-10, -2, 6, 12]) {
  for (const x of [-14.6, 14.6]) {
    block(world, rustyMetal, x, 3.6, z, 0.25, 0.7, 0.7);
    addLight(x * 0.96, 3.6, z, 0xff3830, 0.45, 5);
  }
}

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
// CHARACTER TEXTURES
// ==========================================

function makeTexture(base, darkColor, redMarks = false) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 512, 512);

  for (let i = 0; i < 6500; i++) {
    const shade = Math.floor(25 + Math.random() * 100);
    const alpha = Math.random() * 0.35;

    ctx.fillStyle = `rgba(${shade},${shade},${shade},${alpha})`;
    ctx.fillRect(
      Math.random() * 512,
      Math.random() * 512,
      Math.random() * 5 + 1,
      Math.random() * 5 + 1
    );
  }

  for (let i = 0; i < 180; i++) {
    ctx.strokeStyle = darkColor;
    ctx.globalAlpha = Math.random() * 0.35;
    ctx.lineWidth = Math.random() * 5 + 1;
    ctx.beginPath();
    ctx.moveTo(Math.random() * 512, Math.random() * 512);
    ctx.lineTo(Math.random() * 512, Math.random() * 512);
    ctx.stroke();
  }

  if (redMarks) {
    for (let i = 0; i < 90; i++) {
      ctx.fillStyle = `rgba(100,8,12,${Math.random() * 0.35})`;
      ctx.beginPath();
      ctx.ellipse(
        Math.random() * 512,
        Math.random() * 512,
        Math.random() * 24 + 3,
        Math.random() * 12 + 2,
        Math.random() * Math.PI,
        0, Math.PI * 2
      );
      ctx.fill();
    }
  }

  ctx.globalAlpha = 1;

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1.5, 1.5);
  return texture;
}

const normalTexture = makeTexture("#777568", "rgba(25,22,18,0.5)");
const monsterTexture = makeTexture(
  "#392c2b", "rgba(12,5,5,0.65)", true
);

// ==========================================
// CHARACTER MODEL HELPERS
// ==========================================

const unitY = new THREE.Vector3(0, 1, 0);
// ==========================================
// IMPORTED CHARACTER MODELS
// ==========================================

const characterLoader = new GLTFLoader();

const characterTemplates = {
  player: null,
  monster: null
};

const allAvatars = new Set();

function installCharacterModel(avatar, template) {
  const model = template.clone(true);

  // The exported models face the opposite direction.
  model.rotation.y = Math.PI;

  avatar.group.clear();
  avatar.group.add(model);

  avatar.externalModel = model;
}

function loadCharacterModels() {
  characterLoader.load(
    "/models/the_grinner_normal_player.glb",
    gltf => {
      characterTemplates.player = gltf.scene;

      for (const avatar of allAvatars) {
        if (avatar.role === "player") {
          installCharacterModel(avatar, gltf.scene);
        }
      }

      console.log("Normal Player model loaded");
    },
    undefined,
    error => console.error("Normal model failed to load:", error)
  );

  characterLoader.load(
    "/models/the_grinner_monster.glb",
    gltf => {
      characterTemplates.monster = gltf.scene;

      for (const avatar of allAvatars) {
        if (avatar.role === "monster") {
          installCharacterModel(avatar, gltf.scene);
        }
      }

      console.log("Grinner monster model loaded");
    },
    undefined,
    error => console.error("Monster model failed to load:", error)
  );
}
function makeMaterial(color, texture = null, roughness = 1) {
  return new THREE.MeshStandardMaterial({
    color,
    map: texture,
    roughness
  });
}

function makeLimb(parent, material, radius, length = 1) {
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.82, radius, length, 7),
    material
  );
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function placeLimb(mesh, start, end) {
  const direction = new THREE.Vector3().subVectors(end, start);
  const length = direction.length();

  mesh.position.copy(start).add(end).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(unitY, direction.normalize());
  mesh.scale.set(1, Math.max(0.001, length), 1);
}

function makeJoint(parent, material, radius) {
  const mesh = new THREE.Mesh(
    new THREE.IcosahedronGeometry(radius, 1),
    material
  );
  mesh.castShadow = true;
  parent.add(mesh);
  return mesh;
}

// ==========================================
// LEGLESS PLAYER / MONSTER
// ==========================================

function createAvatar(options = {}) {
  const monster = options.role === "monster";
  const group = new THREE.Group();

  // Monster is 1.4 times larger in every direction.
  group.scale.setScalar(monster ? 1.4 : 1);

  const fur = makeMaterial(
    monster ? 0x55403e : 0x777568,
    monster ? monsterTexture : normalTexture
  );

  const pale = makeMaterial(
    monster ? 0xaaa09a : 0xb9b0a0,
    monster ? monsterTexture : normalTexture
  );

  const dark = makeMaterial(monster ? 0x10090a : 0x211c1b);
  const black = makeMaterial(0x050505);
  const red = makeMaterial(0x68161b);
  const teeth = makeMaterial(0xd7c8a8);

  const torso = new THREE.Group();
  group.add(torso);

  // Broad upper body. No legs or feet are created.
  const chest = new THREE.Mesh(
    new THREE.DodecahedronGeometry(0.56, 1), fur
  );
  chest.scale.set(1.04, 1.1, 0.78);
  chest.position.set(0, 1.08, 0);
  chest.castShadow = true;
  torso.add(chest);

  const belly = new THREE.Mesh(
    new THREE.DodecahedronGeometry(0.43, 1), fur
  );
  belly.scale.set(1, 0.88, 0.75);
  belly.position.set(0, 0.72, 0.015);
  belly.castShadow = true;
  torso.add(belly);

  const chestPatch = new THREE.Mesh(
    new THREE.DodecahedronGeometry(0.36, 1), pale
  );
  chestPatch.scale.set(1, 1.3, 0.23);
  chestPatch.position.set(0, 1.02, -0.36);
  torso.add(chestPatch);

  // Head pivot follows headset position.
  const head = new THREE.Group();
  group.add(head);

  const skull = new THREE.Mesh(
    new THREE.DodecahedronGeometry(0.38, 1), fur
  );
  skull.scale.set(1.08, 1.03, 0.94);
  skull.castShadow = true;
  head.add(skull);

  const face = new THREE.Mesh(
    new THREE.DodecahedronGeometry(0.27, 1), pale
  );
  face.scale.set(1.03, 0.83, 0.42);
  face.position.set(0, -0.10, -0.27);
  head.add(face);

  // Deep eye sockets.
  for (const side of [-1, 1]) {
    const socket = new THREE.Mesh(
      new THREE.SphereGeometry(0.105, 12, 10), dark
    );
    socket.scale.set(1, 1.12, 0.45);
    socket.position.set(side * 0.145, 0.055, -0.355);
    head.add(socket);

    const eye = new THREE.Mesh(
      new THREE.SphereGeometry(0.045, 10, 8), black
    );
    eye.position.set(side * 0.145, 0.055, -0.39);
    head.add(eye);
  }

  const nose = new THREE.Mesh(
    new THREE.DodecahedronGeometry(0.075, 0),
    dark
  );
  nose.scale.set(1.2, 0.7, 0.6);
  nose.position.set(0, -0.12, -0.39);
  head.add(nose);

  // Wide dark grin.
  const mouth = new THREE.Mesh(
    new THREE.BoxGeometry(0.39, monster ? 0.20 : 0.13, 0.035),
    dark
  );
  mouth.position.set(0, -0.245, -0.355);
  head.add(mouth);

  // Uneven teeth, stylized rather than graphic.
  const toothCount = monster ? 9 : 7;
  for (let i = 0; i < toothCount; i++) {
    const width = monster ? 0.043 : 0.035;
    const height = monster ? 0.095 : 0.045;

    const tooth = new THREE.Mesh(
      new THREE.ConeGeometry(width, height, 4),
      teeth
    );
    tooth.position.set(
      (i - (toothCount - 1) / 2) * (monster ? 0.045 : 0.052),
      -0.22 - (i % 2) * 0.018,
      -0.383
    );
    tooth.rotation.z = Math.PI;
    head.add(tooth);
  }

  // Ears.
  for (const side of [-1, 1]) {
    const ear = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.12, 0), fur
    );
    ear.scale.set(0.8, 1.1, 0.6);
    ear.position.set(side * 0.39, 0.02, 0);
    head.add(ear);
  }

  // Monster has a dark red damaged-looking face patch.
  if (monster) {
    const patch = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.15, 0), red
    );
    patch.scale.set(1.1, 0.8, 0.35);
    patch.position.set(-0.20, 0.22, -0.31);
    head.add(patch);

    const brow = new THREE.Mesh(
      new THREE.BoxGeometry(0.23, 0.075, 0.06), red
    );
    brow.position.set(0.16, 0.18, -0.34);
    brow.rotation.z = -0.18;
    head.add(brow);
  }

  // Shoulder joints and controller-driven arms.
  const arms = [];

  for (const side of [-1, 1]) {
    const shoulder = makeJoint(group, fur, monster ? 0.25 : 0.21);
    const upperArm = makeLimb(group, fur, monster ? 0.19 : 0.16);
    const elbow = makeJoint(group, fur, monster ? 0.16 : 0.13);
    const forearm = makeLimb(group, fur, monster ? 0.155 : 0.13);
    const wrist = makeJoint(group, fur, monster ? 0.12 : 0.105);

    const hand = new THREE.Group();
    group.add(hand);

    const palm = new THREE.Mesh(
      new THREE.DodecahedronGeometry(monster ? 0.17 : 0.145, 1),
      pale
    );
    palm.scale.set(1.12, 0.78, 0.55);
    palm.castShadow = true;
    hand.add(palm);

    const fingers = [];
    for (let f = 0; f < 4; f++) {
      const finger = makeLimb(hand, pale, monster ? 0.036 : 0.028);
      const spread = (f - 1.5) * 0.075;
      finger.userData.spread = spread;
      finger.userData.index = f;
      fingers.push(finger);
    }

    const thumb = makeLimb(hand, pale, monster ? 0.04 : 0.032);
    thumb.rotation.z = side * -0.65;

    arms.push({
      side, shoulder, upperArm, elbow, forearm, wrist,
      hand, fingers, thumb
    });
  }

  // Dirt plates and scratches across torso.
  for (let i = 0; i < 18; i++) {
    const mark = new THREE.Mesh(
      new THREE.DodecahedronGeometry(
        0.025 + Math.random() * 0.055, 0
      ),
      i % 3 === 0 ? dark : (monster ? red : dark)
    );

    mark.position.set(
      (Math.random() - 0.5) * 0.78,
      0.65 + Math.random() * 0.85,
      -0.38 - Math.random() * 0.025
    );
    mark.scale.set(1.4, 0.7, 0.25);
    torso.add(mark);
  const avatar = {
  group,
  head,
  torso,
  arms,
  monster,
  role: monster ? "monster" : "player",
  externalModel: null,
  headPosition: new THREE.Vector3(0, 1.65, 0)
};

allAvatars.add(avatar);

const template = characterTemplates[avatar.role];

if (template) {
  installCharacterModel(avatar, template);
}

return avatar;
}

// ==========================================
// LOCAL PLAYER
// ==========================================

const rig = new THREE.Group();
scene.add(rig);
rig.position.set(0, 0, 2);

const localAvatar = createAvatar({ role: "player" });
rig.add(localAvatar.group);

const controllerLeft = renderer.xr.getController(0);
const controllerRight = renderer.xr.getController(1);
scene.add(controllerLeft, controllerRight);

const handGeometry = new THREE.SphereGeometry(0.08, 12, 10);
const handMaterial = new THREE.MeshStandardMaterial({ color: 0xb9b0a0 });

const leftHandMarker = new THREE.Mesh(handGeometry, handMaterial);
const rightHandMarker = new THREE.Mesh(handGeometry, handMaterial);
scene.add(leftHandMarker, rightHandMarker);

const controllerRay = new THREE.Raycaster();

// ==========================================
// ARM POSE UPDATES
// ==========================================

const tempVector = new THREE.Vector3();

function updateAvatarPose(avatar, headLocal, leftLocal, rightLocal) {
  if (avatar.externalModel) {
    const modelHeadHeight = avatar.monster ? 1.435 : 1.04;

    avatar.externalModel.position.set(
      headLocal.x,
      headLocal.y - modelHeadHeight,
      headLocal.z
    );

    return;
  }

  avatar.head.position.copy(headLocal);

  // Body hangs below the headset.
  avatar.torso.position.set(
    headLocal.x,
    headLocal.y - 0.66,
    headLocal.z + 0.02
  );

  const shoulderY = headLocal.y - 0.48;

  for (const arm of avatar.arms) {
    const handPosition = arm.side < 0 ? leftLocal : rightLocal;

    if (!handPosition) continue;

    const shoulderPosition = new THREE.Vector3(
      arm.side * 0.47,
      shoulderY,
      headLocal.z + 0.02
    );

    const elbowPosition = new THREE.Vector3(
      (shoulderPosition.x + handPosition.x) * 0.5,
      (shoulderPosition.y + handPosition.y) * 0.5 + 0.10,
      (shoulderPosition.z + handPosition.z) * 0.5
    );

    arm.shoulder.position.copy(shoulderPosition);
    arm.elbow.position.copy(elbowPosition);
    arm.wrist.position.copy(handPosition);

    placeLimb(arm.upperArm, shoulderPosition, elbowPosition);
    placeLimb(arm.forearm, elbowPosition, handPosition);

    arm.hand.position.copy(handPosition);
    arm.hand.lookAt(
      handPosition.x,
      handPosition.y,
      handPosition.z - 1
    );

    for (const finger of arm.fingers) {
      const spread = finger.userData.spread;
      const f = finger.userData.index;
      const start = new THREE.Vector3(spread, -0.035, -0.06);
      const end = new THREE.Vector3(
        spread * 1.5,
        -0.17 - (f % 2) * 0.015,
        -0.10
      );
      placeLimb(finger, start, end);
    }

    placeLimb(
      arm.thumb,
      new THREE.Vector3(arm.side * -0.09, -0.01, -0.03),
      new THREE.Vector3(arm.side * -0.18, -0.12, -0.09)
    );
  }
}

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
      roomId = data.roomId || roomId;
      players = data.players || [];
      dummies = data.dummies || [];

      if (roomEl) {
        roomEl.textContent =
          `ROOM: ${roomId} | PLAYERS: ${players.length}/12`;
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

function worldToLocal(group, position) {
  return group.worldToLocal(position.clone());
}

function updateRemotePlayers() {
  const active = new Set();

  for (const player of players) {
    if (player.id === myId) continue;
    active.add(player.id);

    const role = player.role === "monster" ? "monster" : "player";
    let avatar = remotePlayers.get(player.id);

    if (!avatar || avatar.role !== role) {
      if (avatar) scene.remove(avatar.model.group);

      const model = createAvatar({ role });
      scene.add(model.group);

      avatar = {
        model,
        role,
        group: model.group
      };
      remotePlayers.set(player.id, avatar);
    }

    avatar.group.position.set(
      player.x || 0, player.y || 0, player.z || 0
    );

    const head = new THREE.Vector3(0, 1.65, 0);

    // Compatible with servers that later send headPosition.
    if (player.headPosition) {
      head.set(
        player.headPosition.x - (player.x || 0),
        player.headPosition.y - (player.y || 0),
        player.headPosition.z - (player.z || 0)
      );
    }

    const left = player.leftHand
      ? worldToLocal(avatar.group, new THREE.Vector3(
          player.leftHand.x, player.leftHand.y, player.leftHand.z
        ))
      : new THREE.Vector3(-0.9, 0.65, -0.2);

    const right = player.rightHand
      ? worldToLocal(avatar.group, new THREE.Vector3(
          player.rightHand.x, player.rightHand.y, player.rightHand.z
        ))
      : new THREE.Vector3(0.9, 0.65, -0.2);

    updateAvatarPose(avatar.model, head, left, right);
  }

  for (const [id, avatar] of remotePlayers) {
    if (!active.has(id)) {
      scene.remove(avatar.model.group);
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
      const model = createAvatar({ role: dummy.role || "player" });
      scene.add(model.group);
      avatar = { model, group: model.group };
      remoteDummies.set(dummy.id, avatar);
    }

    avatar.group.position.set(
      dummy.x || 0, dummy.y || 0, dummy.z || 0
    );

    updateAvatarPose(
      avatar.model,
      new THREE.Vector3(0, 1.65, 0),
      new THREE.Vector3(-0.9, 0.65, -0.2),
      new THREE.Vector3(0.9, 0.65, -0.2)
    );
  }

  for (const [id, avatar] of remoteDummies) {
    if (!active.has(id)) {
      scene.remove(avatar.model.group);
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
      map: texture, transparent: true, depthWrite: false
    })
  );
  text.position.z = 0.025;
  return text;
}

function addMenuButton(label, x, y, width, action, color = 0x343a43) {
  const button = new THREE.Mesh(
    new THREE.BoxGeometry(width, 0.105, 0.025),
    new THREE.MeshStandardMaterial({ color, roughness: 0.8 })
  );

  button.position.set(x, y, 0.012);
  button.userData.action = action;
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
    new THREE.MeshStandardMaterial({ color: 0x17191e })
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
  controllerLeft.add(menu);

  refreshAdminMenu();
}

function addTab(label, x, tab) {
  addMenuButton(
    label, x, 0.36, 0.20,
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

    others.slice(playerPage * 3, playerPage * 3 + 3)
      .forEach((player, index) => {
        const selected = selectedPlayerId === player.id;
        addMenuButton(
          `${selected ? "> " : ""}${player.name || "PLAYER"}`,
          0, 0.055 - index * 0.13, 0.72,
          () => {
            selectedPlayerId = player.id;
            refreshAdminMenu();
          },
          selected ? 0x76512a : 0x343a43
        );
      });

    addMenuButton(
      "KICK SELECTED", 0, -0.35, 0.72,
      () => {
        if (!selectedPlayerId) return;
        send({ type: "kick-player", targetId: selectedPlayerId });
        selectedPlayerId = null;
      },
      0x74343a
    );

    addMenuButton(
      "BAN SELECTED", 0, -0.49, 0.72,
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
      "SPAWN DUMMY", 0, 0.13, 0.72,
      () => send({ type: "spawn-dummy" }), 0x315c42
    );
    addMenuButton(
      "REMOVE ALL DUMMIES", 0, -0.04, 0.72,
      () => send({ type: "remove-dummies" }), 0x74343a
    );
    addMenuButton(
      `DUMMIES: ${dummies.length}`, 0, -0.21, 0.72,
      () => {}, 0x45404b
    );
  }

  if (menuTab === "TELE") {
    addMenuButton(
      "SELECT PLAYER IN PLAYERS", 0, 0.17, 0.72,
      () => {
        menuTab = "PLAYERS";
        refreshAdminMenu();
      }
    );
    addMenuButton(
      "GRAB SELECTED", 0, 0, 0.72,
      () => {
        if (!selectedPlayerId) return;
        heldPlayerId = selectedPlayerId;
        send({ type: "grab-player", targetId: heldPlayerId });
      }, 0x315c42
    );
    addMenuButton(
      "RELEASE PLAYER", 0, -0.17, 0.72,
      () => {
        if (!heldPlayerId) return;
        send({ type: "release-player", targetId: heldPlayerId });
        heldPlayerId = null;
      }, 0x74343a
    );
  }

  if (menuTab === "SERVER") {
    addMenuButton(`ROOM: ${roomId}`, 0, 0.15, 0.72, () => {}, 0x45404b);
    addMenuButton(`PLAYERS: ${players.length}`, 0, -0.02, 0.72, () => {}, 0x45404b);
    addMenuButton("CLOSE MENU", 0, -0.19, 0.72, toggleMenu, 0x74343a);
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
  controllerRight.getWorldPosition(origin);

  const direction = new THREE.Vector3(0, 0, -1);
  direction.applyQuaternion(controllerRight.getWorldQuaternion(
    new THREE.Quaternion()
  ));

  controllerRay.set(origin, direction);
  const hits = controllerRay.intersectObjects(menuButtons, false);

  if (hits.length) hits[0].object.userData.action?.();
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

function handleXRButtons(frame) {
  const left = findInput("left");
  const right = findInput("right");

  const xPressed = getGamepadButton(left, 4);
  if (xPressed && !previousX) toggleMenu();
  previousX = xPressed;

  const triggerPressed = getGamepadButton(right, 0);
  if (triggerPressed && !previousTrigger && menuOpen) {
    clickMenuWithRightController();
  }
  previousTrigger = triggerPressed;

  if (menuOpen && right?.hand && frame) {
    const joint = right.hand.get("index-finger-tip");
    const referenceSpace = renderer.xr.getReferenceSpace();

    if (joint && referenceSpace) {
      const pose = frame.getJointPose(joint, referenceSpace);
      if (pose) {
        activateTouchedButton(new THREE.Vector3(
          pose.transform.position.x,
          pose.transform.position.y,
          pose.transform.position.z
        ));
      }
    }
  }
}

// ==========================================
// ARM MOVEMENT AND NETWORK SYNC
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
  const leftPosition = getHandPosition(controllerLeft);
  const rightPosition = getHandPosition(controllerRight);

  const left = findInput("left");
  const right = findInput("right");

  applyHandPush(leftPosition, previousLeft, getGamepadButton(left, 1));
  applyHandPush(rightPosition, previousRight, getGamepadButton(right, 1));

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

  leftHandMarker.position.copy(leftPosition);
  rightHandMarker.position.copy(rightPosition);

  // Convert headset and controller world positions into rig-local positions.
  const headWorld = new THREE.Vector3();
  camera.getWorldPosition(headWorld);

  const headLocal = rig.worldToLocal(headWorld.clone());
  const leftLocal = rig.worldToLocal(leftPosition.clone());
  const rightLocal = rig.worldToLocal(rightPosition.clone());

  updateAvatarPose(localAvatar, headLocal, leftLocal, rightLocal);

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
          "local-floor", "bounded-floor", "hand-tracking"
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

  camera.position.set(0, 1.6, 0);

  const headLocal = new THREE.Vector3(0, 1.6, 0);
  updateAvatarPose(
    localAvatar,
    headLocal,
    new THREE.Vector3(-0.9, 0.7, -0.2),
    new THREE.Vector3(0.9, 0.7, -0.2)
  );
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
    handleXRButtons(frame);
    updateMovement(delta);
  } else {
    desktopMovement(delta);
  }

  updateTelekinesis();
  renderer.render(scene, camera);
}

renderer.setAnimationLoop(animate);
