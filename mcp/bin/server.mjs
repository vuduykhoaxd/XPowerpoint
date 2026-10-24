#!/usr/bin/env node
const target = new URL("../dist/server.js", import.meta.url);
try {
  await import(target.href);
} catch (error) {
  if (error && (error.code === "ERR_MODULE_NOT_FOUND" || error.code === "MODULE_NOT_FOUND")) {
    console.error("[xpowerpoint] dist/ not found. Run: cd mcp && npm install && npm run build");
    process.exit(1);
  }
  throw error;
}
