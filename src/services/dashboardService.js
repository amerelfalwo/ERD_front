import api from './api';

export const getDashboardData = async (date_from, date_to) => {
  const params = new URLSearchParams();
  if (date_from) params.append('date_from', date_from);
  if (date_to) params.append('date_to', date_to);

  const endpoint = `/reports/dashboard${params.toString() ? `?${params.toString()}` : ''}`;
  return api.get(endpoint);
};

export default {
  getDashboardData,
};
