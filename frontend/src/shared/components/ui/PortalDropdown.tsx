import React, { useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';

interface PortalDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLElement | null>;
  children: React.ReactNode;
  width?: number;
  maxHeight?: number;
}

export const PortalDropdown: React.FC<PortalDropdownProps> = ({
  isOpen,
  onClose,
  triggerRef,
  children,
  width = 260,
  maxHeight = 420,
}) => {
  const [coords, setCoords] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen || !triggerRef.current) return;

    const updatePosition = () => {
      if (!triggerRef.current) return;
      const rect = triggerRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      let top = rect.bottom + window.scrollY + 4;
      let left = rect.right + window.scrollX - width;

      // Flip vertically if close to bottom
      if (rect.bottom + maxHeight > viewportHeight && rect.top > maxHeight) {
        top = rect.top + window.scrollY - maxHeight - 4;
      }

      // Adjust horizontally if off-screen
      if (left < 10) left = 10;
      if (left + width > viewportWidth - 10) {
        left = viewportWidth - width - 10;
      }

      setCoords({ top, left });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isOpen, triggerRef, width, maxHeight]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose, triggerRef]);

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div
      ref={menuRef}
      style={{
        position: 'absolute',
        top: `${coords.top}px`,
        left: `${coords.left}px`,
        width: `${width}px`,
        maxHeight: `${maxHeight}px`,
        zIndex: 99999,
      }}
      className="bg-white rounded-xl shadow-xl border border-[#E5E7EB] py-1.5 overflow-y-auto text-xs font-sans text-[#111827] animate-in fade-in zoom-in-95 duration-100"
    >
      {children}
    </div>,
    document.body
  );
};
