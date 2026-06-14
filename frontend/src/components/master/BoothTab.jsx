import React, { useState, useEffect } from 'react';
import apiClient from '../../services/apiClient';
import { Plus, CheckCircle, XCircle } from 'lucide-react';

const BoothTab = ({ eventId }) => {
  const [data, setData] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ id: null, name: '', code: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [togglingId, setTogglingId] = useState(null);

  const fetchData = async () => {
    try {
      const res = await apiClient.get(`/events/${eventId}/booths`);
      setData(res.data);
    } catch (error) { console.error(error); }
  };

  useEffect(() => { fetchData(); }, [eventId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    try {
      setIsSubmitting(true);
      if (formData.id) {
        await apiClient.put(`/booths/${formData.id}`, formData);
      } else {
        await apiClient.post(`/events/${eventId}/booths`, formData);
      }
      setIsModalOpen(false);
      fetchData();
    } catch (error) { alert('Gagal menyimpan'); } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggle = async (id, currentStatus) => {
    if (togglingId) return;
    try {
      setTogglingId(id);
      await apiClient.patch(`/booths/${id}/status`, { is_active: !currentStatus });
      fetchData();
    } catch (error) { alert('Gagal update status'); } finally {
      setTogglingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold text-textMain">Booth / Layar</h3>
        <button onClick={() => { setFormData({ id: null, name: '', code: '' }); setIsModalOpen(true); }} className="flex items-center gap-2 px-3 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-blue-700">
          <Plus size={16}/> Tambah Booth
        </button>
      </div>

      <div className="border border-border rounded-xl overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 border-b border-border">
            <tr>
              <th className="px-4 py-3 font-semibold text-textMain">Nama Booth</th>
              <th className="px-4 py-3 font-semibold text-textMain">Kode</th>
              <th className="px-4 py-3 font-semibold text-textMain">Status</th>
              <th className="px-4 py-3 font-semibold text-textMain text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data.map(item => (
              <tr key={item.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-textMain">{item.name}</td>
                <td className="px-4 py-3 text-textSecondary">{item.code}</td>
                <td className="px-4 py-3">
                  {item.is_active ? <span className="px-2 py-1 bg-success/10 text-success text-xs font-semibold rounded-full flex items-center gap-1 w-fit"><CheckCircle size={12}/> Aktif</span> : <span className="px-2 py-1 bg-danger/10 text-danger text-xs font-semibold rounded-full flex items-center gap-1 w-fit"><XCircle size={12}/> Nonaktif</span>}
                </td>
                <td className="px-4 py-3 text-right space-x-2">
                  <button onClick={() => { setFormData(item); setIsModalOpen(true); }} className="px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg text-xs font-medium">Edit</button>
                  <button
                    onClick={() => handleToggle(item.id, item.is_active)}
                    disabled={togglingId === item.id}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {togglingId === item.id ? '...' : (item.is_active ? 'Nonaktifkan' : 'Aktifkan')}
                  </button>
                </td>
              </tr>
            ))}
            {data.length === 0 && <tr><td colSpan="4" className="text-center p-6 text-textSecondary">Belum ada booth.</td></tr>}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card w-full max-w-md rounded-2xl p-6 shadow-xl">
            <h3 className="font-bold text-lg mb-4 text-textMain">{formData.id ? 'Edit' : 'Tambah'} Booth / Layar</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Nama Booth</label>
                <input required className="w-full border border-border p-2 rounded-lg outline-none focus:ring-2 focus:ring-primary/50" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Contoh: Booth A" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Kode Booth</label>
                <input required className="w-full border border-border p-2 rounded-lg outline-none focus:ring-2 focus:ring-primary/50" value={formData.code} onChange={e => setFormData({...formData, code: e.target.value})} placeholder="Contoh: A" />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} disabled={isSubmitting} className="px-4 py-2 border rounded-lg hover:bg-slate-50 font-medium disabled:opacity-60">Batal</button>
                <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-60 disabled:cursor-not-allowed">
                  {isSubmitting ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default BoothTab;
