/* =====================================
   RAILEASY MY RESERVATIONS SYSTEM
===================================== */

(() => {
  "use strict";

  const SESSION_KEY = "raileasy_session";
  const RESERVATIONS_KEY = "raileasy_reservations";

  const $ = id => document.getElementById(id);

  /* =====================================
     CHECK LOGGED-IN USER
  ===================================== */

  let user = null;

  try {
    user = JSON.parse(
      sessionStorage.getItem(SESSION_KEY)
    );
  } catch {
    user = null;
  }

  if (!user || !user.id) {
    window.location.replace("login.html");
    return;
  }

  /* =====================================
     HELPER FUNCTIONS
  ===================================== */

  function escapeHtml(value) {
    return String(value ?? "").replace(
      /[&<>"']/g,
      char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
      }[char])
    );
  }

  function money(value) {
    return "₱" + Number(value || 0).toFixed(0);
  }

  /* FORMAT TRAVEL DATE */
  function dateLabel(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(
      String(value)
    )) {
      return "Unknown Date";
    }

    const [year, month, day] =
      value.split("-").map(Number);

    return new Date(
      year,
      month - 1,
      day
    ).toLocaleDateString("en-PH", {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  }

  /* FORMAT DATE ISSUED WITH TIME */
  function dateTimeLabel(value) {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "Not Available";
    }

    return date.toLocaleString("en-PH", {
      timeZone: "Asia/Manila",
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true
    });
  }

  /* FORMAT DEPARTURE AND ARRIVAL TIME */
  function timeLabel(value) {
    if (!/^\d{2}:\d{2}$/.test(
      String(value)
    )) {
      return String(value || "—");
    }

    const [hour, minute] =
      value.split(":").map(Number);

    return (
      `${hour % 12 || 12}:` +
      `${String(minute).padStart(2, "0")} ` +
      (hour >= 12 ? "PM" : "AM")
    );
  }

  /* =====================================
     RESERVATION DATE CHECKING
  ===================================== */

  function departureTimestamp(ticket) {
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(
        String(ticket.travelDate)
      ) ||
      !/^\d{2}:\d{2}$/.test(
        String(ticket.departure)
      )
    ) {
      return NaN;
    }

    /* PHILIPPINE TIME */
    return Date.parse(
      `${ticket.travelDate}T` +
      `${ticket.departure}:00+08:00`
    );
  }

  /* CHECK IF TICKET IS CANCELLED */
  function isCancelled(ticket) {
    const status = String(
      ticket.status || ""
    ).toLowerCase();

    return (
      status === "canceled" ||
      status === "cancelled"
    );
  }

  /* CHECK IF TRIP HAS PASSED */
  function isExpired(ticket) {
    const departure = departureTimestamp(ticket);

    return (
      !Number.isFinite(departure) ||
      departure <= Date.now()
    );
  }

  /* CAN THE PASSENGER CANCEL? */
  function canCancel(ticket) {
    return (
      ticket &&
      !isCancelled(ticket) &&
      String(ticket.status).toLowerCase() ===
        "confirmed" &&
      !isExpired(ticket)
    );
  }

  /* =====================================
     SAVED RESERVATIONS
  ===================================== */

  function readAllReservations() {
    try {
      const data = JSON.parse(
        localStorage.getItem(RESERVATIONS_KEY)
      );

      return Array.isArray(data)
        ? data
        : [];

    } catch {
      return [];
    }
  }

  /* GET CURRENT USER'S RESERVATIONS */
  function myReservations() {
    return readAllReservations().filter(
      ticket => ticket.userId === user.id
    );
  }

  /* FIND ONE RESERVATION */
  function getTicket(id) {
    return myReservations().find(
      ticket => String(ticket.id) === String(id)
    ) || null;
  }

  /* =====================================
     PAGE VARIABLES
  ===================================== */

  let currentTab = "active";
  let currentTicketId = null;
  let previousFocus = null;

  /* =====================================
     SWITCH BETWEEN SCREENS
  ===================================== */

  function showScreen(screen) {
    const screens = [
      "list",
      "details",
      "cancelSuccess"
    ];

    screens.forEach(name => {
      $(name + "Screen").hidden =
        name !== screen;
    });

    window.scrollTo(0, 0);
  }

  /* =====================================
     STATUS TAG
  ===================================== */

  function statusBadge(text, type = "") {
    return `
      <span class="res-badge ${type}">
        ${escapeHtml(text)}
      </span>
    `;
  }

  /* =====================================
     RESERVATION LIST CARD
  ===================================== */

  function createReservationCard(ticket) {
    const cancelled = isCancelled(ticket);
    const expired = !cancelled && isExpired(ticket);

    const card = document.createElement("article");
    card.className = "res-card";

    let tag = "";

    if (cancelled) {
      tag = statusBadge(
        "CANCELLED",
        "res-badge-canceled"
      );
    } else if (expired) {
      tag = statusBadge(
        "PAST TRIP",
        "res-badge-expired"
      );
    }

    card.innerHTML = `
      <!-- CARD HEADER -->
      <div class="res-card-head">

        <span>
          <i class="bi bi-train-front-fill"></i>

          ${escapeHtml(
            ticket.trainName ||
            "RailEasy Express"
          )}
        </span>

        ${tag}

      </div>

      <!-- CARD BODY -->
      <div class="res-card-body">

        <div class="res-card-route">

          <!-- DEPARTURE -->
          <div class="res-card-stop">

            <strong>
              ${escapeHtml(
                timeLabel(ticket.departure)
              )}
            </strong>

            <small>
              ${escapeHtml(
                ticket.fromStation ||
                ticket.fromCode
              )}
            </small>

          </div>

          <i class="bi bi-arrow-right"></i>

          <!-- ARRIVAL -->
          <div class="res-card-stop">

            <strong>
              ${escapeHtml(
                timeLabel(ticket.arrival)
              )}
            </strong>

            <small>
              ${escapeHtml(
                ticket.toStation ||
                ticket.toCode
              )}
            </small>

          </div>

        </div>

        <div class="res-card-bottom">

          <div>
            <small>
              ${escapeHtml(
                dateLabel(ticket.travelDate)
              )}
            </small>

            <small>
              ${escapeHtml(ticket.id)}
            </small>

            <small>
              Travel Duration:
              ${escapeHtml(
                ticket.duration ?? "—"
              )} minutes
            </small>
          </div>

          <button
            type="button"
            class="res-button res-button-small res-view"
            data-ticket="${escapeHtml(ticket.id)}">

            View Details

          </button>

        </div>

      </div>
    `;

    return card;
  }

  /* =====================================
     DISPLAY RESERVATION LIST
  ===================================== */

  function renderList() {
    const active = currentTab === "active";

    /* UPDATE TABS */
    $("activeTab").classList.toggle(
      "selected",
      active
    );

    $("cancelledTab").classList.toggle(
      "selected",
      !active
    );

    $("activeTab").setAttribute(
      "aria-pressed",
      String(active)
    );

    $("cancelledTab").setAttribute(
      "aria-pressed",
      String(!active)
    );

    /* FILTER RESERVATIONS */
    const records = myReservations()
      .filter(ticket =>
        active
          ? !isCancelled(ticket)
          : isCancelled(ticket)
      )
      .sort((a, b) => {
        const aTime =
          departureTimestamp(a) || 0;

        const bTime =
          departureTimestamp(b) || 0;

        return bTime - aTime;
      });

    const root = $("reservationGroups");

    root.replaceChildren();

    /* EMPTY RESERVATIONS */
    if (!records.length) {
      root.innerHTML = `
        <div class="res-empty">

          <i class="bi bi-ticket-perforated"></i>

          <h2>
            ${active
              ? "No Reservations Yet"
              : "No Cancelled Reservations"}
          </h2>

          <p>
            ${active
              ? "Your reservations will appear here."
              : "Cancelled tickets will appear here."}
          </p>

          ${active
            ? `<a href="booking.html"
                  class="res-button">
                 Book a Ticket
               </a>`
            : ""}

        </div>
      `;

      return;
    }

    /* =====================================
       GROUP RESERVATIONS BY DATE
    ===================================== */

    const now = Date.now();

    const sevenDaysAgo =
      now - 7 * 24 * 60 * 60 * 1000;

    const groups = [
      {
        title: "Recent",
        tickets: [],
        past: false
      },
      {
        title: "For the past 7 days",
        tickets: [],
        past: true
      },
      {
        title: "Older Reservations",
        tickets: [],
        past: true
      }
    ];

    records.forEach(ticket => {
      const departure =
        departureTimestamp(ticket);

      if (
        Number.isFinite(departure) &&
        departure >= now
      ) {
        groups[0].tickets.push(ticket);

      } else if (
        Number.isFinite(departure) &&
        departure >= sevenDaysAgo
      ) {
        groups[1].tickets.push(ticket);

      } else {
        groups[2].tickets.push(ticket);
      }
    });

    /* DISPLAY GROUPS */
    groups.forEach(group => {
      if (!group.tickets.length) return;

      const section =
        document.createElement("section");

      section.className =
        "res-group" +
        (group.past ? " is-past" : "");

      const heading =
        document.createElement("h2");

      heading.textContent = group.title;

      const grid =
        document.createElement("div");

      grid.className = "res-card-grid";

      group.tickets.forEach(ticket => {
        grid.appendChild(
          createReservationCard(ticket)
        );
      });

      section.appendChild(heading);
      section.appendChild(grid);

      root.appendChild(section);
    });
  }

  /* =====================================
     RESERVATION TABS
  ===================================== */

  $("activeTab").addEventListener(
    "click",
    () => {
      currentTab = "active";
      renderList();
    }
  );

  $("cancelledTab").addEventListener(
    "click",
    () => {
      currentTab = "cancelled";
      renderList();
    }
  );

  /* =====================================
     BACK TO RESERVATIONS
  ===================================== */

  function backToReservations() {
    closeCancelModal();
    showScreen("list");
    renderList();
  }

  $("backFromDetails").addEventListener(
    "click",
    backToReservations
  );

  $("backAfterCancel").addEventListener(
    "click",
    () => {
      currentTab = "cancelled";
      backToReservations();
    }
  );

  /* =====================================
     CLICK VIEW DETAILS
  ===================================== */

  $("reservationGroups").addEventListener(
    "click",
    event => {
      const button = event.target.closest(
        ".res-view"
      );

      if (!button) return;

      showDetails(button.dataset.ticket);
    }
  );

  /* =====================================
     BUILD TICKET DESIGN
  ===================================== */

  function buildTicket(ticket) {
    const cancelled = isCancelled(ticket);

    const expired =
      !cancelled && isExpired(ticket);

    /* STATUS TEXT */
    const status = cancelled
      ? "Cancelled"
      : expired
        ? "Past Trip"
        : "Confirmed";

    /* STATUS COLOR */
    const statusClass = cancelled
      ? "res-status-canceled"
      : expired
        ? "res-status-expired"
        : "res-status-active";

    /* =====================================
       NEW TICKET STATUS TAG
    ===================================== */

    const statusTag = cancelled
      ? `
        <span class="res-ticket-cancel-tag">
          CANCELLED
        </span>
      `
      : expired
        ? `
          <span class="res-ticket-past-tag">
            PAST TRIP
          </span>
        `
        : "";

    const fullName = [
      ticket.lastName
        ? ticket.lastName + ","
        : "",
      ticket.firstName || "",
      ticket.middleName || ""
    ].join(" ").trim();

    return `
      <article class="res-ticket"
               aria-label="RailEasy reservation ticket">

        <!-- BLUE TICKET SECTION -->
        <div class="res-ticket-blue">

          <!-- STATUS TAG -->
          ${statusTag}

          <!-- NON-TRANSFERABLE -->
          <span class="res-ticket-nontransferable">
            NON-TRANSFERABLE
          </span>

          <!-- TRAIN LOGO + RAILEASY -->
          <div class="res-ticket-brand">

            <i class="bi bi-train-front-fill"></i>

            <span>RAILEASY</span>

          </div>

          <!-- PASSENGER DETAILS -->
          <div class="res-ticket-info">

            <div>
              <small>NAME:</small>

              <strong>
                ${escapeHtml(fullName)}
              </strong>
            </div>

            <div>
              <small>TYPE:</small>

              <strong>
                ${escapeHtml(
                  ticket.passengerType || "Regular"
                )}
              </strong>
            </div>

          </div>

          <!-- TICKET ID AND DATE ISSUED -->
          <div class="res-ticket-info">

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

          <!-- FROM AND TO STATIONS -->
          <div class="res-ticket-route">

            <div>
              <strong>
                ${escapeHtml(ticket.fromCode)}
              </strong>

              <span>
                ${escapeHtml(ticket.fromStation)}
              </span>
            </div>

            <i class="bi bi-arrow-right"></i>

            <div>
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
        <div class="res-ticket-white">

          <!-- TRIP DETAILS -->
          <div>

            <small>DATE:</small>
            <strong>
              ${escapeHtml(
                dateLabel(ticket.travelDate)
              )}
            </strong>

            <small>DEPARTURE TIME:</small>
            <strong>
              ${escapeHtml(
                timeLabel(ticket.departure)
              )}
            </strong>

            <small>VALIDITY:</small>
            <strong>
              Single Journey
            </strong>

          </div>

          <!-- STATUS AND FARE -->
          <div>

            <small>STATUS:</small>

            <strong class="${statusClass}">
              ${status}
            </strong>

            <small>PAYMENT:</small>

            <strong>
              ${escapeHtml(
                ticket.paymentStatus ||
                "Pay at Station"
              )}
            </strong>

            <small>FARE:</small>

            <strong class="res-ticket-fare">
              ${money(ticket.fare)}
            </strong>

          </div>

          <!-- QR CODE -->
          <div class="res-qr"></div>

        </div>

      </article>
    `;
  }

  /* =====================================
     GENERATE DEMO QR CODE
  ===================================== */

  function addDemoQr(mount, ticket) {
    const qr = mount.querySelector(".res-qr");

    if (!qr) return;

    if (typeof QRCode === "function") {
      new QRCode(qr, {
        text: JSON.stringify({
          demo: true,
          ticket: ticket.id
        }),
        width: 88,
        height: 88,
        correctLevel: QRCode.CorrectLevel.M
      });

    } else {
      const fallback =
        document.createElement("span");

      fallback.textContent =
        "Demo QR: " + ticket.id;

      qr.appendChild(fallback);
    }

    const note =
      document.createElement("span");

    note.className = "res-qr-note";

    note.textContent =
      "Demo only - not valid for boarding";

    qr.appendChild(note);
  }

  /* =====================================
     OPEN RESERVATION DETAILS
  ===================================== */

  function showDetails(id) {
    const ticket = getTicket(id);

    if (!ticket) {
      backToReservations();
      return;
    }

    currentTicketId = ticket.id;

    const cancelled = isCancelled(ticket);
    const expired = !cancelled && isExpired(ticket);

    /* UPDATED TITLE FOR ALL TICKETS */
    $("detailsHeading").textContent =
      "Reservation Details";

    /* SHOW STATUS WARNING */
    const notice = $("detailsNotice");

    if (cancelled) {
      notice.hidden = false;

      notice.textContent =
        "This reservation has been cancelled and cannot be cancelled again.";

    } else if (expired) {
      notice.hidden = false;

      notice.textContent =
        "This trip has already passed and can no longer be cancelled.";

    } else {
      notice.hidden = true;
      notice.textContent = "";
    }

    /* DISPLAY FULL TICKET */
    const content = $("detailsContent");

    content.innerHTML = buildTicket(ticket);

    addDemoQr(content, ticket);

    /* =====================================
       DISPLAY ACTION BUTTON
    ===================================== */

    const actions = $("detailsActions");

    actions.replaceChildren();

    const button =
      document.createElement("button");

    button.type = "button";

    if (canCancel(ticket)) {
      button.className =
        "res-button res-button-red";

      button.textContent =
        "Cancel Reservation";

      button.addEventListener(
        "click",
        openCancelModal
      );

    } else {
      button.className = "res-button";

      button.textContent =
        "Back to My Reservations";

      button.addEventListener(
        "click",
        backToReservations
      );
    }

    actions.appendChild(button);

    showScreen("details");
  }

  /* =====================================
     CANCELLATION CONFIRMATION MODAL
  ===================================== */

  function openCancelModal() {
    const ticket = getTicket(currentTicketId);

    if (!canCancel(ticket)) {
      showDetails(currentTicketId);
      return;
    }

    previousFocus = document.activeElement;

    $("cancelModal").hidden = false;

    $("keepReservation").focus();
  }

  /* CLOSE MODAL */
  function closeCancelModal() {
    const modal = $("cancelModal");

    if (modal.hidden) return;

    modal.hidden = true;

    if (
      previousFocus &&
      previousFocus.isConnected
    ) {
      previousFocus.focus();
    }

    previousFocus = null;
  }

  /* KEEP RESERVATION */
  $("keepReservation").addEventListener(
    "click",
    closeCancelModal
  );

  /* CLICK OUTSIDE MODAL */
  $("cancelModal").addEventListener(
    "click",
    event => {
      if (event.target === $("cancelModal")) {
        closeCancelModal();
      }
    }
  );

  /* ESCAPE KEY */
  document.addEventListener(
    "keydown",
    event => {
      if (
        event.key === "Escape" &&
        !$("cancelModal").hidden
      ) {
        closeCancelModal();
      }
    }
  );

  /* =====================================
     CANCELLED RESERVATION SUMMARY
  ===================================== */

  function buildSummary(ticket) {
    return `
      <div class="res-summary-card">

        <!-- RESERVATION ID -->
        <div class="res-summary-head">

          <span>Reservation ID</span>

          <strong>
            ${escapeHtml(ticket.id)}
          </strong>

        </div>

        <!-- ROUTE DETAILS -->
        <div class="res-summary-body">

          <div class="res-summary-route">

            <div>
              <strong>
                ${escapeHtml(ticket.fromCode)}
              </strong>

              <small>
                ${escapeHtml(ticket.fromStation)}
              </small>

              <small>
                ${escapeHtml(
                  timeLabel(ticket.departure)
                )}
              </small>
            </div>

            <i class="bi bi-arrow-right"></i>

            <div>
              <strong>
                ${escapeHtml(ticket.toCode)}
              </strong>

              <small>
                ${escapeHtml(ticket.toStation)}
              </small>

              <small>
                ${escapeHtml(
                  timeLabel(ticket.arrival)
                )}
              </small>
            </div>

          </div>

          <!-- TRAVEL DATE -->
          <div class="res-summary-meta">

            <span>
              Travel Date:
              ${escapeHtml(
                dateLabel(ticket.travelDate)
              )}
            </span>

          </div>

          <!-- CANCELLED STATUS -->
          <div class="res-summary-meta">

            <span>Reservation Status:</span>

            ${statusBadge(
              "CANCELLED",
              "res-badge-canceled"
            )}

          </div>

        </div>

        <div class="res-summary-foot">

          <i class="bi bi-exclamation-triangle"></i>

          This reservation has been cancelled
          and cannot be cancelled again.

        </div>

      </div>
    `;
  }

  /* =====================================
     CONFIRM CANCELLATION
  ===================================== */

  $("confirmCancel").addEventListener(
    "click",
    () => {
      const all = readAllReservations();

      /* FIND CURRENT USER'S TICKET */
      const index = all.findIndex(
        ticket =>
          ticket.id === currentTicketId &&
          ticket.userId === user.id
      );

      if (index < 0) {
        closeCancelModal();
        backToReservations();
        return;
      }

      /* PREVENT REPEATED CANCELLATION */
      if (!canCancel(all[index])) {
        closeCancelModal();
        showDetails(currentTicketId);
        return;
      }

      /* =====================================
         UPDATE TICKET STATUS
      ===================================== */

      const updatedTicket = {
        ...all[index],

        status: "Canceled",

        canceledAt: new Date().toISOString()
      };

      all[index] = updatedTicket;

      /* SAVE IN LOCAL STORAGE */
      try {
        localStorage.setItem(
          RESERVATIONS_KEY,
          JSON.stringify(all)
        );

      } catch {
        alert(
          "Unable to save cancellation. " +
          "Please check your browser storage."
        );

        return;
      }

      /* SHOW CANCELLATION SUCCESS */
      closeCancelModal();

      $("canceledSummary").innerHTML =
        buildSummary(updatedTicket);

      showScreen("cancelSuccess");
    }
  );

  /* =====================================
     COPYRIGHT YEAR
  ===================================== */

  const yearElement = $("year");

  if (yearElement) {
    yearElement.textContent =
      new Date().getFullYear();
  }

  /* =====================================
     START SYSTEM
  ===================================== */

  renderList();

})();