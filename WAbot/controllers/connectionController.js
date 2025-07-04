// controllers/connectionController.js
const qrcode = require("qrcode-terminal");
const { DisconnectReason } = require("@whiskeysockets/baileys");
const {
  startScheduledReminders,
} = require("./messageControllers/reminderController");

// Handle connection updates
function handleConnectionUpdate(update, WAbot, sock) {
  const { connection, lastDisconnect, qr } = update;

  // Display QR code when available
  if (qr) {
    console.log("Scan this QR code with your WhatsApp:");
    qrcode.generate(qr, { small: true });
  }

  if (connection === "close") {
    const shouldReconnect =
      lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;

    console.log("Connection closed due to:", lastDisconnect.error);

    if (shouldReconnect) {
      console.log("Reconnecting...");
      WAbot(); // Restart the bot
    }
  } else if (connection === "open") {
    console.log("✅ Connected to WhatsApp!");

    // Start scheduled reminders once connected
    startScheduledReminders(sock);
  }
}

// Handle credential updates
function handleCredentialsUpdate(saveCreds) {
  return () => {
    saveCreds();
  };
}

module.exports = {
  handleConnectionUpdate,
  handleCredentialsUpdate,
};
