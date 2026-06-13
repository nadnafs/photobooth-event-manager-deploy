import React, { useState, useEffect } from 'react';
import apiClient from '../../services/apiClient';
import { useAuth } from '../../context/AuthContext';
import { Plus, Edit, Trash2, X } from 'lucide-react';

const OwnerUsers = () => {
  const [users, setUsers] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ id: '', email: '', name: '', role: 'KASIR', password: '' });

  const fetchUsers = async () => {
    try {
      const res = await apiClient.get('/users');
      setUsers(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (formData.id) {
        await apiClient.put(`/users/${formData.id}`, formData);
      } else {
        await apiClient.post('/users', formData);
      }
      setIsModalOpen(false);
      fetchUsers();
    } catch (error) {
      alert(error.response?.data?.message || 'Gagal menyimpan user');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Yakin ingin menghapus user ini?')) return;
    try {
      await apiClient.delete(`/users/${id}`);
      fetchUsers();
    } catch (error) {
      alert('Gagal menghapus user');
    }
  };

  const openModal = (user = null) => {
    if (user) setFormData({ ...user, password: '' });
    else setFormData({ id: '', email: '', name: '', role: 'KASIR', password: '' });
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-textMain">Kelola User</h1>
        <button onClick={() => openModal()} className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-xl hover:bg-blue-700">
          <Plus size={20} /> Tambah User
        </button>
      </div>

      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-border">
            <tr>
              <th className="px-6 py-4 text-sm font-semibold text-textSecondary">Nama</th>
              <th className="px-6 py-4 text-sm font-semibold text-textSecondary">Email / Username</th>
              <th className="px-6 py-4 text-sm font-semibold text-textSecondary">Role</th>
              <th className="px-6 py-4 text-sm font-semibold text-textSecondary">Dibuat Pada</th>
              <th className="px-6 py-4 text-sm font-semibold text-textSecondary text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {users.map(u => (
              <tr key={u.id} className="hover:bg-slate-50/50">
                <td className="px-6 py-4 font-medium text-textMain">{u.name}</td>
                <td className="px-6 py-4 text-textSecondary">{u.email}</td>
                <td className="px-6 py-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${u.role === 'KASIR' ? 'bg-primary/10 text-primary' : 'bg-success/10 text-success'}`}>
                    {u.role}
                  </span>
                </td>
                <td className="px-6 py-4 text-textSecondary">{new Date(u.created_at).toLocaleDateString('id-ID')}</td>
                <td className="px-6 py-4 text-right space-x-3">
                  <button onClick={() => openModal(u)} className="text-primary hover:text-blue-700"><Edit size={18} /></button>
                  <button onClick={() => handleDelete(u.id)} className="text-danger hover:text-red-700"><Trash2 size={18} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-card p-6 rounded-2xl w-full max-w-md shadow-xl bg-white">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">{formData.id ? 'Edit User' : 'Tambah User'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-textSecondary hover:text-textMain"><X size={24} /></button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-textSecondary mb-1">Nama</label>
                <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-2 bg-slate-50 border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary/50" />
              </div>
              <div>
                <label className="block text-sm font-medium text-textSecondary mb-1">Email / Username</label>
                <input required type="text" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full px-4 py-2 bg-slate-50 border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary/50" />
              </div>
              <div>
                <label className="block text-sm font-medium text-textSecondary mb-1">Role</label>
                <select required value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} className="w-full px-4 py-2 bg-slate-50 border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary/50 bg-white">
                  <option value="KASIR">KASIR</option>
                  <option value="PENERIMA">PENERIMA</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-textSecondary mb-1">Password {formData.id && '(Kosongkan jika tidak diubah)'}</label>
                <input required={!formData.id} type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full px-4 py-2 bg-slate-50 border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary/50" />
              </div>
              
              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-textSecondary font-medium hover:bg-slate-100 rounded-xl">Batal</button>
                <button type="submit" className="px-6 py-2 bg-primary text-white font-medium rounded-xl hover:bg-blue-700">Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default OwnerUsers;
