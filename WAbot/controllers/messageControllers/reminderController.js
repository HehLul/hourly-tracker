require("dotenv").config();
const cron = require("node-cron");

const getAllowedGroups = () => {
  return process.env.WA_ALLOWED_GROUPS?.split(",").map((id) => id.trim()) || [];
};

// Generate hourly reminder messages
const getHourlyMessage = (hour) => {
  // Special messages for specific times
  if (hour === 6) {
    return "🌅 Good morning! Time to log your sleep! Use /sleep [bedtime] [waketime] [quality 1-5] [tiredness 1-5]";
  }

  if (hour === 11) {
    return "⚡ Mid-morning energy check! How's your energy level right now? Use /energy [1-5]";
  }

  // Same message for all other hours
  return "🕐 Make sure to log your hour and energy";
};

// Generate hourly reminder times from 6am to 12am (midnight)
const generateHourlyReminders = () => {
  const reminders = [];

  // 6am to 11pm (6:00 to 23:00)
  for (let hour = 6; hour <= 23; hour++) {
    reminders.push({
      time: `${hour.toString().padStart(2, "0")}:00`,
      message: getHourlyMessage(hour),
    });
  }

  // Add midnight (00:00)
  reminders.push({
    time: "00:00",
    message: getHourlyMessage(0),
  });

  return reminders;
};

const REMINDER_TIMES = generateHourlyReminders();

// Scheduled reminder function - sends to ALL allowed groups
function startScheduledReminders(sock) {
  console.log("📅 Setting up hourly reminders...");

  const allowedGroups = getAllowedGroups();

  if (allowedGroups.length === 0) {
    console.log("⚠️ No groups configured for reminders");
    return;
  }

  console.log(
    `📱 Will send hourly reminders to ${allowedGroups.length} groups:`,
    allowedGroups
  );

  REMINDER_TIMES.forEach(({ time, message }) => {
    // Schedule using cron (minute hour * * *)
    const [hour, minute] = time.split(":");
    const cronTime = `${minute} ${hour} * * *`; // Every day at specified time

    cron.schedule(cronTime, async () => {
      console.log(`⏰ Sending hourly reminder at ${time} to all groups`);

      // Send to ALL allowed groups
      for (const groupId of allowedGroups) {
        try {
          await sock.sendMessage(groupId, { text: message });
          console.log(`✅ Hourly reminder sent to ${groupId} at ${time}`);
        } catch (error) {
          console.error(`❌ Failed to send reminder to ${groupId}:`, error);
        }
      }
    });

    console.log(`⏰ Scheduled hourly reminder set for ${time}`);
  });

  console.log(
    `📊 Total scheduled reminders: ${REMINDER_TIMES.length} (6am-12am)`
  );
}

// Test reminder function for development
async function sendTestReminder(sock) {
  const allowedGroups = getAllowedGroups();
  const testMessage =
    "🧪 Test hourly reminder! This is what you'll receive every hour from 6am-12am!";

  for (const groupId of allowedGroups) {
    try {
      await sock.sendMessage(groupId, { text: testMessage });
      console.log(`✅ Test reminder sent to ${groupId}`);
    } catch (error) {
      console.error(`❌ Failed to send test reminder to ${groupId}:`, error);
    }
  }
}

module.exports = {
  startScheduledReminders,
  sendTestReminder,
  getAllowedGroups,
};
