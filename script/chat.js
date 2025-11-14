// --- Current logged-in user ---
const currentUsername = "test"; // replace this with the real logged-in username
const currentUserNameEl = document.getElementById('current-user-name');

// Reference to THIS user's data
const usersRefCurrentUser = firebase.database().ref('users/' + currentUsername);

// Reference to ALL users (for search)
const allUsersRef = firebase.database().ref('users');


// --- Find Friends Modal ---
const findFriendsBtn = document.getElementById('btn');
const findFriendsModal = document.getElementById('find-friends-modal');
const friendSearch = document.getElementById('friend-search');
const friendResults = document.getElementById('friend-results');
const findFriendsClose = findFriendsModal.querySelector('.close');

// Open modal
findFriendsBtn.addEventListener('click', () => {
  findFriendsModal.style.display = 'block';
  friendSearch.value = '';
  friendResults.innerHTML = '';
  updateFriendResults(''); // show all users
});

// Close modal
findFriendsClose.addEventListener('click', () => {
  findFriendsModal.style.display = 'none';
});

// Close modal when clicking outside
window.addEventListener('click', (e) => {
  if (e.target === findFriendsModal) {
    findFriendsModal.style.display = 'none';
  }
});


// --- Search all users ---
function updateFriendResults(query) {
  friendResults.innerHTML = ''; // Clear

  allUsersRef.once('value', snapshot => {
    snapshot.forEach(childSnap => {

      const username = childSnap.key; // key = username

      if (username.toLowerCase().includes(query.toLowerCase())) {

        const li = document.createElement('li');
        li.style.display = 'flex';
        li.style.justifyContent = 'space-between';
        li.style.alignItems = 'center';

        // Username text
        const nameSpan = document.createElement('span');
        nameSpan.textContent = username;
        li.appendChild(nameSpan);

        // "+" button
        const addBtn = document.createElement('div');
        addBtn.classList.add('friend-add-btn');
        addBtn.textContent = '+';
        li.appendChild(addBtn);

        addBtn.addEventListener('click', () => {
          console.log(`Add friend clicked: ${username}`);
          // TODO: send friend request
        });

        friendResults.appendChild(li);
      }
    });
  });
}

// Update list while typing
friendSearch.addEventListener('input', () => {
  updateFriendResults(friendSearch.value);
});


// --- Load Display Name for Header ---
usersRefCurrentUser.once('value').then(snapshot => {
  const displayName = snapshot.val().displayName || currentUsername;
  currentUserNameEl.textContent = `, ${displayName}`;
});
