"use client";

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';

interface ConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmColor?: 'red' | 'blue' | 'green';
}

interface ConfirmDialogContextType {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmDialogContext = createContext<ConfirmDialogContextType | undefined>(undefined);

export function useConfirm() {
  const context = useContext(ConfirmDialogContext);
  if (!context) {
    throw new Error('useConfirm must be used within ConfirmDialogProvider');
  }
  return context.confirm;
}

interface DialogState extends ConfirmOptions {
  isOpen: boolean;
  resolver?: (value: boolean) => void;
}

export function ConfirmDialogProvider({ children }: { children: ReactNode }) {
  const [dialogState, setDialogState] = useState<DialogState>({
    isOpen: false,
    message: '',
  });

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setDialogState({
        ...options,
        isOpen: true,
        resolver: resolve,
      });
    });
  }, []);

  const handleConfirm = () => {
    dialogState.resolver?.(true);
    setDialogState({ ...dialogState, isOpen: false });
  };

  const handleCancel = () => {
    dialogState.resolver?.(false);
    setDialogState({ ...dialogState, isOpen: false });
  };

  const confirmButtonColor = {
    red: 'bg-red-600 hover:bg-red-700 focus:ring-red-500',
    blue: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500',
    green: 'bg-green-600 hover:bg-green-700 focus:ring-green-500',
  }[dialogState.confirmColor || 'blue'];

  // Handle Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && dialogState.isOpen) {
        handleCancel();
      }
    };

    if (dialogState.isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [dialogState.isOpen]);

  return (
    <ConfirmDialogContext.Provider value={{ confirm }}>
      {children}

      {dialogState.isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-6 sm:p-4 text-center">
            {/* Backdrop with blur and grey overlay */}
            <div
              className="fixed inset-0 bg-gray-500/40 dark:bg-gray-900/60 backdrop-blur-sm transition-opacity"
              onClick={handleCancel}
            />

            {/* Modal */}
            <div className="relative transform overflow-hidden rounded-lg bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 text-left shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
              <div className="bg-white dark:bg-gray-800 px-6 pb-6 pt-8 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20 sm:mx-0 sm:h-10 sm:w-10 mb-4 sm:mb-0">
                    <svg
                      className="h-6 w-6 text-red-600 dark:text-red-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth="1.5"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                      />
                    </svg>
                  </div>
                  <div className="mt-0 text-center sm:ml-4 sm:mt-0 sm:text-left">
                    {dialogState.title && (
                      <h3 className="text-base font-semibold leading-6 text-gray-900 dark:text-gray-100 mb-4">
                        {dialogState.title}
                      </h3>
                    )}
                    <div className={dialogState.title ? "" : "mt-0"}>
                      <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300 py-2">
                        {dialogState.message}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-900 px-6 py-4 sm:flex sm:flex-row-reverse sm:px-6 gap-2">
                <button
                  type="button"
                  className={`inline-flex w-full justify-center rounded-md px-3 py-2 text-sm font-semibold text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 sm:w-auto ${confirmButtonColor}`}
                  onClick={handleConfirm}
                >
                  {dialogState.confirmText || 'Confirm'}
                </button>
                <button
                  type="button"
                  className="mt-3 inline-flex w-full justify-center rounded-md bg-white dark:bg-gray-700 px-3 py-2 text-sm font-semibold text-gray-900 dark:text-gray-100 shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 sm:mt-0 sm:w-auto"
                  onClick={handleCancel}
                >
                  {dialogState.cancelText || 'Cancel'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </ConfirmDialogContext.Provider>
  );
}
