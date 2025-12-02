import React, { useState } from 'react';
import { supabase } from './supabaseClient';

export default function Auth() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authMode, setAuthMode] = useState('signin'); // 'signin' or 'signup'

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      if (authMode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        alert('Check your email for the confirmation link!');
      }
    } catch (error) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card p-6 max-w-md mx-auto">
      <h2 className="text-2xl font-bold text-white mb-6 text-center">
        {authMode === 'signin' ? 'Sign In' : 'Sign Up'} to EduMesh
      </h2>
      
      <form onSubmit={handleAuth} className="space-y-4">
        <div>
          <label className="block text-gray-300 mb-1" htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            placeholder="Your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-gray-700 border border-gray-600 rounded-md px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
            required
          />
        </div>
        
        <div>
          <label className="block text-gray-300 mb-1" htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            placeholder="Your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-gray-700 border border-gray-600 rounded-md px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
            required
          />
        </div>
        
        <button
          type="submit"
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-md font-medium transition-colors"
          disabled={loading}
        >
          {loading ? 'Loading...' : authMode === 'signin' ? 'Sign In' : 'Sign Up'}
        </button>
      </form>
      
      <div className="mt-4 text-center">
        <button
          onClick={() => setAuthMode(authMode === 'signin' ? 'signup' : 'signin')}
          className="text-blue-400 hover:text-blue-300 text-sm"
        >
          {authMode === 'signin' ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}
        </button>
      </div>
    </div>
  );
}