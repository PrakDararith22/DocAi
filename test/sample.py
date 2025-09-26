#!/usr/bin/env python3
"""
Sample Python file for testing DocAI parser
"""

def simple_function(x, y):
    """This function already has a docstring"""
    return x + y

def function_without_docstring(param1, param2=None):
    return param1 * 2

def complex_function(data, options={}):
    # This function has no docstring
    result = []
    for item in data:
        if item > 0:
            result.append(item * 2)
    return result

class SimpleClass:
    """This class has a docstring"""
    
    def __init__(self, name):
        self.name = name
    
    def get_name(self):
        return self.name
    
    def set_name(self, new_name):
        self.name = new_name

class ClassWithoutDocstring:
    def __init__(self, value):
        self.value = value
    
    def calculate(self, multiplier):
        return self.value * multiplier

def function_with_type_hints(name: str, age: int) -> str:
    return f"{name} is {age} years old"

# This will cause a syntax error for testing
def broken_function(
    # Missing closing parenthesis
