// src/components/modules/MejoramientoContinuo/Informes/InformeWizard.jsx
import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence }                  from 'framer-motion';
import {
  ArrowLeft, ArrowRight, BarChart2, Edit3, Send,
  Loader2, ChevronDown, ChevronUp, FileBarChart,
  AlertCircle, Info, Check, Eye, User, Printer,
} from 'lucide-react';

import { supabase }    from '@/lib/supabase';
import { useInformes } from '@/hooks/useInformes';
import { getProcessItems, getProcessConfig } from './constants/processItems';
import { printInforme }  from '../../../../utils/printReport';
import RichEditor        from './components/RichEditor';

import { Button }   from '@/app/components/ui/button';
import { Input }    from '@/app/components/ui/input';
import { Label }    from '@/app/components/ui/label';
import { Badge }    from '@/app/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/app/components/ui/select';

// ─────────────────────────────────────────────────────────────────────────────
const STEPS = [
  { id: 1, label: 'Info',        icon: FileBarChart },
  { id: 2, label: 'Indicadores', icon: BarChart2    },
  { id: 3, label: 'Contenido',   icon: Edit3        },
  { id: 4, label: 'Preview',     icon: Eye          },
  { id: 5, label: 'Enviar',      icon: Send         },
];

// ─────────────────────────────────────────────────────────────────────────────
function StepperHeader({ current }) {
  return (
    <div className="flex items-center justify-center mb-6 overflow-x-auto pb-1">
      {STEPS.map((step, i) => {
        const Icon = step.icon;
        const done = current > step.id; const active = current === step.id;
        return (
          <div key={step.id} className="flex items-center">
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold transition-all"
                style={{ background: done?'#6dbd96':active?'#2e5244':'#e5e7eb', color: done||active?'white':'#9ca3af' }}>
                {done ? <Check size={14}/> : <Icon size={13}/>}
              </div>
              <span className="text-[10px] mt-1 font-medium whitespace-nowrap"
                style={{ color: active?'#2e5244':done?'#6dbd96':'#9ca3af' }}>{step.label}</span>
            </div>
            {i < STEPS.length-1 && (
              <div className="h-0.5 w-7 mx-1 mb-5 transition-all"
                style={{ background: current>step.id?'#6dbd96':'#e5e7eb' }}/>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PASO 1 — Info general
// ─────────────────────────────────────────────────────────────────────────────
function Step1({ form, setForm, processes, users, errors }) {
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-bold text-[#2e5244] mb-0.5">Información general</h3>
        <p className="text-xs text-gray-400">Título, proceso, responsable y período del informe</p>
      </div>
      <div>
        <Label className="text-sm font-medium text-gray-700 mb-1.5 block">Título <span className="text-red-500">*</span></Label>
        <Input value={form.title} onChange={e=>set('title',e.target.value)}
          placeholder="Ej: Informe de Gestión — Producción Q1 2026"
          className={errors.title?'border-red-400':''} />
        {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title}</p>}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-sm font-medium text-gray-700 mb-1.5 block">Proceso <span className="text-red-500">*</span></Label>
          <Select value={form.process_id} onValueChange={v=>set('process_id',v)}>
            <SelectTrigger className={errors.process_id?'border-red-400':''}><SelectValue placeholder="Seleccionar..."/></SelectTrigger>
            <SelectContent>
              {processes.map(p => {
                const cfg = getProcessConfig(p.id);
                return <SelectItem key={p.id} value={p.id}>{cfg?.icon??'📋'} {p.name}</SelectItem>;
              })}
            </SelectContent>
          </Select>
          {errors.process_id && <p className="text-xs text-red-500 mt-1">{errors.process_id}</p>}
          {form.process_id && (
            <p className="text-xs mt-1" style={{ color: getProcessConfig(form.process_id)?.color }}>
              {getProcessItems(form.process_id).length} ítems de contenido
            </p>
          )}
        </div>
        <div>
          <Label className="text-sm font-medium text-gray-700 mb-1.5 block">Responsable <span className="text-red-500">*</span></Label>
          <Select value={form.responsible_id} onValueChange={v=>set('responsible_id',v)}>
            <SelectTrigger className={errors.responsible_id?'border-red-400':''}><SelectValue placeholder="Seleccionar..."/></SelectTrigger>
            <SelectContent>
              {users.map(u => <SelectItem key={u.id} value={u.id}>{u.full_name}</SelectItem>)}
            </SelectContent>
          </Select>
          {errors.responsible_id && <p className="text-xs text-red-500 mt-1">{errors.responsible_id}</p>}
        </div>
      </div>
      <div>
        <Label className="text-sm font-medium text-gray-700 mb-1.5 block">Período <span className="text-red-500">*</span></Label>
        <Input value={form.period} onChange={e=>set('period',e.target.value)}
          placeholder="Ej: Primer Trimestre 2026 · Enero 2026"
          className={errors.period?'border-red-400':''} />
        {errors.period && <p className="text-xs text-red-500 mt-1">{errors.period}</p>}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PASO 2 — Indicadores con objetivos derivados
// ─────────────────────────────────────────────────────────────────────────────
function Step2({ processId, selected, setSelected, indicators, loadingIndicators }) {
  const procCfg = getProcessConfig(processId);
  const toggle  = id => setSelected(p => p.includes(id) ? p.filter(x=>x!==id) : [...p,id]);
  const objectives = [...new Set(indicators.filter(i=>selected.includes(i.id)).map(i=>i.objective).filter(Boolean))];

  if (loadingIndicators) return (
    <div className="flex items-center justify-center py-16 text-gray-400 gap-2 text-sm">
      <Loader2 className="animate-spin h-5 w-5"/> Cargando indicadores...
    </div>
  );

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-bold text-[#2e5244] mb-0.5">Indicadores del informe</h3>
        <p className="text-xs text-gray-400">Los objetivos se derivarán automáticamente de los seleccionados.</p>
      </div>
      {indicators.length === 0 ? (
        <div className="rounded-xl p-6 text-center text-sm text-gray-400" style={{ background:'#f5f5ef' }}>
          <BarChart2 className="h-8 w-8 mx-auto mb-2 opacity-30"/>
          Sin indicadores para este proceso. Puedes continuar.
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-400">{selected.length} / {indicators.length}</span>
            <button type="button" className="text-xs font-semibold hover:underline" style={{ color:'#2e5244' }}
              onClick={() => setSelected(selected.length===indicators.length ? [] : indicators.map(i=>i.id))}>
              {selected.length===indicators.length ? 'Deseleccionar todos' : 'Seleccionar todos'}
            </button>
          </div>
          {indicators.map(ind => {
            const sel = selected.includes(ind.id);
            return (
              <motion.div key={ind.id} whileTap={{ scale:0.99 }} onClick={() => toggle(ind.id)}
                className="flex items-start gap-3 p-3 rounded-xl cursor-pointer border-2 transition-all select-none"
                style={{ borderColor: sel?(procCfg?.color??'#6dbd96'):'#e5e7eb', background: sel?`${procCfg?.color??'#6dbd96'}0d`:'white' }}>
                <div className="w-5 h-5 rounded flex items-center justify-center shrink-0 mt-0.5"
                  style={{ background: sel?(procCfg?.color??'#6dbd96'):'white', border:`2px solid ${sel?(procCfg?.color??'#6dbd96'):'#d1d5db'}` }}>
                  {sel && <Check size={11} color="white"/>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800">{ind.indicator_name}</p>
                  {ind.objective && <p className="text-xs text-gray-400 mt-0.5"><span className="font-medium" style={{ color:procCfg?.color }}>Objetivo:</span> {ind.objective}</p>}
                </div>
                <span className="text-xs font-mono text-gray-400 shrink-0 mt-0.5">{ind.consecutive}</span>
              </motion.div>
            );
          })}
        </div>
      )}
      {objectives.length > 0 && (
        <div className="rounded-xl border p-4 space-y-2" style={{ background:'#f0f7f4', borderColor:'#6dbd9640' }}>
          <p className="text-xs font-bold text-[#2e5244] uppercase tracking-wide">🎯 Objetivos que se incluirán</p>
          {objectives.map((obj,i) => (
            <div key={i} className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ background:'#6dbd96' }}/>
              <p className="text-xs text-gray-700">{obj}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PASO 3 — Contenido por ítems
// ─────────────────────────────────────────────────────────────────────────────
function Step3({ reportId, processId, sections, setSections, onAutoSave }) {
  const [openItem, setOpenItem]     = useState(null);
  const [savingItem, setSavingItem] = useState(null);
  const debounceRef                 = useRef({});
  const items   = getProcessItems(processId);
  const procCfg = getProcessConfig(processId);

  useEffect(() => { if (items.length>0 && openItem===null) setOpenItem(items[0].key); }, []);

  const getData  = k => sections[k] ?? { logros:'', por_mejorar:'', hallazgos:'', por_resaltar:'' };
  const isFilled = k => { const s=getData(k); return [s.logros,s.por_mejorar,s.hallazgos,s.por_resaltar].some(v=>v&&v!=='<p></p>'); };
  const filled   = items.filter(i=>isFilled(i.key)).length;
  const pct      = items.length>0 ? Math.round((filled/items.length)*100) : 0;

  const handleChange = (key, field, value) => {
    setSections(p => ({ ...p, [key]: { ...getData(key), [field]: value } }));
    clearTimeout(debounceRef.current[`${key}-${field}`]);
    debounceRef.current[`${key}-${field}`] = setTimeout(async () => {
      setSavingItem(key);
      const item = items.find(i=>i.key===key);
      await onAutoSave(key, { item_key:key, item_name:item?.name??key, item_order:item?.order??0, ...getData(key), [field]:value });
      setSavingItem(null);
    }, 1500);
  };

  const grouped = items.reduce((acc,item) => {
    const cat = item.category ?? 'default';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-bold text-[#2e5244] mb-0.5">Contenido del informe</h3>
        <p className="text-xs text-gray-400">Se guarda automáticamente. Puedes pegar imágenes e insertar tablas.</p>
      </div>
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-gray-500">
          <span>{filled} de {items.length} ítems</span>
          <span className="font-semibold" style={{ color:'#2e5244' }}>{pct}%</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-1.5">
          <div className="h-1.5 rounded-full transition-all" style={{ width:`${pct}%`, background:'#6dbd96' }}/>
        </div>
      </div>
      {Object.entries(grouped).map(([cat, catItems]) => (
        <div key={cat}>
          {Object.keys(grouped).length>1 && cat!=='default' && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg mb-2 text-xs font-bold uppercase tracking-wide"
              style={{ background:`${procCfg?.color??'#2e5244'}15`, color:procCfg?.color??'#2e5244' }}>{cat}</div>
          )}
          <div className="space-y-2">
            {catItems.map(item => {
              const isOpen = openItem===item.key;
              const data   = getData(item.key);
              return (
                <div key={item.key} className="border-2 rounded-xl transition-all"
                  style={{ borderColor: isOpen?(procCfg?.color??'#6dbd96'):'#e5e7eb' }}>
                  <button type="button" onClick={() => setOpenItem(isOpen?null:item.key)}
                    className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-gray-50 transition-colors rounded-xl">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                        style={{ background: isFilled(item.key)?'#6dbd96':'#e5e7eb' }}>
                        {isFilled(item.key) ? <Check size={10} color="white"/> : <span className="text-[10px] text-gray-400 font-bold">{item.order}</span>}
                      </div>
                      <span className="text-xs font-bold text-gray-700 truncate uppercase tracking-wide">{item.name}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      {savingItem===item.key && <span className="text-xs text-gray-400 flex items-center gap-1"><Loader2 size={10} className="animate-spin"/> guardando...</span>}
                      {isOpen ? <ChevronUp size={15} className="text-gray-400"/> : <ChevronDown size={15} className="text-gray-400"/>}
                    </div>
                  </button>
                  <AnimatePresence>
                    {isOpen && (
                      <motion.div initial={{ height:0,opacity:0 }} animate={{ height:'auto',opacity:1 }} exit={{ height:0,opacity:0 }} transition={{ duration:0.2 }} className="overflow-hidden">
                        <div className="p-3 border-t border-gray-100 bg-gray-50/50">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {[
                              { field:'logros',       label:'✅ Logros',       color:'#2e5244' },
                              { field:'por_mejorar',  label:'⚠️ Por mejorar',  color:'#d97706' },
                              { field:'hallazgos',    label:'🔍 Hallazgos',    color:'#6f7b2c' },
                              { field:'por_resaltar', label:'⭐ Por resaltar',  color:'#6dbd96' },
                            ].map(({ field, label, color }) => (
                              <div key={field}>
                                <p className="text-xs font-bold mb-1.5 uppercase tracking-wide" style={{ color }}>{label}</p>
                                <RichEditor content={data[field]??''} onChange={v=>handleChange(item.key,field,v)}
                                  placeholder={`${label.split(' ').slice(1).join(' ')}...`} minHeight={85}/>
                              </div>
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Plantilla inline para preview (dentro del SIG)
// ─────────────────────────────────────────────────────────────────────────────
export function InformePDFTemplate({ formData, sections, indicators, selectedIndicators, processId, processList, users }) {
  const items   = getProcessItems(processId);
  const procCfg = getProcessConfig(processId);
  const proc    = processList.find(p=>p.id===processId);
  const selInds = indicators.filter(i=>selectedIndicators.includes(i.id));
  const responsible = users.find(u=>u.id===formData.responsible_id);
  const objectives  = [...new Set(selInds.map(i=>i.objective).filter(Boolean))];

  return (
    <div style={{ fontFamily:'Georgia, serif', background:'#fff', padding:'32px', fontSize:'12px', color:'#1f2937', maxWidth:'794px', margin:'0 auto' }}>
      {/* Portada */}
      <div style={{ borderBottom:'3px solid #2e5244', paddingBottom:'20px', marginBottom:'24px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:'20px' }}>
          <div style={{ flex:1 }}>
            <img src="https://wnsnymxabmxswnpcpvoj.supabase.co/storage/v1/object/public/templates/garana1.png" alt="Garana" crossOrigin="anonymous"
              style={{ height:'48px', objectFit:'contain', marginBottom:'12px', display:'block' }}/>
            <h1 style={{ fontSize:'17px', fontWeight:'bold', color:'#2e5244', margin:'0 0 4px' }}>{formData.title}</h1>
            <p style={{ fontSize:'11px', color:'#6b7280', margin:0 }}>Sistema de Gestión Integral · Garana Art S.A.S.</p>
          </div>
          <div style={{ textAlign:'right', minWidth:'175px' }}>
            <div style={{ background:`${procCfg?.color??'#6dbd96'}18`, padding:'8px 12px', borderRadius:'7px', border:`1px solid ${procCfg?.color??'#6dbd96'}35`, marginBottom:'8px' }}>
              <p style={{ margin:'0 0 2px', fontSize:'8px', color:'#6b7280', textTransform:'uppercase', letterSpacing:'.07em' }}>Proceso</p>
              <p style={{ margin:0, fontWeight:'bold', color:procCfg?.color??'#2e5244', fontSize:'12px' }}>{procCfg?.icon} {proc?.name}</p>
            </div>
            <table style={{ width:'100%', fontSize:'10px', borderCollapse:'collapse' }}>
              <tbody>
                {[['Período',responsible?.full_name?formData.period:formData.period],['Responsable',responsible?.full_name??'—'],['Fecha',new Date().toLocaleDateString('es-CO',{day:'2-digit',month:'long',year:'numeric'})]].map(([k,v])=>(
                  <tr key={k}><td style={{ color:'#9ca3af', padding:'2px 6px 2px 0', textAlign:'right' }}>{k}</td><td style={{ fontWeight:'600', color:'#374151', textAlign:'right' }}>{v}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Objetivos */}
      {objectives.length>0 && (
        <div style={{ marginBottom:'20px' }}>
          <h2 style={{ fontSize:'10px', fontWeight:'bold', color:'#2e5244', textTransform:'uppercase', letterSpacing:'.07em', borderBottom:'1px solid #e5e7eb', paddingBottom:'5px', marginBottom:'8px' }}>🎯 Objetivos estratégicos</h2>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'5px' }}>
            {objectives.map((obj,i) => (
              <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:'7px', padding:'5px 9px', background:'#f0f7f4', borderLeft:'2px solid #6dbd96', borderRadius:'0 4px 4px 0' }}>
                <div style={{ width:'5px', height:'5px', borderRadius:'50%', background:'#6dbd96', flexShrink:0, marginTop:'4px' }}/>
                <p style={{ margin:0, fontSize:'10px', color:'#374151', lineHeight:1.4 }}>{obj}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Indicadores */}
      {selInds.length>0 && (
        <div style={{ marginBottom:'20px' }}>
          <h2 style={{ fontSize:'10px', fontWeight:'bold', color:'#2e5244', textTransform:'uppercase', letterSpacing:'.07em', borderBottom:'1px solid #e5e7eb', paddingBottom:'5px', marginBottom:'8px' }}>📊 Indicadores</h2>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'5px' }}>
            {selInds.map(ind => (
              <div key={ind.id} style={{ background:'#f9fafb', padding:'6px 10px', borderRadius:'5px', border:'1px solid #e5e7eb' }}>
                <p style={{ margin:'0 0 1px', fontWeight:'600', color:'#111827', fontSize:'10px' }}>{ind.indicator_name}</p>
                {ind.consecutive && <p style={{ margin:0, color:'#9ca3af', fontSize:'8px', fontFamily:'monospace' }}>{ind.consecutive}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ítems */}
      {items.map(item => {
        const s = sections[item.key];
        if (!s) return null;
        const hasContent = [s.logros,s.por_mejorar,s.hallazgos,s.por_resaltar].some(v=>v&&v!=='<p></p>');
        if (!hasContent) return null;
        return (
          <div key={item.key} style={{ marginBottom:'20px' }}>
            <div style={{ background:'linear-gradient(135deg,#2e5244,#6dbd96)', padding:'6px 12px', borderRadius:'4px 4px 0 0' }}>
              <h3 style={{ margin:0, fontSize:'10px', fontWeight:'bold', color:'white', textTransform:'uppercase', letterSpacing:'.07em' }}>{item.name}</h3>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', border:'1px solid #e5e7eb', borderTop:'none', borderRadius:'0 0 4px 4px', overflow:'hidden' }}>
              {[
                { field:'logros',       label:'✅ Logros',       bg:'#f0fdf4', accent:'#86efac' },
                { field:'por_mejorar',  label:'⚠️ Por mejorar',  bg:'#fff7ed', accent:'#fed7aa' },
                { field:'hallazgos',    label:'🔍 Hallazgos',    bg:'#f7f8f0', accent:'#d9f99d' },
                { field:'por_resaltar', label:'⭐ Por resaltar',  bg:'#f0f7f4', accent:'#6dbd9660' },
              ].map(({ field, label, bg, accent }, idx) => {
                const val   = s[field];
                const empty = !val || val==='<p></p>';
                return (
                  <div key={field} style={{ padding:'8px 11px', background:empty?'#fafafa':bg, borderLeft:empty?'none':`2.5px solid ${accent}`, borderRight:idx%2===0?'1px solid #e5e7eb':'none', borderBottom:idx<2?'1px solid #e5e7eb':'none' }}>
                    <p style={{ margin:'0 0 4px', fontSize:'8px', fontWeight:'bold', color:empty?'#d1d5db':'#374151', textTransform:'uppercase', letterSpacing:'.05em' }}>{label}</p>
                    {empty
                      ? <p style={{ margin:0, color:'#d1d5db', fontSize:'9px', fontStyle:'italic' }}>Sin información</p>
                      : <div style={{ fontSize:'10px', lineHeight:1.6, color:'#1f2937' }} dangerouslySetInnerHTML={{ __html:val }}/>}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Footer */}
      <div style={{ borderTop:'1.5px solid #e5e7eb', paddingTop:'10px', marginTop:'16px', display:'flex', justifyContent:'space-between', fontSize:'8px', color:'#9ca3af' }}>
        <span>Garana Art S.A.S. · Sistema de Gestión Integral · {proc?.name}</span>
        <span>{responsible?.full_name} · {formData.period}</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PASO 4 — Vista previa
// ─────────────────────────────────────────────────────────────────────────────
function Step4Preview({ formData, sections, indicators, selectedIndicators, processId, processList, users }) {
  const items   = getProcessItems(processId);
  const procCfg = getProcessConfig(processId);
  const proc    = processList.find(p=>p.id===processId);
  const selInds = indicators.filter(i=>selectedIndicators.includes(i.id));
  const responsible = users.find(u=>u.id===formData.responsible_id);
  const filledItems = items.filter(item => { const s=sections[item.key]; return s&&[s.logros,s.por_mejorar,s.hallazgos,s.por_resaltar].some(v=>v&&v!=='<p></p>'); });
  const objectives  = [...new Set(selInds.map(i=>i.objective).filter(Boolean))];

  const handlePrint = () => printInforme({ formData, sections, indicators, selectedIndicators, processId, processList, users, getProcessItems, getProcessConfig });

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-base font-bold text-[#2e5244] mb-0.5">Vista previa</h3>
          <p className="text-xs text-gray-400">Revisa antes de enviar. También puedes pre-visualizar el PDF.</p>
        </div>
        <button onClick={handlePrint}
          className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors"
          style={{ background:'#f0f7f4', color:'#2e5244', borderColor:'#6dbd9640' }}>
          <Printer size={13}/> Ver PDF
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {[
          { label:'Proceso',      value: proc?.name??'—' },
          { label:'Responsable',  value: responsible?.full_name??'—' },
          { label:'Período',      value: formData.period },
          { label:'Ítems llenos', value: `${filledItems.length} / ${items.length}` },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-lg px-3 py-2.5" style={{ background:'#f5f5ef' }}>
            <p className="text-xs text-gray-400">{label}</p>
            <p className="text-sm font-semibold text-gray-800 truncate">{value}</p>
          </div>
        ))}
      </div>

      {objectives.length>0 && (
        <div className="rounded-xl px-4 py-3 space-y-1.5" style={{ background:'#f0f7f4', borderLeft:'3px solid #6dbd96' }}>
          <p className="text-xs font-bold text-[#2e5244] uppercase tracking-wide">🎯 Objetivos</p>
          {objectives.map((obj,i) => (
            <p key={i} className="text-xs text-gray-700 flex items-start gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#6dbd96] shrink-0 mt-1.5 inline-block"/>
              {obj}
            </p>
          ))}
        </div>
      )}

      {selInds.length>0 && (
        <div>
          <p className="text-xs font-semibold text-gray-600 mb-1.5">Indicadores:</p>
          <div className="flex flex-wrap gap-1.5">
            {selInds.map(ind => (
              <Badge key={ind.id} className="text-xs"
                style={{ background:`${procCfg?.color??'#6dbd96'}15`, color:procCfg?.color??'#6dbd96', border:`1px solid ${procCfg?.color??'#6dbd96'}30` }}>
                {ind.indicator_name}
              </Badge>
            ))}
          </div>
        </div>
      )}

      <div className="border rounded-xl overflow-hidden" style={{ maxHeight:'320px', overflowY:'auto' }}>
        <div className="px-3 py-2 border-b" style={{ background:'linear-gradient(135deg,#2e5244,#6dbd96)' }}>
          <p className="text-white text-xs font-semibold">{formData.title}</p>
          <p className="text-white/70 text-[10px]">{proc?.name} · {responsible?.full_name} · {formData.period}</p>
        </div>
        <div className="p-3 space-y-3 bg-white">
          {filledItems.length===0
            ? <p className="text-center text-xs text-gray-400 py-4">Sin ítems con contenido</p>
            : filledItems.map(item => {
                const s = sections[item.key];
                return (
                  <div key={item.key}>
                    <p className="text-xs font-bold uppercase tracking-wide mb-1.5" style={{ color:procCfg?.color??'#2e5244' }}>{item.name}</p>
                    <div className="grid grid-cols-2 gap-1.5">
                      {[
                        { field:'logros',       label:'✅ Logros',      color:'#2e5244' },
                        { field:'por_mejorar',  label:'⚠️ Por mejorar', color:'#d97706' },
                        { field:'hallazgos',    label:'🔍 Hallazgos',   color:'#6f7b2c' },
                        { field:'por_resaltar', label:'⭐ Por resaltar', color:'#6dbd96' },
                      ].map(({ field, label, color }) => {
                        const val = s[field];
                        if (!val || val==='<p></p>') return null;
                        return (
                          <div key={field} className="rounded-lg p-2" style={{ background:'#f9fafb' }}>
                            <p className="text-[10px] font-bold mb-1" style={{ color }}>{label}</p>
                            <div className="text-[11px] text-gray-700 leading-relaxed" dangerouslySetInnerHTML={{ __html:val }}/>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
        </div>
      </div>

      <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs"
        style={{ background:'#f0f7f4', color:'#2e5244', border:'1px solid #6dbd9640' }}>
        <Info size={13} className="shrink-0"/>
        Si todo está bien, avanza para enviar a revisión de gerencia.
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PASO 5 — Enviar  (sin html2canvas, usa printInforme para previsualizar)
// ─────────────────────────────────────────────────────────────────────────────
function Step5Send({ formData, sections, indicators, selectedIndicators, processId, processList, users, onSubmit, submitting }) {
  const items   = getProcessItems(processId);
  const procCfg = getProcessConfig(processId);
  const proc    = processList.find(p=>p.id===processId);
  const selInds = indicators.filter(i=>selectedIndicators.includes(i.id));
  const responsible = users.find(u=>u.id===formData.responsible_id);
  const filledItems = items.filter(item => { const s=sections[item.key]; return s&&[s.logros,s.por_mejorar,s.hallazgos,s.por_resaltar].some(v=>v&&v!=='<p></p>'); });

  const handlePrint = () => printInforme({ formData, sections, indicators, selectedIndicators, processId, processList, users, getProcessItems, getProcessConfig });

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-bold text-[#2e5244] mb-0.5">Enviar informe</h3>
        <p className="text-xs text-gray-400">Se notificará a gerencia para su revisión.</p>
      </div>

      <div className="rounded-xl border p-4 space-y-3 bg-white">
        <div className="flex items-start gap-3">
          <div className="rounded-lg p-2" style={{ background:`${procCfg?.color??'#2e5244'}15` }}>
            <FileBarChart className="h-5 w-5" style={{ color:procCfg?.color??'#2e5244' }}/>
          </div>
          <div>
            <p className="font-bold text-gray-900">{formData.title}</p>
            <p className="text-xs text-gray-500 mt-0.5">{proc?.name} · {formData.period}</p>
            <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1"><User size={10}/> {responsible?.full_name??'—'}</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 text-xs">
          {[
            { label:'Ítems', value:`${filledItems.length}/${items.length}` },
            { label:'Indicadores', value:selInds.length },
            { label:'Período', value:formData.period },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-lg p-2.5" style={{ background:'#f0f7f4' }}>
              <p className="text-gray-400 mb-0.5">{label}</p>
              <p className="font-bold text-[#2e5244]">{value}</p>
            </div>
          ))}
        </div>
      </div>

      {filledItems.length===0 && (
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs"
          style={{ background:'#fff7ed', color:'#d97706', border:'1px solid #fed7aa' }}>
          <AlertCircle size={13} className="shrink-0"/> Sin ítems completados. Puedes enviar de todas formas.
        </div>
      )}

      {/* Botón pre-visualizar PDF */}
      <button onClick={handlePrint}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-medium transition-colors"
        style={{ background:'#f0f7f4', color:'#2e5244', borderColor:'#6dbd9640' }}>
        <Printer size={15}/> Pre-visualizar / Descargar PDF
      </button>

      <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs"
        style={{ background:'#f0f7f4', color:'#2e5244', border:'1px solid #6dbd9640' }}>
        <Info size={13} className="shrink-0"/>
        Al enviar, gerencia recibirá un email de notificación y podrá revisar el informe.
      </div>

      <Button onClick={() => onSubmit()} disabled={submitting}
        className="w-full h-11 font-semibold gap-2" style={{ background:'#2e5244', color:'white' }}>
        {submitting
          ? <><Loader2 className="h-4 w-4 animate-spin"/> Enviando...</>
          : <><Send className="h-4 w-4"/> Enviar a revisión</>}
      </Button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────
export default function InformeWizard({ editTarget, onClose, onSuccess }) {
  const { createDraft, updateDraft, saveIndicators, loadReportIndicators, saveSection, loadSections, submitInforme } = useInformes();

  const [step,       setStep]       = useState(1);
  const [reportId,   setReportId]   = useState(editTarget?.id ?? null);
  const [saving,     setSaving]     = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [stepError,  setStepError]  = useState(null);

  const [form, setForm] = useState({
    title:          editTarget?.title          ?? '',
    process_id:     editTarget?.process_id     ?? '',
    responsible_id: editTarget?.responsible_id ?? '',
    period:         editTarget?.period         ?? '',
  });
  const [formErrors,         setFormErrors]         = useState({});
  const [processes,          setProcesses]          = useState([]);
  const [users,              setUsers]              = useState([]);
  const [indicators,         setIndicators]         = useState([]);
  const [loadingIndicators,  setLoadingIndicators]  = useState(false);
  const [selectedIndicators, setSelectedIndicators] = useState([]);
  const [sections,           setSections]           = useState({});

  useEffect(() => {
    supabase.from('process').select('id,name').eq('is_active',true).order('name').then(({data})=>setProcesses(data??[]));
    supabase.from('profile').select('id,full_name').eq('is_active',true).order('full_name').then(({data})=>setUsers(data??[]));
  }, []);

  useEffect(() => {
    if (!form.process_id) { setIndicators([]); return; }
    setLoadingIndicators(true);
    supabase.from('indicator').select('id,indicator_name,objective,consecutive')
      .eq('process_id',form.process_id).eq('status','active').order('indicator_name')
      .then(({data})=>{ setIndicators(data??[]); setLoadingIndicators(false); });
  }, [form.process_id]);

  useEffect(() => {
    if (!editTarget) return;
    loadReportIndicators(editTarget.id).then(r => { if(r.success) setSelectedIndicators(r.data.map(d=>d.indicator_id)); });
    loadSections(editTarget.id).then(r => {
      if(r.success) { const map={}; r.data.forEach(s=>{map[s.item_key]=s;}); setSections(map); }
    });
    if (editTarget.status==='revision_requested') setStep(3);
  }, [editTarget]);

  const validateStep1 = () => {
    const e = {};
    if (!form.title.trim())   e.title          = 'El título es obligatorio';
    if (!form.process_id)     e.process_id     = 'Selecciona un proceso';
    if (!form.responsible_id) e.responsible_id = 'Selecciona el responsable';
    if (!form.period.trim())  e.period         = 'El período es obligatorio';
    setFormErrors(e);
    return !Object.keys(e).length;
  };

  const goNext = async () => {
    setStepError(null);
    if (step===1) {
      if (!validateStep1()) return;
      setSaving(true);
      let result;
      if (reportId) { result = await updateDraft(reportId, form); }
      else          { result = await createDraft(form); if(result.success) setReportId(result.data.id); }
      setSaving(false);
      if (!result.success) { setStepError(result.error); return; }
    }
    if (step===2) {
      if (!reportId) return;
      setSaving(true);
      const result = await saveIndicators(reportId, selectedIndicators);
      setSaving(false);
      if (!result.success) { setStepError(result.error); return; }
    }
    setStep(s=>s+1);
  };

  const goBack = () => { setStepError(null); setStep(s=>s-1); };

  const handleAutoSave = useCallback(async (key, sectionData) => {
    if (!reportId) return;
    await saveSection(reportId, sectionData);
  }, [reportId, saveSection]);

  // FIX: sin pdfBlob — el PDF se genera desde el navegador via printInforme
  const handleSubmit = async () => {
    if (!reportId) return;
    setSubmitting(true);
    const result = await submitInforme(reportId, null);
    setSubmitting(false);
    if (result.success) { onSuccess?.(); }
    else { setStepError(result.error ?? 'Error al enviar'); }
  };

  const shared = { formData:form, sections, indicators, selectedIndicators, processId:form.process_id, processList:processes, users };

  return (
    <div className="max-w-3xl mx-auto space-y-2">
      <div className="flex items-center gap-3">
        <button type="button" onClick={onClose}
          className="flex items-center gap-1.5 text-sm text-[#2e5244] hover:bg-[#2e524410] px-2 py-1.5 rounded-lg transition-colors">
          <ArrowLeft className="h-4 w-4"/> Volver
        </button>
        <div className="h-5 w-px bg-gray-200"/>
        <div>
          <h2 className="text-xl font-bold text-[#2e5244]">{editTarget ? 'Editar informe' : 'Nuevo informe'}</h2>
          <p className="text-xs text-gray-400">
            {editTarget?.consecutive && <span className="font-mono mr-1">{editTarget.consecutive} ·</span>}
            Completa los pasos para enviar
          </p>
        </div>
      </div>

      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm px-6 pt-5 pb-5">
        <StepperHeader current={step}/>

        <AnimatePresence>
          {stepError && (
            <motion.div initial={{ opacity:0,y:-8 }} animate={{ opacity:1,y:0 }} exit={{ opacity:0 }}
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs mb-4"
              style={{ background:'#fef2f2', color:'#dc2626', border:'1px solid #fecaca' }}>
              <AlertCircle size={14} className="shrink-0"/>{stepError}
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          <motion.div key={step} initial={{ opacity:0,x:16 }} animate={{ opacity:1,x:0 }} exit={{ opacity:0,x:-16 }} transition={{ duration:0.18 }}>
            {step===1 && <Step1 form={form} setForm={setForm} processes={processes} users={users} errors={formErrors}/>}
            {step===2 && <Step2 processId={form.process_id} selected={selectedIndicators} setSelected={setSelectedIndicators} indicators={indicators} loadingIndicators={loadingIndicators}/>}
            {step===3 && <Step3 reportId={reportId} processId={form.process_id} sections={sections} setSections={setSections} onAutoSave={handleAutoSave}/>}
            {step===4 && <Step4Preview {...shared}/>}
            {step===5 && <Step5Send {...shared} onSubmit={handleSubmit} submitting={submitting}/>}
          </motion.div>
        </AnimatePresence>

        {step<5 && (
          <div className="flex justify-between items-center mt-5 pt-4 border-t border-gray-100">
            <Button variant="outline" onClick={step===1?onClose:goBack} disabled={saving} className="gap-1.5">
              <ArrowLeft className="h-4 w-4"/>{step===1?'Cancelar':'Anterior'}
            </Button>
            <div className="flex items-center gap-1.5">
              {STEPS.map(s => (
                <div key={s.id} className="w-1.5 h-1.5 rounded-full transition-all"
                  style={{ background:s.id===step?'#2e5244':s.id<step?'#6dbd96':'#e5e7eb', transform:s.id===step?'scale(1.5)':'scale(1)' }}/>
              ))}
            </div>
            <Button onClick={goNext} disabled={saving} className="gap-1.5" style={{ background:'#2e5244', color:'white' }}>
              {saving
                ? <><Loader2 className="h-4 w-4 animate-spin"/> Guardando...</>
                : <>{step===3?'Vista previa':step===4?'Ir a enviar':'Siguiente'} <ArrowRight className="h-4 w-4"/></>}
            </Button>
          </div>
        )}
        {step===5 && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <Button variant="outline" onClick={goBack} disabled={submitting} className="gap-1.5">
              <ArrowLeft className="h-4 w-4"/> Volver a la vista previa
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}