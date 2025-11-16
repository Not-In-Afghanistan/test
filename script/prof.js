// prof.js - handles display name & profile picture (no email required)

// --- Ensure Firebase is loaded ---
if (!window.firebase) {
    console.error("Firebase not loaded. Add Firebase SDK before this script.");
} else {
    (function initProfile() {
        const username = localStorage.getItem("currentUser");
        if (!username) {
            console.warn("No user in localStorage. Redirecting to login.");
            window.location.href = "./index.html";
            return;
        }

        const userRef = firebase.database().ref(`users/${username}`);
        const imgWrapper = document.getElementById("img");
        const imgBox = imgWrapper.querySelector("img");
        const displayNameBox = document.getElementById("displayNameBox");
        const changeBtn = document.getElementById("changeDisplayBtn");

        // --- Load Display Name ---
        userRef.child("displayName").once("value")
            .then(snap => displayNameBox.textContent = snap.exists() ? snap.val() : username)
            .catch(() => displayNameBox.textContent = username);

        // --- Load Profile Picture ---
        userRef.child("pfpUrl").once("value")
            .then(snap => imgBox.src = snap.exists() ? snap.val() : "./images/default-pfp.png")
            .catch(() => imgBox.src = "./images/default-pfp.png");

        // --- Overlay for PFP change ---
        const overlay = document.createElement("div");
        overlay.textContent = "Change Image";
        overlay.style = `
            position:absolute; top:0; left:0;
            width:100%; height:100%;
            display:flex; justify-content:center; align-items:center;
            background:rgba(0,0,0,0.5);
            color:white; font-size:16px; border-radius:50%;
            opacity:0; transition:0.2s; cursor:pointer;
        `;
        imgWrapper.style.position = "relative";
        imgWrapper.appendChild(overlay);

        imgWrapper.addEventListener("mouseenter", () => overlay.style.opacity = "1");
        imgWrapper.addEventListener("mouseleave", () => overlay.style.opacity = "0");

        // --- Hidden file input ---
        const fileInput = document.createElement("input");
        fileInput.type = "file";
        fileInput.accept = "image/*";
        fileInput.style.display = "none";
        document.body.appendChild(fileInput);

        overlay.addEventListener("click", () => fileInput.click());

        fileInput.addEventListener("change", async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const storageRef = firebase.storage().ref(`pfp/${username}`);
            const uploadTask = storageRef.put(file);

            uploadTask.on("state_changed", null,
                (error) => alert("Upload failed: " + error.message),
                async () => {
                    const downloadURL = await uploadTask.snapshot.ref.getDownloadURL();
                    await userRef.update({ pfpUrl: downloadURL });
                    imgBox.src = downloadURL;
                    alert("Profile picture updated!");
                }
            );
        });

        // --- Modal for changing display name ---
        function createModal() {
            const backdrop = document.createElement("div");
            backdrop.style = `
                position:fixed; top:0; left:0; width:100%; height:100%;
                background:rgba(0,0,0,0.5); display:none;
                justify-content:center; align-items:center; z-index:999;
            `;
            const modal = document.createElement("div");
            modal.style = `
                background:#2f3136; padding:20px; border-radius:8px;
                width:300px; display:flex; flex-direction:column; gap:10px;
            `;
            modal.innerHTML = `
                <h3 style="margin:0; color:white;">Change Display Name</h3>
                <input id="modalDisplayInput" type="text" maxlength="10" placeholder="Enter new display name" style="padding:5px; border-radius:4px; border:none;">
                <div style="display:flex; gap:10px;">
                    <button id="saveDisplayBtn">Save</button>
                    <button id="cancelDisplayBtn">Cancel</button>
                    <div id="modalMsg" style="flex:1; color:#ff6666; font-size:12px;"></div>
                </div>
            `;
            backdrop.appendChild(modal);
            document.body.appendChild(backdrop);

            const input = modal.querySelector("#modalDisplayInput");
            const saveBtn = modal.querySelector("#saveDisplayBtn");
            const cancelBtn = modal.querySelector("#cancelDisplayBtn");
            const msg = modal.querySelector("#modalMsg");

            function show(initialValue = "") {
                input.value = initialValue;
                msg.textContent = "";
                backdrop.style.display = "flex";
                input.focus();
            }
            function hide() { backdrop.style.display = "none"; }

            saveBtn.addEventListener("click", () => {
                const val = input.value.trim();
                if (!val) { msg.textContent = "Cannot be empty."; return; }
                if (val.length > 10) { msg.textContent = "Max 10 characters."; return; }

                // Save to database
                userRef.update({ displayName: val })
                    .then(() => {
                        displayNameBox.textContent = val;
                        hide();
                    })
                    .catch(err => msg.textContent = "Failed to save.");
            });
            cancelBtn.addEventListener("click", hide);
            backdrop.addEventListener("click", e => { if (e.target === backdrop) hide(); });

            return { show };
        }

        const modalCtrl = createModal();

        // --- Wire change button ---
        changeBtn.addEventListener("click", () => {
            userRef.child("displayName").once("value")
                .then(snap => modalCtrl.show(snap.exists() ? snap.val() : username))
                .catch(() => modalCtrl.show(username));
        });

        // --- Listen for database changes ---
        userRef.child("displayName").on("value", snap => {
            displayNameBox.textContent = snap.exists() ? snap.val() : username;
        });
        userRef.child("pfpUrl").on("value", snap => {
            imgBox.src = snap.exists() ? snap.val() : "./images/default-pfp.png";
        });
    })();
}
