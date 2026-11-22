import * as THREE from "three";

const $ = id => document.getElementById(id);
const status = $("status"), roomCount = $("roomCount"), mapLabel = $("mapLabel"), errorBox = $("error");
function reportError(err) {
  errorBox.style.display = "block";
  errorBox.textContent = "GAME ERROR: " + (err?.message || String(err));
  status.textContent = "Game startup error";
}

let scene, camera, renderer, lobbyGroup;
try {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x24221e);
  scene.fog = new THREE.Fog(0x24221e, 22, 58);
  camera = new THREE.PerspectiveCamera(72, innerWidth / innerHeight, 0.08, 120);
  camera.position.set(0, 1.65, 5.5);

  renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
  renderer.setSize(innerWidth, innerHeight);
  renderer.xr.enabled = true;
  renderer.xr.setReferenceSpaceType("local-floor");
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  document.body.appendChild(renderer.domElement);

  scene.add(new THREE.HemisphereLight(0xded8c5, 0x393329, 2.0));
  const keyLight = new THREE.DirectionalLight(0xffe9c7, 2.0);
  keyLight.position.set(-4, 9, 5); scene.add(keyLight);
  const fill = new THREE.PointLight(0xd6b65c, 22, 18);
  fill.position.set(0, 3.5, -5); scene.add(fill);

  lobbyGroup = new THREE.Group(); scene.add(lobbyGroup);
  const mat = (color, roughness=0.9, metalness=0) => new THREE.MeshStandardMaterial({color, roughness, metalness});
  const floorMat = mat(0x4a463b), wallMat = mat(0x77715d), trimMat = mat(0x292722), goldMat = mat(0xc5a84c), screenMat = new THREE.MeshStandardMaterial({color:0x183638, emissive:0x102e2e, emissiveIntensity:1.2});
  function box(parent, x,y,z,w,h,d, material) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w,h,d), material);
    m.position.set(x,y,z); parent.add(m); return m;
  }
  // Large enclosed room with ceiling beams, baseboards and lit wall panels.
  box(lobbyGroup,0,-0.16,0,22,.3,22,floorMat);
  box(lobbyGroup,0,5.2,0,22,.25,22,trimMat);
  box(lobbyGroup,0,2.5,-11,22,5,.35,wallMat);
  box(lobbyGroup,-11,2.5,0,.35,5,22,wallMat);
  box(lobbyGroup,11,2.5,0,.35,5,22,wallMat);
  box(lobbyGroup,0,2.5,11,22,5,.35,wallMat);
  for (let x=-8; x<=8; x+=4) {
    box(lobbyGroup,x,4.85,0,.16,.18,21,trimMat);
  }
  for (let z=-8; z<=8; z+=4) {
    box(lobbyGroup,0,4.85,z,21,.18,.16,trimMat);
  }
  // Warm ceiling fixtures.
  for (const x of [-6,0,6]) {
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(2.4,.08,.65), new THREE.MeshBasicMaterial({color:0xffe4a0}));
    lamp.position.set(x,4.72,-1); lobbyGroup.add(lamp);
    const light = new THREE.PointLight(0xffd98b, 13, 11); light.position.set(x,4.1,-1); lobbyGroup.add(light);
  }

  // Three physical map vote stations, with large colored panels and plinths.
  const mapChoices = ["Yellow Hall","Abandoned School","Red Tunnels"];
  const mapColors = [0xd2b64e,0x6d829b,0x8b3d3d];
  const voteTargets = [];
  mapChoices.forEach((name,i) => {
    const x = (i-1)*4.4, z = -8.6;
    box(lobbyGroup,x,.48,z,2.7,.9,1.25,trimMat);
    box(lobbyGroup,x,1.78,z-.48,2.55,1.75,.18,mat(mapColors[i],.72));
    box(lobbyGroup,x,2.72,z-.48,2.75,.12,.28,goldMat);
    const plate = new THREE.Mesh(new THREE.BoxGeometry(2.42,1.62,.12), new THREE.MeshBasicMaterial({color:mapColors[i],transparent:true,opacity:.10}));
    plate.position.set(x,1.78,z-.36); plate.userData.mapChoice=name; plate.userData.isVoteBoard=true;
    lobbyGroup.add(plate); voteTargets.push(plate);
    // Simple floating label plaque above each board.
    box(lobbyGroup,x,2.92,z-.35,2.2,.36,.08,trimMat);
  });

  // Physical settings computer in the right side of the room.
  box(lobbyGroup,7.6,.65,-1.8,2.4,1.3,1.3,trimMat);
  box(lobbyGroup,7.6,1.72,-2.22,2.0,1.25,.16,mat(0x3d3a32));
  const computerScreen = box(lobbyGroup,7.6,1.72,-2.32,1.75,.94,.05,screenMat);
  box(lobbyGroup,7.6,1.05,-2.22,1.2,.12,.5,mat(0xaaa18a));
  // Mirror panel on left wall.
  box(lobbyGroup,-10.77,2.1,-2.2,.08,2.9,4.1,trimMat);
  box(lobbyGroup,-10.70,2.1,-2.2,.035,2.65,3.85,mat(0x45616a,.18,.5));

  // Display pedestal and simplified Grinner statue, visible from the lobby entrance.
  box(lobbyGroup,0,.38,-4.5,2.3,.75,2.0,trimMat);
  const grinner = new THREE.Group();
  const pale = mat(0xece9df), dark = mat(0x11100f), red = mat(0x761a20);
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(.42,.75,4,10),pale); body.position.y=1.18; grinner.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(.48,20,16),pale); head.position.y=2.08; grinner.add(head);
  const blackEye = new THREE.Mesh(new THREE.SphereGeometry(.095,14,10),dark); blackEye.position.set(-.18,2.16,.43); grinner.add(blackEye);
  const redDot = new THREE.Mesh(new THREE.SphereGeometry(.03,10,8),red); redDot.position.set(-.18,2.16,.52); grinner.add(redDot);
  const otherEye = new THREE.Mesh(new THREE.SphereGeometry(.12,14,10),red); otherEye.position.set(.2,2.15,.43); grinner.add(otherEye);
  const smile = new THREE.Mesh(new THREE.BoxGeometry(.48,.075,.06),dark); smile.position.set(.02,1.91,.45); grinner.add(smile);
  for(let i=0;i<5;i++){const tooth=new THREE.Mesh(new THREE.ConeGeometry(.035,.09,4),pale);tooth.position.set(-.16+i*.08,1.88,.49);tooth.rotation.z=Math.PI;grinner.add(tooth);}
  grinner.position.set(0,.75,-4.5); lobbyGroup.add(grinner);

  // Simple player avatar shapes for other connected players.
  status.textContent = "3D lobby loaded";
} catch (err) {
  reportError(err);
  throw err;
}

