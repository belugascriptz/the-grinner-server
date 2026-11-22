
import * as THREE from "three";

// =============================================
// THE GRINNER VR - COMPLETE GAME CLIENT
// =============================================

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x11121a);
scene.fog = new THREE.Fog(0x11121a, 18, 48);

const camera = new THREE.PerspectiveCamera(
  75, window.innerWidth / window.innerHeight, 0.1, 120
);

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  powerPreference: "high-performance"
});

renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.xr.enabled = true;
renderer.xr.setReferenceSpaceType("local-floor");
renderer.outputColorSpace = THREE.SRGBColorSpace;

document.body.appendChild(renderer.domElement);

const rig = new THREE.Group();
scene.add(rig);
rig.add(camera);

const clock = new THREE.Clock();
const velocity = new THREE.Vector3();
const keys = {};
const remotePlayers = new Map();

let socket = null;
let myId = null;
let currentRole = "player";
let currentColor = "#83c9ad";
let lastSync = 0;
let lastXPressed = false;
let menuOpen = false;
let localAvatar;
let controllers = [];
let previousHands = [null, null];
let fingerCurls = [0, 0];
let gameStarted = false;

const AVATAR_SCALE = 0.82;
const HEAD_HEIGHT = 0.92 * AVATAR_SCALE;
const REMOTE_ROOT_HEIGHT = HEAD_HEIGHT;
const GROUND_CONTACT_HEIGHT = 0.38;
const MOVEMENT_MULTIPLIER = 2.0;

// =============================================
// LOADING SCREEN
// =============================================

const loading = document.createElement("div");

loading.style.cssText = `
position:fixed;inset:0;z-index:9999;
background:#090a10;color:white;
display:flex;flex-direction:column;
justify-content:center;align-items:center;
font-family:Arial,sans-serif;text-align:center;
`;

loading.innerHTML = `
<div style="font-size:38px;font-weight:900;letter-spacing:5px">
THE <span style="color:#c3263d">GRINNER</span>
</div>
<p style="color:#aaa;letter-spacing:4px">VR</p>
<div style="width:220px;height:7px;background:#292933;border-radius:10px;overflow:hidden;margin-top:25px">
<div id="loadingBar" style="width:0%;height:100%;background:#c3263d"></div>
</div>
<p id="loadingText" style="color:#aaa;font-size:13px">CONNECTING TO SERVER...</p>
<button id="enterGame" style="
display:none;margin-top:20px;padding:15px 35px;
background:#a51e30;color:white;border:0;
border-radius:8px;font-size:16px;font-weight:bold">
ENTER THE GAME
</button>
<p style="font-size:11px;color:#555;margin-top:25px">THE GRINNER VR</p>
`;

document.body.appendChild(loading);

const loadingBar = loading.querySelector("#loadingBar");
const loadingText = loading.querySelector("#loadingText");
const enterGameButton = loading.querySelector("#enterGame");

let loadingProgress = 0;

const loadingTimer = setInterval(() => {
  loadingProgress = Math.min(loadingProgress + 8, 90);
  loadingBar.style.width = loadingProgress + "%";
}, 150);

// =============================================
// LIGHTING
// =============================================

scene.add(new THREE.HemisphereLight(0xaeb8d8, 0x17131b, 1.8));

const mainLight = new THREE.DirectionalLight(0xd9d9ff, 1.4);
mainLight.position.set(4, 10, 3);
scene.add(mainLight);

const redLight = new THREE.PointLight(0x8e182b, 2.5, 13);
redLight.position.set(0, 3, -6);
scene.add(redLight);

const blueLight = new THREE.PointLight(0x354b91, 2, 12);
blueLight.position.set(-6, 3, 3);
scene.add(blueLight);

// =============================================
// MATERIALS AND BUILDING HELPERS
// =============================================

function material(color, roughness = 0.85, metalness = 0) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness,
    metalness
  });
}

