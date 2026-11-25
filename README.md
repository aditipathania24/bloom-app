# Bloom — Cycle Tracker

A period-tracking app with EWMA-based cycle prediction, a 🎡 spin-to-reveal phase wheel,
Claude-personalized meals/yoga/self-care, and an in-app chat with the Bloom mascot.

Built for local, single-person use (e.g. a university project demo).

## Setup

```bash
npm install
cp .env.example .env.local
```

Open `.env.local` and paste in your own Anthropic API key (get one at
https://console.anthropic.com/settings/keys):

```
VITE_ANTHROPIC_API_KEY=sk-ant-your-real-key-here
```

## Run it

```bash
npm run dev
```

Open the URL it prints (usually http://localhost:5173).

## How it actually works — the two things worth understanding

**1. Prediction math.** All cycle-length and phase predictions are plain statistics
(an exponentially-weighted moving average + standard deviation) computed in
`computeStats()` in `src/App.jsx` — no AI involved, and no internet needed for
that part to work.

**2. Claude calls.** Phase tips and the mascot chat call the Anthropic API
*directly from the browser* using your key from `.env.local`, via the
`anthropic-dangerous-direct-browser-access` header. That header name is a
genuine warning, not decoration: anyone who opens devtools on a page using
this pattern can read the key out of the network tab or the bundled JS.
That's a non-issue here because this only ever runs on `localhost` on your
own machine with your own key — **do not deploy this build to a public
URL as-is.** If you ever want a shareable public link, the key needs to move
to a small backend that holds it server-side instead.

## Data storage

Your logged periods and profile are saved in your browser's `localStorage`,
scoped to this one browser on this one device. Clearing browser data (or
opening it in a different browser) starts fresh.

## If the Claude calls fail

The app doesn't break — phase tips fall back to a solid pre-written set
(`FALLBACK_DATA` in `src/App.jsx`), and chat shows a friendly retry message.
Check the browser console for the actual error (usually a missing/invalid
API key, or a network issue).

## Project structure

```
bloom-app/
├── src/
│   ├── App.jsx      # everything: UI, prediction math, Claude calls
│   └── main.jsx      # React entry point
├── index.html
├── .env.local         # your API key (create this — never commit it)
└── package.json
```
