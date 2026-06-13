import React from 'react';
import { Link } from 'react-router-dom';
import { HelpCircle, UserPlus, List, Smartphone, Share2, ShieldAlert, ArrowRight } from 'lucide-react';

const InfoPenerima = () => {
  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-20 font-sans text-textMain">
      <div className="bg-gradient-to-r from-blue-900 to-indigo-800 rounded-3xl p-8 text-white shadow-md">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <HelpCircle size={32} className="text-blue-300" /> Panduan Penggunaan Penerima
        </h1>
        <p className="text-slate-200 mt-2 text-sm leading-relaxed">
          Selamat datang di halaman bantuan operasional penerima / resepsionis. Ikuti langkah-langkah di bawah ini untuk mendaftarkan peserta, memantau pembayaran, membuka link status peserta, dan mengontrol panggilan antrian foto lewat HP.
        </p>
      </div>

      {/* TUGAS UTAMA */}
      <div className="bg-card p-6 rounded-2xl border border-border shadow-sm space-y-3">
        <h2 className="text-lg font-black text-slate-800 flex items-center gap-2 border-b pb-2">
          📌 Tugas Utama Penerima
        </h2>
        <p className="text-sm text-slate-600 leading-relaxed">
          Sebagai Penerima (Resepsionis / Front Office), peran utama Anda adalah menyambut peserta, melakukan pendaftaran nama dan kategori peserta, memilih paket produk foto yang diinginkan, mengarahkan peserta ke kasir untuk membayar, serta mengoperasikan panel pemanggilan antrian di area foto booth.
        </p>
      </div>

      {/* LANGKAH PANDUAN */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold px-2">Langkah Panduan Operasional</h2>

        {/* 1. Mendaftarkan Peserta */}
        <div className="bg-card p-6 rounded-2xl border border-border shadow-sm flex items-start gap-4">
          <div className="bg-primary/10 text-primary w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-extrabold text-sm">
            1
          </div>
          <div className="space-y-2 flex-1">
            <h3 className="font-bold text-slate-800 text-base">Pendaftaran Peserta & Paket Foto</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Buka menu <strong>Pendaftaran Baru</strong>. Masukkan nama lengkap peserta, pilih kategori peserta (misalnya SD, TK, dll.), masukkan nomor HP/WhatsApp, dan pilih booth foto. Pada daftar produk di bawahnya, klik produk/paket foto yang dipilih pelanggan hingga masuk ke ringkasan belanja di sebelah kanan. Tekan tombol <strong>Simpan Pendaftaran</strong>.
            </p>
            <Link to="/penerima/daftar" className="inline-flex items-center gap-1.5 text-xs text-primary font-bold hover:underline pt-1">
              Buka Pendaftaran Baru <ArrowRight size={14} />
            </Link>
          </div>
        </div>

        {/* 2. Cek Status Pembayaran & Hapus */}
        <div className="bg-card p-6 rounded-2xl border border-border shadow-sm flex items-start gap-4">
          <div className="bg-primary/10 text-primary w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-extrabold text-sm">
            2
          </div>
          <div className="space-y-2 flex-1">
            <h3 className="font-bold text-slate-800 text-base">Memantau Status Pembayaran & Hapus Transaksi</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Buka menu <strong>Daftar Transaksi</strong> untuk melihat semua pendaftar. 
              <br />
              - Status <strong>Menunggu</strong> artinya peserta belum membayar ke kasir. 
              <br />
              - Jika peserta ingin membatalkan pendaftaran yang <strong>belum dibayar</strong>, Anda diizinkan untuk menghapusnya dengan mengklik tombol <strong>Hapus</strong> merah. Namun, jika status sudah <strong>Lunas</strong>, tombol hapus dinonaktifkan dan hanya kasir yang dapat melakukan pembatalan (Refund).
            </p>
            <Link to="/penerima/list" className="inline-flex items-center gap-1.5 text-xs text-primary font-bold hover:underline pt-1">
              Buka Daftar Transaksi <ArrowRight size={14} />
            </Link>
          </div>
        </div>

        {/* 3. Membuka Link Status Antrian */}
        <div className="bg-card p-6 rounded-2xl border border-border shadow-sm flex items-start gap-4">
          <div className="bg-primary/10 text-primary w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-extrabold text-sm">
            3
          </div>
          <div className="space-y-2 flex-1">
            <h3 className="font-bold text-slate-800 text-base">Membuka Link Status Peserta</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Untuk transaksi yang sudah <strong>Lunas</strong>, Anda dapat melihat link pelacakan antrian publik. Klik tombol <strong>LIHAT STATUS</strong> di samping data peserta. Di sana Anda dapat menyalin tautan pelacakan untuk dikirim ke nomor WhatsApp peserta, atau membuka langsung halaman status antrian agar peserta dapat memantau urutan panggilannya secara real-time dari HP mereka.
            </p>
          </div>
        </div>

        {/* 4. Menggunakan Kontrol Antrian di HP */}
        <div className="bg-card p-6 rounded-2xl border border-border shadow-sm flex items-start gap-4">
          <div className="bg-primary/10 text-primary w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-extrabold text-sm">
            4
          </div>
          <div className="space-y-2 flex-1">
            <h3 className="font-bold text-slate-800 text-base">Mengontrol Antrian Foto via HP</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Petugas foto di booth dapat membuka menu <strong>Kontrol Antrian</strong> melalui browser smartphone mereka. 
              <br />
              - Pilih <strong>Layar Booth</strong> yang sesuai.
              <br />
              - Tekan tombol <strong>PANGGIL SEKARANG</strong> kuning untuk memanggil peserta berikutnya ke dalam studio foto.
              <br />
              - Tekan <strong>MULAI FOTO</strong> biru ketika pemotretan berlangsung.
              <br />
              - Tekan <strong>SELESAI FOTO</strong> hijau setelah sesi selesai untuk meneruskan antrian ke antrian berikutnya.
              <br />
              - Jika peserta dipanggil berkali-kali tidak datang, tekan <strong>LEWATI</strong> merah. Anda dapat memanggil ulang mereka nanti menggunakan tombol <strong>PANGGIL ULANG</strong> abu-abu.
            </p>
            <Link to="/penerima/mobile" className="inline-flex items-center gap-1.5 text-xs text-primary font-bold hover:underline pt-1">
              Buka Kontrol Antrian <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </div>

      {/* PANTANGAN */}
      <div className="bg-amber-50 p-6 rounded-2xl border border-amber-200 shadow-sm space-y-3">
        <h2 className="text-lg font-black text-amber-800 flex items-center gap-2">
          <ShieldAlert size={20} className="text-amber-700" /> 🚫 Keamanan dan Aturan Penting
        </h2>
        <ul className="text-xs text-amber-700 list-disc pl-5 space-y-1.5">
          <li><strong>Jangan menghapus pendaftaran buatan orang lain</strong> kecuali Anda memiliki hak akses penuh atau atas instruksi kasir.</li>
          <li>Sebelum melakukan pemanggilan antrian di HP, pastikan Anda telah memilih booth/layar yang tepat agar TV Antrian publik tidak salah menampilkan informasi.</li>
          <li>Ingatkan peserta untuk selalu memindai QR code pada nota lunas atau menyimpan link status antrian agar mereka tidak perlu berdiri mengantri secara fisik di depan studio.</li>
        </ul>
      </div>
    </div>
  );
};

export default InfoPenerima;
