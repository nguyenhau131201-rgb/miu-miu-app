/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface MenuItem {
  id: string;
  nameVi: string;
  nameEn: string;
  price: number;
  category: string;
}

export interface OrderItem {
  id: string;
  menuItemId: string;
  nameVi: string;
  price: number;
  quantity: number;
}

export type PaymentType = 'CASH' | 'TRANSFER';

export interface Transaction {
  id: string;
  tableId: string;
  items: OrderItem[];
  total: number;
  paymentType: PaymentType;
  timestamp: number;
}

export interface Table {
  id: string;
  zone: 'OUTDOOR_A' | 'OUTDOOR_B' | 'INDOOR' | 'TAKEAWAY';
  label: string;
  currentOrder: OrderItem[];
  status: 'VACANT' | 'OCCUPIED';
}

export interface DailyReport {
  totalRevenue: number;
  totalCash: number;
  totalTransfer: number;
  transactions: Transaction[];
}
