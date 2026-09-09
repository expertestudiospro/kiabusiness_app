'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { BookMarked, Calendar, Check, Euro, FileText, Loader2, Plus, Search, X } from 'lucide-react';

type Company = {
  id: string;
  name: string;
  taxId: string | null;
};

interface Client {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  activeCompanyId: string | null;
  companies: Company[];
}

interface QuoteTemplate {
  id: string;
  name: string;
  title: string;
  description: string;
  amount_eur: number | null;
  expires_in_days: number;
  docs_checklist: string[];
}

type QuoteServiceOption = {
  serviceSlug: string;
  name: string;
  category: string;
  unitAmountEur: number;
  minQuantity: number;
  maxQuantity: number;
};

type QuoteLine = {
  serviceSlug: string;
  quantity: number;
};

interface Props {
  onClose: () => void;
  onCreated: () => void;
}

const DOCS_SUGERIDOS = [
  'DNI/NIE vigente',
  'Pasaporte vigente',
  'Contrato de trabajo',
  'Nóminas últimos 3 meses',
  'Declaración de la renta',
  'Certificado de empadronamiento',
  'Vida laboral',
  'Extracto bancario',
];

function money(value: number) {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(value);
}

export function NuevaCotizacionModal({ onClose, onCreated }: Props) {
  const [query, setQuery] = useState('');
  const [clients, setClients] = useState<Client[]>([]);
  const [loadingClients, setLoadingClients] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [templates, setTemplates] = useState<QuoteTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [deletingTemplate, setDeletingTemplate] = useState<string | null>(null);
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [savingTemplate, setSavingTemplate] = useState(false);

  const [services, setServices] = useState<QuoteServiceOption[]>([]);
  const [loadingServices, setLoadingServices] = useState(false);
  const [pricingMode, setPricingMode] = useState<'catalog' | 'manual'>('catalog');
  const [lines, setLines] = useState<QuoteLine[]>([]);
  const [serviceToAdd, setServiceToAdd] = useState('');

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [expiresInDays, setExpiresInDays] = useState('14');
  const [docs, setDocs] = useState<string[]>([]);
  const [customDoc, setCustomDoc] = useState('');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchClients = useCallback(async (q: string) => {
    setLoadingClients(true);
    try {
      const res = await fetch(`/api/admin/clients-quick?q=${encodeURIComponent(q)}`);
      if (res.ok) {
        const data = await res.json();
        setClients(data.clients ?? []);
      }
    } finally {
      setLoadingClients(false);
    }
  }, []);

  const fetchTemplates = useCallback(async () => {
    setLoadingTemplates(true);
    try {
      const res = await fetch('/api/admin/quote-templates');
      if (res.ok) {
        const data = await res.json();
        setTemplates(data.templates ?? []);
      }
    } finally {
      setLoadingTemplates(false);
    }
  }, []);

  const fetchServices = useCallback(async () => {
    setLoadingServices(true);
    try {
      const res = await fetch('/api/admin/quote-services');
      if (res.ok) {
        const data = await res.json();
        setServices(data.services ?? []);
      }
    } finally {
      setLoadingServices(false);
    }
  }, []);

  useEffect(() => {
    void fetchClients('');
    void fetchTemplates();
    void fetchServices();
  }, [fetchClients, fetchTemplates, fetchServices]);

  useEffect(() => {
    const timer = setTimeout(() => void fetchClients(query), 200);
    return () => clearTimeout(timer);
  }, [query, fetchClients]);

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (
        dropdownRef.current && !dropdownRef.current.contains(event.target as Node) &&
        searchRef.current && !searchRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selectedCompany = selectedClient?.companies.find((company) => company.id === selectedCompanyId) ?? null;
  const resolvedLines = lines.map((line) => ({
    ...line,
    service: services.find((service) => service.serviceSlug === line.serviceSlug) ?? null,
  }));
  const catalogSubtotal = resolvedLines.reduce(
    (sum, line) => sum + (line.service?.unitAmountEur ?? 0) * line.quantity,
    0,
  );

  const handleSelectClient = (client: Client) => {
    setSelectedClient(client);
    setQuery(client.name ?? client.email);
    setShowDropdown(false);
    const preferred = client.companies.find((company) => company.id === client.activeCompanyId)
      ?? (client.companies.length === 1 ? client.companies[0] : null);
    setSelectedCompanyId(preferred?.id ?? '');
  };

  const handleClearClient = () => {
    setSelectedClient(null);
    setSelectedCompanyId('');
    setQuery('');
    void fetchClients('');
    setTimeout(() => searchRef.current?.focus(), 50);
  };

  const toggleDoc = (doc: string) => {
    setDocs((prev) => prev.includes(doc) ? prev.filter((item) => item !== doc) : [...prev, doc]);
  };

  const addCustomDoc = () => {
    const value = customDoc.trim();
    if (value && !docs.includes(value)) setDocs((prev) => [...prev, value]);
    setCustomDoc('');
  };

  const applyTemplate = (template: QuoteTemplate) => {
    setPricingMode('manual');
    setLines([]);
    setTitle(template.title);
    setDescription(template.description);
    if (template.amount_eur != null) setAmount(String(template.amount_eur));
    setExpiresInDays(String(template.expires_in_days));
    setDocs(template.docs_checklist);
  };

  const deleteTemplate = async (id: string) => {
    setDeletingTemplate(id);
    try {
      await fetch(`/api/admin/quote-templates/${id}`, { method: 'DELETE' });
      setTemplates((prev) => prev.filter((template) => template.id !== id));
    } finally {
      setDeletingTemplate(null);
    }
  };

  const saveAsTemplate = async () => {
    if (!templateName.trim() || !title.trim() || !description.trim()) return;
    setSavingTemplate(true);
    try {
      const res = await fetch('/api/admin/quote-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: templateName.trim(),
          title: title.trim(),
          description: description.trim(),
          amount_eur: pricingMode === 'catalog' ? catalogSubtotal : (amount ? parseFloat(amount) : null),
          expires_in_days: parseInt(expiresInDays, 10),
          docs_checklist: docs,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setTemplates((prev) => [data.template, ...prev]);
        setTemplateName('');
        setShowSaveTemplate(false);
      }
    } finally {
      setSavingTemplate(false);
    }
  };

  const addServiceLine = () => {
    const service = services.find((item) => item.serviceSlug === serviceToAdd);
    if (!service || lines.some((line) => line.serviceSlug === service.serviceSlug)) return;
    setLines((prev) => [...prev, { serviceSlug: service.serviceSlug, quantity: service.minQuantity }]);
    setServiceToAdd('');
    if (!title.trim()) setTitle(service.name);
  };

  const updateLineQuantity = (serviceSlug: string, quantity: number) => {
    setLines((prev) => prev.map((line) => line.serviceSlug === serviceSlug ? { ...line, quantity } : line));
  };

  const handleSubmit = async () => {
    if (!selectedClient) { setError('Selecciona un cliente.'); return; }
    if (!selectedCompanyId) { setError('Selecciona la entidad fiscal que contrata el servicio.'); return; }
    if (!title.trim()) { setError('El título es obligatorio.'); return; }
    if (!description.trim()) { setError('La descripción es obligatoria.'); return; }
    if (pricingMode === 'catalog' && lines.length === 0) { setError('Añade al menos un servicio del catálogo.'); return; }
    if (pricingMode === 'manual' && (!amount || parseFloat(amount) <= 0)) { setError('El importe debe ser mayor que 0.'); return; }

    setSaving(true);
    setError(null);
    try {
      const body = pricingMode === 'catalog'
        ? {
            clientEmail: selectedClient.email,
            companyId: selectedCompanyId,
            title: title.trim(),
            description: description.trim(),
            items: lines,
            amountEur: catalogSubtotal,
            expiresInDays: parseInt(expiresInDays, 10),
            docsChecklist: docs,
          }
        : {
            clientEmail: selectedClient.email,
            companyId: selectedCompanyId,
            title: title.trim(),
            description: description.trim(),
            amountEur: parseFloat(amount),
            expiresInDays: parseInt(expiresInDays, 10),
            docsChecklist: docs,
          };

      const res = await fetch('/api/admin/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Error al crear el presupuesto.');
        return;
      }
      onCreated();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50 sm:items-center" onClick={onClose}>
      <div className="flex max-h-[92dvh] w-full max-w-2xl flex-col rounded-t-3xl bg-white shadow-2xl sm:rounded-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex shrink-0 items-center justify-between border-b border-[#f0e9d8] px-5 py-4">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-[#c88b25]" />
            <p className="font-semibold text-[#07111d]">Nueva cotización</p>
          </div>
          <button type="button" onClick={onClose} title="Cerrar" className="rounded-lg p-1.5 text-[#29384a] hover:bg-[#f0e9d8]">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          {(templates.length > 0 || loadingTemplates) && (
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#07111d]">Plantillas</label>
              {loadingTemplates ? (
                <div className="flex items-center gap-2 text-xs text-[#9ca3af]"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Cargando…</div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {templates.map((template) => (
                    <div key={template.id} className="flex items-center rounded-full border border-[#d8cbb5] bg-[#f8f4eb] text-xs">
                      <button type="button" onClick={() => applyTemplate(template)} className="rounded-l-full py-1 pl-3 pr-2 font-semibold text-[#29384a] hover:text-[#c88b25]">{template.name}</button>
                      <button type="button" onClick={() => void deleteTemplate(template.id)} disabled={deletingTemplate === template.id} title={`Eliminar ${template.name}`} className="rounded-r-full py-1 pl-1 pr-2.5 text-[#d8cbb5] hover:text-red-500 disabled:opacity-40">
                        {deletingTemplate === template.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#07111d]">Cliente *</label>
            {selectedClient ? (
              <div className="flex items-center gap-3 rounded-xl border border-[#D4A017] bg-[#D4A017]/5 px-4 py-2.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#D4A017]/15 text-xs font-bold text-[#c88b25]">{(selectedClient.name ?? selectedClient.email)[0].toUpperCase()}</div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-[#07111d]">{selectedClient.name ?? selectedClient.email}</p>
                  <p className="truncate text-xs text-[#29384a]/60">{selectedClient.email}</p>
                </div>
                <button type="button" onClick={handleClearClient} title="Quitar cliente" className="shrink-0 text-[#9ca3af] hover:text-[#29384a]"><X className="h-4 w-4" /></button>
              </div>
            ) : (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9ca3af]" />
                <input ref={searchRef} type="text" value={query} onChange={(event) => { setQuery(event.target.value); setShowDropdown(true); }} onFocus={() => setShowDropdown(true)} placeholder="Buscar por nombre, email, empresa o CIF…" className="w-full rounded-xl border border-[#d8cbb5] py-2.5 pl-9 pr-3 text-sm outline-none focus:border-[#c88b25]" />
                {showDropdown && (
                  <div ref={dropdownRef} className="absolute left-0 right-0 top-full z-50 mt-1 max-h-56 overflow-y-auto rounded-xl border border-[#d8cbb5] bg-white shadow-lg">
                    {loadingClients ? <div className="flex justify-center py-6"><Loader2 className="h-4 w-4 animate-spin" /></div> : clients.length === 0 ? <p className="px-4 py-3 text-sm text-[#9ca3af]">Sin resultados</p> : clients.map((client) => (
                      <button key={client.id} type="button" onMouseDown={() => handleSelectClient(client)} className="w-full px-4 py-2.5 text-left hover:bg-[#f8f4eb]">
                        <p className="truncate text-sm font-semibold text-[#07111d]">{client.name ?? client.email}</p>
                        <p className="truncate text-xs text-[#29384a]/60">{client.email}{client.companies.length ? ` · ${client.companies.map((company) => company.name).join(', ')}` : ''}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {selectedClient && (
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#07111d]">Entidad contratante *</label>
              {selectedClient.companies.length ? (
                <select value={selectedCompanyId} onChange={(event) => setSelectedCompanyId(event.target.value)} className="w-full rounded-xl border border-[#d8cbb5] px-3 py-2.5 text-sm outline-none focus:border-[#c88b25]">
                  <option value="">Selecciona entidad…</option>
                  {selectedClient.companies.map((company) => <option key={company.id} value={company.id}>{company.name}{company.taxId ? ` · ${company.taxId}` : ''}</option>)}
                </select>
              ) : (
                <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">Este cliente todavía no tiene una entidad fiscal vinculada.</p>
              )}
              {selectedCompany && <p className="mt-1 text-xs text-[#9ca3af]">El presupuesto, pago, pedido y expediente quedarán vinculados a {selectedCompany.name}.</p>}
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#07111d]">Título / Servicio *</label>
              <input type="text" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Ej: Migración laboral + formación Holded" className="w-full rounded-xl border border-[#d8cbb5] px-4 py-2.5 text-sm outline-none focus:border-[#c88b25]" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#07111d]">Vence en</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9ca3af]" />
                <select value={expiresInDays} onChange={(event) => setExpiresInDays(event.target.value)} className="w-full rounded-xl border border-[#d8cbb5] py-2.5 pl-9 pr-3 text-sm outline-none focus:border-[#c88b25]">
                  {[7, 14, 21, 30, 45, 60, 90].map((days) => <option key={days} value={days}>{days} días</option>)}
                </select>
              </div>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#07111d]">Descripción *</label>
            <textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Detalla el alcance y próximos pasos…" rows={3} className="w-full resize-none rounded-xl border border-[#d8cbb5] px-4 py-2.5 text-sm outline-none focus:border-[#c88b25]" />
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between gap-3">
              <label className="text-xs font-semibold uppercase tracking-wide text-[#07111d]">Precio *</label>
              <div className="flex rounded-lg border border-[#d8cbb5] p-0.5 text-xs">
                <button type="button" onClick={() => setPricingMode('catalog')} className={`rounded-md px-3 py-1.5 ${pricingMode === 'catalog' ? 'bg-[#07111d] text-white' : 'text-[#29384a]'}`}>Catálogo</button>
                <button type="button" onClick={() => setPricingMode('manual')} className={`rounded-md px-3 py-1.5 ${pricingMode === 'manual' ? 'bg-[#07111d] text-white' : 'text-[#29384a]'}`}>Importe cerrado</button>
              </div>
            </div>

            {pricingMode === 'catalog' ? (
              <div className="space-y-3 rounded-xl border border-[#d8cbb5] p-3">
                <div className="flex gap-2">
                  <select value={serviceToAdd} onChange={(event) => setServiceToAdd(event.target.value)} disabled={loadingServices} className="min-w-0 flex-1 rounded-lg border border-[#d8cbb5] px-3 py-2 text-sm outline-none focus:border-[#c88b25]">
                    <option value="">{loadingServices ? 'Cargando servicios…' : 'Añadir servicio del catálogo…'}</option>
                    {services.filter((service) => !lines.some((line) => line.serviceSlug === service.serviceSlug)).map((service) => <option key={service.serviceSlug} value={service.serviceSlug}>{service.name} · {money(service.unitAmountEur)}</option>)}
                  </select>
                  <button type="button" onClick={addServiceLine} disabled={!serviceToAdd} className="flex items-center gap-1 rounded-lg border border-[#d8cbb5] px-3 py-2 text-sm font-semibold disabled:opacity-40"><Plus className="h-4 w-4" /> Añadir</button>
                </div>

                {resolvedLines.length === 0 ? <p className="text-xs text-[#9ca3af]">Los precios y límites se validan de nuevo en servidor antes de crear Stripe Checkout.</p> : (
                  <div className="space-y-2">
                    {resolvedLines.map((line) => {
                      const service = line.service;
                      if (!service) return null;
                      return (
                        <div key={line.serviceSlug} className="flex items-center gap-3 rounded-lg bg-[#f8f4eb] px-3 py-2">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-[#07111d]">{service.name}</p>
                            <p className="text-xs text-[#29384a]/60">{money(service.unitAmountEur)} por unidad</p>
                          </div>
                          {service.maxQuantity > 1 ? (
                            <input type="number" min={service.minQuantity} max={service.maxQuantity} step={1} value={line.quantity} onChange={(event) => updateLineQuantity(line.serviceSlug, Number(event.target.value))} className="w-20 rounded-lg border border-[#d8cbb5] px-2 py-1.5 text-sm" aria-label={`Cantidad de ${service.name}`} />
                          ) : <span className="text-sm text-[#29384a]">× 1</span>}
                          <span className="w-24 text-right text-sm font-bold text-[#07111d]">{money(service.unitAmountEur * line.quantity)}</span>
                          <button type="button" onClick={() => setLines((prev) => prev.filter((item) => item.serviceSlug !== line.serviceSlug))} title={`Quitar ${service.name}`} className="text-[#9ca3af] hover:text-red-500"><X className="h-4 w-4" /></button>
                        </div>
                      );
                    })}
                    <div className="flex items-center justify-between border-t border-[#d8cbb5] pt-2 text-sm">
                      <span className="font-semibold text-[#29384a]">Base antes de impuestos</span>
                      <span className="text-base font-bold text-[#07111d]">{money(catalogSubtotal)}</span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="relative">
                <Euro className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9ca3af]" />
                <input type="number" min="1" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="450.00" className="w-full rounded-xl border border-[#d8cbb5] py-2.5 pl-9 pr-3 text-sm outline-none focus:border-[#c88b25]" />
              </div>
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#07111d]">Documentos a aportar <span className="font-normal text-[#9ca3af]">(opcional)</span></label>
            <div className="mb-2 flex flex-wrap gap-2">
              {DOCS_SUGERIDOS.map((doc) => <button key={doc} type="button" onClick={() => toggleDoc(doc)} className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${docs.includes(doc) ? 'border-[#D4A017] bg-[#D4A017]/10 text-[#c88b25]' : 'border-[#d8cbb5] text-[#29384a]'}`}>{docs.includes(doc) && <Check className="h-3 w-3" />}{doc}</button>)}
            </div>
            <div className="flex gap-2">
              <input type="text" value={customDoc} onChange={(event) => setCustomDoc(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); addCustomDoc(); } }} placeholder="Añadir otro documento…" className="flex-1 rounded-xl border border-[#d8cbb5] px-3 py-2 text-sm outline-none focus:border-[#c88b25]" />
              <button type="button" onClick={addCustomDoc} disabled={!customDoc.trim()} className="flex items-center gap-1 rounded-xl border border-[#d8cbb5] px-3 py-2 text-sm disabled:opacity-40"><Plus className="h-3.5 w-3.5" /> Añadir</button>
            </div>
          </div>

          {(title.trim() || description.trim()) && (
            <div>
              {!showSaveTemplate ? <button type="button" onClick={() => setShowSaveTemplate(true)} className="flex items-center gap-1.5 text-xs text-[#9ca3af] hover:text-[#c88b25]"><BookMarked className="h-3.5 w-3.5" /> Guardar como plantilla</button> : (
                <div className="flex items-center gap-2">
                  <BookMarked className="h-3.5 w-3.5 shrink-0 text-[#c88b25]" />
                  <input type="text" value={templateName} onChange={(event) => setTemplateName(event.target.value)} placeholder="Nombre de la plantilla…" className="flex-1 rounded-lg border border-[#d8cbb5] px-3 py-1.5 text-xs" />
                  <button type="button" onClick={() => void saveAsTemplate()} disabled={!templateName.trim() || savingTemplate} className="rounded-lg bg-[#07111d] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40">{savingTemplate ? 'Guardando…' : 'Guardar'}</button>
                  <button type="button" onClick={() => { setShowSaveTemplate(false); setTemplateName(''); }} className="rounded-lg border border-[#d8cbb5] px-3 py-1.5 text-xs">Cancelar</button>
                </div>
              )}
            </div>
          )}

          {error && <p className="rounded-xl bg-red-50 px-4 py-2 text-sm text-red-600">{error}</p>}
        </div>

        <div className="flex shrink-0 items-center justify-between border-t border-[#f0e9d8] px-5 py-4">
          <p className="text-xs text-[#9ca3af]">El cliente recibirá un enlace de pago vinculado a la entidad seleccionada.</p>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="rounded-xl border border-[#d8cbb5] px-4 py-2 text-sm font-semibold text-[#29384a]">Cancelar</button>
            <button type="button" onClick={() => void handleSubmit()} disabled={saving} className="flex items-center gap-2 rounded-xl bg-[#07111d] px-5 py-2 text-sm font-bold text-white disabled:opacity-50">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
              {saving ? 'Creando…' : 'Crear y enviar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
