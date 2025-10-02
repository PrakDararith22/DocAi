# Test file for CodeAnalyzer
def calculate_total(items):
    result = []
    for item in items:
        result.append(item * 2)
    return result

def process_data(data):
    if len(data) > 0 and data[0] is not None and isinstance(data[0], dict) and 'value' in data[0]:
        return data[0]['value']
    return None

# Duplicate line
result = []
for item in items:
    result.append(item * 2)
