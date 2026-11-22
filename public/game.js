if (player.role === "monster") {
    ctx.font = "bold 32px Arial";
    ctx.fillStyle = "#ff5555";
    ctx.fillText("MONSTER", 256, player.isOwner ? 72 : 35);
  }

  ctx.font = "bold 42px Arial";
  ctx.fillStyle = "#ffffff";
  ctx.fillText(
    String(player.name || "Player").slice(0, 18),
    256,
    player.isOwner || player.role === "monster" ? 103 : 64
  );

  texture.needsUpdate = true;
}

function updatePlayers(list) {
  const seen = new Set();

  for (const p of list || []) {
    if (p.id === myId) continue;
    seen.add(p.id);

    let avatar = players.get(p.id);
    if (!avatar) avatar = createPlayer(p.id, p.color);

    avatar.position.set(p.x || 0, p.y || 0, p.z || 0);

    if (p.role === "monster") {
      avatar.userData.playerMaterial.color.set(0xe8e0dc);
    } else {
      avatar.userData.playerMaterial.color.set(p.color || "#a9d6a0");
    }

    updateNameTag(avatar, p);
  }

  for (const [id, avatar] of players) {
    if (!seen.has(id)) {
      scene.remove(avatar);
      players.delete(id);
    }
  }
}

// NETWORK
let ws = null;
let lastMoveSent = 0;
let isOwner = false;

function sendMessage(data) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(data));
    return true;
  }
  statusEl.textContent = "Not connected to the server";
  return false;
}

function connectSocket() {
  const scheme = location.protocol === "https:" ? "wss:" : "ws:";
  ws = new WebSocket(`${scheme}//${location.host}`);

  ws.addEventListener("open", () => {
    statusEl.textContent = "Connected to game server";
  });

  ws.addEventListener("message", event => {
    let data;

    try {
      data = JSON.parse(event.data);
    } catch {
      return;
    }

    if (data.type === "welcome") {
      myId = data.id;
    }

    if (data.type === "admin-auth-ok") {
      isOwner = true;
      ownerHud.style.display = "block";
      statusEl.textContent = "OWNER access granted";
      adminLoginButton.textContent = "OWNER VERIFIED";
    }

    if (data.type === "admin-success") {
      statusEl.textContent = data.message || "Admin action accepted";
    }

    if (data.type === "admin-error") {
      statusEl.textContent = data.message || "Admin action rejected";
    }

    if (data.type === "movement-rejected") {
      statusEl.textContent = data.reason || "Movement rejected by server";
    }

    if (data.type === "state") {
      roomEl.textContent =
        `ROOM: ${data.count ?? 0} / ${data.slots ?? 12}`;

      statusEl.textContent =
        `Lobby • ${data.map || "Waiting for players"}`;

      updatePlayers(data.players);
    }
  });

  ws.addEventListener("close", () => {
    statusEl.textContent = "Disconnected — refresh to reconnect";
  });

  ws.addEventListener("error", () => {
    statusEl.textContent = "Could not connect to game server";
  });
}

connectSocket();

// OWNER HUD
const ownerHud = document.createElement("div");
ownerHud.textContent = "[OWNER] gamingforfun69";

Object.assign(ownerHud.style, {
  display: "none",
  position: "fixed",
  top: "12px",
  right: "12px",
  zIndex: "10000",
  color: "#ff3030",
  background: "#151515",
  padding: "8px 12px",
  font: "bold 15px Arial",
  borderRadius: "8px",
  pointerEvents: "none"
});

document.body.appendChild(ownerHud);

// ADMIN PANEL
const adminPanel = document.createElement("div");

Object.assign(adminPanel.style, {
  position: "fixed",
  right: "12px",
  bottom: "58px",
  zIndex: "10000",
  display: "none",
  background: "rgba(15,18,22,.96)",
  color: "white",
  padding: "12px",
  borderRadius: "10px",
  font: "14px Arial",
  maxWidth: "230px",
  lineHeight: "2"
});

