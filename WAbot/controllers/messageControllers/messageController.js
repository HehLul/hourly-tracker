require("dotenv").config();
const { config, configDotenv } = require("dotenv");
// controllers/messageController.js
const {
  createOrGetUser,
  testConnection,
  saveSleepLogDB,
  saveEnergyLogDB,
  saveHourlyLogDB,
  saveThoughtLogDB,
  deleteLogEntry,
  getLastUserEntry,
} = require("../databaseController");
const { getAllowedGroups } = require("./reminderController");

// READ INCOMING MESSAGES
async function handleIncomingMessages(messageUpdate, sock) {
  console.log("📤 Message upsert event triggered!");
  const { messages, type } = messageUpdate;

  console.log(`Type: ${type}, Messages count: ${messages.length}`);

  //main message parser
  messages.forEach(async (message) => {
    console.log("📩 Message incoming!");

    // Skip messages sent by me
    if (message.key.fromMe) {
      const from = message.key.remoteJid;
      const messageText =
        message.message.conversation ||
        message.message.extendedTextMessage?.text ||
        "";

      console.log(`From: ${from}`);
      console.log(`Text: "${messageText}"`);
      // console.log("⏭️ Skipping my own message");
      // return;
    }

    // Skip if no message content
    if (!message.message) {
      console.log("⏭️ Skipping message with no content");
      return;
    }

    // Extract message info
    const from = message.key.remoteJid;
    const messageText =
      message.message.conversation ||
      message.message.extendedTextMessage?.text ||
      "";

    console.log(`From: ${from}`);
    console.log(`Text: "${messageText}"`);

    // 🚨 SAFETY CHECK: Use the SAME function as reminder controller
    const allowedGroups = getAllowedGroups();

    if (allowedGroups.length === 0) {
      console.log(
        "⚠️ No allowed groups configured in .env file - ignoring all messages"
      );
      return;
    }

    if (!allowedGroups.includes(from)) {
      console.log(`🚫 Ignoring message from unauthorized chat: ${from}`);
      console.log(`🚫 Allowed groups: ${allowedGroups.join(", ")}`);
      return;
    }

    console.log("✅ Message from authorized user - processing...");

    // Handle different commands
    await handleCommands(messageText, from, sock, message);
  });
}

// HANDLE COMMANDS
// async function handleCommands(messageText, from, sock, message) {
//   const text = messageText.toLowerCase();

//   // Test Reminder
//   if (text.startsWith("test reminder")) {
//     console.log("🧪 Sending test reminder...");
//     const { sendTestReminder } = require("./reminderController");
//     await sendTestReminder(sock);
//   }

//   // Handle /energy command
//   if (text.startsWith("/energy")) {
//     console.log("⚡ Processing /energy command...");
//     const parts = messageText.trim().split(" ");

//     if (parts.length === 2) {
//       const energyLevel = parseInt(parts[1]);

//       if (energyLevel >= 1 && energyLevel <= 5) {
//         const { saveEnergyLogDB } = require("../databaseController");
//         await saveUserKPI(
//           message,
//           from,
//           sock,
//           "energy",
//           energyLevel,
//           saveEnergyLogDB
//         );
//       } else {
//         await sock.sendMessage(from, {
//           text: "❌ Energy level must be 1-5\nExample: /energy 4",
//         });
//       }
//     } else {
//       await sock.sendMessage(from, {
//         text: "❌ Invalid format!\nUse: /energy [1-5]\nExample: /energy 4",
//       });
//     }
//   }

//   // Handle /note command
//   if (text.startsWith("/note")) {
//     console.log("📝 Processing /note command...");
//     const note = messageText.substring(6).trim();

//     if (note) {
//       await saveUserKPI(message, from, sock, "note", note);
//     } else {
//       await sock.sendMessage(from, {
//         text: "❌ Please add your note\nExample: /note feeling productive today",
//       });
//     }
//   }

//   // Handle /help command
//   if (text.startsWith("/help")) {
//     console.log("📋 Showing help menu...");

//     const helpMessage = `🕐 *HourlyTracker Bot Commands*

// 📊 *Tracking Commands:*
// - \`/energy [1-10]\` - Log energy level
// - \`/mood [text]\` - Log your mood
// - \`/activity [text]\` - Log what you're doing
// - \`/food [text]\` - Log what you ate
// - \`/note [text]\` - Add thoughts/ideas

// ⚙️ *Utility Commands:*
// - \`/help\` - Show this menu
// - \`/undo\` - Delete your last entry

// Track every hour! 📈`;

//     await sock.sendMessage(from, { text: helpMessage });
//   }

//   //Handle /undo command
//   if (text.startsWith("/undo")) {
//     console.log("↩️ Processing /undo command...");

