/**
 * RobotPathCalculator - Utility for calculating paths for differential drive robots
 */
class RobotPathCalculator {
    
    /**
     * Calculate wheel distances using the direct delta movement approach
     * Translated from the provided C++ function
     * 
     * @param {Object} robot - The robot object with position, orientation and configuration
     * @param {Object} target - Target position with x and y coordinates
     * @returns {Object} Calculated left and right wheel distances and predicted new state
     */
    static calculateWheelDistancesDirect(robot, target) {
        console.log('--- Path Calculation Start (Direct Method) ---');
        console.log('Robot:', robot);
        console.log('Target:', target);
        
        // Get current position and orientation
        const currentX = robot.position.x;
        const currentY = robot.position.y;
        const currentTheta = robot.orientation;
        const wheelWidth = robot.wheelDistance; // LARGEUR_ROBOT
        const robotLength = robot.wheelOffset; // LONGUEUR_ROBOT
        
        console.log('Current position:', { x: currentX, y: currentY });
        console.log('Current orientation:', currentTheta, '(', currentTheta * 180 / Math.PI, 'degrees )');
        console.log('Wheel width:', wheelWidth, 'cm');
        console.log('Robot length:', robotLength, 'cm');
        
        // Calculate delta movement in robot's frame
        const deltaX = target.x - currentX;
        const deltaY = target.y - currentY;
        console.log('Delta movement (world frame):', { x: deltaX, y: deltaY });
        
        // Calculate wheel distances directly from delta movement
        // Using the provided formula:
        // distances.left = deltaRobot.y + (LARGEUR_ROBOT / LONGUEUR_ROBOT) * deltaRobot.x;
        // distances.right = deltaRobot.y - (LARGEUR_ROBOT / LONGUEUR_ROBOT) * deltaRobot.x;
        const widthToLengthRatio = wheelWidth / (robotLength || 1); // Avoid division by zero
        console.log('Width to length ratio:', widthToLengthRatio);
        
        const leftDistance = deltaY + widthToLengthRatio * deltaX;
        const rightDistance = deltaY - widthToLengthRatio * deltaX;
        console.log('Left wheel distance:', leftDistance, 'cm');
        console.log('Right wheel distance:', rightDistance, 'cm');
        
        // Calculate relative angle based on wheel distance difference
        const wheelDifference = leftDistance - rightDistance;
        const relativeAngle = Math.atan(wheelDifference / wheelWidth);
        console.log('Wheel distance difference:', wheelDifference, 'cm');
        console.log('Relative angle change:', relativeAngle, '(', relativeAngle * 180 / Math.PI, 'degrees )');
        
        // Calculate new robot state
        const newX = currentX + deltaX;
        const newY = currentY + deltaY;
        let newTheta = currentTheta + relativeAngle;
        
        // Normalize angle between -PI and PI
        while (newTheta > Math.PI) newTheta -= 2 * Math.PI;
        while (newTheta < -Math.PI) newTheta += 2 * Math.PI;
        
        console.log('Predicted new position:', { x: newX, y: newY });
        console.log('Predicted new orientation:', newTheta, '(', newTheta * 180 / Math.PI, 'degrees )');
        console.log('--- Path Calculation End ---');
        
        return {
            leftDistance: leftDistance,
            rightDistance: rightDistance,
            predictedState: {
                position: { x: newX, y: newY },
                orientation: newTheta
            }
        };
    }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = RobotPathCalculator;
}
