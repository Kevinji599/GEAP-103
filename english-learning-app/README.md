# WordSpring 🌱 — English Learning App

**GEAP 103 Major Project · Project members: Kevin & Emma · v1.0**

WordSpring is a bilingual, interactive English-learning web app designed for **Chinese-speaking students**. It makes vocabulary and grammar practice more engaging through short lessons, flashcards, spelling games, and audio dictation.

## Learners and learning goals

| Planning question | Our answer |
| --- | --- |
| Who are our learners? | Chinese-speaking high-school, college, and adult learners |
| Geography | Mainly China; also Chinese students studying abroad, including Canada |
| Profession / context | Students preparing for school, everyday conversation, travel, or work |
| Language taught | English, supported by Chinese explanations |
| English level | A2–B1 (elementary to intermediate) |
| Grammar | Present simple, present continuous, past simple, future forms, articles, comparative forms |
| Themes | Everyday Life, School & Campus, Work & Communication, Travel |
| Vocabulary | Useful English words, Chinese definitions, example sentences, and audio pronunciation |

## Working features (first version)

- **Lessons:** Four themed word lists, with Chinese translations and contextual English examples.
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
    app.js            # Vocabulary data, games, progress and scoring
    AI_INTEGRATION.md # Safe API integration plan for a future release
```

## AI grading: planned, NOT connected

AI-assisted feedback for original sentences is a **future feature**. No AI API calls occur in v1. `app.js` contains a clearly marked `AI_FEEDBACK_ENDPOINT` placeholder that is **disabled**. When ready, we can deploy a secure server-side endpoint (for example a Cloudflare Worker) using an API such as Google Gemini or Groq.

**Never place API keys in frontend JavaScript, HTML, the README, or a public repository.** The future server endpoint must securely store its API key, validate requests, set usage limits, and return structured grading feedback. Until then, deterministic spelling/dictation scoring and authored grammar answers are fully usable.

## Collaboration plan

- **Kevin:** GitHub repository and prototype implementation; collaborate on content and testing.
- **Emma:** Review lesson content, vocabulary quality, and explanations; collaborate on UX and testing.
- **Both:** Evaluate the app together, document iterations, share specific feedback and actual contributions.

These are *proposed responsibilities*, not claims that either team member has already completed these contributions. Update this section as you work together.

## Next steps

1. Ask Emma to try the flashcard, spelling, and dictation activities.
2. Add more A2–B1 words and revise mistakes based on student feedback.
3. Improve spaced repetition and accessibility.
4. Later: add safe, optional AI feedback for student-written sentences.

**Tech:** HTML5, CSS3, vanilla JavaScript. No external dependencies or analytics. **License:** Project materials are for a GEAP 103 student learning project.
