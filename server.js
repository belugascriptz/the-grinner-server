
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

const PORT = process.env.PORT || 3000;
const MAX_PLAYERS = 12;

const rooms = new Map();
const bannedNames = new Set();

let nextPlayerNumber = 1;
let nextDummyNumber = 1;

function createRoom(id) {
  return {
    id,
    players: new Map(),
    dummies: [],
    votes: {},
    map: "Yellow Hall",
    roundActive: false
  };
}

function getRoom() {
  for (const room of rooms.values()) {
    if (room.players.size < MAX_PLAYERS) return room;
  }

  const id = `ROOM-${rooms.size + 1}`;
  const room = createRoom(id);
  rooms.set(id, room);
  return room;
}

function safeSend(ws, data) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(data));
  }
}

function broadcast(room) {
  const players = [...room.players.values()].map(player => ({
    id: player.id,
    name: player.name,
    x: player.x,
    y: player.y,
    z: player.z,
    color: player.color,
    role: player.role,
    admin: true,
    leftHand: player.leftHand,
    rightHand: player.rightHand,
    telekinesisBy: player.telekinesisBy
  }));

  const state = {
    type: "state",
    roomId: room.id,
    count: room.players.size,
    slots: MAX_PLAYERS,
    map: room.map,
    votes: room.votes,
    roundActive: room.roundActive,
    players,
    dummies: room.dummies
  };

  for (const player of room.players.values()) {
    safeSend(player.ws, state);
  }
}

function findPlayer(room, id) {
  return room.players.get(String(id));
}

function cleanName(value) {
  return String(value || "")
    .replace(/[^a-zA-Z0-9 _-]/g, "")
    .trim()
    .slice(0, 18);
}

function validNumber(value) {
  return Number.isFinite(Number(value));
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, Number(value)));
}

function removePlayer(room, player, reason) {
  if (!player) return;

  if (player.telekinesisBy) {
    const holder = findPlayer(room, player.telekinesisBy);
    if (holder) holder.holdingPlayer = null;
  }

  if (player.holdingPlayer) {
    const held = findPlayer(room, player.holdingPlayer);
    if (held) held.telekinesisBy = null;
  }

  room.players.delete(player.id);
  safeSend(player.ws, { type: "kicked", reason });
  try {
    player.ws.close();
  } catch {}

  if (room.players.size === 0) {
    rooms.delete(room.id);
  } else {
    broadcast(room);
  }
}

