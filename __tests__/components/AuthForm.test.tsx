/**
 * @jest-environment jsdom
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import AuthForm from '@/app/components/AuthForm';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      'title': 'Authentication Required',
      'authRequired': 'Please enter the admin passphrase',
      'passphrase': 'Passphrase',
      'passphrasePlaceholder': 'Enter passphrase',
      'submit': 'Submit',
      'invalidPassphrase': 'Invalid passphrase',
      'common.loading': 'Loading...',
    };
    return translations[key] || key;
  },
}));

// Mock fetch
global.fetch = jest.fn();

describe('AuthForm', () => {
  const mockPush = jest.fn();
  const mockRefresh = jest.fn();
  const mockRouter = {
    push: mockPush,
    refresh: mockRefresh,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (global.fetch as jest.Mock).mockClear();
  });

  it('should render auth form with all elements', () => {
    render(<AuthForm redirectTo="/admin" />);

    expect(screen.getByText('Authentication Required')).toBeInTheDocument();
    expect(screen.getByText('Please enter the admin passphrase')).toBeInTheDocument();
    expect(screen.getByLabelText('Passphrase')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter passphrase')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Submit' })).toBeInTheDocument();
  });

  it('should update passphrase input value on change', () => {
    render(<AuthForm redirectTo="/admin" />);

    const input = screen.getByLabelText('Passphrase') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'test-passphrase' } });

    expect(input.value).toBe('test-passphrase');
  });

  it('should be a password input type', () => {
    render(<AuthForm redirectTo="/admin" />);

    const input = screen.getByLabelText('Passphrase');
    expect(input).toHaveAttribute('type', 'password');
  });

  it('should submit form and redirect on successful authentication', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });

    render(<AuthForm redirectTo="/admin" />);

    const input = screen.getByLabelText('Passphrase');
    const button = screen.getByRole('button', { name: 'Submit' });

    fireEvent.change(input, { target: { value: 'correct-passphrase' } });
    fireEvent.click(button);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ passphrase: 'correct-passphrase' }),
      });
      expect(mockPush).toHaveBeenCalledWith('/admin');
      expect(mockRefresh).toHaveBeenCalled();
    });
  });

  it('should show error message on invalid passphrase', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ error: 'Invalid passphrase' }),
    });

    render(<AuthForm redirectTo="/admin" />);

    const input = screen.getByLabelText('Passphrase');
    const button = screen.getByRole('button', { name: 'Submit' });

    fireEvent.change(input, { target: { value: 'wrong-passphrase' } });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText('Invalid passphrase')).toBeInTheDocument();
    });

    expect(mockPush).not.toHaveBeenCalled();
    expect(mockRefresh).not.toHaveBeenCalled();
  });

  it('should show error message on network error', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

    render(<AuthForm redirectTo="/admin" />);

    const input = screen.getByLabelText('Passphrase');
    const button = screen.getByRole('button', { name: 'Submit' });

    fireEvent.change(input, { target: { value: 'test' } });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText('Invalid passphrase')).toBeInTheDocument();
    });

    expect(consoleErrorSpy).toHaveBeenCalledWith('Auth error:', expect.any(Error));
    expect(mockPush).not.toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });

  it('should disable form during submission', async () => {
    // Mock fetch to never resolve (to keep loading state)
    (global.fetch as jest.Mock).mockImplementation(() => new Promise(() => {}));

    render(<AuthForm redirectTo="/admin" />);

    const input = screen.getByLabelText('Passphrase');
    const button = screen.getByRole('button') as HTMLButtonElement;

    fireEvent.change(input, { target: { value: 'test' } });
    fireEvent.click(button);

    await waitFor(() => {
      expect(button).toBeDisabled();
      expect(button.textContent).toBe('Loading...');
      expect(input).toBeDisabled();
    });
  });

  it('should clear error message on new submission', async () => {
    // First submission - fail
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 401,
    });

    render(<AuthForm redirectTo="/admin" />);

    const input = screen.getByLabelText('Passphrase');
    const button = screen.getByRole('button', { name: 'Submit' });

    fireEvent.change(input, { target: { value: 'wrong' } });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText('Invalid passphrase')).toBeInTheDocument();
    });

    // Second submission - should clear error before showing loading
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
    });

    fireEvent.change(input, { target: { value: 'correct' } });
    fireEvent.click(button);

    // Error should be cleared immediately
    await waitFor(() => {
      expect(screen.queryByText('Invalid passphrase')).not.toBeInTheDocument();
    });
  });

  it('should handle different redirect paths', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
    });

    render(<AuthForm redirectTo="/admin/create" />);

    const input = screen.getByLabelText('Passphrase');
    const button = screen.getByRole('button', { name: 'Submit' });

    fireEvent.change(input, { target: { value: 'test' } });
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/admin/create');
    });
  });

  it('should require passphrase field', () => {
    render(<AuthForm redirectTo="/admin" />);

    const input = screen.getByLabelText('Passphrase');
    expect(input).toBeRequired();
  });

  it('should re-enable form after submission completes', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 401,
    });

    render(<AuthForm redirectTo="/admin" />);

    const input = screen.getByLabelText('Passphrase') as HTMLInputElement;
    const button = screen.getByRole('button') as HTMLButtonElement;

    fireEvent.change(input, { target: { value: 'test' } });
    fireEvent.click(button);

    // Should be disabled during submission
    await waitFor(() => {
      expect(button).toBeDisabled();
    });

    // Should be enabled again after completion
    await waitFor(() => {
      expect(button).not.toBeDisabled();
      expect(input).not.toBeDisabled();
      expect(button.textContent).toBe('Submit');
    });
  });
});
