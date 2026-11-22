
import * as THREE from "three";

// =====================================
// THE GRINNER VR - PLAYER SYSTEM
// =====================================

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x101016);
scene.fog = new THREE.Fog(0x101016, 16, 42);

const camera = new THREE.PerspectiveCamera(
  75, window.innerWidth / window.innerHeight, 0.1, 100
);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.xr.enabled = true;
renderer.xr.setReferenceSpaceType("local-floor");
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
let gameStarted = false;

// =====================================
// LOADING SCREEN
// =====================================

const loading = document.createElement("div");

loading.style.cssText = `
position:fixed;inset:0;z-index:9999;
background:#09090e;color:white;
display:flex;flex-direction:column;
justify-content:center;align-items:center;
font-family:Arial,sans-serif;text-align:center;
`;

loading.innerHTML = `
<div style="font-size:38px;font-weight:900;letter-spacing:5px">
THE <span style="color:#b51f32">GRINNER</span>
</div>
<p style="color:#aaa;letter-spacing:3px">VR</p>
<div style="width:220px;height:7px;background:#292933;border-radius:10px;overflow:hidden;margin-top:25px">
<div id="loadingBar" style="width:0%;height:100%;background:#b51f32"></div>
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

// =====================================
// WORLD
// =====================================

scene.add(new THREE.HemisphereLight(0xc5c9dd, 0x25202a, 2));

const mainLight = new THREE.DirectionalLight(0xffffff, 1.7);
mainLight.position.set(5, 10, 4);
scene.add(mainLight);

const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(40, 40),
  new THREE.MeshStandardMaterial({ color: 0x292934, roughness: 1 })
);

floor.rotation.x = -Math.PI / 2;
scene.add(floor);

function wall(x, y, z, sx, sy, sz, color = 0x383842) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(sx, sy, sz),
    new THREE.MeshStandardMaterial({ color, roughness: 1 })
  );
  mesh.position.set(x, y, z);
  scene.add(mesh);
}

wall(0, 2, -9, 20, 4, 0.5);
wall(0, 2, 9, 20, 4, 0.5);
wall(-9, 2, 0, 0.5, 4, 18);
wall(9, 2, 0, 0.5, 4, 18);

for (let i = 0; i < 7; i++) {
  const light = new THREE.PointLight(0x7777bb, 1, 7);
  light.position.set(-6 + i * 2, 3.3, -5);
  scene.add(light);
}

// =====================================
// CHARACTER MODEL HELPERS
// =====================================

function sphere(parent, radius, material, position, scale = [1, 1, 1]) {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(radius, 24, 20),
    material
  );
  mesh.position.set(...position);
  mesh.scale.set(...scale);
  parent.add(mesh);
  return mesh;
}

function capsuleBetween(parent, start, end, radius, material) {
  const direction = end.clone().sub(start);
  const length = direction.length();

  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.78, radius, length, 16, 1),
    material
  );

  mesh.position.copy(start).add(end).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    direction.normalize()
  );

  parent.add(mesh);
  return mesh;
}

// =====================================
// NEW CHARACTER MODELS
// =====================================

function makeAvatar(color, monster = false) {
  const group = new THREE.Group();

  const skin = new THREE.MeshStandardMaterial({
    color: monster ? 0xe9e4dc : color,
    roughness: 0.82
  });

  const bellyMat = new THREE.MeshStandardMaterial({
    color: monster ? 0xc9bdb3 : 0xb8d9c9,
    roughness: 1
  });

  const dark = new THREE.MeshStandardMaterial({
    color: 0x171017,
    roughness: 0.8
  });

  const white = new THREE.MeshStandardMaterial({
    color: 0xf5eee3,
    roughness: 0.7
  });

  const accent = new THREE.MeshStandardMaterial({
    color: monster ? 0x751322 : 0x477d76,
    roughness: 0.9
  });

  // BODY - rounded pear-shaped creature
  sphere(group, 0.34, skin, [0, 0.78, 0], [1, 1.25, 0.88]);

  // Belly patch
  sphere(group, 0.245, bellyMat, [0, 0.78, -0.255], [0.9, 1.05, 0.3]);

  // Neck
  sphere(group, 0.18, skin, [0, 1.12, 0]);

  // HEAD
  const head = sphere(
    group, 0.29, skin, [0, 1.43, -0.025], [1.08, 1.03, 0.95]
  );

  // Cheeks
  for (const side of [-1, 1]) {
    sphere(group, 0.105, skin, [side * 0.235, 1.34, -0.12], [1, 0.8, 0.8]);

    // Ears
    sphere(group, 0.105, skin, [side * 0.29, 1.53, 0], [0.85, 1, 0.65]);
    sphere(group, 0.055, accent, [side * 0.31, 1.54, -0.047]);
  }

  // Face
  if (!monster) {
    // Large expressive eyes
    for (const side of [-1, 1]) {
      sphere(group, 0.075, white, [side * 0.105, 1.46, -0.275], [0.8, 1, 0.5]);
      sphere(group, 0.038, dark, [side * 0.105, 1.455, -0.315], [0.8, 1, 0.5]);

      // Eyebrows
      const brow = sphere(
        group, 0.07, skin,
        [side * 0.11, 1.55, -0.27],
        [1.1, 0.3, 0.35]
      );
      brow.rotation.z = side * -0.12;
    }

    // Small muzzle
    sphere(group, 0.105, bellyMat, [0, 1.34, -0.29], [1.25, 0.7, 0.6]);

    // Nose
    sphere(group, 0.035, dark, [0, 1.37, -0.35], [1, 0.7, 0.6]);

    // Smile
    const smile = new THREE.Mesh(
      new THREE.TorusGeometry(0.075, 0.009, 8, 20, Math.PI),
      dark
    );
    smile.position.set(0, 1.29, -0.355);
    smile.rotation.z = Math.PI;
    group.add(smile);

  } else {
    // GRINNER - asymmetric face
    sphere(group, 0.105, dark, [-0.105, 1.47, -0.265], [1, 1.1, 0.55]);
    sphere(
      group, 0.044,
      new THREE.MeshBasicMaterial({ color: 0xff1429 }),
      [-0.105, 1.47, -0.315]
    );

    // Dark red eye patch
    sphere(group, 0.12, accent, [0.115, 1.47, -0.25], [1, 0.9, 0.4]);

    // One pale eye inside patch
    sphere(group, 0.035, white, [0.115, 1.47, -0.30], [1, 1, 0.5]);

    // Huge curved grin
    const mouth = new THREE.Mesh(
      new THREE.BoxGeometry(0.38, 0.12, 0.045),
      dark
    );
    mouth.position.set(0, 1.27, -0.29);
    group.add(mouth);

    // Teeth
    for (let i = 0; i < 7; i++) {
      const tooth = new THREE.Mesh(
        new THREE.ConeGeometry(0.025, 0.065, 5),
        white
      );
      tooth.position.set(-0.15 + i * 0.05, 1.285, -0.32);
      tooth.rotation.x = Math.PI;
      group.add(tooth);
    }

    // Red markings on head and body
    const marks = [
      [-0.22, 1.62, -0.12, 0.035],
      [0.22, 1.35, -0.16, 0.045],
      [-0.16, 0.88, -0.27, 0.04],
      [0.16, 0.72, -0.27, 0.035],
      [-0.18, 0.55, -0.12, 0.045],
      [0.19, 0.95, -0.12, 0.04],
      [0.03, 1.02, -0.29, 0.03]
    ];

    for (const [x, y, z, size] of marks) {
      sphere(group, size, accent, [x, y, z]);
    }
  }

  // ARMS AND HANDS
  const arms = [];
  const hands = [];
  const fingers = [];

  for (const side of [-1, 1]) {
    const shoulder = new THREE.Vector3(side * 0.27, 1.0, 0);

    const arm = new THREE.Mesh(
      new THREE.CylinderGeometry(0.085, 0.115, 1, 18),
      skin
    );
    group.add(arm);
    arms.push(arm);

    // Shoulder joint
    sphere(group, 0.13, skin, [side * 0.27, 1.0, 0]);

    // Palm
    const hand = sphere(
      group, 0.13,
      monster ? accent : skin,
      [side * 0.6, 0.35, 0],
      [1.05, 0.8, 0.7]
    );
    hands.push(hand);

    // Three small fingers on each hand
    const handFingers = [];

    for (let i = 0; i < 3; i++) {
      const finger = sphere(
        group,
        0.045,
        monster ? accent : skin,
        [side * 0.6 + (i - 1) * 0.075, 0.3, -0.06],
        [0.75, 1.3, 0.8]
      );
      handFingers.push(finger);
    }

    fingers.push(handFingers);

    // Monster arm markings
    if (monster) {
      for (let i = 0; i < 5; i++) {
        sphere(
          group, 0.035, accent,
          [side * (0.34 + i * 0.045), 0.78 - i * 0.12, -0.075]
        );
      }
    }
  }

  group.userData.hands = hands;
  group.userData.arms = arms;
  group.userData.fingers = fingers;
  group.userData.bodyMaterial = skin;
  group.userData.isMonster = monster;

  return group;
}

// =====================================
// ARM POSITIONING
// =====================================

function updateAvatarHand(avatar, index, position) {
  const side = index === 0 ? -1 : 1;

  const shoulder = new THREE.Vector3(side * 0.27, 1.0, 0);

  const hand = avatar.userData.hands[index];
  const arm = avatar.userData.arms[index];
  const handFingers = avatar.userData.fingers[index];

  hand.position.copy(position);

  const direction = position.clone().sub(shoulder);
  const length = direction.length();

  arm.position.copy(shoulder).add(position).multiplyScalar(0.5);
  arm.scale.y = Math.max(length, 0.05);

  arm.quaternion.setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    direction.clone().normalize()
  );

  // Fingers follow the palm
  handFingers.forEach((finger, i) => {
    finger.position.set(
      position.x + (i - 1) * 0.075,
      position.y - 0.055,
      position.z - 0.075
    );
  });
}

localAvatar = makeAvatar(currentColor);
rig.add(localAvatar);

// =====================================
// LOCAL BODY FOLLOWS HEADSET
// =====================================

function updateLocalBody() {
  if (!localAvatar) return;

  // Follow the headset's horizontal movement.
  localAvatar.position.x = camera.position.x;
  localAvatar.position.z = camera.position.z;

  // Turn the body with the headset.
  localAvatar.rotation.y = camera.rotation.y;
}

// =====================================
// MENU
// =====================================

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
  border:0;border-radius:7px;color:white;
  font-weight:bold;
  `;
});

