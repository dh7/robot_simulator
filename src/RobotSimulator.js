/**
 * RobotSimulator - A class to simulate a two-wheeled robot with a pen
 */
class RobotSimulator {
    /**
     * Create a new robot simulator
     * @param {Object} config - Configuration object
     * @param {number} config.wheelDistance - Distance between wheels in cm
     * @param {number} config.penOffset - Distance of pen from wheel axis in cm
     * @param {number} config.speed - Constant speed of the robot in cm/s
     */
    constructor(config = {}) {
        // Robot physical configuration
        this.wheelDistance = config.wheelDistance || 8; // cm
        this.penOffset = config.penOffset || 12; // cm
        this.speed = config.speed || 10; // Constant speed in cm/s

        // Robot state
        this.position = { x: 0, y: 0 }; // Robot center position
        this.orientation = 0; // Orientation in radians (0 = facing positive x-axis)
        this.leftWheelDistance = 0; // Distance to travel for left wheel in cm
        this.rightWheelDistance = 0; // Distance to travel for right wheel in cm
        this.penDown = false; // Is the pen down (drawing)?

        // Drawing history
        this.penPositions = [];
    }

    /**
     * Set the distances to travel for the left and right wheels
     * @param {number} leftDistance - Distance for left wheel to travel in cm
     * @param {number} rightDistance - Distance for right wheel to travel in cm
     */
    setWheelDistances(leftDistance, rightDistance) {
        this.leftWheelDistance = leftDistance;
        this.rightWheelDistance = rightDistance;
    }

    /**
     * Set whether the pen is down (drawing) or up
     * @param {boolean} isDown - Whether the pen is down
     */
    setPenDown(isDown) {
        this.penDown = isDown;
    }

    /**
     * Get the current position of the robot center
     * @returns {Object} Position with x and y coordinates
     */
    getPosition() {
        return { ...this.position };
    }

    /**
     * Get the current pen position
     * @returns {Object} Position with x and y coordinates
     */
    getPenPosition() {
        // Calculate pen position based on robot position and orientation
        const penX = this.position.x + this.penOffset * Math.cos(this.orientation);
        const penY = this.position.y + this.penOffset * Math.sin(this.orientation);
        return { x: penX, y: penY };
    }

    /**
     * Update the robot's position based on wheel distances with constant speed
     * @param {number} deltaTime - Time step in seconds
     */
    update(deltaTime) {
        // Skip if no time has passed
        if (deltaTime <= 0) return;

        // Calculate how much distance can be covered in this time step
        const maxDistanceThisStep = this.speed * deltaTime;
        
        // If no distances are set, don't move
        if (this.leftWheelDistance === 0 && this.rightWheelDistance === 0) {
            return;
        }
        
        // Determine how much we can move in this step (limited by remaining distances and speed)
        // For negative values, we need to use Math.max with negative maxDistanceThisStep
        const leftSignFactor = Math.sign(this.leftWheelDistance);
        const rightSignFactor = Math.sign(this.rightWheelDistance);
        
        const leftDistanceThisStep = leftSignFactor === 0 ? 0 : 
            (leftSignFactor > 0 ? 
                Math.min(this.leftWheelDistance, maxDistanceThisStep) : 
                Math.max(this.leftWheelDistance, -maxDistanceThisStep));
                
        const rightDistanceThisStep = rightSignFactor === 0 ? 0 : 
            (rightSignFactor > 0 ? 
                Math.min(this.rightWheelDistance, maxDistanceThisStep) : 
                Math.max(this.rightWheelDistance, -maxDistanceThisStep));
        
        // Update remaining distances
        this.leftWheelDistance -= leftDistanceThisStep;
        this.rightWheelDistance -= rightDistanceThisStep;
        
        // Calculate the robot's movement based on wheel distances
        if (leftDistanceThisStep === rightDistanceThisStep) {
            // Straight line motion
            const distance = leftDistanceThisStep;
            this.position.x += distance * Math.cos(this.orientation);
            this.position.y += distance * Math.sin(this.orientation);
        } else {
            // Turning motion (arc)
            // Handle the case where one wheel is stationary (0 distance)
            if (leftDistanceThisStep === 0 || rightDistanceThisStep === 0) {
                // One wheel is stationary, rotation around that wheel
                const rotatingWheel = leftDistanceThisStep === 0 ? rightDistanceThisStep : leftDistanceThisStep;
                const isLeftWheelRotating = leftDistanceThisStep !== 0;
                
                // Calculate rotation angle
                const angle = rotatingWheel / this.wheelDistance * (isLeftWheelRotating ? -1 : 1);
                
                // Update orientation
                this.orientation = (this.orientation + angle) % (2 * Math.PI);
                if (this.orientation < 0) this.orientation += 2 * Math.PI;
                
                // Calculate new position - rotate around the stationary wheel
                const pivotWheel = isLeftWheelRotating ? 
                    { x: this.position.x - (this.wheelDistance/2) * Math.sin(this.orientation - angle), 
                      y: this.position.y + (this.wheelDistance/2) * Math.cos(this.orientation - angle) } : 
                    { x: this.position.x + (this.wheelDistance/2) * Math.sin(this.orientation - angle), 
                      y: this.position.y - (this.wheelDistance/2) * Math.cos(this.orientation - angle) };
                
                const sinAngle = Math.sin(angle);
                const cosAngle = Math.cos(angle);
                
                this.position.x = pivotWheel.x + (this.position.x - pivotWheel.x) * cosAngle - 
                                 (this.position.y - pivotWheel.y) * sinAngle * (isLeftWheelRotating ? -1 : 1);
                this.position.y = pivotWheel.y + (this.position.x - pivotWheel.x) * sinAngle * (isLeftWheelRotating ? -1 : 1) + 
                                 (this.position.y - pivotWheel.y) * cosAngle;
            } else {
                // Both wheels are moving
                const R = (this.wheelDistance / 2) * 
                        ((leftDistanceThisStep + rightDistanceThisStep) / 
                         (rightDistanceThisStep - leftDistanceThisStep));
                
                const deltaTheta = (rightDistanceThisStep - leftDistanceThisStep) / this.wheelDistance;
                
                // Update orientation
                this.orientation = (this.orientation + deltaTheta) % (2 * Math.PI);
                if (this.orientation < 0) this.orientation += 2 * Math.PI;
            
                // Update position
                if (Math.abs(deltaTheta) > 0.0001) {
                    const ICC = {
                        x: this.position.x - R * Math.sin(this.orientation),
                        y: this.position.y + R * Math.cos(this.orientation)
                    };
                    
                    const cosTheta = Math.cos(deltaTheta);
                    const sinTheta = Math.sin(deltaTheta);
                    
                    // Rotation around ICC
                    const newX = cosTheta * (this.position.x - ICC.x) - 
                                 sinTheta * (this.position.y - ICC.y) + ICC.x;
                    const newY = sinTheta * (this.position.x - ICC.x) + 
                                 cosTheta * (this.position.y - ICC.y) + ICC.y;
                    
                    this.position.x = newX;
                    this.position.y = newY;
                }
            }
        }

        // Record pen position if pen is down
        if (this.penDown) {
            this.penPositions.push(this.getPenPosition());
        }
    }

    /**
     * Get the pen's drawing history
     * @returns {Array} Array of pen positions
     */
    getDrawing() {
        return [...this.penPositions];
    }
}
