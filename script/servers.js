// =========================
// SERVER SYSTEM (ONE FILE, FULL FEATURED)
// =========================
function cleanupAllListeners() {
  if (window.serverMessageListener) window.serverMessageListener.off?.();
  if (window.serverLiveListener) window.serverLiveListener.off?.();
  if (window.gifCooldownListener) window.gifCooldownListener.off?.();
  if (window.presenceListener) window.presenceListener.off?.();
  if (window.memberListener) window.memberListener.off?.();
}

async function openServerChat(serverId, serverData) {
  cleanupAllListeners();
  // --- close any open gif modals first ---
  document.querySelectorAll(".gif-modal").forEach(m => {
    m.style.display = "none";
    m.classList.remove("show");
  });

  // --- DOM refs ---
  const modal = document.getElementById("server-chat-modal");
  const nav = document.getElementById("server-chat-nav");
  const msgArea = document.getElementById("server-chat-messages"); // you said it's a DIV
  const box = document.getElementById("server-chat-box");
  const sendBtn = document.getElementById("server-chat-send");

  if (!modal || !nav || !msgArea || !box || !sendBtn) {
    console.warn("openServerChat: missing required DOM elements");
    return;
  }

  // show modal
  modal.style.display = "flex";
  modal.style.flexDirection = "column";
  msgArea.innerHTML = "";

  // ---- Check ban BEFORE opening fully ----
  try {
    const banSnap = await firebase.database().ref(`servers/${serverId}/banned/${currentUsername}`).once("value");
    if (banSnap.exists()) {
      alert("You are banned from this server.");
      modal.style.display = "none";
      return;
    }
  } catch (err) {
    console.error("Ban check failed:", err);
  }

  // --- header ---
  nav.innerHTML = `
    <div style="display:flex; gap:10px; align-items:center;">
      <img id="server-header-img" src="${serverData.imgUrl || '../images/default-server.png'}" style="width:3.2vw;height:3.2vw;border-radius:12px;object-fit:cover;">
      <h1 id="server-header-name" style="color:white; font-weight:100;">${serverData.name || 'Server'}</h1>
    </div>
    <div class="admintools"></div>
    <button id="close-server-chat">X</button>
  `;

  const adminToolsEl = nav.querySelector(".admintools");
  const headerImg = document.getElementById("server-header-img");
  const headerName = document.getElementById("server-header-name");

  // --- OWNER CHECK ---
  try {
    const ownerSnap = await firebase.database().ref(`servers/${serverId}/owner`).once("value");
    const isOwner = ownerSnap.exists() && ownerSnap.val() === currentUsername;

    if (isOwner) {
      adminToolsEl.innerHTML = `
        <button id="change-server-icon">Change Icon</button>
        <button id="change-server-name">Change Name</button>
        <button id="manage-members">Manage Members</button>
      `;

      // change icon
      document.getElementById("change-server-icon").onclick = () => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "image/*";
        input.onchange = async e => {
          const file = e.target.files[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = async () => {
            try {
              await firebase.database().ref(`servers/${serverId}/imgUrl`).set(reader.result);
            } catch (err) {
              console.error("Failed to set server imgUrl:", err);
            }
          };
          reader.readAsDataURL(file);
        };
        input.click();
      };

      // change name
      document.getElementById("change-server-name").onclick = async () => {
        const bannedWords = ["fuck","shit","bitch","asshole","cunt","nigger","faggot","dick","cock","pussy",
          "nigga","slut","whore","bastard","penis","vagina","sex","rape","kill","suicide",
          "cum","boob","boobs","fag","retard","jerk","porn","horny","gay","lesbian","femboy",
          "ass","kkk","masturbate","dildo"];
        const name = prompt("Enter new server name (max 10 chars):");
        if (!name) return;
        if (name.length > 10) return alert("Name too long.");
        if (bannedWords.some(w => name.toLowerCase().includes(w)))
          return alert("Blocked: banned word detected.");
        try {
          await firebase.database().ref(`servers/${serverId}/name`).set(name);
        } catch (err) {
          console.error("Failed to set server name:", err);
        }
      };

      // manage members
      document.getElementById("manage-members").onclick = async () => {
        try {
          const membersSnap = await firebase.database().ref(`servers/${serverId}/members`).once("value");
          if (!membersSnap.exists()) return alert("No members.");
          const members = membersSnap.val();
          const memberList = Object.keys(members).filter(u => u !== currentUsername);
          if (memberList.length === 0) return alert("No members to manage.");
          const target = prompt("Members:\n" + memberList.join("\n") + "\n\nEnter username:");
          if (!target || !members[target]) return;
          const action = prompt(`Action for ${target}: remove / ban`);
          if (!action) return;
          if (action.toLowerCase() === "remove") {
            await firebase.database().ref(`servers/${serverId}/members/${target}`).remove();
            alert(`${target} removed from server.`);
          } else if (action.toLowerCase() === "ban") {
            await firebase.database().ref(`servers/${serverId}/banned/${target}`).set(true);
            await firebase.database().ref(`servers/${serverId}/members/${target}`).remove();
            alert(`${target} has been banned.`);
          } else alert("Invalid action.");
        } catch (err) {
          console.error("Manage members failed:", err);
          alert("Could not manage members.");
        }
      };
    }
  } catch (err) {
    console.error("Owner check failed:", err);
  }

  // ---- Close handler (single, reliable) ----
  const closeBtn = document.getElementById("close-server-chat");
  closeBtn.onclick = () => {
    modal.style.display = "none";

    const gifModal = document.getElementById("server-gif-modal");
    if (gifModal) {
      gifModal.style.display = "none";
      gifModal.classList.remove("show");
    }

    // remove server message listener cleanly
    if (window.serverMessageListener && window.serverMessageListener.ref) {
      try {
        window.serverMessageListener.ref.off();
      } catch (err) {
        console.warn("Error removing serverMessageListener:", err);
      }
      window.serverMessageListener = null;
    }

    // remove live listener
    if (window.serverLiveListener) {
      try {
        window.serverLiveListener.off();
      } catch (err) {
        console.warn("Error removing serverLiveListener:", err);
      }
      window.serverLiveListener = null;
    }
  };

  // ---- Live updates for server meta (owner, name, kicked) ----
  try {
    const serverRef = firebase.database().ref(`servers/${serverId}`);

    // remove previous if present
    if (window.serverLiveListener && window.serverLiveListener.off) {
      try { window.serverLiveListener.off(); } catch (e) { /* ignore */ }
    }
    window.serverLiveListener = serverRef;

    serverRef.on("value", async snap => {
      if (!snap.exists()) {
        modal.style.display = "none";
        await refreshUserServers();
        return;
      }
      const data = snap.val();
      headerName.textContent = data.name || headerName.textContent;
      headerImg.src = data.imgUrl || headerImg.src;

      if (!data.members || !data.members[currentUsername]) {
        modal.style.display = "none";
        alert("You were removed from the server.");
        await refreshUserServers();
      }
    });
  } catch (err) {
    console.warn("Live server listener setup failed:", err);
  }

  // ---- Load messages (robust, prevent stacked listeners) ----
  try {
    const msgRef = firebase.database().ref(`servers/${serverId}/messages`).limitToLast(200);

    // If a previous listener exists, off() on the old ref to be safe
    if (window.serverMessageListener && window.serverMessageListener.ref) {
      try {
        window.serverMessageListener.ref.off();
      } catch (err) {
        console.warn("Failed to off previous serverMessageListener.ref:", err);
      }
    }

    // liveRef is the ref we will use for realtime child_added
    const liveRef = msgRef.orderByChild("timestamp");

    // named callback so it can be referenced
    const onChildAdded = snap => {
      const m = { id: snap.key, ...snap.val() };
      // guard: only render if not in DOM yet (prevent duplicates)
      if (!msgArea.querySelector(`li[data-id="${m.id}"]`)) {
        renderServerMessage(m, m.id, msgArea);
        // keep scroll at bottom for new messages
        msgArea.scrollTop = msgArea.scrollHeight;
      }
    };

    // store for later cleanup
    window.serverMessageListener = { ref: liveRef, callback: onChildAdded };

    // Load history once then attach realtime listener
    msgRef.once("value").then(snapshot => {
      const messages = [];
      snapshot.forEach(s => messages.push({ id: s.key, ...s.val() }));
      messages.sort((a,b) => (a.timestamp||0) - (b.timestamp||0));
      messages.forEach(m => renderServerMessage(m, m.id, msgArea));
      msgArea.scrollTop = msgArea.scrollHeight;

      // attach realtime listener exactly once
      liveRef.on("child_added", onChildAdded);
    }).catch(err => {
      console.error("Failed to load message history:", err);
    });
  } catch (err) {
    console.error("Message listener setup failed:", err);
  }

  // --- Prevent duplicate GIF/Image controls (only create if not present) ---
  if (document.getElementById("media-controls")) {
    document.getElementById("media-controls").remove();
  }

  const controls = document.createElement("div");
  controls.id = "media-controls";
  controls.style.display = "flex";
  controls.style.gap = "10px";
  controls.innerHTML = `
    <button id="gif-btn2">GIF</button>
    <button id="img-btn">Upload Image</button>
  `;
  // place controls right after input box
  box.parentNode.insertBefore(controls, box.nextSibling);

  const gifBtn = document.getElementById("gif-btn2");
  const imgBtn = document.getElementById("img-btn");

  // ---- Send message ----
  const bannedWords2 = ["fuck","shit","bitch","asshole","cunt","nigger","faggot","dick","cock","pussy",
    "nigga","slut","whore","bastard","penis","vagina","sex","rape","kill","suicide",
    "cum","boob","boobs","fag","retard","jerk","porn","horny","gay","lesbian","femboy",
    "ass","kkk","masturbate","dildo"];

  // Make sure this assignment overwrites previous handlers (no stacking)
  sendBtn.onclick = async () => {
    try {
      const rawText = box.value.trim();
      if (!rawText) return;
      const lower = rawText.toLowerCase();
      const premium = await isPremium(currentUsername);

      // censorship check (non-premium only)
      if (!premium) {
        const containsBanned = bannedWords2.some(w => lower.includes(w));
        if (containsBanned) {
          box.value = "";
          box.placeholder = "⚠️ Message blocked: inappropriate language";
          setTimeout(() => box.placeholder = "Type a message...", 1500);
          return;
        }
      }

      // push message to DB (do NOT render locally — let realtime listener handle it)
      await firebase.database().ref(`servers/${serverId}/messages`).push({
        sender: currentUsername,
        text: rawText,
        timestamp: Date.now()
      });

      box.value = "";
    } catch (err) {
      console.error("Send failed:", err);
    }
  };

  // ---- Enter key sends (overwrite handler to avoid stacking) ----
  box.onkeydown = e => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (typeof sendBtn.onclick === "function") sendBtn.onclick();
    }
  };

  // --- GIF modal and system init (guard creation to avoid rebuilding) ---
  const gifModal = document.getElementById("server-gif-modal");
  const gifModalInner = document.getElementById("server-gif-modal-inner");

  function initGifSystemForServer({ serverId, gifButtonEl, gifModalEl, gifModalInnerEl }) {
    if (!gifButtonEl || !gifModalEl || !gifModalInnerEl) {
      console.warn("GIF system skipped — missing elements");
      return;
    }

    // Prevent rebuilding the modal UI more than once
    if (gifModalEl.dataset.built === "true") {
      // still re-bind gif button click behavior (but keep UI)
      gifButtonEl.onclick = gifButtonEl.onclick || (async (e) => {
        e.stopPropagation();
        const premium = await isPremium(currentUsername);
        const timeoutSnap = await firebase.database().ref(`gifTimeouts/${currentUsername}`).once("value");
        if (!premium && timeoutSnap.exists()) {
          const left = Math.ceil((timeoutSnap.val() - Date.now()) / 1000);
          gifButtonEl.textContent = `GIF (${left}s)`;
          return;
        }
        if (gifModalEl.style.display === "block") {
          gifModalEl.style.display = "none";
          gifModalEl.classList.remove("show");
        } else {
          gifModalEl.style.display = "block";
          gifModalEl.classList.add("show");
        }
      });
      return;
    }

    gifModalEl.dataset.built = "true";

    gifModalInnerEl.innerHTML = `
      <div class="gif-ui" style="padding:10px; max-width:520px;">
        <input id="server-gif-search" placeholder="Search GIFs..." style="width:100%; padding:8px; margin-bottom:8px;" />
        <div id="server-gif-results" style="display:flex; flex-wrap:wrap;"></div>
      </div>
    `;

    const gifSearchEl = gifModalInnerEl.querySelector("#server-gif-search");
    const gifResultsEl = gifModalInnerEl.querySelector("#server-gif-results");

    function showModal() {
      gifModalEl.style.display = "block";
      gifModalEl.classList.add("show");
    }
    function hideModal() {
      gifModalEl.style.display = "none";
      gifModalEl.classList.remove("show");
    }

    async function sendServerGifMessage(url) {
      if (!serverId || !url) return;
      const premium = await isPremium(currentUsername);
      const timeoutSnap = await firebase.database().ref(`gifTimeouts/${currentUsername}`).once("value");
      if (!premium && timeoutSnap.exists()) return;
      await firebase.database().ref(`servers/${serverId}/messages`).push({
        sender: currentUsername,
        gif: url,
        timestamp: Date.now()
      });
      if (!premium) startGifCooldown(currentUsername, 25);
      hideModal();
    }

    gifButtonEl.onclick = async (e) => {
      e.stopPropagation();
      const premium = await isPremium(currentUsername);
      const timeoutSnap = await firebase.database().ref(`gifTimeouts/${currentUsername}`).once("value");
      if (!premium && timeoutSnap.exists()) {
        const left = Math.ceil((timeoutSnap.val() - Date.now()) / 1000);
        gifButtonEl.textContent = `GIF (${left}s)`;
        return;
      }
      if (gifModalEl.style.display === "block") hideModal();
      else showModal();
    };

    // restore cooldown if active
    firebase.database().ref(`gifTimeouts/${currentUsername}`).once("value")
      .then(snap => {
        if (snap.exists()) {
          const left = Math.ceil((snap.val() - Date.now()) / 1000);
          if (left > 0) startGifCooldown(currentUsername, left);
        }
      }).catch(() => {});

    // Tenor search (debounced)
    let typingTimeout;
    gifSearchEl.oninput = () => {
      clearTimeout(typingTimeout);
      typingTimeout = setTimeout(async () => {
        const query = gifSearchEl.value.trim();
        if (query.length < 2) {
          gifResultsEl.innerHTML = "<p style='color:#999'>Type 2+ characters...</p>";
          return;
        }
        try {
          const premium = await isPremium(currentUsername);
          const limit = premium ? 30 : 4;
          const res = await fetch(`https://api.tenor.com/v1/search?q=${encodeURIComponent(query)}&key=${TENOR_KEY}&limit=${limit}`);
          const data = await res.json();
          gifResultsEl.innerHTML = "";
          data.results?.forEach(item => {
            const url = item.media[0]?.gif?.url;
            if (!url) return;
            const img = document.createElement("img");
            img.src = url;
            img.className = "gif-option";
            img.style.width = "100px";
            img.style.height = "100px";
            img.style.objectFit = "cover";
            img.style.borderRadius = "8px";
            img.style.margin = "4px";
            img.style.cursor = "pointer";
            img.onclick = () => sendServerGifMessage(url);
            gifResultsEl.appendChild(img);
          });
        } catch (err) {
          gifResultsEl.innerHTML = "<p style='color:red'>Error loading GIFs</p>";
        }
      }, 300);
    };

    gifModalEl.onclick = (e) => {
      if (e.target === gifModalEl) hideModal();
    };
    gifModalInnerEl.onclick = (e) => e.stopPropagation();
  }

  // initialize GIF system for this server chat (guarded)
  initGifSystemForServer({
    serverId,
    gifButtonEl: gifBtn,
    gifModalEl: gifModal,
    gifModalInnerEl: gifModalInner
  });

  // setup server image upload (this function already guards double-binding)
  setupServerImageUpload({
    serverId,
    imgButtonEl: imgBtn
  });

} // end openServerChat
async function setupServerImageUpload({ serverId, imgButtonEl }) {
  if (!imgButtonEl) return;

  // Prevent duplicate binding
  if (imgButtonEl.dataset.bound === "true") return;
  imgButtonEl.dataset.bound = "true";

  // Wrap the button
  const wrapper = document.createElement("div");
  wrapper.style.position = "relative";
  imgButtonEl.parentNode.insertBefore(wrapper, imgButtonEl);
  wrapper.appendChild(imgButtonEl);

  const premium = await isPremium(currentUsername);

  if (!premium) {
    // Block behind overlay
    const overlay = document.createElement("div");
    overlay.textContent = "Premium Only";
    overlay.style.position = "absolute";
    overlay.style.inset = "0";
    overlay.style.background = "rgba(0,0,0,0.6)";
    overlay.style.color = "white";
    overlay.style.display = "flex";
    overlay.style.justifyContent = "center";
    overlay.style.alignItems = "center";
    overlay.style.fontWeight = "bold";
    overlay.style.cursor = "not-allowed";
    overlay.style.borderRadius = "4px";
    wrapper.appendChild(overlay);
    return;
  }

  // Premium allowed — actual upload logic
  imgButtonEl.onclick = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";

    input.onchange = evt => {
      const file = evt.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = () => {
        firebase.database().ref(`servers/${serverId}/messages`).push({
          sender: currentUsername,
          imageBase64: reader.result,
          timestamp: Date.now()
        });
      };
      reader.readAsDataURL(file);
    };

    input.click();
  };
}
setInterval(() => {
  const ref = firebase.database().ref("gifTimeouts");

  ref.once("value").then(snap => {
    snap.forEach(userSnap => {
      const expiresAt = userSnap.val();
      const key = userSnap.key;

      // if missing or expired
      if (!expiresAt || expiresAt - Date.now() <= 0) {
        firebase.database()
          .ref(`gifTimeouts/${key}`)
          .remove()
          .catch(() => {});
      }
    });
  });

}, 1000);



