
import * as THREE from "three";

// ============================================
// THE GRINNER VR - PLAYER, HANDS & MOVEMENT
// ============================================

const statusEl = document.getElementById("status");
const roomEl = document.getElementById("room");
const enterButton = document.getElementById("enterVR");

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x17191b);
scene.fog = new THREE.Fog(0x17191b, 15, 45);

const camera = new THREE.PerspectiveCamera(
  70, window.innerWidth / window.innerHeight, 0.05, 100
);
camera.position.set(0, 1.6, 5);

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: false
});

renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.xr.enabled = true;
renderer.xr.setReferenceSpaceType("local-floor");
document.body.appendChild(renderer.domElement);

scene.add(new THREE.HemisphereLight(0xcbd8e8, 0x29221d, 2));

const sunlight = new THREE.DirectionalLight(0xffffff, 1.5);
sunlight.position.set(4, 9, 5);
scene.add(sunlight);

// ============================================
// MATERIALS
// ============================================

const materials = {
  floor: new THREE.MeshStandardMaterial({
    color: 0x343638,
    roughness: 0.95
  }),
  wall: new THREE.MeshStandardMaterial({
    color: 0x55504a,
    roughness: 0.95
  }),
  dark: new THREE.MeshStandardMaterial({
    color: 0x171717,
    roughness: 0.9
  }),
  pale: new THREE.MeshStandardMaterial({
    color: 0xe7e5df,
    roughness: 0.9
  }),
  red: new THREE.MeshStandardMaterial({
    color: 0x7d2027,
    roughness: 0.85
  })
};

// ============================================
// ROOM
// ============================================

const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(40, 40),
  materials.floor
);
floor.rotation.x = -Math.PI / 2;
floor.position.y = 0;
scene.add(floor);

function addWall(x, y, z, w, h, d, material = materials.wall) {
  const wall = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    material
  );

  wall.position.set(x, y, z);
  scene.add(wall);
  return wall;
}

addWall(0, 2.2, -10, 20, 4.4, 0.5);
addWall(-10, 2.2, 0, 0.5, 4.4, 20);
addWall(10, 2.2, 0, 0.5, 4.4, 20);
addWall(0, 4.4, 0, 20, 0.25, 20);

// ============================================
// MAP VOTING BOARDS
// ============================================

const mapNames = [
  "Yellow Hall",
  "Abandoned School",
  "Red Tunnels"
];

const mapLabels = [
  "YELLOW HALL",
  "ABANDONED SCHOOL",
  "RED TUNNELS"
];

const mapColors = [0xd0ad35, 0x526477, 0x9d3030];
const voteBoards = [];

function makeTextTexture(title, subtitle) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 256;

  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#171717";
  ctx.fillRect(0, 0, 512, 256);

  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.font = "bold 39px Arial";
  ctx.fillText(title, 256, 105);

  ctx.font = "27px Arial";
  ctx.fillStyle = "#d0d0d0";
  ctx.fillText(subtitle, 256, 165);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

for (let i = 0; i < 3; i++) {
  const x = (i - 1) * 4.5;

  const board = new THREE.Group();

  const panel = new THREE.Mesh(
    new THREE.BoxGeometry(2.5, 2.1, 0.22),
    new THREE.MeshStandardMaterial({
      color: mapColors[i],
      roughness: 0.8
    })
  );

  panel.position.y = 1.7;
  board.add(panel);

  const label = new THREE.Mesh(
    new THREE.PlaneGeometry(2.3, 1.05),
    new THREE.MeshBasicMaterial({
      map: makeTextTexture(mapLabels[i], "TOUCH TO VOTE")
    })
  );

  label.position.set(0, 1.85, 0.116);
  board.add(label);

  const base = new THREE.Mesh(
    new THREE.BoxGeometry(2.9, 0.18, 0.8),
    materials.dark
  );

  base.position.y = 0.09;
  board.add(base);

  board.position.set(x, 0, -7.5);
  scene.add(board);

  voteBoards.push({
    group: board,
    choice: mapNames[i],
    votes: 0
  });
}

// ============================================
// GRINNER STATUE
// ============================================

const grinner = new THREE.Group();

const monsterTorso = new THREE.Mesh(
  new THREE.CapsuleGeometry(0.38, 0.75, 5, 10),
  materials.pale
);

monsterTorso.position.y = 1.05;
grinner.add(monsterTorso);

const monsterHead = new THREE.Mesh(
  new THREE.SphereGeometry(0.46, 24, 18),
  materials.pale
);

