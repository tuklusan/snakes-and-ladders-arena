## DR-001 Staging Area Specification

### 1. Off-Board Token Placement (Staging Area)
**Location:**
- Tokens shall be placed in a designated staging area located to the **right side of the game board**, aligned vertically with the bottom row of the board.
- Position: `right: 110%; top: 50%;` (relative to the board container)

**Visual Properties:**
- **Size:** 20x20px (matches in-board token size)
- **Label:** Player number (1-4) centered below each token
- **Color:** Match the token's assigned color (e.g., red for player 1)

### 2. Token Movement Animation
**Entry to Board:**
- When a token moves from staging to board (via 1 or 6), animate with:
  - 0.3s duration
  - Ease-in-out timing function
  - Slight scale-up (1.2x) during transition

**Return from Katti Capture:**
- When a token is sent back by a Katti snake, animate with:
  - 0.4s duration
  - Ease-out timing function
  - Slight bounce effect on arrival in staging area

### 3. Persistent Visibility
- The staging area must remain visible at all times, even when no tokens are present
- Tokens must be visible in staging area during all phases except during their movement animations
[CTOApproved]