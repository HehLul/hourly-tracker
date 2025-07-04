// handleCommands/handleEnergyLog.js
const { handleLogs } = require("./handleLogs");

async function handleEnergyLog(messageText, from, sock, message) {
  console.log("⚡ Processing /energy command...");
  const parts = messageText.trim().split(" ");

  if (parts.length === 2) {
    const energyLevel = parseInt(parts[1]);

    if (energyLevel >= 1 && energyLevel <= 5) {
      await handleLogs(message, from, sock, {
        logType: "energy",
        energyLevel: energyLevel,
      });
    } else {
      await sock.sendMessage(from, {
        text: "❌ Energy level must be 1-5\nExample: /energy 4",
      });
    }
  } else {
    await sock.sendMessage(from, {
      text: "❌ Invalid format!\nUse: /energy [1-5]\nExample: /energy 4",
    });
  }
}

module.exports = { handleEnergyLog };
