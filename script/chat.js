/* chat.js — cleaned, merged, and commented */

// ----- LocalStorage login check -----
// Get logged-in username from localStorage; redirect if missing.
const currentUsername = localStorage.getItem("currentUser"); 
if (!currentUsername) {
  window.location.href = "index.html";
  throw new Error("Not logged in"); // stop script if not logged in
}

// ----- DOM elements (cached) -----
// Header display element for the current user's display name
const currentUserNameEl = document.getElementById('current-user-name');
// Find Friends modal elements
const findFriendsBtn = document.getElementById('btn');
const findFriendsModal = document.getElementById('find-friends-modal');
const friendSearch = document.getElementById('friend-search');
const friendResults = document.getElementById('friend-results');
const findFriendsClose = findFriendsModal?.querySelector('.close');
// Inbox modal elements
const inboxBtn = document.getElementById("inbox-btn");
const inboxModal = document.getElementById("inbox-modal");
const inboxList = document.getElementById("inbox-list");
const inboxClose = inboxModal?.querySelector(".close");

// ----- Firebase refs -----
// Reference to this user's node (for friends/inbox)
const usersRefCurrentUser = firebase.database().ref('users/' + currentUsername);
// Reference to all users (for searching)
const allUsersRef = firebase.database().ref('users');


// ----- Initialize header display name -----
// Load this user's displayName from DB and show it in the header.
usersRefCurrentUser.once('value').then(snapshot => {
  const displayName = snapshot.val()?.displayName || currentUsername;
  if (currentUserNameEl) currentUserNameEl.textContent = ` ${displayName}`; // set header
}).catch(err => console.error("Failed loading display name:", err));
// When user is logged in or when the dash loads

// ----- Find Friends modal open/close handlers -----
if (findFriendsBtn) {
  findFriendsBtn.addEventListener('click', () => {
    if (!findFriendsModal) return;
    findFriendsModal.style.display = 'block';

    if (friendSearch) friendSearch.value = '';
    if (friendResults) friendResults.innerHTML = '';

    updateFriendResults(''); // show all initially
  });
}

if (findFriendsClose) {
  findFriendsClose.addEventListener('click', () => {
    findFriendsModal.style.display = 'none';
  });
}

window.addEventListener('click', (e) => {
  if (e.target === findFriendsModal) findFriendsModal.style.display = 'none';
});


// ----- Relationship Status Checker -----
function getRelationshipStatusWith(username) {
  const friendPath = `users/${currentUsername}/friends/${username}`;
  const inboxPath = `users/${username}/inbox/requests/${currentUsername}`;

  const p1 = firebase.database().ref(friendPath).once('value');
  const p2 = firebase.database().ref(inboxPath).once('value');

  return Promise.all([p1, p2]).then(([fSnap, iSnap]) => ({
    isFriend: fSnap.exists() && !!fSnap.val(),
    hasPendingRequest: iSnap.exists() && iSnap.val() === "pending"
  }));
}


// ----- MAIN: Update Friend Results (search + render + PFP) -----
function updateFriendResults(query) {
  if (!friendResults) return;
  friendResults.innerHTML = '';

  allUsersRef.once('value').then(snapshot => {
    let index = 0;

    snapshot.forEach(childSnap => {
      const username = childSnap.key;
      const val = childSnap.val() || {};

      // Skip yourself
      if (username === currentUsername) return;

      // Query filter
      if (!username.toLowerCase().includes((query || '').toLowerCase())) return;

      const displayName = val.displayName || username;
      const pfpUrl = val.pfpUrl || "../images/default-pfp.png";

      // --- LIST ITEM CONTAINER ---
      const li = document.createElement('li');
      li.style.display = 'flex';
      li.style.alignItems = 'center';
      li.style.justifyContent = 'space-between';
      li.style.padding = '8px 10px';
      li.style.borderRadius = '6px';
      li.style.marginBottom = '6px';
      li.style.backgroundColor = (index % 2 === 0) ? '#2e2e2e' : '#444';
      index++;

      // --- LEFT SECTION (pfp + names) ---
      const left = document.createElement('div');
      left.style.display = 'flex';
      left.style.alignItems = 'center';
      left.style.gap = '10px';

      const img = document.createElement('img');
      img.src = pfpUrl;
      img.onerror = () => img.src = "../images/default-pfp.png";
      img.style.width = '40px';
      img.style.height = '40px';
      img.style.borderRadius = '50%';
      img.style.objectFit = 'cover';

      const nameBox = document.createElement('div');
      nameBox.style.display = 'flex';
      nameBox.style.flexDirection = 'column';

      const topName = document.createElement('span');
      topName.textContent = displayName;
      topName.style.color = 'white';
      topName.style.fontSize = '15px';

      const userTag = document.createElement('span');
      userTag.textContent = '@' + username;
      userTag.style.color = '#aaa';
      userTag.style.fontSize = '11px';

      nameBox.appendChild(topName);
      nameBox.appendChild(userTag);

      left.appendChild(img);
      left.appendChild(nameBox);


      // --- RIGHT: "+" button ---
      const addBtn = document.createElement('div');
      addBtn.classList.add('friend-add-btn');
      addBtn.textContent = '+';
      addBtn.title = `Send friend request to ${username}`;
      addBtn.style.cursor = 'pointer';
      addBtn.style.width = '28px';
      addBtn.style.height = '28px';
      addBtn.style.display = 'flex';
      addBtn.style.alignItems = 'center';
      addBtn.style.justifyContent = 'center';
      addBtn.style.borderRadius = '6px';
      addBtn.style.background = '#E0E0E0';
      addBtn.style.color = 'black';
      addBtn.style.fontWeight = 'bold';
      addBtn.style.userSelect = 'none';

      // Relationship check (friend or pending)
      getRelationshipStatusWith(username).then(status => {
        if (status.isFriend) {
          addBtn.style.display = 'none';
        } else if (status.hasPendingRequest) {
          addBtn.textContent = '✓';
          addBtn.style.opacity = '0.6';
          addBtn.style.pointerEvents = 'none';
        }
      });

      // Send friend request
      addBtn.addEventListener('click', () => {
        firebase.database()
          .ref(`users/${username}/inbox/requests/${currentUsername}`)
          .set("pending")
          .then(() => {
            addBtn.textContent = '✓';
            addBtn.style.opacity = '0.6';
            addBtn.style.pointerEvents = 'none';
          });
      });

      // Append everything
      li.appendChild(left);
      li.appendChild(addBtn);
      friendResults.appendChild(li);
    });
  });
}


