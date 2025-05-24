// Get our canvas and its drawing context
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Get references to our score display and start button
const scoreDisplay = document.getElementById('score');
const startButton = document.getElementById('startButton');

// --- Game Settings ---
const gridSize = 20; // Each snake segment and food item will be 20x20 pixels
let snake = [];      // Array to hold the snake's segments
let food = {};       // Object to hold the normal food's position
let shrinkFood = {}; // Object for the shrink food's position
let direction = 'right'; // Initial direction of the snake
let score = 0;       // Player's score
let gameInterval;    // Variable to store our game loop interval
let gameSpeed = 150; // How fast the snake moves (milliseconds between frames)
let isGameOver = true; // Tracks if the game is over

// Enemy settings
let enemies = [];      // Array to hold enemy objects
const maxEnemies = 3;  // Maximum number of enemies
const enemySpeedFactor = 0.7; // How fast enemies move relative to snake (e.g., 0.7 means 70% of snake speed)
const scoreToSpawnEnemies = 1; // Score at which enemies start appearing

// Shrink food settings
const shrinkFoodActive = true; // Set to false to disable this feature
const shrinkFoodChance = 0.2; // 20% chance for food to be shrinkFood instead of normal

// --- Drawing Functions ---

// Draws a single square on the canvas
function drawSquare(x, y, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x * gridSize, y * gridSize, gridSize, gridSize);
    ctx.strokeStyle = '#333'; // Optional: add a dark border for segments
    ctx.strokeRect(x * gridSize, y * gridSize, gridSize, gridSize);
}

// Draws the entire snake
function drawSnake() {
    snake.forEach(segment => drawSquare(segment.x, segment.y, 'lime')); // Green snake
}

// Draws the normal food
function drawFood() {
    // Draw only if normal food exists
    if (food.x !== undefined) {
        drawSquare(food.x, food.y, 'red'); // Red food
    }
}

// Draws the shrink food
function drawShrinkFood() {
    // Draw only if shrinkFood exists
    if (shrinkFood.x !== undefined) {
        drawSquare(shrinkFood.x, shrinkFood.y, 'orange'); // Orange color for shrink food
    }
}

// Draws the enemies
function drawEnemies() {
    enemies.forEach(enemy => drawSquare(enemy.x, enemy.y, 'purple')); // Purple enemies
}

// Clears the entire canvas
function clearCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

// --- Game Logic Functions ---

// Places food at a random position on the grid (now handles both types)
function generateFood() {
    let newFoodX, newFoodY;
    let collisionDetected;
    let type = 'normal'; // Default to normal food

    // Decide if it's shrink food or normal food (if feature is active)
    if (shrinkFoodActive && Math.random() < shrinkFoodChance) {
        type = 'shrink';
    }

    do {
        // Generate random coordinates within the canvas grid
        newFoodX = Math.floor(Math.random() * (canvas.width / gridSize));
        newFoodY = Math.floor(Math.random() * (canvas.height / gridSize));

        // Check against snake, enemies, and the OTHER food type
        collisionDetected = snake.some(segment => segment.x === newFoodX && segment.y === newFoodY) ||
                            enemies.some(enemy => enemy.x === newFoodX && enemy.y === newFoodY);

        // Also ensure the new food doesn't spawn on top of the other food type
        if (type === 'normal' && shrinkFood.x === newFoodX && shrinkFood.y === newFoodY) {
            collisionDetected = true;
        } else if (type === 'shrink' && food.x === newFoodX && food.y === newFoodY) {
            collisionDetected = true;
        }

    } while (collisionDetected);

    if (type === 'normal') {
        food = { x: newFoodX, y: newFoodY };
        shrinkFood = {}; // Clear old shrink food position
    } else { // type === 'shrink'
        shrinkFood = { x: newFoodX, y: newFoodY };
        food = {}; // Clear old normal food position
    }
}

// Function to add a new enemy if conditions are met
function addEnemy() {
    if (enemies.length < maxEnemies && score >= scoreToSpawnEnemies) {
        let newEnemyX, newEnemyY;
        let collisionDetected;

        do {
            // Generate random coordinates within the canvas grid
            newEnemyX = Math.floor(Math.random() * (canvas.width / gridSize));
            newEnemyY = Math.floor(Math.random() * (canvas.height / gridSize));

            // Ensure enemy doesn't spawn on snake, food, or other enemies
            collisionDetected = snake.some(segment => segment.x === newEnemyX && segment.y === newEnemyY) ||
                                (food.x === newEnemyX && food.y === newEnemyY) ||
                                (shrinkFood.x === newEnemyX && shrinkFood.y === newEnemyY) ||
                                enemies.some(enemy => enemy.x === newEnemyX && enemy.y === newEnemyY);
        } while (collisionDetected);

        enemies.push({ x: newEnemyX, y: newEnemyY });
    }
}

// Moves enemies towards the snake's head
function moveEnemies() {
    if (isGameOver) return;

    const snakeHead = snake[0];

    enemies.forEach((enemy, index) => {
        // Only move enemies every few frames to control their speed relative to the snake
        if (Math.random() > enemySpeedFactor) {
            return; // Skip movement this frame for this enemy
        }

        let dx = snakeHead.x - enemy.x;
        let dy = snakeHead.y - enemy.y;

        // Prioritize moving towards the snake's general direction
        // Try to move horizontally first if horizontal distance is greater, then vertically
        if (Math.abs(dx) > Math.abs(dy)) {
            // Move horizontally
            if (dx > 0) {
                enemy.x++;
            } else if (dx < 0) {
                enemy.x--;
            }
        } else {
            // Move vertically
            if (dy > 0) {
                enemy.y++;
            } else if (dy < 0) {
                enemy.y--;
            }
        }

        // --- Enemy-Snake Collision Check ---
        // If enemy hits snake head
        if (enemy.x === snakeHead.x && enemy.y === snakeHead.y) {
            endGame();
            return;
        }

        // If enemy hits any part of the snake's body
        for (let i = 1; i < snake.length; i++) {
            if (enemy.x === snake[i].x && enemy.y === snake[i].y) {
                endGame();
                return;
            }
        }

        // Optional: Ensure enemies don't overlap with food (less critical, but good practice)
        if (enemy.x === food.x && enemy.y === food.y) {
            generateFood(); // If enemy lands on food, regenerate food
        }
        if (enemy.x === shrinkFood.x && enemy.y === shrinkFood.y) {
            generateFood(); // If enemy lands on shrink food, regenerate food
        }
    });
}

