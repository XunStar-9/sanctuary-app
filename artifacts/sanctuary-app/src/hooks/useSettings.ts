import { useState, useEffect } from 'react';
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
  // ── Preset options ───────────────────────────────────────────────────────────
  const [theme,      setTheme]      = useState<ThemeId>(    () => ls('sanctuary_theme',      'warm'));
  const [fontSize,   setFontSize]   = useState<FontSize>(   () => ls('sanctuary_fontsize',   'md'));
  const [lineHeight, setLineHeight] = useState<LineHeight>(  () => ls('sanctuary_lineheight', 'normal'));
  const [editorFont, setEditorFont] = useState<EditorFont>(  () => ls('sanctuary_editorfont', 'serif'));

  // ── Fine-grained typography (0 = follow preset) ───────────────────────────
  const [fontSizeNum,   setFontSizeNum]   = useState<number>(() => lsNum('sanctuary_fontsizenum',   0));
  const [lineHeightNum, setLineHeightNum] = useState<number>(() => lsNum('sanctuary_lineheightnum', 0));

  // ── Text formatting (selection toolbar) ──────────────────────────────────
  const [formattingEnabled, setFormattingEnabled] = useState<boolean>(() => lsBool('sanctuary_formatting', false));

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('sanctuary_theme', theme);
  }, [theme]);

  useEffect(() => { localStorage.setItem('sanctuary_fontsize',      fontSize);                 }, [fontSize]);
  useEffect(() => { localStorage.setItem('sanctuary_lineheight',    lineHeight);               }, [lineHeight]);
  useEffect(() => { localStorage.setItem('sanctuary_editorfont',    editorFont);               }, [editorFont]);
  useEffect(() => { localStorage.setItem('sanctuary_fontsizenum',   String(fontSizeNum));      }, [fontSizeNum]);
  useEffect(() => { localStorage.setItem('sanctuary_lineheightnum', String(lineHeightNum));    }, [lineHeightNum]);
  useEffect(() => { localStorage.setItem('sanctuary_formatting',    String(formattingEnabled));}, [formattingEnabled]);

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