// ----- Live Search -----
if (friendSearch) {
  friendSearch.addEventListener('input', () => {
    updateFriendResults(friendSearch.value);
  });
}




// ----- Inbox modal open/close and loader -----
// Open the inbox modal and load pending requests.
if (inboxBtn) {
  inboxBtn.addEventListener('click', () => {
    if (!inboxModal) return;
    inboxModal.style.display = 'block';
    loadInbox(); // populate inbox
  });
}

// Close inbox modal when clicking close button
if (inboxClose) {
  inboxClose.addEventListener('click', () => {
    if (!inboxModal) return;
    inboxModal.style.display = 'none';
  });
}

// Also close clicking outside
window.addEventListener('click', (e) => {
  if (e.target === inboxModal) inboxModal.style.display = 'none';
});

// Load the inbox: show pending requests with Accept / Decline
function loadInbox() {
  if (!inboxList) return;
  inboxList.innerHTML = ''; // clear list

  // Pull all requests for current user (under inbox/requests)
  firebase.database().ref(`users/${currentUsername}/inbox/requests`)
    .once('value')
    .then(snap => {
      if (!snap.exists()) {
        const p = document.createElement('p');
        p.textContent = "No friend requests.";
        inboxList.appendChild(p);
        return;
      }

      snap.forEach(reqSnap => {
        const requester = reqSnap.key;
        const status = reqSnap.val(); // e.g., "pending" / "accepted" / "declined"

        // Only show pending requests in the inbox UI
        if (status !== "pending") return;

        // Create list item with Accept / Decline buttons
        const li = document.createElement('li');
        li.style.display = 'flex';
        li.style.justifyContent = 'space-between';
        li.style.alignItems = 'center';
        li.style.padding = '8px 10px';
        li.style.borderRadius = '6px';
        li.style.marginBottom = '6px';
        li.style.backgroundColor = '#2e2e2e';

        const span = document.createElement('span');
        span.textContent = requester;

        const controls = document.createElement('div');

        const acceptBtn = document.createElement('button');
        acceptBtn.textContent = 'Accept';
        acceptBtn.classList.add('accept-btn');
        acceptBtn.style.marginRight = '8px';
        acceptBtn.textContent = 'Accept';
        acceptBtn.classList.add('accept-btn');

        const declineBtn = document.createElement('button');
        declineBtn.textContent = 'Decline';
        declineBtn.classList.add('decline-btn');
      

        controls.appendChild(acceptBtn);
        controls.appendChild(declineBtn);

        li.appendChild(span);
        li.appendChild(controls);
        inboxList.appendChild(li);

        // Accept handler: add each other as friends and remove the request (or mark accepted)
        acceptBtn.addEventListener('click', () => {
          const updates = {};
          updates[`users/${currentUsername}/friends/${requester}`] = true;
          updates[`users/${requester}/friends/${currentUsername}`] = true;
          updates[`users/${currentUsername}/inbox/requests/${requester}`] = "accepted";
          // Write both friendships and update request status atomically
          firebase.database().ref().update(updates).then(() => {
            li.remove(); // remove from UI
          }).catch(err => console.error("Accept failed:", err));
        });

        // Decline handler: mark request as declined (or remove)
        declineBtn.addEventListener('click', () => {
          firebase.database().ref(`users/${currentUsername}/inbox/requests/${requester}`)
            .set("declined")
            .then(() => li.remove())
            .catch(err => console.error("Decline failed:", err));
        });
      });
    })
    .catch(err => console.error("Failed loading inbox:", err));
}


// ----- Optional: show updated friend state in Find Friends after accepting -----
// If someone accepts a request (or changes friends), we may want to refresh visible results.
// Here we attach a listener to current user's friends to refresh list when it changes.
firebase.database().ref(`users/${currentUsername}/friends`).on('value', () => {
  // Refresh the visible friend search results if modal is open
  if (findFriendsModal && findFriendsModal.style.display === 'block') {
    updateFriendResults(friendSearch?.value || '');
  }
});


// ----- End of file -----
