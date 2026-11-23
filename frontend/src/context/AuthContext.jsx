import { createContext, useContext, useState, useEffect } from 'react';
import apiClient from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // On app load, check if we have a token
    const token = localStorage.getItem('token');
    if (token) {
      // We need a /users/me endpoint to get the current user. 
      // For now, we'll just set a dummy user since we haven't built that endpoint yet.
      // Actually, we can decode the JWT payload to get the user ID, but it's better to fetch it.
      setUser({ id: 1, name: 'Test User', email: 'test@example.com' }); 
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    const response = await apiClient.post('/auth/login', { email, password });
    const { access_token, user } = response.data;
    
    localStorage.setItem('token', access_token);
    setUser(user);
    return user;
  };

  const register = async (name, email, password) => {
    await apiClient.post('/auth/register', { name, email, password });
    // After register, log them in automatically
    return login(email, password);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

  return (
    <AuthContext.Provider value={{ user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);