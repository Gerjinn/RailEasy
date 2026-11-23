/* =====================================
   RAILEASY BOOK A TICKET SYSTEM
===================================== */

(() => {
  "use strict";

  const SESSION_KEY = "raileasy_session";
  const USERS_KEY = "raileasy_users";
  const RESERVATIONS_KEY = "raileasy_reservations";

  /* MRT-3 STATIONS */
  const STATIONS = [
    ["North Ave.", "NTH"],
    ["Quezon Ave.", "QUE"],
    ["GMA Kamuning", "GMA"],
    ["Araneta-Cubao", "CUB"],
    ["Santolan Annapolis", "SAN"],
    ["Ortigas", "ORT"],
    ["Shaw Blvd.", "SHW"],
    ["Boni", "BON"],
    ["Guadalupe", "GUA"],
    ["Buendia", "BUE"],
    ["Ayala", "AYA"],
    ["Magallanes", "MAG"],
    ["Taft Ave.", "TAF"]
  ];

  /* CHECK LOGIN SESSION */
  let user = null;

  try {
    user = JSON.parse(
      sessionStorage.getItem(SESSION_KEY)
    );
  } catch {
    user = null;
  }

  if (!user || !user.id) {
    location.replace("login.html");
    return;
  }

  /* =====================================
     HELPER FUNCTIONS
  ===================================== */

  const $ = id => document.getElementById(id);

  const escapeHtml = value =>
    String(value ?? "").replace(
      /[&<>"']/g,
      char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
      }[char])
    );

  const money = amount =>
    "₱" + Number(amount).toFixed(0);

  /* SAMPLE FARE FORMULA */
  const regularFare = (from, to) =>
    Math.min(
      30,
      12 + Math.ceil(Math.abs(from - to) * 1.6)
    );

  const durationFor = (from, to) =>
    Math.max(
      4,
      Math.round(Math.abs(from - to) * 3.6)
    );

  /* DATE FORMAT */
  const dateAtLocalMidnight = value => {
    const [year, month, day] =
      value.split("-").map(Number);

    return new Date(year, month - 1, day);
  };

  const dateLabel = value =>
    dateAtLocalMidnight(value).toLocaleDateString(
      "en-PH",
      {
        month: "short",
        day: "numeric",
        year: "numeric"
      }
    );

  /* UPDATED: DATE ISSUED WITH TIME */
  function dateTimeLabel(value) {
    if (!value) return "—";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "—";
    }

    return date.toLocaleString("en-PH", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone: "Asia/Manila"
    });
  }

  const dateISO = date => [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0")
  ].join("-");

  /* TIME FORMAT */
  const timeLabel = value => {
    const [hour, minute] =
      value.split(":").map(Number);

    return (
      `${hour % 12 || 12}:` +
      `${String(minute).padStart(2, "0")} ` +
      (hour >= 12 ? "PM" : "AM")
    );
  };

  /* ADD MINUTES */
  const addMinutes = (value, minutes) => {
    const [hour, minute] =
      value.split(":").map(Number);

    const total = hour * 60 + minute + minutes;

    return (
      `${String(Math.floor(total / 60) % 24)
        .padStart(2, "0")}:` +
      `${String(total % 60).padStart(2, "0")}`
    );
  };

  /* READ SAVED DATA */
  const getJSON = (storage, key, fallback) => {
    try {
      return JSON.parse(storage.getItem(key)) ??
        fallback;
    } catch {
      return fallback;
    }
  };

  let selected = null;
  let passenger = null;
  let pending = null;
  let confirmed = null;

  /* =====================================
     SWITCH BOOKING SCREENS
  ===================================== */

  function show(screen) {
    [
      "search",
      "details",
      "scheduleConfirmed",
      "passenger",
      "review",
      "success"
    ].forEach(name => {
      $(name + "Screen").hidden = name !== screen;
    });

    window.scrollTo(0, 0);
  }

  /* =====================================
     POPULATE STATION DROPDOWNS
  ===================================== */

  ["fromStation", "toStation"].forEach(id => {
    $(id).add(new Option("Select...", ""));

    STATIONS.forEach((station, index) => {
      $(id).add(
        new Option(station[0], String(index))
      );
    });
  });

  /* DEFAULT ROUTE */
  $("fromStation").value = "0";
  $("toStation").value = "5";

  /* =====================================
     TRAVEL DATE AND TIME
  ===================================== */

  const today = new Date();

  const tomorrow = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate() + 1
  );

  $("travelDate").min = dateISO(today);
  $("travelDate").value = dateISO(tomorrow);

  /* SAMPLE DEPARTURE TIMES */
  for (
    let minute = 8 * 60;
    minute <= 20 * 60;
    minute += 20
  ) {
    const time =
      `${String(Math.floor(minute / 60))
        .padStart(2, "0")}:` +
      `${String(minute % 60).padStart(2, "0")}`;

    $("travelTime").add(
      new Option(timeLabel(time), time)
    );
  }

  $("travelTime").value = "any";

  /* =====================================
     GENERATE AVAILABLE SCHEDULES
  ===================================== */

  function availableTimes(date, earliest) {
    const now = new Date();
    const sameDay = date === dateISO(now);

    const currentMinutes =
      now.getHours() * 60 + now.getMinutes();

    const cutoff = earliest === "any"
      ? 8 * 60
      : Number(earliest.slice(0, 2)) * 60 +
        Number(earliest.slice(3));

    const times = [];

    for (
      let minute = 8 * 60;
      minute <= 20 * 60;
      minute += 20
    ) {
      if (
        minute < cutoff ||
        (sameDay && minute <= currentMinutes)
      ) {
        continue;
      }

      times.push(
        `${String(Math.floor(minute / 60))
          .padStart(2, "0")}:` +
        `${String(minute % 60).padStart(2, "0")}`
      );
    }

    return times.slice(0, 4);
  }

  function makeSchedule(time, index, from, to, date) {
    const duration = durationFor(from, to);

    return {
      trainName: `RailEasy Express ${index % 2 + 1}`,
      from,
      to,
      date,
      departure: time,
      arrival: addMinutes(time, duration),
      duration,
      fare: regularFare(from, to)
    };
  }

  /* =====================================
     SEARCH TRAIN SCHEDULES
  ===================================== */

  function searchSchedules(event) {
    if (event) event.preventDefault();

    $("searchMessage").hidden = true;

    const fromValue = $("fromStation").value;
    const toValue = $("toStation").value;
    const date = $("travelDate").value;
    const time = $("travelTime").value;

    const error = message => {
      $("searchMessage").textContent = message;
      $("searchMessage").hidden = false;
    };

    if (!fromValue || !toValue || !date) {
      return error(
        "Please select your stations and travel date."
      );
    }

    const from = Number(fromValue);
    const to = Number(toValue);

    if (from === to) {
      return error(
        "From Station and To Station must be different."
      );
    }

    if (
      dateAtLocalMidnight(date) <
      dateAtLocalMidnight(dateISO(new Date()))
    ) {
      return error(
        "Please select a valid travel date."
      );
    }

    /* UPDATE ROUTE SUMMARY */
    $("searchSummary").textContent =
      `${STATIONS[from][0].toUpperCase()} → ` +
      `${STATIONS[to][0].toUpperCase()} | ` +
      dateLabel(date);

    const container = $("scheduleCards");
    container.replaceChildren();

    const times = availableTimes(date, time);

    if (!times.length) {
      container.innerHTML = `
        <p class="no-schedules">
          No remaining demo departures.
          Try another date or an earlier time.
        </p>
      `;
      return;
    }

    /* CREATE TRAIN CARDS */
    times.forEach((departure, index) => {
      const item = makeSchedule(
        departure,
        index,
        from,
        to,
        date
      );

      const card = document.createElement("article");
      card.className = "schedule-card";

      card.innerHTML = `
        <div class="schedule-card-header">
          <i class="bi bi-train-front-fill"></i>
          ${escapeHtml(item.trainName)}
        </div>

        <div class="schedule-card-body">

          <div class="schedule-card-route">

            <div>
              <strong>${timeLabel(item.departure)}</strong>
              <small>${escapeHtml(STATIONS[from][0])}</small>
            </div>

            <i class="bi bi-arrow-right route-arrow"></i>

            <div class="end-time">
              <strong>${timeLabel(item.arrival)}</strong>
              <small>${escapeHtml(STATIONS[to][0])}</small>
            </div>

          </div>

          <div class="schedule-card-footer">
            <span>
              Travel Duration:
              ${item.duration} minutes
            </span>

            <button type="button" class="book-btn">
              View Details
            </button>
          </div>

        </div>
      `;

      card.querySelector("button")
        .addEventListener("click", () => {
          selected = item;
          passenger = null;
          pending = null;
          confirmed = null;

          showDetails();
        });

      container.appendChild(card);
    });
  }

  $("searchForm").addEventListener(
    "submit",
    searchSchedules
  );

  /* =====================================
     SELECTED TRAIN DETAILS
  ===================================== */

  function showDetails() {
    if (!selected) {
      show("search");
      return;
    }

    const s = selected;

    $("detailsTrainCard").innerHTML = `
      <div class="detail-card-header">
        <i class="bi bi-train-front-fill"></i>
        ${escapeHtml(s.trainName)}
      </div>

      <div class="detail-card-body">

        <div class="detail-card-date">
          ${dateLabel(s.date)}
        </div>

        <div class="detail-card-route">

          <div>
            <strong>
              ${escapeHtml(STATIONS[s.from][0])}
            </strong>
            <small>
              Departure: ${timeLabel(s.departure)}
            </small>
          </div>

          <i class="bi bi-arrow-right"></i>

          <div>
            <strong>
              ${escapeHtml(STATIONS[s.to][0])}
            </strong>
            <small>
              Arrival: ${timeLabel(s.arrival)}
            </small>
          </div>

        </div>

        <p class="detail-card-duration">
          Duration: ${s.duration} minutes
          · Sample regular fare: ${money(s.fare)}
        </p>

      </div>
    `;

    show("details");
  }

  /* BACK BUTTONS */
  document.querySelectorAll("[data-go]")
    .forEach(button => {
      button.addEventListener("click", () => {
        const target = button.dataset.go;

        if (target === "details") {
          showDetails();
        } else {
          show(target);
        }
      });
    });

  /* =====================================
     CONFIRM TRAIN SCHEDULE
  ===================================== */

  $("confirmScheduleBtn").addEventListener(
    "click",
    () => {
      if (selected) {
        show("scheduleConfirmed");
      }
    }
  );

  /* =====================================
     CONTINUE TO PASSENGER DETAILS
  ===================================== */

  $("continueToPassenger").addEventListener(
    "click",
    () => {
      if (!selected) {
        show("search");
        return;
      }

      const accounts = getJSON(
        localStorage,
        USERS_KEY,
        []
      );

      const account = Array.isArray(accounts)
        ? accounts.find(item => item.id === user.id) || {}
        : {};

      const parts = String(user.name || "")
        .trim()
        .split(/\s+/);

      /* PREFILL REGISTERED DETAILS */
      $("passFirst").value =
        account.firstName || parts[0] || "";

      $("passLast").value =
        account.lastName ||
        parts.slice(1).join(" ") || "";

      $("passEmail").value =
        account.email || user.email || "";

      $("passPhone").value =
        account.phone || "";

      /* DISPLAY SELECTED TRIP */
      $("passengerTrip").innerHTML = `
        <div class="passenger-trip-header">
          ${escapeHtml(selected.trainName)}
        </div>

        <div class="passenger-trip-main">

          <div>
            <strong>
              ${escapeHtml(STATIONS[selected.from][1])}
            </strong>
            <span>
              ${escapeHtml(STATIONS[selected.from][0])}
            </span>
          </div>

          <i class="bi bi-train-front-fill"></i>

          <div style="text-align:right">
            <strong>
              ${escapeHtml(STATIONS[selected.to][1])}
            </strong>
            <span>
              ${escapeHtml(STATIONS[selected.to][0])}
            </span>
          </div>

        </div>

        <div class="passenger-trip-bottom">

          <span>
            ${timeLabel(selected.departure)}
            <br>
            ${dateLabel(selected.date)}
          </span>

          <span>
            Duration: ${selected.duration} min
          </span>

          <span>
            ${timeLabel(selected.arrival)}
            <br>
            ${dateLabel(selected.date)}
          </span>

        </div>
      `;

      show("passenger");
    }
  );

  /* =====================================
     PASSENGER FARE DISCOUNT
  ===================================== */

  function priceFor(type, regular) {
    if (type === "Student") {
      return Math.round(regular * 0.85);
    }

    if (type === "Senior" || type === "PWD") {
      return Math.round(regular * 0.8);
    }

    return regular;
  }

  /* GENERATE TICKET ID */
  function newTicketId() {
    const digits =
      crypto.getRandomValues(new Uint32Array(1))[0]
      % 100000000;

    return "RE" + String(digits).padStart(8, "0");
  }

  /* =====================================
     PASSENGER DETAILS FORM
  ===================================== */

  $("passengerForm").addEventListener(
    "submit",
    event => {
      event.preventDefault();

      if (!selected) {
        show("search");
        return;
      }

      passenger = {
        lastName: $("passLast").value.trim(),
        firstName: $("passFirst").value.trim(),
        middleName: $("passMiddle").value.trim(),
        sex: $("passSex").value,
        passengerType: $("passType").value,
        email: $("passEmail").value.trim().toLowerCase(),
        phone: $("passPhone").value.trim()
      };

      pending = {
        id: pending?.id || newTicketId(),
        userId: user.id,

        trainName: selected.trainName,
        from: selected.from,
        to: selected.to,

        fromStation: STATIONS[selected.from][0],
        toStation: STATIONS[selected.to][0],

        fromCode: STATIONS[selected.from][1],
        toCode: STATIONS[selected.to][1],

        travelDate: selected.date,
        departure: selected.departure,
        arrival: selected.arrival,
        duration: selected.duration,

        ...passenger,

        fare: priceFor(
          passenger.passengerType,
          selected.fare
        ),

        status: "Pending Confirmation",
        paymentStatus: "Pay at Station",

        /* ISSUE DATE AND TIME */
        issuedAt: pending?.issuedAt ||
          new Date().toISOString()
      };

      renderTicket(
        $("reviewTicket"),
        pending
      );

      show("review");
    }
  );

  /* =====================================
     UPDATED RAIL EASY TICKET DESIGN
  ===================================== */

  function renderTicket(mount, ticket) {
    const fullName =
      `${ticket.lastName}, ${ticket.firstName}` +
      (ticket.middleName
        ? " " + ticket.middleName
        : "");

    mount.innerHTML = `
      <article class="book-ticket"
               aria-label="RailEasy demo reservation ticket">

        <!-- BLUE TICKET SECTION -->
        <div class="book-ticket-blue">

          <!-- NON-TRANSFERABLE TEXT -->
          <div class="book-ticket-meta">
            <span class="book-ticket-nontransferable">
              NON-TRANSFERABLE
            </span>
          </div>

          <!-- TRAIN LOGO BEFORE RAILEASY -->
          <div class="book-ticket-vertical-brand">
            <i class="bi bi-train-front-fill"></i>
            <span>RAILEASY</span>
          </div>

          <!-- PASSENGER NAME AND TYPE -->
          <div class="book-ticket-blue-header">

            <div>
              <small>NAME:</small>
              <strong>
                ${escapeHtml(fullName)}
              </strong>
            </div>

            <div>
              <small>TYPE:</small>
              <strong>
                ${escapeHtml(ticket.passengerType)}
              </strong>
            </div>

          </div>

          <!-- TICKET ID AND DATE ISSUED -->
          <div class="book-ticket-blue-header">

            <div>
              <small>TICKET ID:</small>
              <strong>
                ${escapeHtml(ticket.id)}
              </strong>
            </div>

            <div>
              <small>DATE ISSUED:</small>
              <strong>
                ${escapeHtml(
                  dateTimeLabel(ticket.issuedAt)
                )}
              </strong>
            </div>

          </div>

          <!-- STATION ROUTE -->
          <div class="book-ticket-route">

            <div>
              <strong>
                ${escapeHtml(ticket.fromCode)}
              </strong>
              <span>
                ${escapeHtml(ticket.fromStation)}
              </span>
            </div>

            <i class="bi bi-arrow-right"></i>

            <div style="text-align:right">
              <strong>
                ${escapeHtml(ticket.toCode)}
              </strong>
              <span>
                ${escapeHtml(ticket.toStation)}
              </span>
            </div>

          </div>

        </div>

        <!-- WHITE TICKET SECTION -->
        <div class="book-ticket-white">

          <!-- TRAVEL INFORMATION -->
          <div>
            <small>DATE:</small>
            <strong>
              ${dateLabel(ticket.travelDate)}
            </strong>

            <small>DEPARTURE TIME:</small>
            <strong>
              ${timeLabel(ticket.departure)}
            </strong>

            <small>VALIDITY:</small>
            <strong>Single Journey</strong>
          </div>

          <!-- STATUS AND FARE -->
          <div>
            <small>STATUS:</small>

            <strong class="ticket-status">
              ${escapeHtml(ticket.status)}
            </strong>

            <small>PAYMENT:</small>
            <strong>
              ${escapeHtml(ticket.paymentStatus)}
            </strong>

            <small>FARE:</small>
            <strong class="ticket-amount">
              ${money(ticket.fare)}
            </strong>
          </div>

          <!-- DEMO QR CODE -->
          <div class="ticket-qr-holder"></div>

        </div>

      </article>
    `;

    /* GENERATE QR CODE */
    const qr = mount.querySelector(
      ".ticket-qr-holder"
    );

    if (typeof QRCode === "function") {
      new QRCode(qr, {
        text: JSON.stringify({
          demo: true,
          ticket: ticket.id,
          route:
            `${ticket.fromCode}-${ticket.toCode}`
        }),
        width: 88,
        height: 88,
        correctLevel: QRCode.CorrectLevel.M
      });

    } else {
      qr.innerHTML = `
        <div class="qr-fallback">
          DEMO QR
          <br>
          ${escapeHtml(ticket.id)}
        </div>
      `;
    }
  }

  /* =====================================
     CONFIRM RESERVATION
  ===================================== */

  $("confirmReservationBtn").addEventListener(
    "click",
    () => {
      if (!pending || confirmed) return;

      const reservations = getJSON(
        localStorage,
        RESERVATIONS_KEY,
        []
      );

      if (!Array.isArray(reservations)) return;

      /* SAVE CONFIRMED TICKET */
      const ticket = {
        ...pending,
        status: "Confirmed",
        issuedAt: new Date().toISOString()
      };

      reservations.push(ticket);

      try {
        localStorage.setItem(
          RESERVATIONS_KEY,
          JSON.stringify(reservations)
        );

        confirmed = ticket;

        $("confirmReservationBtn").disabled = true;

        renderTicket(
          $("successTicket"),
          confirmed
        );

        show("success");

      } catch (error) {
        alert(
          "Could not save the reservation. " +
          "Check browser storage and try again."
        );
      }
    }
  );

  /* =====================================
     DRAW TRAIN LOGO FOR PNG
  ===================================== */

  function drawTrainLogo(context, x, y) {
    context.save();

    context.strokeStyle = "#ffffff";
    context.lineWidth = 3;

    context.beginPath();
    context.roundRect(x, y, 29, 30, 6);
    context.stroke();

    /* TRAIN WINDOWS */
    context.strokeRect(x + 5, y + 6, 19, 10);

    /* TRAIN WHEELS */
    context.beginPath();
    context.arc(x + 7, y + 25, 2, 0, Math.PI * 2);
    context.arc(x + 22, y + 25, 2, 0, Math.PI * 2);
    context.fillStyle = "#ffffff";
    context.fill();

    context.restore();
  }

  /* =====================================
     SAVE TICKET TO PNG
  ===================================== */

  $("saveTicketBtn").addEventListener(
    "click",
    () => {
      if (!confirmed) return;

      const ticket = confirmed;

      const canvas = document.createElement("canvas");
      canvas.width = 1000;
      canvas.height = 550;

      const context = canvas.getContext("2d");

      /* WHITE BACKGROUND */
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, 1000, 550);

      /* BLUE TICKET TOP */
      context.fillStyle = "#34699e";
      context.fillRect(0, 0, 1000, 300);

      /* RAILEASY LOGO */
      drawTrainLogo(context, 35, 22);

      context.fillStyle = "#ffffff";
      context.textAlign = "left";
      context.font = "bold 26px Arial";

      context.fillText(
        "RAILEASY",
        78,
        46
      );

      /* NON-TRANSFERABLE */
      context.textAlign = "right";
      context.font = "bold 16px Arial";

      context.fillText(
        "NON-TRANSFERABLE",
        955,
        42
      );

      /* TICKET INFORMATION */
      context.textAlign = "left";
      context.font = "18px Arial";

      context.fillText(
        `Ticket ID: ${ticket.id}`,
        35,
        103
      );

      context.fillText(
        `Date Issued: ${dateTimeLabel(ticket.issuedAt)}`,
        35,
        139
      );

      context.fillText(
        `Passenger: ${ticket.lastName}, ` +
        `${ticket.firstName} ${ticket.middleName}`,
        35,
        175,
        860
      );

      context.fillText(
        `Type: ${ticket.passengerType}`,
        35,
        208
      );

      /* ROUTE */
      context.font = "bold 34px Arial";

      context.fillText(
        `${ticket.fromCode}   →   ${ticket.toCode}`,
        35,
        258
      );

      context.font = "17px Arial";

      context.fillText(
        `${ticket.fromStation} to ${ticket.toStation}`,
        390,
        257,
        550
      );

      /* WHITE TICKET DETAILS */
      context.fillStyle = "#244e76";
      context.font = "bold 21px Arial";

      context.fillText(
        `Travel Date: ${dateLabel(ticket.travelDate)}`,
        35,
        359
      );

      context.fillText(
        `Departure Time: ${timeLabel(ticket.departure)}`,
        35,
        403
      );

      context.fillText(
        `Fare: ${money(ticket.fare)}  •  ${ticket.passengerType}`,
        35,
        447
      );

      context.fillText(
        "Status: Confirmed  •  Pay at Station",
        35,
        487
      );

      /* DEMO DISCLAIMER */
      context.fillStyle = "#777777";
      context.font = "15px Arial";

      context.fillText(
        "School prototype only - not a valid railway ticket.",
        35,
        527
      );

      /* QR CODE */
      try {
        const qrCanvas = $("successTicket")
          .querySelector(
            ".ticket-qr-holder canvas"
          );

        if (qrCanvas) {
          context.drawImage(
            qrCanvas,
            792,
            327,
            150,
            150
          );
        }
      } catch (error) {
        /* Download still works without QR */
      }

      /* DOWNLOAD */
      const link = document.createElement("a");

      link.href = canvas.toDataURL("image/png");
      link.download = `RailEasy-${ticket.id}.png`;

      document.body.appendChild(link);
      link.click();
      link.remove();

      $("saveMessage").textContent =
        "Ticket image downloaded. Check your Downloads folder.";
    }
  );

  /* =====================================
     FOOTER YEAR
  ===================================== */

  const year = $("year");

  if (year) {
    year.textContent = new Date().getFullYear();
  }

  /* SHOW INITIAL TRAIN SCHEDULES */
  searchSchedules();

})();