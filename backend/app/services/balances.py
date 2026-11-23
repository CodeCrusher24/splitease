from collections import defaultdict

def calculate_net_balances(
    member_ids: list[int],
    expenses: list[dict],
    settlements: list[dict]
) -> dict[int, int]:
    """
    Calculate the net balance for each user in minor units.
    Positive = owed money, Negative = owes money.
    """
    net = defaultdict(int)
    
    for member_id in member_ids:
        net[member_id] = 0

    # 1. Add what people paid, subtract what they owe for expenses
    for exp in expenses:
        net[exp["paid_by"]] += exp["amount_minor"]
        for split in exp["splits"]:
            net[split["user_id"]] -= split["share_minor"]

        # 2. Add settlements received, subtract settlements paid
    for st in settlements:
        net[st["from_user"]] -= st["amount_minor"]  # Was +=
        net[st["to_user"]] += st["amount_minor"]    # Was -=

    # Invariant check: nets must sum to zero
    assert sum(net.values()) == 0, "Net balances do not sum to zero!"
    
    return dict(net)