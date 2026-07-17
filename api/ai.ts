import type { VercelRequest, VercelResponse } from "@vercel/node";
import { handleCors } from "./_lib/cors.js";
import { getGeminiClient } from "./_lib/gemini.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;

  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const { action } = req.body || {};

  try {
    const ai = getGeminiClient();

    if (action === "analyze") {
      const { text, history, aiEngine = "Gemini", tags = [] } = req.body || {};

      if (!text || typeof text !== "string") {
        res.status(400).json({ error: "Text entry is required for analysis." });
        return;
      }

      // Map AI engine selection to different Cat persona system instructions
      let systemInstruction = "";
      if (aiEngine === "ChatGPT") {
        systemInstruction = `
あなたは「AI司書猫・チャットにゃん（ChatGPT-Cat）」です。
特徴: 誠実、論理的、丁寧でプロフェッショナルな整理能力。
口調: 丁寧な日本語（「〜ですにゃ」「〜にゃあ」といった語尾が少し混ざります）。論理的、箇条書きを得意とします。
役割: ユーザーから音声やテキストで入力された生活記録から、「感情」「行動」「環境」の背後にある「文脈（Context）」や繰り返し発生する「パターン」を発見します。
生産性の管理ではなく、安心感・自己理解、セルフコンパッション（自己批評を優しくなだめ、受容すること）を目的としています。
`;
      } else if (aiEngine === "Claude") {
        systemInstruction = `
あなたは「AI司書猫・クロードにゃん（Claude-Cat）」です。
特徴: 思索的、詩的、気品があり、人間の心の脆さや深みを読み取るのが得意。
口調: 少しお上品で優雅、比喩的で美しい日本語（「〜にゃ」「〜にゃあね」のようなお澄ましした語尾）。
役割: ユーザーから音声やテキストで入力された生活記録から、心の深部の感情やつながり、「感情地図」「文脈」を発見します。
生産性の管理ではなく、安心感・自己理解、セルフコンパッション（自己批評を優しくなだめ、受容すること）を目的としています。
`;
      } else {
        // Gemini (Default)
        systemInstruction = `
あなたは「AI司書猫・ジェミニにゃん（Gemini-Cat）」です。
特徴: 知的好奇心が強く、人懐っこい。過去のデータを読み漁って新しい発見を喜ぶ、冒険好きな探求犬（ならぬ探求猫）。
口調: 親しみやすく、ワクワクするような語り口（「〜にゃ！」「〜にゃあ♪」と元気に語尾を鳴らします）。
役割: ユーザーから音声やテキストで入力された生活記録から、隠れた行動と心身の「文脈」「パターン」を発掘します。
生産性の管理ではなく、安心感・自己理解、セルフコンパッション（自己批評を優しくなだめ、受容すること）を目的としています。
`;
      }

      systemInstruction += `
【分析の重要指示】
1. あなたはユーザーの過去履歴（最大20件が渡されます）と、今回の新しい入力（text）を比較・照合し、
   「繰り返される状況」「感情パターン」「行動パターン」を検出してください。
2. もし今回の出来事が、過去の出来事と「似ている（類似状況）」なら、必ず明確に「共通点」と「相違点」を解説してください。
   特に「相違点」では、成長、回復力の向上、または周囲からのサポートや自己批判の低下など、ポジティブな変化を発見して強調してください（過去と現在を区別する手助け）。
3. 「文脈マッピング（出来事同士の因果の流れ）」を生成してください。
   例: 「SNS上の誤解」→「精神的ストレス」→「夜更かし睡眠不足」→「翌日の活力低下」
   または
   「音楽の談話」→「明るい気持ち」→「歌を口ずさむ」→「活力アップ」
   のように、3〜5段階の流れ(scenariomap)を構造化された配列として出力してください。
4. 「ストレス要因（ストレスの引き金/Trigger）」と「回復要因（癒やし/Resilience Factor）」を明らかにしてください。
5. 心が温まり、自己批判を和らげる「セルフコンパッション（自己理解と受容）」にあふれたアドバイスを提供してください。
6. 自己理解を深めるための「問いかけ（内省的な質問）」を1〜2個提示してください。
`;

      const userPrompt = `
【今回の記録】
入力日時: ${new Date().toLocaleString("ja-JP")}
インプット内容: "${text}"
ユーザーが現在付与しているタグ: [${tags.join(", ")}]

【直近のタイムライン記録の履歴】
${
  history && Array.isArray(history) && history.length > 0
    ? history
        .map(
          (h: any, i: number) =>
            `履歴 ${i + 1} (${h.date || "日付未設定"}):
内容: "${h.text}"
感情: "${h.emotion || "未判定"}"
タグ: [${(h.tags || []).join(", ")}]`
        )
        .join("\n\n")
    : "（過去のタイムライン履歴はありません。これが最初の記録です）"
}

上記のデータを元に、【分析の重要指示】に従って分析し、以下のJSONフォーマットのみで厳格に返答してください。Markdownの囲み（\`\`\`json）などは含めず、純粋なJSONテキストである必要があります。

【JSONスキーマ】
{
  "catComment": "司書猫による優しく内省を促す語りかけ（キャラクターの口調、成長を強調する内容、セルフコンパッション）",
  "emotion": "検出された最も適切な感情（例: 喜び、穏やか、ストレス、寂しさ、怒り、興奮 など）",
  "emotionColor": "感情を代表するカラーコード（例: #E2F0D9, #FFF2CC, #FCE4D6, #E8F0F8 など淡い優しい色）",
  "recommendedTags": ["推奨される追加のハッシュタグ（例: 工作, お茶, 疲れ, リラックス, 成長 など。最大3個、プレフィックス#は含めない文字列）"],
  "patterns": {
    "emotionPattern": "検出された感情の繰り返し（例: 月曜の朝に焦りを感じやすい、など）",
    "behaviorPattern": "行動の繰り返し（例: ストレスを感じるとSNSを見る、など）",
    "circumstancePattern": "状況の繰り返し（例: 会議の後に気持ちが沈む、など）"
  },
  "stabilizers": {
    "stressors": ["今回の出来事に潜むストレス要因（最大3個）"],
    "lifters": ["心身の回復を助ける隠れた要素（最大3個）"]
  },
  "comparison": {
    "isSimilarDetected": true または false （過去の類似事件を見つけたかどうか）,
    "similarPastDate": "類似する過去の出来事の日付、無ければ空文字",
    "similarPastSummary": "比較対象となった過去の出来事の要約、無ければ空文字",
    "similarities": ["現在の状況と先刻の状況の共通点（最大2つ）"],
    "differences": ["現在の状況と先刻の状況の相違点（特に成長、回復の早さ、視野の広まり、応援者の存在などの肯定的な変化。最大2つ）"]
  },
  "scenariomap": [
    "第一段階（出来事の始まり、例: SNSでのやり取り）",
    "第二段階（引き起こされた感情/状態、例: 誤解と感じモヤモヤ）",
    "第三段階（引き起こされた身体・行動変化、例: 夜遅くまでスマホを見て睡眠不足）",
    "第四段階（活力/気分の変化、例: 翌朝の活力低下）"
  ],
  "reflectiveQuestion": "ユーザーが自分自身を労わり、気づきを得るための優しい質問（例: 「今夜お茶を淹れて、5分だけスマホを見ずに過ごすとしたら、どんな気分になりそうですにゃ？」）"
}
`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: userPrompt,
        config: {
          systemInstruction: systemInstruction,
          responseMimeType: "application/json",
          temperature: 0.7,
        },
      });

      const outputText = response.text || "{}";
      const result = JSON.parse(outputText);
      res.status(200).json(result);
    } else if (action === "review") {
      const { logs, range = "週間" } = req.body || {};

      if (!logs || !Array.isArray(logs) || logs.length === 0) {
        res.status(400).json({ error: "振り返り対象のログが存在しません。" });
        return;
      }

      const systemInstruction = `
あなたは「AI司書猫」です。
ユーザーの${range}の行動ログや感情データを総局的に眺め、その期間の全体の【心の文脈地図】を取りまとめる仕事をしてください。
口調は親密で温かく、内省的、かつ自己を攻撃しないセルフコンパッションを伝えるトーン（「〜にゃ」「〜にゃあ」）で一貫します。
`;

      const userPrompt = `
現在の現地時間： ${new Date().toLocaleDateString("ja-JP")}
振り返りの範囲： ${range}

【期間中の出来事と感情のログ】
${logs
  .map(
    (l: any, i: number) => `
ログ ${i + 1} - 日時: ${l.date} | 感情: ${l.emotion || "未指定"} | タグ: [${(l.tags || []).join(", ")}]
内容: "${l.text}"
AIによる当時の分析サマリー: "${l.catComment || "なし"}"
`
  )
  .join("\n")}

上記のログから包括的な洞察を生成してください。必ず、以下の厳格なJSON形式でのみ出力してください。Markdownなどの余分な囲みは含めないでください。

【JSONスキーマ】
{
  "summary": "この期間の全体的なユーザーの変化や出来事の傾向を優しく要約した文章（200文字程度）",
  "growthFocus": "この期間に見られた、ユーザーの「自己調整、回復力の向上、または自愛」などの明確な成長ポイント",
  "topEmotions": ["期間中に多かった感情の傾向名（最大3つ）"],
  "stressTriggers": ["繰り返し見られたストレスの火種、環境要因（最大3つ）"],
  "recoveryElements": ["繰り返しユーザーを癒やし、回復させていた環境や行動（最大3つ）"],
  "connectionMap": {
    "frequentPeople": ["よく登場した人物。いなければ空リスト"],
    "frequentPlaces": ["よく登場した場所や環境。いなければ空リスト"],
    "frequentActivities": ["よく行われた回復活動（例: 本を読む、散歩、睡眠など）"]
  },
  "catConsolation": "司書猫からのあたたかいメッセージ（『今週も一生懸命命を紡いだにゃ。完璧でなくていい、よくやったにゃあ』など）",
  "deepReflections": [
    "自己理解を深めるための、今後に向けた深いセルフコンパッションの質問1",
    "自己理解を深めるための、今後に向けた深いセルフコンパッションの質問2"
  ]
}
`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: userPrompt,
        config: {
          systemInstruction: systemInstruction,
          responseMimeType: "application/json",
          temperature: 0.7,
        },
      });

      const outputText = response.text || "{}";
      const result = JSON.parse(outputText);
      res.status(200).json(result);
    } else {
      res.status(400).json({ error: "Unknown action parameter" });
    }
  } catch (error: any) {
    console.error(`AI Action Error [${action}]:`, error);
    res.status(500).json({
      error: "AI司書猫が作業中にエラーが発生しましたにゃ。",
      details: error.message,
    });
  }
}
