import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import { ArrowLeft, Save } from 'lucide-react';

export default function BorrowerFormPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    firstName: '', lastName: '', phone: '', nationalId: '',
    email: '', alternativePhone: '', dateOfBirth: '', gender: '',
    address: '', county: '', subCounty: '', ward: '',
    occupation: '', employer: '', monthlyIncome: '',
    nextOfKinName: '', nextOfKinPhone: '', nextOfKinRelationship: '',
    riskRating: 'STANDARD', notes: '',
  });

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const payload = { ...data };
      if (payload.monthlyIncome) payload.monthlyIncome = parseFloat(payload.monthlyIncome);
      else delete payload.monthlyIncome;
      // Remove empty strings
      Object.keys(payload).forEach((k) => { if (payload[k] === '') delete payload[k]; });
      const res = await api.post('/borrowers', payload);
      return res.data.data;
    },
    onSuccess: (data) => {
      toast.success('Borrower created successfully');
      navigate(`/borrowers/${data.id}`);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to create borrower');
    },
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(form);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="btn-secondary p-2">
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-2xl font-bold text-gray-800">Add New Borrower</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Personal Info */}
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Personal Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">First Name *</label>
              <input name="firstName" className="input" value={form.firstName} onChange={handleChange} required />
            </div>
            <div>
              <label className="label">Last Name *</label>
              <input name="lastName" className="input" value={form.lastName} onChange={handleChange} required />
            </div>
            <div>
              <label className="label">Phone Number *</label>
              <input name="phone" className="input" value={form.phone} onChange={handleChange} required placeholder="07XX XXX XXX" />
            </div>
            <div>
              <label className="label">Alternative Phone</label>
              <input name="alternativePhone" className="input" value={form.alternativePhone} onChange={handleChange} />
            </div>
            <div>
              <label className="label">National ID *</label>
              <input name="nationalId" className="input" value={form.nationalId} onChange={handleChange} required />
            </div>
            <div>
              <label className="label">Email</label>
              <input name="email" type="email" className="input" value={form.email} onChange={handleChange} />
            </div>
            <div>
              <label className="label">Date of Birth</label>
              <input name="dateOfBirth" type="date" className="input" value={form.dateOfBirth} onChange={handleChange} />
            </div>
            <div>
              <label className="label">Gender</label>
              <select name="gender" className="input" value={form.gender} onChange={handleChange}>
                <option value="">Select...</option>
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
          </div>
        </div>

        {/* Address */}
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Address</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="label">Physical Address</label>
              <input name="address" className="input" value={form.address} onChange={handleChange} />
            </div>
            <div>
              <label className="label">County</label>
              <input name="county" className="input" value={form.county} onChange={handleChange} placeholder="e.g. Kilifi" />
            </div>
            <div>
              <label className="label">Sub-County</label>
              <input name="subCounty" className="input" value={form.subCounty} onChange={handleChange} />
            </div>
            <div>
              <label className="label">Ward</label>
              <input name="ward" className="input" value={form.ward} onChange={handleChange} />
            </div>
          </div>
        </div>

        {/* Employment */}
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Employment & Income</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Occupation</label>
              <input name="occupation" className="input" value={form.occupation} onChange={handleChange} />
            </div>
            <div>
              <label className="label">Employer</label>
              <input name="employer" className="input" value={form.employer} onChange={handleChange} />
            </div>
            <div>
              <label className="label">Monthly Income (KES)</label>
              <input name="monthlyIncome" type="number" className="input" value={form.monthlyIncome} onChange={handleChange} />
            </div>
            <div>
              <label className="label">Risk Rating</label>
              <select name="riskRating" className="input" value={form.riskRating} onChange={handleChange}>
                <option value="LOW">Low</option>
                <option value="STANDARD">Standard</option>
                <option value="HIGH">High</option>
                <option value="BLACKLISTED">Blacklisted</option>
              </select>
            </div>
          </div>
        </div>

        {/* Next of Kin */}
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Next of Kin</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="label">Name</label>
              <input name="nextOfKinName" className="input" value={form.nextOfKinName} onChange={handleChange} />
            </div>
            <div>
              <label className="label">Phone</label>
              <input name="nextOfKinPhone" className="input" value={form.nextOfKinPhone} onChange={handleChange} />
            </div>
            <div>
              <label className="label">Relationship</label>
              <input name="nextOfKinRelationship" className="input" value={form.nextOfKinRelationship} onChange={handleChange} />
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="card">
          <label className="label">Notes</label>
          <textarea name="notes" className="input" rows={3} value={form.notes} onChange={handleChange} />
        </div>

        <div className="flex justify-end">
          <button type="submit" disabled={mutation.isPending} className="btn-primary px-8">
            <Save size={18} className="mr-2" />
            {mutation.isPending ? 'Saving...' : 'Save Borrower'}
          </button>
        </div>
      </form>
    </div>
  );
}
