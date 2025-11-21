import React, { useState, useEffect, useMemo, useRef, useLayoutEffect } from 'https://esm.sh/react@18.2.0';
import ReactDOM from 'https://esm.sh/react-dom@18.2.0/client';
import { 
  TrendingUp, Wallet, AlertCircle, Calendar, User, FileText, ArrowRight, Target, 
  LayoutGrid, BarChart3, ArrowUpDown, UserCircle, Moon, Sun, Building2, 
  CalendarClock, ShieldAlert, History, Download, ArrowLeft, ArrowUpRight, ArrowDownRight,
  Settings, Plus, Edit, Trash2, Save, X
} from 'https://esm.sh/lucide-react@0.292.0';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  Cell, ReferenceLine, AreaChart, Area, Line, ScatterChart, Scatter, Label, LabelList
} from 'https://esm.sh/recharts@2.10.3';

// ==========================================
// 1. NEON API CLIENT
// ==========================================

const API_BASE = "https://attentiocloud-api.vercel.app";

function getToken() {
  return (
      localStorage.getItem("_ms-mid") ||
      document.cookie.split("; ").find((r) => r.startsWith("_ms-mid="))?.split("=")[1] ||
      null
  );
}

function getPlans() {
  const raw = localStorage.getItem("_ms-mem");
  if (!raw) return [];
  try {
      const obj = JSON.parse(raw);
      return (obj.planConnections || []).map(p => p.planId);
  } catch (e) {
      console.warn("Invalid _ms-mem JSON", e);
      return [];
  }
}

function buildHeaders() {
  const token = getToken(); 
  const headers = { "Content-Type": "application/json" };
  if (token) {
      headers["Authorization"] = `Bearer ${token}`;
      headers["X-MS-Plans"] = getPlans().join(",");
  }
  return headers;
}

function apiresponse(data, responsId) {
    if (responsId && window[responsId]) window[responsId](data);
    return data;
}

async function getNEON({ table, fields = null, where = null, responsId, cache = false, public: isPublic = false, pagination = null }) {
  let url = `${API_BASE}/api/${table}`;
  const params = new URLSearchParams();
  if (fields?.length) params.set("fields", fields.join(","));
  if (where) Object.entries(where).forEach(([k, v]) => params.set(k, v));
  if (cache) params.set("cache", "1");
  if (pagination) {
      if (pagination.limit != null) params.set("limit", String(pagination.limit));
      if (pagination.offset != null) params.set("offset", String(pagination.offset));
  }
  if ([...params].length > 0) url += `?${params.toString()}`;
  const options = isPublic ? {} : { headers: buildHeaders() };

  try {
      const res = await fetch(url, options);
      const json = await res.json();
      return apiresponse({ rows: json.rows || [] }, responsId);
  } catch (err) {
      console.error("GET NEON Error:", err);
      return { rows: [] };
  }
}

async function postNEON({ table, data, responsId, public: isPublic = false }) {
  const url = `${API_BASE}/api/${table}`;
  const bodyToSend = Array.isArray(data) ? data : [data];
  const options = {
      method: "POST",
      headers: isPublic ? { "Content-Type": "application/json" } : buildHeaders(),
      body: JSON.stringify(bodyToSend)
  };
  const res = await fetch(url, options);
  if (!res.ok) throw new Error(`POST failed: ${res.status}`);
  const json = await res.json();
  return apiresponse(json, responsId);
}

async function patchNEON({ table, data, responsId, public: isPublic = false }) {
  const url = `${API_BASE}/api/${table}`;
  let payload;
  if (!Array.isArray(data)) {
      if (data.id && data.fields) payload = { id: data.id, data: data.fields };
      else { const { id, ...rest } = data; payload = { id, data: rest }; }
  } else {
      payload = data.map(item => {
          if (item.fields) return { id: item.id, fields: item.fields };
          const { id, ...rest } = item;
          return { id, fields: rest };
      });
  }
  const options = {
      method: "PATCH",
      headers: isPublic ? { "Content-Type": "application/json" } : buildHeaders(),
      body: JSON.stringify(payload),
  };
  const res = await fetch(url, options);
  if (!res.ok) throw new Error(`PATCH failed: ${res.status}`);
  const json = await res.json();
  return apiresponse(json, responsId);
}

