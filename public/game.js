
import * as THREE from "three";

const statusEl = document.getElementById("status");
const roomEl = document.getElementById("room");
const enterButton = document.getElementById("enterVR");

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x17191b);
scene.fog = new THREE.Fog(0x17191b, 12, 45);

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
document.body.appendChild(renderer.domElement);

const clock = new THREE.Clock();

scene.add(new THREE.HemisphereLight(0xc4d5e0, 0x30251e, 1.5));

const light = new THREE.DirectionalLight(0xffffff, 1.2);
light.position.set(5, 10, 5);
light.castShadow = true;
scene.add(light);

const world = new THREE.Group();
scene.add(world);

const floor = new THREE.Mesh(
  new THREE.BoxGeometry(30, 0.2, 30),
  new THREE.MeshStandardMaterial({ color: 0x454442, roughness: 1 })
);
floor.position.y = -0.1;
floor.receiveShadow = true;
world.add(floor);

const wallMaterial = new THREE.MeshStandardMaterial({
  color: 0x55504b,
  roughness: 1
});

function addWall(x, y, z, sx, sy, sz) {
  const wall = new THREE.Mesh(
    new THREE.BoxGeometry(sx, sy, sz),
    wallMaterial
  );
  wall.position.set(x, y, z);
  wall.castShadow = true;
  wall.receiveShadow = true;
  world.add(wall);
}

addWall(0, 2.5, -12, 30, 5, 0.5);
addWall(0, 2.5, 12, 30, 5, 0.5);
addWall(-15, 2.5, 0, 0.5, 5, 24);
addWall(15, 2.5, 0, 0.5, 5, 24);

for (let z = -10; z <= 10; z += 5) {
  const lamp = new THREE.PointLight(0xffd49b, 1.2, 9);
  lamp.position.set(0, 4.3, z);
  world.add(lamp);

  const bulb = new THREE.Mesh(
    new THREE.BoxGeometry(1.5, 0.08, 0.25),
    new THREE.MeshBasicMaterial({ color: 0xffd49b })
  );
  bulb.position.set(0, 4.7, z);
  world.add(bulb);
}

const rig = new THREE.Group();
scene.add(rig);
rig.position.set(0, 0, 2);

const handGeometry = new THREE.SphereGeometry(0.12, 12, 10);
const handMaterial = new THREE.MeshStandardMaterial({ color: 0xcbbda6 });

const leftHand = new THREE.Mesh(handGeometry, handMaterial);
const rightHand = new THREE.Mesh(handGeometry, handMaterial);
scene.add(leftHand, rightHand);

const leftController = renderer.xr.getController(0);
const rightController = renderer.xr.getController(1);
scene.add(leftController, rightController);

const controllerRay = new THREE.Raycaster();

let socket;
let myId = null;
let roomId = "connecting";
let players = [];
let dummies = [];

const remotePlayers = new Map();
const remoteDummies = new Map();

let menu;
let menuButtons = [];
let menuOpen = false;
let menuTab = "PLAYERS";
let selectedPlayerId = null;
let heldPlayerId = null;
let playerPage = 0;

let velocity = new THREE.Vector3();
let previousLeft = new THREE.Vector3();
let previousRight = new THREE.Vector3();
let lastMoveSend = 0;
let lastTelekinesisSend = 0;

let previousX = false;
let previousTrigger = false;
let lastTouch = 0;

const dirtyTextureCanvas = document.createElement("canvas");
dirtyTextureCanvas.width = 128;
dirtyTextureCanvas.height = 128;

const textureContext = dirtyTextureCanvas.getContext("2d");
textureContext.fillStyle = "#777568";
textureContext.fillRect(0, 0, 128, 128);

for (let i = 0; i < 700; i++) {
  const shade = Math.floor(45 + Math.random() * 100);
  textureContext.fillStyle =
    `rgba(${shade},${shade},${shade},0.3)`;

  textureContext.fillRect(
    Math.random() * 128,
    Math.random() * 128,
    Math.random() * 4 + 1,
    Math.random() * 4 + 1
  );
}

const dirtyTexture = new THREE.CanvasTexture(dirtyTextureCanvas);

