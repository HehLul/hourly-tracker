// handleCommands/handleSleepLog.js
const { handleLogs } = require("./handleLogs");

async function handleSleepLog(messageText, from, sock, message) {
  console.log("😴 Processing /sleep command...");
  const parts = messageText.trim().split(" ");

  if (parts.length === 5) {
    const bedtime = parts[1];
    const waketime = parts[2];
    const quality = parseInt(parts[3]);
    const tiredness = parseInt(parts[4]);

    // Validate time format (basic check for HH:MM)
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;

    if (!timeRegex.test(bedtime)) {
      await sock.sendMessage(from, {
        text: "❌ Invalid bedtime format! Use HH:MM (24-hour)\nExample: /sleep 23:00 07:00 4 2",
      });
      return;
    }

    if (!timeRegex.test(waketime)) {
      await sock.sendMessage(from, {
        text: "❌ Invalid wake time format! Use HH:MM (24-hour)\nExample: /sleep 23:00 07:00 4 2",
      });
      return;
    }

    if (quality >= 1 && quality <= 5 && tiredness >= 1 && tiredness <= 5) {
      await handleLogs(message, from, sock, {
        logType: "sleep",
        bedtime: bedtime,
        waketime: waketime,
        quality: quality,
        tiredness: tiredness,
      });
    } else {
      await sock.sendMessage(from, {
        text: "❌ Quality and tiredness must be 1-5\nExample: /sleep 23:00 07:00 4 2",
      });
    }
  } else {
    await sock.sendMessage(from, {
      text: "❌ Invalid format!\nUse: /sleep [bedtime] [waketime] [quality 1-5] [tiredness 1-5]\nExample: /sleep 23:00 07:00 4 2",
    });
  }
}

module.exports = { handleSleepLog };
