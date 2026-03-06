class VimQuest {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.modeDisplay = document.getElementById('mode-display');
        this.levelDisplay = document.getElementById('level-display');
        this.roomDisplay = document.getElementById('room-display');
        this.hintText = document.getElementById('hint-text');
        this.messageLog = document.querySelector('.message-log');

        this.gridWidth = 32;
        this.gridHeight = 24;
        this.cellSize = 20;

        this.mode = 'normal';
        this.currentRoom = 'tutorial';
        this.currentLevel = 1;
        this.player = { x: 2, y: 2 };
        this.cursorVisible = true;
        this.lastBlinkTime = 0;
        this.commandBuffer = '';
        this.pendingOperator = null;
        this.visualStart = null;
        this.clipboard = null;
        this.lastChange = null;
        this.flags = {
            gemCollected: false,
            level2GateOpen: false,
            level3FindDone: false,
            level3SearchDone: false,
            level3VisualDone: false,
        };

        this.rooms = this.createRooms();
        this.loadRoom(this.currentRoom, true);
        this.setupEvents();
        this.gameLoop();
    }

    createEmptyGrid() {
        const grid = [];
        for (let y = 0; y < this.gridHeight; y += 1) {
            const row = [];
            for (let x = 0; x < this.gridWidth; x += 1) {
                if (y === 0 || y === this.gridHeight - 1) {
                    row.push('-');
                } else if (x === 0 || x === this.gridWidth - 1) {
                    row.push('|');
                } else {
                    row.push(' ');
                }
            }
            grid.push(row);
        }

        grid[0][0] = '+';
        grid[0][this.gridWidth - 1] = '+';
        grid[this.gridHeight - 1][0] = '+';
        grid[this.gridHeight - 1][this.gridWidth - 1] = '+';
        return grid;
    }

    placeText(grid, x, y, text) {
        for (let i = 0; i < text.length; i += 1) {
            const drawX = x + i;
            if (drawX > 0 && drawX < this.gridWidth - 1 && y > 0 && y < this.gridHeight - 1) {
                grid[y][drawX] = text[i];
            }
        }
    }

    cloneGrid(grid) {
        return grid.map((row) => row.slice());
    }

    createRooms() {
        const tutorial = this.createEmptyGrid();
        this.placeText(tutorial, 3, 3, 'Welcome brave cursor');
        this.placeText(tutorial, 3, 5, 'Move with h j k l');
        this.placeText(tutorial, 3, 7, 'Use w to jump words');
        this.placeText(tutorial, 3, 9, 'Press x near ###');
        this.placeText(tutorial, 3, 11, 'Use i on * to collect');
        tutorial[9][23] = '#';
        tutorial[9][24] = '#';
        tutorial[9][25] = '#';
        tutorial[11][24] = '*';
        tutorial[20][28] = 'E';

        const advanced = this.createEmptyGrid();
        this.placeText(advanced, 3, 3, 'Advanced Chamber');
        this.placeText(advanced, 3, 5, 'Stand on a line and press dd');
        this.placeText(advanced, 5, 8, 'delete this warning line');
        this.placeText(advanced, 5, 9, 'delete this gate line');
        this.placeText(advanced, 3, 13, 'Stand here and yy');
        this.placeText(advanced, 7, 14, 'copied text');
        this.placeText(advanced, 3, 16, 'Move up, then p to paste below');
        this.placeText(advanced, 3, 18, 'u restores the last deleted line');
        for (let x = 18; x <= 25; x += 1) {
            advanced[11][x] = 'X';
        }
        advanced[20][28] = 'E';

        const master = this.createEmptyGrid();
        this.placeText(master, 3, 3, 'Masters Sanctum');
        this.placeText(master, 3, 5, 'Search /cherry or ?apple');
        this.placeText(master, 5, 7, 'apple banana cherry date');
        this.placeText(master, 3, 10, 'Use fp on this alphabet row');
        this.placeText(master, 5, 11, 'abcdefghijklmnopqrstuvwxyz');
        this.placeText(master, 3, 14, 'Press v then move and y');
        this.placeText(master, 5, 15, 'SELECT');
        this.placeText(master, 3, 18, 'Try :s/SELECT/VICTORY');
        master[20][28] = 'M';

        return {
            tutorial: {
                level: 1,
                name: 'Tutorial Chamber',
                start: { x: 2, y: 2 },
                baseTiles: tutorial,
                objective() {
                    return 'Use h/j/k/l, then try w, x, and i before reaching E';
                },
                nextRoom: 'advanced',
            },
            advanced: {
                level: 2,
                name: 'Advanced Chamber',
                start: { x: 2, y: 2 },
                baseTiles: advanced,
                objective() {
                    return 'Use dd, yy, p, and u, then reach E';
                },
                nextRoom: 'master',
            },
            master: {
                level: 3,
                name: 'Masters Sanctum',
                start: { x: 2, y: 2 },
                baseTiles: master,
                objective: () => 'Use /, f, v, and :s/.../... then reach M',
                nextRoom: null,
            },
        };
    }

    setupEvents() {
        this.canvas.setAttribute('tabindex', '0');
        this.canvas.addEventListener('click', () => this.canvas.focus());
        window.addEventListener('keydown', (event) => this.handleKeyDown(event));
        this.canvas.focus();
    }

    loadRoom(roomKey, preserveMessages = false) {
        const room = this.rooms[roomKey];
        this.currentRoom = roomKey;
        this.currentLevel = room.level;
        this.currentRoomData = room;
        this.tiles = this.cloneGrid(room.baseTiles);
        this.player = { ...room.start };
        this.mode = 'normal';
        this.commandBuffer = '';
        this.pendingOperator = null;
        this.visualStart = null;

        if (!preserveMessages) {
            this.messageLog.innerHTML = '';
        }

        this.addMessage(`Entered Level ${room.level}: ${room.name}`, 'success');
        this.addMessage(this.getOnboardingMessage(roomKey), 'info');
        this.updateUI();
    }

    getOnboardingMessage(roomKey) {
        if (roomKey === 'tutorial') {
            return 'Use h/j/k/l to move, w/b to jump words, x near #, and i on *.';
        }
        if (roomKey === 'advanced') {
            return 'Use dd to delete, yy to yank, p to paste below, and u to undo.';
        }
        return 'Use /word, fx, v, and :s/old/new. Command inputs execute on Enter.';
    }

    handleKeyDown(event) {
        const key = event.key;

        if (['Tab'].includes(key)) {
            return;
        }

        event.preventDefault();

        if (this.mode === 'command') {
            this.handleCommandInput(key);
        } else if (this.mode === 'insert') {
            this.handleInsertInput(key);
        } else if (this.mode === 'visual') {
            this.handleVisualInput(key);
        } else {
            this.handleNormalInput(key);
        }

        this.updateUI();
        this.canvas.focus();
    }

    handleNormalInput(key) {
        if (this.pendingOperator) {
            const operator = this.pendingOperator;
            this.pendingOperator = null;

            if (operator === 'd' && key === 'd') {
                this.deleteCurrentLine();
                return;
            }
            if (operator === 'y' && key === 'y') {
                this.yankCurrentLine();
                return;
            }
        }

        switch (key) {
            case 'h':
                this.movePlayer(-1, 0);
                break;
            case 'j':
                this.movePlayer(0, 1);
                break;
            case 'k':
                this.movePlayer(0, -1);
                break;
            case 'l':
                this.movePlayer(1, 0);
                break;
            case 'w':
                this.jumpWord(1);
                break;
            case 'b':
                this.jumpWord(-1);
                break;
            case '0':
                this.jumpLineEdge('start');
                break;
            case '$':
                this.jumpLineEdge('end');
                break;
            case 'x':
                this.removeNearbyObstacle();
                break;
            case 'i':
                this.mode = 'insert';
                this.addMessage('-- INSERT --', 'info');
                break;
            case 'd':
                this.pendingOperator = 'd';
                this.addMessage('Pending: dd', 'info');
                break;
            case 'y':
                this.pendingOperator = 'y';
                this.addMessage('Pending: yy', 'info');
                break;
            case 'p':
                this.pasteBelow();
                break;
            case 'u':
                this.undoLastChange();
                break;
            case '/':
            case '?':
            case ':':
            case 'f':
            case 'F':
                this.mode = 'command';
                this.commandBuffer = key;
                this.addMessage(`Command: ${this.commandBuffer}`, 'info');
                break;
            case 'v':
                this.mode = 'visual';
                this.visualStart = { ...this.player };
                this.addMessage('-- VISUAL --', 'info');
                break;
            default:
                break;
        }
    }

    handleInsertInput(key) {
        if (key === 'Escape') {
            this.mode = 'normal';
            this.addMessage('Back to NORMAL', 'info');
            return;
        }

        const tile = this.getTile(this.player.x, this.player.y);
        if (tile === '*') {
            this.setTile(this.player.x, this.player.y, ' ');
            this.flags.gemCollected = true;
            this.addMessage('Collected the training gem', 'success');
        } else {
            this.addMessage('Nothing to insert here', 'error');
        }
    }

    handleVisualInput(key) {
        switch (key) {
            case 'Escape':
                this.mode = 'normal';
                this.visualStart = null;
                this.addMessage('Visual mode cancelled', 'info');
                return;
            case 'h':
                this.movePlayer(-1, 0);
                break;
            case 'j':
                this.movePlayer(0, 1);
                break;
            case 'k':
                this.movePlayer(0, -1);
                break;
            case 'l':
                this.movePlayer(1, 0);
                break;
            case 'y':
                this.yankSelection();
                this.mode = 'normal';
                this.visualStart = null;
                return;
            case 'd':
                this.deleteSelection();
                this.mode = 'normal';
                this.visualStart = null;
                return;
            default:
                return;
        }
    }

    handleCommandInput(key) {
        if (key === 'Escape') {
            this.mode = 'normal';
            this.commandBuffer = '';
            this.addMessage('Command cancelled', 'info');
            return;
        }

        if (key === 'Backspace') {
            if (this.commandBuffer.length > 1) {
                this.commandBuffer = this.commandBuffer.slice(0, -1);
            }
            return;
        }

        if (key === 'Enter') {
            this.executeCommand(this.commandBuffer);
            this.commandBuffer = '';
            this.mode = 'normal';
            return;
        }

        if (key.length === 1) {
            this.commandBuffer += key;
        }
    }

    executeCommand(command) {
        if (command === '/1') {
            this.loadRoom('tutorial');
            return;
        }
        if (command === '/2') {
            this.loadRoom('advanced');
            return;
        }
        if (command === '/3') {
            this.loadRoom('master');
            return;
        }
        if (command.startsWith('/')) {
            this.search(command.slice(1), 1);
            return;
        }
        if (command.startsWith('?')) {
            this.search(command.slice(1), -1);
            return;
        }
        if (command.startsWith('f') && command.length === 2) {
            this.findCharacter(command[1], 1);
            return;
        }
        if (command.startsWith('F') && command.length === 2) {
            this.findCharacter(command[1], -1);
            return;
        }
        if (command.startsWith(':s/')) {
            this.substitute(command);
            return;
        }

        this.addMessage(`Unknown command: ${command}`, 'error');
    }

    movePlayer(dx, dy) {
        const nextX = this.player.x + dx;
        const nextY = this.player.y + dy;
        if (!this.isWalkable(nextX, nextY)) {
            this.addMessage('Blocked', 'error');
            return;
        }

        this.player.x = nextX;
        this.player.y = nextY;
        this.checkTileEvents();
    }

    isWalkable(x, y) {
        const tile = this.getTile(x, y);
        return tile !== undefined && tile !== '|' && tile !== '-' && tile !== '+' && tile !== '#' && tile !== 'X';
    }

    getTile(x, y) {
        return this.tiles[y] ? this.tiles[y][x] : undefined;
    }

    setTile(x, y, value) {
        if (this.tiles[y] && this.tiles[y][x] !== undefined) {
            this.tiles[y][x] = value;
        }
    }

    jumpWord(direction) {
        const row = this.tiles[this.player.y];
        if (direction > 0) {
            for (let x = this.player.x + 1; x < this.gridWidth - 1; x += 1) {
                const current = row[x];
                const previous = row[x - 1];
                if (current !== ' ' && previous === ' ' && this.isWalkable(x, this.player.y)) {
                    this.player.x = x;
                    this.checkTileEvents();
                    return;
                }
            }
        } else {
            for (let x = this.player.x - 1; x > 0; x -= 1) {
                const current = row[x];
                const previous = row[x - 1];
                if (current !== ' ' && previous === ' ' && this.isWalkable(x, this.player.y)) {
                    this.player.x = x;
                    this.checkTileEvents();
                    return;
                }
            }
        }

        this.addMessage('No word jump available', 'error');
    }

    jumpLineEdge(side) {
        if (side === 'start') {
            for (let x = 1; x < this.gridWidth - 1; x += 1) {
                if (this.isWalkable(x, this.player.y)) {
                    this.player.x = x;
                    this.checkTileEvents();
                    return;
                }
            }
        } else {
            for (let x = this.gridWidth - 2; x > 0; x -= 1) {
                if (this.isWalkable(x, this.player.y)) {
                    this.player.x = x;
                    this.checkTileEvents();
                    return;
                }
            }
        }
    }

    removeNearbyObstacle() {
        const positions = [
            [0, 0],
            [1, 0],
            [-1, 0],
            [0, 1],
            [0, -1],
        ];

        for (const [dx, dy] of positions) {
            const x = this.player.x + dx;
            const y = this.player.y + dy;
            if (this.getTile(x, y) === '#') {
                this.setTile(x, y, ' ');
                this.lastChange = { type: 'tile', x, y, previous: '#', next: ' ' };
                this.addMessage('Removed obstacle with x', 'success');
                return;
            }
        }

        this.addMessage('No # nearby', 'error');
    }

    deleteCurrentLine() {
        const y = this.player.y;
        const before = this.tiles[y].slice();

        for (let x = 1; x < this.gridWidth - 1; x += 1) {
            if (this.tiles[y][x] !== 'X') {
                this.tiles[y][x] = ' ';
            }
        }

        this.clipboard = before;
        this.lastChange = { type: 'line', y, before, after: this.tiles[y].slice() };
        this.addMessage('Deleted line with dd', 'success');

        if (this.currentRoom === 'advanced' && (y === 8 || y === 9)) {
            this.openAdvancedGate();
        }
    }

    yankCurrentLine() {
        this.clipboard = this.tiles[this.player.y].slice();
        this.addMessage('Yanked current line with yy', 'success');
    }

    pasteBelow() {
        if (!this.clipboard || !Array.isArray(this.clipboard)) {
            this.addMessage('Clipboard is empty', 'error');
            return;
        }

        const y = this.player.y + 1;
        if (y >= this.gridHeight - 1) {
            this.addMessage('No room to paste', 'error');
            return;
        }

        const before = this.tiles[y].slice();
        for (let x = 1; x < this.gridWidth - 1; x += 1) {
            this.tiles[y][x] = this.clipboard[x] === '|' ? ' ' : this.clipboard[x];
        }
        this.lastChange = { type: 'line', y, before, after: this.tiles[y].slice() };
        this.addMessage('Pasted below with p', 'success');
    }

    undoLastChange() {
        if (!this.lastChange) {
            this.addMessage('Nothing to undo', 'error');
            return;
        }

        if (this.lastChange.type === 'line') {
            this.tiles[this.lastChange.y] = this.lastChange.before.slice();
        }
        if (this.lastChange.type === 'tile') {
            this.setTile(this.lastChange.x, this.lastChange.y, this.lastChange.previous);
        }

        this.addMessage('Undid last change', 'success');
        this.lastChange = null;
    }

    openAdvancedGate() {
        if (this.flags.level2GateOpen) {
            return;
        }

        this.flags.level2GateOpen = true;
        for (let x = 18; x <= 25; x += 1) {
            this.setTile(x, 11, ' ');
        }
        this.addMessage('The level 2 gate opens', 'success');
    }

    search(term, direction) {
        if (!term) {
            this.addMessage('Search term is empty', 'error');
            return;
        }

        const positions = [];
        for (let y = 1; y < this.gridHeight - 1; y += 1) {
            for (let x = 1; x < this.gridWidth - term.length; x += 1) {
                let candidate = '';
                for (let i = 0; i < term.length; i += 1) {
                    candidate += this.tiles[y][x + i];
                }
                if (candidate.toLowerCase() === term.toLowerCase()) {
                    positions.push({ x, y });
                }
            }
        }

        if (!positions.length) {
            this.addMessage(`No match for ${term}`, 'error');
            return;
        }

        let target = null;
        if (direction > 0) {
            target = positions.find((pos) => pos.y > this.player.y || (pos.y === this.player.y && pos.x > this.player.x));
            if (!target) {
                target = positions[0];
            }
        } else {
            const reversed = positions.slice().reverse();
            target = reversed.find((pos) => pos.y < this.player.y || (pos.y === this.player.y && pos.x < this.player.x));
            if (!target) {
                target = reversed[0];
            }
        }

        this.player = { ...target };
        if (this.currentRoom === 'master') {
            this.flags.level3SearchDone = true;
        }
        this.addMessage(`Found ${term}`, 'success');
        this.checkTileEvents();
    }

    findCharacter(char, direction) {
        const row = this.tiles[this.player.y];
        if (direction > 0) {
            for (let x = this.player.x + 1; x < this.gridWidth - 1; x += 1) {
                if (row[x].toLowerCase() === char.toLowerCase()) {
                    this.player.x = x;
                    if (this.currentRoom === 'master') {
                        this.flags.level3FindDone = true;
                    }
                    this.addMessage(`Found ${char}`, 'success');
                    this.checkTileEvents();
                    return;
                }
            }
        } else {
            for (let x = this.player.x - 1; x > 0; x -= 1) {
                if (row[x].toLowerCase() === char.toLowerCase()) {
                    this.player.x = x;
                    if (this.currentRoom === 'master') {
                        this.flags.level3FindDone = true;
                    }
                    this.addMessage(`Found ${char}`, 'success');
                    this.checkTileEvents();
                    return;
                }
            }
        }

        this.addMessage(`Could not find ${char}`, 'error');
    }

    substitute(command) {
        const match = command.match(/^:s\/([^/]*)\/([^/]*)$/);
        if (!match) {
            this.addMessage('Use :s/old/new', 'error');
            return;
        }

        const oldText = match[1];
        const newText = match[2];
        const y = this.player.y;
        const lineString = this.tiles[y].join('');
        const index = lineString.indexOf(oldText);

        if (index === -1) {
            this.addMessage(`Pattern not found: ${oldText}`, 'error');
            return;
        }

        const before = this.tiles[y].slice();
        for (let i = 0; i < oldText.length; i += 1) {
            this.tiles[y][index + i] = i < newText.length ? newText[i] : ' ';
        }
        for (let i = oldText.length; i < newText.length; i += 1) {
            if (index + i < this.gridWidth - 1) {
                this.tiles[y][index + i] = newText[i];
            }
        }
        this.lastChange = { type: 'line', y, before, after: this.tiles[y].slice() };
        this.addMessage(`Substituted ${oldText} -> ${newText}`, 'success');
    }

    yankSelection() {
        const cells = this.getSelectionCells();
        if (!cells.length) {
            this.addMessage('No visual selection', 'error');
            return;
        }

        this.clipboard = cells.map(({ x, y }) => ({ x, y, value: this.getTile(x, y) }));
        if (this.currentRoom === 'master') {
            this.flags.level3VisualDone = true;
        }
        this.addMessage('Yanked visual selection', 'success');
    }

    deleteSelection() {
        const cells = this.getSelectionCells();
        if (!cells.length) {
            this.addMessage('No visual selection', 'error');
            return;
        }

        const before = cells.map(({ x, y }) => ({ x, y, value: this.getTile(x, y) }));
        for (const cell of cells) {
            if (this.getTile(cell.x, cell.y) !== '|' && this.getTile(cell.x, cell.y) !== '-' && this.getTile(cell.x, cell.y) !== '+') {
                this.setTile(cell.x, cell.y, ' ');
            }
        }
        this.lastChange = { type: 'selection', before };
        this.addMessage('Deleted visual selection', 'success');
    }

    getSelectionCells() {
        if (!this.visualStart) {
            return [];
        }

        const minX = Math.min(this.visualStart.x, this.player.x);
        const maxX = Math.max(this.visualStart.x, this.player.x);
        const minY = Math.min(this.visualStart.y, this.player.y);
        const maxY = Math.max(this.visualStart.y, this.player.y);
        const cells = [];

        for (let y = minY; y <= maxY; y += 1) {
            for (let x = minX; x <= maxX; x += 1) {
                cells.push({ x, y });
            }
        }

        return cells;
    }

    checkTileEvents() {
        const tile = this.getTile(this.player.x, this.player.y);
        if (tile === 'E') {
            const nextRoom = this.currentRoomData.nextRoom;
            if (nextRoom) {
                this.addMessage('Level cleared', 'success');
                window.setTimeout(() => this.loadRoom(nextRoom), 250);
            }
        }
        if (tile === 'M') {
            this.addMessage('You completed Vim Quest', 'success');
        }
    }

    updateUI() {
        this.modeDisplay.textContent = this.mode.toUpperCase();
        this.levelDisplay.textContent = String(this.currentLevel);
        this.roomDisplay.textContent = this.currentRoomData.name;
        this.hintText.textContent = this.currentRoomData.objective();
    }

    addMessage(text, type = 'info') {
        const node = document.createElement('div');
        node.className = `message ${type}`;
        node.textContent = text;
        this.messageLog.appendChild(node);
        while (this.messageLog.children.length > 8) {
            this.messageLog.removeChild(this.messageLog.firstChild);
        }
        this.messageLog.scrollTop = this.messageLog.scrollHeight;
    }

    renderTile(char, x, y) {
        if (char === ' ') {
            return;
        }

        const palette = {
            '|': '#5d6b75',
            '-': '#5d6b75',
            '+': '#5d6b75',
            '#': '#f18f01',
            'X': '#d1495b',
            '*': '#ff66cc',
            'E': '#4caf50',
            'M': '#ffd166',
        };

        this.ctx.fillStyle = palette[char] || '#d7e3ea';
        this.ctx.fillText(
            char,
            x * this.cellSize + this.cellSize / 2,
            y * this.cellSize + this.cellSize / 2
        );
    }

    renderSelection() {
        if (this.mode !== 'visual' || !this.visualStart) {
            return;
        }

        const cells = this.getSelectionCells();
        this.ctx.fillStyle = 'rgba(255, 0, 128, 0.25)';
        for (const cell of cells) {
            this.ctx.fillRect(
                cell.x * this.cellSize,
                cell.y * this.cellSize,
                this.cellSize,
                this.cellSize
            );
        }
    }

    renderCommandBuffer() {
        if (this.mode !== 'command') {
            return;
        }

        this.ctx.fillStyle = '#111';
        this.ctx.fillRect(0, this.canvas.height - 24, this.canvas.width, 24);
        this.ctx.fillStyle = '#ffb703';
        this.ctx.textAlign = 'left';
        this.ctx.fillText(this.commandBuffer, 8, this.canvas.height - 12);
        this.ctx.textAlign = 'center';
    }

    render() {
        this.ctx.fillStyle = '#111';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.font = '16px Courier New';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';

        this.renderSelection();

        for (let y = 0; y < this.gridHeight; y += 1) {
            for (let x = 0; x < this.gridWidth; x += 1) {
                this.renderTile(this.tiles[y][x], x, y);
            }
        }

        if (this.cursorVisible) {
            const colors = {
                normal: '#7bdff2',
                insert: '#f4d35e',
                visual: '#ee6caa',
                command: '#ff9f1c',
            };
            this.ctx.fillStyle = colors[this.mode] || '#7bdff2';
            this.ctx.fillText(
                '@',
                this.player.x * this.cellSize + this.cellSize / 2,
                this.player.y * this.cellSize + this.cellSize / 2
            );
        }

        this.renderCommandBuffer();
    }

    gameLoop() {
        const now = Date.now();
        if (now - this.lastBlinkTime > 450) {
            this.cursorVisible = !this.cursorVisible;
            this.lastBlinkTime = now;
        }
        this.render();
        window.requestAnimationFrame(() => this.gameLoop());
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new VimQuest();
});
