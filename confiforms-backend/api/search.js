import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed, use POST" });
    }

    const { query } = req.body;
    if (!query) {
      return res.status(400).json({ error: "Missing query" });
    }

    // 1. Keyword search (precizno)
    const { data: keywordData, error: keywordError } = await supabase
      .from("knowledge_base")
      .select("*")
      .or(`title.ilike.%${query}%,content.ilike.%${query}%`)
      .limit(5);

    if (keywordError) throw keywordError;

    let results = keywordData || [];

    // 2. Ako nema keyword rezultata, uradi embedding search
    if (results.length === 0) {
      const embeddingResponse = await openai.embeddings.create({
        model: "text-embedding-ada-002",
        input: query,
      });

      const embedding = embeddingResponse.data[0].embedding;

      const { data: semanticData, error: semanticError } = await supabase.rpc(
        "match_documents",
        {
          query_embedding: embedding,
          match_threshold: 0.7,
          match_count: 5,
        }
      );

      if (semanticError) throw semanticError;

      results = semanticData || [];
    } else {
      // Ako ima keyword rezultata, dodaj i semantičke (ali ukloni duplikate)
      const embeddingResponse = await openai.embeddings.create({
        model: "text-embedding-ada-002",
        input: query,
      });

      const embedding = embeddingResponse.data[0].embedding;

      const { data: semanticData, error: semanticError } = await supabase.rpc(
        "match_documents",
        {
          query_embedding: embedding,
          match_threshold: 0.7,
          match_count: 5,
        }
      );

      if (semanticError) throw semanticError;

      const keywordIds = new Set(results.map(r => r.id));
      const merged = [
        ...results,
        ...semanticData.filter(r => !keywordIds.has(r.id)),
      ];
      results = merged;
    }

    return res.status(200).json({
      query,
      results,
    });
  } catch (err) {
    console.error("Search error:", err);
    return res.status(500).json({ error: err.message });
  }
}
