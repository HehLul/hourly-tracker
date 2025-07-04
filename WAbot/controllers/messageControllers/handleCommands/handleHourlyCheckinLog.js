// handleCommands/handleEnergyLog.js
const { handleLogs } = require("./handleLogs");

async function handleHourlyCheckinLog(messageText, from, sock, message) {
  console.log("⚡ Processing /log command...");
  const parts = messageText.trim().split(" ");

  if (parts.length >= 2) {
    const rating = parseInt(parts[1]);
    const note = messageText.substring(messageText.indexOf(parts[2])).trim();

    if (rating >= 1 && rating <= 3) {
      await handleLogs(message, from, sock, {
        logType: "hourly",
        rating: rating,
        activity: note,
      });
    } else {
      await sock.sendMessage(from, {
        text: "❌ Rating must be 1-3\nExample: /checkin 3 worked on project and had lunch",
      });
    }
  } else {
    await sock.sendMessage(from, {
      text: "❌ Invalid format!\nUse: /checkin [1-3] [note]\nExample: /checkin 3 was coding all hour",
    });
  }
}

module.exports = { handleHourlyCheckinLog };
