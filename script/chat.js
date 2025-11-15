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
// Open the find-friends modal and clear previous results.
if (findFriendsBtn) {
  findFriendsBtn.addEventListener('click', () => {
    if (!findFriendsModal) return;
    findFriendsModal.style.display = 'block';
    if (friendSearch) friendSearch.value = '';
    if (friendResults) friendResults.innerHTML = '';
    updateFriendResults(''); // show all initially
  });
}

// Close using the × inside modal
if (findFriendsClose) {
  findFriendsClose.addEventListener('click', () => {
    findFriendsModal.style.display = 'none';
  });
}

// Close modal when clicking outside of it
window.addEventListener('click', (e) => {
  if (e.target === findFriendsModal) findFriendsModal.style.display = 'none';
});


// ----- Utility: check friendship and pending request status -----
// Returns a promise resolving to an object { isFriend: bool, hasPendingRequest: bool }
function getRelationshipStatusWith(username) {
  // Read current user's friends and the receiver's inbox entry for current user
  const friendPath = `users/${currentUsername}/friends/${username}`;
  const inboxPath = `users/${username}/inbox/requests/${currentUsername}`;

  const friendPromise = firebase.database().ref(friendPath).once('value');
  const inboxPromise = firebase.database().ref(inboxPath).once('value');

  return Promise.all([friendPromise, inboxPromise]).then(([fSnap, iSnap]) => {
    return {
      isFriend: fSnap.exists() && !!fSnap.val(),
      hasPendingRequest: iSnap.exists() && iSnap.val() === "pending"
    };
  });
}


// ----- Main: updateFriendResults (search + render) -----
// Query all users, filter by username (key), and render list items with + button.
function updateFriendResults(query) {
  if (!friendResults) return;
  friendResults.innerHTML = ''; // clear previous results

  // Load all users once (this is fine for moderate user counts)
  allUsersRef.once('value').then(snapshot => {
    let index = 0; // for alternating bg colors

    snapshot.forEach(childSnap => {
      const username = childSnap.key;
      const displayName = childSnap.val()?.displayName || username;

      // Skip current user from list
      if (username === currentUsername) return;

      // Filter by query
      if (!username.toLowerCase().includes((query || '').toLowerCase())) return;

      // Build list item (flex container)
      const li = document.createElement('li');
      li.style.display = 'flex';
      li.style.justifyContent = 'space-between';
      li.style.alignItems = 'center';
      li.style.padding = '8px 10px';
      li.style.borderRadius = '6px';
      li.style.marginBottom = '6px';
      li.style.backgroundColor = (index % 2 === 0) ? '#2e2e2e' : '#444444';
      index++;

  const nameSpan = document.createElement('span');
  nameSpan.textContent = username;
  li.appendChild(nameSpan);
      // Create "+" addBtn (but we may hide/disable it below)
      const addBtn = document.createElement('div');
      addBtn.classList.add('friend-add-btn');
      addBtn.textContent = '+';
      addBtn.title = `Send friend request to ${username}`;

      // Default style/behavior: clickable
      addBtn.style.cursor = 'pointer';

      // Check relationship status (friend or pending)
      // If already friends -> hide add button; if already sent pending -> disable and show "Sent"
      getRelationshipStatusWith(username).then(status => {
        if (status.isFriend) {
          addBtn.style.display = 'none'; // hide if already friends
        } else if (status.hasPendingRequest) {
          addBtn.textContent = 'Sent';
          addBtn.style.opacity = '0.6';
          addBtn.style.pointerEvents = 'none';
        }
      }).catch(err => {
        console.error("Relationship check failed:", err);
      });

      // Click handler to send friend request
      addBtn.addEventListener('click', () => {
        const sender = currentUsername;
        const receiver = username;

        if (sender === receiver) return; // safety

        // Write a "pending" request under receiver's inbox/requests
        firebase.database().ref(`users/${receiver}/inbox/requests/${sender}`)
          .set("pending")
          .then(() => {
            addBtn.textContent = '✓';
            addBtn.style.opacity = '0.6';
            addBtn.style.fontSize = '10px';
            addBtn.style.pointerEvents = 'none';
            console.log(`Friend request sent from ${sender} to ${receiver}`);
          })
          .catch(err => {
            console.error("Error sending friend request:", err);
          });
      });

      // Append button to list item and item to results
      li.appendChild(addBtn);
      friendResults.appendChild(li);
    });
  }).catch(err => {
    console.error("Failed loading users for search:", err);
  });
}


// Live search handler: update while typing
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
