import React, { StrictMode, ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Uncaught error in application:', error, errorInfo);
  }

  override render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 max-w-md w-full text-center space-y-4 shadow-xl">
            <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto text-2xl font-bold">
              ⚠️
            </div>
            <h2 className="text-lg font-bold text-white">กำลังโหลดข้อมูลระบบ</h2>
            <p className="text-xs text-slate-300">
              {this.state.error?.message || 'พบข้อผิดพลาดชั่วคราวในการแสดงผล กรุณากดปุ่มด้านล่างเพื่อเริ่มระบบใหม่'}
            </p>
            <div className="space-y-2 pt-2">
              <button
                onClick={() => {
                  window.location.href = window.location.origin + window.location.pathname;
                }}
                className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-sm transition-colors cursor-pointer"
              >
                โหลดหน้าเว็บใหม่อีกครั้ง
              </button>
              <button
                onClick={() => {
                  try {
                    window.localStorage.clear();
                  } catch {}
                  window.location.href = window.location.origin + window.location.pathname;
                }}
                className="w-full py-2 px-4 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-xl text-xs transition-colors cursor-pointer"
              >
                ล้างแคชในเครื่องและโหลดใหม่
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);

