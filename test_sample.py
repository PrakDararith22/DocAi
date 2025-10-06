def calculate_sum(a, b):
    return a + b

def multiply_numbers(x, y):
    return x * y

class Calculator:
    def __init__(self):
        self.result = 0
    
    def add(self, value):
        self.result += value
        return self.result
