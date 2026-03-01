import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import { formatCurrency } from '../../lib/utils';
import toast from 'react-hot-toast';
import { ArrowLeft, Save } from 'lucide-react';
import type { Loan } from '../../types';

export default function PaymentFormPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const preselectedLoanId = searchParams.get('loanId');

  const [loanSearch, setLoanSearch] = useState('');
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [form, setForm] = useState({
    amount: '',
    paymentMethod: 'CASH',
    paymentDate: new Date().toISOString().split('T')[0],
    referenceNumber: '',
    notes: '',
  });

  // Fetch preselected loan
  useEffect(() => {
    if (preselectedLoanId) {
      api.get(`/loans/${preselectedLoanId}`).then(({ data }) => {
        setSelectedLoan(data.data);
      }).catch(() => {});
    }
  }, [preselectedLoanId]);

  // Search active loans
  const { data: loans } = useQuery({
    queryKey: ['loan-search', loanSearch],
    queryFn: async () => {
      if (!loanSearch || loanSearch.length < 2) return [];
      const { data } = await api.get('/loans', { params: { search: loanSearch, status: 'ACTIVE', perPage: 5 } });
      return data.data;
    },
    enabled: loanSearch.length >= 2 && !selectedLoan,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/payments', {
        loanId: selectedLoan!.id,
        amount: parseFloat(form.amount),
        paymentMethod: form.paymentMethod,
        paymentDate: new Date(form.paymentDate).toISOString(),
        referenceNumber: form.referenceNumber || undefined,
        notes: form.notes || undefined,
      });
      return data.data;
    },
    onSuccess: () => {
      toast.success('Payment recorded successfully');
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['loan', selectedLoan!.id] });
      navigate('/payments');
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to record payment'),
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const outstanding = selectedLoan
    ? ((selectedLoan as any).outstandingBalance ?? (selectedLoan.totalDue - selectedLoan.totalPaid))
    : 0;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="btn-secondary p-2"><ArrowLeft size={18} /></button>
        <h1 className="text-2xl font-bold text-gray-800">Record Payment</h1>
      </div>

      {/* Loan selection */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">Select Loan</h3>
        {selectedLoan ? (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">{selectedLoan.loanNumber}</p>
                <p className="text-sm text-gray-600">
                  {(selectedLoan as any).borrower?.firstName} {(selectedLoan as any).borrower?.lastName}
                </p>
              </div>
              {!preselectedLoanId && (
                <button className="btn-secondary text-sm" onClick={() => { setSelectedLoan(null); setLoanSearch(''); }}>
                  Change
                </button>
              )}
            </div>
            <div className="grid grid-cols-3 gap-4 mt-3 text-sm">
              <div>
                <p className="text-gray-500">Principal</p>
                <p className="font-semibold">{formatCurrency(selectedLoan.principalAmount)}</p>
              </div>
              <div>
                <p className="text-gray-500">Total Paid</p>
                <p className="font-semibold text-green-600">{formatCurrency(selectedLoan.totalPaid)}</p>
              </div>
              <div>
                <p className="text-gray-500">Outstanding</p>
                <p className="font-semibold text-red-600">{formatCurrency(outstanding)}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="relative">
            <input
              className="input"
              placeholder="Search by loan number or borrower name..."
              value={loanSearch}
              onChange={(e) => setLoanSearch(e.target.value)}
            />
            {loans && loans.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {loans.map((l: Loan & { borrower?: any }) => (
                  <button
                    key={l.id}
                    className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-0"
                    onClick={() => { setSelectedLoan(l); setLoanSearch(''); }}
                  >
                    <p className="font-medium text-sm">{l.loanNumber}</p>
                    <p className="text-xs text-gray-500">
                      {l.borrower?.firstName} {l.borrower?.lastName} — Outstanding: {formatCurrency(l.outstandingBalance || 0)}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Payment details */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">Payment Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label">Amount (KES) *</label>
            <input
              name="amount"
              type="number"
              className="input"
              value={form.amount}
              onChange={handleChange}
              required
              min="1"
              placeholder={outstanding > 0 ? `Max: ${outstanding.toLocaleString()}` : ''}
            />
          </div>
          <div>
            <label className="label">Payment Method *</label>
            <select name="paymentMethod" className="input" value={form.paymentMethod} onChange={handleChange}>
              <option value="CASH">Cash</option>
              <option value="MPESA">M-Pesa</option>
              <option value="BANK_TRANSFER">Bank Transfer</option>
              <option value="CHEQUE">Cheque</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
          <div>
            <label className="label">Payment Date *</label>
            <input name="paymentDate" type="date" className="input" value={form.paymentDate} onChange={handleChange} required />
          </div>
          <div>
            <label className="label">Reference Number</label>
            <input name="referenceNumber" className="input" value={form.referenceNumber} onChange={handleChange} placeholder="e.g. M-Pesa code" />
          </div>
          <div className="md:col-span-2">
            <label className="label">Notes</label>
            <textarea name="notes" className="input" rows={2} value={form.notes} onChange={handleChange} />
          </div>
        </div>
      </div>

      {/* Quick amount buttons */}
      {selectedLoan && outstanding > 0 && (
        <div className="flex flex-wrap gap-2">
          <span className="text-sm text-gray-500 self-center">Quick:</span>
          {[outstanding].map((amt) => (
            <button
              key="full"
              className="btn-secondary text-sm"
              onClick={() => setForm({ ...form, amount: String(amt) })}
            >
              Full: {formatCurrency(amt)}
            </button>
          ))}
          {outstanding > 1000 && (
            <button
              className="btn-secondary text-sm"
              onClick={() => setForm({ ...form, amount: String(Math.ceil(outstanding / 2)) })}
            >
              Half: {formatCurrency(Math.ceil(outstanding / 2))}
            </button>
          )}
        </div>
      )}

      {/* Submit */}
      <div className="flex justify-end">
        <button
          className="btn-primary px-8"
          disabled={!selectedLoan || !form.amount || createMutation.isPending}
          onClick={(e) => { e.preventDefault(); createMutation.mutate(); }}
        >
          <Save size={18} className="mr-2" />
          {createMutation.isPending ? 'Processing...' : 'Record Payment'}
        </button>
      </div>
    </div>
  );
}
