'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';

interface AuthFormProps {
  redirectTo: string;
}

export default function AuthForm({ redirectTo }: AuthFormProps) {
  const t = useTranslations('auth');
  const router = useRouter();
  const [passphrase, setPassphrase] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ passphrase }),
      });

      if (response.ok) {
        // Redirect to the intended page
        router.push(redirectTo);
        router.refresh();
      } else {
        setError(t('invalidPassphrase'));
      }
    } catch (err) {
      console.error('Auth error:', err);
      setError(t('invalidPassphrase'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow-md">
        <div>
          <h2 className="text-center text-3xl font-bold text-gray-900">
            {t('title')}
          </h2>
          <p className="mt-2 text-center text-gray-700">
            {t('authRequired')}
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="passphrase" className="block text-gray-800 font-medium mb-2">
              {t('passphrase')}
            </label>
            <input
              id="passphrase"
              name="passphrase"
              type="password"
              required
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              placeholder={t('passphrasePlaceholder')}
              disabled={isLoading}
            />
          </div>

          {error && (
            <div className="text-red-600 text-sm text-center">
              {error}
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md disabled:bg-blue-300 disabled:cursor-not-allowed"
            >
              {isLoading ? t('common.loading') : t('submit')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
