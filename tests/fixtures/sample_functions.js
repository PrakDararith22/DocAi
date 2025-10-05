function calculateSum(numbers) {
    return numbers.reduce((sum, num) => sum + num, 0);
}

function findMinimum(numbers) {
    if (numbers.length === 0) {
        return null;
    }
    return Math.min(...numbers);
}

const processArray = (arr, callback) => {
    return arr.map(callback);
};

class DataProcessor {
    constructor() {
        this.data = [];
    }
    
    addData(item) {
        this.data.push(item);
        return this.data.length;
    }
    
    processData() {
        return this.data.filter(item => item !== null && item !== undefined);
    }
    
    clearData() {
        const count = this.data.length;
        this.data = [];
        return count;
    }
}
