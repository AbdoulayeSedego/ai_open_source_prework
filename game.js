class GameClient {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.worldImage = null;
        this.worldSize = 2048; // World map is 2048x2048
        
        this.setupCanvas();
        this.loadWorldMap();
    }
    
    setupCanvas() {
        // Set canvas size to fill the browser window
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        
        // Handle window resize
        window.addEventListener('resize', () => {
            this.canvas.width = window.innerWidth;
            this.canvas.height = window.innerHeight;
            this.drawWorld();
        });
    }
    
    loadWorldMap() {
        this.worldImage = new Image();
        this.worldImage.onload = () => {
            this.drawWorld();
        };
        this.worldImage.onerror = () => {
            console.error('Failed to load world map image');
        };
        this.worldImage.src = 'world.jpg';
    }
    
    drawWorld() {
        if (!this.worldImage) return;
        
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw the world map at actual size (2048x2048)
        // Position it so we see the upper left corner (0,0) of the world
        // This matches the world's coordinate system where (0,0) is top-left
        this.ctx.drawImage(
            this.worldImage,
            0, 0, this.worldSize, this.worldSize,  // Source: full world map
            0, 0, this.worldSize, this.worldSize   // Destination: upper left of canvas
        );
    }
}

// Initialize the game when the page loads
window.addEventListener('load', () => {
    new GameClient();
});
