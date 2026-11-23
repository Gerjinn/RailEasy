/* =====================================
   RAILEASY FARE MATRIX SYSTEM
===================================== */

/* MRT-3 STATIONS */
const stations = [
    { name: "North Ave.", code: "NTH" },
    { name: "Quezon Ave.", code: "QUE" },
    { name: "GMA Kamuning", code: "GMA" },
    { name: "Araneta-Cubao", code: "CUB" },
    { name: "Santolan Annapolis", code: "SAN" },
    { name: "Ortigas", code: "ORT" },
    { name: "Shaw Blvd.", code: "SHW" },
    { name: "Boni", code: "BON" },
    { name: "Guadalupe", code: "GUA" },
    { name: "Buendia", code: "BUE" },
    { name: "Ayala", code: "AYA" },
    { name: "Magallanes", code: "MAG" },
    { name: "Taft Ave.", code: "TAF" }
];

/* =====================================
   GET HTML ELEMENTS
===================================== */

const fromSelect =
    document.getElementById("fromStation");

const toSelect =
    document.getElementById("toStation");

const regularFareElement =
    document.getElementById("regularFare");

const studentFareElement =
    document.getElementById("studentFare");

const seniorFareElement =
    document.getElementById("seniorFare");

const journeyDetails =
    document.getElementById("journeyDetails");

const tableHead =
    document.getElementById("fareTableHead");

const tableBody =
    document.getElementById("fareTableBody");

/* =====================================
   ADD STATIONS TO DROPDOWNS
===================================== */

stations.forEach((station, index) => {

    /* FROM STATION */
    const fromOption = document.createElement("option");

    fromOption.value = index;
    fromOption.textContent = station.name;

    fromSelect.appendChild(fromOption);

    /* TO STATION */
    const toOption = document.createElement("option");

    toOption.value = index;
    toOption.textContent = station.name;

    toSelect.appendChild(toOption);
});

/* =====================================
   SAMPLE FARE CALCULATION
===================================== */

/*
   DEMO FARE FORMULA:

   Base Fare: ₱12
   Additional: ₱1.60 per station interval
   Maximum Fare: ₱30

   These are sample prices for the school
   prototype, not official MRT-3 fares.
*/

function getRegularFare(from, to) {

    const distance = Math.abs(from - to);

    if (distance === 0) {
        return null;
    }

    return Math.min(
        30,
        12 + Math.ceil(distance * 1.6)
    );
}

/* STUDENT DISCOUNT - 15% */
function getStudentFare(regular) {
    return Math.round(regular * 0.85);
}

/* SENIOR / PWD DISCOUNT - 20% */
function getSeniorFare(regular) {
    return Math.round(regular * 0.80);
}

/* FORMAT PRICE */
function peso(amount) {
    return "₱" + amount.toFixed(0);
}

/* =====================================
   UPDATE FARE CALCULATOR
===================================== */

function updateFares() {

    const fromValue = fromSelect.value;
    const toValue = toSelect.value;

    /* NO STATION SELECTED */
    if (fromValue === "" || toValue === "") {

        regularFareElement.textContent = "—";
        studentFareElement.textContent = "—";
        seniorFareElement.textContent =
            "Senior / PWD: —";

        journeyDetails.textContent =
            "Choose your origin and destination to calculate a sample fare.";

        updateMatrixSelection();
        return;
    }

    const from = Number(fromValue);
    const to = Number(toValue);

    /* SAME STATION SELECTED */
    if (from === to) {

        regularFareElement.textContent = "—";
        studentFareElement.textContent = "—";
        seniorFareElement.textContent =
            "Senior / PWD: —";

        journeyDetails.textContent =
            "Please select two different stations.";

        updateMatrixSelection();
        return;
    }

    /* CALCULATE FARES */
    const regular = getRegularFare(from, to);
    const student = getStudentFare(regular);
    const senior = getSeniorFare(regular);

    /* DISPLAY FARES */
    regularFareElement.textContent = peso(regular);

    studentFareElement.textContent = peso(student);

    seniorFareElement.textContent =
        "Senior / PWD: " + peso(senior);

    /* DISPLAY JOURNEY */
    const stops = Math.abs(from - to);

    journeyDetails.textContent =
        stations[from].name +
        " → " +
        stations[to].name +
        " | " +
        stops +
        (stops === 1
            ? " station interval"
            : " station intervals");

    /* HIGHLIGHT SELECTED FARE */
    updateMatrixSelection();
}

/* =====================================
   STATION DROPDOWN EVENTS
===================================== */

