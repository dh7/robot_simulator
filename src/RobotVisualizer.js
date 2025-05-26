/**
 * RobotVisualizer - Class to visualize a two-wheeled robot on a canvas
 */
class RobotVisualizer {
    /**
     * Array of dots for the requested green path
     */
    dots = [];
    /**
     * Create a new robot visualizer
     * @param {string} canvasId - ID of the canvas element to draw on
     */
    constructor(canvasId) {
        // Fill the dots array: 50 points in a straight line (10cm), then 50 points 90° right (10cm)
// Helper to convert world coordinates to screen coordinates
this.worldToScreen = (x, y) => {
    return {
        x: x * this.scale,
        y: y * this.scale
    };
};
// We'll fill dots in initialize() once canvas size is known.
        this.canvasId = canvasId;
        this.canvas = null;
        this.ctx = null;
        this.robot = null;
        this.isRunning = false;
        this.lastTimestamp = 0;
        this.scale = 5; // Scale factor: 1 cm = 5 pixels
        this.trailColor = '#3498db'; // Blue color for the pen trail
    }

    /**
     * Initialize the visualizer
     */
    initialize() {
        // Set up canvas
        this.canvas = document.getElementById(this.canvasId);
        if (!this.canvas) {
            console.error('Canvas element not found');
            return;
        }
        this.ctx = this.canvas.getContext('2d');
        
        // Create robot simulator instance
        this.robot = new RobotSimulator({
            wheelDistance: 8, // 8 cm between wheels
            penOffset: 12,    // Pen is 12 cm from wheel axis
            speed: 10         // 10 cm/s constant speed
        });
        
        // Fill the dots array with a sample path starting at (0,0)
        this.dots = [];
        const firstSegmentPoints = 50;
        const secondSegmentPoints = 50;
        const step = 10 / firstSegmentPoints; // 10cm / 50 points = 0.2cm per step
        
        // First segment: along +x, starting at origin
        for (let i = 0; i < firstSegmentPoints; i++) {
            this.dots.push({ x: i * step, y: 0 });
        }
        
        // Second segment: turn right, along +y
        for (let i = 1; i <= secondSegmentPoints; i++) {
            this.dots.push({ x: 10, y: i * step });
        }
        
        // Set initial robot position so pen is at (0,0)
        this.robot.orientation = 0; // Facing +x (first segment direction)
        this.robot.position = {
            x: -this.robot.penOffset, // Pen offset is 12cm, so robot center is at (-12, 0)
            y: 0
        };
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Initial draw
        this.draw();
    }

    /**
     * Set up event listeners for controls
     */
    setupEventListeners() {
        // Start button - now makes a single movement by the set distances
        const startBtn = document.getElementById('startStop');
        startBtn.textContent = 'Move';
        startBtn.addEventListener('click', () => {
            // Read current distance values and apply them to the robot
            this.updateWheelDistances();
            
            // Start animation if not already running
            if (!this.isRunning) {
                this.start();
            }
        });
        
        // Reset button
        document.getElementById('reset').addEventListener('click', () => {
            this.reset();
        });
        
        // Wheel distance inputs
        document.getElementById('leftDistance').addEventListener('change', () => {
            this.updateWheelDistances();
        });
        document.getElementById('rightDistance').addEventListener('change', () => {
            this.updateWheelDistances();
        });
        
        // Robot speed input
        document.getElementById('robotSpeed').addEventListener('change', () => {
            const speed = parseFloat(document.getElementById('robotSpeed').value);
            this.robot.speed = speed;
        });
        
        // Pen down checkbox
        document.getElementById('penDown').addEventListener('change', (e) => {
            this.robot.setPenDown(e.target.checked);
        });
        
        // Clear drawing button
        document.getElementById('clearDrawing').addEventListener('click', () => {
            this.robot.penPositions = [];
            this.draw();
        });
    }

    /**
     * Update wheel distances from input controls
     * Now only reads the values but doesn't automatically start the robot
     */
    updateWheelDistances() {
        const leftDistance = parseFloat(document.getElementById('leftDistance').value);
        const rightDistance = parseFloat(document.getElementById('rightDistance').value);
        this.robot.setWheelDistances(leftDistance, rightDistance);
    }

    /**
     * Start the simulation to move the robot by the current wheel distances
     */
    start() {
        this.isRunning = true;
        this.lastTimestamp = performance.now();
        requestAnimationFrame(this.animate.bind(this));
    }

