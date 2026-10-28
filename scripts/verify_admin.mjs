// Text-based verification of the ZK admin console.
// No screenshots — inspects DOM text and records console/network output only.
import { chromium } from "playwright";

const BASE = process.env.ADMIN_URL ?? "http://127.0.0.1:3000";
const EMAIL = process.env.ADMIN_EMAIL ?? "admin@zk.local";
const PASSWORD = process.env.ADMIN_PASSWORD ?? "Admin123!";

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

  const consoleMessages = [];
  page.on("console", (m) => consoleMessages.push(`[${m.type()}] ${m.text()}`));
  page.on("pageerror", (e) => consoleMessages.push(`[pageerror] ${e.message}`));

  async function gotoAndDump(label, url) {
    const status = await page.goto(url);
    await new Promise((r) => setTimeout(r, 1500));
    const title = await page.title();
    const body = (await page.innerText("body")).replace(/\n{3,}/g, "\n\n");
    console.log(`\n===== ${label} :: HTTP ${status?.status()} :: title=${title} :: url=${page.url()}`);
    console.log(body.slice(0, 900));
  }

  // 1. Login
  await gotoAndDump("LOGIN", `${BASE}/login`);
  await page.getByLabel("Email").fill(EMAIL);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL((u) => !u.href.endsWith("/login"), { timeout: 15000 }).catch(() => {});
  await new Promise((r) => setTimeout(r, 2500));
  console.log(`\n===== AFTER LOGIN :: url=${page.url()}`);
  console.log((await page.innerText("body")).slice(0, 600));

  // 2. Overview / courses / questions / audit
  for (const [label, path] of [
    ["COURSES", "/courses"],
    ["COURSE-NEW", "/courses/new"],
    ["QUESTIONS", "/questions"],
    ["AUDIT", "/audit"],
  ]) {
    await gotoAndDump(label, `${BASE}${path}`);
  }

  console.log(`\n===== CONSOLE / PAGE ERRORS (${consoleMessages.length}) =====`);
  for (const m of consoleMessages) console.log(m);

  await browser.close();
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});
