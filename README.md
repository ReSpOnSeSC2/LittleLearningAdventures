# Little Learning Adventures

A phone-friendly companion for two 60-day home learning workbooks. Built as a small, standalone progressive web app, using the same GitHub Pages installation approach as RallyReady.

## Install on Android

1. Open [Little Learning Adventures](https://responsesc2.github.io/LittleLearningAdventures/) in **Chrome**.
2. Wait for **Ready for offline play** on the welcome screen.
3. Tap **Install**, or Chrome's three-dot menu → **Add to Home screen** → **Install**.
4. Open the new Little Learning icon. Choose a learner and start a day.

If the browser offers only a shortcut, keep using the site and try Chrome's install menu again after its initial download. A phone-specific speech voice comes from Android; install an English on-device voice in the phone's text-to-speech settings if needed for offline speech.

## Daily use

Each learner has separate local progress. The app follows the workbook's day number, with large controls, spoken instructions, letters, counting and other math, finger paths, movement, discovery, and a short story. The app's matching exercise may replace that paper exercise. A grown-up models isolated letter sounds; the device reads words and directions.

- Kindergarten: approximately 20–30 minutes, including paper and movement.
- Preschool age 3: approximately 30 minutes in short play blocks, with optional play extending to 60 minutes. These times include off-screen activities and breaks.

**Parents** lets you repeat any day, download its two printable pages, choose a voice, or export/restore progress. Download a day's PDF while online; previously downloaded PDFs may also work offline. Lessons and pictures are cached automatically.

Vivian's revised printouts are almost wordless: large dotted **Vivian**, a letter, a number, a shape, and a simple coloring picture. Each day is exactly two pages. The longer spoken directions and play ideas are in the separate parent guide. Her existing app games are preserved.

### Vivian's tracing play

In **Make your marks**, choose today's line, her name, a letter A–Z, a number 0–9, a shape, or blank paper. **Free draw** lets her make marks anywhere. **Follow path** starts at the pink dot and follows each stroke in order; marks outside the guide are ignored. Use the wider guide first and the narrower option when she wants a challenge. Her name is shown one large letter at a time. She can switch modes, clear the page, or move on whenever she likes. Anastasia keeps her kindergarten writing activity.

No accounts, ads, microphone recording, analytics, or progress uploads. Progress is stored on the device in localStorage. It does not automatically sync between phones. Export a backup before clearing site data or moving phones. Full names are kept out of this public app and its daily PDF files.

## Development and publication

No dependency installation or build step is needed. Use Node 22 or later:

```sh
npm test
npm run verify
npm run serve
```

GitHub Pages serves `main` from the repository root. `.nojekyll` preserves the static app. When changing cached files, bump the `CACHE_VERSION` in `sw.js`. Keep `APP_SHELL` complete. A new service worker activates after older app windows close; reopen the app to use a downloaded update.

Original lesson activities and generated mascot art. Educational practice, with adult support; it is not a diagnostic test or a guarantee of mastery.

Technical references: [MDN installable PWAs](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable), [MDN speech voices](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesis/getVoices), [MDN caching](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Caching).