async function deleteNEON({ table, data, responsId }) {
  if (data === undefined || data === null) throw new Error("deleteNEON requires 'data' ID");
  const ids = Array.isArray(data) ? data : [data];
  const value = ids.join(",");
  const url = `${API_BASE}/api/${table}?field=id&value=${value}`;
  const res = await fetch(url, { method: "DELETE", headers: buildHeaders() });
  if (!res.ok) throw new Error(`DELETE failed: ${res.status}`);
  const json = await res.json();
  return apiresponse({ deleted: json.deleted, ids }, responsId);
}

// ==========================================
// 2. REACT COMPONENTS
// ==========================================

const formatCurrency = (value) => {
  const absValue = Math.abs(value);
  if (absValue >= 1000000) {
    const inMillions = value / 1000000;
    return new Intl.NumberFormat('no-NO', { style: 'decimal', minimumFractionDigits: 0, maximumFractionDigits: 1 }).format(inMillions) + ' M';
  }
  return new Intl.NumberFormat('no-NO', { style: 'decimal', maximumFractionDigits: 0 }).format(value);
};

const StatusBadge = ({ deviation }) => {
  let status = 'success'; let label = 'På budsjett';
  if (deviation < -15) { status = 'danger'; label = 'Betydelig avvik'; } 
  else if (deviation < 0) { status = 'warning'; label = 'Under forventning'; }
  const styles = {
    success: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    warning: 'bg-amber-100 text-amber-700 border-amber-200',
    danger: 'bg-rose-100 text-rose-700 border-rose-200',
  };
  return React.createElement('span', { className: `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[status]}` }, label);
};

const DeviationSlider = ({ value }) => {
  const min = -50; const max = 50;
  const clampedValue = Math.max(min, Math.min(max, value));
  const percentage = ((clampedValue - min) / (max - min)) * 100;
  let colorClass = 'bg-slate-400';
  if (value > 5) colorClass = 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.6)]';
  else if (value < -5) colorClass = 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.6)]';
  else colorClass = 'bg-amber-400';
  return (
    <div className="w-full h-10 relative flex items-center justify-center group">
      <div className="absolute w-full h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-100">
        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-slate-300 transform -translate-x-1/2"></div>
        <div className={`absolute top-0 bottom-0 transition-all duration-500 ease-out opacity-40 ${value < 0 ? 'bg-rose-500' : 'bg-emerald-500'}`}
            style={{ left: value < 0 ? `${percentage}%` : '50%', right: value < 0 ? '50%' : `${100 - percentage}%` }}></div>
      </div>
      <div className={`absolute w-4 h-4 rounded-full border-2 border-white transition-all duration-500 ease-out z-10 ${colorClass}`}
        style={{ left: `${percentage}%`, transform: 'translateX(-50%)' }}></div>
      <div className={`absolute -top-1 text-[10px] font-bold transition-all duration-500 ${value < 0 ? 'text-rose-600' : value > 0 ? 'text-emerald-600' : 'text-slate-500'}`}
         style={{ left: `${percentage}%`, transform: `translateX(-50%) translateY(-100%)` }}>
        {value > 0 ? '+' : ''}{Math.round(value)}%
      </div>
    </div>
  );
};

