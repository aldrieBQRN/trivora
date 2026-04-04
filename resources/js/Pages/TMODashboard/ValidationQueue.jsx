import React from 'react';
import { Head, Link } from '@inertiajs/react';
import TrivoraLayout from '@/Layouts/TrivoraLayout';
import {
    Search, Filter, Clock,
    Calendar, ChevronRight,
    FileSearch, ClipboardCheck,
    LayoutDashboard
} from 'lucide-react';

export default function ValidationQueue() {
    // Simulated Database of Mixed-Status Applications
    const applications = [
        {
            id: 'NSB-26-8812',
            operator: 'Juan Dela Cruz',
            contact: '0917 123 4567',
            toda: 'TODA A (Poblacion)',
            make: 'Kawasaki Barako 175',
            status: 'pending_review', // Needs Phase 1: DocumentReview.jsx
            date: '2026-03-30'
        },
        {
            id: 'NSB-26-4491',
            operator: 'Ricardo Dalisay',
            contact: '0918 555 1234',
            toda: 'TODA D (Papaya)',
            make: 'Honda TMX 125',
            status: 'scheduled', // Needs Phase 2: PhysicalInspection.jsx
            scheduled_for: '2026-04-05',
            date: '2026-03-28'
        }
    ];

    return (
        <TrivoraLayout title="MTOP Validation" role="TMO Officer">
            <Head title="TMO Queue | TRIVORA" />

            <div className="max-w-6xl mx-auto pb-12">

                {/* --- HEADER --- */}
                <div className="mb-10">
                    <h1 className="text-3xl font-black text-stone-900 uppercase tracking-tighter">Validation Hub</h1>
                    <p className="text-[11px] font-bold text-stone-500 uppercase tracking-widest mt-1">
                        Manage the two-phase registration pipeline
                    </p>
                </div>

                {/* --- STATUS OVERVIEW CARDS --- */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                    <StatusCard
                        count={applications.filter(a => a.status === 'pending_review').length}
                        label="New Submissions"
                        sub="Needs Document Review"
                        color="bg-amber-500"
                    />
                    <StatusCard
                        count={applications.filter(a => a.status === 'scheduled').length}
                        label="To Be Inspected"
                        sub="Scheduled for Physical Test"
                        color="bg-blue-500"
                    />
                    <StatusCard
                        count={0}
                        label="Passed Today"
                        sub="Forwarded to BPLO"
                        color="bg-emerald-500"
                    />
                </div>

                {/* --- MAIN QUEUE TABLE --- */}
                <div className="bg-white rounded-[2.5rem] border-2 border-stone-200 shadow-sm overflow-hidden">
                    <div className="p-6 border-b-2 border-stone-100 flex flex-col md:flex-row justify-between gap-4 bg-stone-50/50">
                        <div className="flex items-center gap-3 w-full max-w-md bg-white border-2 border-stone-200 rounded-2xl px-4 py-3 focus-within:border-stone-900 transition-all">
                            <Search size={18} className="text-stone-400" />
                            <input type="text" placeholder="Search Tracking ID or Operator..." className="w-full bg-transparent border-none outline-none text-xs font-black text-stone-900 uppercase placeholder:text-stone-300" />
                        </div>
                        <div className="flex gap-2">
                            <button className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-stone-600 bg-white border-2 border-stone-200 px-5 py-3 rounded-xl hover:bg-stone-50">
                                <Filter size={14} /> Filter
                            </button>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-stone-50 border-b-2 border-stone-100">
                                <tr>
                                    <th className="px-8 py-5 text-[9px] font-black text-stone-400 uppercase tracking-[0.2em]">Application ID</th>
                                    <th className="px-8 py-5 text-[9px] font-black text-stone-400 uppercase tracking-[0.2em]">Operator Details</th>
                                    <th className="px-8 py-5 text-[9px] font-black text-stone-400 uppercase tracking-[0.2em]">Current Step</th>
                                    <th className="px-8 py-5 text-[9px] font-black text-stone-400 uppercase tracking-[0.2em] text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-stone-100">
                                {applications.map((app) => (
                                    <tr key={app.id} className="group hover:bg-stone-50/80 transition-all">
                                        <td className="px-8 py-6">
                                            <span className="text-sm font-black text-stone-900 tracking-wider font-mono bg-white border-2 border-stone-200 px-3 py-1.5 rounded-xl shadow-sm">
                                                {app.id}
                                            </span>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex flex-col">
                                                <span className="text-xs font-black text-stone-900 uppercase leading-none mb-1">{app.operator}</span>
                                                <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">{app.toda}</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            {app.status === 'pending_review' ? (
                                                <div className="inline-flex items-center gap-2 bg-amber-50 text-amber-600 border-2 border-amber-100 px-3 py-1.5 rounded-full">
                                                    <Clock size={12} strokeWidth={3} />
                                                    <span className="text-[9px] font-black uppercase tracking-widest">Phase 1: Doc Review</span>
                                                </div>
                                            ) : (
                                                <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-600 border-2 border-blue-100 px-3 py-1.5 rounded-full">
                                                    <Calendar size={12} strokeWidth={3} />
                                                    <span className="text-[9px] font-black uppercase tracking-widest">Phase 2: Inspect ({app.scheduled_for})</span>
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            {/* --- FIXED: Conditional Link to prevent 404 --- */}
                                            <Link
                                                href={app.status === 'pending_review'
                                                    ? `/tmo/review/docs/${app.id}`
                                                    : `/tmo/review/physical/${app.id}`
                                                }
                                                className="inline-flex items-center gap-2 bg-stone-900 text-white px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.1em] hover:bg-stone-800 transition-all shadow-md group-hover:shadow-stone-200 group-hover:translate-x-1"
                                            >
                                                {app.status === 'pending_review' ? 'Start Review' : 'Open Inspection'}
                                                <ChevronRight size={14} strokeWidth={3} />
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </TrivoraLayout>
    );
}

// --- SUB COMPONENTS ---
function StatusCard({ count, label, sub, color }) {
    return (
        <div className="bg-white p-6 rounded-[2rem] border-2 border-stone-200 shadow-sm flex items-center gap-5 group hover:border-stone-900 transition-all">
            <div className={`w-14 h-14 rounded-2xl ${color} flex items-center justify-center text-white shadow-lg`}>
                <span className="text-xl font-black">{count}</span>
            </div>
            <div>
                <h3 className="text-[10px] font-black text-stone-400 uppercase tracking-[0.2em] mb-0.5">{label}</h3>
                <p className="text-xs font-black text-stone-900 uppercase tracking-tight">{sub}</p>
            </div>
        </div>
    );
}