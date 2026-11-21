import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { VRButton } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/webxr/VRButton.js";

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x77715d);
scene.fog = new THREE.Fog(0x77715d, 18, 55);

const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.1, 100);
camera.position.set(0, 1.6, 5);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.xr.enabled = true;
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);

const vrButton = VRButton.createButton(renderer);
vrButton.classList.add("vr-button");
vrButton.textContent = "ENTER VR";
document.body.appendChild(vrButton);

scene.add(new THREE.HemisphereLight(0xd9d2b9, 0x29251e, 2.2));
const sun = new THREE.DirectionalLight(0xffffff, 1.6);
sun.position.set(4, 9, 5);
scene.add(sun);

const mat = (color, roughness = 0.9) => new THREE.MeshStandardMaterial({ color, roughness });
const floor = new THREE.Mesh(new THREE.PlaneGeometry(24, 24), mat(0x625d43));
floor.rotation.x = -Math.PI / 2;
floor.position.y = 0;
scene.add(floor);

const wallMat = mat(0xb8ae72);
const darkWood = mat(0x4a3828);
const trim = mat(0x2e261e);
function box(w,h,d,material,x,y,z) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w,h,d), material);
  m.position.set(x,y,z); scene.add(m); return m;
}
// Enclosed physical lobby
box(20,4.5,.35,wallMat,0,2.25,-10);
box(.35,4.5,20,wallMat,-10,2.25,0);
box(.35,4.5,20,wallMat,10,2.25,0);
box(20,.35,20,trim,0,4.5,0);
box(20,.25,.45,darkWood,0,4.2,-9.75);
box(.45,.25,20,darkWood,-9.75,4.2,0);
box(.45,.25,20,darkWood,9.75,4.2,0);

// Wooden beams and simple room details
for (const x of [-8,-4,0,4,8]) box(.16,4.1,.18,darkWood,x,2,-9.72);
for (const z of [-8,-4,0,4,8]) {
  box(.18,4.1,.16,darkWood,-9.72,2,z);
  box(.18,4.1,.16,darkWood,9.72,2,z);
}

