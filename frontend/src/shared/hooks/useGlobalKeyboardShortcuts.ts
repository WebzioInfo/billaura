import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCommandPaletteStore } from '@/store/commandPaletteStore';
import { useHelpStore } from '@/shared/stores/helpStore';

export function useGlobalKeyboardShortcuts() {
  const navigate = useNavigate();
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input
      if (
        document.activeElement?.tagName === 'INPUT' || 
        document.activeElement?.tagName === 'TEXTAREA' ||
        document.activeElement?.getAttribute('contenteditable') === 'true'
      ) {
        // Only allow Esc and Ctrl+K globally
        if (e.key === 'Escape') {
          // If Command Palette is open, cmdk handles escape. Otherwise we can blur inputs
          if (document.activeElement instanceof HTMLElement) {
            document.activeElement.blur();
          }
          return;
        }
        
        if (!(e.key === 'k' && (e.metaKey || e.ctrlKey))) {
          return;
        }
      }

      switch (e.key) {
        case 'F1':
          e.preventDefault();
          useHelpStore.getState().toggleHelp();
          break;
        case '/':
          // Focus search / open palette
          e.preventDefault();
          useCommandPaletteStore.getState().openPalette();
          break;
        case 'n':
          if (e.altKey) {
            e.preventDefault();
            // Default quick action is New Invoice, though this could be context aware
            navigate('/invoices/new');
          }
          break;
        // Ctrl+S is usually handled at the form level, but we can prevent default here if needed globally
        case 's':
          if (e.ctrlKey || e.metaKey) {
            // Let the active form intercept this, but if it bubbles up, we just prevent browser save dialog
            e.preventDefault();
          }
          break;
        default:
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);
}