// Example refreshUserServers function
async function refreshUserServers() {
  const imageSrc = msg.image || msg.imageBase64;
if (imageSrc) {
  const img = document.createElement("img");
  img.src = imageSrc;
  img.style.maxWidth = "250px";
  img.style.borderRadius = "8px";
  img.style.marginTop = "4px";
  img.style.objectFit = "cover";
  content.appendChild(img);
}
  const serverListEl = document.getElementById("server-list");
  serverListEl.innerHTML = "";
  const userServersSnap = await firebase.database().ref(`users/${currentUsername}/servers`).once("value");
  userServersSnap.forEach(snap => {
    const serverId = snap.key;
    const serverData = snap.val();
    renderServerInList(serverId, serverData); // your function to render server in sidebar
  });
}



// =============================
// IDENTICAL DM-STYLE SERVER MESSAGES
// =============================
function renderServerMessage(msg, id, msgArea) {
  // prevent duplicate messages
  if (document.querySelector(`#server-chat-messages li[data-id="${id}"]`)) return;

  const li = document.createElement('li');
  li.setAttribute('data-id', id);
  li.setAttribute('data-timestamp', msg.timestamp || 0);
  li.classList.add('message', msg.sender === currentUsername ? 'user' : 'friend');
  li.style.display = 'flex';
  li.style.alignItems = 'flex-start';
  li.style.marginBottom = '8px';

  // ----- PFP -----
  const pfp = document.createElement('img');
  pfp.style.width = '55px';
  pfp.style.height = '55px';
  pfp.style.borderRadius = '50%';
  pfp.style.marginRight = '10px';
  pfp.style.objectFit = 'cover';
  pfp.src = '../images/default-pfp.png';

  firebase.database().ref(`users/${msg.sender}/pfpUrl`)
    .once('value')
    .then(s => { if (s.exists()) pfp.src = s.val(); });

  // wrapper for PFP + ring
  const wrapper = document.createElement('div');
  wrapper.style.position = 'relative';
  wrapper.style.width = '65px';
  wrapper.style.height = '65px';
  wrapper.style.marginRight = '10px';
  wrapper.appendChild(pfp);

  // ring cover
  firebase.database().ref(`users/${msg.sender}/ringcover`)
    .once('value')
    .then(snap => {
      const ringFile = snap.exists() ? snap.val() : null;
      if (!ringFile) return;

      const ringDiv = document.createElement('div');
      ringDiv.style.position = 'absolute';
      ringDiv.style.top = '-2px';
      ringDiv.style.left = '-2px';
      ringDiv.style.width = '60px';
      ringDiv.style.height = '60px';
      ringDiv.style.zIndex = '5';
      ringDiv.style.pointerEvents = 'none';

      const ringImg = document.createElement('img');
      ringImg.src = ringFile.startsWith('http') ? ringFile : `../profileRings/${ringFile}`;
      ringImg.style.width = '100%';
      ringImg.style.height = '100%';
      ringImg.style.objectFit = 'cover';

      ringDiv.appendChild(ringImg);
      wrapper.appendChild(ringDiv);
    });
// ----- Message Content -----
const content = document.createElement('div');
content.style.display = 'flex';
content.style.flexDirection = 'column';
content.style.maxWidth = '70%';

// container for display name + username inline
const nameContainer = document.createElement('div');
nameContainer.style.display = 'flex';
nameContainer.style.alignItems = 'baseline';
nameContainer.style.gap = '4px'; // space between displayName and username
nameContainer.style.marginBottom = '2px';

// display name
const displayNameSpan = document.createElement('div');
displayNameSpan.style.fontWeight = 'bold';
displayNameSpan.style.color = '#fff';
displayNameSpan.style.fontSize = '14px';
displayNameSpan.textContent = msg.sender; // fallback

// username
const usernameSpan = document.createElement('div');
usernameSpan.style.fontWeight = 'normal';
usernameSpan.style.color = '#b9bbbe';
usernameSpan.style.fontSize = '12px';
usernameSpan.textContent = '@' + msg.sender;

// fetch display name from database
firebase.database().ref(`users/${msg.sender}/displayName`)
  .once('value')
  .then(snap => {
    if (snap.exists()) displayNameSpan.textContent = snap.val();
  });

// append both inline
nameContainer.appendChild(displayNameSpan);
nameContainer.appendChild(usernameSpan);

// append to message content
content.appendChild(nameContainer); // ✅ only append the container

// timestamp
const timeSpan = document.createElement('div');
timeSpan.textContent = formatMessageTime(msg.timestamp);
timeSpan.style.fontSize = '10px';
timeSpan.style.color = '#b9bbbe';
timeSpan.style.marginBottom = '2px';

// bubble
const bubble = document.createElement('div');
bubble.style.padding = '8px';
bubble.style.borderRadius = '8px';
bubble.style.background = msg.sender === currentUsername ? '#2f3136' : '#3a3a3a';
bubble.style.color = 'white';
bubble.style.wordWrap = 'break-word';

if (msg.text) bubble.textContent = msg.text;

// GIF
if (msg.gif) {
  const gifImg = document.createElement('img');
  gifImg.src = msg.gif;
  gifImg.style.maxWidth = '200px';
  gifImg.style.borderRadius = '8px';
  gifImg.style.marginTop = '4px';
  content.appendChild(gifImg);
}

// image (URL or base64)
const imageSrc = msg.image || msg.imageBase64;
if (imageSrc) {
  const img = document.createElement('img');
  img.src = imageSrc;
  img.style.maxWidth = '250px';
  img.style.borderRadius = '8px';
  img.style.marginTop = '4px';
  img.style.objectFit = 'cover';
  content.appendChild(img);
}

// append timestamp and bubble
content.appendChild(timeSpan);
if (msg.text) content.appendChild(bubble);

li.appendChild(wrapper);
li.appendChild(content);

msgArea.appendChild(li);
msgArea.scrollTop = msgArea.scrollHeight;

}

