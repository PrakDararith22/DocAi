# Test file for refactoring - has performance and readability issues

def process_items(items):
    # Performance issue: using loop instead of list comprehension
    result = []
    for item in items:
        result.append(item * 2)
    return result

def calculate_total(data):
    # Readability issue: complex condition
    if len(data) > 0 and data[0] is not None and isinstance(data[0], dict) and 'value' in data[0] and data[0]['value'] > 0:
        return data[0]['value']
    return 0

def validate_user(user):
    # Best practice issue: no type hints, no docstring
    if user['age'] >= 18 and user['verified'] == True and user['status'] == 'active':
        return True
    return False

class DataProcessor:
    def __init__(self, data):
        self.data = data
    
    # Long function issue
    def process(self):
        results = []
        for item in self.data:
            if item is not None:
                if isinstance(item, dict):
                    if 'value' in item:
                        if item['value'] > 0:
                            results.append(item['value'] * 2)
        return results
