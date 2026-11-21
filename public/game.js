import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { VRButton } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/webxr/VRButton.js";

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x77715d);
scene.fog = new THREE.Fog(0x77715d, 12, 45);
const camera = new THREE.PerspectiveCamera(70, innerWidth/innerHeight, .1, 100);
camera.position.set(0, 1.6, 5);
const renderer = new THREE.WebGLRenderer({antialias:true});
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.xr.enabled = true;
document.body.appendChild(renderer.domElement);
document.body.appendChild(VRButton.createButton(renderer));

scene.add(new THREE.HemisphereLight(0xd9d2b9, 0x29251e, 2));
const light = new THREE.DirectionalLight(0xffffff, 1.5); light.position.set(3,8,4); scene.add(light);
const floor = new THREE.Mesh(new THREE.PlaneGeometry(50,50), new THREE.MeshStandardMaterial({color:0x77704d}));
floor.rotation.x = -Math.PI/2; scene.add(floor);
const wallMat = new THREE.MeshStandardMaterial({color:0xb8ae72});
function wall(x,y,z,w,h,d){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),wallMat);m.position.set(x,y,z);scene.add(m);return m}
wall(0,2,-10,20,4,.5); wall(-10,2,0,.5,4,20); wall(10,2,0,.5,4,20);
wall(-4,2,-5,.4,4,6); wall(4,2,-7,.4,4,5);

// Placeholder Grinner model blockout.
const grinner = new THREE.Group(), white = new THREE.MeshStandardMaterial({color:0xf1eee8});
const dark = new THREE.MeshStandardMaterial({color:0x120e0e}), red = new THREE.MeshStandardMaterial({color:0x7e1118});
const body = new THREE.Mesh(new THREE.CapsuleGeometry(.42,.9,4,8),white); body.position.y=1.25; grinner.add(body);
const head = new THREE.Mesh(new THREE.SphereGeometry(.48,16,12),white); head.position.y=2.15; grinner.add(head);
const eye = new THREE.Mesh(new THREE.SphereGeometry(.09,12,8),dark); eye.position.set(-.18,2.25,.42); grinner.add(eye);
const dot = new THREE.Mesh(new THREE.SphereGeometry(.025,8,6),red); dot.position.set(-.18,2.25,.505); grinner.add(dot);
const wound = new THREE.Mesh(new THREE.SphereGeometry(.12,12,8),red); wound.position.set(.2,2.22,.42); grinner.add(wound);
const smile = new THREE.Mesh(new THREE.BoxGeometry(.48,.07,.06),dark); smile.position.set(.02,1.98,.45); grinner.add(smile);
for(let i=0;i<5;i++){const tooth=new THREE.Mesh(new THREE.ConeGeometry(.035,.09,4),white);tooth.position.set(-.17+i*.085,1.94,.49);tooth.rotation.z=Math.PI;grinner.add(tooth)}
grinner.position.set(0,0,-7); scene.add(grinner);

