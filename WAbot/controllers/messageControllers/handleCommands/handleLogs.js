// handleCommands/handleLog.js
const {
  createOrGetUser,
  saveEnergyLogDB,
  saveSleepLogDB,
  saveHourlyLogDB,
  saveThoughtLogDB,
} = require("../../databaseController");

async function handleLogs(message, from, sock, params) {
  try {
    const userId = message.key.participant || message.key.remoteJid;
    const cleanUserId = userId
      .replace("@s.whatsapp.net", "")
      .replace("@lid", "");
    const displayName = message.pushName || cleanUserId;
    const pushName = message.pushName;

    const user = await createOrGetUser(cleanUserId, displayName, pushName);

    let logEntry;
    let successMessage;

    // Route to appropriate database function based on log type
    switch (params.logType) {
      case "energy":
        logEntry = await saveEnergyLogDB(user.id, params.energyLevel);
        successMessage = `✅ Energy logged!\n⚡ Level: ${params.energyLevel}/5`;
        break;

      case "sleep":
        logEntry = await saveSleepLogDB(
          user.id,
          params.bedtime,
          params.waketime,
          params.quality,
          params.tiredness
        );
        successMessage = `✅ Sleep logged!\n😴 ${params.bedtime} → ${params.waketime}\n⭐ Quality: ${params.quality}/5, Tiredness: ${params.tiredness}/5`;
        break;

      case "hourly":
        logEntry = await saveHourlyLogDB(
          user.id,
          params.rating,
          params.activity
        );
        successMessage = `✅ Hour logged!\n🕐 Rating: ${params.rating}/5\n📝 Activity: ${params.activity}`;
        break;

      case "thought":
        logEntry = await saveThoughtLogDB(
          user.id,
          params.content,
          params.thoughtType
        );
        const emoji =
          params.thoughtType === "thought"
            ? "💭"
            : params.thoughtType === "feeling"
            ? "😊"
            : "💡";
        successMessage = `✅ ${
          params.thoughtType.charAt(0).toUpperCase() +
          params.thoughtType.slice(1)
        } logged!\n${emoji} ${params.content}`;
        break;

      default:
        throw new Error(`Unknown log type: ${params.logType}`);
    }

    await sock.sendMessage(from, {
      text: `${successMessage}\n👤 User: ${pushName || displayName}`,
    });
  } catch (error) {
    console.error(`❌ ${params.logType} log error:`, error.message);
    await sock.sendMessage(from, {
      text: `❌ Error saving ${params.logType} log: ${error.message}`,
    });
  }
}

module.exports = { handleLogs };
