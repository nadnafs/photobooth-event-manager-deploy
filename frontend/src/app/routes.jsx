import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ProtectedRoute from '../components/ProtectedRoute';

// Layouts
import KasirLayout from '../components/layout/KasirLayout';
import PenerimaLayout from '../components/layout/PenerimaLayout';
import OwnerLayout from '../components/layout/OwnerLayout';

// Auth Pages
import Login from '../pages/auth/Login';

// Kasir Pages
import KasirDashboard from '../pages/kasir/Dashboard';
import KelolaEvent from '../pages/kasir/KelolaEvent';
import DetailEvent from '../pages/kasir/DetailEvent';
import ListTransaksi from '../pages/kasir/ListTransaksi';
import PrintNota from '../pages/kasir/PrintNota';
import Pengambilan from '../pages/kasir/Pengambilan';
import InfoKasir from '../pages/kasir/InfoKasir';

// Penerima Pages
import PenerimaDashboard from '../pages/penerima/Dashboard';
import Pendaftaran from '../pages/penerima/Pendaftaran';
import ListPendaftar from '../pages/penerima/ListPendaftar';
import InfoPenerima from '../pages/penerima/InfoPenerima';

// Owner Pages
import OwnerDashboard from '../pages/owner/Dashboard';
import Users from '../pages/owner/Users';
import InfoOwner from '../pages/owner/InfoOwner';

// Public Pages
import TvAntrian from '../pages/public/TvAntrian';
import StatusPeserta from '../pages/public/StatusPeserta';
import CekAntrian from '../pages/public/CekAntrian';

export default function AppRoutes() {
  const { user, token } = useAuth();

  return (
    <Routes>
      <Route 
        path="/login" 
        element={
          token ? (
            <Navigate to={user?.role === 'OWNER' ? '/owner/dashboard' : (user?.role === 'KASIR' ? '/kasir/dashboard' : '/penerima/dashboard')} />
          ) : (
            <Login />
          )
        } 
      />
      
      {/* PUBLIC ROUTES */}
      <Route path="/tv-antrian" element={<TvAntrian />} />
      <Route path="/status/:queueCode" element={<StatusPeserta />} />
      <Route path="/cek-antrian" element={<CekAntrian />} />
      <Route path="/print-nota/:id" element={<PrintNota />} />

      {/* KASIR ROUTES */}
      <Route path="/kasir" element={
        <ProtectedRoute allowedRoles={['KASIR']}>
          <KasirLayout />
        </ProtectedRoute>
      }>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<KasirDashboard />} />
        <Route path="events" element={<KelolaEvent />} />
        <Route path="events/:id" element={<DetailEvent />} />
        <Route path="transactions" element={<ListTransaksi />} />
        <Route path="pickup" element={<Pengambilan />} />
        <Route path="daftar" element={<Pendaftaran />} />
        <Route path="info" element={<InfoKasir />} />
        {/* Placeholder Routes for later */}
        <Route path="categories" element={<div className="p-4">Kategori Peserta (Coming Soon)</div>} />
        <Route path="products" element={<div className="p-4">Produk (Coming Soon)</div>} />
        <Route path="booths" element={<div className="p-4">Booth (Coming Soon)</div>} />
      </Route>

      {/* PENERIMA ROUTES */}
      <Route path="/penerima" element={
        <ProtectedRoute allowedRoles={['PENERIMA']}>
          <PenerimaLayout />
        </ProtectedRoute>
      }>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<PenerimaDashboard />} />
        <Route path="daftar" element={<Pendaftaran />} />
        <Route path="list" element={<ListPendaftar />} />
        <Route path="info" element={<InfoPenerima />} />
      </Route>

      {/* OWNER ROUTES */}
      <Route path="/owner" element={
        <ProtectedRoute allowedRoles={['OWNER']}>
          <OwnerLayout />
        </ProtectedRoute>
      }>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<OwnerDashboard />} />
        <Route path="users" element={<Users />} />
        <Route path="events" element={<KelolaEvent />} />
        <Route path="events/:id" element={<DetailEvent />} />
        <Route path="transactions" element={<ListTransaksi />} />
        <Route path="info" element={<InfoOwner />} />
      </Route>

      {/* Redirect root ke login atau dashboard */}
      <Route path="/" element={<Navigate to="/login" />} />
    </Routes>
  );
}
