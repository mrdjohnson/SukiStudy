
import React, { useState } from 'react';
import { Icons } from '../components/Icons';
import { Button } from '../components/ui/Button';
import { waniKaniService } from '../services/wanikaniService';
import { User } from '../types';

interface LoginProps {
  onLogin: (token: string, user: User) => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [token, setToken] = useState(localStorage.getItem('wk_token') || '');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

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

          <div className="pt-4 border-t border-gray-100">
            <button 
              type="button"
              onClick={() => setShowHelp(!showHelp)}
              className="w-full flex items-center justify-center gap-2 text-indigo-600 text-sm font-medium hover:text-indigo-700"
            >
              <Icons.Info className="w-4 h-4" />
              How do I connect?
            </button>

            {showHelp && (
              <div className="mt-4 bg-indigo-50 p-4 rounded-xl text-sm text-gray-700 space-y-3 animate-fade-in">
                <p>To use SukiStudy, you need a valid WaniKani account.</p>
                <ol className="list-decimal pl-4 space-y-1">
                   <li>Log in to WaniKani.</li>
                   <li>Go to Settings {'>'} API Tokens.</li>
                   <li>Generate a new token with "Default" permissions.</li>
                   <li>Copy and paste it here.</li>
                </ol>
                <a 
                  href="https://www.wanikani.com/settings/personal_access_tokens" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="block w-full text-center mt-3 bg-white border border-indigo-200 text-indigo-700 py-2 rounded-lg hover:bg-indigo-50 transition-colors font-medium"
                >
                  Get Token from WaniKani
                </a>
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
