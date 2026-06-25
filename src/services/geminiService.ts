import { supabase } from '../lib/supabase';

export async function logTokenUsage(functionName: string, usage: any) {
  if (!usage) return;
  const promptTokens = usage.promptTokenCount || usage.prompt_token_count || 0;
  const candidatesTokens = usage.candidatesTokenCount || usage.candidates_token_count || 0;
  if (promptTokens === 0 && candidatesTokens === 0) return;

  try {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) return; // Only log for logged in users
    
    await supabase.from("token_logs").insert({
      user_id: user.id,
      function_name: functionName,
      input_tokens: promptTokens,
      output_tokens: candidatesTokens
    });
  } catch (error) {
    console.warn("Error logging token usage:", error);
  }
}

export async function analyzeWins(wins: any[]) {
  try {
    // Only send the top 5 wins with just the 'text' field to minimize payload size and avoid PayloadTooLarge errors
    const prunedWins = (wins || []).slice(0, 5).map(w => ({ text: w.text || "" }));
    const res = await fetch("/api/analyze-wins", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wins: prunedWins })
    });
    
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Server status ${res.status}: ${errText.slice(0, 150)}`);
    }
    
    const data = await res.json();
    if (data.usage) {
      logTokenUsage("Analyze Wins", data.usage);
    }
    return data.text || "Terus melangkah! Setiap kemenangan kecil adalah bahan bakar untuk terobosan besar kamu.";
  } catch (error: any) {
    console.warn("Error analyzing wins:", error);
    return `Terjadi kesalahan analisis: ${error?.message || String(error)}`;
  }
}

export async function chatWithAI(
  message: string, 
  history: { role: string; parts: { text: string }[] }[], 
  wins: any[], 
  userName: string = "User"
): Promise<{ text: string; usage?: { promptTokenCount: number; candidatesTokenCount: number; totalTokenCount: number }; isQuotaExceeded?: boolean }> {
  try {
    // Prune the wins collection to only include properties needed for search, scoring and timeline formatting.
    // Excludes heavy properties like base64 imageUrls, doText, haveText, etc. to prevent PayloadTooLarge errors.
    const prunedWins = (wins || []).map(w => ({
      id: w.id,
      text: w.text || "",
      createdAt: w.createdAt,
      tags: w.tags || [],
      isHabitMode: !!w.isHabitMode,
      isBeDoHave: !!w.isBeDoHave,
      reflections: w.reflections || "",
      pinned: !!w.pinned,
      starred: !!w.starred,
      embedding: w.embedding || null
    }));

    const res = await fetch("/api/chat-with-ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, history, wins: prunedWins, userName })
    });
    
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Server status ${res.status}: ${errText.slice(0, 150)}`);
    }
    
    const data = await res.json();
    if (data.usage) {
      logTokenUsage("Chat Coach", data.usage);
    }
    return {
      text: data.text || "Maaf, saya tidak bisa memproses permintaan saat ini.",
      usage: data.usage,
      isQuotaExceeded: data.isQuotaExceeded || false
    };
  } catch (error: any) {
    console.warn("Error in AI chat:", error);
    return {
      text: `Maaf, ada kendala teknis: ${error?.message || String(error)}`,
      isQuotaExceeded: false
    };
  }
}

export async function getEmbedding(text: string) {
  try {
    const res = await fetch("/api/get-embedding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text })
    });
    
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Server status ${res.status}: ${errText.slice(0, 150)}`);
    }
    
    const data = await res.json();
    if (data.usage) {
      logTokenUsage("Semantic Vector", data.usage);
    }
    return data.embedding || null;
  } catch (error: any) {
    console.warn("Error getting embedding:", error);
    return null;
  }
}
