import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

if (!supabaseUrl || !supabaseServiceKey) {
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function inspectLogs() {
  const { data: logs, error: lError } = await supabase
    .from("hippocampus_logs")
    .select("*")
    .eq("user_id", "1dec38f0-1076-43e9-bfe6-63b76d2b7e2f");
  if (lError) {
    console.error("Error fetching logs:", lError);
    return;
  }
  console.log("Found", logs.length, "logs for 1dec38f0-1076-43e9-bfe6-63b76d2b7e2f");
  if (logs.length > 0) {
    console.log("First log:", JSON.stringify(logs[0], null, 2));
    console.log("Second log:", JSON.stringify(logs[1], null, 2));
  }
}

inspectLogs();
