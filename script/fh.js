// ----- DOM elements for sidebar chat -----
const friendListEl = document.getElementById('friend-list');
const chatArea = document.getElementById('main');
const yesChatEl = document.querySelector('#main .yes-chat');
let currentChatFriend = null;

// ----- Load friends into sidebar -----
function loadFriendsSidebar() {
  if (!friendListEl) return;

  friendListEl.innerHTML = ''; // clear previous list

  // Get friends from Firebase
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

        // Friend name
        // Create profile picture element
        const pfp = document.createElement('img');
        pfp.style.width = '36px';
        pfp.style.height = '36px';
        pfp.style.borderRadius = '50%';
        pfp.style.objectFit = 'cover';

        // Get profile picture WITHOUT using await (no async needed)
        firebase.database().ref(`users/${friend}/pfpUrl`).once('value')
          .then(snapshot => {
            pfp.src = snapshot.exists() ? snapshot.val() : '../images/default-pfp.png';
          })
          .catch(() => {
            pfp.src = '../images/default-pfp.png';
          });
        
        // Add PFP to list item BEFORE the name
        li.appendChild(pfp);

        const nameSpan = document.createElement('span');
        nameSpan.textContent = friend;
        nameSpan.classList.add('friend-name'); 
        li.appendChild(nameSpan);

        // Buttons container
        const btnContainer = document.createElement('div');
        btnContainer.classList.add('friend-buttons');

        // Message button
        const msgBtn = document.createElement('button');
        msgBtn.innerHTML = '💬'; // icon
        msgBtn.classList.add('message-btn');
        msgBtn.addEventListener('click', () => openChat(friend));

        // Options button (placeholder)
        const optBtn = document.createElement('button');
        optBtn.innerHTML = '☰';
        optBtn.classList.add('options-btn');

        btnContainer.appendChild(msgBtn);
        btnContainer.appendChild(optBtn);
        li.appendChild(btnContainer);

        friendListEl.appendChild(li);
      });
    })
    .catch(err => console.error("Failed loading sidebar friends:", err));
}










// ----- Open chat with a friend -----

function openChat(friend) {
  currentChatFriend = friend;

  function formatMessageTime(timestamp) {
    const now = new Date();
    const msgDate = new Date(timestamp);

    const timeString = msgDate.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
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

  document.querySelector('#main .no-chat').style.display = 'none';
  yesChatEl.innerHTML = `
    <h3>Chat with ${friend}</h3>
    <ul id="chat-messages"></ul>
    <div id="chat-form">
      <input type="text" id="chat-input" placeholder="Type a message...">
      <button id="chat-send">Send</button>
    </div>
  `;

  const chatMessages = document.getElementById('chat-messages');
  const chatInput = document.getElementById('chat-input');
  const chatSend = document.getElementById('chat-send');

  const chatRef = firebase.database().ref(`chats/${[currentUsername, friend].sort().join('_')}`);
  chatRef.off();

  // Fetch all messages once and render sorted
  chatRef.once('value', async snapshot => {
    const messages = [];
    snapshot.forEach(child => {
      const msg = child.val();
      msg.key = child.key;
      messages.push(msg);
    });

    messages.sort((a, b) => a.timestamp - b.timestamp);

    for (const msg of messages) {
      renderMessage(msg);
    }

    chatMessages.scrollTop = chatMessages.scrollHeight;
  });

  // Listen for new messages after initial load
  chatRef.orderByChild('timestamp').limitToLast(1).on('child_added', snap => {
    const msg = snap.val();
    // Avoid re-rendering messages already loaded
    if (chatMessages.querySelector(`#msg-${snap.key}`)) return;
    renderMessage(msg, snap.key);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  });

  function renderMessage(msg, key) {
    const li = document.createElement('li');
    if (key) li.id = `msg-${key}`;
    li.classList.add('message', msg.sender === currentUsername ? 'user' : 'friend');
    li.style.display = 'flex';
    li.style.alignItems = 'flex-start';
    li.style.marginBottom = '8px';

    const pfp = document.createElement('img');
    pfp.style.width = '36px';
    pfp.style.height = '36px';
    pfp.style.borderRadius = '50%';
    pfp.style.marginRight = '10px';
    pfp.style.objectFit = 'cover';

    firebase.database().ref(`users/${msg.sender}/pfpUrl`).once('value')
      .then(pfpSnap => {
        pfp.src = pfpSnap.exists() ? pfpSnap.val() : '../images/default-pfp.png';
      }).catch(() => pfp.src = '../images/default-pfp.png');

    const content = document.createElement('div');
    content.style.display = 'flex';
    content.style.flexDirection = 'column';
    content.style.maxWidth = '70%';

    firebase.database().ref(`users/${msg.sender}/displayName`).once('value')
      .then(snapshot => {
        const displayName = snapshot.exists() ? snapshot.val() : msg.sender;
        const nameSpan = document.createElement('div');
        nameSpan.textContent = displayName;
        nameSpan.style.fontWeight = 'bold';
        nameSpan.style.color = '#fff';
        nameSpan.style.fontSize = '14px';
        nameSpan.style.marginBottom = '2px';

        const timeSpan = document.createElement('div');
        timeSpan.textContent = formatMessageTime(msg.timestamp);
        timeSpan.style.fontSize = '10px';
        timeSpan.style.color = '#b9bbbe';
        timeSpan.style.marginBottom = '2px';

        const textDiv = document.createElement('div');
        textDiv.textContent = msg.text;
        textDiv.style.padding = '8px';
        textDiv.style.borderRadius = '8px';
        textDiv.style.background = msg.sender === currentUsername ? '#5865f2' : '#3a3a3a';
        textDiv.style.color = 'white';
        textDiv.style.wordWrap = 'break-word';

        content.appendChild(nameSpan);
        content.appendChild(timeSpan);
        content.appendChild(textDiv);

        li.appendChild(pfp);
        li.appendChild(content);

        chatMessages.appendChild(li);
      }).catch(() => {
        // fallback in case displayName fetch fails
        const nameSpan = document.createElement('div');
        nameSpan.textContent = msg.sender;
        nameSpan.style.fontWeight = 'bold';
        nameSpan.style.color = '#fff';
        nameSpan.style.fontSize = '14px';
        nameSpan.style.marginBottom = '2px';

        const timeSpan = document.createElement('div');
        timeSpan.textContent = formatMessageTime(msg.timestamp);
        timeSpan.style.fontSize = '10px';
        timeSpan.style.color = '#b9bbbe';
        timeSpan.style.marginBottom = '2px';

        const textDiv = document.createElement('div');
        textDiv.textContent = msg.text;
        textDiv.style.padding = '8px';
        textDiv.style.borderRadius = '8px';
        textDiv.style.background = msg.sender === currentUsername ? '#5865f2' : '#3a3a3a';
        textDiv.style.color = 'white';
        textDiv.style.wordWrap = 'break-word';

        content.appendChild(nameSpan);
        content.appendChild(timeSpan);
        content.appendChild(textDiv);

        li.appendChild(pfp);
        li.appendChild(content);

        chatMessages.appendChild(li);
      });
  }

  // Send message
  chatSend.addEventListener('click', () => {
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
}




// ----- Initial load -----


// Optional: refresh sidebar live if friends list changes
usersRefCurrentUser.child('friends').on('value', loadFriendsSidebar);
