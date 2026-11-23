import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import apiClient from '../api/client';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Form state for creating a new group
  const [showCreate, setShowCreate] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    try {
      const response = await apiClient.get('/groups');
      setGroups(response.data);
    } catch (err) {
      setError('Failed to load groups. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    try {
      const response = await apiClient.post('/groups', {
        name: newGroupName,
        description: newGroupDesc,
        currency: 'INR'
      });
      // Add the new group to the list
      setGroups([...groups, response.data]);
      setShowCreate(false);
      setNewGroupName('');
      setNewGroupDesc('');
    } catch (err) {
      setError('Failed to create group.');
    }
  };

  if (loading) return <div className="p-8 text-center">Loading groups...</div>;

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>
            <p className="text-gray-600">Welcome, {user?.name}</p>
          </div>
          <button onClick={logout} className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition">
            Logout
          </button>
        </div>

        {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4">{error}</div>}

        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-800">Your Groups</h2>
          <button 
            onClick={() => setShowCreate(!showCreate)}
            className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 transition"
          >
            {showCreate ? 'Cancel' : '+ New Group'}
          </button>
        </div>

        {showCreate && (
          <div className="bg-white p-6 rounded-lg shadow-md mb-6">
            <form onSubmit={handleCreateGroup} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Group Name</label>
                <input 
                  type="text" required
                  className="mt-1 block w-full border border-gray-300 rounded-md p-2"
                  value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="e.g., Goa Trip 2026"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Description (Optional)</label>
                <input 
                  type="text" 
                  className="mt-1 block w-full border border-gray-300 rounded-md p-2"
                  value={newGroupDesc} onChange={(e) => setNewGroupDesc(e.target.value)}
                />
              </div>
              <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition">
                Create Group
              </button>
            </form>
          </div>
        )}

        {groups.length === 0 ? (
          <div className="bg-white p-8 rounded-lg shadow text-center text-gray-500">
            You don't have any groups yet. Create one to get started!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {groups.map((group) => (
              <Link to={`/groups/${group.id}`} key={group.id} className="block">
                <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition">
                  <h3 className="text-lg font-bold text-indigo-600 mb-2">{group.name}</h3>
                  <p className="text-gray-600 text-sm">{group.description || 'No description'}</p>
                  <p className="text-gray-400 text-xs mt-4">Currency: {group.currency}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}