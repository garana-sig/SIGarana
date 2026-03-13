// src/components/modules/MejoramientoContinuo/ProductoNoConforme/ProductoNoConformeManager.jsx
// Visual fiel al formato físico RE-GS-06  ·  mismo patrón que AccionesMejoraManager

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/app/components/ui/card';
import { Button }  from '@/app/components/ui/button';
import { Input }   from '@/app/components/ui/input';
import { Alert, AlertDescription } from '@/app/components/ui/alert';
import { Dialog, DialogContent } from '@/app/components/ui/dialog';
import {
  Plus, RefreshCw, Search, Loader2, AlertTriangle, ChevronLeft,
  Edit, Trash2, Download, X, Check, BarChart3, ClipboardList,
  TrendingDown, Factory, BookOpen, FileSpreadsheet, CheckCircle2, Eye,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { exportPNC } from '@/utils/exportPNC';
import { usePNC, MESES, fmtFecha } from '@/hooks/usePNC';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';

// ── Paleta del proyecto ───────────────────────────────────────────────────────
const C = { primary: '#2e5244', secondary: '#6f7b2c', accent: '#6dbd96', beige: '#dedecc' };

// ── Colores exactos del formato RE-GS-06 ──────────────────────────────────────
const XL = {
  identificacion: '#FFFF00',
  descripcion:    '#92D050',
  causa:          '#9DC3E6',
  tratamiento:    '#70AD47',
  clasificacion:  '#FFC000',
  verificacion:   '#C6EFCE',
  colBg:          '#DEEAF1',
  border:         '#A6B8C2',
  rowOdd:         '#FFFFFF',
  rowEven:        '#F2F9F5',
  rowHover:       '#EBF5FB',
  regBg:          '#E8F5E9',
  accBg:          '#EDF7ED',
};

// ── Helpers de tabla ──────────────────────────────────────────────────────────
const HHead = ({ children, bg, colSpan=1, rowSpan=1, textColor='#1F2937' }) => (
  <th colSpan={colSpan} rowSpan={rowSpan} style={{
    backgroundColor: bg, border:`1px solid ${XL.border}`,
    textAlign:'center', verticalAlign:'middle',
    padding:'4px 6px', fontSize:11, fontWeight:700,
    textTransform:'uppercase', color:textColor, whiteSpace:'nowrap',
  }}>{children}</th>
);

const VHead = ({ children, rowSpan=1, colSpan=1, w=28 }) => {
  const lines = typeof children === 'string' ? children.split('|') : [children];
  return (
    <th rowSpan={rowSpan} colSpan={colSpan} style={{
      backgroundColor: XL.colBg, border:`1px solid ${XL.border}`,
      padding:0, width:w, minWidth:w, maxWidth:w,
    }}>
      <div style={{ display:'flex', justifyContent:'center', alignItems:'flex-end', height:100, paddingBottom:5 }}>
        <div style={{
          writingMode:'vertical-rl', transform:'rotate(180deg)',
          fontSize:11, fontWeight:600, textTransform:'uppercase',
          color:'#1F2937', textAlign:'center', lineHeight:1.3,
          display:'flex', flexDirection:'column', alignItems:'center',
        }}>
          {lines.map((l,i) => <span key={i} style={{ whiteSpace:'nowrap', display:'block' }}>{l}</span>)}
        </div>
      </div>
    </th>
  );
};

const Cell = ({ children, center, bold, color, maxW, bg }) => (
  <td style={{
    border:`1px solid ${XL.border}`, padding:'4px 6px', fontSize:12,
    textAlign: center ? 'center' : 'left', fontWeight: bold ? 600 : 400,
    color: color || '#1F2937', maxWidth:maxW, verticalAlign:'middle',
    backgroundColor:bg, wordBreak:'break-word', overflowWrap:'break-word',
  }}>{children}</td>
);

const Tick = ({ v }) =>
  v ? <span style={{ color: C.primary, fontSize:14, fontWeight:700 }}>✓</span>
    : <span style={{ color:'#D1D5DB', fontSize:12 }}>—</span>;

const Clamp = ({ v, muted }) => (
  <div style={{
    display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical',
    overflow:'hidden', color: muted ? '#6B7280' : '#1F2937',
    fontSize:12, wordBreak:'break-word',
  }} title={v||''}>{v||'—'}</div>
);

const Fecha = ({ v }) => {
  if (!v) return <span style={{ color:'#C0C0C0' }}>—</span>;
  return <>{new Date(v+'T00:00:00').toLocaleDateString('es-CO',{ day:'2-digit', month:'2-digit', year:'2-digit' })}</>;
};

// ── Autocomplete ──────────────────────────────────────────────────────────────
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

  const handleSelect = (opt) => {
    onChange(opt);
    setQuery('');
    setOpen(false);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange(null);
    setQuery('');
    setOpen(false);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  // Item seleccionado → mostrar chip verde con X para cambiar
  if (value) {
    return (
      <div
        className="w-full flex items-center justify-between px-3 py-2 border rounded-lg text-sm cursor-pointer"
        style={{ background: "#f0f7f4", borderColor: "#6dbd96", minHeight: 38 }}
      >
        <div className="flex flex-col min-w-0">
          <span className="font-semibold font-mono truncate" style={{ color: "#2e5244", fontSize: 12 }}>
            {getId(value)}
          </span>
          {getLabel(value) && (
            <span className="text-xs text-gray-500 truncate">{getLabel(value)}</span>
          )}
        </div>
        <button
          type="button"
          onMouseDown={handleClear}
          className="ml-2 flex-shrink-0 p-0.5 rounded-full hover:bg-red-100 transition-colors"
          title="Cambiar"
        >
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
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); if (!e.target.value) onChange(null); }}
          onFocus={() => { setFocused(true); setOpen(true); }}
          onBlur={() => { setFocused(false); setTimeout(() => setOpen(false), 180); }}
          placeholder={placeholder}
          className="w-full pl-8 pr-3 py-2 border rounded-lg text-sm outline-none transition-colors"
          style={{
            borderColor: focused ? "#6dbd96" : "#E5E7EB",
            boxShadow: focused ? "0 0 0 2px #6dbd9630" : "none",
          }}
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
                <button key={getId(opt) + i} type="button"
                  onMouseDown={() => handleSelect(opt)}
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
const AutocompleteInput = ComboboxInput;


function CheckField({ label, checked, onChange }) {
  return (
    <label className="flex items-center gap-1.5 cursor-pointer text-sm select-none">
      <button type="button" onClick={() => onChange(!checked)}
        className="w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors"
        style={{ background: checked ? C.primary : '#fff', borderColor: checked ? C.primary : '#D1D5DB' }}>
        {checked && <Check style={{ width:10, height:10, color:'#fff', strokeWidth:3 }} />}
      </button>
      <span className="text-gray-700">{label}</span>
    </label>
  );
}

// ── Estado vacío de un ítem ───────────────────────────────────────────────────
const HOY     = new Date().toISOString().slice(0, 10);
const AÑO_HOY = new Date().getFullYear();
const MES_HOY = new Date().getMonth() + 1;

const emptyItem = () => ({
  _key: crypto.randomUUID(),
  referencia_obj:  null, fecha_reporte:  HOY,
  defecto_obj:     null, total:          '',
  causa_modulo: false,   causa_operacion: false, causa_insumo: false,
  causa_corte:  false,   causa_sublimacion: false, causa_revision: false,
  tratamiento_fecha: '',       tratamiento_descripcion: '', tratamiento_responsable: '',
  clasificacion_correccion: false, clasificacion_reclasificacion: false, clasificacion_concesion: false,
  verificacion_fecha: '',      verificacion_responsable: '',
});

const dbItemToForm = (it, refs, defs) => ({
  _key: it.id, id: it.id,
  referencia_obj: it.referencia_id ? (refs.find(r => r.id === it.referencia_id) || null) : null,
  fecha_reporte:  it.fecha_reporte || HOY,
  defecto_obj:    it.defecto_id    ? (defs.find(d => d.id === it.defecto_id)    || null) : null,
  total: it.total ?? '',
  causa_modulo:      !!it.causa_modulo,      causa_operacion:  !!it.causa_operacion,
  causa_insumo:      !!it.causa_insumo,      causa_corte:      !!it.causa_corte,
  causa_sublimacion: !!it.causa_sublimacion, causa_revision:   !!it.causa_revision,
  tratamiento_fecha:       it.tratamiento_fecha        || '',
  tratamiento_descripcion: it.tratamiento_descripcion  || '',
  tratamiento_responsable: it.tratamiento_responsable  || '',
  clasificacion_correccion:      !!it.clasificacion_correccion,
  clasificacion_reclasificacion: !!it.clasificacion_reclasificacion,
  clasificacion_concesion:       !!it.clasificacion_concesion,
  verificacion_fecha:      it.verificacion_fecha       || '',
  verificacion_responsable:it.verificacion_responsable || '',
});

// ═════════════════════════════════════════════════════════════════════════════
//  COMPONENTE PRINCIPAL
// ═════════════════════════════════════════════════════════════════════════════
export default function ProductoNoConformeManager({ onBack }) {
  const { profile, hasPermission } = useAuth();
  const isAdmin    = profile?.role === 'admin';
  const isGerencia = profile?.role === 'gerencia';

  const canCreate = isAdmin || isGerencia || hasPermission('pnc:create');
  const canEdit   = isAdmin || isGerencia || hasPermission('pnc:edit');
  const canDelete = isAdmin               || hasPermission('pnc:delete');
  const canExport = isAdmin || isGerencia || hasPermission('pnc:export');

  const { defectos, referencias, registros, produccion,
          loading, error,
          fetchAll, createRegistro, updateRegistro, deleteRegistro, saveProduccion, deleteProduccion } = usePNC();

  const [tab,        setTab]        = useState('registros');
  const [actionMsg,  setActionMsg]  = useState(null);
  const [search,     setSearch]     = useState('');
  const [modalOpen,  setModalOpen]  = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [saving,     setSaving]     = useState(false);
  const [deleting,     setDeleting]     = useState(null);
  const [deletingProd, setDeletingProd] = useState(null);

  // Modal visualización de registro
  const [viewOpen,    setViewOpen]    = useState(false);
  const [viewTarget,  setViewTarget]  = useState(null);
  const [downloading, setDownloading] = useState(false);
  const [exporting,   setExporting]   = useState(false);

  // Modal catálogos (Referencias / Defectos)
  const [catalogModal,  setCatalogModal]  = useState({ open: false, tipo: null });
  const [catalogSearch, setCatalogSearch] = useState('');

  // Form state
  const [fAnio,    setFAnio]    = useState(AÑO_HOY);
  const [fMes,     setFMes]     = useState(MES_HOY);
  const [fProceso, setFProceso] = useState('');
  const [fItems,   setFItems]   = useState([emptyItem()]);
  const [consec,   setConsec]   = useState(1);

  // Indicadores form
  const [pAnio,  setPAnio]  = useState(AÑO_HOY);
  const [pMes,   setPMes]   = useState(MES_HOY);
  const [pTotal, setPTotal] = useState('');
  const [pObs,   setPObs]   = useState('');
  const [savingP,setSavingP]= useState(false);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    if (editTarget) return;
    const max = registros.filter(r => r.anio === fAnio)
      .reduce((m, r) => Math.max(m, r.consecutivo_anual), 0);
    setConsec(max + 1);
  }, [fAnio, registros, editTarget]);

  const showMsg = useCallback((type, text) => {
    setActionMsg({ type, text });
    setTimeout(() => setActionMsg(null), 4000);
  }, []);

  const getRef = (id) => id ? referencias.find(r => r.id === id) : null;
  const getDef = (id) => id ? defectos.find(d => d.id === id)    : null;

  const regsFiltered = useMemo(() =>
    registros.filter(r =>
      !search ||
      String(r.consecutivo_anual).includes(search) ||
      MESES[r.mes-1].toLowerCase().includes(search.toLowerCase()) ||
      (r.proceso||'').toLowerCase().includes(search.toLowerCase())
    ), [registros, search]);

  // ── CRUD ───────────────────────────────────────────────────────────────────
  const openNew = () => {
    setEditTarget(null); setFAnio(AÑO_HOY); setFMes(MES_HOY); setFProceso('');
    setFItems([emptyItem()]); setModalOpen(true);
  };
  const openEdit = (reg) => {
    setEditTarget(reg); setFAnio(reg.anio); setFMes(reg.mes); setFProceso(reg.proceso||'');
    const its = (reg.pnc_item||[]).sort((a,b)=>a.numero_fila-b.numero_fila)
      .map(it => dbItemToForm(it, referencias, defectos));
    setFItems(its.length ? its : [emptyItem()]); setModalOpen(true);
  };
  const handleSave = async () => {
    if (fItems.some(it => !it.fecha_reporte)) {
      showMsg('error', 'Todas las filas necesitan fecha de reporte.'); return;
    }
    setSaving(true);
    try {
      if (editTarget) {
        await updateRegistro(editTarget.id, { mes:fMes, proceso:fProceso, items:fItems });
        showMsg('success', '✅ Registro actualizado.');
      } else {
        await createRegistro({ anio:fAnio, mes:fMes, proceso:fProceso, items:fItems });
        showMsg('success', '✅ Registro creado.');
      }
      setModalOpen(false); await fetchAll();
    } catch (e) { showMsg('error', `Error: ${e.message}`); }
    finally { setSaving(false); }
  };
  const handleDelete = async (reg) => {
    if (!window.confirm(`¿Eliminar el registro N° ${String(reg.consecutivo_anual).padStart(2,'0')}/${reg.anio}?`)) return;
    setDeleting(reg.id);
    try { await deleteRegistro(reg.id); showMsg('success', '🗑️ Registro eliminado.'); await fetchAll(); }
    catch (e) { showMsg('error', `Error: ${e.message}`); }
    finally { setDeleting(null); }
  };
  const handleDeleteProduccion = async (p) => {
    if (!window.confirm(`¿Eliminar la producción de ${MESES[p.mes-1]} ${p.anio}?\nEsta acción no afecta los registros PNC.`)) return;
    setDeletingProd(p.id);
    const r = await deleteProduccion(p.id);
    if (r.success) showMsg('success', `🗑️ Producción de ${MESES[p.mes-1]} ${p.anio} eliminada.`);
    else           showMsg('error', `Error: ${r.error}`);
    setDeletingProd(null);
  };

  const setItemField = (key, field, value) =>
    setFItems(prev => prev.map(it => it._key === key ? { ...it, [field]: value } : it));

  // ── Exportar TODOS los registros sobre la plantilla RE-GS-06 del Storage ───
  const exportarTodo = async () => {
    if (exporting || registros.length === 0) return;
    setExporting(true);
    try {
      // Enriquecer ítems con objetos ref/defecto para exportPNC
      const regsEnriquecidos = registros.map(reg => ({
        ...reg,
        pnc_item: (reg.pnc_item || []).map(it => ({
          ...it,
          referencia_obj: getRef(it.referencia_id),
          defecto_obj:    getDef(it.defecto_id),
        })),
      }));
      await exportPNC(regsEnriquecidos, `RE-GS-06_PNC_${new Date().getFullYear()}`);
      showMsg('success', `✅ Excel exportado con ${registros.length} registro(s).`);
    } catch (e) {
      showMsg('error', `Error al exportar: ${e.message}`);
    } finally {
      setExporting(false);
    }
  };

    // ── Descarga catálogo (llamada desde DENTRO del modal de catálogo) ──────────
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

  // ── Descarga registro usando plantilla Excel del Storage ───────────────────
  // Sube RE-GS-06_CONTROL_PRODUCTO_NO_CONFORME.xlsx al bucket 'templates'
  // La función descarga la plantilla, inyecta los datos y la devuelve al usuario
  const downloadRegistroDesdeTemplate = async (reg) => {
    setDownloading(true);
    try {
      const fmtD = (d) => d
        ? new Date(d+'T00:00:00').toLocaleDateString('es-CO',{day:'2-digit',month:'2-digit',year:'numeric'})
        : '';

      // 1. Descargar plantilla del bucket 'templates'
      const { data: fileData, error: storageErr } = await supabase.storage
        .from('templates')
        .download('RE-GS-06_CONTROL_PRODUCTO_NO_CONFORME.xlsx');

      if (storageErr || !fileData) {
        throw new Error(
          `Plantilla no encontrada en Storage. Sube el archivo RE-GS-06_CONTROL_PRODUCTO_NO_CONFORME.xlsx al bucket 'templates'.\n${storageErr?.message || ''}`
        );
      }

      // 2. Leer como ArrayBuffer y parsear con SheetJS
      const arrayBuffer = await fileData.arrayBuffer();
      const wb = XLSX.read(arrayBuffer, {
        type: 'array',
        cellStyles: true,
        cellFormulas: true,
        bookVBA: true,
        sheetStubs: true,
      });

      const sheetName = wb.SheetNames[0];
      const ws        = wb.Sheets[sheetName];

      // Helper para escribir/sobreescribir celda
      const setC = (ref, value) => {
        const t = typeof value === 'number' ? 'n' : 's';
        if (ws[ref]) {
          ws[ref].v = value;
          ws[ref].w = String(value);
          ws[ref].t = t;
        } else {
          ws[ref] = { t, v: value, w: String(value) };
        }
      };

      // 3. Rellenar cabecera
      // Estructura REAL del RE-GS-06 (verificada del archivo xlsx):
      //   Fila 1: Título (D1) / CODIGO (V1) / VERSION (W1)
      //   Fila 2: FECHA (V2) / PAGINA (W2)
      //   Fila 3: "MES: ___  PROCESO:___" → celda C3 (fusionada A3:X3)
      //   Fila 4: Secciones (IDENTIFICACION, DESCRIPCION, etc.)
      //   Fila 5: Columnas (N°, REF, FECHA REPORTE, ...)
      //   Fila 6+: Datos
      //
      // Escribimos la línea de MES/PROCESO en C3 (celda fusionada de la fila 3)
      setC('C3', `MES: ${MESES[reg.mes-1].toUpperCase()}   ${reg.anio}        PROCESO: ${(reg.proceso||'').toUpperCase()}        N° ${String(reg.consecutivo_anual).padStart(2,'0')}`);

      // 4. Rellenar filas de datos a partir de la fila 6
      // Columnas verificadas del xlsx:
      // A=N°, B=REF, C=FECHA REPORTE, D=PRODUCTO NO CONFORME (D-H fusionadas), I=TOTAL
      // J=MODULO, K=OPERACIÓN, L=INSUMO, M=CORTE, N=SUBLIMACION, O=REVISION
      // P=FECHA (tratamiento), Q=DESCRIPCION, R=RESPONSABLE
      // S=CORRECION, T=RECLASIFICACION, U=CONCESIÓN
      // V=FECHA (verificación), W=RESPONSABLE
      const items        = (reg.pnc_item||[]).sort((a,b)=>a.numero_fila-b.numero_fila);
      const DATA_ROW_INI = 6;
      const COL = {
        n:'A', ref:'B', fechaRep:'C', pnc:'D', total:'I',
        modulo:'J', operacion:'K', insumo:'L', corte:'M', subli:'N', revision:'O',
        fechaTrat:'P', descTrat:'Q', respTrat:'R',
        correccion:'S', reclasif:'T', concesion:'U',
        fechaVer:'V', respVer:'W',
      };

      // Ampliar el rango de la hoja si hace falta
      const range   = XLSX.utils.decode_range(ws['!ref'] || 'A1:W6');
      const lastRow = DATA_ROW_INI + Math.max(items.length - 1, 0);
      if (lastRow > range.e.r + 1) { range.e.r = lastRow; ws['!ref'] = XLSX.utils.encode_range(range); }

      items.forEach((it, idx) => {
        const row = DATA_ROW_INI + idx;
        const ref = getRef(it.referencia_id);
        const def = getDef(it.defecto_id);
        setC(`${COL.n}${row}`,          String(it.numero_fila));
        setC(`${COL.ref}${row}`,        ref ? ref.ref : (it.referencia_texto||''));
        setC(`${COL.fechaRep}${row}`,   fmtD(it.fecha_reporte));
        setC(`${COL.pnc}${row}`,        def ? `${def.codigo} — ${def.nombre}` : (it.defecto_texto||''));
        setC(`${COL.total}${row}`,      it.total != null ? it.total : '');
        setC(`${COL.modulo}${row}`,     it.causa_modulo      ? 'X' : '');
        setC(`${COL.operacion}${row}`,  it.causa_operacion   ? 'X' : '');
        setC(`${COL.insumo}${row}`,     it.causa_insumo      ? 'X' : '');
        setC(`${COL.corte}${row}`,      it.causa_corte       ? 'X' : '');
        setC(`${COL.subli}${row}`,      it.causa_sublimacion ? 'X' : '');
        setC(`${COL.revision}${row}`,   it.causa_revision    ? 'X' : '');
        setC(`${COL.fechaTrat}${row}`,  fmtD(it.tratamiento_fecha));
        setC(`${COL.descTrat}${row}`,   it.tratamiento_descripcion||'');
        setC(`${COL.respTrat}${row}`,   it.tratamiento_responsable||'');
        setC(`${COL.correccion}${row}`, it.clasificacion_correccion      ? 'X' : '');
        setC(`${COL.reclasif}${row}`,   it.clasificacion_reclasificacion ? 'X' : '');
        setC(`${COL.concesion}${row}`,  it.clasificacion_concesion       ? 'X' : '');
        setC(`${COL.fechaVer}${row}`,   fmtD(it.verificacion_fecha));
        setC(`${COL.respVer}${row}`,    it.verificacion_responsable||'');
      });

      // 5. Generar y disparar descarga
      const outBuffer = XLSX.write(wb, { bookType:'xlsx', type:'array', cellStyles:true });
      const blob = new Blob([outBuffer], { type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `RE-GS-06_N${String(reg.consecutivo_anual).padStart(2,'0')}_${MESES[reg.mes-1]}_${reg.anio}.xlsx`;
      document.body.appendChild(a); a.click();
      document.body.removeChild(a); URL.revokeObjectURL(url);
      showMsg('success', '✅ Formato RE-GS-06 descargado con los datos del registro.');

    } catch (e) {
      console.error('downloadRegistroDesdeTemplate:', e);
      showMsg('error', `Error al descargar: ${e.message}`);
    } finally {
      setDownloading(false);
    }
  };

  // ── Indicadores ────────────────────────────────────────────────────────────
  const resumen = useMemo(() => {
    const mapa = {};
    registros.forEach(reg => (reg.pnc_item||[]).forEach(it => {
      const def = getDef(it.defecto_id);
      const cat = def ? `${def.codigo} — ${def.nombre}` : (it.defecto_texto||'Sin categoría');
      if (!mapa[cat]) mapa[cat] = { total:0, ocurrencias:0 };
      mapa[cat].total       += it.total||0;
      mapa[cat].ocurrencias += 1;
    }));
    return Object.entries(mapa).map(([cat,v])=>({cat,...v})).sort((a,b)=>b.total-a.total);
  }, [registros, defectos]);
  const totalPNC = resumen.reduce((s,r)=>s+r.total,0);

  const handleSaveProd = async () => {
    if (!pTotal||parseInt(pTotal)<=0) return;
    setSavingP(true);
    try {
      await saveProduccion({ anio:pAnio, mes:pMes, total_produccion:parseInt(pTotal,10), observaciones:pObs });
      showMsg('success','✅ Producción guardada.'); setPTotal(''); setPObs(''); await fetchAll();
    } catch(e) { showMsg('error',`Error: ${e.message}`); }
    finally { setSavingP(false); }
  };

  // ── Datos del catálogo activo con búsqueda ─────────────────────────────────
  const catalogData = useMemo(() => {
    const q = catalogSearch.toLowerCase();
    if (catalogModal.tipo === 'referencias') {
      return referencias.filter(r => !q || r.ref.toLowerCase().includes(q) || (r.categoria||'').toLowerCase().includes(q));
    }
    if (catalogModal.tipo === 'defectos') {
      return defectos.filter(d => !q || d.codigo.toLowerCase().includes(q) || d.nombre.toLowerCase().includes(q));
    }
    return [];
  }, [catalogModal.tipo, catalogSearch, referencias, defectos]);

  // ═══════════════════════════════════════════════════════════════════════════
  //  RENDER
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div className="space-y-4 px-2">

      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ChevronLeft className="h-4 w-4 mr-1" />Volver
        </Button>
        <div>
          <h2 className="text-2xl font-bold" style={{ color: C.primary }}>Control de Producto No Conforme</h2>
          <p className="text-sm" style={{ color: C.secondary }}>Formato RE-GS-06 · Garana Art</p>
        </div>
      </div>

      {/* Flash */}
      {actionMsg && (
        <Alert variant={actionMsg.type==='error'?'destructive':'default'}
          className={actionMsg.type==='success'?'border-green-400 bg-green-50':''}>
          {actionMsg.type==='success'
            ? <CheckCircle2 className="h-4 w-4 text-green-600" />
            : <AlertTriangle className="h-4 w-4" />}
          <AlertDescription className={actionMsg.type==='success'?'text-green-700':''}>
            {actionMsg.text}
          </AlertDescription>
        </Alert>
      )}

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-lg w-fit border" style={{ borderColor: C.beige, background:'#f9f9f6' }}>
        {[{ id:'registros', label:'Registros', icon:ClipboardList },
          { id:'indicadores', label:'Indicadores', icon:BarChart3 }].map(({ id, label, icon:Icon }) => (
          <button key={id} onClick={() => setTab(id)}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-md text-sm font-medium transition-all"
            style={{ background: tab===id ? C.primary : 'transparent', color: tab===id ? '#fff' : '#374151' }}>
            <Icon className="h-4 w-4" />{label}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          TAB 1 — REGISTROS
      ══════════════════════════════════════════════════════════════════════ */}
      {tab === 'registros' && (
        <Card className="border-2" style={{ borderColor: C.accent }}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <CardTitle style={{ color: C.primary }}>CONTROL DE PRODUCTO NO CONFORME</CardTitle>
                <CardDescription>RE-GS-06 · Versión 01</CardDescription>
              </div>
              <div style={{ display:'flex', gap:8 }}>
                {canExport && <Button variant="outline" size="sm"
                  onClick={exportarTodo}
                  disabled={exporting || registros.length === 0}
                  style={{ fontSize:12, borderColor: C.primary, color: C.primary, opacity: exporting ? 0.6 : 1 }}>
                  {exporting
                    ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Generando...</>
                    : <><FileSpreadsheet className="h-4 w-4 mr-1" />Exportar Excel</>}
                </Button>}
                {canCreate && <Button size="sm" onClick={openNew} style={{ backgroundColor: C.primary }} className="text-white">
                  <Plus className="h-4 w-4 mr-1" />Nuevo Registro
                </Button>}
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-3">

            {/* Barra herramientas */}
            <div className="flex gap-2 flex-wrap items-center">
              <div className="relative flex-1 min-w-48">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input placeholder="Buscar N°, mes, proceso..." value={search}
                  onChange={e => setSearch(e.target.value)} className="pl-10 text-sm" />
              </div>
              <Button variant="outline" size="sm" onClick={fetchAll}>
                <RefreshCw className="h-4 w-4" />
              </Button>
              {/* Visualizar catálogo Referencias */}
              <Button variant="outline" size="sm"
                onClick={() => { setCatalogSearch(''); setCatalogModal({ open:true, tipo:'referencias' }); }}
                className="border-amber-300 text-amber-700 hover:bg-amber-50">
                <Eye className="h-4 w-4 mr-1.5" />Referencias
              </Button>
              {/* Visualizar catálogo Defectos */}
              <Button variant="outline" size="sm"
                onClick={() => { setCatalogSearch(''); setCatalogModal({ open:true, tipo:'defectos' }); }}
                className="border-blue-300 text-blue-700 hover:bg-blue-50">
                <Eye className="h-4 w-4 mr-1.5" />Tabla Defectos
              </Button>
            </div>

            {/* ── TABLA FORMATO RE-GS-06 ────────────────────────────────── */}
            <div className="border rounded-lg" style={{ overflowX:'auto', paddingBottom:2 }}>
              <div style={{ zoom:'0.85', minWidth:'fit-content', paddingBottom:8 }}>

                {loading ? (
                  <div className="flex items-center justify-center p-12">
                    <Loader2 className="h-8 w-8 animate-spin" style={{ color: C.accent }} />
                    <span className="ml-3 text-gray-600">Cargando registros...</span>
                  </div>
                ) : error ? (
                  <Alert variant="destructive" className="m-4">
                    <AlertTriangle className="h-4 w-4" /><AlertDescription>{error}</AlertDescription>
                  </Alert>
                ) : regsFiltered.length === 0 ? (
                  <div className="text-center p-12 text-gray-400">
                    <AlertTriangle className="h-10 w-10 mx-auto mb-3 opacity-30" />
                    <p className="font-medium">{search ? 'Sin resultados.' : 'No hay registros aún.'}</p>
                    {!search && <p className="text-sm mt-1">Crea el primero con "Nuevo Registro"</p>}
                  </div>
                ) : (
                  <table style={{ borderCollapse:'collapse', width:'100%', tableLayout:'fixed' }}>
                    <colgroup>
                      <col style={{ width:68  }} />{/* Acciones */}
                      <col style={{ width:36  }} />{/* N° */}
                      <col style={{ width:60  }} />{/* REF */}
                      <col style={{ width:76  }} />{/* FECHA REP */}
                      <col style={{ width:188 }} />{/* PNC */}
                      <col style={{ width:46  }} />{/* TOTAL */}
                      <col style={{ width:28  }} />{/* MODULO */}
                      <col style={{ width:28  }} />{/* OPER */}
                      <col style={{ width:28  }} />{/* INSUMO */}
                      <col style={{ width:28  }} />{/* CORTE */}
                      <col style={{ width:28  }} />{/* SUBLI */}
                      <col style={{ width:28  }} />{/* REVIS */}
                      <col style={{ width:76  }} />{/* FECHA TRAT */}
                      <col style={{ width:136 }} />{/* DESC TRAT */}
                      <col style={{ width:94  }} />{/* RESP TRAT */}
                      <col style={{ width:28  }} />{/* CORR */}
                      <col style={{ width:28  }} />{/* RECLAS */}
                      <col style={{ width:28  }} />{/* CONCES */}
                      <col style={{ width:76  }} />{/* FECHA VER */}
                      <col style={{ width:104 }} />{/* RESP VER */}
                    </colgroup>

                    <thead>
                      <tr>
                        <HHead bg="#E2EFDA" rowSpan={2}>ACC.</HHead>
                        <HHead bg={XL.identificacion} colSpan={3}>IDENTIFICACION</HHead>
                        <HHead bg={XL.descripcion}    colSpan={2}>DESCRIPCION</HHead>
                        <HHead bg={XL.causa}          colSpan={6}>ANALISIS DE CAUSA/ORIGEN</HHead>
                        <HHead bg={XL.tratamiento}    colSpan={3} textColor="#fff">TRATAMIENTO</HHead>
                        <HHead bg={XL.clasificacion}  colSpan={3}>CLASIFICACION</HHead>
                        <HHead bg={XL.verificacion}   colSpan={2}>VERIFICACION</HHead>
                      </tr>
                      <tr>
                        <VHead w={36}>N°</VHead>
                        <VHead w={60}>REF</VHead>
                        <VHead w={76}>FECHA|REPORTE</VHead>
                        <VHead w={188}>PRODUCTO NO|CONFORME</VHead>
                        <VHead w={46}>TOTAL</VHead>
                        <VHead w={28}>MODULO</VHead>
                        <VHead w={28}>OPERACIÓN</VHead>
                        <VHead w={28}>INSUMO</VHead>
                        <VHead w={28}>CORTE</VHead>
                        <VHead w={28}>SUBLIMACION</VHead>
                        <VHead w={28}>REVISION</VHead>
                        <VHead w={76}>FECHA</VHead>
                        <VHead w={136}>DESCRIPCION</VHead>
                        <VHead w={94}>RESPONSABLE</VHead>
                        <VHead w={28}>CORRECION</VHead>
                        <VHead w={28}>RECLASIFI-|CACION</VHead>
                        <VHead w={28}>CONCESIÓN</VHead>
                        <VHead w={76}>FECHA</VHead>
                        <VHead w={104}>RESPONSABLE</VHead>
                      </tr>
                    </thead>

                    <tbody>
                      {regsFiltered.map((reg) => {
                        const items = (reg.pnc_item||[]).sort((a,b) => a.numero_fila-b.numero_fila);
                        return (
                          <React.Fragment key={reg.id}>
                            {items.map((it, idx) => {
                              const ref = getRef(it.referencia_id);
                              const def = getDef(it.defecto_id);
                              const bg  = idx%2===0 ? XL.rowOdd : XL.rowEven;
                              return (
                                <tr key={it.id} style={{ backgroundColor: bg }}
                                  onMouseEnter={e => e.currentTarget.style.backgroundColor = XL.rowHover}
                                  onMouseLeave={e => e.currentTarget.style.backgroundColor = bg}>
                                  <td style={{ border:`1px solid ${XL.border}`, padding:'2px 3px', textAlign:'center', verticalAlign:'middle', backgroundColor: XL.accBg }}>
                                    <div style={{ display:'flex', gap:3, justifyContent:'center' }}>
                                      {canEdit && (
                                        <button onClick={() => openEdit(reg)} title="Editar"
                                          style={{ background:'none', border:'none', cursor:'pointer', padding:2 }}>
                                          <Edit style={{ width:13, height:13, color:'#6B7280' }} />
                                        </button>
                                      )}
                                      {canDelete && (
                                        <button onClick={() => handleDelete(reg)} title="Eliminar"
                                          style={{ background:'none', border:'none', cursor:'pointer', padding:2 }}>
                                          {deleting===reg.id
                                            ? <Loader2 style={{ width:13, height:13, color:'#EF4444' }} className="animate-spin" />
                                            : <Trash2  style={{ width:13, height:13, color:'#EF4444' }} />}
                                        </button>
                                      )}
                                    </div>
                                  </td>
                                  <Cell center bold color={C.primary}>{it.numero_fila}</Cell>
                                  <Cell center><span style={{ fontFamily:'monospace', fontSize:11 }}>{ref ? ref.ref : (it.referencia_texto||'—')}</span></Cell>
                                  <Cell center><Fecha v={it.fecha_reporte} /></Cell>
                                  <Cell>
                                    {def
                                      ? <><span style={{ fontWeight:800, color:'#d97706', fontFamily:'monospace', fontSize:11 }}>{def.codigo}</span>{' '}<Clamp v={def.nombre} /></>
                                      : <Clamp v={it.defecto_texto} />}
                                  </Cell>
                                  <Cell center bold color={it.total>0?'#d97706':'#9CA3AF'}>{it.total??'—'}</Cell>
                                  <Cell center><Tick v={it.causa_modulo} /></Cell>
                                  <Cell center><Tick v={it.causa_operacion} /></Cell>
                                  <Cell center><Tick v={it.causa_insumo} /></Cell>
                                  <Cell center><Tick v={it.causa_corte} /></Cell>
                                  <Cell center><Tick v={it.causa_sublimacion} /></Cell>
                                  <Cell center><Tick v={it.causa_revision} /></Cell>
                                  <Cell center><Fecha v={it.tratamiento_fecha} /></Cell>
                                  <Cell><Clamp v={it.tratamiento_descripcion} muted /></Cell>
                                  <Cell><Clamp v={it.tratamiento_responsable} muted /></Cell>
                                  <Cell center><Tick v={it.clasificacion_correccion} /></Cell>
                                  <Cell center><Tick v={it.clasificacion_reclasificacion} /></Cell>
                                  <Cell center><Tick v={it.clasificacion_concesion} /></Cell>
                                  <Cell center><Fecha v={it.verificacion_fecha} /></Cell>
                                  <Cell><Clamp v={it.verificacion_responsable} muted /></Cell>
                                </tr>
                              );
                            })}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            <p className="text-xs text-gray-400">
              {regsFiltered.length} registro(s) · {regsFiltered.reduce((s,r)=>s+(r.pnc_item||[]).length,0)} ítem(s) totales
            </p>
          </CardContent>
        </Card>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB 2 — INDICADORES
      ══════════════════════════════════════════════════════════════════════ */}
      {tab === 'indicadores' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[
              { label:'Total Registros',      v: registros.length,          color: C.accent  },
              { label:'Total Unidades PNC',   v: totalPNC.toLocaleString(), color:'#d97706'  },
              { label:'Categorías afectadas', v: resumen.length,            color: C.primary },
            ].map(s => (
              <Card key={s.label} className="border-2" style={{ borderColor: s.color }}>
                <CardContent className="p-4">
                  <p className="text-xs text-gray-600 mb-1">{s.label}</p>
                  <p className="text-2xl font-bold" style={{ color: s.color }}>{s.v}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="border-2" style={{ borderColor: C.accent }}>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <TrendingDown className="h-5 w-5" style={{ color: C.accent }} />
                <CardTitle style={{ color: C.primary }}>Resumen por Categoría de Defecto</CardTitle>
              </div>
              <CardDescription>Acumulado de todos los registros</CardDescription>
            </CardHeader>
            <CardContent>
              <div style={{ overflowX:'auto' }}>
                <table style={{ borderCollapse:'collapse', width:'100%', fontSize:13 }}>
                  <thead>
                    <tr style={{ backgroundColor: XL.colBg }}>
                      {['Categoría (Defecto)','Total Unidades PNC','N° Ocurrencias','% del Total'].map(h => (
                        <th key={h} style={{ border:`1px solid ${XL.border}`, padding:'7px 10px', fontWeight:700, fontSize:11, textTransform:'uppercase', color:'#374151' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {resumen.length === 0 ? (
                      <tr><td colSpan={4} style={{ padding:24, textAlign:'center', color:'#9CA3AF' }}>Sin datos aún</td></tr>
                    ) : resumen.map((r,i) => {
                      const pct = totalPNC>0 ? ((r.total/totalPNC)*100).toFixed(1) : 0;
                      return (
                        <tr key={r.cat} style={{ backgroundColor: i%2===0?XL.rowOdd:XL.rowEven }}>
                          <td style={{ border:`1px solid ${XL.border}`, padding:'6px 10px', fontWeight:500, fontSize:12 }}>{r.cat}</td>
                          <td style={{ border:`1px solid ${XL.border}`, padding:'6px 10px', textAlign:'center', fontWeight:700, color:'#d97706', fontSize:13 }}>{r.total.toLocaleString()}</td>
                          <td style={{ border:`1px solid ${XL.border}`, padding:'6px 10px', textAlign:'center', color:'#6B7280', fontSize:12 }}>{r.ocurrencias}</td>
                          <td style={{ border:`1px solid ${XL.border}`, padding:'6px 10px' }}>
                            <div className="flex items-center gap-2">
                              <div style={{ flex:1, height:7, background:'#E5E7EB', borderRadius:3, overflow:'hidden' }}>
                                <div style={{ width:`${pct}%`, height:'100%', background: C.accent, borderRadius:3 }} />
                              </div>
                              <span style={{ fontSize:11, fontWeight:700, color: C.primary, minWidth:38 }}>{pct}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {resumen.length > 0 && (
                      <tr style={{ backgroundColor:'#E2EFDA' }}>
                        <td style={{ border:`1px solid ${XL.border}`, padding:'6px 10px', fontWeight:700, fontSize:12 }}>TOTAL</td>
                        <td style={{ border:`1px solid ${XL.border}`, padding:'6px 10px', textAlign:'center', fontWeight:700, color:'#d97706', fontSize:13 }}>{totalPNC.toLocaleString()}</td>
                        <td style={{ border:`1px solid ${XL.border}`, padding:'6px 10px', textAlign:'center', fontWeight:700, fontSize:12 }}>{resumen.reduce((s,r)=>s+r.ocurrencias,0)}</td>
                        <td style={{ border:`1px solid ${XL.border}`, padding:'6px 10px', fontWeight:700, color: C.primary, fontSize:12 }}>100%</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2" style={{ borderColor: C.beige }}>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Factory className="h-5 w-5" style={{ color: C.secondary }} />
                <CardTitle style={{ color: C.primary }}>Producción Mensual</CardTitle>
              </div>
              <CardDescription><strong>% PNC = Total PNC / Total Producción × 100</strong></CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 items-end">
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Año</label>
                  <Input type="number" min="2020" max="2099" value={pAnio} onChange={e => setPAnio(parseInt(e.target.value))} className="text-sm" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Mes</label>
                  <select value={pMes} onChange={e => setPMes(parseInt(e.target.value))} className="w-full p-2 border rounded text-sm">
                    {MESES.map((m,i) => <option key={m} value={i+1}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Total producción</label>
                  <Input type="number" min="1" value={pTotal} onChange={e => setPTotal(e.target.value)} placeholder="Ej: 5000" className="text-sm" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Observaciones</label>
                  <Input value={pObs} onChange={e => setPObs(e.target.value)} placeholder="Opcional" className="text-sm" />
                </div>
                <Button onClick={handleSaveProd} disabled={!pTotal||savingP} style={{ backgroundColor: C.secondary }} className="text-white">
                  {savingP ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Check className="h-4 w-4 mr-1" />}Guardar
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2" style={{ borderColor: C.beige }}>
            <CardHeader className="pb-2">
              <CardTitle style={{ color: C.primary }}>Historial de Producción Mensual</CardTitle>
              <CardDescription>Verde &lt;2% · Amarillo 2–5% · Rojo &gt;5%</CardDescription>
            </CardHeader>
            <CardContent>
              <div style={{ overflowX:'auto' }}>
                <table style={{ borderCollapse:'collapse', width:'100%', fontSize:13 }}>
                  <thead>
                    <tr style={{ backgroundColor: XL.colBg }}>
                      {['Año','Mes','Total Producción','Total PNC','% Indicador','Observaciones'].map(h => (
                        <th key={h} style={{ border:`1px solid ${XL.border}`, padding:'7px 10px', fontWeight:700, fontSize:11, textTransform:'uppercase', color:'#374151' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {produccion.length === 0 ? (
                      <tr><td colSpan={6} style={{ padding:24, textAlign:'center', color:'#9CA3AF' }}>Sin datos de producción registrados</td></tr>
                    ) : produccion.map((p,i) => {
                      const pncMes = registros.filter(r=>r.anio===p.anio&&r.mes===p.mes).flatMap(r=>r.pnc_item||[]).reduce((s,it)=>s+(it.total||0),0);
                      const pct    = p.total_produccion>0 ? ((pncMes/p.total_produccion)*100).toFixed(2) : null;
                      const pctN   = parseFloat(pct);
                      const col    = pctN>5 ? '#EF4444' : pctN>2 ? '#F59E0B' : '#22C55E';
                      return (
                        <tr key={p.id} style={{ backgroundColor: i%2===0?XL.rowOdd:XL.rowEven }}>
                          <td style={{ border:`1px solid ${XL.border}`, padding:'4px 8px', fontFamily:'monospace', fontWeight:600, fontSize:12 }}>
                            <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                              {canDelete && (
                                <button onClick={() => handleDeleteProduccion(p)} title="Eliminar registro"
                                  disabled={deletingProd===p.id}
                                  style={{ background:'none', border:'none', cursor:'pointer', padding:0, lineHeight:1, flexShrink:0 }}>
                                  {deletingProd===p.id
                                    ? <Loader2 style={{ width:12, height:12, color:'#EF4444' }} className="animate-spin" />
                                    : <Trash2  style={{ width:12, height:12, color:'#EF4444' }} />}
                                </button>
                              )}
                              {p.anio}
                            </div>
                          </td>
                          <td style={{ border:`1px solid ${XL.border}`, padding:'6px 10px', fontSize:12 }}>{MESES[p.mes-1]}</td>
                          <td style={{ border:`1px solid ${XL.border}`, padding:'6px 10px', fontWeight:700, fontSize:12 }}>{p.total_produccion.toLocaleString()}</td>
                          <td style={{ border:`1px solid ${XL.border}`, padding:'6px 10px', textAlign:'center', fontWeight:700, color:pncMes>0?'#d97706':'#9CA3AF', fontSize:13 }}>{pncMes>0?pncMes.toLocaleString():'—'}</td>
                          <td style={{ border:`1px solid ${XL.border}`, padding:'6px 10px', textAlign:'center' }}>
                            {pct ? (
                              <div className="flex items-center justify-center gap-1">
                                <div style={{ width:9, height:9, borderRadius:'50%', backgroundColor:col }} />
                                <span style={{ fontWeight:700, color:col, fontFamily:'monospace', fontSize:12 }}>{pct}%</span>
                              </div>
                            ) : '—'}
                          </td>
                          <td style={{ border:`1px solid ${XL.border}`, padding:'6px 10px', color:'#6B7280', fontSize:12 }}>{p.observaciones||'—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* ── Gráfica de barras: % PNC por mes ─────────────────────────── */}
          {produccion.length > 0 && (() => {
            const filas = produccion.slice(0, 12).map(p => {
              const pncMes = registros
                .filter(r => r.anio === p.anio && r.mes === p.mes)
                .flatMap(r => r.pnc_item || [])
                .reduce((s, it) => s + (it.total || 0), 0);
              const pct = p.total_produccion > 0
                ? parseFloat(((pncMes / p.total_produccion) * 100).toFixed(2))
                : null;
              const semaforo = pct === null ? '#9CA3AF' : pct > 5 ? '#EF4444' : pct > 2 ? '#F59E0B' : '#22C55E';
              return { ...p, pncMes, pct, semaforo };
            }).filter(f => f.pct !== null).reverse();

            const maxPct = Math.max(1, ...filas.map(f => f.pct || 0));

            return filas.length > 0 ? (
              <Card className="border-2" style={{ borderColor: C.accent }}>
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" style={{ color: C.accent }} />
                    <CardTitle style={{ color: C.primary }}>% PNC vs Producción por Mes</CardTitle>
                  </div>
                  <CardDescription>Verde &lt;2% · Amarillo 2–5% · Rojo &gt;5%</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Barras */}
                    <div className="space-y-2.5">
                      {filas.map(f => (
                        <div key={`${f.anio}-${f.mes}`}>
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="text-xs text-gray-500">{MESES[f.mes - 1].slice(0, 3)} {f.anio}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-400">
                                {f.pncMes.toLocaleString()} / {f.total_produccion.toLocaleString()}
                              </span>
                              <span className="text-xs font-bold" style={{ color: f.semaforo }}>
                                {f.pct}%
                              </span>
                            </div>
                          </div>
                          <div className="h-3 rounded-full" style={{ background: '#f0f0ea' }}>
                            <div
                              className="h-3 rounded-full transition-all"
                              style={{
                                width: `${Math.min(100, (f.pct / maxPct) * 100)}%`,
                                background: f.semaforo,
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                    {/* Tabla resumen */}
                    <div className="overflow-x-auto">
                      <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 11 }}>
                        <thead>
                          <tr>
                            {['Mes', 'Año', 'Producción', 'PNC', '%'].map(h => (
                              <th key={h} style={{
                                background: C.primary, color: '#fff',
                                padding: '4px 6px', fontWeight: 700, fontSize: 10,
                                textAlign: 'center', borderBottom: `2px solid ${C.accent}`,
                              }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {filas.map((f, i) => (
                            <tr key={`${f.anio}-${f.mes}`} style={{ background: i % 2 === 0 ? '#fff' : '#f8fdf9' }}>
                              <td style={{ padding: '3px 6px', textAlign: 'center', borderBottom: `1px solid ${C.beige}` }}>
                                {MESES[f.mes - 1].slice(0, 3)}
                              </td>
                              <td style={{ padding: '3px 6px', textAlign: 'center', borderBottom: `1px solid ${C.beige}` }}>{f.anio}</td>
                              <td style={{ padding: '3px 6px', textAlign: 'center', borderBottom: `1px solid ${C.beige}` }}>
                                {f.total_produccion.toLocaleString()}
                              </td>
                              <td style={{ padding: '3px 6px', textAlign: 'center', fontWeight: 700, color: C.accent, borderBottom: `1px solid ${C.beige}` }}>
                                {f.pncMes.toLocaleString()}
                              </td>
                              <td style={{ padding: '3px 6px', textAlign: 'center', fontWeight: 700, color: f.semaforo, borderBottom: `1px solid ${C.beige}` }}>
                                {f.pct}%
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : null;
          })()}

        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          MODAL — VISUALIZACIÓN CATÁLOGO (Referencias o Defectos)
          Botón "Descargar Excel" dentro del modal
      ══════════════════════════════════════════════════════════════════════ */}
      <Dialog open={catalogModal.open} onOpenChange={o => setCatalogModal(prev => ({ ...prev, open: o }))}>
        <DialogContent className="max-w-3xl max-h-[88vh] overflow-y-auto p-0">

          <div className="px-6 py-4 rounded-t-lg flex items-center justify-between"
               style={{ backgroundColor: catalogModal.tipo==='referencias' ? '#78350f' : '#1e3a5f' }}>
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-white/20 flex items-center justify-center">
                {catalogModal.tipo==='referencias'
                  ? <FileSpreadsheet className="h-5 w-5 text-white" />
                  : <BookOpen className="h-5 w-5 text-white" />}
              </div>
              <div>
                <h2 className="text-base font-bold text-white">
                  {catalogModal.tipo==='referencias' ? 'Catálogo de Referencias' : 'Tabla de Defectos PNC'}
                </h2>
                <p className="text-xs text-white/70">
                  {catalogModal.tipo==='referencias'
                    ? `${referencias.length} referencias activas`
                    : `${defectos.length} tipos de defecto (D1–D38)`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => downloadCatalogo(catalogModal.tipo)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
                style={{ backgroundColor:'rgba(255,255,255,0.15)', color:'#fff', border:'1px solid rgba(255,255,255,0.45)' }}>
                <Download className="h-3.5 w-3.5" />Descargar Excel
              </button>
              <button onClick={() => setCatalogModal({ open:false, tipo:null })}
                className="p-1.5 rounded-full hover:bg-white/20 transition-colors ml-1">
                <X className="h-4 w-4 text-white" />
              </button>
            </div>
          </div>

          <div className="px-6 pt-4 pb-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder={catalogModal.tipo==='referencias' ? 'Buscar por REF o categoría...' : 'Buscar por código (D1..D38) o nombre...'}
                value={catalogSearch} onChange={e => setCatalogSearch(e.target.value)}
                className="pl-10 text-sm" />
            </div>
            <p className="text-xs text-gray-400 mt-1">{catalogData.length} resultado(s)</p>
          </div>

          <div className="px-6 pb-6">
            <div style={{ overflowX:'auto', borderRadius:8, border:`1px solid ${XL.border}` }}>
              <table style={{ borderCollapse:'collapse', width:'100%', fontSize:13 }}>
                <thead>
                  <tr style={{ backgroundColor: catalogModal.tipo==='referencias' ? '#FEF3C7' : '#DBEAFE' }}>
                    {catalogModal.tipo==='referencias' ? (
                      <>
                        <th style={{ border:`1px solid ${XL.border}`, padding:'8px 14px', fontWeight:700, fontSize:11, textTransform:'uppercase', color:'#78350f', width:96 }}>REF</th>
                        <th style={{ border:`1px solid ${XL.border}`, padding:'8px 14px', fontWeight:700, fontSize:11, textTransform:'uppercase', color:'#78350f' }}>CATEGORÍA</th>
                      </>
                    ) : (
                      <>
                        <th style={{ border:`1px solid ${XL.border}`, padding:'8px 14px', fontWeight:700, fontSize:11, textTransform:'uppercase', color:'#1e3a5f', width:84 }}>CÓDIGO</th>
                        <th style={{ border:`1px solid ${XL.border}`, padding:'8px 14px', fontWeight:700, fontSize:11, textTransform:'uppercase', color:'#1e3a5f' }}>PRODUCTO NO CONFORME</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {catalogData.length === 0 ? (
                    <tr><td colSpan={2} style={{ padding:24, textAlign:'center', color:'#9CA3AF', fontStyle:'italic' }}>
                      Sin resultados para "{catalogSearch}"
                    </td></tr>
                  ) : catalogData.map((item, i) => (
                    <tr key={item.id}
                      style={{ backgroundColor: i%2===0 ? '#FFFFFF' : '#F9FAFB', cursor:'default' }}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F0FDF4'}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = i%2===0 ? '#FFFFFF' : '#F9FAFB'}>
                      {catalogModal.tipo==='referencias' ? (
                        <>
                          <td style={{ border:`1px solid ${XL.border}`, padding:'7px 14px', fontFamily:'monospace', fontWeight:700, fontSize:13, color: C.primary }}>{item.ref}</td>
                          <td style={{ border:`1px solid ${XL.border}`, padding:'7px 14px', fontSize:13, color:'#374151' }}>{item.categoria||'—'}</td>
                        </>
                      ) : (
                        <>
                          <td style={{ border:`1px solid ${XL.border}`, padding:'7px 14px', fontFamily:'monospace', fontWeight:700, fontSize:13, color:'#1e3a5f' }}>{item.codigo}</td>
                          <td style={{ border:`1px solid ${XL.border}`, padding:'7px 14px', fontSize:13, color:'#374151' }}>{item.nombre}</td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ══════════════════════════════════════════════════════════════════════
          MODAL — VISUALIZACIÓN REGISTRO RE-GS-06
          Descarga desde plantilla Excel del Storage (bucket 'templates')
      ══════════════════════════════════════════════════════════════════════ */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-[96vw] max-h-[96vh] overflow-y-auto p-0">

          <div className="px-6 py-4 rounded-t-lg flex items-center justify-between"
               style={{ backgroundColor: C.primary }}>
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-white/20 flex items-center justify-center">
                <Eye className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">Vista previa · RE-GS-06</h2>
                {viewTarget && (
                  <p className="text-xs text-white/70">
                    N° {String(viewTarget.consecutivo_anual).padStart(2,'0')} · {MESES[viewTarget.mes-1]} {viewTarget.anio}
                    {viewTarget.proceso ? ` · ${viewTarget.proceso}` : ''}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setViewOpen(false)}
                className="p-1.5 rounded-full hover:bg-white/20 transition-colors">
                <X className="h-4 w-4 text-white" />
              </button>
            </div>
          </div>

          {viewTarget && (() => {
            const reg   = viewTarget;
            const items = (reg.pnc_item||[]).sort((a,b)=>a.numero_fila-b.numero_fila);
            return (
              <div className="p-5" style={{ overflowX:'auto', zoom:'0.72' }}>
                {/* Encabezado del formato */}
                <table style={{ borderCollapse:'collapse', width:'100%', marginBottom:6 }}>
                  <tbody>
                    <tr>
                      <td colSpan={14} style={{ border:`2px solid ${XL.border}`, padding:'8px 14px', backgroundColor: XL.identificacion, fontWeight:900, fontSize:15, textAlign:'center', letterSpacing:1 }}>
                        CONTROL DE PRODUCTO NO CONFORME
                      </td>
                      <td style={{ border:`2px solid ${XL.border}`, padding:'5px 10px', fontSize:11, fontWeight:700, whiteSpace:'nowrap', backgroundColor:'#f5f5f0' }}>CÓDIGO: RE-GS-06</td>
                      <td style={{ border:`2px solid ${XL.border}`, padding:'5px 10px', fontSize:11, fontWeight:700, whiteSpace:'nowrap', backgroundColor:'#f5f5f0' }}>VERSIÓN: 01</td>
                    </tr>
                    <tr>
                      <td colSpan={16} style={{ border:`2px solid ${XL.border}`, padding:'7px 14px', backgroundColor: XL.descripcion, fontSize:13, fontWeight:700 }}>
                        <span style={{ marginRight:24 }}>MES: <span style={{ color: C.primary }}>{MESES[reg.mes-1].toUpperCase()} {reg.anio}</span></span>
                        <span style={{ marginRight:24 }}>PROCESO: <span style={{ color: C.secondary }}>{(reg.proceso||'—').toUpperCase()}</span></span>
                        <span>N°: <span style={{ fontFamily:'monospace', color: C.primary, fontWeight:900 }}>{String(reg.consecutivo_anual).padStart(2,'0')}</span></span>
                      </td>
                    </tr>
                  </tbody>
                </table>

                <table style={{ borderCollapse:'collapse', width:'100%', tableLayout:'fixed' }}>
                  <colgroup>
                    <col style={{ width:36  }} /><col style={{ width:56  }} /><col style={{ width:82  }} />
                    <col style={{ width:208 }} /><col style={{ width:50  }} />
                    <col style={{ width:30  }} /><col style={{ width:30  }} /><col style={{ width:30  }} />
                    <col style={{ width:30  }} /><col style={{ width:30  }} /><col style={{ width:30  }} />
                    <col style={{ width:82  }} /><col style={{ width:168 }} /><col style={{ width:118 }} />
                    <col style={{ width:30  }} /><col style={{ width:30  }} /><col style={{ width:30  }} />
                    <col style={{ width:82  }} /><col style={{ width:128 }} />
                  </colgroup>
                  <thead>
                    <tr>
                      <HHead bg={XL.identificacion} colSpan={3}>IDENTIFICACION</HHead>
                      <HHead bg={XL.descripcion}    colSpan={2}>DESCRIPCION</HHead>
                      <HHead bg={XL.causa}          colSpan={6}>ANALISIS DE CAUSA/ORIGEN</HHead>
                      <HHead bg={XL.tratamiento}    colSpan={3} textColor="#fff">TRATAMIENTO</HHead>
                      <HHead bg={XL.clasificacion}  colSpan={3}>CLASIFICACION</HHead>
                      <HHead bg={XL.verificacion}   colSpan={2}>VERIFICACION</HHead>
                    </tr>
                    <tr>
                      <VHead w={36}>N°</VHead><VHead w={56}>REF</VHead><VHead w={82}>FECHA|REPORTE</VHead>
                      <VHead w={208}>PRODUCTO NO|CONFORME</VHead><VHead w={50}>TOTAL</VHead>
                      <VHead w={30}>MODULO</VHead><VHead w={30}>OPERACIÓN</VHead><VHead w={30}>INSUMO</VHead>
                      <VHead w={30}>CORTE</VHead><VHead w={30}>SUBLIMACION</VHead><VHead w={30}>REVISION</VHead>
                      <VHead w={82}>FECHA</VHead><VHead w={168}>DESCRIPCION</VHead><VHead w={118}>RESPONSABLE</VHead>
                      <VHead w={30}>CORRECION</VHead><VHead w={30}>RECLASIFI-|CACION</VHead><VHead w={30}>CONCESIÓN</VHead>
                      <VHead w={82}>FECHA</VHead><VHead w={128}>RESPONSABLE</VHead>
                    </tr>
                  </thead>
                  <tbody>
                    {items.length === 0 ? (
                      <tr><td colSpan={19} style={{ padding:28, textAlign:'center', color:'#9CA3AF', fontStyle:'italic', fontSize:13 }}>Este registro no tiene ítems registrados</td></tr>
                    ) : items.map((it, idx) => {
                      const ref = getRef(it.referencia_id);
                      const def = getDef(it.defecto_id);
                      const bg  = idx%2===0 ? XL.rowOdd : XL.rowEven;
                      return (
                        <tr key={it.id} style={{ backgroundColor: bg }}>
                          <Cell center bold color={C.primary}>{it.numero_fila}</Cell>
                          <Cell center><span style={{ fontFamily:'monospace', fontSize:12 }}>{ref ? ref.ref : (it.referencia_texto||'—')}</span></Cell>
                          <Cell center><Fecha v={it.fecha_reporte} /></Cell>
                          <Cell>
                            {def
                              ? <><span style={{ fontWeight:800, color:'#d97706', fontFamily:'monospace', fontSize:12 }}>{def.codigo}</span>{' '}<Clamp v={def.nombre} /></>
                              : <Clamp v={it.defecto_texto} />}
                          </Cell>
                          <Cell center bold color={it.total>0?'#d97706':'#9CA3AF'}>{it.total??'—'}</Cell>
                          <Cell center><Tick v={it.causa_modulo} /></Cell>
                          <Cell center><Tick v={it.causa_operacion} /></Cell>
                          <Cell center><Tick v={it.causa_insumo} /></Cell>
                          <Cell center><Tick v={it.causa_corte} /></Cell>
                          <Cell center><Tick v={it.causa_sublimacion} /></Cell>
                          <Cell center><Tick v={it.causa_revision} /></Cell>
                          <Cell center><Fecha v={it.tratamiento_fecha} /></Cell>
                          <Cell><Clamp v={it.tratamiento_descripcion} muted /></Cell>
                          <Cell><Clamp v={it.tratamiento_responsable} muted /></Cell>
                          <Cell center><Tick v={it.clasificacion_correccion} /></Cell>
                          <Cell center><Tick v={it.clasificacion_reclasificacion} /></Cell>
                          <Cell center><Tick v={it.clasificacion_concesion} /></Cell>
                          <Cell center><Fecha v={it.verificacion_fecha} /></Cell>
                          <Cell><Clamp v={it.verificacion_responsable} muted /></Cell>
                        </tr>
                      );
                    })}
                    {items.length > 0 && (
                      <tr style={{ backgroundColor:'#E2EFDA' }}>
                        <td colSpan={4} style={{ border:`1px solid ${XL.border}`, padding:'6px 12px', fontWeight:800, fontSize:13, textAlign:'right', color: C.primary }}>TOTAL UNIDADES PNC:</td>
                        <td style={{ border:`1px solid ${XL.border}`, padding:'6px 10px', fontWeight:900, fontSize:14, textAlign:'center', color:'#d97706', fontFamily:'monospace' }}>
                          {items.reduce((s,it)=>s+(it.total||0),0)}
                        </td>
                        <td colSpan={14} style={{ border:`1px solid ${XL.border}` }} />
                      </tr>
                    )}
                  </tbody>
                </table>
                <p className="text-xs text-gray-400 mt-3 text-right">{items.length} ítem(s) · RE-GS-06 · Garana Art</p>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* ══════════════════════════════════════════════════════════════════════
          MODAL — FORMULARIO RE-GS-06
      ══════════════════════════════════════════════════════════════════════ */}
      <Dialog open={modalOpen} onOpenChange={o => { if (!saving) setModalOpen(o); }}>
        <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto p-0">

          <div className="px-6 py-5 rounded-t-lg" style={{ backgroundColor: C.primary }}>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center">
                <ClipboardList className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">{editTarget ? 'Editar Registro PNC' : 'Nuevo Registro PNC'}</h2>
                <p className="text-sm text-white/70">RE-GS-06 · Versión 01 · Garana Art</p>
              </div>
            </div>
          </div>

          <div className="px-6 py-5 space-y-6">
            {/* Identificación */}
            <div className="p-4 rounded-xl border-2" style={{ borderColor: C.beige, background:'#fafaf8' }}>
              <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: C.secondary }}>Identificación del Registro</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">N° Consecutivo</label>
                  <Input value={editTarget ? String(editTarget.consecutivo_anual).padStart(2,'0') : String(consec).padStart(2,'0')}
                    readOnly className="font-mono font-bold text-sm bg-gray-50" style={{ color: C.primary }} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Año</label>
                  <Input type="number" min="2020" max="2099" value={fAnio} onChange={e => setFAnio(parseInt(e.target.value))} disabled={!!editTarget} className="text-sm" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Mes</label>
                  <select value={fMes} onChange={e => setFMes(parseInt(e.target.value))} className="w-full p-2 border rounded text-sm">
                    {MESES.map((m,i) => <option key={m} value={i+1}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Proceso</label>
                  <Input value={fProceso} onChange={e => setFProceso(e.target.value)} placeholder="Ej: Confección" className="text-sm" />
                </div>
              </div>
            </div>

            {/* Filas */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-bold" style={{ color: C.primary }}>Filas del Registro</p>
                <Button variant="outline" size="sm" onClick={() => setFItems(prev => [...prev, emptyItem()])}>
                  <Plus className="h-4 w-4 mr-1" />Agregar fila
                </Button>
              </div>
              <div className="space-y-4">
                {fItems.map((item, idx) => (
                  <div key={item._key} className="rounded-xl border-2 overflow-hidden" style={{ borderColor: C.beige }}>
                    <div className="flex items-center justify-between px-4 py-2" style={{ background: XL.colBg, borderBottom:`1px solid ${C.beige}` }}>
                      <span className="text-xs font-bold" style={{ color: C.primary }}>FILA #{idx + 1}</span>
                      {fItems.length > 1 && (
                        <button onClick={() => setFItems(prev => prev.filter(it => it._key !== item._key))} className="p-1 rounded hover:bg-red-50 transition-colors">
                          <X className="h-3 w-3 text-red-400" />
                        </button>
                      )}
                    </div>
                    <div className="p-4 space-y-3">
                      {/* IDENTIFICACION */}
                      <div style={{ borderLeft:`3px solid ${XL.identificacion}`, paddingLeft:10 }}>
                        <p className="text-xs font-bold mb-2 uppercase" style={{ color:'#856404' }}>Identificación</p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div>
                            <label className="text-xs font-medium text-gray-600 block mb-1">REF</label>
                            <AutocompleteInput value={item.referencia_obj} onChange={v => setItemField(item._key,'referencia_obj',v)}
                              options={referencias} placeholder="Ej: 107, 1283..." getLabel={r=>r.categoria||''} getId={r=>r.ref} />
                          </div>
                          <div>
                            <label className="text-xs font-medium text-gray-600 block mb-1">Fecha Reporte *</label>
                            <Input type="date" value={item.fecha_reporte} onChange={e => setItemField(item._key,'fecha_reporte',e.target.value)} className="text-sm" />
                          </div>
                          <div>
                            <label className="text-xs font-medium text-gray-600 block mb-1">Total (unidades)</label>
                            <Input type="number" min="0" value={item.total} onChange={e => setItemField(item._key,'total',e.target.value)} placeholder="0" className="text-sm" />
                          </div>
                        </div>
                      </div>
                      {/* DESCRIPCION */}
                      <div style={{ borderLeft:`3px solid ${XL.descripcion}`, paddingLeft:10 }}>
                        <p className="text-xs font-bold mb-2 uppercase" style={{ color:'#2d6a4f' }}>Descripción — Producto No Conforme</p>
                        <AutocompleteInput value={item.defecto_obj} onChange={v => setItemField(item._key,'defecto_obj',v)}
                          options={defectos} placeholder="Busca por código (D1..D38) o nombre del defecto" getLabel={d=>d.nombre} getId={d=>d.codigo} />
                      </div>
                      {/* CAUSA */}
                      <div style={{ borderLeft:`3px solid ${XL.causa}`, paddingLeft:10 }}>
                        <p className="text-xs font-bold mb-2 uppercase" style={{ color:'#155b9e' }}>Análisis de Causa / Origen</p>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                          {[['causa_modulo','MODULO'],['causa_operacion','OPERACIÓN'],['causa_insumo','INSUMO'],
                            ['causa_corte','CORTE'],['causa_sublimacion','SUBLIMACION'],['causa_revision','REVISION']
                          ].map(([f,l]) => (
                            <CheckField key={f} label={l} checked={item[f]} onChange={v => setItemField(item._key,f,v)} />
                          ))}
                        </div>
                      </div>
                      {/* TRATAMIENTO */}
                      <div style={{ borderLeft:`3px solid ${XL.tratamiento}`, paddingLeft:10 }}>
                        <p className="text-xs font-bold mb-2 uppercase" style={{ color:'#166534' }}>Tratamiento</p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div>
                            <label className="text-xs font-medium text-gray-600 block mb-1">Fecha</label>
                            <Input type="date" value={item.tratamiento_fecha} onChange={e => setItemField(item._key,'tratamiento_fecha',e.target.value)} className="text-sm" />
                          </div>
                          <div>
                            <label className="text-xs font-medium text-gray-600 block mb-1">Descripción</label>
                            <Input value={item.tratamiento_descripcion} onChange={e => setItemField(item._key,'tratamiento_descripcion',e.target.value)} placeholder="Acción tomada" className="text-sm" />
                          </div>
                          <div>
                            <label className="text-xs font-medium text-gray-600 block mb-1">Responsable</label>
                            <Input value={item.tratamiento_responsable} onChange={e => setItemField(item._key,'tratamiento_responsable',e.target.value)} placeholder="Nombre" className="text-sm" />
                          </div>
                        </div>
                      </div>
                      {/* CLASIFICACION */}
                      <div style={{ borderLeft:`3px solid ${XL.clasificacion}`, paddingLeft:10 }}>
                        <p className="text-xs font-bold mb-2 uppercase" style={{ color:'#92400e' }}>Clasificación</p>
                        <div className="flex flex-wrap gap-6">
                          {[['clasificacion_correccion','CORRECION'],['clasificacion_reclasificacion','RECLASIFICACION'],['clasificacion_concesion','CONCESIÓN']
                          ].map(([f,l]) => (
                            <CheckField key={f} label={l} checked={item[f]} onChange={v => setItemField(item._key,f,v)} />
                          ))}
                        </div>
                      </div>
                      {/* VERIFICACION */}
                      <div style={{ borderLeft:`3px solid ${XL.verificacion}`, paddingLeft:10 }}>
                        <p className="text-xs font-bold mb-2 uppercase" style={{ color:'#166534' }}>Verificación</p>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs font-medium text-gray-600 block mb-1">Fecha</label>
                            <Input type="date" value={item.verificacion_fecha} onChange={e => setItemField(item._key,'verificacion_fecha',e.target.value)} className="text-sm" />
                          </div>
                          <div>
                            <label className="text-xs font-medium text-gray-600 block mb-1">Responsable</label>
                            <Input value={item.verificacion_responsable} onChange={e => setItemField(item._key,'verificacion_responsable',e.target.value)} placeholder="Quien verifica" className="text-sm" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="px-6 py-4 border-t flex justify-end gap-3" style={{ borderColor: C.beige, background:'#fafaf8' }}>
            <Button variant="outline" onClick={() => setModalOpen(false)} disabled={saving} className="border-2 px-5" style={{ borderColor: C.beige }}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving} className="px-6 text-white font-semibold" style={{ backgroundColor: C.primary }}>
              {saving
                ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Guardando...</>
                : <><Check className="h-4 w-4 mr-2" />{editTarget ? 'Guardar Cambios' : 'Crear Registro'}</>}
            </Button>
          </div>

        </DialogContent>
      </Dialog>

    </div>
  );
}