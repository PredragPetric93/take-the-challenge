import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

export default async function handler(req, res) {
  try {
    const { title, content } = req.body;

    if (!title || !content) {
      return res.status(400).json({ error: "Missing title or content" });
    }

    // Generisanje embeddinga
    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-ada-002",
      input: `${title} ${content}`
    });

    const embedding = embeddingResponse.data[0].embedding;

    // Insert u Supabase
    const { error } = await supabase
      .from("knowledge_base")
      .insert([{ title, content, embedding }]);

    if (error) throw error;

    res.status(200).json({ message: "Inserted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
