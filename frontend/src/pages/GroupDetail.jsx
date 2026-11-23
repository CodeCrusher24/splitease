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
  const [editingExpenseId, setEditingExpenseId] = useState(null);
  const [expenseToDelete, setExpenseToDelete] = useState(null);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

  // Form state (Add/Edit Expense)
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [paidBy, setPaidBy] = useState('');
  const [category, setCategory] = useState('general');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
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
      
      if (groupRes.data.members.length > 0 && !paidBy) {
        const firstUserId = groupRes.data.members[0].user_id;
        setPaidBy(firstUserId.toString());
        
        const initialSplits = {};
        groupRes.data.members.forEach(m => { initialSplits[m.user_id] = ''; });
        setSplits(initialSplits);
      }
    } catch (err) {
      setError('Failed to load group data.');
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setEditingExpenseId(null);
    setDescription('');
    setAmount('');
    setCategory('general');
    setExpenseDate(new Date().toISOString().split('T')[0]);
    setSplitType('equal');
    const resetSplits = {};
    group.members.forEach(m => resetSplits[m.user_id] = '');
    setSplits(resetSplits);
    setShowModal(true);
  };

  const openEditModal = (exp) => {
    setEditingExpenseId(exp.id);
    setDescription(exp.description);
    setAmount((exp.amount_minor / 100).toString());
    setPaidBy(exp.paid_by.toString());
    setCategory(exp.category || 'general');
    setExpenseDate(exp.expense_date);
    setSplitType(exp.split_type);
    
    const newSplits = {};
    group.members.forEach(m => newSplits[m.user_id] = '');
    exp.splits.forEach(s => {
      if (splitType === 'exact') newSplits[s.user_id] = (s.share_minor / 100).toString();
      else newSplits[s.user_id] = s.share_minor.toString();
    });
    setSplits(newSplits);
    setShowModal(true);
  };

  const handleSaveExpense = async (e) => {
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
        category,
        split_type: splitType,
        expense_date: expenseDate,
        splits: formattedSplits
      };

      if (editingExpenseId) {
        await apiClient.put(`/expenses/${editingExpenseId}`, payload);
        toast.success('Expense updated!');
      } else {
        await apiClient.post(`/groups/${id}/expenses`, payload);
        toast.success('Expense added!');
      }
      
      await fetchGroupData();
      setShowModal(false);

    } catch (err) {
      const detail = err.response?.data?.detail;
      toast.error(Array.isArray(detail) ? detail[0].msg : (detail || 'Failed to save expense'));
    }
  };

  const confirmDeleteExpense = async () => {
    if (!expenseToDelete) return;
    try {
      await apiClient.delete(`/expenses/${expenseToDelete.id}`);
      toast.success('Expense deleted');
      setExpenseToDelete(null);
      await fetchGroupData();
    } catch (err) {
      toast.error('Failed to delete expense');
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
      setInviteSuccess(`${inviteEmail} added!`);
      toast.success('Member added!');
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

  const handleLeaveGroup = async () => {
    try {
      await apiClient.post(`/groups/${id}/leave`);
      toast.success('You have left the group');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to leave group');
      setShowLeaveConfirm(false);
    }
  };

  const handleSplitChange = (userId, value) => {
    setSplits({ ...splits, [userId]: value });
  };

  const getMemberName = (userId) => {
    const member = group?.members.find(m => m.user_id === userId);
    return member ? member.name : `User ${userId}`;
  };

  const getCategoryIcon = (cat) => {
    switch (cat?.toLowerCase()) {
      case 'food': return '🍕';
      case 'travel': return '🚕';
      case 'utilities': return '💡';
      case 'entertainment': return '🎬';
      default: return '🧾';
    }
  };

  if (loading) return <div className="min-h-screen p-8 flex flex-col bg-gray-50"><Navbar /><div className="flex-1"><LoadingSpinner /></div><Footer /></div>;
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
            onClick={openAddModal}
            className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-indigo-700 shadow-sm transition-all active:scale-95 shrink-0"
          >
            + Add Expense
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
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
                    <li key={exp.id} className="px-6 py-4 flex justify-between items-center hover:bg-gray-50 transition-colors group">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-xl">
                          {getCategoryIcon(exp.category)}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{exp.description}</p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            Paid by <span className="font-medium">{getMemberName(exp.paid_by)}</span> on {new Date(exp.expense_date).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <p className="font-bold text-gray-900">₹{(exp.amount_minor / 100).toFixed(2)}</p>
                        
                        <div className="flex items-center opacity-0 group-hover:opacity-100 transition-all">
                          <button 
                            onClick={() => openEditModal(exp)}
                            className="text-gray-400 hover:text-indigo-600 p-2 rounded-full hover:bg-indigo-50"
                            title="Edit expense"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                          </button>
                          <button 
                            onClick={() => setExpenseToDelete(exp)}
                            className="text-gray-400 hover:text-red-500 p-2 rounded-full hover:bg-red-50"
                            title="Delete expense"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Activity Card */}
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
                      <div className="shrink-0 mt-0.5">
                        {act.action === 'expense_created' && <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">₹</div>}
                        {act.action === 'expense_edited' && <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs">✏️</div>}
                        {act.action === 'expense_deleted' && <div className="w-8 h-8 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-xs">🗑️</div>}
                        {act.action === 'settlement_created' && <div className="w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-xs">✅</div>}
                        {act.action === 'group_created' && <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs">🏝️</div>}
                        {act.action === 'member_added' && <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center font-bold text-lg">+</div>}
                        {act.action === 'member_removed' && <div className="w-8 h-8 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-bold text-lg">-</div>}
                      </div>
                      <div className="flex-1 text-gray-700">
                        {act.action === 'expense_created' && <span><span className="font-semibold text-gray-900">{getMemberName(act.actor_id)}</span> added <span className="font-medium text-gray-900">"{act.payload.description}"</span> for ₹{(act.payload.amount_minor / 100).toFixed(2)}</span>}
                        {act.action === 'expense_edited' && <span><span className="font-semibold text-gray-900">{getMemberName(act.actor_id)}</span> updated <span className="font-medium text-gray-900">"{act.payload.description}"</span></span>}
                        {act.action === 'expense_deleted' && <span><span className="font-semibold text-gray-900">{getMemberName(act.actor_id)}</span> deleted <span className="font-medium text-gray-900">"{act.payload.description}"</span></span>}
                        {act.action === 'settlement_created' && <span><span className="font-semibold text-gray-900">{getMemberName(act.actor_id)}</span> paid <span className="font-semibold text-gray-900">{getMemberName(act.payload.to_user)}</span> ₹{(act.payload.amount_minor / 100).toFixed(2)}</span>}
                        {act.action === 'group_created' && <span><span className="font-semibold text-gray-900">{getMemberName(act.actor_id)}</span> created the group</span>}
                        {act.action === 'member_added' && <span><span className="font-semibold text-gray-900">{getMemberName(act.actor_id)}</span> added <span className="font-semibold text-gray-900">{act.payload.new_user_name}</span></span>}
                        {act.action === 'member_removed' && <span><span className="font-semibold text-gray-900">{getMemberName(act.actor_id)}</span> removed <span className="font-semibold text-gray-900">{act.payload.removed_user_name}</span>{act.payload.reason === 'left_group' && ' (left)'}</span>}
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
                      <span className={`px-2 py-1 rounded-md font-bold text-sm ${amt > 0 ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
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
                      <div className="flex items-center justify-between text-sm bg-gray-50 p-3 rounded-lg border border-gray-100">
                        <div className="flex flex-col">
                          <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">From</span>
                          <span className="font-bold text-gray-900">{getMemberName(p.from_user)}</span>
                        </div>
                        <div className="text-gray-300">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                          </svg>
                        </div>
                        <div className="flex flex-col text-right">
                          <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">To</span>
                          <span className="font-bold text-gray-900">{getMemberName(p.to_user)}</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center px-1">
                        <span className="font-bold text-lg text-indigo-600">₹{(p.amount_minor / 100).toFixed(2)}</span>
                        {p.from_user === user.id ? (
                          <button 
                            onClick={() => handleSettleUp(p.from_user, p.to_user, p.amount_minor)}
                            disabled={settlingId === `${p.from_user}-${p.to_user}`}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all shadow-sm ${
                              settlingId === `${p.from_user}-${p.to_user}` ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-green-600 text-white hover:bg-green-700'
                            }`}
                          >
                            {settlingId === `${p.from_user}-${p.to_user}` ? '...' : 'Mark as Settled'}
                          </button>
                        ) : (
                          <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-3 py-1.5 rounded-md border border-amber-200">Pending</span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50">
                <h2 className="text-lg font-bold text-gray-900">Manage Members</h2>
              </div>
              <div className="p-6 space-y-6">
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
                    <button type="submit" className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors">Add</button>
                  </form>
                </div>

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
                        type="button" disabled={!memberToRemoveId} onClick={() => setShowRemoveConfirm(true)}
                        className="bg-red-50 text-red-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-100 border border-red-100 disabled:opacity-50 transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                )}

                {/* Leave Group Button (Non-creators only) */}
                {!isCreator && (
                  <div className="pt-4 border-t border-gray-100">
                    <button 
                      type="button" 
                      onClick={() => setShowLeaveConfirm(true)}
                      className="w-full bg-red-50 text-red-600 px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-red-100 border border-red-100 transition-colors"
                    >
                      Leave Group
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />

      {/* Add/Edit Expense Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-8 max-h-[90vh] overflow-y-auto animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">{editingExpenseId ? 'Edit Expense' : 'Add an Expense'}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 text-3xl leading-none">&times;</button>
            </div>

            <form onSubmit={handleSaveExpense} className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <input 
                    type="text" required placeholder="e.g., Dinner at Barista" autoFocus
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    value={description} onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹)</label>
                  <input 
                    type="number" step="0.01" required placeholder="0.00"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    value={amount} onChange={(e) => setAmount(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select 
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    value={category} onChange={(e) => setCategory(e.target.value)}
                  >
                    <option value="general">General</option>
                    <option value="food">Food & Drinks</option>
                    <option value="travel">Travel</option>
                    <option value="utilities">Utilities</option>
                    <option value="entertainment">Entertainment</option>
                  </select>
                </div>
                <div>
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
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                  <input 
                    type="date" required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    value={expenseDate} onChange={(e) => setExpenseDate(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Split Type</label>
                <div className="grid grid-cols-4 gap-2">
                  {['equal', 'exact', 'percentage', 'shares'].map((type) => (
                    <button
                      key={type} type="button" onClick={() => setSplitType(type)}
                      className={`py-2 text-sm font-medium rounded-lg border capitalize transition-all ${
                        splitType === type 
                          ? 'bg-indigo-50 border-indigo-200 text-indigo-700 ring-1 ring-indigo-500 shadow-sm' 
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
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
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

              <div className="pt-4 flex gap-3 border-t border-gray-100 mt-6">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-2.5 text-gray-700 bg-gray-100 rounded-lg font-medium hover:bg-gray-200 transition-colors">
                  Cancel
                </button>
                <button type="submit" className="flex-1 bg-indigo-600 text-white px-4 py-2.5 rounded-lg font-medium hover:bg-indigo-700 shadow-sm transition-all active:scale-95">
                  {editingExpenseId ? 'Update Expense' : 'Save Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Expense Confirmation Modal */}
      {expenseToDelete && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-in zoom-in-95">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4 mx-auto">
              <span className="text-2xl text-red-600">🗑️</span>
            </div>
            <h3 className="text-xl font-bold text-center text-gray-900 mb-2">Delete Expense?</h3>
            <p className="text-gray-500 text-sm text-center mb-6">
              Are you sure you want to delete <strong>{expenseToDelete.description}</strong> for <strong>₹{(expenseToDelete.amount_minor / 100).toFixed(2)}</strong>? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setExpenseToDelete(null)} 
                className="flex-1 px-4 py-2.5 text-gray-700 bg-gray-100 rounded-lg font-medium hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={confirmDeleteExpense} 
                className="flex-1 px-4 py-2.5 text-white bg-red-600 rounded-lg font-medium hover:bg-red-700 shadow-sm transition-all active:scale-95"
              >
                Yes, Delete
              </button>
            </div>
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

      {/* Leave Group Confirmation Modal */}
      {showLeaveConfirm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-in zoom-in-95">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4 mx-auto">
              <span className="text-2xl text-red-600">🚪</span>
            </div>
            <h3 className="text-xl font-bold text-center text-gray-900 mb-2">Leave Group?</h3>
            <p className="text-gray-500 text-sm text-center mb-6">
              You can only leave if your balance in this group is exactly ₹0.00. If you have unsettled debts, settle them first.
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setShowLeaveConfirm(false)} 
                className="flex-1 px-4 py-2.5 text-gray-700 bg-gray-100 rounded-lg font-medium hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleLeaveGroup} 
                className="flex-1 px-4 py-2.5 text-white bg-red-600 rounded-lg font-medium hover:bg-red-700 shadow-sm transition-all active:scale-95"
              >
                Leave
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}