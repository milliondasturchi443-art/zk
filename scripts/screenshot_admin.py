import asyncio, os, re
from playwright.async_api import async_playwright

SHOTS = "/home/anonymus/zk/shots"
os.makedirs(SHOTS, exist_ok=True)

async def main():
    async with async_playwright() as p:  # placeholder, replaced below
        pass

# real entry
async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page(viewport={"width": 1280, "height": 800})

        await page.goto("http://127.0.0.1:3000/login")
        await page.wait_for_timeout(1200)
        await page.screenshot(path=f"{SHOTS}/00-login.png")
        await page.get_by_label("Email").fill("admin@zk.local")
        await page.get_by_label("Password").fill("Admin123!")
        await page.get_by_role("button", name="Sign in").click()
        await page.wait_for_url("**/")
        await page.wait_for_timeout(1200)
        await page.screenshot(path=f"{SHOTS}/01-overview.png", full_page=True)

        for path, name in [("/courses", "02-courses"), ("/courses/new", "03-course-new"), ("/questions", "04-questions"), ("/audit", "05-audit")]:
            await page.goto(f"http://127.0.0.1:3000{path}")
            await page.wait_for_timeout(1200)
            await page.screenshot(path=f"{SHOTS}/{name}.png", full_page=True)

        # create demo course
        await page.goto("http://127.0.0.1:3000/courses/new")
        await page.wait_for_timeout(800)
        await page.get_by_label("Title").fill("Demo SAT Course")
        await page.get_by_label("Slug (lowercase, hyphens)").fill("demo-sat-course")
        await page.get_by_label("Description").fill("A demo course for screenshots.")
        await page.screenshot(path=f"{SHOTS}/06-course-new-filled.png")
        await page.get_by_role("button", name="Create course").click()
        await page.wait_for_url(re.compile(r"http://127\.0\.0\.1:3000/courses/[0-9a-f-]{36}"))
        await page.wait_for_timeout(1200)
        await page.screenshot(path=f"{SHOTS}/07-course-detail.png", full_page=True)

        url = page.url
        course_id = re.search(r"/courses/([0-9a-f-]{36})", url).group(1)
        print("course_id:", course_id)

        # new module
        await page.goto(f"http://127.0.0.1:3000/courses/{course_id}/modules/new")
        await page.wait_for_timeout(800)
        await page.get_by_label("Title").fill("Module 1: Algebra")
        await page.get_by_label("Description").fill("Linear equations module.")
        await page.screenshot(path=f"{SHOTS}/08-module-new.png")
        await page.get_by_role("button", name="Create module").click()
        await page.wait_for_url(re.compile(r"/courses/[0-9a-f-]{36}/modules/[0-9a-f-]{36}"))
        await page.wait_for_timeout(1200)
        await page.screenshot(path=f"{SHOTS}/09-module-detail.png", full_page=True)

        module_id = re.search(r"/modules/([0-9a-f-]{36})", page.url).group(1)
        print("module_id:", module_id)

        # new lesson
        await page.goto(f"http://127.0.0.1:3000/courses/{course_id}/modules/{module_id}/lessons/new")
        await page.wait_for_timeout(800)
        await page.get_by_label("Title").fill("Linear Equations")
        await page.screenshot(path=f"{SHOTS}/10-lesson-new.png")
        await page.get_by_role("button", name="Create lesson").click()
        await page.wait_for_url(re.compile(r"/lessons/[0-9a-f-]{36}"))
        await page.wait_for_timeout(1200)
        await page.screenshot(path=f"{SHOTS}/11-lesson-editor.png", full_page=True)

        # new question
        await page.goto("http://127.0.0.1:3000/questions/new")
        await page.wait_for_timeout(800)
        await page.screenshot(path=f"{SHOTS}/12-question-new.png", full_page=True)

        await browser.close()
        print("done")

asyncio.run(run())
