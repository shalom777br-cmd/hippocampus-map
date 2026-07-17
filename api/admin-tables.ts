import type { VercelRequest, VercelResponse } from "@vercel/node";
import { handleCors } from "./_lib/cors.js";
import { getSupabaseClient } from "./_lib/supabase.js";
import { ADMIN_TABLES_METADATA, filterTableColumns } from "./admin/_metadata.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;

  const { tableName } = req.query;
  const tName = typeof tableName === "string" ? tableName : "";

  // If no table name is specified, return the overall list of tables
  if (!tName) {
    if (req.method !== "GET") {
      res.status(405).json({ error: "Method not allowed" });
      return;
    }
    res.status(200).json({ tables: ADMIN_TABLES_METADATA });
    return;
  }

  // A specific table is targeted:
  if (!ADMIN_TABLES_METADATA[tName]) {
    res.status(404).json({ error: `Table ${tName} is not registered or supported.` });
    return;
  }

  const supabase = getSupabaseClient();

  try {
    switch (req.method) {
      case "GET": {
        const { data, error } = await (supabase as any)
          .from(tName)
          .select("*");

        if (error) {
          res.status(400).json({ error: error.message });
          return;
        }

        res.status(200).json({ rows: data || [] });
        break;
      }

      case "PUT": {
        const { primaryKeyName, primaryKeyValue, updatedData } = req.body || {};

        if (!primaryKeyName || primaryKeyValue === undefined || !updatedData) {
          res.status(400).json({ error: "Missing required fields: primaryKeyName, primaryKeyValue, and updatedData are required." });
          return;
        }

        // Dynamic routing for view -> table writes to bypass ERROR: 42809
        let targetTable = tName;
        let targetUpdatedData = { ...updatedData };
        if (tName === "memory_timeline_events_for_ai") {
          targetTable = "memory_timeline_events";
          targetUpdatedData = filterTableColumns("memory_timeline_events", updatedData);
        }

        const { data, error } = await (supabase as any)
          .from(targetTable)
          .update(targetUpdatedData)
          .eq(primaryKeyName, primaryKeyValue)
          .select();

        if (error) {
          res.status(400).json({ error: error.message });
          return;
        }

        res.status(200).json({ success: true, updatedRow: data?.[0] });
        break;
      }

      case "DELETE": {
        const { primaryKeyName, primaryKeyValue } = req.body || {};

        if (!primaryKeyName || primaryKeyValue === undefined) {
          res.status(400).json({ error: "Missing required fields: primaryKeyName and primaryKeyValue are required." });
          return;
        }

        // Dynamic routing for view -> table writes to bypass ERROR: 42809
        let targetTable = tName;
        if (tName === "memory_timeline_events_for_ai") {
          targetTable = "memory_timeline_events";
        }

        const { error } = await (supabase as any)
          .from(targetTable)
          .delete()
          .eq(primaryKeyName, primaryKeyValue);

        if (error) {
          res.status(400).json({ error: error.message });
          return;
        }

        res.status(200).json({ success: true });
        break;
      }

      case "POST": {
        const { rowData } = req.body || {};

        if (!rowData) {
          res.status(400).json({ error: "rowData is required." });
          return;
        }

        // Dynamic routing for view -> table writes to bypass ERROR: 42809
        let targetTable = tName;
        let targetRowData = { ...rowData };
        if (tName === "memory_timeline_events_for_ai") {
          targetTable = "memory_timeline_events";
          targetRowData = filterTableColumns("memory_timeline_events", rowData);
        }

        const { data, error } = await (supabase as any)
          .from(targetTable)
          .insert(targetRowData)
          .select();

        if (error) {
          res.status(400).json({ error: error.message });
          return;
        }

        res.status(200).json({ success: true, createdRow: data?.[0] });
        break;
      }

      default: {
        res.status(405).json({ error: "Method not allowed" });
      }
    }
  } catch (err: any) {
    console.error(`Error in admin-tables API [${tName}]:`, err);
    res.status(500).json({ error: err.message });
  }
}
