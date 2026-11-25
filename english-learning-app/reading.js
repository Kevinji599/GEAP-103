"use strict";

const READING_GROUP_SIZE = 40;
const readingGroups = themes.flatMap((category) =>
  Array.from({ length: category.words.length / READING_GROUP_SIZE }, (_, number) => {
    const id = category.id + "-" + (number + 1);
    const start = number * READING_GROUP_SIZE;
    return {
      id, category, number,
      words: category.words.slice(start, start + READING_GROUP_SIZE),
      ...window.WORDSPRING_READINGS[id],
    };
  }),
);
const readingById = new Map(readingGroups.map((group) => [group.id, group]));
const readingByWord = new Map(readingGroups.flatMap((group) =>
  group.words.map((word) => [wordId({ ...word, theme: group.category.id }), group]),
));

let cardGroupNumber = 0;
let openReading = null;
let unlockedNotice = null;

function coveredWords() {
  const covered = new Set([...saved.mastered, ...saved.wrong, ...(saved.covered || [])]);
  for (const mode of ["spelling", "dictation"]) {
    for (const [id, value] of Object.entries(saved.assessment?.[mode] || {})) {
      if (typeof value === "boolean") covered.add(id);
    }
  }
  return covered;
}

function readingCoverage(group) {
  const covered = coveredWords();
  return group.words.filter((word) =>
    covered.has(wordId({ ...word, theme: group.category.id })),
  ).length;
}

function readingUnlocked(group) {
  return readingCoverage(group) === READING_GROUP_SIZE;
}

function checkReadingUnlock(group, wasUnlocked) {
  if (wasUnlocked || !readingUnlocked(group)) return false;
  unlockedNotice = group.id;
  return true;
}

function cardGroup() {
  return readingById.get(theme + "-" + (cardGroupNumber + 1));
}

function groupLabel(group) {
  const category = group.category;
  return tr(
    `${category.nameZh} 第 ${group.number + 1} 组`,
    `${category.name} Group ${group.number + 1}`,
  );
}

function cardGroupControls() {
  const groups = readingGroups.filter((group) => group.category.id === theme);
  const group = groups[cardGroupNumber];
  const picker = groups.length > 1
    ? `<label for="card-group">${tr("词汇分组", "Vocabulary group")}</label>
       <select id="card-group">${groups.map((item) =>
         `<option value="${item.number}" ${item === group ? "selected" : ""}>${esc(groupLabel(item))}</option>`,
       ).join("")}</select>`
    : "";
  return `<div class="card-group-status">${picker}
    <p class="muted">${tr("本组学习覆盖", "Group coverage")} ${readingCoverage(group)} / ${READING_GROUP_SIZE}</p>
  </div>`;
}

function readingNotice() {
  if (!unlockedNotice) return "";
  return `<section class="panel reading-notice">
    <h2 role="status">${tr("可以去阅读这篇短文了", "Your reading is ready")}</h2>
    <p>${esc(tr(...readingById.get(unlockedNotice).title))}</p>
    <div class="controls">
      <button class="btn" data-read="${unlockedNotice}">${tr("开始阅读", "Start reading")}</button>
      <button id="reading-later">${tr("稍后再读", "Read later")}</button>
    </div>
  </section>`;
}

function updateReadingNotice() {
  $("#reading-notice").innerHTML = readingNotice();
  $("#reading-later")?.addEventListener("click", () => {
    unlockedNotice = null;
    updateReadingNotice();
    $("#next")?.focus();
  });
}

function completeCard(action) {
  const group = cardGroup();
  const id = wordId({ ...group.words[index], theme });
  const wasUnlocked = readingUnlocked(group);
  saved.covered = unique([...(saved.covered || []), id]);
  if (action === "master") {
    saved.mastered = unique([...saved.mastered, id]);
    saved.wrong = saved.wrong.filter((word) => word !== id);
  }
  if (action === "review") {
    saved.mastered = saved.mastered.filter((word) => word !== id);
    saved.wrong = unique([...saved.wrong, id]);
  }
  const newlyUnlocked = checkReadingUnlock(group, wasUnlocked);
  persist();
  next();
  $(newlyUnlocked ? ".reading-notice [data-read]" : "#" + action)?.focus();
}

