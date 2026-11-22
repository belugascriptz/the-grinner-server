
import * as THREE from "three";

const statusEl = document.getElementById("status");
const roomEl = document.getElementById("room");
const enterButton = document.getElementById("enterVR");

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x17191b);
scene.fog = new THREE.Fog(0x17191b, 12, 48);

const camera = new THREE.PerspectiveCamera(
  70,
  window.innerWidth / window.innerHeight,
  0.05,
  100
);

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  powerPreference: "high-performance"
});

renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.xr.enabled = true;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

const clock = new THREE.Clock();

const world = new THREE.Group();
scene.add(world);

scene.add(new THREE.HemisphereLight(0xbac7d0, 0x27201b, 1.5));

const mainLight = new THREE.DirectionalLight(0xffffff, 1.3);
mainLight.position.set(4, 9, 5);
mainLight.castShadow = true;
scene.add(mainLight);

const floorMaterial = new THREE.MeshStandardMaterial({
  color: 0x454442,
  roughness: 0.95
});

const wallMaterial = new THREE.MeshStandardMaterial({
  color: 0x55504b,
  roughness: 0.95
});

const floor = new THREE.Mesh(
  new THREE.BoxGeometry(30, 0.2, 30),
  floorMaterial
);
floor.position.y = -0.1;
floor.receiveShadow = true;
world.add(floor);

function makeWall(x, y, z, sx, sy, sz) {
  const wall = new THREE.Mesh(
    new THREE.BoxGeometry(sx, sy, sz),
    wallMaterial
  );
  wall.position.set(x, y, z);
  wall.castShadow = true;
  wall.receiveShadow = true;
  world.add(wall);
  return wall;
}

makeWall(0, 2.5, -12, 30, 5, 0.5);
makeWall(0, 2.5, 12, 30, 5, 0.5);
makeWall(-15, 2.5, 0, 0.5, 5, 24);
makeWall(15, 2.5, 0, 0.5, 5, 24);

for (let z = -10; z <= 10; z += 5) {
  const lamp = new THREE.PointLight(0xffd49b, 1.3, 9);
  lamp.position.set(0, 4.3, z);
  world.add(lamp);

  const bulb = new THREE.Mesh(
    new THREE.BoxGeometry(1.5, 0.08, 0.25),
    new THREE.MeshBasicMaterial({ color: 0xffd49b })
  );
  bulb.position.set(0, 4.7, z);
  world.add(bulb);
}

const playerRig = new THREE.Group();
scene.add(playerRig);
playerRig.position.set(0, 0, 2);

const headGroup = new THREE.Group();
playerRig.add(headGroup);
headGroup.position.y = 1.5;

const bodyMaterial = new THREE.MeshStandardMaterial({
  color: 0x777568,
  roughness: 1
});

const skinMaterial = new THREE.MeshStandardMaterial({
  color: 0x888477,
  roughness: 1
});

function makeDirtyTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#777568";
  ctx.fillRect(0, 0, 256, 256);

  for (let i = 0; i < 1800; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    const size = Math.random() * 5 + 1;
    const shade = Math.floor(Math.random() * 90 + 45);

    ctx.fillStyle = `rgba(${shade},${shade},${shade},${Math.random() * 0.4})`;
    ctx.fillRect(x, y, size, size);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

const dirtyTexture = makeDirtyTexture();
bodyMaterial.map = dirtyTexture;
bodyMaterial.needsUpdate = true;
skinMaterial.map = dirtyTexture;
skinMaterial.needsUpdate = true;

function makeCharacter(color = "#777568", monster = false) {
  const group = new THREE.Group();

  const fur = new THREE.MeshStandardMaterial({
    map: dirtyTexture,
    color,
    roughness: 1
  });

  const body = new THREE.Mesh(
    new THREE.CapsuleGeometry(monster ? 0.43 : 0.38, monster ? 0.85 : 0.65, 5, 8),
    fur
  );
  body.position.y = monster ? 1.05 : 0.85;
  body.castShadow = true;
  group.add(body);

  const head = new THREE.Mesh(
    new THREE.SphereGeometry(monster ? 0.4 : 0.34, 16, 12),
    fur
  );
  head.position.set(0, monster ? 1.9 : 1.55, -0.02);
  head.scale.set(1, 1.05, 0.95);
  head.castShadow = true;
  group.add(head);

  const eyeMaterial = new THREE.MeshStandardMaterial({
    color: 0x171212,
    roughness: 0.4
  });

  const eye = new THREE.Mesh(
    new THREE.SphereGeometry(0.075, 12, 10),
    eyeMaterial
  );
  eye.position.set(0.13, monster ? 1.98 : 1.62, -0.32);
  group.add(eye);

  if (monster) {
    const patch = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 12, 10),
      new THREE.MeshStandardMaterial({ color: 0x5b1018 })
    );
    patch.position.set(-0.13, 1.98, -0.31);
    group.add(patch);

    const grin = new THREE.Mesh(
      new THREE.BoxGeometry(0.42, 0.16, 0.07),
      new THREE.MeshStandardMaterial({ color: 0x260a0d })
    );
    grin.position.set(0, 1.72, -0.32);
    group.add(grin);

    for (let i = 0; i < 5; i++) {
      const tooth = new THREE.Mesh(
        new THREE.ConeGeometry(0.035, 0.11, 5),
        new THREE.MeshStandardMaterial({ color: 0xe6dfc9 })
      );
      tooth.rotation.x = Math.PI;
      tooth.position.set(-0.15 + i * 0.075, 1.78, -0.37);
      group.add(tooth);
    }
  }

  const arms = [];

  for (const side of [-1, 1]) {
    const arm = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.13, 0.55, 4, 8),
      fur
    );
    arm.position.set(side * 0.48, 0.95, -0.05);
    arm.rotation.z = side * -0.45;
    arm.castShadow = true;
    group.add(arm);
    arms.push(arm);
  }

  return { group, arms };
}

const localCharacter = makeCharacter();
playerRig.add(localCharacter.group);

const remotePlayers = new Map();
const remoteDummies = new Map();

const handGeometry = new THREE.SphereGeometry(0.12, 12, 10);
const handMaterial = new THREE.MeshStandardMaterial({
  color: 0xd5c6a7,
  roughness: 0.8
});

const leftHand = new THREE.Mesh(handGeometry, handMaterial);
const rightHand = new THREE.Mesh(handGeometry, handMaterial);
scene.add(leftHand, rightHand);

const leftController = renderer.xr.getController(0);
const rightController = renderer.xr.getController(1);

scene.add(leftController);
scene.add(rightController);

const controllerGripLeft = renderer.xr.getControllerGrip(0);
const controllerGripRight = renderer.xr.getControllerGrip(1);
scene.add(controllerGripLeft, controllerGripRight);

const controllerRaycaster = new THREE.Raycaster();
const tempMatrix = new THREE.Matrix4();

let socket;
let myId = null;
let roomId = "connecting";
let isAdmin = false;
let adminToken = "";
let playersState = [];
let dummiesState = [];
let adminMenu;
let adminButtons = [];
let menuOpen = false;
let selectedPlayer = null;
let heldPlayer = null;

let previousLeft = new THREE.Vector3();
let previousRight = new THREE.Vector3();
let velocity = new THREE.Vector3();
let leftGrip = false;
let rightGrip = false;
let lastMoveSend = 0;
let lastAdminSend = 0;

const raycaster = new THREE.Raycaster();
const down = new THREE.Vector3(0, -1, 0);
const handRadius = 0.14;

function setStatus(text) {
  if (statusEl) statusEl.textContent = text;
}

function connect() {
  const protocol = location.protocol === "https:" ? "wss:" : "ws:";
  socket = new WebSocket(`${protocol}//${location.host}`);

  socket.addEventListener("open", () => {
    setStatus("Connected");
  });

  socket.addEventListener("close", () => {
    setStatus("Disconnected - reconnecting...");
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
    }

    if (data.type === "state") {
      roomId = data.roomId;
      playersState = data.players || [];
      dummiesState = data.dummies || [];

      if (roomEl) {
        roomEl.textContent =
          `ROOM: ${roomId} | PLAYERS: ${data.count}/${data.slots}`;
      }

      updateRemotePlayers();
      updateDummies();
    }

    if (data.type === "admin-result") {
      isAdmin = !!data.success;
      if (isAdmin) {
        setStatus("Admin access granted");
        buildAdminMenu();
      } else {
        setStatus("Admin login failed");
      }
    }

    if (data.type === "error") {
      setStatus(data.message || "Server error");
    }
  });
}

