/**
 * Sample JavaScript file for testing
 */

function calculateSum(a, b) {
    /**
     * Calculate the sum of two numbers.
     * @param {number} a - First number
     * @param {number} b - Second number
     * @returns {number} Sum of a and b
     */
    return a + b;
}

function processData(data) {
    return data.toUpperCase();
}

class DataProcessor {
    /**
     * A class for processing data.
     */
    constructor() {
        this.data = [];
    }
    
    /**
     * Add an item to the data list.
     * @param {any} item - Item to add
     */
    addItem(item) {
        this.data.push(item);
    }
    
    /**
     * Get the count of items.
     * @returns {number} Number of items
     */
    getCount() {
        return this.data.length;
    }
}
