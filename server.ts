import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Gemini Setup
  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // AI Diagnostic / Estimation endpoint
  app.post("/api/ai/diagnose", async (req, res) => {
    try {
      const { device, issue } = req.body;
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `As an Apple repair expert for "iFixPune Pro", diagnose this issue:
        Device: ${device}
        Reported Issue: ${issue}
        
        Provide:
        1. Potential Cause
        2. Estimated Repair Time
        3. Estimated Spare Part Cost (in INR)
        4. Complexity (Low/Medium/High)
        Keep it professional and concise.`,
      });
      res.json({ diagnosis: response.text });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to diagnose" });
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
