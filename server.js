const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const path = require("path");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });
app.use(express.static(path.join(__dirname, "public")));
app.get("/health", (_req, res) => res.json({ ok: true, game: "The Grinner VR" }));

const MAX_PLAYERS = 12;
const rooms = new Map();
let nextRoom = 1;

function makeRoom() {
  const room = {
    id: `room-${nextRoom++}`,
    players: new Map(),
    mapVotes: {},
    modeVotes: {},
    phase: "map",
    map: null,
    mode: null
  };
  rooms.set(room.id, room);
  return room;
}
function findRoom() {
  for (const room of rooms.values()) if (room.players.size < MAX_PLAYERS) return room;
  return makeRoom();
}
function send(ws, data) {
  if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(data));
}
function broadcast(room, data) {
  for (const player of room.players.values()) send(player.ws, data);
}
function snapshot(room) {
  return {
    type: "state",
    roomId: room.id,
    count: room.players.size,
    maxPlayers: MAX_PLAYERS,
    phase: room.phase,
    map: room.map,
    mode: room.mode,
    mapVotes: room.mapVotes,
    modeVotes: room.modeVotes
  };
}
wss.on("connection", (ws) => {
  const room = findRoom();
  const id = Math.random().toString(36).slice(2, 10);
  room.players.set(id, { ws, color: "#b7e2a0", name: "Player" });
  ws._room = room;
  ws._id = id;
  send(ws, { type: "welcome", id, ...snapshot(room) });
  broadcast(room, snapshot(room));

  ws.on("message", (raw) => {
    let msg;
    try { msg = JSON.parse(raw.toString()); } catch { return; }
    const player = room.players.get(id);
    if (!player) return;

    if (msg.type === "vote" && typeof msg.choice === "string") {
      if (room.phase === "map" && ["forest", "caves", "facility"].includes(msg.choice)) {
        room.mapVotes[id] = msg.choice;
      } else if (room.phase === "mode" && ["classic", "infection", "impostor"].includes(msg.choice)) {
        room.modeVotes[id] = msg.choice;
      }
      broadcast(room, snapshot(room));
    }
    if (msg.type === "color" && /^#[0-9a-fA-F]{6}$/.test(msg.color || "")) {
      player.color = msg.color;
      broadcast(room, { type: "playerColor", id, color: player.color });
    }
    if (msg.type === "startMapVote" && msg.admin === true) {
      room.phase = "map"; room.mapVotes = {}; room.modeVotes = {}; room.map = null; room.mode = null;
      broadcast(room, snapshot(room));
    }
    if (msg.type === "advanceMode" && msg.admin === true) {
      room.map = mostVoted(room.mapVotes) || "forest";
      room.phase = "mode";
      broadcast(room, snapshot(room));
    }
    if (msg.type === "startRound" && msg.admin === true) {
      room.mode = mostVoted(room.modeVotes) || "classic";
      room.phase = "playing";
      broadcast(room, snapshot(room));
    }
  });
  ws.on("close", () => {
    room.players.delete(id);
    delete room.mapVotes[id];
    delete room.modeVotes[id];
    broadcast(room, snapshot(room));
    if (room.players.size === 0) rooms.delete(room.id);
  });
});
function mostVoted(votes) {
  const counts = {};
  for (const v of Object.values(votes)) counts[v] = (counts[v] || 0) + 1;
  return Object.keys(counts).sort((a,b) => counts[b] - counts[a])[0];
}
const port = process.env.PORT || 10000;
server.listen(port, "0.0.0.0", () => console.log(`The Grinner VR listening on ${port}`));
