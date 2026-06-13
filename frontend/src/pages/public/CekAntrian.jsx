import React, { useState } from 'react';
import apiClient from '../../services/apiClient';
import { Search, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const CekAntrian = () => {
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    if(q.length < 3) return alert('Masukkan minimal 3 huruf/angka');
    setLoading(true);
    try {
      const res = await apiClient.get(`/queue/public/search?q=${q}`);
      setResults(res.data);
    } catch(err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 font-sans">
      <div className="max-w-md mx-auto space-y-6 mt-10">
        
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-textMain mb-2">Cek Antrian & Status</h1>
          <p className="text-textSecondary">Cari menggunakan Nama Peserta atau Nomor Nota Pendaftaran.</p>
        </div>

        <form onSubmit={handleSearch} className="relative">
          <input 
            type="text" 
            className="w-full pl-6 pr-14 py-4 rounded-2xl border-2 border-slate-200 outline-none focus:border-primary text-lg shadow-sm font-medium"
            placeholder="Masukkan nama / nota..."
            value={q} onChange={e => setQ(e.target.value)}
          />
          <button type="submit" className="absolute right-3 top-3 bottom-3 bg-primary text-white w-10 flex items-center justify-center rounded-xl hover:bg-blue-700">
            <Search size={20}/>
          </button>
        </form>

        {loading && <div className="text-center py-10 font-bold text-textSecondary">Mencari...</div>}

        {!loading && results.length > 0 && (
          <div className="bg-white rounded-3xl shadow-sm border border-border p-2 space-y-2">
            {results.map(r => (
              <Link to={`/status/${r.receipt_number}`} key={r.receipt_number} className="flex justify-between items-center p-4 hover:bg-slate-50 rounded-2xl transition-colors">
                <div>
                  <h3 className="font-bold text-lg text-textMain">{r.participant_name}</h3>
                  <div className="text-sm font-medium text-textSecondary mt-1">Nota: {r.receipt_number} • Booth {r.booth_name}</div>
                </div>
                <div className="bg-slate-100 p-2 rounded-full text-slate-500">
                  <ChevronRight size={20}/>
                </div>
              </Link>
            ))}
          </div>
        )}

        {!loading && results.length === 0 && q.length >= 3 && (
           <div className="text-center py-10 text-textSecondary">Tidak ditemukan data yang cocok atau antrian belum aktif.</div>
        )}

      </div>
    </div>
  );
};
export default CekAntrian;
