/**
 * Sample JavaScript file for testing DocAI parser
 */

// Function with JSDoc
/**
 * Adds two numbers together
 * @param {number} a - First number
 * @param {number} b - Second number
 * @returns {number} Sum of a and b
 */
function addNumbers(a, b) {
    return a + b;
}

// Function without JSDoc
function multiply(x, y) {
    return x * y;
}

// Arrow function
const divide = (a, b) => {
    return a / b;
}

// Function expression
const subtract = function(x, y) {
    return x - y;
};

// Class with JSDoc
/**
 * Calculator class for basic math operations
 */
class Calculator {
    constructor(initialValue = 0) {
        this.value = initialValue;
    }
    
    /**
     * Add a number to the current value
     * @param {number} num - Number to add
     * @returns {number} New value
     */
    add(num) {
        this.value += num;
        return this.value;
    }
    
    // Method without JSDoc
    subtract(num) {
        this.value -= num;
        return this.value;
    }
}

// Class without JSDoc
class SimpleMath {
    constructor() {
        this.history = [];
    }
    
    square(x) {
        const result = x * x;
        this.history.push(`square(${x}) = ${result}`);
        return result;
    }
}

// Async function
async function fetchData(url) {
    const response = await fetch(url);
    return response.json();
}

// Generator function
function* fibonacci() {
    let a = 0, b = 1;
    while (true) {
        yield a;
        [a, b] = [b, a + b];
    }
}

// Function with default parameters
function greet(name = 'World', greeting = 'Hello') {
    return `${greeting}, ${name}!`;
}