function toggleMenu(force) {
  menuOpen = typeof force === "boolean" ? force : !menuOpen;
  menu.style.display = menuOpen ? "block" : "none";
}

menu.querySelector("#closeMenu").onclick = () => toggleMenu(false);

menu.querySelector("#playerColour").oninput = event => {
  currentColor = event.target.value;
  localAvatar.userData.bodyMaterial.color.set(currentColor);

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

// =====================================
// MULTIPLAYER
// =====================================

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
      const room = document.getElementById("room");

      if (room) {
        room.textContent =
          `ROOM: ${data.roomId} | PLAYERS: ${data.count}/${data.slots}`;
      }

      updateRemotePlayers(data.players || []);

      const me = data.players?.find(p => p.id === myId);

      if (me && me.role !== currentRole) {
        currentRole = me.role;

        rig.remove(localAvatar);

        localAvatar = makeAvatar(
          currentColor,
          currentRole === "monster"
        );

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

      avatar = makeAvatar(player.color || "#83c9ad", isMonster);
      scene.add(avatar);
      remotePlayers.set(player.id, avatar);
    }

    avatar.position.set(player.x, player.y, player.z);

    if (!isMonster && player.color) {
      avatar.userData.bodyMaterial.color.set(player.color);
    }

    const handData = [player.leftHand, player.rightHand];

    handData.forEach((hand, index) => {
      if (!hand) return;

      const worldPosition = new THREE.Vector3(hand.x, hand.y, hand.z);
      const localPosition = avatar.worldToLocal(worldPosition);

      updateAvatarHand(avatar, index, localPosition);
    });
  }

  for (const [id, avatar] of remotePlayers) {
    if (!found.has(id)) {
      scene.remove(avatar);
      remotePlayers.delete(id);
    }
  }
}

