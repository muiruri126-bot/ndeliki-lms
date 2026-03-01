import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import { formatDate } from '../../lib/utils';
import { Search, ChevronLeft, ChevronRight, Shield } from 'lucide-react';

export default function AuditLogPage() {
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs', page, actionFilter, entityFilter, dateFrom, dateTo],
    queryFn: async () => {
      const params: any = { page, perPage: 20 };
      if (actionFilter) params.action = actionFilter;
      if (entityFilter) params.entityType = entityFilter;
      if (dateFrom) params.startDate = dateFrom;
      if (dateTo) params.endDate = dateTo;
      const { data } = await api.get('/audit', { params });
      return data;
    },
  });

  const logs = data?.data || [];
  const meta = data?.meta;

  const actionColors: Record<string, string> = {
    CREATE: 'badge-green',
    UPDATE: 'badge-blue',
    DELETE: 'badge-red',
    LOGIN: 'badge-blue',
    LOGOUT: 'badge-gray',
    APPROVE: 'badge-green',
    REJECT: 'badge-red',
    DISBURSE: 'badge-green',
    PAYMENT: 'badge-green',
    REVERSAL: 'badge-red',
    WRITE_OFF: 'badge-yellow',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="text-primary-600" size={28} />
        <h1 className="text-2xl font-bold text-gray-800">Audit Log</h1>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select className="input w-40" value={actionFilter} onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}>
          <option value="">All Actions</option>
          <option value="CREATE">Create</option>
          <option value="UPDATE">Update</option>
          <option value="DELETE">Delete</option>
          <option value="LOGIN">Login</option>
          <option value="APPROVE">Approve</option>
          <option value="REJECT">Reject</option>
          <option value="DISBURSE">Disburse</option>
          <option value="PAYMENT">Payment</option>
          <option value="REVERSAL">Reversal</option>
          <option value="WRITE_OFF">Write Off</option>
        </select>
        <select className="input w-40" value={entityFilter} onChange={(e) => { setEntityFilter(e.target.value); setPage(1); }}>
          <option value="">All Entities</option>
          <option value="User">User</option>
          <option value="Borrower">Borrower</option>
          <option value="Loan">Loan</option>
          <option value="Payment">Payment</option>
          <option value="LoanProduct">Loan Product</option>
        </select>
        <div>
          <input type="date" className="input" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }} placeholder="From" />
        </div>
        <div>
          <input type="date" className="input" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }} placeholder="To" />
        </div>
        {(actionFilter || entityFilter || dateFrom || dateTo) && (
          <button className="btn-secondary text-sm" onClick={() => { setActionFilter(''); setEntityFilter(''); setDateFrom(''); setDateTo(''); setPage(1); }}>
            Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div className="table-container">
        {isLoading ? (
          <div className="flex justify-center py-10"><div className="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full" /></div>
        ) : logs.length === 0 ? (
          <div className="text-center py-10 text-gray-500">No audit logs found</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>User</th>
                <th>Action</th>
                <th>Entity</th>
                <th>Entity ID</th>
                <th>Details</th>
                <th>IP</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log: any) => (
                <tr key={log.id}>
                  <td className="text-sm whitespace-nowrap">{new Date(log.createdAt).toLocaleString()}</td>
                  <td className="text-sm">
                    {log.user ? `${log.user.firstName} ${log.user.lastName}` : 'System'}
                  </td>
                  <td>
                    <span className={`badge ${actionColors[log.action] || 'badge-gray'}`}>{log.action}</span>
                  </td>
                  <td className="text-sm">{log.entityType}</td>
                  <td className="font-mono text-xs text-gray-500">{log.entityId?.substring(0, 8) || '—'}</td>
                  <td className="text-sm max-w-xs truncate">
                    {log.description || (log.changes ? JSON.stringify(log.changes).substring(0, 60) + '...' : '—')}
                  </td>
                  <td className="text-xs text-gray-400">{log.ipAddress || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Showing {((meta.page - 1) * meta.perPage) + 1}–{Math.min(meta.page * meta.perPage, meta.total)} of {meta.total}
          </p>
          <div className="flex gap-2">
            <button className="btn-secondary p-2" disabled={meta.page <= 1} onClick={() => setPage(meta.page - 1)}>
              <ChevronLeft size={18} />
            </button>
            <button className="btn-secondary p-2" disabled={meta.page >= meta.totalPages} onClick={() => setPage(meta.page + 1)}>
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