monsterHead.position.y = 2;
grinner.add(monsterHead);

const monsterEye = new THREE.Mesh(
  new THREE.SphereGeometry(0.085, 16, 12),
  materials.dark
);

monsterEye.position.set(-0.17, 2.08, 0.405);
grinner.add(monsterEye);

const monsterPupil = new THREE.Mesh(
  new THREE.SphereGeometry(0.03, 12, 10),
  new THREE.MeshBasicMaterial({ color: 0xc51e2c })
);

monsterPupil.position.set(-0.17, 2.08, 0.48);
grinner.add(monsterPupil);

const eyePatch = new THREE.Mesh(
  new THREE.SphereGeometry(0.13, 16, 12),
  materials.red
);

eyePatch.position.set(0.19, 2.08, 0.39);
grinner.add(eyePatch);

const grin = new THREE.Mesh(
  new THREE.BoxGeometry(0.44, 0.09, 0.045),
  materials.dark
);

grin.position.set(0.02, 1.82, 0.42);
grinner.add(grin);

grinner.position.set(0, 0, -4.5);
scene.add(grinner);

// ============================================
// PLAYER CHARACTER
// ============================================

const avatarMaterialCache = new Map();

function getPlayerMaterial(color) {
  if (!avatarMaterialCache.has(color)) {
    avatarMaterialCache.set(
      color,
      new THREE.MeshStandardMaterial({
        color,
        roughness: 0.92
      })
    );
  }

  return avatarMaterialCache.get(color);
}

const skinMaterial = new THREE.MeshStandardMaterial({
  color: 0x292a27,
  roughness: 1
});

const jointMaterial = new THREE.MeshStandardMaterial({
  color: 0x45443f,
  roughness: 1
});

function sphere(parent, x, y, z, sx, sy, sz, material) {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(1, 16, 12),
    material
  );

  mesh.position.set(x, y, z);
  mesh.scale.set(sx, sy, sz);
  parent.add(mesh);

  return mesh;
}

function makeFinger(parent, length, radius) {
  const finger = new THREE.Group();
  parent.add(finger);

  const first = new THREE.Mesh(
    new THREE.CapsuleGeometry(radius, length * 0.48, 3, 7),
    skinMaterial
  );

  first.position.y = -length * 0.24;
  finger.add(first);

  const joint = new THREE.Group();
  joint.position.y = -length * 0.48;
  finger.add(joint);

  const second = new THREE.Mesh(
    new THREE.CapsuleGeometry(radius * 0.85, length * 0.43, 3, 7),
    skinMaterial
  );

  second.position.y = -length * 0.22;
  joint.add(second);

  finger.userData.joint = joint;
  finger.userData.length = length;

  return finger;
}

function makeHand() {
  const hand = new THREE.Group();

  const palm = sphere(
    hand, 0, 0, 0,
    0.105, 0.12, 0.065,
    skinMaterial
  );

  const fingers = [];

  // Two separate fingers.
  const index = makeFinger(hand, 0.19, 0.026);
  index.position.set(-0.045, -0.04, 0);
  fingers.push(index);

  const middle = makeFinger(hand, 0.21, 0.027);
  middle.position.set(0.045, -0.04, 0);
  fingers.push(middle);

  // Separate thumb.
  const thumb = makeFinger(hand, 0.15, 0.03);
  thumb.position.set(-0.105, 0.015, 0.015);
  thumb.rotation.z = 1.05;
  fingers.push(thumb);

  hand.userData.fingers = fingers;
  hand.userData.palm = palm;

  return hand;
}

function makeArm(parent, material, side) {
  const shoulder = new THREE.Group();
  parent.add(shoulder);

  const upper = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.105, 0.38, 5, 9),
    material
  );

  shoulder.add(upper);

  const elbow = sphere(
    shoulder, 0, 0, 0,
    0.105, 0.105, 0.105,
    material
  );

  const lower = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.085, 0.38, 5, 9),
    material
  );

  shoulder.add(lower);

  const hand = makeHand();
  parent.add(hand);

  return {
    shoulder,
    upper,
    elbow,
    lower,
    hand,
    side
  };
}