// Moves the snake and handles collisions
function moveSnake() {
    if (isGameOver) return; // Stop moving if the game is over

    // Get the current head position
    const head = { x: snake[0].x, y: snake[0].y };

    // Update the head's position based on the current direction
    switch (direction) {
        case 'up':
            head.y--;
            break;
        case 'down':
            head.y++;
            break;
        case 'left':
            head.x--;
            break;
        case 'right':
            head.x++;
            break;
    }

    // --- Collision Detection ---

    // 1. Wall collision
    if (head.x < 0 || head.x >= canvas.width / gridSize ||
        head.y < 0 || head.y >= canvas.height / gridSize) {
        endGame();
        return;
    }

    // 2. Self-collision (head hits any part of the body)
    for (let i = 1; i < snake.length; i++) {
        if (head.x === snake[i].x && head.y === snake[i].y) {
            endGame();
            return;
        }
    }

    // Add the new head to the beginning of the snake array
    snake.unshift(head);

    // Check if normal food was eaten
    if (head.x === food.x && head.y === food.y) {
        score++; // Increase score
        scoreDisplay.textContent = `Score: ${score}`; // Update score display
        generateFood(); // Generate next food (could be normal or shrink)
        // Important: Don't remove the tail, so the snake grows!
    }
    // Check if shrink food was eaten
    else if (shrinkFoodActive && head.x === shrinkFood.x && head.y === shrinkFood.y) {
        score = Math.max(0, score - 1); // Decrease score, but not below 0
        scoreDisplay.textContent = `Score: ${score}`;
        generateFood(); // Generate next food
        // Remove 2 segments for shrink food, but ensure snake doesn't disappear
        if (snake.length > 3) { // Ensure snake has at least 3 segments
            snake.pop(); // Remove tail
            snake.pop(); // Remove another segment
        } else if (snake.length > 1) { // If only 2-3 segments left, just remove one
            snake.pop();
        } else {
            // If snake length is 1, hitting shrink food means game over
            endGame(); // Snake becomes too short, game over
            return; // Exit function immediately
        }
    }
    else {
        snake.pop(); // Remove the last segment (tail) if no food was eaten
    }
}

// Ends the game
function endGame() {
    isGameOver = true;
    clearInterval(gameInterval); // Stop the game loop
    ctx.fillStyle = 'white';
    ctx.font = '30px "Press Start 2P"'; // Use pixel font for game over
    ctx.textAlign = 'center';
    ctx.fillText('Game Over!', canvas.width / 2, canvas.height / 2 - 15);
    ctx.font = '20px "Press Start 2P"';
    ctx.fillText('Score: ' + score, canvas.width / 2, canvas.height / 2 + 25);
    startButton.textContent = 'Play Again'; // Change button text
    startButton.style.display = 'block'; // Show the start button
}

// The main game loop - runs repeatedly
function gameLoop() {
    clearCanvas(); // Clear the previous frame

    moveSnake();   // Move the snake

    // Check if we should add/move enemies
    if (score >= scoreToSpawnEnemies) {
        // Add a new enemy occasionally if maxEnemies not reached
        // This is a simple probabilistic approach, adjust as needed.
        if (Math.random() < 0.01 && enemies.length < maxEnemies) { // 1% chance per frame to add an enemy
            addEnemy();
        }
        moveEnemies(); // Move the enemies
        drawEnemies(); // Draw the enemies
    }

    drawFood();        // Draw the normal food
    drawShrinkFood();  // Draw the shrink food
    drawSnake();       // Draw the snake
}

// --- Event Listeners ---

// Handles keyboard input for changing snake direction
document.addEventListener('keydown', e => {
    if (isGameOver) return; // Don't allow input if game is over

    // Prevent turning immediately back on itself
    switch (e.key) {
        case 'ArrowUp':
        case 'w':
            if (direction !== 'down') direction = 'up';
            break;
        case 'ArrowDown':
        case 's':
            if (direction !== 'up') direction = 'down';
            break;
        case 'ArrowLeft':
        case 'a':
            if (direction !== 'right') direction = 'left';
            break;
        case 'ArrowRight':
        case 'd':
            if (direction !== 'left') direction = 'right';
            break;
    }
});

// Starts or restarts the game when the button is clicked
startButton.addEventListener('click', () => {
    // Reset game state
    snake = [
        { x: 10, y: 10 }, // Initial head position
        { x: 9, y: 10 },
        { x: 8, y: 10 }
    ];
    direction = 'right';
    score = 0;
    scoreDisplay.textContent = `Score: ${score}`;
    isGameOver = false;
    enemies = []; // Clear enemies on start/restart
    food = {};       // Clear normal food
    shrinkFood = {}; // Clear shrink food

    generateFood(); // This will now handle both types
    clearInterval(gameInterval); // Clear any old game loops
    gameInterval = setInterval(gameLoop, gameSpeed); // Start the new game loop

    startButton.style.display = 'none'; // Hide the start button
});

// Initially show the start button when the page loads
startButton.style.display = 'block';