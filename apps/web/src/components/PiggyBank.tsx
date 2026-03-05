/**
 * ==========================================
 * 小猪存钱罐组件
 * ==========================================
 *
 * 一个游戏化的储蓄组件，跟踪记忆数量并在达到目标里程碑时提供奖励。
 * 具有动画和收集"爱心硬币"的视觉反馈。
 *
 * 功能特性：
 * - 跟踪朝向记忆数量目标的进度
 * - 动画硬币掉落和小猪存钱罐弹跳
 * - 带有特殊优惠券的奖励模态框
 * - 显示进度的悬停工具提示
 * - 主题感知样式
 */

import React, { useState, useEffect, useRef } from 'react';
import { PiggyBank as PiggyIcon, Coins, Gift } from 'lucide-react';

/**
 * 小猪存钱罐组件的属性接口
 */
interface PiggyBankProps {
  /** 当前记忆数量（收集的硬币） */
  count: number;
  /** 达到奖励的目标数量（默认：52） */
  target?: number;
}

/**
 * 用于游戏化记忆收集的小猪存钱罐组件
 * 显示朝向目标的进度并提供奖励
 */
export const PiggyBank: React.FC<PiggyBankProps> = ({ count, target = 52 }) => {
  // 硬币掉落动画状态
  const [isAnimating, setIsAnimating] = useState(false);
  // 显示奖励模态框的状态
  const [showReward, setShowReward] = useState(false);
  // 用于触发动画的上一个数量引用
  const prevCountRef = useRef(count);

  useEffect(() => {
    // 仅在数量增加时动画
    if (count > prevCountRef.current) {
      setIsAnimating(true);
      const timer = setTimeout(() => setIsAnimating(false), 1000);
      return () => clearTimeout(timer);
    }
    prevCountRef.current = count;
  }, [count]);

  useEffect(() => {
    // Show reward when target is reached
    if (count >= target && prevCountRef.current < target) {
        setShowReward(true);
    }
  }, [count, target]);
  //透明度渐变的储钱罐组件
  return (
    <>
      <div 
        className={`fixed bottom-6 left-6 z-50 flex flex-col items-center group cursor-pointer transition-opacity duration-300 ${isAnimating ? 'opacity-100' : 'opacity-5 hover:opacity-80 active:opacity-60'}`}
        onClick={() => count >= target && setShowReward(true)}
      >
        {/* Coin Animation */}
        {isAnimating && (
          <div className="absolute -top-8 text-yellow-400 animate-coin-drop z-10">
            <Coins size={24} fill="currentColor" />
          </div>
        )}

        {/* Piggy Bank Icon */}
        <div className={`relative p-3 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm rounded-full shadow-lg border-2 transition-all duration-300 ${count >= target ? 'border-yellow-400 shadow-yellow-200 dark:shadow-yellow-900/30' : 'border-rose-200 dark:border-rose-800'} ${isAnimating ? 'animate-piggy-bounce' : 'group-hover:scale-110'}`}>
          <PiggyIcon 
            size={32} 
            className={`transition-colors duration-300 ${count >= target ? 'text-yellow-500' : 'text-rose-400'}`} 
          />
          
          {/* Progress Ring or Badge */}
          <div className="absolute -bottom-2 -right-2 bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-sm min-w-[20px] text-center">
            {count}/{target}
          </div>
        </div>

        {/* Tooltip/Label */}
        <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 bg-white/90 dark:bg-slate-800/90 px-3 py-1.5 rounded-lg shadow-md text-xs font-medium text-slate-600 dark:text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
          {count >= target ? '点击领取奖励！' : '恋爱存钱罐\n收集金币中...\n还差 ' + (target - count) + ' 个金币\n即可领取奖励！'}
        </div>
      </div>

      {/* Reward Modal */}
      {showReward && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 max-w-sm w-full shadow-2xl transform transition-all scale-100 animate-in zoom-in-95 duration-300 text-center relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] bg-gradient-to-b from-yellow-100/20 to-transparent rotate-45"></div>
            </div>

            <div className="relative z-10">
                <div className="w-20 h-20 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center mx-auto mb-6 text-yellow-500 animate-bounce">
                    <Gift size={40} />
                </div>
                
                <h3 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">恭喜达成！</h3>
                <p className="text-slate-600 dark:text-slate-300 mb-8">
                    恋爱存钱罐已集满 {target} 个金币！<br/>
                    获得一张 <span className="font-bold text-rose-500">“万能兑换券”</span>
                </p>

                <div className="bg-gradient-to-r from-rose-100 to-rose-50 dark:from-rose-900/30 dark:to-rose-800/10 border border-rose-200 dark:border-rose-700/50 rounded-xl p-4 mb-8 transform rotate-[-2deg] hover:rotate-0 transition-transform duration-300 cursor-default shadow-sm">
                    <div className="border-2 border-dashed border-rose-300 dark:border-rose-600/50 rounded-lg p-4">
                        <h4 className="text-lg font-bold text-rose-600 dark:text-rose-400">LOVE COUPON</h4>
                        <p className="text-sm text-rose-500/80 dark:text-rose-400/80 mt-1">可兑换任意一个愿望</p>
                    </div>
                </div>

                <button 
                    onClick={() => setShowReward(false)}
                    className="w-full py-3 px-6 bg-gradient-to-r from-rose-400 to-rose-500 hover:from-rose-500 hover:to-rose-600 text-white rounded-xl font-medium shadow-lg shadow-rose-200 dark:shadow-none transition-all duration-200 active:scale-95"
                >
                    收下奖励
                </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