// Original gorilla-inspired temporary character model.
function createAvatar(color = "#777568") {
  const group = new THREE.Group();

  const fur = new THREE.MeshStandardMaterial({
    color,
    map: dirtyTexture,
    roughness: 1
  });

  const dark = new THREE.MeshStandardMaterial({
    color: 0x302b29,
    roughness: 1
  });

  const eye = new THREE.MeshStandardMaterial({ color: 0xffffff });
  const pupil = new THREE.MeshStandardMaterial({ color: 0x171313 });

  function part(geometry, material, x, y, z, sx = 1, sy = 1, sz = 1) {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    mesh.scale.set(sx, sy, sz);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  }

  // Body and head
  part(
    new THREE.SphereGeometry(0.48, 16, 12),
    fur, 0, 0.95, 0, 1, 1.15, 0.8
  );

  part(
    new THREE.SphereGeometry(0.37, 16, 12),
    fur, 0, 1.58, -0.04
  );

  // Face and muzzle
  part(
    new THREE.SphereGeometry(0.20, 12, 10),
    dark, 0, 1.48, -0.34, 1.2, 0.75, 0.65
  );

  // Eyes
  part(
    new THREE.SphereGeometry(0.075, 10, 8),
    eye, -0.14, 1.68, -0.34
  );
  part(
    new THREE.SphereGeometry(0.075, 10, 8),
    eye, 0.14, 1.68, -0.34
  );
  part(
    new THREE.SphereGeometry(0.035, 8, 8),
    pupil, -0.14, 1.68, -0.405
  );
  part(
    new THREE.SphereGeometry(0.035, 8, 8),
    pupil, 0.14, 1.68, -0.405
  );

  // Ears
  part(
    new THREE.SphereGeometry(0.13, 10, 8),
    fur, -0.37, 1.62, -0.02
  );
  part(
    new THREE.SphereGeometry(0.13, 10, 8),
    fur, 0.37, 1.62, -0.02
  );

  const arms = [];

  for (const side of [-1, 1]) {
    const arm = part(
      new THREE.CapsuleGeometry(0.17, 0.58, 4, 8),
      fur, side * 0.55, 0.77, 0.02
    );

    arm.rotation.z = side * -0.65;
    arms.push(arm);

    part(
      new THREE.SphereGeometry(0.19, 12, 10),
      fur, side * 0.83, 0.35, -0.02,
      1.15, 0.8, 1
    );

    part(
      new THREE.SphereGeometry(0.19, 12, 8),
      dark, side * 0.24, 0.12, -0.13,
      1.2, 0.65, 1.5
    );
  }

  return { group, arms };
}

// Local character
const localAvatar = createAvatar();
rig.add(localAvatar.group);

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

  socket.addEventListener("open", () => {
    setStatus("Connected");
  });

  socket.addEventListener("close", () => {
    setStatus("Disconnected - reconnecting");
    setTimeout(connect, 2500);
  });

  socket.addEventListener("error", () => {
    setStatus("Connection error");
  });

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

// ---------------- WRIST ADMIN MENU ----------------

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
  button.userData.menuButton = true;

  menu.add(button);

  const text = makeMenuText(label, width - 0.035, 0.075);
  text.position.set(x, y, 0.03);
  menu.add(text);

  menuButtons.push(button);
  return button;
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

  panel.position.set(0, 0, -0.008);
  menu.add(panel);

  // Red border
  const border = new THREE.Mesh(
    new THREE.BoxGeometry(0.95, 0.97, 0.018),
    new THREE.MeshBasicMaterial({ color: 0x9d222c })
  );

  border.position.z = -0.035;
  menu.add(border);

  // Attach directly to the left controller/wrist.
  menu.position.set(0.02, 0.10, -0.19);
  menu.rotation.set(-0.25, 0, 0);
  menu.visible = false;

  leftController.add(menu);
  refreshAdminMenu();
}

function addTab(label, x, tab) {
  const active = menuTab === tab;

  addMenuButton(
    label,
    x,
    0.36,
    0.20,
    () => {
      menuTab = tab;
      refreshAdminMenu();
    },
    active ? 0x96323b : 0x343a43
  );
}

