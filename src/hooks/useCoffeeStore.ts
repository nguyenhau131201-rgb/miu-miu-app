/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { Table, Transaction, OrderItem, PaymentType, MenuItem, InventoryItem, InventoryStatus } from '../types';
import { INITIAL_TABLES, MENU_ITEMS } from '../constants';
import { getVietnamDateString } from '../utils/dateUtils';

const TABLES_KEY = 'miumiu_tables';
const TRANSACTIONS_KEY = 'miumiu_transactions';
const INVENTORY_KEY = 'miumiu_inventory';

export function useCoffeeStore() {
  const [tables, setTables] = useState<Table[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const storedTables = localStorage.getItem(TABLES_KEY);
    const storedTransactions = localStorage.getItem(TRANSACTIONS_KEY);
    const storedInventory = localStorage.getItem(INVENTORY_KEY);

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

    if (storedInventory) {
      const parsedInventory: InventoryItem[] = JSON.parse(storedInventory);
      // Sync with MENU_ITEMS to add new items
      const syncedInventory = MENU_ITEMS.map(item => {
        const existing = parsedInventory.find(i => i.menuItemId === item.id);
        if (existing) return existing;
        return {
          menuItemId: item.id,
          status: 'IN_STOCK' as InventoryStatus,
          quantity: (item.category.includes('SOFT DRINKS') || item.category.includes('SNACK')) ? 10 : undefined,
          isCountable: (item.category.includes('SOFT DRINKS') || item.category.includes('SNACK'))
        };
      });
      setInventory(syncedInventory);
    } else {
      // Initialize inventory from MENU_ITEMS
      const initialInventory: InventoryItem[] = MENU_ITEMS.map(item => ({
        menuItemId: item.id,
        status: 'IN_STOCK',
        quantity: (item.category.includes('SOFT DRINKS') || item.category.includes('SNACK')) ? 10 : undefined,
        isCountable: (item.category.includes('SOFT DRINKS') || item.category.includes('SNACK'))
      }));
      setInventory(initialInventory);
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

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(INVENTORY_KEY, JSON.stringify(inventory));
    }
  }, [inventory, isLoaded]);

  const updateTableOrder = (tableId: string, item: { id?: string; menuItemId?: string; nameVi: string; price: number }, quantityChange: number) => {
    const id = item.menuItemId || item.id;
    if (!id) return;

    // Check inventory if it's countable
    const invItem = inventory.find(i => i.menuItemId === id);
    if (invItem && invItem.status === 'OUT_OF_STOCK') return;
    if (invItem && invItem.isCountable && invItem.quantity !== undefined) {
      if (quantityChange > 0 && invItem.quantity <= 0) return;
    }

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
          isPaid: false, // Reset paid status if order changes
        };
      })
    );
  };

  const clearTable = (tableId: string) => {
    setTables((prev) =>
      prev.map((table) =>
        table.id === tableId
          ? { ...table, currentOrder: [], status: 'VACANT', isPaid: false }
          : table
      )
    );
  };

  const payButStay = (tableId: string, paymentType: PaymentType) => {
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
    
    // Decrease inventory for countable items
    setInventory(prev => prev.map(invItem => {
      const orderItem = table.currentOrder.find(oi => oi.menuItemId === invItem.menuItemId);
      if (orderItem && invItem.isCountable && invItem.quantity !== undefined) {
        const newQty = Math.max(0, invItem.quantity - orderItem.quantity);
        return {
          ...invItem,
          quantity: newQty,
          status: newQty === 0 ? 'OUT_OF_STOCK' : invItem.status
        };
      }
      return invItem;
    }));

    setTables((prev) =>
      prev.map((t) =>
        t.id === tableId ? { ...t, isPaid: true } : t
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

    // Decrease inventory for countable items if not already paid
    if (!table.isPaid) {
      setInventory(prev => prev.map(invItem => {
        const orderItem = table.currentOrder.find(oi => oi.menuItemId === invItem.menuItemId);
        if (orderItem && invItem.isCountable && invItem.quantity !== undefined) {
          const newQty = Math.max(0, invItem.quantity - orderItem.quantity);
          return {
            ...invItem,
            quantity: newQty,
            status: newQty === 0 ? 'OUT_OF_STOCK' : invItem.status
          };
        }
        return invItem;
      }));
    }

    clearTable(tableId);
  };

  const updateInventoryItem = (menuItemId: string, updates: Partial<InventoryItem>) => {
    setInventory(prev => prev.map(item => 
      item.menuItemId === menuItemId ? { ...item, ...updates } : item
    ));
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
      const filtered = prev.filter(t => getVietnamDateString(new Date(t.timestamp)) !== dateStr);
      localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(filtered));
      return filtered;
    });
  };

  return {
    tables,
    transactions,
    isLoaded,
    inventory,
    updateTableOrder,
    clearTable,
    payButStay,
    checkout,
    updateInventoryItem,
    updateTransaction,
    deleteTransaction,
    deleteTransactionsByDate,
  };
}
