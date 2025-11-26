
// =========================
// SERVER SYSTEM
// =========================

const serverListEl = document.getElementById("server-list");
const addServerBtn = document.getElementById("add-server-btn");
const joinServerBtn = document.getElementById("join-server-btn");
const serverModal = document.getElementById("server-modal");
const joinModal = document.getElementById("join-modal");

const bannedServerWords = ["fuck","shit","bitch","asshole","cunt","nigger","faggot","dick","cock","pussy",
"nigga","slut","whore","bastard","penis","vagina","sex","rape","kill","suicide",
"cum","boob","boobs","fag","retard","jerk","porn","horny","gay","lesbian","femboy","ass","kkk","dildo"];

// ----- Premium check -----
async function isServerPremium(user) {
    const snap = await firebase.database().ref(`premium/${user}`).once('value');
    if (!snap.exists()) return false;
    return Date.now() < (snap.val().expires || 0);
}

// ----- Handle Add Server Button -----
async function setupAddServerBtn() {
    const premium = await isServerPremium(currentUsername);

    if (!premium) {
        // Overlay on hover
        const wrapper = document.createElement("div");
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
        overlay.style.fontWeight = "light";
        overlay.style.fontSize = "10px";
        overlay.style.textAlign = "center";
        overlay.style.borderRadius = "50%";
        overlay.style.height = "3vw";
        overlay.style.width = "3vw";
        overlay.style.opacity = "0";
        overlay.style.transition = "opacity 0.2s";
        wrapper.appendChild(overlay);

        wrapper.onmouseenter = () => overlay.style.opacity = "1";
        wrapper.onmouseleave = () => overlay.style.opacity = "0";

        return; // block non-premium users from clicking
    }

    addServerBtn.onclick = () => serverModal.style.display = "block";
}

// ----- Open Join Modal -----
joinServerBtn.onclick = () => joinModal.style.display = "block";

// ----- Close modals -----
document.querySelectorAll(".modal .close").forEach(btn => {
    btn.onclick = e => e.target.closest(".modal").style.display = "none";
});

// ----- Create Server -----
document.getElementById("create-server").onclick = async () => {
    const name = document.getElementById("server-name").value.trim();
    const password = document.getElementById("server-password").value.trim();
    const imageFile = document.getElementById("server-image").files[0];

    if (!name) return alert("Server name required");

    // Bad word filter
    if (bannedServerWords.some(w => name.toLowerCase().includes(w))) {
        return alert("Server name contains inappropriate words.");
    }

    let imageUrl = "../images/default-server.png";

    // IMAGE UPLOAD FIX
    if (imageFile) {
        try {
            const storage = firebase.storage();
            if (!storage) {
                alert("Firebase Storage is not enabled. Check your script imports.");
                return;
            }

            const storageRef = storage.ref(`serverImages/${name}_${Date.now()}`);
            await storageRef.put(imageFile);
            imageUrl = await storageRef.getDownloadURL();

        } catch (err) {
            console.error("IMAGE UPLOAD ERROR:", err);
            alert("Image upload failed: " + err.message);
            return; // stop creation, avoid broken server
        }
    }

    // Create server
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
    serverModal.style.display = "none";

    document.getElementById("server-name").value = "";
    document.getElementById("server-password").value = "";
    document.getElementById("server-image").value = "";

    loadUserServers();
};


// ----- Display Servers User Has Joined -----
async function loadUserServers() {
    const serversSnap = await firebase.database().ref("servers").once("value");
    serverListEl.innerHTML = "";

    serversSnap.forEach(snap => {
        const server = snap.val();
        const serverKey = snap.key;

        if (!server.members || !server.members[currentUsername]) return; // skip servers not joined

        const li = document.createElement("li");
        li.style.listStyle = "none";
        li.style.display = "inline-block";
        li.style.margin = "10px";
        li.style.position = "relative";
        li.style.cursor = "pointer";
        li.style.textAlign = "center";

        const img = document.createElement("img");
        img.src = server.imageUrl || "../images/default-server.png";
        img.style.width = "3vw";
        img.style.height = "3vw";
        img.style.borderRadius = "50%";
        img.style.transition = "transform 0.2s";
        li.appendChild(img);

        const nameDiv = document.createElement("div");
        nameDiv.textContent = server.name;
        nameDiv.style.position = "absolute";
        nameDiv.style.width = "100%";
        nameDiv.style.bottom = "20px";
        nameDiv.style.left = "0";
        nameDiv.style.fontSize = "12px";
        nameDiv.style.color = "#fff";
        nameDiv.style.opacity = "0";
        nameDiv.style.zIndex = "-67";
        nameDiv.style.transition = "transform 0.2s, opacity 0.2s"; // animate both
        li.appendChild(nameDiv);

li.onmouseenter = () => {
    nameDiv.style.transform = "translateY(35px)";
    nameDiv.style.opacity = "1";
};

li.onmouseleave = () => {
    nameDiv.style.transform = "translateY(0)";
    nameDiv.style.opacity = "0";
};

        li.onclick = () => openServerChat(serverKey, server);

        serverListEl.appendChild(li);
    });
}

// ----- Dummy placeholder for server chat opening -----
function openServerChat(serverKey, serverData) {
    alert(`Open chat for server "${serverData.name}"`);
}

// ----- Initialize -----
setupAddServerBtn();
loadUserServers();
// CSS via JS

