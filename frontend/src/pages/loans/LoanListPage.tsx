import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import { formatCurrency, formatDate, statusBadgeClass } from '../../lib/utils';
import { Plus, Search, ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import type { PaginatedResponse, Loan } from '../../types';

export default function LoanListPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const { data, isLoading } = useQuery<PaginatedResponse<Loan>>({
    queryKey: ['loans', page, debouncedSearch, statusFilter],
    queryFn: async () => {
      const params: any = { page, perPage: 20 };
      if (debouncedSearch) params.search = debouncedSearch;
      if (statusFilter) params.status = statusFilter;
      const { data } = await api.get('/loans', { params });
      return data;
    },
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setDebouncedSearch(search);
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Loans</h1>
        <Link to="/loans/new" className="btn-primary">
          <Plus size={18} className="mr-1" /> New Loan
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <form onSubmit={handleSearch} className="flex gap-2 flex-1 min-w-[250px]">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              className="input pl-10"
              placeholder="Search loan #, borrower name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button type="submit" className="btn-secondary">Search</button>
        </form>

        <select
          className="input w-auto"
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
        >
          <option value="">All Statuses</option>
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="ACTIVE">Active</option>
          <option value="OVERDUE">Overdue</option>
          <option value="CLOSED">Closed</option>
          <option value="DEFAULTED">Defaulted</option>
          <option value="REJECTED">Rejected</option>
        </select>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
        </div>
      ) : (
        <>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Loan #</th>
                  <th>Borrower</th>
                  <th>Product</th>
                  <th>Principal</th>
                  <th>Outstanding</th>
                  <th>Status</th>
                  <th>Disbursed</th>
                  <th>Maturity</th>
                </tr>
              </thead>
              <tbody>
                {data?.data?.map((loan) => (
                  <tr key={loan.id} className="cursor-pointer" onClick={() => navigate(`/loans/${loan.id}`)}>
                    <td className="font-medium text-primary-600">{loan.loanNumber}</td>
                    <td>{loan.borrower.firstName} {loan.borrower.lastName}</td>
                    <td>{loan.loanProduct.name}</td>
                    <td>{formatCurrency(loan.principalAmount)}</td>
                    <td className={loan.outstandingBalance > 0 ? 'text-red-600 font-medium' : ''}>
                      {formatCurrency(loan.outstandingBalance)}
                    </td>
                    <td><span className={statusBadgeClass(loan.status)}>{loan.status}</span></td>
                    <td>{formatDate(loan.disbursedAt)}</td>
                    <td>{formatDate(loan.maturityDate)}</td>
                  </tr>
                ))}
                {(!data?.data || data.data.length === 0) && (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-gray-500">No loans found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {data?.meta && data.meta.totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">
                Page {data.meta.page} of {data.meta.totalPages} ({data.meta.total} total)
              </p>
              <div className="flex gap-2">
                <button className="btn-secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  <ChevronLeft size={16} />
                </button>
                <button className="btn-secondary" disabled={page >= data.meta.totalPages} onClick={() => setPage((p) => p + 1)}>
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
