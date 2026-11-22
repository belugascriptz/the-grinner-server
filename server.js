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
let roomNumber = 1;

function createRoom() {
  const room = { id: `room-${roomNumber++}`, players: new Map(), votes: {}, map: "Yellow Hall" };
  rooms.set(room.id, room);
  return room;
}
function getRoom() {
  for (const room of rooms.values()) if (room.players.size < MAX_PLAYERS) return room;
  return createRoom();
}
function send(ws, data) {
  if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(data));
}
function broadcast(room) {
  const state = {
    type: "state",
    roomId: room.id,
    count: room.players.size,
    slots: MAX_PLAYERS,
    map: room.map,
    votes: room.votes,
    players: [...room.players.values()].map(p => ({
      id: p.id, x: p.x, y: p.y, z: p.z, color: p.color
    }))
  };
  for (const p of room.players.values()) send(p.ws, state);
}
wss.on("connection", ws => {
  const room = getRoom();
  const id = Math.random().toString(36).slice(2, 10);
  const player = { id, ws, x: 0, y: 0, z: 2, color: "#a9d6a0" };
  room.players.set(id, player);
  send(ws, { type: "welcome", id, roomId: room.id });
  broadcast(room);

  ws.on("message", raw => {
    let msg;
    try { msg = JSON.parse(raw.toString()); } catch { return; }
    if (msg.type === "move") {
      const x = Number(msg.x), y = Number(msg.y), z = Number(msg.z);
      if ([x,y,z].every(Number.isFinite)) {
        player.x = Math.max(-8, Math.min(8, x));
        player.y = Math.max(0, Math.min(3, y));
        player.z = Math.max(-8, Math.min(8, z));
        broadcast(room);
      }
    } else if (msg.type === "vote") {
      const allowed = ["Yellow Hall", "Abandoned School", "Red Tunnels"];
      if (allowed.includes(msg.choice)) {
        room.votes[id] = msg.choice;
        const tally = {};
        Object.values(room.votes).forEach(v => tally[v] = (tally[v] || 0) + 1);
        room.map = Object.keys(tally).sort((a,b) => tally[b] - tally[a])[0] || room.map;
        broadcast(room);
      }
    } else if (msg.type === "color" && /^#[0-9a-fA-F]{6}$/.test(msg.color || "")) {
      player.color = msg.color;
      broadcast(room);
    }
  });
  ws.on("close", () => {
    room.players.delete(id);
    delete room.votes[id];
    broadcast(room);
    if (!room.players.size) rooms.delete(room.id);
  });
  ws.on("error", err => console.error("WebSocket:", err.message));
});
const port = process.env.PORT || 10000;
server.listen(port, "0.0.0.0", () => console.log(`The Grinner VR listening on ${port}`));
