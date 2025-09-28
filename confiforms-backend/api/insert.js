import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed, use POST" });
    }

    // 🟢 UVEK parsiraj ručno ako je string
    let body = req.body;
    if (typeof body === "string") {
      try {
        body = JSON.parse(body);
      } catch (err) {
        console.error("Invalid JSON string received:", body);
        return res.status(400).json({ error: "Invalid JSON format" });
      }
    }

    const { title, content, reporter, date, severity, steps, attachments } = body;

    if (!title || !content) {
      return res.status(400).json({ error: "Missing required fields: title or content" });
    }

    // Generisanje embeddinga (title + content)
    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-ada-002",
      input: `${title} ${content}`,
    });

    const embedding = embeddingResponse.data[0].embedding;

    // Insert u Supabase
    const { error } = await supabase.from("knowledge_base").insert([
      {
        title,
        content,
        reporter,
        date,
        severity,
        steps,
        attachments,
        embedding,
      },
    ]);

    if (error) throw error;

    return res.status(200).json({ message: "Inserted successfully" });
  } catch (err) {
    console.error("Insert error:", err);
    return res.status(500).json({ error: err.message });
  }
}
