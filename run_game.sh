#!/bin/bash

# Script to (a) relaunch the web server and (b) print instructions for user

# Kill any existing python http.server on port 8000
echo "Stopping any existing web server on port 8000..."
pkill -f "python3 -m http.server 8000" >/dev/null 2>&1

# Start the web server in the background
echo "Starting web server on port 8000..."
cd "$(dirname "$0")" && python3 -m http.server 8000 > server.log 2>&1 &

# Get the PID of the background process
SERVER_PID=$!

# Wait a moment to ensure the server starts
sleep 2

# Check if the server is running
if pgrep -f "python3 -m http.server 8000" > /dev/null; then
    echo "Web server started successfully (PID: $SERVER_PID)."
else
    echo "Failed to start web server. Check server.log for details."
    exit 1
fi

# Print instructions for the user
echo ""
echo "=== Indian Snakes and Ladders Game ==="
echo ""
echo "To play the game, open your web browser and navigate to:"
echo "  http://localhost:8000"
echo ""
echo "Game Instructions:"
echo "- Click 'Roll Dice' to roll the dice"
echo "- Players start off-board (position 0)"
echo "- Need to roll a 1 or 6 to enter the board at tile 1"
echo "- Exact roll required to reach tile 100 (no overshooting)"
echo "- Landing on a ladder moves you up"
echo "- Landing on a snake moves you down"
echo "- Landing on an opponent's token (not in safe zones 0, 1, 100) sends that opponent back to start"
echo "- Rolling a 6 gives you an extra roll"
echo "- Three consecutive 6s trigger a penalty: your turn ends and you return to your starting position for that turn"
echo "- First player to reach tile 100 exactly wins"
echo ""
echo "To stop the web server, run:"
echo "  pkill -f 'python3 -m http.server 8000'"
echo ""
echo "Or, if you started this script from the terminal, you can also stop it with:"
echo "  kill $SERVER_PID"
echo ""
echo "Server logs are available in: server.log"
echo ""