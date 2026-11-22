
import * as THREE from "three";

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x101016);
scene.fog = new THREE.Fog(0x101016, 12, 35);

const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.xr.enabled = true;
document.body.appendChild(renderer.domElement);

const playerRig = new THREE.Group();
scene.add(playerRig);

camera.position.set(0, 1.55, 0);
playerRig.add(camera);

const clock = new THREE.Clock();
const velocity = new THREE.Vector3();
const keys = {};
const remotePlayers = new Map();

let socket;
let myId = null;
let roomId = "connecting";
let currentRole = "player";
let currentColor = "#a9d6a0";
let lastSync = 0;
let lastXPressed = false;
let menuOpen = false;
let localAvatar;
let controllers = [];
let previousHands = [null, null];

const statusEl = document.getElementById("status");
const roomEl = document.getElementById("room");
const enterVRButton = document.getElementById("enterVR");

scene.add(new THREE.HemisphereLight(0xb9c9ff, 0x25202a, 2));

const mainLight = new THREE.DirectionalLight(0xffffff, 1.5);
mainLight.position.set(5, 9, 4);
scene.add(mainLight);

// FLOOR
const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(40, 40),
  new THREE.MeshStandardMaterial({
    color: 0x292934,
    roughness: 0.95
  })
);
floor.rotation.x = -Math.PI / 2;
floor.position.y = -0.04;
scene.add(floor);

// ENVIRONMENT
function makeWall(x, y, z, sx, sy, sz, color = 0x383842) {
  const wall = new THREE.Mesh(
    new THREE.BoxGeometry(sx, sy, sz),
    new THREE.MeshStandardMaterial({ color, roughness: 0.9 })
  );
  wall.position.set(x, y, z);
  scene.add(wall);
  return wall;
}

makeWall(0, 2, -9, 20, 4, 0.5);
makeWall(0, 2, 9, 20, 4, 0.5);
makeWall(-9, 2, 0, 0.5, 4, 18);
makeWall(9, 2, 0, 0.5, 4, 18);

for (let i = 0; i < 8; i++) {
  const light = new THREE.PointLight(0x7777bb, 1.1, 7);
  light.position.set(-7 + i * 2, 3.5, -5);
  scene.add(light);
}

// ORIGINAL CHARACTER MODEL
function makeAvatar(color, isMonster = false) {
  const group = new THREE.Group();

  const bodyMaterial = new THREE.MeshStandardMaterial({
    color: isMonster ? 0xd8d4cc : color,
    roughness: 0.75
  });

  const darkMaterial = new THREE.MeshStandardMaterial({
    color: 0x17131a,
    roughness: 0.5
  });

  const eyeMaterial = new THREE.MeshStandardMaterial({
    color: isMonster ? 0xff1717 : 0xffffff,
    emissive: isMonster ? 0xaa0000 : 0x000000,
    emissiveIntensity: 2
  });

  const body = new THREE.Mesh(
    new THREE.SphereGeometry(0.38, 20, 16),
    bodyMaterial
  );
  body.position.y = 0.8;
  body.scale.set(1, 1.25, 0.8);
  group.add(body);

  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.29, 20, 16),
    bodyMaterial
  );
  head.position.set(0, 1.35, -0.02);
  group.add(head);

  // Swept ear fins
  for (const side of [-1, 1]) {
    const ear = new THREE.Mesh(
      new THREE.ConeGeometry(0.13, 0.48, 8),
      bodyMaterial
    );
    ear.position.set(side * 0.27, 1.55, 0);
    ear.rotation.z = side * -0.55;
    ear.rotation.x = -0.2;
    group.add(ear);
  }

  // Eyes
  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(
      new THREE.SphereGeometry(isMonster ? 0.075 : 0.055, 12, 12),
      eyeMaterial
    );
    eye.position.set(side * 0.12, 1.39, -0.265);
    group.add(eye);
  }

  // Grinner's exaggerated dark smile
  const mouth = new THREE.Mesh(
    new THREE.BoxGeometry(0.38, 0.10, 0.035),
    darkMaterial
  );
  mouth.position.set(0, 1.19, -0.275);
  group.add(mouth);

  if (isMonster) {
    const chestMark = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 12, 12),
      new THREE.MeshStandardMaterial({
        color: 0x9b1010,
        emissive: 0x450000
      })
    );
    chestMark.position.set(0, 0.85, -0.31);
    group.add(chestMark);

    const glow = new THREE.PointLight(0xff1111, 1.4, 3);
    glow.position.set(0, 1.4, -0.5);
    group.add(glow);
  }

  const arms = [];
  const hands = [];

  for (const side of [-1, 1]) {
    const arm = new THREE.Mesh(
      new THREE.CylinderGeometry(0.10, 0.13, 0.7, 12),
      bodyMaterial
    );
    arm.position.set(side * 0.43, 0.75, 0);
    arm.rotation.z = side * -0.3;
    group.add(arm);
    arms.push(arm);

    const hand = new THREE.Mesh(
      new THREE.SphereGeometry(0.16, 14, 12),
      bodyMaterial
    );
    hand.position.set(side * 0.5, 0.35, -0.1);
    group.add(hand);
    hands.push(hand);
  }

  group.userData.arms = arms;
  group.userData.hands = hands;
  group.userData.bodyMaterial = bodyMaterial;

  return group;
}

