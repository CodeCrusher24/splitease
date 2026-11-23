import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      <main className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <div className="text-8xl mb-6">🤔</div>
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Page not found</h1>
        <p className="text-gray-500 mb-8 max-w-md">We couldn't find the page you're looking for. It might have been moved or deleted.</p>
        <Link to="/dashboard" className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-indigo-700 shadow-sm transition-all active:scale-95">
          Go back to Dashboard
        </Link>
      </main>
      <Footer />
    </div>
  );
}