// Map voting boards mounted on the back wall
const voteMeshes = [];
const voteChoices = ["forest","caves","facility"];
const voteNames = ["FOREST","CAVES","FACILITY"];
const boardColors = [0x476b3a,0x665b50,0x59636a];
function makeTextTexture(lines, bg = "#25231e", fg = "#f5edda") {
  const canvas = document.createElement("canvas");
  canvas.width = 512; canvas.height = 256;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = bg; ctx.fillRect(0,0,512,256);
  ctx.strokeStyle = "#b9a77b"; ctx.lineWidth = 10; ctx.strokeRect(7,7,498,242);
  ctx.fillStyle = fg; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  lines.forEach((line,i) => {
    ctx.font = i === 0 ? "bold 42px Arial" : "bold 27px Arial";
    ctx.fillText(line,256, i === 0 ? 90 : 165);
  });
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
const boardGroups = [];
voteChoices.forEach((choice,i) => {
  const group = new THREE.Group();
  group.position.set((i-1)*5,1.85,-9.55);
  const frame = new THREE.Mesh(new THREE.BoxGeometry(3.25,2.15,.22),darkWood);
  group.add(frame);
  const panel = new THREE.Mesh(
    new THREE.PlaneGeometry(3.0,1.9),
    new THREE.MeshBasicMaterial({ map: makeTextTexture([voteNames[i],"TOUCH TO VOTE"]) })
  );
  panel.position.z = .125;
  group.add(panel);
  const marker = new THREE.Mesh(new THREE.BoxGeometry(2.8,.08,.04),mat(boardColors[i]));
  marker.position.set(0,-.93,.15); group.add(marker);
  group.userData.choice = choice;
  group.userData.kind = "map";
  scene.add(group);
  boardGroups.push(group);
  voteMeshes.push(panel);
});

// Wall screen: hype counter plus truthful room occupancy
const screen = new THREE.Group();
screen.position.set(-9.48,2.35,-1.2);
screen.rotation.y = Math.PI/2;
const screenFrame = new THREE.Mesh(new THREE.BoxGeometry(2.8,1.65,.18),darkWood);
screen.add(screenFrame);
const screenPanel = new THREE.Mesh(
  new THREE.PlaneGeometry(2.58,1.42),
  new THREE.MeshBasicMaterial({ map: makeTextTexture(["HYPE COUNT: 48","ROOM: 0 / 12"], "#101719", "#bdf2c2") })
);
screenPanel.position.z = .105;
screen.add(screenPanel);
scene.add(screen);
function updateScreen(count) {
  screenPanel.material.map.dispose();
  screenPanel.material.map = makeTextTexture([`HYPE COUNT: ${count*4}`,`ROOM: ${count} / 12`], "#101719", "#bdf2c2");
  screenPanel.material.map.needsUpdate = true;
}

// Physical settings computer on the right wall
const computer = new THREE.Group();
computer.position.set(8.7,1.25,-2.2);
computer.rotation.y = -Math.PI/2;
const desk = new THREE.Mesh(new THREE.BoxGeometry(1.8,.18,.9),darkWood);
desk.position.y = -.55; computer.add(desk);
const monitor = new THREE.Mesh(new THREE.BoxGeometry(1.2,.85,.12),trim);
monitor.position.set(0,.15,0); computer.add(monitor);
const monitorFace = new THREE.Mesh(
  new THREE.PlaneGeometry(1.05,.68),
  new THREE.MeshBasicMaterial({ map: makeTextTexture(["SETTINGS","COLOUR • TURN"], "#17221e", "#d8e8cf") })
);
monitorFace.position.set(0,.15,.067); computer.add(monitorFace);
scene.add(computer);

// Grinner display statue, simple non-graphic blockout
const grinner = new THREE.Group();
const white = mat(0xf1eee8), black = mat(0x120e0e), red = mat(0x7e1118);
const torso = new THREE.Mesh(new THREE.CapsuleGeometry(.42,.9,4,8),white);
torso.position.y = 1.25; grinner.add(torso);
const head = new THREE.Mesh(new THREE.SphereGeometry(.48,16,12),white);
head.position.y = 2.15; grinner.add(head);
const eye = new THREE.Mesh(new THREE.SphereGeometry(.09,12,8),black);
eye.position.set(-.18,2.25,.42); grinner.add(eye);
const dot = new THREE.Mesh(new THREE.SphereGeometry(.025,8,6),red);
dot.position.set(-.18,2.25,.505); grinner.add(dot);
const wound = new THREE.Mesh(new THREE.SphereGeometry(.12,12,8),red);
wound.position.set(.2,2.22,.42); grinner.add(wound);
const smile = new THREE.Mesh(new THREE.BoxGeometry(.48,.07,.06),black);
smile.position.set(.02,1.98,.45); grinner.add(smile);
for(let i=0;i<5;i++){
  const tooth = new THREE.Mesh(new THREE.ConeGeometry(.035,.09,4),white);
  tooth.position.set(-.17+i*.085,1.94,.49);
  tooth.rotation.z = Math.PI; grinner.add(tooth);
}
grinner.position.set(0,0,-6.6);
scene.add(grinner);

// Network uses the same plain WebSocket protocol as server.js (no Socket.IO).
const connectionEl = document.getElementById("connection");
const wsScheme = location.protocol === "https:" ? "wss" : "ws";
const socket = new WebSocket(`${wsScheme}://${location.host}`);
let myId = null;
let playerCount = 0;
const remotes = new Map();
const remoteMaterial = new THREE.MeshStandardMaterial({ color: 0x9dbb8b });
function send(data) {
  if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(data));
}
function makeAvatar(color) {
  const g = new THREE.Group();
  const material = new THREE.MeshStandardMaterial({ color: color || 0x9dbb8b });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(.24,.55,3,7),material);
  body.position.y = 1.05; g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(.2,12,10),material);
  head.position.y = 1.58; g.add(head);
  const armGeo = new THREE.CapsuleGeometry(.09,.48,3,6);
  for (const side of [-1,1]) {
    const arm = new THREE.Mesh(armGeo,material);
    arm.position.set(side*.32,1.12,0);
    arm.rotation.z = side*.35;
    g.add(arm);
  }
  return g;
}
socket.addEventListener("open",()=>{connectionEl.textContent="Connected";});
socket.addEventListener("close",()=>{connectionEl.textContent="Disconnected — refresh to reconnect";});
socket.addEventListener("error",()=>{connectionEl.textContent="Connection error";});
socket.addEventListener("message",event=>{
  let data;
  try { data = JSON.parse(event.data); } catch { return; }
  if (data.type === "welcome") myId = data.id;
  if (data.type === "state") {
    playerCount = data.count || 0;
    updateScreen(playerCount);
    connectionEl.textContent = `Room ${data.roomId} • ${playerCount}/12`;
    const live = new Set();
    for (const p of (data.players || [])) {
      if (p.id === myId) continue;
      live.add(p.id);
      if (!remotes.has(p.id)) {
        const avatar = makeAvatar(p.color);
        scene.add(avatar);
        remotes.set(p.id,avatar);
      }
      const avatar = remotes.get(p.id);
      avatar.position.set(p.x,p.y,p.z);
      avatar.rotation.y = Math.PI;
    }
    for (const [id,avatar] of remotes) {
      if (!live.has(id)) { scene.remove(avatar); remotes.delete(id); }
    }
    boardGroups.forEach(group=>{
      const choice = group.userData.choice;
      const votes = Object.values(data.mapVotes || {}).filter(v=>v===choice).length;
      group.scale.y = 1 + Math.min(votes*.04,.16);
    });
  }
});

