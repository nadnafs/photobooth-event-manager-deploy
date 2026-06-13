import React from 'react';
import { Link } from 'react-router-dom';
import { HelpCircle, Calendar, Plus, Printer, CreditCard, Download, ShieldAlert, ArrowRight } from 'lucide-react';

const InfoKasir = () => {
  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-20 font-sans text-textMain">
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-3xl p-8 text-white shadow-md">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <HelpCircle size={32} className="text-blue-400" /> Panduan Penggunaan Kasir
        </h1>
        <p className="text-slate-300 mt-2 text-sm leading-relaxed">
          Selamat datang di halaman bantuan operasional kasir. Ikuti langkah-langkah di bawah ini untuk mengelola event, memverifikasi transaksi pembayaran, mencetak nota, dan menandai pengambilan pesanan.
        </p>
      </div>

      {/* TUGAS UTAMA */}
      <div className="bg-card p-6 rounded-2xl border border-border shadow-sm space-y-3">
        <h2 className="text-lg font-black text-slate-800 flex items-center gap-2 border-b pb-2">
          📌 Tugas Utama Kasir
        </h2>
        <p className="text-sm text-slate-600 leading-relaxed">
          Sebagai Kasir, tanggung jawab utama Anda adalah memastikan data event aktif terisi, melakukan verifikasi pembayaran tunai/QRIS dari pendaftar, mencetak nota final beserta sobekan antrian foto, serta mengawasi penyerahan barang cetak foto kepada peserta.
        </p>
      </div>

      {/* LANGKAH PANDUAN */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold px-2">Langkah Panduan Operasional</h2>

        {/* 1. Membuat Event */}
        <div className="bg-card p-6 rounded-2xl border border-border shadow-sm flex items-start gap-4">
          <div className="bg-primary/10 text-primary w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-extrabold text-sm">
            1
          </div>
          <div className="space-y-2 flex-1">
            <h3 className="font-bold text-slate-800 text-base">Membuat Event Baru</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Buka menu <strong>Kelola Event</strong>, lalu tekan tombol <strong>Tambah Event</strong>. Isi nama, kode unik event, lokasi, tanggal operasional, dan klik simpan. Setelah dibuat, ubah status event menjadi <strong>Set Aktif</strong> agar sistem pendaftaran dapat berjalan.
            </p>
            <Link to="/kasir/events" className="inline-flex items-center gap-1.5 text-xs text-primary font-bold hover:underline pt-1">
              Buka Kelola Event <ArrowRight size={14} />
            </Link>
          </div>
        </div>

        {/* 2. Mengatur Produk & Harga */}
        <div className="bg-card p-6 rounded-2xl border border-border shadow-sm flex items-start gap-4">
          <div className="bg-primary/10 text-primary w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-extrabold text-sm">
            2
          </div>
          <div className="space-y-2 flex-1">
            <h3 className="font-bold text-slate-800 text-base">Mengatur Produk, Kategori & Booth</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Pada halaman daftar event, klik tombol <strong>Detail / Kelola</strong> pada event aktif. Di sana Anda dapat menambahkan <strong>Kategori Peserta</strong>, <strong>Kategori Produk</strong>, <strong>Produk / Layanan</strong> yang dijual, serta <strong>Booth / Layar foto</strong> yang tersedia.
            </p>
          </div>
        </div>

        {/* 3. Mengatur Ukuran Nota */}
        <div className="bg-card p-6 rounded-2xl border border-border shadow-sm flex items-start gap-4">
          <div className="bg-primary/10 text-primary w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-extrabold text-sm">
            3
          </div>
          <div className="space-y-2 flex-1">
            <h3 className="font-bold text-slate-800 text-base">Mengatur Ukuran Nota Kertas</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Di halaman <strong>Detail Event</strong>, pilih tab <strong>Pengaturan Cetak</strong>. Anda dapat memilih preset ukuran (seperti 10cm x 16,5cm atau 8cm x 14cm), mengatur margin, ukuran QR code, serta mengaktifkan/menonaktifkan sobekan untuk petugas foto. Simpan pengaturan untuk menjadikannya standar cetak event.
            </p>
          </div>
        </div>

        {/* 4. Verifikasi Pembayaran */}
        <div className="bg-card p-6 rounded-2xl border border-border shadow-sm flex items-start gap-4">
          <div className="bg-primary/10 text-primary w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-extrabold text-sm">
            4
          </div>
          <div className="space-y-2 flex-1">
            <h3 className="font-bold text-slate-800 text-base">Verifikasi Pembayaran & Generate Antrian</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Ketika peserta datang ke kasir, buka menu <strong>Daftar Transaksi</strong>. Cari nama peserta, klik tombol <strong>BAYAR</strong>. Pilih metode <strong>TUNAI</strong> (lalu masukkan nominal uang diterima untuk menghitung kembalian otomatis) atau <strong>QRIS</strong>. Klik <strong>Verifikasi Lunas</strong> agar nomor antrian foto dan kode QR dibuat oleh sistem.
            </p>
            <Link to="/kasir/transactions" className="inline-flex items-center gap-1.5 text-xs text-primary font-bold hover:underline pt-1">
              Buka Transaksi Kasir <ArrowRight size={14} />
            </Link>
          </div>
        </div>

        {/* 5. Mencetak Nota Final */}
        <div className="bg-card p-6 rounded-2xl border border-border shadow-sm flex items-start gap-4">
          <div className="bg-primary/10 text-primary w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-extrabold text-sm">
            5
          </div>
          <div className="space-y-2 flex-1">
            <h3 className="font-bold text-slate-800 text-base">Mencetak Nota & Pembagian Sobekan</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Setelah pembayaran lunas, klik tombol <strong>CETAK</strong> pada transaksi. Browser akan membuka tab baru dan memicu print window otomatis. Berikan nota bagian atas (lengkap dengan QR kode pemantauan antrian) kepada pelanggan, dan sobek bagian bawah (sobekan petugas foto) untuk diberikan ke petugas foto di booth.
            </p>
          </div>
        </div>

        {/* 6. Penyerahan Barang Cetak */}
        <div className="bg-card p-6 rounded-2xl border border-border shadow-sm flex items-start gap-4">
          <div className="bg-primary/10 text-primary w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-extrabold text-sm">
            6
          </div>
          <div className="space-y-2 flex-1">
            <h3 className="font-bold text-slate-800 text-base">Menandai Pengambilan Pesanan</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Saat foto selesai dicetak oleh operator cetak, buka menu <strong>Pengambilan Pesanan</strong>. Status awal adalah <em>Menunggu Cetak</em>. Jika sudah selesai diproduksi, klik <strong>Set Siap Diambil</strong>. Ketika pelanggan datang menyerahkan nota untuk mengambil hasil foto, klik tombol <strong>Pesanan Diambil</strong> untuk menyelesaikan alur transaksi.
            </p>
            <Link to="/kasir/pickup" className="inline-flex items-center gap-1.5 text-xs text-primary font-bold hover:underline pt-1">
              Buka Halaman Pengambilan <ArrowRight size={14} />
            </Link>
          </div>
        </div>

        {/* 7. Export Laporan */}
        <div className="bg-card p-6 rounded-2xl border border-border shadow-sm flex items-start gap-4">
          <div className="bg-primary/10 text-primary w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-extrabold text-sm">
            7
          </div>
          <div className="space-y-2 flex-1">
            <h3 className="font-bold text-slate-800 text-base">Export Laporan Transaksi PDF</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Anda dapat mengunduh laporan fisik transaksi kapan saja dengan menekan tombol <strong>Export PDF</strong> di bagian kanan atas halaman daftar transaksi. Laporan ini merinci transaksi tunai, QRIS, total pemasukan, dan status pembayaran yang terbit pada event bersangkutan.
            </p>
          </div>
        </div>
      </div>

      {/* PANTANGAN */}
      <div className="bg-red-50 p-6 rounded-2xl border border-red-200 shadow-sm space-y-3">
        <h2 className="text-lg font-black text-red-800 flex items-center gap-2">
          <ShieldAlert size={20} className="text-red-700" /> 🚫 Hal Yang Tidak Boleh Dilakukan
        </h2>
        <ul className="text-xs text-red-700 list-disc pl-5 space-y-1.5">
          <li><strong>Jangan menghapus secara sembarangan</strong> pendaftaran yang status pembayarannya sudah LUNAS. Gunakan tombol <strong>BATALKAN</strong> dan berikan alasan pembatalan yang jelas agar audit log database tetap aman.</li>
          <li>Jangan mencetak nota lunas untuk pelanggan yang belum melakukan pembayaran secara real-time.</li>
          <li>Jangan mematikan / menyelesaikan event aktif di tengah berjalannya transaksi antrian yang sedang berjalan.</li>
        </ul>
      </div>
    </div>
  );
};

export default InfoKasir;