function send(data) {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(data));
  }
}

connect();

function updateRemotePlayers() {
  const activeIds = new Set();

  for (const player of playersState) {
    if (player.id === myId) continue;

    activeIds.add(player.id);

    let avatar = remotePlayers.get(player.id);

    if (!avatar || avatar.role !== player.role) {
      if (avatar) scene.remove(avatar.group);

      const character = makeCharacter(
        player.color || "#777568",
        player.role === "monster"
      );

      avatar = {
        group: character.group,
        role: player.role,
        leftHand: new THREE.Mesh(handGeometry, handMaterial),
        rightHand: new THREE.Mesh(handGeometry, handMaterial)
      };

      scene.add(avatar.group);
      scene.add(avatar.leftHand);
      scene.add(avatar.rightHand);
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
    if (!activeIds.has(id)) {
      scene.remove(avatar.group);
      scene.remove(avatar.leftHand);
      scene.remove(avatar.rightHand);
      remotePlayers.delete(id);
    }
  }
}

function updateDummies() {
  const active = new Set();

  for (const dummy of dummiesState) {
    active.add(dummy.id);

    let object = remoteDummies.get(dummy.id);

    if (!object) {
      object = makeCharacter("#777568");
      scene.add(object.group);
      remoteDummies.set(dummy.id, object);
    }

    object.group.position.set(dummy.x || 0, dummy.y || 0, dummy.z || 0);
  }

  for (const [id, object] of remoteDummies) {
    if (!active.has(id)) {
      scene.remove(object.group);
      remoteDummies.delete(id);
    }
  }
}

function getControllerWorldPosition(controller) {
  const position = new THREE.Vector3();
  controller.getWorldPosition(position);
  return position;
}

function getGripState(controller, index) {
  const session = renderer.xr.getSession();
  if (!session) return false;

  const source = session.inputSources[index];
  if (!source || !source.gamepad) return false;

  const buttons = source.gamepad.buttons;
  return !!(buttons[1]?.pressed || buttons[2]?.pressed);
}

function isTouchingFloor(position) {
  return position.y <= handRadius + 0.06;
}

function isTouchingWall(position) {
  return (
    Math.abs(position.x) >= 14.65 ||
    Math.abs(position.z) >= 11.65
  );
}

function applyHandMovement(handPosition, previousPosition, gripping) {
  if (!gripping) return;

  const movement = new THREE.Vector3().subVectors(
    previousPosition,
    handPosition
  );

  if (isTouchingFloor(handPosition) || isTouchingWall(handPosition)) {
    velocity.add(movement.multiplyScalar(5.5));
  }
}

function updateLocomotion(delta) {
  const session = renderer.xr.getSession();

  if (!session) return;

  const leftPosition = getControllerWorldPosition(leftController);
  const rightPosition = getControllerWorldPosition(rightController);

  leftGrip = getGripState(leftController, 0);
  rightGrip = getGripState(rightController, 1);

  applyHandMovement(leftPosition, previousLeft, leftGrip);
  applyHandMovement(rightPosition, previousRight, rightGrip);

  previousLeft.copy(leftPosition);
  previousRight.copy(rightPosition);

  velocity.y -= 9.8 * delta;

  playerRig.position.addScaledVector(velocity, delta);

  if (playerRig.position.y < 0) {
    playerRig.position.y = 0;
    velocity.y = Math.max(0, velocity.y);
    velocity.x *= 0.88;
    velocity.z *= 0.88;
  }

  if (playerRig.position.x > 14.2) {
    playerRig.position.x = 14.2;
    velocity.x = Math.min(0, velocity.x);
  }

  if (playerRig.position.x < -14.2) {
    playerRig.position.x = -14.2;
    velocity.x = Math.max(0, velocity.x);
  }

  if (playerRig.position.z > 11.2) {
    playerRig.position.z = 11.2;
    velocity.z = Math.min(0, velocity.z);
  }

  if (playerRig.position.z < -11.2) {
    playerRig.position.z = -11.2;
    velocity.z = Math.max(0, velocity.z);
  }

  const damping = Math.pow(0.985, delta * 60);
  velocity.multiplyScalar(damping);

  leftHand.position.copy(leftPosition);
  rightHand.position.copy(rightPosition);

  const now = performance.now();

  if (now - lastMoveSend > 50) {
    lastMoveSend = now;

    send({
      type: "move",
      x: playerRig.position.x,
      y: playerRig.position.y,
      z: playerRig.position.z,
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

function createAdminMenu() {
  const group = new THREE.Group();

  const panel = new THREE.Mesh(
    new THREE.BoxGeometry(1.05, 1.25, 0.06),
    new THREE.MeshStandardMaterial({
      color: 0x17191e,
      roughness: 0.7
    })
  );
  group.add(panel);

  const border = new THREE.Mesh(
    new THREE.BoxGeometry(1.08, 1.28, 0.025),
    new THREE.MeshBasicMaterial({ color: 0x9d222c })
  );
  border.position.z = -0.035;
  group.add(border);

  const title = makeText("ADMIN MOD MENU", 0.9, 0.12, 0.05);
  title.position.set(0, 0.52, 0.045);
  group.add(title);

  return group;
}

function makeText(text, width, height, fontSize = 0.06) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 128;

  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, 512, 128);
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 42px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 256, 64);

  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true
  });

  return new THREE.Mesh(
    new THREE.PlaneGeometry(width, height),
    material
  );
}

