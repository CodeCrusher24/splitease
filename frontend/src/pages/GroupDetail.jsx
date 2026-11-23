import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import apiClient from '../api/client';

export default function GroupDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchGroup = async () => {
      try {
        const response = await apiClient.get(`/groups/${id}`);
        setGroup(response.data);
      } catch (err) {
        setError('Failed to load group details.');
      } finally {
        setLoading(false);
      }
    };
    fetchGroup();
  }, [id]);

  if (loading) return <div className="p-8 text-center">Loading group...</div>;
  if (error) return <div className="p-8 text-center text-red-500">{error}</div>;

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <button onClick={() => navigate('/dashboard')} className="text-indigo-600 mb-4 hover:underline">
          &larr; Back to Dashboard
        </button>
        
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <h1 className="text-3xl font-bold text-gray-800">{group.name}</h1>
          <p className="text-gray-600">{group.description}</p>
          <div className="mt-4 flex gap-2">
            {group.members.map((m) => (
              <span key={m.user_id} className="bg-indigo-100 text-indigo-800 text-xs font-semibold px-2.5 py-0.5 rounded">
                {m.name}
              </span>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-bold mb-4">Expenses</h2>
            <p className="text-gray-500 italic">Expenses will be listed here soon.</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-bold mb-4">Balances & Settlements</h2>
            <p className="text-gray-500 italic">Balances will be calculated here soon.</p>
          </div>
        </div>
      </div>
    </div>
  );
}