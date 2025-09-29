#!/usr/bin/env python3
"""
Test file for auto-update documentation
This file will be monitored for changes
"""

def calculate_sum(a, b):
    return a + b

def process_data(data):
    return data.upper()

class DataProcessor:
    def __init__(self):
        self.data = []
    
    def add_item(self, item):
        self.data.append(item)
    
    def get_count(self):
        return len(self.data)