/*
Features:
- Instant/awaited image upload to Firebase Storage
- Disabled Create while upload in progress
- Live preview + uploading spinner
- Hidden server-image-url (created if missing)
- Bad word filter
- Premium overlay for Add Server
- Join server (password)
- Centered server icons, hover name animation
- Scrollbar styling injected
*/

(() => {
  // ---------- config / DOM ----------
  const serverListEl = document.getElementById("server-list");
  const addServerBtn = document.getElementById("add-server-btn");
  const joinServerBtn = document.getElementById("join-server-btn");
  const serverModal = document.getElementById("server-modal");
  const joinModal = document.getElementById("join-modal");

  const createBtn = document.getElementById("create-server");
  const joinConfirmBtn = document.getElementById("join-server-confirm");
  const serverFileInput = document.getElementById("server-image"); // <input type="file">
  const serverNameInput = document.getElementById("server-name");
  const serverPasswordInput = document.getElementById("server-password");
  const joinNameInput = document.getElementById("join-server-name");
  const joinPasswordInput = document.getElementById("join-server-password");

  // ensure server-image-url hidden input exists
  let serverImageUrlInput = document.getElementById("server-image-url");
  if (!serverImageUrlInput) {
    serverImageUrlInput = document.createElement("input");
    serverImageUrlInput.type = "hidden";
    serverImageUrlInput.id = "server-image-url";
    // append inside server modal if exists
    if (serverModal) serverModal.appendChild(serverImageUrlInput);
    else document.body.appendChild(serverImageUrlInput);
  }

  // Create preview + spinner UI next to file input (if not already present)
  function ensurePreviewUI() {
    if (!serverFileInput) return null;
    let container = serverFileInput.closest(".server-image-wrapper");
    if (!container) {
      container = document.createElement("div");
      container.className = "server-image-wrapper";
      container.style.display = "flex";
      container.style.alignItems = "center";
      container.style.gap = "8px";
      serverFileInput.parentNode.insertBefore(container, serverFileInput);
      container.appendChild(serverFileInput);
    }

    let preview = container.querySelector(".server-image-preview");
    if (!preview) {
      preview = document.createElement("img");
      preview.className = "server-image-preview";
      preview.alt = "preview";
      preview.style.width = "48px";
      preview.style.height = "48px";
      preview.style.borderRadius = "8px";
      preview.style.objectFit = "cover";
      preview.style.display = "none"; // hidden until we have image
      container.appendChild(preview);
    }

    let spinner = container.querySelector(".server-image-spinner");
    if (!spinner) {
      spinner = document.createElement("div");
      spinner.className = "server-image-spinner";
      spinner.textContent = "Uploading...";
      spinner.style.fontSize = "12px";
      spinner.style.padding = "6px 8px";
      spinner.style.borderRadius = "6px";
      spinner.style.background = "rgba(0,0,0,0.6)";
      spinner.style.color = "#fff";
      spinner.style.display = "none";
      container.appendChild(spinner);
    }

    return { container, preview, spinner };
  }

  const previewUI = ensurePreviewUI();

  // ---------- banned words ----------
  const bannedServerWords = [
    "fuck","shit","bitch","asshole","cunt","nigger","faggot","dick","cock","pussy",
    "nigga","slut","whore","bastard","penis","vagina","sex","rape","kill","suicide",
    "cum","boob","boobs","fag","retard","jerk","porn","horny","gay","lesbian","femboy",
    "ass","kkk","dildo"
  ];

  // ---------- utility: premium check ----------
  async function isServerPremium(user) {
    try {
      const snap = await firebase.database().ref(`premium/${user}`).once('value');
      if (!snap.exists()) return false;
      return Date.now() < (snap.val().expires || 0);
    } catch (err) {
      console.error("premium check error", err);
      return false;
    }
  }

  // ---------- inject CSS for server list centering + scrollbar ----------
  (function injectStyles() {
    const css = `
      /* server list layout */

      #server-list li { user-select: none; }

      /* scrollbar styling (webkit) */
      #server-list::-webkit-scrollbar { display: none; }
    `;
    const s = document.createElement("style");
    s.appendChild(document.createTextNode(css));
    document.head.appendChild(s);
  })();

  // ---------- Setup Add Server btn (premium overlay) ----------
  async function setupAddServerBtn() {
    if (!addServerBtn) return;
    const premium = await isServerPremium(currentUsername);

    // remove any previous wrapper added earlier (safe-to-call)
    const existingWrapper = addServerBtn.closest(".premium-wrapper");
    if (existingWrapper) {
      const parent = existingWrapper.parentNode;
      parent.insertBefore(addServerBtn, existingWrapper);
      existingWrapper.remove();
    }

    if (!premium) {
      const wrapper = document.createElement("div");
      wrapper.className = "premium-wrapper";
      wrapper.style.position = "relative";
      addServerBtn.parentNode.insertBefore(wrapper, addServerBtn);
      wrapper.appendChild(addServerBtn);

      const overlay = document.createElement("div");
      overlay.textContent = "Premium Only";
      overlay.style.position = "absolute";
      overlay.style.inset = "0";
      overlay.style.background = "rgba(0,0,0,0.6)";
      overlay.style.color = "#fff";
      overlay.style.display = "flex";
      overlay.style.justifyContent = "center";
      overlay.style.alignItems = "center";
      overlay.style.textAlign = "center";
      overlay.style.fontSize = "9px";
      overlay.style.borderRadius = "50%";
      overlay.style.width = "3.2vw";
      overlay.style.height = "3.2vw";
      overlay.style.opacity = "0";
      overlay.style.transition = "opacity 0.18s ease";
      wrapper.appendChild(overlay);

      wrapper.onmouseenter = () => overlay.style.opacity = "1";
      wrapper.onmouseleave = () => overlay.style.opacity = "0";
      // block click
      addServerBtn.onclick = (e) => { e.preventDefault(); /* do nothing for non-premium */ };
      return;
    }

    addServerBtn.onclick = () => {
      if (serverModal) serverModal.style.display = "block";
    };
  }

  // ---------- Join modal opening ----------
  if (joinServerBtn) joinServerBtn.onclick = () => { if (joinModal) joinModal.style.display = "block"; };

  // ---------- Close modals (X buttons) ----------
  document.querySelectorAll(".modal .close").forEach(btn => {
    btn.onclick = (e) => {
      const modal = e.target.closest(".modal");
      if (modal) modal.style.display = "none";
    };
  });

  // ---------- Image upload flow ----------
  // Logic: when user selects a file, start upload, show spinner, update hidden url, show preview, enable Create when done
  let uploadInProgress = false;

  function setCreateDisabled(disabled) {
    if (!createBtn) return;
    createBtn.disabled = !!disabled;
    createBtn.style.opacity = disabled ? "0.6" : "1";
    createBtn.style.cursor = disabled ? "not-allowed" : "pointer";
  }

if (serverFileInput) {
  serverFileInput.addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if (!file) {
      if (previewUI?.preview) previewUI.preview.style.display = "none";
      serverImageUrlInput.value = "";
      setCreateDisabled(false);
      return;
    }

    uploadInProgress = true;
    setCreateDisabled(true);

    if (previewUI?.spinner) previewUI.spinner.style.display = "inline-block";
    if (previewUI?.preview) previewUI.preview.style.display = "none";

    try {
      // convert file to Base64
      const base64Url = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = err => reject(err);
        reader.readAsDataURL(file);
      });

      serverImageUrlInput.value = base64Url;

      if (previewUI?.preview) {
        previewUI.preview.src = base64Url;
        previewUI.preview.style.display = "inline-block";
      }

      console.log("Converted to Base64 ✔");
    } catch (err) {
      console.error("Upload failed:", err);
      serverImageUrlInput.value = "";
      if (previewUI?.preview) previewUI.preview.style.display = "none";
    } finally {
      uploadInProgress = false;
      setCreateDisabled(false);
      if (previewUI?.spinner) previewUI.spinner.style.display = "none";
    }
  });
}

