// ----- Inbox Badge -----
(() => {
  // Use existing currentUsername if declared, else fallback to localStorage
  const currentUser = window.currentUsername || localStorage.getItem("currentUser");
  if (!currentUser) return;

  const inboxBtn = document.getElementById("inbox-btn");
  if (!inboxBtn) return;

  // Create badge element
  const badge = document.createElement("div");
  badge.style.position = "absolute";
  badge.style.bottom = "2px";
  badge.style.right = "2px";
  badge.style.backgroundColor = "red";
  badge.style.color = "white";
  badge.style.fontSize = "12px";
  badge.style.fontWeight = "bold";
  badge.style.borderRadius = "50%";
  badge.style.width = "18px";
  badge.style.height = "18px";
  badge.style.display = "flex";
  badge.style.alignItems = "center";
  badge.style.justifyContent = "center";
  badge.style.pointerEvents = "none"; // click passes through
  badge.style.zIndex = "10";
  badge.textContent = "0";

  // Wrap inbox button with relative positioning if needed
  inboxBtn.style.position = "relative";
  inboxBtn.appendChild(badge);

  // Firebase reference to user's inbox requests
  const inboxRef = firebase.database().ref(`users/${currentUser}/inbox/requests`);

  // Update badge count
  function updateBadge(snapshot) {
    if (!snapshot.exists()) {
      badge.style.display = "none";
      return;
    }
    const requests = snapshot.val();
    const count = Object.values(requests).filter(v => v === "pending").length;
    if (count > 0) {
      badge.style.display = "flex";
      badge.textContent = count;
    } else {
      badge.style.display = "none";
    }
  }

  // Initial load
  inboxRef.once("value").then(updateBadge);

  // Real-time listener
  inboxRef.on("value", updateBadge);
})();
