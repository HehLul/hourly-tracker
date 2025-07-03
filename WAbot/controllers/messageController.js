require("dotenv").config();
const { config, configDotenv } = require("dotenv");
// controllers/messageController.js
const {
  createOrGetUser,
  saveQuranLog,
  getLastUserEntry,
  deleteLogEntry,
} = require("./databaseController");
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

    console.log("✅ Message from authorized group - processing...");

    // Handle different commands
    await handleCommands(messageText, from, sock, message);
  });
}

// HANDLE COMMANDS
async function handleCommands(messageText, from, sock, message) {
  const text = messageText.toLowerCase();

  // Test responses
  // if (text.includes("ping")) {
  //   console.log("🏓 Sending pong response...");
  //   await sock.sendMessage(from, { text: "🏓 Pong!" });
  // }

  // Test Reminder
  if (text.includes("test reminder")) {
    console.log("🧪 Sending test reminder to group...");
    const { sendTestReminder } = require("./reminderController");
    await sendTestReminder(sock);
  }
  // Handle /log command
  if (text.startsWith("/log")) {
    console.log("📖 Processing /log command...");

    // Parse the command: /log revise 9:16 9:48
    const parts = messageText.trim().split(" ");

    if (parts.length === 4) {
      const command = parts[0]; // "/log"
      const action = parts[1].toLowerCase(); // "revise", "read", "memorize"
      const startVerse = parts[2]; // "9:16"
      const endVerse = parts[3]; // "9:48"

      // Valid actions
      const validActions = ["read", "revise", "memorize"];

      // Validate action and verse format
      if (!validActions.includes(action)) {
        await sock.sendMessage(from, {
          text: "❌ Invalid action! Use: read, revise, or memorize\nExample: /log revise 9:16 9:48",
        });
      } else if (startVerse.includes(":") && endVerse.includes(":")) {
        console.log(`📝 Logging: ${action} from ${startVerse} to ${endVerse}`);

        try {
          // UPDATED CODE - Get user identifier (LID or phone number)
          const userId = message.key.participant || message.key.remoteJid;
          const cleanUserId = userId
            .replace("@s.whatsapp.net", "")
            .replace("@lid", "");
          const displayName = message.pushName || cleanUserId;
          const pushName = message.pushName; // Store the actual pushName

          console.log(`👤 User ID: ${cleanUserId}`);
          console.log(`👤 Display Name: ${displayName}`);
          console.log(`👤 Push Name: ${pushName}`);
          console.log(`📱 Group/Chat ID: ${from}`);

          // Get or create user (now with pushName)
          const user = await createOrGetUser(
            cleanUserId,
            displayName,
            pushName
          );

          // Calculate estimated pages
          const { calculatePages } = require("./databaseController");
          const estimatedPages = calculatePages(startVerse, endVerse);

          // Save to database
          const logEntry = await saveQuranLog(
            user.id,
            action,
            startVerse,
            endVerse,
            estimatedPages
          );

          console.log(`✅ Successfully saved log entry ID: ${logEntry.id}`);

          await sock.sendMessage(from, {
            text: `✅ Logged successfully!\n📖 ${action}: ${startVerse} → ${endVerse}\n👤 User: ${
              pushName || displayName
            }`,
          });
        } catch (error) {
          console.error("❌ Database error details:");
          console.error("Error message:", error.message);
          console.error("Error code:", error.code);
          console.error("Full error:", error);

          await sock.sendMessage(from, {
            text: `❌ Sorry, there was an error saving your log. Please try again later.\n\nError: ${error.message}`,
          });
        }
      } else {
        await sock.sendMessage(from, {
          text: "❌ Invalid format!\n Use: /log [action] [start] [end]\nExample: /log revise 9:16 9:48\n(Chapter:Verse format required)",
        });
      }
    } else {
      await sock.sendMessage(from, {
        text: "❌ Invalid format!\n Use: /log [action] [start] [end]\nExample: /log revise 9:16 9:48\n(Chapter:Verse format required)",
      });
    }
  }
  // Handle /help command
  if (text.startsWith("/help")) {
    console.log("📋 Showing help menu...");

    const helpMessage = `🤖 *QuranTracker Bot Commands*

📖 *Logging Commands:*
- \`/log [action] [start] [end]\` - Log your reading
 Actions: read, revise, memorize
 Example: \`/log revise 9:16 9:48\`

⚙️ *Utility Commands:*
- \`/help\` - Show this menu
- \`/undo\` - Delete your last entry

Barakallahu feek! 🤲`;

    await sock.sendMessage(from, { text: helpMessage });
  }
  //Handle /undo command
  if (text.startsWith("/undo")) {
    console.log("↩️ Processing /undo command...");

    try {
      // Get user identifier (same logic as /log command)
      const userId = message.key.participant || message.key.remoteJid;
      const cleanUserId = userId
        .replace("@s.whatsapp.net", "")
        .replace("@lid", "");
      const pushName = message.pushName || cleanUserId;

      console.log(`👤 Looking for last entry for user: ${cleanUserId}`);

      // Get user's most recent log entry
      const lastEntry = await getLastUserEntry(cleanUserId);

      if (lastEntry) {
        // Delete the entry
        const deletedEntry = await deleteLogEntry(lastEntry.id);

        // Format the timestamp for display
        const loggedTime = new Date(lastEntry.logged_at).toLocaleString();

        console.log(
          `✅ Successfully deleted entry: ${lastEntry.action} ${lastEntry.start_verse}-${lastEntry.end_verse}`
        );

        await sock.sendMessage(from, {
          text: `✅ Undone last entry.\n\n📖 ${lastEntry.action}: ${lastEntry.start_verse} → ${lastEntry.end_verse}\n📅 Logged: ${loggedTime}\n👤 User: ${pushName}`,
        });
      } else {
        console.log(`❌ No entries found for user: ${cleanUserId}`);
        await sock.sendMessage(from, {
          text: `❌ No recent entries found to undo.\n👤 User: ${pushName}\n\nMake sure you have logged some Quran reading first using /log command.`,
        });
      }
    } catch (error) {
      console.error("❌ Undo error details:");
      console.error("Error message:", error.message);
      console.error("Full error:", error);

      await sock.sendMessage(from, {
        text: `❌ Sorry, there was an error with undo. Please try again later.\n\nError: ${error.message}`,
      });
    }
  }
}

module.exports = {
  handleIncomingMessages,
  handleCommands,
};