function positionArm(arm, shoulderPosition, handPosition) {
  const shoulder = new THREE.Vector3().copy(shoulderPosition);
  const hand = new THREE.Vector3().copy(handPosition);

  const direction = new THREE.Vector3().subVectors(hand, shoulder);
  const distance = direction.length();

  if (distance < 0.001) return;

  const midpoint = shoulder.clone().add(hand).multiplyScalar(0.5);

  arm.shoulder.position.copy(midpoint);
  arm.shoulder.quaternion.setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    direction.normalize()
  );

  const upperLength = distance * 0.48;
  const lowerLength = distance * 0.48;

  arm.upper.scale.y = upperLength / 0.48;
  arm.lower.scale.y = lowerLength / 0.48;

  arm.upper.position.y = -distance * 0.24;
  arm.lower.position.y = distance * 0.24;

  arm.elbow.position.y = 0;

  arm.hand.position.copy(hand);
}

function makeAvatar(color = "#83c9ad", local = false) {
  const root = new THREE.Group();
  const body = new THREE.Group();

  root.add(body);

  const material = getPlayerMaterial(color);

  // Torso.
  const torso = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.31, 0.48, 5, 12),
    material
  );

  torso.position.y = 0.91;
  torso.scale.set(1.05, 1, 0.9);
  body.add(torso);

  // Chest.
  sphere(body, 0, 1.15, 0.025, 0.34, 0.26, 0.28, material);

  // Neck.
  sphere(body, 0, 1.42, 0, 0.12, 0.14, 0.12, material);

  // Head group.
  const headGroup = new THREE.Group();
  headGroup.position.y = 1.58;
  body.add(headGroup);

  sphere(
    headGroup, 0, 0, 0,
    0.28, 0.3, 0.27,
    material
  );

  sphere(
    headGroup, 0, -0.12, 0.2,
    0.19, 0.12, 0.12,
    skinMaterial
  );

  sphere(
    headGroup, -0.1, 0.04, 0.25,
    0.035, 0.035, 0.025,
    materials.dark
  );

  sphere(
    headGroup, 0.1, 0.04, 0.25,
    0.035, 0.035, 0.025,
    materials.dark
  );

  // Legs.
  const leftLeg = new THREE.Group();
  const rightLeg = new THREE.Group();

  body.add(leftLeg, rightLeg);

  for (const [leg, x] of [[leftLeg, -0.15], [rightLeg, 0.15]]) {
    const upperLeg = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.105, 0.3, 4, 8),
      material
    );

    upperLeg.position.set(x, 0.39, 0);
    leg.add(upperLeg);

    sphere(leg, x, 0.15, 0.07, 0.13, 0.09, 0.19, skinMaterial);
  }

  // Arms and hands.
  const leftArm = makeArm(body, material, -1);
  const rightArm = makeArm(body, material, 1);

  const avatar = {
    root,
    body,
    torso,
    headGroup,
    leftArm,
    rightArm,
    local,
    color
  };

  if (local) {
    // Hide only the local head, not the body.
    headGroup.visible = false;
  }

  return avatar;
}

const localAvatar = makeAvatar("#83c9ad", true);
scene.add(localAvatar.root);

const remoteAvatars = new Map();

// ============================================
// VR CONTROLLERS
// ============================================

const controllers = [];
const previousHands = [null, null];
const handPositions = [
  new THREE.Vector3(),
  new THREE.Vector3()
];

const controllerConnected = [false, false];

for (let i = 0; i < 2; i++) {
  const controller = renderer.xr.getController(i);
  scene.add(controller);
  controllers.push(controller);

  controller.addEventListener("connected", event => {
    const handedness = event.data.handedness;
    controller.userData.handIndex =
      handedness === "left" ? 0 :
      handedness === "right" ? 1 : i;

    controllerConnected[controller.userData.handIndex] = true;
  });

  controller.addEventListener("disconnected", () => {
    const index = controller.userData.handIndex ?? i;
    controllerConnected[index] = false;
    previousHands[index] = null;
  });
}

// ============================================
// MULTIPLAYER
// ============================================

let ws = null;
let myId = null;
let currentCount = 0;
let currentMap = "Yellow Hall";
let currentPhase = "lobby";
let voteEndsAt = null;
let lastNetworkSend = 0;

