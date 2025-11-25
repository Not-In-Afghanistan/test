// ===== fh.js (CLEANED & FIXED) =====

// ----- Presence System (Fixed + Last Seen) -----
const presenceRef = firebase.database().ref(`presence/${currentUsername}`);
const connectedRef = firebase.database().ref(".info/connected");

// When user goes online
connectedRef.on("value", snap => {
  if (snap.val() === true) {
    presenceRef.onDisconnect().set({
      state: "offline",
      lastSeen: Date.now()
    });

    presenceRef.set({
      state: "online",
      lastSeen: Date.now()
    });
  }
});

// Mark user away / online when switching tabs
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    presenceRef.set({ state: "away", lastSeen: Date.now() });
  } else {
    presenceRef.set({ state: "online", lastSeen: Date.now() });
  }
});


// ----- DOM elements for sidebar chat -----
const friendListEl = document.getElementById('friend-list');
const chatArea = document.getElementById('main');
const yesChatEl = document.querySelector('#main .yes-chat');
let currentChatFriend = null;

// Keep a handle for the active chat firebase listener so we can detach it
let activeChatRef = null;
let activeChatChildAddedCallback = null;

function closeChat() {
  currentChatFriend = null;

  // remove active firebase listener if present
  if (activeChatRef && activeChatChildAddedCallback) {
    activeChatRef.off("child_added", activeChatChildAddedCallback);
    activeChatRef = null;
    activeChatChildAddedCallback = null;
  }

  // Hide chat UI
  const yesChatElLocal = document.querySelector('#main .yes-chat');
  const noChatEl = document.querySelector('#main .no-chat');

  if (yesChatElLocal) yesChatElLocal.innerHTML = "";
  if (noChatEl) noChatEl.style.display = "block";

  console.log("Chat closed.");
}


