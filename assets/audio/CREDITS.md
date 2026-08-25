# Audio asset credits

All twelve sound-effect files are sourced from Kenney.nl free asset packs
and distributed under the **Creative Commons CC0 1.0 Universal (Public
Domain Dedication)** license. Attribution is not required by CC0, but is
included below as a courtesy and for the licence-gate audit trail.

**Upstream author:** Kenney (Kenney Vleugels), https://kenney.nl
**Upstream licence:** CC0 1.0 — https://creativecommons.org/publicdomain/zero/1.0/
**Format:** OGG Vorbis (small, high-quality, decodable with stb_vorbis.h).

| Game file             | Source pack       | Source filename              | Game event                       |
|-----------------------|-------------------|------------------------------|----------------------------------|
| `roll.ogg`            | Casino Audio      | `dice-shake-1.ogg`           | Dice starting to roll            |
| `settle.ogg`          | Casino Audio      | `dice-throw-1.ogg`           | Dice settling on the board       |
| `step.ogg`            | Interface Sounds  | `click_001.ogg`              | Token step (per cell)            |
| `ladder.ogg`          | Digital Audio     | `powerUp12.ogg`              | Ladder climb                     |
| `snake.ogg`           | Digital Audio     | `phaserDown2.ogg`            | Snake bite (slide down)          |
| `six.ogg`             | Interface Sounds  | `confirmation_001.ogg`       | Rolled a 6 (extra turn granted)  |
| `triple_six.ogg`      | Interface Sounds  | `error_004.ogg`              | Three consecutive 6s (cancelled) |
| `turn.ogg`            | Interface Sounds  | `bong_001.ogg`               | Turn change                      |
| `win.ogg`             | Digital Audio     | `zapThreeToneUp.ogg`         | Player wins                      |
| `gameover.ogg`        | Digital Audio     | `zapThreeToneDown.ogg`       | Game over / all players finished |
| `capture.ogg`         | Sci-Fi Sounds     | `explosionCrunch_000.ogg`  | Katti - opponent sent to staging |
| `enter.ogg`           | Digital Audio     | `phaseJump1.ogg`             | Piece exits staging onto tile 1  |

**Pack download URLs (as fetched on 2026-08-12):**
- Casino Audio:    https://kenney.nl/media/pages/assets/casino-audio/2472606a04-1721639069/kenney_casino-audio.zip
- Interface Sounds: https://kenney.nl/media/pages/assets/interface-sounds/fa43c1dd4d-1677589452/kenney_interface-sounds.zip
- Impact Sounds:   https://kenney.nl/media/pages/assets/impact-sounds/87b4ddecda-1677589768/kenney_impact-sounds.zip
- Digital Audio:   https://kenney.nl/media/pages/assets/digital-audio/216eac4753-1677590265/kenney_digital-audio.zip

## Amendments

- `ladder.ogg` was originally `phaserUp2.ogg`, a sci-fi sweep that did not read
  as climbing. Replaced with `powerUp12.ogg` (0.86s), an ascending musical
  figure whose length matches the connector traversal.
- `capture.ogg` added from the Impact Sounds pack. The code had been calling
  playAudio(capture) against a file that never existed, so a Katti capture -
  the most dramatic event in the game - was silent. explosionCrunch_000.ogg
  (0.65s) is decisive and distinct from the wooden `settle` thud.

Both are Kenney CC0 1.0, the same upstream and licence as every other file here,
so the single-contributor licence gate is unaffected.

- `enter.ogg` added from the Digital Audio pack: `phaseJump1.ogg` (0.47s), a
  short sweep for a piece leaving the staging strip and landing on tile 1 after
  a 1 or a 6. Entry is a single motion rather than a tile-by-tile walk, so a
  whoosh suits it. Kenney CC0, same upstream and licence as the rest.

- capture.ogg replaced again at the client request: a bomb rather than a punch.
  Now explosionCrunch_000.ogg (0.78s) from the Kenney Sci-Fi Sounds pack, kept
  under a second so it does not drag the turn. Kenney CC0.
  Pack: https://kenney.nl/media/pages/assets/sci-fi-sounds/6b296f9ecf-1677589334/kenney_sci-fi-sounds.zip
