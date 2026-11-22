
import * as THREE from "three";

// =====================================
// THE GRINNER VR
// =====================================

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x101016);
scene.fog = new THREE.Fog(0x101016, 14, 38);

const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);

camera.position.set(0, 0, 0);

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
let currentColor = "#a9d6a0";
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
// LIGHTING AND MAP
// =====================================

scene.add(new THREE.HemisphereLight(0xc5c9dd, 0x25202a, 2));

const mainLight = new THREE.DirectionalLight(0xffffff, 1.5);
mainLight.position.set(5, 10, 4);
scene.add(mainLight);

const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(40, 40),
  new THREE.MeshStandardMaterial({ color: 0x292934 })
);

floor.rotation.x = -Math.PI / 2;
floor.position.y = 0;
scene.add(floor);

function wall(x, y, z, sx, sy, sz, color = 0x383842) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(sx, sy, sz),
    new THREE.MeshStandardMaterial({ color })
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
// CHARACTER MODELS
// Small bodies, long arms, no legs.
// =====================================

function makeAvatar(color, monster = false) {
  const group = new THREE.Group();

  const bodyMat = new THREE.MeshStandardMaterial({
    color: monster ? 0xf0eee9 : color,
    roughness: 0.9
  });

  const darkMat = new THREE.MeshStandardMaterial({
    color: 0x170d12,
    roughness: 0.8
  });

  const redMat = new THREE.MeshStandardMaterial({
    color: 0x67101c,
    roughness: 0.9
  });

  const whiteMat = new THREE.MeshStandardMaterial({
    color: 0xf5f0e8
  });

  // Compact body
  const body = new THREE.Mesh(
    new THREE.SphereGeometry(0.25, 24, 20),
    bodyMat
  );

  body.position.set(0, 0.48, 0);
  body.scale.set(1, 1.15, 0.85);
  group.add(body);

  // Small round head
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.205, 24, 20),
    bodyMat
  );

  head.position.set(0, 0.83, -0.025);
  group.add(head);

  // Small ears
  for (const side of [-1, 1]) {
    const ear = new THREE.Mesh(
      new THREE.SphereGeometry(0.085, 16, 12),
      bodyMat
    );

    ear.position.set(side * 0.19, 0.87, 0);
    group.add(ear);
  }

  // =================================
  // FACE
  // =================================

  if (monster) {
    // Black eye
    const blackEye = new THREE.Mesh(
      new THREE.SphereGeometry(0.065, 16, 14),
      darkMat
    );

    blackEye.position.set(-0.085, 0.85, -0.19);
    group.add(blackEye);

    // Red pupil
    const pupil = new THREE.Mesh(
      new THREE.SphereGeometry(0.025, 12, 10),
      new THREE.MeshBasicMaterial({ color: 0xff1010 })
    );

    pupil.position.set(-0.085, 0.85, -0.245);
    group.add(pupil);

    // Other eye marking
    const otherMark = new THREE.Mesh(
      new THREE.SphereGeometry(0.075, 16, 12),
      redMat
    );

    otherMark.scale.set(1, 0.7, 0.35);
    otherMark.position.set(0.09, 0.85, -0.18);
    group.add(otherMark);

    // Big grin
    const mouth = new THREE.Mesh(
      new THREE.BoxGeometry(0.29, 0.085, 0.035),
      darkMat
    );

    mouth.position.set(0, 0.70, -0.195);
    group.add(mouth);

    // Teeth
    for (let i = 0; i < 5; i++) {
      const tooth = new THREE.Mesh(
        new THREE.ConeGeometry(0.022, 0.055, 5),
        whiteMat
      );

      tooth.position.set(-0.105 + i * 0.052, 0.69, -0.22);
      tooth.rotation.x = Math.PI;
      group.add(tooth);
    }

  } else {
    // Normal character eyes
    for (const side of [-1, 1]) {
      const eye = new THREE.Mesh(
        new THREE.SphereGeometry(0.035, 14, 12),
        whiteMat
      );

      eye.position.set(side * 0.08, 0.85, -0.185);
      group.add(eye);

      const pupil = new THREE.Mesh(
        new THREE.SphereGeometry(0.018, 12, 10),
        darkMat
      );

      pupil.position.set(side * 0.08, 0.85, -0.215);
      group.add(pupil);
    }
  }

  // =================================
  // LONG CONNECTED ARMS
  // =================================

  const arms = [];
  const hands = [];

  for (const side of [-1, 1]) {
    const arm = new THREE.Mesh(
      new THREE.CylinderGeometry(0.075, 0.09, 1, 16),
      bodyMat
    );

    arm.position.set(side * 0.22, 0.25, 0);
    group.add(arm);
    arms.push(arm);

    // Arm markings for Grinner
    if (monster) {
      for (let i = 0; i < 3; i++) {
        const spot = new THREE.Mesh(
          new THREE.SphereGeometry(0.035, 10, 8),
          redMat
        );

        spot.position.set(
          (i - 1) * 0.035,
          (i - 1) * 0.22,
          -0.075
        );

        arm.add(spot);
      }
    }

    // Hands
    const hand = new THREE.Mesh(
      new THREE.SphereGeometry(0.115, 18, 16),
      monster ? redMat : bodyMat
    );

    hand.position.set(side * 0.35, 0.02, -0.05);
    group.add(hand);
    hands.push(hand);

    // Grinner hand markings
    if (monster) {
      for (let i = 0; i < 3; i++) {
        const mark = new THREE.Mesh(
          new THREE.SphereGeometry(0.025, 10, 8),
          darkMat
        );

        mark.position.set((i - 1) * 0.045, 0, -0.105);
        hand.add(mark);
      }
    }
  }

  // =================================
  // GRINNER BODY SPOTS
  // =================================

  if (monster) {
    const spots = [
      [-0.13, 0.48, -0.19, 0.035],
      [0.12, 0.55, -0.18, 0.04],
      [-0.08, 0.35, -0.17, 0.03],
      [0.15, 0.42, -0.13, 0.035],
      [0.03, 0.96, -0.13, 0.03],
      [-0.13, 0.76, -0.12, 0.035],
      [0.10, 0.30, -0.12, 0.03],
      [-0.19, 0.56, 0.02, 0.035],
      [0.19, 0.48, 0.02, 0.03]
    ];

    for (const [x, y, z, size] of spots) {
      const spot = new THREE.Mesh(
        new THREE.SphereGeometry(size, 12, 10),
        redMat
      );

      spot.position.set(x, y, z);
      group.add(spot);
    }
  }

  group.userData.hands = hands;
  group.userData.arms = arms;
  group.userData.bodyMaterial = bodyMat;
  group.userData.isMonster = monster;

  return group;
}

