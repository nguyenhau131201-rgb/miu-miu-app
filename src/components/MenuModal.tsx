/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { MENU_ITEMS } from '../constants';
import { MenuItem } from '../types';
import { X, Search, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface MenuModalProps {
  onClose: () => void;
  onSelect: (item: MenuItem) => void;
}

export function MenuModal({ onClose, onSelect }: MenuModalProps) {
  const [search, setSearch] = useState('');

  const filteredItems = MENU_ITEMS.filter(item => 
    item.nameVi.toLowerCase().includes(search.toLowerCase()) ||
    item.nameEn.toLowerCase().includes(search.toLowerCase()) ||
    item.category.toLowerCase().includes(search.toLowerCase())
  );

  const groupedItems = filteredItems.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, MenuItem[]>);

  const categories = Object.keys(groupedItems);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-md"
    >
      <motion.div 
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 300, mass: 0.8 }}
        className="bg-white w-full max-w-lg rounded-t-[40px] sm:rounded-3xl flex flex-col h-[85vh] sm:h-auto sm:max-h-[90vh] shadow-2xl"
      >
        <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-xl font-black">Chọn Món</h3>
          <button onClick={onClose} className="p-2 -mr-2 text-gray-400 bg-gray-100 rounded-full">
            <X size={20} />
          </button>
        </div>

        <div className="px-8 py-5">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text"
              placeholder="Tìm kiếm đồ uống, thức ăn..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-gray-100 rounded-[20px] py-4 pl-12 pr-6 text-sm font-bold focus:outline-none focus:ring-4 focus:ring-black/5 transition-all text-gray-900 placeholder:text-gray-400 placeholder:font-medium"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-8 pb-20 scroll-smooth scrollbar-hide">
          {categories.map((category) => (
            <div key={category} className="mb-8">
              <div className="sticky top-0 bg-white/95 backdrop-blur-sm py-3 z-10 border-b border-gray-50 mb-2">
                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
                  {category}
                </h4>
              </div>
              <div className="divide-y divide-gray-50">
                {groupedItems[category].map((item) => (
                  <MenuItemRow key={item.id} item={item} onSelect={onSelect} />
                ))}
              </div>
            </div>
          ))}
          
          {categories.length === 0 && (
            <div className="py-20 text-center text-gray-300 italic font-medium">Không tìm thấy món nào</div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

interface MenuItemRowProps {
  key?: string | number;
  item: MenuItem;
  onSelect: (item: MenuItem) => void;
}

function MenuItemRow({ item, onSelect }: MenuItemRowProps) {
  const [success, setSuccess] = useState(false);

  const handleClick = () => {
    if (success) return; // Prevent double click while showing success
    onSelect(item);
    setSuccess(true);
    setTimeout(() => setSuccess(false), 1200);
  };

  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      onClick={handleClick}
      className={`
        w-full py-5 text-left flex items-center justify-between group transition-all border-b last:border-0 rounded-2xl px-3 -mx-3
        ${success ? 'bg-green-50' : 'hover:bg-gray-50 active:bg-gray-100'}
      `}
    >
      <div className="flex-1 pr-6">
        <div className="font-black text-gray-900 flex items-center gap-2">
          <span className="group-active:translate-x-1 transition-transform">{item.nameVi}</span>
          <AnimatePresence>
            {success && (
              <motion.span
                initial={{ opacity: 0, scale: 0, x: -20 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0, transition: { duration: 0.2 } }}
                className="inline-flex items-center gap-1 bg-green-500 text-white text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-tighter shadow-md"
              >
                <CheckCircle2 size={12} strokeWidth={3} /> Đã thêm
              </motion.span>
            )}
          </AnimatePresence>
        </div>
        <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">{item.nameEn}</div>
      </div>
      <motion.div 
        animate={success ? { scale: [1, 1.1, 1], color: ['#111827', '#16a34a', '#111827'] } : {}}
        className="text-sm font-black text-gray-900 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100 shadow-sm"
      >
        {item.price.toLocaleString('vi-VN')}đ
      </motion.div>
    </motion.button>
  );
}
