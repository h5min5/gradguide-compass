# GradGuide Compass

GradGuide Compass is a counselling workspace for study-abroad advisers. A counsellor enters whatever is known about a student. The app ranks postgraduate computing courses, explains the score, and keeps the adviser in control during a live call.

## Problem being solved

During a Google Meet, a counsellor has to turn a partial student story into a short list of realistic master's options. University pages are long, fees are in different currencies, and English or academic rules are easy to miss. A generic chat reply is not a decision record: it can invent a fee, change a ranking between two identical questions, and leave no trail of why the counsellor overrode the list.

## Product approach

Compass is one workspace, not a chat box with a catalogue glued on.

- The student profile accepts partial information. Empty fields stay neutral or unverified. They do not reject the student.
- A TypeScript engine checks eligibility, scores fit, ranks courses, suggests alternatives, picks the next question, and tests how stable the top of the list is.
- The counsellor can shortlist a course the engine did not put first, and must record why.
- Groq is available as Ask Compass. It explains the engine's numbers in plain language. It does not choose them.

Meeting mode narrows the same workspace so it can sit beside a video call.

## Architecture

```text
Student profile (browser)
        |
        v
Deterministic engine (TypeScript)
  eligibility -> match score -> rank
  alternatives, Ask Next, stability
        |
        +--> Recommendation cards, comparison, ledger (localStorage)
        |
        v
POST /api/chat
  rebuilds the same scores on the server
  sends that JSON to Groq with a grounded system prompt
```

There is no login and no database. The course catalogue is `data/courses.json`. Counsellor decisions stay in the browser.

Main pieces:

| Path | Role |
| --- | --- |
| `data/courses.json` | Catalogue |
| `src/lib/eligibility.ts` | Eligibility |
| `src/lib/scoring.ts` | Match score |
| `src/lib/recommend.ts` | Ranking |
| `src/lib/alternatives.ts` | Smart alternatives |
| `src/lib/information-gain.ts` | Ask Next |
| `src/lib/stability.ts` | Sensitivity |
| `src/lib/counselling-context.ts` | Context packet for Groq |
| `src/lib/groq-model.ts` | The only Groq model constant |
| `src/app/api/chat/route.ts` | Server route that holds `GROQ_API_KEY` |
| `src/components/workspace.tsx` | Counselling workspace |

## Recommendation methodology

Every course is scored from the current profile. Nothing is random and nothing is pinned to the demo student.

Ranking order:

1. Likely compatible
2. Needs verification
3. Requirement mismatch

Inside a status, the higher match score wins. Equal scores use the course id, so the order does not flicker.

Filters and keyword search hide rows. They do not rescore the hidden courses.

## Eligibility methodology

Each course is checked on three factors: academic record, English, and degree background.

| Status | Meaning |
| --- | --- |
| Likely compatible | Every captured requirement that the student has answered is met |
| Needs verification | Something needed for a decision is missing, or the page left the case to review |
| Requirement mismatch | A known value fails a requirement that was captured |

Missing information is not a rejection. Examples:

- The page requires IELTS and the score is blank: needs verification.
- The score is present and below the captured IELTS total: requirement mismatch.
- The academic page says a first is the norm but a strong 2:1 can be considered: the gap between the hard floor and the review line stays in verification.
- An empty profile stays in verification. It is not marked as a mismatch.

Academic floors in the catalogue are Compass comparison points on a 0–100 scale (`9.1/10` becomes 91, `3.6/4` becomes 90, `85%` becomes 85). They are not a university's official conversion table. The label on each course says that.

English uses the overall IELTS or TOEFL total that was captured. Component minimums are mentioned and are not scored. If a TOEFL number and the captured requirement are on different scales, the factor stays unverified instead of pretending they match.

Background uses the degree and field against the subjects the page lists. A conversion programme that asks for a degree outside computing is a mismatch for a computing graduate.

## Match score calculation

The default weights sum to 100. Each factor is a 0–1 ratio, rounded to points. The total is the sum of those points, so the breakdown adds up.

| Factor | Points | How it moves |
| --- | --- | --- |
| Academic fit | 25 | Margin above the comparison floor. Unknown score or unknown floor stays near the middle. |
| Career alignment | 25 | Overlap between the career goal, interests, and experience and the course's listed paths. |
| Subject fit | 15 | Overlap between field, interests, and desired course area and the course subjects. |
| Budget fit | 15 | Full points at or under the budget. Points fall as the fee exceeds the budget, and reach 0 at 1.6 times the budget. Unknown budget or unknown fee stays neutral. |
| Country preference | 10 | Preferred country is full points. Secondary country is partial. No preference stays neutral. |
| Intake fit | 10 | A listed intake that matches the preference is full points. No preference stays neutral. |

Budget comparison converts GBP and USD into EUR at approximate rates (1 GBP = 1.17 EUR, 1 USD = 0.92 EUR). Those rates are for ordering only. The card still shows the fee in the currency printed by the university.

Changing the profile changes these ratios. The demo student is not a special case in the code.

## Three original features

### 1. Counselling information-gain engine (Ask Next)

Ask Next does not print a checklist of blank boxes. For each unanswered question that can move the engine, it replays ranking with a bounded set of plausible answers.

It measures:

- how often the top 5 changes
- how often the first course changes
- how many eligibility statuses flip
- how wide the range of viable courses becomes

Viable means not a requirement mismatch and a score of at least 50. The question with the highest information-gain score is the one shown. The explanation is built from those counts. Groq can rephrase it. Groq does not pick the question.

### 2. Recommendation stability

For the current profile, Compass reruns ranking under a bounded set of variations:

- budget at 80%, 90%, 110%, and 120% when a budget exists
- heavier and lighter career weight
- heavier and lighter subject weight
- swapped, cleared, or redirected country preference