const floorMat = material(0x34343c);
const wallMat = material(0x292a34);
const panelMat = material(0x3d3e49);
const darkMat = material(0x171820);
const metalMat = material(0x555966, 0.55, 0.65);
const redMat = material(0x812033);
const lightMat = new THREE.MeshBasicMaterial({ color: 0xb8c9ff });

function addBox(parent, size, position, mat, rotation = null) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(size[0], size[1], size[2]),
    mat
  );

  mesh.position.set(...position);

  if (rotation) mesh.rotation.set(...rotation);

  parent.add(mesh);
  return mesh;
}

function addCylinder(parent, radius, length, position, mat, rotation = null) {
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, length, 12),
    mat
  );

  mesh.position.set(...position);

  if (rotation) mesh.rotation.set(...rotation);

  parent.add(mesh);
  return mesh;
}

// =============================================
// INDUSTRIAL ROOM
// =============================================

const room = new THREE.Group();
scene.add(room);

addBox(room, [40, 0.35, 40], [0, -0.2, 0], floorMat);

const tileMat = material(0x41414b);
const tileLineMat = material(0x20212a);

for (let x = -18; x <= 18; x += 3) {
  for (let z = -18; z <= 18; z += 3) {
    addBox(room, [2.92, 0.025, 2.92], [x, -0.012, z], tileMat);
  }
}

for (let x = -18; x <= 18; x += 3) {
  addBox(room, [0.035, 0.03, 38], [x + 1.5, 0.005, 0], tileLineMat);
}

for (let z = -18; z <= 18; z += 3) {
  addBox(room, [38, 0.03, 0.035], [0, 0.005, z + 1.5], tileLineMat);
}

addBox(room, [40, 5, 0.6], [0, 2.5, -10], wallMat);
addBox(room, [40, 5, 0.6], [0, 2.5, 10], wallMat);
addBox(room, [0.6, 5, 20], [-10, 2.5, 0], wallMat);
addBox(room, [0.6, 5, 20], [10, 2.5, 0], wallMat);

addBox(room, [20, 0.4, 20], [0, 5.1, 0], darkMat);

for (let x = -8; x <= 8; x += 2) {
  addBox(room, [1.65, 2.6, 0.12], [x, 2.5, -9.64], panelMat);
  addBox(room, [1.65, 2.6, 0.12], [x, 2.5, 9.64], panelMat);
}

for (let z = -8; z <= 8; z += 2) {
  addBox(room, [0.12, 2.6, 1.65], [-9.64, 2.5, z], panelMat);
  addBox(room, [0.12, 2.6, 1.65], [9.64, 2.5, z], panelMat);
}

for (let x = -8; x <= 8; x += 4) {
  addBox(room, [0.3, 4.8, 0.35], [x, 2.5, -9.4], metalMat);
  addBox(room, [0.3, 4.8, 0.35], [x, 2.5, 9.4], metalMat);
}

for (let z = -8; z <= 8; z += 4) {
  addBox(room, [0.35, 4.8, 0.3], [-9.4, 2.5, z], metalMat);
  addBox(room, [0.35, 4.8, 0.3], [9.4, 2.5, z], metalMat);
}

for (let z = -8; z <= 8; z += 4) {
  addBox(room, [20, 0.22, 0.25], [0, 4.82, z], metalMat);
}

for (let x = -8; x <= 8; x += 4) {
  addBox(room, [0.25, 0.22, 20], [x, 4.82, 0], metalMat);
}

for (let x = -6; x <= 6; x += 6) {
  addCylinder(
    room, 0.075, 19, [x, 4.35, 0], metalMat,
    [Math.PI / 2, 0, 0]
  );
}

for (let x = -8; x <= 8; x += 4) {
  addBox(room, [1.2, 0.08, 0.035], [x, 3.8, -9.31], redMat);
  addBox(room, [1.2, 0.08, 0.035], [x, 3.8, 9.31], redMat);
}

for (let x = -6; x <= 6; x += 4) {
  for (let z = -6; z <= 6; z += 6) {
    addBox(room, [1.3, 0.08, 0.45], [x, 4.65, z], lightMat);

    const light = new THREE.PointLight(0x9aabff, 0.8, 7);
    light.position.set(x, 4.2, z);
    room.add(light);
  }
}

