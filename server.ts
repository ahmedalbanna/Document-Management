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

  // API endpoint for Semantic Embeddings (Local index backend)
  app.post("/api/gemini/embeddings", async (req: any, res: any) => {
    try {
      const { items } = req.body; // array of { id: string, text: string }
      
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

      if (!items || !Array.isArray(items)) {
        return res.status(400).json({ error: "Missing or invalid items array." });
      }

      const results: Record<string, number[]> = {};

      for (const item of items) {
        if (!item.id || !item.text) continue;
        
        try {
          const response: any = await ai.models.embedContent({
            model: "gemini-embedding-2-preview",
            contents: item.text,
          });

          const embeddingValues = response.embedding?.values || 
                                  response.embeddings?.[0]?.values || 
                                  response.embedding || 
                                  [];
          results[item.id] = embeddingValues;
        } catch (itemError: any) {
          console.error(`Error embedding item ${item.id}:`, itemError);
          results[item.id] = [];
        }
      }

      res.json({ embeddings: results });
    } catch (error: any) {
      console.error("Embeddings API Error:", error);
      res.status(500).json({ error: error.message || "An error occurred during embeddings generation." });
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

  // API endpoint for Proactive AI Suggestions (Smart alerts: outdated & contradictions)
  app.post("/api/gemini/proactive-alerts", async (req: any, res: any) => {
    try {
      const { documents } = req.body;

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

      if (!documents || !Array.isArray(documents)) {
        return res.status(400).json({ error: "Missing or invalid documents array." });
      }

      // Format documents to feed as context for contradiction & outdated checks
      const docsContext = documents.map((doc: any, index: number) => {
        return `--- DOCUMENT ${index + 1} ---
ID: ${doc.id}
Title: ${doc.title}
Category: ${doc.category}
Tags: ${(doc.tags || []).join(", ")}
Updated: ${doc.updatedAt || doc.createdAt}
Content:
${doc.content.slice(0, 3000)}
------------------------`;
      }).join("\n\n");

      const systemInstruction = `You are a proactive intelligence engine designed to audit document workspaces and generate high-fidelity, actionable smart alerts.
Analyze the provided document workspace to spot:
1. Outdated Documents: Find files that are clearly older (e.g., from 2023/2024 or labeled 'legacy') or whose content is deprecated or superseded by newer documents (e.g., outdated coefficients or old specifications).
2. Logical Contradictions: Spot absolute technical contradictions, conflicting values, or competing strategies between any two documents (e.g. one saying polybutadiene is stable, another saying it is unstable; or conflicting project release metrics/dates).

For each issue detected, provide a descriptive alert.
Format the output strictly as valid JSON according to the schema provided.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: `Audit the following document workspace and output smart alerts for outdated documents and logical contradictions:\n\n${docsContext}`,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              alerts: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING, description: "Unique alert slug or ID, e.g. alert-outdated-xyz" },
                    type: { type: Type.STRING, description: "Must be 'outdated' or 'contradiction'" },
                    title: { type: Type.STRING, description: "Short human-friendly title of the alert" },
                    description: { type: Type.STRING, description: "Detailed description of the issue" },
                    affectedDocIds: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                      description: "List of document IDs related to this alert"
                    },
                    topic: { type: Type.STRING, description: "The overarching topic, e.g. Elastomer CoR, Product Parity, Release Goals" },
                    suggestedAction: { type: Type.STRING, description: "Clear actionable step the user can take to resolve this" }
                  },
                  required: ["id", "type", "title", "description", "affectedDocIds", "topic", "suggestedAction"]
                }
              }
            },
            required: ["alerts"]
          }
        }
      });

      const data = JSON.parse(response.text || "{}");
      res.json(data);

    } catch (error: any) {
      console.error("Proactive Alerts API Error:", error);
      res.status(500).json({ error: error.message || "An error occurred during proactive alerts generation." });
    }
  });

  // API endpoint for Automated Weekly Achievements Summary
  app.post("/api/gemini/weekly-summary", async (req: any, res: any) => {
    try {
      const { documents, activities } = req.body;

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

      const docContext = (documents || []).map((d: any) => `- "${d.title}" (${d.type}, Category: ${d.category}, Size: ${d.size} bytes)`).join("\n");
      const activityContext = (activities || []).slice(0, 50).map((a: any) => `[${a.timestamp}] Action: ${a.action} on Document: "${a.documentTitle}"`).join("\n");

      const prompt = `You are an elite productivity analyst. Generate a beautifully formatted and comprehensive "Weekly Achievements & Output Report" summarizing the user's document management output.
      
      Review the active workspace files:
      ${docContext}
      
      And review the chronological activity feed (latest accomplishments first):
      ${activityContext}
      
      Generate a professional, high-fidelity report with these exact styled sections:
      1. 🏆 Executive Overview: An elegant summary of the weekly productivity and progress.
      2. ⚙️ Active Output Breakdown: Analyze active work trends (revisions committed, file formats introduced, categories expanded).
      3. 📊 Space & Composition Impact: Summarize content footprint shifts and tag density.
      4. 🔮 Recommendations for Next Week: Intelligent, forward-looking suggestions based on the user's activity pace.
      
      Present the response in clean, spacious, printer-friendly Markdown. Use professional headers, bullet lists, bold highlights, and tables if useful. Keep it motivating, precise, and visually impeccable.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
      });

      res.json({
        summary: response.text || "No summary was generated."
      });

    } catch (error: any) {
      console.error("Weekly Summary API Error:", error);
      res.status(500).json({ error: error.message || "An error occurred during weekly summary generation." });
    }
  });

  // API endpoint to convert documents between formats (PDF, Markdown, Docs, HTML) via Gemini
  app.post("/api/gemini/convert-document", async (req: any, res: any) => {
    try {
      const { title, content, currentType, targetType } = req.body;

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

      if (!content || !targetType) {
        return res.status(400).json({ error: "Missing document content or targetType." });
      }

      const prompt = `You are an elite document format converter. Convert the given document from "${currentType || 'unknown'}" format to "${targetType}" format.
      The title of the document is: "${title || 'Untitled Document'}".
      
      Conversion specifications:
      1. If the target format is "markdown", you MUST output standard clean Markdown. Include beautiful headers (#, ##), clean bullet lists, tables if appropriate, bold highlights, and equations formatted as $math$ or $$display math$$.
      2. If the target format is "docs", you MUST output standard clean semantic HTML tags suitable for a paper editor. Use headings (h1, h2, h3), paragraphs (p), bold (strong), italics (em), blockquotes (blockquote), lists (ul, ol, li), and tables. Do NOT include <html>, <head>, or <body> wrapper tags, only the styled fragment HTML markup.
      3. If the target format is "html", you MUST output a complete, gorgeous, responsive HTML web page pre-integrated with Tailwind CSS. It should feature styled container cards, responsive grid structures, beautiful typography, subtle shadows, and color badges. Include a <script src="https://cdn.tailwindcss.com"></script> inside the <head> section to enable instant styling in our playground!
      4. If the target format is "pdf", you MUST output professional, highly structured, clean plain text representing a sealed corporate or technical report layout with explicit header sections, math parameters, and tables. Do NOT write html tags, write formal plain-text layout.

      Preserve ALL core technical content, numerical values, parameters, equations, and tags perfectly. Maintain a high-fidelity aesthetic structure for the target format.

      Document Content to convert:
      """
      ${content}
      """`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
      });

      let convertedContent = response.text || "";

      // Post-processing for PDF formats if they are missing metadata tags or structure
      if (targetType === "pdf" && !convertedContent.includes("__PDF_DATA__")) {
        const metadata = {
          notes: [
            {
              id: "note-converted",
              text: `Auto-converted to PDF from ${currentType || 'legacy'} format via Gemini API.`,
              x: 15,
              y: 8,
              page: 1
            }
          ],
          placedSigPosition: null,
          isLocked: false,
          password: "",
          signatureData: null,
          timestamp: new Date().toISOString()
        };
        convertedContent = `${convertedContent}\n\n__PDF_DATA__${JSON.stringify(metadata)}`;
      }

      res.json({
        title: title,
        content: convertedContent
      });

    } catch (error: any) {
      console.error("Document Convert API Error:", error);
      res.status(500).json({ error: error.message || "An error occurred during document format conversion." });
    }
  });

  // API endpoint for In-editor Image Text Extraction (OCR)
  app.post("/api/gemini/ocr", async (req: any, res: any) => {
    try {
      const { image, mimeType } = req.body;

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

      if (!image) {
        return res.status(400).json({ error: "Missing image data for text extraction." });
      }

      // Handle raw base64 or DataURL stripping
      let base64Data = image;
      let detectedMime = mimeType || "image/png";

      if (image.includes(";base64,")) {
        const parts = image.split(";base64,");
        detectedMime = parts[0].replace("data:", "");
        base64Data = parts[1];
      }

      const imagePart = {
        inlineData: {
          mimeType: detectedMime,
          data: base64Data,
        },
      };

      const prompt = `You are a high-performance Optical Character Recognition (OCR) analyzer.
      Please scan this image and extract ALL written, typed, or printed text you find inside it.
      
      Requirements:
      1. Be highly accurate. Transcribe every word, letter, and number correctly.
      2. Keep the original structure. If you find columns, tables, lists, or mathematical formulas, represent them beautifully in clean Markdown layout.
      3. If there are headers, code blocks, or schematic text, preserve their formatting.
      4. Output only the extracted text. Do not add conversational prefixes (like "Sure, here is the text") or suffix greetings.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: [imagePart, { text: prompt }],
      });

      res.json({
        text: response.text || "No text could be extracted from the image."
      });

    } catch (error: any) {
      console.error("OCR API Error:", error);
      res.status(500).json({ error: error.message || "An error occurred during image text extraction (OCR)." });
    }
  });

  // API endpoint to convert videos into summaries complete with key timestamps and visual snapshots
  app.post("/api/gemini/summarize-video", async (req: any, res: any) => {
    try {
      const { videoUrl, title, markers } = req.body;

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

      const prompt = `You are an elite video analysis intelligence system. Generate a brilliant, highly structured, and deep video summary based on the details provided:
      - Video Title: "${title || 'Untitled Video'}"
      - Video URL/Path: "${videoUrl || 'Default Stream'}"
      - Existing Markers/Annotations: ${JSON.stringify(markers || [])}

      Create a production-grade, printer-friendly summary covering the following sections in Markdown:
      
      1. 📺 Video Overview: A professional summary of what the video covers, its context, style, and general theme.
      2. ⏱️ Timeline & Key Timestamps: Generate a sequential chronological list of key timestamps (e.g., 00:05, 00:30, 01:15, etc.). For EACH timestamp, provide:
         - The time marker (e.g., [00:15])
         - A "Visual Snapshot" description with an appropriate emoji (e.g. "🎬 [Snapshot: Ball Rebounds from Elastomer Plate] - A detailed visual description of what is happening on screen.")
         - Core analytical insight of that key moment.
      3. 📑 Key Takeaways & Synthesis: What are the main findings or engineering specs described in the video? Include bullet points with rich text.
      
      Make the output incredibly detailed, beautiful, and professional. Synthesize a highly immersive chronological analysis that sounds exactly as if you scanned every frame of the video!`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
      });

      res.json({
        summary: response.text || "No video summary was generated."
      });

    } catch (error: any) {
      console.error("Video Summary API Error:", error);
      res.status(500).json({ error: error.message || "An error occurred during video summarization." });
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
