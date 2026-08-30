CONSTANTS:
    NUM_PLAYERS : Integer = 4
    SafeZones   : Set of Integers = {0, 1, 100}
    Ladders     : Map<Integer, Integer>  // Maps base tile -> top tile
    Snakes      : Map<Integer, Integer>  // Maps head tile -> tail tile

GLOBAL STATE:
    pawn_positions     : Array[1..NUM_PLAYERS] of Integer = [0, 0, ..., 0]
    active_player      : Integer = 1
    consecutive_sixes  : Integer = 0
    turn_start_position: Integer = 0
    game_over          : Boolean = FALSE
    winner             : Integer = NULL

ALGORITHM ProcessTurn(active_player, die_roll)
    INPUT: 
        active_player : Integer (1..NUM_PLAYERS)
        die_roll      : Integer (1..6)
    
    OUTPUT: 
        TurnResult : Enumeration { EXTRA_ROLL, TURN_ADVANCED, REVERTED_THREE_SIXES, GAME_WON }

    // -------------------------------------------------------------
    // PHASE 1: Triple-Six Penalty & Snapshot Tracking
    // -------------------------------------------------------------
    IF consecutive_sixes == 0 THEN
        turn_start_position <- pawn_positions[active_player]
    END IF

    IF die_roll == 6 THEN
        consecutive_sixes <- consecutive_sixes + 1
        IF consecutive_sixes == 3 THEN
            // Rollback all movement executed during this multi-roll turn
            pawn_positions[active_player] <- turn_start_position
            consecutive_sixes <- 0
            AdvanceTurn()
            RETURN REVERTED_THREE_SIXES
        END IF
    ELSE
        consecutive_sixes <- 0
    END IF

    current_pos <- pawn_positions[active_player]
    target_pos  <- current_pos

    // -------------------------------------------------------------
    // PHASE 2: Base Movement Calculation
    // -------------------------------------------------------------
    IF current_pos == 0 THEN
        // Off-board pawns require a 1 or a 6 to enter Tile 1
        IF die_roll == 1 OR die_roll == 6 THEN
            target_pos <- 1
        END IF
    ELSE
        // Exact landing rule: overshooting tile 100 voids movement
        IF current_pos + die_roll <= 100 THEN
            target_pos <- current_pos + die_roll
        END IF
    END IF

    // -------------------------------------------------------------
    // PHASE 3: Entity Traversal (Ladders & Snakes)
    // -------------------------------------------------------------
    IF target_pos IN Keys(Ladders) THEN
        target_pos <- Ladders[target_pos]
    ELSE IF target_pos IN Keys(Snakes) THEN
        target_pos <- Snakes[target_pos]
    END IF

    // -------------------------------------------------------------
    // PHASE 4: Opponent Capture Mechanics (Katti)
    // -------------------------------------------------------------
    IF target_pos NOT IN SafeZones THEN
        FOR opponent <- 1 TO NUM_PLAYERS DO
            IF opponent != active_player AND pawn_positions[opponent] == target_pos THEN
                pawn_positions[opponent] <- 0  // Opponent sent back to off-board reserve
            END IF
        END FOR
    END IF

    // -------------------------------------------------------------
    // PHASE 5: Position Commitment & Terminal State Evaluation
    // -------------------------------------------------------------
    pawn_positions[active_player] <- target_pos

    IF pawn_positions[active_player] == 100 THEN
        game_over <- TRUE
        winner    <- active_player
        RETURN GAME_WON
    END IF

    // -------------------------------------------------------------
    // PHASE 6: Turn Arbitrator
    // -------------------------------------------------------------
    IF die_roll == 6 THEN
        // Bonus roll awarded (consecutive_sixes < 3 guaranteed here)
        RETURN EXTRA_ROLL
    ELSE
        AdvanceTurn()
        RETURN TURN_ADVANCED
    END IF

END ALGORITHM

PROCEDURE AdvanceTurn()
    active_player <- (active_player MOD NUM_PLAYERS) + 1
END PROCEDURE
