import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
    navigate('/login');
  };

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-10">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link to="/dashboard" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-xl">S</div>
          <span className="text-xl font-bold text-gray-900 tracking-tight">SplitEase</span>
        </Link>
        <div className="flex items-center gap-6">
          <span className="text-sm font-medium text-gray-500 hidden sm:block">Hello, {user?.name}</span>
          <button 
            onClick={handleLogout}
            className="text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-red-50 hover:text-red-600 px-4 py-2 rounded-lg transition-colors border border-gray-200"
          >
            Sign out
          </button>
        </div>
      </div>
    </nav>
  );
}