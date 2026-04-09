import { useState, useEffect, useRef } from 'react';
import type { ThemeId, FontSize, LineHeight, EditorFont } from '@/lib/types';

function ls<T extends string>(key: string, fallback: T): T {
  return (localStorage.getItem(key) as T) ?? fallback;
}
function lsNum(key: string, fallback: number): number {
  const v = localStorage.getItem(key);
  return v !== null ? Number(v) : fallback;
}
function lsBool(key: string, fallback: boolean): boolean {
  const v = localStorage.getItem(key);
  return v !== null ? v === 'true' : fallback;
}

export function useSettings() {
  const [theme,      setTheme]      = useState<ThemeId>(    () => ls('sanctuary_theme',      'warm'));
  const [fontSize,   setFontSize]   = useState<FontSize>(   () => ls('sanctuary_fontsize',   'md'));
  const [lineHeight, setLineHeight] = useState<LineHeight>(  () => ls('sanctuary_lineheight', 'normal'));
  const [editorFont, setEditorFont] = useState<EditorFont>(  () => ls('sanctuary_editorfont', 'serif'));

  const [fontSizeNum,   setFontSizeNum]   = useState<number>(() => lsNum('sanctuary_fontsizenum',   0));
  const [lineHeightNum, setLineHeightNum] = useState<number>(() => lsNum('sanctuary_lineheightnum', 0));

  const [formattingEnabled, setFormattingEnabled] = useState<boolean>(() => lsBool('sanctuary_formatting', false));

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const saveTimer = useRef(0);
  useEffect(() => {
    clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      localStorage.setItem('sanctuary_theme',          theme);
      localStorage.setItem('sanctuary_fontsize',       fontSize);
      localStorage.setItem('sanctuary_lineheight',     lineHeight);
      localStorage.setItem('sanctuary_editorfont',     editorFont);
      localStorage.setItem('sanctuary_fontsizenum',    String(fontSizeNum));
      localStorage.setItem('sanctuary_lineheightnum',  String(lineHeightNum));
      localStorage.setItem('sanctuary_formatting',     String(formattingEnabled));
    }, 100);
    return () => clearTimeout(saveTimer.current);
  }, [theme, fontSize, lineHeight, editorFont, fontSizeNum, lineHeightNum, formattingEnabled]);

  return {
    theme, setTheme,
    fontSize, setFontSize,
    lineHeight, setLineHeight,
    editorFont, setEditorFont,
    fontSizeNum, setFontSizeNum,
    lineHeightNum, setLineHeightNum,
    formattingEnabled, setFormattingEnabled,
  };
}
