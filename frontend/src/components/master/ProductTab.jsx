import React, { useState, useEffect } from 'react';
import apiClient from '../../services/apiClient';
import { Plus, CheckCircle, XCircle } from 'lucide-react';

const ProductTab = ({ eventId }) => {
  const [data, setData] = useState([]);
  const [categories, setCategories] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ id: null, category_id: '', name: '', description: '', price: '', unit: '' });

  const fetchData = async () => {
    try {
      const res = await apiClient.get(`/events/${eventId}/products`);
      setData(res.data);
    } catch (error) { console.error(error); }
  };

  const fetchCategories = async () => {
    try {
      const res = await apiClient.get(`/events/${eventId}/product-categories`);
      setCategories(res.data);
    } catch (error) { console.error(error); }
  };

  useEffect(() => {
    fetchData();
    fetchCategories();
  }, [eventId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Clean up empty string to null for category_id
      const payload = { ...formData, category_id: formData.category_id || null };
      if (formData.id) {
        await apiClient.put(`/products/${formData.id}`, payload);
      } else {
        await apiClient.post(`/events/${eventId}/products`, payload);
      }
      setIsModalOpen(false);
      fetchData();
    } catch (error) { alert('Gagal menyimpan'); }
  };

  const handleToggle = async (id, currentStatus) => {
    try {
      await apiClient.patch(`/products/${id}/status`, { is_active: !currentStatus });
      fetchData();
    } catch (error) { alert('Gagal update status'); }
  };

  const formatRupiah = (number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(number);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold text-textMain">Produk / Layanan</h3>
        <button onClick={() => { setFormData({ id: null, category_id: '', name: '', description: '', price: '', unit: '' }); setIsModalOpen(true); }} className="flex items-center gap-2 px-3 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-blue-700">
          <Plus size={16}/> Tambah Produk
        </button>
      </div>

      <div className="border border-border rounded-xl overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 border-b border-border">
            <tr>
              <th className="px-4 py-3 font-semibold text-textMain">Kategori</th>
              <th className="px-4 py-3 font-semibold text-textMain">Nama Produk</th>
              <th className="px-4 py-3 font-semibold text-textMain">Harga</th>
              <th className="px-4 py-3 font-semibold text-textMain">Satuan</th>
              <th className="px-4 py-3 font-semibold text-textMain">Status</th>
              <th className="px-4 py-3 font-semibold text-textMain text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data.map(item => (
              <tr key={item.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 text-textSecondary">{item.category_name || '-'}</td>
                <td className="px-4 py-3 font-medium text-textMain">
                  {item.name}
                  {item.description && <div className="text-xs text-textSecondary mt-0.5">{item.description}</div>}
                </td>
                <td className="px-4 py-3 text-textMain font-medium">{formatRupiah(item.price)}</td>
                <td className="px-4 py-3 text-textSecondary">{item.unit || '-'}</td>
                <td className="px-4 py-3">
                  {item.is_active ? <span className="px-2 py-1 bg-success/10 text-success text-xs font-semibold rounded-full flex items-center gap-1 w-fit"><CheckCircle size={12}/> Aktif</span> : <span className="px-2 py-1 bg-danger/10 text-danger text-xs font-semibold rounded-full flex items-center gap-1 w-fit"><XCircle size={12}/> Nonaktif</span>}
                </td>
                <td className="px-4 py-3 text-right space-x-2">
                  <button onClick={() => { setFormData({...item, category_id: item.category_id || ''}); setIsModalOpen(true); }} className="px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg text-xs font-medium">Edit</button>
                  <button onClick={() => handleToggle(item.id, item.is_active)} className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium">
                    {item.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                  </button>
                </td>
              </tr>
            ))}
            {data.length === 0 && <tr><td colSpan="6" className="text-center p-6 text-textSecondary">Belum ada produk.</td></tr>}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card w-full max-w-md rounded-2xl p-6 shadow-xl">
            <h3 className="font-bold text-lg mb-4 text-textMain">{formData.id ? 'Edit' : 'Tambah'} Produk / Layanan</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Kategori Produk</label>
                <select className="w-full border border-border p-2 rounded-lg outline-none focus:ring-2 focus:ring-primary/50" value={formData.category_id} onChange={e => setFormData({...formData, category_id: e.target.value})}>
                  <option value="">-- Pilih Kategori --</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Nama Produk</label>
                <input required className="w-full border border-border p-2 rounded-lg outline-none focus:ring-2 focus:ring-primary/50" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Contoh: Foto 1 Kali" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Deskripsi Singkat</label>
                <input className="w-full border border-border p-2 rounded-lg outline-none focus:ring-2 focus:ring-primary/50" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="Opsional" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Harga (Rp)</label>
                  <input required type="number" min="0" className="w-full border border-border p-2 rounded-lg outline-none focus:ring-2 focus:ring-primary/50" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Satuan</label>
                  <input className="w-full border border-border p-2 rounded-lg outline-none focus:ring-2 focus:ring-primary/50" value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value})} placeholder="Sesi / Pcs" />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border rounded-lg hover:bg-slate-50 font-medium">Batal</button>
                <button type="submit" className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-700 font-medium">Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductTab;
