import express from "express";
import path from "path";
import dotenv from "dotenv";
import os from "os";
import { createServer as createViteServer } from "vite";

dotenv.config();

const app = express();
app.use(express.json());
const PORT = process.env.PORT || 3000;

// Configure Vite integration or production static serving
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(Number(PORT), "0.0.0.0", () => {
    const interfaces = os.networkInterfaces();
    let networkAddress = "Unknown";

    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name]!) {
        if (iface.family === "IPv4" && !iface.internal) {
          networkAddress = iface.address;
          break;
        }
      }
      if (networkAddress !== "Unknown") break;
    }

    console.log(`\n  \x1b[32m\x1b[1mBNB.AI Marketing Intelligence Platform\x1b[0m`);
    console.log(`  \x1b[34m➜\x1b[0m  \x1b[1mLocal:\x1b[0m   http://localhost:\x1b[1m${PORT}\x1b[0m/`);
    console.log(`  \x1b[34m➜\x1b[0m  \x1b[1mServing from:\x1b[0m ${process.cwd()}`);
    console.log(`\n  \x1b[2mReady for analysis.\x1b[0m\n`);
  });
}

startServer();