function makeCrate(x, z, size = 1) {
  const crate = new THREE.Group();
  room.add(crate);
  crate.position.set(x, 0, z);

  const wood = material(0x45434a);
  const edge = material(0x77717a, 0.65, 0.35);

  addBox(crate, [size, size, size], [0, size / 2, 0], wood);

  for (let i = -1; i <= 1; i++) {
    addBox(
      crate,
      [0.07, size * 0.95, 0.08],
      [i * size * 0.32, size / 2, -size / 2 - 0.045],
      edge
    );
  }

  addBox(
    crate,
    [size * 0.95, 0.07, 0.08],
    [0, size / 2, -size / 2 - 0.05],
    edge
  );
}

makeCrate(-6, -5, 1.2);
makeCrate(-7, -5, 0.8);
makeCrate(6, 5, 1.2);
makeCrate(7, 5, 0.8);
makeCrate(-6, 6, 1);
makeCrate(6, -6, 1);

function makeMachine(x, z) {
  const machine = new THREE.Group();
  machine.position.set(x, 0, z);
  room.add(machine);

  addBox(machine, [1.2, 1.7, 0.9], [0, 0.85, 0], darkMat);
  addBox(machine, [0.85, 0.55, 0.08], [0, 1.1, -0.48], panelMat);
  addBox(machine, [0.25, 0.12, 0.06], [0, 1.55, -0.49], redMat);

  const screen = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.3, 0.04),
    new THREE.MeshBasicMaterial({ color: 0x293f55 })
  );

  screen.position.set(0, 1.2, -0.55);
  machine.add(screen);
}

makeMachine(-8, 0);
makeMachine(8, 0);

// =============================================
// CHARACTER BUILDING
// =============================================

function makeSphere(parent, radius, mat, position, scale = [1, 1, 1]) {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(radius, 24, 20),
    mat
  );

  mesh.position.set(...position);
  mesh.scale.set(...scale);
  parent.add(mesh);
  return mesh;
}

function makeFinger(hand, x, length, mat, isThumb = false) {
  const finger = new THREE.Group();

  finger.position.set(
    x,
    isThumb ? -0.015 : -0.075,
    -0.015
  );

  hand.add(finger);

  const radius = isThumb ? 0.022 : 0.019;
  const firstLength = length * 0.56;
  const secondLength = length * 0.44;

  const first = new THREE.Mesh(
    new THREE.CylinderGeometry(
      radius * 0.9,
      radius,
      firstLength,
      12
    ),
    mat
  );

  first.position.y = -firstLength / 2;
  finger.add(first);

  const joint = new THREE.Group();
  joint.position.y = -firstLength;
  finger.add(joint);

  const second = new THREE.Mesh(
    new THREE.CylinderGeometry(
      radius * 0.75,
      radius * 0.9,
      secondLength,
      12
    ),
    mat
  );

  second.position.y = -secondLength / 2;
  joint.add(second);

  makeSphere(joint, radius * 0.85, mat, [0, -secondLength, 0]);

  finger.userData.joint = joint;
  finger.userData.isThumb = isThumb;

  return finger;
}

function makeHand(parent, mat) {
  const hand = new THREE.Group();
  parent.add(hand);

  makeSphere(
    hand, 0.13, mat,
    [0, 0, 0],
    [1.05, 0.82, 0.72]
  );

  const index = makeFinger(hand, -0.052, 0.25, mat);
  const middle = makeFinger(hand, 0.052, 0.27, mat);
  const thumb = makeFinger(hand, -0.105, 0.20, mat, true);

  thumb.rotation.z = -0.95;
  thumb.rotation.x = -0.15;

  hand.userData.fingers = [index, middle];
  hand.userData.thumb = thumb;

  return hand;
}

