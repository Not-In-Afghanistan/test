// Wait for Firebase Auth
firebase.auth().onAuthStateChanged(user => {
  if (!user) {
    window.location.href = "index.html"; 
    return;
  }

  const currentUsername = user.displayName;  // ← IMPORTANT
  startDashboard(currentUsername);
});


function startDashboard(currentUsername) {

  const currentUserNameEl = document.getElementById('current-user-name');

  // User DB paths
  const usersRefCurrentUser = firebase.database().ref('users/' + currentUsername);
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
    updateFriendResults('');
  });

  // Close modal
  findFriendsClose.addEventListener('click', () => {
    findFriendsModal.style.display = 'none';
  });

  window.addEventListener('click', (e) => {
    if (e.target === findFriendsModal) {
      findFriendsModal.style.display = 'none';
    }
  });

  // --- Search users ---
  function updateFriendResults(query) {
    friendResults.innerHTML = '';

    allUsersRef.once('value', snapshot => {
      snapshot.forEach(childSnap => {
        const username = childSnap.key;

        if (username.toLowerCase().includes(query.toLowerCase())) {

          const li = document.createElement('li');
          li.style.display = 'flex';
          li.style.justifyContent = 'space-between';
          li.style.alignItems = 'center';

          const nameSpan = document.createElement('span');
          nameSpan.textContent = username;
          li.appendChild(nameSpan);

          const addBtn = document.createElement('div');
          addBtn.classList.add('friend-add-btn');
          addBtn.textContent = '+';
          li.appendChild(addBtn);

          addBtn.addEventListener('click', () => {
            console.log("Add friend:", username);
          });

          friendResults.appendChild(li);
        }
      });
    });
  }

  friendSearch.addEventListener('input', () => {
    updateFriendResults(friendSearch.value);
  });

  // Header name
  usersRefCurrentUser.once('value').then(snapshot => {
    const displayName = snapshot.val()?.displayName || currentUsername;
    currentUserNameEl.textContent = `, ${displayName}`;
  });
}
