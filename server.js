const express = require("express");
const http = require("http");
const WebSocket = require("ws");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 3000;
const MAX_PLAYERS = 15;

let players = new Map();

app.get("/", (req, res) => {
  res.send("The Grinner VR server is running!");
});

wss.on("connection", (ws) => {
  if (players.size >= MAX_PLAYERS) {
    ws.close();
    return;
  }

  const id = Math.random().toString(36).slice(2);

  players.set(id, ws);

  ws.send(JSON.stringify({
    type: "welcome",
    id,
    maxPlayers: MAX_PLAYERS
  }));

  ws.on("message", (message) => {
    for (const [playerId, client] of players) {
      if (playerId !== id && client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({
          type: "player_update",
          id,
          data: message.toString()
        }));
      }
    }
  });

  ws.on("close", () => {
    players.delete(id);
  });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log("The Grinner server running on " + PORT);
});
