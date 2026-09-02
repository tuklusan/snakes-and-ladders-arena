# Audio asset credits

All twelve sound-effect files are sourced from Kenney.nl free asset packs
and distributed under the **Creative Commons CC0 1.0 Universal (Public
Domain Dedication)** license. Attribution is not required by CC0, but is
included below as a courtesy and for the licence-gate audit trail.

**Upstream author:** Kenney (Kenney Vleugels), https://kenney.nl
**Upstream licence:** CC0 1.0 — https://creativecommons.org/publicdomain/zero/1.0/
**Format:** MP3 (primary, for iOS WebKit compatibility) and OGG Vorbis (fallback).
Both formats are transcoded from the same Kenney CC0 1.0 source files.

| Game file             | Source pack       | Source filename              | Game event                       |
|-----------------------|-------------------|------------------------------|----------------------------------|
| `roll.mp3` / `roll.ogg`            | Casino Audio      | `dice-shake-1.ogg`           | Dice starting to roll            |
| `settle.mp3` / `settle.ogg`          | Casino Audio      | `dice-throw-1.ogg`           | Dice settling on the board       |
| `step.mp3` / `step.ogg`            | Interface Sounds  | `click_001.ogg`              | Token step (per cell)            |
| `ladder.mp3` / `ladder.ogg`          | Digital Audio     | `powerUp12.ogg`              | Ladder climb                     |
| `snake.mp3` / `snake.ogg`           | Digital Audio     | `phaserDown2.ogg`            | Snake bite (slide down)          |
| `six.mp3` / `six.ogg`             | Interface Sounds  | `confirmation_001.ogg`       | Rolled a 6 (extra turn granted)  |
| `triple_six.mp3` / `triple_six.ogg`      | Interface Sounds  | `error_004.ogg`              | Three consecutive 6s (cancelled) |
| `turn.mp3` / `turn.ogg`            | Interface Sounds  | `bong_001.ogg`               | Turn change                      |
| `win.mp3` / `win.ogg`             | Digital Audio     | `zapThreeToneUp.ogg`         | Player wins                      |
| `gameover.mp3` / `gameover.ogg`        | Digital Audio     | `zapThreeToneDown.ogg`       | Game over / all players finished |
| `capture.mp3` / `capture.ogg`         | Impact Sounds     | `impactGeneric_light_002.ogg`| Katti - opponent sent to staging |
| `enter.mp3` / `enter.ogg`           | Digital Audio     | `phaseJump1.ogg`             | Piece exits staging onto tile 1  |

**Pack download URLs (as fetched on 2026-08-12):**
- Casino Audio:    https://kenney.nl/media/pages/assets/casino-audio/2472606a04-1721639069/kenney_casino-audio.zip
- Interface Sounds: https://kenney.nl/media/pages/assets/interface-sounds/fa43c1dd4d-1677589452/kenney_interface-sounds.zip
- Impact Sounds:   https://kenney.nl/media/pages/assets/impact-sounds/87b4ddecda-1677589768/kenney_impact-sounds.zip
- Digital Audio:   https://kenney.nl/media/pages/assets/digital-audio/216eac4753-1677590265/kenney_digital-audio.zip

## Amendments

- `ladder.ogg` was originally `phaserUp2.ogg`, a sci-fi sweep that did not read
  as climbing. Replaced with `powerUp12.ogg` (0.86s), an ascending musical
  figure whose length matches the connector traversal.
- `capture.ogg` added from the Impact Sounds pack (`impactGeneric_light_002.ogg`).
  The code had been calling `playAudio('capture')` against a file that never
  existed, so a Katti capture - the most dramatic event in the game - was silent.
  This is a short, decisive impact, distinct from the wooden `settle` thud.

- `enter.ogg` added for a piece leaving the staging strip and landing on tile 1
  after a 1 or a 6. Entry is a single motion rather than a tile-by-tile walk, so a
  short whoosh suits it.

- **2026-09-02:** Added MP3 versions of all 12 sounds for iOS WebKit compatibility
  (iOS Safari cannot decode OGG Vorbis). MP3 files were transcoded from the original
  Kenney OGG sources using ffmpeg (libmp3lame, VBR quality 2). The game now detects
  MP3 support via `HTMLMediaElement.canPlayType('audio/mpeg')` and uses MP3 when
  available, falling back to OGG otherwise.

All twelve files are Kenney CC0 1.0, the same upstream and licence as every other
file here, so the single-contributor licence gate is unaffected.
