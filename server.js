
const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const path = require("path");
const crypto = require("crypto");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.static(path.join(__dirname, "public")));

app.get("/health", (_req, res) => {
  res.json({ ok: true, game: "The Grinner VR" });
});

const MAX_PLAYERS = 12;
const ADMIN_NAME = "gamingforfun69";
const ADMIN_TOKEN = process.env.ADMIN_TOKEN;

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

function cleanNumber(value, min, max, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n)
    ? Math.max(min, Math.min(max, n))
    : fallback;
}

function cleanHand(hand) {
  if (!hand || typeof hand !== "object") return null;

  return {
    x: cleanNumber(hand.x, -10, 10),
    y: cleanNumber(hand.y, 0, 5),
    z: cleanNumber(hand.z, -10, 10),
    curl: cleanNumber(hand.curl, 0, 1)
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
    players: [...room.players.values()].map(p => ({
      id: p.id,
      x: p.x,
      y: p.y,
      z: p.z,
      color: p.color,
      role: p.role,
      name: p.name,
      admin: p.admin,
      leftHand: p.leftHand,
      rightHand: p.rightHand
    }))
  };

  for (const player of room.players.values()) {
    send(player.ws, state);
  }
}

function startRound(room) {
  if (room.players.size < 2) {
    return false;
  }

  for (const player of room.players.values()) {
    player.role = "player";
  }

  const players = [...room.players.values()];
  const monster = players[Math.floor(Math.random() * players.length)];

  monster.role = "monster";
  room.roundActive = true;
  broadcast(room);
  return true;
}

function endRound(room) {
  room.roundActive = false;

  for (const player of room.players.values()) {
    player.role = "player";
  }

  broadcast(room);
}

function validAdminToken(value) {
  if (!ADMIN_TOKEN || typeof value !== "string") return false;

  const a = Buffer.from(value);
  const b = Buffer.from(ADMIN_TOKEN);

  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

wss.on("connection", ws => {
  const room = getRoom();
  const id = crypto.randomBytes(8).toString("hex");

  const player = {
    id,
    ws,
    x: 0,
    y: 0,
    z: 2,
    color: "#83c9ad",
    role: "player",
    name: "Player",
    admin: false,
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
    if (raw.length > 12000) return;

    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return;
    }

    if (!msg || typeof msg.type !== "string") return;

    if (msg.type === "move") {
      player.x = cleanNumber(msg.x, -8, 8, player.x);
      player.y = cleanNumber(msg.y, 0, 3, player.y);
      player.z = cleanNumber(msg.z, -8, 8, player.z);
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

    else if (msg.type === "admin-login") {
      const requestedName =
        typeof msg.name === "string" ? msg.name.trim() : "";

      const allowed =
        requestedName === ADMIN_NAME &&
        validAdminToken(msg.token);

      player.admin = allowed;
      player.name = allowed ? ADMIN_NAME : player.name;

      send(ws, {
        type: "admin-result",
        success: allowed
      });

      broadcast(room);
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
      if (!player.admin) {
        send(ws, { type: "error", message: "Admin permission required" });
        return;
      }
      startRound(room);
    }

    else if (msg.type === "end-round") {
      if (!player.admin) {
        send(ws, { type: "error", message: "Admin permission required" });
        return;
      }
      endRound(room);
    }

    else if (msg.type === "kick-player") {
      if (!player.admin || typeof msg.targetId !== "string") {
        send(ws, { type: "error", message: "Admin permission required" });
        return;
      }

      const target = room.players.get(msg.targetId);
      if (target && target.id !== player.id) {
        send(target.ws, { type: "kicked" });
        target.ws.close(4001, "Removed by admin");
      }
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
