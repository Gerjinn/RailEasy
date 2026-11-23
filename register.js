/* =====================================
   RAILEASY REGISTRATION SYSTEM
===================================== */

(() => {
    "use strict";

    const USERS_KEY = "raileasy_users";
    const SESSION_KEY = "raileasy_session";

    const $ = id => document.getElementById(id);

    let pendingAccount = null;
    let verificationCode = "";

    /* =====================================
       SWITCH REGISTRATION SCREENS
    ===================================== */

    function showScreen(screen) {

        const screens = [
            "register",
            "verify",
            "success"
        ];

        screens.forEach(name => {
            $(name + "Screen").hidden =
                name !== screen;
        });

        window.scrollTo(0, 0);
    }

    /* =====================================
       SHOW / HIDE PASSWORD
    ===================================== */

    document.querySelectorAll(
        ".password-toggle"
    ).forEach(button => {

        button.addEventListener("click", () => {

            const targetId =
                button.dataset.target;

            const input = $(targetId);

            if (!input) return;

            const icon =
                button.querySelector("i");

            /* CHECK PASSWORD VISIBILITY */
            const showPassword =
                input.type === "password";

            /* CHANGE INPUT TYPE */
            input.type = showPassword
                ? "text"
                : "password";

            /* CHANGE EYE ICON */
            if (icon) {
                icon.className = showPassword
                    ? "bi bi-eye"
                    : "bi bi-eye-slash";
            }

            /* ACCESSIBILITY */
            button.setAttribute(
                "aria-label",
                showPassword
                    ? "Hide password"
                    : "Show password"
            );

            button.setAttribute(
                "aria-pressed",
                String(showPassword)
            );

        });

    });

    /* =====================================
       ERROR MESSAGE
    ===================================== */

    function showError(id, message) {
        const element = $(id);

        element.textContent = message;
        element.hidden = false;
    }

    function clearError(id) {
        const element = $(id);

        element.textContent = "";
        element.hidden = true;
    }

    /* =====================================
       READ REGISTERED USERS
    ===================================== */

    function getUsers() {
        try {
            const saved = JSON.parse(
                localStorage.getItem(USERS_KEY)
            );

            return Array.isArray(saved)
                ? saved
                : [];

        } catch {
            return [];
        }
    }

    /* =====================================
       PASSWORD HASHING FOR DEMO ACCOUNTS

       SAME STORAGE FORMAT AS AUTH.JS
    ===================================== */

    function toHex(bytes) {
        return Array.from(
            bytes,
            byte => byte.toString(16).padStart(2, "0")
        ).join("");
    }

    function fromHex(hex) {
        const parts = hex.match(/.{2}/g);

        if (!parts) {
            throw new Error("Invalid salt");
        }

        return new Uint8Array(
            parts.map(part => parseInt(part, 16))
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

        const bits = await crypto.subtle.deriveBits(
            {
                name: "PBKDF2",
                salt: fromHex(salt),
                iterations: 120000,
                hash: "SHA-256"
            },
            key,
            256
        );

        return toHex(new Uint8Array(bits));
    }

    /* =====================================
       GENERATE DEMO VERIFICATION CODE
    ===================================== */

    function generateVerificationCode() {

        const randomNumber =
            crypto.getRandomValues(
                new Uint32Array(1)
            )[0];

        verificationCode = String(
            100000 + randomNumber % 900000
        );

        $("demoVerificationCode").textContent =
            verificationCode;
    }

    /* =====================================
       REGISTER ACCOUNT
    ===================================== */

    $("registerForm").addEventListener(
        "submit",
        event => {

            event.preventDefault();

            clearError("registerError");

            /* GET FORM VALUES */
            const lastName =
                $("lastName").value.trim();

            const firstName =
                $("firstName").value.trim();

            const phone =
                $("phoneNumber").value.trim();

            const email =
                $("registerEmail")
                    .value.trim().toLowerCase();

            const password =
                $("registerPassword").value;

            const confirmPassword =
                $("confirmPassword").value;

            /* VALIDATE REQUIRED FIELDS */
            if (
                !lastName ||
                !firstName ||
                !phone ||
                !email ||
                !password ||
                !confirmPassword
            ) {
                showError(
                    "registerError",
                    "Please complete all fields."
                );
                return;
            }

            /* VALIDATE PHONE */
            if (!/^09\d{9}$/.test(phone)) {
                showError(
                    "registerError",
                    "Enter a valid 11-digit phone number."
                );
                return;
            }

            /* VALIDATE PASSWORD LENGTH */
            if (password.length < 8) {
                showError(
                    "registerError",
                    "Password must be at least 8 characters."
                );
                return;
            }

            /* VALIDATE PASSWORD MATCH */
            if (password !== confirmPassword) {
                showError(
                    "registerError",
                    "Passwords do not match."
                );
                return;
            }

            /* CHECK EXISTING EMAIL */
            const users = getUsers();

            const emailExists = users.some(
                user => user.email === email
            );

            if (emailExists) {
                showError(
                    "registerError",
                    "This email is already registered."
                );
                return;
            }

            /* TEMPORARY ACCOUNT DETAILS */
            pendingAccount = {
                lastName,
                firstName,
                phone,
                email,
                password
            };

            /* GENERATE DEMO CODE */
            generateVerificationCode();

            /* DISPLAY VERIFICATION EMAIL */
            $("verificationEmail").textContent =
                email;

            /* CLEAR PREVIOUS OTP */
            document.querySelectorAll(
                ".otp-input"
            ).forEach(input => {
                input.value = "";
            });

            clearError("verificationError");

            /* OPEN VERIFICATION SCREEN */
            showScreen("verify");

            const firstInput =
                document.querySelector(".otp-input");

            if (firstInput) {
                firstInput.focus();
            }
        }
    );

    /* =====================================
       SIX DIGIT OTP INPUTS
    ===================================== */

    const otpInputs = Array.from(
        document.querySelectorAll(".otp-input")
    );

    otpInputs.forEach((input, index) => {

        /* AUTOMATIC NEXT INPUT */
        input.addEventListener("input", () => {

            input.value =
                input.value.replace(/\D/g, "").slice(-1);

            if (
                input.value &&
                index < otpInputs.length - 1
            ) {
                otpInputs[index + 1].focus();
            }
        });

        /* BACKSPACE GOES TO PREVIOUS INPUT */
        input.addEventListener(
            "keydown",
            event => {

                if (
                    event.key === "Backspace" &&
                    !input.value &&
                    index > 0
                ) {
                    otpInputs[index - 1].focus();
                }
            }
        );

        /* ALLOW PASTING ALL SIX DIGITS */
        input.addEventListener(
            "paste",
            event => {

                const pasted = event.clipboardData
                    .getData("text")
                    .replace(/\D/g, "")
                    .slice(0, 6);

                if (!pasted) return;

                event.preventDefault();

                otpInputs.forEach((field, i) => {
                    field.value = pasted[i] || "";
                });

                otpInputs[
                    Math.min(
                        pasted.length,
                        otpInputs.length - 1
                    )
                ].focus();
            }
        );
    });

    /* =====================================
       VERIFY ACCOUNT
    ===================================== */

    $("verifyAccountBtn").addEventListener(
        "click",
        async () => {

            clearError("verificationError");

            if (!pendingAccount) {
                showScreen("register");
                return;
            }

            /* COLLECT VERIFICATION CODE */
            const enteredCode =
                otpInputs.map(
                    input => input.value
                ).join("");

            if (enteredCode !== verificationCode) {
                showError(
                    "verificationError",
                    "Incorrect verification code. Please try again."
                );
                return;
            }

            const button = $("verifyAccountBtn");

            button.disabled = true;
            button.textContent = "Creating Account...";

            try {

                /* CHECK EMAIL AGAIN */
                const users = getUsers();

                if (
                    users.some(
                        user =>
                            user.email ===
                            pendingAccount.email
                    )
                ) {
                    showError(
                        "verificationError",
                        "This email is already registered."
                    );
                    return;
                }

                /* HASH DEMO PASSWORD */
                const salt = toHex(
                    crypto.getRandomValues(
                        new Uint8Array(16)
                    )
                );

                const passwordHash =
                    await hashPassword(
                        pendingAccount.password,
                        salt
                    );

                /* CREATE USER ACCOUNT */
                const newUser = {
                    id: crypto.randomUUID(),
                    name:
                        pendingAccount.firstName +
                        " " +
                        pendingAccount.lastName,

                    firstName:
                        pendingAccount.firstName,

                    lastName:
                        pendingAccount.lastName,

                    phone:
                        pendingAccount.phone,

                    email:
                        pendingAccount.email,

                    salt,
                    passwordHash,

                    verified: true,
                    createdAt:
                        new Date().toISOString()
                };

                /* SAVE ACCOUNT */
                users.push(newUser);

                localStorage.setItem(
                    USERS_KEY,
                    JSON.stringify(users)
                );

                /* AUTOMATIC LOGIN */
                const currentUser = {
                    id: newUser.id,
                    name: newUser.name,
                    email: newUser.email
                };

                sessionStorage.setItem(
                    SESSION_KEY,
                    JSON.stringify(currentUser)
                );

                /* CLEAR TEMPORARY PASSWORD */
                pendingAccount = null;
                verificationCode = "";

                $("registerPassword").value = "";
                $("confirmPassword").value = "";

                /* SHOW SUCCESS SCREEN */
                showScreen("success");

            } catch (error) {

                showError(
                    "verificationError",
                    "Unable to create account. Use HTTPS or Live Server and try again."
                );

            } finally {

                button.disabled = false;
                button.textContent = "Verify Account";
            }

        }
    );

    /* =====================================
       RESEND DEMO VERIFICATION CODE
    ===================================== */

    $("resendCodeBtn").addEventListener(
        "click",
        () => {

            if (!pendingAccount) {
                showScreen("register");
                return;
            }

            generateVerificationCode();

            clearError("verificationError");

            otpInputs.forEach(input => {
                input.value = "";
            });

            otpInputs[0].focus();
        }
    );

    /* =====================================
       BACK TO REGISTRATION
    ===================================== */

    $("backToRegisterBtn").addEventListener(
        "click",
        () => {

            pendingAccount = null;
            verificationCode = "";

            showScreen("register");
        }
    );

    /* =====================================
       GOOGLE REGISTRATION DEMO NOTICE
    ===================================== */

    $("googleRegisterBtn").addEventListener(
        "click",
        () => {

            const notice = $("googleMessage");

            notice.textContent =
                "Google Sign-In requires an authentication service and is not connected in this demo.";

            notice.hidden = false;
        }
    );

    /* =====================================
       COPYRIGHT YEAR
    ===================================== */

    const year = $("year");

    if (year) {
        year.textContent =
            new Date().getFullYear();
    }

})();