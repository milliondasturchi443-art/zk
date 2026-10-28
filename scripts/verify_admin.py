"""Text-based verification of the ZK admin console. No screenshots."""
import asyncio
from playwright.async_api import async_playwright

BASE = "http://127.0.0.1:3000"
EMAIL = "admin@zk.local"
PASSWORD = "Admin123!"


async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page(viewport={"width": 1280, "height": 800})
        logs = []

        def on_console(m):
            logs.append(f"[{m.type}] {m.text}")

        def on_pageerror(e):
            logs.append(f"[pageerror] {e}")

        page.on("console", on_console)
        page.on("pageerror", on_pageerror)

        async def dump(label, url):
            resp = await page.goto(url)
            await page.wait_for_timeout(1500)
            body = (await page.inner_text("body")).strip()
            print(f"\n===== {label} :: HTTP {resp.status} :: url={page.url}")
            print(body[:1000])
            if resp.status >= 400:
                print("---- SERVER BODY ----")
                print((resp.text() or "")[:500] if False else "")

        await dump("LOGIN", f"{BASE}/login")
        await page.get_by_label("Email").fill(EMAIL)
        await page.get_by_label("Password").fill(PASSWORD)
        await page.get_by_role("button", name="Sign in").click()
        try:
            await page.wait_for_url(lambda u: not u.path.startswith("/login"), timeout=15000)
        except Exception:
            pass
        await page.wait_for_timeout(2500)
        print(f"\n===== AFTER LOGIN :: url={page.url}")
        print((await page.inner_text("body"))[:700])

        for label, path in [
            ("COURSES", "/courses"),
            ("COURSE-NEW", "/courses/new"),
            ("QUESTIONS", "/questions"),
            ("AUDIT", "/audit"),
        ]:
            await dump(label, f"{BASE}{path}")

        print(f"\n===== CONSOLE / PAGE ERRORS ({len(logs)}) =====")
        for m in logs:
            print(m)

        await browser.close()


asyncio.run(run())
