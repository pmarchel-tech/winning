import express from "express";
import path from "path";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

const isOpenAI = () => {
  const key = (process.env.OPEN_API || "").trim();
  return key.startsWith("sk-");
};

async function callOpenAI(endpoint: string, payload: any) {
  const key = (process.env.OPEN_API || "").trim();
  const isOR = key.startsWith("sk-or-");
  
  const baseUrl = isOR ? "https://openrouter.ai/api/v1" : "https://api.openai.com/v1";
  
  // Map models for OpenRouter if necessary
  if (isOR && payload.model) {
    if (payload.model === "gpt-4o-mini") {
      payload.model = "openai/gpt-4o-mini";
    } else if (payload.model === "text-embedding-3-small") {
      payload.model = "openai/text-embedding-3-small";
    }
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${key}`
  };

  if (isOR) {
    headers["HTTP-Referer"] = "https://ai.studio/build";
    headers["X-Title"] = "AI Studio Build";
  }

  const response = await fetch(`${baseUrl}/${endpoint}`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload)
  });
  
  if (!response.ok) {
    let errBody = "";
    let parsedMessage = "";
    try {
      errBody = await response.text();
      const parsed = JSON.parse(errBody);
      if (parsed?.error?.message) {
        parsedMessage = parsed.error.message;
      } else if (parsed?.error && typeof parsed.error === "string") {
        parsedMessage = parsed.error;
      }
    } catch (e) {}
    
    if (parsedMessage) {
      throw new Error(`${isOR ? "OpenRouter" : "OpenAI"} API error (${response.status}): ${parsedMessage}`);
    }
    throw new Error(`${isOR ? "OpenRouter" : "OpenAI"} API error (${response.status}): ${errBody || response.statusText}`);
  }
  return response.json();
}

// Dynamically resolve GoogleGenAI with the server-side API key on each request.
function getAiClient() {
  const key = (process.env.OPEN_API || "").trim();
  if (!key) {
    console.log("⛔ [AI NOTIFY]: 'OPEN_API' key is completely EMPTY in process.env!");
  } else if (key.startsWith("sk-or-")) {
    console.log("✅ [AI INFO]: Using OpenRouter Engine via 'sk-or-' key.");
  } else if (key.startsWith("sk-")) {
    console.log("✅ [AI INFO]: Using OpenAI Engine via 'sk-' key.");
  } else if (!key.startsWith("AIzaSy")) {
    console.log("⚠️ [AI WARNING]: 'OPEN_API' key does not start with standard Gemini prefix 'AIzaSy'.");
  } else {
    console.log("✅ [AI INFO]: Using Gemini Engine via 'AIzaSy' key.");
  }
  return new GoogleGenAI({ apiKey: key });
}

// Helper to dynamically check if an error is quota-related
function checkIsQuotaError(error: any): boolean {
  if (!error) return false;
  
  const pieces = [
    String(error),
    error.message ? String(error.message) : '',
    error.status ? String(error.status) : '',
    error.code ? String(error.code) : '',
    error.error ? JSON.stringify(error.error) : ''
  ];
  const errorStr = pieces.join(' | ').toLowerCase();
  
  return (
    errorStr.includes("429") || 
    errorStr.includes("resource_exhausted") || 
    errorStr.includes("spending cap") || 
    errorStr.includes("quota") || 
    errorStr.includes("prepayment") || 
    errorStr.includes("depleted") ||
    (error.status && (error.status === "RESOURCE_EXHAUSTED" || error.status === 429)) ||
    (error.code && error.code === 429)
  );
}

// 1. Analyze Wins Endpoint
app.post("/api/analyze-wins", async (req, res) => {
  const { wins } = req.body;
  if (!wins || !Array.isArray(wins) || wins.length === 0) {
    return res.json({ text: "Terus melangkah! Setiap kemenangan kecil adalah bahan bakar untuk terobosan besar kamu." });
  }

  const prompt = `
    Analis data kemenangan (wins) berikut untuk memberikan insight singkat, motivasional, dan praktis dalam Bahasa Indonesia.
    
    ATURAN KETAT (PENGHEMATAN TOKEN):
    1. Sampaikan ide secara spartan, pendek (1-2 kalimat), langsung pada saran tindakan. No intro/outro/basa-basi.
    2. Panggil dengan "kamu", dilarang gunakan "Anda".
    3. TANPA FORMATTING: Dilarang keras menggunakan markdown, tanda bintang (*), hashtag (#), titik koma (;), atau tanda hubung em dash (—). Berikan teks polos (plain text).
    4. HINDARI KATA BUNGA/KLISE: tidak boleh menggunakan kata "bisa", "dapat", "boleh", "sangat", "hanya", "saja", "bahwa", "benar-benar", "menyelami", "memulai", "wadah", "lanskap", "merancang", "menciptakan", atau kata klise lainnya.
    
    Data:
    ${wins.slice(0, 5).map((w: any) => `- ${w.text}`).join('\n')}
  `;

  try {
    if (isOpenAI()) {
      const response = await callOpenAI("chat/completions", {
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 300
      });
      const usage = {
        promptTokenCount: response.usage?.prompt_tokens || 0,
        candidatesTokenCount: response.usage?.completion_tokens || 0,
        totalTokenCount: response.usage?.total_tokens || 0
      };
      const text = response.choices?.[0]?.message?.content || "";
      return res.json({
        text: text.trim() || "Terus melangkah! Setiap kemenangan kecil adalah bahan bakar untuk terobosan besar kamu.",
        usage
      });
    } else {
      const ai = getAiClient();
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt
      });
      const usageMetadata = (response as any).usageMetadata || (response as any).metadata?.usageMetadata || {};
      const usage = {
        promptTokenCount: usageMetadata.promptTokenCount || usageMetadata.prompt_token_count || 0,
        candidatesTokenCount: usageMetadata.candidatesTokenCount || usageMetadata.candidates_token_count || 0,
        totalTokenCount: usageMetadata.totalTokenCount || usageMetadata.total_token_count || 0
      };
      return res.json({ 
        text: response.text?.trim() || "Terus melangkah! Setiap kemenangan kecil adalah bahan bakar untuk terobosan besar kamu.",
        usage
      });
    }
  } catch (error: any) {
    const isQuota = checkIsQuotaError(error);
    if (isQuota) {
      console.log("Analyze handled: API Quota Limit Exceeded.");
      return res.json({ 
        text: "Terjadi limit kuota API. Silakan periksa kunci API atau limit akun AI Anda. Tetap semangat!",
        isQuotaExceeded: true
      });
    }
    console.log("Analyze error handled:", error?.message || error);
    const devErrorMsg = error?.message || String(error);
    return res.json({ 
      text: `Terjadi kendala teknis saat menganalisis kemenangan: "${devErrorMsg}". Mohon periksa API Key 'OPEN_API' Anda di Secrets panel.`,
      isQuotaExceeded: false 
    });
  }
});

// 2. Chat with AI Endpoint
app.post("/api/chat-with-ai", async (req, res) => {
  try {
    const { message, history, wins, userName, aiMemory } = req.body;

    const queryEmbedding = await (async () => {
      try {
        if (!message) return null;
        if (isOpenAI()) {
          const response = await callOpenAI("embeddings", {
            model: "text-embedding-3-small",
            input: message
          });
          return response.data?.[0]?.embedding || null;
        } else {
          const ai = getAiClient();
          const result = await ai.models.embedContent({
            model: 'gemini-embedding-2-preview',
            contents: [message]
          });
          return result.embeddings?.[0]?.values || null;
        }
      } catch (e: any) {
        console.log("Error getting message embedding in research engine:", e?.message || e);
        return null;
      }
    })();

    const getWords = (text: string) => {
      const stopWords = new Set(["yang", "dan", "di", "ke", "dari", "untuk", "dengan", "saya", "aku", "kamu", "bisa", "adalah", "ini", "itu", "pada", "juga", "atau", "the", "a", "an", "and", "or", "in", "on", "at", "to", "for", "with", "is", "of"]);
      return (text || "")
        .toLowerCase()
        .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g, " ")
        .split(/\s+/)
        .filter(w => w.length >= 3 && !stopWords.has(w));
    };
    const queryWords = getWords(message);

    let totalCount = 0;
    let habitCount = 0;
    let beDoHaveCount = 0;
    const tagCounts: Record<string, number> = {};
    const scoredWins: any[] = [];

    if (wins && Array.isArray(wins)) {
      totalCount = wins.length;
      
      let maxTime = 0;
      let minTime = Date.now();
      wins.forEach(w => {
        if (w && w.createdAt) {
          const t = typeof w.createdAt === 'number' ? w.createdAt : new Date(w.createdAt).getTime();
          if (!isNaN(t)) {
            if (t > maxTime) maxTime = t;
            if (t < minTime) minTime = t;
          }
        }
      });

      const cosineSimilarity = (vecA: number[], vecB: number[]) => {
        if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
        let dotProduct = 0;
        let normA = 0;
        let normB = 0;
        for (let i = 0; i < vecA.length; i++) {
          dotProduct += vecA[i] * vecB[i];
          normA += vecA[i] * vecA[i];
          normB += vecB[i] * vecB[i];
        }
        if (normA === 0 || normB === 0) return 0;
        return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
      };

      for (const w of wins) {
        if (!w) continue;

        if (w.isHabitMode) habitCount++;
        if (w.isBeDoHave) beDoHaveCount++;
        if (Array.isArray(w.tags)) {
          w.tags.forEach((tag: string) => {
            const cleanTag = String(tag).trim();
            if (cleanTag) {
              tagCounts[cleanTag] = (tagCounts[cleanTag] || 0) + 1;
            }
          });
        }

        let score = 0;

        if (queryEmbedding && Array.isArray(w.embedding) && w.embedding.length > 0) {
          const similarity = cosineSimilarity(queryEmbedding, w.embedding);
          if (similarity > 0.35) {
            score += similarity * 100;
          }
        }

        const textLower = (w.text || "").toLowerCase();
        const reflectionsLower = (w.reflections || "").toLowerCase();
        const tagsLower = (Array.isArray(w.tags) ? w.tags : []).map((t: string) => String(t).toLowerCase());

        let keywordMatchCount = 0;
        for (const word of queryWords) {
          if (textLower.includes(word)) {
            score += 10;
            keywordMatchCount++;
          }
          if (reflectionsLower.includes(word)) {
            score += 5;
            keywordMatchCount++;
          }
          if (tagsLower.includes(word)) {
            score += 20;
            keywordMatchCount++;
          }
        }

        if (w.pinned) score += 15;
        if (w.starred) score += 8;

        if (w.createdAt) {
          const t = typeof w.createdAt === 'number' ? w.createdAt : new Date(w.createdAt).getTime();
          if (!isNaN(t)) {
            const timeFactor = maxTime > minTime ? (t - minTime) / (maxTime - minTime) : 1;
            score += timeFactor * 10;
          }
        }

        scoredWins.push({ win: w, score });
      }
    }

    scoredWins.sort((a, b) => b.score - a.score);
    const selectedWins = scoredWins.slice(0, 20).map(item => item.win);
    
    selectedWins.sort((a,b) => {
      const tA = typeof a.createdAt === 'number' ? a.createdAt : new Date(a.createdAt || 0).getTime();
      const tB = typeof b.createdAt === 'number' ? b.createdAt : new Date(b.createdAt || 0).getTime();
      const valA = isNaN(tA) ? 0 : tA;
      const valB = isNaN(tB) ? 0 : tB;
      return valB - valA;
    });

    const relevantWinsText = selectedWins.length > 0 
      ? selectedWins.map((w: any) => {
          let formattedDate = '??-??-??';
          if (w.createdAt) {
            try {
              const d = new Date(w.createdAt);
              if (!isNaN(d.getTime())) {
                formattedDate = d.toISOString().slice(0, 10);
              }
            } catch (e) {}
          }
          const tags = Array.isArray(w.tags) && w.tags.length > 0 ? ` [Kategori: ${w.tags.join(',')}]` : '';
          const mode = w.isHabitMode ? ' [Mode: Kebiasaan/Habit]' : w.isBeDoHave ? ' [Mode: Impian/BeDoHave]' : '';
          const reflection = w.reflections ? ` (Refleksi: ${w.reflections})` : '';
          return `- [${formattedDate}] ${w.text}${mode}${tags}${reflection}`;
        }).join('\n')
      : "(Tidak ada rekaman kemenangan relevan ditemukan)";

    const tagSummary = Object.entries(tagCounts)
      .sort((a,b) => b[1] - a[1])
      .map(([name, count]) => `${name} (${count})`)
      .join(', ');

    const systemInstruction = `Kamu adalah growth coach Bahasa Indonesia untuk ${userName || "User"}. Bantu dia tumbuh melampaui batas potensinya.

ATURAN KETAT (HEMAT TOKEN):
- Gunakan Bahasa Indonesia sederhana, santun, lugas, tegas, dan berwibawa. No intro/outro/basa-basi.
- Selesaikan setiap respons dengan saran tindakan praktis/langkah konkrit hari ini.
- Sapa dengan "kamu"/"kamumu", jangan gunakan "Anda".
- TANPA FORMATTING: Jangan gunakan markdown, cetak tebal/miring, tanda bintang (*), hashtag (#), titik koma (;), atau em-dash (—). Berikan teks polos (plain text) dengan baris baru biasa.
- HINDARI KATA KLISE/BUNGA: Dilarang memakai kata "bisa", "dapat", "boleh", "sangat", "hanya", "saja", "bahwa", "benar-benar", "wadah", "lanskap", atau "menyelami". Jawab langsung ke sasaran.

MEMORI JANGKA PANJANG & PROFIL KEPRIBADIAN USER (AI MEMORY):
${aiMemory || "(Belum ada memori personalisasi tercatat. Pelajari kepribadian, gaya kerja, hambatan, dan tujuan mereka dari percakapan ini.)"}

TUGAS TAMBAHAN WAJIB (MEMORI SANGAT PENTING):
Di baris paling akhir setelah jawaban utama kamu selesai, buat baris baru kosong dan tambahkan pembatas tepat seperti ini:
===AI_MEMORY_UPDATE===
[Perbarui dan tuliskan rangkuman kepribadian, gaya kerja, tujuan, preferensi, hambatan, atau poin kunci tentang user yang kamu pelajari dari percakapan ini. Gabungkan informasi baru ini secara ringkas dengan informasi memori lama di atas jika ada. Tulis dalam 1-2 kalimat pendek saja agar hemat token!]

RISET UTUH DATABASE KEMENANGAN USER:
- Total Kemenangan Tercatat: ${totalCount} entri
- Distribusi Kategori (Tags): ${tagSummary || "Belum ada tag"}
- Status Mode Kebiasaan (Habits): ${habitCount} entri
- Status Mode Impian (Be-Do-Have): ${beDoHaveCount} entri

REKAMAN KEMENANGAN TERKAIT & RELEVAN HASIL PENELITIAN DAN RISET SEMANTIK DATABASE:
${relevantWinsText}

PETUNJUK RESPONS KEPADA COACH:
Desain jawaban kamu berdasarkan hasil penelitian di atas. Rujuk riwayat kemenangan spesifik mereka (sebut tgl, topik, isi kemenangan, refleksi mereka) untuk memvalidasi kemajuan mereka dan merumuskan saran konkrit baru. Tunjukan bahwa kamu benar-benar meneliti sejarah sukses mereka dalam menjawab!`;

    const prunedHistory = (history || []).slice(-6);
    const formattedHistory = prunedHistory.map((h: any) => ({
      role: h.role === 'user' ? 'user' : 'model',
      parts: Array.isArray(h.parts) ? h.parts : [{ text: h.parts?.[0]?.text || String(h.parts) }]
    }));

    let responseText = "";
    let usage = { promptTokenCount: 0, candidatesTokenCount: 0, totalTokenCount: 0 };

    if (isOpenAI()) {
      const openAIMessages = [
        { role: "system", content: systemInstruction },
        ...formattedHistory.map((h: any) => ({
          role: h.role === 'model' ? 'assistant' : 'user',
          content: h.parts?.[0]?.text || String(h.parts)
        })),
        { role: "user", content: message }
      ];

      const response = await callOpenAI("chat/completions", {
        model: "gpt-4o-mini",
        messages: openAIMessages
      });

      responseText = response.choices?.[0]?.message?.content || "";
      usage = {
        promptTokenCount: response.usage?.prompt_tokens || 0,
        candidatesTokenCount: response.usage?.completion_tokens || 0,
        totalTokenCount: response.usage?.total_tokens || 0
      };
    } else {
      const ai = getAiClient();
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: [...formattedHistory, { role: 'user', parts: [{ text: message }] }],
        config: {
          systemInstruction: systemInstruction
        }
      });
      
      responseText = response.text || "Maaf, saya tidak bisa memproses permintaan saat ini.";
      const usageMetadata = (response as any).usageMetadata || (response as any).metadata?.usageMetadata || {};
      usage = {
        promptTokenCount: usageMetadata.promptTokenCount || usageMetadata.prompt_token_count || 0,
        candidatesTokenCount: usageMetadata.candidatesTokenCount || usageMetadata.candidates_token_count || 0,
        totalTokenCount: usageMetadata.totalTokenCount || usageMetadata.total_token_count || 0
      };
    }

    let finalChatResponse = responseText;
    let updatedMemory = aiMemory || "";

    const separator = "===AI_MEMORY_UPDATE===";
    const idx = responseText.indexOf(separator);
    if (idx !== -1) {
      finalChatResponse = responseText.substring(0, idx).trim();
      updatedMemory = responseText.substring(idx + separator.length).trim();
    } else {
      const lowerText = responseText.toLowerCase();
      const fallbackSep = "===ai_memory_update===";
      const fidx = lowerText.indexOf(fallbackSep);
      if (fidx !== -1) {
        finalChatResponse = responseText.substring(0, fidx).trim();
        updatedMemory = responseText.substring(fidx + fallbackSep.length).trim();
      }
    }

    const responseWithUsage = finalChatResponse + `\n\n[Token Terpakai - Input: ${usage.promptTokenCount}, Output: ${usage.candidatesTokenCount}]`;

    return res.json({ 
      text: responseWithUsage, 
      aiMemory: updatedMemory,
      usage 
    });
  } catch (error: any) {
    const isQuota = checkIsQuotaError(error);
    if (isQuota) {
      console.log("Chat handled: API Quota Limit Exceeded.");
      return res.json({ 
        text: "Maaf, saat ini batas penggunaan AI untuk proyek ini telah mencapai batas bulanan/quota (Spend Cap Exceeded). Silakan periksa pengaturan billing akun AI Anda atau perbarui API Key 'OPEN_API' di Secrets panel!",
        isQuotaExceeded: true 
      });
    }
    console.log("Chat error handled:", error?.message || error);
    const devErrorMsg = error?.message || String(error);
    return res.json({ 
      text: `Maaf, ada kendala teknis dengan AI Key Anda: "${devErrorMsg}". Pastikan API Key 'OPEN_API' di Secrets panel diisi dengan kunci API yang valid.`,
      isQuotaExceeded: false 
    });
  }
});

// 3. Get Embedding Endpoint
app.post("/api/get-embedding", async (req, res) => {
  const { text } = req.body;
  if (!text) {
    return res.json({ embedding: null });
  }

  try {
    if (isOpenAI()) {
      const response = await callOpenAI("embeddings", {
        model: "text-embedding-3-small",
        input: text
      });
      const embedding = response.data?.[0]?.embedding || null;
      const usage = {
        promptTokenCount: response.usage?.prompt_tokens || 0,
        candidatesTokenCount: 0,
        totalTokenCount: response.usage?.total_tokens || 0
      };
      return res.json({
        embedding,
        usage
      });
    } else {
      const ai = getAiClient();
      const result = await ai.models.embedContent({
        model: 'gemini-embedding-2-preview',
        contents: [text]
      });
      const estimatedTokens = Math.max(1, Math.ceil(text.length / 4));
      const usage = {
        promptTokenCount: estimatedTokens,
        candidatesTokenCount: 0,
        totalTokenCount: estimatedTokens
      };
      return res.json({ 
        embedding: result.embeddings?.[0]?.values || null,
        usage
      });
    }
  } catch (error: any) {
    const isQuota = checkIsQuotaError(error);
    if (isQuota) {
      console.log("Embedding handled: API Quota Limit Exceeded.");
    } else {
      console.log("Embedding error handled:", error?.message || error);
    }
    return res.json({ 
      embedding: null,
      isQuotaExceeded: isQuota
    });
  }
});

// Vite Middleware & SPA Static fallback routing (Local only)
if (!process.env.VERCEL) {
  const PORT = 3000;
  
  (async () => {
    if (process.env.NODE_ENV !== "production") {
      const { createServer: createViteServer } = await import("vite");
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
    } else {
      const distPath = path.join(process.cwd(), 'dist');
      app.use(express.static(distPath));
      app.get('*', (req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://0.0.0.0:${PORT}`);
    });
  })();
}

export default app;
