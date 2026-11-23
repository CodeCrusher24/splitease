import heapq

def simplify_debts(net: dict[int, int]) -> list[tuple[int, int, int]]:
    """
    Returns list of (from_user, to_user, amount_minor).
    Greedy approach using heaps.
    """
    # Max-heap for creditors (use negative amounts)
    creditors = [(-amt, uid) for uid, amt in net.items() if amt > 0]
    # Min-heap for debtors (most negative first)
    debtors = [(amt, uid) for uid, amt in net.items() if amt < 0]
    
    heapq.heapify(creditors)
    heapq.heapify(debtors)
    
    payments = []
    
    while creditors and debtors:
        c_amt, creditor = heapq.heappop(creditors)
        d_amt, debtor = heapq.heappop(debtors)
        
        # Make amounts positive for math
        c_amt = -c_amt
        d_amt = -d_amt
        
        paid = min(c_amt, d_amt)
        payments.append((debtor, creditor, paid))
        
        # If the creditor isn't fully paid, push them back
        if c_amt > paid:
            heapq.heappush(creditors, (-(c_amt - paid), creditor))
            
        # If the debtor still owes more, push them back
        if d_amt > paid:
            heapq.heappush(debtors, (-(d_amt - paid), debtor))
            
    return payments