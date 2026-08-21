import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AgrocerProvider } from './contexts/AgrocerContext';
import { AppShell } from './components/AppShell';
import { Home } from './pages/Home';
import { Pantry } from './pages/Pantry';
import { Shopping } from './pages/Shopping';
import { Meals } from './pages/Meals';
import { Products } from './pages/Products';

export function App() {
  return (
    <AgrocerProvider>
      <BrowserRouter>
        <AppShell>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/pantry" element={<Pantry />} />
            <Route path="/shopping" element={<Shopping />} />
            <Route path="/meals" element={<Meals />} />
            <Route path="/products" element={<Products />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AppShell>
      </BrowserRouter>
    </AgrocerProvider>);

}