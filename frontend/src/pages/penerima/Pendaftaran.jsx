import React, { useState, useEffect } from 'react';
import apiClient from '../../services/apiClient';
import { useAuth } from '../../context/AuthContext';
import { Plus, Trash, Check, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ListPendaftar from './ListPendaftar';

const Pendaftaran = () => {
  const [context, setContext] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    participant_name: '', phone: '', notes: '',
    participant_category_id: '', booth_id: '',
    payment_method: 'BELUM',
    items: [] // {product_id, quantity}
  });

  useEffect(() => {
    const fetchContext = async () => {
      try {
        const res = await apiClient.get('/transactions/active-event');
        setContext(res.data);
        if (res.data.participant_categories.length > 0) {
          setForm(f => ({ ...f, participant_category_id: res.data.participant_categories[0].id }));
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchContext();
  }, []);

  const addItem = (productId) => {
    setForm(f => {
      const exists = f.items.find(i => i.product_id === productId);
      if (exists) return { ...f, items: f.items.map(i => i.product_id === productId ? { ...i, quantity: i.quantity + 1 } : i) };
      return { ...f, items: [...f.items, { product_id: productId, quantity: 1 }] };
    });
  };

  const removeItem = (productId) => {
    setForm(f => ({ ...f, items: f.items.filter(i => i.product_id !== productId) }));
  };

  const calculateTotal = () => {
    if (!context) return 0;
    let total = 0;
    form.items.forEach(item => {
      const p = context.products.find(x => x.id === item.product_id);
      if (p) total += p.price * item.quantity;
    });
    return total;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.items.length === 0) return alert('Pilih minimal 1 produk');
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      const res = await apiClient.post('/transactions', form);

      setForm({
        participant_name: '', phone: '', notes: '',
        participant_category_id: context?.participant_categories[0]?.id || '', booth_id: '',
        payment_method: 'BELUM',
        items: []
      });
      // Memaksa ListPendaftar mereload antrean melalui custom event
      window.dispatchEvent(new Event('transactionAdded'));
    } catch (error) {
      alert(error.response?.data?.message || 'Gagal menyimpan');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (!context) return <div className="text-center p-10 bg-card rounded-xl shadow-sm text-textSecondary">Belum ada event aktif. Hubungi Kasir.</div>;

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <h1 className="text-2xl font-bold text-textMain">Pendaftaran Peserta - {context.event.name}</h1>

          <form id="pendaftaran-form" onSubmit={handleSubmit} className="bg-card p-6 rounded-2xl shadow-sm border border-border space-y-6">

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Nama Peserta *</label>
                <input required className="w-full border p-2.5 rounded-lg outline-none focus:ring-2 focus:ring-primary/50" value={form.participant_name} onChange={e => setForm({ ...form, participant_name: e.target.value.toUpperCase() })} placeholder="NAMA LENGKAP" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Kategori Peserta *</label>
                <select required className="w-full border p-2.5 rounded-lg outline-none focus:ring-2 focus:ring-primary/50" value={form.participant_category_id} onChange={e => setForm({ ...form, participant_category_id: e.target.value })}>
                  {context.participant_categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">No HP </label>
                <input type="tel" className="w-full border p-2.5 rounded-lg outline-none focus:ring-2 focus:ring-primary/50" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Pilih Booth (Atau Auto)</label>
                <select className="w-full border p-2.5 rounded-lg outline-none focus:ring-2 focus:ring-primary/50" value={form.booth_id} onChange={e => setForm({ ...form, booth_id: e.target.value })}>
                  <option value="">Otomatis (Paling Sepi)</option>
                  {context.booths.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Catatan</label>
                <input className="w-full border p-2.5 rounded-lg outline-none focus:ring-2 focus:ring-primary/50" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
              </div>
            </div>

            <div className="border-t border-border pt-4">
              <h3 className="font-bold text-textMain mb-3">Pilih Produk / Layanan</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {context.products.map(p => (
                  <div key={p.id} onClick={() => addItem(p.id)} className="border border-border p-3 rounded-xl cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors">
                    <div className="font-medium text-sm text-textMain line-clamp-1">{p.name}</div>
                    <div className="text-primary font-bold mt-1 text-sm">Rp {p.price.toLocaleString('id-ID')}</div>
                  </div>
                ))}
              </div>
            </div>

          </form>
        </div>

        <div>
          <div className="bg-card p-6 rounded-2xl shadow-sm border border-border sticky top-6">
            <h2 className="font-bold text-lg mb-4 flex items-center gap-2"><FileText size={20} /> Ringkasan Pesanan</h2>

            <div className="space-y-3 min-h-[150px]">
              {form.items.length === 0 && <div className="text-sm text-textSecondary text-center py-4">Belum ada produk dipilih</div>}
              {form.items.map(item => {
                const p = context.products.find(x => x.id === item.product_id);
                if (!p) return null;
                return (
                  <div key={item.product_id} className="flex justify-between items-center bg-slate-50 p-2 rounded-lg border border-slate-100">
                    <div className="flex-1 min-w-0 pr-2">
                      <div className="text-sm font-medium truncate">{p.name}</div>
                      <div className="text-xs text-textSecondary">{item.quantity} x Rp {p.price.toLocaleString()}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm">Rp {(p.price * item.quantity).toLocaleString()}</span>
                      <button onClick={() => removeItem(p.id)} className="text-danger p-1 hover:bg-danger/10 rounded"><Trash size={16} /></button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="border-t border-border mt-6 pt-4 space-y-4">
              <div className="flex justify-between items-center text-lg">
                <span className="font-medium">Total Harga</span>
                <span className="font-bold text-primary">Rp {calculateTotal().toLocaleString('id-ID')}</span>
              </div>
              <button disabled={isSubmitting} type="submit" form="pendaftaran-form" className="w-full py-3.5 bg-primary text-white rounded-xl font-bold text-lg hover:bg-blue-700 transition-colors shadow-sm mt-4 flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                {isSubmitting ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                ) : (
                  <Check size={20} />
                )}
                {isSubmitting ? 'Menyimpan...' : 'Simpan Pendaftaran'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Section List Pendaftar embedded below the form */}
      <div className="mt-12 pt-8 border-t border-border">

        <ListPendaftar />
      </div>
    </>
  );
};

export default Pendaftaran;
