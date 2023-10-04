var utils = {
    getTimeDifferenceFromNow :function(mongooseDate) {
        // Assuming mongooseDate is a valid JavaScript Date object
        const currentDate = new Date();
        const mongooseDateTime = mongooseDate.getTime();  // Convert Mongoose date to milliseconds
    
        // Calculate the time difference in milliseconds
        const timeDifference = currentDate.getTime() - mongooseDateTime;
    
        // Convert milliseconds to seconds, minutes, hours, days, and weeks
        const seconds = Math.floor(timeDifference / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        const weeks = Math.floor(days / 7);
    
        // Determine the appropriate unit and value
        if (weeks > 0) {
            return `${weeks}w`;
        } else if (days > 0) {
            return `${days}d`;
        } else if (hours > 0) {
            return `${hours}h`;
        } else if (minutes > 0) {
            return `${minutes}m`;
        } else {
            return `${seconds}s`;
        }
    }
}

module.exports =utils;