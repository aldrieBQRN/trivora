import React, { useState } from 'react';
import { Head, router, useForm } from '@inertiajs/react';
import TrivoraLayout from '@/Layouts/TrivoraLayout';
import Swal from 'sweetalert2';
import {
    ShieldCheck, CheckCircle2, Clock, Bike, Smartphone, Cpu, Receipt, Tag,
    AlertCircle, CheckSquare, Square, Eye,
} from 'lucide-react';
import {
    PageHeader, KpiCard, KpiGrid, StatusBadge, SearchInput,
    Table, Thead, Tbody, Tr, Td, EmptyState, Button, Modal, Input,
} from '@/Components/TMO';

export default function FinalConfirmationQueue({
    applications = [],
    searchTerm = '',
    awaitingCount = 0,
    confirmedTodayCount = 0,
    iotActiveCount = 0,
    mobileActiveCount = 0
}) {
    const [search, setSearch] = useState(searchTerm);
    const [selectedApp, setSelectedApp] = useState(null);
    const [modalOpen, setModalOpen] = useState(false);

    const { data, setData, post, processing, reset } = useForm({
        signed_ticket_verified: false,
        bplo_approval_confirmed: false,
        sticker_possession_confirmed: false,
        tracking_method: 'mobile_gps',
        iot_device_id: '',
        officer_notes: '',
    });

    const handleSearch = (val) => {
        setSearch(val);
        router.get(
            route('tmo.final-confirmation'),
            { search: val },
            { preserveState: true, replace: true }
        );
    };

    const handleShowDetails = (app) => {
        setSelectedApp(app);
        const isCompleted = app.raw_status === 'completed';
        setData({
            signed_ticket_verified: isCompleted,
            bplo_approval_confirmed: isCompleted,
            sticker_possession_confirmed: isCompleted,
            tracking_method: app.tracking_method || 'mobile_gps',
            iot_device_id: app.iot_device_id || app.suggested_iot_id || '',
            officer_notes: '',
        });
        setModalOpen(true);
    };

    const handleCloseModal = () => {
        setModalOpen(false);
        setSelectedApp(null);
        reset();
    };

    const handleConfirmActivation = () => {
        if (!selectedApp) return;

        if (!data.signed_ticket_verified || !data.bplo_approval_confirmed || !data.sticker_possession_confirmed) {
            Swal.fire({
                title: 'Clearance Incomplete',
                text: 'Please confirm that all BPLO requirements and approvals are verified.',
                icon: 'warning',
                confirmButtonColor: '#1D2542'
            });
            return;
        }

        if (data.tracking_method === 'iot_device' && !data.iot_device_id.trim()) {
            Swal.fire({
                title: 'IoT Serial Number Required',
                text: 'Please enter the physical IoT device serial number before completing activation.',
                icon: 'warning',
                confirmButtonColor: '#1D2542'
            });
            return;
        }

        const methodDesc = data.tracking_method === 'iot_device'
            ? `Physical IoT Tracker <b>(#${data.iot_device_id})</b>`
            : `Mobile App GPS (Driver Smartphone)`;

        Swal.fire({
            title: 'Confirm Franchise Activation',
            html: `Are you sure you want to mark this franchise permit as <b>ACTIVATED &amp; COMPLETED</b>?<br/><br/>
                   <div style="text-align: left; background: #F8FAFC; padding: 12px 16px; border-radius: 8px; font-size: 13px; line-height: 1.6; border: 1px solid #E2E8F0;">
                     Operator: <b>${selectedApp.operator_name}</b><br/>
                     Tricycle Unit: <b>${selectedApp.make_model} (${selectedApp.plate_number})</b><br/>
                     Franchise Sticker: <b>${selectedApp.sticker_number}</b><br/>
                     Body / Coding No: <b>${selectedApp.body_number}</b><br/>
                     Tracking Method: ${methodDesc}
                   </div>`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#059669',
            cancelButtonColor: '#8A96BC',
            confirmButtonText: 'Yes, Activate Permit',
            cancelButtonText: 'Cancel',
        }).then((result) => {
            if (result.isConfirmed) {
                post(`/tmo/final-confirmation/${selectedApp.id}`, {
                    preserveScroll: true,
                    onSuccess: () => {
                        setModalOpen(false);
                        Swal.fire({
                            title: 'Franchise Activated!',
                            text: `Permit for ${selectedApp.operator_name} is now officially active in the municipal registry.`,
                            icon: 'success',
                            confirmButtonColor: '#059669',
                            timer: 2500,
                            showConfirmButton: false,
                        });
                    }
                });
            }
        });
    };

    const isAlreadyCompleted = selectedApp?.raw_status === 'completed';

    return (
        <TrivoraLayout title="Final Confirmation & GPS Setup" role="TMO Officer">
            <Head title="Final Confirmation & GPS Setup | TRIVORA" />

            <PageHeader
                eyebrow="TMO Pipeline • Step 5 (Final Step)"
                title="Final Confirmation & GPS Setup"
                subtitle="Review complete municipal approvals, confirm BPLO requirements, and configure GPS tracking to activate the MTOP franchise permit."
            />

            <KpiGrid cols={4}>
                <KpiCard label="Awaiting Confirmation" value={awaitingCount} icon={Clock} tone="warning" />
                <KpiCard label="Confirmed Today" value={confirmedTodayCount} icon={CheckCircle2} tone="success" />
                <KpiCard label="IoT Trackers Issued" value={iotActiveCount} icon={Cpu} tone="primary" />
                <KpiCard label="Mobile GPS Active" value={mobileActiveCount} icon={Smartphone} tone="success" />
            </KpiGrid>

            <div className="mb-4 flex flex-col gap-3 rounded-xl border border-tmo-border bg-tmo-surface p-3.5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2.5 text-sm font-bold text-tmo-ink">
                    <ShieldCheck size={18} className="text-tmo-primary" />
                    <span>Applications Queue</span>
                    <span className="rounded-full bg-tmo-primarySoft px-2.5 py-0.5 text-xs font-extrabold text-tmo-primary">{applications.length} Total</span>
                </div>
                <SearchInput value={search} onChange={handleSearch} placeholder="Search by Reference, Operator, Plate, Sticker..." className="w-full sm:w-80" />
            </div>

            {applications.length === 0 ? (
                <div className="rounded-xl border border-tmo-border bg-tmo-surface">
                    <EmptyState
                        icon={AlertCircle}
                        title="No Applications in Final Confirmation"
                        description="Applications released by BPLO with assigned stickers and coding numbers will appear here for TMO GPS tracking configuration and final activation."
                    />
                </div>
            ) : (
                <Table>
                    <Thead>
                        <th>Application</th>
                        <th>Operator &amp; Unit</th>
                        <th>BPLO Sticker &amp; Coding</th>
                        <th>Cashier OR</th>
                        <th>Pipeline Status</th>
                        <th className="text-right">Action</th>
                    </Thead>
                    <Tbody>
                        {applications.map((app) => (
                            <Tr key={app.id}>
                                <Td>
                                    <span className="font-mono text-xs font-bold text-tmo-primary">{app.reference}</span>
                                    <div className="mt-0.5 text-[11px] text-tmo-muted">{app.application_type} Franchise</div>
                                </Td>

                                <Td>
                                    <div className="text-[13.5px] font-bold text-tmo-ink">{app.operator_name}</div>
                                    <div className="mt-0.5 flex items-center gap-1.5 text-[11.5px] text-tmo-muted">
                                        <Bike size={12} strokeWidth={2} />
                                        <span>{app.toda_zone} • {app.make_model} ({app.plate_number})</span>
                                    </div>
                                </Td>

                                <Td>
                                    <span className="inline-flex items-center gap-1.5 rounded-md bg-gray-100 px-2 py-1 font-mono text-[11px] font-bold text-tmo-ink">
                                        Body #{app.body_number}
                                    </span>
                                    <div className="mt-1">
                                        <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-50 px-2 py-1 font-mono text-[11px] font-bold text-emerald-700">
                                            <Tag size={11} /> {app.sticker_number}
                                        </span>
                                    </div>
                                </Td>

                                <Td>
                                    <div className="flex items-center gap-1.5 text-xs font-bold text-tmo-ink">
                                        <Receipt size={14} className="text-emerald-600" />
                                        <span className="font-mono">{app.or_number}</span>
                                    </div>
                                    <div className="mt-0.5 text-[11px] text-emerald-600">₱{app.payment_amount.toFixed(2)} OTC Verified</div>
                                </Td>

                                <Td>
                                    {app.raw_status === 'awaiting_tmo_confirmation' ? (
                                        <StatusBadge variant="warning" icon={Clock}>Awaiting TMO Confirmation</StatusBadge>
                                    ) : (
                                        <StatusBadge variant="success" icon={CheckCircle2}>
                                            {app.tracking_method === 'iot_device' ? 'IoT Active' : 'Mobile GPS Active'}
                                        </StatusBadge>
                                    )}
                                </Td>

                                <Td className="text-right">
                                    <Button
                                        variant={app.raw_status === 'completed' ? 'secondary' : 'primary'}
                                        size="sm"
                                        icon={Eye}
                                        onClick={() => handleShowDetails(app)}
                                    >
                                        Show Details
                                    </Button>
                                </Td>
                            </Tr>
                        ))}
                    </Tbody>
                </Table>
            )}

            {/* ══════════════ SHOW DETAILS MODAL ══════════════ */}
            {selectedApp && (
                <Modal
                    show={modalOpen}
                    onClose={handleCloseModal}
                    maxWidth="4xl"
                    title="Final Confirmation & GPS Setup"
                    description={
                        <span className="mt-1 flex items-center gap-2">
                            <span className="rounded bg-gray-100 px-2 py-0.5 font-mono text-xs font-extrabold text-tmo-ink">{selectedApp.reference}</span>
                            {isAlreadyCompleted ? (
                                <StatusBadge variant="success">Active &amp; Completed</StatusBadge>
                            ) : (
                                <StatusBadge variant="warning">Awaiting Final Verification</StatusBadge>
                            )}
                        </span>
                    }
                    footer={
                        <div className="flex w-full items-center justify-between">
                            <Button variant="secondary" onClick={handleCloseModal}>Close</Button>
                            {isAlreadyCompleted ? (
                                <div className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wide text-emerald-600">
                                    <CheckCircle2 size={16} />
                                    Franchise Permit Activated &amp; Active
                                </div>
                            ) : (
                                <Button
                                    variant="success"
                                    icon={processing ? undefined : ShieldCheck}
                                    loading={processing}
                                    onClick={handleConfirmActivation}
                                >
                                    Step 5: Complete Final Confirmation &amp; Activate Franchise
                                </Button>
                            )}
                        </div>
                    }
                >
                    <div className="flex flex-col gap-6">

                        {/* ── STEP 1 ── */}
                        <StepBox num={1} title="Review Application Details & Previous Approvals">
                            <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <InfoPanel title="Applicant Information">
                                    <InfoRow label="Operator / Driver:" value={selectedApp.operator_name} strong />
                                    <InfoRow label="Contact Number:" value={selectedApp.contact_number} />
                                    <InfoRow label="TODA Zone:" value={selectedApp.toda_zone} accent />
                                </InfoPanel>
                                <InfoPanel title="Tricycle Unit Specifications">
                                    <InfoRow label="Plate Number:" value={selectedApp.plate_number} mono strong />
                                    <InfoRow label="Make & Model:" value={selectedApp.make_model} />
                                    <InfoRow label="Engine / Chassis:" value={selectedApp.engine_number} mono />
                                </InfoPanel>
                            </div>

                            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                                <ApprovalItem title="TMO Documents" icon={CheckCircle2} value="Approved" sub="Digital files verified" />
                                <ApprovalItem title="Physical Inspection" icon={CheckCircle2} value="Roadworthy" sub={selectedApp.inspection_date || 'Inspection cleared'} />
                                <ApprovalItem title="Municipal Cashier" icon={Receipt} value={`₱${selectedApp.payment_amount.toFixed(2)}`} sub={`OR #${selectedApp.or_number}`} />
                                <ApprovalItem title="BPLO Approval" icon={Tag} value={`#${selectedApp.body_number}`} sub={`Sticker #${selectedApp.sticker_number}`} />
                            </div>
                        </StepBox>

                        {/* ── STEP 2 ── */}
                        <StepBox num={2} title="Confirm BPLO Requirements & Approvals Complete">
                            <p className="mb-3 text-xs text-tmo-muted">
                                Cross-check physical credentials presented by the driver before authorizing GPS setup and franchise permit activation.
                            </p>

                            <CheckRow
                                checked={data.bplo_approval_confirmed}
                                disabled={isAlreadyCompleted}
                                onClick={() => setData('bplo_approval_confirmed', !data.bplo_approval_confirmed)}
                            >
                                <strong>Confirmed BPLO payment approval:</strong> Cashier Official Receipt <strong>#{selectedApp.or_number}</strong> (₱{selectedApp.payment_amount.toFixed(2)}) is verified and valid.
                            </CheckRow>

                            <CheckRow
                                checked={data.sticker_possession_confirmed}
                                disabled={isAlreadyCompleted}
                                onClick={() => setData('sticker_possession_confirmed', !data.sticker_possession_confirmed)}
                            >
                                <strong>Confirmed BPLO sticker &amp; coding plate release:</strong> Driver has physical possession of Franchise Sticker <strong>#{selectedApp.sticker_number}</strong> and Coding Plate <strong>#{selectedApp.body_number}</strong>.
                            </CheckRow>

                            <CheckRow
                                checked={data.signed_ticket_verified}
                                disabled={isAlreadyCompleted}
                                last
                                onClick={() => setData('signed_ticket_verified', !data.signed_ticket_verified)}
                            >
                                <strong>Signed Municipal Payment Ticket:</strong> Driver presented the physically validated Payment Ticket (<strong>{selectedApp.ticket_number}</strong>) stamped by the Municipal Cashier.
                            </CheckRow>
                        </StepBox>

                        {/* ── STEP 3 & 4 ── */}
                        <StepBox num={3} title="GPS Configuration & Tracking Setup">
                            <p className="mb-3 text-xs text-tmo-muted">
                                Select whether this tricycle unit will be monitored via Mobile GPS on the driver's smartphone or an issued physical IoT hardware device.
                            </p>

                            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                                <GpsCard
                                    icon={Smartphone}
                                    name="Mobile App GPS (Driver Smartphone)"
                                    description="Live telematics streamed directly through the Trivora Driver Mobile App. No physical municipal hardware is issued."
                                    selected={data.tracking_method === 'mobile_gps'}
                                    disabled={isAlreadyCompleted}
                                    onClick={() => setData('tracking_method', 'mobile_gps')}
                                />
                                <GpsCard
                                    icon={Cpu}
                                    name="Physical IoT Device Tracker"
                                    description="TMO issues a dedicated municipal IoT GPS tracker to be installed and wired directly to the tricycle battery."
                                    selected={data.tracking_method === 'iot_device'}
                                    disabled={isAlreadyCompleted}
                                    onClick={() => setData('tracking_method', 'iot_device')}
                                />
                            </div>

                            {data.tracking_method === 'iot_device' && (
                                <div className="mt-3.5 rounded-lg border border-dashed border-tmo-borderStrong bg-tmo-bg p-4">
                                    <div className="mb-1 flex items-center justify-between">
                                        <label className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wide text-tmo-ink">
                                            <Cpu size={14} className="text-tmo-primary" />
                                            Step 4: Configure IoT Device Serial Number / Hardware ID
                                        </label>
                                        <span className="rounded bg-tmo-primarySoft px-2 py-0.5 text-[10px] font-bold text-tmo-primary">
                                            Hardware Serial Required
                                        </span>
                                    </div>

                                    <Input
                                        type="text"
                                        value={data.iot_device_id}
                                        onChange={(e) => setData('iot_device_id', e.target.value)}
                                        placeholder="e.g. TRV-IOT-2026-0006"
                                        disabled={isAlreadyCompleted}
                                        className="mt-1.5 font-mono"
                                    />

                                    <div className="mt-2 flex items-center justify-between">
                                        <span className="text-[11px] text-tmo-muted">
                                            Suggested ID: <code className="font-mono font-bold">{selectedApp.suggested_iot_id}</code>
                                        </span>
                                        {!isAlreadyCompleted && (
                                            <button
                                                type="button"
                                                onClick={() => setData('iot_device_id', selectedApp.suggested_iot_id)}
                                                className="text-[11px] font-bold text-tmo-primary underline"
                                            >
                                                Use Suggested Serial
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}
                        </StepBox>

                    </div>
                </Modal>
            )}
        </TrivoraLayout>
    );
}

function StepBox({ num, title, children }) {
    return (
        <div className="rounded-xl border border-tmo-border bg-white p-5">
            <div className="mb-3.5 flex items-center gap-2.5">
                <div className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full bg-tmo-primary text-[11px] font-extrabold text-white">
                    {num}
                </div>
                <div className="text-sm font-extrabold text-tmo-ink">{title}</div>
            </div>
            {children}
        </div>
    );
}

function InfoPanel({ title, children }) {
    return (
        <div className="rounded-lg border border-tmo-border bg-tmo-bg p-3.5 text-[12.5px]">
            <div className="mb-1.5 text-[10px] font-extrabold uppercase tracking-wide text-tmo-muted">{title}</div>
            {children}
        </div>
    );
}

function InfoRow({ label, value, mono, strong, accent }) {
    return (
        <div className="flex justify-between py-0.5">
            <span className="text-tmo-muted">{label}</span>
            <span className={`${mono ? 'font-mono' : ''} ${strong || accent ? 'font-bold' : 'font-semibold'} ${accent ? 'text-tmo-primary' : 'text-tmo-ink'}`}>
                {value}
            </span>
        </div>
    );
}

function ApprovalItem({ title, icon: Icon, value, sub }) {
    return (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
            <div className="text-[9.5px] font-extrabold uppercase tracking-wide text-emerald-800">{title}</div>
            <div className="mt-0.5 flex items-center gap-1 text-xs font-bold text-tmo-ink">
                <Icon size={12} className="text-emerald-700" /> {value}
            </div>
            <div className="mt-0.5 text-[10.5px] text-tmo-muted">{sub}</div>
        </div>
    );
}

function CheckRow({ checked, disabled, last, onClick, children }) {
    return (
        <div
            onClick={disabled ? undefined : onClick}
            className={`flex items-start gap-3 rounded-lg border-[1.5px] p-3.5 transition-colors ${last ? '' : 'mb-2.5'} ${
                disabled ? 'cursor-default opacity-70' : 'cursor-pointer'
            } ${checked ? 'border-emerald-600 bg-emerald-50' : 'border-tmo-border bg-tmo-bg hover:border-tmo-borderStrong hover:bg-gray-100'}`}
        >
            <div className={`mt-0.5 shrink-0 ${checked ? 'text-emerald-600' : 'text-gray-400'}`}>
                {checked ? <CheckSquare size={18} strokeWidth={2.5} /> : <Square size={18} strokeWidth={2} />}
            </div>
            <div className="text-[12.5px] leading-relaxed text-tmo-ink">{children}</div>
        </div>
    );
}

function GpsCard({ icon: Icon, name, description, selected, disabled, onClick }) {
    return (
        <div
            onClick={disabled ? undefined : onClick}
            className={`rounded-xl border-2 p-4 transition-colors ${disabled ? 'cursor-default opacity-70' : 'cursor-pointer'} ${
                selected ? 'border-tmo-primary bg-tmo-primarySoft' : 'border-tmo-border bg-white hover:border-tmo-borderStrong hover:bg-tmo-bg'
            }`}
        >
            <div className="mb-2.5 flex items-center justify-between">
                <div className={`flex h-[38px] w-[38px] items-center justify-center rounded-lg transition-colors ${selected ? 'bg-tmo-primary text-white' : 'bg-gray-100 text-gray-600'}`}>
                    <Icon size={20} strokeWidth={2.2} />
                </div>
                {selected && <CheckCircle2 size={18} className="text-tmo-primary" />}
            </div>
            <div className="mb-1 text-[13.5px] font-extrabold text-tmo-ink">{name}</div>
            <div className="text-[11.5px] leading-relaxed text-tmo-muted">{description}</div>
        </div>
    );
}
