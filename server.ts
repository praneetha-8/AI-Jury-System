import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import generateHandler from "./api/generate";
import judgeHandler from "./api/judge";

const app = express();
const PORT = 3000;

app.use(express.json());

// API Routes
app.post("/api/generate", generateHandler);
app.post("/api/judge", judgeHandler);

async function startServer() {
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
