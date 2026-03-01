import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import { formatDate } from '../../lib/utils';
import toast from 'react-hot-toast';
import { Search, Plus, UserCog, ChevronLeft, ChevronRight, Shield, X } from 'lucide-react';

interface UserItem {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
  userRoles?: { role: { name: string } }[];
}

export default function UserListPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [editUser, setEditUser] = useState<UserItem | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['users', page, search],
    queryFn: async () => {
      const params: any = { page, perPage: 15 };
      if (search) params.search = search;
      const { data } = await api.get('/users', { params });
      return data;
    },
  });

  const users: UserItem[] = data?.data || [];
  const meta = data?.meta;

  const toggleActiveMutation = useMutation({
    mutationFn: async (userId: string) => {
      await api.patch(`/users/${userId}/deactivate`);
    },
    onSuccess: () => {
      toast.success('User status updated');
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed'),
  });

  const getRoles = (user: UserItem) => user.userRoles?.map((r) => r.role.name).join(', ') || '—';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-800">User Management</h1>
        <button className="btn-primary" onClick={() => setShowCreate(true)}>
          <Plus size={18} className="mr-2" /> Add User
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
        <input
          className="input pl-10"
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
      </div>

      {/* Table */}
      <div className="table-container">
        {isLoading ? (
          <div className="flex justify-center py-10"><div className="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full" /></div>
        ) : users.length === 0 ? (
          <div className="text-center py-10 text-gray-500">No users found</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Roles</th>
                <th>Status</th>
                <th>Last Login</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="font-medium">{u.firstName} {u.lastName}</td>
                  <td className="text-sm">{u.email}</td>
                  <td className="text-sm">{u.phone || '—'}</td>
                  <td>
                    <div className="flex flex-wrap gap-1">
                      {u.userRoles?.map((r) => (
                        <span key={r.role.name} className="badge badge-blue text-xs">{r.role.name.replace('_', ' ')}</span>
                      ))}
                    </div>
                  </td>
                  <td><span className={`badge ${u.isActive ? 'badge-green' : 'badge-red'}`}>{u.isActive ? 'Active' : 'Inactive'}</span></td>
                  <td className="text-sm text-gray-500">{u.lastLoginAt ? formatDate(u.lastLoginAt) : 'Never'}</td>
                  <td>
                    <div className="flex gap-1">
                      <button
                        className="btn-secondary px-2 py-1 text-xs"
                        onClick={() => setEditUser(u)}
                        title="Edit"
                      >
                        <UserCog size={14} />
                      </button>
                      <button
                        className={`px-2 py-1 text-xs rounded ${u.isActive ? 'btn-danger' : 'btn-primary'}`}
                        onClick={() => {
                          if (confirm(`${u.isActive ? 'Deactivate' : 'Activate'} ${u.firstName}?`)) {
                            toggleActiveMutation.mutate(u.id);
                          }
                        }}
                      >
                        {u.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Showing {((meta.page - 1) * meta.perPage) + 1}–{Math.min(meta.page * meta.perPage, meta.total)} of {meta.total}
          </p>
          <div className="flex gap-2">
            <button className="btn-secondary p-2" disabled={meta.page <= 1} onClick={() => setPage(meta.page - 1)}>
              <ChevronLeft size={18} />
            </button>
            <button className="btn-secondary p-2" disabled={meta.page >= meta.totalPages} onClick={() => setPage(meta.page + 1)}>
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showCreate && <UserFormModal onClose={() => setShowCreate(false)} />}
      {editUser && <UserFormModal user={editUser} onClose={() => setEditUser(null)} />}
    </div>
  );
}

function UserFormModal({ user, onClose }: { user?: UserItem; onClose: () => void }) {
  const queryClient = useQueryClient();
  const isEdit = !!user;

  const [form, setForm] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    phone: user?.phone || '',
    password: '',
    role: user?.userRoles?.[0]?.role.name || 'LOAN_OFFICER',
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const body: any = {
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        phone: form.phone || undefined,
        role: form.role,
      };
      if (!isEdit) body.password = form.password;
      if (isEdit) {
        await api.put(`/users/${user!.id}`, body);
      } else {
        await api.post('/users', body);
      }
    },
    onSuccess: () => {
      toast.success(isEdit ? 'User updated' : 'User created');
      queryClient.invalidateQueries({ queryKey: ['users'] });
      onClose();
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed'),
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold">{isEdit ? 'Edit User' : 'Create User'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">First Name *</label>
              <input name="firstName" className="input" value={form.firstName} onChange={handleChange} required />
            </div>
            <div>
              <label className="label">Last Name *</label>
              <input name="lastName" className="input" value={form.lastName} onChange={handleChange} required />
            </div>
          </div>
          <div>
            <label className="label">Email *</label>
            <input name="email" type="email" className="input" value={form.email} onChange={handleChange} required />
          </div>
          <div>
            <label className="label">Phone</label>
            <input name="phone" className="input" value={form.phone} onChange={handleChange} />
          </div>
          {!isEdit && (
            <div>
              <label className="label">Password *</label>
              <input name="password" type="password" className="input" value={form.password} onChange={handleChange} required minLength={8} />
            </div>
          )}
          <div>
            <label className="label">Role *</label>
            <select name="role" className="input" value={form.role} onChange={handleChange}>
              <option value="SYSTEM_ADMIN">System Admin</option>
              <option value="LOAN_OFFICER">Loan Officer</option>
              <option value="ACCOUNTANT">Accountant</option>
              <option value="BORROWER">Borrower</option>
              <option value="INVESTOR">Investor</option>
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-2 p-4 border-t">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button
            className="btn-primary"
            disabled={!form.firstName || !form.lastName || !form.email || (!isEdit && !form.password) || mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? 'Saving...' : isEdit ? 'Update' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}
