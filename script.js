// --- Setup ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game state variables
let bird;
let pipes = [];
let score = 0;
let isGameOver = false;
let gameSpeed = 3;
let pipeSpawnRate = 1500; // ms

// Background elements
let clouds = [];
let trees = [];
let cloudSpawnRate = 3000; // ms
let treeSpawnRate = 2000; // ms

// --- Constants ---
const BIRD_SIZE = 30;
const BIRD_JUMP = -7;
const GRAVITY = 0.4;
const PIPE_WIDTH = 50;
const PIPE_GAP = 150;

// --- Game Objects ---

// 1. Bird Object
const Bird = {
    x: 50,
    y: canvas.height / 2,
    velocityY: 0,
    
    draw() {
        ctx.fillStyle = 'yellow';
        ctx.fillRect(this.x, this.y, BIRD_SIZE, BIRD_SIZE);
        
        ctx.fillStyle = 'black';
        ctx.fillRect(this.x + BIRD_SIZE - 5, this.y + 5, 3, 3);
    },
    
    update() {
        this.velocityY += GRAVITY;
        this.y += this.velocityY;
        
        if (this.velocityY > 10) this.velocityY = 10;
        
        // Check for floor/ceiling collision
        if (this.y + BIRD_SIZE > canvas.height || this.y < 0) {
            endGame();
        }
    },
    
    jump() {
        this.velocityY = BIRD_JUMP;
    }
};

// 2. Pipe Class
class Pipe {
    constructor(x, topHeight) {
        this.x = x;
        this.topHeight = topHeight;
        this.bottomY = topHeight + PIPE_GAP;
        this.counted = false;
    }

    draw() {
        ctx.fillStyle = 'green';
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 3;
        
        // Top pipe
        ctx.fillRect(this.x, 0, PIPE_WIDTH, this.topHeight);
        ctx.strokeRect(this.x, 0, PIPE_WIDTH, this.topHeight);

        // Bottom pipe
        ctx.fillRect(this.x, this.bottomY, PIPE_WIDTH, canvas.height - this.bottomY);
        ctx.strokeRect(this.x, this.bottomY, PIPE_WIDTH, canvas.height - this.bottomY);
    }
    
    update() {
        this.x -= gameSpeed;
    }

    checkCollision(bird) {
        // Horizontal collision check
        if (bird.x + BIRD_SIZE > this.x && bird.x < this.x + PIPE_WIDTH) {
            // Vertical collision check
            if (bird.y < this.topHeight || bird.y + BIRD_SIZE > this.bottomY) {
                return true; // Collision detected!
            }
        }
        return false;
    }
}

// 3. Cloud Object
class Cloud {
    constructor(x, y, width, height) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.speed = gameSpeed * 0.5; // Clouds move slower
    }

    draw() {
        ctx.fillStyle = 'white';
        ctx.beginPath();
        // Simple oval shapes for a fluffy cloud
        ctx.ellipse(this.x, this.y, this.width / 2, this.height / 2, 0, 0, Math.PI * 2);
        ctx.ellipse(this.x + this.width * 0.6, this.y + this.height * 0.2, this.width * 0.4, this.height * 0.4, 0, 0, Math.PI * 2);
        ctx.ellipse(this.x - this.width * 0.4, this.y + this.height * 0.1, this.width * 0.3, this.height * 0.3, 0, 0, Math.PI * 2);
        ctx.fill();
    }

    update() {
        this.x -= this.speed;
    }
}

// 4. Tree Object (Fluffy Canopy)
class Tree {
    constructor(x, y, height) {
        this.x = x;
        this.y = y; 
        this.height = height;
        this.speed = gameSpeed * 0.8; 
        this.trunkWidth = 15;
        this.canopyRadius = 30;
    }

    draw() {
        const topOfTrunk = this.y - this.height;

        // 1. Trunk (Brown Rectangle)
        ctx.fillStyle = '#8B4513'; // Brown
        ctx.fillRect(this.x, topOfTrunk, this.trunkWidth, this.height);

        // 2. Canopy (Fluffy Green Circles)
        ctx.fillStyle = '#228B22'; // Forest Green
        ctx.beginPath();
        
        // Overlapping circles to form a fluffy shape
        ctx.arc(this.x + this.trunkWidth / 2 - 15, topOfTrunk + 5, this.canopyRadius, 0, Math.PI * 2);
        ctx.arc(this.x + this.trunkWidth / 2, topOfTrunk - 10, this.canopyRadius, 0, Math.PI * 2);
        ctx.arc(this.x + this.trunkWidth / 2 + 15, topOfTrunk + 5, this.canopyRadius, 0, Math.PI * 2);
        ctx.arc(this.x + this.trunkWidth / 2, topOfTrunk + 20, this.canopyRadius, 0, Math.PI * 2);

        ctx.fill(); 
        
        // Outline for definition
        ctx.strokeStyle = '#145A32'; 
        ctx.lineWidth = 3;
        ctx.stroke();
    }

