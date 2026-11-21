import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

const loading = document.querySelector("#loading");
const statusEl = document.querySelector("#status");
const roomInfo = document.querySelector("#roomInfo");
const enterVR = document.querySelector("#enterVR");
const desktopMode = document.querySelector("#desktopMode");
const adminPanel = document.querySelector("#adminPanel");
const colorPicker = document.querySelector("#colorPicker");

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x9db8a0);
scene.fog = new THREE.Fog(0x9db8a0, 18, 42);
const camera = new THREE.PerspectiveCamera(72, innerWidth / innerHeight, 0.1, 100);
camera.position.set(0, 1.65, 5.8);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.7));
renderer.setSize(innerWidth, innerHeight);
renderer.xr.enabled = true;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

scene.add(new THREE.HemisphereLight(0xdceaff, 0x526043, 2.0));
const sun = new THREE.DirectionalLight(0xffe4b6, 2.2);
sun.position.set(-4, 9, 6); sun.castShadow = true; scene.add(sun);

const mat = (color, roughness=0.9) => new THREE.MeshStandardMaterial({ color, roughness });
const wood = mat(0x76513a), darkWood = mat(0x3b2b23), floorMat = mat(0x665b48), wallMat = mat(0x9b8a70);
const green = mat(0x3d6844), leaf = mat(0x527f48), stone = mat(0x66696b), metal = mat(0x34383c);
const room = new THREE.Group(); scene.add(room);

function box(parent, x,y,z,w,h,d, material, name="") {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w,h,d), material);
  mesh.position.set(x,y,z); mesh.castShadow=true; mesh.receiveShadow=true; mesh.name=name;
  parent.add(mesh); return mesh;
}
function cylinder(parent,x,y,z,r1,r2,h,material,segments=12) {
  const mesh=new THREE.Mesh(new THREE.CylinderGeometry(r1,r2,h,segments),material);
  mesh.position.set(x,y,z); mesh.castShadow=true; parent.add(mesh); return mesh;
}

// A proper enclosed, walk-in 3D lobby.
box(room,0,-0.18,0,18,0.35,18,floorMat,"floor");
box(room,0,5.2,-8.8,18,10.4,0.35,wallMat);
box(room,-8.8,5.2,0,0.35,10.4,18,wallMat);
box(room,8.8,5.2,0,0.35,10.4,18,wallMat);
box(room,0,10.4,0,18,0.35,18,darkWood);
for(let i=-7;i<=7;i+=2) box(room,i,10.1,-8.55,0.12,0.3,0.25,darkWood);
for(let i=-7;i<=7;i+=2) box(room,i,10.1,8.55,0.12,0.3,0.25,darkWood);

// Timber wall framing and warm lights.
for(const x of [-8.45,-4.5,0,4.5,8.45]) box(room,x,5.1,-8.55,0.22,10,0.25,darkWood);
for(const z of [-8.4,-4,0,4,8.4]) box(room,-8.55,5.1,z,0.25,10,0.22,darkWood);
for(const z of [-8.4,-4,0,4,8.4]) box(room,8.55,5.1,z,0.25,10,0.22,darkWood);
for(const x of [-5,0,5]){
  const lamp=new THREE.PointLight(0xffd39a,35,12); lamp.position.set(x,8,-1); scene.add(lamp);
  const bulb=new THREE.Mesh(new THREE.SphereGeometry(.16,12,10),mat(0xffd58a)); bulb.position.copy(lamp.position); room.add(bulb);
}

// Decorative tree trunks and rocks at the edges.
for(const [x,z] of [[-7,-6],[7,-6],[-7,6],[7,6]]){
  cylinder(room,x,2,z,.32,.48,4.2,wood);
  const crown=new THREE.Mesh(new THREE.IcosahedronGeometry(1.35,1),leaf);
  crown.position.set(x,4.6,z); crown.castShadow=true; room.add(crown);
  for(let j=0;j<3;j++) {
    const r=new THREE.Mesh(new THREE.DodecahedronGeometry(.45),stone);
    r.position.set(x+(j-1)*.55,.2,z+1.0); room.add(r);
  }
}

