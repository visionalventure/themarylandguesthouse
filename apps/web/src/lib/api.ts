import axios from 'axios';

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api',
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor - attach JWT
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const auth = localStorage.getItem('mgh-auth');
    if (auth) {
      const { state } = JSON.parse(auth);
      if (state?.accessToken) {
        config.headers.Authorization = `Bearer ${state.accessToken}`;
      }
    }
  }
  return config;
});

// Response interceptor - refresh token on 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const auth = JSON.parse(localStorage.getItem('mgh-auth') || '{}');
        const refreshToken = auth.state?.refreshToken;
        if (!refreshToken) throw new Error('No refresh token');

        const response = await axios.post(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/v1/auth/refresh`,
          { refreshToken },
        );

        const { accessToken, refreshToken: newRefreshToken } = response.data;

        // Update stored tokens
        const stored = JSON.parse(localStorage.getItem('mgh-auth') || '{}');
        stored.state.accessToken = accessToken;
        stored.state.refreshToken = newRefreshToken;
        localStorage.setItem('mgh-auth', JSON.stringify(stored));

        original.headers.Authorization = `Bearer ${accessToken}`;
        return api(original);
      } catch {
        localStorage.removeItem('mgh-auth');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);

// Typed API helpers
export const authApi = {
  login: (data: any) => api.post('/v1/auth/login', data),
  logout: (data: any) => api.post('/v1/auth/logout', data),
  profile: () => api.get('/v1/auth/profile'),
  refresh: (data: any) => api.post('/v1/auth/refresh', data),
  setup2FA: () => api.post('/v1/auth/2fa/setup'),
  enable2FA: (data: any) => api.post('/v1/auth/2fa/enable', data),
};

export const dashboardApi = {
  getKPIs: (propertyId: string) => api.get(`/v1/dashboard/kpis?propertyId=${propertyId}`),
  getRevenueChart: (propertyId: string, days?: number) =>
    api.get(`/v1/dashboard/revenue-chart?propertyId=${propertyId}&days=${days || 30}`),
  getOccupancyChart: (propertyId: string) =>
    api.get(`/v1/dashboard/occupancy-chart?propertyId=${propertyId}`),
  getRevenueByCategory: (propertyId: string) =>
    api.get(`/v1/dashboard/revenue-by-category?propertyId=${propertyId}`),
  getRecentActivity: (propertyId: string) =>
    api.get(`/v1/dashboard/recent-activity?propertyId=${propertyId}`),
};

export const reservationsApi = {
  list: (params: any) => api.get('/v1/reservations', { params }),
  get: (id: string) => api.get(`/v1/reservations/${id}`),
  create: (data: any) => api.post('/v1/reservations', data),
  update: (id: string, data: any) => api.put(`/v1/reservations/${id}`, data),
  checkIn: (id: string) => api.patch(`/v1/reservations/${id}/check-in`),
  checkOut: (id: string) => api.patch(`/v1/reservations/${id}/check-out`),
  cancel: (id: string, reason?: string) => api.patch(`/v1/reservations/${id}/cancel`, { reason }),
  calendar: (params: any) => api.get('/v1/reservations/calendar', { params }),
};

export const guestsApi = {
  list: (params: any) => api.get('/v1/guests', { params }),
  get: (id: string) => api.get(`/v1/guests/${id}`),
  create: (data: any) => api.post('/v1/guests', data),
  update: (id: string, data: any) => api.put(`/v1/guests/${id}`, data),
  stayHistory: (id: string) => api.get(`/v1/guests/${id}/stay-history`),
};

export const roomsApi = {
  list: (params: any) => api.get('/v1/rooms', { params }),
  available: (params: any) => api.get('/v1/rooms/available', { params }),
  get: (id: string) => api.get(`/v1/rooms/${id}`),
  create: (data: any) => api.post('/v1/rooms', data),
  update: (id: string, data: any) => api.put(`/v1/rooms/${id}`, data),
  updateStatus: (id: string, status: string) => api.patch(`/v1/rooms/${id}/status`, { status }),
  categories: (propertyId: string) => api.get(`/v1/rooms/categories?propertyId=${propertyId}`),
};

export const accountingApi = {
  chartOfAccounts: (propertyId: string) =>
    api.get(`/v1/accounting/chart-of-accounts?propertyId=${propertyId}`),
  journalEntries: (params: any) => api.get('/v1/accounting/journal-entries', { params }),
  createJournalEntry: (data: any) => api.post('/v1/accounting/journal-entries', data),
  postEntry: (id: string) => api.patch(`/v1/accounting/journal-entries/${id}/post`),
  profitAndLoss: (params: any) => api.get('/v1/accounting/reports/profit-and-loss', { params }),
  balanceSheet: (params: any) => api.get('/v1/accounting/reports/balance-sheet', { params }),
  trialBalance: (propertyId: string) =>
    api.get(`/v1/accounting/reports/trial-balance?propertyId=${propertyId}`),
  agedReceivables: () => api.get('/v1/accounting/reports/aged-receivables'),
  bankAccounts: (propertyId: string) =>
    api.get(`/v1/accounting/bank-accounts?propertyId=${propertyId}`),
  bankTransactions: (bankAccountId: string, params?: any) =>
    api.get(`/v1/accounting/bank-accounts/${bankAccountId}/transactions`, { params }),
};

export const hrApi = {
  employees: (params: any) => api.get('/v1/hr/employees', { params }),
  getEmployee: (id: string) => api.get(`/v1/hr/employees/${id}`),
  createEmployee: (data: any) => api.post('/v1/hr/employees', data),
  attendance: (data: any) => api.post('/v1/hr/attendance', data),
  attendanceReport: (params: any) => api.get('/v1/hr/attendance/report', { params }),
  listLeaveRequests: (params: any) => api.get('/v1/hr/leave-requests', { params }),
  createLeaveRequest: (data: any) => api.post('/v1/hr/leave-requests', data),
  approveLeave: (id: string) => api.patch(`/v1/hr/leave-requests/${id}/approve`, {}),
  rejectLeave: (id: string, reason: string) =>
    api.patch(`/v1/hr/leave-requests/${id}/reject`, { reason }),
  payrollHistory: (params: any) => api.get('/v1/hr/payroll', { params }),
  runPayroll: (propertyId: string, periodStart: string, periodEnd: string) =>
    api.post('/v1/hr/payroll/run', { propertyId, periodStart, periodEnd }),
  departments: () => api.get('/v1/hr/departments'),
};

export const inventoryApi = {
  list: (params: any) => api.get('/v1/inventory', { params }),
  lowStock: (propertyId: string) => api.get(`/v1/inventory/low-stock?propertyId=${propertyId}`),
  createItem: (data: any) => api.post('/v1/inventory', data),
  stockIn: (data: any) => api.post('/v1/inventory/stock-in', data),
  stockOut: (data: any) => api.post('/v1/inventory/stock-out', data),
  transactions: (id: string) => api.get(`/v1/inventory/${id}/transactions`),
  valuation: (propertyId: string) => api.get(`/v1/inventory/valuation?propertyId=${propertyId}`),
};

export const propertiesApi = {
  list: () => api.get('/v1/properties'),
  get: (id: string) => api.get(`/v1/properties/${id}`),
  create: (data: any) => api.post('/v1/properties', data),
  update: (id: string, data: any) => api.put(`/v1/properties/${id}`, data),
};

export const housekeepingApi = {
  tasks: (params: any) => api.get('/v1/housekeeping/tasks', { params }),
  createTask: (data: any) => api.post('/v1/housekeeping/tasks', data),
  updateTask: (id: string, data: any) => api.patch(`/v1/housekeeping/tasks/${id}`, data),
  schedule: (propertyId: string, date?: string) =>
    api.get(`/v1/housekeeping/schedule?propertyId=${propertyId}${date ? `&date=${date}` : ''}`),
  roomsStatus: (propertyId: string) => api.get(`/v1/housekeeping/rooms-status?propertyId=${propertyId}`),
};

export const maintenanceApi = {
  workOrders: (params: any) => api.get('/v1/maintenance/work-orders', { params }),
  createWorkOrder: (data: any) => api.post('/v1/maintenance/work-orders', data),
  updateWorkOrder: (id: string, data: any) => api.patch(`/v1/maintenance/work-orders/${id}`, data),
  assets: (params: any) => api.get('/v1/maintenance/assets', { params }),
  createAsset: (data: any) => api.post('/v1/maintenance/assets', data),
  updateAsset: (id: string, data: any) => api.put(`/v1/maintenance/assets/${id}`, data),
  schedule: (propertyId: string) => api.get(`/v1/maintenance/schedule?propertyId=${propertyId}`),
};

export const restaurantApi = {
  list: (propertyId: string) => api.get(`/v1/restaurant?propertyId=${propertyId}`),
  tables: (restaurantId: string) => api.get(`/v1/restaurant/${restaurantId}/tables`),
  menu: (restaurantId: string) => api.get(`/v1/restaurant/${restaurantId}/menu`),
  createMenuItem: (restaurantId: string, data: any) => api.post(`/v1/restaurant/${restaurantId}/menu-items`, data),
  updateMenuItem: (id: string, data: any) => api.put(`/v1/restaurant/menu-items/${id}`, data),
  orders: (restaurantId: string, params?: any) => api.get(`/v1/restaurant/${restaurantId}/orders`, { params }),
  createOrder: (restaurantId: string, data: any) => api.post(`/v1/restaurant/${restaurantId}/orders`, data),
  updateOrderStatus: (id: string, status: string) => api.patch(`/v1/restaurant/orders/${id}`, { status }),
  moveTable: (id: string, tableId: string) => api.patch(`/v1/restaurant/orders/${id}/move-table`, { tableId }),
  revenue: (restaurantId: string, params?: any) => api.get(`/v1/restaurant/${restaurantId}/revenue`, { params }),
};

export const procurementApi = {
  suppliers: (params: any) => api.get('/v1/procurement/suppliers', { params }),
  createSupplier: (data: any) => api.post('/v1/procurement/suppliers', data),
  updateSupplier: (id: string, data: any) => api.put(`/v1/procurement/suppliers/${id}`, data),
  purchaseRequests: (params: any) => api.get('/v1/procurement/purchase-requests', { params }),
  createPR: (data: any) => api.post('/v1/procurement/purchase-requests', data),
  approvePR: (id: string, action: string) => api.patch(`/v1/procurement/purchase-requests/${id}`, { action }),
  purchaseOrders: (params: any) => api.get('/v1/procurement/purchase-orders', { params }),
  createPO: (data: any) => api.post('/v1/procurement/purchase-orders', data),
  updatePO: (id: string, data: any) => api.patch(`/v1/procurement/purchase-orders/${id}`, data),
  createReceipt: (data: any) => api.post('/v1/procurement/goods-receipts', data),
};

export const loyaltyApi = {
  members: (params?: any) => api.get('/v1/loyalty/members', { params }),
  member: (guestId: string) => api.get(`/v1/loyalty/members/${guestId}`),
  earn: (data: any) => api.post('/v1/loyalty/earn', data),
  redeem: (data: any) => api.post('/v1/loyalty/redeem', data),
  rules: () => api.get('/v1/loyalty/rules'),
  createRule: (data: any) => api.post('/v1/loyalty/rules', data),
  updateRule: (id: string, data: any) => api.put(`/v1/loyalty/rules/${id}`, data),
  stats: (propertyId: string) => api.get(`/v1/loyalty/stats?propertyId=${propertyId}`),
};

export const reportsApi = {
  occupancy: (params: any) => api.get('/v1/reports/occupancy', { params }),
  revenue: (params: any) => api.get('/v1/reports/revenue', { params }),
  guests: (params: any) => api.get('/v1/reports/guests', { params }),
  housekeeping: (params: any) => api.get('/v1/reports/housekeeping', { params }),
  maintenance: (params: any) => api.get('/v1/reports/maintenance', { params }),
  financialSummary: (params: any) => api.get('/v1/reports/financial-summary', { params }),
};

export const settingsApi = {
  getProperty: (propertyId: string) => api.get(`/v1/settings/property?propertyId=${propertyId}`),
  updateProperty: (propertyId: string, data: any) => api.put(`/v1/settings/property?propertyId=${propertyId}`, data),
  getUsers: (tenantId: string) => api.get(`/v1/settings/users?tenantId=${tenantId}`),
  inviteUser: (data: any) => api.post('/v1/settings/users/invite', data),
  updateUserRole: (id: string, role: string) => api.put(`/v1/settings/users/${id}/role`, { role }),
  getTaxRates: (propertyId: string) => api.get(`/v1/settings/tax-rates?propertyId=${propertyId}`),
  createTaxRate: (data: any) => api.post('/v1/settings/tax-rates', data),
  getProfile: () => api.get('/v1/settings/profile'),
  updateProfile: (data: any) => api.put('/v1/settings/profile', data),
  auditLog: (params: any) => api.get('/v1/settings/audit-log', { params }),
};

export const documentsApi = {
  list: (params: any) => api.get('/v1/documents', { params }),
  create: (data: any) => api.post('/v1/documents', data),
  update: (id: string, data: any) => api.put(`/v1/documents/${id}`, data),
  delete: (id: string) => api.delete(`/v1/documents/${id}`),
  versions: (id: string) => api.get(`/v1/documents/${id}/versions`),
  compliance: (propertyId: string) => api.get('/v1/documents/compliance', { params: { propertyId } }),
  upload: (file: File, onProgress?: (pct: number) => void) => {
    const form = new FormData();
    form.append('file', file);
    return api.post('/v1/documents/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (e) => {
        if (onProgress && e.total) onProgress(Math.round((e.loaded / e.total) * 100));
      },
    });
  },
  getCategories: (propertyId: string) => api.get('/v1/documents/categories', { params: { propertyId } }),
  createCategory: (data: any) => api.post('/v1/documents/categories', data),
  deleteCategory: (id: string) => api.delete(`/v1/documents/categories/${id}`),
};

export const reportsExportApi = {
  export: (params: { type: string; propertyId: string; startDate?: string; endDate?: string }) => {
    const url = new URL('/api/v1/reports/export', typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3001');
    Object.entries(params).forEach(([k, v]) => v && url.searchParams.set(k, v));
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    return fetch(url.toString(), {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  },
};

export const notificationsApi = {
  list: (params?: { unread?: boolean }) =>
    api.get('/v1/notifications', { params }),
  markRead: (id: string) => api.patch(`/v1/notifications/${id}/read`, {}),
  markAllRead: () => api.post('/v1/notifications/mark-all-read', {}),
};
