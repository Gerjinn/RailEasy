/* =================================
   RAILEASY MAIN DASHBOARD
================================= */

const SESSION_KEY = "raileasy_session";

/* CHECK LOGIN SESSION */
function getCurrentUser() {
    try {
        return JSON.parse(
            sessionStorage.getItem(SESSION_KEY)
        );
    } catch {
        return null;
    }
}

const currentUser = getCurrentUser();

/* REQUIRE LOGIN */
if (!currentUser || !currentUser.id) {

    window.location.replace("login.html");

} else {

    /* DISPLAY USER NAME */
    const profileName =
        document.getElementById("profileName");

    if (profileName) {
        profileName.textContent =
            currentUser.name;
    }

    /* LOGOUT FUNCTION */
    const logoutButton =
        document.getElementById("logoutBtn");

    if (logoutButton) {

        logoutButton.addEventListener(
            "click",
            function () {

                sessionStorage.removeItem(SESSION_KEY);

                window.location.replace("index.html");
            }
        );
    }
}

/* FOOTER YEAR */
const yearElement = document.getElementById("year");

if (yearElement) {
    yearElement.textContent =
        new Date().getFullYear();
}