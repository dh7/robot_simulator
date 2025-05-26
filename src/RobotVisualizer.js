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
        // Helper to convert world coordinates to screen coordinates
        this.worldToScreen = (x, y) => {
            return {
                x: x * this.scale,
                y: y * this.scale
            };
        };
        
        this.canvasId = canvasId;
        this.canvas = null;
        this.ctx = null;
        this.robot = null;
        this.isRunning = false;
        this.lastTimestamp = 0;
        this.scale = 10; // Scale factor: 1 cm = 10 pixels (larger to see -40 to 40 range better)
        this.gridRange = 40; // Show grid from -40 to 40 in both directions
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
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Initialize the robot and draw - calls reset() to avoid code duplication
        this.reset();
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
        
        // Calculate path to target position button
        document.getElementById('calculatePath').addEventListener('click', () => {
            this.calculateWheelDistancesToTarget();
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
            wheelDistance: 8.5, // 8.5 cm between wheels
            wheelOffset: 12,    // Wheels are 12 cm behind the pen
            speed: 10         // 10 cm/s constant speed
        });
        
        // Set robot orientation to face positive x-axis
        this.robot.orientation = 0;
        
        // Position the robot so that the pen is at (0,0)
        this.robot.position = {
            x: 0,
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
     * Calculate wheel distances needed to reach a target position
     * Uses the RobotPathCalculator utility class with the direct calculation method
     */
    calculateWheelDistancesToTarget() {
        // Get target position from inputs
        const targetX = parseFloat(document.getElementById('targetX').value);
        const targetY = parseFloat(document.getElementById('targetY').value);
        
        // Create target object
        const target = { x: targetX, y: targetY };
        
        // Use the RobotPathCalculator to calculate wheel distances using the direct method
        const result = RobotPathCalculator.calculateWheelDistancesDirect(this.robot, target);
        
        // Update the wheel distance inputs
        document.getElementById('leftDistance').value = result.leftDistance.toFixed(2);
        document.getElementById('rightDistance').value = result.rightDistance.toFixed(2);
        
        // Show predicted position in the UI (if we have a display element for it)
        if (document.getElementById('predictedPosition')) {
            const predictedState = result.predictedState;
            document.getElementById('predictedPosition').textContent = 
                `Predicted Position: (${predictedState.position.x.toFixed(2)}, ${predictedState.position.y.toFixed(2)}) θ: ${(predictedState.orientation * 180 / Math.PI).toFixed(2)}°`;
        }
        
        // Update the robot's wheel distances
        this.updateWheelDistances();
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
     * Draw the pen trail using the recorded pen positions
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
        // Canvas Y-axis is inverted: negative in canvas = positive in world coordinates
        ctx.moveTo(positions[0].x * scale, -positions[0].y * scale);
        
        for (let i = 1; i < positions.length; i++) {
            ctx.lineTo(positions[i].x * scale, -positions[i].y * scale);
        }
        
        ctx.stroke();
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
        
        // Add axis labels
        ctx.fillStyle = '#000';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // X-axis label
        ctx.fillText('X', canvasCenterX - 20, 20);
        
        // Y-axis label
        ctx.fillText('Y', 20, -canvasCenterY + 20);
        
        // Add coordinate labels at 10cm intervals up to gridRange
        ctx.font = '12px Arial';
        const gridStep = 10 * this.scale; // 10cm grid
        
        // Calculate max grid labels based on gridRange
        const maxLabels = Math.floor(this.gridRange / 10);
        
        // X-axis coordinate numbers
        for (let i = 1; i <= maxLabels; i++) {
            const x = i * gridStep;
            if (x < canvasCenterX) { // Only show if within canvas bounds
                // Positive X
                ctx.fillText(String(i * 10), x, 15);
                // Negative X
                ctx.fillText(String(-i * 10), -x, 15);
            }
        }
        
        // Y-axis coordinate numbers
        for (let i = 1; i <= maxLabels; i++) {
            const y = i * gridStep;
            if (y < canvasCenterY) { // Only show if within canvas bounds
                // Positive Y
                ctx.fillText(String(i * 10), -20, -y);
                // Negative Y
                ctx.fillText(String(-i * 10), -20, y);
            }
        }
        
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
        
        // Grid spacing (10cm)
        const gridSpacing = 10;
        const gridSize = gridSpacing * this.scale;
        
        // Calculate how many grid lines to draw based on gridRange
        const maxGridLines = Math.ceil(this.gridRange / gridSpacing);
        
        // Draw vertical lines (every 10cm)
        for (let i = 0; i <= maxGridLines; i++) {
            const x = i * gridSize;
            
            // Only draw if within canvas bounds
            if (x <= halfWidth) {
                // Positive X line
                ctx.beginPath();
                ctx.moveTo(x, -halfHeight);
                ctx.lineTo(x, halfHeight);
                ctx.stroke();
                
                // Negative X line (if not at center)
                if (i > 0) {
                    ctx.beginPath();
                    ctx.moveTo(-x, -halfHeight);
                    ctx.lineTo(-x, halfHeight);
                    ctx.stroke();
                }
            }
        }
        
        // Draw horizontal lines (every 10cm)
        for (let i = 0; i <= maxGridLines; i++) {
            const y = i * gridSize;
            
            // Only draw if within canvas bounds
            if (y <= halfHeight) {
                // Positive Y line
                ctx.beginPath();
                ctx.moveTo(-halfWidth, y);
                ctx.lineTo(halfWidth, y);
                ctx.stroke();
                
                // Negative Y line (if not at center)
                if (i > 0) {
                    ctx.beginPath();
                    ctx.moveTo(-halfWidth, -y);
                    ctx.lineTo(halfWidth, -y);
                    ctx.stroke();
                }
            }
        }
    }
    
    /**
     * Update the position display in the UI
     * Shows the pen position instead of the robot center position
     */
    updatePositionDisplay() {
        // Get the pen position (this is what we'll display)
        const penPosition = this.robot.getPenPosition();
        const orientation = this.robot.orientation;
        
        // Convert orientation from radians to degrees and normalize to -180 to 180 range
        let degrees = (orientation * 180 / Math.PI);
        // Normalize to -180 to 180 range for more intuitive display
        while (degrees > 180) degrees -= 360;
        while (degrees <= -180) degrees += 360;
        
        // Format position for display
        const formattedX = penPosition.x.toFixed(2);
        const formattedY = penPosition.y.toFixed(2);
        
        // Update the position display
        const positionDiv = document.getElementById('position-display');
        if (positionDiv) {
            // Display in a format that's easy to read
            positionDiv.innerHTML = `
                <p>Robot Position: (${formattedX}, ${formattedY}) θ: ${degrees.toFixed(2)}°</p>
                <p id="predictedPosition">Predicted Position: (0.00, 0.00) θ: 0.00°</p>
            `;
        }
    }

    /**
     * Draw the robot as a triangle with two wheels
     */
    drawRobot() {
        const ctx = this.ctx;
        const scale = this.scale;
        const wheelDistance = this.robot.wheelDistance;
        const wheelOffset = this.robot.wheelOffset;
        const wheelRadius = 5; // Wheel radius in pixels
        const wheelWidth = 3;  // Wheel width in pixels
        
        // Draw robot body (triangle)
        ctx.fillStyle = '#e74c3c'; // Red for robot body
        ctx.beginPath();
        ctx.moveTo(0, 0); // Front point (pen position, now at the center)
        ctx.lineTo(-wheelOffset * scale, -wheelDistance/2 * scale); // Back left
        ctx.lineTo(-wheelOffset * scale, wheelDistance/2 * scale);  // Back right
        ctx.closePath();
        ctx.fill();
        
        // Draw left wheel
        ctx.fillStyle = '#2c3e50'; // Dark blue for wheels
        ctx.beginPath();
        ctx.rect(-wheelOffset * scale, -wheelDistance/2 * scale - wheelRadius, 
                 wheelWidth * scale, wheelRadius * 2);
        ctx.fill();
        
        // Draw right wheel
        ctx.beginPath();
        ctx.rect(-wheelOffset * scale, wheelDistance/2 * scale - wheelRadius, 
                 wheelWidth * scale, wheelRadius * 2);
        ctx.fill();
        
        // Draw pen point (at center)
        if (this.robot.penDown) {
            ctx.fillStyle = '#27ae60'; // Green for pen down
        } else {
            ctx.fillStyle = '#bdc3c7'; // Gray for pen up
        }
        ctx.beginPath();
        ctx.arc(0, 0, 3, 0, Math.PI * 2);
        ctx.fill();
    }
}