    /**
     * Stop the simulation - now automatically called when movement is complete
     */
    stop() {
        this.isRunning = false;
    }

    /**
     * Reset the simulation
     */
    reset() {
        this.stop();
        
        // Reset robot
        this.robot = new RobotSimulator({
            wheelDistance: 8, // 8 cm between wheels
            penOffset: 12,    // Pen is 12 cm from wheel axis
            speed: 10         // 10 cm/s constant speed
        });
        
        // Set robot orientation to face positive x-axis
        this.robot.orientation = 0;
        
        // Position the robot so that the pen is at (0,0)
        // Since the pen is penOffset away from the robot center along the orientation angle,
        // we need to position the robot penOffset units behind the (0,0) point
        this.robot.position = {
            x: -this.robot.penOffset, // Move robot behind (0,0) by penOffset amount
            y: 0
        };

        // Reset controls
        document.getElementById('leftDistance').value = 0;
        document.getElementById('rightDistance').value = 0;
        document.getElementById('robotSpeed').value = 10;
        document.getElementById('penDown').checked = false;
        document.getElementById('startStop').textContent = 'Move';
        
        this.draw();
        
        // Update position display
        this.updatePositionDisplay();
    }

    /**
     * Animation loop
     * @param {number} timestamp - Current timestamp
     */
    animate(timestamp) {
        if (!this.isRunning) return;
        
        // Calculate time delta in seconds
        const deltaTime = (timestamp - this.lastTimestamp) / 1000;
        this.lastTimestamp = timestamp;
        
        // Update robot position
        this.robot.update(deltaTime);
        
        // Draw current state
        this.draw();
        
        // Check if robot has completed its movement
        // For positive distances, we need to check if they've decreased to <= 0
        // For negative distances, we need to check if they've increased to >= 0
        const leftDone = (this.robot.leftWheelDistance >= 0 && this.robot.leftWheelDistance < 0.01) || 
                         (this.robot.leftWheelDistance <= 0 && this.robot.leftWheelDistance > -0.01);
        const rightDone = (this.robot.rightWheelDistance >= 0 && this.robot.rightWheelDistance < 0.01) || 
                          (this.robot.rightWheelDistance <= 0 && this.robot.rightWheelDistance > -0.01);
                          
        if (leftDone && rightDone) {
            // Stop the animation when the movement is complete
            this.stop();
            document.getElementById('startStop').textContent = 'Move';
            return;
        }
        
        // Continue animation loop
        requestAnimationFrame(this.animate.bind(this));
    }

    /**
     * Draw the robot and its trail on the canvas
     */
    draw() {
        const ctx = this.ctx;
        const scale = this.scale;
        const canvasCenterX = this.canvas.width / 2;
        const canvasCenterY = this.canvas.height / 2;
        
        // Clear canvas
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Save the current context state
        ctx.save();
        
        // Translate to center of canvas so (0,0) is at the middle
        ctx.translate(canvasCenterX, canvasCenterY);
        
        // Draw grid
        this.drawGrid();
        
        // Draw pen trail
        this.drawPenTrail();

        // Draw the green path (dots)
        if (this.dots.length > 1) {
            ctx.save();
            ctx.strokeStyle = '#27ae60'; // Green
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(this.dots[0].x * scale, this.dots[0].y * scale);
            for (let i = 1; i < this.dots.length; i++) {
                ctx.lineTo(this.dots[i].x * scale, this.dots[i].y * scale);
            }
            ctx.stroke();
            ctx.restore();
        }
        
        // Transform to robot coordinates
        ctx.save();
        ctx.translate(this.robot.position.x * scale, this.robot.position.y * scale);
        ctx.rotate(this.robot.orientation);
        
        // Draw the robot (as a triangle)
        this.drawRobot();
        
        // Restore robot transform
        ctx.restore();
        
        // Draw coordinate axes
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1;
        
        // X-axis
        ctx.beginPath();
        ctx.moveTo(-canvasCenterX, 0);
        ctx.lineTo(canvasCenterX, 0);
        ctx.stroke();
        
        // Y-axis
        ctx.beginPath();
        ctx.moveTo(0, -canvasCenterY);
        ctx.lineTo(0, canvasCenterY);
        ctx.stroke();
        
        // Restore original canvas state
        ctx.restore();
        
        // Update position display
        this.updatePositionDisplay();
    }