// Multiplayer WebSocket matches the server's ws protocol.
let socket, myId = null;
const remoteAvatars = new Map();
try {
  const protocol = location.protocol === "https:" ? "wss:" : "ws:";
  socket = new WebSocket(`${protocol}//${location.host}`);
  socket.addEventListener("open", () => status.textContent = "Connected — welcome to the lobby");
  socket.addEventListener("message", event => {
    let data; try { data = JSON.parse(event.data); } catch { return; }
    if (data.type === "welcome") myId = data.id;
    if (data.type === "state") {
      roomCount.textContent = `ROOM: ${data.count} / ${data.slots}`;
      mapLabel.textContent = `MAP: ${(data.map || "Yellow Hall").toUpperCase()}`;
      const seen = new Set();
      for (const p of data.players || []) {
        if (p.id === myId) continue;
        seen.add(p.id);
        if (!remoteAvatars.has(p.id)) {
          const avatar = new THREE.Group();
          const color = new THREE.MeshStandardMaterial({color:p.color || "#a9d6a0"});
          const torso = new THREE.Mesh(new THREE.CapsuleGeometry(.27,.55,3,8),color);
          torso.position.y=1.05; avatar.add(torso);
          const head = new THREE.Mesh(new THREE.SphereGeometry(.22,12,10),color);
          head.position.y=1.65; avatar.add(head);
          scene.add(avatar); remoteAvatars.set(p.id,avatar);
        }
        const a = remoteAvatars.get(p.id);
        a.position.set(p.x,0,p.z);
        a.children.forEach(m => m.material.color.set(p.color || "#a9d6a0"));
      }
      for (const [id,a] of remoteAvatars) if (!seen.has(id)) { scene.remove(a); remoteAvatars.delete(id); }
    }
  });
  socket.addEventListener("close", () => status.textContent = "Offline mode — lobby still works");
  socket.addEventListener("error", () => status.textContent = "Server connection issue — lobby still works");
} catch(e) { status.textContent = "Offline mode — lobby still works"; }

function vote(choice) {
  if (socket && socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify({type:"vote",choice}));
  mapLabel.textContent = "YOUR VOTE: " + choice.toUpperCase();
}
$("vote").addEventListener("click", () => {
  const choice = mapChoices[voteIndex++ % mapChoices.length];
  vote(choice);
});
let voteIndex=0;