// ---------- Create Server ----------
if (createBtn) {
  createBtn.addEventListener("click", async (e) => {
    e.preventDefault();
    if (uploadInProgress) {
      alert("Please wait until the image finishes uploading.");
      return;
    }

    let name = serverNameInput ? serverNameInput.value.trim() : "";
    const password = serverPasswordInput ? serverPasswordInput.value.trim() : "";
    let imgUrl = serverImageUrlInput ? serverImageUrlInput.value : "";

    if (!name) return alert("Server name required.");

    // ---------- 10 CHARACTER LIMIT ----------
    if (name.length > 10) {
      return alert("Server name cannot exceed 10 characters.");
    }

    // ---------- BANNED WORD CHECK ----------
    const lowerName = name.toLowerCase();
    const foundBanned = bannedServerWords.find(word => lowerName.includes(word));
    if (foundBanned) {
      return alert(`Server name contains inappropriate word: "${foundBanned}"`);
    }

    // fallback if image missing or invalid
    if (!imgUrl || imgUrl.length < 8) {
      imgUrl = "../images/default-server.png";
    }

    try {
      // Replace '.' in server name for Firebase key safety
      const nameKey = name.replace(/\./g, "_");

      // Create server under its name as key
      const serverRef = firebase.database().ref(`servers/${nameKey}`);
      await serverRef.set({
        name,
        password: password || null,
        owner: currentUsername,
        imgUrl,          // Base64 string or default
        members: { [currentUsername]: true },
        createdAt: Date.now()
      });

      alert(`Server "${name}" created!`);

      // reset modal & fields
      if (serverModal) serverModal.style.display = "none";
      if (serverNameInput) serverNameInput.value = "";
      if (serverPasswordInput) serverPasswordInput.value = "";
      if (serverFileInput) serverFileInput.value = "";
      serverImageUrlInput.value = "";
      if (previewUI && previewUI.preview) {
        previewUI.preview.src = "";
        previewUI.preview.style.display = "none";
      }

      // refresh list
      await loadUserServers();
    } catch (err) {
      console.error("Create server failed:", err);
      alert("Could not create server: " + (err.message || err));
    }
  });
}



