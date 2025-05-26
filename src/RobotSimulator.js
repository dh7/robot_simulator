/**
 * RobotSimulator - A class to simulate a two-wheeled robot with a pen
 */
class RobotSimulator {
    /**
     * Create a new robot simulator
     * @param {Object} config - Configuration object
     * @param {number} config.wheelDistance - Distance between wheels in cm
     * @param {number} config.wheelOffset - Distance of wheels behind pen in cm
     * @param {number} config.speed - Constant speed of the robot in cm/s
     */
    constructor(config = {}) {
        // Robot physical configuration
        this.wheelDistance = config.wheelDistance || 8.5; // cm, distance between wheels
        this.wheelOffset = config.wheelOffset || 12; // cm, distance wheels are behind pen
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
     * Get the current pen position (which is the robot center position)
     * @returns {Object} Position with x and y coordinates
     */
    getPenPosition() {
        // In this model, the pen position IS the robot center position
        return { ...this.position };
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
        
        // Calculate wheel axis center position (behind the pen by wheelOffset)
        const wheelAxisX = this.position.x - this.wheelOffset * Math.cos(this.orientation);
        const wheelAxisY = this.position.y - this.wheelOffset * Math.sin(this.orientation);
        
        // Calculate the robot's movement based on wheel distances
        if (leftDistanceThisStep === rightDistanceThisStep) {
            // Straight line motion
            const distance = leftDistanceThisStep;
            // Update wheel axis position
            const newWheelAxisX = wheelAxisX + distance * Math.cos(this.orientation);
            const newWheelAxisY = wheelAxisY + distance * Math.sin(this.orientation);
            
            // Update robot center (pen) position based on wheel axis movement
            this.position.x = newWheelAxisX + this.wheelOffset * Math.cos(this.orientation);
            this.position.y = newWheelAxisY + this.wheelOffset * Math.sin(this.orientation);
        } else {
            // Turning motion
            // Handle the case where one wheel is stationary (0 distance)
            if (leftDistanceThisStep === 0 || rightDistanceThisStep === 0) {
                // One wheel is stationary, rotation around that wheel
                const rotatingWheel = leftDistanceThisStep === 0 ? rightDistanceThisStep : leftDistanceThisStep;
                const isLeftWheelRotating = leftDistanceThisStep !== 0;
                
                // Calculate rotation angle
                // Positive angle = counter-clockwise (left turn), Negative = clockwise (right turn)
                // If right wheel is rotating (left stationary), angle should be positive (left turn)
                // If left wheel is rotating (right stationary), angle should be negative (right turn)
                const angle = rotatingWheel / this.wheelDistance * (isLeftWheelRotating ? 1 : -1);
                
                // Calculate stationary wheel position
                const stationaryWheelX = wheelAxisX + (isLeftWheelRotating ? -1 : 1) * (this.wheelDistance/2) * Math.sin(this.orientation);
                const stationaryWheelY = wheelAxisY - (isLeftWheelRotating ? -1 : 1) * (this.wheelDistance/2) * Math.cos(this.orientation);
                
                // Update orientation
                const newOrientation = (this.orientation + angle) % (2 * Math.PI);
                this.orientation = newOrientation < 0 ? newOrientation + 2 * Math.PI : newOrientation;
                
                // Calculate new wheel axis position by rotating around the stationary wheel
                const cosAngle = Math.cos(angle);
                const sinAngle = Math.sin(angle);
                
                const newWheelAxisX = stationaryWheelX + (wheelAxisX - stationaryWheelX) * cosAngle - 
                                     (wheelAxisY - stationaryWheelY) * sinAngle * (isLeftWheelRotating ? -1 : 1);
                const newWheelAxisY = stationaryWheelY + (wheelAxisX - stationaryWheelX) * sinAngle * (isLeftWheelRotating ? -1 : 1) + 
                                     (wheelAxisY - stationaryWheelY) * cosAngle;
                
                // Update robot center (pen) position based on new wheel axis position and orientation
                this.position.x = newWheelAxisX + this.wheelOffset * Math.cos(this.orientation);
                this.position.y = newWheelAxisY + this.wheelOffset * Math.sin(this.orientation);
            } else {
                // Both wheels are moving at different speeds
                // Calculate the radius of the turning circle
                const R = (this.wheelDistance / 2) * 
                        ((leftDistanceThisStep + rightDistanceThisStep) / 
                         (rightDistanceThisStep - leftDistanceThisStep));
                
                // Calculate change in orientation
                // Positive deltaTheta = counter-clockwise (left turn), Negative = clockwise (right turn)
                const deltaTheta = (rightDistanceThisStep - leftDistanceThisStep) / this.wheelDistance;
                
                // Calculate the Instantaneous Center of Curvature (ICC) relative to wheel axis
                const ICCX = wheelAxisX - R * Math.sin(this.orientation);
                const ICCY = wheelAxisY + R * Math.cos(this.orientation);
                
                // Update orientation
                const newOrientation = (this.orientation + deltaTheta) % (2 * Math.PI);
                this.orientation = newOrientation < 0 ? newOrientation + 2 * Math.PI : newOrientation;
                
                // Calculate new wheel axis position by rotating around ICC
                const cosTheta = Math.cos(deltaTheta);
                const sinTheta = Math.sin(deltaTheta);
                
                const newWheelAxisX = cosTheta * (wheelAxisX - ICCX) - 
                                    sinTheta * (wheelAxisY - ICCY) + ICCX;
                const newWheelAxisY = sinTheta * (wheelAxisX - ICCX) + 
                                    cosTheta * (wheelAxisY - ICCY) + ICCY;
                
                // Update robot center (pen) position based on new wheel axis position and orientation
                this.position.x = newWheelAxisX + this.wheelOffset * Math.cos(this.orientation);
                this.position.y = newWheelAxisY + this.wheelOffset * Math.sin(this.orientation);
            }
        }

        // Record robot position if pen is down
        if (this.penDown) {
            this.penPositions.push({ ...this.position });
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
