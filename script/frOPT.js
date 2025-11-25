// Modal elements
const friendOptionsModal = document.getElementById("friendOptionsModal");
const friendOptionsName = document.getElementById("friendOptionsName");
const deleteFriendBtn = document.getElementById("deleteFriendBtn");
const closeFriendModal = document.getElementById("closeFriendModal");

let selectedFriend = null;

// ----- Open Modal -----
function openFriendOptions(friendName) {
  selectedFriend = friendName;
  friendOptionsName.textContent = "Options for " + friendName;
  friendOptionsModal.style.display = "flex";
}

// ----- Close Modal -----
closeFriendModal.addEventListener("click", () => {
  friendOptionsModal.style.display = "none";
});

// ----- Clicking outside closes modal -----
window.addEventListener("click", (event) => {
  if (event.target === friendOptionsModal) {
    friendOptionsModal.style.display = "none";
  }
});

// ----- DELETE FRIEND -----
deleteFriendBtn.addEventListener("click", () => {
  if (!selectedFriend) return;

  // Remove both ways
  firebase.database().ref(`users/${currentUsername}/friends/${selectedFriend}`).remove();
  firebase.database().ref(`users/${selectedFriend}/friends/${currentUsername}`).remove();

  // ----- DELETE CHAT MESSAGES (A-structure) -----
  let chatPath = "";
  if (currentUsername < selectedFriend) {
    chatPath = `${currentUsername}_${selectedFriend}`;
  } else {
    chatPath = `${selectedFriend}_${currentUsername}`;
  }

  firebase.database().ref(`chats/${chatPath}`).remove();

  // Delete lastSeen both ways
  firebase.database().ref(`chatLastSeen/${currentUsername}/${selectedFriend}`).remove();
  firebase.database().ref(`chatLastSeen/${selectedFriend}/${currentUsername}`).remove();

  // If user was chatting with them, close chat
  if (typeof currentChatFriend !== "undefined" && currentChatFriend === selectedFriend) {
    currentChatFriend = null;

    const chatWindow = document.querySelector('#yesChat');
    chatWindow.innerHTML = '';

    const noChat = document.querySelector('.no-chat');
    if (noChat) noChat.style.display = 'block';
  }

  friendOptionsModal.style.display = "none";

  // Reload friends list
});
