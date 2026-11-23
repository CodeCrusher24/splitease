import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '../api/client';

export default function GroupDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  // Data state
  const [group, setGroup] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // UI state
  const [showModal, setShowModal] = useState(false);

  // Form state
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [paidBy, setPaidBy] = useState('');
  const [splitType, setSplitType] = useState('equal');
  const [splits, setSplits] = useState({}); // { userId: value }

  useEffect(() => {
    fetchGroupData();
  }, [id]);

  const fetchGroupData = async () => {
    try {
      setLoading(true);
      const [groupRes, expensesRes] = await Promise.all([
        apiClient.get(`/groups/${id}`),
        apiClient.get(`/groups/${id}/expenses`)
      ]);
      setGroup(groupRes.data);
      setExpenses(expensesRes.data);
      
      // Initialize the paidBy and splits state with the first member
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
      // Format splits for the API based on splitType
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

      const response = await apiClient.post(`/groups/${id}/expenses`, payload);
      
      // Add to local state and close modal
      setExpenses([response.data, ...expenses]);
      setShowModal(false);
      
      // Reset form
      setDescription('');
      setAmount('');
      setSplitType('equal');
      const resetSplits = {};
      Object.keys(splits).forEach(uid => resetSplits[uid] = '');
      setSplits(resetSplits);

    } catch (err) {
      // Handle validation errors from FastAPI
      const detail = err.response?.data?.detail;
      if (Array.isArray(detail)) {
        setError(detail[0].msg || 'Validation error');
      } else {
        setError(detail || 'Failed to add expense');
      }
    }
  };

  const handleSplitChange = (userId, value) => {
    setSplits({ ...splits, [userId]: value });
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Loading group...</div>;
  if (error && !group) return <div className="p-8 text-center text-red-500">{error}</div>;
  if (!group) return null;

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
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
                <span key={m.user_id} className="bg-indigo-100 text-indigo-800 text-xs font-semibold px-2.5 py-0.5 rounded">
                  {m.name}
                </span>
              ))}
            </div>
          </div>
          <button 
            onClick={() => setShowModal(true)}
            className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 transition"
          >
            + Add Expense
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Expenses List */}
          <div className="bg-white p-6 rounded-lg shadow-md">
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
                        Paid by User {exp.paid_by} • {exp.split_type}
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

          {/* Balances (Placeholder for next phase) */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-bold mb-4 border-b pb-2">Balances & Settlements</h2>
            <p className="text-gray-500 italic">Balances will be calculated here soon.</p>
          </div>
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

            {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4 text-sm">{error}</div>}

            <form onSubmit={handleAddExpense} className="space-y-4">
              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <input 
                  type="text" required placeholder="e.g., Dinner at Barista"
                  className="mt-1 block w-full border border-gray-300 rounded-md p-2"
                  value={description} onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              {/* Amount & Payer */}
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

              {/* Split Type */}
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

              {/* Dynamic Split Inputs */}
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