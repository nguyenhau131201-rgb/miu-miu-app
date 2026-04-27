/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { Table, Transaction, OrderItem, PaymentType, MenuItem } from '../types';
import { INITIAL_TABLES } from '../constants';

const TABLES_KEY = 'miumiu_tables';
const TRANSACTIONS_KEY = 'miumiu_transactions';

export function useCoffeeStore() {
  const [tables, setTables] = useState<Table[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const storedTables = localStorage.getItem(TABLES_KEY);
    const storedTransactions = localStorage.getItem(TRANSACTIONS_KEY);

    if (storedTables) {
      const parsedTables: Table[] = JSON.parse(storedTables);
      // Sync labels and zones from INITIAL_TABLES just in case constants changed
      const syncedTables = INITIAL_TABLES.map(initialTable => {
        const existing = parsedTables.find(t => t.id === initialTable.id);
        if (existing) {
          return {
            ...existing,
            label: initialTable.label,
            zone: initialTable.zone
          };
        }
        return initialTable;
      });
      setTables(syncedTables);
    } else {
      setTables(INITIAL_TABLES);
    }

    if (storedTransactions) {
      setTransactions(JSON.parse(storedTransactions));
    }

    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(TABLES_KEY, JSON.stringify(tables));
    }
  }, [tables, isLoaded]);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(transactions));
    }
  }, [transactions, isLoaded]);

  const updateTableOrder = (tableId: string, item: { id?: string; menuItemId?: string; nameVi: string; price: number }, quantityChange: number) => {
    const id = item.menuItemId || item.id;
    if (!id) return;

    setTables((prev) =>
      prev.map((table) => {
        if (table.id !== tableId) return table;

        const existingItemIndex = table.currentOrder.findIndex(
          (oi) => oi.menuItemId === id
        );

        let newOrder = [...table.currentOrder];

        if (existingItemIndex > -1) {
          const newQuantity = newOrder[existingItemIndex].quantity + quantityChange;
          if (newQuantity <= 0) {
            newOrder.splice(existingItemIndex, 1);
          } else {
            newOrder[existingItemIndex] = {
              ...newOrder[existingItemIndex],
              quantity: newQuantity,
            };
          }
        } else if (quantityChange > 0) {
          newOrder.push({
            id: crypto.randomUUID(),
            menuItemId: id,
            nameVi: item.nameVi,
            price: item.price,
            quantity: quantityChange,
          });
        }

        return {
          ...table,
          currentOrder: newOrder,
          status: newOrder.length > 0 ? 'OCCUPIED' : 'VACANT',
        };
      })
    );
  };

  const clearTable = (tableId: string) => {
    setTables((prev) =>
      prev.map((table) =>
        table.id === tableId
          ? { ...table, currentOrder: [], status: 'VACANT' }
          : table
      )
    );
  };

  const checkout = (tableId: string, paymentType: PaymentType) => {
    const table = tables.find((t) => t.id === tableId);
    if (!table || table.currentOrder.length === 0) return;

    const total = table.currentOrder.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );

    const newTransaction: Transaction = {
      id: crypto.randomUUID(),
      tableId: table.id,
      items: table.currentOrder,
      total,
      paymentType,
      timestamp: Date.now(),
    };

    setTransactions((prev) => [...prev, newTransaction]);
    clearTable(tableId);
  };

  const updateTransaction = (updatedTransaction: Transaction) => {
    setTransactions((prev) =>
      prev.map((t) => (t.id === updatedTransaction.id ? updatedTransaction : t))
    );
  };

  const deleteTransaction = (transactionId: string) => {
    setTransactions((prev) => prev.filter((t) => t.id !== transactionId));
  };

  const deleteTransactionsByDate = (dateStr: string) => {
    setTransactions((prev) => {
      const filtered = prev.filter(t => new Date(t.timestamp).toISOString().split('T')[0] !== dateStr);
      localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(filtered));
      return filtered;
    });
  };

  return {
    tables,
    transactions,
    isLoaded,
    updateTableOrder,
    clearTable,
    checkout,
    updateTransaction,
    deleteTransaction,
    deleteTransactionsByDate,
  };
}
