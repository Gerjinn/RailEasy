/* =====================================
   RAILEASY SHARED NAVIGATION SYSTEM
===================================== */

(() => {
    "use strict";

    const SESSION_KEY = "raileasy_session";

    /* =====================================
       IDENTIFY CURRENT PAGE
    ===================================== */

    const currentPage =
        window.location.pathname
            .split("/")
            .pop()
            .toLowerCase() || "index.html";

    /* =====================================
       GET CURRENT LOGGED-IN USER
    ===================================== */

    function getCurrentUser() {

        try {
            const savedSession =
                sessionStorage.getItem(SESSION_KEY);

            if (!savedSession) {
                return null;
            }

            const user = JSON.parse(savedSession);

            if (user && user.id && user.name) {
                return user;
            }

            return null;

        } catch (error) {
            return null;
        }
    }

    const currentUser = getCurrentUser();
    const isLoggedIn = currentUser !== null;

    /* =====================================
       PAGE ACCESS CONTROL
    ===================================== */

    /* PAGES FOR SIGNED-IN USERS */
    const privatePages = [
        "main.html",
        "booking.html",
        "reservations.html",
        "schedule.html"
    ];

    /* PAGES FOR GUEST USERS */
    const guestPages = [
        "index.html",
        "login.html",
        "register.html"
    ];

    /* GUESTS CANNOT OPEN PRIVATE PAGES */
    if (
        !isLoggedIn &&
        privatePages.includes(currentPage)
    ) {
        window.location.replace("login.html");
        return;
    }

    /* SIGNED-IN USERS USE MAIN DASHBOARD */
    if (
        isLoggedIn &&
        guestPages.includes(currentPage)
    ) {
        window.location.replace("main.html");
        return;
    }

    /* =====================================
       LOAD NAVIGATION CSS
    ===================================== */

    const hasNavCss = Array.from(
        document.querySelectorAll(
            'link[rel="stylesheet"]'
        )
    ).some(link =>
        link.getAttribute("href") === "nav.css"
    );

    if (!hasNavCss) {
        const css = document.createElement("link");

        css.rel = "stylesheet";
        css.href = "nav.css";

        document.head.appendChild(css);
    }

    /* =====================================
       CREATE NAVIGATION CONTAINER
    ===================================== */

    let navbarContainer =
        document.getElementById("siteNavbar");

    const oldNavbar =
        document.querySelector("nav.navbar");

    if (!navbarContainer) {

        navbarContainer =
            document.createElement("header");

        navbarContainer.id = "siteNavbar";

        /* REPLACE EXISTING NAVBAR */
        if (oldNavbar) {
            oldNavbar.replaceWith(navbarContainer);
        } else {
            document.body.prepend(navbarContainer);
        }

    } else if (
        oldNavbar &&
        !navbarContainer.contains(oldNavbar)
    ) {

        /* PREVENT DUPLICATE NAVIGATION */
        oldNavbar.remove();
    }

    /* =====================================
       CREATE NAVIGATION LINKS
    ===================================== */

    function navLink(label, href, page) {

        const isActive = currentPage === page;

        return `
            <a href="${href}"
               class="rail-link ${isActive ? "active" : ""}"
               ${isActive ? 'aria-current="page"' : ""}>

                ${label}

            </a>
        `;
    }

    let navigationLinks = "";
    let accountSection = "";

    /* =====================================
       LOGGED-IN NAVIGATION
    ===================================== */

    if (isLoggedIn) {

        navigationLinks = `

            ${navLink(
                "Home",
                "main.html",
                "main.html"
            )}

            ${navLink(
                "Fare Matrix",
                "fare.html",
                "fare.html"
            )}

            ${navLink(
                "Book a Ticket",
                "booking.html",
                "booking.html"
            )}

            ${navLink(
                "My Reservations",
                "reservations.html",
                "reservations.html"
            )}

            ${navLink(
                "Contact Us",
                "contact.html",
                "contact.html"
            )}

        `;

        /* PROFILE MENU */
        accountSection = `

            <div class="rail-profile">

                <button
                    type="button"
                    id="railProfileButton"
                    class="rail-profile-button"
                    aria-label="Open account menu"
                    aria-expanded="false"
                    aria-controls="railProfileMenu">

                    <i class="bi bi-person-circle"></i>

                </button>

                <div
                    id="railProfileMenu"
                    class="rail-profile-menu"
                    hidden>

                    <div
                        id="railProfileName"
                        class="rail-profile-name">
                    </div>

                    <button
                        type="button"
                        id="railLogoutButton"
                        class="rail-logout">

                        <i class="bi bi-box-arrow-right"></i>
                        Logout

                    </button>

                </div>

            </div>

        `;

    } else {

        /* =====================================
           GUEST NAVIGATION
        ===================================== */

        navigationLinks = `

            ${navLink(
                "Home",
                "index.html",
                "index.html"
            )}

            ${navLink(
                "Fare Matrix",
                "fare.html",
                "fare.html"
            )}

            ${navLink(
                "About Us",
                "about.html",
                "about.html"
            )}

            ${navLink(
                "Contact Us",
                "contact.html",
                "contact.html"
            )}

        `;

        /* REGISTER AND SIGN IN */
        accountSection = `

            <div class="rail-actions">

                <a href="register.html"
                   class="rail-register">
                    Register
                </a>

                <a href="login.html"
                   class="rail-login">
                    Sign In
                </a>

            </div>

        `;
    }

    /* =====================================
       DISPLAY COMPLETE NAVIGATION
    ===================================== */

    navbarContainer.innerHTML = `

        <nav class="rail-navbar">

            <div class="rail-inner">

                <!-- RAILEASY LOGO -->
                <a
                    href="${isLoggedIn ? "main.html" : "index.html"}"
                    class="rail-brand">

                    <i class="bi bi-train-front-fill"></i>
                    RailEasy

                </a>

                <!-- MOBILE MENU BUTTON -->
                <button
                    type="button"
                    class="rail-menu-button"
                    aria-label="Toggle navigation"
                    aria-controls="railMenu"
                    aria-expanded="false">

                    <i class="bi bi-list"></i>

                </button>

                <!-- NAVIGATION LINKS -->
                <div id="railMenu"
                     class="rail-menu">

                    <div class="rail-links">

                        ${navigationLinks}

                    </div>

                    <!-- USER ACCOUNT -->
                    ${accountSection}

                </div>

            </div>

        </nav>

    `;

    /* =====================================
       MOBILE NAVIGATION
    ===================================== */

    const menuButton =
        navbarContainer.querySelector(
            ".rail-menu-button"
        );

    const menu =
        navbarContainer.querySelector(
            "#railMenu"
        );

    if (menuButton && menu) {

        menuButton.addEventListener(
            "click",
            function () {

                const isOpen =
                    menu.classList.toggle("open");

                menuButton.setAttribute(
                    "aria-expanded",
                    String(isOpen)
                );
            }
        );
    }

    /* =====================================
       USER PROFILE MENU
    ===================================== */

    if (isLoggedIn) {

        const profileButton =
            document.getElementById(
                "railProfileButton"
            );

        const profileMenu =
            document.getElementById(
                "railProfileMenu"
            );

        const profileName =
            document.getElementById(
                "railProfileName"
            );

        const logoutButton =
            document.getElementById(
                "railLogoutButton"
            );

        /* DISPLAY PASSENGER NAME */
        if (profileName) {

            profileName.textContent =
                currentUser.name;
        }

        /* OPEN OR CLOSE PROFILE */
        if (profileButton && profileMenu) {

            profileButton.addEventListener(
                "click",
                function (event) {

                    event.stopPropagation();

                    const isOpening =
                        profileMenu.hidden;

                    profileMenu.hidden =
                        !isOpening;

                    profileButton.setAttribute(
                        "aria-expanded",
                        String(isOpening)
                    );
                }
            );

            /* CLOSE WHEN CLICKING OUTSIDE */
            document.addEventListener(
                "click",
                function (event) {

                    if (!event.target.closest(
                        ".rail-profile"
                    )) {

                        profileMenu.hidden = true;

                        profileButton.setAttribute(
                            "aria-expanded",
                            "false"
                        );
                    }
                }
            );

            /* CLOSE USING ESC */
            document.addEventListener(
                "keydown",
                function (event) {

                    if (
                        event.key === "Escape" &&
                        !profileMenu.hidden
                    ) {

                        profileMenu.hidden = true;

                        profileButton.setAttribute(
                            "aria-expanded",
                            "false"
                        );

                        profileButton.focus();
                    }
                }
            );
        }

        /* =====================================
           LOGOUT FUNCTION
        ===================================== */

        if (logoutButton) {

            logoutButton.addEventListener(
                "click",
                function () {

                    /* CLEAR USER SESSION */
                    sessionStorage.removeItem(
                        SESSION_KEY
                    );

                    /* REDIRECT TO WELCOME PAGE */
                    window.location.replace(
                        "index.html"
                    );
                }
            );
        }
    }

    /* =====================================
       UPDATE COPYRIGHT YEAR
    ===================================== */

    const yearElement =
        document.getElementById("year");

    if (yearElement) {

        yearElement.textContent =
            new Date().getFullYear();
    }

})();