function animateHand(hand, trigger = 0, grip = 0) {
  if (!hand?.userData?.fingers) return;

  const curl = THREE.MathUtils.clamp(
    Math.max(trigger, grip),
    0,
    1
  );

  for (const finger of hand.userData.fingers) {
    finger.rotation.x = -curl * 0.9;
    finger.userData.joint.rotation.x = -curl * 1.0;
  }

  const thumb = hand.userData.thumb;
  thumb.rotation.x = -0.15 - curl * 0.65;
  thumb.rotation.z = -0.95 + curl * 0.35;
  thumb.userData.joint.rotation.x = -curl * 0.7;
}

// =============================================
// REDESIGNED AVATARS
// =============================================

function makeAvatar(color, monster = false) {
  const group = new THREE.Group();

  const skin = material(monster ? 0xe5e1d9 : color, 0.92);
  const dark = material(0x17151a);
  const white = material(0xf2eee8);
  const red = material(0x7c1728);
  const trim = material(0x292b34, 0.65, 0.3);
  const dirt = material(0x575047);

  // Torso
  makeSphere(
    group, 0.28, skin,
    [0, 0.47, 0],
    [0.9, 1.25, 0.72]
  );

  // Chest plate
  makeSphere(
    group, 0.19, monster ? red : trim,
    [0, 0.51, -0.17],
    [0.9, 0.78, 0.35]
  );

  addCylinder(group, 0.085, 0.14, [0, 0.75, 0], skin);

  // Head and face are kept together.
  // The local player's head can be hidden in first-person.
  const headGroup = new THREE.Group();
  group.add(headGroup);

  makeSphere(
    headGroup, 0.205, skin,
    [0, 0.91, -0.025],
    [1.05, 1.08, 0.92]
  );

  for (const side of [-1, 1]) {
    makeSphere(
      headGroup,
      0.065,
      monster ? red : skin,
      [side * 0.195, 0.91, 0]
    );
  }

  if (!monster) {
    for (const side of [-1, 1]) {
      makeSphere(
        headGroup, 0.041, white,
        [side * 0.078, 0.94, -0.18],
        [1, 1, 0.5]
      );

      makeSphere(
        headGroup, 0.022, dark,
        [side * 0.078, 0.94, -0.202],
        [1, 1, 0.5]
      );
    }

    makeSphere(
      headGroup, 0.025, dark,
      [0, 0.83, -0.19],
      [1.5, 0.35, 0.4]
    );

    const spots = [
      [-0.15, 0.47, -0.17, 0.022],
      [0.13, 0.55, -0.16, 0.018],
      [-0.08, 0.34, -0.16, 0.02],
      [0.12, 0.88, -0.13, 0.015],
      [-0.13, 0.73, -0.12, 0.016]
    ];

    for (const [x, y, z, size] of spots) {
      makeSphere(
        group, size, dirt,
        [x, y, z],
        [1.2, 0.7, 0.35]
      );
    }

  } else {
    makeSphere(
      headGroup, 0.073, dark,
      [-0.075, 0.95, -0.17]
    );

    makeSphere(
      headGroup,
      0.03,
      new THREE.MeshBasicMaterial({ color: 0xff1429 }),
      [-0.075, 0.95, -0.23]
    );

    makeSphere(
      headGroup, 0.075, red,
      [0.085, 0.95, -0.16],
      [1, 0.9, 0.45]
    );

    addBox(
      headGroup, [0.3, 0.09, 0.035],
      [0, 0.79, -0.19], dark
    );

    for (let i = 0; i < 6; i++) {
      const tooth = new THREE.Mesh(
        new THREE.ConeGeometry(0.017, 0.04, 5),
        white
      );

      tooth.position.set(-0.12 + i * 0.048, 0.79, -0.215);
      tooth.rotation.x = Math.PI;
      headGroup.add(tooth);
    }

    const marks = [
      [-0.15, 0.49, -0.17],
      [0.13, 0.55, -0.16],
      [-0.08, 0.34, -0.16],
      [0.14, 0.42, -0.12],
      [0.02, 1.08, -0.11],
      [-0.13, 0.72, -0.12]
    ];

    for (const p of marks) {
      makeSphere(headGroup, 0.025, red, p);
    }
  }

  const arms = [];
  const hands = [];

  for (const side of [-1, 1]) {
    makeSphere(
      group, 0.105, monster ? red : trim,
      [side * 0.23, 0.63, 0]
    );

    const arm = new THREE.Mesh(
      new THREE.CylinderGeometry(0.065, 0.085, 1, 16),
      skin
    );

    group.add(arm);
    arms.push(arm);

    const hand = makeHand(group, monster ? red : skin);
    hand.position.set(side * 0.36, 0.12, -0.04);
    hands.push(hand);
  }

  group.scale.setScalar(AVATAR_SCALE);

  group.userData.hands = hands;
  group.userData.arms = arms;
  group.userData.bodyMaterial = skin;
  group.userData.headGroup = headGroup;
  group.userData.isMonster = monster;

  return group;
}

