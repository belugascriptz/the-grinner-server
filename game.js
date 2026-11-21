import * as THREE from "three";
import { VRButton } from "three/addons/webxr/VRButton.js";

const $ = id => document.getElementById(id);
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x9bb5a1);
scene.fog = new THREE.Fog(0x9bb5a1, 18, 65);
const camera = new THREE.PerspectiveCamera(70, innerWidth/innerHeight, .05, 150);
camera.position.set(0,1.65,5);
const renderer = new THREE.WebGLRenderer({antialias:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));
renderer.setSize(innerWidth,innerHeight);
renderer.xr.enabled = true;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);
const hemi = new THREE.HemisphereLight(0xe6fff0,0x394238,2.1); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffffff,2.2); sun.position.set(-5,10,6); sun.castShadow=true; scene.add(sun);

const mat = (color, roughness=.85) => new THREE.MeshStandardMaterial({color,roughness});
const floorMat=mat(0x526c55), wallMat=mat(0x667b67), darkMat=mat(0x172019), whiteMat=mat(0xf2f2ee), redMat=mat(0xb51f2a), blackMat=mat(0x090909);
const floor = new THREE.Mesh(new THREE.PlaneGeometry(80,80),floorMat); floor.rotation.x=-Math.PI/2; floor.receiveShadow=true; scene.add(floor);
function box(w,h,d,m,x,y,z){const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;scene.add(o);return o;}
function sphere(r,m,x,y,z){const o=new THREE.Mesh(new THREE.SphereGeometry(r,18,14),m);o.position.set(x,y,z);o.castShadow=true;scene.add(o);return o;}
const trees=[];
function makeMap(name){
  for(const o of [...trees]){scene.remove(o); } trees.length=0;
  // Clear old map props but keep players, lobby computer, mirror.
  if(name==="forest"){
    for(let i=0;i<24;i++){let x=(Math.random()-.5)*34,z=(Math.random()-.5)*34;if(Math.abs(x)<4&&Math.abs(z)<4)continue;
      trees.push(box(.55,4,.55,wallMat,x,2,z),sphere(1.6,mat(0x34543b),x,4.4,z));}
  } else if(name==="caves"){
    for(let i=0;i<18;i++){let x=(Math.random()-.5)*30,z=(Math.random()-.5)*30;trees.push(box(1.5,3,1.5,mat(0x4b514d),x,1.5,z),sphere(1.3,mat(0x333b37),x,3.2,z));}
    scene.background.set(0x28322f);scene.fog.color.set(0x28322f);
  } else {
    for(let i=0;i<12;i++){let x=(Math.random()-.5)*28,z=(Math.random()-.5)*28;trees.push(box(3,2.5,.35,wallMat,x,1.25,z),box(.35,2.5,3,wallMat,x+1.5,1.25,z+1.5));}
    scene.background.set(0x87958b);scene.fog.color.set(0x87958b);
  }
}
makeMap("forest");

// Lobby structures, computer and mirror.
box(4,2.4,.18,wallMat,0,1.2,-5);
const computer= new THREE.Group(); computer.position.set(0,0,-3.1); scene.add(computer);
const desk=new THREE.Mesh(new THREE.BoxGeometry(1.5,.12,.65),darkMat);desk.position.y=1;computer.add(desk);
const screenMat=new THREE.MeshStandardMaterial({color:0x173c31,emissive:0x0c2b21,emissiveIntensity:.8});
const screen=new THREE.Mesh(new THREE.BoxGeometry(1.15,.72,.07),screenMat);screen.position.set(0,1.55,-.22);computer.add(screen);
const screenText=new THREE.Mesh(new THREE.PlaneGeometry(1.05,.62),new THREE.MeshBasicMaterial({color:0x6cffb0}));screenText.position.set(0,1.55,-.18);computer.add(screenText);
for(const x of [-.6,.6]){const leg=box(.08,1,.08,darkMat,x,.5,-3.1);computer.add(leg);leg.position.set(x,.5,0);}
const mirrorFrame=new THREE.Mesh(new THREE.BoxGeometry(2.2,3,.12,darkMat));mirrorFrame.position.set(3,1.5,-4);scene.add(mirrorFrame);
const mirrorGlass=new THREE.Mesh(new PlaneGeometry(1.95,2.75),new THREE.MeshBasicMaterial({color:0x9cb8b1,opacity:.72,transparent:true}));mirrorGlass.position.set(3,1.5,-3.92);scene.add(mirrorGlass);
const mirrorLabel = new THREE.Mesh(new PlaneGeometry(1.4,.12),new THREE.MeshBasicMaterial({color:0xffffff}));mirrorLabel.position.set(3,3.1,-3.9);scene.add(mirrorLabel);

