# Research Notes — AdmitGuard

## Vibe Coding & Google AI Studio

### What is Vibe Coding?
Vibe Coding is an AI-assisted development approach where you describe functionality in natural
language and an AI model (Gemini in Google AI Studio) generates working code. The developer's
role shifts from writing syntax to directing intent, reviewing output, and iterating through
conversation.

### Key Resources Reviewed
- Google AI Studio Build Mode: https://aistudio.google.com → Build tab
- Official docs: https://ai.google.dev/gemini-api/docs/aistudio
- R.I.C.E. prompting framework: Role, Intent, Constraints, Examples
- Annotation Mode: allows clicking directly on UI elements to describe changes visually

### Prompt Engineering Takeaways
1. **One feature per prompt** — do not dump all requirements in a single message; AI loses focus.
2. **Set the Role first** — "You are a senior frontend developer building an internal business tool."
3. **Add Constraints** — "Do NOT use Bootstrap. Keep it in a single HTML file."
4. **Show Examples** — "Valid phone: 9876543210. Invalid: 1234567890."
5. **Iterate, don't overload** — build form structure first, add validation second, exceptions third.
6. **Chain-of-Thought** — ask AI to reason step-by-step for complex validation logic (age calculation, cross-field rules).
7. **Test with edge cases** — after generation, ask the AI to test its own output against boundary values.

### Anti-Patterns to Avoid
- Kitchen Sink Prompting: "Build the whole app with all features" → garbage output
- Vague instructions: "Make it look nice" → meaningless to the model
- Copy-Paste without reading: if you can't explain a function, you don't own it yet

### Questions Still Open
- How does Vibe Coding handle state management in larger SPAs?
- Best practice for importing `rules.json` in a purely static HTML/JS build?
- Does Annotation Mode work on dynamically rendered elements?

---

## AdmitGuard Business Problem Notes

- Root cause: Excel/Sheets entry has zero validation; eligibility rules are complex and undocumented
- Key risk: ineligible candidates reach document verification stage, wasting counselor + panel time
- Exception tracking gap: borderline candidates (e.g., 59.8%) approved verbally with no audit trail
- Solution constraint: no backend, no auth, must load < 3 seconds, Chrome/Edge desktop primary

---

## Architecture Decisions Log

| Decision | Options Considered | Chosen | Reason |
|---|---|---|---|
| Persistence | localStorage vs IndexedDB vs in-memory | localStorage | Simplest, no setup, meets prototype needs |
| Rule storage | Hardcoded in JS vs JSON config | JSON config | Ops team can update rules without code changes |
| Routing | Hash routing vs conditional rendering | Conditional rendering | Zero dependencies, simpler for a 3-view app |
| Validation trigger | onChange vs onBlur vs onSubmit | onChange + onSubmit | Real-time feedback (FR-2) + final gate (FR-3) |
