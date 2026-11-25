const assert = require("node:assert/strict");

global.window = {};
require("../vocabulary.js");
require("../reading-content.js");
const data = window.WORDSPRING_DATA;
const passages = window.WORDSPRING_READINGS;
const groups = [];
const knownWords = new Set();
for (const category of data) {
  assert.equal(category.words.length % 40, 0);
  for (let start = 0; start < category.words.length; start += 40) {
    const id = category.id + "-" + (start / 40 + 1);
    const originalWords = category.words.slice(start, start + 40);
    const entries = new Set(originalWords.map((word) => word.word.toLowerCase()));
    assert.equal(entries.size, 40, id);
    const { title, text, choices, blanks } = passages[id];
    assert.ok(title.every(Boolean));
    assert.ok(text.split("\n\n").length >= 3);
    const targets = new Set(Array.from(text.matchAll(/\[([^\]]+)\]/g), (match) =>
      match[1].split("|").at(-1).toLowerCase(),
    ));
    assert.deepEqual(targets, entries, id);
    const plain = text.replace(/\[([^|\]]+)(?:\|[^\]]+)?\]/g, "$1").toLowerCase();
    assert.equal(choices.length, 3);
    assert.equal(blanks.length, 3);
    for (const choice of choices) {
      assert.ok(choice.length === 6 && choice.every(Boolean));
      assert.equal(new Set(choice.slice(1, 4)).size, 3);
    }
    for (const [prompt, answer, zh, en] of blanks) {
      assert.equal(prompt.match(/___/g)?.length, 1);
      assert.ok(zh && en);
      assert.ok(plain.match(new RegExp("\\b" + answer.toLowerCase() + "\\b")), id + ": " + answer);
    }
    groups.push(id);
    for (const word of originalWords) knownWords.add(word.word.toLowerCase());
  }
}
assert.equal(groups.length, 11);
assert.deepEqual(new Set(Object.keys(passages)), new Set(groups));
assert.equal(knownWords.size, 435);
console.log("PASS: 11 ordered groups of 40, exact target coverage, 66 valid quiz items and all fill-in answers in the passages.");

if (process.argv.includes("--content-only")) process.exit(0);