Stability is the share of those scenarios in which the course is still in the top 5.

| Label | Share of scenarios |
| --- | --- |
| High | 75% or more |
| Medium | 45% to 74% |
| Low | below 45% |

Notes such as "Sensitive to budget" or "Ranking depends heavily on career alignment" come from which scenarios pushed the course out. This is decision sensitivity, not a statistical confidence interval.

### 3. Counsellor override and decision ledger

Prioritize asks why. The reasons are:

- Student expressed stronger preference
- Programme content preferred
- Research orientation
- Career considerations
- Updated information not captured
- Other

An optional note is stored with the course, the system rank and score at that moment, the new priority, and a timestamp. Removing a shortlist entry is also recorded. The trail stays in `localStorage` under `gradguide.ledger.v1`. The system ranking on the cards does not change.

## Why each original feature matters

Ask Next matters because a live call has time for one good question, not a tour of the form. The question is the one that would actually move eligibility or the short list.

Stability matters because a student can change a budget or a country preference in the same meeting. A course that only ranks first under one exact weighting is a weak thing to promise.

The ledger matters because the counsellor is accountable for the recommendation the student hears. The tool can disagree and still leave a record of the human decision.

## Groq integration

Ask Compass calls `POST /api/chat`. The route reads `process.env.GROQ_API_KEY` and never sends the key to the browser. The model name lives only in `src/lib/groq-model.ts` (`openai/gpt-oss-120b` at the time of writing).

Before the model is called, the server runs the same engine and passes a structured packet: profile, ranked courses, score breakdowns, eligibility, warnings, alternatives, stability, and the Ask Next result.

The system prompt tells the model:

> You are a counselling assistant. Answer strictly from the structured student and course information supplied to you. Never invent universities, courses, tuition fees, eligibility requirements, rankings or other factual course information. If the supplied information is insufficient, say that it is not available.

The model is also told not to calculate scores, eligibility, tuition, or rankings. If the key is missing or Groq fails, the panel explains that and the rest of the workspace keeps working.

Groq may rephrase an Ask Next briefing. The question and the counts stay the ones the engine produced.

## Course data structure

Each record in `data/courses.json` includes:

`id`, `courseName`, `university`, `city`, `country`, `tuitionFee`, `currency`, `tuitionBasis`, `durationMonths`, `intakes`, `minimumAcademicScore`, `academicReviewScore`, `academicRequirementLabel`, `acceptedBackgrounds`, `backgroundRule`, `ieltsRequirement`, `toeflRequirement`, `toeflNewScaleRequirement`, `subjects`, `careerPaths`, `description`, `officialUrl`, `lastVerified`, `dataConfidence`, `dataStatus`.

`tuitionFee` is null when the captured page did not label an international total. A null fee makes budget fit neutral. It is not filled with a guess.

## Data update and provenance strategy

Entries were read from public programme or fee pages on 6 October 2026. `officialUrl` is that page. `dataStatus` says the entry is a prototype reading, not an official verification. `dataConfidence` is lower when tuition, English, or the academic class was not in the captured text.

To refresh a record:

1. Open `officialUrl`.
2. Update only figures the page states, including the fee year.
3. Set `lastVerified` to the day you read it.
4. Leave a field null rather than copying it from a third-party listing.
5. Keep the comparison floor labelled as a Compass scale, not as the university's conversion policy.

`data/raw/` holds local fetch notes and is gitignored.

## Tech stack

- Next.js (App Router) and React
- TypeScript
- Tailwind CSS
- Lucide icons
- Groq, server-side only, for Ask Compass

No authentication and no database. The app is a standard Next.js deployment.

## Local setup

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Other checks:

```bash
npm run typecheck
npm run lint
npm run build
npx tsx scripts/verify-engine.ts
```

Use **Load demo student** for the Artificial Intelligence and Data Science profile. IELTS is intentionally blank.

## Environment variables

Create `.env.local` in the project root:

```bash
GROQ_API_KEY=your_key_here
```

`.env.example` contains the same variable name. Restart `npm run dev` after saving the file. The key is read only in `src/app/api/chat/route.ts`.

On Vercel, set `GROQ_API_KEY` in Project Settings → Environment Variables. Do not prefix it with `NEXT_PUBLIC_`.

## Vercel deployment

The project uses the default Next.js build (`npm run build`). No database, no custom server, and no build-time call to Groq.

1. Push the repository.
2. Import it in Vercel.
3. Add `GROQ_API_KEY`.
4. Deploy.

If the variable is absent, the workspace still ranks courses and Ask Compass shows a setup message.

## Limitations

- The catalogue is a prototype reading of public pages, not a feed from the universities. Fees, intakes, and rules change.
- Several official pages did not put an international fee or an English score in the text that could be read. Those fields are null on purpose.
- Academic floors are a counselling comparison scale. They are not an official percentage conversion for India or any other system.
- English scoring uses the overall total only.
- Currency conversion uses fixed approximate rates.
- GRE is collected and stored with the profile. It is not part of the score, because a GRE rule was not encoded from the pages.
- The decision ledger is local to the browser.
- US pages that were readable often omitted a single international tuition total, so those records are thinner than the UK and Ireland ones.
- Ask Compass can be wrong about emphasis even when it is told not to invent facts. The numbers on the cards remain the source of truth.

## Future improvements

- A scheduled check that flags pages whose fee or IELTS text changed.
- Component-level English rules and official credential-evaluation tables, clearly separated from the comparison scale.
- A shared ledger for a counselling team.
- Calendar holds and intake deadlines next to the score.
- More US programme pages once a labelled international total is on the page.

## Demo video placeholder

[Demo video placeholder: add a 3–5 minute walkthrough link here]
