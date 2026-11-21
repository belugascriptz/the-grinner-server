const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const crypto = require("crypto");
const path = require("path");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 3000;
const MAX_PLAYERS = 8;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || "";

const players = new Map();

app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

function send(ws, data) {
  if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(data));
}

function broadcast(data, exceptId = null) {
  for (const [id, player] of players) {
    if (id !== exceptId) send(player.ws, data);
  }
}

function validAdminToken(token) {
  if (!ADMIN_TOKEN || typeof token !== "string") return false;
  const a = Buffer.from(token);
  const b = Buffer.from(ADMIN_TOKEN);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

wss.on("connection", (ws) => {
  if (players.size >= MAX_PLAYERS) {
    ws.close(4000, "Server full");
    return;
  }

  const id = crypto.randomUUID();
  players.set(id, { ws, admin: false });

  send(ws, { type: "welcome", id, maxPlayers: MAX_PLAYERS });
  broadcast({ type: "player_joined", id }, id);

  ws.on("message", (raw) => {
    let message;
    try {
      message = JSON.parse(raw.toString());
    } catch {
      return;
    }
    if (!message || typeof message.type !== "string") return;

    if (message.type === "admin_auth") {
      const player = players.get(id);
      if (!player) return;
      player.admin = validAdminToken(message.token);
      send(ws, { type: "admin_auth_result", success: player.admin });
      return;
    }

    if (message.type === "admin_action") {
      const player = players.get(id);
      if (!player || !player.admin) {
        send(ws, { type: "error", message: "Not authorized" });
        return;
      }
      if (message.action === "kick" && typeof message.targetId === "string") {
        const target = players.get(message.targetId);
        if (target && message.targetId !== id) {
          send(target.ws, { type: "kicked" });
          target.ws.close(4001, "Kicked by owner");
          players.delete(message.targetId);
        }
      }
      if (["speed_boost", "fly", "super_jump"].includes(message.action)) {
        send(ws, {
          type: "admin_effect",
          action: message.action,
          enabled: message.enabled === true
        });
      }
      return;
    }

    // Clients send small position updates; do not accept client-supplied admin roles.
    if (message.type === "player_state") {
      const p = message.position;
      const r = message.rotation;
      if (!p || !r || ![p.x, p.y, p.z, r.y].every(Number.isFinite)) return;
      broadcast({
        type: "player_update",
        id,
        position: {
          x: Math.max(-100, Math.min(100, p.x)),
          y: Math.max(-10, Math.min(30, p.y)),
          z: Math.max(-100, Math.min(100, p.z))
        },
        rotation: { y: r.y }
      }, id);
    }
  });

  ws.on("close", () => {
    players.delete(id);
    broadcast({ type: "player_left", id });
  });
  ws.on("error", () => {
    players.delete(id);
  });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`The Grinner VR server running on ${PORT}`);
});
