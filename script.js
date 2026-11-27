// JARVIS MOBILE - INITIALIZATION

const initializeButton = document.querySelector("button");
const statusText = document.querySelector(".status span");
const systemPanel = document.querySelector(".panel");
const statusDot = document.querySelector(".dot");

initializeButton.addEventListener("click", function () {
  statusText.textContent = "SYSTEM ACTIVE";
  statusDot.style.background = "#00eaff";
  statusDot.style.boxShadow = "0 0 12px #00eaff";

  systemPanel.innerHTML = `
    <h2>SYSTEM STATUS</h2>
    <p>JARVIS is now active.</p>
    <p>System initialized successfully.</p>
    <p>Awaiting your command...</p>
  `;

  initializeButton.textContent = "JARVIS ACTIVATED";
});