// ----- Load friends into sidebar (with unread badges and rings) -----
function loadFriendsSidebar() {
  if (!friendListEl) return;
  friendListEl.innerHTML = '';

  usersRefCurrentUser.child('friends').once('value')
    .then(snapshot => {
      if (!snapshot.exists()) {
        const li = document.createElement('li');
        li.textContent = "No friends yet.";
        li.classList.add('friend-item');
        friendListEl.appendChild(li);
        return;
      }

      snapshot.forEach(friendSnap => {
        const friend = friendSnap.key;

        const li = document.createElement('li');
        li.classList.add('friend-item');

        // ----- LEFT SIDE -----
        const leftBox = document.createElement('div');
        leftBox.style.display = "flex";
        leftBox.style.alignItems = "center";
        leftBox.style.gap = "10px";

        // ----- PFP CONTAINER -----
        const pfpContainer = document.createElement('div');
        pfpContainer.style.position = 'relative'; // needed for badge & ring

        const pfp = document.createElement('img');
        pfp.classList.add('chat-pfp');
        pfp.style.border = "3px solid gray"; // default offline
        pfp.style.width = "50px";
        pfp.style.height = "50px";
        pfp.style.borderRadius = "50%";
        pfp.style.objectFit = "cover";

        // Load profile picture
        firebase.database().ref(`users/${friend}/pfpUrl`).once('value')
          .then(snap => { pfp.src = snap.exists() ? snap.val() : '../images/default-pfp.png'; })
          .catch(() => { pfp.src = '../images/default-pfp.png'; });

        pfpContainer.appendChild(pfp);
        leftBox.appendChild(pfpContainer);

        // ----- STATUS RING (real-time) -----
        firebase.database().ref(`presence/${friend}/state`).on('value', stateSnap => {
          const state = stateSnap.val();
          if (state === "online") pfp.style.border = "3px solid limegreen";
          else if (state === "away") pfp.style.border = "3px solid yellow";
          else pfp.style.border = "3px solid gray";
        });

        // ----- RING OVERLAY (one-time load) -----
        firebase.database().ref(`users/${friend}/ringcover`).once('value')
          .then(snap => {
            const ringFile = snap.exists() ? snap.val() : null;
            if (!ringFile) return;

            const ringDiv = document.createElement('div');
            ringDiv.classList.add('pfp-ring-wrapper');
            ringDiv.style.position = 'absolute';
            ringDiv.style.top = '-5px';
            ringDiv.style.left = '-5px';
            ringDiv.style.width = '60px';
            ringDiv.style.height = '60px';
            ringDiv.style.pointerEvents = 'none';
            ringDiv.style.opacity = '0.5';
            ringDiv.style.zIndex = '5';

            const ringImg = document.createElement('img');
            ringImg.src = ringFile.startsWith('http') ? ringFile : `../profileRings/${ringFile}`;
            ringImg.style.width = '100%';
            ringImg.style.height = '100%';
            ringImg.style.borderRadius = '50%';
            ringImg.style.objectFit = 'cover';
            ringImg.style.pointerEvents = 'none';

            ringDiv.appendChild(ringImg);
            pfpContainer.appendChild(ringDiv);
          })
          .catch(err => console.error("Failed to load ring overlay:", err));

        // ----- UNREAD BADGE -----
        async function updateUnreadBadge() {
          const chatId = [currentUsername, friend].sort().join('_');
          const lastSeenSnap = await firebase.database().ref(`chatLastSeen/${currentUsername}/${chatId}`).once('value');
          const lastSeen = lastSeenSnap.exists() ? lastSeenSnap.val() : 0;

          const messagesSnap = await firebase.database().ref(`chats/${chatId}`).once('value');
          let unreadCount = 0;
          if (messagesSnap.exists()) {
            messagesSnap.forEach(msgSnap => {
              const msg = msgSnap.val();
              if (msg.sender !== currentUsername && msg.timestamp > lastSeen) unreadCount++;
            });
          }

          // Remove old badge
          const oldBadge = pfpContainer.querySelector('.unread-badge');
          if (oldBadge) oldBadge.remove();

          // Hide badge if chat with friend is currently open
          if (currentChatFriend === friend) return;

          if (unreadCount > 0) {
            const badge = document.createElement('span');
            badge.className = 'unread-badge';
            badge.textContent = unreadCount;
            badge.style.position = 'absolute';
            badge.style.bottom = '5px';
            badge.style.right = '5px';
            badge.style.backgroundColor = '#00bfffff';
            badge.style.color = 'white';
            badge.style.borderRadius = '50%';
            badge.style.padding = '2px 6px';
            badge.style.fontSize = '12px';
            badge.style.fontWeight = 'bold';
            badge.style.transform = 'translate(25%, 25%)';
            badge.style.pointerEvents = 'none';
            badge.style.zIndex = '11';
            pfpContainer.appendChild(badge);
          }
        }

        // Initial badge render + live update for newly added messages
        updateUnreadBadge();
        firebase.database().ref(`chats/${[currentUsername, friend].sort().join('_')}`).on('child_added', updateUnreadBadge);

        // Reset badge when opening chat
        li.addEventListener('click', () => {
          const chatId = [currentUsername, friend].sort().join('_');
          firebase.database().ref(`chatLastSeen/${currentUsername}/${chatId}`).set(Date.now());
          updateUnreadBadge();
        });

        // ----- NAME BOX -----
        const nameBox = document.createElement('div');
        const displayEl = document.createElement('div');
        displayEl.classList.add('friend-display');
        displayEl.textContent = friend;

        firebase.database().ref(`users/${friend}/displayName`).once('value')
          .then(snap => { if (snap.exists()) displayEl.textContent = snap.val(); });

        const handleEl = document.createElement('div');
        handleEl.classList.add('friend-handle');
        handleEl.textContent = '@' + friend;

        nameBox.appendChild(displayEl);
        nameBox.appendChild(handleEl);

        // Append nameBox after PFP container
        leftBox.appendChild(nameBox);
        li.appendChild(leftBox);

        // ----- RIGHT BUTTONS -----
        const btnContainer = document.createElement('div');
        btnContainer.classList.add('friend-buttons');

        const optBtn = document.createElement('button');
        optBtn.innerHTML = '⋮';
        optBtn.addEventListener('click', (e) => {
          e.stopPropagation(); // prevents li click
          openFriendOptions(friend);
        });

        li.addEventListener('click', () => {
          openChat(friend);
          const chatId = [currentUsername, friend].sort().join('_');
          firebase.database().ref(`chatLastSeen/${currentUsername}/${chatId}`).set(Date.now());
          updateUnreadBadge();
        });

        btnContainer.appendChild(optBtn);
        li.appendChild(btnContainer);

        friendListEl.appendChild(li);
      });
    })
    .catch(err => console.error("Failed loading sidebar friends:", err));
}


