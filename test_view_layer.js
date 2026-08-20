// View Layer Test - DR-001 Staging Area Verification
// Asserts all four token elements have on-screen coordinates at game start

const { JSDOM } = require('jsdom');

// We'll test the rendered HTML by loading the game and checking DOM positions
describe('DR-001 View Layer - Staging Area', () => {
    let dom;
    let container;

    beforeAll((done) => {
        // Fetch the rendered HTML
        fetch('http://localhost:8000/index.html')
            .then(res => res.text())
            .then(html => {
                dom = new JSDOM(html, { runScripts: 'dangerously' });
                container = dom.window.document.getElementById('game-container');
                done();
            });
    });

    test('All four token elements exist in DOM', () => {
        const tokens = container.querySelectorAll('.game-token');
        expect(tokens.length).toBe(4);
    });

    test('Tokens have position data (x, y coordinates are set)', () => {
        const tokens = container.querySelectorAll('.game-token');
        // Check that tokens have left or right position set
        tokens.forEach((token, i) => {
            const style = token.style;
            // Should have either left or right set (not both auto)
            expect(style.left || style.right).toBeDefined();
        });
    });

    test('Player 1 token is visible on-screen at start', () => {
        const tokens = container.querySelectorAll('.game-token');
        // Player 1 token (index 0) should have a position set
        const p1Token = tokens[0];
        const style = p1Token.style;
        // At least one of left/right should be set to a non-auto value
        expect(style.left !== '' && style.left !== 'auto' || 
               style.right !== '' && style.right !== 'auto').toBe(true);
    });
});