const socket = window.io(), remote = new Map();
let dummies = [], latestPlayers = [], myId = null, isMonster = false;
const status = document.getElementById("status"), playersEl = document.getElementById("players");
const roundEl = document.getElementById("round"), hitOverlay = document.getElementById("hitOverlay");
const maps = ["Yellow Hall","Abandoned School","Red Tunnels"]; let mapIndex = 0;
function avatar(color=0x343434){
 const g=new THREE.Group(), mat=new THREE.MeshStandardMaterial({color});
 const torso=new THREE.Mesh(new THREE.CapsuleGeometry(.25,.55,3,7),mat);torso.position.y=1.05;g.add(torso);
 const h=new THREE.Mesh(new THREE.SphereGeometry(.2,10,8),mat);h.position.y=1.55;g.add(h);return g;
}
function nearestTarget(){
 const mine=latestPlayers.find(p=>p.id===myId); if(!mine)return null;
 let best=null,dist=Infinity;
 for(const p of latestPlayers){if(p.id===myId)continue;const d=Math.hypot(p.x-mine.x,p.y-mine.y,p.z-mine.z);if(d<dist){dist=d;best=p}}
 return best && dist<=4.5 ? best : null;
}
function impactMark(pos){
 // Stylized dark-red scuff decal, not a wound or injury.
 const decal=new THREE.Mesh(new THREE.CircleGeometry(.28,16),new THREE.MeshBasicMaterial({color:0x64131b,transparent:true,opacity:.78,depthWrite:false}));
 decal.position.set(pos.x,Math.max(.2,pos.y),pos.z); decal.lookAt(pos.x,Math.max(.2,pos.y),pos.z-1);
 scene.add(decal); setTimeout(()=>{scene.remove(decal);decal.geometry.dispose();decal.material.dispose()},7000);
}
socket.on("connect",()=>{myId=socket.id;status.textContent="Connected to server"});
socket.on("disconnect",()=>status.textContent="Disconnected");
socket.on("room-full",()=>status.textContent="Server full");
socket.on("state",s=>{
 latestPlayers=s.players; playersEl.textContent=`Players: ${s.players.length} / ${s.slots}`;
 roundEl.textContent=`Round ${s.round} — ${s.currentMap}`;
 const me=s.players.find(p=>p.id===myId); isMonster=!!(me&&me.monster);
 document.getElementById("monsterPanel").hidden=!isMonster;
 status.textContent=isMonster?"YOU ARE THE GRINNER":"Survive. The Grinner is hunting.";
 for(const p of s.players){
   if(p.id===myId)continue;
   if(!remote.has(p.id)){const a=avatar(p.monster?0x991d1d:0x303030);scene.add(a);remote.set(p.id,a)}
   remote.get(p.id).position.set(p.x,p.y-1,p.z);
 }
 for(const [id,a] of remote){if(!s.players.some(p=>p.id===id)){scene.remove(a);remote.delete(id)}}
});
socket.on("dummies",list=>{dummies.forEach(d=>scene.remove(d));dummies=[];list.forEach(p=>{const a=avatar(0x777777);a.position.set(p.x,0,p.z);scene.add(a);dummies.push(a)})});
socket.on("round-start",r=>status.textContent=`Round ${r.round} started!`);
socket.on("monster-hit",hit=>{
 hitOverlay.classList.remove("flash"); void hitOverlay.offsetWidth; hitOverlay.classList.add("flash");
 if(hit.action==="throw"){camera.position.x+=(camera.position.x-hit.from.x)*.7;camera.position.z+=(camera.position.z-hit.from.z)*.7;impactMark(hit.impact)}
 if(hit.action==="punch"){camera.position.x+=(camera.position.x-hit.from.x)*.35;camera.position.z+=(camera.position.z-hit.from.z)*.35}
 if(hit.action==="grab"){status.textContent="The Grinner grabbed you!";setTimeout(()=>status.textContent="Get away!",900)}
 if(hit.action==="glitch"){status.textContent="GLITCHED — respawning…";camera.position.set(0,1.6,5);setTimeout(()=>status.textContent="Keep moving!",1200)}
});
socket.on("monster-action-effect",e=>{if(e.action==="throw"||e.action==="punch"){const p=latestPlayers.find(x=>x.id===e.targetId);if(p)impactMark({x:p.x,y:1.8,z:p.z})}});
document.getElementById("vote").onclick=()=>{mapIndex=(mapIndex+1)%maps.length;socket.emit("vote-map",maps[mapIndex]);document.getElementById("vote").textContent="Vote: "+maps[mapIndex]};
document.getElementById("start").onclick=()=>socket.emit("start-round");
document.getElementById("owner").onclick=()=>{const p=document.getElementById("ownerPanel");p.hidden=!p.hidden};
document.getElementById("spawn").onclick=()=>socket.emit("owner-spawn-dummies",{key:document.getElementById("ownerKey").value,count:document.getElementById("dummyCount").value});
document.querySelectorAll("[data-action]").forEach(btn=>btn.addEventListener("click",()=>{
 const target=nearestTarget(); if(!target){status.textContent="No player close enough";return}
 socket.emit("monster-action",{action:btn.dataset.action,targetId:target.id});
}));

// Experimental controller-push movement. Full Gorilla Tag locomotion/physics is not implemented yet.
const controllers=[renderer.xr.getController(0),renderer.xr.getController(1)];
controllers.forEach(c=>{scene.add(c);c.addEventListener("selectstart",()=>{if(!isMonster)return;const target=nearestTarget();if(target)socket.emit("monster-action",{action:"punch",targetId:target.id})})});
controllers.forEach(c=>{c.addEventListener("squeezestart",()=>{if(!isMonster)return;const target=nearestTarget();if(target)socket.emit("monster-action",{action:"throw",targetId:target.id})})});
renderer.setAnimationLoop(()=>{
 if(renderer.xr.isPresenting){
   controllers.forEach(c=>{const p=new THREE.Vector3();c.getWorldPosition(p);if(c.userData.last){const delta=p.clone().sub(c.userData.last);if(delta.length()<.25)camera.position.sub(delta.multiplyScalar(.8))}c.userData.last=p});
   const pos=camera.position;socket.emit("move",{x:pos.x,y:pos.y,z:pos.z});
 }
 renderer.render(scene,camera);
});
addEventListener("resize",()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight)});
