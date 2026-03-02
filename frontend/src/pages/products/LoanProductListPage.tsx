import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import { Plus, X, Package, ToggleLeft, ToggleRight, Pencil } from 'lucide-react';
import type { LoanProduct } from '../../types';
import { formatCurrency } from '../../lib/utils';

export default function LoanProductListPage() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editProduct, setEditProduct] = useState<LoanProduct | null>(null);

  const { data, isLoading } = useQuery<LoanProduct[]>({
    queryKey: ['products'],
    queryFn: async () => {
      const { data } = await api.get('/products');
      return data.data;
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.patch(`/products/${id}/toggle`);
    },
    onSuccess: () => {
      toast.success('Product status updated');
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed'),
  });

  const openEdit = (p: LoanProduct) => { setEditProduct(p); setShowModal(true); };
  const openCreate = () => { setEditProduct(null); setShowModal(true); };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Package size={28} className="text-primary-600" />
          <h1 className="text-2xl font-bold text-gray-800">Loan Products</h1>
        </div>
        <button className="btn-primary" onClick={openCreate}>
          <Plus size={18} className="mr-2" /> Add Product
        </button>
      </div>

      <div className="table-container">
        {isLoading ? (
          <div className="flex justify-center py-10"><div className="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full" /></div>
        ) : !data || data.length === 0 ? (
          <div className="text-center py-10 text-gray-500">No loan products configured yet</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Interest</th>
                <th>Method</th>
                <th>Min – Max Amount</th>
                <th>Duration Range</th>
                <th>Frequency</th>
                <th>Penalty</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.map((p) => (
                <tr key={p.id}>
                  <td className="font-medium">{p.name}</td>
                  <td>{p.interestRate}%</td>
                  <td className="text-sm">{p.interestMethod.replace(/_/g, ' ')}</td>
                  <td className="text-sm">{formatCurrency(p.minAmount)} – {formatCurrency(p.maxAmount)}</td>
                  <td className="text-sm">{p.minDuration} – {p.maxDuration} {p.durationUnit.toLowerCase()}</td>
                  <td className="text-sm">{p.repaymentFrequency}</td>
                  <td className="text-sm">{p.penaltyRate ? `${p.penaltyRate}%` : '—'}</td>
                  <td>
                    <span className={`badge ${p.isActive ? 'badge-green' : 'badge-red'}`}>
                      {p.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <div className="flex gap-1">
                      <button className="btn-secondary px-2 py-1 text-xs" onClick={() => openEdit(p)} title="Edit">
                        <Pencil size={14} />
                      </button>
                      <button
                        className="btn-secondary px-2 py-1 text-xs"
                        onClick={() => toggleMutation.mutate(p.id)}
                        title={p.isActive ? 'Deactivate' : 'Activate'}
                      >
                        {p.isActive ? <ToggleRight size={14} className="text-green-600" /> : <ToggleLeft size={14} className="text-gray-400" />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <ProductFormModal
          product={editProduct}
          onClose={() => { setShowModal(false); setEditProduct(null); }}
        />
      )}
    </div>
  );
}

function ProductFormModal({ product, onClose }: { product: LoanProduct | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const isEdit = !!product;

  const [form, setForm] = useState({
    name: product?.name || '',
    description: product?.description || '',
    interestRate: product?.interestRate ?? 10,
    interestMethod: product?.interestMethod || 'FLAT_RATE',
    interestPeriod: 'PER_ANNUM',
    durationUnit: product?.durationUnit || 'MONTHS',
    repaymentFrequency: product?.repaymentFrequency || 'MONTHLY',
    minAmount: product?.minAmount ?? 1000,
    maxAmount: product?.maxAmount ?? 1000000,
    minDurationUnits: product?.minDuration ?? 1,
    maxDurationUnits: product?.maxDuration ?? 24,
    penaltyRate: product?.penaltyRate ?? 0,
    penaltyGraceDays: product?.penaltyGraceDays ?? 3,
    requiresApproval: true,
    isActive: product?.isActive ?? true,
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = {
        ...form,
        interestRate: Number(form.interestRate),
        minAmount: Number(form.minAmount),
        maxAmount: Number(form.maxAmount),
        minDurationUnits: Number(form.minDurationUnits),
        maxDurationUnits: Number(form.maxDurationUnits),
        penaltyRate: Number(form.penaltyRate),
        penaltyGraceDays: Number(form.penaltyGraceDays),
      };
      if (isEdit) {
        await api.put(`/products/${product!.id}`, payload);
      } else {
        await api.post('/products', payload);
      }
    },
    onSuccess: () => {
      toast.success(isEdit ? 'Product updated' : 'Product created');
      queryClient.invalidateQueries({ queryKey: ['products'] });
      onClose();
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed'),
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white z-10">
          <h3 className="text-lg font-semibold">{isEdit ? 'Edit Loan Product' : 'New Loan Product'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <label className="label">Product Name *</label>
            <input name="name" className="input" value={form.name} onChange={handleChange} placeholder="e.g. Business Loan" required />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea name="description" className="input" rows={2} value={form.description} onChange={handleChange} placeholder="Brief description..." />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div>
              <label className="label">Interest Rate (%) *</label>
              <input name="interestRate" type="number" step="0.1" min="0" className="input" value={form.interestRate} onChange={handleChange} />
            </div>
            <div>
              <label className="label">Interest Method *</label>
              <select name="interestMethod" className="input" value={form.interestMethod} onChange={handleChange}>
                <option value="FLAT_RATE">Flat Rate</option>
                <option value="REDUCING_BALANCE">Reducing Balance</option>
              </select>
            </div>
            <div>
              <label className="label">Duration Unit *</label>
              <select name="durationUnit" className="input" value={form.durationUnit} onChange={handleChange}>
                <option value="DAYS">Days</option>
                <option value="WEEKS">Weeks</option>
                <option value="MONTHS">Months</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Repayment Frequency *</label>
              <select name="repaymentFrequency" className="input" value={form.repaymentFrequency} onChange={handleChange}>
                <option value="DAILY">Daily</option>
                <option value="WEEKLY">Weekly</option>
                <option value="BIWEEKLY">Bi-weekly</option>
                <option value="MONTHLY">Monthly</option>
              </select>
            </div>
            <div>
              <label className="label">Penalty Rate (%)</label>
              <input name="penaltyRate" type="number" step="0.1" min="0" className="input" value={form.penaltyRate} onChange={handleChange} />
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="label">Min Amount</label>
              <input name="minAmount" type="number" min="0" className="input" value={form.minAmount} onChange={handleChange} />
            </div>
            <div>
              <label className="label">Max Amount</label>
              <input name="maxAmount" type="number" min="0" className="input" value={form.maxAmount} onChange={handleChange} />
            </div>
            <div>
              <label className="label">Min Duration</label>
              <input name="minDurationUnits" type="number" min="1" className="input" value={form.minDurationUnits} onChange={handleChange} />
            </div>
            <div>
              <label className="label">Max Duration</label>
              <input name="maxDurationUnits" type="number" min="1" className="input" value={form.maxDurationUnits} onChange={handleChange} />
            </div>
          </div>
          <div>
            <label className="label">Penalty Grace Days</label>
            <input name="penaltyGraceDays" type="number" min="0" className="input w-32" value={form.penaltyGraceDays} onChange={handleChange} />
          </div>
        </div>
        <div className="flex justify-end gap-2 p-4 border-t">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button
            className="btn-primary"
            disabled={!form.name || mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? 'Saving...' : isEdit ? 'Update Product' : 'Create Product'}
          </button>
        </div>
      </div>
    </div>
  );
}
