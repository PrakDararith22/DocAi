// Test file for CodeAnalyzer JavaScript support
function calculateTotal(items) {
    let result = [];
    for (let item of items) {
        result.push(item * 2);
    }
    return result;
}

const processData = (data) => {
    if (data.length > 0 && data[0] !== null && typeof data[0] === 'object' && 'value' in data[0]) {
        return data[0].value;
    }
    return null;
};

// Another function
function validateInput(input) {
    return input !== null && input !== undefined;
}