// =============================================
// LOCAL AVATAR
// =============================================

function makeLocalAvatar() {
  const avatar = makeAvatar(
    currentColor,
    currentRole === "monster"
  );

  // Hide only our own head in first-person.
  // Remote players still see the complete character.
  avatar.userData.headGroup.visible = false;

  return avatar;
}

localAvatar = makeLocalAvatar();
rig.add(localAvatar);

// =============================================
// HAND AND ARM TRACKING
// =============================================

function updateAvatarHand(avatar, index, position, rotation = null) {
  const side = index === 0 ? -1 : 1;

  const shoulder = new THREE.Vector3(
    side * 0.23,
    0.63,
    0
  );

  const hand = avatar.userData.hands[index];
  const arm = avatar.userData.arms[index];

  hand.position.copy(position);

  if (rotation) {
    hand.quaternion.copy(rotation);
  }

  const direction = position.clone().sub(shoulder);
  const length = direction.length();

  arm.position.copy(shoulder).add(position).multiplyScalar(0.5);
  arm.scale.y = Math.max(length, 0.05);

  if (length > 0.001) {
    arm.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      direction.normalize()
    );
  }
}

// =============================================
// MENU
// =============================================

const menu = document.createElement("div");

menu.style.cssText = `
display:none;position:fixed;z-index:5000;
top:50%;left:50%;transform:translate(-50%,-50%);
width:270px;padding:20px;background:#101018;
color:white;border:2px solid #a51e30;
border-radius:14px;text-align:center;
font-family:Arial,sans-serif;
`;

menu.innerHTML = `
<h2 style="color:#ff394b">THE GRINNER</h2>
<p>PLAYER MENU</p>
<label>Character colour</label><br><br>
<input id="playerColour" type="color" value="#83c9ad">
<br><br>
<button id="startRound">START ROUND</button><br><br>
<button id="endRound">RETURN TO LOBBY</button><br><br>
<button id="closeMenu">CLOSE</button>
<p style="font-size:11px;color:#aaa">Press X to close</p>
`;

document.body.appendChild(menu);

menu.querySelectorAll("button").forEach(button => {
  button.style.cssText = `
  width:100%;padding:12px;background:#922331;
  border:0;border-radius:7px;color:white;font-weight:bold;
  `;
});

function toggleMenu(force) {
  menuOpen = typeof force === "boolean" ? force : !menuOpen;
  menu.style.display = menuOpen ? "block" : "none";
}

menu.querySelector("#closeMenu").onclick = () => toggleMenu(false);

menu.querySelector("#playerColour").oninput = event => {
  currentColor = event.target.value;

  if (currentRole !== "monster") {
    localAvatar.userData.bodyMaterial.color.set(currentColor);
  }

  sendMessage({ type: "color", color: currentColor });
};

menu.querySelector("#startRound").onclick = () => {
  sendMessage({ type: "start-round" });
  toggleMenu(false);
};

menu.querySelector("#endRound").onclick = () => {
  sendMessage({ type: "end-round" });
  toggleMenu(false);
};