//     try {
//       const userId = message.key.participant || message.key.remoteJid;
//       const cleanUserId = userId
//         .replace("@s.whatsapp.net", "")
//         .replace("@lid", "");
//       const pushName = message.pushName || cleanUserId;

//       console.log(`👤 Looking for last entry for user: ${cleanUserId}`);

//       const lastEntry = await getLastUserEntry(cleanUserId);

//       if (lastEntry) {
//         const deletedEntry = await deleteLogEntry(lastEntry.id);
//         const loggedTime = new Date(lastEntry.logged_at).toLocaleString();

//         console.log(
//           `✅ Successfully deleted entry: ${lastEntry.kpi_type} - ${lastEntry.value}`
//         );

//         await sock.sendMessage(from, {
//           text: `✅ Undone last entry.\n\n📊 ${lastEntry.kpi_type}: ${lastEntry.value}\n📅 Logged: ${loggedTime}\n👤 User: ${pushName}`,
//         });
//       } else {
//         console.log(`❌ No entries found for user: ${cleanUserId}`);
//         await sock.sendMessage(from, {
//           text: `❌ No recent entries found to undo.\n👤 User: ${pushName}\n\nMake sure you have logged some data first using tracking commands.`,
//         });
//       }
//     } catch (error) {
//       console.error("❌ Undo error details:");
//       console.error("Error message:", error.message);
//       console.error("Full error:", error);

//       await sock.sendMessage(from, {
//         text: `❌ Sorry, there was an error with undo. Please try again later.\n\nError: ${error.message}`,
//       });
//     }
//   }
// }

// HANDLE COMMANDS
async function handleCommands(messageText, from, sock, message) {
  const text = messageText.toLowerCase();

  if (text.startsWith("test reminder")) {
    console.log("🧪 Sending test reminder...");
    const { sendTestReminder } = require("./reminderController");
    await sendTestReminder(sock);
  }

  if (text.startsWith("/energy")) {
    const { handleEnergyLog } = require("./handleCommands/handleEnergyLog");
    await handleEnergyLog(messageText, from, sock, message);
  }

  if (text.startsWith("/sleep")) {
    const { handleSleepLog } = require("./handleCommands/handleSleepLog");
    await handleSleepLog(messageText, from, sock, message);
  }

  if (text.startsWith("/hour")) {
    const { handleHourlyLog } = require("./handleCommands/handleHourlyLog");
    await handleHourlyLog(messageText, from, sock, message);
  }

  if (text.startsWith("/thought")) {
    const { handleThoughtLog } = require("./handleCommands/handleThoughtLog");
    await handleThoughtLog(messageText, from, sock, message, "thought");
  }

  if (text.startsWith("/feeling")) {
    const { handleThoughtLog } = require("./handleCommands/handleThoughtLog");
    await handleThoughtLog(messageText, from, sock, message, "feeling");
  }

  if (text.startsWith("/idea")) {
    const { handleThoughtLog } = require("./handleCommands/handleThoughtLog");
    await handleThoughtLog(messageText, from, sock, message, "idea");
  }

  if (text.startsWith("/help")) {
    const { handleHelpCommand } = require("./handleCommands/handleHelpCommand");
    await handleHelpCommand(from, sock);
  }

  if (text.startsWith("/undo")) {
    const { handleUndoCommand } = require("./handleCommands/handleUndoCommand");
    await handleUndoCommand(from, sock, message);
  }
}

// Helper function to save KPI data
// async function saveUserKPI(message, from, sock, kpiType, value, saveFunction) {
//   try {
//     const userId = message.key.participant || message.key.remoteJid;
//     const cleanUserId = userId
//       .replace("@s.whatsapp.net", "")
//       .replace("@lid", "");
//     const displayName = message.pushName || cleanUserId;
//     const pushName = message.pushName;

//     console.log(`👤 User ID: ${cleanUserId}`);
//     console.log(`👤 Display Name: ${displayName}`);
//     console.log(`📊 ${kpiType}: ${value}`);

//     const user = await createOrGetUser(cleanUserId, displayName, pushName);
//     const logEntry = await saveFunction(user.id, value);

//     console.log(`✅ Successfully saved log entry ID: ${logEntry.id}`);

//     await sock.sendMessage(from, {
//       text: `✅ ${kpiType} logged!\n⚡ Level: ${value}/5\n👤 User: ${
//         pushName || displayName
//       }`,
//     });
//   } catch (error) {
//     console.error("❌ Database error details:");
//     console.error("Error message:", error.message);
//     console.error("Full error:", error);

//     await sock.sendMessage(from, {
//       text: `❌ Sorry, there was an error saving your log. Please try again later.\n\nError: ${error.message}`,
//     });
//   }
// }

module.exports = {
  handleIncomingMessages,
  handleCommands,
};
