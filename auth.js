/* =================================
   RAILEASY SIGN IN SYSTEM
================================= */

const USERS_KEY = "raileasy_users";
const SESSION_KEY = "raileasy_session";

let resetEmail = "";

/* GET USERS */
function getUsers() {
    try {
        return JSON.parse(
            localStorage.getItem(USERS_KEY)
        ) || [];
    } catch {
        return [];
    }
}

/* SWITCH BETWEEN SCREENS */
function showScreen(screen) {
    const screens = [
        "login",
        "forgot",
        "check",
        "failed",
        "reset",
        "success"
    ];

    for (const name of screens) {
        document.getElementById(
            name + "Panel"
        ).hidden = name !== screen;
    }
}

/* SHOW MESSAGE */
function showNotice(id, text) {
    const element = document.getElementById(id);
    element.textContent = text;
    element.hidden = false;
}

/* PASSWORD HASH HELPERS */
function toHex(bytes) {
    return Array.from(bytes, byte =>
        byte.toString(16).padStart(2, "0")
    ).join("");
}

function fromHex(hex) {
    const parts = hex.match(/.{2}/g);

    if (!parts) {
        throw new Error("Invalid saved account");
    }

    return new Uint8Array(
        parts.map(byte => parseInt(byte, 16))
    );
}

async function hashPassword(password, salt) {
    const key = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(password),
        "PBKDF2",
        false,
        ["deriveBits"]
    );

    const bits = await crypto.subtle.deriveBits({
        name: "PBKDF2",
        salt: fromHex(salt),
        iterations: 120000,
        hash: "SHA-256"
    }, key, 256);

    return toHex(new Uint8Array(bits));
}

/* =================================
   SCREEN BUTTONS
================================= */

document.querySelectorAll("[data-screen]").forEach(
    button => {
        button.addEventListener("click", () => {
            showScreen(button.dataset.screen);
        });
    }
);

/* =================================
   SHOW / HIDE PASSWORD
================================= */

document.getElementById("showPassword")
    .addEventListener("click", function () {

        const input =
            document.getElementById("loginPassword");

        const visible = input.type === "text";

        input.type = visible ? "password" : "text";

        this.setAttribute(
            "aria-pressed",
            String(!visible)
        );

        this.setAttribute(
            "aria-label",
            visible ? "Show password" : "Hide password"
        );

        this.querySelector("i").className =
            visible ? "bi bi-eye-slash" : "bi bi-eye";
    });

/* =================================
   REGISTRATION SUCCESS MESSAGE
================================= */

if (
    new URLSearchParams(location.search)
        .get("registered") === "1"
) {
    showNotice(
        "loginNotice",
        "Registration successful! Please sign in."
    );
}

/* =================================
   SIGN IN
================================= */

document.getElementById("loginForm")
    .addEventListener("submit", async function (event) {

        event.preventDefault();

        const email = document.getElementById(
            "loginEmail"
        ).value.trim().toLowerCase();

        const password = document.getElementById(
            "loginPassword"
        ).value;

        const user = getUsers().find(
            account => account.email === email
        );

        if (!user) {
            showScreen("failed");
            return;
        }

        const button = this.querySelector(
            "[type=submit]"
        );

        button.disabled = true;

        try {
            const enteredHash = await hashPassword(
                password,
                user.salt
            );

            if (enteredHash !== user.passwordHash) {
                showScreen("failed");
                return;
            }

            const currentUser = {
                id: user.id,
                name: user.name,
                email: user.email
            };

            sessionStorage.setItem(
                SESSION_KEY,
                JSON.stringify(currentUser)
            );

            window.location.href = "main.html";

        } catch (error) {
            showNotice(
                "loginNotice",
                "Could not sign in. Open the site with Live Server."
            );

            showScreen("login");

        } finally {
            button.disabled = false;
        }
    });

/* =================================
   FORGOT PASSWORD
================================= */

document.getElementById("forgotForm")
    .addEventListener("submit", function (event) {

        event.preventDefault();

        const email = document.getElementById(
            "forgotEmail"
        ).value.trim().toLowerCase();

        const userExists = getUsers().some(
            user => user.email === email
        );

        if (!userExists) {
            showNotice(
                "forgotMessage",
                "No demo account with that email is saved in this browser."
            );
            return;
        }

        resetEmail = email;

        document.getElementById(
            "forgotMessage"
        ).hidden = true;

        showScreen("check");
    });

/* =================================
   RESET PASSWORD
================================= */

document.getElementById("resetForm")
    .addEventListener("submit", async function (event) {

        event.preventDefault();

        const password = document.getElementById(
            "newPassword"
        ).value;

        const confirm = document.getElementById(
            "confirmNewPassword"
        ).value;

        if (password.length < 8) {
            showNotice(
                "resetMessage",
                "Use a password with at least 8 characters."
            );
            return;
        }

        if (password !== confirm) {
            showNotice(
                "resetMessage",
                "Passwords do not match."
            );
            return;
        }

        const users = getUsers();

        const index = users.findIndex(
            user => user.email === resetEmail
        );

        if (index < 0) {
            showNotice(
                "resetMessage",
                "Account not found. Return to Forgot Password."
            );
            return;
        }

        const button = this.querySelector(
            "[type=submit]"
        );

        button.disabled = true;

        try {
            const salt = toHex(
                crypto.getRandomValues(
                    new Uint8Array(16)
                )
            );

            users[index].salt = salt;

            users[index].passwordHash =
                await hashPassword(password, salt);

            localStorage.setItem(
                USERS_KEY,
                JSON.stringify(users)
            );

            this.reset();
            resetEmail = "";

            showScreen("success");

        } catch (error) {
            showNotice(
                "resetMessage",
                "Could not reset password. Use Live Server."
            );

        } finally {
            button.disabled = false;
        }
    });

/* =================================
   FOOTER YEAR
================================= */

document.getElementById("year").textContent =
    new Date().getFullYear();