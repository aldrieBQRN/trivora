import React, { useState } from 'react';
import { Head, useForm } from '@inertiajs/react';
import TrivoraLayout from '@/Layouts/TrivoraLayout';
import {
    ClipboardCheck, Upload, Bike, CheckCircle2,
    ChevronRight, FileText, ShieldCheck,
    AlertCircle, Eye, CreditCard, Wallet,
    Smartphone, ArrowLeft, Info, Printer
} from 'lucide-react';

export default function Apply() {
    const [step, setStep] = useState(1);
    const [paymentMethod, setPaymentMethod] = useState(null);

    // Official Nasugbu LGU Document List (from your image)
    const nasugbuRequirements = [
        { id: 'police', label: 'Police Clearance / LGU OR', price: 150 },
        { id: 'health', label: 'Health Certificate (Driver)', price: 55 },
        { id: 'cedula', label: 'Cedula (Municipal Treasurer)', price: 40 },
        { id: 'orcr', label: 'Xerox OR/CR (LTO)' },
        { id: 'license', label: "Driver's License (Back-to-back)" },
        { id: 'brgy', label: 'Barangay Clearance (Original)' },
        { id: 'toda', label: 'TODA / NAFTODA Clearance' },
        { id: 'tariff', label: 'Existing Tariff Fee List' },
    ];

    const inspectionChecklist = [
        'Headlights / Tail lights',
        'Interior Lights (Sidecar)',
        'Horn (Functional)',
        'Side Mirrors (Pair)',
        'Battery / Electrical Status',
        'LTO / GSO Plate Attachment'
    ];

    const { data, setData, post, processing } = useForm({
        operator_name: '',
        body_number: '',
        chassis_number: '',
        engine_number: '',
        toda: 'A',
        payment_status: 'pending'
    });

    const nextStep = () => setStep(prev => prev + 1);
    const prevStep = () => setStep(prev => prev - 1);

    const totalFee = nasugbuRequirements.reduce((acc, curr) => acc + (curr.price || 0), 0) + 250; // +250 Application Fee

    return (
        <TrivoraLayout title="New Registration" role="TMO Personnel">
            <Head title="MTOP Application Wizard" />

            <div className="max-w-5xl mx-auto pb-12">

                {/* TACTICAL STEPPER */}
                <div className="flex items-center justify-between mb-12 relative px-4">
                    <div className="absolute top-7 left-0 w-full h-px bg-stone-200 z-0"></div>
                    <StepIcon active={step >= 1} current={step === 1} icon={Eye} label="Inspect" />
                    <StepIcon active={step >= 2} current={step === 2} icon={ClipboardCheck} label="Docs" />
                    <StepIcon active={step >= 3} current={step === 3} icon={CreditCard} label="Pay" />
                    <StepIcon active={step >= 4} current={step === 4} icon={Upload} label="Vault" />
                    <StepIcon active={step >= 5} current={step === 5} icon={ShieldCheck} label="Submit" />
                </div>

                {/* PHASE 1: PHYSICAL INSPECTION (TMO) */}
                {step === 1 && (
                    <div className="bg-white rounded-[2rem] border border-stone-200 p-10 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-300">
                        <header className="mb-8 border-b border-stone-100 pb-6 flex justify-between items-end">
                            <div>
                                <h2 className="text-2xl font-black text-stone-900 uppercase tracking-tighter">Physical Inspection</h2>
                                <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mt-1">Vehicle compliance check</p>
                            </div>
                            <span className="text-[10px] font-black bg-stone-100 px-3 py-1.5 rounded-lg text-stone-500 uppercase tracking-widest">Stage 01</span>
                        </header>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-10">
                            {inspectionChecklist.map((item, idx) => (
                                <label key={idx} className="flex items-center gap-4 p-5 rounded-2xl border border-stone-100 bg-stone-50/50 hover:bg-white transition-all cursor-pointer group">
                                    <input type="checkbox" className="w-5 h-5 rounded-lg border-stone-300 text-stone-900 focus:ring-stone-900" />
                                    <span className="text-xs font-bold text-stone-700 uppercase tracking-tight group-hover:text-stone-900">{item}</span>
                                </label>
                            ))}
                        </div>

                        <button onClick={nextStep} className="w-full bg-stone-900 text-white py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-[11px] hover:bg-stone-800 transition-all flex items-center justify-center gap-2 shadow-lg shadow-stone-200">
                            Unit Passed Inspection <ChevronRight size={14} />
                        </button>
                    </div>
                )}

                {/* PHASE 3: ONLINE PAYMENT (TREASURER) */}
                {step === 3 && (
                    <div className="bg-white rounded-[2rem] border border-stone-200 p-10 shadow-sm animate-in fade-in zoom-in-95 duration-300">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                            <div>
                                <header className="mb-8">
                                    <h2 className="text-2xl font-black text-stone-900 uppercase tracking-tighter">Settlement</h2>
                                    <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mt-1">Municipal Treasurer's Office</p>
                                </header>

                                <div className="space-y-2 mb-6">
                                    {nasugbuRequirements.filter(r => r.price).map((fee) => (
                                        <div key={fee.id} className="flex justify-between items-center p-4 bg-stone-50 rounded-xl border border-stone-100">
                                            <span className="text-[10px] font-bold text-stone-500 uppercase">{fee.label}</span>
                                            <span className="text-xs font-black text-stone-900 tabular-nums">₱{fee.price.toFixed(2)}</span>
                                        </div>
                                    ))}
                                    <div className="flex justify-between items-center p-4 bg-stone-50 rounded-xl border border-stone-100">
                                        <span className="text-[10px] font-bold text-stone-500 uppercase">Processing & Application</span>
                                        <span className="text-xs font-black text-stone-900 tabular-nums">₱250.00</span>
                                    </div>
                                </div>

                                <div className="p-6 bg-stone-900 rounded-3xl flex justify-between items-center">
                                    <div className="flex flex-col">
                                        <span className="text-[9px] font-bold text-stone-400 uppercase tracking-widest">Total Bill</span>
                                        <span className="text-2xl font-black text-white tabular-nums tracking-tighter">₱{totalFee.toFixed(2)}</span>
                                    </div>
                                    <Info size={20} className="text-stone-600" />
                                </div>
                            </div>

                            <div className="flex flex-col justify-between">
                                <div className="space-y-3">
                                    <h3 className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-4">Payment Gateway</h3>
                                    <PaymentCard id="gcash" label="GCash" icon={Smartphone} selected={paymentMethod === 'gcash'} onSelect={() => setPaymentMethod('gcash')} />
                                    <PaymentCard id="maya" label="Maya" icon={Wallet} selected={paymentMethod === 'maya'} onSelect={() => setPaymentMethod('maya')} />
                                    <PaymentCard id="bank" label="Online Banking" icon={CreditCard} selected={paymentMethod === 'bank'} onSelect={() => setPaymentMethod('bank')} />
                                </div>

                                <div className="flex gap-4 mt-8">
                                    <button onClick={prevStep} className="flex-1 border border-stone-200 text-stone-500 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px]">Back</button>
                                    <button onClick={nextStep} disabled={!paymentMethod} className="flex-[2] bg-stone-900 disabled:bg-stone-200 text-white py-4 rounded-2xl font-black uppercase tracking-[0.15em] text-[11px] shadow-lg shadow-stone-200">
                                        Authorize Payment
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* PHASE 5: FINAL REGISTRY ENTRY */}
                {step === 5 && (
                    <div className="bg-white rounded-[2rem] border border-stone-200 p-10 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500 text-center">
                        <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
                            <CheckCircle2 size={40} />
                        </div>
                        <h2 className="text-3xl font-black text-stone-900 uppercase tracking-tighter">Validation Complete</h2>
                        <p className="text-sm font-bold text-stone-500 uppercase tracking-tight mt-2 max-w-md mx-auto leading-relaxed">
                            Application has been synchronized with the TMO & Treasurer database.
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-12 max-w-2xl mx-auto">
                            <div className="p-6 bg-stone-50 rounded-2xl border border-stone-100 text-left">
                                <span className="text-[9px] font-black text-stone-400 uppercase tracking-[0.2em]">Queue ID</span>
                                <p className="text-lg font-black text-stone-900 tracking-tight">NSB-2026-8812</p>
                            </div>
                            <div className="p-6 bg-stone-50 rounded-2xl border border-stone-100 text-left">
                                <span className="text-[9px] font-black text-stone-400 uppercase tracking-[0.2em]">Next Authority</span>
                                <p className="text-lg font-black text-stone-900 tracking-tight">BPLO Releasing</p>
                            </div>
                        </div>

                        <div className="flex gap-4 mt-12 max-w-2xl mx-auto">
                            <button className="flex-1 border-2 border-stone-900 text-stone-900 py-4 rounded-2xl font-black uppercase tracking-widest text-[11px] flex items-center justify-center gap-2">
                                <Printer size={16} /> Print Receipt
                            </button>
                            <button onClick={() => window.location.reload()} className="flex-[2] bg-stone-900 text-white py-4 rounded-2xl font-black uppercase tracking-[0.15em] text-[11px]">
                                New Application
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </TrivoraLayout>
    );
}

// --- TACTICAL COMPONENTS ---

function StepIcon({ active, current, icon: Icon, label }) {
    return (
        <div className="relative z-10 flex flex-col items-center gap-3">
            <div className={`w-14 h-14 rounded-[1.25rem] flex items-center justify-center transition-all duration-500 border-4 ${
                current ? 'bg-stone-900 text-white border-white scale-110 shadow-2xl shadow-stone-300' :
                active ? 'bg-stone-900 text-white border-white' : 'bg-white text-stone-300 border-stone-100'
            }`}>
                <Icon size={20} strokeWidth={2.5} />
            </div>
            <span className={`text-[9px] font-black uppercase tracking-[0.15em] ${active ? 'text-stone-900' : 'text-stone-300'}`}>{label}</span>
        </div>
    );
}

function PaymentCard({ icon: Icon, label, selected, onSelect }) {
    return (
        <button
            onClick={onSelect}
            className={`w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${
                selected ? 'border-stone-900 bg-stone-50 shadow-sm' : 'border-stone-100 bg-white hover:border-stone-300'
            }`}
        >
            <div className="flex items-center gap-4">
                <div className={`p-2 rounded-xl ${selected ? 'bg-stone-900 text-white' : 'bg-stone-50 text-stone-400'}`}>
                    <Icon size={18} />
                </div>
                <span className={`text-[11px] font-black uppercase tracking-tight ${selected ? 'text-stone-900' : 'text-stone-500'}`}>{label}</span>
            </div>
            {selected && <CheckCircle2 size={18} className="text-stone-900" />}
        </button>
    );
}