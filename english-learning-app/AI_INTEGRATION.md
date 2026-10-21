# Future AI grading integration (not active in v1)

WordSpring v1 works entirely without paid APIs or any API key. Spelling, dictation and grammar use deterministic local answer checks. The app contains a disabled `AI_FEEDBACK_ENDPOINT = null` placeholder in `app.js`.

## Proposed v2 user experience
A learner writes an original English sentence. AI returns:
- A 0–5 rubric score for grammar and clarity;
- A short, constructive explanation in simplified Chinese;
- A suggested correction and a brief example of improved usage.

AI feedback must be described as learning advice, not as an authoritative or high-stakes grade. Provide an explanation and allow the student to retry.

## Secure architecture

```text
Browser (no secret keys)
       |
       | HTTPS POST: sentence, level, optional language
       v
Rate-limited server endpoint (e.g. Cloudflare Worker)
       |
       | Provider API key held only in server environment secrets
       v
Gemini / Groq / other model API
       |
       v
Validate JSON response; return short rubric feedback to browser
```

- Never put API keys in client JavaScript, a public GitHub repository, URL parameters or README.
- Create the server-side endpoint only after deciding on a provider and enabling abuse prevention, request length limits, rate limits and monthly budget caps.
- Validate user inputs, ensure the provider's required policies and consent practices are followed, and do not send personally identifying student data.
- AI feedback should not silently replace the current local spelling/dictation evaluation.
- Keep the app usable if an API is unavailable or the free quota is exhausted.
- Future code can replace the disabled `AI_FEEDBACK_ENDPOINT` placeholder with a configured **same-origin server route**, never with a provider API key.

## Current v1 status
- AI API key: **None**
- AI endpoint: **Disabled**
- Spelling and dictation: **Offline local comparison**
- Grammar quiz: **Authored questions and explanations**
