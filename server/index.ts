import { createApp, initializeApp } from "./app";
import { pool } from "./db";
import { serveStatic } from "./static";

const { app, httpServer } = createApp();

(async () => {
  await initializeApp(app, httpServer);

  // Set up Vite in development and serve the compiled client in production.
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen({ port, host: "0.0.0.0", reusePort: true }, () => {
    console.log(`[express] serving on port ${port}`);
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
  console.error("Failed to start server:", error);
  process.exit(1);
});