localAvatar = makeAvatar(currentColor);
playerRig.add(localAvatar);

// VOTING BOARDS
function makeBoard(x, z, title, color) {
  const board = new THREE.Group();

  const panel = new THREE.Mesh(
    new THREE.BoxGeometry(1.5, 1.1, 0.12),
    new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.15
    })
  );

  board.add(panel);
  board.position.set(x, 1.6, z);
  scene.add(board);

  return board;
}

makeBoard(-3, -5, "YELLOW HALL", 0xb8a12b);
makeBoard(0, -5, "SCHOOL", 0x526d8a);
makeBoard(3, -5, "RED TUNNELS", 0x8c2929);

// MENU
const menu = document.createElement("div");
menu.id = "grinnerMenu";

menu.style.cssText = `
  display:none;
  position:fixed;
  z-index:1000;
  top:50%;
  left:50%;
  transform:translate(-50%,-50%);
  width:280px;
  padding:22px;
  background:rgba(12,12,20,0.96);
  color:white;
  border:2px solid #a12b35;
  border-radius:15px;
  font-family:Arial,sans-serif;
  text-align:center;
`;

menu.innerHTML = `
  <h2 style="color:#ff4545;margin-top:0">THE GRINNER</h2>
  <p>PLAYER MENU</p>
  <label>Choose your colour</label>
  <br><br>
  <input id="playerColour" type="color" value="#a9d6a0">
  <br><br>
  <button id="startRound">START ROUND</button>
  <br><br>
  <button id="endRound">RETURN TO LOBBY</button>
  <br><br>
  <button id="closeMenu">CLOSE</button>
  <p style="font-size:11px;color:#aaa">Press X to open or close</p>
`;

document.body.appendChild(menu);

const menuButtons = menu.querySelectorAll("button");

menuButtons.forEach(button => {
  button.style.cssText = `
    width:100%;
    padding:12px;
    background:#8d222c;
    border:0;
    border-radius:7px;
    color:white;
    font-weight:bold;
  `;
});

function toggleMenu(force) {
  menuOpen = typeof force === "boolean" ? force : !menuOpen;
  menu.style.display = menuOpen ? "block" : "none";
}

document.getElementById("closeMenu").onclick = () => toggleMenu(false);

document.getElementById("playerColour").oninput = event => {
  currentColor = event.target.value;
  localAvatar.userData.bodyMaterial.color.set(currentColor);

  if (socket?.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({
      type: "color",
      color: currentColor
    }));
  }
};

