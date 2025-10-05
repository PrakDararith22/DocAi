const fs = require('fs').promises;

async function testChat() {
    // Simulate loading a file
    const content = await fs.readFile('./sth.py', 'utf-8');
    console.log('Original content:');
    console.log(content);
    
    // Simulate adding a function
    const newFunction = `
def sum_numbers(numbers):
    """Calculate the sum of a list of numbers."""
    return sum(numbers)
`;
    
    const newContent = content + newFunction;
    
    console.log('\nNew content:');
    console.log(newContent);
    
    // Write it back
    await fs.writeFile('./sth.py', newContent, 'utf-8');
    console.log('\n✅ File updated!');
}

testChat().catch(console.error);
