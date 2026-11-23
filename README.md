# 📷 Photo Scavenger Hunt: weekly photo challenges

An interactive version of the printable *7 Day Photo Scavenger Hunt* that keeps going all season. Kids pick their player, check off missions, upload the day's photos and watch their score climb. Grown-ups award the special daily challenges and the weekly awards.

- **A new challenge week every Monday**, tied to the real calendar. Each day unlocks on its date.
- Each day has 30 missions (10 pts) and 5 bonus missions (20 pts), for 400 a day and 2,800 a week, plus season totals
- Multiple players, each with an emoji buddy and color, plus a live leaderboard and scoreboard
- **End-of-day upload**: pick all of a day's camera photos at once, then tap a photo and tap the mission it belongs to
- Photos are shrunk on the device (DSLR 15 MB → about 300 KB) and kept **on this device only**
- Special Daily Challenges: a golden hunt that changes every week (turkey, star, elf…), Mystery Photo, Photographer's Choice and Kindness. Sunrise & Sunset Club is added automatically.
- Works offline and can be installed with "Add to Home Screen"

## Publish free on GitHub Pages

1. Create a free account at <https://github.com> if you don't have one.
2. Click **New repository**, name it something like `photo-hunt`, set it to **Public** and click **Create repository**.
3. On the new repo page, click **uploading an existing file**. Drag in **everything inside this folder** (`index.html`, `manifest.webmanifest`, `sw.js`, and the `css`, `js`, `icons` folders). Then click **Commit changes**.
4. Go to **Settings → Pages**. Under *Build and deployment*, choose **Deploy from a branch**, branch **main**, folder **/ (root)**, then **Save**.
5. After about a minute your game is live at `https://YOUR-USERNAME.github.io/photo-hunt/`.

> GitHub Pages sites are public, but only the game is published. Photos and scores never leave the device they were added on.

## Install on a phone or iPad

- **iPhone / iPad (Safari):** open the link → Share button → **Add to Home Screen**.
- **Android (Chrome):** open the link → ⋮ menu → **Install app** / **Add to Home screen**.

Installing matters on iPhone and iPad: Safari can clear saved website data after about a week without use, but Home Screen apps keep theirs.

## The season calendar

| Week | Dates (2026) | Theme |
|---|---|---|
| 🦃 Thanksgiving Week | Nov 23 – 29 | The original PDF hunt (Thanksgiving is Thu Nov 26) |
| 🎄 Christmas Countdown Kickoff | Nov 30 – Dec 6 | Decorating, Advent, tree trimming, St. Nicholas Day (Dec 6) |
| 🛠️ Santa's Workshop Week | Dec 7 – 13 | Letters to Santa, snowflakes, wrapping, ornaments, gingerbread |
| 💝 Kindness & Cheer Week | Dec 14 – 20 | Cards, light tours, cookie bake-off, carols |
| 🎅 Christmas Week | Dec 21 – 27 | Shortest day, Christmas Eve, Christmas Day, thank-you notes |
| ❄️ Winter Break Adventure | Dec 28 – Jan 3 | New toys, snow days, memories, a fresh start |
| 🔁 Evergreen weeks | from Jan 4, 2027 | A fresh themed week is generated automatically every Monday |

Past weeks move into the **📖 Memory book** on the Calendar tab, with all their scores and photos. Next week stays a secret until Monday.

**Grown-ups zone → Time machine** lets a parent preview any date (for example Christmas Day) without changing anything for the kids.

### Adding more holiday weeks

Holiday weeks are plain lists in `js/weeks-december.js`. To add one (say, Valentine's week), copy a week block, set `id` to that week's **Monday** date (`YYYY-MM-DD`), and write 7 days of 10 morning, 10 afternoon, 10 evening and 5 bonus missions. Keep mission #01 as a sunrise and #21 as a sunset so the Sunrise & Sunset Club still works. Then import the new list in `js/calendar.js`. Hand-written weeks automatically replace the generated week for those dates.

## Daily routine

1. Kids take photos during the day (camera or phone).
2. In the evening, copy the camera's photos to the computer or phone (SD card reader, camera app, or AirDrop).
3. Open the game → pick the player → **📸 Upload photos** → choose the day's photos.
4. Tap a photo in the tray, then tap its mission. It gets checked off and the points are added automatically.
5. Grown-ups: open **🔑 Grown-ups** to award special challenges, then **Export backup**.

Use the camera's **JPEG** files. RAW files (`.CR3`, `.NEF`, `.ARW`…) can't be opened in a browser.

## Backups and multiple devices

Everything is stored in the browser on the device you use. In **🔑 Grown-ups → Photos & backups**:

- **Export backup** downloads one `.json` file with all players, scores and photos.
- **Import backup** merges a backup into this device. Players with the same name are combined, so a kid can play on a phone, export, and you import it on the family computer.

## Run it locally

```bash
python3 -m http.server 8080
```

Then open <http://localhost:8080>.

## Files

| File | What it does |
|---|---|
| `index.html` | App shell |
| `css/styles.css` | Look and feel |
| `js/missions.js` | Thanksgiving Week, colors, special challenges, awards, rules |
| `js/weeks-december.js` | The five Christmas-season weeks |
| `js/evergreen.js` | Mission pools that generate a new week every Monday after the holidays |
| `js/calendar.js` | Dates, weeks and unlocking |
| `js/app.js` | Screens, scoring, uploads, backups |
| `js/store.js` | On-device storage (IndexedDB). A Google Drive backend could plug in here later. |
| `js/photos.js` | Shrinks photos before saving |
| `js/fx.js` | Confetti and celebrations |
| `sw.js`, `manifest.webmanifest`, `icons/` | Offline support and Home Screen install |