adminPanel.innerHTML = `
  <b style="color:#ff4040">THE GRINNER • ADMIN</b>
  <br>
  <button id="ownerLogin">OWNER LOGIN</button>
  <br>
  <button data-admin="becomeMonster">BECOME MONSTER</button>
  <br>
  <button data-admin="returnPlayer">RETURN TO PLAYER</button>
  <br>
  <button data-admin="startRound">START ROUND</button>
  <br>
  <button data-admin="endRound">END ROUND</button>
  <br>
  <select id="adminMap">
    <option>Yellow Hall</option>
    <option>Abandoned School</option>
    <option>Red Tunnels</option>
  </select>
  <button id="changeMap">CHANGE MAP</button>
`;

document.body.appendChild(adminPanel);

const adminToggle = document.createElement("button");
adminToggle.textContent = "ADMIN";

Object.assign(adminToggle.style, {
  position: "fixed",
  right: "12px",
  bottom: "12px",
  zIndex: "10001",
  padding: "9px 14px",
  background: "#292929",
  color: "white",
  border: "1px solid #777",
  borderRadius: "8px"
});

document.body.appendChild(adminToggle);

adminToggle.addEventListener("click", () => {
  adminPanel.style.display =
    adminPanel.style.display === "none" ? "block" : "none";
});

const adminLoginButton = adminPanel.querySelector("#ownerLogin");

adminLoginButton.addEventListener("click", () => {
  const token = prompt("Enter your OWNER token:");

  if (!token) return;

  sendMessage({
    type: "admin-auth",
    token
  });
});

adminPanel.querySelectorAll("[data-admin]").forEach(button => {
  button.addEventListener("click", () => {
    if (!isOwner) {
      statusEl.textContent = "OWNER login required";
      return;
    }

    sendMessage({
      type: "admin",
      action: button.dataset.admin
    });
  });
});

adminPanel.querySelector("#changeMap").addEventListener("click", () => {
  if (!isOwner) {
    statusEl.textContent = "OWNER login required";
    return;
  }

  sendMessage({
    type: "admin",
    action: "setMap",
    map: adminPanel.querySelector("#adminMap").value
  });
});

// VOTING
function sendVote(choice) {
  sendMessage({ type: "vote", choice });
}

document.getElementById("voteForest").addEventListener("click", () => {
  sendVote("Yellow Hall");
});

document.getElementById("voteCaves").addEventListener("click", () => {
  sendVote("Abandoned School");
});

document.getElementById("voteFacility").addEventListener("click", () => {
  sendVote("Red Tunnels");
});

// VR
enterButton.addEventListener("click", async () => {
  if (!navigator.xr) {
    statusEl.textContent =
      "WebXR unavailable. Open this in Meta Quest Browser.";
    return;
  }

  if (renderer.xr.isPresenting) {
    statusEl.textContent = "Already in VR.";
    return;
  }

  enterButton.disabled = true;
  enterButton.textContent = "STARTING VR…";

  try {
    const session = await navigator.xr.requestSession("immersive-vr", {
      optionalFeatures: [
        "local-floor",
        "bounded-floor",
        "dom-overlay"
      ],
      domOverlay: { root: document.body }
    });

    await renderer.xr.setSession(session);
    statusEl.textContent = "VR connected";

    session.addEventListener("end", () => {
      enterButton.disabled = false;
      enterButton.textContent = "ENTER VR";
      statusEl.textContent = "VR session ended";
    }, { once: true });

  } catch (error) {
    console.error(error);

    statusEl.textContent =
      `VR error: ${error.name || "Unknown"} — ${error.message || ""}`;

    enterButton.disabled = false;
    enterButton.textContent = "ENTER VR";
  }
});

// GAME LOOP
renderer.setAnimationLoop(() => {
  const now = performance.now();

  grinner.rotation.y = Math.sin(now * 0.00025) * 0.12;

  if (
    ws &&
    ws.readyState === WebSocket.OPEN &&
    now - lastMoveSent > 100
  ) {
    const position = renderer.xr.isPresenting
      ? renderer.xr.getCamera().position
      : camera.position;

    sendMessage({
      type: "move",
      x: position.x,
      y: position.y,
      z: position.z
    });

    lastMoveSent = now;
  }

  renderer.render(scene, camera);
});

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
  
