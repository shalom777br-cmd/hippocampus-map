import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing env vars");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const userEmail = "shalom777br@gmail.com";
const userPassword = "password"; // standard password they can use
const userId = "usr_shalom777";

const logsData = [
  {
    "id": "fallback_1783732237544",
    "original": {
      "transcription": "今の場所へ引っ越し",
      "manualNote": "",
      "datetime": "2019-02-11T22:09:00",
      "tags": [
        "プライベート"
      ],
      "emotions": []
    },
    "createdTime": 1783732237544
  },
  {
    "id": "fallback_1783732197324",
    "original": {
      "transcription": "ミツパ祈祷院",
      "manualNote": "",
      "datetime": "2020-01-11T22:09:00",
      "tags": [
        "プライベート",
        "仕事"
      ],
      "emotions": []
    },
    "createdTime": 1783732197324
  },
  {
    "id": "fallback_1783731446905",
    "original": {
      "transcription": "真里谷祈祷院",
      "manualNote": "",
      "datetime": "2024-02-11T21:55:00",
      "tags": [
        "プライベート"
      ],
      "emotions": []
    },
    "createdTime": 1783731446905
  },
  {
    "id": "fallback_1783731398917",
    "original": {
      "transcription": "真里谷祈祷院に行く",
      "manualNote": "",
      "datetime": "2023-02-11T21:55:00",
      "tags": [
        "プライベート",
        "仕事"
      ],
      "emotions": []
    },
    "createdTime": 1783731398917
  },
  {
    "id": "fallback_1783731179447",
    "original": {
      "transcription": "アニメ制作チームへ",
      "manualNote": "",
      "datetime": "2022-10-11T21:52:00",
      "tags": [
        "仕事"
      ],
      "emotions": []
    },
    "createdTime": 1783731179447
  },
  {
    "id": "fallback_1783731043578",
    "original": {
      "transcription": "エルサレムの平和前3日停電/ブラジル孤児院法律報告書提出",
      "manualNote": "",
      "datetime": "2021-10-11T21:48:00",
      "tags": [
        "仕事"
      ],
      "emotions": []
    },
    "createdTime": 1783731043578
  },
  {
    "id": "log_1782169082901_6211_0",
    "original": {
      "transcription": "ライフル装備の大規模銀行強盗がコープバンク横通る。セントロの複数銀行が襲撃される",
      "manualNote": "",
      "tags": [],
      "datetime": "2021-08-31T15:00:00.000Z",
      "detectedDateStr": "2021年8月31日",
      "isImported": true
    },
    "createdTime": 1630422000000
  },
  {
    "id": "log_1782168160661_3090_0",
    "original": {
      "transcription": "〜9月4日 一時帰国（デルタ）往路：DL104 サンパウロ21:25→アトランタDL295 アトランタ11:45→東京成田(18日)復路：DL296 東京成田16:30→アトランタDL105 アトランタ21:42→サンパウロ",
      "manualNote": "",
      "tags": [],
      "datetime": "2019-07-17T15:00:00.000Z",
      "detectedDateStr": "2019年7月17日",
      "isImported": true
    },
    "createdTime": 1563375600000
  },
  {
    "id": "log_1782079578297_6496_0",
    "original": {
      "transcription": "草原のワーク中に、ちっちゃなジョアンナにお花をくれる男の子が出現",
      "manualNote": "",
      "tags": [],
      "datetime": "2025-07-26T15:48:00.000Z",
      "detectedDateStr": "2025年7月26日12時48分",
      "isImported": true
    },
    "createdTime": 1753544880000
  },
  {
    "id": "fallback_1781911534967",
    "original": {
      "transcription": "YouTubeのインフルエンサーの動画を見て疎外感を感じた",
      "manualNote": "",
      "datetime": "2026-06-19T20:24:00",
      "tags": [
        "プライベート",
        "仕事"
      ],
      "emotions": [
        "さびしい",
        "がっかり、期待はずれ",
        "誤解された、軽んじられた感じ",
        "よそよそしい、疎外感、知らない場所に来た感覚"
      ]
    },
    "createdTime": 1781911534967
  },
  {
    "id": "fallback_1781904200660",
    "original": {
      "transcription": "今日は9時45分からアニメ制作祈祷会があった 送金受け取りメールが来た 久しぶりに近くのスーパーに行って お弁当を買って食べた 感情ラベリングのアプリを作った 久しぶりにハロートークのボイスルームを開いた",
      "manualNote": "",
      "datetime": "2026-06-19T18:20:00",
      "tags": [
        "プライベート",
        "仕事"
      ],
      "emotions": [
        "肩がこる、首が痛い",
        "頭が痛い、気が重い",
        "親しみ、良く知っている感覚",
        "楽しい",
        "面白い"
      ]
    },
    "createdTime": 1781904200660
  },
  {
    "id": "log_1781832038389_3553_0",
    "original": {
      "transcription": "3月（26歳） 初めてのアメリカ子供チームガン末期の方の家で癒しの祈り、ムチウチのフィリピン人癒し。ギリシャ人・アルメニア人など諸民族と交わる。付録：食料が増えた（ロス滞在中）所持金0・食料残り少なしで祈ると、礼拝場所にスパニッシュ系が捧げたスーパー残り物山積み。2週間食えず。",
      "manualNote": "",
      "tags": [],
      "datetime": "1994-01-01T14:00:00.000Z",
      "detectedDateStr": "1994年",
      "isImported": true
    },
    "createdTime": 757432800000
  },
  {
    "id": "log_1781832038389_7356_2",
    "original": {
      "transcription": "ベトナムチーム•5月 フィリピン・マニラチーム",
      "manualNote": "",
      "tags": [],
      "datetime": "1995-02-01T14:00:00.000Z",
      "detectedDateStr": "1995年2月",
      "isImported": true
    },
    "createdTime": 791647200000
  },
  {
    "id": "log_1781832038389_7257_4",
    "original": {
      "transcription": "イスラエルチーム",
      "manualNote": "",
      "tags": [],
      "datetime": "1995-11-01T14:00:00.000Z",
      "detectedDateStr": "1995年11月",
      "isImported": true
    },
    "createdTime": 815234400000
  },
  {
    "id": "log_1781832038389_2080_6",
    "original": {
      "transcription": "ブラジル宣教師への導きの証し（28歳）出版関係で仕事楽しく遊ぶが、海外に行きたいと祈る。ブラジルに遣わす言葉 → ブラジル人知り合いなし、サッカー・芋・さとうきびしか知らないが調べ始める。夢と現実の一致「遠くの町の灯りが見える」と子供が言う夢 → 後に神奈川県住みの彼女が同じ言葉で東京教会来る。イスラエルツアー終了時テルアビブで38人のブラジル人ツアーと対面（レシーフェクリスチャン団体）。母との気づき実家近くでブラジル人と知り合い、料理食べ・ポルトガル語教わる。母と歩いている時ブラジル人行き交い、「あんたが行く所かい」と母 → 「私はブラジルに行くことになっている」と確信",
      "manualNote": "",
      "tags": [],
      "datetime": "1996-01-01T14:00:00.000Z",
      "detectedDateStr": "1996年",
      "isImported": true
    },
    "createdTime": 820504800000
  },
  {
    "id": "log_1781832038389_5146_8",
    "original": {
      "transcription": "末 リオでの霊の戦いチーム通してリオで霊の戦い。帰り道すさまじく道迷うが車中「リオへ出ます」と牧師 → 「出るんです」。300レアル貸した人返さず。礼拝で「借金ある人を赦す」言葉心残り → 「返さなくていい」と言う → 貸した金ほぼ10倍献金受ける。",
      "manualNote": "",
      "tags": [],
      "datetime": "1998-01-01T14:00:00.000Z",
      "detectedDateStr": "1998年1月",
      "isImported": true
    },
    "createdTime": 883663200000
  },
  {
    "id": "log_1781832038389_7660_10",
    "original": {
      "transcription": "3月 リオへの移動の導き**「イヘプリエンジーベル」（怠りなく）出エジプト記言葉頭に残り、リオ行く決心。バスで出発、日系旅行社の助けで45レアルホテル確保（原本60レアルAホテル前で殺人事件）。",
      "manualNote": "",
      "tags": [],
      "datetime": "1998-01-01T14:00:00.000Z",
      "detectedDateStr": "1998年",
      "isImported": true
    },
    "createdTime": 883663200000
  },
  {
    "id": "log_1781832038389_8894_12",
    "original": {
      "transcription": "9月永住権取得（）ビザ切れで銀行送金拒否。「10日間苦しみ」（黙2:10）徹底感謝 → 10日後旅行社Mさんが住所探し、永住権恩赦法公布記事発見。Mさんが商品買い取り・ビザ手続き手伝う・身元引き受け。",
      "manualNote": "",
      "tags": [],
      "datetime": "1998-01-01T14:00:00.000Z",
      "detectedDateStr": "1998年",
      "isImported": true
    },
    "createdTime": 883663200000
  },
  {
    "id": "log_1781832038389_1338_14",
    "original": {
      "transcription": "11月 エジプトチーム**•エジプトへ宣教",
      "manualNote": "",
      "tags": [],
      "datetime": "1998-01-01T14:00:00.000Z",
      "detectedDateStr": "1998年",
      "isImported": true
    },
    "createdTime": 883663200000
  },
  {
    "id": "log_1781832038390_6545_16",
    "original": {
      "transcription": "（③）** ヨルダン・アンマンチーム",
      "manualNote": "",
      "tags": [],
      "datetime": "1999-11-01T14:00:00.000Z",
      "detectedDateStr": "1999年11月",
      "isImported": true
    },
    "createdTime": 941464800000
  },
  {
    "id": "log_1781832038390_3792_18",
    "original": {
      "transcription": "（④）** イギリス経由イスラエルチームイスラエルチーム参加の導きガリラヤへ行きたいがお金なし。道端で「交通費ない、金を貸してほしい」と長老に多めのお金あげ → 怒り悔い改め感謝祈り → ネガ消え喜び湧き、イスラエルチーム必要満たされる",
      "manualNote": "",
      "tags": [],
      "datetime": "2000-01-01T14:00:00.000Z",
      "detectedDateStr": "2000年1月",
      "isImported": true
    },
    "createdTime": 946735200000
  },
  {
    "id": "log_1781832038390_5242_20",
    "original": {
      "transcription": "イスラエル行き牧師「家族所行くように」と → 孤児院写真集渡し「天国行っても母いなかったら悲しい、イエス様信じてください」とすんなり → 母「はい」かしこまり、自分の祷告でイエス受け入れ。",
      "manualNote": "",
      "tags": [],
      "datetime": "2002-01-01T14:00:00.000Z",
      "detectedDateStr": "2002年",
      "isImported": true
    },
    "createdTime": 1009893600000
  },
  {
    "id": "log_1781832038390_8286_22",
    "original": {
      "transcription": "11月（⑤）** イスラエルチーム",
      "manualNote": "",
      "tags": [],
      "datetime": "2002-01-01T14:00:00.000Z",
      "detectedDateStr": "2002年",
      "isImported": true
    },
    "createdTime": 1009893600000
  },
  {
    "id": "log_1781832038390_5579_24",
    "original": {
      "transcription": "第6ブラジルチーム1日5回癒し祈り。クリスマスの夜礼拝2歳男児突然泣き・体中赤い点々（アレルギー・虫刺され）。病院行かすべき母 → 「祈るべき」と聖霊思い → 異言祈り額手置くと数分で熱引く・点々消滅。男児ニコニコベッド降り弟兄と走り遊ぶ。グァララペスへ引っ越し・左肩癒し（28）グァララペス引っ越し体使う生活・慣れず左肩痛。バス降りひも左手引こうと激痛・45度までしか上がらない。肩故障治療受けた話聞 → 治療費祈るが賛美時手上がる気づく・痛み消失・360度回せる。",
      "manualNote": "",
      "tags": [],
      "datetime": "2005-03-01T15:00:00.000Z",
      "detectedDateStr": "2005年3月",
      "isImported": true
    },
    "createdTime": 1109689200000
  },
  {
    "id": "log_1781832038390_8956_26",
    "original": {
      "transcription": "｜日本一時帰国・母の癒し日本へ一時帰国•一時帰国母の嗅覚・味覚癒し（27）母メール嗅覚味覚異常 → 鼻手祈る。風邪こじらせ病院2ヶ月遅れ、医者「鼻センサーやられ、次風邪ひいたら終わり」。三年後「何を食べても味しない、香りもしない」メール → 教会祈り祈祷会祈る。翌年2月母回復半年後「鼻調子戻り匂い良くわかる、味全部する」メール → 主をほめる。",
      "manualNote": "",
      "tags": [],
      "datetime": "2006-01-01T14:00:00.000Z",
      "detectedDateStr": "2006年",
      "isImported": true
    },
    "createdTime": 1136124000000
  },
  {
    "id": "log_1781832038390_5845_28",
    "original": {
      "transcription": "LESの方の話3ヶ月ほど前に難病発覚。2年後全身性エリテマトーデス診断・一生治らない言われる。チーム祈り自分も癒し祈り翌年10月20日検査ほぼ静まり医者薬減量。その二年後6月検査わずかに痕残るが薬不要 → 主をほめたたえる。",
      "manualNote": "",
      "tags": [],
      "datetime": "2007-04-17T15:00:00.000Z",
      "detectedDateStr": "2007年4月17日",
      "isImported": true
    },
    "createdTime": 1176822000000
  },
  {
    "id": "log_1781832038390_1667_30",
    "original": {
      "transcription": "｜住まい発見（24）アラサトゥーバ住まい探しグァララペス田舎泥棒危険 → アラサトゥーバ新住まい。ブラジル住まい借り保証人高ハードル・いろいろ探すが見つからずホテル住まい。宣教師で貸してくれる祈り時「宣教師だと貸くれる人現れる」と思い言葉 → 食事行い日本語話すとホテルオーナー父話しかけ「宣教師です住む場所探して助けて」と → 従業員場所探し・日系人電話 → 最近家買いたが貸す「保証人なし」発見。",
      "manualNote": "",
      "tags": [],
      "datetime": "2008-01-01T14:00:00.000Z",
      "detectedDateStr": "2008年",
      "isImported": true
    },
    "createdTime": 1199196000000
  },
  {
    "id": "log_1781832038390_5280_32",
    "original": {
      "transcription": "Twitter始めるTwitter開始。白馬キャンプアカウントフォロー。",
      "manualNote": "",
      "tags": [],
      "datetime": "2009-06-01T15:00:00.000Z",
      "detectedDateStr": "2009年6月",
      "isImported": true
    },
    "createdTime": 1243868400000
  },
  {
    "id": "log_1781832038390_8466_34",
    "original": {
      "transcription": "12月 Eさんと出会いインターネットでEさん出会い、Eさんイエス受け入れ祈り。「医師になりたい」希望祈る。",
      "manualNote": "",
      "tags": [],
      "datetime": "2009-01-01T14:00:00.000Z",
      "detectedDateStr": "2009年",
      "isImported": true
    },
    "createdTime": 1230818400000
  },
  {
    "id": "log_1781832038390_5882_36",
    "original": {
      "transcription": "リオ男性心臓発作癒し（22）日本チーム迎え飛行機遅れ税関手間・結婚指輪失くし取り走りサンパウロ出よう時迷りリオだけ。車中Hさんお父様（86歳）心臓発作1週間前倒れ集中治療室 → 「なんてこと集会できるか」但し感謝。ホテル祈祷会預言「病人聞いたら病院行って祈り」 → 牧師2人部屋入り通訳集中室入れ。モニター心電図力なく → 牧師心臓手癒し祈り。集会無事開催多く集まり祝福、チーム帰国。6ヶ月後退院。Hさん聞く「お父様如何」→「1週間退院後遺症なし神の癒し」。訪問元気食べ話歩 → 今90歳主あがめます。",
      "manualNote": "",
      "tags": [],
      "datetime": "2010-04-11T15:00:00.000Z",
      "detectedDateStr": "2010年4月11日",
      "isImported": true
    },
    "createdTime": 1270998000000
  },
  {
    "id": "log_1781832038390_1083_38",
    "original": {
      "transcription": "4月18日 チリパスポート返還（23）ブログ_chiliルーカスさん（仮名）日本人女性共通テーマ励まし。住所変更怠りパスポート警察取り上げ長悩む → 感謝祈り速く返る祈り → 翌日か翌々日「パスポート返ってきた！」晴れやか → 主祈り答えほめる。",
      "manualNote": "",
      "tags": [],
      "datetime": "2010-01-01T14:00:00.000Z",
      "detectedDateStr": "2010年",
      "isImported": true
    },
    "createdTime": 1262354400000
  },
  {
    "id": "log_1781832038390_9474_40",
    "original": {
      "transcription": "感謝で台風それ（29）母メール「お父さん今日から10日間東北台風向かえ中止祈り」。感謝祈り台風向かえ行くこと感謝 → 幻天気良父母楽し → 祈り変え「いくても天気良」母「祈り天気良」メール。天気予報祈台風関東接近東京暴風雨圏→瞬間台風消え両親無safe帰。翌週ありがとう「ありがとう感謝」メール → Skype母一緒祈れる。母「車ラジオ情報なく暴風雨不安東北北端見て楽し」 → 感謝祈り説明主あがめます。",
      "manualNote": "",
      "tags": [],
      "datetime": "2010-10-25T14:00:00.000Z",
      "detectedDateStr": "2010年10月25日",
      "isImported": true
    },
    "createdTime": 1288015200000
  },
  {
    "id": "log_1781832038390_3072_42",
    "original": {
      "transcription": "震災後・ユダヤ人に会う震災後繁華街「ユダヤ人に会う」と神語られ。父が話してくれる（30）クリスチャン後父話してくれず電話すぐ母・実家行も話しなし。「小さい頃思い出1日10分感謝」 →イスラエルテルアビブ空港虹「父現状御心ある」。泥棒騒ぎグァララペス泥棒誰もいない部屋椅子携帯使発信履歴 → 実家電話詫び電話父出長話し。一時帰国いろいろ話し。誕生日父誕生日電話長話し、誕生日カード「川遊び山遊び楽しい思い出ありがとう」 → 父「自分がしたくてした」→「お前もしたいこと悔いなくがんばれ」励主あがめます。",
      "manualNote": "",
      "tags": [],
      "datetime": "2011-03-01T15:00:00.000Z",
      "detectedDateStr": "2011年3月",
      "isImported": true
    },
    "createdTime": 1298991600000
  },
  {
    "id": "log_1781832038390_97_44",
    "original": {
      "transcription": "｜神の言葉の勝利4月22日 ECI アンテオケ礼拝ECI方アンテオケ礼拝「白い馬乗って彼につき従った」。",
      "manualNote": "",
      "tags": [],
      "datetime": "2012-01-01T14:00:00.000Z",
      "detectedDateStr": "2012年",
      "isImported": true
    },
    "createdTime": 1325426400000
  },
  {
    "id": "log_1781832038390_8788_46",
    "original": {
      "transcription": "5月 ブラジルチーム来るブラジルチーム来る。",
      "manualNote": "",
      "tags": [],
      "datetime": "2026-06-19T00:34:38.383Z",
      "isImported": true
    },
    "createdTime": 1781829278383
  },
  {
    "id": "log_1781832038390_4813_48",
    "original": {
      "transcription": "（数日前） 神の言葉勝利夢ブラジルチーム来る数日前夢文字各国言葉意味不明「神の言葉勝利」→「神の言葉勝利」叫び目覚める。早天預言・聖会チーム来て早天預言「神の言葉権威勝利」深語られ。聖会メッセージベニヤミン癒し医者治らない言病神癒信じ従癒。人の言葉神言葉勝利。リオ聖会・フェイスブックリオ聖会後女性「フェイスブックは」夢解乜求め人言葉縛神言葉剣解放主に従応 → Facebook交流女性A",
      "manualNote": "",
      "tags": [],
      "datetime": "2012-05-21T15:00:00.000Z",
      "detectedDateStr": "2026年5月21日",
      "isImported": true
    },
    "createdTime": 1779375600000
  },
  {
    "id": "log_1781832038390_6398_50",
    "original": {
      "transcription": "チーム癒し祈癒教え。リオ礼拝場所開リオシェアハウスオーナークリスチャン近くブラジル人教会通礼拝「み声新聞」くれ日本語友達渡 → 夫人プロ歌手日本世界一周一文払 → 国際伝道センター教会リオグァナバラ湾対面ニテロイ市会堂700〜800人ブラジルチーム貸。20 リオ女性鼻癒しリオ教を有志日本語ポルトガル語歌集 ORIGINALゴスペル日本語歌詞ポルトガル語歌詞ローマ字練習公園4〜5人歌い。白い封筒女性白い大型封筒うつろ表情ベンチ座落ち込 Hリーダー「どうした」→ 封筒超音波鼻病気会社辞めさせられスピリティズム信イエス受け入れ祈 → 全員鼻病癒祈 → 晴々「癒され会社辞めずありがとう」教会来。",
      "manualNote": "",
      "tags": [],
      "datetime": "2007-01-01T14:00:00.000Z",
      "detectedDateStr": "2007年",
      "isImported": true
    },
    "createdTime": 1167660000000
  },
  {
    "id": "log_1781832038390_6146_52",
    "original": {
      "transcription": "イェフダさん夫婦アラサトゥーバ繁華街メシアニックジュー会いネット調べアラサトゥーバ在住イェフダさん夫婦会う。",
      "manualNote": "",
      "tags": [],
      "datetime": "2013-01-26T14:00:00.000Z",
      "detectedDateStr": "2013年1月26日",
      "isImported": true
    },
    "createdTime": 1359208800000
  },
  {
    "id": "log_1781832038390_9643_54",
    "original": {
      "transcription": "半ば〜3月12日 一時帰国日本→ブラジル帰国フライト（デルタ）DL296 東京成田5:50PM→アトランタDL105 アトランタ9:43PM→サンパウロ",
      "manualNote": "",
      "tags": [],
      "datetime": "2014-02-01T14:00:00.000Z",
      "detectedDateStr": "2014年2月",
      "isImported": true
    },
    "createdTime": 1391263200000
  },
  {
    "id": "log_1781832038390_7800_56",
    "original": {
      "transcription": "〜11月6日 イスラエルチーム10/28 オリーブ山10/29 旧市街夜聖会証し10/30 カイザリヤメギド昼食カナ夜聖会なし湖畔祈祷会10/31「ガリラヤ湖東」コラジン彩雲カペナウムエンゲブ昼食レストラン虹湖上夜聖会ホテル11/1 マック午後ホテル虹夜聖会ホテル11/2 礼拝アルベル山昼食午後ホテル休礼拝湖岸11/3 ヤルデニット洗礼キルヤットシュモナ昼食ダン公園カツリン聖会湖岸ゲゲスト・レオン牧師11/4 ベテアバラエリコ昼食山登らずエルサレム11/5 オリーブ山11/6 オリーブ山",
      "manualNote": "",
      "tags": [],
      "datetime": "2014-10-28T14:00:00.000Z",
      "detectedDateStr": "2014年10月28日",
      "isImported": true
    },
    "createdTime": 1414504800000
  },
  {
    "id": "log_1781832038390_9794_58",
    "original": {
      "transcription": "〜5月12日 一時帰国往路：1/25 サンパウロ05:25→イスタンブール21:501/26 イスタンブール01:10→東京成田19:55帰路：5/11 東京成田21:20→イスタンブール04:00(1)5/12 イスタンブール09:30→サンパウロ16:55",
      "manualNote": "",
      "tags": [],
      "datetime": "2016-01-25T14:00:00.000Z",
      "detectedDateStr": "2016年1月25日",
      "isImported": true
    },
    "createdTime": 1453730400000
  },
  {
    "id": "log_1781832038390_3979_60",
    "original": {
      "transcription": "往路UA104 サンパウロ23:35→ヒューストン06:00着　UA007 ヒューストン10:30→東京成田15:30(翌) 復路7月25日 UA6 東京成田4:35PM→ヒューストン2:35PM  UA62 ヒューストン9:45PM→サンパウロ9:50AM(翌)",
      "manualNote": "",
      "tags": [],
      "datetime": "2018-01-30T14:00:00.000Z",
      "detectedDateStr": "2018年1月30日",
      "isImported": true,
      "emotions": []
    },
    "createdTime": 1517320800000
  },
  {
    "id": "log_1781832038390_9439_62",
    "original": {
      "transcription": "CW仕事・コピーライター仕事開始引っ越し。ポーランド語wiki・SNS・社会心理学・集団心理。",
      "manualNote": "",
      "tags": [],
      "datetime": "2019-02-01T14:00:00.000Z",
      "detectedDateStr": "2019年2月",
      "isImported": true,
      "emotions": []
    },
    "createdTime": 1549029600000
  },
  {
    "id": "log_1781832038390_3283_64",
    "original": {
      "transcription": "大麻の人・チェコチーム・一時帰国隣アパート大麻関係人入神祈大家交渉感謝賛美→チェコチーム重なり日本一時帰国（アトランタ経由）。帰国時人已exits。コロナ流行その後コロナウイルス流行始まる（2020年）。",
      "manualNote": "",
      "tags": [],
      "datetime": "2019-12-01T15:00:00.000Z",
      "detectedDateStr": "2019年12月",
      "isImported": true
    },
    "createdTime": 1575212400000
  },
  {
    "id": "log_1781832038390_9414_66",
    "original": {
      "transcription": "〜29日 ブラジル→日本（デルタ）DL104 サンパウロ22:50→アトランタDL295 アトランタ10:34→東京成田(29日)3月11日 日本→ブラジル（デルタ）※ WHO COVID-19パンデミック宣言同日DL296 東京成田17:50→アトランタDL105 アトランタ21:43→サンパウロ",
      "manualNote": "",
      "tags": [],
      "datetime": "2020-01-28T15:00:00.000Z",
      "detectedDateStr": "2020年1月28日",
      "isImported": true
    },
    "createdTime": 1580223600000
  },
  {
    "id": "log_1781832038390_4037_68",
    "original": {
      "transcription": "IDカード更新申請•IDカード更新12月5日 グァララペス土地売グァララペス土地売（バス代×2、PF外）。",
      "manualNote": "",
      "tags": [],
      "datetime": "2020-11-05T15:00:00.000Z",
      "detectedDateStr": "2020年11月5日",
      "isImported": true
    },
    "createdTime": 1604588400000
  },
  {
    "id": "log_1781832038390_2543_70",
    "original": {
      "transcription": "往路サンパウロ→ドーハ22:20 02:20ドーハ→17:55 成田　〜復路8月24日 一時帰国。日本一時帰国中にIDカード手続き",
      "manualNote": "",
      "tags": [],
      "datetime": "2021-01-19T05:15:00.000Z",
      "detectedDateStr": "2021年1月20日",
      "isImported": true,
      "emotions": []
    },
    "createdTime": 1611154800000
  },
  {
    "id": "log_1781832038390_5869_72",
    "original": {
      "transcription": "日本→ブラジル（カタール）QR807 東京成田→ドーハ(24日)QR773 ドーハ07:30→サンパウロ(25日)10月半ば 祈り後ブラジル帰国・気づきエルサレム祈り後ブラジル戻る。孤児院X（個人X？）気づき。",
      "manualNote": "",
      "tags": [],
      "datetime": "2021-08-24T15:00:00.000Z",
      "detectedDateStr": "2026年8月24日",
      "isImported": true,
      "emotions": []
    },
    "createdTime": 1787583600000
  },
  {
    "id": "log_1781832038390_3395_74",
    "original": {
      "transcription": "うしださんと出会い",
      "manualNote": "",
      "tags": [],
      "datetime": "2021-10-29T15:00:00.000Z",
      "detectedDateStr": "2021年10月",
      "isImported": true,
      "emotions": []
    },
    "createdTime": 1633100400000
  },
  {
    "id": "log_1781832038390_2774_76",
    "original": {
      "transcription": "〜3月17日 一時帰国往路：QR780 サンパウロ21:30→ドーハ(9日)QR806 ドーハ02:00→東京成田(11日)復路：QR807 東京成田→ドーハ(16日)QR773 ドーハ08:20→サンパウロ(17日)",
      "manualNote": "",
      "tags": [],
      "datetime": "2022-02-09T15:00:00.000Z",
      "detectedDateStr": "2022年2月9日",
      "isImported": true
    },
    "createdTime": 1644418800000
  },
  {
    "id": "log_1781832038390_5933_78",
    "original": {
      "transcription": "〜24日 ブラジル→日本（KLM）KL792 サンパウロ20:00→アムステルダム11:40(24日)KL863 アムステルダム12:30→東京成田09:45(25日)",
      "manualNote": "",
      "tags": [],
      "datetime": "2023-01-23T15:00:00.000Z",
      "detectedDateStr": "2023年1月23日",
      "isImported": true
    },
    "createdTime": 1674486000000
  },
  {
    "id": "log_1781832038390_5071_80",
    "original": {
      "transcription": "3月23〜24日 日本→ブラジル（KLM）KL862 東京成田20:55→アムステルダム07:15(24日)KL791 アムステルダム09:55→サンパウロ18:00(24日)",
      "manualNote": "",
      "tags": [],
      "datetime": "2023-01-01T15:00:00.000Z",
      "detectedDateStr": "2023年",
      "isImported": true
    },
    "createdTime": 1672585200000
  },
  {
    "id": "log_1781832038390_4682_82",
    "original": {
      "transcription": "5月 強迫性障害疑う**•強迫性障害ではないかと疑う",
      "manualNote": "",
      "tags": [],
      "datetime": "2023-05-01T15:00:00.000Z",
      "detectedDateStr": "2023年",
      "isImported": true
    },
    "createdTime": 1672585200000
  },
  {
    "id": "log_1781832038390_9598_84",
    "original": {
      "transcription": "12月6日 アメリカン航空　AA906 サンパウロ21:05→マイアミ　AA1746 マイアミ→ロサンゼルス　AA169 ロサンゼルス→東京羽田(7日到着)",
      "manualNote": "",
      "tags": [],
      "datetime": "2022-12-01T15:00:00.000Z",
      "detectedDateStr": "2023年",
      "isImported": true,
      "emotions": []
    },
    "createdTime": 1672585200000
  },
  {
    "id": "log_1781832038390_5606_86",
    "original": {
      "transcription": "強迫性障害診断•強迫性障害と診断される",
      "manualNote": "",
      "tags": [],
      "datetime": "2024-02-01T15:00:00.000Z",
      "detectedDateStr": "2024年2月",
      "isImported": true
    },
    "createdTime": 1706799600000
  },
  {
    "id": "log_1781832038390_8522_88",
    "original": {
      "transcription": "日航とアメリカン航空　JL002（AA8401）東京羽田16:05→サンフランシスコ　AA1414 サンフランシスコ12:02→ダラス・フォートワース　AA963 ダラス18:44→サンパウロ(翌9:50AM)",
      "manualNote": "",
      "tags": [],
      "datetime": "2024-06-11T15:00:00.000Z",
      "detectedDateStr": "2024年6月11日",
      "isImported": true,
      "emotions": []
    },
    "createdTime": 1718118000000
  },
  {
    "id": "log_1781832038390_1958_90",
    "original": {
      "transcription": "Eさん11月から麻酔科医で勤務。Eさん医師開始。Eさんポーランド大学修了イスラエル病院医師勤務開始。",
      "manualNote": "",
      "tags": [],
      "datetime": "2025-11-01T15:00:00.000Z",
      "detectedDateStr": "2025年",
      "isImported": true,
      "emotions": []
    },
    "createdTime": 1735743600000
  },
  {
    "id": "log_1781832038390_6431_92",
    "original": {
      "transcription": "3月17日 日航とラタム航空　JL006 東京羽田10:40→ニューヨーク・JFK   LA8181（JL5562）ニューヨーク17:30→サンパウロ(翌06:05)",
      "manualNote": "",
      "tags": [],
      "datetime": "2025-01-01T15:00:00.000Z",
      "detectedDateStr": "2025年",
      "isImported": true,
      "emotions": []
    },
    "createdTime": 1735743600000
  },
  {
    "id": "log_1781832038390_5165_94",
    "original": {
      "transcription": "9月5日 雑談・夢記録有名人円卓会談落ち機嫌損隠れ本人来鍵渡夢。鍵輪郭薄丸キーホルダー付。昔憧れサッカー選手誤解。",
      "manualNote": "",
      "tags": [],
      "datetime": "2025-01-01T15:00:00.000Z",
      "detectedDateStr": "2025年",
      "isImported": true
    },
    "createdTime": 1735743600000
  },
  {
    "id": "log_1781832038390_7315_96",
    "original": {
      "transcription": "11月26〜27日 ブラジル→日本（AA/JL）**AA962（JL7205）サンパウロ22:00→ダラスJL011 ダラス10:05(27日)→東京羽田2026年3月16日 日本→ブラジル（JL/AA）**JL6 東京羽田11:05→ニューヨーク(12h55m)AA951ニューヨーク19:45→サンパウロ(翌06:05 9h20m)",
      "manualNote": "",
      "tags": [],
      "datetime": "2025-01-01T15:00:00.000Z",
      "detectedDateStr": "2025年",
      "isImported": true
    },
    "createdTime": 1735743600000
  },
  {
    "id": "log_1781832038390_9532_98",
    "original": {
      "transcription": "夢記録昔好き人公衆面前恥ずかしめられ観光地丸額縁顔出し涙流顔醜く変わり好き人思えぬ醜か可愛そう夢。",
      "manualNote": "",
      "tags": [],
      "datetime": "2026-06-03T15:00:00.000Z",
      "detectedDateStr": "2026年6月3日",
      "isImported": true
    },
    "createdTime": 1780498800000
  },
  {
    "id": "log_1781832038390_5249_100",
    "original": {
      "transcription": "現在、強迫性障害症状がほぼ消えている。主をあがめます！ 神の栄光はとこしえまで！​​​​​​​​​​​​​​​​",
      "manualNote": "",
      "tags": [],
      "datetime": "2026-06-18T15:00:00.000Z",
      "detectedDateStr": "2026年6月",
      "isImported": true
    },
    "createdTime": 1780326000000
  },
  {
    "id": "log_1781822599158_6931_0",
    "original": {
      "transcription": "救大学1年生でイエス・キリストを救い主として受け入れ。共産主義との議論で無力感を味わった後、クリスチャンの同宿者から「神様は祈りを聞く」と教えられ、十字架の犠牲を知って信仰に決意。",
      "manualNote": "",
      "tags": [],
      "datetime": "1986-07-17T08:00:00.000Z",
      "detectedDateStr": "1986年7月17日午前5時",
      "isImported": true
    },
    "createdTime": 521971200000
  },
  {
    "id": "log_1781822599158_4840_2",
    "original": {
      "transcription": "祈祷会で「共産主義国に重荷を持っている者」に聖霊のバプテスマを受けさせると言われ、異言が語れるようになる。後に宣教師 of 召しを受ける。",
      "manualNote": "",
      "tags": [],
      "datetime": "1986-09-22T15:00:00.000Z",
      "detectedDateStr": "1986年9月22日",
      "isImported": true
    },
    "createdTime": 527785200000
  },
  {
    "id": "log_1781822599158_8591_4",
    "original": {
      "transcription": "韓国へ初めての海外宣教",
      "manualNote": "",
      "tags": [],
      "datetime": "1987-01-01T14:00:00.000Z",
      "detectedDateStr": "1987年",
      "isImported": true
    },
    "createdTime": 536508000000
  },
  {
    "id": "log_1781822599158_8860_6",
    "original": {
      "transcription": "某国チームへの参加の導き。お金無かったが、「飛行機代だけは出せる」とメンバーに言われ、チーム参加。滞在費はチーム負担で。初めての海外でひどい咳・痰に苦しむが、チームの祈りで癒され、帰国後気管支炎と診断されるも症状が消失。以後季節の変わり目に咳・鼻水に悩まされない。",
      "manualNote": "",
      "tags": [],
      "datetime": "1988-01-01T14:00:00.000Z",
      "detectedDateStr": "1988年",
      "isImported": true
    },
    "createdTime": 568044000000
  },
  {
    "id": "log_1781822599158_1243_8",
    "original": {
      "transcription": "第一ヨーロッパチーム。教会派遣者がベルリンの壁に向かって「崩れるように」と命じた話を教会で聞く。",
      "manualNote": "",
      "tags": [],
      "datetime": "1989-05-01T15:00:00.000Z",
      "detectedDateStr": "1989年5月",
      "isImported": true
    },
    "createdTime": 610038000000
  },
  {
    "id": "log_1781822599158_3558_10",
    "original": {
      "transcription": "天安門事件・宣教師の召し。教育実習中の天安門事件の只中で、イザヤ43:18-21を通して「わたしはあなたを遣わす」と語られ、宣教師の召しを正式に受ける。",
      "manualNote": "",
      "tags": [],
      "datetime": "1989-06-04T15:00:00.000Z",
      "detectedDateStr": "1989年6月4日",
      "isImported": true
    },
    "createdTime": 612975600000
  },
  {
    "id": "log_1781822599158_7237_12",
    "original": {
      "transcription": "11月 ベルリンの壁崩壊、1991年ソ連崩壊を経て神の言葉の権威にびっくり。",
      "manualNote": "",
      "tags": [],
      "datetime": "1989-01-01T14:00:00.000Z",
      "detectedDateStr": "1989年",
      "isImported": true
    },
    "createdTime": 599666400000
  },
  {
    "id": "log_1781822599158_1417_14",
    "original": {
      "transcription": "頃　信仰の賜物の運用。丸井最上階の祈祷会で「主の十字架のオリジナル歌集はCDになる」と預言。2001年「やすらぎの歌」歌集出版。",
      "manualNote": "",
      "tags": [],
      "datetime": "1990-01-01T14:00:00.000Z",
      "detectedDateStr": "1990年",
      "isImported": true
    },
    "createdTime": 631202400000
  },
  {
    "id": "log_1781822599158_7322_16",
    "original": {
      "transcription": "ソ連崩壊（神の言葉の権威を実証）",
      "manualNote": "",
      "tags": [],
      "datetime": "1991-01-01T14:00:00.000Z",
      "detectedDateStr": "1991年",
      "isImported": true
    },
    "createdTime": 662738400000
  },
  {
    "id": "log_1781822599158_6441_18",
    "original": {
      "transcription": "半ば（24歳） ロサンゼルス宣教師としての導き。預言で「人生の終わりに虚しいものを刈り取る」と言われ、徹夜祈祷会で「アメリカに遣わす」と声。2年後の3月半ば、ロスチームに途中参加。早天祈祷会で「最終的に行くところは中南米」と預言。アメリカ地図→中南米→多くの礼拝者を見る幻。中南米への道を開くように祈り始める。日本では30万円だが、ロスで13ドルで免許取得。聖霊に「あなたも行って並びなさい」と言われ、日本語筆記試験で合格。",
      "manualNote": "",
      "tags": [],
      "datetime": "1992-03-01T15:00:00.000Z",
      "detectedDateStr": "1992年3月",
      "isImported": true
    },
    "createdTime": 699462000000
  },
  {
    "id": "log_1781822599158_3789_20",
    "original": {
      "transcription": "ロス大地震。1月18日 九州アメリカチーム到着。1月19日 成田着後すぐロスに戻る便（イミグレーションで別室）",
      "manualNote": "",
      "tags": [],
      "datetime": "1994-01-17T14:00:00.000Z",
      "detectedDateStr": "1994年1月17日",
      "isImported": true
    },
    "createdTime": 758815200000
  }
];