// =============================================
// MULTIPLAYER
// =============================================

function sendMessage(data) {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(data));
  }
}

function connectMultiplayer() {
  const protocol = location.protocol === "https:" ? "wss:" : "ws:";

  socket = new WebSocket(`${protocol}//${location.host}`);

  socket.onopen = () => {
    loadingText.textContent = "CONNECTED - PREPARING GAME...";
    loadingProgress = 100;
    loadingBar.style.width = "100%";
    enterGameButton.style.display = "inline-block";
    clearInterval(loadingTimer);
  };

  socket.onerror = () => {
    loadingText.textContent = "CONNECTION ERROR - REFRESH TO RETRY";
  };

  socket.onclose = () => {
    if (gameStarted) {
      const status = document.getElementById("status");
      if (status) status.textContent = "Disconnected from server";
    }
  };

  socket.onmessage = event => {
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
      const roomLabel = document.getElementById("room");

      if (roomLabel) {
        roomLabel.textContent =
          `ROOM: ${data.roomId} | PLAYERS: ${data.count}/${data.slots}`;
      }

      updateRemotePlayers(data.players || []);

      const me = data.players?.find(player => player.id === myId);

      if (me && me.role !== currentRole) {
        currentRole = me.role;

        rig.remove(localAvatar);
        localAvatar = makeLocalAvatar();
        rig.add(localAvatar);

        const status = document.getElementById("status");

        if (status) {
          status.textContent =
            currentRole === "monster"
              ? "YOU ARE THE GRINNER!"
              : "SURVIVE THE ROUND!";
        }
      }
    }
  };
}

function updateRemotePlayers(players) {
  const found = new Set();

  for (const player of players) {
    if (player.id === myId) continue;

    found.add(player.id);

    const isMonster = player.role === "monster";
    let avatar = remotePlayers.get(player.id);

    if (!avatar || avatar.userData.isMonster !== isMonster) {
      if (avatar) scene.remove(avatar);

      avatar = makeAvatar(
        player.color || "#83c9ad",
        isMonster
      );

      scene.add(avatar);
      remotePlayers.set(player.id, avatar);
    }

    avatar.position.set(
      player.x || 0,
      (player.y || 0) + REMOTE_ROOT_HEIGHT,
      player.z || 0
    );

    if (!isMonster && player.color) {
      avatar.userData.bodyMaterial.color.set(player.color);
    }

    avatar.updateMatrixWorld(true);

    const handData = [player.leftHand, player.rightHand];

    handData.forEach((hand, index) => {
      if (!hand) return;

      const worldPosition = new THREE.Vector3(
        hand.x || 0,
        hand.y || 0,
        hand.z || 0
      );

      const localPosition = avatar.worldToLocal(worldPosition);

      updateAvatarHand(avatar, index, localPosition);

      animateHand(
        avatar.userData.hands[index],
        hand.curl || 0,
        hand.curl || 0
      );
    });
  }

  for (const [id, avatar] of remotePlayers) {
    if (!found.has(id)) {
      scene.remove(avatar);
      remotePlayers.delete(id);
    }
  }
}

// =============================================
// VR CONTROLLERS
// =============================================

for (let i = 0; i < 2; i++) {
  const controller = renderer.xr.getController(i);

  controller.userData.handIndex = i;

  controller.addEventListener("connected", event => {
    controller.userData.inputSource = event.data;

    if (event.data.handedness === "left") {
      controller.userData.handIndex = 0;
    } else if (event.data.handedness === "right") {
      controller.userData.handIndex = 1;
    }
  });

  controller.addEventListener("disconnected", () => {
    controller.userData.inputSource = null;
  });

  rig.add(controller);
  controllers.push(controller);
}

function getControllerInput(controller, index) {
  const session = renderer.xr.getSession();

  let source = controller.userData.inputSource;

  if (!source && session) {
    const handedness = index === 0 ? "left" : "right";

    source = [...session.inputSources].find(
      item => item.handedness === handedness
    );
  }

  return source?.gamepad || null;
}