// Boards face into the room, mounted on the far wall.
const boardGroup = new THREE.Group(); room.add(boardGroup);
const rayTargets=[];
const mapData=[
  {id:"forest",title:"FOREST",color:0x426c43,sub:"Misty woods",symbol:"🌲"},
  {id:"caves",title:"CAVES",color:0x59616b,sub:"Dark tunnels",symbol:"⛰"},
  {id:"facility",title:"FACILITY",color:0x77705f,sub:"Abandoned lab",symbol:"▦"}
];
const modeData=[
  {id:"classic",title:"CLASSIC",color:0x476b86,sub:"One Grinner"},
  {id:"infection",title:"INFECTION",color:0x7d3333,sub:"Caught players join"},
  {id:"impostor",title:"IMPOSTOR",color:0x6a4a80,sub:"One hidden Grinner"}
];
const boardMeshes = new Map();
function makeBoard(data,index,kind){
  const x=(index-1)*4.7;
  const g=new THREE.Group(); g.position.set(x,3.55,-8.18); boardGroup.add(g);
  box(g,0,0,0,3.9,3.1,.32,darkWood);
  box(g,0,0,.19,3.55,2.76,.12,mat(data.color));
  // Raised header and a simple 3D scene thumbnail.
  box(g,0,.82,.28,3.35,.55,.12,wood);
  const titleGeo=new THREE.PlaneGeometry(2.8,.42);
  const titleTex=makeTextTexture(data.title, "#ffffff", "#4a3022", 64);
  const title=new THREE.Mesh(titleGeo,new THREE.MeshBasicMaterial({map:titleTex,transparent:true}));
  title.position.set(0,.82,.36); g.add(title);
  if(kind==="map"){
    if(data.id==="forest"){
      for(let j=0;j<3;j++){cylinder(g,-.9+j*.9,-.15,.36,.09,.16,.85,wood); const c=new THREE.Mesh(new THREE.ConeGeometry(.48,.95,7),green); c.position.set(-.9+j*.9,.55,.38);g.add(c);}
    } else if(data.id==="caves"){
      for(let j=0;j<4;j++){const rockMesh=new THREE.Mesh(new THREE.DodecahedronGeometry(.48),stone);rockMesh.position.set(-1.15+j*.75,-.05,.38);g.add(rockMesh);}
      box(g,0,-.9,.38,2.8,.16,.16,metal);
    } else {
      box(g,0,-.2,.38,2.4,1.05,.18,metal);
      for(let j=0;j<3;j++) box(g,-.8+j*.8,-.2,.51,.42,.5,.08,mat(0x9bafaa));
    }
  } else {
    const orb=new THREE.Mesh(new THREE.IcosahedronGeometry(.58,1),mat(data.color===0x7d3333?0xc44747:0xc5c5c5));
    orb.position.set(0,-.1,.46); g.add(orb);
  }
  const subTex=makeTextTexture(data.sub,"#fff","#222222",42);
  const sub=new THREE.Mesh(new THREE.PlaneGeometry(3.1,.36),new THREE.MeshBasicMaterial({map:subTex,transparent:true}));
  sub.position.set(0,-1.05,.36);g.add(sub);
  const glow=new THREE.Mesh(new THREE.BoxGeometry(3.55,2.75,.03),new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:0}));
  glow.position.z=.3;g.add(glow);
  g.userData={choice:data.id,kind,glow};
  boardMeshes.set(data.id,g);
  rayTargets.push(g);
  return g;
}
function makeTextTexture(text,fg,bg,size){
  const c=document.createElement("canvas");c.width=512;c.height=128;
  const ctx=c.getContext("2d");ctx.fillStyle=bg;ctx.fillRect(0,0,512,128);
  ctx.fillStyle=fg;ctx.font=`bold ${size}px Arial`;ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText(text,256,65);
  const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;return tex;
}
mapData.forEach((d,i)=>makeBoard(d,i,"map"));
const mapBoards=[...boardMeshes.values()];

