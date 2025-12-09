
import React, { useState } from 'react';
import { Icons } from '../components/Icons';
import { Button } from '../components/ui/Button';
import { waniKaniService } from '../services/wanikaniService';
import { User } from '../types';

interface LoginProps {
  onLogin: (token: string, user: User) => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [token, setToken] = useState(localStorage.getItem('wk_token'));
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      waniKaniService.setToken(token);
      const userRes = await waniKaniService.getUser(); // Validate token
      onLogin(token, userRes.data);
    } catch (err) {
      setError('Invalid API Token or Network Error');
      waniKaniService.setToken('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
        <div className="text-center mb-8">
          <div className="bg-indigo-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg transform rotate-3">
             <Icons.Brain className="text-white w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">SukiStudy</h1>
          <p className="text-gray-500 mt-2">Enter your Personal Access Token V2</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">API Token</label>
            <input
              type="text"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
              placeholder="Ex: 8a4c9b..."
              required
            />
          </div>
          
          {error && <div className="text-red-500 text-sm bg-red-50 p-3 rounded-lg border border-red-100">{error}</div>}

          <Button type="submit" className="w-full" size="lg" isLoading={loading}>
            Connect Account
          </Button>

          <p className="text-xs text-center text-gray-400">
            Token is stored locally in your browser.
          </p>
        </form>
      </div>
    </div>
  );
};
