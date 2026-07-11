import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
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
${doc.content.slice(0, 5000)}
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

      const interaction = await ai.interactions.create({
        model: "gemini-3.5-flash",
        input: message,
        system_instruction: systemInstruction,
        generation_config: {
          temperature: 0.2,
        }
      });

      res.json({
        text: interaction.output_text || "No response generated."
      });

    } catch (error: any) {
      console.error("Gemini API Error:", error);
      res.status(500).json({ error: error.message || "An error occurred during chat generation." });
    }
  });

  // API endpoint for Knowledge Graph implicit connections and gaps
  app.post("/api/gemini/knowledge-graph", async (req: any, res: any) => {
    try {
      const { documents } = req.body;

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

      // Format documents compactly to save tokens and optimize analysis
      const docsContext = documents.map((doc: any, index: number) => {
        return `--- DOCUMENT ${index + 1} ---
ID: ${doc.id}
Title: ${doc.title}
Category/Shelf: ${doc.category}
Tags: ${(doc.tags || []).join(", ")}
Content:
${doc.content.slice(0, 3000)} // limit content to prevent token overflow
------------------------`;
      }).join("\n\n");

      const systemInstruction = `You are an expert semantic analyzer. Your goal is to analyze the user's document workspace and find implicit (hidden) connections and knowledge gaps.
1. Implicit Connections: These are connections or semantic overlaps between documents that are NOT of the same category, or explicitly linked. They represent hidden connections (e.g., overlapping math equations, common platforms, or design symmetry). Detail why they connect with high-fidelity reasoning.
2. Knowledge Gaps: These are missing bridging topics or content that would naturally tie disparate existing documents together, or represent "unwritten research" that the user's library hints at. Provide a creative name, detailed description of why it's a gap, a suggested document type (restricted to one of: 'markdown', 'text', 'code', 'spreadsheet', 'pdf', 'html'), and list of related existing document IDs.

Return strictly valid JSON matching the requested schema.`;

      console.log("Documents received:", documents.length);
      
      const interaction = await ai.interactions.create({
        model: "gemini-3.5-flash",
        input: `Analyze the following library for implicit connections and knowledge gaps:\n\n${docsContext}`,
        system_instruction: systemInstruction,
        generation_config: {
          temperature: 0.15,
        },
        response_format: {
          type: Type.OBJECT,
          properties: {
            connections: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  sourceId: { type: Type.STRING },
                  targetId: { type: Type.STRING },
                  strength: { type: Type.NUMBER, description: "Strength of connection between 0.1 and 1.0" },
                  reason: { type: Type.STRING }
                },
                required: ["sourceId", "targetId", "strength", "reason"]
              }
            },
            knowledgeGaps: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  description: { type: Type.STRING },
                  suggestedDocType: { type: Type.STRING, description: "Must be one of: markdown, text, code, spreadsheet, pdf, html" },
                  relatedDocIds: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                  },
                  relevance: { type: Type.STRING, description: "High, Medium, or Low" }
                },
                required: ["title", "description", "suggestedDocType", "relatedDocIds", "relevance"]
              }
            }
          },
          required: ["connections", "knowledgeGaps"]
        }
      });
      console.log("Interaction created successfully");

      const data = JSON.parse(interaction.output_text || "{}");
      res.json(data);

    } catch (error: any) {
      console.error("Knowledge Graph API Error:", error);
      res.status(500).json({ error: error.message || "An error occurred during knowledge graph analysis." });
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
