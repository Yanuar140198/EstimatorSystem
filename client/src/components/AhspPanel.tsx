import { useEffect, useMemo, useState } from 'react';
import api from '../lib/api';
import { AhspLine, Project, WbsItem } from '../App';

interface AhspPanelProps {
  project: Project | null;
  wbsItem: WbsItem | null;
  onRefresh: () => void;
}

interface AhspPayload {
  overheadPct: number;
  profitPct: number;
  lines: AhspLine[];
}

interface MasterItem {
  id: number;
  code: string;
  name: string;
  unit: string;
  price: number;
}

export default function AhspPanel({ project, wbsItem, onRefresh }: AhspPanelProps) {
  const [lines, setLines] = useState<AhspLine[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [copyTargets, setCopyTargets] = useState('');
  const [materials, setMaterials] = useState<MasterItem[]>([]);
  const [labor, setLabor] = useState<MasterItem[]>([]);
  const [equipment, setEquipment] = useState<MasterItem[]>([]);
  const [wbsDraft, setWbsDraft] = useState({ name: '', unit: '', quantity: 0, remarks: '' });

  const totals = useMemo(() => {
    const directCost = lines.reduce((sum, line) => sum + line.coefficient * line.unitPrice, 0);
    const markupRate = ((project?.ohPct ?? 0) + (project?.profitPct ?? 0)) / 100;
    const markup = directCost * markupRate;
    const unitRate = directCost + markup;
    return { directCost, markup, unitRate };
  }, [lines, project?.ohPct, project?.profitPct]);

  useEffect(() => {
    if (!wbsItem) return;
    setWbsDraft({
      name: wbsItem.name,
      unit: wbsItem.unit,
      quantity: wbsItem.quantity,
      remarks: wbsItem.remarks ?? ''
    });
    setLoading(true);
    api
      .get(`/wbs/${wbsItem.id}/ahsp`)
      .then((response) => {
        setLines(response.data.lines ?? []);
      })
      .finally(() => setLoading(false));
  }, [wbsItem]);

  useEffect(() => {
    api.get<MasterItem[]>('/masters/materials').then((response) => setMaterials(response.data)).catch(() => setMaterials([]));
    api.get<MasterItem[]>('/masters/labor').then((response) => setLabor(response.data)).catch(() => setLabor([]));
    api.get<MasterItem[]>('/masters/equipment').then((response) => setEquipment(response.data)).catch(() => setEquipment([]));
  }, []);

  const handleSave = async () => {
    if (!project || !wbsItem) return;
    setLoading(true);
    try {
      const payload: AhspPayload = {
        overheadPct: project.ohPct,
        profitPct: project.profitPct,
        lines
      };
      await api.post(`/wbs/${wbsItem.id}/ahsp`, payload);
      setMessage('AHSP tersimpan.');
      onRefresh();
    } catch {
      setMessage('Gagal menyimpan AHSP.');
    } finally {
      setLoading(false);
    }
  };

  const handleWbsSave = async () => {
    if (!wbsItem) return;
    setLoading(true);
    try {
      await api.put(`/wbs/${wbsItem.id}`, {
        wbsCode: wbsItem.wbsCode,
        level: wbsItem.level,
        parentId: wbsItem.parentId,
        name: wbsDraft.name,
        unit: wbsDraft.unit,
        quantity: wbsDraft.quantity,
        remarks: wbsDraft.remarks,
        sortOrder: wbsItem.sortOrder
      });
      setMessage('WBS diperbarui.');
      onRefresh();
    } catch {
      setMessage('Gagal memperbarui WBS.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!project || !wbsItem) return;
    const targetIds = copyTargets
      .split(',')
      .map((value) => Number(value.trim()))
      .filter((value) => Number.isFinite(value) && value > 0);
    if (targetIds.length === 0) {
      setMessage('Masukkan ID WBS tujuan, contoh: 12, 15, 18.');
      return;
    }
    setLoading(true);
    try {
      await api.post(`/wbs/${wbsItem.id}/ahsp/copy`, {
        targetWbsIds: targetIds,
        overheadPct: project.ohPct,
        profitPct: project.profitPct
      });
      setMessage('AHSP berhasil disalin.');
      setCopyTargets('');
      onRefresh();
    } catch {
      setMessage('Gagal menyalin AHSP.');
    } finally {
      setLoading(false);
    }
  };

  const updateLine = (index: number, changes: Partial<AhspLine>) => {
    setLines((prev) => prev.map((line, idx) => (idx === index ? { ...line, ...changes } : line)));
  };

  const handleMasterSelect = (index: number, code: string) => {
    const line = lines[index];
    const masterList = line.type === 'material' ? materials : line.type === 'labor' ? labor : equipment;
    const selected = masterList.find((item) => item.code === code);
    if (!selected) return;
    updateLine(index, {
      refCode: selected.code,
      name: selected.name,
      unit: selected.unit,
      unitPrice: selected.price
    });
  };

  const addLine = (type: AhspLine['type']) => {
    setLines((prev) => [
      ...prev,
      {
        type,
        refCode: null,
        name: '',
        unit: type === 'labor' ? 'OH' : type === 'equipment' ? 'hour' : 'unit',
        coefficient: 0,
        unitPrice: 0
      }
    ]);
  };

  const removeLine = (index: number) => {
    setLines((prev) => prev.filter((_, idx) => idx !== index));
  };

  if (!wbsItem) {
    return (
      <div className="text-sm text-slate-500">
        Pilih item WBS untuk melihat AHSP dan rincian biaya.
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-4">
      <div>
        <h3 className="text-lg font-semibold">AHSP Detail</h3>
        <p className="text-sm text-slate-500">{wbsItem.wbsCode} · {wbsItem.name}</p>
      </div>
      {message && <div className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">{message}</div>}
      <div className="space-y-2 rounded-lg border border-slate-200 bg-white p-3 text-sm">
        <div className="text-xs font-semibold text-slate-500">WBS Item</div>
        <input
          value={wbsDraft.name}
          onChange={(event) => setWbsDraft((prev) => ({ ...prev, name: event.target.value }))}
          className="w-full rounded-md border border-slate-200 px-2 py-1"
        />
        <div className="grid grid-cols-2 gap-2">
          <input
            value={wbsDraft.unit}
            onChange={(event) => setWbsDraft((prev) => ({ ...prev, unit: event.target.value }))}
            className="rounded-md border border-slate-200 px-2 py-1"
            placeholder="Unit"
          />
          <input
            value={wbsDraft.quantity}
            onChange={(event) => setWbsDraft((prev) => ({ ...prev, quantity: Number(event.target.value) }))}
            type="number"
            className="rounded-md border border-slate-200 px-2 py-1"
            placeholder="Quantity"
          />
        </div>
        <textarea
          value={wbsDraft.remarks}
          onChange={(event) => setWbsDraft((prev) => ({ ...prev, remarks: event.target.value }))}
          className="w-full rounded-md border border-slate-200 px-2 py-1"
          placeholder="Remarks"
          rows={2}
        />
        <button
          type="button"
          onClick={handleWbsSave}
          className="rounded-md border border-slate-200 px-2 py-1 text-xs"
        >
          Simpan WBS
        </button>
      </div>
      <div className="flex-1 space-y-3 overflow-auto">
        {lines.map((line, index) => (
          <div key={`${line.type}-${index}`} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold uppercase text-slate-500">{line.type}</div>
              <button
                type="button"
                onClick={() => removeLine(index)}
                className="text-xs text-rose-600"
              >
                Remove
              </button>
            </div>
            <div className="mt-2 grid gap-2 text-sm">
              <select
                value={line.refCode ?? ''}
                onChange={(event) => handleMasterSelect(index, event.target.value)}
                className="w-full rounded-md border border-slate-200 px-2 py-1 text-sm"
              >
                <option value="">Pilih master {line.type}</option>
                {(line.type === 'material' ? materials : line.type === 'labor' ? labor : equipment).map((item) => (
                  <option key={item.id} value={item.code}>
                    {item.code} - {item.name}
                  </option>
                ))}
              </select>
              <input
                value={line.name}
                onChange={(event) => updateLine(index, { name: event.target.value })}
                placeholder="Nama item"
                className="w-full rounded-md border border-slate-200 px-2 py-1"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  value={line.coefficient}
                  onChange={(event) => updateLine(index, { coefficient: Number(event.target.value) })}
                  type="number"
                  className="rounded-md border border-slate-200 px-2 py-1"
                  placeholder="Koefisien"
                />
                <input
                  value={line.unitPrice}
                  onChange={(event) => updateLine(index, { unitPrice: Number(event.target.value) })}
                  type="number"
                  className="rounded-md border border-slate-200 px-2 py-1"
                  placeholder="Harga satuan"
                />
              </div>
              <div className="text-xs text-slate-500">Subtotal: Rp {(line.coefficient * line.unitPrice).toLocaleString('id-ID')}</div>
            </div>
          </div>
        ))}
        {lines.length === 0 && (
          <div className="rounded-lg border border-dashed border-slate-200 p-4 text-sm text-slate-500">
            Belum ada komponen AHSP. Tambahkan material, tenaga, atau alat.
          </div>
        )}
      </div>
      <div className="space-y-2 rounded-lg border border-slate-200 bg-white p-4 text-sm">
        <div className="flex justify-between"><span>Direct Cost</span><span>Rp {totals.directCost.toLocaleString('id-ID')}</span></div>
        <div className="flex justify-between"><span>Markup (OH + Profit)</span><span>Rp {totals.markup.toLocaleString('id-ID')}</span></div>
        <div className="flex justify-between font-semibold"><span>Unit Rate</span><span>Rp {totals.unitRate.toLocaleString('id-ID')}</span></div>
        <div className="flex justify-between"><span>Line Total</span><span>Rp {(totals.unitRate * wbsItem.quantity).toLocaleString('id-ID')}</span></div>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => addLine('material')}
          className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-xs"
        >
          + Material
        </button>
        <button
          type="button"
          onClick={() => addLine('labor')}
          className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-xs"
        >
          + Labor
        </button>
        <button
          type="button"
          onClick={() => addLine('equipment')}
          className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-xs"
        >
          + Equipment
        </button>
      </div>
      <div className="rounded-lg border border-dashed border-slate-200 p-3 text-xs text-slate-500">
        <div className="mb-2 font-semibold text-slate-600">Copy & Apply AHSP</div>
        <input
          value={copyTargets}
          onChange={(event) => setCopyTargets(event.target.value)}
          placeholder="Masukkan ID WBS tujuan, pisahkan dengan koma"
          className="mb-2 w-full rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-700"
        />
        <button
          type="button"
          onClick={handleCopy}
          className="w-full rounded-md border border-slate-200 px-2 py-1 text-xs"
        >
          Apply to WBS IDs
        </button>
      </div>
      <button
        type="button"
        onClick={handleSave}
        disabled={loading}
        className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
      >
        {loading ? 'Menyimpan...' : 'Simpan AHSP'}
      </button>
    </div>
  );
}
