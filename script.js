/* =================================
   RAILEASY SYSTEM
================================= */

const USERS_KEY = "raileasy_users";
const SESSION_KEY = "raileasy_session";

/* GET SAVED USERS */
function getUsers() {
    try {
        return JSON.parse(
            localStorage.getItem(USERS_KEY)
        ) || [];
    } catch {
        return [];
    }
}

/* DISPLAY MESSAGE */
function showMessage(id, message, type) {
    const element = document.getElementById(id);

    if (!element) return;

    element.textContent = message;
    element.className = "auth-message " + type;
}

/* PASSWORD HASHING FOR DEMO */
function toHex(bytes) {
    return Array.from(bytes)
        .map(byte => byte.toString(16).padStart(2, "0"))
        .join("");
}

function fromHex(hex) {
    return new Uint8Array(
        hex.match(/.{2}/g).map(byte => parseInt(byte, 16))
    );
}

async function hashPassword(password, salt) {
    const encoder = new TextEncoder();

    const key = await crypto.subtle.importKey(
        "raw",
        encoder.encode(password),
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
   REGISTRATION
================================= */

const registerForm =
    document.getElementById("registerForm");

if (registerForm) {
    registerForm.addEventListener("submit", async function(e) {
        e.preventDefault();

        const name =
            document.getElementById("fullName").value.trim();

        const email =
            document.getElementById("registerEmail")
                .value.trim().toLowerCase();

        const password =
            document.getElementById("registerPassword").value;

        const confirmPassword =
            document.getElementById("confirmPassword").value;

        if (!name || !email) {
            showMessage(
                "registerMessage",
                "Please complete all fields.",
                "error"
            );
            return;
        }

        if (password.length < 8) {
            showMessage(
                "registerMessage",
                "Password must have at least 8 characters.",
                "error"
            );
            return;
        }

        if (password !== confirmPassword) {
            showMessage(
                "registerMessage",
                "Passwords do not match!",
                "error"
            );
            return;
        }

        const users = getUsers();

        if (users.some(user => user.email === email)) {
            showMessage(
                "registerMessage",
                "Email is already registered!",
                "error"
            );
            return;
        }

        const button = registerForm.querySelector(
            "button[type='submit']"
        );

        button.disabled = true;

        try {
            const saltBytes = crypto.getRandomValues(
                new Uint8Array(16)
            );

            const salt = toHex(saltBytes);
            const passwordHash =
                await hashPassword(password, salt);

            const newUser = {
                id: Date.now().toString(),
                name: name,
                email: email,
                salt: salt,
                passwordHash: passwordHash
            };

            users.push(newUser);

            localStorage.setItem(
                USERS_KEY,
                JSON.stringify(users)
            );

            registerForm.reset();

            window.location.href = "login.html?registered=1";

        } catch (error) {
            showMessage(
                "registerMessage",
                "Registration failed. Use Live Server and try again.",
                "error"
            );
        } finally {
            button.disabled = false;
        }
    });
}

/* =================================
   LOGIN
================================= */

const loginForm =
    document.getElementById("loginForm");

if (loginForm) {
    const params = new URLSearchParams(
        window.location.search
    );

    if (params.get("registered") === "1") {
        showMessage(
            "loginMessage",
            "Registration successful! Please sign in.",
            "success"
        );
    }

    loginForm.addEventListener("submit", async function(e) {
        e.preventDefault();

        const email =
            document.getElementById("loginEmail")
                .value.trim().toLowerCase();

        const password =
            document.getElementById("loginPassword").value;

        const users = getUsers();

        const user = users.find(
            account => account.email === email
        );

        if (!user) {
            showMessage(
                "loginMessage",
                "Invalid email or password!",
                "error"
            );
            return;
        }

        const button = loginForm.querySelector(
            "button[type='submit']"
        );

        button.disabled = true;

        try {
            const passwordHash = await hashPassword(
                password,
                user.salt
            );

            if (passwordHash !== user.passwordHash) {
                showMessage(
                    "loginMessage",
                    "Invalid email or password!",
                    "error"
                );
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

            window.location.href = "index.html";

        } catch (error) {
            showMessage(
                "loginMessage",
                "Login failed. Please try again.",
                "error"
            );
        } finally {
            button.disabled = false;
        }
    });
}

/* =================================
   LOGGED-IN NAVBAR
================================= */

function updateNavbar() {
    const navButtons =
        document.querySelector(".nav-buttons");

    const savedSession =
        sessionStorage.getItem(SESSION_KEY);

    if (!navButtons || !savedSession) return;

    let user;

    try {
        user = JSON.parse(savedSession);
    } catch {
        return;
    }

    if (!user || !user.name) return;

    navButtons.replaceChildren();

    const greeting = document.createElement("span");
    greeting.className = "logged-user";

    const firstName = user.name.split(" ")[0];
    greeting.textContent = "Hi, " + firstName;

    const logoutButton = document.createElement("button");
    logoutButton.type = "button";
    logoutButton.className = "btn btn-login";
    logoutButton.textContent = "Logout";

    logoutButton.addEventListener("click", function() {
        sessionStorage.removeItem(SESSION_KEY);
        window.location.href = "index.html";
    });

    navButtons.append(greeting, logoutButton);
}

updateNavbar();

/* =================================
   FOOTER YEAR
================================= */

const yearElement = document.getElementById("year");

if (yearElement) {
    yearElement.textContent = new Date().getFullYear();
}