const formattedLogs = logsData.map((log: any) => {
  return {
    id: log.id,
    createdTime: log.createdTime || Date.now(),
    original: {
      transcription: log.original.transcription || "",
      manualNote: log.original.manualNote || "",
      tags: log.original.tags || [],
      datetime: log.original.datetime || new Date().toISOString(),
      detectedDateStr: log.original.detectedDateStr || undefined,
      isImported: log.original.isImported !== undefined ? log.original.isImported : true,
      emotions: log.original.emotions || []
    },
    aiData: {
      summary: "インポートされた簡易記憶",
      analysisStr: "テキストやメモから直接搬入された簡易的な記憶原本です。AI編集版レポートを楽しみたい場合は「再生成」ボタンをクリックしてにゃ🐾",
      emotion: "穏やか",
      emotionColor: "#FAF9F5",
      catComment: "簡易テキストからのインポートに成功したにゃ！このカードの右上にある『編集』や、展開後の『再生成 🔄』を押せば、いつでも最新のAIコメントや要約を上書き再編できるよ🐾",
      reflectiveQuestion: "この時のあなたの本音は何だったにゃ？"
    }
  };
});

async function run() {
  try {
    // 1. Create or verify the user shalom777br@gmail.com exists
    const hashedPassword = bcrypt.hashSync(userPassword, 10);
    const profile = {
      id: userId,
      email: userEmail,
      name: "探求者 (shalom77br)",
      address: "",
      phone: "",
      birthDate: ""
    };

    console.log("Upserting user into hippocampus_users...");
    const { error: userError } = await supabase
      .from("hippocampus_users")
      .upsert({
        id: userId,
        email: userEmail,
        password_hash: hashedPassword,
        name: profile.name,
        address: profile.address,
        phone: profile.phone,
        birth_date: profile.birthDate
      }, { onConflict: "email" });

    if (userError) {
      throw userError;
    }
    console.log("User upserted successfully.");

    // 2. Clear old logs for this user to avoid duplicating on re-run
    console.log("Clearing old logs for user...");
    await supabase.from("hippocampus_logs").delete().eq("user_id", userId);

    // 3. Upsert the logs into hippocampus_logs as individual entries using JSON serialized inside content
    console.log(`Inserting ${formattedLogs.length} logs into hippocampus_logs...`);
    
    // Batch inserts of 20 at a time for safety
    for (let i = 0; i < formattedLogs.length; i += 20) {
      const batch = formattedLogs.slice(i, i + 20).map(log => ({
        user_id: userId,
        entry_type: "log",
        content: JSON.stringify(log),
        received_from: "app",
        occurred_at: log.original.datetime || new Date().toISOString()
      }));

      const { error: batchError } = await supabase
        .from("hippocampus_logs")
        .insert(batch);

      if (batchError) {
        throw batchError;
      }
    }

    console.log("Logs inserted successfully into Supabase!");

  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  }
}

run();
