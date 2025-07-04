// controllers/databaseController.js
require("dotenv").config();
const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

// Test connection
async function testConnection() {
  try {
    const { data, error } = await supabase.auth.getSession();
    console.log("✅ Connected to Supabase!");
    return true;
  } catch (error) {
    console.error("❌ Supabase connection failed:", error.message);
    return false;
  }
}

// Get or create user
async function createOrGetUser(phoneNumber, displayName = null) {
  try {
    // First, try to find existing user
    const { data: existingUser, error: selectError } = await supabase
      .from("users")
      .select("*")
      .eq("phone_number", phoneNumber)
      .single();

    if (existingUser) {
      console.log(`👤 Found existing user: ${existingUser.name}`);
      return existingUser;
    }

    // If user doesn't exist, create new one
    const { data: newUser, error: insertError } = await supabase
      .from("users")
      .insert([
        {
          phone_number: phoneNumber,
          name: displayName || phoneNumber,
        },
      ])
      .select()
      .single();

    if (insertError) throw insertError;

    console.log(`✨ Created new user: ${newUser.name}`);
    return newUser;
  } catch (error) {
    console.error("❌ Error with user:", error.message);
    throw error;
  }
}

// Save sleep log
async function saveSleepLogDB(userId, bedtime, waketime, quality, tiredness) {
  try {
    const { data, error } = await supabase
      .from("sleep_logs")
      .insert([
        {
          user_id: userId,
          bedtime: bedtime,
          wake_time: waketime,
          sleep_quality: quality,
          tiredness_level: tiredness,
          sleep_date: new Date().toISOString().split("T")[0], // Today's date
        },
      ])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("❌ Error saving sleep log:", error.message);
    throw error;
  }
}

// Save energy log
async function saveEnergyLogDB(userId, energyLevel) {
  try {
    const { data, error } = await supabase
      .from("energy_logs")
      .insert([
        {
          user_id: userId,
          energy_level: energyLevel,
        },
      ])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("❌ Error saving energy log:", error.message);
    throw error;
  }
}

// Save hourly log
async function saveHourlyLogDB(userId, rating, activity) {
  try {
    const { data, error } = await supabase
      .from("hourly_logs")
      .insert([
        {
          user_id: userId,
          hour_rating: rating,
          activity: activity,
        },
      ])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("❌ Error saving hourly log:", error.message);
    throw error;
  }
}

// Save thought/feeling/idea log
async function saveThoughtLogDB(userId, content, logType) {
  try {
    const { data, error } = await supabase
      .from("thoughts_logs")
      .insert([
        {
          user_id: userId,
          content: content,
          log_type: logType,
        },
      ])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("❌ Error saving thought log:", error.message);
    throw error;
  }
}

// Get user's most recent log entry across all tables (for undo command)
async function getLastUserEntry(phoneNumber) {
  try {
    // Get user ID first
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id")
      .eq("phone_number", phoneNumber)
      .single();

    if (userError) throw userError;

    // Check all log tables for the most recent entry
    const tables = [
      { name: "sleep_logs", table: "sleep_logs" },
      { name: "energy_logs", table: "energy_logs" },
      { name: "hourly_logs", table: "hourly_logs" },
      { name: "thoughts_logs", table: "thoughts_logs" },
    ];

    let mostRecentEntry = null;
    let mostRecentTime = null;

    for (const tableInfo of tables) {
      const { data, error } = await supabase
        .from(tableInfo.table)
        .select("*")
        .eq("user_id", user.id)
        .order("logged_at", { ascending: false })
        .limit(1)
        .single();

      if (
        data &&
        (!mostRecentTime || new Date(data.logged_at) > new Date(mostRecentTime))
      ) {
        mostRecentEntry = { ...data, table_name: tableInfo.name };
        mostRecentTime = data.logged_at;
      }
    }

    return mostRecentEntry;
  } catch (error) {
    console.error("❌ Error getting last entry:", error.message);
    return null;
  }
}

// Delete a log entry by ID and table name
async function deleteLogEntry(entryId, tableName) {
  try {
    const { data, error } = await supabase
      .from(tableName)
      .delete()
      .eq("id", entryId)
      .select()
      .single();

    if (error) throw error;

    console.log(`🗑️ Deleted log entry ID: ${entryId} from ${tableName}`);
    return data;
  } catch (error) {
    console.error("❌ Error deleting entry:", error.message);
    throw error;
  }
}

module.exports = {
  supabase,
  testConnection,
  createOrGetUser,
  saveSleepLogDB,
  saveEnergyLogDB,
  saveHourlyLogDB,
  saveThoughtLogDB,
  getLastUserEntry,
  deleteLogEntry,
};
