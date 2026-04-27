/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { Transaction } from '../types';
import { Calendar, TrendingUp, Wallet, ArrowLeftRight, Clock, CreditCard, FileDown, Trash2 } from 'lucide-react';
import { motion } from 'motion/react';
import * as XLSX from 'xlsx';

interface ReportViewProps {
  transactions: Transaction[];
  onDeleteTransactionsByDate: (date: string) => void;
  onUpdateTransaction: (transaction: Transaction) => void;
  onDeleteTransaction: (id: string) => void;
}

export function ReportView({ 
  transactions, 
  onDeleteTransactionsByDate,
  onUpdateTransaction,
  onDeleteTransaction
}: ReportViewProps) {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  const filteredTransactions = transactions.filter(t => 
    new Date(t.timestamp).toISOString().split('T')[0] === selectedDate
  );

  const stats = filteredTransactions.reduce((acc, t) => {
    acc.total += t.total;
    if (t.paymentType === 'CASH') acc.cash += t.total;
    else acc.transfer += t.total;
    return acc;
  }, { total: 0, cash: 0, transfer: 0 });

  const cashTransactions = filteredTransactions
    .filter(t => t.paymentType === 'CASH')
    .sort((a, b) => b.timestamp - a.timestamp);

  const transferTransactions = filteredTransactions
    .filter(t => t.paymentType === 'TRANSFER')
    .sort((a, b) => b.timestamp - a.timestamp);

  const handleDeleteDay = () => {
    if (!isConfirmingDelete) {
      setIsConfirmingDelete(true);
      setTimeout(() => setIsConfirmingDelete(false), 3000);
      return;
    }
    onDeleteTransactionsByDate(selectedDate);
    setIsConfirmingDelete(false);
  };

  const exportToExcel = () => {
    // Get all unique table IDs from the constants to create headers
    const tableIds = ['A1', 'A2', 'A3', 'B1', 'B2', 'B3', 'C1', 'C2', 'C3', 'D1', 'D2', 'D3', 'E MANG ĐI', 'E KHÁC'];
    
    const data = filteredTransactions.map(t => {
      const row: any = {
        'Ngày': new Date(t.timestamp).toLocaleDateString('vi-VN'),
        'Giờ': new Date(t.timestamp).toLocaleTimeString('vi-VN'),
      };

      // Create a column for each table ID
      tableIds.forEach(id => {
        row[`Bàn ${id}`] = t.tableId === id ? t.total : '';
      });

      row['Tiền mặt'] = t.paymentType === 'CASH' ? t.total : '';
      row['Chuyển khoản'] = t.paymentType === 'TRANSFER' ? t.total : '';
      row['Tổng doanh thu'] = t.total;
      row['Chi tiết món'] = t.items.map(i => `${i.nameVi} (x${i.quantity})`).join(', ');
      
      return row;
    });

    // Add 1 empty row for spacing
    data.push({});

    // Add Grand Total row
    const grandTotalRow: any = {
      'Ngày': 'TỔNG CỘNG',
      'Giờ': '',
    };
    tableIds.forEach(id => { grandTotalRow[`Bàn ${id}`] = ''; });
    grandTotalRow['Tiền mặt'] = stats.cash;
    grandTotalRow['Chuyển khoản'] = stats.transfer;
    grandTotalRow['Tổng doanh thu'] = stats.total;
    grandTotalRow['Chi tiết món'] = `Tổng cộng ${filteredTransactions.length} giao dịch`;
    
    data.push(grandTotalRow);

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Doanh thu');
    
    // Set column widths
    const wscols = [
      { wch: 12 }, // Ngày
      { wch: 12 }, // Giờ
      ...tableIds.map(() => ({ wch: 10 })), // Table columns
      { wch: 15 }, // Tiền mặt
      { wch: 15 }, // Chuyển khoản
      { wch: 12 }, // Tổng đơn
      { wch: 60 }, // Chi tiết món
    ];
    worksheet['!cols'] = wscols;

    XLSX.writeFile(workbook, `MiuMiu_BaoCao_${selectedDate}.xlsx`);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-black">Báo Cáo Ngày</h2>
          <div className="flex gap-2">
            <button 
              onClick={handleDeleteDay}
              disabled={filteredTransactions.length === 0}
              className={`
                flex flex-col items-center justify-center w-11 h-11 rounded-2xl shadow-sm active:scale-95 transition-all disabled:opacity-30 disabled:pointer-events-none
                ${isConfirmingDelete ? 'bg-red-500 text-white w-24' : 'bg-red-50 text-red-500'}
              `}
            >
              {isConfirmingDelete ? (
                <span className="text-[10px] font-black uppercase tracking-tighter">Xác nhận?</span>
              ) : (
                <Trash2 size={20} />
              )}
            </button>
            <button 
              onClick={exportToExcel}
              disabled={filteredTransactions.length === 0}
              className="flex items-center gap-2 bg-green-600 text-white px-4 h-11 rounded-2xl shadow-lg active:scale-95 transition-all text-[11px] font-black uppercase tracking-widest disabled:opacity-50 disabled:grayscale"
            >
              <FileDown size={17} /> Xuất Excel
            </button>
          </div>
        </div>
        
        <div className="flex items-center gap-3 bg-white px-4 py-3 rounded-2xl shadow-sm border border-gray-100">
          <Calendar size={18} className="text-gray-400" />
          <input 
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="text-sm font-black focus:outline-none bg-transparent flex-1"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-black p-8 rounded-[40px] text-white shadow-2xl shadow-gray-300 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <TrendingUp size={80} strokeWidth={3} />
          </div>
          <div className="flex justify-between items-start mb-6 relative z-10">
            <div className="p-2.5 bg-white/10 rounded-2xl">
              <TrendingUp size={24} />
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">Tổng Doanh Thu</span>
          </div>
          <div className="text-4xl font-black relative z-10 font-mono tracking-tighter">{stats.total.toLocaleString('vi-VN')}đ</div>
        </motion.div>

        <div className="grid grid-cols-2 gap-4">
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="p-2.5 bg-green-50 text-green-600 rounded-2xl border border-green-100">
                <Wallet size={18} />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-300">Tiền Mặt</span>
            </div>
            <div className="text-xl font-black text-gray-900 font-mono">{stats.cash.toLocaleString('vi-VN')}đ</div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="p-2.5 bg-blue-50 text-blue-600 rounded-2xl border border-blue-100">
                <ArrowLeftRight size={18} />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-300">Chuyển Khoản</span>
            </div>
            <div className="text-xl font-black text-gray-900 font-mono">{stats.transfer.toLocaleString('vi-VN')}đ</div>
          </motion.div>
        </div>
      </div>

      <div className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-center gap-2 px-2">
            <Wallet size={16} className="text-green-500" />
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Tiền Mặt ({cashTransactions.length})</h3>
          </div>
          <div className="bg-white rounded-[32px] shadow-sm border border-gray-100 overflow-hidden divide-y divide-gray-50">
            {cashTransactions.length === 0 ? (
              <div className="p-12 text-center text-gray-300 italic text-sm font-medium">Không có giao dịch tiền mặt</div>
            ) : (
              cashTransactions.map((t) => (
                <TransactionLogItem 
                  key={t.id} 
                  t={t} 
                  onEdit={() => setEditingTransaction(t)}
                />
              ))
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-2 px-2">
            <CreditCard size={16} className="text-blue-500" />
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Chuyển Khoản ({transferTransactions.length})</h3>
          </div>
          <div className="bg-white rounded-[32px] shadow-sm border border-gray-100 overflow-hidden divide-y divide-gray-50">
            {transferTransactions.length === 0 ? (
              <div className="p-12 text-center text-gray-300 italic text-sm font-medium">Không có giao dịch chuyển khoản</div>
            ) : (
              transferTransactions.map((t) => (
                <TransactionLogItem 
                  key={t.id} 
                  t={t} 
                  onEdit={() => setEditingTransaction(t)}
                />
              ))
            )}
          </div>
        </div>
      </div>

      {editingTransaction && (
        <EditTransactionModal
          transaction={editingTransaction}
          onClose={() => setEditingTransaction(null)}
          onUpdate={(t) => {
            onUpdateTransaction(t);
            setEditingTransaction(null);
          }}
          onDelete={(id) => {
            onDeleteTransaction(id);
            setEditingTransaction(null);
          }}
        />
      )}
    </div>
  );
}

interface TransactionLogItemProps {
  key?: string | number;
  t: Transaction;
  onEdit: () => void;
}

function TransactionLogItem({ t, onEdit }: TransactionLogItemProps) {
  return (
    <button 
      onClick={onEdit}
      className="w-full p-5 flex items-center justify-between group hover:bg-gray-50 active:bg-gray-100 transition-colors text-left"
    >
      <div className="flex items-center gap-4">
        <div className={`
          w-11 h-11 rounded-2xl flex items-center justify-center border
          ${t.paymentType === 'CASH' ? 'bg-green-50 text-green-600 border-green-100' : 'bg-blue-50 text-blue-600 border-blue-100'}
        `}>
          {t.paymentType === 'CASH' ? <Wallet size={18} /> : <CreditCard size={18} />}
        </div>
        <div>
          <div className="font-black text-gray-900">Bàn {t.tableId}</div>
          <div className="flex items-center gap-1.5 text-[9px] text-gray-400 font-black uppercase tracking-wider mt-0.5">
            <Clock size={10} strokeWidth={3} />
            {new Date(t.timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      </div>
      <div className="text-right">
        <div className="font-black text-gray-900 font-mono">{t.total.toLocaleString('vi-VN')}đ</div>
        <div className="text-[10px] text-gray-300 font-bold mt-0.5">
          {t.items.reduce((sum, i) => sum + i.quantity, 0)} món
        </div>
      </div>
    </button>
  );
}

import { X, Plus, Minus } from 'lucide-react';
import { PaymentType } from '../types';

interface EditTransactionModalProps {
  transaction: Transaction;
  onClose: () => void;
  onUpdate: (transaction: Transaction) => void;
  onDelete: (id: string) => void;
}

function EditTransactionModal({ transaction, onClose, onUpdate, onDelete }: EditTransactionModalProps) {
  const [items, setItems] = useState(transaction.items);
  const [paymentType, setPaymentType] = useState<PaymentType>(transaction.paymentType);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  const calculateTotal = (currentItems: typeof items) => {
    return currentItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  };

  const updateQuantity = (itemId: string, delta: number) => {
    setItems(prev => prev.map(item => {
      if (item.id === itemId) {
        const newQuantity = Math.max(0, item.quantity + delta);
        return { ...item, quantity: newQuantity };
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const handleSave = () => {
    if (items.length === 0) {
      if (!isConfirmingDelete) {
        setIsConfirmingDelete(true);
        setTimeout(() => setIsConfirmingDelete(false), 3000);
        return;
      }
      onDelete(transaction.id);
      return;
    }
    
    onUpdate({
      ...transaction,
      items,
      paymentType,
      total: calculateTotal(items)
    });
  };

  const handleDelete = () => {
    if (!isConfirmingDelete) {
      setIsConfirmingDelete(true);
      setTimeout(() => setIsConfirmingDelete(false), 3000);
      return;
    }
    onDelete(transaction.id);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />
      <motion.div 
        initial={{ opacity: 0, y: 100, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="bg-white w-full max-w-lg rounded-[40px] shadow-2xl relative z-10 overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="p-8 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-black text-gray-900">Sửa Giao Dịch</h3>
            <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-1">Bàn {transaction.tableId} • {new Date(transaction.timestamp).toLocaleTimeString('vi-VN')}</p>
          </div>
          <button onClick={onClose} className="p-3 bg-gray-50 rounded-2xl text-gray-400 hover:text-gray-900 transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-8">
          <div className="space-y-4">
            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] px-2">Phương thức thanh toán</h4>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setPaymentType('CASH')}
                className={`
                  flex items-center justify-center gap-3 h-16 rounded-3xl border-2 transition-all font-black
                  ${paymentType === 'CASH' ? 'bg-green-50 border-green-500 text-green-600 shadow-sm' : 'bg-gray-50 border-transparent text-gray-400'}
                `}
              >
                <Wallet size={20} /> Tiền Mặt
              </button>
              <button
                onClick={() => setPaymentType('TRANSFER')}
                className={`
                  flex items-center justify-center gap-3 h-16 rounded-3xl border-2 transition-all font-black
                  ${paymentType === 'TRANSFER' ? 'bg-blue-50 border-blue-500 text-blue-600 shadow-sm' : 'bg-gray-50 border-transparent text-gray-400'}
                `}
              >
                <CreditCard size={20} /> Chuyển Khoản
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] px-2">Chi tiết món ăn</h4>
            <div className="space-y-3">
              {items.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-5 bg-gray-50 rounded-[28px]">
                  <div className="flex-1 min-w-0 pr-4">
                    <div className="font-black text-gray-900 truncate">{item.nameVi}</div>
                    <div className="text-[10px] font-bold text-gray-400">{(item.price * item.quantity).toLocaleString('vi-VN')}đ</div>
                  </div>
                  <div className="flex items-center gap-3 bg-white p-1 rounded-2xl shadow-sm border border-gray-100">
                    <button 
                      onClick={() => updateQuantity(item.id, -1)}
                      className="w-10 h-10 flex items-center justify-center rounded-xl bg-gray-50 text-gray-400 active:bg-gray-100 transition-colors"
                    >
                      <Minus size={16} strokeWidth={3} />
                    </button>
                    <span className="w-8 text-center font-black text-sm">{item.quantity}</span>
                    <button 
                      onClick={() => updateQuantity(item.id, 1)}
                      className="w-10 h-10 flex items-center justify-center rounded-xl bg-gray-900 text-white active:scale-95 transition-all"
                    >
                      <Plus size={16} strokeWidth={3} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="p-8 bg-gray-50 border-t border-gray-100 space-y-4">
          <div className="flex justify-between items-center px-2">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Tổng cộng</span>
            <span className="text-3xl font-black text-gray-900 font-mono tracking-tighter">{calculateTotal(items).toLocaleString('vi-VN')}đ</span>
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={handleDelete}
              className={`
                h-16 flex items-center justify-center rounded-3xl active:scale-95 transition-all
                ${isConfirmingDelete ? 'bg-red-500 text-white w-28 text-[10px] font-black uppercase tracking-tighter' : 'bg-red-50 text-red-500 w-20'}
              `}
            >
              {isConfirmingDelete ? 'Xác nhận?' : <Trash2 size={24} />}
            </button>
            <button
              onClick={handleSave}
              className="flex-1 h-16 bg-black text-white rounded-3xl font-black text-lg shadow-xl shadow-gray-200 active:scale-95 transition-all"
            >
              Lưu Thay Đổi
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