// Avatar builder: simple legless monkey body, head, long arms and hands.
const remotePlayers=new Map();
function makeAvatar(color, isGrinner=false){
  const g=new THREE.Group(), c=new THREE.Color(color);
  const body=new THREE.Mesh(new THREE.SphereGeometry(.34,20,16),mat(isGrinner?0xf4f4f0:c));body.scale.set(.9,1.1,.75);body.position.y=.85;g.add(body);
  const head=new THREE.Mesh(new THREE.SphereGeometry(.27,20,16),mat(isGrinner?0xf5f5f2:c));head.position.set(0,1.35,0);g.add(head);
  const arms=[];
  for(const side of [-1,1]){
    const arm=new THREE.Mesh(new THREE.CapsuleGeometry(.095,.55,4,8),mat(isGrinner?0xf3f3ef:c));arm.position.set(side*.42,.85,0);arm.rotation.z=side*.55;g.add(arm);arms.push(arm);
    const hand=new THREE.Mesh(new THREE.SphereGeometry(.13,12,10),mat(isGrinner?0x8d2025:c));hand.position.set(side*.68,.55,-.03);g.add(hand);
  }
  if(isGrinner){
    spherePart(g,.055,blackMat,-.105,1.39,-.235);
    spherePart(g,.025,redMat,-.105,1.39,-.29);
    spherePart(g,.085,redMat,.12,1.38,-.23);
    const mouth=new THREE.Mesh(new THREE.BoxGeometry(.32,.09,.04),blackMat);mouth.position.set(0,1.18,-.245);g.add(mouth);
    for(let i=0;i<5;i++){const tooth=new THREE.Mesh(new THREE.ConeGeometry(.025,.07,4),whiteMat);tooth.position.set(-.12+i*.06,1.15,-.28);tooth.rotation.x=Math.PI;g.add(tooth);}
  }
  g.userData.arms=arms;return g;
}
function spherePart(g,r,m,x,y,z){const o=new THREE.Mesh(new THREE.SphereGeometry(r,12,10),m);o.position.set(x,y,z);g.add(o);}
const localAvatar=makeAvatar("#55cc88");scene.add(localAvatar);
let myId=null,myRole="monkey",myColor="#55cc88",roomId="",phase="lobby",mode="classic",mapName="forest";
const wsProto=location.protocol==="https:"?"wss":"ws";
let socket;
function connect(){
  socket=new WebSocket(`${wsProto}://${location.host}`);
  socket.onopen=()=>{$("status").textContent="Connected";};
  socket.onmessage=e=>{let m;try{m=JSON.parse(e.data)}catch{return} handleMessage(m);};
  socket.onclose=()=>{$("status").textContent="Disconnected — refreshing connection soon";setTimeout(connect,2500);};
}
function send(o){if(socket&&socket.readyState===WebSocket.OPEN)socket.send(JSON.stringify(o));}
function handleMessage(m){
  if(m.type==="welcome"){myId=m.id;roomId=m.roomId;$("room").textContent="Room "+roomId;send({type:"set_profile",color:myColor});}
  if(m.type==="room_state"){
    phase=m.phase;mapName=m.map;mode=m.mode;$("phase").textContent=phase.toUpperCase().replace("_"," ");
    if(m.players){const seen=new Set();for(const p of m.players){if(p.id===myId){myRole=p.role;continue;}seen.add(p.id);let a=remotePlayers.get(p.id);if(!a){a=makeAvatar(p.color,p.role==="grinner"||p.role==="monster");scene.add(a);remotePlayers.set(p.id,a);}a.position.set(p.position?.x||0,p.position?.y||0,p.position?.z||0);a.rotation.y=p.rotation||0;}for(const [id,a] of remotePlayers)if(!seen.has(id)){scene.remove(a);remotePlayers.delete(id);}}
  }
  if(m.type==="player_update"){const a=remotePlayers.get(m.id);if(a){a.position.set(m.position.x,m.position.y,m.position.z);a.rotation.y=m.rotation;}}
  if(m.type==="player_left"){const a=remotePlayers.get(m.id);if(a){scene.remove(a);remotePlayers.delete(m.id);}}
  if(m.type==="phase"){phase=m.phase;$("phase").textContent=phase.toUpperCase().replace("_"," ");showVote(phase);}
  if(m.type==="round_start"){mapName=m.map;mode=m.mode;makeMap(mapName);}
  if(m.type==="votes"){}
  if(m.type==="tagged"){}
}
connect();

