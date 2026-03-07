/**
 * Matrix Rain Animation
 * Creates the iconic falling code effect in the background
 */

class MatrixRain {
    constructor(canvasId = 'matrix-canvas') {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) {
            this.createCanvas(canvasId);
        }
        this.ctx = this.canvas.getContext('2d');
        
        // Configuration
        this.fontSize = 14;
        this.characters = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ<>{}[]|/\\=+-*&^%$#@!';
        this.drops = [];
        this.color = '#00ff41';
        
        this.init();
        this.animate();
        
        // Handle resize
        window.addEventListener('resize', () => this.handleResize());
    }
    
    createCanvas(id) {
        this.canvas = document.createElement('canvas');
        this.canvas.id = id;
        document.body.prepend(this.canvas);
    }
    
    init() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        
        const columns = Math.floor(this.canvas.width / this.fontSize);
        this.drops = [];
        
        for (let i = 0; i < columns; i++) {
            this.drops[i] = Math.random() * -100;
        }
    }
    
    handleResize() {
        this.init();
    }
    
    draw() {
        // Semi-transparent black to create fade effect
        this.ctx.fillStyle = 'rgba(10, 10, 10, 0.05)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.ctx.fillStyle = this.color;
        this.ctx.font = `${this.fontSize}px monospace`;
        
        for (let i = 0; i < this.drops.length; i++) {
            // Random character
            const char = this.characters.charAt(
                Math.floor(Math.random() * this.characters.length)
            );
            
            // Draw the character
            const x = i * this.fontSize;
            const y = this.drops[i] * this.fontSize;
            
            // Vary the brightness
            const brightness = Math.random();
            if (brightness > 0.98) {
                this.ctx.fillStyle = '#ffffff';
            } else if (brightness > 0.9) {
                this.ctx.fillStyle = '#00ff41';
            } else {
                this.ctx.fillStyle = `rgba(0, 255, 65, ${0.3 + brightness * 0.5})`;
            }
            
            this.ctx.fillText(char, x, y);
            
            // Reset drop to top when it reaches bottom
            if (y > this.canvas.height && Math.random() > 0.975) {
                this.drops[i] = 0;
            }
            
            this.drops[i]++;
        }
    }
    
    animate() {
        this.draw();
        requestAnimationFrame(() => this.animate());
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Only initialize if canvas exists or should be created
    if (document.getElementById('matrix-canvas') || document.body.dataset.matrixBg === 'true') {
        new MatrixRain();
    }
});
