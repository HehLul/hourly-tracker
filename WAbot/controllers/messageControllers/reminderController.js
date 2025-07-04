require("dotenv").config();
const cron = require("node-cron");

const getAllowedGroups = () => {
  return process.env.WA_ALLOWED_GROUPS?.split(",").map((id) => id.trim()) || [];
};

// Generate hourly reminder messages
const getHourlyMessage = (hour) => {
  const messages = [
    "🕐 Hourly check-in! How was the past hour? Rate it and log what you did!",
    "⏰ Time to reflect! How did you spend the last hour? Use /hour to log it!",
    "📊 Hourly tracker reminder! Rate your past hour (1-5) and note your activity!",
    "🔔 Check-in time! What did you accomplish this past hour? Don't forget to log it!",
    "⚡ Energy check! How are you feeling? Log your energy and what you've been up to!",
    "📝 Hourly log reminder! Take a moment to track your progress from the past hour!",
    "🎯 Time to track! How productive was your last hour? Rate it and log your activity!",
    "💪 Stay consistent! Log what you did this past hour to track your daily progress!",
  ];

  // Rotate message based on hour to add variety
  return messages[hour % messages.length];
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
