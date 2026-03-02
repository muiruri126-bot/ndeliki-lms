import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import { formatCurrency, formatDate } from '../../lib/utils';
import { BarChart3, TrendingDown, Users, AlertTriangle, Download } from 'lucide-react';
import toast from 'react-hot-toast';

type TabKey = 'portfolio' | 'collections' | 'overdue' | 'officers';

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('portfolio');
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });

  const tabs: { key: TabKey; label: string; icon: React.ReactNode }[] = [
    { key: 'portfolio', label: 'Portfolio Summary', icon: <BarChart3 size={16} /> },
    { key: 'collections', label: 'Collections', icon: <TrendingDown size={16} /> },
    { key: 'overdue', label: 'Overdue', icon: <AlertTriangle size={16} /> },
    { key: 'officers', label: 'Officer Performance', icon: <Users size={16} /> },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-800">Reports</h1>
        <div className="flex gap-2">
          <ExportButton label="Borrowers" endpoint="/reports/export/borrowers" />
          <ExportButton label="Loans" endpoint="/reports/export/loans" />
          <ExportButton label="Payments" endpoint="/reports/export/payments" />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 bg-gray-100 rounded-lg p-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition ${
              activeTab === t.key ? 'bg-white shadow text-primary-700' : 'text-gray-600 hover:text-gray-800'
            }`}
            onClick={() => setActiveTab(t.key)}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Date range for collections */}
      {(activeTab === 'collections' || activeTab === 'officers') && (
        <div className="flex gap-3 items-end">
          <div>
            <label className="label">From</label>
            <input
              type="date"
              className="input"
              value={dateRange.startDate}
              onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
            />
          </div>
          <div>
            <label className="label">To</label>
            <input
              type="date"
              className="input"
              value={dateRange.endDate}
              onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
            />
          </div>
        </div>
      )}

      {activeTab === 'portfolio' && <PortfolioReport />}
      {activeTab === 'collections' && <CollectionReport dateRange={dateRange} />}
      {activeTab === 'overdue' && <OverdueReport />}
      {activeTab === 'officers' && <OfficerReport dateRange={dateRange} />}
    </div>
  );
}

function PortfolioReport() {
  const { data, isLoading } = useQuery({
    queryKey: ['report-portfolio'],
    queryFn: async () => {
      const { data } = await api.get('/reports/portfolio');
      return data.data;
    },
  });

  if (isLoading) return <Loading />;
  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card text-center">
          <p className="text-sm text-gray-500">Total Loans</p>
          <p className="text-2xl font-bold">{data.summary?.totalLoans || 0}</p>
        </div>
        <div className="card text-center">
          <p className="text-sm text-gray-500">Total Disbursed</p>
          <p className="text-xl font-bold">{formatCurrency(data.summary?.totalDisbursed || 0)}</p>
        </div>
        <div className="card text-center">
          <p className="text-sm text-gray-500">Total Outstanding</p>
          <p className="text-xl font-bold text-red-600">{formatCurrency(data.summary?.totalOutstanding || 0)}</p>
        </div>
        <div className="card text-center">
          <p className="text-sm text-gray-500">Total Collected</p>
          <p className="text-xl font-bold text-green-600">{formatCurrency(data.summary?.totalCollected || 0)}</p>
        </div>
      </div>

      {/* By status */}
      {data.byStatus && data.byStatus.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-semibold mb-3">By Status</h3>
          <div className="table-container">
            <table>
              <thead>
                <tr><th>Status</th><th>Count</th><th>Principal</th><th>Outstanding</th></tr>
              </thead>
              <tbody>
                {data.byStatus.map((r: any) => (
                  <tr key={r.status}>
                    <td className="font-medium">{r.status}</td>
                    <td>{r._count}</td>
                    <td>{formatCurrency(r._sum?.principalAmount || 0)}</td>
                    <td className="text-red-600">{formatCurrency(r._sum?.outstandingBalance || 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* By product */}
      {data.byProduct && data.byProduct.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-semibold mb-3">By Product</h3>
          <div className="table-container">
            <table>
              <thead>
                <tr><th>Product</th><th>Count</th><th>Principal</th><th>Outstanding</th></tr>
              </thead>
              <tbody>
                {data.byProduct.map((r: any) => (
                  <tr key={r.loanProduct?.name || 'Unknown'}>
                    <td className="font-medium">{r.loanProduct?.name || 'Unknown'}</td>
                    <td>{r._count}</td>
                    <td>{formatCurrency(r._sum?.principalAmount || 0)}</td>
                    <td className="text-red-600">{formatCurrency(r._sum?.outstandingBalance || 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function CollectionReport({ dateRange }: { dateRange: { startDate: string; endDate: string } }) {
  const { data, isLoading } = useQuery({
    queryKey: ['report-collections', dateRange],
    queryFn: async () => {
      const { data } = await api.get('/reports/collections', {
        params: { startDate: dateRange.startDate, endDate: dateRange.endDate },
      });
      return data.data;
    },
  });

  if (isLoading) return <Loading />;
  if (!data) return null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="card text-center">
          <p className="text-sm text-gray-500">Total Collected</p>
          <p className="text-xl font-bold text-green-600">{formatCurrency(data.totalCollected || 0)}</p>
        </div>
        <div className="card text-center">
          <p className="text-sm text-gray-500">Transactions</p>
          <p className="text-2xl font-bold">{data.totalTransactions || 0}</p>
        </div>
        <div className="card text-center">
          <p className="text-sm text-gray-500">Avg Payment</p>
          <p className="text-xl font-bold">{formatCurrency(data.averagePayment || 0)}</p>
        </div>
      </div>

      {/* By method */}
      {data.byMethod && data.byMethod.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-semibold mb-3">By Payment Method</h3>
          <div className="table-container">
            <table>
              <thead><tr><th>Method</th><th>Count</th><th>Total</th></tr></thead>
              <tbody>
                {data.byMethod.map((r: any) => (
                  <tr key={r.paymentMethod}>
                    <td className="font-medium">{r.paymentMethod?.replace('_', ' ')}</td>
                    <td>{r._count}</td>
                    <td className="text-green-600">{formatCurrency(r._sum?.amount || 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Daily breakdown */}
      {data.daily && data.daily.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-semibold mb-3">Daily Breakdown</h3>
          <div className="table-container max-h-80 overflow-y-auto">
            <table>
              <thead><tr><th>Date</th><th>Count</th><th>Amount</th></tr></thead>
              <tbody>
                {data.daily.map((r: any, i: number) => (
                  <tr key={i}>
                    <td>{formatDate(r.date)}</td>
                    <td>{r.count}</td>
                    <td className="text-green-600 font-medium">{formatCurrency(r.total || 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function OverdueReport() {
  const { data, isLoading } = useQuery({
    queryKey: ['report-overdue'],
    queryFn: async () => {
      const { data } = await api.get('/reports/overdue');
      return data.data;
    },
  });

  if (isLoading) return <Loading />;
  if (!data || data.length === 0) return <div className="card text-center py-10 text-gray-500">No overdue loans</div>;

  return (
    <div className="card">
      <h3 className="text-lg font-semibold mb-3">Overdue Loans ({data.length})</h3>
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Loan #</th>
              <th>Borrower</th>
              <th>Outstanding</th>
              <th>Overdue Amount</th>
              <th>Days Overdue</th>
              <th>Phone</th>
            </tr>
          </thead>
          <tbody>
            {data.map((r: any) => (
              <tr key={r.loanId} className={r.daysOverdue > 30 ? 'bg-red-50' : r.daysOverdue > 7 ? 'bg-yellow-50' : ''}>
                <td className="font-mono text-sm">{r.loanNumber}</td>
                <td>{r.borrowerName}</td>
                <td className="font-medium">{formatCurrency(r.outstandingBalance || 0)}</td>
                <td className="text-red-600 font-medium">{formatCurrency(r.overdueAmount || 0)}</td>
                <td>
                  <span className={`font-bold ${r.daysOverdue > 30 ? 'text-red-600' : r.daysOverdue > 7 ? 'text-yellow-600' : 'text-gray-700'}`}>
                    {r.daysOverdue}
                  </span>
                </td>
                <td className="text-sm">{r.phone || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function OfficerReport({ dateRange }: { dateRange: { startDate: string; endDate: string } }) {
  const { data, isLoading } = useQuery({
    queryKey: ['report-officers', dateRange],
    queryFn: async () => {
      const { data } = await api.get('/reports/officers', {
        params: { startDate: dateRange.startDate, endDate: dateRange.endDate },
      });
      return data.data;
    },
  });

  if (isLoading) return <Loading />;
  if (!data || data.length === 0) return <div className="card text-center py-10 text-gray-500">No officer data</div>;

  return (
    <div className="card">
      <h3 className="text-lg font-semibold mb-3">Loan Officer Performance</h3>
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Officer</th>
              <th>Loans Created</th>
              <th>Total Disbursed</th>
              <th>Active Loans</th>
              <th>Collections</th>
            </tr>
          </thead>
          <tbody>
            {data.map((r: any) => (
              <tr key={r.officerId}>
                <td className="font-medium">{r.officerName}</td>
                <td>{r.loansCreated || 0}</td>
                <td>{formatCurrency(r.totalDisbursed || 0)}</td>
                <td>{r.activeLoans || 0}</td>
                <td className="text-green-600">{formatCurrency(r.totalCollected || 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ExportButton({ label, endpoint }: { label: string; endpoint: string }) {
  const [loading, setLoading] = useState(false);
  const handleExport = async () => {
    setLoading(true);
    try {
      const response = await api.get(endpoint, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      const disposition = response.headers['content-disposition'];
      const filename = disposition ? disposition.split('filename=')[1]?.replace(/"/g, '') : `${label.toLowerCase()}.csv`;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success(`${label} exported`);
    } catch {
      toast.error(`Failed to export ${label.toLowerCase()}`);
    } finally {
      setLoading(false);
    }
  };
  return (
    <button className="btn-secondary text-sm flex items-center gap-1" onClick={handleExport} disabled={loading}>
      <Download size={14} /> {loading ? 'Exporting...' : `Export ${label}`}
    </button>
  );
}

function Loading() {
  return (
    <div className="flex justify-center py-10">
      <div className="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full" />
    </div>
  );
}
