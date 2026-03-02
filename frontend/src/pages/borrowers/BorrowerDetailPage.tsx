import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import { formatCurrency, formatDate, statusBadgeClass } from '../../lib/utils';
import { ArrowLeft, Phone, Mail, MapPin, Briefcase, User, AlertTriangle, Edit, FileUp, Trash2, Download } from 'lucide-react';
import type { Borrower, Loan } from '../../types';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';

export default function BorrowerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { hasRole } = useAuth();

  const { data: borrower, isLoading, error } = useQuery<Borrower & { loans?: Loan[]; stats?: any }>({
    queryKey: ['borrower', id],
    queryFn: async () => {
      const { data } = await api.get(`/borrowers/${id}`);
      return data.data;
    },
  });

  const { data: stats } = useQuery({
    queryKey: ['borrower-stats', id],
    queryFn: async () => {
      const { data } = await api.get(`/borrowers/${id}/stats`);
      return data.data;
    },
    enabled: !!id,
  });

  if (isLoading) return <div className="flex justify-center py-20"><div className="animate-spin h-10 w-10 border-4 border-primary-500 border-t-transparent rounded-full" /></div>;
  if (error || !borrower) return <div className="text-center py-20 text-red-600">Borrower not found</div>;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="btn-secondary p-2"><ArrowLeft size={18} /></button>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">{borrower.firstName} {borrower.lastName}</h1>
            <p className="text-sm text-gray-500">National ID: {borrower.nationalId}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => navigate(`/borrowers/${borrower.id}/edit`)} className="btn-secondary text-sm flex items-center gap-1"><Edit size={16} /> Edit</button>
          <span className={`badge ${borrower.isActive ? 'badge-green' : 'badge-red'}`}>{borrower.isActive ? 'Active' : 'Inactive'}</span>
          {borrower.riskRating && <span className={`badge ${statusBadgeClass(borrower.riskRating)}`}>{borrower.riskRating}</span>}
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="card text-center">
            <p className="text-sm text-gray-500">Total Loans</p>
            <p className="text-2xl font-bold">{stats.totalLoans}</p>
          </div>
          <div className="card text-center">
            <p className="text-sm text-gray-500">Active Loans</p>
            <p className="text-2xl font-bold text-blue-600">{stats.activeLoans}</p>
          </div>
          <div className="card text-center">
            <p className="text-sm text-gray-500">Total Disbursed</p>
            <p className="text-xl font-bold">{formatCurrency(stats.totalDisbursed || 0)}</p>
          </div>
          <div className="card text-center">
            <p className="text-sm text-gray-500">Outstanding</p>
            <p className={`text-xl font-bold ${(stats.totalOutstanding || 0) > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {formatCurrency(stats.totalOutstanding || 0)}
            </p>
          </div>
        </div>
      )}

      {/* Contact & Personal */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2"><User size={18} /> Personal Information</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">Full Name</span><span className="font-medium">{borrower.firstName} {borrower.lastName}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Gender</span><span className="font-medium">{borrower.gender || '—'}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Date of Birth</span><span className="font-medium">{borrower.dateOfBirth ? formatDate(borrower.dateOfBirth) : '—'}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">National ID</span><span className="font-medium">{borrower.nationalId}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Registered</span><span className="font-medium">{formatDate(borrower.createdAt)}</span></div>
          </div>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2"><Phone size={18} /> Contact Information</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">Phone</span><span className="font-medium">{borrower.phone}</span></div>
            {borrower.alternativePhone && <div className="flex justify-between"><span className="text-gray-500">Alt Phone</span><span className="font-medium">{borrower.alternativePhone}</span></div>}
            {borrower.email && <div className="flex justify-between"><span className="text-gray-500">Email</span><span className="font-medium">{borrower.email}</span></div>}
          </div>

          <h3 className="text-lg font-semibold mt-5 mb-3 flex items-center gap-2"><MapPin size={18} /> Address</h3>
          <div className="space-y-2 text-sm">
            {borrower.address && <div className="flex justify-between"><span className="text-gray-500">Address</span><span className="font-medium">{borrower.address}</span></div>}
            {borrower.county && <div className="flex justify-between"><span className="text-gray-500">County</span><span className="font-medium">{borrower.county}</span></div>}
            {borrower.subCounty && <div className="flex justify-between"><span className="text-gray-500">Sub-County</span><span className="font-medium">{borrower.subCounty}</span></div>}
            {borrower.ward && <div className="flex justify-between"><span className="text-gray-500">Ward</span><span className="font-medium">{borrower.ward}</span></div>}

          </div>
        </div>
      </div>

      {/* Employment & Next of Kin */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2"><Briefcase size={18} /> Employment & Income</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">Occupation</span><span className="font-medium">{borrower.occupation || '—'}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Employer</span><span className="font-medium">{borrower.employer || '—'}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Monthly Income</span><span className="font-medium">{borrower.monthlyIncome ? formatCurrency(Number(borrower.monthlyIncome)) : '—'}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Risk Rating</span><span className="font-medium">{borrower.riskRating}</span></div>
          </div>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2"><AlertTriangle size={18} /> Next of Kin</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">Name</span><span className="font-medium">{borrower.nextOfKinName || '—'}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Phone</span><span className="font-medium">{borrower.nextOfKinPhone || '—'}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Relationship</span><span className="font-medium">{borrower.nextOfKinRelationship || '—'}</span></div>
          </div>
        </div>
      </div>

      {/* Loans Table */}
      {(borrower as any).loans && (borrower as any).loans.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold">Loan History</h3>
            <Link to={`/loans/new?borrowerId=${borrower.id}`} className="btn-primary text-sm">New Loan</Link>
          </div>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Loan #</th>
                  <th>Product</th>
                  <th>Principal</th>
                  <th>Outstanding</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {(borrower as any).loans.map((l: any) => (
                  <tr key={l.id} className="cursor-pointer hover:bg-gray-50" onClick={() => navigate(`/loans/${l.id}`)}>
                    <td className="font-mono text-sm">{l.loanNumber}</td>
                    <td>{l.loanProduct?.name || '—'}</td>
                    <td>{formatCurrency(l.principalAmount)}</td>
                    <td className={l.outstandingBalance > 0 ? 'text-red-600 font-medium' : 'text-green-600'}>
                      {formatCurrency(l.outstandingBalance || 0)}
                    </td>
                    <td><span className={`badge ${statusBadgeClass(l.status)}`}>{l.status}</span></td>
                    <td>{formatDate(l.applicationDate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Notes */}
      {borrower.notes && (
        <div className="card">
          <h3 className="text-lg font-semibold mb-2">Notes</h3>
          <p className="text-sm text-gray-600 whitespace-pre-wrap">{borrower.notes}</p>
        </div>
      )}

      {/* Documents Section */}
      <DocumentSection borrowerId={borrower.id} />
    </div>
  );
}

function DocumentSection({ borrowerId }: { borrowerId: string }) {
  const queryClient = useQueryClient();
  const { hasRole } = useAuth();
  const [showUpload, setShowUpload] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [docType, setDocType] = useState('ID_COPY');

  const { data: docs } = useQuery({
    queryKey: ['documents', borrowerId],
    queryFn: async () => {
      const { data } = await api.get(`/documents/borrower/${borrowerId}`);
      return data.data;
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error('No file');
      const formData = new FormData();
      formData.append('file', file);
      formData.append('borrowerId', borrowerId);
      formData.append('documentType', docType);
      await api.post('/documents', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    },
    onSuccess: () => {
      toast.success('Document uploaded');
      queryClient.invalidateQueries({ queryKey: ['documents', borrowerId] });
      setShowUpload(false);
      setFile(null);
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Upload failed'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (docId: string) => {
      await api.delete(`/documents/${docId}`);
    },
    onSuccess: () => {
      toast.success('Document deleted');
      queryClient.invalidateQueries({ queryKey: ['documents', borrowerId] });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Delete failed'),
  });

  const handleDownload = async (docId: string, fileName: string) => {
    try {
      const resp = await api.get(`/documents/${docId}/download`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([resp.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error('Download failed');
    }
  };

  const docTypes = ['ID_COPY', 'PASSPORT', 'KRA_PIN', 'PAYSLIP', 'BANK_STATEMENT', 'COLLATERAL', 'CONTRACT', 'OTHER'];

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold flex items-center gap-2"><FileUp size={18} /> Documents</h3>
        {(hasRole('SYSTEM_ADMIN') || hasRole('LOAN_OFFICER')) && (
          <button className="btn-primary text-sm" onClick={() => setShowUpload(!showUpload)}>
            <FileUp size={14} className="mr-1" /> Upload
          </button>
        )}
      </div>

      {showUpload && (
        <div className="bg-gray-50 rounded-lg p-4 mb-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Document Type</label>
              <select className="input" value={docType} onChange={(e) => setDocType(e.target.value)}>
                {docTypes.map((t) => (
                  <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">File</label>
              <input
                type="file"
                className="input"
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              className="btn-primary text-sm"
              onClick={() => uploadMutation.mutate()}
              disabled={!file || uploadMutation.isPending}
            >
              {uploadMutation.isPending ? 'Uploading...' : 'Upload'}
            </button>
            <button className="btn-secondary text-sm" onClick={() => setShowUpload(false)}>Cancel</button>
          </div>
        </div>
      )}

      {docs && docs.length > 0 ? (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Type</th>
                <th>File Name</th>
                <th>Size</th>
                <th>Uploaded</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {docs.map((d: any) => (
                <tr key={d.id}>
                  <td className="font-medium text-sm">{d.documentType.replace(/_/g, ' ')}</td>
                  <td className="text-sm">{d.fileName}</td>
                  <td className="text-sm text-gray-500">{(d.fileSize / 1024).toFixed(1)} KB</td>
                  <td className="text-sm text-gray-500">{formatDate(d.createdAt)}</td>
                  <td>
                    <div className="flex gap-1">
                      <button
                        className="btn-secondary px-2 py-1 text-xs"
                        onClick={() => handleDownload(d.id, d.fileName)}
                        title="Download"
                      >
                        <Download size={12} />
                      </button>
                      {hasRole('SYSTEM_ADMIN') && (
                        <button
                          className="btn-danger px-2 py-1 text-xs"
                          onClick={() => { if (confirm('Delete this document?')) deleteMutation.mutate(d.id); }}
                          title="Delete"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-gray-500 text-sm">No documents uploaded yet.</p>
      )}
    </div>
  );
}