function showModeBoards(){
  for(const m of mapBoards) m.visible=false;
  modeData.forEach((d,i)=>makeBoard(d,i,"mode"));
  statusEl.textContent="Touch a game-mode board to vote";
}
function showMapBoards(){
  for(const [id,g] of boardMeshes) { if(g.userData.kind==="mode")g.visible=false; }
  mapData.forEach(d=>{const g=boardMeshes.get(d.id);if(g)g.visible=true;});
  statusEl.textContent="Touch a map board to vote";
}

// Lobby computer on right-hand wall, physically part of room.
const computer=new THREE.Group(); computer.position.set(8.12,2.1,-1.2); computer.rotation.y=-Math.PI/2; room.add(computer);
box(computer,0,1.15,0,1.65,2.3,.28,darkWood);
box(computer,0,1.28,.18,1.38,1.55,.08,metal);
const screenTex=makeTextTexture("THE GRINNER\nCOLOUR  •  TURN  •  ROOM","#a9f0c4","#17231d",36);
const screen=new THREE.Mesh(new THREE.PlaneGeometry(1.2,.8),new THREE.MeshBasicMaterial({map:screenTex}));
screen.position.set(0,1.55,.24);computer.add(screen);
box(computer,0,.35,.22,1.2,.16,.35,wood);

// Mirror panel on opposite wall (simple reflective-looking panel).
const mirror=new THREE.Mesh(new THREE.PlaneGeometry(2.8,3.4),new THREE.MeshStandardMaterial({color:0x91b8bb,metalness:.8,roughness:.15}));
mirror.position.set(-8.55,3.0,0);mirror.rotation.y=Math.PI/2;room.add(mirror);
box(room,-8.36,3,0,.12,3.65,.22,darkWood);

// Player body: simple legless monkey-like avatar.
const player = new THREE.Group(); scene.add(player);
const body = new THREE.Mesh(new THREE.SphereGeometry(.34,16,12),mat(0xb7e2a0)); body.scale.set(1,1.15,.8);body.position.y=1.1;player.add(body);
const head = new THREE.Mesh(new THREE.SphereGeometry(.28,16,12),mat(0xb7e2a0));head.position.set(0,1.55,0);player.add(head);
const eyeMat=mat(0x171717);
for(const x of [-.11,.11]){const eye=new THREE.Mesh(new THREE.SphereGeometry(.035,8,8),eyeMat);eye.position.set(x,1.59,-.25);player.add(eye);}
const arms=[];
for(const side of [-1,1]){
  const arm=new THREE.Mesh(new THREE.CapsuleGeometry(.095,.48,4,8),mat(0xb7e2a0));
  arm.position.set(side*.48,1.0,-.02);arm.rotation.z=side*.45;player.add(arm);arms.push(arm);
  const hand=new THREE.Mesh(new THREE.SphereGeometry(.14,12,10),mat(0xb7e2a0));hand.position.set(side*.72,.75,-.05);player.add(hand);
}
player.position.set(0,0,4.2);

// Grinner display statue, deliberately non-graphic.
const grinner=new THREE.Group();grinner.position.set(0,0,-5.8);room.add(grinner);
const white=mat(0xe9e9e5), black=mat(0x101010), red=mat(0x9d2020);
const gb=new THREE.Mesh(new THREE.SphereGeometry(.48,18,14),white);gb.scale.set(.8,1.2,.6);gb.position.y=1.25;grinner.add(gb);
const ge=new THREE.Mesh(new THREE.SphereGeometry(.09,12,10),black);ge.position.set(-.16,1.38,-.27);grinner.add(ge);
const dot=new THREE.Mesh(new THREE.SphereGeometry(.035,8,8),red);dot.position.set(-.16,1.38,-.35);grinner.add(dot);
const wound=new THREE.Mesh(new THREE.SphereGeometry(.105,12,10),mat(0x6f3333));wound.position.set(.17,1.38,-.25);grinner.add(wound);
const smile=new THREE.Mesh(new THREE.TorusGeometry(.23,.045,8,24,Math.PI),black);smile.position.set(0,1.05,-.28);smile.rotation.z=Math.PI;grinner.add(smile);
for(let i=0;i<5;i++){const tooth=new THREE.Mesh(new THREE.ConeGeometry(.035,.09,5),mat(0xf8f1dc));tooth.position.set(-.16+i*.08,.98,-.32);tooth.rotation.z=Math.PI;grinner.add(tooth);}
for(const s of [-1,1]){const arm=new THREE.Mesh(new THREE.CapsuleGeometry(.12,.5,4,8),white);arm.position.set(s*.48,.8,0);arm.rotation.z=s*.55;grinner.add(arm);const hand=new THREE.Mesh(new THREE.SphereGeometry(.17,10,8),red);hand.position.set(s*.7,.52,-.02);grinner.add(hand);}

