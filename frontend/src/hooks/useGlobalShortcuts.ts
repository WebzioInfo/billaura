import { useEffect } from 'react';

export function useGlobalShortcuts() {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl + K for Search
      if (e.ctrlKey && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        const searchInput = document.querySelector('input[type="text"]') as HTMLInputElement;
        if (searchInput) {
          searchInput.focus();
        }
      }
      
      // Ctrl + S for Save
      if (e.ctrlKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        // Dispatch a custom event or handle save
        window.dispatchEvent(new CustomEvent('gasave'));
      }

      // Ctrl + N for New
      if (e.ctrlKey && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('ganew'));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
}
