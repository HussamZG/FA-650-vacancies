"use client";

import { useEffect, useCallback } from "react";

interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  action: () => void;
  description: string;
}

export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[]) {
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    for (const shortcut of shortcuts) {
      const ctrlMatch = shortcut.ctrl ? event.ctrlKey || event.metaKey : true;
      const shiftMatch = shortcut.shift ? event.shiftKey : !event.shiftKey;
      const altMatch = shortcut.alt ? event.altKey : !event.altKey;
      const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();
      
      // Check if all modifiers match
      const ctrlRequired = shortcut.ctrl === true;
      const shiftRequired = shortcut.shift === true;
      const altRequired = shortcut.alt === true;
      
      const ctrlOk = ctrlRequired ? (event.ctrlKey || event.metaKey) : (!shortcut.ctrl && (event.ctrlKey || event.metaKey) ? false : true);
      const shiftOk = shiftRequired ? event.shiftKey : (!shortcut.shift && event.shiftKey ? false : true);
      const altOk = altRequired ? event.altKey : (!shortcut.alt && event.altKey ? false : true);
      
      if (keyMatch && ctrlOk && shiftOk && altOk) {
        event.preventDefault();
        shortcut.action();
        return;
      }
    }
  }, [shortcuts]);
  
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

// Default shortcuts for the schedule app
export const defaultShortcuts: KeyboardShortcut[] = [
  { key: 'n', ctrl: true, action: () => {}, description: 'إضافة مناوب جديد' },
  { key: 's', ctrl: true, action: () => {}, description: 'حفظ الجدول' },
  { key: 'p', ctrl: true, action: () => {}, description: 'طباعة الجدول' },
  { key: 'e', ctrl: true, action: () => {}, description: 'تصدير الجدول' },
  { key: 'f', ctrl: true, action: () => {}, description: 'بحث' },
  { key: '/', action: () => {}, description: 'التركيز على البحث' },
  { key: '?', shift: true, action: () => {}, description: 'عرض الاختصارات' },
];

// Shortcuts help component
export function getShortcutsHelp(shortcuts: KeyboardShortcut[]): { shortcut: string; description: string }[] {
  return shortcuts.map(s => ({
    shortcut: [
      s.ctrl ? 'Ctrl+' : '',
      s.shift ? 'Shift+' : '',
      s.alt ? 'Alt+' : '',
      s.key.toUpperCase()
    ].join(''),
    description: s.description
  }));
}
