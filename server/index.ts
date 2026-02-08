import express, { type Request, Response, NextFunction } from "express";
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import OpenAI from 'openai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const promptTemplate = fs.readFileSync(
  path.resolve(__dirname, '../data/prompt.txt'),
  'utf-8'
);
const data = fs.readFileSync(
  path.resolve(__dirname, '../data/airtable_data.csv'),
  'utf-8'
);
const systemPrompt = promptTemplate.replace('<<DATA>>', data);

const app = express();

// Check for the OpenAI API key from .env
if (!process.env.OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY is not set in the environment variables.');
}

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: false, limit: '50mb' }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

// API endpoint for the AI Copilot (uses new prompt-agent if available)
app.post('/api/ai/copilot', async (req, res, next) => {
  const { messages } = req.body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'Messages are required' });
  }

  try {
    // Use configured prompt agent ID if provided, otherwise fall back to the provided prompt id
    const promptId = process.env.OPENAI_PROMPT_ID ?? 'pmpt_68f92dfb62f481978dc0cb918464c8660de08a28f99a7e59';

    // Build prompt object. If OPENAI_PROMPT_VERSION is set, use it; otherwise omit
    // the `version` field so the agent's default/latest version is used.
    const promptObj: any = { id: promptId };
    if (process.env.OPENAI_PROMPT_VERSION) {
      promptObj.version = process.env.OPENAI_PROMPT_VERSION;
    }

    const response = await openai.responses.create({
      prompt: promptObj,
      input: messages.map((m: any) => ({ role: m.role, content: m.content })),
      reasoning: { summary: 'auto' },
      tools: [
        {
          type: 'web_search',
          filters: null,
          search_context_size: 'medium',
          user_location: {
            type: 'approximate',
            city: null,
            country: 'US',
            region: null,
            timezone: null
          }
        },
        {
          type: 'code_interpreter',
          container: {
            type: 'auto',
            file_ids: [
              'file-2Bf8KE46AnGQQC2SkYMppM'
            ]
          }
        }
      ],
      store: true,
      include: [
        'code_interpreter_call.outputs',
        'reasoning.encrypted_content',
        'web_search_call.action.sources'
      ]
    });

    // Extract text safely from the response
    let answer = (response as any).output_text;
    if (!answer) {
      if (Array.isArray((response as any).output)) {
        answer = (response as any).output.map((o: any) => {
          if (o.content && Array.isArray(o.content)) return o.content.map((c: any) => c.text || '').join('');
          return o.type === 'output_text' ? o.text || '' : '';
        }).join('\n');
      } else {
        answer = JSON.stringify(response);
      }
    }

    res.json({ answer });
  } catch (error) {
    // If prompt-agent call fails, attempt the legacy fallback to a direct model call
    try {
      const fallback = await openai.responses.create({
        model: 'gpt-4.1',
        input: [
          { role: 'system', content: systemPrompt },
          ...messages,
        ]
      });

      const fallbackAnswer = (fallback as any).output_text ?? (Array.isArray((fallback as any).output) ? (fallback as any).output.map((o:any)=> (o.content?.map((c:any)=>c.text||'').join(''))).join('\n') : JSON.stringify(fallback));
      return res.json({ answer: fallbackAnswer });
    } catch (fallbackErr) {
      return next(error);
    }
  }
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    //reusePort: true, // commented out for debugging on macOS
  }, () => {
    log(`serving on port ${port}`);
  });

  // set the server timeout (ms) to 5 minutes
  server.setTimeout(5 * 60 * 1000);

  // optional: adjust keepAlive to avoid proxy idle timeouts
  server.keepAliveTimeout = 60 * 1000; // 60s for keep alive
})();
