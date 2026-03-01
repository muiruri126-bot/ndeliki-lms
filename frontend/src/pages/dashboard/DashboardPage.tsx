import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import { formatCurrency, formatDate, statusBadgeClass } from '../../lib/utils';
import {
  Users,
  Landmark,
  CreditCard,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { Link } from 'react-router-dom';

export default function DashboardPage() {
  const { data: dashboard, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const { data } = await api.get('/dashboard');
      return data.data;
    },
  });

  const { data: charts } = useQuery({
    queryKey: ['dashboard-charts'],
    queryFn: async () => {
      const { data } = await api.get('/dashboard/charts');
      return data.data;
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600" />
      </div>
    );
  }

  const cards = dashboard?.cards;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
        <p className="text-sm text-gray-500">{new Date().toLocaleDateString('en-KE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Borrowers"
          value={cards?.totalBorrowers || 0}
          subtitle={`${cards?.activeBorrowers || 0} active`}
          icon={<Users className="text-blue-600" size={24} />}
          color="blue"
        />
        <StatCard
          title="Active Loans"
          value={cards?.activeLoans || 0}
          subtitle={`${cards?.pendingLoans || 0} pending`}
          icon={<Landmark className="text-green-600" size={24} />}
          color="green"
        />
        <StatCard
          title="Total Outstanding"
          value={formatCurrency(cards?.totalOutstanding || 0)}
          subtitle={`Collected: ${formatCurrency(cards?.totalCollected || 0)}`}
          icon={<CreditCard className="text-purple-600" size={24} />}
          color="purple"
        />
        <StatCard
          title="Overdue Loans"
          value={cards?.overdueLoans || 0}
          subtitle="Requires attention"
          icon={<AlertTriangle className="text-red-600" size={24} />}
          color="red"
        />
      </div>

      {/* This month summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="text-green-600" size={18} />
            <h3 className="text-sm font-medium text-gray-500">Disbursed This Month</h3>
          </div>
          <p className="text-2xl font-bold text-gray-800">
            {formatCurrency(dashboard?.thisMonth?.disbursedAmount || 0)}
          </p>
          <p className="text-sm text-gray-500">{dashboard?.thisMonth?.disbursedCount || 0} loans</p>
        </div>
        <div className="card">
          <div className="flex items-center gap-2 mb-1">
            <TrendingDown className="text-blue-600" size={18} />
            <h3 className="text-sm font-medium text-gray-500">Collected This Month</h3>
          </div>
          <p className="text-2xl font-bold text-gray-800">
            {formatCurrency(dashboard?.thisMonth?.collectedAmount || 0)}
          </p>
          <p className="text-sm text-gray-500">{dashboard?.thisMonth?.collectedCount || 0} payments</p>
        </div>
      </div>

      {/* Chart */}
      {charts?.monthlyTrend && (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Monthly Trend (12 months)</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Legend />
                <Bar dataKey="disbursed" name="Disbursed" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="collected" name="Collected" fill="#16a34a" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Recent activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent loans */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Recent Loans</h3>
            <Link to="/loans" className="text-sm text-primary-600 hover:underline flex items-center gap-1">
              View all <ArrowUpRight size={14} />
            </Link>
          </div>
          <div className="space-y-3">
            {dashboard?.recentLoans?.map((loan: any) => (
              <Link key={loan.id} to={`/loans/${loan.id}`} className="flex items-center justify-between py-2 hover:bg-gray-50 rounded px-2 -mx-2">
                <div>
                  <p className="text-sm font-medium text-gray-800">{loan.loanNumber}</p>
                  <p className="text-xs text-gray-500">
                    {loan.borrower.firstName} {loan.borrower.lastName}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">{formatCurrency(loan.principalAmount)}</p>
                  <span className={statusBadgeClass(loan.status)}>{loan.status}</span>
                </div>
              </Link>
            ))}
            {(!dashboard?.recentLoans || dashboard.recentLoans.length === 0) && (
              <p className="text-sm text-gray-500 text-center py-4">No loans yet</p>
            )}
          </div>
        </div>

        {/* Recent payments */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Recent Payments</h3>
            <Link to="/payments" className="text-sm text-primary-600 hover:underline flex items-center gap-1">
              View all <ArrowUpRight size={14} />
            </Link>
          </div>
          <div className="space-y-3">
            {dashboard?.recentPayments?.map((payment: any) => (
              <div key={payment.id} className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium text-gray-800">{payment.paymentNumber}</p>
                  <p className="text-xs text-gray-500">
                    {payment.loan?.borrower?.firstName} {payment.loan?.borrower?.lastName} — {payment.loan?.loanNumber}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-green-600">+{formatCurrency(payment.amount)}</p>
                  <p className="text-xs text-gray-500">{payment.paymentMethod}</p>
                </div>
              </div>
            ))}
            {(!dashboard?.recentPayments || dashboard.recentPayments.length === 0) && (
              <p className="text-sm text-gray-500 text-center py-4">No payments yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  subtitle,
  icon,
  color,
}: {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div className="card flex items-start gap-4">
      <div className={`p-3 rounded-xl bg-${color}-50`}>{icon}</div>
      <div>
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <p className="text-2xl font-bold text-gray-800">{value}</p>
        <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>
      </div>
    </div>
  );
}
