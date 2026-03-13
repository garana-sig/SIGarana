// src/components/modules/MejoramientoContinuo/QRSF/QRSFManager.jsx  — v2
// ═══════════════════════════════════════════════════════════════════
// FIXES v2:
//   ✅ Tabla QRSF: columnas fiel al RE-GC-03 (INTERNO,EXTERNO,BUZON,OTROS,RESPUESTA)
//   ✅ Modal QRSF: cliente como botón "Agregar Cliente" plegable
//   ✅ Devoluciones: tallas sin "infantil/adulto" — solo TALLAS, primera = "U"
//   ✅ Indicadores: causas más comunes + QRSF vs Ventas + Dev vs Ventas
// ═══════════════════════════════════════════════════════════════════
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input }  from '@/app/components/ui/input';
import { Alert, AlertDescription } from '@/app/components/ui/alert';
import { Dialog, DialogContent } from '@/app/components/ui/dialog';
import {
  Plus, RefreshCw, Search, Loader2, ChevronLeft,
  Edit, Trash2, Eye, Download, X, Check,
  BarChart3, MessageSquare, PackageX, Users,
  CheckCircle, AlertCircle, FileSpreadsheet, HelpCircle,
  ChevronDown, ChevronUp, UserPlus, TrendingUp, TrendingDown,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { exportQRSF, exportDevoluciones } from '@/utils/exportQRSF';
import {
  useQRSF, MESES, TIPOS_QRSF, TALLAS, TALLAS_FILA1, TALLAS_FILA2,
  fmtFecha, fmtFechaLarga,
} from '@/hooks/useQRSF';
import { useAuth } from '@/context/AuthContext';

// ── Paleta ──────────────────────────────────────────────────────
const C = { primary:'#2e5244', secondary:'#6f7b2c', accent:'#6dbd96', beige:'#dedecc' };

// Colores secciones fiel al RE-GC-03
const QX = {
  identificacion:'#4472C4', clasificacion:'#ED7D31',
  analisis:'#9DC3E6', tratamiento:'#70AD47', cierre:'#FFC000',
  border:'#A6B8C2', rowOdd:'#FFFFFF', rowEven:'#F2F9F5', rowHover:'#EBF5FB',
  colBg:'#DEEAF1', accBg:'#EDF7ED',
};
const DX = {
  recepcion:'#2E75B6', tallas:'#548235', reclasif:'#ED7D31', respuesta:'#4472C4',
  border:'#A6B8C2', rowOdd:'#FFFFFF', rowEven:'#F8FDF9', rowHover:'#EBF5FB',
};

const HOY    = new Date().toISOString().slice(0,10);
const AÑO_HOY = new Date().getFullYear();
const MES_HOY = new Date().getMonth() + 1;

// ── Helpers tabla ────────────────────────────────────────────────
const HHead = ({ children, bg, colSpan=1, rowSpan=1, textColor='#fff', small=false }) => (
  <th colSpan={colSpan} rowSpan={rowSpan} style={{
    backgroundColor:bg, border:`1px solid ${QX.border}`,
    textAlign:'center', verticalAlign:'middle',
    padding: small ? '2px 2px' : '3px 5px',
    fontSize: small ? 9 : 10, fontWeight:700,
    textTransform:'uppercase', color:textColor, whiteSpace:'nowrap',
  }}>{children}</th>
);
const VHead = ({ children, w=26, rowSpan=1, bg }) => {
  const lines = typeof children === 'string' ? children.split('|') : [children];
  return (
    <th rowSpan={rowSpan} style={{
      backgroundColor: bg || QX.colBg, border:`1px solid ${QX.border}`,
      padding:0, width:w, minWidth:w, maxWidth:w,
    }}>
      <div style={{ display:'flex', justifyContent:'center', alignItems:'flex-end', height:84, paddingBottom:4 }}>
        <div style={{ writingMode:'vertical-rl', transform:'rotate(180deg)', fontSize:9, fontWeight:600,
          textTransform:'uppercase', color:'#1F2937', textAlign:'center', lineHeight:1.2 }}>
          {lines.map((l,i) => <span key={i} style={{ whiteSpace:'nowrap', display:'block' }}>{l}</span>)}
        </div>
      </div>
    </th>
  );
};
const Cell = ({ children, center, bold, color, bg, maxW }) => (
  <td style={{
    border:`1px solid ${QX.border}`, padding:'3px 4px', fontSize:10,
    textAlign:center?'center':'left', fontWeight:bold?600:400,
    color:color||'#1F2937', maxWidth:maxW,
    verticalAlign:'middle', backgroundColor:bg,
    wordBreak:'break-word', overflowWrap:'break-word',
  }}>{children}</td>
);
const Tick = ({ v }) =>
  v ? <span style={{ color:C.primary, fontSize:13, fontWeight:700 }}>✓</span>
    : <span style={{ color:'#D1D5DB', fontSize:11 }}>—</span>;
const Clamp = ({ v, muted, lines=2 }) => (
  <div style={{ display:'-webkit-box', WebkitLineClamp:lines, WebkitBoxOrient:'vertical',
    overflow:'hidden', color:muted?'#6B7280':'#1F2937', fontSize:10, wordBreak:'break-word' }}
    title={v||''}>{v||'—'}</div>
);
const Fecha = ({ v }) =>
  v ? <>{fmtFecha(v)}</> : <span style={{ color:'#C0C0C0' }}>—</span>;

const TipoBadge = ({ tipo }) => {
  const t = TIPOS_QRSF.find(x => x.value === tipo);
  if (!t) return <span style={{ color:'#999' }}>—</span>;
  return (
    <span style={{ background:`${t.color}18`, color:t.color, border:`1px solid ${t.color}40`,
      borderRadius:4, padding:'1px 5px', fontSize:9, fontWeight:700 }}>{t.label}</span>
  );
};

function CheckField({ label, checked, onChange, color }) {
  return (
    <label className="flex items-center gap-1.5 cursor-pointer select-none">
      <button type="button" onClick={() => onChange(!checked)}
        className="w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors"
        style={{ background:checked?(color||C.primary):'#fff', borderColor:checked?(color||C.primary):'#D1D5DB' }}>
        {checked && <Check style={{ width:10, height:10, color:'#fff', strokeWidth:3 }}/>}
      </button>
      <span className="text-gray-700 text-xs">{label}</span>
    </label>
  );
}

// Autocomplete referencia
function RefAutocomplete({ value, onChange, referencias }) {
  const [open, setOpen] = useState(false);
  const [q,    setQ]    = useState('');
  const filtered = useMemo(() =>
    referencias.filter(r =>
      r.ref.toLowerCase().includes(q.toLowerCase()) ||
      (r.categoria||'').toLowerCase().includes(q.toLowerCase())
    ).slice(0,12), [referencias,q]);
  const display = value?.id ? `${value.ref} — ${value.categoria||''}` : q;
  return (
    <div className="relative">
      <Input value={display}
        onChange={e => { setQ(e.target.value); setOpen(true); if (!e.target.value) onChange(null); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false),150)}
        placeholder="Buscar referencia..." className="text-sm"/>
      {open && filtered.length > 0 && (
        <div className="absolute z-50 top-full mt-0.5 w-full bg-white border rounded-lg shadow-xl max-h-48 overflow-y-auto">
          {filtered.map(r => (
            <button key={r.id} type="button"
              onMouseDown={() => { onChange(r); setQ(''); setOpen(false); }}
              className="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50 border-b last:border-0">
              <span className="font-mono font-bold mr-2" style={{ color:C.primary }}>{r.ref}</span>
              <span className="text-gray-600 text-xs">{r.categoria}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Estado vacío QRSF ────────────────────────────────────────────
const emptyQRSF = () => ({
  anio: AÑO_HOY,
  fecha_recepcion: HOY,
  cliente_obj: null, cliente_nombre:'', cliente_ciudad:'', cliente_contacto:'',
  canal_interno:false, canal_externo:false, canal_personal:false, canal_buzon:false, canal_telefonica:false,
  tipo:'queja',
  descripcion_caso:'', total_unidades:'',
  causa_maquinaria:false, causa_insumo:false, causa_humano:false, causa_otros:false,
  descripcion_causa:'',
  fecha_respuesta:'', respuesta:'',
  is_cerrado:false,
});

const dbQRSFToForm = (r) => ({
  anio: r.anio,
  fecha_recepcion:   r.fecha_recepcion || HOY,
  cliente_obj:       r.cliente || null,
  cliente_nombre:    r.cliente?.nombre   || '',
  cliente_ciudad:    r.cliente?.ciudad   || '',
  cliente_contacto:  r.cliente?.contacto || '',
  canal_interno:     !!r.canal_interno,
  canal_externo:     !!r.canal_externo,
  canal_personal:    !!r.canal_personal,
  canal_buzon:       !!r.canal_buzon,
  canal_telefonica:  !!r.canal_telefonica,
  tipo:              r.tipo || 'queja',
  descripcion_caso:  r.descripcion_caso || '',
  total_unidades:    r.total_unidades ?? '',
  causa_maquinaria:  !!r.causa_maquinaria,
  causa_insumo:      !!r.causa_insumo,
  causa_humano:      !!r.causa_humano,
  causa_otros:       !!r.causa_otros,
  descripcion_causa: r.descripcion_causa || '',
  fecha_respuesta:   r.fecha_respuesta || '',
  respuesta:         r.respuesta || '',
  is_cerrado:        !!r.is_cerrado,
});

const emptyDev = () => ({
  anio: AÑO_HOY,
  fecha_devolucion: HOY,
  referencia_obj: null, factura_remision:'',
  ...Object.fromEntries(TALLAS.map(t=>[t.field,''])),
  reclass_reparacion:false, reclass_linea:false,
  reclass_aprovechamiento:false, reclass_desecho:false,
  reclass_causa:'', reclass_fecha_ingreso:'',
  resp_fecha:'', resp_descripcion:'',
});

const dbDevToForm = (r) => ({
  anio: r.anio,
  fecha_devolucion: r.fecha_devolucion || HOY,
  referencia_obj:   r.referencia || null,
  factura_remision: r.factura_remision || '',
  ...Object.fromEntries(TALLAS.map(t=>[t.field, r[t.field]??''])),
  reclass_reparacion:      !!r.reclass_reparacion,
  reclass_linea:           !!r.reclass_linea,
  reclass_aprovechamiento: !!r.reclass_aprovechamiento,
  reclass_desecho:         !!r.reclass_desecho,
  reclass_causa:           r.reclass_causa || '',
  reclass_fecha_ingreso:   r.reclass_fecha_ingreso || '',
  resp_fecha:              r.resp_fecha || '',
  resp_descripcion:        r.resp_descripcion || '',
});

// ═════════════════════════════════════════════════════════════════
// MODAL VER QRSF
// ═════════════════════════════════════════════════════════════════
function ViewQRSFModal({ reg, onClose }) {
  if (!reg) return null;
  const tipo = TIPOS_QRSF.find(t => t.value === reg.tipo);
  const canales = [reg.canal_interno&&'Interno', reg.canal_externo&&'Externo',
    reg.canal_personal&&'Personal', reg.canal_buzon&&'Buzón', reg.canal_telefonica&&'Telefónica']
    .filter(Boolean).join(' · ') || '—';
  const causas = [reg.causa_maquinaria&&'Maquinaria', reg.causa_insumo&&'Insumo',
    reg.causa_humano&&'Humano', reg.causa_otros&&'Otros'].filter(Boolean).join(' · ') || '—';

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0">
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ background:`linear-gradient(135deg,${C.primary},${C.secondary})` }}>
          <div>
            <h2 className="text-sm font-bold text-white">RE-GC-03 — Registro N° {String(reg.consecutivo).padStart(2,'0')}/{reg.anio}</h2>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white"><X className="h-5 w-5"/></button>
        </div>
        <div className="p-5 space-y-4 text-sm">
          {[
            { label:'Identificación', color:QX.identificacion, content:(
              <div className="grid grid-cols-2 gap-2">
                <div><p className="text-xs text-gray-400">Fecha recepción</p><p className="font-medium">{fmtFechaLarga(reg.fecha_recepcion)}</p></div>
                <div><p className="text-xs text-gray-400">Canal</p><p className="font-medium">{canales}</p></div>
                <div className="col-span-2"><p className="text-xs text-gray-400">Cliente / Área / Proveedor</p>
                  <p className="font-medium">{reg.cliente?.nombre||'—'}{reg.cliente?.ciudad&&<span className="text-gray-400 text-xs ml-2">· {reg.cliente.ciudad}</span>}</p>
                </div>
              </div>
            )},
            { label:'Clasificación', color:QX.clasificacion, content:<TipoBadge tipo={reg.tipo}/> },
            { label:'Descripción del Caso', color:'#2d6a4f', content:(
              <><p>{reg.descripcion_caso||'—'}</p>
              {reg.total_unidades!=null&&<p className="text-xs text-gray-400 mt-1">Unidades: <b>{reg.total_unidades}</b></p>}</>
            )},
            { label:'Análisis de Causas', color:'#155b9e', content:(
              <><p className="font-medium">{causas}</p>
              {reg.descripcion_causa&&<p className="mt-1 text-gray-600">{reg.descripcion_causa}</p>}</>
            )},
            { label:'Tratamiento', color:'#166534', content:(
              <><p>{reg.respuesta||reg.tratamiento||'—'}</p>
              <p className="text-xs text-gray-400 mt-1">Fecha respuesta: <b>{fmtFechaLarga(reg.fecha_respuesta)||'—'}</b></p></>
            )},
            { label:'Cierre', color:'#92400e', content:(
              <div className="flex items-center gap-2">
                {reg.is_cerrado
                  ? <><CheckCircle className="h-4 w-4 text-green-600"/><span className="text-green-700 font-medium">Cerrado</span>{reg.fecha_cierre&&<span className="text-xs text-gray-400">· {fmtFechaLarga(reg.fecha_cierre)}</span>}</>
                  : <><AlertCircle className="h-4 w-4 text-orange-500"/><span className="text-orange-600 font-medium">Abierto</span></>
                }
              </div>
            )},
          ].map(s => (
            <section key={s.label}>
              <div className="text-xs font-bold uppercase mb-2 pb-1 border-b" style={{ color:s.color, borderColor:s.color }}>{s.label}</div>
              {s.content}
            </section>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ═════════════════════════════════════════════════════════════════
// MODAL VER DEVOLUCIÓN
// ═════════════════════════════════════════════════════════════════
function ViewDevModal({ reg, onClose }) {
  if (!reg) return null;
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0">
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ background:`linear-gradient(135deg,${C.primary},${C.secondary})` }}>
          <h2 className="text-sm font-bold text-white">Devolución N° {String(reg.consecutivo).padStart(2,'0')}/{reg.anio}</h2>
          <button onClick={onClose} className="text-white/80 hover:text-white"><X className="h-5 w-5"/></button>
        </div>
        <div className="p-5 space-y-4 text-sm">
          <section>
            <div className="text-xs font-bold uppercase mb-2 pb-1 border-b" style={{ color:DX.recepcion, borderColor:DX.recepcion }}>Recepción</div>
            <div className="grid grid-cols-3 gap-2">
              <div><p className="text-xs text-gray-400">Fecha devolución</p><p className="font-medium">{fmtFechaLarga(reg.fecha_devolucion)}</p></div>
              <div><p className="text-xs text-gray-400">Referencia</p><p className="font-medium">{reg.referencia?.ref||'—'}</p></div>
              <div><p className="text-xs text-gray-400">Factura / Remisión</p><p className="font-medium">{reg.factura_remision||'—'}</p></div>
            </div>
          </section>
          <section>
            <div className="text-xs font-bold uppercase mb-2 pb-1 border-b" style={{ color:DX.tallas, borderColor:DX.tallas }}>Tallas — Total: <b style={{ color:C.primary }}>{reg.total_unidades??0}</b> uds</div>
            <div className="space-y-1.5">
              {[TALLAS_FILA1, TALLAS_FILA2].map((fila, fi) => (
                <div key={fi} className="flex gap-1 flex-wrap">
                  {fila.map(t => (
                    <div key={t.field} style={{ minWidth:34, background:reg[t.field]?'#e8f5e9':'#f5f5f5',
                      border:`1px solid ${reg[t.field]?DX.tallas:'#ddd'}`, borderRadius:4, padding:'2px 4px', textAlign:'center' }}>
                      <div className="text-xs text-gray-400">{t.label}</div>
                      <div className="font-bold text-sm" style={{ color:reg[t.field]?C.primary:'#ccc' }}>{reg[t.field]??'—'}</div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </section>
          <section>
            <div className="text-xs font-bold uppercase mb-2 pb-1 border-b" style={{ color:DX.reclasif, borderColor:DX.reclasif }}>Reclasificación</div>
            <div className="flex gap-4 flex-wrap mb-2">
              {[['reclass_reparacion','Reparación'],['reclass_linea','Línea'],['reclass_aprovechamiento','Aprovechamiento'],['reclass_desecho','Desecho']].map(([f,l])=>(
                <div key={f} className="flex items-center gap-1"><Tick v={reg[f]}/><span className="text-xs text-gray-600">{l}</span></div>
              ))}
            </div>
            {reg.reclass_causa&&<p>Causa: {reg.reclass_causa}</p>}
            {reg.reclass_fecha_ingreso&&<p className="text-xs text-gray-400 mt-1">Ingreso bodega: {fmtFechaLarga(reg.reclass_fecha_ingreso)}</p>}
          </section>
          <section>
            <div className="text-xs font-bold uppercase mb-2 pb-1 border-b" style={{ color:DX.respuesta, borderColor:DX.respuesta }}>Respuesta</div>
            <p className="text-xs text-gray-400">Fecha: <b className="text-gray-800">{fmtFechaLarga(reg.resp_fecha)||'—'}</b></p>
            {reg.resp_descripcion&&<p className="mt-1">{reg.resp_descripcion}</p>}
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ═════════════════════════════════════════════════════════════════
// MODAL CATÁLOGO
// ═════════════════════════════════════════════════════════════════
function CatalogModal({ tipo, clientes, referencias, onClose, onDeleteCliente }) {
  const [q, setQ] = useState('');
  const isC = tipo === 'clientes';
  const items = isC
    ? clientes.filter(c => !q || c.nombre.toLowerCase().includes(q.toLowerCase()) || (c.ciudad||'').toLowerCase().includes(q.toLowerCase()))
    : referencias.filter(r => !q || r.ref.toLowerCase().includes(q.toLowerCase()) || (r.categoria||'').toLowerCase().includes(q.toLowerCase()));

  const downloadExcel = () => {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([
      [isC ? 'CATÁLOGO DE CLIENTES QRSF' : 'CATÁLOGO DE REFERENCIAS'],
      isC ? ['Nombre','Ciudad','Contacto'] : ['REF','Categoría'],
      ...(isC ? clientes.map(c=>[c.nombre,c.ciudad||'',c.contacto||'']) : referencias.map(r=>[r.ref,r.categoria||''])),
    ]);
    ws['!cols'] = isC ? [{wch:28},{wch:18},{wch:22}] : [{wch:10},{wch:40}];
    XLSX.utils.book_append_sheet(wb, ws, isC?'Clientes':'Referencias');
    XLSX.writeFile(wb, isC?'CLIENTES_QRSF.xlsx':'REFERENCIAS_QRSF.xlsx');
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-xl max-h-[85vh] flex flex-col p-0">
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ background:`linear-gradient(135deg,${C.primary},${C.secondary})` }}>
          <div className="flex items-center gap-2">
            {isC ? <Users className="h-4 w-4 text-white"/> : <FileSpreadsheet className="h-4 w-4 text-white"/>}
            <h2 className="text-sm font-bold text-white">{isC?'Catálogo de Clientes':'Catálogo de Referencias'}</h2>
            <span className="text-xs text-white/60">({items.length})</span>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white"><X className="h-4 w-4"/></button>
        </div>
        <div className="px-4 pt-3 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-2.5 h-3.5 w-3.5 text-gray-400"/>
            <Input value={q} onChange={e=>setQ(e.target.value)} placeholder="Buscar..." className="pl-7 text-sm h-8"/>
          </div>
          <Button size="sm" variant="outline" onClick={downloadExcel} className="h-8 text-xs gap-1" style={{ borderColor:C.accent, color:C.primary }}>
            <Download className="h-3 w-3"/>Excel
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 pb-4 mt-2">
          <table style={{ borderCollapse:'collapse', width:'100%', fontSize:12 }}>
            <thead>
              <tr>
                {(isC ? ['Nombre','Ciudad','Contacto',''] : ['Referencia','Categoría']).map(h => (
                  <th key={h} style={{ background:C.primary, color:'#fff', padding:'5px 8px', fontSize:10, fontWeight:700, textAlign:'left', borderBottom:`2px solid ${C.accent}` }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((item,i) => (
                <tr key={item.id} style={{ background:i%2===0?'#fff':'#f8fdf9' }}>
                  {isC ? (
                    <>
                      <td style={{ padding:'4px 8px', borderBottom:`1px solid ${C.beige}` }}>{item.nombre}</td>
                      <td style={{ padding:'4px 8px', color:'#6B7280', borderBottom:`1px solid ${C.beige}` }}>{item.ciudad||'—'}</td>
                      <td style={{ padding:'4px 8px', color:'#6B7280', borderBottom:`1px solid ${C.beige}` }}>{item.contacto||'—'}</td>
                      <td style={{ padding:'2px 4px', borderBottom:`1px solid ${C.beige}`, textAlign:'center' }}>
                        <button onClick={()=>onDeleteCliente(item)} className="p-1 hover:bg-red-50 rounded">
                          <Trash2 style={{ width:12, height:12, color:'#EF4444' }}/>
                        </button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td style={{ padding:'4px 8px', fontFamily:'monospace', fontWeight:700, color:C.primary, borderBottom:`1px solid ${C.beige}` }}>{item.ref}</td>
                      <td style={{ padding:'4px 8px', borderBottom:`1px solid ${C.beige}` }}>{item.categoria}</td>
                    </>
                  )}
                </tr>
              ))}
              {items.length===0 && <tr><td colSpan={4} style={{ textAlign:'center', padding:'24px', color:'#9CA3AF' }}>Sin resultados</td></tr>}
            </tbody>
          </table>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ═════════════════════════════════════════════════════════════════
// PANEL VENTAS MENSUAL (mismo patrón que Indicadores PNC)
// ═════════════════════════════════════════════════════════════════
function VentasPanel({ tipo, ventas, registros, onSave, onDelete, loading }) {
  const [pAnio, setPAnio] = useState(AÑO_HOY);
  const [pMes,  setPMes]  = useState(MES_HOY);
  const [pTotal,setPTotal] = useState('');
  const [pObs,  setPObs]  = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting,setDeleting] = useState(null);

  const label = tipo === 'qrsf' ? 'QRSF' : 'Devoluciones';
  const color = tipo === 'qrsf' ? C.primary : C.secondary;

  // Construir meses con ratio
  const meses12 = Array.from({ length:12 }, (_,i) => {
    const m = AÑO_HOY - Math.floor(i/12), me = 12-(i%12);
    return { anio:AÑO_HOY, mes: 12-i };
  }).reverse().slice(6); // últimos 6 meses

  const ventasMapa = Object.fromEntries(ventas.map(v => [`${v.anio}-${v.mes}`, v]));

  const filas = useMemo(() => {
    return ventas.slice(0,12).map(v => {
      const key = `${v.anio}-${v.mes}`;
      const count = tipo === 'qrsf'
        ? registros.filter(r => {
            const f = new Date(r.fecha_recepcion);
            return f.getFullYear()===v.anio && f.getMonth()+1===v.mes;
          }).length
        : registros.filter(r => {
            const f = new Date(r.fecha_devolucion);
            return f.getFullYear()===v.anio && f.getMonth()+1===v.mes;
          }).reduce((s,r) => s + (r.total_unidades||0), 0);
      const pct = v.total_ventas > 0 ? ((count / v.total_ventas)*100).toFixed(1) : null;
      const semaforo = pct === null ? '#9CA3AF' : pct < 2 ? '#22C55E' : pct < 5 ? '#F59E0B' : '#EF4444';
      return { ...v, count, pct, semaforo };
    });
  }, [ventas, registros, tipo]);

  const maxPct = Math.max(1, ...filas.map(f => parseFloat(f.pct||0)));

  const handleSave = async () => {
    if (!pTotal||parseInt(pTotal)<=0) return;
    setSaving(true);
    try { await onSave({ anio:pAnio, mes:pMes, total_ventas:pTotal, observaciones:pObs });
      setPTotal(''); setPObs(''); }
    catch(e) { alert(`Error: ${e.message}`); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar este registro de ventas?')) return;
    setDeleting(id);
    try { await onDelete(id); }
    finally { setDeleting(null); }
  };

  return (
    <div className="space-y-4">
      {/* Formulario registrar ventas */}
      <div className="rounded-xl p-4" style={{ background:'#f9f9f5', border:`1px solid ${C.beige}` }}>
        <p className="text-xs font-bold uppercase mb-3" style={{ color }}>Registrar Ventas Mensuales</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="text-xs text-gray-500 block mb-1">Año</label>
            <Input type="number" min="2020" max="2099" value={pAnio} onChange={e=>setPAnio(parseInt(e.target.value))} className="text-sm"/>
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Mes</label>
            <select value={pMes} onChange={e=>setPMes(parseInt(e.target.value))} className="w-full p-2 border rounded text-sm">
              {MESES.map((m,i) => <option key={m} value={i+1}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">
              {tipo === 'qrsf' ? 'Total ventas (unidades/registros)' : 'Total unidades vendidas'}
            </label>
            <Input type="number" min="1" value={pTotal} onChange={e=>setPTotal(e.target.value)} placeholder="0" className="text-sm"/>
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Observación</label>
            <div className="flex gap-2">
              <Input value={pObs} onChange={e=>setPObs(e.target.value)} placeholder="Opcional" className="text-sm flex-1"/>
              <Button size="sm" onClick={handleSave} disabled={saving||!pTotal} className="text-white shrink-0" style={{ backgroundColor:color }}>
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin"/> : <Check className="h-3.5 w-3.5"/>}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Gráfica y tabla */}
      {filas.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Barras */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase mb-3">% {label} / Ventas por mes</p>
            <div className="space-y-2">
              {filas.map(f => (
                <div key={`${f.anio}-${f.mes}`}>
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-xs text-gray-500">{MESES[f.mes-1].slice(0,3)} {f.anio}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">{f.count} / {f.total_ventas}</span>
                      <span className="text-xs font-bold" style={{ color:f.semaforo }}>
                        {f.pct !== null ? `${f.pct}%` : 'S/D'}
                      </span>
                    </div>
                  </div>
                  <div className="h-3 rounded-full" style={{ background:'#f0f0ea' }}>
                    <div className="h-3 rounded-full transition-all" style={{
                      width:`${f.pct!==null ? Math.min(100,(parseFloat(f.pct)/maxPct)*100) : 0}%`,
                      background: f.semaforo,
                    }}/>
                  </div>
                </div>
              ))}
            </div>
          </div>
          {/* Tabla */}
          <div className="overflow-x-auto">
            <table style={{ borderCollapse:'collapse', width:'100%', fontSize:11 }}>
              <thead>
                <tr>
                  {['Mes','Año','Ventas',tipo==='qrsf'?'QRSF':'Dev. (uds)','%',''].map(h=>(
                    <th key={h} style={{ background:color, color:'#fff', padding:'4px 6px', fontWeight:700, fontSize:10, textAlign:'center', borderBottom:`2px solid ${C.accent}` }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filas.map((f,i) => (
                  <tr key={`${f.anio}-${f.mes}`} style={{ background:i%2===0?'#fff':'#f8fdf9' }}>
                    <td style={{ padding:'3px 6px', textAlign:'center', borderBottom:`1px solid ${C.beige}` }}>{MESES[f.mes-1].slice(0,3)}</td>
                    <td style={{ padding:'3px 6px', textAlign:'center', borderBottom:`1px solid ${C.beige}` }}>{f.anio}</td>
                    <td style={{ padding:'3px 6px', textAlign:'center', borderBottom:`1px solid ${C.beige}` }}>{f.total_ventas}</td>
                    <td style={{ padding:'3px 6px', textAlign:'center', fontWeight:700, color:color, borderBottom:`1px solid ${C.beige}` }}>{f.count}</td>
                    <td style={{ padding:'3px 6px', textAlign:'center', fontWeight:700, color:f.semaforo, borderBottom:`1px solid ${C.beige}` }}>
                      {f.pct!==null ? `${f.pct}%` : '—'}
                    </td>
                    <td style={{ padding:'2px 4px', textAlign:'center', borderBottom:`1px solid ${C.beige}` }}>
                      <button onClick={()=>handleDelete(f.id)} className="p-1 hover:bg-red-50 rounded" disabled={deleting===f.id}>
                        {deleting===f.id ? <Loader2 style={{ width:11,height:11,color:'#EF4444' }} className="animate-spin"/> : <Trash2 style={{ width:11,height:11,color:'#EF4444' }}/>}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <p className="text-xs text-gray-400 text-center py-4">No hay ventas registradas aún. Agrega la primera entrada arriba.</p>
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═════════════════════════════════════════════════════════════════

// ── ClienteCombobox — búsqueda moderna con chip de selección ─────────────────
function ClienteCombobox({ value, clientes, onChange }) {
  const [query,   setQuery]   = useState('');
  const [open,    setOpen]    = useState(false);
  const [focused, setFocused] = useState(false);
  const inputRef = React.useRef(null);
  const C_COMBOBOX = { green: '#2e5244', mint: '#6dbd96' };

  const filtered = useMemo(() => {
    if (!query.trim()) return clientes.slice(0, 20);
    const q = query.toLowerCase();
    return clientes.filter(c =>
      c.nombre.toLowerCase().includes(q) ||
      (c.ciudad||'').toLowerCase().includes(q) ||
      (c.contacto||'').toLowerCase().includes(q)
    ).slice(0, 20);
  }, [clientes, query]);

  const handleSelect = (cli) => {
    onChange(cli);
    setQuery('');
    setOpen(false);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange(null);
    setQuery('');
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  if (value) {
    return (
      <div className="flex items-center justify-between px-3 py-2 rounded-lg border"
        style={{ background:'#f0f7f4', borderColor:C_COMBOBOX.mint }}>
        <div>
          <p className="text-sm font-semibold" style={{ color:C_COMBOBOX.green }}>{value.nombre}</p>
          {value.ciudad && <p className="text-xs text-gray-400">{value.ciudad}{value.contacto ? ` · ${value.contacto}` : ''}</p>}
        </div>
        <button type="button" onMouseDown={handleClear}
          className="ml-2 p-0.5 rounded-full hover:bg-red-100 transition-colors" title="Cambiar cliente">
          <X className="h-3.5 w-3.5 text-gray-400 hover:text-red-500"/>
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-gray-400 pointer-events-none"/>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => { setFocused(true); setOpen(true); }}
          onBlur={() => { setFocused(false); setTimeout(() => setOpen(false), 180); }}
          placeholder="Escribe nombre, ciudad..."
          className="w-full pl-8 pr-3 py-2 border rounded-lg text-sm outline-none transition-colors"
          style={{ borderColor:focused ? C_COMBOBOX.mint : '#E5E7EB', boxShadow:focused ? `0 0 0 2px ${C_COMBOBOX.mint}30` : 'none' }}
          autoComplete="off"
        />
      </div>
      {open && (
        <div className="absolute z-50 top-full mt-1 w-full bg-white rounded-xl shadow-2xl border overflow-hidden" style={{ maxHeight:240 }}>
          {filtered.length === 0 ? (
            <div className="px-3 py-3 text-xs text-gray-400 text-center">
              {query ? `Sin resultados para "${query}"` : 'Escribe para buscar...'}
            </div>
          ) : (
            <div className="overflow-y-auto" style={{ maxHeight:240 }}>
              {filtered.map((cli) => (
                <button key={cli.id} type="button"
                  onMouseDown={() => handleSelect(cli)}
                  className="w-full text-left px-3 py-2 border-b last:border-0 hover:bg-gray-50 transition-colors">
                  <p className="text-sm font-semibold" style={{ color:C_COMBOBOX.green }}>{cli.nombre}</p>
                  {(cli.ciudad || cli.contacto) && (
                    <p className="text-xs text-gray-400">{cli.ciudad}{cli.contacto ? ` · ${cli.contacto}` : ''}</p>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function QRSFManager({ onBack }) {
  const { profile, hasPermission } = useAuth();
  const isAdmin    = profile?.role === 'admin';
  const isGerencia = profile?.role === 'gerencia';
  const canCreate = isAdmin || isGerencia || hasPermission('auditorias:qrsf:create');
  const canEdit   = isAdmin || isGerencia || hasPermission('auditorias:qrsf:edit');
  const canDelete = isAdmin               || hasPermission('auditorias:qrsf:delete');
  const canExport = isAdmin || isGerencia || hasPermission('auditorias:qrsf:export');

  const {
    clientes, qrsfRegistros, devRegistros, referencias, qrsfVentas, devVentas,
    loading, error, fetchAll,
    deleteCliente, createQRSF, updateQRSF, deleteQRSF,
    createDevolucion, updateDevolucion, deleteDevolucion,
    saveQrsfVentas, deleteQrsfVentas, saveDevVentas, deleteDevVentas,
  } = useQRSF();

  const [tab,       setTab]       = useState('qrsf');
  const [actionMsg, setActionMsg] = useState(null);
  const [search,    setSearch]    = useState('');

  // QRSF modal
  const [qrsfModal,  setQrsfModal]  = useState(false);
  const [qrsfEdit,   setQrsfEdit]   = useState(null);
  const [qrsfForm,   setQrsfForm]   = useState(emptyQRSF());
  const [viewQRSF,   setViewQRSF]   = useState(null);
  const [saving,     setSaving]     = useState(false);
  const [deleting,   setDeleting]   = useState(null);
  const [exporting,  setExporting]  = useState(false);
  // panel cliente en modal
  const [clientePanel, setClientePanel] = useState(false);

  // Dev modal
  const [devModal,   setDevModal]   = useState(false);
  const [devEdit,    setDevEdit]    = useState(null);
  const [devForm,    setDevForm]    = useState(emptyDev());
  const [viewDev,    setViewDev]    = useState(null);
  const [savingDev,  setSavingDev]  = useState(false);
  const [deletingDev,setDeletingDev]= useState(null);

  // Catálogo
  const [catalogModal, setCatalogModal] = useState(null);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const showMsg = useCallback((type, text) => {
    setActionMsg({ type, text }); setTimeout(() => setActionMsg(null), 4500);
  }, []);

  // ── Filtrado ──────────────────────────────────────────────────
  const qrsfFiltered = useMemo(() =>
    qrsfRegistros.filter(r =>
      !search ||
      String(r.consecutivo).includes(search) ||
      (r.cliente?.nombre||'').toLowerCase().includes(search.toLowerCase()) ||
      (r.descripcion_caso||'').toLowerCase().includes(search.toLowerCase()) ||
      (r.tipo||'').toLowerCase().includes(search.toLowerCase())
    ), [qrsfRegistros, search]);

  const devFiltered = useMemo(() =>
    devRegistros.filter(r =>
      !search ||
      String(r.consecutivo).includes(search) ||
      (r.referencia?.ref||'').toLowerCase().includes(search.toLowerCase()) ||
      (r.factura_remision||'').toLowerCase().includes(search.toLowerCase())
    ), [devRegistros, search]);

  // ── QRSF CRUD ─────────────────────────────────────────────────
  const openNewQRSF = () => { setQrsfEdit(null); setQrsfForm(emptyQRSF()); setClientePanel(false); setQrsfModal(true); };
  const openEditQRSF = (r) => { setQrsfEdit(r); setQrsfForm(dbQRSFToForm(r)); setClientePanel(!!r.cliente_id); setQrsfModal(true); };
  const setQF = (f, v) => setQrsfForm(prev => ({ ...prev, [f]: v }));

  const handleSaveQRSF = async () => {
    if (!qrsfForm.descripcion_caso.trim()) { showMsg('error','La descripción del caso es requerida.'); return; }
    setSaving(true);
    try {
      qrsfEdit ? await updateQRSF(qrsfEdit.id, qrsfForm) : await createQRSF(qrsfForm);
      showMsg('success', qrsfEdit ? '✅ Registro actualizado.' : '✅ Registro creado.');
      setQrsfModal(false); await fetchAll();
    } catch(e) { showMsg('error', `Error: ${e.message}`); }
    finally { setSaving(false); }
  };

  const handleDeleteQRSF = async (r) => {
    if (!window.confirm(`¿Eliminar N° ${String(r.consecutivo).padStart(2,'0')}/${r.anio}? Esta acción no se puede deshacer.`)) return;
    setDeleting(r.id);
    try { await deleteQRSF(r.id); showMsg('success','🗑️ Eliminado.'); await fetchAll(); }
    catch(e) { showMsg('error', `Error: ${e.message}`); }
    finally { setDeleting(null); }
  };

  const handleExportQRSF = async () => {
    setExporting(true);
    try { await exportQRSF(qrsfFiltered); showMsg('success','✅ Excel RE-GC-03 exportado.'); }
    catch(e) { showMsg('error', `Error: ${e.message}`); }
    finally { setExporting(false); }
  };

  // ── Dev CRUD ──────────────────────────────────────────────────
  const openNewDev = () => { setDevEdit(null); setDevForm(emptyDev()); setDevModal(true); };
  const openEditDev = (r) => { setDevEdit(r); setDevForm(dbDevToForm(r)); setDevModal(true); };
  const setDF = (f, v) => setDevForm(prev => ({ ...prev, [f]: v }));

  const handleSaveDev = async () => {
    if (!devForm.fecha_devolucion) { showMsg('error','La fecha es requerida.'); return; }
    setSavingDev(true);
    try {
      devEdit ? await updateDevolucion(devEdit.id, devForm) : await createDevolucion(devForm);
      showMsg('success', devEdit ? '✅ Devolución actualizada.' : '✅ Devolución registrada.');
      setDevModal(false); await fetchAll();
    } catch(e) { showMsg('error', `Error: ${e.message}`); }
    finally { setSavingDev(false); }
  };

  const handleDeleteDev = async (r) => {
    if (!window.confirm(`¿Eliminar devolución N° ${String(r.consecutivo).padStart(2,'0')}/${r.anio}? Esta acción no se puede deshacer.`)) return;
    setDeletingDev(r.id);
    try { await deleteDevolucion(r.id); showMsg('success','🗑️ Eliminada.'); await fetchAll(); }
    catch(e) { showMsg('error', `Error: ${e.message}`); }
    finally { setDeletingDev(null); }
  };

  const handleDeleteCliente = async (cli) => {
    if (!window.confirm(`¿Eliminar cliente "${cli.nombre}"?`)) return;
    try { await deleteCliente(cli.id); await fetchAll(); showMsg('success','✅ Cliente eliminado.'); }
    catch(e) { showMsg('error', `Error: ${e.message}`); }
  };

  // ── Indicadores ───────────────────────────────────────────────
  const indicadores = useMemo(() => {
    const total = qrsfRegistros.length;
    const cerrados = qrsfRegistros.filter(r => r.is_cerrado).length;
    const tasaCierre = total ? Math.round((cerrados/total)*100) : 0;

    const porTipo = TIPOS_QRSF.map(t => ({
      ...t, count: qrsfRegistros.filter(r => r.tipo === t.value).length,
    }));

    // Causas más comunes — analiza descripcion_causa agrupando por texto
    const causasMapa = {};
    qrsfRegistros.forEach(r => {
      const c = (r.descripcion_causa||'').trim().toLowerCase();
      if (c) { causasMapa[c] = (causasMapa[c]||0) + 1; }
      // también causas booleanas
      if (r.causa_maquinaria) causasMapa['maquinaria'] = (causasMapa['maquinaria']||0)+1;
      if (r.causa_insumo)     causasMapa['insumo']     = (causasMapa['insumo']||0)+1;
      if (r.causa_humano)     causasMapa['humano']     = (causasMapa['humano']||0)+1;
      if (r.causa_otros)      causasMapa['otros']      = (causasMapa['otros']||0)+1;
    });
    const causasTop = Object.entries(causasMapa)
      .sort((a,b) => b[1]-a[1]).slice(0,8)
      .map(([causa, count]) => ({ causa, count }));

    const causasMaxCount = causasTop[0]?.count || 1;

    // Causas reclasificación devoluciones
    const reclasifMapa = {};
    devRegistros.forEach(r => {
      const c = (r.reclass_causa||'').trim().toLowerCase();
      if (c) reclasifMapa[c] = (reclasifMapa[c]||0)+1;
      if (r.reclass_reparacion)      reclasifMapa['reparación']      = (reclasifMapa['reparación']||0)+1;
      if (r.reclass_linea)           reclasifMapa['línea']           = (reclasifMapa['línea']||0)+1;
      if (r.reclass_aprovechamiento) reclasifMapa['aprovechamiento'] = (reclasifMapa['aprovechamiento']||0)+1;
      if (r.reclass_desecho)         reclasifMapa['desecho']         = (reclasifMapa['desecho']||0)+1;
    });
    const reclasifTop = Object.entries(reclasifMapa)
      .sort((a,b)=>b[1]-a[1]).slice(0,6)
      .map(([causa,count]) => ({ causa, count }));

    const tiempoPromedio = (() => {
      const c = qrsfRegistros.filter(r => r.is_cerrado && r.fecha_recepcion && r.fecha_respuesta);
      if (!c.length) return null;
      const s = c.reduce((acc,r) => acc + Math.max(0,(new Date(r.fecha_respuesta)-new Date(r.fecha_recepcion))/(1000*60*60*24)), 0);
      return Math.round(s/c.length);
    })();

    const totalDevUds = devRegistros.reduce((s,r) => s+(r.total_unidades||0), 0);

    return { total, cerrados, tasaCierre, porTipo, causasTop, causasMaxCount, reclasifTop, tiempoPromedio, totalDevUds };
  }, [qrsfRegistros, devRegistros]);

  const semaforoT = (d) => d===null ? '#9CA3AF' : d<=5 ? '#22C55E' : d<=10 ? '#F59E0B' : '#EF4444';

  // ── Render botón acción fila ───────────────────────────────────
  const RowActions = ({ onView, onEdit, onDel, deleting }) => (
    <td style={{ border:`1px solid ${QX.border}`, padding:'1px 2px', textAlign:'center', verticalAlign:'middle', backgroundColor:QX.accBg }}>
      <div style={{ display:'flex', gap:2, justifyContent:'center' }}>
        <button onClick={onView} title="Ver" style={{ background:'none',border:'none',cursor:'pointer',padding:2,borderRadius:3 }}>
          <Eye style={{ width:12,height:12,color:'#3B82F6' }}/>
        </button>
        {canEdit && (
          <button onClick={onEdit} title="Editar" style={{ background:'none',border:'none',cursor:'pointer',padding:2,borderRadius:3 }}>
            <Edit style={{ width:12,height:12,color:'#6B7280' }}/>
          </button>
        )}
        {canDelete && (
          <button onClick={onDel} disabled={deleting} title="Eliminar" style={{ background:'none',border:'none',cursor:'pointer',padding:2,borderRadius:3 }}>
            {deleting ? <Loader2 style={{ width:12,height:12,color:'#EF4444' }} className="animate-spin"/> : <Trash2 style={{ width:12,height:12,color:'#EF4444' }}/>}
          </button>
        )}
      </div>
    </td>
  );

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 rounded-lg hover:bg-gray-100" style={{ color:C.primary }}>
          <ChevronLeft className="h-5 w-5"/>
        </button>
        <div className="flex-1">
          <h2 className="text-xl font-bold" style={{ color:C.primary }}>QRSF / Devoluciones</h2>
          <p className="text-sm text-gray-500">Quejas · Reclamos · Sugerencias · Felicitaciones · Devoluciones</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchAll} disabled={loading} style={{ borderColor:C.accent, color:C.primary }}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin"/> : <RefreshCw className="h-4 w-4"/>}
        </Button>
      </div>

      {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
      {actionMsg && (
        <Alert variant={actionMsg.type==='error'?'destructive':'default'} style={{ borderColor:actionMsg.type==='error'?'#FCA5A5':C.accent }}>
          <AlertDescription style={{ color:actionMsg.type==='error'?'#DC2626':C.primary }}>{actionMsg.text}</AlertDescription>
        </Alert>
      )}

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl" style={{ background:'#f5f5ef' }}>
        {[
          { id:'qrsf',         label:'QRSF',         icon:MessageSquare, count:qrsfRegistros.length },
          { id:'devoluciones', label:'Devoluciones',  icon:PackageX,      count:devRegistros.length  },
          { id:'indicadores',  label:'Indicadores',   icon:BarChart3,     count:null                 },
        ].map(t => (
          <button key={t.id} onClick={() => { setTab(t.id); setSearch(''); }}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all"
            style={{ background:tab===t.id?C.primary:'transparent', color:tab===t.id?'#fff':'#6B7280',
              boxShadow:tab===t.id?'0 2px 8px rgba(0,0,0,0.15)':'none' }}>
            <t.icon className="h-4 w-4"/>
            {t.label}
            {t.count!==null && (
              <span style={{ background:tab===t.id?'rgba(255,255,255,0.25)':'#e0e0e0',
                color:tab===t.id?'#fff':'#6B7280', borderRadius:10, padding:'1px 7px', fontSize:11, fontWeight:700 }}>{t.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* ══════════ TAB QRSF ══════════ */}
      {tab === 'qrsf' && (
        <Card className="shadow-sm border-0">
          <CardHeader className="pb-3 px-4 pt-4">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-48">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400"/>
                <Input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar por cliente, descripción, tipo..." className="pl-9 text-sm h-9"/>
              </div>
              <Button variant="outline" size="sm" onClick={()=>setCatalogModal('clientes')} className="h-9 text-xs gap-1" style={{ borderColor:C.beige, color:C.secondary }}>
                <Users className="h-3.5 w-3.5"/>Clientes
              </Button>
              {canExport && (
                <Button variant="outline" size="sm" onClick={handleExportQRSF} disabled={exporting} className="h-9 text-xs gap-1" style={{ borderColor:C.accent, color:C.primary }}>
                  {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin"/> : <Download className="h-3.5 w-3.5"/>}
                  RE-GC-03
                </Button>
              )}
              {canCreate && (
                <Button size="sm" onClick={openNewQRSF} className="h-9 text-xs gap-1 text-white font-semibold" style={{ backgroundColor:C.primary }}>
                  <Plus className="h-3.5 w-3.5"/>Nuevo QRSF
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {loading ? (
              <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin" style={{ color:C.accent }}/></div>
            ) : qrsfFiltered.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <HelpCircle className="h-10 w-10 mx-auto mb-3 opacity-30"/>
                <p>{search ? 'Sin resultados.' : 'No hay registros QRSF.'}</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg" style={{ border:`1px solid ${QX.border}` }}>
                <div style={{ zoom:0.85, minWidth:1200 }}>
                  <table style={{ borderCollapse:'collapse', width:'100%', tableLayout:'fixed' }}>
                    {/* colgroup — columnas exactas del RE-GC-03 */}
                    <colgroup>
                      <col style={{width:54}}/> {/* acciones */}
                      <col style={{width:64}}/> {/* N°/año */}
                      <col style={{width:54}}/> {/* fecha */}
                      <col style={{width:26}}/> {/* INTERNO */}
                      <col style={{width:26}}/> {/* EXTERNO */}
                      <col style={{width:120}}/>{/* CLIENTE */}
                      <col style={{width:26}}/> {/* PERSONAL */}
                      <col style={{width:26}}/> {/* BUZON */}
                      <col style={{width:26}}/> {/* TELEFONICA */}
                      <col style={{width:200}}/>{/* DESCRIPCION */}
                      <col style={{width:38}}/> {/* N° UDS */}
                      <col style={{width:26}}/> {/* Q */}
                      <col style={{width:26}}/> {/* R */}
                      <col style={{width:26}}/> {/* S */}
                      <col style={{width:26}}/> {/* F */}
                      <col style={{width:26}}/> {/* MAQUINARIA */}
                      <col style={{width:26}}/> {/* INSUMO */}
                      <col style={{width:26}}/> {/* HUMANO */}
                      <col style={{width:26}}/> {/* OTROS */}
                      <col style={{width:130}}/>{/* DESC CAUSA */}
                      <col style={{width:54}}/> {/* FECHA RESP */}
                      <col style={{width:140}}/>{/* RESPUESTA */}
                      <col style={{width:60}}/> {/* CIERRE SI/NO */}
                    </colgroup>
                    <thead>
                      <tr>
                        <HHead bg="#E2EFDA" rowSpan={3} textColor="#1F2937">Acc.</HHead>
                        <HHead bg={QX.identificacion} colSpan={9}>Identificación</HHead>
                        <HHead bg={QX.clasificacion}  colSpan={5}>Clasificación</HHead>
                        <HHead bg={QX.analisis}        colSpan={5} textColor="#1F2937">Análisis de Causas</HHead>
                        <HHead bg={QX.tratamiento}     colSpan={2}>Tratamiento</HHead>
                        <HHead bg={QX.cierre}          colSpan={1} textColor="#92400e" rowSpan={1}>Cierre</HHead>
                      </tr>
                      <tr>
                        <VHead w={64}>N°</VHead>
                        <VHead w={54}>Fecha|Recep.</VHead>
                        <VHead w={26} bg={`${QX.identificacion}55`}>Interno</VHead>
                        <VHead w={26} bg={`${QX.identificacion}55`}>Externo</VHead>
                        <VHead w={120}>Cliente/Área/|Proveedor</VHead>
                        <VHead w={26} bg={`${QX.identificacion}55`}>Personal</VHead>
                        <VHead w={26} bg={`${QX.identificacion}55`}>Buzón</VHead>
                        <VHead w={26} bg={`${QX.identificacion}55`}>Telefónica</VHead>
                        <VHead w={200}>Descripción del caso</VHead>
                        <VHead w={38}>N° Uds.</VHead>
                        <VHead w={26} bg={`${QX.clasificacion}55`}>Queja</VHead>
                        <VHead w={26} bg={`${QX.clasificacion}55`}>Reclamo</VHead>
                        <VHead w={26} bg={`${QX.clasificacion}55`}>Suger.</VHead>
                        <VHead w={26} bg={`${QX.clasificacion}55`}>Felic.</VHead>
                        <VHead w={26} bg={`${QX.analisis}88`}>Maquinaria</VHead>
                        <VHead w={26} bg={`${QX.analisis}88`}>Insumo</VHead>
                        <VHead w={26} bg={`${QX.analisis}88`}>Humano</VHead>
                        <VHead w={26} bg={`${QX.analisis}88`}>Otros</VHead>
                        <VHead w={130}>Descripción|de la Causa</VHead>
                        <VHead w={54}>Fecha|Resp.</VHead>
                        <VHead w={140}>Respuesta</VHead>
                        <VHead w={60}>SI / NO</VHead>
                      </tr>
                    </thead>
                    <tbody>
                      {qrsfFiltered.map((r, idx) => {
                        const bg = idx%2===0 ? QX.rowOdd : QX.rowEven;
                        return (
                          <tr key={r.id} style={{ backgroundColor:bg }}
                            onMouseEnter={e=>e.currentTarget.style.backgroundColor=QX.rowHover}
                            onMouseLeave={e=>e.currentTarget.style.backgroundColor=bg}>
                            <RowActions
                              onView={()=>setViewQRSF(r)}
                              onEdit={()=>openEditQRSF(r)}
                              onDel={()=>handleDeleteQRSF(r)}
                              deleting={deleting===r.id}
                            />
                            <Cell center bold color={C.primary}>{String(r.consecutivo).padStart(2,'0')}/{r.anio}</Cell>
                            <Cell center><Fecha v={r.fecha_recepcion}/></Cell>
                            <Cell center><Tick v={r.canal_interno}/></Cell>
                            <Cell center><Tick v={r.canal_externo}/></Cell>
                            <Cell><Clamp v={r.cliente?.nombre}/></Cell>
                            <Cell center><Tick v={r.canal_personal}/></Cell>
                            <Cell center><Tick v={r.canal_buzon}/></Cell>
                            <Cell center><Tick v={r.canal_telefonica}/></Cell>
                            <Cell><Clamp v={r.descripcion_caso}/></Cell>
                            <Cell center>{r.total_unidades??'—'}</Cell>
                            <Cell center><Tick v={r.tipo==='queja'}/></Cell>
                            <Cell center><Tick v={r.tipo==='reclamo'}/></Cell>
                            <Cell center><Tick v={r.tipo==='sugerencia'}/></Cell>
                            <Cell center><Tick v={r.tipo==='felicitacion'}/></Cell>
                            <Cell center><Tick v={r.causa_maquinaria}/></Cell>
                            <Cell center><Tick v={r.causa_insumo}/></Cell>
                            <Cell center><Tick v={r.causa_humano}/></Cell>
                            <Cell center><Tick v={r.causa_otros}/></Cell>
                            <Cell><Clamp v={r.descripcion_causa} muted/></Cell>
                            <Cell center><Fecha v={r.fecha_respuesta}/></Cell>
                            <Cell><Clamp v={r.respuesta||r.tratamiento} muted/></Cell>
                            <Cell center>
                              {r.is_cerrado
                                ? <span style={{ background:'#DCFCE7',color:'#15803D',borderRadius:4,padding:'1px 4px',fontSize:9,fontWeight:700 }}>SI</span>
                                : <span style={{ background:'#FEF3C7',color:'#D97706',borderRadius:4,padding:'1px 4px',fontSize:9,fontWeight:700 }}>NO</span>
                              }
                            </Cell>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ══════════ TAB DEVOLUCIONES ══════════ */}
      {tab === 'devoluciones' && (
        <Card className="shadow-sm border-0">
          <CardHeader className="pb-3 px-4 pt-4">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-48">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400"/>
                <Input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar por referencia o factura..." className="pl-9 text-sm h-9"/>
              </div>
              <Button variant="outline" size="sm" onClick={()=>setCatalogModal('referencias')} className="h-9 text-xs gap-1" style={{ borderColor:C.beige, color:C.secondary }}>
                <FileSpreadsheet className="h-3.5 w-3.5"/>Referencias
              </Button>
              {canExport && (
                <Button variant="outline" size="sm"
                  onClick={()=>exportDevoluciones(devFiltered, referencias)}
                  className="h-9 text-xs gap-1" style={{ borderColor:C.accent, color:C.primary }}>
                  <Download className="h-3.5 w-3.5"/>Exportar Excel
                </Button>
              )}
              {canCreate && (
                <Button size="sm" onClick={openNewDev} className="h-9 text-xs gap-1 text-white font-semibold" style={{ backgroundColor:C.primary }}>
                  <Plus className="h-3.5 w-3.5"/>Nueva Devolución
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {loading ? (
              <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin" style={{ color:C.accent }}/></div>
            ) : devFiltered.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <PackageX className="h-10 w-10 mx-auto mb-3 opacity-30"/>
                <p>{search ? 'Sin resultados.' : 'No hay devoluciones registradas.'}</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg" style={{ border:`1px solid ${DX.border}` }}>
                <div style={{ zoom:0.82, minWidth:1500 }}>
                  <table style={{ borderCollapse:'collapse', width:'100%', tableLayout:'fixed' }}>
                    <colgroup>
                      <col style={{width:54}}/> {/* acciones */}
                      <col style={{width:64}}/> {/* consec */}
                      <col style={{width:54}}/> {/* fecha */}
                      <col style={{width:70}}/> {/* ref */}
                      <col style={{width:90}}/> {/* factura */}
                      {/* 18 tallas */}
                      {TALLAS.map(t => <col key={t.field} style={{width:26}}/>)}
                      <col style={{width:40}}/> {/* total */}
                      <col style={{width:26}}/><col style={{width:26}}/><col style={{width:26}}/><col style={{width:26}}/>{/* reclasif 4 */}
                      <col style={{width:110}}/>{/* causa */}
                      <col style={{width:54}}/> {/* f.ingreso */}
                      <col style={{width:54}}/> {/* resp fecha */}
                      <col style={{width:120}}/>{/* resp desc */}
                    </colgroup>
                    <thead>
                      <tr>
                        <HHead bg="#E2EFDA" rowSpan={3} textColor="#1F2937">Acc.</HHead>
                        <HHead bg={DX.recepcion} colSpan={4}>Recepción</HHead>
                        <HHead bg={DX.tallas}    colSpan={18}>Tallas</HHead>
                        <HHead bg={C.primary}    colSpan={1} rowSpan={2}>Total</HHead>
                        <HHead bg={DX.reclasif}  colSpan={6}>Reclasificación</HHead>
                        <HHead bg={DX.respuesta} colSpan={2}>Respuesta</HHead>
                      </tr>
                      <tr>
                        <VHead w={64}>Consec.</VHead>
                        <VHead w={54}>Fecha|Devol.</VHead>
                        <VHead w={70}>Referencia</VHead>
                        <VHead w={90}>Factura /|Remisión</VHead>
                        {/* Tallas en una sola línea de headers */}
                        {TALLAS.map(t => <VHead key={t.field} w={26}>{t.label}</VHead>)}
                        {/* Reclasif */}
                        <VHead w={26}>Repara|ción</VHead>
                        <VHead w={26}>Línea</VHead>
                        <VHead w={26}>Aprove.|cha.</VHead>
                        <VHead w={26}>De|secho</VHead>
                        <VHead w={110}>Causa</VHead>
                        <VHead w={54}>F.Ingreso|Bodega</VHead>
                        {/* Respuesta */}
                        <VHead w={54}>Fecha|Resp.</VHead>
                        <VHead w={120}>Descripción</VHead>
                      </tr>
                    </thead>
                    <tbody>
                      {devFiltered.map((r, idx) => {
                        const bg = idx%2===0 ? DX.rowOdd : DX.rowEven;
                        return (
                          <tr key={r.id} style={{ backgroundColor:bg }}
                            onMouseEnter={e=>e.currentTarget.style.backgroundColor=DX.rowHover}
                            onMouseLeave={e=>e.currentTarget.style.backgroundColor=bg}>
                            <RowActions
                              onView={()=>setViewDev(r)}
                              onEdit={()=>openEditDev(r)}
                              onDel={()=>handleDeleteDev(r)}
                              deleting={deletingDev===r.id}
                            />
                            <Cell center bold color={C.primary}>{String(r.consecutivo).padStart(2,'0')}/{r.anio}</Cell>
                            <Cell center><Fecha v={r.fecha_devolucion}/></Cell>
                            <Cell center bold color={C.secondary}>{r.referencia?.ref||'—'}</Cell>
                            <Cell><Clamp v={r.factura_remision} muted/></Cell>
                            {TALLAS.map(t => (
                              <Cell key={t.field} center bg={r[t.field]?'#E8F5E9':undefined}>
                                <span style={{ color:r[t.field]?C.primary:'#D1D5DB', fontWeight:r[t.field]?700:400 }}>
                                  {r[t.field]??'—'}
                                </span>
                              </Cell>
                            ))}
                            <Cell center bold color={C.primary}>{r.total_unidades??0}</Cell>
                            <Cell center><Tick v={r.reclass_reparacion}/></Cell>
                            <Cell center><Tick v={r.reclass_linea}/></Cell>
                            <Cell center><Tick v={r.reclass_aprovechamiento}/></Cell>
                            <Cell center><Tick v={r.reclass_desecho}/></Cell>
                            <Cell><Clamp v={r.reclass_causa} muted/></Cell>
                            <Cell center><Fecha v={r.reclass_fecha_ingreso}/></Cell>
                            <Cell center><Fecha v={r.resp_fecha}/></Cell>
                            <Cell><Clamp v={r.resp_descripcion} muted/></Cell>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ══════════ TAB INDICADORES ══════════ */}
      {tab === 'indicadores' && (
        <div className="space-y-5">
          {/* KPIs row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label:'Total QRSF', value:indicadores.total, sub:`${indicadores.total-indicadores.cerrados} abierto(s)`, icon:MessageSquare, color:C.primary },
              { label:'Tasa Cierre', value:`${indicadores.tasaCierre}%`, sub:`${indicadores.cerrados} cerrado(s)`, icon:CheckCircle, color:indicadores.tasaCierre>=80?'#22C55E':indicadores.tasaCierre>=50?'#F59E0B':'#EF4444' },
              { label:'T. Prom. Respuesta', value:indicadores.tiempoPromedio!==null?`${indicadores.tiempoPromedio} días`:'S/D', sub:'en casos cerrados', icon:AlertCircle, color:semaforoT(indicadores.tiempoPromedio) },
              { label:'Devoluciones', value:devRegistros.length, sub:`${indicadores.totalDevUds} unidades`, icon:PackageX, color:C.secondary },
            ].map(k => (
              <Card key={k.label} className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs text-gray-500 uppercase font-medium">{k.label}</p>
                      <p className="text-2xl font-bold mt-1" style={{ color:k.color }}>{k.value}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{k.sub}</p>
                    </div>
                    <div className="p-2 rounded-lg" style={{ background:`${k.color}18` }}>
                      <k.icon className="h-5 w-5" style={{ color:k.color }}/>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Distribución QRSF + Causas QRSF más comunes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm font-semibold" style={{ color:C.primary }}>QRSF por Tipo</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-2.5">
                {indicadores.porTipo.map(t => (
                  <div key={t.value}>
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs font-medium text-gray-700">{t.label}</span>
                      <span className="text-xs font-bold" style={{ color:t.color }}>{t.count}</span>
                    </div>
                    <div className="h-2.5 rounded-full" style={{ background:'#f0f0ea' }}>
                      <div className="h-2.5 rounded-full transition-all" style={{
                        width:`${indicadores.total?(t.count/indicadores.total)*100:0}%`, background:t.color,
                      }}/>
                    </div>
                  </div>
                ))}
                {indicadores.total===0 && <p className="text-xs text-gray-400 text-center py-4">Sin datos</p>}
              </CardContent>
            </Card>

            {/* Causas más comunes QRSF */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm font-semibold" style={{ color:C.primary }}>Causas más Comunes — QRSF</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-2">
                {indicadores.causasTop.length > 0 ? indicadores.causasTop.map((c, i) => (
                  <div key={c.causa}>
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs text-gray-700 capitalize truncate flex-1 mr-2">{c.causa}</span>
                      <span className="text-xs font-bold shrink-0" style={{ color:C.primary }}>{c.count}</span>
                    </div>
                    <div className="h-2 rounded-full" style={{ background:'#f0f0ea' }}>
                      <div className="h-2 rounded-full" style={{
                        width:`${(c.count/indicadores.causasMaxCount)*100}%`,
                        background: i < 3 ? '#EF4444' : i < 5 ? '#F59E0B' : C.accent,
                      }}/>
                    </div>
                  </div>
                )) : <p className="text-xs text-gray-400 text-center py-4">Sin causas registradas</p>}
              </CardContent>
            </Card>
          </div>

          {/* Causas Devoluciones */}
          {indicadores.reclasifTop.length > 0 && (
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm font-semibold" style={{ color:C.secondary }}>Causas más Comunes — Devoluciones</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
                  {indicadores.reclasifTop.map((c,i) => (
                    <div key={c.causa}>
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-xs text-gray-700 capitalize truncate flex-1 mr-2">{c.causa}</span>
                        <span className="text-xs font-bold" style={{ color:C.secondary }}>{c.count}</span>
                      </div>
                      <div className="h-2 rounded-full" style={{ background:'#f0f0ea' }}>
                        <div className="h-2 rounded-full" style={{
                          width:`${(c.count/(indicadores.reclasifTop[0]?.count||1))*100}%`,
                          background: i<2?'#D97706':'#6f7b2c',
                        }}/>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* QRSF vs Ventas */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2 pt-4 px-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" style={{ color:C.primary }}/>
                <CardTitle className="text-sm font-semibold" style={{ color:C.primary }}>QRSF vs Ventas Mensuales</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <VentasPanel tipo="qrsf" ventas={qrsfVentas} registros={qrsfRegistros}
                onSave={async(d)=>{ await saveQrsfVentas(d); await fetchAll(); }}
                onDelete={async(id)=>{ await deleteQrsfVentas(id); await fetchAll(); }} />
            </CardContent>
          </Card>

          {/* Devoluciones vs Ventas */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2 pt-4 px-4">
              <div className="flex items-center gap-2">
                <TrendingDown className="h-4 w-4" style={{ color:C.secondary }}/>
                <CardTitle className="text-sm font-semibold" style={{ color:C.secondary }}>Devoluciones vs Ventas Mensuales</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <VentasPanel tipo="dev" ventas={devVentas} registros={devRegistros}
                onSave={async(d)=>{ await saveDevVentas(d); await fetchAll(); }}
                onDelete={async(id)=>{ await deleteDevVentas(id); await fetchAll(); }} />
            </CardContent>
          </Card>
        </div>
      )}

      {/* ══════════ MODAL CREAR/EDITAR QRSF ══════════ */}
      {qrsfModal && (
        <Dialog open onOpenChange={()=>setQrsfModal(false)}>
          <DialogContent className="max-w-2xl max-h-[94vh] overflow-y-auto p-0">
            <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 z-10"
              style={{ background:`linear-gradient(135deg,${C.primary},${C.secondary})` }}>
              <div>
                <h3 className="text-sm font-bold text-white">{qrsfEdit?'Editar Registro QRSF':'Nuevo Registro QRSF — RE-GC-03'}</h3>
                {qrsfEdit&&<p className="text-xs text-white/70">N° {String(qrsfEdit.consecutivo).padStart(2,'0')}/{qrsfEdit.anio}</p>}
              </div>
              <button onClick={()=>setQrsfModal(false)} className="text-white/80 hover:text-white"><X className="h-5 w-5"/></button>
            </div>
            <div className="p-5 space-y-5">
              {!qrsfEdit && (
                <div className="w-32">
                  <label className="text-xs font-medium text-gray-600 block mb-1">Año</label>
                  <Input type="number" min="2020" max="2099" value={qrsfForm.anio} onChange={e=>setQF('anio',parseInt(e.target.value))} className="text-sm"/>
                </div>
              )}

              {/* IDENTIFICACIÓN */}
              <div style={{ borderLeft:`3px solid ${QX.identificacion}`, paddingLeft:10 }}>
                <p className="text-xs font-bold mb-3 uppercase" style={{ color:'#1e429f' }}>Identificación</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="text-xs font-medium text-gray-600 block mb-1">Fecha de Recepción *</label>
                    <Input type="date" value={qrsfForm.fecha_recepcion} onChange={e=>setQF('fecha_recepcion',e.target.value)} className="text-sm"/>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 block mb-1">Canal</label>
                    <div className="flex flex-wrap gap-3 mt-1">
                      {[['canal_interno','Interno'],['canal_externo','Externo'],['canal_personal','Personal'],['canal_buzon','Buzón'],['canal_telefonica','Telefónica']].map(([f,l])=>(
                        <CheckField key={f} label={l} checked={qrsfForm[f]} onChange={v=>setQF(f,v)} color={QX.identificacion}/>
                      ))}
                    </div>
                  </div>
                </div>

                {/* CLIENTE — botón plegable */}
                <div>
                  <button type="button"
                    onClick={()=>setClientePanel(p=>!p)}
                    className="flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors"
                    style={{ borderColor:clientePanel?C.primary:C.beige, color:clientePanel?C.primary:'#6B7280',
                      background:clientePanel?`${C.primary}08`:'#fafaf8' }}>
                    <UserPlus className="h-3.5 w-3.5"/>
                    {qrsfForm.cliente_obj ? `Cliente: ${qrsfForm.cliente_obj.nombre}` : 'Agregar Cliente / Área / Proveedor'}
                    {clientePanel ? <ChevronUp className="h-3 w-3"/> : <ChevronDown className="h-3 w-3"/>}
                  </button>

                                    {clientePanel && (
                    <div className="mt-2 p-4 rounded-xl" style={{ background:'#f9f9f5', border:`1px solid ${C.beige}` }}>
                      {/* Buscador tipo combobox */}
                      <label className="text-xs text-gray-500 block mb-1">Buscar cliente</label>
                      <ClienteCombobox
                        value={qrsfForm.cliente_obj}
                        clientes={clientes}
                        onChange={(cli) => {
                          if (cli) {
                            setQrsfForm(f => ({...f, cliente_obj:cli, cliente_nombre:cli.nombre, cliente_ciudad:cli.ciudad||'', cliente_contacto:cli.contacto||''}));
                          } else {
                            setQrsfForm(f => ({...f, cliente_obj:null, cliente_nombre:'', cliente_ciudad:'', cliente_contacto:''}));
                          }
                        }}
                      />
                      {/* Crear nuevo cliente si no existe */}
                      {!qrsfForm.cliente_obj && (
                        <>
                          <p className="text-xs text-gray-400 mt-3 mb-2">— o crear nuevo cliente:</p>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                            <div>
                              <label className="text-xs text-gray-500 block mb-0.5">Nombre *</label>
                              <Input value={qrsfForm.cliente_nombre} onChange={e=>setQF('cliente_nombre',e.target.value)} placeholder="Nombre" className="text-sm"/>
                            </div>
                            <div>
                              <label className="text-xs text-gray-500 block mb-0.5">Ciudad</label>
                              <Input value={qrsfForm.cliente_ciudad} onChange={e=>setQF('cliente_ciudad',e.target.value)} placeholder="Ciudad" className="text-sm"/>
                            </div>
                            <div>
                              <label className="text-xs text-gray-500 block mb-0.5">Contacto</label>
                              <Input value={qrsfForm.cliente_contacto} onChange={e=>setQF('cliente_contacto',e.target.value)} placeholder="Tel / email" className="text-sm"/>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* DESCRIPCIÓN */}
              <div style={{ borderLeft:`3px solid #A9D18E`, paddingLeft:10 }}>
                <p className="text-xs font-bold mb-3 uppercase" style={{ color:'#2d6a4f' }}>Descripción del Caso</p>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div className="md:col-span-3">
                    <label className="text-xs font-medium text-gray-600 block mb-1">Descripción *</label>
                    <textarea value={qrsfForm.descripcion_caso} onChange={e=>setQF('descripcion_caso',e.target.value)}
                      rows={3} placeholder="Detalle del caso..." className="w-full border rounded-md p-2 text-sm resize-none" style={{ borderColor:'#E5E7EB' }}/>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 block mb-1">N° Unidades</label>
                    <Input type="number" min="0" value={qrsfForm.total_unidades} onChange={e=>setQF('total_unidades',e.target.value)} placeholder="0" className="text-sm"/>
                  </div>
                </div>
              </div>

              {/* CLASIFICACIÓN */}
              <div style={{ borderLeft:`3px solid ${QX.clasificacion}`, paddingLeft:10 }}>
                <p className="text-xs font-bold mb-3 uppercase" style={{ color:'#c05621' }}>Clasificación</p>
                <div className="flex flex-wrap gap-2">
                  {TIPOS_QRSF.map(t=>(
                    <button key={t.value} type="button" onClick={()=>setQF('tipo',t.value)}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                      style={{ background:qrsfForm.tipo===t.value?t.color:`${t.color}15`,
                        color:qrsfForm.tipo===t.value?'#fff':t.color, border:`2px solid ${t.color}` }}>
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* ANÁLISIS DE CAUSAS */}
              <div style={{ borderLeft:`3px solid ${QX.analisis}`, paddingLeft:10 }}>
                <p className="text-xs font-bold mb-3 uppercase" style={{ color:'#155b9e' }}>Análisis de Causas</p>
                <div className="flex flex-wrap gap-5 mb-3">
                  {[['causa_maquinaria','Maquinaria'],['causa_insumo','Insumo'],['causa_humano','Humano'],['causa_otros','Otros']].map(([f,l])=>(
                    <CheckField key={f} label={l} checked={qrsfForm[f]} onChange={v=>setQF(f,v)} color={QX.analisis}/>
                  ))}
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Descripción de la Causa</label>
                  <Input value={qrsfForm.descripcion_causa} onChange={e=>setQF('descripcion_causa',e.target.value)} placeholder="Causa identificada" className="text-sm"/>
                </div>
              </div>

              {/* TRATAMIENTO */}
              <div style={{ borderLeft:`3px solid ${QX.tratamiento}`, paddingLeft:10 }}>
                <p className="text-xs font-bold mb-3 uppercase" style={{ color:'#166534' }}>Tratamiento</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-medium text-gray-600 block mb-1">Fecha de Respuesta</label>
                    <Input type="date" value={qrsfForm.fecha_respuesta} onChange={e=>setQF('fecha_respuesta',e.target.value)} className="text-sm"/>
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-xs font-medium text-gray-600 block mb-1">Respuesta</label>
                    <Input value={qrsfForm.respuesta} onChange={e=>setQF('respuesta',e.target.value)} placeholder="Respuesta dada al caso" className="text-sm"/>
                  </div>
                </div>
              </div>

              {/* CIERRE */}
              <div style={{ borderLeft:`3px solid ${QX.cierre}`, paddingLeft:10 }}>
                <p className="text-xs font-bold mb-2 uppercase" style={{ color:'#92400e' }}>Cierre</p>
                <CheckField label="Marcar como cerrado (SI)" checked={qrsfForm.is_cerrado} onChange={v=>setQF('is_cerrado',v)} color={QX.cierre}/>
              </div>
            </div>

            <div className="px-5 py-4 border-t flex justify-end gap-3 sticky bottom-0" style={{ borderColor:C.beige, background:'#fafaf8' }}>
              <Button variant="outline" onClick={()=>setQrsfModal(false)} disabled={saving} style={{ borderColor:C.beige }}>Cancelar</Button>
              <Button onClick={handleSaveQRSF} disabled={saving} className="text-white font-semibold px-6" style={{ backgroundColor:C.primary }}>
                {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin"/>Guardando...</> : <><Check className="h-4 w-4 mr-2"/>{qrsfEdit?'Guardar Cambios':'Crear Registro'}</>}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* ══════════ MODAL CREAR/EDITAR DEVOLUCIÓN ══════════ */}
      {devModal && (
        <Dialog open onOpenChange={()=>setDevModal(false)}>
          <DialogContent className="max-w-3xl max-h-[94vh] overflow-y-auto p-0">
            <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 z-10"
              style={{ background:`linear-gradient(135deg,${C.primary},${C.secondary})` }}>
              <div>
                <h3 className="text-sm font-bold text-white">{devEdit?'Editar Devolución':'Nueva Devolución'}</h3>
                {devEdit&&<p className="text-xs text-white/70">N° {String(devEdit.consecutivo).padStart(2,'0')}/{devEdit.anio}</p>}
              </div>
              <button onClick={()=>setDevModal(false)} className="text-white/80 hover:text-white"><X className="h-5 w-5"/></button>
            </div>
            <div className="p-5 space-y-5">
              {!devEdit && (
                <div className="w-32">
                  <label className="text-xs font-medium text-gray-600 block mb-1">Año</label>
                  <Input type="number" min="2020" max="2099" value={devForm.anio} onChange={e=>setDF('anio',parseInt(e.target.value))} className="text-sm"/>
                </div>
              )}

              {/* RECEPCIÓN */}
              <div style={{ borderLeft:`3px solid ${DX.recepcion}`, paddingLeft:10 }}>
                <p className="text-xs font-bold mb-3 uppercase" style={{ color:'#1e429f' }}>Recepción</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-medium text-gray-600 block mb-1">Fecha Devolución *</label>
                    <Input type="date" value={devForm.fecha_devolucion} onChange={e=>setDF('fecha_devolucion',e.target.value)} className="text-sm"/>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 block mb-1">Referencia</label>
                    <RefAutocomplete value={devForm.referencia_obj}
                      onChange={r=>setDevForm(f=>({...f,referencia_obj:r}))}
                      referencias={referencias}/>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 block mb-1">Factura / Remisión</label>
                    <Input value={devForm.factura_remision} onChange={e=>setDF('factura_remision',e.target.value)} placeholder="N° factura o remisión" className="text-sm"/>
                  </div>
                </div>
              </div>

              {/* TALLAS — sin etiqueta infantil/adulto */}
              <div style={{ borderLeft:`3px solid ${DX.tallas}`, paddingLeft:10 }}>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-bold uppercase" style={{ color:'#166534' }}>Tallas</p>
                  <p className="text-xs font-bold" style={{ color:C.primary }}>
                    Total: {TALLAS.reduce((s,t)=>s+(parseInt(devForm[t.field]||0)||0),0)} uds
                  </p>
                </div>
                <p className="text-xs text-gray-400 mb-1.5">Deja vacío si no aplica la talla</p>
                {/* Fila 1: U 2 4 6 8 10 12 14 16 */}
                <div className="flex flex-wrap gap-2 mb-2">
                  {TALLAS_FILA1.map(t=>(
                    <div key={t.field} style={{ textAlign:'center' }}>
                      <div className="text-xs text-gray-400 mb-0.5 font-medium">{t.label}</div>
                      <Input type="number" min="0" max="999" value={devForm[t.field]}
                        onChange={e=>setDF(t.field,e.target.value)}
                        placeholder="—"
                        style={{ width:44, textAlign:'center', padding:'4px 2px', fontSize:13,
                          borderColor:devForm[t.field]?DX.tallas:undefined }}
                        className="text-sm"/>
                    </div>
                  ))}
                </div>
                {/* Fila 2: 16 28 30 32 34 36 38 40 42 */}
                <div className="flex flex-wrap gap-2">
                  {TALLAS_FILA2.map(t=>(
                    <div key={t.field} style={{ textAlign:'center' }}>
                      <div className="text-xs text-gray-400 mb-0.5 font-medium">{t.label}</div>
                      <Input type="number" min="0" max="999" value={devForm[t.field]}
                        onChange={e=>setDF(t.field,e.target.value)}
                        placeholder="—"
                        style={{ width:44, textAlign:'center', padding:'4px 2px', fontSize:13,
                          borderColor:devForm[t.field]?DX.tallas:undefined }}
                        className="text-sm"/>
                    </div>
                  ))}
                </div>
              </div>

              {/* RECLASIFICACIÓN */}
              <div style={{ borderLeft:`3px solid ${DX.reclasif}`, paddingLeft:10 }}>
                <p className="text-xs font-bold mb-3 uppercase" style={{ color:'#c05621' }}>Reclasificación</p>
                <div className="flex flex-wrap gap-5 mb-3">
                  {[['reclass_reparacion','Reparación'],['reclass_linea','Línea'],['reclass_aprovechamiento','Aprovechamiento'],['reclass_desecho','Desecho']].map(([f,l])=>(
                    <CheckField key={f} label={l} checked={devForm[f]} onChange={v=>setDF(f,v)} color={DX.reclasif}/>
                  ))}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-gray-600 block mb-1">Causa</label>
                    <Input value={devForm.reclass_causa} onChange={e=>setDF('reclass_causa',e.target.value)} placeholder="¿Por qué se devuelve?" className="text-sm"/>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 block mb-1">Fecha de Reingreso a Bodega</label>
                    <Input type="date" value={devForm.reclass_fecha_ingreso} onChange={e=>setDF('reclass_fecha_ingreso',e.target.value)} className="text-sm"/>
                  </div>
                </div>
              </div>

              {/* RESPUESTA */}
              <div style={{ borderLeft:`3px solid ${DX.respuesta}`, paddingLeft:10 }}>
                <p className="text-xs font-bold mb-3 uppercase" style={{ color:'#1e429f' }}>Respuesta</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-medium text-gray-600 block mb-1">Fecha Respuesta / Arreglo</label>
                    <Input type="date" value={devForm.resp_fecha} onChange={e=>setDF('resp_fecha',e.target.value)} className="text-sm"/>
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-xs font-medium text-gray-600 block mb-1">Descripción</label>
                    <Input value={devForm.resp_descripcion} onChange={e=>setDF('resp_descripcion',e.target.value)} placeholder="Qué se hizo con la devolución" className="text-sm"/>
                  </div>
                </div>
              </div>
            </div>
            <div className="px-5 py-4 border-t flex justify-end gap-3 sticky bottom-0" style={{ borderColor:C.beige, background:'#fafaf8' }}>
              <Button variant="outline" onClick={()=>setDevModal(false)} disabled={savingDev} style={{ borderColor:C.beige }}>Cancelar</Button>
              <Button onClick={handleSaveDev} disabled={savingDev} className="text-white font-semibold px-6" style={{ backgroundColor:C.primary }}>
                {savingDev ? <><Loader2 className="h-4 w-4 mr-2 animate-spin"/>Guardando...</> : <><Check className="h-4 w-4 mr-2"/>{devEdit?'Guardar Cambios':'Registrar Devolución'}</>}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Modales visualización */}
      {viewQRSF && <ViewQRSFModal reg={viewQRSF} onClose={()=>setViewQRSF(null)}/>}
      {viewDev   && <ViewDevModal  reg={viewDev}  onClose={()=>setViewDev(null)}/>}

      {/* Modal catálogo */}
      {catalogModal && (
        <CatalogModal tipo={catalogModal} clientes={clientes} referencias={referencias}
          onClose={()=>setCatalogModal(null)} onDeleteCliente={handleDeleteCliente}/>
      )}
    </div>
  );
}