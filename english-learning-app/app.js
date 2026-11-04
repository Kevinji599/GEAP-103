"use strict";
const LANGUAGE_KEY = "wordspring-language";
let language = "zh";
try {
  language = localStorage.getItem(LANGUAGE_KEY) === "en" ? "en" : "zh";
} catch {}
const tr = (zh, en) => (language === "zh" ? zh : en);
const grammarEnglish = [
  "She is third-person singular, so use goes in the present simple.",
  "Yesterday refers to the past, so use finished.",
  "Use are with they to form the present continuous.",
  "Apple starts with a vowel sound, so use an.",
  "Use the comparative larger before than.",
  "Tomorrow refers to the future: will + base verb.",
  "Use the base verb like after doesn\u2019t.",
  "Two books is plural, so use are.",
  "Use since before a starting point in time.",
  "The comparative of slowly is more slowly.",
  "First conditional: if + present simple, then will + base verb.",
  "The fixed expression is be interested in.",
];
function updateChrome() {
  document.documentElement.lang = language === "zh" ? "zh-CN" : "en";
  document.title = tr(
    "WordSpring · 英语成长计划",
    "WordSpring · Learn English",
  );
  const labels = {
    home: ["首页", "Home"],
    cards: ["词汇卡片", "Flashcards"],
    spelling: ["拼写挑战", "Spelling"],
    dictation: ["单词听写", "Dictation"],
    grammar: ["语法测验", "Grammar"],
    progress: ["学习进度", "Progress"],
  };
  document
    .querySelectorAll("nav button")
    .forEach((b) => (b.textContent = tr(...labels[b.dataset.page])));
  document.querySelector("footer").textContent = tr(
    "WordSpring · 中英双语英语学习 · 无需账号或 API 密钥",
    "WordSpring · English for Chinese-speaking learners · No account or API key required",
  );
  document.querySelector("#language-label").textContent = tr(
    "界面语言",
    "UI language",
  );
  document.querySelector("#language").value = language;
}

const AI_FEEDBACK_ENDPOINT = null; // Future secure server-side proxy. Never store an API key in browser code.
const themes = window.WORDSPRING_DATA || [];
const words = themes.flatMap((t) =>
  t.words.map((w) => ({ ...w, theme: t.id })),
);
const KEY = "wordspring-progress-v1";
let saved = { mastered: [], wrong: [], correct: 0, attempts: 0 };
try {
  const v = JSON.parse(localStorage.getItem(KEY) || "{}");
  if (v && typeof v === "object") saved = { ...saved, ...v };
} catch {}
const unique = (a) => [...new Set(a)];
saved.mastered = unique(saved.mastered || []);
saved.wrong = unique(saved.wrong || []);
let lastFeedback = null;
let theme = "daily",
  index = 0,
  revealed = false,
  answered = false,
  currentPage = "home",
  currentList = [],
  currentQuiz = 0;
