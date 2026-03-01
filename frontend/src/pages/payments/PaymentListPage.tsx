import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import { formatCurrency, formatDate, statusBadgeClass } from '../../lib/utils';
import { Search, ChevronLeft, ChevronRight, CreditCard } from 'lucide-react';
import type { Payment, PaginatedResponse } from '../../types';

export default function PaymentListPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [methodFilter, setMethodFilter] = useState('');

  const { data, isLoading } = useQuery<PaginatedResponse<Payment>>({
    queryKey: ['payments', page, search, statusFilter, methodFilter],
    queryFn: async () => {
      const params: any = { page, perPage: 15 };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      if (methodFilter) params.method = methodFilter;
      const { data } = await api.get('/payments', { params });
      return data;
    },
  });

  const payments = data?.data || [];
  const meta = data?.meta;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-800">Payments</h1>
        <button className="btn-primary" onClick={() => navigate('/payments/new')}>
          <CreditCard size={18} className="mr-2" /> Record Payment
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            className="input pl-10"
            placeholder="Search by payment #, loan #..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <select className="input w-40" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
          <option value="">All Status</option>
          <option value="COMPLETED">Completed</option>
          <option value="REVERSED">Reversed</option>
        </select>
        <select className="input w-40" value={methodFilter} onChange={(e) => { setMethodFilter(e.target.value); setPage(1); }}>
          <option value="">All Methods</option>
          <option value="CASH">Cash</option>
          <option value="MPESA">M-Pesa</option>
          <option value="BANK_TRANSFER">Bank Transfer</option>
          <option value="CHEQUE">Cheque</option>
          <option value="OTHER">Other</option>
        </select>
      </div>

      {/* Table */}
      <div className="table-container">
        {isLoading ? (
          <div className="flex justify-center py-10"><div className="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full" /></div>
        ) : payments.length === 0 ? (
          <div className="text-center py-10 text-gray-500">No payments found</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Payment #</th>
                <th>Loan #</th>
                <th>Borrower</th>
                <th>Amount</th>
                <th>Method</th>
                <th>Reference</th>
                <th>Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p: any) => (
                <tr key={p.id} className="cursor-pointer" onClick={() => navigate(`/loans/${p.loanId}`)}>
                  <td className="font-mono text-sm">{p.paymentNumber}</td>
                  <td className="font-mono text-sm text-primary-600">{p.loan?.loanNumber || '—'}</td>
                  <td>{p.loan?.borrower ? `${p.loan.borrower.firstName} ${p.loan.borrower.lastName}` : '—'}</td>
                  <td className="font-medium">{formatCurrency(p.amount)}</td>
                  <td>{p.paymentMethod.replace('_', ' ')}</td>
                  <td className="text-sm text-gray-500">{p.referenceNumber || '—'}</td>
                  <td>{formatDate(p.paymentDate)}</td>
                  <td><span className={`badge ${p.status === 'REVERSED' ? 'badge-red' : 'badge-green'}`}>{p.status}</span></td>
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