function readingStars(score, total) {
  if (score === total) return 3;
  return score * 2 >= total ? 2 : 1;
}

function readingScore(score, total) {
  const stars = readingStars(score, total);
  return `${score} / ${total} <span class="reading-rating">${tr(
    `${stars} 星`,
    `${stars} of 3 stars`,
  )}</span>`;
}

function readingIndex() {
  return `<h1 tabindex="-1">${tr("阅读复习", "Reading review")}</h1>
    <p class="lead">${tr(
      "标记已掌握、稍后复习或跳过，也可以通过拼写和听写提交答案。学完每组 40 个词后，即可阅读短文并做练习。",
      "Mark cards as learned, review later, or skip. Submitting a spelling or dictation answer also counts. Cover all 40 words to unlock the passage and its quiz.",
    )}</p>
    <div class="grid reading-grid">${readingGroups.map((group) => {
      const coverage = readingCoverage(group);
      const unlocked = coverage === READING_GROUP_SIZE;
      const record = saved.reading?.[group.id];
      const total = group.choices.length + group.blanks.length;
      return `<section class="panel reading-group" data-group="${group.id}">
        <p class="muted">${esc(groupLabel(group))}</p>
        <h2>${esc(tr(...group.title))}</h2>
        <p class="reading-status"><strong>${coverage} / ${READING_GROUP_SIZE}</strong> <span>${unlocked
          ? tr("已解锁", "Unlocked") : tr("未解锁", "Locked")}</span></p>
        <progress max="${READING_GROUP_SIZE}" value="${coverage}"
          aria-label="${esc(groupLabel(group))}"></progress>
        ${record?.best !== undefined
          ? `<p>${tr("最佳成绩", "Best score")} ${readingScore(record.best, total)}</p>`
          : ""}
        <div class="controls">${unlocked
          ? `<button class="btn" data-read="${group.id}">${tr("开始阅读", "Start reading")}</button>`
          : `<button data-go="cards" data-group-start="${group.id}">${tr("学习本组词汇", "Study this group")}</button>`}
        </div>
      </section>`;
    }).join("")}</div>`;
}

function passageHtml(group) {
  const lookup = new Map(group.words.map((word) => [word.word.toLowerCase(), word]));
  return group.text.split("\n\n").map((paragraph, paragraphIndex) => {
    const parts = paragraph.split(/\[([^\]]+)\]/g);
    return "<p>" + parts.map((part, i) => {
      if (i % 2 === 0) return esc(part);
      const [surface, entry = surface] = part.split("|");
      const word = lookup.get(entry.toLowerCase());
      const gloss = `gloss-${paragraphIndex}-${i}`;
      return `<button type="button" class="reading-word" data-gloss="${gloss}"
        aria-expanded="false" aria-controls="${gloss}">${esc(surface)}</button><span
        class="reading-gloss" id="${gloss}" hidden><span lang="zh-CN">${esc(word.zh)}</span>
        ${posBadge(word)}</span>`;
    }).join("") + "</p>";
  }).join("");
}

function readingQuestions(group) {
  return [
    ...group.choices.map(([prompt, answer, distractorA, distractorB, zh, en], i) => {
      const options = [distractorA, distractorB];
      const position = (i + readingGroups.indexOf(group)) % 3;
      options.splice(position, 0, answer);
      return { prompt, answer, zh, en, options };
    }),
    ...group.blanks.map(([prompt, answer, zh, en]) => ({ prompt, answer, zh, en })),
  ];
}

