
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
let roomNumber = 1;

function createRoom() {
  const room = {
    id: `room-${roomNumber++}`,
    players: new Map(),
    votes: {},
    map: "Yellow Hall",
    roundActive: false
  };

  rooms.set(room.id, room);
  return room;
}

function getRoom() {
  for (const room of rooms.values()) {
    if (room.players.size < MAX_PLAYERS) return room;
  }

  return createRoom();
}

function send(ws, data) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(data));
  }
}

function cleanPosition(value, min, max, fallback = 0) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, number));
}

function cleanHand(hand) {
  if (!hand || typeof hand !== "object") return null;

  return {
    x: cleanPosition(hand.x, -10, 10),
    y: cleanPosition(hand.y, 0, 5),
    z: cleanPosition(hand.z, -10, 10)
  };
}

function broadcast(room) {
  const state = {
    type: "state",
    roomId: room.id,
    count: room.players.size,
    slots: MAX_PLAYERS,
    map: room.map,
    votes: room.votes,
    roundActive: room.roundActive,
    players: [...room.players.values()].map(player => ({
      id: player.id,
      x: player.x,
      y: player.y,
      z: player.z,
      color: player.color,
      role: player.role,
      name: player.name,
      leftHand: player.leftHand,
      rightHand: player.rightHand
    }))
  };

  for (const player of room.players.values()) {
    send(player.ws, state);
  }
}

function endRound(room) {
  room.roundActive = false;

  for (const player of room.players.values()) {
    player.role = "player";
  }

  broadcast(room);
}

function startRound(room) {
  if (room.players.size < 2) return;

  const players = [...room.players.values()];

  for (const player of players) {
    player.role = "player";
  }

  const monster = players[
    Math.floor(Math.random() * players.length)
  ];

  monster.role = "monster";
  room.roundActive = true;

  broadcast(room);
}

wss.on("connection", ws => {
  const room = getRoom();
  const id = Math.random().toString(36).slice(2, 10);

  const player = {
    id,
    ws,
    x: 0,
    y: 0,
    z: 2,
    color: "#a9d6a0",
    role: "player",
    name: "Player",
    leftHand: null,
    rightHand: null
  };

  room.players.set(id, player);

  send(ws, {
    type: "welcome",
    id,
    roomId: room.id
  });

  broadcast(room);

  ws.on("message", raw => {
    let msg;

    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return;
    }

    if (!msg || typeof msg.type !== "string") return;

    if (msg.type === "move") {
      player.x = cleanPosition(msg.x, -8, 8, player.x);
      player.y = cleanPosition(msg.y, 0, 3, player.y);
      player.z = cleanPosition(msg.z, -8, 8, player.z);

      player.leftHand = cleanHand(msg.leftHand);
      player.rightHand = cleanHand(msg.rightHand);

      broadcast(room);
    }

    else if (msg.type === "color") {
      if (/^#[0-9a-fA-F]{6}$/.test(msg.color || "")) {
        player.color = msg.color;
        broadcast(room);
      }
    }

    else if (msg.type === "name") {
      if (typeof msg.name === "string") {
        player.name = msg.name.slice(0, 18);
        broadcast(room);
      }
    }

    else if (msg.type === "vote") {
      const allowed = [
        "Yellow Hall",
        "Abandoned School",
        "Red Tunnels"
      ];

      if (allowed.includes(msg.choice)) {
        room.votes[id] = msg.choice;

        const tally = {};

        Object.values(room.votes).forEach(choice => {
          tally[choice] = (tally[choice] || 0) + 1;
        });

        room.map =
          Object.keys(tally).sort(
            (a, b) => tally[b] - tally[a]
          )[0] || room.map;

        broadcast(room);
      }
    }

    else if (msg.type === "start-round") {
      startRound(room);
    }

    else if (msg.type === "end-round") {
      endRound(room);
    }
  });

  ws.on("close", () => {
    room.players.delete(id);
    delete room.votes[id];

    if (room.players.size === 0) {
      rooms.delete(room.id);
    } else {
      broadcast(room);
    }
  });

  ws.on("error", err => {
    console.error("WebSocket:", err.message);
  });
});

const port = process.env.PORT || 10000;

server.listen(port, "0.0.0.0", () => {
  console.log(`The Grinner VR listening on ${port}`);
});
