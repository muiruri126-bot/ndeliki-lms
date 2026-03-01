import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import api from '../../lib/api';
import { formatCurrency } from '../../lib/utils';
import toast from 'react-hot-toast';
import { ArrowLeft, Calculator, Save } from 'lucide-react';
import type { LoanProduct, Borrower } from '../../types';

export default function LoanFormPage() {
  const navigate = useNavigate();
  const [borrowerSearch, setBorrowerSearch] = useState('');
  const [selectedBorrower, setSelectedBorrower] = useState<Borrower | null>(null);
  const [form, setForm] = useState({
    loanProductId: '',
    principalAmount: '',
    interestRate: '',
    durationValue: '',
    durationUnit: 'MONTHS',
    repaymentFrequency: 'MONTHLY',
    interestMethod: 'FLAT',
    purpose: '',
    notes: '',
  });
  const [preview, setPreview] = useState<any>(null);

  // Fetch loan products
  const { data: products } = useQuery<LoanProduct[]>({
    queryKey: ['loan-products'],
    queryFn: async () => {
      const { data } = await api.get('/loans/products');
      return data.data;
    },
  });

  // Search borrowers
  const { data: borrowers } = useQuery({
    queryKey: ['borrower-search', borrowerSearch],
    queryFn: async () => {
      if (!borrowerSearch || borrowerSearch.length < 2) return [];
      const { data } = await api.get('/borrowers', { params: { search: borrowerSearch, perPage: 5 } });
      return data.data;
    },
    enabled: borrowerSearch.length >= 2 && !selectedBorrower,
  });

  // When product selected, prefill defaults
  useEffect(() => {
    if (form.loanProductId && products) {
      const product = products.find((p) => p.id === form.loanProductId);
      if (product) {
        setForm((f) => ({
          ...f,
          interestRate: String(product.interestRate),
          durationUnit: product.durationUnit,
          repaymentFrequency: product.repaymentFrequency,
          interestMethod: product.interestMethod,
        }));
      }
    }
  }, [form.loanProductId, products]);

  // Preview mutation
  const previewMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/loans/preview', {
        principalAmount: parseFloat(form.principalAmount),
        interestRate: parseFloat(form.interestRate),
        durationValue: parseInt(form.durationValue),
        durationUnit: form.durationUnit,
        repaymentFrequency: form.repaymentFrequency,
        interestMethod: form.interestMethod,
        startDate: new Date().toISOString(),
      });
      return data.data;
    },
    onSuccess: (data) => setPreview(data),
    onError: (err: any) => toast.error(err.response?.data?.message || 'Preview failed'),
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/loans', {
        borrowerId: selectedBorrower!.id,
        loanProductId: form.loanProductId,
        principalAmount: parseFloat(form.principalAmount),
        interestRate: parseFloat(form.interestRate),
        durationValue: parseInt(form.durationValue),
        durationUnit: form.durationUnit,
        repaymentFrequency: form.repaymentFrequency,
        interestMethod: form.interestMethod,
        purpose: form.purpose || undefined,
        notes: form.notes || undefined,
      });
      return data.data;
    },
    onSuccess: (data) => {
      toast.success('Loan created successfully');
      navigate(`/loans/${data.id}`);
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to create loan'),
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setPreview(null);
  };

  const canPreview = form.principalAmount && form.interestRate && form.durationValue;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="btn-secondary p-2"><ArrowLeft size={18} /></button>
        <h1 className="text-2xl font-bold text-gray-800">Create New Loan</h1>
      </div>

      {/* Borrower selection */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">Select Borrower</h3>
        {selectedBorrower ? (
          <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div>
              <p className="font-medium text-gray-900">{selectedBorrower.firstName} {selectedBorrower.lastName}</p>
              <p className="text-sm text-gray-600">ID: {selectedBorrower.nationalId} | Phone: {selectedBorrower.phone}</p>
            </div>
            <button className="btn-secondary text-sm" onClick={() => { setSelectedBorrower(null); setBorrowerSearch(''); }}>
              Change
            </button>
          </div>
        ) : (
          <div className="relative">
            <input
              className="input"
              placeholder="Search borrower by name, phone, or National ID..."
              value={borrowerSearch}
              onChange={(e) => setBorrowerSearch(e.target.value)}
            />
            {borrowers && borrowers.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {borrowers.map((b: Borrower) => (
                  <button
                    key={b.id}
                    className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-0"
                    onClick={() => { setSelectedBorrower(b); setBorrowerSearch(''); }}
                  >
                    <p className="font-medium text-sm">{b.firstName} {b.lastName}</p>
                    <p className="text-xs text-gray-500">ID: {b.nationalId} | {b.phone}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Loan details */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">Loan Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label">Loan Product *</label>
            <select name="loanProductId" className="input" value={form.loanProductId} onChange={handleChange} required>
              <option value="">Select product...</option>
              {products?.map((p) => (
                <option key={p.id} value={p.id}>{p.name} ({p.interestRate}% {p.interestMethod})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Principal Amount (KES) *</label>
            <input name="principalAmount" type="number" className="input" value={form.principalAmount} onChange={handleChange} required min="1" />
          </div>
          <div>
            <label className="label">Interest Rate (% p.a.) *</label>
            <input name="interestRate" type="number" step="0.1" className="input" value={form.interestRate} onChange={handleChange} required />
          </div>
          <div>
            <label className="label">Duration *</label>
            <div className="flex gap-2">
              <input name="durationValue" type="number" className="input flex-1" value={form.durationValue} onChange={handleChange} required min="1" placeholder="e.g. 12" />
              <select name="durationUnit" className="input w-32" value={form.durationUnit} onChange={handleChange}>
                <option value="DAYS">Days</option>
                <option value="WEEKS">Weeks</option>
                <option value="MONTHS">Months</option>
              </select>
            </div>
          </div>
          <div>
            <label className="label">Repayment Frequency</label>
            <select name="repaymentFrequency" className="input" value={form.repaymentFrequency} onChange={handleChange}>
              <option value="DAILY">Daily</option>
              <option value="WEEKLY">Weekly</option>
              <option value="BIWEEKLY">Bi-Weekly</option>
              <option value="MONTHLY">Monthly</option>
            </select>
          </div>
          <div>
            <label className="label">Interest Method</label>
            <select name="interestMethod" className="input" value={form.interestMethod} onChange={handleChange}>
              <option value="FLAT">Flat Rate</option>
              <option value="REDUCING_BALANCE">Reducing Balance</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="label">Purpose</label>
            <input name="purpose" className="input" value={form.purpose} onChange={handleChange} placeholder="e.g. Business expansion" />
          </div>
          <div className="md:col-span-2">
            <label className="label">Notes</label>
            <textarea name="notes" className="input" rows={2} value={form.notes} onChange={handleChange} />
          </div>
        </div>

        <div className="mt-4 flex gap-3">
          <button
            type="button"
            className="btn-secondary"
            disabled={!canPreview || previewMutation.isPending}
            onClick={() => previewMutation.mutate()}
          >
            <Calculator size={18} className="mr-1" />
            {previewMutation.isPending ? 'Calculating...' : 'Preview Schedule'}
          </button>
        </div>
      </div>

      {/* Preview */}
      {preview && (
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Loan Preview</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div>
              <p className="text-sm text-gray-500">Principal</p>
              <p className="text-lg font-bold">{formatCurrency(preview.principal)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Interest</p>
              <p className="text-lg font-bold text-blue-600">{formatCurrency(preview.totalInterest)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Due</p>
              <p className="text-lg font-bold text-red-600">{formatCurrency(preview.totalDue)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Installment</p>
              <p className="text-lg font-bold">{formatCurrency(preview.installmentAmount)}</p>
            </div>
          </div>

          {/* Schedule table */}
          <div className="table-container max-h-80 overflow-y-auto">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Due Date</th>
                  <th>Principal</th>
                  <th>Interest</th>
                  <th>Total</th>
                  <th>Balance</th>
                </tr>
              </thead>
              <tbody>
                {preview.schedule.map((item: any) => (
                  <tr key={item.installmentNumber}>
                    <td>{item.installmentNumber}</td>
                    <td>{new Date(item.dueDate).toLocaleDateString()}</td>
                    <td>{formatCurrency(item.principalAmount)}</td>
                    <td>{formatCurrency(item.interestAmount)}</td>
                    <td className="font-medium">{formatCurrency(item.totalAmount)}</td>
                    <td>{formatCurrency(item.balanceAfter)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Submit */}
      <div className="flex justify-end">
        <button
          className="btn-primary px-8"
          disabled={!selectedBorrower || !form.loanProductId || !form.principalAmount || !form.durationValue || createMutation.isPending}
          onClick={(e) => { e.preventDefault(); createMutation.mutate(); }}
        >
          <Save size={18} className="mr-2" />
          {createMutation.isPending ? 'Creating...' : 'Create Loan'}
        </button>
      </div>
    </div>
  );
}
