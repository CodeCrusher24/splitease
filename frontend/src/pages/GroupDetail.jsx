import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import apiClient from '../api/client';
import toast from 'react-hot-toast';
import LoadingSpinner from '../components/LoadingSpinner';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

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

  // Form state (Remove Member)
  const [memberToRemoveId, setMemberToRemoveId] = useState('');
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);

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

  const handleRemoveMember = async () => {
    if (!memberToRemoveId) return;
    try {
      await apiClient.delete(`/groups/${id}/members/${memberToRemoveId}`);
      toast.success('Member removed');
      setShowRemoveConfirm(false);
      setMemberToRemoveId('');
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

  if (loading) return <div className="min-h-screen p-8 flex flex-col"><Navbar /><div className="flex-1"><LoadingSpinner /></div><Footer /></div>;
  if (error && !group) return <div className="p-8 text-center text-red-500">{error}</div>;
  if (!group) return null;

  const isCreator = user.id === group.created_by;
  const removableMembers = group.members.filter(m => m.user_id !== group.created_by);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />

      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-8">
        <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors mb-6">
            &larr; Back to Dashboard
        </button>

        {/* Header Section */}
        <div className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">{group.name}</h1>
            <p className="text-gray-500 mt-1">{group.description || 'No description'}</p>
            
            <div className="mt-4 flex flex-wrap gap-2">
              {group.members.map((m) => (
                <div key={m.user_id} className="bg-gray-100 text-gray-700 text-xs font-medium px-3 py-1 rounded-full border border-gray-200">
                  {m.name}
                </div>
              ))}
            </div>
          </div>
          <button 
            onClick={() => setShowModal(true)}
            className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-indigo-700 shadow-sm transition-all active:scale-95 shrink-0"
          >
            + Add Expense
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Content Area */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Expenses Card */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <h2 className="text-lg font-bold text-gray-900">Recent Expenses</h2>
              </div>
              {expenses.length === 0 ? (
                <div className="p-8 text-center text-gray-500">No expenses yet. Add one to get started.</div>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {expenses.map((exp) => (
                    <li key={exp.id} className="px-6 py-4 flex justify-between items-center hover:bg-gray-50 transition-colors">
                      <div>
                        <p className="font-medium text-gray-900">{exp.description}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Paid by <span className="font-medium">{getMemberName(exp.paid_by)}</span> • {exp.split_type}
                        </p>
                      </div>
                      <p className="font-bold text-gray-900">₹{(exp.amount_minor / 100).toFixed(2)}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Activity Card (Colorful Icons) */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50">
                <h2 className="text-lg font-bold text-gray-900">Activity History</h2>
              </div>
              {activities.length === 0 ? (
                <div className="p-8 text-center text-gray-500">No activity yet.</div>
              ) : (
                <ul className="divide-y divide-gray-100 p-2">
                  {activities.map((act) => (
                    <li key={act.id} className="p-4 flex gap-4 text-sm hover:bg-gray-50 rounded-xl transition-colors items-start">
                      
                      {/* Colored Icon */}
                      <div className="shrink-0 mt-0.5">
                        {act.action === 'expense_created' && (
                          <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">₹</div>
                        )}
                        {act.action === 'settlement_created' && (
                          <div className="w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-xs">✅</div>
                        )}
                        {act.action === 'group_created' && (
                          <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs">🏝️</div>
                        )}
                        {act.action === 'member_added' && (
                          <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center font-bold text-lg">+</div>
                        )}
                        {act.action === 'member_removed' && (
                          <div className="w-8 h-8 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-bold text-lg">-</div>
                        )}
                      </div>

                      <div className="flex-1 text-gray-700">
                        {act.action === 'expense_created' && (
                          <span><span className="font-semibold text-gray-900">{getMemberName(act.actor_id)}</span> added <span className="font-medium text-gray-900">"{act.payload.description}"</span> for ₹{(act.payload.amount_minor / 100).toFixed(2)}</span>
                        )}
                        {act.action === 'settlement_created' && (
                          <span><span className="font-semibold text-gray-900">{getMemberName(act.actor_id)}</span> paid <span className="font-semibold text-gray-900">{getMemberName(act.payload.to_user)}</span> ₹{(act.payload.amount_minor / 100).toFixed(2)}</span>
                        )}
                        {act.action === 'group_created' && (
                          <span><span className="font-semibold text-gray-900">{getMemberName(act.actor_id)}</span> created the group</span>
                        )}
                        {act.action === 'member_added' && (
                          <span><span className="font-semibold text-gray-900">{getMemberName(act.actor_id)}</span> added <span className="font-semibold text-gray-900">{act.payload.new_user_name}</span></span>
                        )}
                        {act.action === 'member_removed' && (
                          <span><span className="font-semibold text-gray-900">{getMemberName(act.actor_id)}</span> removed <span className="font-semibold text-gray-900">{act.payload.removed_user_name}</span></span>
                        )}
                      </div>

                      <div className="w-20 text-right text-gray-400 shrink-0 text-xs">
                        {new Date(act.created_at + 'Z').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} <br/>
                        {new Date(act.created_at + 'Z').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Sidebar Area */}
          <div className="space-y-8">
            
            {/* Balances Card */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50">
                <h2 className="text-lg font-bold text-gray-900">Net Balances</h2>
              </div>
              <div className="p-6 space-y-4">
                {Object.entries(balances).map(([userId, amount]) => {
                  const amt = amount / 100;
                  if (amt === 0) return null;
                  return (
                    <div key={userId} className="flex justify-between items-center text-sm">
                      <span className="font-medium text-gray-700">{getMemberName(parseInt(userId))}</span>
                      <span className={`font-bold ${amt > 0 ? "text-green-600" : "text-red-600"}`}>
                        {amt > 0 ? `+₹${amt.toFixed(2)}` : `-₹${Math.abs(amt).toFixed(2)}`}
                      </span>
                    </div>
                  );
                })}
                {Object.values(balances).every(a => a === 0) && (
                  <p className="text-gray-500 text-sm italic text-center py-4">Everyone is settled up!</p>
                )}
              </div>
            </div>

            {/* Settle Up Card */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50">
                <h2 className="text-lg font-bold text-gray-900">Settle Up</h2>
              </div>
              {payments.length === 0 ? (
                <div className="p-6 text-center text-gray-500 text-sm">No pending payments.</div>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {payments.map((p, idx) => (
                    <li key={idx} className="p-4 flex flex-col gap-3">
                      <div className="text-sm">
                        <span className="font-semibold text-gray-900">{getMemberName(p.from_user)}</span> pays <span className="font-semibold text-gray-900">{getMemberName(p.to_user)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-indigo-600">₹{(p.amount_minor / 100).toFixed(2)}</span>
                        {p.from_user === user.id ? (
                          <button 
                            onClick={() => handleSettleUp(p.from_user, p.to_user, p.amount_minor)}
                            disabled={settlingId === `${p.from_user}-${p.to_user}`}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                              settlingId === `${p.from_user}-${p.to_user}`
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                : 'bg-green-50 text-green-700 hover:bg-green-100 border border-green-200'
                            }`}
                          >
                            {settlingId === `${p.from_user}-${p.to_user}` ? '...' : 'Mark as Paid'}
                          </button>
                        ) : (
                          <span className="text-xs text-gray-400 font-medium bg-gray-50 px-2 py-1 rounded-md">Awaiting payment</span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Manage Members Card */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50">
                <h2 className="text-lg font-bold text-gray-900">Manage Members</h2>
              </div>
              <div className="p-6 space-y-6">
                {/* Invite */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Invite by Email</h3>
                  {inviteError && <div className="text-red-500 text-xs mb-2">{inviteError}</div>}
                  {inviteSuccess && <div className="text-green-500 text-xs mb-2">{inviteSuccess}</div>}
                  <form onSubmit={handleInviteMember} className="flex gap-2">
                    <input 
                      type="email" required placeholder="friend@example.com"
                      className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                      value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)}
                    />
                    <button type="submit" className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors">
                      Add
                    </button>
                  </form>
                </div>

                {/* Remove */}
                {isCreator && removableMembers.length > 0 && (
                  <div className="pt-4 border-t border-gray-100">
                    <h3 className="text-sm font-semibold text-gray-700 mb-2">Remove a Member</h3>
                    <div className="flex gap-2">
                      <select 
                        className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                        value={memberToRemoveId} onChange={(e) => setMemberToRemoveId(e.target.value)}
                      >
                        <option value="">Select a member...</option>
                        {removableMembers.map(m => (
                          <option key={m.user_id} value={m.user_id}>{m.name}</option>
                        ))}
                      </select>
                      <button 
                        type="button" disabled={!memberToRemoveId}
                        onClick={() => setShowRemoveConfirm(true)}
                        className="bg-red-50 text-red-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-100 border border-red-100 disabled:opacity-50 transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      </main>

      <Footer />

      {/* Add Expense Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-8 max-h-[90vh] overflow-y-auto animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Add an Expense</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 text-3xl leading-none">&times;</button>
            </div>

            <form onSubmit={handleAddExpense} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <input 
                  type="text" required placeholder="e.g., Dinner at Barista" autoFocus
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  value={description} onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹)</label>
                  <input 
                    type="number" step="0.01" required placeholder="0.00"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    value={amount} onChange={(e) => setAmount(e.target.value)}
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Paid By</label>
                  <select 
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    value={paidBy} onChange={(e) => setPaidBy(e.target.value)}
                  >
                    {group.members.map(m => (
                      <option key={m.user_id} value={m.user_id}>{m.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Split Type</label>
                <div className="grid grid-cols-4 gap-2">
                  {['equal', 'exact', 'percentage', 'shares'].map((type) => (
                    <button
                      key={type} type="button"
                      onClick={() => setSplitType(type)}
                      className={`py-2 text-sm font-medium rounded-lg border capitalize transition-all ${
                        splitType === type 
                          ? 'bg-indigo-50 border-indigo-200 text-indigo-700 ring-1 ring-indigo-500' 
                          : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {splitType !== 'equal' && (
                <div className="space-y-3 bg-gray-50 p-4 rounded-xl border border-gray-100">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">
                    {splitType === 'exact' ? 'Amounts (₹)' : splitType === 'percentage' ? 'Percentages (%)' : 'Shares'}
                  </label>
                  {group.members.map(m => (
                    <div key={m.user_id} className="flex items-center gap-4">
                      <span className="w-1/2 text-sm font-medium text-gray-700">{m.name}</span>
                      <input 
                        type="number" step="0.01" min="0"
                        className="w-1/2 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                        value={splits[m.user_id] || ''}
                        onChange={(e) => handleSplitChange(m.user_id, e.target.value)}
                        placeholder="0"
                      />
                    </div>
                  ))}
                </div>
              )}

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-2.5 text-gray-700 bg-gray-100 rounded-lg font-medium hover:bg-gray-200 transition-colors">
                  Cancel
                </button>
                <button type="submit" className="flex-1 bg-indigo-600 text-white px-4 py-2.5 rounded-lg font-medium hover:bg-indigo-700 shadow-sm transition-all active:scale-95">
                  Save Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Remove Member Confirmation Modal */}
      {showRemoveConfirm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-in zoom-in-95">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4 mx-auto">
              <span className="text-2xl text-red-600">⚠️</span>
            </div>
            <h3 className="text-xl font-bold text-center text-gray-900 mb-2">Remove Member?</h3>
            <p className="text-gray-500 text-sm text-center mb-6">
              Are you sure you want to remove <strong>{getMemberName(parseInt(memberToRemoveId))}</strong>? Their past expenses will remain, but they won't be able to add new ones.
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setShowRemoveConfirm(false)} 
                className="flex-1 px-4 py-2.5 text-gray-700 bg-gray-100 rounded-lg font-medium hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleRemoveMember} 
                className="flex-1 px-4 py-2.5 text-white bg-red-600 rounded-lg font-medium hover:bg-red-700 shadow-sm transition-all active:scale-95"
              >
                Yes, Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}