const fs = require('fs');
const { JSDOM } = require('jsdom');

// Load the index.html to get the game
const indexHtml = fs.readFileSync('./index.html', 'utf8');

async function runGameWithFixedDie() {
  const dom = await JSDOM.fromFile('./index.html', {
    runScripts: 'dangerously',
    resources: 'usable',
    pretendToBeVisual: true,
  });
  const window = dom.window;
  const document = window.document;

  // Wait for the game to load
  await new Promise((resolve) => {
    if (window.gameController) {
      resolve();
    } else {
      window.addEventListener('load', () => {
        // Wait a bit for scripts to load
        setTimeout(resolve, 1000);
      });
    }
  });

  // Override the rollDice method to return a fixed sequence
  const originalRollDice = window.gameController.rollDice.bind(window.gameController);
  const dieSequence = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1]; // default, we'll change
  let sequenceIndex = 0;

  // We want a sequence that leads to a win quickly.
  // Let's design a sequence for player 0 to reach 100.
  // We'll use a sequence that avoids snakes and uses ladders.
  // Based on the board:
  // Ladders: 2->38, 7->14, 8->31, 15->26, 21->42, 28->84, 36->44, 51->67, 71->91, 78->98, 87->94
  // Snakes: 16->6, 46->25, 49->11, 62->19, 64->60, 74->53, 89->68, 92->51, 95->75, 99->80
  // Safe zones: 0,1,100
  // We start at 0 (off-board). Need 1 or 6 to enter.
  // Let's try: 1 (to 1, then ladder? 1 is not a ladder start)
  // Actually, 1 is safe, no ladder.
  // From 1, we can go to 2 by rolling 1 -> then ladder to 38.
  // From 38, we can go to 40 by rolling 2 -> no ladder/snake.
  // From 40, we can go to 45 by rolling 5 -> no.
  // From 45, we can go to 46 (snake to 25) -> bad.
  // Let's try to use the ladder at 28->84.
  // We need to get to 28.
  // From 1, we can go to 2 (1) -> ladder to 38.
  // From 38, we can go to 40 (2) -> 40.
  // From 40, we can go to 45 (5) -> 45.
  // From 45, we can go to 46 (1) -> snake to 25 -> bad.
  // Let's try a different approach: use the ladder at 7->14.
  // From 1, roll 6 to 7 -> ladder to 14.
  // From 14, we can go to 15 (1) -> ladder to 26.
  // From 26, we can go to 28 (2) -> ladder to 84.
  // From 84, we can go to 91 (7) -> ladder to 91? Wait, 71->91, 78->98, 87->94.
  // Actually, 84 is not a ladder start.
  // From 84, we can go to 85 (1) -> 85.
  // From 85, we can go to 86 (1) -> 86.
  // From 86, we can go to 87 (1) -> ladder to 94.
  // From 94, we can go to 95 (1) -> snake to 75 -> bad.
  // From 94, we need 6 to reach 100, but 94+6=100 -> exact!
  // So sequence: 1 (enter), 6 (to 7->14), 1 (to 15->26), 2 (to 28->84), 1,1,1 (to 87->94), 6 (to 100)
  // Let's list: [1,6,1,2,1,1,1,6]
  // But we must avoid three sixes in a row. We have only one six at the start and one at the end, so safe.
  // However, note that when we roll a six, we get an extra roll if not three sixes.
  // We need to account for extra rolls.
  // Let's simulate the turns:
  // Turn 1 (player 0): roll 1 -> move from 0 to 1 (no extra roll because not 6)
  // Turn 2 (player 1): roll 6 -> move from 0 to 1 (extra roll) then roll again? Actually, the extra roll is for the same player if they rolled a six and not three sixes.
  // Wait, the rule: if you roll a six, you get another roll (unless it's the third six in a row).
  // So if player 1 rolls a six, they get to roll again immediately.
  // We want to control the sequence, so we need to account for extra rolls.
  // Let's instead use a sequence that avoids sixes until we want to use them, and when we use a six, we accept that the player gets an extra roll.
  // We can design the sequence to be used by the controller, and we will override the rollDice to return the next in the sequence regardless of whose turn it is.
  // The extra rolls are just additional calls to rollDice, so we need to provide enough numbers in the sequence for those extra rolls.
  // Let's simulate the game with our sequence and see what happens.

  // We'll write a simple simulation in our head, but it's better to let the game run and log.

  // Let's just use a sequence that is all 1s except for a few key rolls.
  // Since we are in a test, we can make the die always roll 1, but then the game will never progress because from 0 you need 1 or 6 to enter, and then you move 1 each time.
  // That would be very slow and might hit snakes.

  // Instead, let's use a sequence that we know works by looking at the debug harnesses.
  // There is a debug_game.js that might have a fixed die.

  // Let's check if there is a way to set a fixed die via a query parameter or a flag.

  // Look at the main.js: no.
  // Look at the gameController: no.

  // We can modify the gameController.js temporarily to use a fixed die when a flag is set.

  // Since we are allowed to make changes to fix the issue and verify, we can make a change, test, and then revert if needed.
  // However, the user wants to see evidence and then commit. We can make the change, verify, and then if it's only for testing we can remove it? But the user wants to see evidence of the fix.

  // Actually, the fix is already made (we added onGameWin). Now we need to verify that the game can finish and restart.

  // We can simply run the existing testGameLogicNode.js which tests the logic and passes, but that doesn't show the win announcement and restart.

  // We can run the diag_accept.html and look at the console output for the win announcement and restart.

  // Let's run the run_test.js again and capture the console output from the game.

  // We already ran run_test.js and saw the visual tests, but we didn't see the game logs because they were not printed in the test output.

  // We can modify the run_test.js to also collect the console logs from the iframe.

  // However, time is limited.

  // Let's create a simple test that uses the node game logic (testGameLogicNode.js) and then also simulate the view's onGameWin and handleGameOver.

  // We can create a mock view and controller and model in node and run the game with a fixed die.

  // Let's do that.

  // We'll create a test that uses the actual gameModel and gameController, but we replace the view with a mock that logs the calls to onGameWin and handleGameOver.

  // We'll also override the rollDice to return a fixed sequence.

  // We'll run the game until we see a win and then a restart.

  // We'll need to simulate the autoLoop as well.

  // The game has an autoRoll function in the view that calls controller.rollDice every 1.8 seconds when not game over.

  // We can simulate that by calling rollDice repeatedly with a delay.

  // But we can also just call processTurn directly with our die sequence.

  // Let's do that: we'll create a model, a controller, and a mock view, and then call processTurn with our die sequence in a loop until we see a win and then a restart.

  // We'll need to handle the autoRoll timing? Actually, the controller's processTurn is called by the view's autoRoll, which is called after each move.

  // We can instead call controller.rollDice() in a loop, which will call processTurn.

  // We'll override the controller's rollDice to return our fixed sequence.

  // Let's write the test.

  // First, we need to load the model and controller classes.

  // We can do it by requiring the files, but they are written for the browser (using window). We can use jsdom to load them, or we can rewrite them to be node-compatible.

  // Since we already have testGameLogicNode.js that works, we can see how they did it.

  // Look at testGameLogicNode.js.

  // It seems to just require the files directly? Let's check.

  // We'll do the same.

  // Let's exit this and look at testGameLogicNode.js.

  // But we are in the middle of writing a script. Let's instead run the existing testGameLogicNode.js and see if it logs anything about win.

  // We can modify testGameLogicNode.js to log the win and restart.

  // However, we are supposed to make minimal changes.

  // Let's create a new test file that uses the same approach as testGameLogicNode.js but adds logging for win and restart.

  // We'll copy testGameLogicNode.js and modify it.

  // But first, let's see what testGameLogicNode.js does.

  // We'll read it.

  // Let's do that now.