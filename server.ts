import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "50mb" }));

  // Initialize Gemini API client lazily or inside startup
  const apiKey = process.env.GEMINI_API_KEY;
  let ai: GoogleGenAI | null = null;

  if (apiKey) {
    ai = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }

  // API endpoint for RAG Chat
  app.post("/api/gemini/chat", async (req: any, res: any) => {
    try {
      const { message, history, documents } = req.body;
      
      // Lazily check if Gemini API key exists
      const activeApiKey = process.env.GEMINI_API_KEY;
      if (!activeApiKey) {
        return res.status(500).json({ 
          error: "Gemini API Key is not configured. Please configure it in the Settings menu (Secrets) of Google AI Studio." 
        });
      }

      if (!ai) {
        ai = new GoogleGenAI({
          apiKey: activeApiKey,
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build',
            }
          }
        });
      }

      if (!documents || !Array.isArray(documents)) {
        return res.status(400).json({ error: "No documents provided for context." });
      }

      // Format the documents as clean text context
      const docsContext = documents.map((doc: any, index: number) => {
        return `--- DOCUMENT ${index + 1} ---
ID: ${doc.id}
Title: ${doc.title}
Type: ${doc.type}
Category/Shelf: ${doc.category}
Tags: ${(doc.tags || []).join(", ")}
Content:
${doc.content}
------------------------`;
      }).join("\n\n");

      const systemInstruction = `You are an intelligent document workspace assistant. You help users find information and understand their documents.
The user is chatting with all of their documents locally. 
Here are all the documents currently in the user's workspace:

${docsContext}

Your instructions:
1. Answer the user's question or follow their instruction based strictly on the provided documents.
2. If the user asks about something not present in the documents, try to guide them or answer based on general knowledge, but clearly state that the information was not found in their documents.
3. VERY IMPORTANT: You must cite your sources in your text. Whenever you reference or summarize information from a document, append a citation with its precise document ID in the format [id:document-id] at the end of the sentence or clause. For example: "The Property of Repetitive Bounce focuses on mechanical elastomer analysis [id:doc-initial-physics]".
4. Do not invent document IDs. Only use the IDs provided in the document contexts above.
5. Keep your tone professional, clear, helpful, and concise. Use Markdown formatting (headings, lists, bold, italics, tables, etc.) for a clean visual structure.`;

      const contents = [];
      
      // Add history if present
      if (history && history.length > 0) {
        for (const h of history) {
          contents.push({
            role: h.role === "user" ? "user" : "model",
            parts: [{ text: h.content }]
          });
        }
      }
      
      // Add the latest user message
      contents.push({
        role: "user",
        parts: [{ text: message }]
      });

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: contents,
        config: {
          systemInstruction: systemInstruction,
          temperature: 0.2,
        }
      });

      res.json({
        text: response.text || "No response generated."
      });

    } catch (error: any) {
      console.error("Gemini API Error:", error);
      res.status(500).json({ error: error.message || "An error occurred during chat generation." });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
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
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
