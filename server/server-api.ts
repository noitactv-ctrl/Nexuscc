// Emergent preview entry: runs the Express API only (no Vite/static) on PORT.
// The React client is served separately by the Vite dev server on port 3000.
import { createApp, initializeApp } from "./app";
import { pool } from "./db";

const { app, httpServer } = createApp();

(async () => {
  await initializeApp(app, httpServer);

  const port = parseInt(process.env.PORT || "8001", 10);
  httpServer.listen({ port, host: "0.0.0.0" }, () => {
    console.log(`[api] serving on port ${port}`);
  });

  let shuttingDown = false;
  const shutdown = () => {
    if (shuttingDown) return;
    shuttingDown = true;
    const forceExit = setTimeout(() => process.exit(1), 5000);
    forceExit.unref();
    httpServer.close(async () => {
      try {
        await pool.end();
      } catch (error) {
        console.error("[db] Failed to close database pool cleanly:", error);
      } finally {
        clearTimeout(forceExit);
        process.exit(0);
      }
    });
  };
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
})().catch((error) => {
  console.error("Failed to start API server:", error);
  process.exit(1);
});
