#!/usr/bin/env node

import { execFileSync } from "node:child_process";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const message = args
  .filter((arg) => arg !== "--dry-run")
  .join(" ")
  .trim() || "Update site content";

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const sitePaths = [
  ".github",
  ".eleventy.js",
  ".gitignore",
  "assets",
  "CONTENT_GUIDE.md",
  "docs",
  "package-lock.json",
  "package.json",
  "README.md",
  "scripts",
  "src"
];

function run(command, args, options = {}) {
  execFileSync(command, args, {
    stdio: "inherit",
    ...options
  });
}

function read(command, args) {
  try {
    return execFileSync(command, args, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    }).trim();
  } catch (error) {
    if (error.status === 1) {
      return "";
    }

    throw error;
  }
}

function git(args, options = {}) {
  return run("git", args, options);
}

const branch = read("git", ["branch", "--show-current"]);

if (branch !== "main") {
  console.error(`This site publishes from main through GitHub Actions, but the current branch is ${branch || "unknown"}.`);
  console.error("Switch to main before publishing.");
  process.exit(1);
}

console.log("Checking content JSON...");
run(process.execPath, ["scripts/validate-content.mjs"]);

console.log("\nBuilding GitHub Pages output in docs/...");
run(npmCommand, ["run", "build"]);

if (dryRun) {
  const changes = read("git", ["status", "--short", "--", ...sitePaths]);
  console.log("\nDry run complete. Website files that would be published:");
  console.log(changes || "No website changes detected.");
  process.exit(0);
}

console.log("\nStaging website files...");
git(["add", ...sitePaths]);

const stagedFiles = read("git", ["diff", "--cached", "--name-only"]);

if (!stagedFiles) {
  console.log("No website changes to publish.");
  process.exit(0);
}

console.log("\nCommitting:");
console.log(stagedFiles);
git(["commit", "-m", message]);

console.log("\nPushing to GitHub...");
git(["push", "origin", "main"]);

console.log("\nPublished. GitHub Actions will rebuild and deploy the site shortly:");
console.log("https://tdufva.github.io/grasping-more-than-digital-futures/");
