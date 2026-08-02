/**
 * Helper utility to submit generated text/artifacts to Vesper evaluation function
 */
export async function submitArtifactToVesper(
  content: string,
  title: string = "生成結果",
  criteria?: string
) {
  try {
    const res = await fetch("https://vesper-c4987b3d.base44.app/functions/submitArtifact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        content,
        criteria
      })
    });
    return await res.json();
  } catch (error) {
    console.error("Failed to submit artifact to Vesper:", error);
    return null;
  }
}
