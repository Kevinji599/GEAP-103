// Run with Node.js and Playwright installed: node tests/browser.cjs
const { chromium } = require("playwright");
const assert = require("node:assert/strict");
(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
    headless: true,
    args: ["--no-sandbox"],
  });
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(
      process.env.WORDSPRING_URL ||
        "http://127.0.0.1:8000/english-learning-app/",
    );
    await page.evaluate(() => {
      localStorage.clear();
      localStorage.setItem(
        "wordspring-progress-v1",
        JSON.stringify({
          mastered: ["daily:breakfast"],
          wrong: ["work:deadline"],
          correct: 2,
          attempts: 3,
        }),
      );
    });
    await page.reload();
    const data = await page.evaluate(() => window.WORDSPRING_DATA);
    assert.equal(data.length, 9);
    assert.equal(
      new Set(data.flatMap((t) => t.words.map((w) => w.word.toLowerCase())))
        .size,
      435,
    );
    assert.equal(data.flatMap((t) => t.words).length, 440);
    for (const t of data)
      for (const w of t.words) {
        assert.ok(w.word && w.zh && w.example && w.clue);
        assert.ok(!w.clue.toLowerCase().includes(w.word.toLowerCase()), t.id + ":" + w.word);
      }
    const allowedPos = new Set(["n.", "v.", "adj.", "n. phr."]);
    for (const t of data)
      for (const w of t.words)
        assert.ok(
          allowedPos.has(w.pos),
          t.id + ":" + w.word + " is missing a valid POS",
        );
    const logo = page.locator(".brand-logo");
    assert.equal(await logo.getAttribute("alt"), "WordSpring");
    assert.ok(
      await logo.evaluate((img) => img.complete && img.naturalWidth === 1754),
    );
    const before = JSON.parse(
      await page.evaluate(() => localStorage.getItem("wordspring-progress-v1")),
    );
    await page.selectOption("#language", "en");
    assert.equal(await page.locator("html").getAttribute("lang"), "en");
    assert.match(
      await page.locator("main").innerText(),
      /435 distinct words across 9 categories/,
    );
    assert.deepEqual(
      JSON.parse(
        await page.evaluate(() =>
          localStorage.getItem("wordspring-progress-v1"),
        ),
      ),
      before,
    );
    assert.equal(await page.locator(".hero .stat").count(), 3);
    assert.doesNotMatch(await page.locator("nav").innerText(), />/);
    assert.equal(await page.locator("main .category-grid").count(), 0);
    assert.equal(await page.locator(".hero .eyebrow").innerText(), "LEARN ENGLISH, ONE WORD AT A TIME");
    const type = await page.evaluate(async () => {
      const fonts = await document.fonts.load('800 36px "Poppins"');
      const headline = getComputedStyle(document.querySelector(".hero h1"));
      const intro = getComputedStyle(document.querySelector(".hero .lead"));
      return {
        loaded: fonts.some((font) => font.family === "Poppins" && font.status === "loaded"),
        fontFamily: headline.fontFamily,
        size: parseFloat(headline.fontSize),
        weight: Number(headline.fontWeight),
        introSize: parseFloat(intro.fontSize),
      };
    });
    assert.ok(type.loaded);
    assert.match(type.fontFamily, /Poppins.*Founder Lanting/);
    assert.ok(type.size >= 40 && type.weight >= 700 && type.introSize >= 18);
    await page.click('.hero [data-go="categories"]');
    assert.equal(await page.locator("main h1").innerText(), "Browse categories");
    assert.equal(await page.locator(".category-grid .tile").count(), 9);
    await page.selectOption("#language", "zh");
    assert.equal(await page.locator("main h1").innerText(), "按分类学习");
    await page.locator('.category-grid [data-theme="technology"]').click();
    assert.equal(await page.locator("#theme").inputValue(), "technology");
    await page.selectOption("#language", "en");
    for (const t of data) {
      await page.click('[data-page="cards"]');
      await page.selectOption("#theme", t.id);
      assert.ok(
        (
          await page.locator('#flip [aria-hidden="false"] .pos').innerText()
        ).includes(t.words[0].pos),
      );
      await page.click("#flip");
      assert.ok(
        (
          await page.locator('#flip [aria-hidden="false"] .pos').innerText()
        ).includes(t.words[0].pos),
      );
      assert.match(
        await page.locator("#flip").innerText(),
        new RegExp(t.words[0].word),
      );
      assert.ok(
        (await page.locator("#flip").innerText()).includes(t.words[0].zh),
      );
      await page.selectOption("#language", "zh");
      assert.match(
        await page.locator('#flip [aria-hidden="false"] .pos').innerText(),
        /名词|动词|形容词/,
      );
      assert.equal(await page.locator("#theme").inputValue(), t.id);
      await page.selectOption("#language", "en");
    }
    for (const mode of ["spelling", "dictation"]) {
      await page.click(`[data-page="${mode}"]`);
      await page.selectOption("#theme", "medical");
      await page.fill("#guess", "unfinished");
      const prompt = await page.locator(".panel h2").innerText();
      const currentWord = await page.evaluate(() => currentList[index]);
      if (mode === "spelling") {
        assert.equal(await page.locator("#spelling-clue").innerText(), currentWord.clue);
      }
      await page.selectOption("#language", "zh");
      assert.equal(await page.locator("#guess").inputValue(), "unfinished");
      if (mode === "spelling") {
        assert.equal(await page.locator("#spelling-clue").innerText(), currentWord.zh);
      }
      await page.selectOption("#language", "en");
      assert.equal(await page.locator(".panel h2").innerText(), prompt);
      const answer = await page.evaluate(
        () => currentList[index % currentList.length].word,
      );
      await page.fill("#guess", answer.toUpperCase());
      await page.locator("#answer button").click();
      assert.match(await page.locator("#feedback").innerText(), /Correct/);
      assert.equal(await page.locator("#feedback .pos").count(), 1);
      const attempts = await page.evaluate(() => saved.attempts);
      await page.selectOption("#language", "zh");
      assert.match(await page.locator("#feedback").innerText(), /正确/);
      assert.match(
        await page.locator("#feedback .pos").innerText(),
        /名词|动词|形容词/,
      );
      assert.ok(await page.locator("#answer button").isDisabled());
      assert.equal(await page.evaluate(() => saved.attempts), attempts);
      await page.click("#next");
      assert.equal(await page.locator("#feedback").innerText(), "");
      await page.selectOption("#language", "en");
    }
    // Verify all authored entries render their labels without changing IDs or progress.
    for (const t of data) {
      await page.click('[data-page="cards"]');
      await page.selectOption("#theme", t.id);
      for (let start = 0; start < t.words.length; start += 40) {
        if (t.words.length > 40) await page.selectOption("#card-group", String(start / 40));
        for (const w of t.words.slice(start, start + 40)) {
          const label = await page.locator("#flip").innerText();
          assert.ok(label.includes(w.word) && label.includes(w.pos), t.id + ":" + w.word);
          await page.click("#next");
        }
      }
    }
    await page.click('[data-page="spelling"]');
    await page.fill("#guess", "intentionally-wrong");
    await page.locator("#answer button").click();
    assert.equal(await page.locator("#feedback .pos").count(), 1);
    await page.click('[data-page="progress"]');
    assert.ok((await page.locator(".pill .pos").count()) > 0);
    await page.click('[data-page="grammar"]');
    for (let i = 0; i < 12; i++) {
      await page.click('[data-option="1"]');
      await page.selectOption("#language", "zh");
      assert.match(await page.locator("#feedback").innerText(), /正确/);
      await page.selectOption("#language", "en");
      assert.doesNotMatch(
        await page.locator("#feedback").innerText(),
        /[\u3400-\u9fff]/,
      );
      assert.ok(await page.locator('[data-option="1"]').isDisabled());
      await page.click("#next");
    }
    await page.click('[data-page="progress"]');
    assert.match(await page.locator("main").innerText(), /1 \/ 440/);
    await page.reload();
    assert.equal(await page.locator("#language").inputValue(), "en");
    await page.setViewportSize({ width: 375, height: 812 });
    for (const mode of [
      "home",
      "categories",
      "cards",
      "spelling",
      "dictation",
      "grammar",
      "progress",
    ]) {
      await page.click(`[data-page="${mode}"]`);
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        mode + " overflows mobile viewport",
      );
    }
    await page.screenshot({
      path: "/tmp/wordspring-mobile.png",
      fullPage: true,
    });
    assert.deepEqual(errors, []);
    console.log(
      "PASS: 440 English clues and POS labels, bilingual spelling and feedback, Poppins, home and categories, logo, saved progress, all activities, mobile layout, and no browser errors.",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
