def longest_unique_substring(s: str) -> str:
    start = 0
    max_len = 0
    max_sub = ""
    seen = {}
    
    for i, char in enumerate(s):
        if char in seen and seen[char] >= start:
            start = seen[char] + 1
        seen[char] = i
        if i - start + 1 > max_len:
            max_len = i - start + 1
            max_sub = s[start:i+1]
    
    return max_sub

def reverse_string(text: str) -> str:
    return text[::-1]

def test_function():
    pass
