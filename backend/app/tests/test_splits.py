import pytest
from app.services.splits import split_equal, split_percentage

def test_split_equal_basic():
    # 100.00 split 3 ways
    shares = split_equal(10000, [1, 2, 3])
    assert shares == {1: 3334, 2: 3333, 3: 3333}
    assert sum(shares.values()) == 10000

def test_split_equal_zero():
    with pytest.raises(ValueError):
        split_equal(10000, [])

def test_split_percentage_basic():
    # 100.00 split 40%, 30%, 30%
    shares = split_percentage(10000, {1: 40.0, 2: 30.0, 3: 30.0})
    assert shares == {1: 4000, 2: 3000, 3: 3000}
    assert sum(shares.values()) == 10000

def test_split_percentage_rounding():
    # 100.00 split 33.33%, 33.33%, 33.34% 
    shares = split_percentage(10000, {1: 33.33, 2: 33.33, 3: 33.34})
    assert sum(shares.values()) == 10000
    assert shares[3] == 3334 # The largest percentage gets the leftover paisa