// ---------- Join Server ----------
if (joinConfirmBtn) {
  joinConfirmBtn.addEventListener("click", async (e) => {
    e.preventDefault();
    const name = joinNameInput ? joinNameInput.value.trim() : "";
    const password = joinPasswordInput ? joinPasswordInput.value.trim() : "";

    if (!name) return alert("Server name required.");

    try {
      const snapshot = await firebase.database().ref("servers").once("value");
      let foundKey = null;
      let foundServer = null;

      snapshot.forEach(s => {
        const v = s.val();
        if (v && v.name === name) {
          foundKey = s.key;
          foundServer = v;
        }
      });

      if (!foundKey) return alert("Server not found.");
      if (foundServer.password && foundServer.password !== password) return alert("Incorrect password.");

      // ---------- Prevent joining the same server twice ----------
      if (foundServer.members && foundServer.members[currentUsername]) {
        return alert(`You are already a member of "${name}".`);
      }

      await firebase.database().ref(`servers/${foundKey}/members/${currentUsername}`).set(true);

      alert(`Joined server "${name}"`);
      if (joinModal) joinModal.style.display = "none";
      if (joinNameInput) joinNameInput.value = "";
      if (joinPasswordInput) joinPasswordInput.value = "";
      await loadUserServers();
    } catch (err) {
      console.error("Join server failed:", err);
      alert("Could not join server: " + (err.message || err));
    }
  });
}


  // ---------- Load user's servers ----------
