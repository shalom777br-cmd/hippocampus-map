export const ADMIN_TABLES_METADATA: Record<string, { primaryKey: string; columns: string[] }> = {
  hippocampus_logs: {
    primaryKey: "id",
    columns: ["id", "user_id", "entry_type", "content", "received_from", "occurred_at", "created_at"]
  },
  hippocampus_users: {
    primaryKey: "id",
    columns: ["id", "email", "name", "address", "phone", "birth_date", "password_hash", "created_at"]
  },
  memory_chatgpt: {
    primaryKey: "id",
    columns: ["id", "category", "content", "source", "created_at", "occurred_at"]
  },
  memory_event_embeddings: {
    primaryKey: "event_id",
    columns: ["event_id", "embedding", "model", "chunk_text", "created_at"]
  },
  memory_sources: {
    primaryKey: "id",
    columns: ["id", "source_slug", "source_title", "original_file_name", "original_format", "raw_markdown", "created_at", "updated_at", "meta"]
  },
  memory_timeline_events: {
    primaryKey: "id",
    columns: ["id", "source_id", "order_no", "era", "year_label", "year", "month", "day", "approximate_date", "event_date", "header_date_text", "section_no", "title", "primary_category", "categories", "locations", "scripture_refs", "summary", "body", "raw_header", "raw_text", "meta", "created_at", "updated_at"]
  },
  memory_timeline_events_for_ai: {
    primaryKey: "id",
    columns: ["id", "source_slug", "source_title", "order_no", "era", "year", "month", "day", "event_date", "title", "primary_category", "categories", "locations", "scripture_refs", "summary", "body", "meta", "display_title", "ai_context"]
  },
  temote_user_data: {
    primaryKey: "email",
    columns: ["email", "projects", "tasks", "history", "settings", "events", "updated_at"]
  },
  graph_nodes: {
    primaryKey: "id",
    columns: ["id", "label", "node_type", "user_id", "created_at"]
  },
  graph_edges: {
    primaryKey: "id",
    columns: ["id", "parent_id", "child_id", "user_id", "created_at"]
  }
};

// Helper to filter keys in data to only include valid columns for a specific table
export const filterTableColumns = (tableName: string, data: Record<string, any>): Record<string, any> => {
  const meta = ADMIN_TABLES_METADATA[tableName];
  if (!meta) return data;
  const filtered: Record<string, any> = {};
  for (const key of Object.keys(data)) {
    if (meta.columns.includes(key)) {
      filtered[key] = data[key];
    }
  }
  return filtered;
};
