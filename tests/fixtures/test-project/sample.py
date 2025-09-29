#!/usr/bin/env python3
"""
Sample Python file for testing
"""

def calculate_sum(a, b):
    """Calculate the sum of two numbers.
    
    Args:
        a (int): First number
        b (int): Second number
    
    Returns:
        int: Sum of a and b
    """
    return a + b

def process_data(data):
    return data.upper()

class DataProcessor:
    """A class for processing data."""
    
    def __init__(self):
        self.data = []
    
    def add_item(self, item):
        """Add an item to the data list.
        
        Args:
            item: Item to add
        """
        self.data.append(item)
    
    def get_count(self):
        """Get the count of items.
        
        Returns:
            int: Number of items
        """
        return len(self.data)
