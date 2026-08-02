import type { VercelRequest, VercelResponse } from "@vercel/node";
import { handleCors } from "./_lib/cors.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;

  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const { title = "生成結果", content, criteria } = req.body || {};
    if (!content) {
      res.status(400).json({ error: "Content is required" });
      return;
    }

    const response = await fetch("https://vesper-c4987b3d.base44.app/functions/submitArtifact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        content,
        criteria
      })
    });

    const data = await response.json();
    res.status(200).json(data);
  } catch (error: any) {
    console.error("Error submitting artifact:", error);
    res.status(500).json({ error: error?.message || "Failed to submit artifact" });
  }
}
