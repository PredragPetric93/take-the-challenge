import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

// --- Init ---
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed, use POST" });
    }

    const { query, threshold = 0.7, count = 5 } = req.body;

    if (!query || query.trim().length === 0) {
      return res.status(400).json({ error: "Missing query" });
    }

    // --- Step 1: Create embedding ---
    let embedding;
    try {
      const embeddingResponse = await openai.embeddings.create({
        model: "text-embedding-ada-002",
        input: query,
      });
      embedding = embeddingResponse.data[0].embedding;
    } catch (err) {
      console.error("❌ OpenAI embedding error:", err);
      return res.status(500).json({ error: "Failed to generate embedding" });
    }

    // --- Step 2: Query Supabase RPC ---
    let data;
    try {
      const { data: matches, error } = await supabase.rpc("match_documents", {
        query_embedding: embedding,
        match_threshold: threshold,
        match_count: count,
      });

      if (error) throw error;
      data = matches || [];
    } catch (err) {
      console.error("❌ Supabase RPC error:", err);
      return res.status(500).json({ error: "Database search failed" });
    }

    // --- Step 3: Return clean results ---
    const results = data.map((row) => ({
      id: row.id,
      title: row.title,
      content: row.content,
      reporter: row.reporter,
      severity: row.severity,
      steps: row.steps,
      attachments: row.attachments,
      date_reported: row.date_reported,
      jira_url: row.jira_url || null, // ensure null if missing
      similarity: row.similarity,
    }));

    return res.status(200).json({
      query,
      count: results.length,
      results,
    });
  } catch (err) {
    console.error("❌ Search handler fatal error:", err);
    return res.status(500).json({ error: "Unexpected server error" });
  }
}