// =====================================
// UPDATE CHARACTER ARMS
// =====================================

function updateAvatarHand(avatar, index, position) {
  const side = index === 0 ? -1 : 1;

  const shoulder = new THREE.Vector3(
    side * 0.22,
    0.62,
    0
  );

  const hand = avatar.userData.hands[index];
  const arm = avatar.userData.arms[index];

  hand.position.copy(position);

  const direction = position.clone().sub(shoulder);
  const length = direction.length();

  arm.position.copy(shoulder).add(position).multiplyScalar(0.5);
  arm.scale.y = Math.max(length, 0.05);

  arm.quaternion.setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    direction.normalize()
  );
}

localAvatar = makeAvatar(currentColor);
rig.add(localAvatar);

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
 <input id="playerColour" type="color" value="#a9d6a0">
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

  sendMessage({
    type: "color",
    color: currentColor
  });
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

      avatar = makeAvatar(
        player.color || "#a9d6a0",
        isMonster
      );

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

      const worldPosition = new THREE.Vector3(
        hand.x,
        hand.y,
        hand.z
      );

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

function controllerPosition(controller) {
  const position = new THREE.Vector3();
  controller.getWorldPosition(position);
  return position;
}

function getHandData() {
  return controllers.map(controller => {
    const p = controllerPosition(controller);

    return {
      x: p.x,
      y: p.y,
      z: p.z
    };
  });
}

// =====================================
// MOVEMENT
// =====================================

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

    controllers.forEach((controller, index) => {
      const hand = controllerPosition(controller);

      if (previousHands[index]) {
        const movement = hand.clone().sub(previousHands[index]);

        if (hand.y < 0.35 && movement.length() > 0.002) {
          velocity.addScaledVector(movement, -3.2);
        }
      }

      previousHands[index] = hand.clone();

      const localHand = rig.worldToLocal(hand.clone());

      updateAvatarHand(localAvatar, index, localHand);
    });

    velocity.y -= 9.8 * delta;
    velocity.multiplyScalar(0.985);

    const speed = velocity.length();

    if (speed > 5.5) {
      velocity.multiplyScalar(5.5 / speed);
    }

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

    velocity.y -= 9.8 * delta;
    rig.position.y += velocity.y * delta;

    if (rig.position.y < 0) {
      rig.position.y = 0;
      velocity.y = 0;
    }

    if (keys.KeyX && !lastXPressed) {
      toggleMenu();
    }

    lastXPressed = !!keys.KeyX;
  }

  rig.position.x = THREE.MathUtils.clamp(rig.position.x, -8, 8);
  rig.position.z = THREE.MathUtils.clamp(rig.position.z, -8, 8);
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
