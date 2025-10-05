def inefficient_example():
    # String concatenation in loop (inefficient)
    result = ""
    for item in range(100):
        result += str(item) + ","
    
    # Nested loops that could be optimized
    data = [1, 2, 3, 4, 5]
    matches = []
    for i in data:
        for j in data:
            if i == j:
                matches.append(i)
    
    # Inefficient membership testing
    if 5 in [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]:
        print("Found")
    
    # Redundant list() call
    words = list("hello world".split())
    
    # Could use generator expression
    total = sum([x*2 for x in range(1000)])
    
    return result, matches, words, total

def check_dict_pattern(data_dict, key):
    if key in data_dict:
        return data_dict[key]
    else:
        return None

def large_function_example():
    # This function is intentionally long to trigger the "break down large function" suggestion
    step1 = "Initialize"
    step2 = "Process data"
    step3 = "Validate input"
    step4 = "Transform data"
    step5 = "Apply filters"
    step6 = "Sort results"
    step7 = "Format output"
    step8 = "Validate output"
    step9 = "Log results"
    step10 = "Cleanup resources"
    step11 = "Send notifications"
    step12 = "Update database"
    step13 = "Generate report"
    step14 = "Archive data"
    step15 = "Final validation"
    step16 = "Return results"
    step17 = "Log completion"
    step18 = "Cleanup temp files"
    step19 = "Update metrics"
    step20 = "Send completion signal"
    step21 = "Final cleanup"
    step22 = "Done"
    return "completed"