// ----- Format timestamps for messages -----
function formatMessageTime(timestamp) {
  const now = new Date();
  const msgDate = new Date(timestamp);

  const timeString = msgDate.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

  // Compare only the date parts
  const nowDateOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const msgDateOnly = new Date(msgDate.getFullYear(), msgDate.getMonth(), msgDate.getDate());

  const diffMs = nowDateOnly - msgDateOnly;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return `Today at ${timeString}`;
  if (diffDays === 1) return `Yesterday at ${timeString}`;
  if (diffDays <= 7) return `${diffDays} days ago at ${timeString}`;

  return msgDate.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" }) +
         ` at ${timeString}`;
}


// ----- Open chat with a friend -----
// NOTE: this function creates DOM for the chat and sets up live listeners
function openChat(friend) {
  // Detach any previous chat listener
  if (activeChatRef && activeChatChildAddedCallback) {
    activeChatRef.off("child_added", activeChatChildAddedCallback);
  }

  currentChatFriend = friend;

  // Hide welcome message
  const noChatEl = document.querySelector('#main .no-chat');
  if (noChatEl) noChatEl.style.display = 'none';
  if (!yesChatEl) {
    console.error("yesChatEl not found.");
    return;
  }

  yesChatEl.innerHTML = `
      <div class="chat-head">
        <img id="chatPfp" class="chat-pfp" src="../images/default-pfp.png">
        <div>
          <h4 id="chatTitle">${friend}</h4>
          <h2 id="lastSeen" style="font-size:12px;margin:0;color:#777;">loading...</h2>
        </div>
      </div>
      <ul id="chat-messages"></ul>
      <div id="chat-form">
        <input type="text" id="chat-input" placeholder="Type a message...">
        <button id="gif-btn">GIF</button>
        <button id="chat-send">Send</button>
        <button id="upImgBtn">Upload Image</button>
      </div>

      <!-- GIF modal skeleton (should exist in your HTML or appended here) -->
      <div id="gif-modal" class="gif-modal" style="display:none">
        <div id="gif-modal-inner" class="gif-modal-inner"></div>
      </div>
  `;

  // After injecting HTML, locate elements
  const lastSeenEl = document.getElementById("lastSeen");
  const chatPfp = document.getElementById("chatPfp");
  const chatMessages = document.getElementById('chat-messages');
  const chatInput = document.getElementById('chat-input');
  const chatSend = document.getElementById('chat-send');

  const gifModal = document.getElementById("gif-modal");
  const gifModalInner = document.getElementById("gif-modal-inner");

  // tiny guards
  if (!chatMessages || !chatInput || !chatSend) {
    console.error("chat DOM elements missing after render.");
    return;
  }

  // Listen to presence state
  firebase.database().ref(`presence/${friend}`).on("value", snap => {
    const data = snap.val() || {};
    const state = data.state || "offline";
    const timestamp = data.lastSeen || null;

    if (state === "online") {
      lastSeenEl.textContent = "online now";
    } else if (timestamp) {
      const date = new Date(timestamp);
      const now = Date.now();
      const diff = Math.floor((now - date) / 1000); // seconds

      if (diff < 60) lastSeenEl.textContent = `last seen ${diff}s ago`;
      else if (diff < 3600) lastSeenEl.textContent = `last seen ${Math.floor(diff / 60)}m ago`;
      else if (diff < 86400) lastSeenEl.textContent = `last seen ${Math.floor(diff / 3600)}h ago`;
      else lastSeenEl.textContent = `last seen on ${date.toLocaleDateString()}`;
    } else {
      lastSeenEl.textContent = "last seen: unknown";
    }
  });

  // Load friend's PFP
  firebase.database().ref(`users/${friend}/pfpUrl`).once('value')
    .then(snap => {
      if (chatPfp) chatPfp.src = snap.exists() ? snap.val() : "../images/default-pfp.png";
    })
    .catch(() => { if (chatPfp) chatPfp.src = "../images/default-pfp.png"; });

  // Reference to chat path
  const chatId = [currentUsername, friend].sort().join('_');
  const chatRef = firebase.database().ref(`chats/${chatId}`);

// Utility: render a single message (ensure id is used to prevent duplicates)
function renderMessage(msg, id) {
  // Avoid duplicates
  if (document.querySelector(`#chat-messages li[data-id="${id}"]`)) return;

  const li = document.createElement('li');
  li.setAttribute('data-id', id);
  li.setAttribute('data-timestamp', msg.timestamp || 0);
  li.classList.add('message', msg.sender === currentUsername ? 'user' : 'friend');
  li.style.display = 'flex';
  li.style.alignItems = 'flex-start';
  li.style.marginBottom = '8px';

  // Create PFP element
  const pfp = document.createElement('img');
  pfp.style.width = '55px';
  pfp.style.height = '55px';
  pfp.style.borderRadius = '50%';
  pfp.style.marginRight = '10px';
  pfp.style.objectFit = 'cover';
  pfp.src = '../images/default-pfp.png'; // fallback immediately

  // Fetch PFP URL
  firebase.database().ref(`users/${msg.sender}/pfpUrl`).once('value')
    .then(snap => { if (snap.exists()) pfp.src = snap.val(); });

  // Container for PFP + ring
  const wrapper = document.createElement('div');
  wrapper.style.position = 'relative';
  wrapper.style.width = '65px';
  wrapper.style.height = '65px';
  wrapper.style.marginRight = '10px';
  wrapper.appendChild(pfp);

  // Fetch ring cover (optional)
  firebase.database().ref(`users/${msg.sender}/ringcover`).once('value')
    .then(ringSnap => {
      const ringFile = ringSnap.exists() ? ringSnap.val() : null;
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
      ringImg.style.pointerEvents = 'none';

      ringDiv.appendChild(ringImg);
      wrapper.appendChild(ringDiv);
    })
    .catch(() => {
      // Fail silently, PFP still shows
    });

  // Message content
  const content = document.createElement('div');
  content.style.display = 'flex';
  content.style.flexDirection = 'column';
  content.style.maxWidth = '70%';

  const nameSpan = document.createElement('div');
  nameSpan.style.fontWeight = 'bold';
  nameSpan.style.color = '#fff';
  nameSpan.style.fontSize = '14px';
  nameSpan.style.marginBottom = '2px';
  firebase.database().ref(`users/${msg.sender}/displayName`).once('value')
    .then(snap => { nameSpan.textContent = snap.exists() ? snap.val() : msg.sender; })
    .catch(() => { nameSpan.textContent = msg.sender; });

  const timeSpan = document.createElement('div');
  timeSpan.textContent = formatMessageTime(msg.timestamp);
  timeSpan.style.fontSize = '10px';
  timeSpan.style.color = '#b9bbbe';
  timeSpan.style.marginBottom = '2px';

  const textDiv = document.createElement('div');
  textDiv.textContent = msg.text || '';
  textDiv.style.padding = '8px';
  textDiv.style.borderRadius = '8px';
  textDiv.style.background = msg.sender === currentUsername ? '#5865f2' : '#3a3a3a';
  textDiv.style.color = 'white';
  textDiv.style.wordWrap = 'break-word';

  content.appendChild(nameSpan);
  content.appendChild(timeSpan);
  if (msg.text) content.appendChild(textDiv);

  // GIF support
  if (msg.gif) {
    const gifImg = document.createElement('img');
    gifImg.src = msg.gif;
    gifImg.style.maxWidth = '200px';
    gifImg.style.borderRadius = '8px';
    gifImg.style.marginTop = '4px';
    content.appendChild(gifImg);
  }

  li.appendChild(wrapper);
  li.appendChild(content);
  chatMessages.appendChild(li);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// end renderMessage


// ----- 1) Load existing messages in chronological order -----
chatRef.once('value').then(snapshot => {
  chatMessages.innerHTML = ''; // clear previous
  const messages = [];

  snapshot.forEach(msgSnap => {
    const msg = msgSnap.val();
    messages.push({
      id: msgSnap.key,
      sender: msg.sender,
      text: msg.text || '',
      gif: msg.gif || null,
      timestamp: msg.timestamp || 0
    });
  });

  // Sort messages by timestamp ascending
  messages.sort((a, b) => a.timestamp - b.timestamp);

  messages.forEach(msg => renderMessage(msg, msg.id));

  // Scroll to bottom after load
  chatMessages.scrollTop = chatMessages.scrollHeight;
});

// ----- 2) Real-time listener for new messages -----
chatRef.orderByChild('timestamp').on('child_added', snap => {
  const msg = snap.val();
  const msgData = {
    id: snap.key,
    sender: msg.sender,
    text: msg.text || '',
    gif: msg.gif || null,
    timestamp: msg.timestamp || 0
  };

  // Skip duplicates
  if (document.querySelector(`#chat-messages li[data-id="${msgData.id}"]`)) return;

  insertMessageSorted(msgData);
});

// ----- Helper: insert message in chronological order -----
function insertMessageSorted(msg) {
  const tempContainer = document.createElement('div');
  renderMessage(msg, msg.id, tempContainer); // render into temp container
  const newLi = tempContainer.firstElementChild;
  if (!newLi) return;

  const allMessages = Array.from(chatMessages.children);
  let inserted = false;

  for (let li of allMessages) {
    const ts = parseInt(li.dataset.timestamp || '0', 10);
    if (msg.timestamp < ts) {
      chatMessages.insertBefore(newLi, li);
      inserted = true;
      break;
    }
  }

  if (!inserted) chatMessages.appendChild(newLi);

  chatMessages.scrollTop = chatMessages.scrollHeight;
}

  // ----- 3) Send new message -----
  const bannedWords = ["fuck","shit","bitch","asshole","cunt","nigger","faggot","dick","cock","pussy",
        "nigga","slut","whore","bastard","penis","vagina","sex","rape","kill","suicide",
        "cum","boob","boobs","fag","retard","jerk","porn","horny","gay","lesbian","femboy","ass","kkk","dildo"];

  // remove previous event listeners if any (guard)
  chatSend.onclick = null;
  chatInput.onkeypress = null;

  chatSend.addEventListener('click', () => {
    const text = chatInput.value.trim().toLowerCase();

    // --- CENSORSHIP CHECK ---
    let containsBanned = bannedWords.some(w => text.includes(w));
    if (containsBanned) {
      chatInput.value = "";
      chatInput.placeholder = "⚠️ Message blocked: inappropriate language";
      chatInput.style.setProperty("color", "white", "important");

      setTimeout(() => {
        chatInput.placeholder = "Type a message...";
        chatInput.style.color = "";
      }, 2000);

      return; // STOP MESSAGE FROM SENDING
    }

    // --- SEND MESSAGE (SAFE TEXT) ---
    if (!chatInput.value.trim()) return;
    chatRef.push({
      sender: currentUsername,
      text: chatInput.value.trim(),
      timestamp: firebase.database.ServerValue.TIMESTAMP
    });
    chatInput.value = '';
  });

  chatInput.addEventListener('keypress', e => {
    if (e.key === 'Enter') chatSend.click();
  });

  // Initialize GIF system for this chat (wires gif button, modal, search)
  initGifSystemForChat({
    gifButtonEl: document.getElementById("gif-btn"),
    gifModalEl: gifModal,
    gifModalInnerEl: gifModalInner,
    gifResultsTargetEl: gifModalInner // will populate search UI inside inner
  });
} // end openChat


// ======================
// GIF + PREMIUM system (scoped helpers)
// ======================

const TENOR_KEY = "LIVDSRZULELA"; // public demo key (keep or replace with your own)

// Global premium check
async function isPremium(user) {
  const snap = await firebase.database().ref(`premium/${user}`).once('value');
  if (!snap.exists()) return false;
  const expires = snap.val().expires || 0;
  return Date.now() < expires;
}

// Start gif cooldown (creates/updates gifTimeouts/<user>)
function startGifCooldown(user, seconds = 25) {
  const timeoutRef = firebase.database().ref(`gifTimeouts/${user}`);
  const expiresAt = Date.now() + seconds * 1000;
  timeoutRef.set(expiresAt);

  // Update any gif button labels globally if present
  const btn = document.getElementById("gif-btn");
  if (btn) btn.disabled = true;

  const interval = setInterval(async () => {
    const snap = await timeoutRef.once('value');
    const ts = snap.val();

    if (!ts || Date.now() >= ts) {
      clearInterval(interval);
      if (btn) {
        btn.disabled = false;
        btn.textContent = "GIF";
      }
      timeoutRef.remove();
      return;
    }

    if (btn) btn.textContent = `GIF (${Math.ceil((ts - Date.now()) / 1000)}s)`;
  }, 500);
}

// Initialize GIF system for the currently open chat
// Accepts DOM elements to wire up (keeps code modular and safe)
function initGifSystemForChat({ gifButtonEl, gifModalEl, gifModalInnerEl, gifResultsTargetEl }) {
  if (!gifButtonEl || !gifModalEl || !gifModalInnerEl) {
    // elements missing — don't crash
    return;
  }

  // Ensure modal inner has the search UI (we build a small search box + results container)
  gifModalInnerEl.innerHTML = `
    <div class="gif-ui" style="padding:10px; max-width:520px;">
      <input id="gif-search" placeholder="Search GIFs..." style="width:100%; padding:8px; margin-bottom:8px;" />
      <div id="gif-results" style="display:flex; flex-wrap:wrap;"></div>
    </div>
  `;
  const gifSearchEl = document.getElementById("gif-search");
  const gifResultsEl = document.getElementById("gif-results");

  // Modal show/hide helpers
  function showModal() {
    gifModalEl.style.display = "block";
    // small CSS class for visual state if you use it
    gifModalEl.classList.add("show");
  }
  function hideModal() {
    gifModalEl.style.display = "none";
    gifModalEl.classList.remove("show");
  }
  function toggleModal() {
    if (gifModalEl.style.display === "block") hideModal();
    else showModal();
  }

  // Send gif message function (uses currentChatFriend)
  async function sendGifMessage(url) {
    if (!currentChatFriend || !url) return;
    const premium = await isPremium(currentUsername);
    const timeoutSnap = await firebase.database().ref(`gifTimeouts/${currentUsername}`).once('value');

    if (!premium && timeoutSnap.exists()) {
      // blocked by cooldown
      return;
    }

    const chatId = [currentUsername, currentChatFriend].sort().join("_");
    firebase.database().ref(`chats/${chatId}`).push({
      sender: currentUsername,
      gif: url,
      timestamp: firebase.database.ServerValue.TIMESTAMP
    });

    if (!premium) startGifCooldown(currentUsername, 25);
    hideModal();
  }

  // Click handler for GIF button
  gifButtonEl.onclick = async (e) => {
    e.stopPropagation();
    const premium = await isPremium(currentUsername);
    const timeoutSnap = await firebase.database().ref(`gifTimeouts/${currentUsername}`).once('value');

    if (!premium && timeoutSnap.exists()) {
      const left = Math.ceil((timeoutSnap.val() - Date.now()) / 1000);
      gifButtonEl.textContent = `GIF (${left}s)`;
      return;
    }
    toggleModal();
  };

  // Restore cooldown display if any
  firebase.database().ref(`gifTimeouts/${currentUsername}`).once('value').then(snap => {
    if (snap.exists()) {
      const left = Math.ceil((snap.val() - Date.now()) / 1000);
      if (left > 0) startGifCooldown(currentUsername, left);
    }
  });

// Tenor search wiring with debounce
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
      const limit = premium ? 30 : 4; // 5 for free, 30 for premium

      const res = await fetch(`https://api.tenor.com/v1/search?q=${encodeURIComponent(query)}&key=${TENOR_KEY}&limit=${limit}`);
      if (!res.ok) throw new Error(res.statusText);

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
        img.onclick = () => sendGifMessage(url);

        gifResultsEl.appendChild(img);
      });
    } catch (err) {
      console.error("Tenor search error:", err);
      gifResultsEl.innerHTML = "<p style='color:red'>Error fetching GIFs</p>";
    }
  }, 300);
};

  // Click outside modal to close
  gifModalEl.onclick = (e) => {
    if (e.target === gifModalEl) hideModal();
  };
  // Prevent inner clicks from bubbling out
  gifModalInnerEl.onclick = (e) => e.stopPropagation();

  // Expose a global toggle (used by older code paths that call toggleGifModal())
  window.toggleGifModal = () => {
    toggleModal();
  };
}






