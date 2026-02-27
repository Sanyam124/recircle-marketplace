export default function Loader({ fullScreen = false }: { fullScreen?: boolean }) {
  const content = (
    <div className="flex flex-col items-center justify-center space-y-6">
      <div className="relative w-20 h-20">
        <div className="absolute top-0 left-0 w-full h-full border-4 border-indigo-100 dark:border-indigo-900/30 rounded-full animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite] opacity-30"></div>
        <div className="absolute top-0 left-0 w-full h-full border-4 border-t-indigo-600 dark:border-t-indigo-400 border-r-transparent border-b-indigo-600 dark:border-b-indigo-400 border-l-transparent rounded-full animate-[spin_1.5s_linear_infinite] shadow-[0_0_15px_rgba(79,70,229,0.2)]"></div>
        <div className="absolute top-0 left-0 w-full h-full border-2 border-indigo-400/20 dark:border-indigo-500/10 rounded-full"></div>
      </div>
      <div className="flex flex-col items-center">
        <p className="text-gray-900 dark:text-white font-black tracking-widest uppercase text-xs animate-pulse opacity-80">Loading</p>
        <div className="flex gap-1 mt-2">
            <span className="w-1.5 h-1.5 bg-indigo-600 dark:bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
            <span className="w-1.5 h-1.5 bg-indigo-600 dark:bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
            <span className="w-1.5 h-1.5 bg-indigo-600 dark:bg-indigo-400 rounded-full animate-bounce"></span>
        </div>
      </div>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm z-50 flex items-center justify-center transition-colors">
        {content}
      </div>
    );
  }

  return <div className="min-h-[60vh] flex items-center justify-center">{content}</div>;
}
