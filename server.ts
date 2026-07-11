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

  // API endpoint to transcribe audio and format as beautifully structured markdown
  app.post("/api/gemini/dictate-audio", async (req: any, res: any) => {
    try {
      const { audio, mimeType, style } = req.body;
      
      const activeApiKey = process.env.GEMINI_API_KEY;
      if (!activeApiKey) {
        return res.status(500).json({ 
          error: "Gemini API Key is not configured." 
        });
      }

      if (!ai) {
        ai = new GoogleGenAI({
          apiKey: activeApiKey,
          httpOptions: {
            headers: { 'User-Agent': 'aistudio-build' }
          }
        });
      }

      if (!audio || !mimeType) {
        return res.status(400).json({ error: "Missing audio data or mimeType" });
      }

      const formatInstruction = style === "Scientific Report" 
        ? "Format it as a highly rigorous Scientific Technical Report. Include structured sections, hypotheses, theoretical formulations, and parameters."
        : style === "Meeting Notes" 
        ? "Format it as concise Meeting Notes. Include an Agenda, Key Decisions, Action Items with checklists, and next steps."
        : style === "Product Release Plan" 
        ? "Format it as a Symmetrical Platform Parity Product Release Plan. Chart web/mobile parity metrics and release goals."
        : style === "Lively Blog Post"
        ? "Format it as an engaging, creative and lively blog post, utilizing Markdown bullet points, bold emphasis, and a friendly introduction."
        : "Format it as a clean, professional, general-purpose document with clear headings, lists, and standard punctuation.";

      const prompt = `Transcribe the attached audio exactly, then format it as a beautifully structured document. 
      ${formatInstruction} 
      Ensure the resulting text is highly polished, grammatically perfect, and fully formatted in standard Markdown.`;

      const audioPart = {
        inlineData: {
          mimeType: mimeType,
          data: audio,
        },
      };

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: [audioPart, { text: prompt }],
      });

      res.json({
        text: response.text || "No transcription text generated."
      });

    } catch (error: any) {
      console.error("Dictate Audio Error:", error);
      res.status(500).json({ error: error.message || "An error occurred during audio dictation analysis." });
    }
  });

  // API endpoint to format raw text transcripts
  app.post("/api/gemini/format-transcript", async (req: any, res: any) => {
    try {
      const { text, style } = req.body;

      const activeApiKey = process.env.GEMINI_API_KEY;
      if (!activeApiKey) {
        return res.status(500).json({ error: "Gemini API Key is not configured." });
      }

      if (!ai) {
        ai = new GoogleGenAI({
          apiKey: activeApiKey,
          httpOptions: {
            headers: { 'User-Agent': 'aistudio-build' }
          }
        });
      }

      if (!text) {
        return res.status(400).json({ error: "No text transcript provided." });
      }

      const formatInstruction = style === "Scientific Report" 
        ? "Format it as a highly rigorous Scientific Technical Report. Include structured sections, hypotheses, theoretical formulations, and parameters."
        : style === "Meeting Notes" 
        ? "Format it as concise Meeting Notes. Include an Agenda, Key Decisions, Action Items with checklists, and next steps."
        : style === "Product Release Plan" 
        ? "Format it as a Symmetrical Platform Parity Product Release Plan. Chart web/mobile parity metrics and release goals."
        : style === "Lively Blog Post"
        ? "Format it as an engaging, creative and lively blog post, utilizing Markdown bullet points, bold emphasis, and a friendly introduction."
        : "Format it as a clean, professional, general-purpose document with clear headings, lists, and standard punctuation.";

      const prompt = `You are a professional editor. The user has dictated this raw, unstructured, run-on speech transcript:
      "${text}"

      Please transform this raw speech transcript into a beautifully structured, highly readable document.
      ${formatInstruction}
      Maintain all technical detail and vocabulary, but fix run-on sentences, stuttering, and punctuation. Present the final result in clean, well-spaced Markdown.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
      });

      res.json({
        text: response.text || "No formatted text generated."
      });

    } catch (error: any) {
      console.error("Format Transcript Error:", error);
      res.status(500).json({ error: error.message || "An error occurred during transcript formatting." });
    }
  });

  // API endpoint to synthesize text to speech (Single Narrator or Audio Podcast)
  app.post("/api/gemini/tts", async (req: any, res: any) => {
    try {
      const { text, type, style } = req.body;

      const activeApiKey = process.env.GEMINI_API_KEY;
      if (!activeApiKey) {
        return res.status(500).json({ error: "Gemini API Key is not configured." });
      }

      if (!ai) {
        ai = new GoogleGenAI({
          apiKey: activeApiKey,
          httpOptions: {
            headers: { 'User-Agent': 'aistudio-build' }
          }
        });
      }

      if (!text) {
        return res.status(400).json({ error: "No text provided for TTS." });
      }

      let audioBase64 = "";
      let script = "";

      if (type === "single") {
        // Single speaker narration script
        // If text is too long, first generate a concise audio summary script
        let voiceText = text;
        if (text.length > 800) {
          const summaryResponse = await ai.models.generateContent({
            model: "gemini-3.5-flash",
            contents: `Please create a 120-180 words speech summary narration of the following document. Make it highly engaging to listen to: \n\n${text}`,
          });
          voiceText = summaryResponse.text || text;
        }

        script = voiceText;

        const response = await ai.models.generateContent({
          model: "gemini-3.1-flash-tts-preview",
          contents: [{ parts: [{ text: `Say clearly and professionally: ${voiceText}` }] }],
          config: {
            responseModalities: ["AUDIO"],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: "Zephyr" },
              },
            },
          },
        });

        audioBase64 = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || "";
      } else {
        // Multi-speaker Podcast Mode
        // 1. Generate dialogue script between Joe and Jane
        const scriptPrompt = `You are an expert podcast scriptwriter. Convert the following document into a highly engaging, friendly, and natural conversation script between two co-hosts: Joe (warm, energetic, tech curious) and Jane (brilliant, analytical, friendly). 
        The script must consist of dialogue lines starting strictly with "Joe:" or "Jane:".
        Keep it concise (approx. 150-250 words total) so the audio is informative and fast-paced. Joe should discuss the technical structure, while Jane clarifies the core insights.
        Do not include any parenthetical directions, sound effects, or brackets like (laughs) or [music]. 
        Document Content:
        "${text}"`;

        const scriptResponse = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: scriptPrompt,
        });

        script = scriptResponse.text || "";

        // 2. Synthesize multi-speaker audio using gemini-3.1-flash-tts-preview
        const response = await ai.models.generateContent({
          model: "gemini-3.1-flash-tts-preview",
          contents: [{ parts: [{ text: `TTS the following conversation between Joe and Jane:\n\n${script}` }] }],
          config: {
            responseModalities: ["AUDIO"],
            speechConfig: {
              multiSpeakerVoiceConfig: {
                speakerVoiceConfigs: [
                  {
                    speaker: "Joe",
                    voiceConfig: {
                      prebuiltVoiceConfig: { voiceName: "Kore" }
                    }
                  },
                  {
                    speaker: "Jane",
                    voiceConfig: {
                      prebuiltVoiceConfig: { voiceName: "Puck" }
                    }
                  }
                ]
              }
            }
          }
        });

        audioBase64 = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || "";
      }

      res.json({
        audio: audioBase64,
        script: script
      });

    } catch (error: any) {
      console.error("TTS API Error:", error);
      res.status(500).json({ error: error.message || "An error occurred during Text-to-Speech synthesis." });
    }
  });

  // API endpoint for real-time grammar checks and rewrites
  app.post("/api/gemini/grammar-rewriting", async (req: any, res: any) => {
    try {
      const { text } = req.body;

      const activeApiKey = process.env.GEMINI_API_KEY;
      if (!activeApiKey) {
        return res.status(500).json({ error: "Gemini API Key is not configured." });
      }

      if (!ai) {
        ai = new GoogleGenAI({
          apiKey: activeApiKey,
          httpOptions: {
            headers: { 'User-Agent': 'aistudio-build' }
          }
        });
      }

      if (!text) {
        return res.status(400).json({ error: "No text provided." });
      }

      const prompt = `Analyze the following document text for grammar, spelling, and style improvements. Also provide dynamic tone rewrites.
      
      Document Content:
      "${text}"`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              corrections: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    original: { type: Type.STRING, description: "The exact wrong/unpolished substring to be replaced." },
                    replacement: { type: Type.STRING, description: "The corrected or polished replacement substring." },
                    explanation: { type: Type.STRING, description: "Brief friendly explanation of what was corrected." },
                    context: { type: Type.STRING, description: "A snippet showing the issue in context." }
                  },
                  required: ["original", "replacement", "explanation"]
                }
              },
              rewrites: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    style: { type: Type.STRING, description: "The target tone, e.g. Professional, Casual, Punchy, Technical, Explain to a Kid" },
                    text: { type: Type.STRING, description: "The rewritten full text or key paragraph in this style." },
                    explanation: { type: Type.STRING, description: "Brief note of what this style enhances." }
                  },
                  required: ["style", "text", "explanation"]
                }
              }
            },
            required: ["corrections", "rewrites"]
          }
        }
      });

      const data = JSON.parse(response.text || "{}");
      res.json(data);

    } catch (error: any) {
      console.error("Grammar API Error:", error);
      res.status(500).json({ error: error.message || "An error occurred during grammar/rewriting analysis." });
    }
  });

  // API endpoint for automated diagram generation
  app.post("/api/gemini/generate-diagram", async (req: any, res: any) => {
    try {
      const { description, diagramType } = req.body;

      const activeApiKey = process.env.GEMINI_API_KEY;
      if (!activeApiKey) {
        return res.status(500).json({ error: "Gemini API Key is not configured." });
      }

      if (!ai) {
        ai = new GoogleGenAI({
          apiKey: activeApiKey,
          httpOptions: {
            headers: { 'User-Agent': 'aistudio-build' }
          }
        });
      }

      if (!description || !diagramType) {
        return res.status(400).json({ error: "Missing description or diagramType" });
      }

      const prompt = `You are an expert system architect and diagram designer. 
      Generate a high-quality technical diagram based on this description: "${description}"
      The requested diagram format is: "${diagramType}".

      Please generate:
      1. A brief high-level architectural explanation of the diagram.
      2. The raw code for the diagram:
         - For 'flowchart' or 'mermaid', provide a valid, well-commented Mermaid.js diagram starting with 'graph TD' or 'sequenceDiagram'.
         - For 'sql', provide standard, clean SQL DDL table creation statements (e.g. 'CREATE TABLE ...' with primary/foreign keys).
      3. A structured representation of the diagram for dynamic visual rendering:
         - If the diagramType is 'flowchart' or 'mermaid':
           - Provide 'nodes': array of { id: string, label: string, type: 'start'|'process'|'decision'|'end'|'actor' }
           - Provide 'links': array of { source: string, target: string, label?: string }
         - If the diagramType is 'sql':
           - Provide 'tables': array of { name: string, columns: array of { name: string, type: string, isPrimaryKey: boolean, isForeignKey: boolean, referencesTable?: string } }

      Output MUST be strictly valid JSON matching the requested schema.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              explanation: { type: Type.STRING, description: "A brief architectural explanation of the generated diagram." },
              rawCode: { type: Type.STRING, description: "The raw Mermaid diagram text or SQL creation script." },
              visualData: {
                type: Type.OBJECT,
                properties: {
                  nodes: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        id: { type: Type.STRING },
                        label: { type: Type.STRING },
                        type: { type: Type.STRING, description: "start, process, decision, end, actor" }
                      },
                      required: ["id", "label", "type"]
                    }
                  },
                  links: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        source: { type: Type.STRING },
                        target: { type: Type.STRING },
                        label: { type: Type.STRING }
                      },
                      required: ["source", "target"]
                    }
                  },
                  tables: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        name: { type: Type.STRING },
                        columns: {
                          type: Type.ARRAY,
                          items: {
                            type: Type.OBJECT,
                            properties: {
                              name: { type: Type.STRING },
                              type: { type: Type.STRING },
                              isPrimaryKey: { type: Type.BOOLEAN },
                              isForeignKey: { type: Type.BOOLEAN },
                              referencesTable: { type: Type.STRING }
                            },
                            required: ["name", "type", "isPrimaryKey", "isForeignKey"]
                          }
                        }
                      },
                      required: ["name", "columns"]
                    }
                  }
                }
              }
            },
            required: ["explanation", "rawCode", "visualData"]
          }
        }
      });

      const data = JSON.parse(response.text || "{}");
      res.json(data);

    } catch (error: any) {
      console.error("Diagram API Error:", error);
      res.status(500).json({ error: error.message || "An error occurred during diagram generation." });
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