function getControllerHandIndex(controller, fallback) {
  return controller.userData.handIndex ?? fallback;
}

function controllerWorldPosition(controller) {
  const position = new THREE.Vector3();
  controller.getWorldPosition(position);
  return position;
}

function getHandData() {
  const result = [null, null];

  controllers.forEach((controller, fallback) => {
    const index = getControllerHandIndex(controller, fallback);
    const p = controllerWorldPosition(controller);

    result[index] = {
      x: p.x,
      y: p.y,
      z: p.z,
      curl: fingerCurls[index] || 0
    };
  });

  return result;
}

// =============================================
// MOVEMENT AND BODY FOLLOWING
// =============================================

function updateLocalAvatarPosition() {
  const xrCamera = renderer.xr.getCamera();

  rig.updateMatrixWorld(true);
  xrCamera.updateMatrixWorld(true);

  const headWorldPosition = new THREE.Vector3();
  xrCamera.getWorldPosition(headWorldPosition);

  const headLocalPosition = rig.worldToLocal(
    headWorldPosition.clone()
  );

  localAvatar.position.set(
    headLocalPosition.x,
    headLocalPosition.y - HEAD_HEIGHT,
    headLocalPosition.z
  );

  const headWorldRotation = new THREE.Quaternion();
  const rigWorldRotation = new THREE.Quaternion();

  xrCamera.getWorldQuaternion(headWorldRotation);
  rig.getWorldQuaternion(rigWorldRotation);

  const localRotation = rigWorldRotation
    .invert()
    .multiply(headWorldRotation);

  const headEuler = new THREE.Euler()
    .setFromQuaternion(localRotation, "YXZ");

  localAvatar.rotation.y = headEuler.y;
  localAvatar.updateMatrixWorld(true);
}

function updateMovement(delta) {
  delta = Math.min(delta, 0.04);

  const session = renderer.xr.getSession();

  if (session) {
    let xPressed = false;

    for (const source of session.inputSources) {
      if (source.handedness === "left" && source.gamepad) {
        xPressed = !!source.gamepad.buttons[4]?.pressed;
      }
    }

    if (xPressed && !lastXPressed) {
      toggleMenu();
    }

    lastXPressed = xPressed;

    // Attach body to actual headset pose.
    updateLocalAvatarPosition();

    controllers.forEach((controller, fallback) => {
      const index = getControllerHandIndex(controller, fallback);
      const gamepad = getControllerInput(controller, index);
      const buttons = gamepad?.buttons || [];

      const trigger = buttons[0]?.value ?? 0;
      const grip = buttons[1]?.value ?? 0;

      fingerCurls[index] = Math.max(trigger, grip);

      // Convert controller world position into avatar-local position.
      const worldHand = controllerWorldPosition(controller);
      const avatarHand = localAvatar.worldToLocal(
        worldHand.clone()
      );

      const controllerWorldRotation = new THREE.Quaternion();
      const avatarWorldRotation = new THREE.Quaternion();

      controller.getWorldQuaternion(controllerWorldRotation);
      localAvatar.getWorldQuaternion(avatarWorldRotation);

      const handRotation = avatarWorldRotation
        .invert()
        .multiply(controllerWorldRotation);

      updateAvatarHand(
        localAvatar,
        index,
        avatarHand,
        handRotation
      );

      animateHand(
        localAvatar.userData.hands[index],
        trigger,
        grip
      );

      // Arm-based ground locomotion.
      const localHand = controller.position.clone();

      if (previousHands[index]) {
        const movement = localHand.clone().sub(previousHands[index]);

        if (
          localHand.y < GROUND_CONTACT_HEIGHT &&
          previousHands[index].y < GROUND_CONTACT_HEIGHT &&
          movement.length() > 0.001
        ) {
          const push = new THREE.Vector3(
            movement.x,
            0,
            movement.z
          );

          rig.position.addScaledVector(
            push,
            -MOVEMENT_MULTIPLIER
          );
        }
      }

      previousHands[index] = localHand.clone();
    });

    velocity.y -= 9.8 * delta;
    velocity.multiplyScalar(0.985);
    rig.position.addScaledVector(velocity, delta);

    if (rig.position.y < 0) {
      rig.position.y = 0;
      velocity.y = Math.max(0, velocity.y);
    }

  } else {
    const direction = new THREE.Vector3();

    if (keys.KeyW) direction.z -= 1;
    if (keys.KeyS) direction.z += 1;
    if (keys.KeyA) direction.x -= 1;
    if (keys.KeyD) direction.x += 1;

    direction.normalize();
    direction.applyQuaternion(camera.quaternion);
    direction.y = 0;

    rig.position.addScaledVector(direction, delta * 3.5);

    if (keys.KeyX && !lastXPressed) {
      toggleMenu();
    }

    lastXPressed = !!keys.KeyX;
  }

  rig.position.x = THREE.MathUtils.clamp(rig.position.x, -8.5, 8.5);
  rig.position.z = THREE.MathUtils.clamp(rig.position.z, -8.5, 8.5);
}

