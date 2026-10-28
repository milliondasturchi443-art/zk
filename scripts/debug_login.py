import asyncio
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page(viewport={"width": 1280, "height": 800})
        page.on("console", lambda m: print("CONSOLE:", m.type, m.text))
        page.on("response", lambda r: print("RESP:", r.status, r.url))
        await page.goto("http://127.0.0.1:3000/login")
        await page.wait_for_timeout(1000)
        await page.get_by_label("Email").fill("admin@zk.local")
        await page.get_by_label("Password").fill("Admin123!")
        await page.get_by_role("button", name="Sign in").click()
        await page.wait_for_timeout(4000)
        print("URL:", page.url)
        body = await page.inner_text("body")
        print("BODY:", body[:500])
        await page.screenshot(path="/home/anonymus/zk/shots/after-login.png", full_page=True)
        await browser.close()

asyncio.run(run())