async function loadUserServers() {
  if (!serverListEl) return;
  try {
    // Clear previous server list to avoid duplicates
    serverListEl.innerHTML = "";

    const snap = await firebase.database().ref("servers").once("value");

    snap.forEach(child => {
      const server = child.val();
      const key = child.key;
      if (!server) return;

      // show only servers the user is a member of
      if (!server.members || !server.members[currentUsername]) return;

      const li = document.createElement("li");
      li.style.listStyle = "none";
      li.style.display = "flex";
      li.style.flexDirection = "column";
      li.style.alignItems = "center";
      li.style.justifyContent = "center";
      li.style.position = "relative";
      li.style.cursor = "pointer";
      li.style.width = "fit-content";
      li.style.marginBottom = "5px";

      const img = document.createElement("img");
      img.src = server.imgUrl || "../images/default-server.png";
      img.alt = server.name || "server";
      img.style.width = "3.2vw";
      img.style.height = "3.2vw";
      img.style.minWidth = "36px";
      img.style.minHeight = "36px";
      img.style.borderRadius = "10px";
      img.style.objectFit = "cover";
      img.style.transition = "transform 0.18s ease";
      li.appendChild(img);

      // hover name
      const nameDiv = document.createElement("div");
      nameDiv.textContent = server.name || "Unnamed";
      nameDiv.style.position = "absolute";
      nameDiv.style.fontSize = "10px";
      nameDiv.style.bottom = "-18px";
      nameDiv.style.left = "50%";
      nameDiv.style.transform = "translateX(-50%) translateY(0)";
      nameDiv.style.color = "#fff";
      nameDiv.style.opacity = "0";
      nameDiv.style.transition = "opacity 0.18s ease, transform 0.18s ease";
      li.appendChild(nameDiv);

      li.addEventListener("mouseenter", () => {
        nameDiv.style.opacity = "1";
        nameDiv.style.transform = "translateX(-50%) translateY(-10px)";
        img.style.transform = "translateY(-4px)";
      });
      li.addEventListener("mouseleave", () => {
        nameDiv.style.opacity = "0";
        nameDiv.style.transform = "translateX(-50%) translateY(0)";
        img.style.transform = "translateY(0)";
      });

      li.addEventListener("click", () => {
        openServerChat(key, server);
      });

      serverListEl.appendChild(li);
    });
  } catch (err) {
    console.error("loadUserServers failed:", err);
  }
}


  // simple placeholder for opening server chat

  // ---------- initialization ----------
  (async () => {
    await setupAddServerBtn();
    await loadUserServers();
  })();

})(); // end IIFE
