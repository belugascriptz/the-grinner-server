
const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const crypto = require("crypto");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 3000;
const MAX_PLAYERS = 8;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN;

const players = new Map();

function send(ws, data) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(data));
  }
}

function broadcast(data, exceptId = null) {
  for (const [id, player] of players) {
    if (id !== exceptId) send(player.ws, data);
  }
}

function isValidAdminToken(token) {
  if (!ADMIN_TOKEN || typeof token !== "string") return false;

  const a = Buffer.from(token);
  const b = Buffer.from(ADMIN_TOKEN);

  return a.length === b.length &&
    crypto.timingSafeEqual(a, b);
}

app.get("/", (req, res) => {
  res.send("The Grinner VR server is running!");
});

wss.on("connection", (ws) => {
  if (players.size >= MAX_PLAYERS) {
    ws.close(4000, "Server full");
    return;
  }

  const id = crypto.randomUUID();

  players.set(id, {
    ws,
    admin: false
  });

  send(ws, {
    type: "welcome",
    id,
    maxPlayers: MAX_PLAYERS
  });

  ws.on("message", (raw) => {
    let message;

    try {
      message = JSON.parse(raw.toString());
    } catch {
      return;
    }

    if (!message || typeof message.type !== "string") return;

    // Owner authentication
    if (message.type === "admin_auth") {
      const player = players.get(id);
      if (!player) return;

      player.admin = isValidAdminToken(message.token);

      send(ws, {
        type: "admin_auth_result",
        success: player.admin
      });

      return;
    }

    const player = players.get(id);
    if (!player) return;

    // Admin-only commands
    if (message.type === "admin_action") {
      if (!player.admin) {
        send(ws, { type: "error", message: "Not authorized" });
        return;
      }

      switch (message.action) {
        case "speed_boost":
        case "fly":
        case "super_jump":
          // Sent to the owner's game client.
          send(ws, {
            type: "admin_effect",
            action: message.action,
            enabled: message.enabled === true
          });
          break;

        case "spawn_dummy":
          broadcast({
            type: "dummy_spawn",
            dummyId: crypto.randomUUID(),
            stationary: true
          });
          break;

        case "kick": {
          const target = players.get(message.targetId);

          if (!target || message.targetId === id) {
            send(ws, {
              type: "error",
              message: "Invalid target"
            });
            return;
          }

          send(target.ws, {
            type: "kicked",
            reason: "Removed by an administrator"
          });

          target.ws.close(4001, "Kicked by administrator");
          players.delete(message.targetId);
          break;
        }

        default:
          send(ws, {
            type: "error",
            message: "Unknown admin action"
          });
      }

      return;
    }

    // Normal player updates
    broadcast({
      type: "player_update",
      id,
      data: message
    }, id);
  });

  ws.on("close", () => {
    players.delete(id);
  });

  ws.on("error", () => {
    players.delete(id);
  });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log("The Grinner server running on " + PORT);
});