function connectSocket() {
  const scheme = location.protocol === "https:" ? "wss:" : "ws:";

  ws = new WebSocket(`${scheme}//${location.host}`);

  ws.addEventListener("open", () => {
    statusEl.textContent = "Connected to game server";
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
      return;
    }

    if (data.type === "state") {
      currentCount = data.count ?? currentCount;
      currentMap = data.map || currentMap;
      currentPhase = data.phase || "lobby";
      voteEndsAt = data.voteEndsAt || null;

      roomEl.textContent =
        `ROOM: ${currentCount} / ${data.slots || 12}`;

      if (data.votes) {
        voteBoards.forEach(board => {
          board.votes = data.votes[board.choice] || 0;
        });
      }

      if (currentPhase === "voting") {
        statusEl.textContent = "Touch a map board to vote!";
      } else if (currentPhase === "loading") {
        statusEl.textContent = `Selected map: ${currentMap}`;
      } else if (currentPhase === "playing") {
        statusEl.textContent = `Playing: ${currentMap}`;
      } else {
        statusEl.textContent = `Lobby • ${currentPhase}`;
      }

      updateRemotePlayers(data.players || []);
    }

    if (data.type === "vote-result" && !data.success) {
      statusEl.textContent = data.message || "Vote unavailable";
    }

    if (data.type === "kicked") {
      statusEl.textContent = "You were removed from the room";
    }
  });

  ws.addEventListener("close", () => {
    statusEl.textContent = "Server disconnected — refresh to retry";
  });

  ws.addEventListener("error", () => {
    statusEl.textContent = "Could not connect to server";
  });
}

connectSocket();

function sendMessage(data) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(data));
  }
}

// ============================================
// REMOTE AVATARS
// ============================================

function updateRemotePlayers(players) {
  const activeIds = new Set();

  for (const player of players) {
    if (player.id === myId) continue;

    activeIds.add(player.id);

    let avatar = remoteAvatars.get(player.id);

    if (!avatar) {
      avatar = makeAvatar(player.color || "#83c9ad");
      scene.add(avatar.root);
      remoteAvatars.set(player.id, avatar);
    }

    if (player.color && avatar.color !== player.color) {
      avatar.root.remove(avatar.body);
      const replacement = makeAvatar(player.color);
      avatar.body = replacement.body;
      avatar.torso = replacement.torso;
      avatar.headGroup = replacement.headGroup;
      avatar.leftArm = replacement.leftArm;
      avatar.rightArm = replacement.rightArm;
      avatar.color = player.color;
      avatar.root.add(avatar.body);
    }

    avatar.root.position.set(
      player.x || 0,
      Math.max(0, (player.y || 1.6) - 1.6),
      player.z || 0
    );

    if (player.role === "monster") {
      avatar.torso.material = materials.pale;
    } else {
      avatar.torso.material = getPlayerMaterial(player.color || "#83c9ad");
    }

    const left = player.leftHand;
    const right = player.rightHand;

    if (left) {
      const pos = new THREE.Vector3(left.x, left.y, left.z);
      const shoulder = new THREE.Vector3(-0.32, 1.25, 0);
      positionArm(avatar.leftArm, shoulder, pos);
      animateFingers(avatar.leftArm.hand, left.curl || 0);
    }

    if (right) {
      const pos = new THREE.Vector3(right.x, right.y, right.z);
      const shoulder = new THREE.Vector3(0.32, 1.25, 0);
      positionArm(avatar.rightArm, shoulder, pos);
      animateFingers(avatar.rightArm.hand, right.curl || 0);
    }
  }

  for (const [id, avatar] of remoteAvatars) {
    if (!activeIds.has(id)) {
      scene.remove(avatar.root);
      remoteAvatars.delete(id);
    }
  }
}

// ============================================
// INDEPENDENT FINGER ANIMATION
// ============================================

function animateFingers(hand, curl, thumbCurl = curl) {
  if (!hand || !hand.userData.fingers) return;

  const fingers = hand.userData.fingers;

  // Each finger is its own joint.
  fingers[0].userData.joint.rotation.x = curl * 1.1;
  fingers[1].userData.joint.rotation.x = curl * 1.1;
  fingers[2].userData.joint.rotation.x = thumbCurl * 1.2;

  fingers[2].rotation.z = 1.05 - thumbCurl * 0.35;
}

function getControllerCurl(controller) {
  const session = renderer.xr.getSession();
  if (!session) return { index: 0, middle: 0, thumb: 0 };

  const input = session.inputSources.find(source => {
    return source.handedness ===
      (controller.userData.handIndex === 0 ? "left" : "right");
  });

  if (!input || !input.gamepad) {
    return { index: 0, middle: 0, thumb: 0 };
  }

  const buttons = input.gamepad.buttons || [];

  return {
    index: buttons[0]?.value || 0,
    middle: buttons[1]?.value || 0,
    thumb: buttons[3]?.pressed ? 1 : 0
  };
}