// =====================================
// VR CONTROLLERS
// =====================================

for (let i = 0; i < 2; i++) {
  const controller = renderer.xr.getController(i);
  rig.add(controller);
  controllers.push(controller);
}

function controllerWorldPosition(controller) {
  const position = new THREE.Vector3();
  controller.getWorldPosition(position);
  return position;
}

function getHandData() {
  return controllers.map(controller => {
    const p = controllerWorldPosition(controller);
    return { x: p.x, y: p.y, z: p.z };
  });
}

// =====================================
// GORILLA-STYLE HAND LOCOMOTION
// =====================================

function handTouchesWorld(hand) {
  // Floor contact
  if (hand.y < 0.24) return true;

  // Room wall contact
  if (Math.abs(hand.x) > 8.65) return true;
  if (Math.abs(hand.z) > 8.65) return true;

  return false;
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

    if (xPressed && !lastXPressed) toggleMenu();
    lastXPressed = xPressed;

    controllers.forEach((controller, index) => {
      // Controller position relative to the player rig.
      const localHand = controller.position.clone();

      // Position relative to the avatar body.
      const avatarHand = localHand.clone()
        .sub(localAvatar.position)
        .applyQuaternion(localAvatar.quaternion.clone().invert());

      updateAvatarHand(localAvatar, index, avatarHand);

      // World position is used to check contact with the floor/walls.
      const worldHand = controllerWorldPosition(controller);

      if (previousHands[index]) {
        // Compare local controller movement, not world movement.
        const movement = localHand.clone().sub(previousHands[index]);

        if (
          handTouchesWorld(worldHand) &&
          movement.length() > 0.001
        ) {
          // Push the whole player in the opposite direction.
          const push = movement.clone().multiplyScalar(-1.7);
          rig.position.add(push);

          // Preserve some momentum.
          velocity.addScaledVector(
            movement,
            -1.2 / Math.max(delta, 0.01)
          );
        }
      }

      previousHands[index] = localHand.clone();
    });

    // Gravity and momentum
    velocity.y -= 9.8 * delta;
    velocity.multiplyScalar(0.985);

    const speed = velocity.length();
    if (speed > 5.5) velocity.multiplyScalar(5.5 / speed);

    rig.position.addScaledVector(velocity, delta);

    if (rig.position.y < 0) {
      rig.position.y = 0;
      velocity.y = Math.max(0, velocity.y);
    }

  } else {
    // Desktop testing controls
    const direction = new THREE.Vector3();

    if (keys.KeyW) direction.z -= 1;
    if (keys.KeyS) direction.z += 1;
    if (keys.KeyA) direction.x -= 1;
    if (keys.KeyD) direction.x += 1;

    direction.normalize();
    direction.applyQuaternion(camera.quaternion);
    direction.y = 0;

    rig.position.addScaledVector(direction, delta * 3.5);

    if (keys.KeyX && !lastXPressed) toggleMenu();
    lastXPressed = !!keys.KeyX;
  }

  rig.position.x = THREE.MathUtils.clamp(rig.position.x, -8, 8);
  rig.position.z = THREE.MathUtils.clamp(rig.position.z, -8, 8);

  updateLocalBody();
}

