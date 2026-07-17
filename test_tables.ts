import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function inspect() {
  const tables = [
    "hippocampus_logs",
    "hippocampus_users",
    "memory_chatgpt",
    "memory_event_embeddings",
    "memory_sources",
    "memory_timeline_events",
    "memory_timeline_events_for_ai",
    "temote_user_data"
  ];

  console.log("--- Supabase Table/View Checks ---");
  for (const table of tables) {
    try {
      const { data, error } = await supabase.from(table).select("*").limit(1);
      if (error) {
        console.log(`Table: ${table} -> Error: ${error.message} (${error.code})`);
      } else {
        console.log(`Table: ${table} -> Success! Found ${data?.length} rows`);
      }
    } catch (e: any) {
      console.log(`Table: ${table} -> Exception: ${e.message}`);
    }
  }
}

inspect();