// ============================================
// BODY FOLLOWING HEADSET
// ============================================

const xrCamera = new THREE.Group();

function getHeadWorldPosition() {
  const activeCamera = renderer.xr.isPresenting
    ? renderer.xr.getCamera()
    : camera;

  const position = new THREE.Vector3();
  activeCamera.getWorldPosition(position);

  return position;
}

function updateLocalBody() {
  const headPosition = getHeadWorldPosition();

  // Keep the torso underneath the actual headset position.
  localAvatar.root.position.x = headPosition.x;
  localAvatar.root.position.z = headPosition.z;

  const bodyHeight = Math.max(0, headPosition.y - 1.6);
  localAvatar.root.position.y = bodyHeight;

  if (renderer.xr.isPresenting) {
    const headQuaternion = new THREE.Quaternion();
    renderer.xr.getCamera().getWorldQuaternion(headQuaternion);

    const direction = new THREE.Vector3(0, 0, -1);
    direction.applyQuaternion(headQuaternion);
    direction.y = 0;

    if (direction.lengthSq() > 0.001) {
      localAvatar.root.rotation.y =
        Math.atan2(-direction.x, -direction.z);
    }
  }

  // Keep shoulders attached to the torso.
  const leftShoulder = new THREE.Vector3(-0.32, 1.25, 0);
  const rightShoulder = new THREE.Vector3(0.32, 1.25, 0);

  return { leftShoulder, rightShoulder };
}

// ============================================
// GORILLA-STYLE ARM MOVEMENT
// ============================================

const gravity = 5.5;
const minimumHeadHeight = 1.05;
let verticalVelocity = 0;
let lastFrameTime = performance.now();

function getHandWorldPosition(index) {
  const controller = controllers[index];
  const position = new THREE.Vector3();

  controller.getWorldPosition(position);
  return position;
}

function handIsTouchingFloor(position) {
  return position.y <= 0.13;
}

function updateMovement(delta) {
  if (!renderer.xr.isPresenting) return;

  const head = getHeadWorldPosition();

  let touchingFloor = false;
  const push = new THREE.Vector3();

  for (let i = 0; i < 2; i++) {
    if (!controllerConnected[i]) continue;

    const current = getHandWorldPosition(i);

    if (previousHands[i]) {
      const movement = new THREE.Vector3().subVectors(
        current,
        previousHands[i]
      );

      if (handIsTouchingFloor(current)) {
        touchingFloor = true;

        // Push the player opposite to the movement of the planted hand.
        push.x -= movement.x;
        push.z -= movement.z;

        // A downward hand movement against the floor pushes the body up.
        if (movement.y < -0.012) {
          push.y += Math.abs(movement.y);
        }
      }

      // Stop hands passing through the floor.
      if (current.y < 0.08) {
        const correction = 0.08 - current.y;
        push.y += correction;
      }
    }

    previousHands[i] = current.clone();
  }

  // Apply the hand push to the whole VR rig.
  const rig = renderer.xr.getReferenceSpace();

  if (push.lengthSq() > 0) {
    const cameraParent = renderer.xr.getCamera();

    // Move the reference-space origin through the XR reference-space offset.
    // The renderer's camera parent is the XR camera rig.
    const xrRig = camera.parent;

    if (xrRig) {
      xrRig.position.add(push.multiplyScalar(1.8));
    }
  }

  // Gravity pulls the player down when hands aren't supporting them.
  if (!touchingFloor) {
    verticalVelocity -= gravity * delta;
  } else {
    verticalVelocity = Math.max(0, verticalVelocity);
  }

  const xrRig = camera.parent;

  if (xrRig) {
    xrRig.position.y += verticalVelocity * delta;
  }

  const newHead = getHeadWorldPosition();

  if (newHead.y < minimumHeadHeight) {
    const correction = minimumHeadHeight - newHead.y;

    if (xrRig) {
      xrRig.position.y += correction;
    }

    verticalVelocity = Math.max(0, verticalVelocity);
  }

  // Keep the player inside the playable area.
  if (xrRig) {
    xrRig.position.x = THREE.MathUtils.clamp(
      xrRig.position.x, -8.5, 8.5
    );

    xrRig.position.z = THREE.MathUtils.clamp(
      xrRig.position.z, -8.5, 8.5
    );
  }
}

// ============================================
// HAND POSITIONS AND ARM VISUALS
// ============================================

const networkHandData = [null, null];

