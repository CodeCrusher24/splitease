def split_equal(total_minor: int, user_ids: list[int]) -> dict[int, int]:
    """Split total equally. Remainder goes to the first users sorted by ID."""
    if not user_ids:
        raise ValueError("Must provide at least one user")
    
    n = len(user_ids)
    base, remainder = divmod(total_minor, n)
    shares = {uid: base for uid in user_ids}
    
    # Distribute the leftover pennies one by one
    for uid in sorted(user_ids)[:remainder]:
        shares[uid] += 1
        
    assert sum(shares.values()) == total_minor
    return shares

def split_exact(total_minor: int, amounts: dict[int, int]) -> dict[int, int]:
    """Split with exact amounts. Must sum to the total."""
    if sum(amounts.values()) != total_minor:
        raise ValueError("Exact amounts must sum to the total expense amount")
    return amounts

def split_percentage(total_minor: int, percentages: dict[int, float]) -> dict[int, int]:
    """Split based on percentages. Handles rounding via largest remainder method."""
    if round(sum(percentages.values()), 2) != 100.0:
        raise ValueError("Percentages must sum to 100")
        
    # Calculate raw amounts (convert percentage to decimal fraction)
    raw_shares = {uid: (pct / 100) * total_minor for uid, pct in percentages.items()}
    
    # Floor them (round down to nearest integer)
    floored_shares = {uid: int(amount) for uid, amount in raw_shares.items()}
    
    # Find how much is left over
    remainder = total_minor - sum(floored_shares.values())
    
    # Sort users by their fractional remainder (largest first)
    remainders = sorted(
        raw_shares.keys(), 
        key=lambda uid: (raw_shares[uid] - floored_shares[uid]), 
        reverse=True
    )
    
    # Distribute the leftover pennies
    for uid in remainders[:remainder]:
        floored_shares[uid] += 1
        
    assert sum(floored_shares.values()) == total_minor
    return floored_shares

def split_shares(total_minor: int, shares: dict[int, int]) -> dict[int, int]:
    """Split based on weights/shares (e.g., 2 shares vs 1 share)."""
    total_shares = sum(shares.values())
    if total_shares <= 0:
        raise ValueError("Total shares must be greater than zero")
        
    raw_amounts = {uid: (s / total_shares) * total_minor for uid, s in shares.items()}
    floored_amounts = {uid: int(amount) for uid, amount in raw_amounts.items()}
    
    remainder = total_minor - sum(floored_amounts.values())
    
    remainders = sorted(
        raw_amounts.keys(),
        key=lambda uid: (raw_amounts[uid] - floored_amounts[uid]),
        reverse=True
    )
    
    for uid in remainders[:remainder]:
        floored_amounts[uid] += 1
        
    assert sum(floored_amounts.values()) == total_minor
    return floored_amounts