document.getElementById("startRound").onclick = () => {
  sendMessage({ type: "start-round" });
  toggleMenu(false);
};

document.getElementById("endRound").onclick = () => {
  sendMessage({ type: "end-round" });
  toggleMenu(false);
};

// MULTIPLAYER
function sendMessage(data) {
  if (socket?.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(data));
  }
}

function connectMultiplayer() {
  const protocol = location.protocol === "https:" ? "wss:" : "ws:";
  socket = new WebSocket(`${protocol}//${location.host}`);

  socket.onopen = () => {
    statusEl.textContent = "Connected";
  };

  socket.onclose = () => {
    statusEl.textContent = "Disconnected - refresh to reconnect";
  };

  socket.onerror = () => {
    statusEl.textContent = "Connection error";
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
      roomId = data.roomId;
      roomEl.textContent = `ROOM: ${roomId}`;
    }

    if (data.type === "state") {
      roomId = data.roomId;
      roomEl.textContent =
        `ROOM: ${roomId} | PLAYERS: ${data.count}/${data.slots}`;

      if (data.players) updateRemotePlayers(data.players);

      const me = data.players?.find(player => player.id === myId);

      if (me && me.role !== currentRole) {
        currentRole = me.role;
        playerRig.remove(localAvatar);

        localAvatar = makeAvatar(
          currentColor,
          currentRole === "monster"
        );

        playerRig.add(localAvatar);

        statusEl.textContent =
          currentRole === "monster"
            ? "YOU ARE THE GRINNER!"
            : "Survive the round!";
      }
    }
  };
}

function updateRemotePlayers(players) {
  const found = new Set();

  for (const player of players) {
    if (player.id === myId) continue;

    found.add(player.id);

    let avatar = remotePlayers.get(player.id);

    if (!avatar) {
      avatar = makeAvatar(player.color || "#a9d6a0");
      scene.add(avatar);
      remotePlayers.set(player.id, avatar);
    }

    avatar.position.set(player.x, player.y, player.z);

    if (player.color && avatar.userData.bodyMaterial) {
      avatar.userData.bodyMaterial.color.set(player.color);
    }

    const monster = player.role === "monster";

    if (avatar.userData.isMonster !== monster) {
      const position = avatar.position.clone();
      const rotation = avatar.rotation.clone();

      scene.remove(avatar);
      avatar = makeAvatar(player.color || "#a9d6a0", monster);
      avatar.position.copy(position);
      avatar.rotation.copy(rotation);
      avatar.userData.isMonster = monster;

      scene.add(avatar);
      remotePlayers.set(player.id, avatar);
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
      avatar.userData.hands[index].position.copy(localPosition);
    });
  }

  for (const [id, avatar] of remotePlayers) {
    if (!found.has(id)) {
      scene.remove(avatar);
      remotePlayers.delete(id);
    }
  }
}

// VR CONTROLLERS
for (let i = 0; i < 2; i++) {
  const controller = renderer.xr.getController(i);
  playerRig.add(controller);
  controllers.push(controller);
}

function getControllerWorldPosition(controller) {
  const position = new THREE.Vector3();
  controller.getWorldPosition(position);
  return position;
}

function getHandData() {
  return controllers.map(controller => {
    const p = getControllerWorldPosition(controller);

    return {
      x: p.x,
      y: p.y,
      z: p.z
    };
  });
}