// Network: room and vote state.
let socket;
let playerId=null;
let currentPhase="map";
let voted=null;
function connect(){
  const proto=location.protocol==="https:"?"wss":"ws";
  socket=new WebSocket(`${proto}://${location.host}`);
  socket.onopen=()=>roomInfo.textContent="Connected • joining room...";
  socket.onmessage=(event)=>{
    const msg=JSON.parse(event.data);
    if(msg.type==="welcome"){playerId=msg.id;updateState(msg);}
    if(msg.type==="state")updateState(msg);
  };
  socket.onclose=()=>{roomInfo.textContent="Disconnected • refresh to reconnect";};
}
function updateState(s){
  roomInfo.textContent=`${s.roomId} • ${s.count}/${s.maxPlayers} players`;
  if(s.phase==="map"){currentPhase="map";if(!boardMeshes.get("forest")?.visible)showMapBoards();statusEl.textContent=`Vote for a map • ${Object.keys(s.mapVotes||{}).length} votes`;}
  if(s.phase==="mode"){currentPhase="mode";if(!boardMeshes.get("classic")?.visible)showModeBoards();statusEl.textContent=`Vote for a mode • ${Object.keys(s.modeVotes||{}).length} votes`;}
  if(s.phase==="playing"){currentPhase="playing";statusEl.textContent=`Starting ${s.mode||"classic"} on ${s.map||"forest"}`;}
  const votes=currentPhase==="map"?s.mapVotes:s.modeVotes;
  for(const [id,g] of boardMeshes){
    const selected=Object.values(votes||{}).includes(id);
    g.userData.glow.material.opacity=selected?.25:0;
  }
}
function vote(choice){
  if(socket?.readyState===WebSocket.OPEN)socket.send(JSON.stringify({type:"vote",choice}));
  statusEl.textContent=`Voted: ${choice.toUpperCase()}`;
}
connect();

// VR controllers: point at a physical board and squeeze trigger to vote.
const controllerRays=[];
for(let i=0;i<2;i++){
  const controller=renderer.xr.getController(i);
  controller.addEventListener("select",()=>castVote(controller));
  scene.add(controller);controllerRays.push(controller);
  const ray=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,0),new THREE.Vector3(0,0,-4)]),new THREE.LineBasicMaterial({color:0xffe7a0}));
  ray.scale.z=1;controller.add(ray);
}
const raycaster=new THREE.Raycaster();
function castVote(controller){
  raycaster.setFromXRController(controller);
  const hits=raycaster.intersectObjects(rayTargets,true);
  if(!hits.length)return;
  let obj=hits[0].object;
  while(obj && !obj.userData.choice)obj=obj.parent;
  if(obj?.userData.choice)vote(obj.userData.choice);
}

