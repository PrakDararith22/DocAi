def calculate_factorial(n):
    if n == 0 or n == 1:
        return 1
    return n * calculate_factorial(n - 1)

def find_maximum(numbers):
    if not numbers:
        return None
    max_val = numbers[0]
    for num in numbers[1:]:
        if num > max_val:
            max_val = num
    return max_val

def reverse_string(text):
    return text[::-1]

class StringProcessor:
    def __init__(self):
        self.processed_count = 0
    
    def process(self, text):
        self.processed_count += 1
        return text.upper().strip()
    
    def get_stats(self):
        return {"processed": self.processed_count}