async function setupUploadButton() {
  const waitForButton = () => new Promise(resolve => {
    const interval = setInterval(() => {
      const btn = document.getElementById("upImgBtn");
      if (btn) {
        clearInterval(interval);
        resolve(btn);
      }
    }, 50);
  });

  const upImgBtn = await waitForButton();

  // Wrap button
  const wrapper = document.createElement("div");
  wrapper.style.position = "relative";
  upImgBtn.parentNode.insertBefore(wrapper, upImgBtn);
  wrapper.appendChild(upImgBtn);

  const premium = await isPremium(currentUsername);

  if (!premium) {
    // Overlay
    const overlay = document.createElement("div");
    overlay.textContent = "Premium Only";
    overlay.style.position = "absolute";
    overlay.style.inset = "0";
    overlay.style.background = "rgba(0,0,0,0.6)";
    overlay.style.color = "#fff";
    overlay.style.display = "flex";
    overlay.style.justifyContent = "center";
    overlay.style.alignItems = "center";
    overlay.style.fontWeight = "bold";
    overlay.style.cursor = "not-allowed";
    overlay.style.borderRadius = "4px";
    wrapper.appendChild(overlay);
    return;
  }

  // Premium upload
  upImgBtn.onclick = () => {
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = "image/*";

    fileInput.onchange = (evt) => {
      const file = evt.target.files[0];
      if (!file) return;

      // Convert to Base64 (no CORS, no Firebase Storage)
      const reader = new FileReader();
      reader.onload = function () {
        const imageData = reader.result;

        const chatId = [currentUsername, currentChatFriend].sort().join("_");

        firebase.database().ref(`chats/${chatId}`).push({
          sender: currentUsername,
          imageBase64: imageData,
          timestamp: firebase.database.ServerValue.TIMESTAMP
        });
      };

      reader.readAsDataURL(file); // -> converts to Base64
    };

    fileInput.click();
  };
}

setupUploadButton();













// ----- Watch for friend removals (close chat if missing) -----
firebase.database().ref(`users/${currentUsername}/friends`).on('value', (snap) => {
  const newList = snap.exists() ? Object.keys(snap.val()) : [];

  if (currentChatFriend && !newList.includes(currentChatFriend)) {
    console.log("[Friend removed] Closing chat with:", currentChatFriend);
    closeChat();
  }
});

// ----- Initial load: sidebar friends -----
usersRefCurrentUser.child('friends').on('value', loadFriendsSidebar);
