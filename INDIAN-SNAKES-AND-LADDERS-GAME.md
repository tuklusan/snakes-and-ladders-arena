# Technical Specification: Indian-Style Snakes and Ladders (Chaturanga-based)

## 1. Overview
A deterministic, 4-player, turn-based board game played on a 10x10 grid (tiles 1-100). The game incorporates non-linear traversal via "Snakes" (downgrades) and "Ladders" (upgrades), with competitive "Capture" mechanics.

## 2. Game State
- **Board:** 100-cell linear path indexed 1 to 100.
- **Players:** 4 unique pawns.
- **State Variables:**
    - `pawn_positions`: Array of 4 integers, range [0, 100].
    - `active_player`: Index [1, 4].
    - `consecutive_sixes`: Integer counter [0, 2].
    - `SafeZones`: Tiles {0, 1, 100}.

## 3. Ruleset & Logic
### 3.1. Movement
- Pawns start at 0 (Off-board).
- Entering board requires rolling a 1 or 6.
- Movement = `position + die_roll`.
- **Constraint:** Overshooting 100 is invalid; position remains unchanged.

### 3.2. Entities
- **Ladders:** If `target_tile` is a key in `LadderMap`, set `position = LadderMap[key]`.
- **Snakes:** If `target_tile` is a key in `SnakeMap`, set `position = SnakeMap[key]`.

### 3.3. Capture (Katti)
- If `target_tile` is NOT a `SafeZone` and occupied by an opponent, the opponent's pawn returns to 0.

### 3.4. Turn Dynamics
- Rolling a 6 grants an extra turn.
- Rolling three consecutive 6s resets all movement for that turn to the `turn_start_position`.

## 4. Pseudocode Algorithm
```text
FUNCTION ProcessTurn(active_player, die_roll):
    // 1. Snapshot
    IF consecutive_sixes == 0: turn_start = pawn_positions[active_player]
    
    // 2. Penalty
    IF die_roll == 6:
        consecutive_sixes += 1
        IF consecutive_sixes == 3:
            pawn_positions[active_player] = turn_start
            consecutive_sixes = 0
            RETURN REVERTED
    ELSE:
        consecutive_sixes = 0
        
    // 3. Traversal & Capture
    target = CalculateMovement(pawn_positions[active_player], die_roll)
    target = ResolveEntities(target)
    IF target NOT IN SafeZones: PerformCapture(target)
    
    // 4. Update
    pawn_positions[active_player] = target
    IF die_roll != 6: AdvanceTurn()
```