// =====================================
// PLAYER SYNC
// =====================================

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

// =====================================
// MAP VOTING
// =====================================

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

// =====================================
// ENTER VR
// =====================================

enterGameButton.onclick = async () => {
  enterGameButton.disabled = true;
  enterGameButton.textContent = "STARTING...";

  try {
    if (!navigator.xr) throw new Error("WebXR unavailable");

    const session = await navigator.xr.requestSession(
      "immersive-vr",
      {
        requiredFeatures: ["local-floor"],
        optionalFeatures: ["bounded-floor"]
      }
    );

    await renderer.xr.setSession(session);

    previousHands = [null, null];
    velocity.set(0, 0, 0);

    gameStarted = true;
    loading.remove();

  } catch (error) {
    console.error(error);

    enterGameButton.disabled = false;
    enterGameButton.textContent = "TRY AGAIN";

    loadingText.textContent =
      "VR COULD NOT START. CHECK QUEST BROWSER PERMISSIONS.";
  }
};

// =====================================
// DESKTOP CONTROLS
// =====================================

window.addEventListener("keydown", event => {
  keys[event.code] = true;
});

window.addEventListener("keyup", event => {
  keys[event.code] = false;
});

// =====================================
// RESIZE AND GAME LOOP
// =====================================

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

renderer.setAnimationLoop(now => {
  const delta = clock.getDelta();

  if (gameStarted) {
    updateMovement(delta);
    syncPlayer(now);
  }

  renderer.render(scene, camera);
});

// Connect while loading screen is visible.
connectMultiplayer();