function normalizeReadingAnswer(value) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function quizField(question, i, answers, submitted) {
  const { prompt, answer, options, zh, en } = question;
  const name = "reading-answer-" + i;
  const value = answers[i] || "";
  const correct = normalizeReadingAnswer(value) === normalizeReadingAnswer(answer);
  const control = options
    ? options.map((option) => `<label class="reading-choice">
        <input type="radio" name="${name}" data-answer="${i}" value="${esc(option)}"
          ${option === value ? "checked" : ""}> <span lang="en">${esc(option)}</span>
      </label>`).join("")
    : `<input type="text" id="${name}" data-answer="${i}" value="${esc(value)}"
        aria-labelledby="${name}-prompt" lang="en" autocomplete="off" autocapitalize="off" spellcheck="false">`;
  return `<fieldset ${submitted ? "disabled" : ""}>
    <legend id="${name}-prompt" lang="en">${i + 1}. ${esc(prompt)}</legend>
    ${control}
    ${submitted ? `<div class="reading-explanation">
      <p class="${correct ? "good" : "bad"}">${correct ? tr("正确", "Correct") : tr("错误", "Incorrect")}
        <span class="reading-correct-answer">${tr("正确答案", "Correct answer")} <strong lang="en">${esc(answer)}</strong></span></p>
      <p lang="zh-CN">${esc(zh)}</p><p lang="en">${esc(en)}</p>
    </div>` : ""}
  </fieldset>`;
}

function reading() {
  if (!openReading || !readingUnlocked(openReading)) return readingIndex();
  const group = openReading;
  const record = saved.reading?.[group.id] || {};
  const submitted = record.latest !== undefined;
  const questions = readingQuestions(group);
  return `<button data-page="reading">${tr("返回阅读列表", "Back to readings")}</button>
    <p class="muted">${esc(groupLabel(group))}</p>
    <h1 tabindex="-1">${esc(tr(...group.title))}</h1>
    <p class="lead">${tr("点击高亮词汇查看中文释义与词性。", "Select a highlighted word for its Chinese meaning and part of speech.")}</p>
    <article lang="en" class="panel reading-passage">${passageHtml(group)}</article>
    <form id="reading-quiz" class="panel">
      <h2>${tr("阅读练习", "Reading quiz")}</h2>
      <p>${tr("共 6 题，每题 1 分。填空请使用短文中的英文。", "Six questions, one point each. Use words from the passage to fill the gaps.")}</p>
      ${submitted ? `<div id="reading-result" tabindex="-1" role="status">
        <p><strong>${tr("本次成绩", "This score")} ${readingScore(record.latest, questions.length)}</strong></p>
        <p>${tr("最佳成绩", "Best score")} ${readingScore(record.best, questions.length)}</p>
      </div>` : ""}
      <h3>${tr("阅读理解", "Reading comprehension")}</h3>
      ${questions.slice(0, 3).map((question, i) => quizField(question, i, record.draft || {}, submitted)).join("")}
      <h3>${tr("填空", "Fill in the blanks")}</h3>
      ${questions.slice(3).map((question, i) => quizField(question, i + 3, record.draft || {}, submitted)).join("")}
      ${submitted
        ? `<button type="button" class="btn" id="reading-retry">${tr("重新练习", "Try again")}</button>`
        : `<button type="submit" class="btn">${tr("提交答案", "Submit answers")}</button>`}
    </form>`;
}

function bindReading() {
  updateReadingNotice();
  const form = $("#reading-quiz");
  if (!form) return;
  document.querySelectorAll("[data-gloss]").forEach((button) => {
    button.onclick = () => {
      const gloss = document.getElementById(button.dataset.gloss);
      gloss.hidden = !gloss.hidden;
      button.setAttribute("aria-expanded", String(!gloss.hidden));
    };
  });
  const group = openReading;
  function record() {
    saved.reading ??= {};
    return (saved.reading[group.id] ??= { draft: {} });
  }
  form.oninput = ({ target }) => {
    if (target.dataset.answer === undefined || record().latest !== undefined) return;
    record().draft[target.dataset.answer] = target.value;
    persist();
  };
  form.onsubmit = (event) => {
    event.preventDefault();
    const result = record();
    if (result.latest !== undefined) return;
    const questions = readingQuestions(group);
    result.latest = questions.filter((question, i) =>
      normalizeReadingAnswer(result.draft[i] || "") === normalizeReadingAnswer(question.answer),
    ).length;
    result.best = Math.max(result.best ?? 0, result.latest);
    persist();
    render();
    $("#reading-result").focus();
  };
  $("#reading-retry")?.addEventListener("click", () => {
    const result = record();
    delete result.latest;
    result.draft = {};
    persist();
    render();
    $("#reading-quiz input").focus();
  });
}

render();
