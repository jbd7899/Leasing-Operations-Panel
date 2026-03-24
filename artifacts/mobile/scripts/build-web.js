/**
 * Build script for Expo web output.
 * Runs `expo export --platform web` and writes static files to dist-web/.
 */
const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");

const projectRoot = path.resolve(__dirname, "..");

function getEnv() {
  const env = { ...process.env };
  if (!env.EXPO_PUBLIC_DOMAIN) {
    if (env.REPLIT_INTERNAL_APP_DOMAIN) {
      env.EXPO_PUBLIC_DOMAIN = env.REPLIT_INTERNAL_APP_DOMAIN.replace(/^https?:\/\//, "");
    } else if (env.REPLIT_DEV_DOMAIN) {
      env.EXPO_PUBLIC_DOMAIN = env.REPLIT_DEV_DOMAIN;
    }
  }
  return env;
}

const outputDir = path.join(projectRoot, "dist-web");

if (fs.existsSync(outputDir)) {
  fs.rmSync(outputDir, { recursive: true });
}

console.log("Building Expo web output...");
const child = spawn(
  "pnpm",
  ["exec", "expo", "export", "--platform", "web", "--output-dir", "dist-web"],
  {
    cwd: projectRoot,
    stdio: "inherit",
    env: getEnv(),
  },
);

child.on("exit", (code) => {
  if (code !== 0) {
    console.error(`expo export exited with code ${code}`);
    process.exit(code ?? 1);
  }
  console.log("Web build complete → dist-web/");
});
