import React from 'react';
import { Link } from 'react-router-dom';
import { HelpCircle, UserCheck, Calendar, TrendingUp, BarChart2, ShieldCheck, ArrowRight } from 'lucide-react';

const InfoOwner = () => {
  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-20 font-sans text-textMain">
      <div className="bg-gradient-to-r from-slate-800 to-slate-700 rounded-3xl p-8 text-white shadow-md">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <HelpCircle size={32} className="text-indigo-400" /> Panduan Penggunaan Owner
        </h1>
        <p className="text-slate-300 mt-2 text-sm leading-relaxed">
          Selamat datang di halaman bantuan operasional Owner. Ikuti langkah-langkah di bawah ini untuk mengelola akun kasir/penerima, memantau data event, melihat laporan keuangan transaksi, dan menganalisis omzet event.
        </p>
      </div>

      {/* TUGAS UTAMA */}
      <div className="bg-card p-6 rounded-2xl border border-border shadow-sm space-y-3">
        <h2 className="text-lg font-black text-slate-800 flex items-center gap-2 border-b pb-2">
          📌 Tugas Owner
        </h2>
        <p className="text-sm text-slate-600 leading-relaxed">
          Sebagai Owner, tugas utama Anda adalah melakukan pengawasan (supervisi) kinerja operasional kasir dan penerima tamu, mengelola otorisasi akun pengguna sistem (user credentials), memantau transaksi real-time di lapangan, serta menganalisis total omzet pendapatan untuk keperluan laporan bisnis.
        </p>
      </div>

      {/* LANGKAH PANDUAN */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold px-2">Langkah Panduan Operasional</h2>

        {/* 1. Mengelola User */}
        <div className="bg-card p-6 rounded-2xl border border-border shadow-sm flex items-start gap-4">
          <div className="bg-indigo-100 text-indigo-700 w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-extrabold text-sm">
            1
          </div>
          <div className="space-y-2 flex-1">
            <h3 className="font-bold text-slate-800 text-base">Mengelola Akun Petugas (Kasir & Penerima)</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Buka menu <strong>Kelola User</strong>. Di halaman ini Anda dapat menambahkan user baru, mengubah nama/username/role mereka, mengubah password petugas yang lupa, atau menghapus akun petugas yang sudah tidak bekerja. Terdapat dua role utama yang dapat Anda buat: <strong>KASIR</strong> dan <strong>PENERIMA</strong>.
            </p>
            <Link to="/owner/users" className="inline-flex items-center gap-1.5 text-xs text-primary font-bold hover:underline pt-1">
              Buka Kelola User <ArrowRight size={14} />
            </Link>
          </div>
        </div>

        {/* 2. Melihat Event */}
        <div className="bg-card p-6 rounded-2xl border border-border shadow-sm flex items-start gap-4">
          <div className="bg-indigo-100 text-indigo-700 w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-extrabold text-sm">
            2
          </div>
          <div className="space-y-2 flex-1">
            <h3 className="font-bold text-slate-800 text-base">Melihat Daftar Event</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Buka menu <strong>Kelola Event</strong>. Anda dapat melihat riwayat event yang telah dibuat oleh kasir, meninjau status keaktifannya (Aktif, Selesai, Nonaktif), lokasi pelaksanaan, tanggal mulai dan selesai, serta meninjau rincian detail konfigurasi internal masing-masing event.
            </p>
            <Link to="/owner/events" className="inline-flex items-center gap-1.5 text-xs text-primary font-bold hover:underline pt-1">
              Buka Kelola Event <ArrowRight size={14} />
            </Link>
          </div>
        </div>

        {/* 3. Memantau Transaksi */}
        <div className="bg-card p-6 rounded-2xl border border-border shadow-sm flex items-start gap-4">
          <div className="bg-indigo-100 text-indigo-700 w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-extrabold text-sm">
            3
          </div>
          <div className="space-y-2 flex-1">
            <h3 className="font-bold text-slate-800 text-base">Memantau Transaksi Real-time</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Buka menu <strong>Daftar Transaksi</strong> untuk meninjau secara langsung pesanan yang masuk. Anda dapat memfilter data berdasarkan status pembayaran (Lunas, Menunggu, Batal) atau metode pembayaran (Tunai, QRIS). Jika terdapat transaksi yang dibatalkan oleh kasir, Anda dapat melihat keterangan <em>alasan pembatalan</em> langsung di kolom aksi.
            </p>
            <Link to="/owner/transactions" className="inline-flex items-center gap-1.5 text-xs text-primary font-bold hover:underline pt-1">
              Buka Daftar Transaksi <ArrowRight size={14} />
            </Link>
          </div>
        </div>

        {/* 4. Membaca Laporan Keuangan */}
        <div className="bg-card p-6 rounded-2xl border border-border shadow-sm flex items-start gap-4">
          <div className="bg-indigo-100 text-indigo-700 w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-extrabold text-sm">
            4
          </div>
          <div className="space-y-2 flex-1">
            <h3 className="font-bold text-slate-800 text-base">Membaca Laporan Keuangan & Omzet</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Buka halaman <strong>Dashboard Owner</strong>. Di sini terdapat grafik ringkasan keuangan yang lengkap. Anda dapat memilih event tertentu dari dropdown untuk menganalisis total omzet pendapatan kotor, jumlah transaksi yang sudah lunas, jumlah antrian yang dibatalkan, dan total tagihan yang belum lunas. Tekan tombol <strong>Export PDF</strong> untuk mengunduh salinan laporan keuangan resmi.
            </p>
            <Link to="/owner/dashboard" className="inline-flex items-center gap-1.5 text-xs text-primary font-bold hover:underline pt-1">
              Buka Dashboard Owner <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </div>

      {/* KEAMANAN */}
      <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-200 shadow-sm space-y-3">
        <h2 className="text-lg font-black text-emerald-800 flex items-center gap-2">
          <ShieldCheck size={20} className="text-emerald-700" /> 🛡️ Keamanan Sistem Tingkat Owner
        </h2>
        <ul className="text-xs text-emerald-700 list-disc pl-5 space-y-1.5">
          <li><strong>Otorisasi Pengguna:</strong> Selalu berikan password yang kuat saat mendaftarkan petugas kasir/penerima baru demi mencegah penyalahgunaan sistem transaksi.</li>
          <li><strong>Keamanan Audit Log:</strong> Transaksi yang sudah dibatalkan tidak dihapus secara permanen dari database melainkan diberi flag status <strong>BATAL</strong> dan tetap tercatat dalam laporan untuk mencegah fraud keuangan.</li>
          <li>Pastikan Anda keluar (logout) dari sistem setelah menggunakan komputer bersama agar kredensial Owner Anda tidak disalahgunakan.</li>
        </ul>
      </div>
    </div>
  );
};

export default InfoOwner;
