// =======================================================================
//  KonsernKontroll – USER ADMINISTRATION
//  Supports: listing, creating, updating, deleting users
// =======================================================================

/*
    GLOBAL STATE:
    KK.user        = logged-in user
    KK.client      = client data
    KK.users       = all users in this client
*/

window.KK = window.KK || {};
KK.users = [];


// =======================================================================
//   OPEN / CLOSE MODAL
// =======================================================================

function openUserAdminModal() {
    const modal = document.getElementById("kk-user-admin-modal");
    modal.style.display = "flex";

    loadUsersList();
}

function closeUserAdminModal() {
    const modal = document.getElementById("kk-user-admin-modal");
    modal.style.display = "none";
}

document.getElementById("kk-admin-users-btn")?.addEventListener("click", openUserAdminModal);
document.getElementById("kk-user-admin-close")?.addEventListener("click", closeUserAdminModal);


// =======================================================================
//   LOAD USERS (Controller + Superadmin only)
// =======================================================================

function loadUsersList() {
    if (!KK.user || (!["controller", "superadmin"].includes(KK.user.role))) {
        console.warn("User not allowed to load user list");
        return;
    }

    getNEON({
        table: "users",
        where: { clientId: KK.user.clientId },
        responsId: "respUsersList"
    });
}

function responsUsersList(data) {
    KK.users = data.rows || [];
    renderUsersList();
}


// =======================================================================
//   RENDER USER LIST INSIDE MODAL
// =======================================================================

function renderUsersList() {
    const container = document.getElementById("kk-user-admin-list");
    container.innerHTML = "";

    if (!KK.users.length) {
        container.innerHTML = "<p>Ingen brukere funnet.</p>";
        return;
    }

    KK.users.forEach(user => {
        const row = document.createElement("div");
        row.className = "kk-user-row";
        row.style = `
            display:flex;
            align-items:center;
            justify-content:space-between;
            border-bottom:1px solid var(--kk-border);
            padding:10px 0;
        `;

        row.innerHTML = `
            <div>
                <strong>${user.name}</strong><br>
                <span style="color:var(--kk-text-light);">${user.email}</span>
            </div>

            <div style="display:flex; gap:10px; align-items:center;">
                <select data-user-id="${user.id}" class="kk-edit-role kk-input" style="width:140px;">
                    <option value="user" ${user.role === "user" ? "selected" : ""}>Bruker</option>
                    <option value="controller" ${user.role === "controller" ? "selected" : ""}>Controller</option>
                    <option value="superadmin" ${user.role === "superadmin" ? "selected" : ""}>Superadmin</option>
                </select>

                <button class="kk-btn kk-btn-small kk-btn-primary" data-edit="${user.id}">Lagre</button>
                <button class="kk-btn kk-btn-small kk-btn-danger" data-delete="${user.id}">Slett</button>
            </div>
        `;

        container.appendChild(row);
    });

    // Bind edit/save
    container.querySelectorAll("[data-edit]").forEach(btn => {
        btn.addEventListener("click", () => {
            const userId = btn.getAttribute("data-edit");
            saveUserChanges(userId);
        });
    });

    // Bind delete
    container.querySelectorAll("[data-delete]").forEach(btn => {
        btn.addEventListener("click", () => {
            const userId = btn.getAttribute("data-delete");
            deleteUser(userId);
        });
    });
}


// =======================================================================
//   SAVE USER CHANGES
// =======================================================================

function saveUserChanges(userId) {
    const select = document.querySelector(`select[data-user-id="${userId}"]`);
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

function responsUserUpdated(data) {
    console.log("User updated", data);
    loadUsersList();
}


// =======================================================================
//   DELETE USER
// =======================================================================

function deleteUser(userId) {
    if (!confirm("Er du sikker på at du vil slette denne brukeren?")) return;

    deleteNEON({
        table: "users",
        data: Number(userId),
        responsId: "respUserDeleted"
    });
}

function responsUserDeleted(data) {
    console.log("User deleted", data);
    loadUsersList();
}


// =======================================================================
//   ADD NEW USER
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
        data: {
            clientId: KK.user.clientId,
            name,
            email,
            role,
            neonUserId: null // manually connect in Memberstack
        },
        responsId: "respUserCreated"
    });
}

function responsUserCreated(data) {
    console.log("New user created", data);

    // Clear fields
    document.getElementById("kk-new-user-name").value = "";
    document.getElementById("kk-new-user-email").value = "";
    document.getElementById("kk-new-user-role").value = "user";

    loadUsersList();
}


// =======================================================================
//   REGISTER HANDLERS IN GLOBAL MAP
// =======================================================================

window.responseHandlers = window.responseHandlers || {};

Object.assign(window.responseHandlers, {
    respUsersList,
    respUserUpdated,
    respUserDeleted,
    respUserCreated
});

console.log("User Administration JS loaded");