function addAdminButton(label, y, action) {
  const button = new THREE.Mesh(
    new THREE.BoxGeometry(0.78, 0.13, 0.035),
    new THREE.MeshStandardMaterial({ color: 0x373b43 })
  );

  button.position.set(0, y, 0.07);
  button.userData.action = action;
  button.userData.isAdminButton = true;
  adminMenu.add(button);

  const text = makeText(label, 0.72, 0.11, 0.04);
  text.position.set(0, y, 0.095);
  adminMenu.add(text);

  adminButtons.push(button);
}

function buildAdminMenu() {
  if (adminMenu) {
    scene.remove(adminMenu);
  }

  adminButtons = [];
  adminMenu = createAdminMenu();

  addAdminButton("SPAWN DUMMY", 0.32, () => {
    send({ type: "spawn-dummy" });
  });

  addAdminButton("REMOVE DUMMIES", 0.15, () => {
    send({ type: "remove-dummies" });
  });

  addAdminButton("KICK SELECTED", -0.02, () => {
    if (selectedPlayer) {
      send({
        type: "kick-player",
        targetId: selectedPlayer
      });
    }
  });

  addAdminButton("BAN SELECTED", -0.19, () => {
    if (selectedPlayer) {
      send({
        type: "ban-player",
        targetId: selectedPlayer
      });
    }
  });

  addAdminButton("GRAB SELECTED", -0.36, () => {
    if (selectedPlayer) {
      heldPlayer = selectedPlayer;
      send({
        type: "grab-player",
        targetId: selectedPlayer
      });
    }
  });

  addAdminButton("RELEASE PLAYER", -0.53, () => {
    if (heldPlayer) {
      send({
        type: "release-player",
        targetId: heldPlayer
      });
      heldPlayer = null;
    }
  });

  scene.add(adminMenu);
  adminMenu.visible = false;
}

function toggleAdminMenu() {
  if (!isAdmin) {
    const name = "gamingforfun69";
    const token = prompt("Enter your admin token:");

    if (!token) return;

    adminToken = token;
    send({
      type: "admin-login",
      name,
      token: adminToken
    });
    return;
  }

  if (!adminMenu) buildAdminMenu();

  menuOpen = !menuOpen;
  adminMenu.visible = menuOpen;
}

