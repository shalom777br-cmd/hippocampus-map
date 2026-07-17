import type { VercelRequest, VercelResponse } from "@vercel/node";
import { handleCors } from "./_lib/cors";
import { getSupabaseClient } from "./_lib/supabase";

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
              const parsed = JSON.parse(row.content);
              if (row.entry_type === "book") {
                books.push(parsed);
              } else if (row.entry_type === "settings") {
                settings = parsed;
              } else if (row.entry_type === "review") {
                reviews.push(parsed);
              } else {
                // Treat everything else as log
                logs.push(parsed);
              }
            } catch (parseErr) {
              console.warn("Failed to parse log entry content:", row.content, parseErr);
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
