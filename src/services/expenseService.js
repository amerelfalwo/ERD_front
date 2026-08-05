import api from './api';

export const getExpenses = async (filters = {}) => {
  const { date_from, date_to, category } = filters;
  const params = new URLSearchParams();
  
  if (date_from) params.append('date_from', date_from);
  if (date_to) params.append('date_to', date_to);
  if (category) params.append('category', category);

  return api.get(`/expenses?${params.toString()}`);
};

export const createExpense = async (expenseData) => {
  return api.post('/expenses', expenseData);
};

export const deleteExpense = async (id) => {
  return api.delete(`/expenses/${id}`);
};

export const getNetProfitReport = async (date_from, date_to) => {
  const params = new URLSearchParams();
  if (date_from) params.append('start_date', date_from);
  if (date_to) params.append('end_date', date_to);

  return api.get(`/reports/net-profit?${params.toString()}`);
};

export const getExpenseSummary = async (filters = {}) => {
  const { date_from, date_to } = filters;
  const params = new URLSearchParams();

  if (date_from) params.append('date_from', date_from);
  if (date_to) params.append('date_to', date_to);

  return api.get(`/expenses/summary?${params.toString()}`);
};