function updateLocalHands() {
  const shoulders = updateLocalBody();

  const headPosition = getHeadWorldPosition();

  const leftShoulderWorld = new THREE.Vector3(
    headPosition.x - 0.3,
    headPosition.y - 0.42,
    headPosition.z
  );

  const rightShoulderWorld = new THREE.Vector3(
    headPosition.x + 0.3,
    headPosition.y - 0.42,
    headPosition.z
  );

  for (let i = 0; i < 2; i++) {
    if (!controllerConnected[i]) continue;

    const position = getHandWorldPosition(i);
    const avatarPosition = localAvatar.root.position;

    const localPosition = position.clone().sub(avatarPosition);

    const shoulder = i === 0
      ? new THREE.Vector3(-0.32, 1.25, 0)
      : new THREE.Vector3(0.32, 1.25, 0);

    const arm = i === 0
      ? localAvatar.leftArm
      : localAvatar.rightArm;

    positionArm(arm, shoulder, localPosition);

    const curl = getControllerCurl(controllers.find(c =>
      (c.userData.handIndex ?? controllers.indexOf(c)) === i
    ) || controllers[i]);

    animateFingers(arm.hand, curl.index, curl.thumb);

    networkHandData[i] = {
      x: position.x,
      y: position.y,
      z: position.z,
      curl: curl.index
    };
  }
}

// ============================================
// PHYSICAL TOUCH VOTING
// ============================================

const lastVoteTime = [0, 0];
const voteCooldown = 900;

function checkBoardTouch() {
  if (currentPhase !== "voting") return;

  for (let i = 0; i < 2; i++) {
    if (!controllerConnected[i]) continue;

    const position = getHandWorldPosition(i);

    for (const board of voteBoards) {
      const center = board.group.position;

      const nearBoard =
        Math.abs(position.x - center.x) < 1.35 &&
        position.y > 0.45 &&
        position.y < 3.0 &&
        Math.abs(position.z - center.z) < 0.55;

      const now = performance.now();

      if (nearBoard && now - lastVoteTime[i] > voteCooldown) {
        lastVoteTime[i] = now;

        sendMessage({
          type: "vote",
          choice: board.choice
        });

        statusEl.textContent = `Voted for ${board.choice}`;
        break;
      }
    }
  }
}

// ============================================
// NETWORK MOVEMENT
// ============================================

function sendMovement() {
  if (!renderer.xr.isPresenting) return;

  const now = performance.now();

  if (now - lastNetworkSend < 50) return;
  lastNetworkSend = now;

  const head = getHeadWorldPosition();

  sendMessage({
    type: "move",
    x: head.x,
    y: head.y,
    z: head.z,
    leftHand: networkHandData[0],
    rightHand: networkHandData[1]
  });
}

// ============================================
// ENTER VR
// ============================================

enterButton.addEventListener("click", async () => {
  if (!navigator.xr) {
    statusEl.textContent =
      "WebXR unavailable. Open this game in Meta Quest Browser.";
    return;
  }

  if (renderer.xr.isPresenting) {
    statusEl.textContent = "Already in VR.";
    return;
  }

  enterButton.disabled = true;
  enterButton.textContent = "STARTING VR…";

  try {
    const session = await navigator.xr.requestSession(
      "immersive-vr",
      {
        optionalFeatures: ["local-floor", "bounded-floor"]
      }
    );

    await renderer.xr.setSession(session);

    statusEl.textContent = "VR connected";

    session.addEventListener("end", () => {
      enterButton.disabled = false;
      enterButton.textContent = "ENTER VR";
      statusEl.textContent = "VR session ended";

      previousHands[0] = null;
      previousHands[1] = null;
      verticalVelocity = 0;
    }, { once: true });

  } catch (error) {
    console.error("WebXR error:", error);

    statusEl.textContent =
      `VR error: ${error.name || "Unknown"} — ${error.message || ""}`;

    enterButton.disabled = false;
    enterButton.textContent = "ENTER VR";
  }
});

// ============================================
// ANIMATION LOOP
// ============================================

renderer.setAnimationLoop(() => {
  const now = performance.now();
  const delta = Math.min((now - lastFrameTime) / 1000, 0.04);
  lastFrameTime = now;

  grinner.rotation.y =
    Math.sin(now * 0.00025) * 0.12;

  if (renderer.xr.isPresenting) {
    updateMovement(delta);
    updateLocalHands();
    checkBoardTouch();
    sendMovement();
  }

  renderer.render(scene, camera);
});

// ============================================
// RESIZE
// ============================================

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