const { chromium } = require("playwright");
(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
    headless: true,
    args: ["--no-sandbox"],
  });
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    const url = process.env.WORDSPRING_URL || "http://127.0.0.1:8000/english-learning-app/";
    const key = "wordspring-progress-v1";
    const daily = data[0].words.map((word) => "daily:" + word.word);
    const medical = data.find((category) => category.id === "medical").words;
    const baseline = {
      mastered: daily.slice(0, 35),
      wrong: [daily[35], "work:deadline"],
      correct: 4,
      attempts: 8,
      assessment: {
        spelling: { [daily[36]]: true },
        dictation: { [daily[37]]: false },
        grammar: { 0: true },
      },
    };
    await page.goto(url);
    await page.evaluate(([key, baseline]) => {
      localStorage.clear();
      localStorage.setItem(key, JSON.stringify(baseline));
    }, [key, baseline]);
    const readSaved = () => page.evaluate((key) => JSON.parse(localStorage.getItem(key)), key);
    const goReading = () => page.click('nav [data-page="reading"]');
    const openDaily = () => page.click('[data-group="daily-1"] [data-read]');
    const dailyGroup = page.locator('[data-group="daily-1"]');
    await page.reload();
    await goReading();
    assert.equal(await page.locator(".reading-group").count(), 11);
    assert.match(await dailyGroup.innerText(), /38 \/ 40.*未解锁/);
    assert.deepEqual(await readSaved(), baseline);

    await page.click('[data-group="medical-2"] [data-group-start]');
    assert.equal(await page.locator("#theme").inputValue(), "medical");
    assert.equal(await page.locator("#card-group").inputValue(), "1");
    assert.match(await page.locator(".card-front strong").innerText(), new RegExp(medical[40].word));
    await page.selectOption("#card-group", "0");
    assert.match(await page.locator(".card-front strong").innerText(), new RegExp(medical[0].word));

    await goReading();
    await dailyGroup.locator("[data-group-start]").click();
    assert.match(await page.locator(".card-front strong").innerText(), /umbrella/);
    await page.click("#next");
    assert.match(await page.locator(".card-group-status").innerText(), /38 \/ 40/);
    assert.deepEqual(await readSaved(), baseline);
    await page.click("#skip");
    let stored = await readSaved();
    assert.deepEqual(stored.mastered, baseline.mastered);
    assert.deepEqual(stored.wrong, baseline.wrong);
    assert.deepEqual(stored.covered, [daily[39]]);
    assert.equal(await page.locator(".reading-notice").count(), 0);

    await page.reload();
    await goReading();
    assert.match(await dailyGroup.innerText(), /39 \/ 40/);
    await dailyGroup.locator("[data-group-start]").click();
    await page.click("#master");
    assert.match(await page.locator(".reading-notice").innerText(), /可以去阅读这篇短文了/);
    await page.selectOption("#language", "en");
    assert.match(await page.locator(".reading-notice").innerText(), /Your reading is ready/);
    await page.click("#reading-later");
    assert.equal(await page.locator(".reading-notice").count(), 0);
    await goReading();
    assert.match(await dailyGroup.innerText(), /40 \/ 40.*Unlocked/);
    await openDaily();
    assert.equal(await page.locator(".reading-word").count(), 40);
    await page.getByRole("button", { name: "breakfast", exact: true }).click();
    assert.match(await page.locator(".reading-gloss:visible").innerText(), /早餐.*Noun/s);
    await page.getByRole("button", { name: "breakfast", exact: true }).press("Space");
    assert.equal(await page.locator(".reading-gloss:visible").count(), 0);

    const choices = passages["daily-1"].choices;
    const blanks = passages["daily-1"].blanks;
    async function answerChoice(i) {
      await page.locator("fieldset").nth(i)
        .getByRole("radio", { name: choices[i][1], exact: true }).check();
    }
    await answerChoice(0);
    await page.fill("#reading-answer-3", "  BALCONY ");
    await page.selectOption("#language", "zh");
    assert.match(await page.locator("#reading-quiz h2").innerText(), /阅读练习/);
    assert.equal(await page.inputValue("#reading-answer-3"), "  BALCONY ");
    await page.reload();
    await goReading();
    await openDaily();
    assert.equal(await page.inputValue("#reading-answer-3"), "  BALCONY ");
    assert.equal(await page.locator("fieldset").first().locator(":checked").inputValue(), choices[0][1]);

    await page.locator('#reading-quiz button[type="submit"]').click();
    assert.match(await page.locator("#reading-result").innerText(), /2 \/ 6 1 星/);
    assert.equal(await page.locator(".reading-explanation").count(), 6);
    assert.equal(await page.locator(".reading-explanation [lang=zh-CN]").count(), 6);
    assert.equal(await page.locator(".reading-explanation p[lang=en]").count(), 6);

    await page.click("#reading-retry");
    assert.equal(await page.inputValue("#reading-answer-3"), "");
    assert.equal(await page.locator("fieldset :checked").count(), 0);
    for (let i = 0; i < 3; i++) await answerChoice(i);
    await page.locator('#reading-quiz button[type="submit"]').click();
    assert.match(await page.locator("#reading-result").innerText(), /3 \/ 6 2 星/);

    await page.click("#reading-retry");
    for (let i = 0; i < 3; i++) await answerChoice(i);
    for (let i = 0; i < 2; i++) await page.fill("#reading-answer-" + (i + 3), blanks[i][1]);
    await page.locator('#reading-quiz button[type="submit"]').click();
    assert.match(await page.locator("#reading-result").innerText(), /5 \/ 6 2 星/);

    await page.click("#reading-retry");
    for (let i = 0; i < 3; i++) await answerChoice(i);
    for (let i = 0; i < 3; i++) await page.fill("#reading-answer-" + (i + 3), blanks[i][1]);
    await page.locator('#reading-quiz button[type="submit"]').click();
    assert.match(await page.locator("#reading-result").innerText(), /6 \/ 6 3 星/);
    assert.equal(await page.evaluate(() => readingStars(199, 200)), 2);

    await page.click("#reading-retry");
    await page.locator('#reading-quiz button[type="submit"]').click();
    assert.match(await page.locator("#reading-result").innerText(), /0 \/ 6 1 星/);
    await page.reload();
    await goReading();
    assert.match(await dailyGroup.innerText(), /最佳成绩 6 \/ 6 3 星/);
    await openDaily();
    assert.match(await page.locator("#reading-result").innerText(), /0 \/ 6 1 星.*6 \/ 6 3 星/s);
    assert.doesNotMatch(await page.locator("main").innerText(), /[★☆·]/);
    await page.selectOption("#language", "en");
    assert.match(await page.locator("#reading-result").innerText(), /0 \/ 6 1 of 3 stars.*6 \/ 6 3 of 3 stars/s);
    stored = await readSaved();
    assert.ok(stored.mastered.includes(daily[38]));
    assert.ok(!stored.mastered.includes(daily[39]));
    assert.deepEqual(stored.assessment, baseline.assessment);
    assert.equal(stored.attempts, baseline.attempts);
    assert.equal(stored.correct, baseline.correct);

    for (const width of [320, 375]) {
      await page.setViewportSize({ width, height: 800 });
      for (const language of ["en", "zh"]) {
        await page.selectOption("#language", language);
        for (const check of [goReading, openDaily]) {
          await check();
          assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
        }
      }
    }

    // Completing another group from spelling can also offer the immediate reading prompt.
    await page.evaluate(() => {
      const group = readingById.get("work-1");
      saved.mastered.push(...group.words.slice(0, 39).map((word) => wordId({ ...word, theme: "work" })));
      saved.wrong = saved.wrong.filter((id) => id !== "work:deadline");
      persist();
    });
    await page.click('nav [data-page="spelling"]');
    await page.selectOption("#theme", "work");
    await page.evaluate(() => {
      index = currentList.findIndex((word) => word.word === "deadline");
      render();
    });
    await page.fill("#guess", "deadline");
    await page.locator("#answer button").click();
    assert.match(await page.locator(".reading-notice").innerText(), /可以去阅读这篇短文了/);
    await page.locator('.reading-notice [data-read="work-1"]').click();
    assert.match(await page.locator("h1").innerText(), /星期五之前/);
    // Explicit review counts as coverage and adds a mistake without marking the word learned.
    await goReading();
    await page.click('[data-group="industrial-2"] [data-group-start]');
    await page.click("#review");
    assert.match(await page.locator(".card-group-status").innerText(), /1 \/ 40/);
    stored = await readSaved();
    assert.ok(stored.wrong.includes("industrial:pump"));
    assert.ok(!stored.mastered.includes("industrial:pump"));

    // Every passage renders and every authored answer can be selected or entered.
    await page.evaluate(() => {
      saved.mastered = words.map(wordId);
      persist();
    });
    for (const id of groups) {
      await goReading();
      await page.click(`[data-group="${id}"] [data-read]`);
      assert.equal(await page.locator(".reading-word").count(), 40);
      if (await page.locator("#reading-retry").count()) await page.click("#reading-retry");
      const { choices, blanks } = passages[id];
      for (let i = 0; i < 3; i++) {
        await page.locator("fieldset").nth(i)
          .getByRole("radio", { name: choices[i][1], exact: true }).check();
        await page.fill("#reading-answer-" + (i + 3), blanks[i][1]);
      }
      await page.locator('#reading-quiz button[type="submit"]').click();
      assert.match(await page.locator("#reading-result").innerText(), /6 \/ 6 3 星/);
    }
    assert.deepEqual(errors, []);
    console.log("PASS: legacy coverage, group navigation, next/skip/master, unlock prompt, glosses, draft and result persistence, retries, stars, assessment isolation, bilingual and mobile layouts.");
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
