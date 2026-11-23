/* =====================================
   RAILEASY CONTACT US SYSTEM
===================================== */

(() => {
    "use strict";

    const SESSION_KEY = "raileasy_session";
    const FEEDBACK_KEY = "raileasy_feedback";

    const $ = id => document.getElementById(id);

    const form = $("feedbackForm");
    const modal = $("feedbackModal");
    const errorBox = $("feedbackError");

    let previousFocus = null;

    /* =====================================
       CHECK LOGGED-IN USER
    ===================================== */

    let currentUser = null;

    try {
        const saved = sessionStorage.getItem(
            SESSION_KEY
        );

        if (saved) {
            const user = JSON.parse(saved);

            if (user && user.id && user.name) {
                currentUser = user;
            }
        }

    } catch {
        currentUser = null;
    }

    /* =====================================
       HOME BUTTON DESTINATION
    ===================================== */

    const homePage = currentUser
        ? "main.html"
        : "index.html";

    $("feedbackHomeBtn").href = homePage;

    /* UPDATE FOOTER HOME LINK */
    const footerHome = document.querySelector(
        '.contact-page footer a[href="main.html"]'
    );

    if (footerHome) {
        footerHome.href = homePage;
    }

    /* =====================================
       PREFILL PASSENGER DETAILS
    ===================================== */

    function prefillUserDetails() {
        if (!currentUser) return;

        $("contactName").value =
            currentUser.name || "";

        $("contactEmail").value =
            currentUser.email || "";
    }

    prefillUserDetails();

    /* =====================================
       SHOW ERROR MESSAGE
    ===================================== */

    function showError(message) {
        errorBox.textContent = message;
        errorBox.hidden = false;
    }

    function clearError() {
        errorBox.textContent = "";
        errorBox.hidden = true;
    }

    /* =====================================
       READ STORED DEMO FEEDBACK
    ===================================== */

    function getFeedback() {
        try {
            const data = JSON.parse(
                localStorage.getItem(FEEDBACK_KEY)
            );

            return Array.isArray(data)
                ? data
                : [];

        } catch {
            return [];
        }
    }

    /* =====================================
       SUBMIT FEEDBACK FORM
    ===================================== */

    form.addEventListener("submit", function(event) {

        event.preventDefault();

        clearError();

        const name = $("contactName").value.trim();

        const email = $("contactEmail")
            .value.trim().toLowerCase();

        const phone = $("contactPhone").value.trim();

        const message = $("contactMessage").value.trim();

        /* CHECK REQUIRED FIELDS */
        if (!name || !email || !message) {
            showError(
                "Please fill in all required fields."
            );
            return;
        }

        if (message.length < 5) {
            showError(
                "Please enter a message with at least 5 characters."
            );
            return;
        }

        if (phone && !/^09\d{9}$/.test(phone)) {
            showError(
                "Please enter a valid 11-digit mobile number."
            );
            return;
        }

        /* CREATE DEMO FEEDBACK RECORD */
        const feedback = {
            id: "FB" + Date.now(),
            userId: currentUser
                ? currentUser.id
                : null,

            name: name,
            email: email,
            phone: phone,
            message: message,

            submittedAt: new Date().toISOString(),
            status: "Saved Locally"
        };

        /* SAVE TO BROWSER STORAGE */
        try {
            const feedbackList = getFeedback();

            feedbackList.push(feedback);

            localStorage.setItem(
                FEEDBACK_KEY,
                JSON.stringify(feedbackList)
            );

        } catch {
            showError(
                "Unable to save feedback. " +
                "Please check your browser storage."
            );
            return;
        }

        /* RESET FORM */
        form.reset();

        prefillUserDetails();

        /* SHOW SUCCESS POPUP */
        showFeedbackModal();
    });

    /* =====================================
       SHOW FEEDBACK SUCCESS MODAL
    ===================================== */

    function showFeedbackModal() {
        previousFocus = document.activeElement;

        modal.hidden = false;

        document.body.style.overflow = "hidden";

        $("closeFeedbackModal").focus();
    }

    /* =====================================
       CLOSE FEEDBACK MODAL
    ===================================== */

    function closeFeedbackModal() {
        modal.hidden = true;

        document.body.style.overflow = "";

        if (
            previousFocus &&
            previousFocus.isConnected
        ) {
            previousFocus.focus();
        }

        previousFocus = null;
    }

    /* CLOSE X BUTTON */
    $("closeFeedbackModal").addEventListener(
        "click",
        closeFeedbackModal
    );

    /* CLICK OUTSIDE POPUP */
    modal.addEventListener("click", function(event) {

        if (event.target === modal) {
            closeFeedbackModal();
        }
    });

    /* ESCAPE KEY */
    document.addEventListener(
        "keydown",
        function(event) {

            if (modal.hidden) return;

            if (event.key === "Escape") {
                closeFeedbackModal();
            }

            /* KEEP TAB FOCUS INSIDE POPUP */
            if (event.key === "Tab") {
                const buttons = [
                    $("closeFeedbackModal"),
                    $("feedbackHomeBtn")
                ];

                const first = buttons[0];
                const last = buttons[1];

                if (
                    event.shiftKey &&
                    document.activeElement === first
                ) {
                    event.preventDefault();
                    last.focus();

                } else if (
                    !event.shiftKey &&
                    document.activeElement === last
                ) {
                    event.preventDefault();
                    first.focus();
                }
            }
        }
    );

    /* =====================================
       ANNOUNCEMENT LEARN MORE BUTTONS
    ===================================== */

    document.querySelectorAll(
        ".announcement-link"
    ).forEach(button => {

        button.addEventListener("click", function() {

            const targetId = this.dataset.target;

            const details = $(targetId);

            if (!details) return;

            const opening = details.hidden;

            details.hidden = !opening;

            this.setAttribute(
                "aria-expanded",
                String(opening)
            );

            this.textContent = opening
                ? "Show Less"
                : "Learn More";
        });
    });

    /* =====================================
       COPYRIGHT YEAR
    ===================================== */

    const year = $("year");

    if (year) {
        year.textContent = new Date().getFullYear();
    }

})();