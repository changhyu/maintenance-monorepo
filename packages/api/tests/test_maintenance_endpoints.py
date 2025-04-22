"""
Basic test file
"""

import pytest


def test_basic():
    """Basic test"""
    print("Running basic test")
    assert True


if __name__ == "__main__":
    print("Starting tests")
    pytest.main(["-v", __file__])