// MOVEMENT
function updateMovement(delta) {
  delta = Math.min(delta, 0.04);

  const session = renderer.xr.getSession();

  if (session) {
    // Quest X button on the left controller
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

    // Arm-pushing movement
    controllers.forEach((controller, index) => {
      const handPosition = getControllerWorldPosition(controller);

      if (previousHands[index]) {
        const movement = handPosition
          .clone()
          .sub(previousHands[index]);

        const nearFloor = handPosition.y < playerRig.position.y + 0.9;

        if (nearFloor && movement.length() > 0.004) {
          velocity.addScaledVector(movement, -4.0);
        }
      }

      previousHands[index] = handPosition.clone();
    });

    velocity.y -= 9.8 * delta;
    velocity.multiplyScalar(0.985);

    const speed = velocity.length();

    if (speed > 5.5) {
      velocity.multiplyScalar(5.5 / speed);
    }

    playerRig.position.addScaledVector(velocity, delta);

    if (playerRig.position.y < 0) {
      playerRig.position.y = 0;
      velocity.y = Math.max(0, velocity.y);
    }

  } else {
    // Desktop keyboard testing
    const direction = new THREE.Vector3();

    if (keys.KeyW) direction.z -= 1;
    if (keys.KeyS) direction.z += 1;
    if (keys.KeyA) direction.x -= 1;
    if (keys.KeyD) direction.x += 1;

    direction.normalize();
    direction.applyQuaternion(camera.quaternion);
    direction.y = 0;

    playerRig.position.addScaledVector(direction, delta * 3.5);

    if (keys.Space && playerRig.position.y <= 0.01) {
      velocity.y = 4.5;
    }

    velocity.y -= 9.8 * delta;
    playerRig.position.y += velocity.y * delta;

    if (playerRig.position.y < 0) {
      playerRig.position.y = 0;
      velocity.y = 0;
    }

    if (keys.KeyX && !lastXPressed) toggleMenu();
    lastXPressed = !!keys.KeyX;
  }

  // Keep players inside the room
  playerRig.position.x = THREE.MathUtils.clamp(
    playerRig.position.x, -8, 8
  );

  playerRig.position.z = THREE.MathUtils.clamp(
    playerRig.position.z, -8, 8
  );

  // Move local avatar arms toward the controllers
  controllers.forEach((controller, index) => {
    const hand = getControllerWorldPosition(controller);
    const localHand = playerRig.worldToLocal(hand.clone());

    localAvatar.userData.hands[index].position.copy(localHand);
  });
}

// SYNC
function syncPlayer(now) {
  if (now - lastSync < 75) return;
  lastSync = now;

  if (socket?.readyState !== WebSocket.OPEN) return;

  const hands = getHandData();

  sendMessage({
    type: "move",
    x: playerRig.position.x,
    y: playerRig.position.y,
    z: playerRig.position.z,
    leftHand: hands[0],
    rightHand: hands[1]
  });
}

// VOTING
document.getElementById("voteForest").onclick = () => {
  sendMessage({ type: "vote", choice: "Yellow Hall" });
};

document.getElementById("voteCaves").onclick = () => {
  sendMessage({ type: "vote", choice: "Abandoned School" });
};

document.getElementById("voteFacility").onclick = () => {
  sendMessage({ type: "vote", choice: "Red Tunnels" });
};

// ENTER VR
enterVRButton.onclick = async () => {
  if (!navigator.xr) {
    statusEl.textContent = "WebXR is not available in this browser";
    return;
  }

  try {
    const session = await navigator.xr.requestSession(
      "immersive-vr",
      {
        optionalFeatures: [
          "local-floor",
          "bounded-floor",
          "hand-tracking",
          "dom-overlay"
        ],
        domOverlay: { root: document.body }
      }
    );

    await renderer.xr.setSession(session);
    statusEl.textContent = "VR connected";
  } catch (error) {
    console.error(error);
    statusEl.textContent = "Could not enter VR";
  }
};

// KEYBOARD
window.addEventListener("keydown", event => {
  keys[event.code] = true;
});

window.addEventListener("keyup", event => {
  keys[event.code] = false;
});

// RESIZE
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// MAIN LOOP
renderer.setAnimationLoop(now => {
  const delta = clock.getDelta();

  updateMovement(delta);
  syncPlayer(now);

  renderer.render(scene, camera);
});

connectMultiplayer();

statusEl.textContent = "Loading The Grinner...";
