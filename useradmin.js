// =======================================================================
//  KonsernKontroll – USER ADMINISTRATION
// =======================================================================

console.log("✓ User Administration loaded");

window.KK = window.KK || {};
KK.users = KK.users || [];

// =======================================================================
//  OPEN / CLOSE MODAL
// =======================================================================

function openUserAdminModal() {
    const modal = document.getElementById("kk-user-admin-modal");
    if (!modal) return console.error("❌ kk-user-admin-modal not found");
    
    modal.classList.remove("kk-hidden");
    loadUsersList();
}

function closeUserAdminModal() {
    const modal = document.getElementById("kk-user-admin-modal");
    if (modal) modal.classList.add("kk-hidden");
}

// riktig knapp-ID fra HTML:
document.getElementById("kk-nav-admin-users")?.addEventListener("click", openUserAdminModal);
document.getElementById("kk-user-admin-close")?.addEventListener("click", closeUserAdminModal);


// =======================================================================
//  LOAD USERS
// =======================================================================

function loadUsersList() {
    if (!KK.user) return console.warn("KK.user not loaded yet");

    if (!["controller", "superadmin"].includes(KK.user.role)) {
        return console.warn("🔐 User lacks permission to manage users");
    }

    getNEON({
        table: "users",
        where: { clientId: KK.user.clientId },
        responsId: "respUsersList"
    });
}

function respUsersList(data) {
    KK.users = data?.rows || [];
    renderUsersList();
}


// =======================================================================
//  RENDER USER LIST
// =======================================================================

function renderUsersList() {
    const container = document.getElementById("kk-user-admin-list");
    if (!container) return console.error("kk-user-admin-list missing");

    container.innerHTML = "";

    if (!KK.users.length) {
        container.innerHTML = "<p>Ingen brukere funnet.</p>";
        return;
    }

    KK.users.forEach(user => {
        const row = document.createElement("div");
        row.className = "kk-user-row";

        row.innerHTML = `
            <div>
                <strong>${user.name}</strong><br>
                <span class="kk-text-light">${user.email}</span>
            </div>

            <div class="kk-admin-actions">
                <select class="kk-edit-role" data-user-id="${user.id}">
                    <option value="user"       ${user.role === "user" ? "selected" : ""}>Bruker</option>
                    <option value="controller" ${user.role === "controller" ? "selected" : ""}>Controller</option>
                    <option value="superadmin" ${user.role === "superadmin" ? "selected" : ""}>Superadmin</option>
                </select>

                <button class="kk-btn kk-btn-small kk-btn-primary" data-edit="${user.id}">Lagre</button>
                <button class="kk-btn kk-btn-small kk-btn-danger" data-delete="${user.id}">Slett</button>
            </div>
        `;

        container.appendChild(row);
    });

    // Save handlers
    container.querySelectorAll("[data-edit]").forEach(btn => {
        btn.onclick = () => saveUserChanges(btn.dataset.edit);
    });

    // Delete handlers
    container.querySelectorAll("[data-delete]").forEach(btn => {
        btn.onclick = () => deleteUser(btn.dataset.delete);
    });
}


// =======================================================================
//  UPDATE USER
// =======================================================================

function saveUserChanges(userId) {
    const select = document.querySelector(`select[data-user-id="${userId}"]`);
    if (!select) return;

    const newRole = select.value;

    patchNEON({
        table: "users",
        data: {
            id: Number(userId),
            fields: { role: newRole }
        },
        responsId: "respUserUpdated"
    });
}

function respUserUpdated(data) {
    console.log("User updated:", data);
    loadUsersList();
}


// =======================================================================
//  DELETE USER
// =======================================================================

function deleteUser(userId) {
    if (!confirm("Er du sikker på at du vil slette denne brukeren?")) return;

    deleteNEON({
        table: "users",
        data: {
            field: "id",
            value: userId
        },
        responsId: "respUserDeleted"
    });
}

function respUserDeleted(data) {
    console.log("User deleted:", data);
    loadUsersList();
}


// =======================================================================
//  ADD NEW USER
// =======================================================================

document.getElementById("kk-add-user-btn")?.addEventListener("click", addNewUser);

function addNewUser() {
    const name  = document.getElementById("kk-new-user-name").value.trim();
    const email = document.getElementById("kk-new-user-email").value.trim();
    const role  = document.getElementById("kk-new-user-role").value;

    if (!name || !email) {
        alert("Navn og e-post må fylles ut");
        return;
    }

    postNEON({
        table: "users",
        data: [
            {
                clientId: KK.user.clientId,
                name,
                email,
                role,
                neonUserId: null
            }
        ],
        responsId: "respUserCreated"
    });
}

function respUserCreated(data) {
    console.log("User created:", data);

    document.getElementById("kk-new-user-name").value = "";
    document.getElementById("kk-new-user-email").value = "";
    document.getElementById("kk-new-user-role").value = "user";

    loadUsersList();
}


// =======================================================================
//  REGISTER RESPONSE HANDLERS
// =======================================================================

window.responseHandlers = window.responseHandlers || {};
Object.assign(window.responseHandlers, {
    respUsersList,
    respUserUpdated,
    respUserDeleted,
    respUserCreated
});
