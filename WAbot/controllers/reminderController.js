require("dotenv").config();

// controllers/reminderController.js
const cron = require("node-cron");

// Configuration - now supports multiple groups
const getAllowedGroups = () => {
  return process.env.WA_ALLOWED_GROUPS?.split(",").map((id) => id.trim()) || [];
};

const REMINDER_TIMES = [
  {
    time: "09:00",
    message:
      "🌅 Good morning! Don't forget to update your Quran reading for today!",
  },
  {
    time: "22:00",
    message: "🌙 Evening reminder: Have you updated your Quran progress today?",
  },
];

// Scheduled reminder function - sends to ALL allowed groups
function startScheduledReminders(sock) {
  console.log("📅 Setting up scheduled reminders...");

  const allowedGroups = getAllowedGroups();

  if (allowedGroups.length === 0) {
    console.log("⚠️ No groups configured for reminders");
    return;
  }

  console.log(
    `📱 Will send reminders to ${allowedGroups.length} groups:`,
    allowedGroups
  );

  REMINDER_TIMES.forEach(({ time, message }) => {
    // Schedule using cron (minute hour * * *)
    const [hour, minute] = time.split(":");
    const cronTime = `${minute} ${hour} * * *`; // Every day at specified time

    cron.schedule(cronTime, async () => {
      console.log(`⏰ Sending scheduled reminder at ${time} to all groups`);

      // Send to ALL allowed groups
      for (const groupId of allowedGroups) {
        try {
          await sock.sendMessage(groupId, { text: message });
          console.log(`✅ Reminder sent to ${groupId}`);
        } catch (error) {
          console.error(`❌ Failed to send reminder to ${groupId}:`, error);
        }
      }
    });

    console.log(
      `⏰ Scheduled reminder set for ${time} (${allowedGroups.length} groups)`
    );
  });
}

// Manual function to send reminder now (for testing) - sends to ALL groups
async function sendTestReminder(sock) {
  const allowedGroups = getAllowedGroups();

  if (allowedGroups.length === 0) {
    console.log("⚠️ No groups configured for test reminder");
    return;
  }

  const testMessage =
    "🧪 This is a test reminder: This is a test message from your Quran bot!";

  console.log(`🧪 Sending test reminder to ${allowedGroups.length} groups`);

  for (const groupId of allowedGroups) {
    try {
      await sock.sendMessage(groupId, { text: testMessage });
      console.log(`✅ Test reminder sent to ${groupId}`);
    } catch (error) {
      console.error(`❌ Failed to send test reminder to ${groupId}:`, error);
    }
  }
}

// Send to specific group only
async function sendReminderToGroup(sock, groupId, message) {
  try {
    await sock.sendMessage(groupId, { text: message });
    console.log(`✅ Custom reminder sent to ${groupId}`);
  } catch (error) {
    console.error(`❌ Failed to send custom reminder to ${groupId}:`, error);
  }
}

// Add new reminder time
function addReminderTime(time, message) {
  REMINDER_TIMES.push({ time, message });
}

module.exports = {
  startScheduledReminders,
  sendTestReminder,
  sendReminderToGroup,
  addReminderTime,
  getAllowedGroups,
  REMINDER_TIMES,
};
