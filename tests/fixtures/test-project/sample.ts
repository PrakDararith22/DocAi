/**
 * Sample TypeScript file for testing
 */

interface DataItem {
    id: number;
    name: string;
}

function calculateSum(a: number, b: number): number {
    /**
     * Calculate the sum of two numbers.
     * @param a - First number
     * @param b - Second number
     * @returns Sum of a and b
     */
    return a + b;
}

function processData(data: string): string {
    return data.toUpperCase();
}

class DataProcessor<T> {
    /**
     * A generic class for processing data.
     */
    private data: T[] = [];
    
    /**
     * Add an item to the data list.
     * @param item - Item to add
     */
    addItem(item: T): void {
        this.data.push(item);
    }
    
    /**
     * Get the count of items.
     * @returns Number of items
     */
    getCount(): number {
        return this.data.length;
    }
}