const $ = (s) => document.querySelector(s);
const esc = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const active = () => {
  const t = themes.find((t) => t.id === theme);
  return t ? t.words : [];
};
function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(saved));
  } catch {}
}
function speaker(s) {
  if (!("speechSynthesis" in window)) {
    alert(
      tr(
        "此浏览器不支持语音朗读。",
        "This browser does not support speech playback.",
      ),
    );
    return;
  }
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(s);
  u.lang = "en-US";
  u.rate = 0.84;
  speechSynthesis.speak(u);
}
function randomList() {
  const list = active().map((w) => ({ ...w, theme }));
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}
function choose(id) {
  lastFeedback = null;
  theme = id;
  index = 0;
  answered = false;
  revealed = false;
  currentList = [];
  render();
}
function selector() {
  return (
    '<label for="theme">' +
    tr("选择分类：", "Choose a category:") +
    '</label><select id="theme">' +
    themes
      .map(
        (t) =>
          '<option value="' +
          t.id +
          '" ' +
          (t.id === theme ? "selected" : "") +
          ">" +
          esc(t.emoji + " " + (language === "zh" ? t.nameZh : t.name)) +
          "</option>",
      )
      .join("") +
    "</select>"
  );
}
function box(title, body) {
  return (
    '<div class="eyebrow">WORDSPRING · A2–B1</div><h1>' +
    title +
    '</h1><p class="lead">' +
    body +
    "</p>" +
    selector()
  );
}
function wordId(w) {
  return w.theme + ":" + w.word;
}
function tally(correct, w) {
  recordSkill(currentPage, wordId(w), correct);
  saved.attempts++;
  if (correct) {
    saved.correct++;
    saved.wrong = saved.wrong.filter((x) => x !== wordId(w));
  } else {
    saved.wrong = unique([...saved.wrong, wordId(w)]);
  }
  persist();
}
function categoryTiles() {
  return (
    "<h2>" +
    tr("按分类学习", "Browse categories") +
    '</h2><div class="grid">' +
    themes
      .map(
        (t) =>
          '<button class="tile" data-go="cards" data-theme="' +
          t.id +
          '"><span>' +
          t.emoji +
          "</span><strong>" +
          esc(language === "zh" ? t.nameZh : t.name) +
          "</strong><small>" +
          t.words.length +
          tr(" 个词条", " entries") +
          "</small></button>",
      )
      .join("") +
    "</div>"
  );
}
function home() {
  return (
    '<section class="hero"><div class="eyebrow">LEARN ENGLISH, ONE WORD AT A TIME</div><h1>' +
    tr(
      "让每个单词，成为进步的一步。",
      "Grow your English, one word at a time.",
    ) +
    '</h1><p class="lead">' +
    tr(
      "为中文学习者设计的英语学习 App。400 个不同词汇，9 个实用分类，重点加入医疗与工业用语。练习、听写、复习，不用注册。",
      "Practical English for Chinese-speaking learners. 400 distinct words across 9 categories, including healthcare and industry. Practice without an account.",
    ) +
    '</p><button class="btn" data-go="cards">' +
    tr("开始学习 →", "Start learning \u2192") +
    '</button></section><div class="stats"><div class="stat"><small>' +
    tr("总词汇", "Distinct words") +
    "</small><strong>" +
    new Set(words.map((w) => w.word.toLowerCase())).size +
    '</strong></div><div class="stat"><small>' +
    tr("已掌握", "Learned entries") +
    "</small><strong>" +
    saved.mastered.length +
    '</strong></div><div class="stat"><small>' +
    tr("练习正确率", "Practice accuracy") +
    "</small><strong>" +
    (saved.attempts ? Math.round((saved.correct / saved.attempts) * 100) : 0) +
    "%</strong></div></div><h2>" +
    tr("选择学习方式", "Choose an activity") +
    '</h2><div class="grid">' +
    [
      [
        "cards",
        "📚",
        tr("词汇卡片", "Flashcards"),
        tr("翻卡学习，标记掌握", "Flip cards and track learned words"),
      ],
      [
        "spelling",
        "✍️",
        tr("拼写挑战", "Spelling challenge"),
        tr("中文提示，自己拼写", "Spell words from Chinese prompts"),
      ],
      [
        "dictation",
        "🎧",
        tr("单词听写", "Dictation"),
        tr("听英文发音后默写", "Listen and type what you hear"),
      ],
      [
        "grammar",
        "🧠",
        tr("语法测验", "Grammar quiz"),
        tr("A2–B1 语法题与解释", "A2\u2013B1 questions and explanations"),
      ],
    ]
      .map(
        (v) =>
          '<button class="tile" data-go="' +
          v[0] +
          '"><span>' +
          v[1] +
          "</span><strong>" +
          v[2] +
          "</strong><small>" +
          v[3] +
          "</small></button>",
      )
      .join("") +
    "</div>" +
    categoryTiles()
  );
}
const partsOfSpeech = {
  "n.": ["名词", "Noun"],
  "v.": ["动词", "Verb"],
  "adj.": ["形容词", "Adjective"],
  "n. phr.": ["名词短语", "Noun phrase"],
};
function posBadge(w) {
  return (
    '<span class="pos">' +
    esc(w.pos) +
    " " +
    esc(tr(...partsOfSpeech[w.pos])) +
    "</span>"
  );
}
function wordWithPos(w) {
  return esc(w.word) + posBadge(w);
}
function posNote() {
  return (
    '<p class="muted pos-note">' +
    tr(
      "词性按当前释义与例句标注：n. 名词 · v. 动词 · adj. 形容词 · n. phr. 名词短语。",
      "Parts of speech match the meaning and example shown: n. noun · v. verb · adj. adjective · n. phr. noun phrase.",
    ) +
    "</p>"
  );
}
function renderFeedback() {
  if (!lastFeedback || !$("#feedback")) return;
  const f = lastFeedback;
  const correctAnswer = f.kind === "word" ? f.w.word : f.q[1][f.q[2]];
  const details =
    f.kind === "word"
      ? "<p>" +
        wordWithPos(f.w) +
        '</p><p class="muted">' +
        esc(f.w.zh) +
        " · " +
        esc(f.w.example) +
        "</p>"
      : '<p class="muted">' +
        esc(tr(f.q[3], grammarEnglish[currentQuiz % questions.length])) +
        "</p>";
  $("#feedback").innerHTML =
    '<p class="' +
    (f.right ? "good" : "bad") +
    '">' +
    (f.right
      ? tr("✓ 正确！", "✓ Correct!")
      : tr("✗ 正确答案：", "✗ Correct answer: ") + esc(correctAnswer)) +
    "</p>" +
    details;
}
function cards() {
  const ws = active();
  if (!ws.length) return "No words.";
  index %= ws.length;
  const w = ws[index];
  return (
    box(
      tr("词汇卡片", "Flashcards"),
      tr(
        "点击卡片查看中文含义与例句。可标记已掌握或继续复习。",
        "Flip a card for its Chinese meaning and example. Mark it as learned or review it later.",
      ),
    ) +
    posNote() +
    '<div class="panel"><div class="muted">' +
    (index + 1) +
    " / " +
    ws.length +
    '</div><button class="card' +
    (revealed ? " is-flipped" : "") +
    '" id="flip" aria-pressed="' +
    revealed +
    '" aria-label="' +
    tr("翻转词汇卡片", "Flip vocabulary card") +
    '">' +
    '<span class="card-inner"><span class="card-face card-front" aria-hidden="' +
    revealed +
    '"><span class="muted">' +
    tr("点击翻卡", "TAP TO FLIP") +
    "</span><strong>" +
    wordWithPos(w) +
    '</strong><span class="muted">' +
    tr("点击查看释义与例句", "Tap for meaning and example") +
    '</span></span><span class="card-face card-back" aria-hidden="' +
    !revealed +
    '"><span class="muted">' +
    esc(w.zh) +
    "</span><strong>" +
    wordWithPos(w) +
    "</strong><span>" +
    esc(w.example) +
    "</span></span></span>" +
    '</button><div class="controls"><button id="speak">' +
    tr("🔊 发音", "\ud83d\udd0a Pronounce") +
    '</button><button id="review">' +
    tr("稍后复习", "Review later") +
    '</button><button id="master">✓ ' +
    tr("已掌握", "Learned entries") +
    '</button><button id="next">' +
    tr("下一张 →", "Next card \u2192") +
    "</button></div></div>"
  );
}
function game(kind) {
  if (!currentList.length) currentList = randomList();
  const w = currentList[index % currentList.length];
  const dict = kind === "dictation";
  return (
    box(
      dict ? tr("单词听写", "Dictation") : tr("拼写挑战", "Spelling challenge"),
      dict
        ? tr(
            "听单词发音，然后默写正确的英文。",
            "Listen to the word, then type it in English.",
          )
        : tr(
            "根据中文释义，拼写正确的英语单词。",
            "Read the Chinese meaning and spell the English word.",
          ),
    ) +
    posNote() +
    '<div class="panel"><div class="muted">' +
    tr("题目", "Question") +
    " " +
    (index + 1) +
    " / " +
    currentList.length +
    "</div><h2>" +
    (dict
      ? "" + tr("🎧 听一听", "\ud83c\udfa7 Listen") + ""
      : esc(w.zh) + posBadge(w)) +
    "</h2>" +
    (dict
      ? '<button id="speak">' +
        tr("🔊 播放单词", "\ud83d\udd0a Play word") +
        "</button>"
      : "") +
    '<p class="muted">' +
    (dict
      ? tr("可重复播放", "Play as often as needed")
      : tr(
          "提示：单词共 " + w.word.length + " 个字符（包括空格）",
          "Hint: " + w.word.length + " characters (including spaces)",
        )) +
    '</p><form id="answer"><input id="guess" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="' +
    tr("英文答案", "English answer") +
    '" placeholder="' +
    tr("输入英文单词", "Type the English word") +
    '" ' +
    (answered ? "disabled" : "") +
    ' required><button class="btn" ' +
    (answered ? "disabled" : "") +
    ">" +
    tr("检查答案", "Check answer") +
    '</button></form><div id="feedback" role="status"></div><div class="controls"><button id="next">' +
    tr("下一题 →", "Next question \u2192") +
    "</button></div></div>"
  );
}
const questions = [
  [
    "She ___ to school every day.",
    ["go", "goes", "going"],
    1,
    "She 是第三人称单数，一般现在时用 goes。",
  ],
  [
    "I ___ my homework yesterday.",
    ["finish", "finished", "will finish"],
    1,
    "Yesterday 表示过去，使用一般过去时 finished。",
  ],
  [
    "They ___ studying right now.",
    ["are", "is", "be"],
    0,
    "They 搭配 are，构成现在进行时。",
  ],
  [
    "There is ___ apple on the desk.",
    ["a", "an", "the"],
    1,
    "Apple 以元音音素开头，使用 an。",
  ],
  [
    "My room is ___ than yours.",
    ["large", "larger", "largest"],
    1,
    "Than 前通常用比较级 larger。",
  ],
  [
    "We ___ visit the museum tomorrow.",
    ["will", "did", "were"],
    0,
    "Tomorrow 表示将来，will + 动词原形。",
  ],
  [
    "He doesn't ___ coffee.",
    ["likes", "like", "liked"],
    1,
    "Doesn't 后使用动词原形 like。",
  ],
  [
    "There ___ two books on the table.",
    ["is", "are", "was"],
    1,
    "Two books 是复数，使用 are。",
  ],
  [
    "I have lived here ___ 2022.",
    ["for", "since", "at"],
    1,
    "Since 后接时间起点。",
  ],
  [
    "Could you speak ___, please?",
    ["more slowly", "slowerly", "most slow"],
    0,
    "Slowly 的比较级是 more slowly。",
  ],
  [
    "If it rains, we ___ at home.",
    ["stay", "will stay", "stayed"],
    1,
    "第一类条件句：if + 一般现在时，主句 will + 动词原形。",
  ],
  [
    "She is interested ___ science.",
    ["on", "in", "at"],
    1,
    "固定搭配：be interested in。",
  ],
];
function grammar() {
  const q = questions[currentQuiz % questions.length];
  return (
    '<div class="eyebrow">WORDSPRING · GRAMMAR</div><h1>' +
    tr("语法测验", "Grammar quiz") +
    '</h1><p class="lead">' +
    tr(
      "12 道 A2–B1 语法选择题。",
      "12 A2\u2013B1 multiple-choice grammar questions.",
    ) +
    '</p><div class="panel"><div class="muted">' +
    tr("题目", "Question") +
    " " +
    (currentQuiz + 1) +
    " / " +
    questions.length +
    "</div><h2>" +
    esc(q[0]) +
    '</h2><div class="options">' +
    q[1]
      .map(
        (a, i) =>
          '<button class="option" data-option="' +
          i +
          '" ' +
          (answered ? "disabled" : "") +
          ">" +
          esc(a) +
          "</button>",
      )
      .join("") +
    '</div><div id="feedback" role="status"></div><button id="next">' +
    tr("下一题 →", "Next question \u2192") +
    "</button></div>"
  );
}
// Only recorded answers count toward the estimate; self-marked flashcards do not.
function recordSkill(mode, id, correct) {
  if (
    !saved.assessment ||
    typeof saved.assessment !== "object" ||
    Array.isArray(saved.assessment)
  )
    saved.assessment = {};
  if (
    !saved.assessment[mode] ||
    typeof saved.assessment[mode] !== "object" ||
    Array.isArray(saved.assessment[mode])
  )
    saved.assessment[mode] = {};
  saved.assessment[mode][id] = correct;
}
function assessmentSummary() {
  const validWords = new Set(words.map(wordId));
  const records = (mode) =>
    Object.entries(saved.assessment?.[mode] || {}).filter(
      ([id, value]) =>
        typeof value === "boolean" &&
        (mode === "grammar"
          ? /^(?:[0-9]|1[01])$/.test(id)
          : validWords.has(id)),
    );
  const spelling = records("spelling"),
    dictation = records("dictation"),
    grammar = records("grammar");
  const rate = (entries) =>
    entries.length
      ? entries.filter(([, correct]) => correct).length / entries.length
      : null;
  const sp = rate(spelling),
    di = rate(dictation),
    gr = rate(grammar);
  const categories = new Set(
    [...spelling, ...dictation].map(([id]) => id.split(":")[0]),
  ).size;
  const weight =
    (sp === null ? 0 : 0.35) +
    (di === null ? 0 : 0.35) +
    (gr === null ? 0 : 0.3);
  const score = weight
    ? Math.round(
        (((sp || 0) * 0.35 + (di || 0) * 0.35 + (gr || 0) * 0.3) / weight) *
          100,
      )
    : null;
  const ready =
    spelling.length >= 20 &&
    dictation.length >= 20 &&
    grammar.length >= 8 &&
    categories >= 3;
  // A small, authored A2–B1 practice bank cannot establish full CEFR proficiency.
  const balanced = ready ? Math.min(sp, di, gr) * 100 : null;
  const level = !ready
    ? tr("资料不足，暂不估计", "More evidence needed")
    : balanced >= 85
      ? tr("接近 B1 练习目标", "Approaching B1 practice target")
      : balanced >= 70
        ? tr("A2 巩固阶段", "Consolidating A2")
        : balanced >= 45
          ? tr("A2 学习阶段", "Developing A2")
          : tr("A1 基础巩固阶段", "Building A1 foundations");
  return {
    spelling,
    dictation,
    grammar,
    sp,
    di,
    gr,
    categories,
    score,
    ready,
    level,
  };
}
function assessmentPanel() {
  const a = assessmentSummary();
  const skill = (title, entries, rate) =>
    '<div class="skill-score"><strong>' +
    title +
    "</strong><span>" +
    (rate === null ? "—" : Math.round(rate * 100) + "%") +
    "</span><small>" +
    entries.length +
    tr(" 道不同题目", " distinct items") +
    "</small></div>";
  return (
    '<section class="panel assessment" aria-labelledby="assessment-title"><div class="eyebrow">' +
    tr("练习表现", "PRACTICE PERFORMANCE") +
    '</div><h2 id="assessment-title">' +
    tr("学习评分与参考水平", "Score & estimated level") +
    '</h2><div class="score-number">' +
    (a.score === null ? "—" : a.score) +
    '<small> / 100</small></div><p class="level-estimate">' +
    tr("参考水平：", "Estimated level: ") +
    a.level +
    '</p><p class="muted">' +
    tr(
      "仅供本应用练习参考，非正式英语等级测评。",
      "Practice indicator for this app, not a formal English proficiency assessment.",
    ) +
    '</p><div class="skill-scores">' +
    skill(tr("拼写", "Spelling"), a.spelling, a.sp) +
    skill(tr("听写", "Dictation"), a.dictation, a.di) +
    skill(tr("语法", "Grammar"), a.grammar, a.gr) +
    "</div><p>" +
    tr("覆盖分类：", "Categories covered: ") +
    a.categories +
    " / " +
    themes.length +
    "</p>" +
    (!a.ready
      ? '<p class="assessment-guidance">' +
        tr(
          "完成至少 20 道不同拼写题、20 道不同听写题、8 道不同语法题，词汇覆盖至少 3 个分类后显示参考水平。",
          "Complete at least 20 distinct spelling items, 20 dictation items and 8 grammar items across at least 3 vocabulary categories to see an estimate.",
        ) +
        "</p>"
      : "") +
    "<details><summary>" +
    tr("评分依据与范围", "How this estimate works") +
    "</summary><p>" +
    tr(
      "评分按拼写 35%、听写 35%、语法 30% 加权；未练习的项目暂不计入。每道题只采用最近一次答案，重复同题不会增加覆盖量。参考阶段取三项中较弱的一项：85% 起接近 B1 练习目标，70% 起 A2 巩固，45% 起 A2 学习，其余为 A1 基础巩固。",
      "Score weights: spelling 35%, dictation 35%, grammar 30%; unpractised skills are temporarily excluded. Only the latest answer to each distinct item counts. The weakest skill sets the practice band: 85%+ approaching B1, 70%+ consolidating A2, 45%+ developing A2, otherwise building A1 foundations.",
    ) +
    "</p><p>" +
    tr(
      "这是本应用词汇和基础语法的粗略练习参考，并非正式 CEFR 测评，无法衡量完整阅读、自然听力、口语和写作能力。旧版总答题次数及手动标记掌握不计入水平估计。",
      "This is a rough indicator of performance on this app’s vocabulary and basic grammar, not a validated CEFR assessment. Full reading, natural listening, speaking and writing are not assessed. Historical aggregate attempts and self-marked flashcards are excluded.",
    ) +
    "</p></details></section>"
  );
}
function progress() {
  const pct = Math.round((saved.mastered.length / words.length) * 100),
    wrong = words.filter((w) => saved.wrong.includes(wordId(w)));
  return (
    '<div class="eyebrow">WORDSPRING · LEARNING RECORD</div><h1>' +
    tr("学习进度", "Progress") +
    '</h1><div class="stats"><div class="stat"><small>' +
    tr("已掌握词条", "Learned entries") +
    "</small><strong>" +
    saved.mastered.length +
    " / " +
    words.length +
    '</strong></div><div class="stat"><small>' +
    tr("答题次数", "Attempts") +
    "</small><strong>" +
    saved.attempts +
    '</strong></div><div class="stat"><small>' +
    tr("答题正确率", "Answer accuracy") +
    "</small><strong>" +
    (saved.attempts ? Math.round((saved.correct / saved.attempts) * 100) : 0) +
    "%</strong></div></div>" +
    assessmentPanel() +
    '<div class="panel"><h2>' +
    tr("词汇掌握进度 ", "Vocabulary progress ") +
    "" +
    pct +
    '%</h2><div class="bar"><div style="width:' +
    pct +
    '%"></div></div><p class="muted">' +
    tr(
      "数据保存在当前浏览器中，不会上传服务器。",
      "Progress is stored in this browser and is not uploaded.",
    ) +
    "</p></div><h2>" +
    tr("错题复习 · ", "Review mistakes \u00b7 ") +
    "" +
    wrong.length +
    '</h2><div class="panel">' +
    (wrong.length
      ? wrong
          .map(
            (w) =>
              '<span class="pill">' +
              wordWithPos(w) +
              " · " +
              esc(w.zh) +
              "</span>",
          )
          .join("")
      : "" +
        tr("暂无错题，继续保持！", "No mistakes to review. Keep going!") +
        "") +
    '</div><button id="reset">' +
    tr("清除本地学习进度", "Clear local progress") +
    "</button>"
  );
}
function next() {
  lastFeedback = null;
  index = (index + 1) % active().length;
  answered = false;
  revealed = false;
  render();
}
function render() {
  updateChrome();
  const main = $("#main");
  main.innerHTML = (
    {
      home,
      cards,
      spelling: () => game("spelling"),
      dictation: () => game("dictation"),
      grammar,
      progress,
    }[currentPage] || home
  )();
  document
    .querySelectorAll("nav button")
    .forEach((b) =>
      b.classList.toggle("active", b.dataset.page === currentPage),
    );
  if ($("#theme"))
    $("#theme").addEventListener("change", (e) => choose(e.target.value));
  if ($("#flip"))
    $("#flip").onclick = () => {
      revealed = !revealed;
      const card = $("#flip");
      card.classList.toggle("is-flipped", revealed);
      card.setAttribute("aria-pressed", String(revealed));
      card
        .querySelector(".card-front")
        .setAttribute("aria-hidden", String(revealed));
      card
        .querySelector(".card-back")
        .setAttribute("aria-hidden", String(!revealed));
    };
  if ($("#speak"))
    $("#speak").onclick = () =>
      speaker(
        currentPage === "cards"
          ? active()[index % active().length].word
          : currentList[index % currentList.length].word,
      );
  if ($("#next"))
    $("#next").onclick = () => {
      if (currentPage === "grammar") {
        lastFeedback = null;
        currentQuiz = (currentQuiz + 1) % questions.length;
        answered = false;
        render();
      } else next();
    };
  if ($("#master"))
    $("#master").onclick = () => {
      const w = active()[index % active().length];
      saved.mastered = unique([...saved.mastered, wordId({ ...w, theme })]);
      saved.wrong = saved.wrong.filter((x) => x !== wordId({ ...w, theme }));
      persist();
      next();
    };
  if ($("#review"))
    $("#review").onclick = () => {
      const w = active()[index % active().length];
      saved.mastered = saved.mastered.filter(
        (x) => x !== wordId({ ...w, theme }),
      );
      saved.wrong = unique([...saved.wrong, wordId({ ...w, theme })]);
      persist();
      next();
    };
  if ($("#answer"))
    $("#answer").onsubmit = (e) => {
      e.preventDefault();
      if (answered) return;
      const w = currentList[index % currentList.length],
        guess = $("#guess").value.trim().toLowerCase(),
        right = guess === w.word.toLowerCase();
      answered = true;
      lastFeedback = { kind: "word", right, w, guess };
      tally(right, w);
      renderFeedback();
      $("#guess").disabled = true;
      $("#answer button").disabled = true;
    };
  document.querySelectorAll(".option").forEach(
    (b) =>
      (b.onclick = () => {
        if (answered) return;
        answered = true;
        const q = questions[currentQuiz % questions.length],
          right = Number(b.dataset.option) === q[2];
        lastFeedback = { kind: "grammar", right, q };
        recordSkill("grammar", String(currentQuiz % questions.length), right);
        saved.attempts++;
        if (right) saved.correct++;
        persist();
        renderFeedback();
        document
          .querySelectorAll(".option")
          .forEach((x) => (x.disabled = true));
      }),
  );
  if ($("#reset"))
    $("#reset").onclick = () => {
      if (
        confirm(
          tr(
            "确定清除本地学习记录？",
            "Clear all learning progress stored in this browser?",
          ),
        )
      ) {
        saved = { mastered: [], wrong: [], correct: 0, attempts: 0 };
        persist();
        render();
      }
    };
}
document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-page],[data-go]");
  if (!b) return;
  lastFeedback = null;
  currentPage = b.dataset.page || b.dataset.go;
  if (b.dataset.theme) theme = b.dataset.theme;
  index = 0;
  currentList = [];
  answered = false;
  revealed = false;
  render();
});
render();

document.querySelector("#language").addEventListener("change", (e) => {
  const guess = document.querySelector("#guess")?.value;
  language = e.target.value === "en" ? "en" : "zh";
  try {
    localStorage.setItem(LANGUAGE_KEY, language);
  } catch {}
  render();
  if (guess !== undefined && document.querySelector("#guess"))
    document.querySelector("#guess").value = guess;
  renderFeedback();
});
