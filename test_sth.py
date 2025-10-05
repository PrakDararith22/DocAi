import unittest
from sth import longest_unique_substring, reverse_string, test_function

class TestStringFunctions(unittest.TestCase):
    def test_longest_unique_substring(self):
        # Test with all unique characters
        self.assertEqual(longest_unique_substring("abcde"), "abcde")
        
        # Test with repeated characters
        self.assertEqual(longest_unique_substring("abcabcbb"), "abc")
        self.assertEqual(longest_unique_substring("bbbbb"), "b")
        self.assertEqual(longest_unique_substring("pwwkew"), "wke")
        
        # Test with empty string
        self.assertEqual(longest_unique_substring(""), "")
        
        # Test with single character
        self.assertEqual(longest_unique_substring("a"), "a")
        
    def test_reverse_string(self):
        # Test normal case
        self.assertEqual(reverse_string("hello"), "olleh")
        
        # Test with empty string
        self.assertEqual(reverse_string(""), "")
        
        # Test with single character
        self.assertEqual(reverse_string("a"), "a")
        
        # Test with numbers and special characters
        self.assertEqual(reverse_string("a1b2c3"), "3c2b1a")
        self.assertEqual(reverse_string("!@#"), "#@!")
    
    def test_test_function(self):
        # Test that test_function exists and can be called
        self.assertIsNone(test_function())

if __name__ == '__main__':
    unittest.main()