const MetricCard = ({ data, onSelect }) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const isPositiveTrend = (data.trendHistory || 0) >= 0;
  const trendColor = isPositiveTrend ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400';
  const trendBg = isPositiveTrend ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-rose-50 dark:bg-rose-900/20';
  const TrendIcon = isPositiveTrend ? ArrowUpRight : ArrowDownRight;

  return (
    <div className="h-[300px] cursor-pointer perspective-[1000px]" onClick={() => setIsFlipped(!isFlipped)}>
      <div className="relative w-full h-full transition-all duration-500 ease-out hover:-translate-y-2 hover:shadow-2xl rounded-xl">
        <div className={`relative w-full h-full transition-transform duration-700 [transform-style:preserve-3d] ${isFlipped ? '[transform:rotateY(180deg)]' : ''}`}>
          <div className="absolute inset-0 w-full h-full [backface-visibility:hidden]">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-5 flex flex-col h-full transition-colors duration-300">
              <div className="flex justify-between items-start mb-2">
                <div><h3 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">{data.id}. {data.name}</h3><p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{data.manager}</p></div>
                <StatusBadge deviation={data.calculatedDeviationPercent} />
              </div>
              <div className="space-y-2 mb-2 flex-grow">
                <div className="flex justify-between items-center group/item h-9">
                    <div className="flex items-center text-slate-600 dark:text-slate-400 text-sm"><TrendingUp className="w-4 h-4 mr-2 text-slate-400 dark:text-slate-500" /><span className="font-medium">Resultat YTD</span></div>
                    <div className="flex items-center gap-2">
                      <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md ${trendBg} border border-transparent dark:border-slate-700/50`}><TrendIcon className={`w-3 h-3 ${trendColor}`} /><span className={`text-[10px] font-bold ${trendColor}`}>{Math.abs(data.trendHistory || 0)}%</span></div>
                      <span className="font-bold text-slate-900 dark:text-white text-lg tabular-nums">{formatCurrency(data.resultYTD)}</span>
                    </div>
                </div>
                <div className="flex justify-between items-center group/item h-9">
                    <div className="flex items-center text-slate-600 dark:text-slate-400 text-sm"><Target className="w-4 h-4 mr-2 text-slate-400 dark:text-slate-500" /><span className="font-medium">Budsjett YTD</span></div>
                    <div className="flex flex-col items-end leading-none"><span className="font-bold text-slate-500 dark:text-slate-400 text-lg tabular-nums">{formatCurrency(Math.round(data.calculatedBudgetYTD))}</span><span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">pr. år {formatCurrency(data.budgetTotal)}</span></div>
                </div>
                <div className="h-px bg-slate-100 dark:bg-slate-700 my-1"></div>
                <div className="flex justify-between items-center h-8">
                    <div className="flex items-center text-slate-600 dark:text-slate-400 text-sm"><AlertCircle className="w-4 h-4 mr-2 text-slate-400 dark:text-slate-500" /><span className="font-medium">Avvik %</span></div>
                    <span className={`font-bold tabular-nums ${data.calculatedDeviationPercent < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>{data.calculatedDeviationPercent > 0 ? '+' : ''}{data.calculatedDeviationPercent.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between items-center mt-1 h-9">
                    <div className="flex items-center text-slate-600 dark:text-slate-400 text-sm"><Wallet className="w-4 h-4 mr-2 text-slate-400 dark:text-slate-500" /><div className="flex flex-col leading-none"><span className="font-medium">Likviditet</span><span className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">{data.liquidityDate}</span></div></div>
                    <span className="font-bold text-slate-900 dark:text-white tabular-nums">{formatCurrency(data.liquidity)}</span>
                </div>
              </div>
              <div className="mt-auto pt-0"><DeviationSlider value={data.calculatedDeviationPercent} /></div>
            </div>
          </div>
          <div className="absolute inset-0 w-full h-full [transform:rotateY(180deg)] [backface-visibility:hidden]">
            <div className="bg-slate-800 rounded-xl shadow-xl border border-slate-700 p-5 flex flex-col h-full text-slate-50 relative overflow-hidden">
              <div className="flex justify-between items-center mb-3 border-b border-slate-700 pb-2"><h3 className="text-lg font-bold text-white">{data.name} - Status</h3><div className="p-1.5 bg-slate-700 rounded-full"><FileText className="w-4 h-4 text-sky-400" /></div></div>
              <div className="space-y-2 flex-grow">
                <div className="flex items-start gap-3"><Calendar className="w-4 h-4 text-slate-400 mt-0.5" /><div><p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Sist rapportert</p><p className="text-sm font-medium text-slate-100">{data.lastReportDate}</p></div></div>
                <div className="flex items-start gap-3"><User className="w-4 h-4 text-slate-400 mt-0.5" /><div><p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Rapportert av</p><p className="text-sm font-medium text-slate-100">{data.lastReportBy}</p></div></div>
                <div className="bg-slate-700/50 rounded-lg p-3 border border-slate-600 mt-1"><p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-1">Kommentar</p><p className="text-xs text-slate-300 italic leading-relaxed line-clamp-4">"{data.comment}"</p></div>
              </div>
              <button className="mt-auto w-full py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 shadow-lg" onClick={(e) => { e.stopPropagation(); onSelect(data); }}>Gå til Firmaside <ArrowRight className="w-4 h-4" /></button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const AdminView = ({ companies, onAdd, onUpdate, onDelete }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState(null);
  const [formData, setFormData] = useState({});
  useEffect(() => {
    if (editingCompany) setFormData(editingCompany);
    else setFormData({ name: '', manager: '', resultYTD: 0, budgetTotal: 0, liquidity: 0, liquidityDate: '', lastReportDate: '', lastReportBy: '', comment: '', trendHistory: 0 });
  }, [editingCompany, isModalOpen]);
  const handleSubmit = (e) => {
    e.preventDefault();
    const companyPayload = formData;
    if (editingCompany) onUpdate(companyPayload);
    else onAdd(companyPayload);
    setIsModalOpen(false); setEditingCompany(null);
  };
  const handleInputChange = (e) => {
      const { name, value, type } = e.target;
      setFormData(prev => ({ ...prev, [name]: type === 'number' ? parseFloat(value) || 0 : value }));
  };
  return (
    <div className="animate-in fade-in duration-500">
      <div className="flex justify-between items-center mb-8">
        <div><h2 className="text-2xl font-bold text-slate-900 dark:text-white">Administrer Selskaper</h2></div>
        <button onClick={() => { setEditingCompany(null); setIsModalOpen(true); }} className="bg-sky-600 hover:bg-sky-500 text-white px-4 py-2 rounded-lg shadow-sm flex items-center gap-2 text-sm font-bold transition-colors"><Plus className="w-4 h-4" />Legg til nytt selskap</button>
      </div>
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
         <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead><tr className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700 text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold"><th className="p-4">Navn</th><th className="p-4">Leder</th><th className="p-4 text-right">Resultat YTD</th><th className="p-4 text-right">Årsbudsjett</th><th className="p-4 text-right">Likviditet</th><th className="p-4 text-center">Handlinger</th></tr></thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-sm">
              {companies.map((company) => (
                <tr key={company.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                  <td className="p-4 font-bold text-slate-900 dark:text-white">{company.name}</td>
                  <td className="p-4 text-slate-600 dark:text-slate-300">{company.manager}</td>
                  <td className="p-4 text-right font-mono text-slate-700 dark:text-slate-200">{formatCurrency(company.resultYTD)}</td>
                  <td className="p-4 text-right font-mono text-slate-500 dark:text-slate-400">{formatCurrency(company.budgetTotal)}</td>
                  <td className="p-4 text-right font-mono text-emerald-600 dark:text-emerald-400">{formatCurrency(company.liquidity)}</td>
                  <td className="p-4 flex justify-center gap-2">
                    <button onClick={() => { setEditingCompany(company); setIsModalOpen(true); }} className="p-2 text-slate-400 hover:text-sky-600"><Edit className="w-4 h-4" /></button>
                    <button onClick={() => onDelete(company.id)} className="p-2 text-slate-400 hover:text-rose-600"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
         </div>
      </div>
      {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl border border-slate-200 dark:border-slate-700 max-h-[90vh] overflow-y-auto p-6">
                  <h3 className="text-xl font-bold mb-4 text-slate-900 dark:text-white">{editingCompany ? 'Rediger' : 'Nytt Selskap'}</h3>
                  <form onSubmit={handleSubmit} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                          <input name="name" placeholder="Navn" value={formData.name || ''} onChange={handleInputChange} className="border p-2 rounded dark:bg-slate-900 dark:text-white dark:border-slate-600" required />
                          <input name="manager" placeholder="Leder" value={formData.manager || ''} onChange={handleInputChange} className="border p-2 rounded dark:bg-slate-900 dark:text-white dark:border-slate-600" />
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                          <input type="number" name="resultYTD" placeholder="Resultat YTD" value={formData.resultYTD || 0} onChange={handleInputChange} className="border p-2 rounded dark:bg-slate-900 dark:text-white dark:border-slate-600" />
                          <input type="number" name="budgetTotal" placeholder="Årsbudsjett" value={formData.budgetTotal || 0} onChange={handleInputChange} className="border p-2 rounded dark:bg-slate-900 dark:text-white dark:border-slate-600" />
                          <input type="number" name="liquidity" placeholder="Likviditet" value={formData.liquidity || 0} onChange={handleInputChange} className="border p-2 rounded dark:bg-slate-900 dark:text-white dark:border-slate-600" />
                      </div>
                      <div className="flex justify-end gap-3 mt-4">
                          <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600">Avbryt</button>
                          <button type="submit" className="px-4 py-2 bg-sky-600 text-white rounded">Lagre</button>
                      </div>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};

const RiskMatrix = ({ data }) => {
  const chartData = data.map(c => ({ ...c, x: c.liquidity, y: c.calculatedDeviationPercent, z: 1 }));
  const xMax = Math.max(...chartData.map(d => d.x)) * 1.1;
  return (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 mb-8">
      <div className="flex justify-between items-center mb-4"><div><h3 className="text-lg font-bold text-slate-900 dark:text-white">Risiko-Matrise (Konsern)</h3><p className="text-xs text-slate-500 dark:text-slate-400">Likviditet (X) vs Avvik (Y)</p></div></div>
      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis type="number" dataKey="x" name="Likviditet" tickFormatter={(val) => `${(val/1000).toFixed(0)}k`} stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={{ stroke: '#cbd5e1' }}><Label value="Likviditet" offset={0} position="insideBottom" fill="#94a3b8" fontSize={10} /></XAxis>
            <YAxis type="number" dataKey="y" name="Avvik %" tickFormatter={(val) => `${val}%`} stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={{ stroke: '#cbd5e1' }}><Label value="Avvik %" angle={-90} position="insideLeft" fill="#94a3b8" fontSize={10} /></YAxis>
            <Tooltip cursor={{ strokeDasharray: '3 3' }} content={({ active, payload }) => { if (active && payload && payload.length) { const d = payload[0].payload; return (<div className="bg-white dark:bg-slate-700 p-3 border border-slate-200 dark:border-slate-600 shadow-lg rounded-lg"><p className="font-bold text-slate-900 dark:text-white mb-1">{d.name}</p><div className="text-xs space-y-1"><p className="text-slate-500 dark:text-slate-300">Avvik: <span className={d.y < 0 ? 'text-rose-500' : 'text-emerald-500'}>{d.y.toFixed(1)}%</span></p><p className="text-slate-500 dark:text-slate-300">Likviditet: {formatCurrency(d.x)}</p></div></div>); } return null; }} />
            <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="3 3" />
            <ReferenceLine x={xMax/2} stroke="#94a3b8" strokeDasharray="3 3" />
            <Scatter name="Selskaper" data={chartData} fill="#8884d8">{chartData.map((entry, index) => { let fill = '#f59e0b'; if (entry.y < 0 && entry.x < 300000) fill = '#f43f5e'; else if (entry.y > 0 && entry.x > 300000) fill = '#10b981'; return <Cell key={`cell-${index}`} fill={fill} stroke="white" strokeWidth={2} />; })}<LabelList dataKey="name" position="top" offset={5} fontSize={10} fill="#64748b" fontWeight={600} /></Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

const AnalyticsView = ({ data }) => {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <RiskMatrix data={data} />
      <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6">Resultat vs Budsjett (YTD)</h3>
        <div className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#64748b" fontSize={12} tickFormatter={(val) => `${(val / 1000).toFixed(0)}k`} tickLine={false} axisLine={false} />
              <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} formatter={(value) => [formatCurrency(value), '']} />
              <Legend wrapperStyle={{ paddingTop: '20px' }} />
              <Bar dataKey="calculatedBudgetYTD" name="Budsjett" fill="#94a3b8" radius={[4, 4, 0, 0]} maxBarSize={50} />
              <Bar dataKey="resultYTD" name="Resultat" fill="#0ea5e9" radius={[4, 4, 0, 0]} maxBarSize={50} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

const AnimatedGrid = ({ children, className = '' }) => {
  const containerRef = useRef(null);
  const [boundingBoxes, setBoundingBoxes] = useState({});
  const [prevChildren, setPrevChildren] = useState(children);
  useLayoutEffect(() => {
    const newBoundingBoxes = {};
    if (containerRef.current) {
      Array.from(containerRef.current.children).forEach((child) => { const key = child.dataset.key; if (key) newBoundingBoxes[key] = child.getBoundingClientRect(); });
    }
    if (containerRef.current) {
      Array.from(containerRef.current.children).forEach((child) => {
        const key = child.dataset.key;
        if (key && boundingBoxes[key] && newBoundingBoxes[key]) {
          const prevBox = boundingBoxes[key]; const newBox = newBoundingBoxes[key];
          const changeX = prevBox.left - newBox.left; const changeY = prevBox.top - newBox.top;
          if (changeX !== 0 || changeY !== 0) { child.style.transform = `translate(${changeX}px, ${changeY}px)`; child.style.transition = 'transform 0s'; requestAnimationFrame(() => { child.style.transform = ''; child.style.transition = 'transform 500ms cubic-bezier(0.4, 0, 0.2, 1)'; }); }
        }
      });
    }
    setBoundingBoxes(newBoundingBoxes);
  }, [children]);
  useEffect(() => { setPrevChildren(children); }, [children]);
  return (
    <div ref={containerRef} className={className}>
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) return React.cloneElement(child, { 'data-key': child.key });
        return child;
      })}
    </div>
  );
};

const CompanyDetailView = ({ company, onBack }) => {
    // Simple mock detail view for now
    return (
        <div className="p-8 text-slate-900 dark:text-white">
            <button onClick={onBack} className="mb-4 flex items-center gap-2"><ArrowLeft/> Tilbake</button>
            <h1 className="text-3xl font-bold">{company.name}</h1>
            <p>Detaljer kommer her. Data hentes nå fra: {company.manager}</p>
        </div>
    )
}

// --- APP COMPONENT ---

function App({ userProfile, initialCompanies }) {
  const [sortField, setSortField] = useState('DEFAULT');
  const [viewMode, setViewMode] = useState('GRID');
  const [isTodayMode, setIsTodayMode] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  // DATA STATE - Initialized from props (API data)
  const [companies, setCompanies] = useState(initialCompanies || []);

  // CRUD HANDLERS connected to NEON API
  const handleAddCompany = async (newCompany) => {
      const payload = { ...newCompany, groupId: userProfile.groupId }; 
      const tempId = Date.now();
      setCompanies(prev => [...prev, { ...payload, id: tempId }]);
      
      try {
          const res = await postNEON({ table: 'companies', data: payload });
          if(res && res.rows) {
              const fresh = await getNEON({ table: 'companies', where: { group_id: userProfile.groupId } });
              if(fresh.rows) setCompanies(fresh.rows);
          }
      } catch (e) {
          console.error("Failed to add", e);
          setCompanies(prev => prev.filter(c => c.id !== tempId)); 
          alert("Kunne ikke lagre selskap. Prøv igjen.");
      }
      setViewMode('GRID');
  };

  const handleUpdateCompany = async (updatedCompany) => {
      setCompanies(prev => prev.map(c => c.id === updatedCompany.id ? updatedCompany : c));
      try {
          const { id, ...fields } = updatedCompany;
          await patchNEON({ table: 'companies', data: { id, fields } });
      } catch (e) {
           console.error("Failed to update", e);
           alert("Kunne ikke oppdatere selskap.");
      }
  };

  const handleDeleteCompany = async (id) => {
      if(window.confirm("Sikker?")) {
          const prevData = [...companies];
          setCompanies(prev => prev.filter(c => c.id !== id));
          try {
              await deleteNEON({ table: 'companies', data: id });
          } catch (e) {
              console.error("Failed to delete", e);
              setCompanies(prevData); 
          }
      }
  };

  useEffect(() => {
    if (isDarkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [isDarkMode]);

  const computedData = useMemo(() => {
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 0);
    const diff = now.getTime() - startOfYear.getTime();
    const oneDay = 1000 * 60 * 60 * 24;
    const dayOfYear = Math.floor(diff / oneDay);
    const currentMonthIndex = now.getMonth(); 
    
    return companies.map(company => {
        let targetBudget = 0;
        if (isTodayMode) targetBudget = (company.budgetTotal / 365) * dayOfYear;
        else {
            const monthsToCount = Math.max(0, currentMonthIndex);
            targetBudget = (company.budgetTotal / 12) * monthsToCount;
        }
        const deviation = company.resultYtd - targetBudget;
        const deviationPercent = targetBudget !== 0 ? (deviation / targetBudget) * 100 : 0;
        
        // Map DB fields to Component props if naming differs (e.g. resultYtd vs resultYTD)
        return { 
            ...company, 
            resultYTD: company.resultYtd, // Map DB column to component prop
            calculatedBudgetYTD: targetBudget, 
            calculatedDeviationPercent: deviationPercent 
        };
    });
  }, [isTodayMode, companies]);

  const displayedData = useMemo(() => {
    if (viewMode === 'CONTROL') return computedData.filter(c => c.calculatedDeviationPercent < 0);
    return computedData;
  }, [computedData, viewMode]);

  const sortedData = useMemo(() => {
    const data = [...displayedData];
    switch (sortField) {
      case 'RESULT': return data.sort((a, b) => b.resultYTD - a.resultYTD);
      case 'DEVIATION': return data.sort((a, b) => a.calculatedDeviationPercent - b.calculatedDeviationPercent);
      case 'LIQUIDITY': return data.sort((a, b) => b.liquidity - a.liquidity);
      default: return data.sort((a, b) => a.id - b.id);
    }
  }, [displayedData, sortField]);

  const totalResult = computedData.reduce((acc, curr) => acc + curr.resultYTD, 0);
  const totalBudgetYTD = computedData.reduce((acc, curr) => acc + curr.calculatedBudgetYTD, 0);
  const totalAnnualBudget = computedData.reduce((acc, curr) => acc + curr.budgetTotal, 0);
  const totalLiquidity = computedData.reduce((acc, curr) => acc + curr.liquidity, 0);
  
  const currentDateDisplay = new Date().toLocaleDateString('no-NO', { day: 'numeric', month: 'long' });
  const lastMonthDisplay = new Date(new Date().getFullYear(), new Date().getMonth(), 0).toLocaleDateString('no-NO', { day: 'numeric', month: 'long' });

  if (selectedCompany) {
    return React.createElement(CompanyDetailView, { company: selectedCompany, onBack: () => setSelectedCompany(null) });
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-32 font-sans text-slate-900 dark:text-slate-100 transition-colors duration-300">
      <header className="bg-white/90 dark:bg-slate-800/90 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-20 shadow-sm backdrop-blur-md transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
               <div className="bg-slate-900 dark:bg-slate-700 text-white p-2 rounded-lg shadow-md"><Building2 size={20} /></div>
               <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight hidden sm:block">{userProfile.groupName || 'Konsernoversikt'}</h1>
            </div>
            {viewMode !== 'ADMIN' && (
              <div className="flex items-center bg-slate-100 dark:bg-slate-700/50 p-1 rounded-full border border-slate-200 dark:border-slate-600 absolute left-1/2 transform -translate-x-1/2 hidden md:flex">
                  <button onClick={() => setIsTodayMode(false)} className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all duration-300 ${!isTodayMode ? 'bg-white dark:bg-slate-600 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}>Siste mnd <span className="hidden lg:inline text-[10px] font-normal text-slate-400 dark:text-slate-500 ml-1">({lastMonthDisplay})</span></button>
                  <button onClick={() => setIsTodayMode(true)} className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all duration-300 ${isTodayMode ? 'bg-white dark:bg-slate-600 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}>I dag <span className="hidden lg:inline text-[10px] font-normal text-slate-400 dark:text-slate-500 ml-1">({currentDateDisplay})</span></button>
              </div>
            )}
            <div className="flex items-center space-x-4 md:space-x-6">
              <div className="hidden md:flex items-center text-slate-500 dark:text-slate-400 text-sm font-medium bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700"><UserCircle className="w-4 h-4 mr-2 text-slate-400 dark:text-slate-500" /><span className="hidden lg:inline">Velkommen: </span>{userProfile.fullName || 'Bruker'}</div>
              <button onClick={() => setIsDarkMode(!isDarkMode)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">{isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}</button>
              {userProfile.role === 'controller' && (
                  <button onClick={() => setViewMode(viewMode === 'ADMIN' ? 'GRID' : 'ADMIN')} className={`p-2 rounded-full transition-colors ${viewMode === 'ADMIN' ? 'bg-sky-100 text-sky-600 dark:bg-sky-900/50 dark:text-sky-400' : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'}`} title="Admin"><Settings className="w-5 h-5" /></button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {viewMode === 'ADMIN' ? (
           <AdminView companies={companies} onAdd={handleAddCompany} onUpdate={handleUpdateCompany} onDelete={handleDeleteCompany} />
        ) : (
            <>
              <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                <div className="flex items-center space-x-1 bg-white dark:bg-slate-800 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm w-full md:w-auto overflow-x-auto transition-colors duration-300">
                  <span className="text-xs font-bold text-slate-400 dark:text-slate-500 px-3 uppercase tracking-wider whitespace-nowrap flex items-center gap-1">Sortering</span>
                  <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-1"></div>
                  <button onClick={() => setSortField('RESULT')} className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${sortField === 'RESULT' ? 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}>Resultat</button>
                  <button onClick={() => setSortField('DEVIATION')} className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${sortField === 'DEVIATION' ? 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}>Avvik %</button>
                  <button onClick={() => setSortField('LIQUIDITY')} className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${sortField === 'LIQUIDITY' ? 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}>Likviditet</button>
                   {sortField !== 'DEFAULT' && (<button onClick={() => setSortField('DEFAULT')} className="px-2 text-slate-400 hover:text-rose-500 dark:hover:text-rose-400"><ArrowUpDown size={14} /></button>)}
                </div>
                <div className="flex bg-slate-200/60 dark:bg-slate-800 p-1 rounded-lg self-end md:self-auto transition-colors duration-300">
                  <button onClick={() => setViewMode('GRID')} className={`flex items-center px-3 py-1.5 rounded-md text-xs font-bold transition-all ${viewMode === 'GRID' ? 'bg-white dark:bg-slate-600 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}><LayoutGrid className="w-3.5 h-3.5 mr-1.5" />Kort</button>
                  <button onClick={() => setViewMode('ANALYTICS')} className={`flex items-center px-3 py-1.5 rounded-md text-xs font-bold transition-all ${viewMode === 'ANALYTICS' ? 'bg-white dark:bg-slate-600 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}><BarChart3 className="w-3.5 h-3.5 mr-1.5" />Analyse</button>
                  <button onClick={() => setViewMode('CONTROL')} className={`flex items-center px-3 py-1.5 rounded-md text-xs font-bold transition-all ${viewMode === 'CONTROL' ? 'bg-white dark:bg-slate-600 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}><ShieldAlert className="w-3.5 h-3.5 mr-1.5" />Kontroll</button>
                </div>
              </div>
              {viewMode === 'ANALYTICS' ? (
                <AnalyticsView data={sortedData} />
              ) : (
                 <>
                  {viewMode === 'CONTROL' && displayedData.length === 0 && (
                      <div className="text-center py-20 bg-white dark:bg-slate-800 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700"><div className="bg-emerald-100 dark:bg-emerald-900/30 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4"><ShieldAlert className="text-emerald-600 dark:text-emerald-400" size={24} /></div><h3 className="text-lg font-bold text-slate-900 dark:text-white">Ingen selskaper krever kontroll</h3></div>
                  )}
                  <AnimatedGrid className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6">
                      {sortedData.map((company) => (<MetricCard key={company.id} data={company} onSelect={setSelectedCompany} />))}
                  </AnimatedGrid>
                </>
              )}
            </>
        )}
      </main>
      {viewMode !== 'ADMIN' && (
        <div className="fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-slate-800/95 backdrop-blur border-t border-slate-200 dark:border-slate-700 shadow-[0_-4px_20px_-5px_rgba(0,0,0,0.1)] z-20 transition-colors duration-300">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center md:text-left">
              <div className="flex flex-col md:border-r border-slate-100 dark:border-slate-700 px-2 relative group cursor-default"><span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider font-bold mb-1">Resultat YTD</span><span className="text-xl font-bold text-slate-900 dark:text-white">{formatCurrency(totalResult)}</span></div>
               <div className="flex flex-col md:border-r border-slate-100 dark:border-slate-700 px-2 relative group cursor-default"><span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider font-bold mb-1">Budsjett YTD</span><div className="flex items-baseline gap-2 md:block"><span className="text-xl font-bold text-slate-500 dark:text-slate-400">{formatCurrency(totalBudgetYTD)}</span></div></div>
              <div className="flex flex-col md:border-r border-slate-100 dark:border-slate-700 px-2 relative group cursor-default"><span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider font-bold mb-1">Årsbudsjett Total</span><span className="text-xl font-bold text-slate-900 dark:text-white">{formatCurrency(totalAnnualBudget)}</span></div>
              <div className="flex flex-col px-2 relative group cursor-default"><span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider font-bold mb-1">Total Likviditet</span><span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(totalLiquidity)}</span></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// 3. INIT FUNCTION (Start App)
// ==========================================

window.initKonsernKontroll = async (userId) => {
  if(!userId) {
      console.error("No User ID provided to initKonsernKontroll");
      return;
  }

  const rootEl = document.getElementById('root');
  if(!rootEl) return;
  const root = ReactDOM.createRoot(rootEl);
  
  root.render(React.createElement('div', { className: 'flex h-screen items-center justify-center text-slate-500' }, 'Laster Konserndata...'));

  try {
      // Fetch User
      const userRes = await getNEON({ table: 'users', where: { auth_id: userId } });
      const user = userRes.rows[0];

      if (!user) {
          root.render(React.createElement('div', { className: 'p-10 text-center text-rose-600' }, 'Bruker ikke funnet i systemet.'));
          return;
      }

      // Fetch Group
      let groupName = "Mitt Konsern";
      if (user.group_id) {
          const groupRes = await getNEON({ table: 'groups', where: { id: user.group_id } });
          if(groupRes.rows[0]) groupName = groupRes.rows[0].name;
      }

      // Fetch Companies
      let companyWhere = {};
      if (user.role === 'leader' && user.company_id) {
          companyWhere = { id: user.company_id };
      } else {
          companyWhere = { group_id: user.group_id };
      }
      
      const compRes = await getNEON({ table: 'companies', where: companyWhere });

      const userProfile = {
          fullName: user.full_name,
          role: user.role,
          groupId: user.group_id,
          groupName: groupName
      };

      root.render(React.createElement(App, { userProfile, initialCompanies: compRes.rows || [] }));

  } catch (e) {
      console.error("Init Error", e);
      root.render(React.createElement('div', { className: 'p-10 text-center' }, 'Feil ved lasting av data.'));
  }
};