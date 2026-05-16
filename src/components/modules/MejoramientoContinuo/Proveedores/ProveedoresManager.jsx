// src/components/modules/MejoramientoContinuo/Proveedores/ProveedoresManager.jsx
// Submódulo Proveedores — Garana SIG
// Tabs: Evaluación · Selección · Catálogo

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ClipboardCheck, GitCompare, Building2 } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import EvaluacionTab   from './/EvaluacionTab';
import SeleccionTab    from './SeleccionTab';
import CatalogoTab     from './CatalogoTab';

const TABS = [
  {
    id:    'evaluacion',
    label: 'Evaluación de Proveedores',
    short: 'Evaluación',
    icon:  ClipboardCheck,
    desc:  'RE-GR-01 · Evaluación semestral',
  },
  {
    id:    'seleccion',
    label: 'Selección de Proveedores',
    short: 'Selección',
    icon:  GitCompare,
    desc:  'RE-GR-05 · Selección por insumo',
  },
  {
    id:    'catalogo',
    label: 'Catálogo de Proveedores',
    short: 'Catálogo',
    icon:  Building2,
    desc:  'Proveedores registrados',
  },
];

const C = { green: '#2e5244', mint: '#6dbd96', olive: '#6f7b2c' };

export default function ProveedoresManager({ onBack }) {
  const [activeTab, setActiveTab] = useState('evaluacion');

  const currentTab = TABS.find(t => t.id === activeTab);

  return (
    <div className="space-y-4">

      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="flex items-center gap-2 text-sm font-medium hover:bg-gray-100"
          style={{ color: C.green }}
        >
          <ArrowLeft className="h-4 w-4" />
          Mejoramiento Continuo
        </Button>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold" style={{ color: C.green }}>
            Gestión de Proveedores
          </h2>
          <p className="text-sm mt-1" style={{ color: C.olive }}>
            Evaluación, selección y catálogo de proveedores
          </p>
        </div>
      </div>

      {/* ── Tabs ────────────────────────────────────────────────────── */}
      <div className="border-b" style={{ borderColor: '#e5e7eb' }}>
        <div className="flex gap-1">
          {TABS.map((tab) => {
            const Icon    = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all relative whitespace-nowrap"
                style={{
                  color:      isActive ? C.green : '#6b7280',
                  borderBottom: isActive ? `2px solid ${C.mint}` : '2px solid transparent',
                  marginBottom: '-1px',
                }}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.short}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Contenido del tab activo ─────────────────────────────────── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.18 }}
        >
          {activeTab === 'evaluacion' && <EvaluacionTab />}
          {activeTab === 'seleccion'  && <SeleccionTab />}
          {activeTab === 'catalogo'   && <CatalogoTab />}
        </motion.div>
      </AnimatePresence>

    </div>
  );
}