// =============================================
// PLAYER SYNC
// =============================================

function syncPlayer(now) {
  if (!gameStarted || now - lastSync < 75) return;
  lastSync = now;

  if (!socket || socket.readyState !== WebSocket.OPEN) return;

  const hands = getHandData();

  sendMessage({
    type: "move",
    x: rig.position.x,
    y: rig.position.y,
    z: rig.position.z,
    leftHand: hands[0],
    rightHand: hands[1]
  });
}

// =============================================
// MAP VOTING
// =============================================

const voteForest = document.getElementById("voteForest");
const voteCaves = document.getElementById("voteCaves");
const voteFacility = document.getElementById("voteFacility");

if (voteForest) {
  voteForest.onclick = () =>
    sendMessage({ type: "vote", choice: "Yellow Hall" });
}

if (voteCaves) {
  voteCaves.onclick = () =>
    sendMessage({ type: "vote", choice: "Abandoned School" });
}

if (voteFacility) {
  voteFacility.onclick = () =>
    sendMessage({ type: "vote", choice: "Red Tunnels" });
}

// =============================================
// ENTER VR
// =============================================

enterGameButton.onclick = async () => {
  enterGameButton.disabled = true;
  enterGameButton.textContent = "STARTING...";

  try {
    if (!navigator.xr) {
      throw new Error("WebXR unavailable");
    }

    const session = await navigator.xr.requestSession(
      "immersive-vr",
      {
        requiredFeatures: ["local-floor"],
        optionalFeatures: ["bounded-floor"]
      }
    );

    await renderer.xr.setSession(session);

    previousHands = [null, null];
    fingerCurls = [0, 0];
    velocity.set(0, 0, 0);
    rig.position.set(0, 0, 0);

    gameStarted = true;
    loading.remove();

    session.addEventListener("end", () => {
      gameStarted = false;
      loadingText.textContent = "VR SESSION ENDED";
      enterGameButton.disabled = false;
      enterGameButton.textContent = "ENTER THE GAME";
      loading.style.display = "flex";
    });

  } catch (error) {
    console.error(error);

    enterGameButton.disabled = false;
    enterGameButton.textContent = "TRY AGAIN";

    loadingText.textContent =
      "VR COULD NOT START. CHECK QUEST BROWSER PERMISSIONS.";
  }
};

// =============================================
// DESKTOP CONTROLS
// =============================================

window.addEventListener("keydown", event => {
  keys[event.code] = true;
});

window.addEventListener("keyup", event => {
  keys[event.code] = false;
});

// =============================================
// RESIZE
// =============================================

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// =============================================
// GAME LOOP
// =============================================

renderer.setAnimationLoop(now => {
  const delta = clock.getDelta();

  if (gameStarted) {
    updateMovement(delta);
    syncPlayer(now);
  }

  renderer.render(scene, camera);
});

// =============================================
// CONNECT TO SERVER
// =============================================

connectMultiplayer();
