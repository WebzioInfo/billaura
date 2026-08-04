import React, { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

interface KeyboardNavigationProviderProps {
  children: React.ReactNode;
}

export const KeyboardNavigationProvider: React.FC<KeyboardNavigationProviderProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  // Helper to query all focusable elements within a container
  const getFocusableElements = (container: HTMLElement = document.body): HTMLElement[] => {
    const selector = 'input, select, textarea, button, [tabindex]';
    return Array.from(container.querySelectorAll<HTMLElement>(selector)).filter(el => {
      // Exclude disabled, invisible, or ignored elements
      if (el.hasAttribute('disabled')) return false;
      if (el.getAttribute('tabindex') === '-1') return false;
      
      // Filter out global search input from default page auto-focus
      if (el.id === 'global-search-input') return false;
      
      const style = window.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden') return false;
      if (el.offsetWidth === 0 && el.offsetHeight === 0) return false;

      // Filter out small action buttons like Delete row, icons etc. to make navigation fluid
      if (el.tagName === 'BUTTON') {
        const text = el.textContent?.trim() || '';
        const hasIcon = el.querySelector('svg');
        const isDeleteOrTrash = el.classList.contains('text-red-500') || el.classList.contains('hover:text-red-700') || el.classList.contains('text-red-600');
        // Let's only tab into actual primary action/save buttons, or navigation buttons
        if (isDeleteOrTrash || (hasIcon && text === '')) return false;
      }

      return true;
    });
  };

  // Auto focus first field on route change
  useEffect(() => {
    const timer = setTimeout(() => {
      const activeForm = document.querySelector('form') as HTMLElement;
      const container = activeForm || document.body;
      const elements = getFocusableElements(container);
      
      // Find the first input/select to focus
      const firstInput = elements.find(el => 
        el.tagName === 'INPUT' || el.tagName === 'SELECT'
      );
      
      if (firstInput) {
        firstInput.focus();
        if (firstInput instanceof HTMLInputElement && (firstInput.type === 'text' || firstInput.type === 'number')) {
          firstInput.select();
        }
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [location.pathname]);

  // Track active focus for modal restore capability
  useEffect(() => {
    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      // If we focus inside a modal/dialog, track the previous element
      const activeModal = document.querySelector('[role="dialog"], .modal-overlay');
      if (!activeModal && target.tagName !== 'BODY') {
        previouslyFocusedRef.current = target;
      }
    };
    document.addEventListener('focusin', handleFocusIn);
    return () => document.removeEventListener('focusin', handleFocusIn);
  }, []);

  useEffect(() => {
    // Inject global premium focus indicators
    const styleId = 'keyboard-nav-focus-styles';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.innerHTML = `
        input:focus, select:focus, textarea:focus, button:focus {
          outline: 2px solid #2563eb !important;
          outline-offset: 1px !important;
          box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.18) !important;
          transition: box-shadow 0.15s ease-out, outline 0.15s ease-out;
        }
      `;
      document.head.appendChild(style);
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      const active = document.activeElement as HTMLElement;
      if (!active || active.tagName === 'BODY') return;

      const isInput = active.tagName === 'INPUT';
      const isSelect = active.tagName === 'SELECT';
      const isTextarea = active.tagName === 'TEXTAREA';

      // --- Global Shortcuts ---
      // Ctrl + S or Ctrl + Enter inside inputs: Trigger Form Save
      if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S' || e.key === 'Enter')) {
        e.preventDefault();
        const submitBtn = document.querySelector('form button[type="submit"]') as HTMLButtonElement;
        if (submitBtn) {
          submitBtn.click();
        }
        return;
      }

      // Ctrl + N: New Document
      if ((e.ctrlKey || e.metaKey) && (e.key === 'n' || e.key === 'N')) {
        e.preventDefault();
        const newBtn = Array.from(document.querySelectorAll('button, a')).find(el => {
          const txt = el.textContent?.trim().toLowerCase();
          return txt?.includes('new') || txt?.startsWith('+') || txt?.includes('create');
        }) as HTMLElement;
        if (newBtn) {
          newBtn.click();
        }
        return;
      }



      // Ctrl + /: Focus Global Search Input
      if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault();
        const searchInput = document.getElementById('global-search-input');
        if (searchInput) {
          searchInput.focus();
        }
        return;
      }

      // Esc: Close modal dialogs / return focus
      if (e.key === 'Escape') {
        const closeBtn = document.querySelector('[role="dialog"] button.btn-close, .modal-overlay button, button[aria-label="Close"]') as HTMLButtonElement;
        if (closeBtn) {
          e.preventDefault();
          closeBtn.click();
          // Restore focus
          if (previouslyFocusedRef.current) {
            setTimeout(() => previouslyFocusedRef.current?.focus(), 50);
          }
        }
        return;
      }

      // --- ERP Navigation Flow ---
      // Move focus forward with Enter / Ctrl+Enter (for Textarea) or Tab
      if (e.key === 'Enter') {
        // Textareas insert newline by default, navigate only on Ctrl+Enter
        if (isTextarea && !e.ctrlKey) return;

        // Skips default submit for Enter in text input/select fields
        if (isInput || isSelect || (isTextarea && e.ctrlKey)) {
          // If it's a submit button, allow default execution
          if (active.getAttribute('type') === 'submit') return;

          e.preventDefault();

          // Check if this element is inside a table row or a line-item card container (Excel Mode)
          const activeRow = active.closest('tr, .bg-muted\\/10, [data-row], .line-item-row') as HTMLElement;
          const activeForm = active.closest('form');

          if (activeRow && activeForm) {
            const rowSelector = activeRow.tagName === 'TR' ? 'tr' : '.bg-muted\\/10, [data-row], .line-item-row';
            const trElements = Array.from(activeForm.querySelectorAll<HTMLElement>(rowSelector));
            const rowIndex = trElements.indexOf(activeRow);

            const rowFocusables = Array.from(activeRow.querySelectorAll<HTMLElement>('input, select, textarea'));
            const activeIdxInRow = rowFocusables.indexOf(active);

            // If it is the last input/select in the current row
            if (activeIdxInRow === rowFocusables.length - 1) {
              // Try to move to the next row, first focusable item
              if (rowIndex < trElements.length - 1) {
                const nextRow = trElements[rowIndex + 1];
                const nextRowFocusables = Array.from(nextRow.querySelectorAll<HTMLElement>('input, select, textarea'));
                if (nextRowFocusables.length > 0) {
                  nextRowFocusables[0].focus();
                  if (nextRowFocusables[0] instanceof HTMLInputElement) nextRowFocusables[0].select();
                }
              } else {
                // If it is the last row, programmatically click the "Add Line" / "Add Row" button
                const addLineBtn = Array.from(document.querySelectorAll('button')).find(btn => {
                  const text = btn.textContent?.toLowerCase() || '';
                  return text.includes('add line') || text.includes('add item') || text.includes('add row');
                });

                if (addLineBtn) {
                  addLineBtn.click();
                  // Wait a tick for DOM to render the new row, then focus first column of it
                  setTimeout(() => {
                    const freshTrElements = Array.from(activeForm.querySelectorAll<HTMLElement>(rowSelector));
                    const lastTr = freshTrElements[freshTrElements.length - 1];
                    const lastTrFocusables = Array.from(lastTr.querySelectorAll<HTMLElement>('input, select, textarea'));
                    if (lastTrFocusables.length > 0) {
                      lastTrFocusables[0].focus();
                      if (lastTrFocusables[0] instanceof HTMLInputElement) lastTrFocusables[0].select();
                    }
                  }, 100);
                }
              }
              return;
            }
          }

          // Default forward navigation
          focusNext(active, true);
        }
      }

      // Shift + Enter: Move Focus Backward
      if (e.key === 'Enter' && e.shiftKey) {
        if (isInput || isSelect) {
          e.preventDefault();
          focusNext(active, false);
        }
      }

      // --- Arrow Keys Grid / Field Navigation ---
      const isNumberInput = isInput && active.getAttribute('type') === 'number';

      // Arrow Up/Down movement (Excel style)
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        // Skip default arrow changes for numeric fields so users can adjust quantity/rate
        if (isNumberInput) return;

        const activeRow = active.closest('tr, .bg-muted\\/10, [data-row], .line-item-row') as HTMLElement;
        const activeForm = active.closest('form');

        if (activeRow && activeForm) {
          e.preventDefault();
          const rowSelector = activeRow.tagName === 'TR' ? 'tr' : '.bg-muted\\/10, [data-row], .line-item-row';
          const trElements = Array.from(activeForm.querySelectorAll<HTMLElement>(rowSelector));
          const rowIndex = trElements.indexOf(activeRow);

          const rowFocusables = Array.from(activeRow.querySelectorAll<HTMLElement>('input, select, textarea'));
          const colIndex = rowFocusables.indexOf(active);

          const targetRowIndex = e.key === 'ArrowUp' ? rowIndex - 1 : rowIndex + 1;

          if (targetRowIndex >= 0 && targetRowIndex < trElements.length) {
            const targetRow = trElements[targetRowIndex];
            const targetFocusables = Array.from(targetRow.querySelectorAll<HTMLElement>('input, select, textarea'));
            if (colIndex < targetFocusables.length) {
              const focusable = targetFocusables[colIndex];
              focusable.focus();
              if (focusable instanceof HTMLInputElement) focusable.select();
            }
          }
        } else if (isInput || isSelect) {
          // Vertical field stack traversal
          e.preventDefault();
          focusNext(active, e.key === 'ArrowDown');
        }
      }

      // Arrow Left/Right movement (Excel style boundaries)
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        // Only navigate if cursor is at the text boundaries
        if (active instanceof HTMLInputElement) {
          const valLength = active.value.length;
          const isAtStart = active.selectionStart === 0 && active.selectionEnd === 0;
          const isAtEnd = active.selectionStart === valLength && active.selectionEnd === valLength;

          if ((e.key === 'ArrowLeft' && isAtStart) || (e.key === 'ArrowRight' && isAtEnd) || active.type === 'checkbox' || active.type === 'radio') {
            const activeRow = active.closest('tr, .bg-muted\\/10, [data-row], .line-item-row') as HTMLElement;
            if (activeRow) {
              e.preventDefault();
              focusNext(active, e.key === 'ArrowRight');
            }
          }
        } else if (isSelect) {
          e.preventDefault();
          focusNext(active, e.key === 'ArrowRight');
        }
      }
    };

    // Helper to focus next or previous element
    const focusNext = (current: HTMLElement, forward: boolean) => {
      const activeForm = current.closest('form') as HTMLElement;
      const container = activeForm || document.body;
      const elements = getFocusableElements(container);
      const index = elements.indexOf(current);

      if (index !== -1) {
        let nextIndex = forward ? index + 1 : index - 1;
        if (nextIndex >= elements.length) nextIndex = 0;
        if (nextIndex < 0) nextIndex = elements.length - 1;

        const target = elements[nextIndex];
        target.focus();
        if (target instanceof HTMLInputElement && (target.type === 'text' || target.type === 'number')) {
          target.select();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

  // Validation Failure Autofocus Observer
  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const submitBtn = target.closest('button[type="submit"], button.btn-save') as HTMLButtonElement;
      
      if (submitBtn) {
        setTimeout(() => {
          const form = submitBtn.closest('form');
          if (form) {
            // Find react-hook-form aria-invalid errors or normal invalid attributes
            const invalidInput = form.querySelector('[aria-invalid="true"], :invalid') as HTMLElement;
            if (invalidInput) {
              invalidInput.focus();
              if (invalidInput instanceof HTMLInputElement && (invalidInput.type === 'text' || invalidInput.type === 'number')) {
                invalidInput.select();
              }
            }
          }
        }, 150);
      }
    };

    document.addEventListener('click', handleGlobalClick);
    return () => document.removeEventListener('click', handleGlobalClick);
  }, []);

  return <>{children}</>;
};
