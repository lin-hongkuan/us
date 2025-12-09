import React, { useState, useEffect, useRef } from 'react';
import { UserType, Memory } from './types';
import { getMemories, saveMemory, deleteMemory, seedDataIfEmpty } from './services/storageService';
import { MemoryCard } from './components/MemoryCard';
import { Composer } from './components/Composer';
import { Heart, PenTool, User, Loader2 } from 'lucide-react';

function App() {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [currentUser, setCurrentUser] = useState<UserType | null>(null);
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<UserType>(UserType.HER); // Mobile only
  const [isLoading, setIsLoading] = useState(true);
  
  // Header visibility logic
  const [showHeader, setShowHeader] = useState(true);
  const scrollPositions = useRef({ [UserType.HER]: 0, [UserType.HIM]: 0 });

  // Initial Data Fetch
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      await seedDataIfEmpty();
      const data = await getMemories();
      setMemories(data);
      setIsLoading(false);
    };
    fetchData();
  }, []);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>, type: UserType) => {
    const current = e.currentTarget.scrollTop;
    const last = scrollPositions.current[type];
    const diff = current - last;

    if (Math.abs(diff) < 10) return;

    if (current > last && current > 60) {
      setShowHeader(false);
    } else if (current < last) {
      setShowHeader(true);
    }
    
    scrollPositions.current[type] = current;
  };

  const handleSave = async (content: string) => {
    if (!currentUser) return;
    
    // Optimistic update (optional, but let's wait for server for simplicity/reliability)
    const newMem = await saveMemory({ content, author: currentUser });
    if (newMem) {
      setMemories([newMem, ...memories]);
      setIsComposerOpen(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('确定要删除这条记忆吗？')) {
      const success = await deleteMemory(id);
      if (success) {
        setMemories(memories.filter(m => m.id !== id));
      } else {
        alert("删除失败");
      }
    }
  };

  // Filter memories
  const herMemories = memories.filter(m => m.author === UserType.HER);
  const hisMemories = memories.filter(m => m.author === UserType.HIM);

  // Authentication Modal
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-6 font-sans">
        <div className="max-w-md w-full bg-white rounded-[2rem] shadow-2xl shadow-rose-100/50 p-10 text-center border border-white/50 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-rose-400 to-sky-400" />
          
          <div className="mb-8 flex justify-center">
             <div className="w-20 h-20 bg-gradient-to-tr from-rose-100 to-sky-100 rounded-full flex items-center justify-center shadow-inner">
                <Heart className="text-rose-500 drop-shadow-sm" fill="currentColor" size={32} />
             </div>
          </div>
          <h1 className="font-serif text-5xl mb-3 text-slate-800 tracking-tight">Us</h1>
          <p className="text-slate-400 mb-12 font-light tracking-wide text-sm uppercase">A Shared Journey</p>
          
          <div className="grid grid-cols-2 gap-5">
            <button 
              onClick={() => setCurrentUser(UserType.HER)}
              className="group p-6 rounded-2xl border border-rose-100 bg-rose-50/30 hover:bg-rose-50 hover:border-rose-200 transition-all duration-300 hover:shadow-lg hover:shadow-rose-100/50 flex flex-col items-center"
            >
              <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                <span className="font-serif text-xl italic font-bold">Her</span>
              </div>
              <span className="text-rose-900/80 font-medium text-sm">I am Her</span>
            </button>
            
            <button 
              onClick={() => setCurrentUser(UserType.HIM)}
              className="group p-6 rounded-2xl border border-sky-100 bg-sky-50/30 hover:bg-sky-50 hover:border-sky-200 transition-all duration-300 hover:shadow-lg hover:shadow-sky-100/50 flex flex-col items-center"
            >
              <div className="w-12 h-12 rounded-full bg-sky-100 text-sky-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                <span className="font-serif text-xl italic font-bold">Him</span>
              </div>
              <span className="text-sky-900/80 font-medium text-sm">I am Him</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white relative overflow-hidden font-sans text-slate-600 selection:bg-rose-100 selection:text-rose-900">
      
      {/* Elegant Header - Auto-hiding */}
      <header 
        className={`
          fixed top-0 left-0 right-0 h-20 z-40 px-6 md:px-12 
          flex items-center justify-between
          transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]
          ${showHeader ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0 pointer-events-none'}
        `}
      >
        {/* Glassmorphism Background */}
        <div className="absolute inset-0 bg-white/70 backdrop-blur-xl border-b border-white/40 shadow-[0_4px_30px_rgba(0,0,0,0.03)]" />

        {/* Logo Area */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-rose-50 to-sky-50 border border-white shadow-sm flex items-center justify-center">
             <span className="font-serif text-lg font-bold bg-gradient-to-r from-rose-500 to-sky-500 bg-clip-text text-transparent italic pr-0.5">Us</span>
          </div>
          <span className="hidden md:inline text-slate-400 text-[10px] font-bold tracking-[0.25em] uppercase mt-1">
            Journal
          </span>
        </div>

        {/* Mobile Toggle (Pill) - Elegant & Minimal */}
        <div className="relative z-10 flex md:hidden bg-white/60 backdrop-blur-md p-1 rounded-full border border-white/60 shadow-inner">
           <button 
             onClick={() => setActiveTab(UserType.HER)}
             className={`px-5 py-1.5 rounded-full text-xs font-bold tracking-wide transition-all duration-300 ${activeTab === UserType.HER ? 'bg-white shadow-sm text-rose-500' : 'text-slate-400 hover:text-slate-600'}`}
           >
             HER
           </button>
           <button 
             onClick={() => setActiveTab(UserType.HIM)}
             className={`px-5 py-1.5 rounded-full text-xs font-bold tracking-wide transition-all duration-300 ${activeTab === UserType.HIM ? 'bg-white shadow-sm text-sky-500' : 'text-slate-400 hover:text-slate-600'}`}
           >
             HIM
           </button>
        </div>

        {/* Actions */}
        <div className="relative z-10 flex items-center gap-3 md:gap-4">
          <button 
            onClick={() => setIsComposerOpen(true)}
            className="group flex items-center gap-2 bg-gradient-to-r from-rose-400 to-sky-400 text-white px-5 py-2.5 rounded-full hover:shadow-lg hover:shadow-rose-100/80 transition-all duration-300 transform active:scale-95"
          >
            <PenTool size={14} className="group-hover:-rotate-12 transition-transform duration-300" />
            <span className="text-sm font-medium tracking-wide">Record</span>
          </button>
          
          <button 
             onClick={() => setCurrentUser(null)}
             className="w-10 h-10 rounded-full border border-slate-100 bg-white/50 hover:bg-white flex items-center justify-center text-slate-400 hover:text-slate-600 transition-all hover:shadow-md hover:border-slate-200"
             title="Switch User"
          >
            <User size={16} />
          </button>
        </div>
      </header>

      {/* Main Content: Split Layout */}
      <main className="h-screen flex relative">
        
        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 z-30 bg-white flex items-center justify-center">
            <Loader2 className="animate-spin text-rose-400" size={32} />
          </div>
        )}

        {/* Left: Her Side */}
        <div 
          onScroll={(e) => handleScroll(e, UserType.HER)}
          className={`
            flex-1 h-full overflow-y-auto no-scrollbar
            bg-her-bg transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] md:translate-x-0
            ${activeTab === UserType.HER ? 'translate-x-0 block' : '-translate-x-full hidden md:block'}
            border-r border-rose-100/50
          `}
        >
          {/* Spacer */}
          <div className="h-28 w-full" />
          
          <div className="max-w-xl mx-auto px-6 pb-20">
            <div className="text-center mb-12 animate-[fadeIn_0.5s_ease-out]">
              <span className="text-[10px] font-bold tracking-[0.3em] text-rose-300 uppercase block mb-3">She said</span>
              <h2 className="font-serif text-4xl md:text-5xl text-her-text">Her Appreciation</h2>
              <div className="w-12 h-1 bg-gradient-to-r from-rose-200 to-rose-100 mx-auto mt-6 rounded-full"></div>
            </div>

            <div className="space-y-6">
              {!isLoading && herMemories.length === 0 ? (
                <div className="text-center text-rose-300/70 py-10 italic font-serif">
                   Empty pages waiting for love...
                </div>
              ) : (
                herMemories.map(m => (
                  <MemoryCard key={m.id} memory={m} onDelete={handleDelete} currentUser={currentUser} />
                ))
              )}
            </div>
          </div>
        </div>

        {/* Center Divider for Desktop */}
        <div className="hidden md:flex absolute left-1/2 top-0 bottom-0 w-px bg-transparent -ml-px z-20 flex-col items-center justify-center pointer-events-none">
            <div className="absolute top-20 bottom-20 w-px bg-gradient-to-b from-transparent via-slate-200/50 to-transparent"></div>
            <div className="w-10 h-10 bg-white/80 backdrop-blur-sm rounded-full shadow-sm border border-white flex items-center justify-center text-rose-400 z-20">
               <Heart size={16} fill="currentColor" className="opacity-80" />
            </div>
        </div>

        {/* Right: His Side */}
        <div 
           onScroll={(e) => handleScroll(e, UserType.HIM)}
           className={`
            flex-1 h-full overflow-y-auto no-scrollbar
            bg-him-bg transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] md:translate-x-0
            ${activeTab === UserType.HIM ? 'translate-x-0 block' : 'translate-x-full hidden md:block'}
          `}
        >
           {/* Spacer */}
           <div className="h-28 w-full" />

           <div className="max-w-xl mx-auto px-6 pb-20">
            <div className="text-center mb-12 animate-[fadeIn_0.5s_ease-out]">
              <span className="text-[10px] font-bold tracking-[0.3em] text-sky-300 uppercase block mb-3">He said</span>
              <h2 className="font-serif text-4xl md:text-5xl text-him-text">His Appreciation</h2>
              <div className="w-12 h-1 bg-gradient-to-r from-sky-200 to-sky-100 mx-auto mt-6 rounded-full"></div>
            </div>

            <div className="space-y-6">
              {!isLoading && hisMemories.length === 0 ? (
                <div className="text-center text-sky-300/70 py-10 italic font-serif">
                   No stories told yet...
                </div>
              ) : (
                hisMemories.map(m => (
                  <MemoryCard key={m.id} memory={m} onDelete={handleDelete} currentUser={currentUser} />
                ))
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Composer Modal */}
      {isComposerOpen && (
        <Composer 
          currentUser={currentUser} 
          onSave={handleSave} 
          onClose={() => setIsComposerOpen(false)} 
        />
      )}
    </div>
  );
}

export default App;