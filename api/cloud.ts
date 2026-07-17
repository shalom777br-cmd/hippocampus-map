import type { VercelRequest, VercelResponse } from "@vercel/node";
import { handleCors } from "./_lib/cors.js";
import { getSupabaseClient } from "./_lib/supabase.js";

function normalizeRowToTimelineLog(row: any): any {
  if (!row) return null;
  let parsed: any = null;
  let isJson = false;

  try {
    if (row.content && typeof row.content === "string") {
      const trimmed = row.content.trim();
      if ((trimmed.startsWith("{") && trimmed.endsWith("}")) || (trimmed.startsWith("[") && trimmed.endsWith("]"))) {
        parsed = JSON.parse(row.content);
        isJson = true;
      }
    } else if (row.content && typeof row.content === "object") {
      parsed = row.content;
      isJson = true;
    }
  } catch (e) {
    console.warn("Failed parsing JSON content for row:", row.id, e);
  }

  // Fallback to raw content if not a valid JSON object
  if (!parsed || typeof parsed !== "object") {
    parsed = { transcription: row.content || "" };
  }

  // Ensure robust original sub-object
  const original = parsed.original || {
    transcription: parsed.transcription || parsed.text || parsed.content || (isJson ? "" : row.content) || "",
    manualNote: parsed.manualNote || parsed.memo || "",
    datetime: parsed.datetime || row.occurred_at || row.created_at || new Date().toISOString(),
    tags: Array.isArray(parsed.tags) ? parsed.tags : []
  };

  if (!original.transcription) {
    original.transcription = parsed.transcription || parsed.text || parsed.content || row.content || "";
  }
  if (!original.datetime) {
    original.datetime = row.occurred_at || row.created_at || new Date().toISOString();
  }
  if (!original.tags || !Array.isArray(original.tags)) {
    original.tags = Array.isArray(parsed.tags) ? parsed.tags : [];
  }

  // Ensure robust aiData sub-object to prevent frontend rendering crashes
  const aiData = parsed.aiData || {
    summary: parsed.summary || "インポートされた外部記憶",
    analysisStr: parsed.analysisStr || "外部データベースから読み出された記憶データですにゃ。",
    emotion: parsed.emotion || row.entry_type || "記憶",
    emotionColor: parsed.emotionColor || "#E3ECF5",
    catComment: parsed.catComment || "海馬の書庫から見つかった大切な思い出にゃ。",
    reflectiveQuestion: parsed.reflectiveQuestion || "この記憶から新しく思い返すことはありますくにゃ？",
    patterns: parsed.patterns,
    scenariomap: parsed.scenariomap
  };

  return {
    id: parsed.id || row.id || `log-${row.id || Math.random().toString(36).substr(2, 9)}`,
    userId: row.user_id,
    original,
    aiData,
    createdTime: parsed.createdTime || new Date(original.datetime).getTime() || Date.now()
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;

  const action = req.query.action || req.body?.action;
  const supabase = getSupabaseClient();

  try {
    switch (action) {
      case "sync-pull": {
        const userId = req.query.userId || req.body?.userId;
        if (!userId || typeof userId !== "string") {
          res.status(400).json({ message: "ユーザーIDが必要です。" });
          return;
        }

        const { data: rows, error } = await (supabase as any)
          .from("hippocampus_logs")
          .select("*")
          .eq("user_id", userId);

        if (error) {
          throw error;
        }

        const logs: any[] = [];
        const books: any[] = [];
        let settings: any = null;
        const reviews: any[] = [];

        if (rows && rows.length > 0) {
          for (const row of rows) {
            try {
              if (row.entry_type === "book") {
                books.push(JSON.parse(row.content));
              } else if (row.entry_type === "settings") {
                settings = JSON.parse(row.content);
              } else if (row.entry_type === "review") {
                reviews.push(JSON.parse(row.content));
              } else {
                // Treat everything else as log and normalize it robustly
                const normalized = normalizeRowToTimelineLog(row);
                if (normalized) {
                  logs.push(normalized);
                }
              }
            } catch (parseErr) {
              console.warn("Failed to parse entry content:", row.content, parseErr);
            }
          }
        }

        res.status(200).json({ logs, books, settings, reviews });
        break;
      }

      case "sync-push": {
        const { userId, logs, books, settings, reviews } = req.body || {};
        if (!userId) {
          res.status(400).json({ message: "ユーザーIDが必要です。" });
          return;
        }

        // Prepare batch insertion
        const rowsToInsert: any[] = [];

        // Push logs
        if (Array.isArray(logs)) {
          for (const log of logs) {
            rowsToInsert.push({
              user_id: userId,
              entry_type: "log",
              content: JSON.stringify(log),
              received_from: log.receivedFrom || "app",
              occurred_at: log.original?.datetime || new Date().toISOString()
            });
          }
        }

        // Push books
        if (Array.isArray(books)) {
          for (const book of books) {
            rowsToInsert.push({
              user_id: userId,
              entry_type: "book",
              content: JSON.stringify(book),
              received_from: "app",
              occurred_at: book.createdAt || new Date().toISOString()
            });
          }
        }

        // Push settings
        if (settings) {
          rowsToInsert.push({
            user_id: userId,
            entry_type: "settings",
            content: JSON.stringify(settings),
            received_from: "app",
            occurred_at: new Date().toISOString()
          });
        }

        // Push reviews
        const finalReviews = reviews || req.body.finalReviews;
        if (Array.isArray(finalReviews)) {
          for (const rev of finalReviews) {
            rowsToInsert.push({
              user_id: userId,
              entry_type: "review",
              content: JSON.stringify(rev),
              received_from: "app",
              occurred_at: rev.generatedAt || new Date().toISOString()
            });
          }
        }

        // 1. Delete all existing logs for this user first
        const { error: deleteError } = await (supabase as any)
          .from("hippocampus_logs")
          .delete()
          .eq("user_id", userId);

        if (deleteError) {
          throw deleteError;
        }

        // 2. Batch insert (50 rows at a time)
        if (rowsToInsert.length > 0) {
          for (let i = 0; i < rowsToInsert.length; i += 50) {
            const batch = rowsToInsert.slice(i, i + 50);
            const { error: insertError } = await (supabase as any)
              .from("hippocampus_logs")
              .insert(batch);

            if (insertError) {
              throw insertError;
            }
          }
        }

        res.status(200).json({ message: "クラウド同期が完了しました🐾" });
        break;
      }

      case "receive-memory": {
        const { userId, memory } = req.body || {};
        if (!userId || !memory) {
          res.status(400).json({ message: "userIdとmemoryが必要です。" });
          return;
        }

        const newMemory = {
          ...memory,
          receivedFrom: "luca",
          receivedAt: new Date().toISOString(),
        };

        // Insert as a new individual row into hippocampus_logs
        const { error: insertError } = await (supabase as any)
          .from("hippocampus_logs")
          .insert({
            user_id: userId,
            entry_type: "received_memory",
            content: JSON.stringify(newMemory),
            received_from: "luca",
            occurred_at: new Date().toISOString()
          });

        if (insertError) {
          throw insertError;
        }

        res.status(200).json({ message: "記憶を受け取りましたにゃ🐾" });
        break;
      }

      default: {
        res.status(400).json({ error: `Unknown action: ${action}` });
      }
    }
  } catch (err: any) {
    console.error(`Error in cloud sync API [${action}]:`, err);
    res.status(500).json({ message: `サーバーエラーが発生しました: ${err.message}` });
  }
}
