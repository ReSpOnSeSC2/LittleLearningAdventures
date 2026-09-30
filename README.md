# Little Learning Adventures

A phone-friendly companion for two home learning programs: Anastasia's 36-week kindergarten adventure and Vivian's 60-day preschool workbook. Built as a small, standalone progressive web app, using the same GitHub Pages installation approach as RallyReady.

## Install on Android

1. Open [Little Learning Adventures](https://responsesc2.github.io/LittleLearningAdventures/) in **Chrome**.
2. Wait for **Ready for offline play** on the welcome screen.
3. Tap **Install**, or Chrome's three-dot menu → **Add to Home screen** → **Install**.
4. Open the new Little Learning icon. Choose a learner and start a day.

If the browser offers only a shortcut, keep using the site and try Chrome's install menu again after its initial download. A phone-specific speech voice comes from Android; install an English on-device voice in the phone's text-to-speech settings if needed for offline speech.

## Anastasia: 36-week kindergarten adventure

Anastasia's side follows the printed weekly packets (Week and Day are printed on every page). Each day has 4 or 5 short games on a path, about 2 to 4 minutes each:

- **Sound Studio**: new letters and sounds with keyword pictures and a grown-up mouth cue, then "what letter does it start with?" games. Vowel teams and silent-e patterns in later weeks.
- **Listen & Play**: sound games with no print: rhymes, first, middle and last sounds, claps, counting sounds, putting word parts together and taking them apart.
- **Read It**: tap each sound dot, swoop, then match the picture. Sentences are read with finger dots, heart-word marks, and a picture check. Every word is decodable with the sounds taught so far.
- **Build Words**: spell with letter tiles in sound boxes, including the quiet e.
- **Heart Words**: new tricky words with the tricky part marked, then find and quick-look games.
- **Number Fun**: counting, quick looks, ten-frames, comparing, adding and taking away, teen numbers, shapes, patterns, measuring, time, coins, graphs and fractions, following the week's math focus.
- **Story Time** (Day 5): the week's decodable story with pictures and read-to-me help.
- **Talk Time** (with a grown-up): speech practice cards for the sounds chosen in **Parents** (up to 4, matching the printed Speech Kit), with "Clear" / "Not yet" tallies, plus listening pairs such as *key/tea* and *ring/wing*.

Finishing a day earns a sticker; each 6th week ends with a unit medal. Optional swim breaks give a 20-second movement card between games. **Parents** lets you pick any week and day, choose speech sounds, and see two weeks of speech tallies for the Progress Book. The phone's voice reads words and directions; a grown-up models pure letter sounds using the on-screen cue.

## Daily use

Each learner has separate local progress. The app follows the workbook's day number, with large controls, spoken instructions, letters, counting and other math, finger paths, movement, discovery, and a short story. The app's matching exercise may replace that paper exercise. A grown-up models isolated letter sounds; the device reads words and directions.

- Kindergarten: approximately 20–30 minutes: 4 or 5 app games plus the printed pages.
- Preschool age 3: approximately 30 minutes in short play blocks, with optional play extending to 60 minutes. These times include off-screen activities and breaks.

**Parents** lets you repeat any day, download Vivian's two printable pages for a day, choose a voice, or export/restore progress (the backup includes Anastasia's kindergarten progress). Download a day's PDF while online; previously downloaded PDFs may also work offline. Lessons and pictures are cached automatically.

Vivian's revised printouts are almost wordless: large dotted **Vivian**, a letter, a number, a shape, and a simple coloring picture. Each day is exactly two pages. The longer spoken directions and play ideas are in the separate parent guide. Her existing app games are preserved.

### Vivian's tracing play

In **Make your marks**, choose today's line, her name, a letter A–Z, a number 0–9, a shape, or blank paper. **Free draw** lets her make marks anywhere. **Follow path** starts at the pink dot and follows each stroke in order; marks outside the guide are ignored. Use the wider guide first and the narrower option when she wants a challenge. Her name is shown one large letter at a time. She can switch modes, clear the page, or move on whenever she likes. Anastasia keeps her kindergarten writing activity.

No accounts, ads, microphone recording, analytics, or progress uploads. Progress is stored on the device in localStorage (Anastasia's kindergarten progress uses its own key, `little-learning-k36-v1`). It does not automatically sync between phones. Export a backup before clearing site data or moving phones. Full names are kept out of this public app and its daily PDF files.

## Development and publication

No dependency installation or build step is needed. Use Node 22 or later:

```sh
npm test
npm run verify
npm run serve
```

`data/k36.json` and `data/pics.json` are generated from the printable curriculum (weekly scope, decodable word lists, stories, speech decks). `tests/k36.test.mjs` plays every one of the 180 days and checks that each game has exactly one right answer, that reading words are decodable that week, and that every picture exists.

GitHub Pages serves `main` from the repository root. `.nojekyll` preserves the static app. When changing cached files, bump the `CACHE_VERSION` in `sw.js`. Keep `APP_SHELL` complete. The app checks for a new version whenever it opens or comes back to the foreground; a new service worker takes over immediately and the page reloads itself on the home or map screen (or as soon as the child returns there).

Original lesson activities and generated mascot art. Pictures: Microsoft Fluent Emoji (MIT). Letters: Andika by SIL (OFL), a font made for new readers. See `NOTICE.md`. Educational practice, with adult support; it is not a diagnostic test or a guarantee of mastery.

Technical references: [MDN installable PWAs](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable), [MDN speech voices](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesis/getVoices), [MDN caching](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Caching).
