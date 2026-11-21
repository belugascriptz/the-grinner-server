
const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const path = require("path");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.static(path.join(__dirname, "public")));

app.get("/health", (_req, res) => {
  res.json({ ok: true, game: "The Grinner VR" });
});

const MAX_PLAYERS = 12;
const rooms = new Map();
let nextRoom = 1;

function makeRoom() {
  const room = {
    id: `room-${nextRoom++}`,
    players: new Map(),
    mapVotes: {},
    phase: "map",
    map: "forest"
  };

  rooms.set(room.id, room);
  return room;
}

function findRoom() {
  for (const room of rooms.values()) {
    if (room.players.size < MAX_PLAYERS) return room;
  }

  return makeRoom();
}

function send(ws, message) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

function snapshot(room) {
  return {
    type: "state",
    roomId: room.id,
    players: [...room.players.values()].map(player => ({
      id: player.id,
      x: player.x,
      y: player.y,
      z: player.z,
      color: player.color,
      monster: player.monster
    })),
    count: room.players.size,
    maxPlayers: MAX_PLAYERS,
    slots: MAX_PLAYERS,
    phase: room.phase,
    map: room.map,
    currentMap: room.map,
    round: room.round || 0,
    mapVotes: room.mapVotes
  };
}

function broadcast(room) {
  const state = snapshot(room);

  for (const player of room.players.values()) {
    send(player.ws, state);
  }
}

wss.on("connection", ws => {
  const room = findRoom();
  const id = Math.random().toString(36).slice(2, 10);

  const player = {
    id,
    ws,
    x: 0,
    y: 0,
    z: 4,
    color: "#b7e2a0",
    monster: false
  };

  room.players.set(id, player);
  ws._room = room;
  ws._id = id;

  send(ws, {
    type: "welcome",
    id,
    roomId: room.id
  });

  broadcast(room);

  ws.on("message", raw => {
    let message;

    try {
      message = JSON.parse(raw.toString());
    } catch {
      return;
    }

    // Accept both {type, data:{...}} and {type, ...}.
    const data = message.data || message;

    if (message.type === "move") {
      const x = Number(data.x);
      const y = Number(data.y);
      const z = Number(data.z);

      if ([x, y, z].every(Number.isFinite)) {
        player.x = Math.max(-9, Math.min(9, x));
        player.y = Math.max(0, Math.min(4, y));
        player.z = Math.max(-9, Math.min(9, z));

        broadcast(room);
      }
    }

    if (message.type === "vote" || message.type === "vote-map") {
      const choice = data.choice || data.map;

      const allowed = [
        "forest",
        "caves",
        "facility",
        "Yellow Hall",
        "Abandoned School",
        "Red Tunnels"
      ];

      if (allowed.includes(choice)) {
        room.mapVotes[id] = choice;
        broadcast(room);
      }
    }

    if (message.type === "color") {
      if (/^#[0-9a-fA-F]{6}$/.test(data.color || "")) {
        player.color = data.color;
        broadcast(room);
      }
    }

    // Round controls are disabled until secure owner authentication
    // is added. Never trust an admin flag sent by a browser.
  });

  ws.on("close", () => {
    room.players.delete(id);
    delete room.mapVotes[id];

    broadcast(room);

    if (room.players.size === 0) {
      rooms.delete(room.id);
    }
  });

  ws.on("error", error => {
    console.error("WebSocket error:", error.message);
  });
});

const port = process.env.PORT || 10000;

server.listen(port, "0.0.0.0", () => {
  console.log(`The Grinner VR listening on ${port}`);
});
