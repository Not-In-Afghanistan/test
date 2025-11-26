// =========================
// SERVER SYSTEM (ONE FILE, FULL FEATURED)
// =========================

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
      #server-list {
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        align-items: center;
        list-style: none;
        overflow-x: hidden;
        overflow-y: auto;
        max-height: 80vh;
      }
      #server-list li { user-select: none; }

      /* scrollbar styling (webkit) */
      #server-list::-webkit-scrollbar { display: none; }

      /* small responsive tweak */
      @media (max-width: 800px) {
        #server-list img { width: 36px !important; height: 36px !important; }
      }
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
      overlay.style.fontSize = "10px";
      overlay.style.borderRadius = "50%";
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
      if (!firebase?.storage) throw new Error("Firebase Storage is not available.");

      const path = `serverImages/${currentUsername}_${Date.now()}_${Math.floor(Math.random()*9999)}`;
      const storageRef = firebase.storage().ref(path);

      const snapshot = await storageRef.put(file);
      const url = await snapshot.ref.getDownloadURL();

      serverImageUrlInput.value = url;

      if (previewUI?.preview) {
        previewUI.preview.src = url;
        previewUI.preview.style.display = "inline-block";
      }

      console.log("Uploaded ✔ URL:", url);
    } catch (err) {
      console.error("Upload failed:", err);
      alert("Image upload failed: " + (err.message || err));
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

      const name = serverNameInput ? serverNameInput.value.trim() : "";
      const password = serverPasswordInput ? serverPasswordInput.value.trim() : "";
      let imageUrl = serverImageUrlInput ? serverImageUrlInput.value : "";

      if (!name) return alert("Server name required.");

      if (bannedServerWords.some(w => name.toLowerCase().includes(w))) {
        return alert("Server name contains inappropriate words.");
      }

      // fallback if hidden input empty or looks invalid
      if (!imageUrl || imageUrl.length < 8) {
        imageUrl = "../images/default-server.png";
      }

      try {
        // push server
        const serverRef = firebase.database().ref("servers").push();
        await serverRef.set({
          name,
          password: password || null,
          owner: currentUsername,
          imageUrl,
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
      // Ensure container styling (defensive)
      serverListEl.style.display = "flex";
      serverListEl.style.flexWrap = "wrap";
      serverListEl.style.justifyContent = "center";
      serverListEl.style.alignItems = "center";
      serverListEl.style.gap = "12px";
      serverListEl.style.padding = "8px";
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
        li.style.margin = "10px";
        li.style.cursor = "pointer";
        li.style.width = "fit-content";

        const img = document.createElement("img");
        img.src = server.imageUrl || "../images/default-server.png";
        img.alt = server.name || "server";
        img.style.width = "3.2vw";
        img.style.height = "3.2vw";
        img.style.minWidth = "36px";
        img.style.minHeight = "36px";
        img.style.borderRadius = "50%";
        img.style.objectFit = "cover";
        img.style.transition = "transform 0.18s ease";
        li.appendChild(img);

        // hover name
        const nameDiv = document.createElement("div");
        nameDiv.textContent = server.name || "Unnamed";
        nameDiv.style.position = "absolute";
        nameDiv.style.fontSize = "13px";
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
  function openServerChat(key, server) {
    // replace this with your actual server-chat opening logic
    alert(`Open server: ${server.name}`);
  }

  // ---------- initialization ----------
  (async () => {
    await setupAddServerBtn();
    await loadUserServers();
  })();

})(); // end IIFE
