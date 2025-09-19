class GameClient {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.worldImage = null;
        this.worldSize = 2048; // World map is 2048x2048
        
        // Game state
        this.myPlayerId = null;
        this.players = new Map(); // playerId -> player data
        this.avatars = new Map(); // avatarName -> avatar data
        this.avatarImages = new Map(); // avatarName -> loaded Image objects
        
        // Viewport
        this.viewport = {
            offsetX: 0,
            offsetY: 0,
            width: 0,
            height: 0
        };
        
        // WebSocket
        this.socket = null;
        this.isConnected = false;
        
        // Keyboard state
        this.keyState = {
            up: false,
            down: false,
            left: false,
            right: false
        };
        
        this.setupCanvas();
        this.setupKeyboard();
        this.render(); // Show loading screen immediately
        this.loadWorldMap();
        this.connectToServer();
    }
    
    setupCanvas() {
        // Set canvas size to fill the browser window
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        
        // Update viewport dimensions
        this.viewport.width = this.canvas.width;
        this.viewport.height = this.canvas.height;
        
        // Handle window resize
        window.addEventListener('resize', () => {
            this.canvas.width = window.innerWidth;
            this.canvas.height = window.innerHeight;
            this.viewport.width = this.canvas.width;
            this.viewport.height = this.canvas.height;
            this.updateViewport();
            this.render();
        });
    }
    
    setupKeyboard() {
        // Add keyboard event listeners
        document.addEventListener('keydown', (event) => this.handleKeyDown(event));
        document.addEventListener('keyup', (event) => this.handleKeyUp(event));
    }
    
    handleKeyDown(event) {
        // Prevent default browser behavior for arrow keys
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) {
            event.preventDefault();
        }
        
        // Only handle movement if we're connected and have a player ID
        if (!this.isConnected || !this.myPlayerId) return;
        
        let direction = null;
        let keyName = null;
        
        switch (event.code) {
            case 'ArrowUp':
                direction = 'up';
                keyName = 'up';
                break;
            case 'ArrowDown':
                direction = 'down';
                keyName = 'down';
                break;
            case 'ArrowLeft':
                direction = 'left';
                keyName = 'left';
                break;
            case 'ArrowRight':
                direction = 'right';
                keyName = 'right';
                break;
            default:
                return; // Not an arrow key
        }
        
        // If this key is already pressed, don't send another command
        if (this.keyState[keyName]) return;
        
        // Update key state
        this.keyState[keyName] = true;
        
        // Send move command
        this.sendMoveCommand(direction);
    }
    
    handleKeyUp(event) {
        let keyName = null;
        
        switch (event.code) {
            case 'ArrowUp':
                keyName = 'up';
                break;
            case 'ArrowDown':
                keyName = 'down';
                break;
            case 'ArrowLeft':
                keyName = 'left';
                break;
            case 'ArrowRight':
                keyName = 'right';
                break;
            default:
                return; // Not an arrow key
        }
        
        // Update key state
        this.keyState[keyName] = false;
        
        // Check if any movement keys are still pressed
        const anyKeyPressed = this.keyState.up || this.keyState.down || this.keyState.left || this.keyState.right;
        
        if (!anyKeyPressed) {
            // No keys pressed, send stop command
            this.sendStopCommand();
        } else {
            // Other keys still pressed, send move command for the next priority key
            this.sendMoveCommandForActiveKeys();
        }
    }
    
    sendMoveCommand(direction) {
        if (!this.isConnected) return;
        
        const message = {
            action: 'move',
            direction: direction
        };
        
        this.socket.send(JSON.stringify(message));
        console.log('Sent move command:', direction);
    }
    
    sendStopCommand() {
        if (!this.isConnected) return;
        
        const message = {
            action: 'stop'
        };
        
        this.socket.send(JSON.stringify(message));
        console.log('Sent stop command');
    }
    
    sendMoveCommandForActiveKeys() {
        // Priority order: up > down > left > right
        if (this.keyState.up) {
            this.sendMoveCommand('up');
        } else if (this.keyState.down) {
            this.sendMoveCommand('down');
        } else if (this.keyState.left) {
            this.sendMoveCommand('left');
        } else if (this.keyState.right) {
            this.sendMoveCommand('right');
        }
    }
    
    loadWorldMap() {
        this.worldImage = new Image();
        this.worldImage.onload = () => {
            // Only render if we have player data, otherwise wait
            if (this.myPlayerId) {
                this.render();
            }
        };
        this.worldImage.onerror = () => {
            console.error('Failed to load world map image');
        };
        this.worldImage.src = 'world.jpg';
    }
    
    connectToServer() {
        try {
            this.socket = new WebSocket('wss://codepath-mmorg.onrender.com');
            
            this.socket.onopen = () => {
                console.log('Connected to game server');
                this.isConnected = true;
                this.joinGame();
            };
            
            this.socket.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data);
                    this.handleServerMessage(message);
                } catch (error) {
                    console.error('Failed to parse server message:', error);
                }
            };
            
            this.socket.onclose = () => {
                console.log('Disconnected from game server');
                this.isConnected = false;
            };
            
            this.socket.onerror = (error) => {
                console.error('WebSocket error:', error);
            };
        } catch (error) {
            console.error('Failed to connect to server:', error);
        }
    }
    
    joinGame() {
        if (!this.isConnected) return;
        
        const joinMessage = {
            action: 'join_game',
            username: 'Abdoulaye'
        };
        
        this.socket.send(JSON.stringify(joinMessage));
        console.log('Sent join_game message');
    }
    
    handleServerMessage(message) {
        console.log('Received message:', message);
        
        switch (message.action) {
            case 'join_game':
                if (message.success) {
                    this.handleJoinGameSuccess(message);
                } else {
                    console.error('Join game failed:', message.error);
                }
                break;
            case 'player_joined':
                this.handlePlayerJoined(message);
                break;
            case 'players_moved':
                this.handlePlayersMoved(message);
                break;
            case 'player_left':
                this.handlePlayerLeft(message);
                break;
            default:
                console.log('Unknown message type:', message.action);
        }
    }
    
    handleJoinGameSuccess(message) {
        this.myPlayerId = message.playerId;
        
        // Store all players
        for (const [playerId, playerData] of Object.entries(message.players)) {
            this.players.set(playerId, playerData);
        }
        
        // Store all avatars
        for (const [avatarName, avatarData] of Object.entries(message.avatars)) {
            this.avatars.set(avatarName, avatarData);
            this.loadAvatarImages(avatarName, avatarData);
        }
        
        // Update viewport to center on my avatar
        this.updateViewport();
        
        // Render now that we have both world image and player data
        this.render();
    }
    
    handlePlayerJoined(message) {
        this.players.set(message.player.id, message.player);
        this.avatars.set(message.avatar.name, message.avatar);
        this.loadAvatarImages(message.avatar.name, message.avatar);
        this.render();
    }
    
    handlePlayersMoved(message) {
        for (const [playerId, playerData] of Object.entries(message.players)) {
            this.players.set(playerId, playerData);
        }
        this.updateViewport();
        this.render();
    }
    
    handlePlayerLeft(message) {
        this.players.delete(message.playerId);
        this.render();
    }
    
    loadAvatarImages(avatarName, avatarData) {
        const avatarImages = {
            north: [],
            south: [],
            east: []
        };
        
        // Load all frames for each direction
        for (const direction of ['north', 'south', 'east']) {
            for (const frameData of avatarData.frames[direction]) {
                const img = new Image();
                img.onload = () => {
                    this.render(); // Re-render when new avatar loads
                };
                img.src = frameData;
                avatarImages[direction].push(img);
            }
        }
        
        this.avatarImages.set(avatarName, avatarImages);
    }
    
    updateViewport() {
        if (!this.myPlayerId || !this.players.has(this.myPlayerId)) return;
        
        const myPlayer = this.players.get(this.myPlayerId);
        
        // Center viewport on my avatar
        this.viewport.offsetX = myPlayer.x - this.viewport.width / 2;
        this.viewport.offsetY = myPlayer.y - this.viewport.height / 2;
        
        // Clamp to world bounds
        this.viewport.offsetX = Math.max(0, Math.min(this.viewport.offsetX, this.worldSize - this.viewport.width));
        this.viewport.offsetY = Math.max(0, Math.min(this.viewport.offsetY, this.worldSize - this.viewport.height));
    }
    
    render() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Show loading screen if we don't have both world image and player data
        if (!this.worldImage || !this.myPlayerId) {
            this.drawLoadingScreen();
            return;
        }
        
        // Draw world map with viewport offset
        this.ctx.drawImage(
            this.worldImage,
            this.viewport.offsetX, this.viewport.offsetY, this.viewport.width, this.viewport.height, // Source
            0, 0, this.viewport.width, this.viewport.height // Destination
        );
        
        // Draw all players
        this.drawPlayers();
    }
    
    drawLoadingScreen() {
        // Draw loading background
        this.ctx.fillStyle = '#1a1a1a';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw loading text
        this.ctx.fillStyle = 'white';
        this.ctx.font = '24px Arial';
        this.ctx.textAlign = 'center';
        
        const loadingText = this.worldImage ? 'Connecting to server...' : 'Loading world map...';
        this.ctx.fillText(loadingText, this.canvas.width / 2, this.canvas.height / 2);
        
        // Draw connection status
        this.ctx.font = '16px Arial';
        const statusText = this.isConnected ? 'Connected' : 'Connecting...';
        this.ctx.fillText(statusText, this.canvas.width / 2, this.canvas.height / 2 + 40);
    }
    
    drawPlayers() {
        for (const [playerId, player] of this.players) {
            this.drawPlayer(player);
        }
    }
    
    drawPlayer(player) {
        // Check if player is visible in viewport
        if (player.x < this.viewport.offsetX || player.x > this.viewport.offsetX + this.viewport.width ||
            player.y < this.viewport.offsetY || player.y > this.viewport.offsetY + this.viewport.height) {
            return;
        }
        
        const avatarImages = this.avatarImages.get(player.avatar);
        if (!avatarImages) return;
        
        // Get the appropriate frame based on facing direction and animation frame
        let frames;
        let flipX = false;
        
        switch (player.facing) {
            case 'north':
                frames = avatarImages.north;
                break;
            case 'south':
                frames = avatarImages.south;
                break;
            case 'east':
                frames = avatarImages.east;
                break;
            case 'west':
                frames = avatarImages.east; // West uses east frames flipped
                flipX = true;
                break;
            default:
                frames = avatarImages.south;
        }
        
        if (frames.length === 0) return;
        
        const frameIndex = Math.min(player.animationFrame || 0, frames.length - 1);
        const avatarImg = frames[frameIndex];
        
        if (!avatarImg.complete) return; // Skip if image not loaded yet
        
        // Calculate screen position (relative to viewport)
        const screenX = player.x - this.viewport.offsetX;
        const screenY = player.y - this.viewport.offsetY;
        
        // Avatar size (adjust as needed)
        const avatarSize = 32;
        
        // Save context state
        this.ctx.save();
        
        // Apply horizontal flip for west direction
        if (flipX) {
            this.ctx.scale(-1, 1);
            this.ctx.drawImage(avatarImg, -screenX - avatarSize/2, screenY - avatarSize, avatarSize, avatarSize);
        } else {
            this.ctx.drawImage(avatarImg, screenX - avatarSize/2, screenY - avatarSize, avatarSize, avatarSize);
        }
        
        // Draw username label
        this.ctx.restore();
        this.ctx.fillStyle = 'white';
        this.ctx.strokeStyle = 'black';
        this.ctx.lineWidth = 2;
        this.ctx.font = '12px Arial';
        this.ctx.textAlign = 'center';
        
        const textX = screenX;
        const textY = screenY - avatarSize - 5;
        
        // Draw text outline
        this.ctx.strokeText(player.username, textX, textY);
        // Draw text fill
        this.ctx.fillText(player.username, textX, textY);
    }
}

// Initialize the game when the page loads
window.addEventListener('load', () => {
    new GameClient();
});
