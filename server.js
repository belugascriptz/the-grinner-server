
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
const bannedNames = new Set();
let roomNumber = 1;
let dummyNumber = 1;

function createRoom() {
  const room = {
    id: `room-${roomNumber++}`,
    players: new Map(),
    dummies: [],
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
      rightHand: p.rightHand,
      telekinesisBy: p.telekinesisBy
    })),

    dummies: room.dummies
  };

  for (const player of room.players.values()) {
    send(player.ws, state);
  }
}

function startRound(room) {
  if (room.players.size < 2) return false;

  for (const p of room.players.values()) {
    p.role = "player";
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

  for (const p of room.players.values()) {
    p.role = "player";
  }

  broadcast(room);
}

function validAdminToken(value) {
  if (!ADMIN_TOKEN || typeof value !== "string") return false;

  const a = Buffer.from(value);
  const b = Buffer.from(ADMIN_TOKEN);

  return a.length === b.length &&
    crypto.timingSafeEqual(a, b);
}

function adminOnly(player, ws) {
  if (player.admin) return true;

  send(ws, {
    type: "error",
    message: "Admin permission required"
  });

  return false;
}

function findTarget(room, id) {
  if (typeof id !== "string") return null;
  return room.players.get(id) || null;
}

function releasePlayer(room, target) {
  if (!target) return;

  target.telekinesisBy = null;
  broadcast(room);
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
    name: `Player-${id.slice(0, 4)}`,
    admin: false,
    leftHand: null,
    rightHand: null,
    telekinesisBy: null
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

    // PLAYER MOVEMENT
    if (msg.type === "move") {
      // A player being held cannot overwrite admin movement.
      if (!player.telekinesisBy) {
        player.x = cleanNumber(msg.x, -8, 8, player.x);
        player.y = cleanNumber(msg.y, 0, 3, player.y);
        player.z = cleanNumber(msg.z, -8, 8, player.z);
      }

      player.leftHand = cleanHand(msg.leftHand);
      player.rightHand = cleanHand(msg.rightHand);

      broadcast(room);
    }

    // PLAYER COLOR
    else if (msg.type === "color") {
      if (/^#[0-9a-fA-F]{6}$/.test(msg.color || "")) {
        player.color = msg.color;
        broadcast(room);
      }
    }

    // PLAYER NAME
    else if (msg.type === "name") {
      if (typeof msg.name !== "string") return;

      const newName = msg.name.trim().slice(0, 18);
      const normalized = newName.toLowerCase();

      if (!newName) return;

      if (bannedNames.has(normalized)) {
        send(ws, { type: "banned" });
        ws.close(4003, "Banned");
        return;
      }

      player.name = newName;
      broadcast(room);
    }

    // ADMIN LOGIN
    else if (msg.type === "admin-login") {
      const requestedName =
        typeof msg.name === "string" ? msg.name.trim() : "";

      const allowed =
        requestedName === ADMIN_NAME &&
        validAdminToken(msg.token);

      player.admin = allowed;

      if (allowed) {
        player.name = ADMIN_NAME;
      }

      send(ws, {
        type: "admin-result",
        success: allowed
      });

      broadcast(room);
    }

    // VOTING
    else if (msg.type === "vote") {
      const allowed = [
        "Yellow Hall",
        "Abandoned School",
        "Red Tunnels"
      ];

      if (!allowed.includes(msg.choice)) return;

      room.votes[id] = msg.choice;

      const tally = {};

      Object.values(room.votes).forEach(choice => {
        tally[choice] = (tally[choice] || 0) + 1;
      });

      room.map = Object.keys(tally).sort(
        (a, b) => tally[b] - tally[a]
      )[0] || room.map;

      broadcast(room);
    }

    // START ROUND
    else if (msg.type === "start-round") {
      if (!adminOnly(player, ws)) return;
      startRound(room);
    }

    // END ROUND
    else if (msg.type === "end-round") {
      if (!adminOnly(player, ws)) return;
      endRound(room);
    }

    // KICK PLAYER
    else if (msg.type === "kick-player") {
      if (!adminOnly(player, ws)) return;

      const target = findTarget(room, msg.targetId);

      if (!target || target.id === player.id) return;

      releasePlayer(room, target);

      send(target.ws, { type: "kicked" });
      target.ws.close(4001, "Removed by admin");
    }

    // BAN PLAYER BY NAME
    else if (msg.type === "ban-player") {
      if (!adminOnly(player, ws)) return;

      const target = findTarget(room, msg.targetId);

      if (!target || target.id === player.id) return;

      const name = target.name.trim().toLowerCase();

      if (!name || name === "player") return;

      bannedNames.add(name);

      releasePlayer(room, target);

      send(target.ws, { type: "banned" });
      target.ws.close(4003, "Banned by admin");
    }

    // SPAWN DUMMY
    else if (msg.type === "spawn-dummy") {
      if (!adminOnly(player, ws)) return;

      if (room.dummies.length >= 10) return;

      room.dummies.push({
        id: `dummy-${dummyNumber++}`,
        x: cleanNumber(player.x + 1, -8, 8),
        y: 0,
        z: cleanNumber(player.z - 1, -8, 8),
        color: "#b9b9bd"
      });

      broadcast(room);
    }

    // REMOVE ALL DUMMIES
    else if (msg.type === "remove-dummies") {
      if (!adminOnly(player, ws)) return;

      room.dummies = [];
      broadcast(room);
    }

    // GRAB PLAYER
    else if (msg.type === "grab-player") {
      if (!adminOnly(player, ws)) return;

      const target = findTarget(room, msg.targetId);

      if (!target || target.id === player.id) return;

      // One admin can hold a player at a time.
      if (target.telekinesisBy &&
          target.telekinesisBy !== player.id) return;

      target.telekinesisBy = player.id;
      broadcast(room);
    }

    // MOVE HELD PLAYER
    else if (msg.type === "move-held-player") {
      if (!adminOnly(player, ws)) return;

      const target = findTarget(room, msg.targetId);

      if (!target || target.telekinesisBy !== player.id) return;

      target.x = cleanNumber(msg.x, -8, 8, target.x);
      target.y = cleanNumber(msg.y, 0, 3, target.y);
      target.z = cleanNumber(msg.z, -8, 8, target.z);

      broadcast(room);
    }

    // RELEASE PLAYER
    else if (msg.type === "release-player") {
      if (!adminOnly(player, ws)) return;

      const target = findTarget(room, msg.targetId);

      if (!target || target.telekinesisBy !== player.id) return;

      releasePlayer(room, target);
    }
  });

  ws.on("close", () => {
    // Release anyone this admin was holding.
    for (const target of room.players.values()) {
      if (target.telekinesisBy === player.id) {
        target.telekinesisBy = null;
      }
    }

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