wss.on("connection", ws => {
  const room = getRoom();

  const id = crypto.randomUUID();
  const name = `Player-${String(nextPlayerNumber++).padStart(4, "0")}`;

  const player = {
    id,
    ws,
    name,
    x: 0,
    y: 0,
    z: 2,
    color: "#83c9ad",
    role: "player",
    admin: true,
    leftHand: null,
    rightHand: null,
    telekinesisBy: null,
    holdingPlayer: null
  };

  room.players.set(id, player);

  safeSend(ws, {
    type: "welcome",
    id,
    roomId: room.id,
    admin: true
  });

  broadcast(room);

  ws.on("message", raw => {
    let data;

    try {
      data = JSON.parse(raw.toString());
    } catch {
      return;
    }

    const current = findPlayer(room, id);
    if (!current) return;

    switch (data.type) {
      case "name": {
        const newName = cleanName(data.name);
        if (!newName || bannedNames.has(newName.toLowerCase())) return;

        current.name = newName;
        broadcast(room);
        break;
      }

      case "move": {
        if (current.telekinesisBy) break;

        if (validNumber(data.x)) current.x = clamp(data.x, -14, 14);
        if (validNumber(data.y)) current.y = clamp(data.y, 0, 15);
        if (validNumber(data.z)) current.z = clamp(data.z, -14, 14);

        if (data.leftHand && validNumber(data.leftHand.x) &&
            validNumber(data.leftHand.y) && validNumber(data.leftHand.z)) {
          current.leftHand = {
            x: clamp(data.leftHand.x, -30, 30),
            y: clamp(data.leftHand.y, -5, 20),
            z: clamp(data.leftHand.z, -30, 30)
          };
        }

        if (data.rightHand && validNumber(data.rightHand.x) &&
            validNumber(data.rightHand.y) && validNumber(data.rightHand.z)) {
          current.rightHand = {
            x: clamp(data.rightHand.x, -30, 30),
            y: clamp(data.rightHand.y, -5, 20),
            z: clamp(data.rightHand.z, -30, 30)
          };
        }

        broadcast(room);
        break;
      }

      case "color": {
        if (typeof data.color === "string" &&
            /^#[0-9a-fA-F]{6}$/.test(data.color)) {
          current.color = data.color;
          broadcast(room);
        }
        break;
      }

      case "vote": {
        const allowed = [
          "Yellow Hall",
          "Abandoned School",
          "Red Tunnels"
        ];

        if (!allowed.includes(data.map)) return;

        room.votes[id] = data.map;

        const counts = {};
        for (const vote of Object.values(room.votes)) {
          counts[vote] = (counts[vote] || 0) + 1;
        }

        const winner = Object.entries(counts)
          .sort((a, b) => b[1] - a[1])[0];

        if (winner) room.map = winner[0];

        broadcast(room);
        break;
      }

      case "start-round":
        room.roundActive = true;
        broadcast(room);
        break;

      case "end-round":
        room.roundActive = false;
        broadcast(room);
        break;

      case "spawn-dummy": {
        if (room.dummies.length >= 10) {
          safeSend(ws, { type: "error", message: "Maximum 10 dummies per room" });
          return;
        }

        const dummy = {
          id: `DUMMY-${nextDummyNumber++}`,
          x: clamp(current.x + 1, -14, 14),
          y: 0,
          z: clamp(current.z - 1, -14, 14),
          color: "#777568"
        };

        room.dummies.push(dummy);
        broadcast(room);
        break;
      }

      case "remove-dummies":
        room.dummies = [];
        broadcast(room);
        break;

      case "kick-player": {
        const target = findPlayer(room, data.targetId);
        if (!target || target.id === current.id) return;
        removePlayer(room, target, "Kicked by another player");
        break;
      }

      case "ban-player": {
        const target = findPlayer(room, data.targetId);
        if (!target || target.id === current.id) return;

        bannedNames.add(target.name.toLowerCase());
        removePlayer(room, target, "Banned from this server");
        break;
      }

      case "grab-player": {
        const target = findPlayer(room, data.targetId);
        if (!target || target.id === current.id) return;

        if (current.holdingPlayer) {
          const oldTarget = findPlayer(room, current.holdingPlayer);
          if (oldTarget) oldTarget.telekinesisBy = null;
        }

        if (target.telekinesisBy) {
          const oldHolder = findPlayer(room, target.telekinesisBy);
          if (oldHolder) oldHolder.holdingPlayer = null;
        }

        current.holdingPlayer = target.id;
        target.telekinesisBy = current.id;
        broadcast(room);
        break;
      }

      case "move-held-player": {
        const target = findPlayer(room, data.targetId);

        if (!target || current.holdingPlayer !== target.id ||
            target.telekinesisBy !== current.id) return;

        if (validNumber(data.x)) target.x = clamp(data.x, -14, 14);
        if (validNumber(data.y)) target.y = clamp(data.y, 0, 15);
        if (validNumber(data.z)) target.z = clamp(data.z, -14, 14);

        broadcast(room);
        break;
      }

      case "release-player": {
        const target = findPlayer(room, data.targetId);

        if (!target || current.holdingPlayer !== target.id) return;

        target.telekinesisBy = null;
        current.holdingPlayer = null;
        broadcast(room);
        break;
      }

      default:
        break;
    }
  });

  ws.on("close", () => {
    const current = findPlayer(room, id);
    if (!current) return;

    room.players.delete(id);

    if (current.holdingPlayer) {
      const held = findPlayer(room, current.holdingPlayer);
      if (held) held.telekinesisBy = null;
    }

    if (current.telekinesisBy) {
      const holder = findPlayer(room, current.telekinesisBy);
      if (holder) holder.holdingPlayer = null;
    }

    if (room.players.size === 0) {
      rooms.delete(room.id);
    } else {
      broadcast(room);
    }
  });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`The Grinner VR server running on port ${PORT}`);
});
