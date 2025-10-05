from typing import List, Any, Optional, Union
import random
import logging

# Constants
DEFAULT_MIN_VALUE = 1
DEFAULT_MAX_VALUE = 100

def generate_random_integer(min_val: int = DEFAULT_MIN_VALUE, max_val: int = DEFAULT_MAX_VALUE) -> int:
    """
    Generates a random integer between min_val (inclusive) and max_val (inclusive).

    Args:
        min_val (int): The minimum value for the random number.
        max_val (int): The maximum value for the random number.

    Returns:
        int: A random integer within the specified range.
        
    Raises:
        ValueError: If min_val > max_val
        TypeError: If min_val or max_val are not integers
    """
    if not isinstance(min_val, int) or not isinstance(max_val, int):
        raise TypeError("min_val and max_val must be integers")
    if min_val > max_val:
        raise ValueError("min_val cannot be greater than max_val")
    
    return random.randint(min_val, max_val)

def get_random_choice_from_list(items: List[Any]) -> Optional[Any]:
    """
    Selects and returns a random item from a given list.

    Args:
        items (List[Any]): The list from which to choose a random item.

    Returns:
        Optional[Any]: A random item from the list, or None if the list is empty.
        
    Raises:
        TypeError: If items is not a list
    """
    if not isinstance(items, list):
        raise TypeError("items must be a list")
    
    if not items:
        logging.warning("Empty list provided to get_random_choice_from_list")
        return None
        
    return random.choice(items)