// Desktop movement and looking for quick scene verification without a headset.
const keys = new Set();
window.addEventListener("keydown", e => keys.add(e.key.toLowerCase()));
window.addEventListener("keyup", e => keys.delete(e.key.toLowerCase()));
let yaw=0, pitch=0, dragging=false, lastX=0, lastY=0;
renderer.domElement.addEventListener("pointerdown", e => {dragging=true;lastX=e.clientX;lastY=e.clientY;});
window.addEventListener("pointerup",()=>dragging=false);
window.addEventListener("pointermove",e=>{
  if(!dragging || renderer.xr.isPresenting) return;
  yaw -= (e.clientX-lastX)*.003;
  pitch -= (e.clientY-lastY)*.003;
  pitch = THREE.MathUtils.clamp(pitch,-1.1,1.1);
  lastX=e.clientX;lastY=e.clientY;
});
function desktopMove(dt) {
  if(renderer.xr.isPresenting) return;
  const forward = new THREE.Vector3(-Math.sin(yaw),0,-Math.cos(yaw));
  const right = new THREE.Vector3(Math.cos(yaw),0,-Math.sin(yaw));
  const move = new THREE.Vector3();
  if(keys.has("w")) move.add(forward);
  if(keys.has("s")) move.sub(forward);
  if(keys.has("d")) move.add(right);
  if(keys.has("a")) move.sub(right);
  if(move.lengthSq()) {
    move.normalize().multiplyScalar(3.4*dt);
    camera.position.add(move);
  }
  camera.position.x=THREE.MathUtils.clamp(camera.position.x,-9.5,9.5);
  camera.position.z=THREE.MathUtils.clamp(camera.position.z,-9.5,9.5);
  camera.rotation.set(pitch,yaw,0,"YXZ");
}

// VR controller ray pointers select map boards by trigger.
const controllers = [renderer.xr.getController(0), renderer.xr.getController(1)];
const controllerRays = [];
controllers.forEach(controller => {
  scene.add(controller);
  const rayLine = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,0),new THREE.Vector3(0,0,-7)]),
    new THREE.LineBasicMaterial({color:0xffffff})
  );
  controller.add(rayLine); controllerRays.push(rayLine);
  controller.addEventListener("selectstart", () => {
    const origin = new THREE.Vector3(); controller.getWorldPosition(origin);
    const direction = new THREE.Vector3(0,0,-1).applyQuaternion(controller.quaternion);
    const raycaster = new THREE.Raycaster(origin,direction,0,10);
    const hits = raycaster.intersectObjects(voteTargets,false);
    if(hits.length && hits[0].object.userData.mapChoice) vote(hits[0].object.userData.mapChoice);
  });
});

// Prevent duplicate XR requests and reuse/recognize an existing session.
let requestingVR = false;
const vrButton = $("enterVR");
vrButton.addEventListener("click", async () => {
  if (requestingVR || renderer.xr.isPresenting) return;
  requestingVR = true;
  vrButton.disabled = true;
  try {
    if (!navigator.xr) throw new Error("WebXR is unavailable. Open this page in Meta Quest Browser.");
    const already = renderer.xr.getSession();
    if (already) {
      if (!renderer.xr.isPresenting) await renderer.xr.setSession(already);
    } else {
      const supported = await navigator.xr.isSessionSupported("immersive-vr");
      if (!supported) throw new Error("This browser does not support immersive VR.");
      const session = await navigator.xr.requestSession("immersive-vr", {
        optionalFeatures: ["local-floor", "bounded-floor"]
      });
      await renderer.xr.setSession(session);
    }
    document.body.classList.add("in-vr");
    status.textContent = "VR connected";
  } catch (err) {
    reportError(err);
  } finally {
    requestingVR = false;
    vrButton.disabled = renderer.xr.isPresenting;
  }
});
renderer.xr.addEventListener("sessionend", () => {
  document.body.classList.remove("in-vr");
  vrButton.disabled = false;
  status.textContent = "VR session ended";
});

// Approximate arm-push locomotion: hand/controller movement pushes the body oppositely.
const handLast = [null,null];
const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), .05);
  if (renderer.xr.isPresenting) {
    for (let i=0;i<controllers.length;i++) {
      const handPos = new THREE.Vector3();
      controllers[i].getWorldPosition(handPos);
      if(handLast[i]) {
        const delta = handPos.clone().sub(handLast[i]);
        if(delta.length() < .35) {
          const push = delta.clone().multiplyScalar(-1.6);
          camera.position.add(push);
        }
      }
      handLast[i] = handPos.clone();
    }
    camera.position.x = THREE.MathUtils.clamp(camera.position.x,-9.5,9.5);
    camera.position.z = THREE.MathUtils.clamp(camera.position.z,-9.5,9.5);
    if(socket && socket.readyState===WebSocket.OPEN) {
      const p = renderer.xr.getCamera(camera).position;
      socket.send(JSON.stringify({type:"move",x:camera.position.x,y:camera.position.y,z:camera.position.z}));
    }
  } else {
    desktopMove(dt);
  }
  renderer.render(scene,camera);
});

window.addEventListener("resize",()=>{
  camera.aspect=innerWidth/innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth,innerHeight);
});
