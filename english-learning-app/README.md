# WordSpring 🌱 — English Learning App

**GEAP 103 Major Project · Project members: Kevin & Emma · v1.1**

WordSpring is a bilingual, interactive English-learning web app designed for **Chinese-speaking students**. It makes vocabulary and grammar practice more engaging through short lessons, flashcards, spelling games, and audio dictation.

## Learners and learning goals

| Planning question     | Our answer                                                                                 |
| --------------------- | ------------------------------------------------------------------------------------------ |
| Who are our learners? | Chinese-speaking high-school, college, and adult learners                                  |
| Geography             | Mainly China; also Chinese students studying abroad, including Canada                      |
| Profession / context  | Students preparing for school, everyday conversation, travel, or work                      |
| Language taught       | English, supported by Chinese explanations                                                 |
| English level         | A2–B1 (elementary to intermediate)                                                         |
| Grammar               | Present simple, present continuous, past simple, future forms, articles, comparative forms |
| Themes                | Everyday Life, School & Campus, Work & Communication, Travel                               |
| Vocabulary            | Useful English words, Chinese definitions, example sentences, and audio pronunciation      |

## Vocabulary bank: 400 distinct words

Nine categories now contain **400 distinct English words and phrases**, each with a simplified-Chinese meaning and an English example. There are **405 themed entries** because five existing words occur in two original themes. Those entries and their IDs are retained so existing browser progress remains compatible.

| Category                            | Entries |
| ----------------------------------- | ------: |
| Daily Life / 日常生活               |      40 |
| School & Education / 校园教育       |      40 |
| Work & Communication / 工作沟通     |      40 |
| Travel & Transportation / 旅行交通  |      40 |
| Emotions & Social Life / 情绪与社交 |      40 |
| Medical & Healthcare / 医疗用语     |      80 |
| Industry & Manufacturing / 工业用语 |      80 |
| Kitchen & Cooking / 厨房用语        |      25 |
| Technology & Computing / 科技用语   |      20 |

The original vocabulary is aimed at A2–B1 learners; the new specialist categories introduce occupational vocabulary beyond that range. The same category vocabulary powers flashcards, spelling, and dictation.

## Chinese / English UI

Use the **界面语言 / UI language** selector in the header to switch between 中文 and English. Navigation, instructions, category names, controls, feedback, grammar explanations, progress, and the reset confirmation follow your choice. Chinese meanings and English examples remain available as learning content in both modes. Switching language preserves the active category, card, question, typed answer, and feedback without counting another attempt. The language preference is stored separately from learning progress.

## Working features (first version)

- **Lessons:** Nine categorized word lists, with Chinese translations and contextual English examples.
- **Vocabulary Flashcards:** Flip a card to see the meaning; mark it as learned or review again.
- **Spelling Challenge:** See the Chinese meaning, then type the English word. Exact spelling is checked locally (case and outside whitespace ignored).
- **Dictation:** Listen to a word spoken by the browser and type what you hear. The answer is checked locally.
- **Grammar Quiz:** Answer multiple-choice questions with immediate explanations.
- **Progress:** Track mastered words, correct/attempted answers, accuracy, and words to review.

This version works **without a login, API key, or paid account**. It stores learning progress in the browser using `localStorage`. Progress stays on the same browser/device and can be removed by clearing site data.

## Run the app

1. Open [index.html](index.html) in a modern web browser.
2. Choose a vocabulary theme, then open the flashcards, spelling game, or dictation mode.
3. Use the **Progress** tab to review your statistics.
4. Dictation uses the browser's `speechSynthesis` voices. Available English voices depend on the device. Browsers may require a click before audio can play.

### GitHub Pages (optional)

If GitHub Pages is already publishing this repository from `main` and `/(root)`, visit:
`https://kevinji599.github.io/GEAP-103/english-learning-app/`

If it is not enabled, open **Settings → Pages** in the repository and choose **Deploy from a branch**, `main`, and `/(root)`. Check existing Pages configuration before changing it; the repository already contains other course files.

## Project structure

```text
GEAP-103/
  english-learning-app/
    README.md         # Project description and team plan
    index.html        # Web page and navigation
    styles.css        # Responsive styling
    vocabulary.js     # 405 bilingual entries (400 distinct words) in nine categories
    app.js            # Games, progress and deterministic scoring
    AI_INTEGRATION.md # Safe API integration plan for a future release
```

## AI grading: planned, NOT connected

AI-assisted feedback for original sentences is a **future feature**. No AI API calls occur in v1. `app.js` contains a clearly marked `AI_FEEDBACK_ENDPOINT` placeholder that is **disabled**. When ready, we can deploy a secure server-side endpoint (for example a Cloudflare Worker) using an API such as Google Gemini or Groq.

**Never place API keys in frontend JavaScript, HTML, the README, or a public repository.** The future server endpoint must securely store its API key, validate requests, set usage limits, and return structured grading feedback. Until then, deterministic spelling/dictation scoring and authored grammar answers are fully usable.

## Collaboration plan

- **Kevin:** GitHub repository and prototype implementation; collaborate on content and testing.
- **Emma:** Review lesson content, vocabulary quality, and explanations; collaborate on UX and testing.
- **Both:** Evaluate the app together, document iterations, share specific feedback and actual contributions.

These are _proposed responsibilities_, not claims that either team member has already completed these contributions. Update this section as you work together.

## Next steps

1. Ask Emma to try the flashcard, spelling, and dictation activities.
2. Add more A2–B1 words and revise mistakes based on student feedback.
3. Improve spaced repetition and accessibility.
4. Later: add safe, optional AI feedback for student-written sentences.

**Tech:** HTML5, CSS3, vanilla JavaScript. No external dependencies or analytics. **License:** Project materials are for a GEAP 103 student learning project.

## Verification

The app has no build step. For the browser regression check, install Playwright in your test environment and provide Chromium (defaults to `/usr/bin/chromium`; override with `CHROMIUM_PATH`). From the repository root run:

```sh
python -m http.server 8000
# In another terminal:
node english-learning-app/tests/browser.cjs
```

Override `WORDSPRING_URL` if using a different server address. The check covers vocabulary completeness, all categories, Chinese/English switching, spelling and dictation feedback, all grammar explanations, saved-progress compatibility, language persistence, and a 375-pixel mobile layout. Browser voice availability remains device-dependent.

## Word classes and logo

Every themed entry now includes a `pos` label for the sense shown in its Chinese meaning and English example: **n.** (noun), **v.** (verb), **adj.** (adjective), or **n. phr.** (noun phrase). Labels appear after the English word on both sides of flashcards, in answer feedback, and in mistake review; spelling prompts also show the word class. Labels describe the current learning sense rather than every possible dictionary use. Switching UI language translates the label explanations. English pronunciation and scoring still use only the word itself.

The header uses the user-provided WordSpring image at `assets/wordspring-logo.jpg`, preserved with its original aspect ratio and accessible alternative text.
