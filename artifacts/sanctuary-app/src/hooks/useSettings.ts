import { useState, useEffect } from 'react';
import type { ThemeId, FontSize, LineHeight, EditorFont } from '@/lib/types';

function ls<T extends string>(key: string, fallback: T): T {
  return (localStorage.getItem(key) as T) ?? fallback;
}

export function useSettings() {
  const [theme,      setTheme]      = useState<ThemeId>(    () => ls('sanctuary_theme',      'warm'));
  const [fontSize,   setFontSize]   = useState<FontSize>(   () => ls('sanctuary_fontsize',   'md'));
  const [lineHeight, setLineHeight] = useState<LineHeight>(  () => ls('sanctuary_lineheight', 'normal'));
  const [editorFont, setEditorFont] = useState<EditorFont>(  () => ls('sanctuary_editorfont', 'serif'));

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('sanctuary_theme', theme);
  }, [theme]);

  useEffect(() => { localStorage.setItem('sanctuary_fontsize',   fontSize);   }, [fontSize]);
  useEffect(() => { localStorage.setItem('sanctuary_lineheight', lineHeight); }, [lineHeight]);
  useEffect(() => { localStorage.setItem('sanctuary_editorfont', editorFont); }, [editorFont]);

  return { theme, setTheme, fontSize, setFontSize, lineHeight, setLineHeight, editorFont, setEditorFont };
}
