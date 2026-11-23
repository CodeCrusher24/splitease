import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

export default function Privacy() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      <main className="flex-1 max-w-3xl w-full mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Privacy Policy</h1>
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200">
          <p className="text-gray-600 mb-4">Last updated: {new Date().toLocaleDateString()}</p>
          <p className="text-gray-600 mb-4">SplitEase collects your name and email address solely for the purpose of creating your account and allowing friends to add you to groups.</p>
          <p className="text-gray-600 mb-4">We do not sell your data to third parties. Your passwords are securely hashed using bcrypt and we cannot see them.</p>
          <p className="text-gray-600">If you wish to delete your account and all associated data, please contact support.</p>
        </div>
      </main>
      <Footer />
    </div>
  );
}