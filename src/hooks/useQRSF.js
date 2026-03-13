// src/hooks/useQRSF.js  — v2
// ═══════════════════════════════════════════════════════════════════
// Hook QRSF/Devoluciones con campos corregidos según RE-GC-03 real:
//   + canal_buzon, causa_otros, respuesta
//   + ventas mensuales QRSF y devoluciones
// ═══════════════════════════════════════════════════════════════════
import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export const MESES = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre',
];

export const TIPOS_QRSF = [
  { value:'queja',        label:'Queja',       short:'Q', color:'#EF4444' },
  { value:'reclamo',      label:'Reclamo',      short:'R', color:'#F97316' },
  { value:'sugerencia',   label:'Sugerencia',   short:'S', color:'#3B82F6' },
  { value:'felicitacion', label:'Felicitación', short:'F', color:'#22C55E' },
];

// Tallas unificadas — primera etiqueta es "U" (no "1") según formato físico
export const TALLAS = [
  { field:'talla_inf_1',  label:'U'  },
  { field:'talla_inf_2',  label:'2'  },
  { field:'talla_inf_4',  label:'4'  },
  { field:'talla_inf_6',  label:'6'  },
  { field:'talla_inf_8',  label:'8'  },
  { field:'talla_inf_10', label:'10' },
  { field:'talla_inf_12', label:'12' },
  { field:'talla_inf_14', label:'14' },
  { field:'talla_inf_16', label:'16' },
  { field:'talla_adu_16', label:'16' },
  { field:'talla_adu_28', label:'28' },
  { field:'talla_adu_30', label:'30' },
  { field:'talla_adu_32', label:'32' },
  { field:'talla_adu_34', label:'34' },
  { field:'talla_adu_36', label:'36' },
  { field:'talla_adu_38', label:'38' },
  { field:'talla_adu_40', label:'40' },
  { field:'talla_adu_42', label:'42' },
];
export const TALLAS_FILA1 = TALLAS.slice(0, 9);
export const TALLAS_FILA2 = TALLAS.slice(9, 18);

export const fmtFecha = (v) => {
  if (!v) return '';
  return new Date(v + (v.includes('T') ? '' : 'T00:00:00'))
    .toLocaleDateString('es-CO', { day:'2-digit', month:'2-digit', year:'2-digit' });
};
export const fmtFechaLarga = (v) => {
  if (!v) return '';
  return new Date(v + (v.includes('T') ? '' : 'T00:00:00'))
    .toLocaleDateString('es-CO', { day:'2-digit', month:'2-digit', year:'numeric' });
};

