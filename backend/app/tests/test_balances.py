from app.services.balances import calculate_net_balances
from app.services.simplify import simplify_debts
from hypothesis import given, strategies as st

def test_balances_simple():
    members = [1, 2]
    # User 1 paid 100, split equally.
    expenses = [{
        "paid_by": 1,
        "amount_minor": 10000,
        "splits": [{"user_id": 1, "share_minor": 5000}, {"user_id": 2, "share_minor": 5000}]
    }]
    net = calculate_net_balances(members, expenses, [])
    
    assert net[1] == 5000   # User 1 paid 100, but owes 50 -> net +50
    assert net[2] == -5000  # User 2 paid 0, but owes 50 -> net -50
    assert sum(net.values()) == 0

def test_simplify_basic():
    # User 1 owes 50, User 2 is owed 50.
    net = {1: -5000, 2: 5000}
    payments = simplify_debts(net)
    
    assert len(payments) == 1
    assert payments[0] == (1, 2, 5000)

@given(
    st.dictionaries(st.integers(min_value=1, max_value=20), st.integers(min_value=-100000, max_value=100000), min_size=2)
)
def test_simplify_settles_everyone(net):
    # Force the zero-sum invariant (in real life it's guaranteed by the math)
    first_key = list(net.keys())[0]
    net[first_key] -= sum(net.values())
    
    payments = simplify_debts(net)
    
    # Apply payments to a copy of the net to see if they hit zero
    balance = dict(net)
    for frm, to, amt in payments:
        balance[frm] += amt
        balance[to] -= amt
        
    assert all(v == 0 for v in balance.values())
def test_settlements_update_balances_correctly():
    members = [1, 2]
    expenses = [] # No expenses
    settlements = [{"from_user": 1, "to_user": 2, "amount_minor": 1000}]
    
    net = calculate_net_balances(members, expenses, settlements)
    
    # User 1 paid 1000, so their net should be -1000
    # User 2 received 1000, so their net should be +1000
    assert net[1] == -1000
    assert net[2] == 1000