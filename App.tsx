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

  // Mouse movement effect for background
  const loginBackgroundRef = useRef<HTMLDivElement>(null);
  const mainBackgroundRef = useRef<HTMLDivElement>(null);
  const mousePos = useRef({ x: 0, y: 0 });
  const currentPos = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mousePos.current = {
        x: (e.clientX / window.innerWidth) * 2 - 1,
        y: (e.clientY / window.innerHeight) * 2 - 1
      };
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    
    let frameId: number;
    const animate = () => {
      // Smooth lerp with very low easing for "slow" feel
      const ease = 0.015; 
      currentPos.current.x += (mousePos.current.x - currentPos.current.x) * ease;
      currentPos.current.y += (mousePos.current.y - currentPos.current.y) * ease;
      
      // Movement range in pixels
      const xOffset = currentPos.current.x * 60; 
      const yOffset = currentPos.current.y * 60;
      
      if (loginBackgroundRef.current) {
        loginBackgroundRef.current.style.transform = `translate3d(${xOffset}px, ${yOffset}px, 0)`;
      }
      if (mainBackgroundRef.current) {
        mainBackgroundRef.current.style.transform = `translate3d(${xOffset}px, ${yOffset}px, 0)`;
      }
      
      frameId = requestAnimationFrame(animate);
    };
    
    animate();
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(frameId);
    };
  }, []);

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
      <div className="min-h-screen flex items-center justify-center p-6 font-sans relative overflow-hidden bg-gradient-to-br from-rose-100 via-purple-50 to-sky-100 animate-gradient">
        {/* Noise Texture Overlay */}
        <div className="absolute inset-0 opacity-[0.02] pointer-events-none z-0" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}></div>

        {/* Icon Pattern Overlay */}
        <div className="absolute -inset-[100px] opacity-[0.08] pointer-events-none z-0 animate-moveBackground" 
             style={{ 
               backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%2364748b' fill-opacity='1'%3E%3Cg transform='translate(10 10) scale(0.4) rotate(-10)'%3E%3Cellipse cx='50' cy='65' rx='18' ry='14'/%3E%3Ccircle cx='25' cy='45' r='7'/%3E%3Ccircle cx='40' cy='30' r='7'/%3E%3Ccircle cx='60' cy='30' r='7'/%3E%3Ccircle cx='75' cy='45' r='7'/%3E%3C/g%3E%3Cg transform='translate(60 60) scale(0.3) rotate(20)'%3E%3Cellipse cx='50' cy='65' rx='18' ry='14'/%3E%3Ccircle cx='25' cy='45' r='7'/%3E%3Ccircle cx='40' cy='30' r='7'/%3E%3Ccircle cx='60' cy='30' r='7'/%3E%3Ccircle cx='75' cy='45' r='7'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")` 
             }}
        ></div>

        {/* Abstract Background Art */}
        <div ref={loginBackgroundRef} className="absolute -inset-[100px] overflow-hidden pointer-events-none transition-transform duration-100 ease-out">
           <div className="absolute top-[-20%] left-[-10%] w-[700px] h-[700px] bg-rose-300/40 rounded-full mix-blend-multiply filter blur-[100px] opacity-80 animate-blob" />
           <div className="absolute bottom-[-20%] right-[-10%] w-[700px] h-[700px] bg-sky-300/40 rounded-full mix-blend-multiply filter blur-[100px] opacity-80 animate-blob animation-delay-2000" />
           <div className="absolute top-[20%] left-[20%] w-[600px] h-[600px] bg-purple-200/40 rounded-full mix-blend-multiply filter blur-[100px] opacity-60 animate-blob animation-delay-4000" />
        </div>

        <div className="max-w-3xl w-full bg-white/60 backdrop-blur-2xl rounded-[3rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] border border-white/60 p-8 md:p-16 relative z-10 flex flex-col md:flex-row items-center gap-12 md:gap-20">
          
          {/* Left Side: Brand */}
          <div className="flex-1 text-center md:text-left relative z-10 flex flex-col justify-center">
             <h1 className="font-serif text-[8rem] md:text-[11rem] text-slate-800 tracking-tighter leading-[0.8] select-none mb-8 md:mb-12">
               Us<span className="text-rose-400">.</span>
             </h1>
             
             <div className="space-y-8 md:pl-4 border-l-0 md:border-l border-slate-200">
                <div className="flex flex-col gap-1.5">
                   <span className="text-slate-400 text-[10px] font-bold tracking-[0.4em] uppercase">Shared Memory</span>
                   <span className="text-slate-400 text-[10px] font-bold tracking-[0.4em] uppercase">Journal</span>
                </div>

                <p className="font-serif text-xl text-slate-600 italic leading-relaxed opacity-80">
                  "我们共享的每一刻，<br />
                  都是故事里的一页。"
                </p>
             </div>
          </div>

          {/* Right Side: Selection */}
          <div className="flex-1 w-full max-w-xs md:max-w-none">
            <div className="grid grid-cols-2 gap-6">
               {/* Her Button */}
               <button 
                 onClick={() => setCurrentUser(UserType.HER)}
                 className="group relative aspect-[3/4] rounded-3xl bg-white border border-white shadow-sm hover:shadow-[0_20px_40px_-12px_rgba(251,113,133,0.3)] hover:-translate-y-2 transition-all duration-500 flex flex-col items-center justify-center gap-4 overflow-hidden"
               >
                 <div className="absolute inset-0 bg-gradient-to-b from-rose-50/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                 
                 {/* Decorative Corner Lines */}
                 <div className="absolute top-3 left-3 w-2 h-2 border-t border-l border-rose-200 opacity-0 group-hover:opacity-100 transition-all duration-500"></div>
                 <div className="absolute top-3 right-3 w-2 h-2 border-t border-r border-rose-200 opacity-0 group-hover:opacity-100 transition-all duration-500"></div>
                 <div className="absolute bottom-3 left-3 w-2 h-2 border-b border-l border-rose-200 opacity-0 group-hover:opacity-100 transition-all duration-500"></div>
                 <div className="absolute bottom-3 right-3 w-2 h-2 border-b border-r border-rose-200 opacity-0 group-hover:opacity-100 transition-all duration-500"></div>

                 <div className="relative z-10 w-20 h-20 rounded-full bg-rose-50 border-4 border-white shadow-inner flex items-center justify-center text-4xl group-hover:scale-110 transition-transform duration-500">
                    🐱
                 </div>
                 <span className="relative z-10 font-serif font-bold text-lg text-rose-900/60 group-hover:text-rose-600 transition-colors">她</span>
               </button>

               {/* Him Button */}
               <button 
                 onClick={() => setCurrentUser(UserType.HIM)}
                 className="group relative aspect-[3/4] rounded-3xl bg-white border border-white shadow-sm hover:shadow-[0_20px_40px_-12px_rgba(56,189,248,0.3)] hover:-translate-y-2 transition-all duration-500 flex flex-col items-center justify-center gap-4 overflow-hidden"
               >
                 <div className="absolute inset-0 bg-gradient-to-b from-sky-50/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                 
                 {/* Decorative Corner Lines */}
                 <div className="absolute top-3 left-3 w-2 h-2 border-t border-l border-sky-200 opacity-0 group-hover:opacity-100 transition-all duration-500"></div>
                 <div className="absolute top-3 right-3 w-2 h-2 border-t border-r border-sky-200 opacity-0 group-hover:opacity-100 transition-all duration-500"></div>
                 <div className="absolute bottom-3 left-3 w-2 h-2 border-b border-l border-sky-200 opacity-0 group-hover:opacity-100 transition-all duration-500"></div>
                 <div className="absolute bottom-3 right-3 w-2 h-2 border-b border-r border-sky-200 opacity-0 group-hover:opacity-100 transition-all duration-500"></div>

                 <div className="relative z-10 w-20 h-20 rounded-full bg-sky-50 border-4 border-white shadow-inner flex items-center justify-center text-4xl group-hover:scale-110 transition-transform duration-500">
                    🐶
                 </div>
                 <span className="relative z-10 font-serif font-bold text-lg text-sky-900/60 group-hover:text-sky-600 transition-colors">他</span>
               </button>
            </div>
            <p className="text-center text-slate-300 text-[10px] mt-8 font-bold tracking-[0.3em] uppercase">选择身份</p>
          </div>

        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen relative overflow-hidden font-sans text-slate-600 selection:bg-rose-100 selection:text-rose-900 transition-colors duration-1000
      md:animate-gradient
      ${activeTab === UserType.HER 
        ? 'bg-rose-50 md:bg-gradient-to-br md:from-rose-100 md:via-purple-50 md:to-sky-100' 
        : 'bg-sky-50 md:bg-gradient-to-br md:from-rose-100 md:via-purple-50 md:to-sky-100'
      }
    `}>
      
      {/* Noise Texture Overlay */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none z-0" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}></div>

      {/* Icon Pattern Overlay */}
      <div className="absolute -inset-[100px] opacity-[0.08] pointer-events-none z-0 animate-moveBackground" 
           style={{ 
             backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%2364748b' fill-opacity='1'%3E%3Cg transform='translate(10 10) scale(0.4) rotate(-10)'%3E%3Cellipse cx='50' cy='65' rx='18' ry='14'/%3E%3Ccircle cx='25' cy='45' r='7'/%3E%3Ccircle cx='40' cy='30' r='7'/%3E%3Ccircle cx='60' cy='30' r='7'/%3E%3Ccircle cx='75' cy='45' r='7'/%3E%3C/g%3E%3Cg transform='translate(60 60) scale(0.3) rotate(20)'%3E%3Cellipse cx='50' cy='65' rx='18' ry='14'/%3E%3Ccircle cx='25' cy='45' r='7'/%3E%3Ccircle cx='40' cy='30' r='7'/%3E%3Ccircle cx='60' cy='30' r='7'/%3E%3Ccircle cx='75' cy='45' r='7'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")` 
           }}
      ></div>

      {/* Elegant Header - Minimal & Floating */}
      <header 
        className={`
          fixed top-0 left-0 right-0 h-20 md:h-24 z-40 px-4 md:px-16 
          flex items-center justify-between pointer-events-none
          transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)]
          ${showHeader ? 'translate-y-0 opacity-100' : '-translate-y-10 opacity-0'}
        `}
      >
        {/* Logo Area - Floating */}
        <div className="pointer-events-auto">
          <div className="flex items-center gap-3 group cursor-pointer">
             <h1 className="font-serif text-2xl md:text-4xl font-bold text-slate-800 tracking-tighter relative select-none transition-all duration-500 group-hover:tracking-widest">
               Us
               <span className="text-rose-400 absolute -right-2 md:-right-3 -top-1 text-3xl md:text-5xl animate-pulse">.</span>
             </h1>
          </div>
        </div>

        {/* Mobile Toggle (Pill) - Floating Island */}
        <div className="pointer-events-auto md:hidden bg-white/80 backdrop-blur-xl p-1 rounded-full border border-white/60 shadow-[0_8px_30px_rgba(0,0,0,0.04)] absolute left-1/2 -translate-x-1/2">
           <button 
             onClick={() => setActiveTab(UserType.HER)}
             className={`px-4 py-1.5 rounded-full text-xs font-bold tracking-widest transition-all duration-500 ${activeTab === UserType.HER ? 'bg-rose-50 text-rose-500 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
           >
             她
           </button>
           <button 
             onClick={() => setActiveTab(UserType.HIM)}
             className={`px-4 py-1.5 rounded-full text-xs font-bold tracking-widest transition-all duration-500 ${activeTab === UserType.HIM ? 'bg-sky-50 text-sky-500 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
           >
             他
           </button>
        </div>

        {/* Actions - Floating */}
        <div className="pointer-events-auto flex items-center gap-2 md:gap-4">
          <button 
            onClick={() => setIsComposerOpen(true)}
            className="group flex items-center gap-3 bg-gradient-to-r from-rose-400 via-purple-400 to-sky-400 text-white w-10 h-10 md:w-auto md:h-auto md:px-6 md:py-3 rounded-full shadow-[0_10px_30px_-10px_rgba(168,85,247,0.4)] hover:shadow-[0_20px_40px_-12px_rgba(168,85,247,0.6)] hover:-translate-y-1 active:scale-95 transition-all duration-500 justify-center bg-[length:200%_auto] hover:bg-right"
          >
            <PenTool size={16} className="group-hover:-rotate-12 transition-transform duration-500" />
            <span className="text-sm font-medium tracking-widest uppercase hidden md:inline">Record</span>
          </button>
          
          <button 
             onClick={() => setCurrentUser(null)}
             className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-white/80 backdrop-blur-md border border-white/60 shadow-[0_8px_30px_rgba(0,0,0,0.04)] flex items-center justify-center text-slate-400 hover:text-slate-800 hover:bg-white transition-all duration-500 hover:rotate-180"
             title="切换用户"
          >
            <User size={16} className="md:w-[18px] md:h-[18px]" />
          </button>
        </div>
      </header>

      {/* Main Content: Split Layout */}
      <main className="h-screen flex relative overflow-hidden">
        {/* Background Blobs for Main Screen */}
        <div ref={mainBackgroundRef} className="absolute -inset-[100px] pointer-events-none transition-transform duration-100 ease-out">
          <div className={`absolute top-[-20%] left-[-10%] w-[700px] h-[700px] bg-rose-300/40 rounded-full mix-blend-multiply filter blur-[100px] animate-blob pointer-events-none transition-opacity duration-1000 ${activeTab === UserType.HER ? 'opacity-80' : 'opacity-0 md:opacity-80'}`}></div>
          <div className={`absolute bottom-[-20%] right-[-10%] w-[700px] h-[700px] bg-sky-300/40 rounded-full mix-blend-multiply filter blur-[100px] animate-blob animation-delay-2000 pointer-events-none transition-opacity duration-1000 ${activeTab === UserType.HIM ? 'opacity-80' : 'opacity-0 md:opacity-80'}`}></div>
          <div className="absolute top-[20%] left-[20%] w-[600px] h-[600px] bg-purple-200/40 rounded-full mix-blend-multiply filter blur-[100px] opacity-60 animate-blob animation-delay-4000 pointer-events-none hidden md:block"></div>
        </div>
        
        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 z-30 bg-white/80 backdrop-blur-sm flex items-center justify-center">
            <Loader2 className="animate-spin text-slate-800" size={32} />
          </div>
        )}

        {/* Left: Her Side */}
        <div 
          onScroll={(e) => handleScroll(e, UserType.HER)}
          className={`
            flex-1 h-full overflow-y-auto no-scrollbar relative z-10
            bg-gradient-to-r from-rose-100/30 via-rose-50/10 to-transparent
            transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] md:translate-x-0
            ${activeTab === UserType.HER ? 'translate-x-0 block' : '-translate-x-full hidden md:block'}
          `}
        >
          {/* Spacer */}
          <div className="h-32 w-full" />
          
          <div className="max-w-xl mx-auto px-8 pb-32">
            <div className="text-center mb-20 animate-fadeInUp">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-rose-50 mb-6 text-3xl shadow-inner hover:scale-110 transition-transform duration-500 cursor-default">
                🐱
              </div>
              <h2 className="font-serif text-5xl md:text-6xl text-slate-800 mb-4 tracking-tight">Her Journal</h2>
              <p className="font-serif text-rose-400 italic text-lg">"她的每一个瞬间"</p>
            </div>

            <div className="space-y-12 relative">
              {/* Timeline Line */}
              <div className="absolute left-8 top-4 bottom-0 w-px bg-gradient-to-b from-rose-200/50 via-rose-200/30 to-transparent hidden md:block"></div>

              {!isLoading && herMemories.length === 0 ? (
                <div className="text-center text-slate-300 py-20 italic font-serif text-xl animate-fadeInUp">
                   Waiting for her story...
                </div>
              ) : (
                herMemories.map((m, i) => (
                  <div 
                    key={m.id} 
                    className="md:pl-20 relative group animate-fadeInUp"
                    style={{ animationDelay: `${i * 150}ms`, animationFillMode: 'both' }}
                  >
                    {/* Timeline Dot */}
                    <div className="absolute left-[31px] top-8 w-2 h-2 rounded-full bg-rose-300 border-4 border-[#f8f8f8] hidden md:block group-hover:scale-150 transition-transform duration-500 shadow-[0_0_0_4px_rgba(253,164,175,0.2)]"></div>
                    <MemoryCard memory={m} onDelete={handleDelete} currentUser={currentUser} />
                  </div>
                ))
              )}
            </div>
          </div>
        </div>



        {/* Right: His Side */}
        <div 
           onScroll={(e) => handleScroll(e, UserType.HIM)}
           className={`
            flex-1 h-full overflow-y-auto no-scrollbar relative z-10
            bg-gradient-to-l from-sky-100/30 via-sky-50/10 to-transparent
            transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] md:translate-x-0
            ${activeTab === UserType.HIM ? 'translate-x-0 block' : 'translate-x-full hidden md:block'}
          `}
        >
           {/* Spacer */}
           <div className="h-32 w-full" />

           <div className="max-w-xl mx-auto px-8 pb-32">
            <div className="text-center mb-20 animate-fadeInUp">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-sky-50 mb-6 text-3xl shadow-inner hover:scale-110 transition-transform duration-500 cursor-default">
                🐶
              </div>
              <h2 className="font-serif text-5xl md:text-6xl text-slate-800 mb-4 tracking-tight">His Journal</h2>
              <p className="font-serif text-sky-400 italic text-lg">"他的每一份感动"</p>
            </div>

            <div className="space-y-12 relative">
              {/* Timeline Line */}
              <div className="absolute left-8 top-4 bottom-0 w-px bg-gradient-to-b from-sky-200/50 via-sky-200/30 to-transparent hidden md:block"></div>

              {!isLoading && hisMemories.length === 0 ? (
                <div className="text-center text-slate-300 py-20 italic font-serif text-xl animate-fadeInUp">
                   Waiting for his story...
                </div>
              ) : (
                hisMemories.map((m, i) => (
                  <div 
                    key={m.id} 
                    className="md:pl-20 relative group animate-fadeInUp"
                    style={{ animationDelay: `${i * 150}ms`, animationFillMode: 'both' }}
                  >
                    {/* Timeline Dot */}
                    <div className="absolute left-[31px] top-8 w-2 h-2 rounded-full bg-sky-300 border-4 border-[#f8f8f8] hidden md:block group-hover:scale-150 transition-transform duration-500 shadow-[0_0_0_4px_rgba(186,230,253,0.2)]"></div>
                    <MemoryCard memory={m} onDelete={handleDelete} currentUser={currentUser} />
                  </div>
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