export function useQRSF() {
  const [clientes,      setClientes]      = useState([]);
  const [qrsfRegistros, setQrsfRegistros] = useState([]);
  const [devRegistros,  setDevRegistros]  = useState([]);
  const [referencias,   setReferencias]   = useState([]);
  const [qrsfVentas,    setQrsfVentas]    = useState([]);
  const [devVentas,     setDevVentas]     = useState([]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  const fetchAll = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [cliR, qrsfR, devR, refR, qvR, dvR] = await Promise.all([
        supabase.from('qrsf_cliente').select('*').eq('is_active', true).order('nombre'),
        supabase.from('qrsf_registro')
          .select('*, cliente:qrsf_cliente(id,nombre,ciudad,contacto)')
          .order('anio', { ascending: false }).order('consecutivo', { ascending: false }),
        supabase.from('dev_registro')
          .select('*, referencia:pnc_referencia(id,ref,categoria)')
          .order('anio', { ascending: false }).order('consecutivo', { ascending: false }),
        supabase.from('pnc_referencia').select('*').order('ref'),
        supabase.from('qrsf_ventas_mensual').select('*').order('anio',{ ascending:false }).order('mes',{ ascending:false }),
        supabase.from('dev_ventas_mensual').select('*').order('anio',{ ascending:false }).order('mes',{ ascending:false }),
      ]);
      if (cliR.error)  throw cliR.error;
      if (qrsfR.error) throw qrsfR.error;
      if (devR.error)  throw devR.error;
      if (refR.error)  throw refR.error;
      setClientes(cliR.data       || []);
      setQrsfRegistros(qrsfR.data || []);
      setDevRegistros(devR.data   || []);
      setReferencias(refR.data    || []);
      setQrsfVentas(qvR.data      || []);
      setDevVentas(dvR.data       || []);
    } catch(e) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  // ── Clientes ────────────────────────────────────────────────────
  const upsertCliente = useCallback(async ({ id, nombre, ciudad, contacto }) => {
    const body = { nombre: nombre.trim(), ciudad: ciudad?.trim()||null, contacto: contacto?.trim()||null };
    if (id) {
      const { data, error } = await supabase.from('qrsf_cliente').update(body).eq('id', id).select().single();
      if (error) throw error; return data;
    }
    const { data, error } = await supabase.from('qrsf_cliente').insert(body).select().single();
    if (error) throw error; return data;
  }, []);

  const deleteCliente = useCallback(async (id) => {
    const { error } = await supabase.from('qrsf_cliente').delete().eq('id', id);
    if (error) throw error;
  }, []);

  // ── QRSF ────────────────────────────────────────────────────────
  const _qrsfPayload = (form, clienteId) => ({
    fecha_recepcion:   form.fecha_recepcion,
    cliente_id:        clienteId || null,
    canal_interno:     !!form.canal_interno,
    canal_externo:     !!form.canal_externo,
    canal_personal:    !!form.canal_personal,
    canal_buzon:       !!form.canal_buzon,
    canal_telefonica:  !!form.canal_telefonica,
    descripcion_caso:  form.descripcion_caso,
    total_unidades:    form.total_unidades ? parseInt(form.total_unidades,10) : null,
    tipo:              form.tipo,
    causa_maquinaria:  !!form.causa_maquinaria,
    causa_insumo:      !!form.causa_insumo,
    causa_humano:      !!form.causa_humano,
    causa_otros:       !!form.causa_otros,
    descripcion_causa: form.descripcion_causa || null,
    fecha_respuesta:   form.fecha_respuesta   || null,
    respuesta:         form.respuesta         || null,
    is_cerrado:        !!form.is_cerrado,
  });

  const _resolveCliente = async (form) => {
    if (form.cliente_obj?.id) return form.cliente_obj.id;
    if (form.cliente_nombre?.trim()) {
      const cli = await upsertCliente({ nombre:form.cliente_nombre, ciudad:form.cliente_ciudad, contacto:form.cliente_contacto });
      return cli.id;
    }
    return null;
  };

  const createQRSF = useCallback(async (form) => {
    const anio = form.anio || new Date().getFullYear();
    const { data: consec, error: cErr } = await supabase.rpc('qrsf_next_consecutivo', { p_anio: anio });
    if (cErr) throw cErr;
    const clienteId = await _resolveCliente(form);
    const { data, error } = await supabase.from('qrsf_registro')
      .insert({ consecutivo: consec, anio, ..._qrsfPayload(form, clienteId) }).select().single();
    if (error) throw error; return data;
  }, [upsertCliente]);

  const updateQRSF = useCallback(async (id, form) => {
    const clienteId = await _resolveCliente(form);
    const { data, error } = await supabase.from('qrsf_registro')
      .update(_qrsfPayload(form, clienteId)).eq('id', id).select().single();
    if (error) throw error; return data;
  }, [upsertCliente]);

  const deleteQRSF = useCallback(async (id) => {
    const { error } = await supabase.from('qrsf_registro').delete().eq('id', id);
    if (error) throw error;
  }, []);

  // ── Devoluciones ────────────────────────────────────────────────
  const _devPayload = (form) => {
    const p = {
      fecha_devolucion:        form.fecha_devolucion,
      referencia_id:           form.referencia_obj?.id || null,
      factura_remision:        form.factura_remision || null,
      reclass_reparacion:      !!form.reclass_reparacion,
      reclass_linea:           !!form.reclass_linea,
      reclass_aprovechamiento: !!form.reclass_aprovechamiento,
      reclass_desecho:         !!form.reclass_desecho,
      reclass_causa:           form.reclass_causa || null,
      reclass_fecha_ingreso:   form.reclass_fecha_ingreso || null,
      resp_fecha:              form.resp_fecha || null,
      resp_descripcion:        form.resp_descripcion || null,
    };
    TALLAS.forEach(t => {
      const v = form[t.field];
      p[t.field] = (v !== '' && v != null && !isNaN(v)) ? parseInt(v, 10) : null;
    });
    return p;
  };

  const createDevolucion = useCallback(async (form) => {
    const anio = form.anio || new Date().getFullYear();
    const { data: consec, error: cErr } = await supabase.rpc('dev_next_consecutivo', { p_anio: anio });
    if (cErr) throw cErr;
    const { data, error } = await supabase.from('dev_registro')
      .insert({ consecutivo: consec, anio, ..._devPayload(form) }).select().single();
    if (error) throw error; return data;
  }, []);

  const updateDevolucion = useCallback(async (id, form) => {
    const { data, error } = await supabase.from('dev_registro')
      .update(_devPayload(form)).eq('id', id).select().single();
    if (error) throw error; return data;
  }, []);

  const deleteDevolucion = useCallback(async (id) => {
    const { error } = await supabase.from('dev_registro').delete().eq('id', id);
    if (error) throw error;
  }, []);

  // ── Ventas mensuales ────────────────────────────────────────────
  const saveQrsfVentas = useCallback(async ({ anio, mes, total_ventas, observaciones }) => {
    const { data, error } = await supabase.from('qrsf_ventas_mensual')
      .upsert({ anio, mes, total_ventas: parseInt(total_ventas,10), observaciones: observaciones||null },
               { onConflict: 'anio,mes' }).select().single();
    if (error) throw error; return data;
  }, []);

  const deleteQrsfVentas = useCallback(async (id) => {
    const { error } = await supabase.from('qrsf_ventas_mensual').delete().eq('id', id);
    if (error) throw error;
  }, []);

  const saveDevVentas = useCallback(async ({ anio, mes, total_ventas, observaciones }) => {
    const { data, error } = await supabase.from('dev_ventas_mensual')
      .upsert({ anio, mes, total_ventas: parseInt(total_ventas,10), observaciones: observaciones||null },
               { onConflict: 'anio,mes' }).select().single();
    if (error) throw error; return data;
  }, []);

  const deleteDevVentas = useCallback(async (id) => {
    const { error } = await supabase.from('dev_ventas_mensual').delete().eq('id', id);
    if (error) throw error;
  }, []);

  return {
    clientes, qrsfRegistros, devRegistros, referencias,
    qrsfVentas, devVentas,
    loading, error, fetchAll,
    upsertCliente, deleteCliente,
    createQRSF, updateQRSF, deleteQRSF,
    createDevolucion, updateDevolucion, deleteDevolucion,
    saveQrsfVentas, deleteQrsfVentas,
    saveDevVentas, deleteDevVentas,
  };
}
export default useQRSF;