function positionAdminMenu() {
  if (!adminMenu || !menuOpen) return;

  const direction = new THREE.Vector3(0, 0, -1);
  camera.getWorldDirection(direction);

  const position = new THREE.Vector3();
  camera.getWorldPosition(position);

  adminMenu.position.copy(position).add(
    direction.multiplyScalar(1.1)
  );

  adminMenu.position.y -= 0.15;
  adminMenu.quaternion.copy(camera.quaternion);
}

function handleAdminRay() {
  if (!menuOpen || !adminMenu) return;

  tempMatrix.identity().extractRotation(rightController.matrixWorld);

  const rayOrigin = new THREE.Vector3();
  rightController.getWorldPosition(rayOrigin);

  const rayDirection = new THREE.Vector3(0, 0, -1)
    .applyMatrix4(tempMatrix);

  controllerRaycaster.set(rayOrigin, rayDirection);
  const hits = controllerRaycaster.intersectObjects(adminButtons);

  if (hits.length > 0) {
    const button = hits[0].object;

    if (button.userData.action) {
      button.userData.action();
    }
  }
}

function setupControllerButtons() {
  leftController.addEventListener("selectstart", () => {
    if (leftController.userData.xPressed) return;
    leftController.userData.xPressed = true;
    toggleAdminMenu();
  });

  leftController.addEventListener("selectend", () => {
    leftController.userData.xPressed = false;
  });

  rightController.addEventListener("selectstart", () => {
    handleAdminRay();
  });
}

setupControllerButtons();

function updateTelekinesis() {
  if (!heldPlayer || !isAdmin) return;

  const now = performance.now();
  if (now - lastAdminSend < 80) return;

  lastAdminSend = now;

  const direction = new THREE.Vector3();
  camera.getWorldDirection(direction);

  const position = new THREE.Vector3();
  camera.getWorldPosition(position);

  position.add(direction.multiplyScalar(1.8));

  send({
    type: "move-held-player",
    targetId: heldPlayer,
    x: position.x,
    y: position.y - 1.2,
    z: position.z
  });
}

function setupVoting() {
  const votes = [
    ["voteForest", "Yellow Hall"],
    ["voteCaves", "Abandoned School"],
    ["voteFacility", "Red Tunnels"]
  ];

  for (const [id, map] of votes) {
    const button = document.getElementById(id);
    if (button) {
      button.textContent = map;
      button.addEventListener("click", () => {
        send({ type: "vote", map });
      });
    }
  }
}

setupVoting();

if (enterButton) {
  enterButton.addEventListener("click", async () => {
    try {
      if (!navigator.xr) {
        setStatus("WebXR is not available in this browser");
        return;
      }

      const supported = await navigator.xr.isSessionSupported("immersive-vr");

      if (!supported) {
        setStatus("VR is not supported");
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
      setStatus("VR connected");
      if (document.getElementById("hud")) {
        document.getElementById("hud").style.display = "none";
      }
    } catch (error) {
      console.error(error);
      setStatus("Could not enter VR");
    }
  });
}

function desktopControls(delta) {
  if (renderer.xr.isPresenting) return;

  const keys = window.__keys || (window.__keys = {});

  const forward = new THREE.Vector3(0, 0, -1);
  const right = new THREE.Vector3(1, 0, 0);

  if (keys.w) playerRig.position.addScaledVector(forward, delta * 3);
  if (keys.s) playerRig.position.addScaledVector(forward, -delta * 3);
  if (keys.a) playerRig.position.addScaledVector(right, -delta * 3);
  if (keys.d) playerRig.position.addScaledVector(right, delta * 3);
}

window.addEventListener("keydown", event => {
  window.__keys ||= {};
  window.__keys[event.key.toLowerCase()] = true;
});

window.addEventListener("keyup", event => {
  window.__keys ||= {};
  window.__keys[event.key.toLowerCase()] = false;
});

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

function animate() {
  const delta = Math.min(clock.getDelta(), 0.04);

  if (renderer.xr.isPresenting) {
    updateLocomotion(delta);
  } else {
    desktopControls(delta);
  }

  positionAdminMenu();
  updateTelekinesis();

  renderer.render(scene, camera);
}

renderer.setAnimationLoop(animate);