    /**
     * Draw a grid on the canvas
     */
    drawGrid() {
        const ctx = this.ctx;
        const width = this.canvas.width;
        const height = this.canvas.height;
        const halfWidth = width / 2;
        const halfHeight = height / 2;
        
        ctx.strokeStyle = '#ddd';
        ctx.lineWidth = 0.5;
        
        // Draw vertical lines (every 10cm)
        const gridSize = 10 * this.scale; // 10cm grid with scaling factor
        
        // Start from center and go right
        for (let x = 0; x <= halfWidth; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, -halfHeight);
            ctx.lineTo(x, halfHeight);
            ctx.stroke();
            
            // Draw symmetrical line on the left (if not at center)
            if (x > 0) {
                ctx.beginPath();
                ctx.moveTo(-x, -halfHeight);
                ctx.lineTo(-x, halfHeight);
                ctx.stroke();
            }
        }
        
        // Draw horizontal lines (every 10cm)
        // Start from center and go down
        for (let y = 0; y <= halfHeight; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(-halfWidth, y);
            ctx.lineTo(halfWidth, y);
            ctx.stroke();
            
            // Draw symmetrical line above (if not at center)
            if (y > 0) {
                ctx.beginPath();
                ctx.moveTo(-halfWidth, -y);
                ctx.lineTo(halfWidth, -y);
                ctx.stroke();
            }
        }
    }

    /**
     * Update the position display in the UI
     */
    updatePositionDisplay() {
        // Get current position and orientation
        const position = this.robot.position;
        const orientation = this.robot.orientation;
        
        // Convert orientation from radians to degrees
        const degrees = (orientation * 180 / Math.PI) % 360;
        
        // Update the display elements
        document.getElementById('rx').textContent = `X: ${position.x.toFixed(2)}`;
        document.getElementById('ry').textContent = `Y: ${position.y.toFixed(2)}`;
        document.getElementById('rtheta').textContent = `θ: ${degrees.toFixed(2)}°`;
    }

    /**
     * Draw the pen trail
     */
    drawPenTrail() {
        const ctx = this.ctx;
        const scale = this.scale;
        const positions = this.robot.penPositions;
        
        if (positions.length < 2) return;
        
        ctx.strokeStyle = this.trailColor;
        ctx.lineWidth = 2;
        ctx.beginPath();
        
        // In our centered coordinate system, positions are already in world coordinates
        ctx.moveTo(positions[0].x * scale, positions[0].y * scale);
        
        for (let i = 1; i < positions.length; i++) {
            ctx.lineTo(positions[i].x * scale, positions[i].y * scale);
        }
        
        ctx.stroke();
    }

    /**
     * Draw the robot as a triangle with two wheels
     */
    drawRobot() {
        const ctx = this.ctx;
        const scale = this.scale;
        const wheelDistance = this.robot.wheelDistance;
        const wheelRadius = 5; // Wheel radius in pixels
        const wheelWidth = 3;  // Wheel width in pixels
        
        // Draw robot body (triangle)
        ctx.fillStyle = '#e74c3c'; // Red for robot body
        ctx.beginPath();
        ctx.moveTo(this.robot.penOffset * scale, 0); // Front point (where the pen is)
        ctx.lineTo(-5 * scale, -wheelDistance/2 * scale); // Back left
        ctx.lineTo(-5 * scale, wheelDistance/2 * scale);  // Back right
        ctx.closePath();
        ctx.fill();
        
        // Draw left wheel
        ctx.fillStyle = '#2c3e50'; // Dark blue for wheels
        ctx.beginPath();
        ctx.rect(-wheelWidth * scale / 2, -wheelDistance/2 * scale - wheelRadius, 
                 wheelWidth * scale, wheelRadius * 2);
        ctx.fill();
        
        // Draw right wheel
        ctx.beginPath();
        ctx.rect(-wheelWidth * scale / 2, wheelDistance/2 * scale - wheelRadius, 
                 wheelWidth * scale, wheelRadius * 2);
        ctx.fill();
        
        // Draw pen point
        const penPosition = this.robot.getPenPosition();
        if (this.robot.penDown) {
            ctx.fillStyle = '#27ae60'; // Green for pen down
        } else {
            ctx.fillStyle = '#bdc3c7'; // Gray for pen up
        }
        ctx.beginPath();
        ctx.arc(this.robot.penOffset * scale, 0, 3, 0, Math.PI * 2);
        ctx.fill();
    }
}
