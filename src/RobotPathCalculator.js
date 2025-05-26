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
        // We need to convert target coordinates from world frame to robot frame
        // This requires a rotation by -currentTheta
        // deltaX_robot = deltaX_world * cos(-theta) - deltaY_world * sin(-theta)
        // deltaY_robot = deltaX_world * sin(-theta) + deltaY_world * cos(-theta)
        
        const deltaX_world = target.x - currentX;
        const deltaY_world = target.y - currentY;
        console.log('Delta movement (world frame):', { x: deltaX_world, y: deltaY_world });
        
        // Calculate delta in robot's local coordinate system
        const cosTheta = Math.cos(-currentTheta);
        const sinTheta = Math.sin(-currentTheta);
        
        const deltaX_robot = deltaX_world * cosTheta - deltaY_world * sinTheta;
        const deltaY_robot = deltaX_world * sinTheta + deltaY_world * cosTheta;
        
        console.log('Delta movement (robot frame):', { x: deltaX_robot, y: deltaY_robot });
        
        // Calculate wheel distances directly from delta movement in robot frame
        // For a differential drive robot:
        // - Driving straight ahead: both wheels rotate same distance in same direction
        // - Turning: wheels rotate different distances
        const widthToLengthRatio = wheelWidth / (robotLength || 1); // Avoid division by zero
        console.log('Width to length ratio:', widthToLengthRatio);
        
        // These formulas properly account for robot's differential drive geometry (FIXED SIGN)
        const rightDistance = deltaX_robot + widthToLengthRatio * deltaY_robot;
        const leftDistance = deltaX_robot - widthToLengthRatio * deltaY_robot;
        
        console.log('Left wheel distance:', leftDistance, 'cm');
        console.log('Right wheel distance:', rightDistance, 'cm');
        
        return {
            leftDistance: leftDistance,
            rightDistance: rightDistance,
        };
    }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = RobotPathCalculator;
}
