# DR_WORK_ORDER_3 – Board Rendering Decision

**Chosen option:** OPTION A (recommended)

**Justification:**
- The current board artwork depicts a 7x9 grid (63 cells) which cannot represent the 100‑tile logical board used by the game model. Any attempt to map 100 tiles onto 63 cells leads to mismatched token positions and frozen gameplay (DR‑108).
- Generating the grid, tile numbers, and snake/ladder connectors directly from the model’s `Ladders` and `Snakes` maps guarantees that the visual representation is always consistent with the game rules, eliminating the architectural mismatch.
- This approach avoids altering existing art assets, preserves decorative background, and requires only DOM/CSS generation logic, which is straightforward to implement and maintain.
- OPTION B would involve creating or sourcing a new 10x10 board image and rewriting the model’s jump tables to match the artwork, a fragile and labor‑intensive solution that could break with future rule changes.

**Outcome:** The board will be rendered programmatically, ensuring 100 addressable cells and correct snake/ladder connections, satisfying DR‑108.