    update() {
        this.x -= this.speed;
    }
}


// --- Game Loop Functions ---

function spawnPipe() {
    const minHeight = 50;
    const maxHeight = canvas.height - PIPE_GAP - 50;
    const topHeight = Math.floor(Math.random() * (maxHeight - minHeight + 1)) + minHeight;
    
    pipes.push(new Pipe(canvas.width, topHeight));
}

function spawnCloud() {
    const y = Math.random() * (canvas.height / 2 - 50) + 20; // Upper half
    const width = Math.random() * (100 - 60) + 60;
    const height = width * 0.6; 
    clouds.push(new Cloud(canvas.width, y, width, height));
}

function spawnTree() {
    const height = Math.random() * (100 - 50) + 50; // Random tree height
    trees.push(new Tree(canvas.width, canvas.height, height)); // Trees always at the bottom
}

// Draw the score and instructions
function drawHUD() {
    ctx.fillStyle = 'white';
    ctx.font = '30px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('Score: ' + score, 10, 40);
    
    if (isGameOver) {
        ctx.fillStyle = 'red';
        ctx.font = '50px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('GAME OVER!', canvas.width / 2, canvas.height / 2);
        ctx.font = '20px Arial';
        ctx.fillText('Click or Space to Restart', canvas.width / 2, canvas.height / 2 + 40);
    }
}

// The main game update/draw loop
function gameLoop() {
    if (isGameOver) return;

    // 1. Clear the screen
    ctx.clearRect(0, 0, canvas.width, canvas.height); 
    
    // 2. Update and Draw Clouds (Background Layer)
    for (let i = clouds.length - 1; i >= 0; i--) {
        const cloud = clouds[i];
        cloud.update();
        cloud.draw();
        if (cloud.x + cloud.width < 0) {
            clouds.splice(i, 1);
        }
    }

    // 3. Update and Draw Trees (Middle Layer)
    for (let i = trees.length - 1; i >= 0; i--) {
        const tree = trees[i];
        tree.update();
        tree.draw();
        if (tree.x + 50 < 0) {
            trees.splice(i, 1);
        }
    }

    // 4. Update and Draw Pipes (Foreground Layer)
    for (let i = pipes.length - 1; i >= 0; i--) {
        const pipe = pipes[i];
        pipe.update();
        pipe.draw();

        if (pipe.checkCollision(Bird)) {
            endGame();
        }

        // Scoring logic
        if (!pipe.counted && pipe.x + PIPE_WIDTH < Bird.x) {
            score++;
            pipe.counted = true;
        }

        if (pipe.x + PIPE_WIDTH < 0) {
            pipes.splice(i, 1);
        }
    }

    // 5. Update and Draw Bird (Top Layer)
    Bird.update();
    Bird.draw();

    // 6. Draw HUD
    drawHUD();
    
    // 7. Request next frame
    requestAnimationFrame(gameLoop);
}

// --- Game Control ---

let pipeInterval, cloudInterval, treeInterval;

function startGame() {
    // Reset state
    Bird.y = canvas.height / 2;
    Bird.velocityY = 0;
    pipes = [];
    clouds = []; 
    trees = [];  
    score = 0;
    isGameOver = false;
    
    // Clear any previous intervals
    if (pipeInterval) clearInterval(pipeInterval);
    if (cloudInterval) clearInterval(cloudInterval);
    if (treeInterval) clearInterval(treeInterval);

    // Set up new intervals for element spawning
    pipeInterval = setInterval(spawnPipe, pipeSpawnRate);
    cloudInterval = setInterval(spawnCloud, cloudSpawnRate); 
    treeInterval = setInterval(spawnTree, treeSpawnRate);   
    
    gameLoop();
}

function endGame() {
    isGameOver = true;
    
    // Stop intervals when game over
    clearInterval(pipeInterval);
    clearInterval(cloudInterval);
    clearInterval(treeInterval);
    
    drawHUD(); 
}

function restartGame() {
    if (isGameOver) {
        startGame();
    }
}

// --- Input Handling ---
document.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
        if (isGameOver) {
            restartGame();
        } else {
            Bird.jump();
        }
    }
});

document.addEventListener('mousedown', () => {
    if (isGameOver) {
        restartGame();
    } else {
        Bird.jump();
    }
});

// Start the game when the page loads
startGame();
