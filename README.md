# The Grinner VR — playable prototype

This is an early browser-based WebXR prototype, not a finished commercial game.

## Included
- Express + WebSocket server
- Multiple automatically created rooms, 12 players maximum per room
- Lobby, map voting (Forest/Caves/Facility), mode voting (Classic/Infection/Impostor)
- Simple legless monkey-style avatars and a separate white Grinner-style avatar
- Basic WebXR entry, controller-based arm-swing movement prototype
- Lobby computer with colour and turning settings
- Lobby mirror panel
- Temporary public test menu (press Y on desktop; use keyboard Y while testing)

## Run locally
1. Install Node.js 18 or newer.
2. Run `npm install`.
3. Run `npm start`.
4. Open `http://localhost:3000`.

## Deploy on Render
- Create a Web Service connected to this repository.
- Build command: `npm install`
- Start command: `npm start`
- The server uses Render's `PORT` automatically.

## Important limitations
- This is a prototype. VR locomotion, mirror reflection, multiplayer synchronization, collision/tagging, map geometry, and controller bindings need testing and refinement on a real Quest.
- The lobby computer's browser controls work as a flat UI panel in this prototype; in-world ray-pointer interaction is not fully implemented yet.
- Rooms are in-memory on one server process. For production scale, use a room/matchmaking service and persistent/shared state.
- The temporary public admin menu is intentionally unauthenticated for private testing only. Before public release, add server-verified owner authentication and remove public admin actions.
- Do not expose an admin token in client-side code.
