import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import { formatCurrency, formatDate, statusBadgeClass } from '../../lib/utils';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import {
  ArrowLeft, CheckCircle, XCircle, Banknote, FileWarning, CreditCard, RotateCcw,
} from 'lucide-react';
import type { Loan } from '../../types';

export default function LoanDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, hasRole } = useAuth();
  const isAdmin = hasRole('SYSTEM_ADMIN');
  const isOfficer = hasRole('LOAN_OFFICER');

  const { data: loan, isLoading, error } = useQuery<Loan>({
    queryKey: ['loan', id],
    queryFn: async () => {
      const { data } = await api.get(`/loans/${id}`);
      return data.data;
    },
  });

  const actionMutation = useMutation({
    mutationFn: async ({ action, body }: { action: string; body?: any }) => {
      const { data } = await api.patch(`/loans/${id}/${action}`, body || {});
      return data;
    },
    onSuccess: (_, { action }) => {
      toast.success(`Loan ${action}d successfully`);
      queryClient.invalidateQueries({ queryKey: ['loan', id] });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Action failed'),
  });

  const handleApprove = () => {
    if (confirm('Approve this loan?')) actionMutation.mutate({ action: 'approve' });
  };
  const handleReject = () => {
    const reason = prompt('Rejection reason:');
    if (reason) actionMutation.mutate({ action: 'reject', body: { reason } });
  };
  const handleDisburse = () => {
    if (confirm('Mark this loan as disbursed?')) {
      actionMutation.mutate({ action: 'disburse', body: { disbursementDate: new Date().toISOString() } });
    }
  };
  const handleWriteOff = () => {
    const reason = prompt('Write-off reason:');
    if (reason) actionMutation.mutate({ action: 'write-off', body: { reason } });
  };

  const reverseMutation = useMutation({
    mutationFn: async ({ paymentId, reason }: { paymentId: string; reason: string }) => {
      await api.post(`/payments/${paymentId}/reverse`, { reason });
    },
    onSuccess: () => {
      toast.success('Payment reversed successfully');
      queryClient.invalidateQueries({ queryKey: ['loan', id] });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Reversal failed'),
  });

  const handleReverse = (paymentId: string) => {
    const reason = prompt('Reason for reversal:');
    if (reason) reverseMutation.mutate({ paymentId, reason });
  };

  if (isLoading) return <div className="flex justify-center py-20"><div className="animate-spin h-10 w-10 border-4 border-primary-500 border-t-transparent rounded-full" /></div>;
  if (error || !loan) return <div className="text-center py-20 text-red-600">Loan not found</div>;

  const outstanding = (loan as any).outstandingBalance ?? (loan.totalDue - loan.totalPaid);
  const progressPct = loan.totalDue > 0 ? Math.min(100, Math.round((loan.totalPaid / loan.totalDue) * 100)) : 0;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="btn-secondary p-2"><ArrowLeft size={18} /></button>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">{loan.loanNumber}</h1>
            <p className="text-sm text-gray-500">{(loan as any).borrower?.firstName} {(loan as any).borrower?.lastName}</p>
          </div>
        </div>
        <span className={`badge ${statusBadgeClass(loan.status)} text-sm px-3 py-1`}>{loan.status.replace(/_/g, ' ')}</span>
      </div>

      {/* Action buttons */}
      {(isAdmin || isOfficer) && (
        <div className="flex flex-wrap gap-2">
          {loan.status === 'PENDING' && (
            <>
              <button className="btn-primary" onClick={handleApprove} disabled={actionMutation.isPending}>
                <CheckCircle size={16} className="mr-1" /> Approve
              </button>
              <button className="btn-danger" onClick={handleReject} disabled={actionMutation.isPending}>
                <XCircle size={16} className="mr-1" /> Reject
              </button>
            </>
          )}
          {loan.status === 'APPROVED' && (
            <button className="btn-primary" onClick={handleDisburse} disabled={actionMutation.isPending}>
              <Banknote size={16} className="mr-1" /> Disburse
            </button>
          )}
          {loan.status === 'ACTIVE' && (
            <>
              <button className="btn-primary" onClick={() => navigate(`/payments/new?loanId=${loan.id}`)}>
                <CreditCard size={16} className="mr-1" /> Record Payment
              </button>
              {isAdmin && (
                <button className="btn-danger" onClick={handleWriteOff} disabled={actionMutation.isPending}>
                  <FileWarning size={16} className="mr-1" /> Write Off
                </button>
              )}
            </>
          )}
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card text-center">
          <p className="text-sm text-gray-500">Principal</p>
          <p className="text-xl font-bold">{formatCurrency(loan.principalAmount)}</p>
        </div>
        <div className="card text-center">
          <p className="text-sm text-gray-500">Interest ({loan.interestRate}%)</p>
          <p className="text-xl font-bold text-blue-600">{formatCurrency(loan.totalInterest)}</p>
        </div>
        <div className="card text-center">
          <p className="text-sm text-gray-500">Total Paid</p>
          <p className="text-xl font-bold text-green-600">{formatCurrency(loan.totalPaid)}</p>
        </div>
        <div className="card text-center">
          <p className="text-sm text-gray-500">Outstanding</p>
          <p className={`text-xl font-bold ${outstanding > 0 ? 'text-red-600' : 'text-green-600'}`}>{formatCurrency(outstanding)}</p>
        </div>
      </div>

      {/* Progress bar */}
      {loan.status === 'ACTIVE' && (
        <div className="card">
          <div className="flex justify-between text-sm mb-1">
            <span>Repayment Progress</span>
            <span className="font-semibold">{progressPct}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div className="bg-green-500 h-3 rounded-full transition-all" style={{ width: `${progressPct}%` }} />
          </div>
        </div>
      )}

      {/* Loan info */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-3">Loan Information</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-y-3 gap-x-6 text-sm">
          <div><span className="text-gray-500">Product:</span> <span className="font-medium ml-1">{(loan as any).loanProduct?.name || '—'}</span></div>
          <div><span className="text-gray-500">Interest Method:</span> <span className="font-medium ml-1">{loan.interestMethod.replace('_', ' ')}</span></div>
          <div><span className="text-gray-500">Duration:</span> <span className="font-medium ml-1">{loan.durationValue} {loan.durationUnit.toLowerCase()}</span></div>
          <div><span className="text-gray-500">Frequency:</span> <span className="font-medium ml-1">{loan.repaymentFrequency}</span></div>
          <div><span className="text-gray-500">Applied:</span> <span className="font-medium ml-1">{formatDate(loan.createdAt)}</span></div>
          <div><span className="text-gray-500">Disbursed:</span> <span className="font-medium ml-1">{loan.disbursedAt ? formatDate(loan.disbursedAt) : '—'}</span></div>
          <div><span className="text-gray-500">Maturity:</span> <span className="font-medium ml-1">{loan.maturityDate ? formatDate(loan.maturityDate) : '—'}</span></div>
          {loan.purpose && <div className="col-span-2"><span className="text-gray-500">Purpose:</span> <span className="font-medium ml-1">{loan.purpose}</span></div>}
        </div>
      </div>

      {/* Repayment Schedule */}
      {(loan as any).schedules && (loan as any).schedules.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-semibold mb-3">Repayment Schedule</h3>
          <div className="table-container max-h-96 overflow-y-auto">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Due Date</th>
                  <th>Principal</th>
                  <th>Interest</th>
                  <th>Total</th>
                  <th>Paid</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {(loan as any).schedules.map((s: any) => (
                  <tr key={s.id} className={s.status === 'OVERDUE' ? 'bg-red-50' : ''}>
                    <td>{s.installmentNumber}</td>
                    <td>{formatDate(s.dueDate)}</td>
                    <td>{formatCurrency(s.principalAmount)}</td>
                    <td>{formatCurrency(s.interestAmount)}</td>
                    <td className="font-medium">{formatCurrency(s.totalAmount)}</td>
                    <td className="text-green-600">{formatCurrency(s.paidAmount)}</td>
                    <td><span className={`badge ${statusBadgeClass(s.status)}`}>{s.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Payment History */}
      {(loan as any).payments && (loan as any).payments.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-semibold mb-3">Payment History</h3>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Payment #</th>
                  <th>Date</th>
                  <th>Amount</th>
                  <th>Method</th>
                  <th>Reference</th>
                  <th>Status</th>
                  {isAdmin && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {(loan as any).payments.map((p: any) => (
                  <tr key={p.id}>
                    <td className="font-mono text-sm">{p.paymentNumber}</td>
                    <td>{formatDate(p.paymentDate)}</td>
                    <td className="font-medium">{formatCurrency(p.amount)}</td>
                    <td>{p.paymentMethod}</td>
                    <td className="text-sm text-gray-500">{p.referenceNumber || '—'}</td>
                    <td><span className={`badge ${p.status === 'REVERSED' ? 'badge-red' : 'badge-green'}`}>{p.status}</span></td>
                    {isAdmin && (
                      <td>
                        {p.status === 'COMPLETED' && (
                          <button
                            className="btn-danger px-2 py-1 text-xs flex items-center gap-1"
                            onClick={() => handleReverse(p.id)}
                            disabled={reverseMutation.isPending}
                          >
                            <RotateCcw size={12} /> Reverse
                          </button>
                        )}
                      </td>
                    )}
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
