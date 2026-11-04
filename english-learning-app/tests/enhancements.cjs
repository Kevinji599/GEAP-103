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
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    assert.equal(
      await page.locator(".brand-logo").getAttribute("src"),
      "assets/wordspring-logo.png",
    );
    const image = await page.locator(".brand-logo").evaluate((img) => {
      const c = document.createElement("canvas");
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      const ctx = c.getContext("2d");
      ctx.drawImage(img, 0, 0);
      return {
        alpha: ctx.getImageData(0, 0, 1, 1).data[3],
        loaded: img.complete && img.naturalWidth > 0,
      };
    });
    assert.ok(image.loaded);
    assert.equal(image.alpha, 0);
    assert.equal(
      await page
        .locator(".brand-logo")
        .evaluate((img) => getComputedStyle(img).backgroundColor),
      "rgba(0, 0, 0, 0)",
    );
    await page.click('[data-page="cards"]');
    const button = await page.locator("#flip").elementHandle();
    await page.click("#flip");
    assert.ok(
      await button.evaluate((el) => el === document.querySelector("#flip")),
    );
    assert.equal(
      await page.locator("#flip").getAttribute("aria-pressed"),
      "true",
    );
    assert.equal(
      await page.locator(".card-back").getAttribute("aria-hidden"),
      "false",
    );
    const transition = await page
      .locator(".card-inner")
      .evaluate((el) => getComputedStyle(el).transitionDuration);
    assert.equal(transition, "0.55s");
    await page.waitForTimeout(650);
    assert.match(
      await page
        .locator(".card-inner")
        .evaluate((el) => getComputedStyle(el).transform),
      /matrix3d\(-1/,
    );
    await page.locator("#flip").press("Space");
    await page.waitForTimeout(650);
    assert.equal(
      await page.locator("#flip").getAttribute("aria-pressed"),
      "false",
    );
    assert.match(
      await page
        .locator(".card-inner")
        .evaluate((el) => getComputedStyle(el).transform),
      /^(?:none|matrix\(1)/,
    );
    await page.emulateMedia({ reducedMotion: "reduce" });
    assert.equal(
      await page
        .locator(".card-inner")
        .evaluate((el) => getComputedStyle(el).transitionDuration),
      "0s",
    );
    await page.click('[data-page="progress"]');
    assert.match(await page.locator(".assessment").innerText(), /资料不足/);
    assert.equal(await page.locator(".score-number").innerText(), "— / 100");
    // Imported legacy aggregate counters and self-marked words must not manufacture evidence.
    await page.evaluate(() => {
      saved.attempts = 999;
      saved.correct = 999;
      saved.mastered = words.map(wordId);
      render();
    });
    assert.match(await page.locator(".assessment").innerText(), /资料不足/);
    // End-to-end scoring records actual submissions and survives reload.
    await page.click('[data-page="spelling"]');
    const answer = await page.evaluate(() => currentList[0].word);
    await page.fill("#guess", answer);
    await page.locator("#answer button").click();
    assert.equal(
      await page.evaluate(() => Object.keys(saved.assessment.spelling).length),
      1,
    );
    await page.reload();
    assert.equal(
      await page.evaluate(() => Object.keys(saved.assessment.spelling).length),
      1,
    );
    // Repeating an item overwrites its last result and never increases coverage.
    await page.evaluate(() => {
      const id = Object.keys(saved.assessment.spelling)[0];
      recordSkill("spelling", id, false);
      recordSkill("spelling", id, true);
    });
    assert.equal(
      await page.evaluate(() => Object.keys(saved.assessment.spelling).length),
      1,
    );
    // Known input distributions exercise weighting and each assessment threshold.
    const populate = async (rates) =>
      page.evaluate((rates) => {
        saved.assessment = {};
        const sample = [
          ...words.filter((w) => w.theme === "daily").slice(0, 7),
          ...words.filter((w) => w.theme === "school").slice(0, 7),
          ...words.filter((w) => w.theme === "work").slice(0, 6),
        ];
        for (const [k, mode] of ["spelling", "dictation"].entries())
          sample.forEach((w, i) =>
            recordSkill(mode, wordId(w), i < rates[k] * 20),
          );
        for (let i = 0; i < 10; i++)
          recordSkill("grammar", String(i), i < rates[2] * 10);
        currentPage = "progress";
        render();
        return assessmentSummary();
      }, rates);
    let a = await populate([1, 1, 0.5]);
    assert.equal(a.score, 85);
    assert.equal(a.ready, true);
    assert.match(a.level, /A2 学习/);
    a = await populate([1, 1, 1]);
    assert.equal(a.score, 100);
    assert.match(a.level, /接近 B1/);
    a = await populate([0.7, 0.7, 0.7]);
    assert.equal(a.score, 70);
    assert.match(a.level, /A2 巩固/);
    a = await populate([0.4, 0.4, 0.4]);
    assert.equal(a.score, 40);
    assert.match(a.level, /A1/);
    await page.evaluate(() => {
      saved.assessment.spelling = Object.fromEntries(
        words
          .filter((w) => w.theme === "daily")
          .slice(0, 20)
          .map((w) => [wordId(w), true]),
      );
      saved.assessment.dictation = { ...saved.assessment.spelling };
      render();
    });
    assert.equal(await page.evaluate(() => assessmentSummary().ready), false);
    a = await populate([1, 1, 1]);
    await page.selectOption("#language", "en");
    assert.match(
      await page.locator(".assessment").innerText(),
      /Approaching B1/,
    );
    // Fresh profile, legacy profile, keyboard, narrow layout and reset.
    await page.setViewportSize({ width: 375, height: 812 });
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    await page.screenshot({
      path: "/tmp/wordspring-rating-mobile.png",
      fullPage: true,
    });
    page.once("dialog", (d) => d.accept());
    await page.click("#reset");
    assert.equal(await page.evaluate(() => assessmentSummary().score), null);
    assert.equal(await page.evaluate(() => saved.assessment), undefined);
    assert.deepEqual(errors, []);
    console.log(
      "PASS: transparent logo, bidirectional flip, keyboard/reduced motion, assessment weights/thresholds/coverage, persistence, legacy records, reset and mobile layout.",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
