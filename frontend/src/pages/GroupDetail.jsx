import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import apiClient from '../api/client';
import toast from 'react-hot-toast';
import LoadingSpinner from '../components/LoadingSpinner';

export default function GroupDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Data state
  const [group, setGroup] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [balances, setBalances] = useState({});
  const [payments, setPayments] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // UI state
  const [showModal, setShowModal] = useState(false);
  const [settlingId, setSettlingId] = useState(null);

  // Form state (Add Expense)
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [paidBy, setPaidBy] = useState('');
  const [splitType, setSplitType] = useState('equal');
  const [splits, setSplits] = useState({});

  // Form state (Invite Member)
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteError, setInviteError] = useState('');
  const [inviteSuccess, setInviteSuccess] = useState('');

  useEffect(() => {
    fetchGroupData();
  }, [id]);

  const fetchGroupData = async () => {
    try {
      setLoading(true);
      const [groupRes, expensesRes, balancesRes, simplifyRes, activityRes] = await Promise.all([
        apiClient.get(`/groups/${id}`),
        apiClient.get(`/groups/${id}/expenses`),
        apiClient.get(`/groups/${id}/balances`),
        apiClient.get(`/groups/${id}/simplify`),
        apiClient.get(`/groups/${id}/activity`)
      ]);
      
      setGroup(groupRes.data);
      setExpenses(expensesRes.data);
      setBalances(balancesRes.data.balances);
      setPayments(simplifyRes.data.payments);
      setActivities(activityRes.data);
      
      if (groupRes.data.members.length > 0) {
        const firstUserId = groupRes.data.members[0].user_id;
        setPaidBy(firstUserId.toString());
        
        const initialSplits = {};
        groupRes.data.members.forEach(m => {
          initialSplits[m.user_id] = '';
        });
        setSplits(initialSplits);
      }
    } catch (err) {
      setError('Failed to load group data.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddExpense = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const formattedSplits = Object.keys(splits).map(userId => ({
        user_id: parseInt(userId),
        value: parseFloat(splits[userId]) || 0
      }));

      const payload = {
        description,
        amount: parseFloat(amount),
        paid_by: parseInt(paidBy),
        category: 'general',
        split_type: splitType,
        expense_date: new Date().toISOString().split('T')[0],
        splits: formattedSplits
      };

      await apiClient.post(`/groups/${id}/expenses`, payload);
      toast.success('Expense added successfully!');
      await fetchGroupData();
      
      setShowModal(false);
      setDescription('');
      setAmount('');
      setSplitType('equal');
      const resetSplits = {};
      Object.keys(splits).forEach(uid => resetSplits[uid] = '');
      setSplits(resetSplits);

    } catch (err) {
      const detail = err.response?.data?.detail;
      if (Array.isArray(detail)) {
        toast.error(detail[0].msg || 'Validation error');
      } else {
        toast.error(detail || 'Failed to add expense');
      }
    }
  };

  const handleSettleUp = async (fromUserId, toUserId, amountMinor) => {
    setSettlingId(`${fromUserId}-${toUserId}`);
    try {
      await apiClient.post(`/groups/${id}/settlements`, {
        to_user: toUserId,
        amount: amountMinor / 100
      });
      toast.success('Settlement recorded!');
      await fetchGroupData();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to record settlement');
    } finally {
      setSettlingId(null);
    }
  };

  const handleInviteMember = async (e) => {
    e.preventDefault();
    setInviteError('');
    setInviteSuccess('');
    
    try {
      await apiClient.post(`/groups/${id}/members`, { email: inviteEmail });
      setInviteSuccess(`${inviteEmail} added to the group!`);
      toast.success('Member added successfully!');
      setInviteEmail('');
      await fetchGroupData();
    } catch (err) {
      setInviteError(err.response?.data?.detail || 'Failed to add member.');
    }
  };

  const handleRemoveMember = async (userId) => {
    if (!window.confirm("Are you sure you want to remove this member?")) return;
    try {
      await apiClient.delete(`/groups/${id}/members/${userId}`);
      toast.success('Member removed');
      await fetchGroupData();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to remove member');
    }
  };

  const handleSplitChange = (userId, value) => {
    setSplits({ ...splits, [userId]: value });
  };

  const getMemberName = (userId) => {
    const member = group?.members.find(m => m.user_id === userId);
    return member ? member.name : `User ${userId}`;
  };

  if (loading) return <div className="min-h-screen p-8"><LoadingSpinner /></div>;
  if (error && !group) return <div className="p-8 text-center text-red-500">{error}</div>;
  if (!group) return null;

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-5xl mx-auto">
        <button onClick={() => navigate('/dashboard')} className="text-indigo-600 mb-4 hover:underline font-medium">
          &larr; Back to Dashboard
        </button>
        
        {/* Group Header */}
        <div className="bg-white p-6 rounded-lg shadow-md mb-6 flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">{group.name}</h1>
            <p className="text-gray-600">{group.description || 'No description'}</p>
            
            <div className="mt-4 flex flex-wrap gap-2">
              {group.members.map((m) => (
                <div key={m.user_id} className="flex items-center bg-indigo-100 text-indigo-800 text-xs font-semibold px-2.5 py-0.5 rounded">
                  {m.name}
                  {user.id === group.created_by && m.user_id !== user.id && (
                    <button 
                      onClick={() => handleRemoveMember(m.user_id)}
                      className="ml-2 text-red-500 hover:text-red-700 font-bold"
                      title="Remove member"
                    >
                      &times;
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Invite Member Form */}
            <div className="mt-6 border-t pt-4 max-w-md">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Invite a Member</h3>
              {inviteError && <div className="text-red-500 text-xs mb-2">{inviteError}</div>}
              {inviteSuccess && <div className="text-green-500 text-xs mb-2">{inviteSuccess}</div>}
              <form onSubmit={handleInviteMember} className="flex gap-2">
                <input 
                  type="email" 
                  required
                  placeholder="friend@example.com"
                  className="flex-1 border border-gray-300 rounded-md p-2 text-sm"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                />
                <button type="submit" className="bg-gray-800 text-white px-4 py-2 rounded hover:bg-gray-900 text-sm">
                  Add
                </button>
              </form>
              <p className="text-xs text-gray-500 mt-2">
                * The user must have an account registered on SplitEase to be added.
              </p>
            </div>
          </div>

          <button 
            onClick={() => setShowModal(true)}
            className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 transition"
          >
            + Add Expense
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Expenses List */}
          <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-bold mb-4 border-b pb-2">Expenses</h2>
            {expenses.length === 0 ? (
              <p className="text-gray-500 italic">No expenses yet. Add one above.</p>
            ) : (
              <ul className="space-y-4">
                {expenses.map((exp) => (
                  <li key={exp.id} className="flex justify-between items-center border-b pb-2 last:border-0">
                    <div>
                      <p className="font-semibold text-gray-800">{exp.description}</p>
                      <p className="text-xs text-gray-500">
                        Paid by {getMemberName(exp.paid_by)} • {exp.split_type}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-800">₹{(exp.amount_minor / 100).toFixed(2)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Balances & Settlements */}
          <div className="space-y-6">
            {/* Balances */}
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-lg font-bold mb-4 border-b pb-2">Net Balances</h2>
              <ul className="space-y-2">
                {Object.entries(balances).map(([userId, amount]) => {
                  const amt = amount / 100;
                  if (amt === 0) return null;
                  return (
                    <li key={userId} className="flex justify-between text-sm">
                      <span className="text-gray-700">{getMemberName(parseInt(userId))}</span>
                      <span className={amt > 0 ? "text-green-600 font-medium" : "text-red-600 font-medium"}>
                        {amt > 0 ? `is owed ₹${amt.toFixed(2)}` : `owes ₹${Math.abs(amt).toFixed(2)}`}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* Settlements */}
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-lg font-bold mb-4 border-b pb-2">Settle Up</h2>
              {payments.length === 0 ? (
                <p className="text-gray-500 italic text-sm">Everyone is settled up!</p>
              ) : (
                <ul className="space-y-3">
                  {payments.map((p, idx) => (
                    <li key={idx} className="bg-gray-50 p-3 rounded border text-sm flex flex-col gap-2">
                      <div className="text-gray-700">
                        <span className="font-semibold">{getMemberName(p.from_user)}</span> pays <span className="font-semibold">{getMemberName(p.to_user)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-indigo-600">₹{(p.amount_minor / 100).toFixed(2)}</span>
                        
                        {p.from_user === user.id ? (
                          <button 
                            onClick={() => handleSettleUp(p.from_user, p.to_user, p.amount_minor)}
                            disabled={settlingId === `${p.from_user}-${p.to_user}`}
                            className={`px-3 py-1 rounded text-xs font-semibold transition ${
                              settlingId === `${p.from_user}-${p.to_user}`
                                ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                                : 'bg-green-100 text-green-700 hover:bg-green-200'
                            }`}
                          >
                            {settlingId === `${p.from_user}-${p.to_user}` ? 'Processing...' : 'Mark as Paid'}
                          </button>
                        ) : (
                          <span className="text-xs text-gray-400 italic">
                            Awaiting payment
                          </span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

        {/* Activity Feed */}
        <div className="mt-6 bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-bold mb-4 border-b pb-2">Activity History</h2>
          {activities.length === 0 ? (
            <p className="text-gray-500 italic text-sm">No activity yet.</p>
          ) : (
            <ul className="space-y-4">
              {activities.map((act) => (
                <li key={act.id} className="flex gap-3 text-sm border-b pb-2 last:border-0">
                  <div className="w-32 text-gray-500 shrink-0">
                    {new Date(act.created_at).toLocaleDateString()} <br/>
                    <span className="text-xs">{new Date(act.created_at).toLocaleTimeString()}</span>
                  </div>
                  <div>
                    {act.action === 'expense_created' && (
                      <span>
                        <span className="font-semibold">{getMemberName(act.actor_id)}</span> added an expense: 
                        <span className="italic"> "{act.payload.description}"</span> for ₹{(act.payload.amount_minor / 100).toFixed(2)}
                      </span>
                    )}
                    {act.action === 'settlement_created' && (
                      <span>
                        <span className="font-semibold">{getMemberName(act.actor_id)}</span> paid 
                        <span className="font-semibold"> {getMemberName(act.payload.to_user)}</span> 
                        ₹{(act.payload.amount_minor / 100).toFixed(2)} to settle up.
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Add Expense Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-gray-800">Add an Expense</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-gray-700 text-2xl">&times;</button>
            </div>

            <form onSubmit={handleAddExpense} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <input 
                  type="text" required placeholder="e.g., Dinner at Barista"
                  className="mt-1 block w-full border border-gray-300 rounded-md p-2"
                  value={description} onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700">Amount (₹)</label>
                  <input 
                    type="number" step="0.01" required placeholder="0.00"
                    className="mt-1 block w-full border border-gray-300 rounded-md p-2"
                    value={amount} onChange={(e) => setAmount(e.target.value)}
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700">Paid By</label>
                  <select 
                    className="mt-1 block w-full border border-gray-300 rounded-md p-2"
                    value={paidBy} onChange={(e) => setPaidBy(e.target.value)}
                  >
                    {group.members.map(m => (
                      <option key={m.user_id} value={m.user_id}>{m.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Split Type</label>
                <select 
                  className="mt-1 block w-full border border-gray-300 rounded-md p-2"
                  value={splitType} onChange={(e) => setSplitType(e.target.value)}
                >
                  <option value="equal">Equally</option>
                  <option value="exact">Exact Amounts</option>
                  <option value="percentage">Percentage</option>
                  <option value="shares">Shares</option>
                </select>
              </div>

              {splitType !== 'equal' && (
                <div className="space-y-2 border-t pt-4 mt-4">
                  <label className="block text-sm font-medium text-gray-700">
                    {splitType === 'exact' ? 'Amounts' : splitType === 'percentage' ? 'Percentages (%)' : 'Shares'}
                  </label>
                  {group.members.map(m => (
                    <div key={m.user_id} className="flex items-center gap-4">
                      <span className="w-1/2 text-sm text-gray-600">{m.name}</span>
                      <input 
                        type="number" step="0.01" min="0"
                        className="w-1/2 border border-gray-300 rounded-md p-1.5"
                        value={splits[m.user_id] || ''}
                        onChange={(e) => handleSplitChange(m.user_id, e.target.value)}
                      />
                    </div>
                  ))}
                </div>
              )}

              <div className="flex justify-end gap-2 mt-6">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">
                  Cancel
                </button>
                <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700">
                  Save Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}