// Ray-based board interaction for VR controllers and desktop clicks.
const raycaster = new THREE.Raycaster();
const tempMatrix = new THREE.Matrix4();
function selectBoard(origin,direction) {
  raycaster.ray.origin.copy(origin);
  raycaster.ray.direction.copy(direction).normalize();
  const hits = raycaster.intersectObjects(voteMeshes,false);
  if (!hits.length) return;
  const panel = hits[0].object;
  const group = boardGroups.find(g=>g.children.includes(panel));
  if (group) send({type:"vote",choice:group.userData.choice});
}
const controllers = [renderer.xr.getController(0),renderer.xr.getController(1)];
controllers.forEach(controller=>{
  scene.add(controller);
  controller.addEventListener("select",()=>{
    tempMatrix.identity().extractRotation(controller.matrixWorld);
    const origin = new THREE.Vector3().setFromMatrixPosition(controller.matrixWorld);
    const direction = new THREE.Vector3(0,0,-1).applyMatrix4(tempMatrix);
    selectBoard(origin,direction);
  });
});
addEventListener("click",event=>{
  if (renderer.xr.isPresenting) return;
  const pointer = new THREE.Vector2(
    (event.clientX/innerWidth)*2-1,
    -(event.clientY/innerHeight)*2+1
  );
  raycaster.setFromCamera(pointer,camera);
  selectBoard(raycaster.ray.origin,raycaster.ray.direction);
});

// Simple desktop movement for checking the room before using a headset.
const keys = new Set();
addEventListener("keydown",e=>keys.add(e.key.toLowerCase()));
addEventListener("keyup",e=>keys.delete(e.key.toLowerCase()));
function desktopMove(dt) {
  if (renderer.xr.isPresenting) return;
  const speed = 3.2*dt;
  const forward = new THREE.Vector3(0,0,-1).applyQuaternion(camera.quaternion);
  forward.y = 0; forward.normalize();
  const right = new THREE.Vector3(1,0,0).applyQuaternion(camera.quaternion);
  right.y = 0; right.normalize();
  if (keys.has("w")) camera.position.addScaledVector(forward,speed);
  if (keys.has("s")) camera.position.addScaledVector(forward,-speed);
  if (keys.has("a")) camera.position.addScaledVector(right,-speed);
  if (keys.has("d")) camera.position.addScaledVector(right,speed);
  camera.position.x = THREE.MathUtils.clamp(camera.position.x,-9,9);
  camera.position.z = THREE.MathUtils.clamp(camera.position.z,-9,9);
  camera.position.y = 1.6;
}
let lastTime = performance.now();
let lastSent = 0;
renderer.setAnimationLoop(()=>{
  const now = performance.now();
  const dt = Math.min((now-lastTime)/1000,.05);
  lastTime = now;
  desktopMove(dt);
  if (socket.readyState === WebSocket.OPEN && now-lastSent > 100) {
    const pos = renderer.xr.isPresenting ? renderer.xr.getCamera(camera).position : camera.position;
    send({type:"move",x:pos.x,y:pos.y,z:pos.z});
    lastSent = now;
  }
  renderer.render(scene,camera);
});

addEventListener("resize",()=>{
  camera.aspect = innerWidth/innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth,innerHeight);
});