fromSelect.addEventListener("change", updateFares);

toSelect.addEventListener("change", updateFares);

/* =====================================
   GENERATE COMPLETE FARE MATRIX
===================================== */

/* TABLE HEADER */
const headerRow = document.createElement("tr");

const cornerHeader = document.createElement("th");

cornerHeader.textContent = "From / To";
cornerHeader.scope = "col";

headerRow.appendChild(cornerHeader);

/* ADD STATION CODES */
stations.forEach(station => {

    const th = document.createElement("th");

    th.textContent = station.code;
    th.title = station.name;
    th.scope = "col";

    headerRow.appendChild(th);
});

tableHead.appendChild(headerRow);

/* =====================================
   CREATE FARE TABLE ROWS
===================================== */

stations.forEach((fromStation, fromIndex) => {

    const row = document.createElement("tr");

    /* STATION ROW HEADER */
    const rowHeader = document.createElement("th");

    rowHeader.textContent = fromStation.name;
    rowHeader.scope = "row";

    row.appendChild(rowHeader);

    /* DESTINATION COLUMNS */
    stations.forEach((toStation, toIndex) => {

        const cell = document.createElement("td");

        /* SAME STATION */
        if (fromIndex === toIndex) {

            cell.className = "same-station";
            cell.textContent = "—";

        } else {

            const regular = getRegularFare(
                fromIndex,
                toIndex
            );

            const button = document.createElement("button");

            button.type = "button";
            button.className = "matrix-fare";

            button.textContent = peso(regular);

            button.dataset.from = fromIndex;
            button.dataset.to = toIndex;

            button.title =
                fromStation.name +
                " to " +
                toStation.name;

            /* CLICK FARE TO SELECT JOURNEY */
            button.addEventListener("click", function () {

                fromSelect.value = fromIndex;
                toSelect.value = toIndex;

                updateFares();

                document.querySelector(
                    ".fare-calculator"
                ).scrollIntoView({
                    behavior: "smooth",
                    block: "center"
                });
            });

            cell.appendChild(button);
        }

        row.appendChild(cell);
    });

    tableBody.appendChild(row);
});

/* =====================================
   HIGHLIGHT SELECTED TABLE FARE
===================================== */

function updateMatrixSelection() {

    const from = fromSelect.value;
    const to = toSelect.value;

    document.querySelectorAll(
        ".matrix-fare"
    ).forEach(button => {

        const selected =
            from !== "" &&
            to !== "" &&
            button.dataset.from === from &&
            button.dataset.to === to;

        button.classList.toggle(
            "selected",
            selected
        );

        button.setAttribute(
            "aria-pressed",
            String(selected)
        );
    });
}

/* INITIALIZE FARE DISPLAY */
updateFares();

/* =====================================
   FARE MATRIX BOTTOM SECTION
   GUEST VS LOGGED-IN USER
===================================== */

function updateFareBottomSection() {

    /* GET CURRENT LOGIN SESSION */
    const savedSession =
        sessionStorage.getItem("raileasy_session");

    let isLoggedIn = false;

    try {

        const currentUser = savedSession
            ? JSON.parse(savedSession)
            : null;

        isLoggedIn = Boolean(
            currentUser &&
            currentUser.id &&
            currentUser.name
        );

    } catch (error) {
        isLoggedIn = false;
    }

    /* GET BOTTOM SECTION */
    const title = document.getElementById(
        "fareCtaTitle"
    );

    const description = document.getElementById(
        "fareCtaDescription"
    );

    const button = document.getElementById(
        "fareCtaButton"
    );

    if (!title || !description || !button) {
        return;
    }

    /* =====================================
       LOGGED-IN USER
    ===================================== */

    if (isLoggedIn) {

        title.textContent =
            "Ready to plan your journey with us?";

        description.textContent =
            "You've checked the fares! Now choose your train schedule and start your journey.";

        button.textContent = "Reserve a Ticket";

        button.href = "booking.html";

    } else {

        /* =====================================
           GUEST USER
        ===================================== */

        title.textContent =
            "Ready to plan your journey with us?";

        description.textContent =
            "Create an account to book tickets, manage reservations, and plan your next trip with ease.";

        button.textContent = "Sign Up to Register";

        button.href = "register.html";
    }
}

/* INITIALIZE BOTTOM SECTION */
updateFareBottomSection();

/* =====================================
   FOOTER YEAR
===================================== */

const footerYear = document.getElementById("year");

if (footerYear) {
    footerYear.textContent =
        new Date().getFullYear();
}