function refreshAdminMenu() {
  if (!menu) return;

  clearMenu();

  const heading = makeMenuText("ADMIN", 0.55, 0.09);
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
      0,
      0.20,
      0.72,
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
      0,
      -0.35,
      0.72,
      () => {
        if (!selectedPlayerId) return;
        send({
          type: "kick-player",
          targetId: selectedPlayerId
        });
        selectedPlayerId = null;
      },
      0x74343a
    );

    addMenuButton(
      "BAN SELECTED",
      0,
      -0.49,
      0.72,
      () => {
        if (!selectedPlayerId) return;
        send({
          type: "ban-player",
          targetId: selectedPlayerId
        });
        selectedPlayerId = null;
      },
      0x74343a
    );
  }

  if (menuTab === "DUMMIES") {
    addMenuButton(
      "SPAWN DUMMY",
      0,
      0.13,
      0.72,
      () => send({ type: "spawn-dummy" }),
      0x315c42
    );

    addMenuButton(
      "REMOVE ALL DUMMIES",
      0,
      -0.04,
      0.72,
      () => send({ type: "remove-dummies" }),
      0x74343a
    );

    addMenuButton(
      `DUMMIES: ${dummies.length}`,
      0,
      -0.21,
      0.72,
      () => {},
      0x45404b
    );
  }

  if (menuTab === "TELE") {
    addMenuButton(
      "SELECT A PLAYER IN PLAYERS",
      0,
      0.17,
      0.72,
      () => {
        menuTab = "PLAYERS";
        refreshAdminMenu();
      }
    );

    addMenuButton(
      "GRAB SELECTED",
      0,
      0.00,
      0.72,
      () => {
        if (!selectedPlayerId) return;
        heldPlayerId = selectedPlayerId;
        send({
          type: "grab-player",
          targetId: heldPlayerId
        });
      },
      0x315c42
    );

    addMenuButton(
      "RELEASE PLAYER",
      0,
      -0.17,
      0.72,
      () => {
        if (!heldPlayerId) return;
        send({
          type: "release-player",
          targetId: heldPlayerId
        });
        heldPlayerId = null;
      },
      0x74343a
    );
  }

  if (menuTab === "SERVER") {
    addMenuButton(
      `ROOM: ${roomId}`,
      0,
      0.15,
      0.72,
      () => {},
      0x45404b
    );

    addMenuButton(
      `PLAYERS: ${players.length}`,
      0,
      -0.02,
      0.72,
      () => {},
      0x45404b
    );

    addMenuButton(
      "CLOSE MENU",
      0,
      -0.19,
      0.72,
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

function getGamepadButton(source, index) {
  return !!source?.gamepad?.buttons?.[index]?.pressed;
}

function getXRInputSources() {
  const session = renderer.xr.getSession();
  if (!session) return [];
  return [...session.inputSources];
}

function findInput(handedness) {
  return getXRInputSources().find(
    source => source.handedness === handedness
  );
}

// Get a tracked index-finger tip when Quest hand tracking is active.
function getIndexFingerTip() {
  const source = findInput("right");

  if (source?.hand) {
    const frame = renderer.xr.getFrame();
    const referenceSpace = renderer.xr.getReferenceSpace();
    const joint = source.hand.get("index-finger-tip");

    if (frame && referenceSpace && joint) {
      const pose = frame.getJointPose(joint, referenceSpace);

      if (pose) {
        return new THREE.Vector3(
          pose.transform.position.x,
          pose.transform.position.y,
          pose.transform.position.z
        );
      }
    }
  }

  // Controller fallback: approximate fingertip at the controller front.
  const position = new THREE.Vector3();
  const direction = new THREE.Vector3(0, 0, -1);

  rightController.getWorldPosition(position);
  direction.applyQuaternion(rightController.quaternion);

  return position.addScaledVector(direction, 0.13);
}

function activateTouchedButton() {
  if (!menuOpen || !menu) return;

  const fingertip = getIndexFingerTip();

  for (const button of menuButtons) {
    const bounds = new THREE.Box3().setFromObject(button);

    if (bounds.containsPoint(fingertip)) {
      const now = performance.now();

      if (now - lastTouch > 350) {
        lastTouch = now;

        if (button.userData.action) {
          button.userData.action();
        }
      }

      return;
    }
  }
}

function handleXRButtons() {
  const left = findInput("left");
  const right = findInput("right");

  const xPressed = getGamepadButton(left, 4);

  if (xPressed && !previousX) {
    toggleMenu();
  }

  previousX = xPressed;

  const triggerPressed = getGamepadButton(right, 0);

  // Trigger fallback for controller users.
  if (triggerPressed && !previousTrigger && menuOpen) {
    clickMenuWithRightController();
  }

  previousTrigger = triggerPressed;

  // Hand tracking: touch a menu button with the index fingertip.
  if (menuOpen && right?.hand) {
    activateTouchedButton();
  }
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

// ---------------- MOVEMENT ----------------

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

function getHandPosition(controller) {
  const position = new THREE.Vector3();
  controller.getWorldPosition(position);
  return position;
}

function touchingBoundary(position) {
  return (
    position.y < 0.2 ||
    Math.abs(position.x) > 14.5 ||
    Math.abs(position.z) > 11.5
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
  rig.position.z = THREE.MathUtils.clamp(rig.position.z, -11, 11);

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

// ---------------- MAP VOTING ----------------

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

// ---------------- ENTER VR ----------------

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

// ---------------- DESKTOP TESTING ----------------

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

// ---------------- RESIZE AND GAME LOOP ----------------

window.addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

function animate() {
  const delta = Math.min(clock.getDelta(), 0.04);

  if (renderer.xr.isPresenting) {
    handleXRButtons();
    updateMovement(delta);
  } else {
    desktopMovement(delta);
  }

  updateTelekinesis();
  renderer.render(scene, camera);
}

renderer.setAnimationLoop(animate);
