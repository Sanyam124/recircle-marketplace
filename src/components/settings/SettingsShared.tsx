import React from 'react';

interface ToggleRowProps {
    title: string;
    desc: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
    loading?: boolean;
    color?: 'indigo' | 'amber';
    disabled?: boolean;
}

export function ToggleRow({ title, desc, checked, onChange, loading, color = 'indigo', disabled = false }: ToggleRowProps) {
    const colorClass = color === 'indigo' ? 'peer-checked:bg-indigo-600' : 'peer-checked:bg-amber-500';
    return (
        <label className={`flex items-center justify-between p-4 sm:p-6 bg-white dark:bg-slate-900/60 rounded-[1.5rem] sm:rounded-[2rem] border border-slate-100 dark:border-slate-800 transition-all group ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-indigo-100 dark:hover:border-indigo-900'}`}>
            <div className="pr-4 pointer-events-none">
                <span className={`text-[10px] font-black uppercase tracking-widest block mb-1 italic transition-colors ${disabled ? 'text-slate-300' : 'text-slate-400 group-hover:text-indigo-600'}`}>{title}</span>
                <p className="text-xs font-bold text-slate-900 dark:text-white leading-tight">{desc}</p>
            </div>
            <div className="relative inline-flex items-center flex-shrink-0">
                <input type="checkbox" className="sr-only peer" checked={checked} onChange={(e) => onChange(e.target.checked)} disabled={loading || disabled} />
                <div className={`w-12 h-6.5 bg-slate-200 dark:bg-slate-800 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:rounded-full after:h-[18px] after:w-[18px] after:transition-all ${colorClass}`}></div>
            </div>
        </label>
    );
}

interface ThemeButtonProps {
    active: boolean;
    onClick: () => void;
    lab: string;
    emoji: string;
}

export function ThemeButton({ active, onClick, lab, emoji }: ThemeButtonProps) {
    return (
        <button onClick={onClick} className={`flex flex-col items-center justify-center p-4 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] border-2 transition-all active:scale-95 ${active ? 'border-indigo-600 bg-white dark:bg-slate-900 shadow-xl shadow-indigo-100 dark:shadow-none font-bold' : 'border-transparent bg-slate-50 dark:bg-slate-900/30 text-slate-400 hover:border-slate-200 dark:hover:border-slate-800 font-bold'}`}>
            <span className="text-3xl sm:text-4xl mb-3 transition-transform duration-500 group-hover:scale-125">{emoji}</span>
            <span className={`text-[10px] font-black uppercase tracking-widest ${active ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`}>{lab}</span>
        </button>
    );
}
