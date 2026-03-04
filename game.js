// Vim Quest - A text-based adventure game for learning Vim commands

class VimQuest {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.mode = 'normal';  // 'normal' or 'insert'
        this.gridWidth = 32;   // Characters per row
        this.gridHeight = 24;  // Character rows
        this.cellSize = 20;    // Pixels per character
        
        // Game state
        this.player = { x: 1, y: 1 };
        this.currentRoom = 'tutorial';
        this.currentLevel = 1;
        this.messages = [];
        this.lastBlinkTime = 0;
        this.cursorVisible = true;
        this.clipboard = ''; // For copy/paste operations
        
        // UI elements
        this.modeDisplay = document.getElementById('mode-display');
        this.levelDisplay = document.getElementById('level-display');
        this.roomDisplay = document.getElementById('room-display');
        this.hintText = document.getElementById('hint-text');
        this.messageLog = document.querySelector('.message-log');
        
        this.initializeRoom();
        this.setupEventListeners();
        this.gameLoop();
    }

    initializeRoom() {
        // All game rooms
        this.rooms = {
            tutorial: {
                name: "Tutorial Chamber",
                level: 1,
                width: 32,
                height: 24,
                tiles: this.createTutorialRoom(),
                objectives: [
                    "Use h/j/k/l to move to the first word marker",
                    "Press 'w' to jump to the next word",
                    "Navigate to the exit 'E'",
                    "Try 'x' to remove the obstacle '#'",
                    "Use 'i' to enter insert mode and collect the gem"
                ],
                currentObjective: 0,
                nextRoom: 'advanced'
            },
            advanced: {
                name: "Advanced Chamber",
                level: 2,
                width: 32,
                height: 24,
                tiles: this.createAdvancedRoom(),
                objectives: [
                    "Use 'dd' to delete entire lines",
                    "Use 'yy' to copy (yank) lines", 
                    "Use 'p' to paste copied content",
                    "Use 'u' to undo your actions",
                    "Solve the text manipulation puzzle"
                ],
                currentObjective: 0,
                nextRoom: null
            }
        };
        
        this.currentRoomData = this.rooms[this.currentRoom];
        this.updateUI();
    }

    createTutorialRoom() {
        // Create empty grid
        const tiles = Array(this.gridHeight).fill().map(() => 
            Array(this.gridWidth).fill(' ')
        );
        
        // Add borders
        for (let x = 0; x < this.gridWidth; x++) {
            tiles[0][x] = '═';
            tiles[this.gridHeight - 1][x] = '═';
        }
        for (let y = 0; y < this.gridHeight; y++) {
            tiles[y][0] = '║';
            tiles[y][this.gridWidth - 1] = '║';
        }
        
        // Corner pieces
        tiles[0][0] = '╔';
        tiles[0][this.gridWidth - 1] = '╗';
        tiles[this.gridHeight - 1][0] = '╚';
        tiles[this.gridHeight - 1][this.gridWidth - 1] = '╝';
        
        // Add tutorial content
        const text1 = "Welcome brave cursor!";
        const text2 = "Use vim motions to navigate";
        const text3 = "Press w to jump between words";
        const text4 = "Remove obstacles with x";
        
        // Place text with word markers
        this.placeText(tiles, 3, 3, text1);
        this.placeText(tiles, 5, 6, text2);
        this.placeText(tiles, 8, 9, text3);
        this.placeText(tiles, 11, 12, text4);
        
        // Add some obstacles
        tiles[7][15] = '#';
        tiles[8][15] = '#';
        tiles[9][15] = '#';
        
        // Add collectible gem (requires insert mode)
        tiles[6][25] = '♦';
        
        // Add exit
        tiles[20][28] = 'E';
        
        return tiles;
    }

    createAdvancedRoom() {
        // Create empty grid
        const tiles = Array(this.gridHeight).fill().map(() => 
            Array(this.gridWidth).fill(' ')
        );
        
        // Add borders
        for (let x = 0; x < this.gridWidth; x++) {
            tiles[0][x] = '═';
            tiles[this.gridHeight - 1][x] = '═';
        }
        for (let y = 0; y < this.gridHeight; y++) {
            tiles[y][0] = '║';
            tiles[y][this.gridWidth - 1] = '║';
        }
        
        // Corner pieces
        tiles[0][0] = '╔';
        tiles[0][this.gridWidth - 1] = '╗';
        tiles[this.gridHeight - 1][0] = '╚';
        tiles[this.gridHeight - 1][this.gridWidth - 1] = '╝';
        
        // Advanced puzzle content
        this.placeText(tiles, 3, 3, "ADVANCED VIM MASTERY");
        this.placeText(tiles, 5, 3, "Delete these lines:");
        this.placeText(tiles, 7, 5, "unwanted line 1");
        this.placeText(tiles, 8, 5, "unwanted line 2");
        this.placeText(tiles, 9, 5, "unwanted line 3");
        
        this.placeText(tiles, 12, 3, "Copy and paste:");
        this.placeText(tiles, 14, 5, "copy this text");
        this.placeText(tiles, 16, 5, "paste here: _____");
        
        this.placeText(tiles, 19, 3, "Undo mistakes with 'u'");
        
        // Add barriers that require text manipulation
        for (let i = 0; i < 10; i++) {
            tiles[11][10 + i] = '▓';
        }
        
        // Add exit
        tiles[21][28] = 'E';
        
        return tiles;
    }

    placeText(tiles, row, startCol, text) {
        for (let i = 0; i < text.length; i++) {
            if (startCol + i < this.gridWidth - 1) {
                tiles[row][startCol + i] = text[i];
            }
        }
    }

    setupEventListeners() {
        // Focus the canvas so it can receive keyboard events
        this.canvas.setAttribute('tabindex', '0');
        this.canvas.focus();
        
        this.canvas.addEventListener('keydown', (e) => this.handleKeyPress(e));
        this.canvas.addEventListener('click', () => this.canvas.focus());
    }

    handleKeyPress(e) {
        e.preventDefault();
        const key = e.key;
        
        if (this.mode === 'normal') {
            this.handleNormalMode(key);
        } else if (this.mode === 'insert') {
            this.handleInsertMode(key);
        }
        
        this.updateUI();
    }

    handleNormalMode(key) {
        const oldPos = { ...this.player };
        
        switch (key) {
            case 'h': // Move left
                this.movePlayer(-1, 0);
                break;
            case 'j': // Move down
                this.movePlayer(0, 1);
                break;
            case 'k': // Move up
                this.movePlayer(0, -1);
                break;
            case 'l': // Move right
                this.movePlayer(1, 0);
                break;
            case 'w': // Jump to next word
                this.jumpToNextWord();
                break;
            case 'b': // Jump to previous word
                this.jumpToPreviousWord();
                break;
            case '0': // Jump to start of line
                this.jumpToLineStart();
                break;
            case '$': // Jump to end of line
                this.jumpToLineEnd();
                break;
            case 'x': // Remove obstacle
                this.removeObstacle();
                break;
            case 'i': // Enter insert mode
                this.mode = 'insert';
                this.addMessage("-- INSERT --", "info");
                break;
            case 'd': // Delete operations
                this.handleDelete();
                break;
            case 'y': // Yank (copy) operations
                this.handleYank();
                break;
            case 'p': // Paste
                this.handlePaste();
                break;
            case 'u': // Undo
                this.handleUndo();
                break;
        }
        
        // Check for movement and update objective
        if (oldPos.x !== this.player.x || oldPos.y !== this.player.y) {
            this.checkObjectives();
        }
    }

    handleInsertMode(key) {
        switch (key) {
            case 'Escape':
                this.mode = 'normal';
                this.addMessage("Exited insert mode", "info");
                break;
            default:
                // In insert mode, try to collect items
                this.collectItem();
                break;
        }
    }

    movePlayer(dx, dy) {
        const newX = this.player.x + dx;
        const newY = this.player.y + dy;
        
        if (this.isValidMove(newX, newY)) {
            this.player.x = newX;
            this.player.y = newY;
        } else {
            this.addMessage("Cannot move there!", "error");
        }
    }

    isValidMove(x, y) {
        if (x < 1 || x >= this.gridWidth - 1 || y < 1 || y >= this.gridHeight - 1) {
            return false;
        }
        
        const tile = this.currentRoomData.tiles[y][x];
        return tile !== '═' && tile !== '║' && tile !== '#' && tile !== '▓';
    }

    jumpToNextWord() {
        const currentRow = this.currentRoomData.tiles[this.player.y];
        let foundWord = false;
        
        for (let x = this.player.x + 1; x < this.gridWidth - 1; x++) {
            const char = currentRow[x];
            const prevChar = currentRow[x - 1];
            
            // Found start of a word (non-space after space or start)
            if (char !== ' ' && prevChar === ' ') {
                if (this.isValidMove(x, this.player.y)) {
                    this.player.x = x;
                    foundWord = true;
                    break;
                }
            }
        }
        
        if (!foundWord) {
            this.addMessage("No more words on this line", "info");
        }
    }

    jumpToPreviousWord() {
        const currentRow = this.currentRoomData.tiles[this.player.y];
        let foundWord = false;
        
        for (let x = this.player.x - 1; x > 0; x--) {
            const char = currentRow[x];
            const nextChar = currentRow[x + 1];
            
            // Found start of a word (non-space before space)
            if (char !== ' ' && nextChar === ' ') {
                if (this.isValidMove(x, this.player.y)) {
                    this.player.x = x;
                    foundWord = true;
                    break;
                }
            }
        }
        
        if (!foundWord) {
            this.addMessage("No previous words on this line", "info");
        }
    }

    jumpToLineStart() {
        for (let x = 1; x < this.gridWidth - 1; x++) {
            if (this.isValidMove(x, this.player.y)) {
                this.player.x = x;
                break;
            }
        }
    }

    jumpToLineEnd() {
        for (let x = this.gridWidth - 2; x > 0; x--) {
            if (this.isValidMove(x, this.player.y)) {
                this.player.x = x;
                break;
            }
        }
    }

    removeObstacle() {
        const directions = [
            { dx: 0, dy: 0 },   // Current position
            { dx: 1, dy: 0 },   // Right
            { dx: -1, dy: 0 },  // Left
            { dx: 0, dy: 1 },   // Down
            { dx: 0, dy: -1 }   // Up
        ];
        
        let removed = false;
        for (const dir of directions) {
            const x = this.player.x + dir.dx;
            const y = this.player.y + dir.dy;
            
            if (x >= 0 && x < this.gridWidth && y >= 0 && y < this.gridHeight) {
                if (this.currentRoomData.tiles[y][x] === '#') {
                    this.currentRoomData.tiles[y][x] = ' ';
                    this.addMessage("Removed obstacle!", "success");
                    removed = true;
                    break;
                }
            }
        }
        
        if (!removed) {
            this.addMessage("No obstacle to remove here", "error");
        }
    }

    collectItem() {
        const tile = this.currentRoomData.tiles[this.player.y][this.player.x];
        if (tile === '♦') {
            this.currentRoomData.tiles[this.player.y][this.player.x] = ' ';
            this.addMessage("Collected gem! ♦", "success");
        }
    }

    handleDelete() {
        // Simple dd implementation - delete current line
        const y = this.player.y;
        const line = this.currentRoomData.tiles[y];
        
        // Store the line in clipboard for undo
        this.clipboard = line.slice();
        
        // Clear the line (except borders)
        for (let x = 1; x < this.gridWidth - 1; x++) {
            if (this.currentRoomData.tiles[y][x] !== '▓') {
                this.currentRoomData.tiles[y][x] = ' ';
            }
        }
        
        this.addMessage("Deleted line with dd", "success");
    }

    handleYank() {
        // Simple yy implementation - copy current line
        const y = this.player.y;
        const line = this.currentRoomData.tiles[y];
        this.clipboard = line.slice();
        this.addMessage("Yanked line with yy", "success");
    }

    handlePaste() {
        // Simple p implementation - paste below current line
        if (this.clipboard.length === 0) {
            this.addMessage("Nothing to paste!", "error");
            return;
        }
        
        const y = this.player.y + 1;
        if (y < this.gridHeight - 1) {
            // Clear target line first
            for (let x = 1; x < this.gridWidth - 1; x++) {
                this.currentRoomData.tiles[y][x] = ' ';
            }
            
            // Paste content (excluding borders)
            for (let x = 1; x < this.gridWidth - 1 && x < this.clipboard.length; x++) {
                if (this.clipboard[x] !== '║') {
                    this.currentRoomData.tiles[y][x] = this.clipboard[x];
                }
            }
            this.addMessage("Pasted with p", "success");
        }
    }

    handleUndo() {
        // Simple undo - restore the last deleted line
        if (this.clipboard.length > 0) {
            const y = this.player.y;
            for (let x = 1; x < this.gridWidth - 1 && x < this.clipboard.length; x++) {
                if (this.clipboard[x] !== '║') {
                    this.currentRoomData.tiles[y][x] = this.clipboard[x];
                }
            }
            this.addMessage("Undone with u", "success");
        } else {
            this.addMessage("Nothing to undo!", "error");
        }
    }

    checkObjectives() {
        const tile = this.currentRoomData.tiles[this.player.y][this.player.x];
        
        if (tile === 'E') {
            this.addMessage("Congratulations! You reached the exit!", "success");
            
            if (this.currentRoom === 'tutorial') {
                this.addMessage("Tutorial complete! Advancing to Level 2...", "success");
                setTimeout(() => this.advanceLevel(), 1500);
            } else if (this.currentRoom === 'advanced') {
                this.addMessage("You've mastered advanced Vim! Game complete!", "success");
            }
        }
    }

    advanceLevel() {
        if (this.currentRoomData.nextRoom) {
            this.currentRoom = this.currentRoomData.nextRoom;
            this.currentRoomData = this.rooms[this.currentRoom];
            this.currentLevel = this.currentRoomData.level;
            
            // Reset player position
            this.player = { x: 1, y: 1 };
            
            // Clear messages and add welcome
            this.messageLog.innerHTML = '';
            this.addMessage(`Welcome to Level ${this.currentLevel}!`, "success");
            this.addMessage("Master advanced Vim commands to proceed.", "info");
            
            this.updateUI();
        }
    }

    addMessage(text, type = "info") {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;
        messageDiv.textContent = text;
        
        this.messageLog.appendChild(messageDiv);
        this.messageLog.scrollTop = this.messageLog.scrollHeight;
        
        // Keep only last 10 messages
        while (this.messageLog.children.length > 10) {
            this.messageLog.removeChild(this.messageLog.firstChild);
        }
    }

    updateUI() {
        this.modeDisplay.textContent = this.mode.toUpperCase();
        this.levelDisplay.textContent = this.currentLevel;
        this.roomDisplay.textContent = this.currentRoomData.name;
        
        const objective = this.currentRoomData.objectives[this.currentRoomData.currentObjective];
        if (objective) {
            this.hintText.textContent = objective;
        }
    }

    render() {
        // Clear canvas
        this.ctx.fillStyle = '#111';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Set up text rendering
        this.ctx.font = '16px Courier New';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        
        // Render grid
        for (let y = 0; y < this.gridHeight; y++) {
            for (let x = 0; x < this.gridWidth; x++) {
                const char = this.currentRoomData.tiles[y][x];
                if (char !== ' ') {
                    // Color coding for different elements
                    if (char === '═' || char === '║' || char === '╔' || char === '╗' || char === '╚' || char === '╝') {
                        this.ctx.fillStyle = '#666';
                    } else if (char === '#') {
                        this.ctx.fillStyle = '#ff6600';
                    } else if (char === '▓') {
                        this.ctx.fillStyle = '#ff0000';
                    } else if (char === '♦') {
                        this.ctx.fillStyle = '#ff00ff';
                    } else if (char === 'E') {
                        this.ctx.fillStyle = '#00ff00';
                    } else {
                        this.ctx.fillStyle = '#cccccc';
                    }
                    
                    this.ctx.fillText(
                        char,
                        x * this.cellSize + this.cellSize / 2,
                        y * this.cellSize + this.cellSize / 2
                    );
                }
            }
        }
        
        // Render player (blinking cursor)
        if (this.cursorVisible) {
            this.ctx.fillStyle = this.mode === 'insert' ? '#ffff00' : '#00ffff';
            this.ctx.fillText(
                '@',
                this.player.x * this.cellSize + this.cellSize / 2,
                this.player.y * this.cellSize + this.cellSize / 2
            );
        }
    }

    gameLoop() {
        const currentTime = Date.now();
        
        // Blink cursor every 500ms
        if (currentTime - this.lastBlinkTime > 500) {
            this.cursorVisible = !this.cursorVisible;
            this.lastBlinkTime = currentTime;
        }
        
        this.render();
        requestAnimationFrame(() => this.gameLoop());
    }
}

// Initialize game when page loads
document.addEventListener('DOMContentLoaded', () => {
    const game = new VimQuest();
});