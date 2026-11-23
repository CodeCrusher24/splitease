import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="bg-white border-t border-gray-200 py-6 mt-auto">
      <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row justify-between items-center gap-2 text-sm text-gray-500">
        <div>© {new Date().getFullYear()} SplitEase. All rights reserved.</div>
        <div className="flex items-center gap-4">
          <a 
            href="mailto:paragpk2005@gmail.com" 
            className="hover:text-indigo-600 underline transition-colors"
          >
            Report an issue
          </a>
          <Link 
            to="/privacy" 
            className="hover:text-indigo-600 underline transition-colors"
          >
            Privacy Policy
          </Link>
        </div>
      </div>
    </footer>
  );
}