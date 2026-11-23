import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import apiClient from '../api/client';
import LoadingSpinner from '../components/LoadingSpinner';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import toast from 'react-hot-toast';

export default function Dashboard() {
  const { user } = useAuth();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
      setGroups([response.data, ...groups]);
      setShowCreate(false);
      setNewGroupName('');
      setNewGroupDesc('');
      toast.success('Group created!');
    } catch (err) {
      toast.error('Failed to create group.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Navbar />
        <div className="flex-1"><LoadingSpinner /></div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />

      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-10">
        <div className="flex justify-between items-end mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Your Groups</h1>
            <p className="text-gray-500 mt-1">Manage your shared expenses and settle up.</p>
          </div>
          <button 
            onClick={() => setShowCreate(!showCreate)}
            className="bg-indigo-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-indigo-700 shadow-sm transition-all active:scale-95"
          >
            {showCreate ? 'Cancel' : '+ Create Group'}
          </button>
        </div>

        {showCreate && (
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm mb-8 animate-in fade-in slide-in-from-top-4">
            <h2 className="text-lg font-semibold mb-4">Create a new group</h2>
            <form onSubmit={handleCreateGroup} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Group Name</label>
                <input 
                  type="text" required autoFocus
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                  value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="e.g., Goa Trip 2026"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description (Optional)</label>
                <input 
                  type="text" 
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                  value={newGroupDesc} onChange={(e) => setNewGroupDesc(e.target.value)}
                  placeholder="What's this for?"
                />
              </div>
              <button type="submit" className="bg-gray-900 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-gray-800 transition-all h-[42px]">
                Create
              </button>
            </form>
          </div>
        )}

        {groups.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-xl border border-dashed border-gray-300">
            <div className="text-4xl mb-4">🏝️</div>
            <h3 className="text-lg font-medium text-gray-900">No groups yet</h3>
            <p className="text-gray-500 mt-1 max-w-sm mx-auto">Create a group to start tracking shared expenses with friends, roommates, or travel buddies.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {groups.map((group) => (
              <Link to={`/groups/${group.id}`} key={group.id} className="group block">
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-indigo-100 transition-all duration-200 h-full flex flex-col">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold">
                      {group.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-xs font-medium text-gray-400 bg-gray-50 px-2 py-1 rounded-md">{group.currency}</span>
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">{group.name}</h3>
                  <p className="text-sm text-gray-500 mt-1 flex-grow">{group.description || 'No description provided.'}</p>
                  <div className="mt-6 flex items-center text-sm font-medium text-indigo-600">
                    View Group <span className="ml-1 group-hover:translate-x-1 transition-transform">&rarr;</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}