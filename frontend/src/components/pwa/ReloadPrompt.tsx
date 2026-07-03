/// <reference types="vite-plugin-pwa/client" />
import React from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

export function ReloadPrompt() {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r: ServiceWorkerRegistration | undefined) {
      console.log('SW Registered: ', r);
    },
    onRegisterError(error: any) {
      console.log('SW registration error', error);
    },
  });

  const close = () => {
    setOfflineReady(false);
    setNeedRefresh(false);
  };

  if (!offlineReady && !needRefresh) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-white dark:bg-slate-800 p-4 rounded shadow-lg border border-slate-200 dark:border-slate-700 flex flex-col gap-2 max-w-sm">
      <div className="text-sm text-slate-800 dark:text-slate-200">
        {offlineReady ? (
          <span>App ready to work offline.</span>
        ) : (
          <span>A new version of BillAura is available. Click to update.</span>
        )}
      </div>
      <div className="flex gap-2 mt-2">
        {needRefresh && (
          <button
            onClick={() => updateServiceWorker(true)}
            className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
          >
            Update Now
          </button>
        )}
        <button
          onClick={close}
          className="px-3 py-1.5 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs rounded hover:bg-slate-300 dark:hover:bg-slate-600"
        >
          Close
        </button>
      </div>
    </div>
  );
}
