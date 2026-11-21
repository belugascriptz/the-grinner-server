const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const crypto = require("crypto");
const path = require("path");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });
const PORT = process.env.PORT || 3000;
const MAX_PLAYERS = 12;
const rooms = new Map();

app.use(express.static(path.join(__dirname, "public")));
app.get("/", (_, res) => res.sendFile(path.join(__dirname, "public", "index.html")));
app.get("/health", (_, res) => res.json({ ok: true, rooms: rooms.size, maxPlayers: MAX_PLAYERS }));

function makeRoom() {
  const id = "lobby-" + crypto.randomBytes(3).toString("hex");
  const room = { id, players: new Map(), phase: "lobby", mapVotes: {}, modeVotes: {}, map: "forest", mode: "classic", round: 0, timer: null };
  rooms.set(id, room);
  return room;
}
function findRoom() {
  for (const room of rooms.values()) if (room.players.size < MAX_PLAYERS && room.phase === "lobby") return room;
  return makeRoom();
}
function send(ws, data) {
  if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(data));
}
function emit(room, data, exceptId = null) {
  for (const [id, p] of room.players) if (id !== exceptId) send(p.ws, data);
}
function snapshot(room) {
  return {
    type: "room_state", roomId: room.id, phase: room.phase, map: room.map, mode: room.mode, round: room.round,
    players: [...room.players.values()].map(p => ({ id:p.id, name:p.name, color:p.color, role:p.role, position:p.position, rotation:p.rotation })),
    mapVotes: room.mapVotes, modeVotes: room.modeVotes
  };
}
function counts(votes) {
  const result = {};
  for (const value of Object.values(votes)) result[value] = (result[value] || 0) + 1;
  return result;
}
function choose(votes, fallback) {
  const c = counts(votes);
  return Object.keys(c).sort((a,b) => c[b]-c[a])[0] || fallback;
}
function startMapVote(room) {
  if (room.phase !== "lobby") return;
  room.phase = "map_vote"; room.mapVotes = {}; room.modeVotes = {};
  emit(room, { type:"phase", phase:room.phase, seconds:15 });
  emit(room, snapshot(room));
  clearTimeout(room.timer);
  room.timer = setTimeout(() => {
    room.map = choose(room.mapVotes, "forest");
    room.phase = "mode_vote";
    emit(room, { type:"phase", phase:room.phase, seconds:15, map:room.map });
    emit(room, snapshot(room));
    room.timer = setTimeout(() => startRound(room), 15000);
  }, 15000);
}
function startRound(room) {
  if (room.players.size === 0) return;
  room.mode = choose(room.modeVotes, "classic");
  room.phase = "playing"; room.round++;
  const list = [...room.players.values()];
  list.forEach((p,i) => p.role = room.mode === "infection" ? (i === 0 ? "monster" : "monkey") : room.mode === "impostor" ? (i === 0 ? "impostor" : "monkey") : (i === 0 ? "grinner" : "monkey"));
  emit(room, { type:"round_start", map:room.map, mode:room.mode, round:room.round });
  emit(room, snapshot(room));
  clearTimeout(room.timer);
  room.timer = setTimeout(() => {
    room.phase = "lobby";
    for (const p of room.players.values()) p.role = "monkey";
    emit(room, { type:"phase", phase:"lobby" });
    emit(room, snapshot(room));
  }, 180000);
}
wss.on("connection", ws => {
  const room = findRoom();
  const id = crypto.randomUUID();
  const player = { id, ws, name:"Player", color:"#55cc88", role:"monkey", position:{x:0,y:1.4,z:0}, rotation:0 };
  room.players.set(id, player);
  send(ws, { type:"welcome", id, roomId:room.id, maxPlayers:MAX_PLAYERS });
  emit(room, snapshot(room));
  ws.on("message", raw => {
    let m; try { m = JSON.parse(raw.toString()); } catch { return; }
    if (!m || typeof m.type !== "string") return;
    if (m.type === "set_profile") {
      if (typeof m.color === "string" && /^#[0-9a-fA-F]{6}$/.test(m.color)) player.color = m.color;
      if (typeof m.name === "string") player.name = m.name.slice(0,16);
      emit(room, snapshot(room));
    }
    if (m.type === "vote_map" && room.phase === "map_vote" && ["forest","caves","facility"].includes(m.value)) {
      room.mapVotes[id] = m.value; emit(room, {type:"votes", mapVotes:counts(room.mapVotes), modeVotes:counts(room.modeVotes)});
      if (Object.keys(room.mapVotes).length >= room.players.size) {
        clearTimeout(room.timer); room.map = choose(room.mapVotes,"forest"); room.phase="mode_vote";
        emit(room,{type:"phase",phase:"mode_vote",seconds:15,map:room.map});
        room.timer=setTimeout(()=>startRound(room),15000);
      }
    }
    if (m.type === "vote_mode" && room.phase === "mode_vote" && ["classic","infection","impostor"].includes(m.value)) {
      room.modeVotes[id] = m.value; emit(room, {type:"votes", mapVotes:counts(room.mapVotes), modeVotes:counts(room.modeVotes)});
      if (Object.keys(room.modeVotes).length >= room.players.size) { clearTimeout(room.timer); startRound(room); }
    }
    if (m.type === "player_state") {
      const p=m.position;
      if (p && [p.x,p.y,p.z].every(Number.isFinite) && Number.isFinite(m.rotation)) {
        player.position={x:Math.max(-100,Math.min(100,p.x)),y:Math.max(0,Math.min(20,p.y)),z:Math.max(-100,Math.min(100,p.z))};
        player.rotation=m.rotation;
        emit(room,{type:"player_update",id,position:player.position,rotation:player.rotation},id);
      }
    }
    if (m.type === "tag_player" && (player.role==="monster" || player.role==="grinner" || player.role==="impostor")) {
      const target=room.players.get(m.targetId);
      if (target && target.role==="monkey") {
        if (room.mode==="infection") target.role="monster";
        else target.role="caught";
        emit(room,{type:"tagged",targetId:target.id,role:target.role});
        emit(room,snapshot(room));
      }
    }
    if (m.type === "admin_action") {
      // Temporary public test menu. Replace with server-side owner authentication before public release.
      if (m.action === "start_vote") startMapVote(room);
      if (m.action === "return_lobby") { room.phase="lobby"; for(const p of room.players.values()) p.role="monkey"; emit(room,{type:"phase",phase:"lobby"}); emit(room,snapshot(room)); }
    }
  });
  ws.on("close", () => {
    room.players.delete(id);
    emit(room,{type:"player_left",id});
    if (room.players.size===0) { clearTimeout(room.timer); rooms.delete(room.id); }
  });
});
server.listen(PORT,"0.0.0.0",()=>console.log(`The Grinner VR listening on ${PORT}`));
