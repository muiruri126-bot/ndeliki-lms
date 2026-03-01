import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import { formatDate } from '../../lib/utils';
import { Plus, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import type { PaginatedResponse, Borrower } from '../../types';

export default function BorrowerListPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const { data, isLoading } = useQuery<PaginatedResponse<Borrower>>({
    queryKey: ['borrowers', page, debouncedSearch],
    queryFn: async () => {
      const params: any = { page, perPage: 20 };
      if (debouncedSearch) params.search = debouncedSearch;
      const { data } = await api.get('/borrowers', { params });
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
        <h1 className="text-2xl font-bold text-gray-800">Borrowers</h1>
        <Link to="/borrowers/new" className="btn-primary">
          <Plus size={18} className="mr-1" /> Add Borrower
        </Link>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            className="input pl-10"
            placeholder="Search by name, phone, National ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button type="submit" className="btn-secondary">Search</button>
      </form>

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
                  <th>Name</th>
                  <th>Phone</th>
                  <th>National ID</th>
                  <th>County</th>
                  <th>Risk</th>
                  <th>Loans</th>
                  <th>Registered</th>
                </tr>
              </thead>
              <tbody>
                {data?.data?.map((b) => (
                  <tr key={b.id} className="cursor-pointer" onClick={() => navigate(`/borrowers/${b.id}`)}>
                    <td className="font-medium text-gray-900">{b.firstName} {b.lastName}</td>
                    <td>{b.phone}</td>
                    <td>{b.nationalId}</td>
                    <td>{b.county || '—'}</td>
                    <td>
                      <span className={`badge ${
                        b.riskRating === 'LOW' ? 'badge-green' :
                        b.riskRating === 'MEDIUM' ? 'badge-yellow' :
                        'badge-red'
                      }`}>{b.riskRating}</span>
                    </td>
                    <td>{b._count?.loans || 0}</td>
                    <td>{formatDate(b.createdAt)}</td>
                  </tr>
                ))}
                {(!data?.data || data.data.length === 0) && (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-gray-500">
                      No borrowers found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {data?.meta && data.meta.totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">
                Showing {(data.meta.page - 1) * data.meta.perPage + 1} to{' '}
                {Math.min(data.meta.page * data.meta.perPage, data.meta.total)} of {data.meta.total}
              </p>
              <div className="flex gap-2">
                <button
                  className="btn-secondary"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  className="btn-secondary"
                  disabled={page >= data.meta.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
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