// Menus and settings.
function setColor(v){myColor=v;scene.remove(localAvatar);const replacement=makeAvatar(v);localAvatar.clear();replacement.children.forEach(c=>localAvatar.add(c));send({type:"set_profile",color:v});}
$("colour").oninput=e=>{$("colour2").value=e.target.value;setColor(e.target.value);};
$("colour2").oninput=e=>{$("colour").value=e.target.value;setColor(e.target.value);};
let turning="smooth";
$("turning").onchange=e=>{$("turning2").value=e.target.value;turning=e.target.value;};
$("turning2").onchange=e=>{$("turning").value=e.target.value;turning=e.target.value;};
$("enter").onclick=()=>{$("menu").classList.add("hidden");$("status").textContent="In lobby";};
$("vr").onclick=async()=>{if(!navigator.xr){$("status").textContent="WebXR unavailable in this browser";return;}try{const s=await navigator.xr.requestSession("immersive-vr",{optionalFeatures:["local-floor","bounded-floor","hand-tracking"]});renderer.xr.setSession(s);$("menu").classList.add("hidden");}catch(e){$("status").textContent="VR start failed: "+e.message;}};
$("changeLobby").onclick=()=>{location.reload();};
$("closeComputer").onclick=()=>$("computer").classList.add("hidden");
$("startVote").onclick=()=>send({type:"admin_action",action:"start_vote"});
$("returnLobby").onclick=()=>send({type:"admin_action",action:"return_lobby"});
function showVote(p){
  const panel=$("vote"),choices=$("voteChoices");
  if(p!=="map_vote"&&p!=="mode_vote"){panel.classList.add("hidden");return;}
  panel.classList.remove("hidden");choices.innerHTML="";
  const maps=[["forest","Forest"],["caves","Caves"],["facility","Facility"]];
  const modes=[["classic","Classic"],["infection","Infection"],["impostor","Impostor"]];
  $("voteTitle").textContent=p==="map_vote"?"VOTE FOR MAP":"VOTE FOR MODE";
  (p==="map_vote"?maps:modes).forEach(([v,label])=>{const b=document.createElement("button");b.textContent=label;b.onclick=()=>{send({type:p==="map_vote"?"vote_map":"vote_mode",value:v});b.disabled=true;b.textContent=label+" — VOTED";};choices.appendChild(b);});
}
function toggleAdmin(){$("admin").classList.toggle("hidden");}
function nearComputer(){const p=renderer.xr.isPresenting?renderer.xr.getCamera(camera).position:camera.position;return Math.hypot(p.x,p.z+3.1)<2.2;}
window.addEventListener("keydown",e=>{if(e.key.toLowerCase()==="y")toggleAdmin();if(e.key.toLowerCase()==="e"&&nearComputer())$("computer").classList.toggle("hidden");if(e.key==="Escape"){$("admin").classList.add("hidden");$("computer").classList.add("hidden");}});
renderer.xr.addEventListener("sessionstart",()=>{const session=renderer.xr.getSession();session.addEventListener("inputsourceschange",()=>{});});
const controller0=renderer.xr.getController(0),controller1=renderer.xr.getController(1);scene.add(controller0,controller1);
let lastControllerPos=[new THREE.Vector3(),new THREE.Vector3()],lastSend=0,velocity=new THREE.Vector3(),yaw=0;
const clock=new THREE.Clock();
function updateVRMovement(dt){
  if(renderer.xr.isPresenting){
    const controllers=[controller0,controller1];
    let impulse=0;
    controllers.forEach((c,i)=>{if(c.visible){const pos=new THREE.Vector3();c.getWorldPosition(pos);const delta=pos.distanceTo(lastControllerPos[i]);if(lastControllerPos[i].lengthSq()>0)impulse+=Math.max(0,delta-.018)*1.9;lastControllerPos[i].copy(pos);}});
    if(impulse>0){const forward=new THREE.Vector3(0,0,-1).applyQuaternion(camera.quaternion);forward.y=0;forward.normalize();velocity.addScaledVector(forward,impulse*2.2);}
    velocity.y-=9.8*dt;localAvatar.position.addScaledVector(velocity,dt);
    if(localAvatar.position.y<0){localAvatar.position.y=0;velocity.y=0;velocity.multiplyScalar(.88);}
    // Keep head/camera at avatar's approximate height; arm-swing only, no legs.
    const head=renderer.xr.getCamera(camera);localAvatar.position.x=head.position.x;localAvatar.position.z=head.position.z;localAvatar.position.y=Math.max(0,head.position.y-1.5);
    if(turning==="smooth"){const gp=controller1.gamepad;if(gp&&gp.axes.length>2&&Math.abs(gp.axes[2])>.25) yaw-=gp.axes[2]*dt*1.8;}
    if(turning==="snap"){const gp=controller1.gamepad;if(gp&&gp.axes.length>2&&Math.abs(gp.axes[2])>.8){yaw-=Math.sign(gp.axes[2])*.45;}}
    if(turning!=="none")camera.rotation.y=yaw;
  }else{
    const speed=3*dt;const dir=new THREE.Vector3();if(keys.w)dir.z-=1;if(keys.s)dir.z+=1;if(keys.a)dir.x-=1;if(keys.d)dir.x+=1;dir.applyAxisAngle(new THREE.Vector3(0,1,0),camera.rotation.y);camera.position.addScaledVector(dir,speed);localAvatar.position.set(camera.position.x,camera.position.y-1.5,camera.position.z);
  }
  if(performance.now()-lastSend>80){const p=localAvatar.position;send({type:"player_state",position:{x:p.x,y:p.y,z:p.z},rotation:yaw});lastSend=performance.now();}
}
const keys={};window.addEventListener("keydown",e=>keys[e.key.toLowerCase()]=true);window.addEventListener("keyup",e=>keys[e.key.toLowerCase()]=false);
function animate(){const dt=Math.min(clock.getDelta(),.05);updateVRMovement(dt);if(nearComputer()&&phase==="lobby"&&renderer.xr.isPresenting){/* trigger interaction handled by controller button below */}renderer.render(scene,camera);}
renderer.setAnimationLoop(animate);
controller0.addEventListener("select",()=>{if(nearComputer())$("computer").classList.toggle("hidden");});
controller1.addEventListener("select",()=>{if(nearComputer())$("computer").classList.toggle("hidden");});
window.addEventListener("resize",()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
