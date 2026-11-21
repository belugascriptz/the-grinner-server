# The Grinner VR — Starter Prototype 0.1

This is a first browser-based Quest prototype, not a finished game.

## Included
- Procedural yellow Backrooms-style test room.
- WebXR entry button for Meta Quest Browser.
- Basic controller-thumbstick movement and turning.
- Desktop keyboard fallback (WASD / arrow keys).
- WebSocket connection to this same Render service.
- Basic remote player avatars and an 8-connection server cap.

## Not included yet
- Gorilla Tag arm-swing locomotion.
- Monster role, grabbing, attacks, respawn, voice chat.
- Visual admin panel or Meta account verification.
- Persistent bans, matchmaking rooms, anti-cheat, or saved progress.

## Deploy
1. Put `server.js`, `package.json`, and the `public` folder in the root of the GitHub repo.
2. In Render, use Build Command `npm install` and Start Command `npm start`.
3. The site and WebSocket server run on the same Render URL.
4. Open the HTTPS Render URL in Meta Quest Browser and press **Enter test world**, then **Enter VR**.

The browser client uses the WebXR API and loads Three.js from a CDN, so the Quest needs internet access.
