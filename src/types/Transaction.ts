// src/types/Transaction.ts
export interface Transaction {
    id?: string;
    user_id: string;
    plaid_transaction_id: string;
    name: string;
    amount: number;
    date: string;
    category: string | null;
  }
  