// Desktop fallback: click a board and use WASD + mouse.
let desktopEnabled=false, yaw=0, pitch=0, keys={};
desktopMode.addEventListener("click",()=>{desktopEnabled=true;statusEl.textContent="Desktop test: click a board to vote; WASD to move";});
renderer.domElement.addEventListener("click",(e)=>{
  if(!desktopEnabled || renderer.xr.isPresenting)return;
  const r=renderer.domElement.getBoundingClientRect();
  const mouse=new THREE.Vector2((e.clientX-r.left)/r.width*2-1,-((e.clientY-r.top)/r.height)*2+1);
  raycaster.setFromCamera(mouse,camera);
  const hits=raycaster.intersectObjects(rayTargets,true);
  if(hits.length){let obj=hits[0].object;while(obj&&!obj.userData.choice)obj=obj.parent;if(obj?.userData.choice)vote(obj.userData.choice);}
});
addEventListener("keydown",e=>{keys[e.key.toLowerCase()]=true;if(e.key.toLowerCase()==="y")adminPanel.classList.toggle("hidden");});
addEventListener("keyup",e=>keys[e.key.toLowerCase()]=false);
let dragging=false,lastX=0,lastY=0;
renderer.domElement.addEventListener("pointerdown",e=>{dragging=true;lastX=e.clientX;lastY=e.clientY;});
addEventListener("pointerup",()=>dragging=false);
addEventListener("pointermove",e=>{if(!dragging||!desktopEnabled||renderer.xr.isPresenting)return;yaw-=(e.clientX-lastX)*.004;pitch=Math.max(-1.2,Math.min(1.2,pitch-(e.clientY-lastY)*.003));lastX=e.clientX;lastY=e.clientY;});
function moveDesktop(dt){
  if(!desktopEnabled||renderer.xr.isPresenting)return;
  const dir=new THREE.Vector3();
  if(keys.w)dir.z-=1;if(keys.s)dir.z+=1;if(keys.a)dir.x-=1;if(keys.d)dir.x+=1;
  dir.normalize().applyAxisAngle(new THREE.Vector3(0,1,0),yaw);
  camera.position.addScaledVector(dir,dt*4);
  camera.position.x=THREE.MathUtils.clamp(camera.position.x,-7.7,7.7);
  camera.position.z=THREE.MathUtils.clamp(camera.position.z,-7.7,7.7);
  camera.rotation.set(pitch,yaw,0,"YXZ");
}
enterVR.addEventListener("click",async()=>{
  if(!navigator.xr){statusEl.textContent="WebXR not available in this browser. Use Meta Quest Browser.";return;}
  try{
    const supported=await navigator.xr.isSessionSupported("immersive-vr");
    if(!supported){statusEl.textContent="Immersive VR is not supported here.";return;}
    const session=await navigator.xr.requestSession("immersive-vr",{optionalFeatures:["local-floor","bounded-floor"]});
    await renderer.xr.setSession(session);
    statusEl.textContent="VR lobby active • point at a board and press trigger";
  }catch(err){statusEl.textContent=`VR could not start: ${err.message}`;}
});
document.querySelector("#advanceMode").onclick=()=>socket?.send(JSON.stringify({type:"advanceMode",admin:true}));
document.querySelector("#startRound").onclick=()=>socket?.send(JSON.stringify({type:"startRound",admin:true}));
document.querySelector("#resetVote").onclick=()=>socket?.send(JSON.stringify({type:"startMapVote",admin:true}));
document.querySelector("#adminToggle").onclick=()=>adminPanel.classList.toggle("hidden");
colorPicker.addEventListener("input",()=>{body.material.color.set(colorPicker.value);head.material.color.set(colorPicker.value);arms.forEach(a=>a.material.color.set(colorPicker.value));socket?.send(JSON.stringify({type:"color",color:colorPicker.value}));});
document.querySelector("#turnMode").addEventListener("change",e=>statusEl.textContent=`Turn mode: ${e.target.value}`);

showMapBoards();
loading.style.display="none";
const clock=new THREE.Clock();
renderer.setAnimationLoop(()=>{
  const dt=Math.min(clock.getDelta(),.05);
  moveDesktop(dt);
  // A small idle sway keeps the test avatar from looking completely frozen.
  if(!renderer.xr.isPresenting){player.position.y=Math.sin(performance.now()*.0015)*.015;}
  renderer.render(scene,camera);
});
addEventListener("resize",()=>{
  camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);
});
