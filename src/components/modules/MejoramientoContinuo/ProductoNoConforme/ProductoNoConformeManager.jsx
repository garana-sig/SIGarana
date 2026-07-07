// src/components/modules/MejoramientoContinuo/ProductoNoConforme/ProductoNoConformeManager.jsx
// v3 — Formulario consolidado (fila por fila) sobre el formato RE-GS-06 modificado

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/app/components/ui/card';
import { Button }  from '@/app/components/ui/button';
import { Input }   from '@/app/components/ui/input';
import { Alert, AlertDescription } from '@/app/components/ui/alert';
import { Dialog, DialogContent } from '@/app/components/ui/dialog';
import {
  Plus, RefreshCw, Search, Loader2, AlertTriangle,
  Edit, Trash2, X, Check, BarChart3, FileSpreadsheet, Eye,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { exportPNC } from '@/utils/exportPNC';
import { usePNC, MESES, fmtFecha } from '@/hooks/usePNC';
import { useAuth } from '@/context/AuthContext';

// ── Paleta del proyecto ───────────────────────────────────────────────────────
const C = { primary: '#2e5244', secondary: '#6f7b2c', accent: '#6dbd96', beige: '#dedecc' };

const XL = {
  identificacion: '#FFFF00',
  descripcion:    '#92D050',
  causa:          '#9DC3E6',
  tratamiento:    '#70AD47',
  verificacion:   '#C6EFCE',
  colBg:          '#DEEAF1',
  border:         '#A6B8C2',
  rowOdd:         '#FFFFFF',
  rowEven:        '#F2F9F5',
};

// ── Listas de opciones (formulario consolidado) ───────────────────────────────
const SECCIONES = ['Confección', 'Separación', 'Otro'];

const OPERACIONES_ORIGEN = [
  'Armado', 'Confección', 'Corte', 'Diseño', 'Plana', 'Presilla', 'Proveedor',
  'Recubierta', 'Resortada', 'Separación', 'Sesgada', 'Sublimación', 'ZZ', 'Otro',
];

const SOLUCIONES = [
  'Cambiar talla', 'Corregir tallaje', 'Coser', 'Desbaratar/Coser', 'Emparejar',
  'Hacer piquete', 'Liberado', 'Poner talla', 'Refilar', 'Reponer', 'Otro',
];

// ── Helpers de tabla ──────────────────────────────────────────────────────────
const HHead = ({ children, bg, colSpan=1, rowSpan=1, textColor='#1F2937' }) => (
  <th colSpan={colSpan} rowSpan={rowSpan} style={{
    backgroundColor: bg, border:`1px solid ${XL.border}`,
    textAlign:'center', verticalAlign:'middle',
    padding:'4px 6px', fontSize:11, fontWeight:700,
    textTransform:'uppercase', color:textColor, whiteSpace:'nowrap',
  }}>{children}</th>
);

const VHead = ({ children, w=28 }) => {
  const lines = typeof children === 'string' ? children.split('|') : [children];
  return (
    <th style={{
      backgroundColor: XL.colBg, border:`1px solid ${XL.border}`,
      padding:'6px 4px', width:w, minWidth:w,
      fontSize:11, fontWeight:600, textTransform:'uppercase',
      color:'#1F2937', textAlign:'center',
    }}>
      {lines.map((l,i) => <div key={i} style={{ whiteSpace:'nowrap' }}>{l}</div>)}
    </th>
  );
};

const Cell = ({ children, center, bold, maxW, bg }) => (
  <td style={{
    border:`1px solid ${XL.border}`, padding:'4px 6px', fontSize:12,
    textAlign: center ? 'center' : 'left', fontWeight: bold ? 600 : 400,
    color:'#1F2937', maxWidth:maxW, verticalAlign:'middle',
    backgroundColor:bg, wordBreak:'break-word', overflowWrap:'break-word',
  }}>{children}</td>
);

const Fecha = ({ v }) => {
  if (!v) return <span style={{ color:'#C0C0C0' }}>—</span>;
  return <>{new Date(v+'T00:00:00').toLocaleDateString('es-CO',{ day:'2-digit', month:'2-digit', year:'2-digit' })}</>;
};

// ── Select con opción "Otro" + texto libre ────────────────────────────────────
function SelectConOtro({ label, options, value, otro, onChange, onChangeOtro, required }) {
  const esOtro = value === 'Otro';
  return (
    <div>
      <label className="text-xs font-medium text-gray-600 block mb-1">
        {label}{required && ' *'}
      </label>
      <select
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        className="w-full p-2 border rounded text-sm"
      >
        <option value="">Selecciona...</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
      {esOtro && (
        <Input
          value={otro || ''}
          onChange={e => onChangeOtro(e.target.value)}
          placeholder="Especifica..."
          className="text-sm mt-1.5"
        />
      )}
    </div>
  );
}

// ── Autocomplete (Referencia / Defecto) ───────────────────────────────────────
function ComboboxInput({ value, onChange, options, placeholder, getLabel, getId }) {
  const [query,   setQuery]   = useState('');
  const [open,    setOpen]    = useState(false);
  const [focused, setFocused] = useState(false);
  const inputRef = React.useRef(null);

  const filtered = useMemo(() => {
    if (!query.trim()) return options.slice(0, 15);
    const q = query.toLowerCase();
    return options.filter(o =>
      getId(o).toLowerCase().includes(q) ||
      getLabel(o).toLowerCase().includes(q)
    ).slice(0, 15);
  }, [options, query, getId, getLabel]);

  const handleSelect = (opt) => { onChange(opt); setQuery(''); setOpen(false); };
  const handleClear = (e) => {
    e.stopPropagation(); onChange(null); setQuery(''); setOpen(false);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  if (value) {
    return (
      <div className="w-full flex items-center justify-between px-3 py-2 border rounded-lg text-sm cursor-pointer"
        style={{ background: "#f0f7f4", borderColor: "#6dbd96", minHeight: 38 }}>
        <div className="flex flex-col min-w-0">
          <span className="font-semibold font-mono truncate" style={{ color: "#2e5244", fontSize: 12 }}>
            {getId(value)}
          </span>
          {getLabel(value) && (
            <span className="text-xs text-gray-500 truncate">{getLabel(value)}</span>
          )}
        </div>
        <button type="button" onMouseDown={handleClear}
          className="ml-2 flex-shrink-0 p-0.5 rounded-full hover:bg-red-100 transition-colors" title="Cambiar">
          <X className="h-3.5 w-3.5 text-gray-400 hover:text-red-500" />
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
        <input
          ref={inputRef} type="text" value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); if (!e.target.value) onChange(null); }}
          onFocus={() => { setFocused(true); setOpen(true); }}
          onBlur={() => { setFocused(false); setTimeout(() => setOpen(false), 180); }}
          placeholder={placeholder}
          className="w-full pl-8 pr-3 py-2 border rounded-lg text-sm outline-none transition-colors"
          style={{ borderColor: focused ? "#6dbd96" : "#E5E7EB", boxShadow: focused ? "0 0 0 2px #6dbd9630" : "none" }}
          autoComplete="off"
        />
      </div>
      {open && (
        <div className="absolute z-50 top-full mt-1 w-full bg-white rounded-xl shadow-2xl border overflow-hidden" style={{ maxHeight: 220 }}>
          {filtered.length === 0 ? (
            <div className="px-3 py-2.5 text-xs text-gray-400 text-center">
              {query ? `Sin resultados para "${query}"` : "Escribe para buscar..."}
            </div>
          ) : (
            <div className="overflow-y-auto" style={{ maxHeight: 220 }}>
              {filtered.map((opt, i) => (
                <button key={getId(opt) + i} type="button" onMouseDown={() => handleSelect(opt)}
                  className="w-full text-left px-3 py-2 text-sm border-b last:border-0 hover:bg-gray-50 flex items-center gap-2">
                  <span className="font-mono font-bold flex-shrink-0" style={{ color: "#2e5244", fontSize: 11 }}>
                    {getId(opt)}
                  </span>
                  {getLabel(opt) && <span className="text-gray-600 truncate text-xs">{getLabel(opt)}</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const HOY     = new Date().toISOString().slice(0, 10);
const AÑO_HOY = new Date().getFullYear();
const MES_HOY = new Date().getMonth() + 1;

const emptyForm = () => ({
  anio: AÑO_HOY, mes: MES_HOY,
  seccion: '', seccion_otro: '',
  referencia_obj: null, referencia_texto: '',
  fecha_reporte: HOY,
  defecto_obj: null, defecto_texto: '',
  operacion_origen: '', operacion_origen_otro: '',
  total: '',
  como_solucion: '', como_solucion_otro: '',
  tratamiento_responsable: '',
  verificacion_fecha: '', verificacion_responsable: '',
});

// ═════════════════════════════════════════════════════════════════════════════
//  COMPONENTE PRINCIPAL
// ═════════════════════════════════════════════════════════════════════════════
export default function ProductoNoConformeManager({ onBack }) {
  const { profile, hasPermission } = useAuth();
  const isAdmin    = profile?.role === 'admin';
  const isGerencia = profile?.role === 'gerencia';

  const canCreate = isAdmin || isGerencia || hasPermission('auditorias:producto_no_conforme:create');
  const canEdit   = isAdmin || isGerencia || hasPermission('auditorias:producto_no_conforme:edit');
  const canDelete = isAdmin               || hasPermission('auditorias:producto_no_conforme:delete');
  const canExport = isAdmin || isGerencia || hasPermission('auditorias:producto_no_conforme:export');

  const { defectos, referencias, registros, produccion,
          loading, error,
          fetchAll, addItem, updateItem, deleteItem, saveProduccion, deleteProduccion } = usePNC();

  const [tab,        setTab]        = useState('registros');
  const [actionMsg,  setActionMsg]  = useState(null);
  const [search,     setSearch]     = useState('');
  const [formOpen,   setFormOpen]   = useState(false);
  const [editingRow, setEditingRow] = useState(null); // { id, registro_id, numero_fila } o null
  const [saving,     setSaving]     = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [exporting,  setExporting]  = useState(false);

  const [catalogModal,  setCatalogModal]  = useState({ open: false, tipo: null });
  const [catalogSearch, setCatalogSearch] = useState('');

  const [form, setForm] = useState(emptyForm());

  const [pAnio,  setPAnio]  = useState(AÑO_HOY);
  const [pMes,   setPMes]   = useState(MES_HOY);
  const [pTotal, setPTotal] = useState('');
  const [pObs,   setPObs]   = useState('');
  const [savingP,setSavingP]= useState(false);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const showMsg = useCallback((type, text) => {
    setActionMsg({ type, text });
    setTimeout(() => setActionMsg(null), 4000);
  }, []);

  const getRef = (id) => id ? referencias.find(r => r.id === id) : null;
  const getDef = (id) => id ? defectos.find(d => d.id === id)    : null;

  // ── Aplana todos los ítems de todos los meses en una sola lista ────────────
  const filas = useMemo(() => {
    const rows = [];
    registros.forEach(reg => (reg.pnc_item || []).forEach(it => {
      rows.push({ ...it, anio: reg.anio, mes: reg.mes });
    }));
    return rows.sort((a,b) => b.anio - a.anio || b.mes - a.mes || b.numero_fila - a.numero_fila);
  }, [registros]);

  const filasFiltradas = useMemo(() => {
    if (!search) return filas;
    const q = search.toLowerCase();
    return filas.filter(f => {
      const def = getDef(f.defecto_id);
      const ref = getRef(f.referencia_id);
      return (
        MESES[f.mes-1].toLowerCase().includes(q) ||
        (f.seccion||'').toLowerCase().includes(q) ||
        (ref?.ref || f.referencia_texto || '').toLowerCase().includes(q) ||
        (def?.nombre || f.defecto_texto || '').toLowerCase().includes(q) ||
        (f.operacion_origen||'').toLowerCase().includes(q) ||
        (f.tratamiento_descripcion||'').toLowerCase().includes(q)
      );
    });
  }, [filas, search, defectos, referencias]);

  // ── Abrir formulario (nueva fila) ───────────────────────────────────────────
  const openNew = () => { setEditingRow(null); setForm(emptyForm()); setFormOpen(true); };

  // ── Abrir formulario (editar fila existente) — no permite cambiar año/mes ──
  const openEdit = (f) => {
    setEditingRow({ id: f.id, registro_id: f.registro_id, numero_fila: f.numero_fila });
    const esSeccionLista  = SECCIONES.includes(f.seccion);
    const esOperacionLista= OPERACIONES_ORIGEN.includes(f.operacion_origen);
    const esSolucionLista = SOLUCIONES.includes(f.tratamiento_descripcion);
    setForm({
      anio: f.anio, mes: f.mes,
      seccion: esSeccionLista ? f.seccion : (f.seccion ? 'Otro' : ''),
      seccion_otro: esSeccionLista ? '' : (f.seccion || ''),
      referencia_obj: getRef(f.referencia_id), referencia_texto: f.referencia_texto || '',
      fecha_reporte: f.fecha_reporte || HOY,
      defecto_obj: getDef(f.defecto_id), defecto_texto: f.defecto_texto || '',
      operacion_origen: esOperacionLista ? f.operacion_origen : (f.operacion_origen ? 'Otro' : ''),
      operacion_origen_otro: esOperacionLista ? '' : (f.operacion_origen || ''),
      total: f.total ?? '',
      como_solucion: esSolucionLista ? f.tratamiento_descripcion : (f.tratamiento_descripcion ? 'Otro' : ''),
      como_solucion_otro: esSolucionLista ? '' : (f.tratamiento_descripcion || ''),
      tratamiento_responsable: f.tratamiento_responsable || '',
      verificacion_fecha: f.verificacion_fecha || '',
      verificacion_responsable: f.verificacion_responsable || '',
    });
    setFormOpen(true);
  };

  const setF = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  // ── Guardar (crear o editar fila) ───────────────────────────────────────────
  const handleSave = async () => {
    if (!form.fecha_reporte) { showMsg('error', 'La fecha de reporte es obligatoria.'); return; }
    setSaving(true);
    try {
      const item = {
        referencia_obj: form.referencia_obj,
        referencia_texto: form.referencia_obj ? null : form.referencia_texto,
        fecha_reporte: form.fecha_reporte,
        defecto_obj: form.defecto_obj,
        defecto_texto: form.defecto_obj ? null : form.defecto_texto,
        total: form.total,
        seccion: form.seccion === 'Otro' ? form.seccion_otro : form.seccion,
        operacion_origen: form.operacion_origen === 'Otro' ? form.operacion_origen_otro : form.operacion_origen,
        tratamiento_descripcion: form.como_solucion === 'Otro' ? form.como_solucion_otro : form.como_solucion,
        tratamiento_responsable: form.tratamiento_responsable,
        verificacion_fecha: form.verificacion_fecha,
        verificacion_responsable: form.verificacion_responsable,
      };

      if (editingRow) {
        await updateItem(editingRow.id, item, editingRow.registro_id, editingRow.numero_fila);
        showMsg('success', '✅ Fila actualizada.');
      } else {
        await addItem({ anio: form.anio, mes: form.mes, item });
        showMsg('success', '✅ Fila agregada al consolidado.');
      }
      setFormOpen(false);
      await fetchAll();
    } catch (e) { showMsg('error', `Error: ${e.message}`); }
    finally { setSaving(false); }
  };

  const handleDelete = async (f) => {
    if (!window.confirm(`¿Eliminar la fila N° ${f.numero_fila} de ${MESES[f.mes-1]} ${f.anio}?`)) return;
    setDeletingId(f.id);
    try { await deleteItem(f.id); showMsg('success', '🗑️ Fila eliminada.'); await fetchAll(); }
    catch (e) { showMsg('error', `Error: ${e.message}`); }
    finally { setDeletingId(null); }
  };

  // ── Exportar TODOS los registros sobre la plantilla RE-GS-06 del Storage ───
  const exportarTodo = async () => {
    if (exporting || registros.length === 0) return;
    setExporting(true);
    try {
      const regsEnriquecidos = registros.map(reg => ({
        ...reg,
        pnc_item: (reg.pnc_item || []).map(it => ({
          ...it,
          referencia_obj: getRef(it.referencia_id),
          defecto_obj:    getDef(it.defecto_id),
        })),
      }));
      await exportPNC(regsEnriquecidos, `RE-GS-06_PNC_${new Date().getFullYear()}`);
      showMsg('success', `✅ Excel exportado con ${filas.length} fila(s).`);
    } catch (e) {
      showMsg('error', `Error al exportar: ${e.message}`);
    } finally {
      setExporting(false);
    }
  };

  const downloadCatalogo = (tipo) => {
    const isRef = tipo === 'referencias';
    const wb    = XLSX.utils.book_new();
    const ws    = XLSX.utils.aoa_to_sheet([
      [isRef ? 'CATÁLOGO DE REFERENCIAS' : 'TABLA DE DEFECTOS PNC'],
      isRef ? ['REF','CATEGORÍA'] : ['CÓDIGO','PRODUCTO NO CONFORME'],
      ...(isRef ? referencias.map(r=>[r.ref,r.categoria]) : defectos.map(d=>[d.codigo,d.nombre])),
    ]);
    ws['!cols'] = [{ wch:12 },{ wch:48 }];
    XLSX.utils.book_append_sheet(wb, ws, isRef ? 'Referencias' : 'Defectos');
    XLSX.writeFile(wb, isRef ? 'REFERENCIAS_PNC.xlsx' : 'TABLA_DEFECTOS_PNC.xlsx');
  };

  // ── Indicadores ────────────────────────────────────────────────────────────
  const resumen = useMemo(() => {
    const mapa = {};
    filas.forEach(it => {
      const def = getDef(it.defecto_id);
      const cat = def ? `${def.codigo} — ${def.nombre}` : (it.defecto_texto || 'Sin categoría');
      if (!mapa[cat]) mapa[cat] = { total: 0, ocurrencias: 0 };
      mapa[cat].total       += it.total || 0;
      mapa[cat].ocurrencias += 1;
    });
    return Object.entries(mapa).map(([cat, v]) => ({ cat, ...v })).sort((a,b) => b.total - a.total);
  }, [filas, defectos]);
  const totalPNC = resumen.reduce((s,r) => s + r.total, 0);

  const handleSaveProd = async () => {
    if (!pTotal || parseInt(pTotal) <= 0) return;
    setSavingP(true);
    try {
      await saveProduccion({ anio: pAnio, mes: pMes, total_produccion: parseInt(pTotal,10), observaciones: pObs });
      showMsg('success', '✅ Producción guardada.'); setPTotal(''); setPObs(''); await fetchAll();
    } catch (e) { showMsg('error', `Error: ${e.message}`); }
    finally { setSavingP(false); }
  };

  const handleDeleteProduccion = async (p) => {
    if (!window.confirm(`¿Eliminar la producción de ${MESES[p.mes-1]} ${p.anio}?\nEsta acción no afecta las filas de PNC.`)) return;
    const r = await deleteProduccion(p.id);
    if (r.success) showMsg('success', `🗑️ Producción de ${MESES[p.mes-1]} ${p.anio} eliminada.`);
    else           showMsg('error', `Error: ${r.error}`);
  };

  const catalogData = useMemo(() => {
    const q = catalogSearch.toLowerCase();
    if (catalogModal.tipo === 'referencias') {
      return referencias.filter(r => !q || r.ref.toLowerCase().includes(q) || (r.categoria||'').toLowerCase().includes(q));
    }
    if (catalogModal.tipo === 'defectos') {
      return defectos.filter(d => !q || d.codigo.toLowerCase().includes(q) || d.nombre.toLowerCase().includes(q));
    }
    return [];
  }, [catalogModal, catalogSearch, referencias, defectos]);

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-xl font-bold" style={{ color: C.primary }}>Producto No Conforme</h2>
          <p className="text-sm text-gray-500">RE-GS-06 · Control de Producto No Conforme</p>
        </div>
        {onBack && (
          <Button variant="outline" size="sm" onClick={onBack}>Volver</Button>
        )}
      </div>

      {actionMsg && (
        <Alert variant={actionMsg.type === 'error' ? 'destructive' : 'default'}
          style={actionMsg.type === 'success' ? { borderColor: C.accent, background: '#f0f9f4' } : {}}>
          <AlertDescription>{actionMsg.text}</AlertDescription>
        </Alert>
      )}

      {/* Tabs */}
      <div className="inline-flex gap-1 p-1 rounded-lg" style={{ background: C.beige }}>
        {[{ id:'registros', label:'Consolidado', icon:FileSpreadsheet },
          { id:'indicadores', label:'Indicadores', icon:BarChart3 }].map(({ id, label, icon:Icon }) => (
          <button key={id} onClick={() => setTab(id)}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-md text-sm font-medium transition-all"
            style={{ background: tab===id ? C.primary : 'transparent', color: tab===id ? '#fff' : '#374151' }}>
            <Icon className="h-4 w-4" />{label}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          TAB 1 — CONSOLIDADO
      ══════════════════════════════════════════════════════════════════ */}
      {tab === 'registros' && (
        <Card className="border-2" style={{ borderColor: C.accent }}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <CardTitle style={{ color: C.primary }}>CONTROL DE PRODUCTO NO CONFORME</CardTitle>
                <CardDescription>RE-GS-06 · Versión 01 · Formulario consolidado</CardDescription>
              </div>
              <div style={{ display:'flex', gap:8 }}>
                {canExport && <Button variant="outline" size="sm"
                  onClick={exportarTodo}
                  disabled={exporting || filas.length === 0}
                  style={{ fontSize:12, borderColor: C.primary, color: C.primary, opacity: exporting ? 0.6 : 1 }}>
                  {exporting
                    ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Generando...</>
                    : <><FileSpreadsheet className="h-4 w-4 mr-1" />Exportar Excel</>}
                </Button>}
                {canCreate && <Button size="sm" onClick={openNew} style={{ backgroundColor: C.primary }} className="text-white">
                  <Plus className="h-4 w-4 mr-1" />Agregar Fila
                </Button>}
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-3">
            <div className="flex gap-2 flex-wrap items-center">
              <div className="relative flex-1 min-w-48">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input placeholder="Buscar mes, sección, referencia, defecto..." value={search}
                  onChange={e => setSearch(e.target.value)} className="pl-10 text-sm" />
              </div>
              <Button variant="outline" size="sm" onClick={fetchAll}>
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm"
                onClick={() => { setCatalogSearch(''); setCatalogModal({ open:true, tipo:'referencias' }); }}
                className="border-amber-300 text-amber-700 hover:bg-amber-50">
                <Eye className="h-4 w-4 mr-1.5" />Referencias
              </Button>
              <Button variant="outline" size="sm"
                onClick={() => { setCatalogSearch(''); setCatalogModal({ open:true, tipo:'defectos' }); }}
                className="border-blue-300 text-blue-700 hover:bg-blue-50">
                <Eye className="h-4 w-4 mr-1.5" />Tabla Defectos
              </Button>
            </div>

            <div className="border rounded-lg" style={{ overflowX:'auto', paddingBottom:2 }}>
              <div style={{ zoom:'0.9', minWidth:'fit-content', paddingBottom:8 }}>
                {loading ? (
                  <div className="flex items-center justify-center p-12">
                    <Loader2 className="h-8 w-8 animate-spin" style={{ color: C.accent }} />
                    <span className="ml-3 text-gray-600">Cargando...</span>
                  </div>
                ) : error ? (
                  <Alert variant="destructive" className="m-4">
                    <AlertTriangle className="h-4 w-4" /><AlertDescription>{error}</AlertDescription>
                  </Alert>
                ) : filasFiltradas.length === 0 ? (
                  <div className="text-center p-12 text-gray-400">
                    <AlertTriangle className="h-10 w-10 mx-auto mb-3 opacity-30" />
                    <p className="font-medium">{search ? 'Sin resultados.' : 'No hay filas registradas aún.'}</p>
                    {!search && <p className="text-sm mt-1">Agrega la primera con "Agregar Fila"</p>}
                  </div>
                ) : (
                  <table style={{ borderCollapse:'collapse', width:'100%', tableLayout:'fixed' }}>
                    <colgroup>
                      <col style={{ width:64  }} />{/* Acciones */}
                      <col style={{ width:34  }} />{/* N° */}
                      <col style={{ width:80  }} />{/* Mes */}
                      <col style={{ width:84  }} />{/* Sección */}
                      <col style={{ width:60  }} />{/* Referencia */}
                      <col style={{ width:76  }} />{/* Fecha reporte */}
                      <col style={{ width:180 }} />{/* Defecto/Descripción */}
                      <col style={{ width:90  }} />{/* Operación origen */}
                      <col style={{ width:56  }} />{/* Cantidad */}
                      <col style={{ width:130 }} />{/* Cómo se solucionó */}
                      <col style={{ width:100 }} />{/* Responsable trat. */}
                      <col style={{ width:76  }} />{/* Fecha verif. */}
                      <col style={{ width:100 }} />{/* Responsable verif. */}
                    </colgroup>
                    <thead>
                      <tr>
                        <HHead bg="#E2EFDA">ACC.</HHead>
                        <HHead bg={XL.identificacion} colSpan={2}>IDENTIFICACIÓN</HHead>
                        <HHead bg={XL.descripcion}    colSpan={4}>DESCRIPCIÓN</HHead>
                        <HHead bg={XL.causa}          colSpan={2}>CAUSA/ORIGEN</HHead>
                        <HHead bg={XL.tratamiento}    colSpan={2} textColor="#fff">TRATAMIENTO</HHead>
                        <HHead bg={XL.verificacion}   colSpan={2}>VERIFICACIÓN</HHead>
                      </tr>
                      <tr>
                        <VHead w={64}></VHead>
                        <VHead w={34}>N°</VHead>
                        <VHead w={80}>Mes</VHead>
                        <VHead w={84}>Sección</VHead>
                        <VHead w={60}>Ref.</VHead>
                        <VHead w={76}>Fecha|Reporte</VHead>
                        <VHead w={180}>Producto No|Conforme</VHead>
                        <VHead w={90}>Operación|Origen</VHead>
                        <VHead w={56}>Cant.</VHead>
                        <VHead w={130}>Cómo se|Solucionó</VHead>
                        <VHead w={100}>Responsable</VHead>
                        <VHead w={76}>Fecha|Verif.</VHead>
                        <VHead w={100}>Responsable|Verif.</VHead>
                      </tr>
                    </thead>
                    <tbody>
                      {filasFiltradas.map((f, idx) => {
                        const ref = getRef(f.referencia_id);
                        const def = getDef(f.defecto_id);
                        const bg  = idx % 2 === 0 ? XL.rowOdd : XL.rowEven;
                        return (
                          <tr key={f.id}>
                            <Cell center bg={bg}>
                              <div className="flex items-center justify-center gap-1">
                                {canEdit && (
                                  <button onClick={() => openEdit(f)} className="p-1 rounded hover:bg-gray-100" title="Editar">
                                    <Edit className="h-3.5 w-3.5" style={{ color: C.primary }} />
                                  </button>
                                )}
                                {canDelete && (
                                  <button onClick={() => handleDelete(f)} disabled={deletingId === f.id}
                                    className="p-1 rounded hover:bg-red-50" title="Eliminar">
                                    {deletingId === f.id
                                      ? <Loader2 className="h-3.5 w-3.5 animate-spin text-red-400" />
                                      : <Trash2 className="h-3.5 w-3.5 text-red-400" />}
                                  </button>
                                )}
                              </div>
                            </Cell>
                            <Cell center bg={bg}>{f.numero_fila}</Cell>
                            <Cell center bg={bg}>{MESES[f.mes-1]}</Cell>
                            <Cell bg={bg}>{f.seccion || '—'}</Cell>
                            <Cell center bg={bg}>{ref ? ref.ref : (f.referencia_texto || '—')}</Cell>
                            <Cell center bg={bg}><Fecha v={f.fecha_reporte} /></Cell>
                            <Cell bg={bg}>{def ? `${def.codigo} — ${def.nombre}` : (f.defecto_texto || '—')}</Cell>
                            <Cell bg={bg}>{f.operacion_origen || '—'}</Cell>
                            <Cell center bg={bg}>{f.total ?? '—'}</Cell>
                            <Cell bg={bg}>{f.tratamiento_descripcion || '—'}</Cell>
                            <Cell bg={bg}>{f.tratamiento_responsable || '—'}</Cell>
                            <Cell center bg={bg}><Fecha v={f.verificacion_fecha} /></Cell>
                            <Cell bg={bg}>{f.verificacion_responsable || '—'}</Cell>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          TAB 2 — INDICADORES
      ══════════════════════════════════════════════════════════════════ */}
      {tab === 'indicadores' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card><CardContent className="pt-6">
              <p className="text-xs text-gray-500 uppercase font-medium">Total Filas</p>
              <p className="text-2xl font-bold" style={{ color: C.primary }}>{filas.length}</p>
            </CardContent></Card>
            <Card><CardContent className="pt-6">
              <p className="text-xs text-gray-500 uppercase font-medium">Total Unidades PNC</p>
              <p className="text-2xl font-bold" style={{ color: C.primary }}>{totalPNC}</p>
            </CardContent></Card>
            <Card><CardContent className="pt-6">
              <p className="text-xs text-gray-500 uppercase font-medium">Categorías Afectadas</p>
              <p className="text-2xl font-bold" style={{ color: C.primary }}>{resumen.length}</p>
            </CardContent></Card>
          </div>

          <Card>
            <CardHeader><CardTitle className="text-base" style={{ color: C.primary }}>Resumen por Categoría de Defecto</CardTitle></CardHeader>
            <CardContent>
              <table className="w-full text-sm">
                <thead><tr className="border-b" style={{ borderColor: C.beige }}>
                  <th className="text-left py-2">Defecto</th>
                  <th className="text-center py-2">Ocurrencias</th>
                  <th className="text-center py-2">Total Unidades</th>
                </tr></thead>
                <tbody>
                  {resumen.map(r => (
                    <tr key={r.cat} className="border-b" style={{ borderColor: '#f0f0f0' }}>
                      <td className="py-2">{r.cat}</td>
                      <td className="text-center py-2">{r.ocurrencias}</td>
                      <td className="text-center py-2 font-semibold">{r.total}</td>
                    </tr>
                  ))}
                  {resumen.length === 0 && (
                    <tr><td colSpan={3} className="text-center py-6 text-gray-400">Sin datos aún.</td></tr>
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base" style={{ color: C.primary }}>Producción Mensual</CardTitle>
              <CardDescription>Registra el total de unidades producidas para calcular el % de PNC/producción.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Año</label>
                  <Input type="number" value={pAnio} onChange={e => setPAnio(parseInt(e.target.value))} className="text-sm" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Mes</label>
                  <select value={pMes} onChange={e => setPMes(parseInt(e.target.value))} className="w-full p-2 border rounded text-sm">
                    {MESES.map((m,i) => <option key={m} value={i+1}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Total Producido</label>
                  <Input type="number" min="0" value={pTotal} onChange={e => setPTotal(e.target.value)} placeholder="0" className="text-sm" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Observaciones</label>
                  <Input value={pObs} onChange={e => setPObs(e.target.value)} placeholder="Opcional" className="text-sm" />
                </div>
              </div>
              <Button onClick={handleSaveProd} disabled={savingP} style={{ backgroundColor: C.primary }} className="text-white">
                {savingP ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Guardando...</> : <>Guardar Producción</>}
              </Button>

              <table className="w-full text-sm mt-4">
                <thead><tr className="border-b" style={{ borderColor: C.beige }}>
                  <th className="text-left py-2">Mes/Año</th>
                  <th className="text-center py-2">Producción</th>
                  <th className="text-center py-2">PNC</th>
                  <th className="text-center py-2">% PNC</th>
                  <th className="text-center py-2"></th>
                </tr></thead>
                <tbody>
                  {produccion.map(p => {
                    const pncMes = filas.filter(f => f.anio === p.anio && f.mes === p.mes).reduce((s,f) => s + (f.total||0), 0);
                    const pct = p.total_produccion ? (pncMes / p.total_produccion * 100) : 0;
                    const color = pct < 2 ? '#16a34a' : pct <= 5 ? '#d97706' : '#dc2626';
                    return (
                      <tr key={p.id} className="border-b" style={{ borderColor: '#f0f0f0' }}>
                        <td className="py-2">{MESES[p.mes-1]} {p.anio}</td>
                        <td className="text-center py-2">{p.total_produccion}</td>
                        <td className="text-center py-2">{pncMes}</td>
                        <td className="text-center py-2 font-semibold" style={{ color }}>{pct.toFixed(2)}%</td>
                        <td className="text-center py-2">
                          <button onClick={() => handleDeleteProduccion(p)} className="p-1 rounded hover:bg-red-50">
                            <Trash2 className="h-3.5 w-3.5 text-red-400" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {produccion.length === 0 && (
                    <tr><td colSpan={5} className="text-center py-6 text-gray-400">Sin producción registrada.</td></tr>
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          MODAL — Agregar / Editar fila
      ══════════════════════════════════════════════════════════════════ */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0">
          <div className="px-6 py-4 border-b" style={{ borderColor: C.beige, background: XL.colBg }}>
            <h3 className="font-bold text-base" style={{ color: C.primary }}>
              {editingRow ? 'Editar Fila' : 'Agregar Fila al Consolidado'}
            </h3>
          </div>

          <div className="p-6 space-y-4">
            {/* IDENTIFICACION */}
            <div style={{ borderLeft:`3px solid ${XL.identificacion}`, paddingLeft:10 }}>
              <p className="text-xs font-bold mb-2 uppercase" style={{ color:'#856404' }}>Identificación</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Año</label>
                  <Input type="number" min="2020" max="2099" value={form.anio}
                    onChange={e => setF('anio', parseInt(e.target.value))} disabled={!!editingRow} className="text-sm" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Mes</label>
                  <select value={form.mes} onChange={e => setF('mes', parseInt(e.target.value))}
                    disabled={!!editingRow} className="w-full p-2 border rounded text-sm">
                    {MESES.map((m,i) => <option key={m} value={i+1}>{m}</option>)}
                  </select>
                </div>
              </div>
              {editingRow && <p className="text-xs text-gray-400 mt-1">El año y mes no se pueden cambiar al editar.</p>}
            </div>

            {/* DESCRIPCION */}
            <div style={{ borderLeft:`3px solid ${XL.descripcion}`, paddingLeft:10 }}>
              <p className="text-xs font-bold mb-2 uppercase" style={{ color:'#2d6a4f' }}>Descripción</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                <SelectConOtro label="Sección que identifica" options={SECCIONES}
                  value={form.seccion} otro={form.seccion_otro}
                  onChange={v => setF('seccion', v)} onChangeOtro={v => setF('seccion_otro', v)} />
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Referencia</label>
                  <ComboboxInput value={form.referencia_obj} onChange={v => setF('referencia_obj', v)}
                    options={referencias} placeholder="Ej: 107, 1283..." getLabel={r=>r.categoria||''} getId={r=>r.ref} />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Fecha Reporte *</label>
                  <Input type="date" value={form.fecha_reporte} onChange={e => setF('fecha_reporte', e.target.value)} className="text-sm" />
                </div>
                <div className="md:col-span-2">
                  <label className="text-xs font-medium text-gray-600 block mb-1">Código del Defecto (autocompleta descripción)</label>
                  <ComboboxInput value={form.defecto_obj} onChange={v => setF('defecto_obj', v)}
                    options={defectos} placeholder="Busca por código (D1..D38) o nombre" getLabel={d=>d.nombre} getId={d=>d.codigo} />
                </div>
              </div>
            </div>

            {/* CAUSA/ORIGEN */}
            <div style={{ borderLeft:`3px solid ${XL.causa}`, paddingLeft:10 }}>
              <p className="text-xs font-bold mb-2 uppercase" style={{ color:'#155b9e' }}>Análisis de Causa / Origen</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <SelectConOtro label="Operación de Origen" options={OPERACIONES_ORIGEN}
                  value={form.operacion_origen} otro={form.operacion_origen_otro}
                  onChange={v => setF('operacion_origen', v)} onChangeOtro={v => setF('operacion_origen_otro', v)} />
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Cantidad</label>
                  <Input type="number" min="0" value={form.total} onChange={e => setF('total', e.target.value)} placeholder="0" className="text-sm" />
                </div>
              </div>
            </div>

            {/* TRATAMIENTO */}
            <div style={{ borderLeft:`3px solid ${XL.tratamiento}`, paddingLeft:10 }}>
              <p className="text-xs font-bold mb-2 uppercase" style={{ color:'#166534' }}>Tratamiento</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <SelectConOtro label="¿Cómo se solucionó?" options={SOLUCIONES}
                  value={form.como_solucion} otro={form.como_solucion_otro}
                  onChange={v => setF('como_solucion', v)} onChangeOtro={v => setF('como_solucion_otro', v)} />
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Responsable</label>
                  <Input value={form.tratamiento_responsable} onChange={e => setF('tratamiento_responsable', e.target.value)} placeholder="Nombre" className="text-sm" />
                </div>
              </div>
            </div>

            {/* VERIFICACION */}
            <div style={{ borderLeft:`3px solid ${XL.verificacion}`, paddingLeft:10 }}>
              <p className="text-xs font-bold mb-2 uppercase" style={{ color:'#166534' }}>Verificación</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Fecha</label>
                  <Input type="date" value={form.verificacion_fecha} onChange={e => setF('verificacion_fecha', e.target.value)} className="text-sm" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Responsable</label>
                  <Input value={form.verificacion_responsable} onChange={e => setF('verificacion_responsable', e.target.value)} placeholder="Quien verifica" className="text-sm" />
                </div>
              </div>
            </div>
          </div>

          <div className="px-6 py-4 border-t flex justify-end gap-3" style={{ borderColor: C.beige, background:'#fafaf8' }}>
            <Button variant="outline" onClick={() => setFormOpen(false)} disabled={saving} className="border-2 px-5" style={{ borderColor: C.beige }}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving} className="px-6 text-white font-semibold" style={{ backgroundColor: C.primary }}>
              {saving
                ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Guardando...</>
                : <><Check className="h-4 w-4 mr-2" />{editingRow ? 'Guardar Cambios' : 'Agregar Fila'}</>}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ══════════════════════════════════════════════════════════════════
          MODAL — Catálogos (Referencias / Defectos)
      ══════════════════════════════════════════════════════════════════ */}
      <Dialog open={catalogModal.open} onOpenChange={(o) => setCatalogModal({ open:o, tipo: o ? catalogModal.tipo : null })}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold" style={{ color: C.primary }}>
              {catalogModal.tipo === 'referencias' ? 'Catálogo de Referencias' : 'Tabla de Defectos'}
            </h3>
            <Button variant="outline" size="sm" onClick={() => downloadCatalogo(catalogModal.tipo)}>
              <FileSpreadsheet className="h-4 w-4 mr-1" />Descargar
            </Button>
          </div>
          <Input placeholder="Buscar..." value={catalogSearch} onChange={e => setCatalogSearch(e.target.value)} className="mb-3 text-sm" />
          <table className="w-full text-sm">
            <tbody>
              {catalogData.map((item, i) => (
                <tr key={i} className="border-b" style={{ borderColor: '#f0f0f0' }}>
                  <td className="py-1.5 font-mono font-bold" style={{ color: C.primary, width: 70 }}>
                    {catalogModal.tipo === 'referencias' ? item.ref : item.codigo}
                  </td>
                  <td className="py-1.5">{catalogModal.tipo === 'referencias' ? item.categoria : item.nombre}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </DialogContent>
      </Dialog>

    </div>
  );
}