import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ProtectedRoute from '../components/ProtectedRoute';

// Layouts (Keep layouts static for faster initial shell rendering)
import KasirLayout from '../components/layout/KasirLayout';
import PenerimaLayout from '../components/layout/PenerimaLayout';
import OwnerLayout from '../components/layout/OwnerLayout';

// Auth Pages
import Login from '../pages/auth/Login';

// Lazy Loaded Pages (BUG-012: Code Splitting)
const KasirDashboard = lazy(() => import('../pages/kasir/Dashboard'));
const KelolaEvent = lazy(() => import('../pages/kasir/KelolaEvent'));
const DetailEvent = lazy(() => import('../pages/kasir/DetailEvent'));
const ListTransaksi = lazy(() => import('../pages/kasir/ListTransaksi'));
const PrintNota = lazy(() => import('../pages/kasir/PrintNota'));
const Pengambilan = lazy(() => import('../pages/kasir/Pengambilan'));
const InfoKasir = lazy(() => import('../pages/kasir/InfoKasir'));

const PenerimaDashboard = lazy(() => import('../pages/penerima/Dashboard'));
const Pendaftaran = lazy(() => import('../pages/penerima/Pendaftaran'));
const ListPendaftar = lazy(() => import('../pages/penerima/ListPendaftar'));
const InfoPenerima = lazy(() => import('../pages/penerima/InfoPenerima'));

const OwnerDashboard = lazy(() => import('../pages/owner/Dashboard'));
const Users = lazy(() => import('../pages/owner/Users'));
const InfoOwner = lazy(() => import('../pages/owner/InfoOwner'));
const LaporanProduk = lazy(() => import('../pages/owner/LaporanProduk'));

const TvAntrian = lazy(() => import('../pages/public/TvAntrian'));
const StatusPeserta = lazy(() => import('../pages/public/StatusPeserta'));
const CekAntrian = lazy(() => import('../pages/public/CekAntrian'));
const NotFound = lazy(() => import('../pages/NotFound'));

// Loading Fallback
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
  </div>
);

export default function AppRoutes() {
  const { user, token } = useAuth();

  return (
    <Suspense fallback={<PageLoader />}>
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
          <Route path="laporan-produk" element={<LaporanProduk />} />
          <Route path="info" element={<InfoOwner />} />
        </Route>

        {/* Redirect root ke login atau dashboard */}
        <Route path="/" element={<Navigate to="/login" />} />
        
        {/* BUG-018: 404 Route */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}
