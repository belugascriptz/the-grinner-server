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
  const room = { id: `room-${nextRoom++}`, players: new Map(), votes: {}, map: "Yellow Hall" };
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
function state(room) {
  return {
    type: "state",
    roomId: room.id,
    players: [...room.players.values()].map(p => ({
      id: p.id, x: p.x, y: p.y, z: p.z, color: p.color
    })),
    count: room.players.size,
    slots: MAX_PLAYERS,
    currentMap: room.map,
    votes: room.votes
  };
}
function broadcast(room) {
  const data = state(room);
  for (const p of room.players.values()) send(p.ws, data);
}

wss.on("connection", ws => {
  const room = findRoom();
  const id = Math.random().toString(36).slice(2, 10);
  const player = { id, ws, x: 0, y: 0, z: 3, color: "#b7e2a0" };
  room.players.set(id, player);
  ws._room = room;
  ws._id = id;
  send(ws, { type: "welcome", id, roomId: room.id });
  broadcast(room);

  ws.on("message", raw => {
    let msg;
    try { msg = JSON.parse(raw.toString()); } catch { return; }

    if (msg.type === "move") {
      const x = Number(msg.x), y = Number(msg.y), z = Number(msg.z);
      if ([x, y, z].every(Number.isFinite)) {
        player.x = Math.max(-9, Math.min(9, x));
        player.y = Math.max(0, Math.min(4, y));
        player.z = Math.max(-9, Math.min(9, z));
        broadcast(room);
      }
    } else if (msg.type === "vote") {
      const choices = ["Yellow Hall", "Abandoned School", "Red Tunnels"];
      if (choices.includes(msg.choice)) {
        room.votes[id] = msg.choice;
        const counts = {};
        Object.values(room.votes).forEach(v => counts[v] = (counts[v] || 0) + 1);
        room.map = Object.keys(counts).sort((a, b) => counts[b] - counts[a])[0] || room.map;
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
    if (room.players.size === 0) rooms.delete(room.id);
  });
  ws.on("error", err => console.error("WebSocket error:", err.message));
});

const port = process.env.PORT || 10000;
server.listen(port, "0.0.0.0", () => console.log(`The Grinner VR listening on ${port}`));
