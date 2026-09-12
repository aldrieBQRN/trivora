import React, { useState, useEffect, useRef } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import TrivoraLayout from '@/Layouts/TrivoraLayout';
import { ShieldAlert, AlertTriangle, Clock, Search } from 'lucide-react';
import { PageHeader, BackLink, Label, ErrorText, Input, Select, Textarea, Button } from '@/Components/TMO';

export default function CreateViolation({ units = [], selectedTricycleId = null }) {
    // Autocomplete Search State
    const [searchQuery, setSearchQuery] = useState('');
    const [showDropdown, setShowDropdown] = useState(false);
    const dropdownRef = useRef(null);

    // Initial load setup
    useEffect(() => {
        if (selectedTricycleId) {
            const preselected = units.find(u => u.id === selectedTricycleId);
            if (preselected) {
                setSearchQuery(preselected.label);
                setData('tricycle_id', preselected.id);
            }
        }
    }, [selectedTricycleId, units]);

    // Close autocomplete on click outside
    useEffect(() => {
        function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setShowDropdown(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Filter units based on autocomplete search
    const filteredUnits = units.filter(u =>
        u.label.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Form attributes using Inertia form handler
    const { data, setData, post, processing, errors } = useForm({
        tricycle_id: selectedTricycleId || '',
        violation_type: 'color_coding',
        fine_amount: 500,
        location: '',
        notes: ''
    });

    // Reactively update default fine amounts based on violation type selection
    const handleTypeChange = (e) => {
        const type = e.target.value;
        let defaultFine = 200;
        if (type === 'color_coding') defaultFine = 500;
        else if (type === 'route_violation') defaultFine = 300;
        else if (type === 'expired_franchise') defaultFine = 1000;

        setData(prev => ({
            ...prev,
            violation_type: type,
            fine_amount: defaultFine
        }));
    };

    // Form Submit
    const handleSubmit = (e) => {
        e.preventDefault();
        post(route('tmo.violations.store'));
    };

    return (
        <TrivoraLayout title="File Violation Ticket" role="TMO Officer">
            <Head title="File Violation Ticket | TRIVORA" />

            <div className="mx-auto max-w-2xl">
                <PageHeader
                    backLink={<BackLink href={route('tmo.violations')}>Back to Violations</BackLink>}
                    eyebrow="Apprehension Registry"
                    title="File Infraction Ticket"
                />

                <form onSubmit={handleSubmit} className="rounded-2xl border border-tmo-border bg-tmo-surface p-7 shadow-sm">
                    {/* Tricycle autocomplete picker */}
                    <div className="relative mb-6" ref={dropdownRef}>
                        <Label>Target Tricycle Unit</Label>
                        <div className="relative">
                            <Input
                                type="text"
                                placeholder="Type tricycle unit number or plate number..."
                                value={searchQuery}
                                error={errors.tricycle_id}
                                className="pr-10"
                                onChange={(e) => {
                                    setSearchQuery(e.target.value);
                                    setData('tricycle_id', ''); // clear id while typing
                                    setShowDropdown(true);
                                }}
                                onFocus={() => setShowDropdown(true)}
                            />
                            <Search size={16} className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-tmo-subtle" />
                        </div>

                        {showDropdown && searchQuery && filteredUnits.length > 0 && (
                            <div className="absolute left-0 right-0 top-full z-50 mt-1.5 max-h-52 overflow-y-auto rounded-lg border border-tmo-border bg-white shadow-lg">
                                {filteredUnits.map((u) => (
                                    <div
                                        key={u.id}
                                        className="cursor-pointer px-4 py-2.5 text-sm font-medium text-tmo-ink transition-colors hover:bg-tmo-primarySoft hover:text-tmo-primary"
                                        onClick={() => {
                                            setSearchQuery(u.label);
                                            setData('tricycle_id', u.id);
                                            setShowDropdown(false);
                                        }}
                                    >
                                        {u.label}
                                    </div>
                                ))}
                            </div>
                        )}
                        <ErrorText>{errors.tricycle_id}</ErrorText>
                    </div>

                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                        {/* Offense Category */}
                        <div>
                            <Label>Offense Category</Label>
                            <Select value={data.violation_type} error={errors.violation_type} onChange={handleTypeChange}>
                                <option value="color_coding">Color Coding Violation</option>
                                <option value="route_violation">Route Violation</option>
                                <option value="expired_franchise">Expired Franchise</option>
                                <option value="other">Other/Minor Infraction</option>
                            </Select>
                            <ErrorText>{errors.violation_type}</ErrorText>
                        </div>

                        {/* Fine Amount */}
                        <div>
                            <Label>Penalty Fine (₱)</Label>
                            <Input
                                type="number"
                                value={data.fine_amount}
                                error={errors.fine_amount}
                                onChange={e => setData('fine_amount', e.target.value)}
                                min="0"
                                step="50"
                            />
                            <p className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-tmo-subtle">
                                <Clock size={11} /> Recommended penalty fine for selected offense
                            </p>
                            <ErrorText>{errors.fine_amount}</ErrorText>
                        </div>
                    </div>

                    {/* Location */}
                    <div className="mt-5">
                        <Label>Detected Location / Checkpoint</Label>
                        <Input
                            type="text"
                            placeholder="e.g. Barangay 2 Crossing, Plaza Frontage, Nasugbu Highway"
                            value={data.location}
                            error={errors.location}
                            onChange={e => setData('location', e.target.value)}
                        />
                        <ErrorText>{errors.location}</ErrorText>
                    </div>

                    {/* Remarks / Officer Report */}
                    <div className="mt-5">
                        <Label>Officer Remarks &amp; Evidence Details</Label>
                        <Textarea
                            placeholder="Specify details (e.g. driver name, passengers carrying, or particular circumstances of deviation)"
                            value={data.notes}
                            error={errors.notes}
                            onChange={e => setData('notes', e.target.value)}
                        />
                        <ErrorText>{errors.notes}</ErrorText>
                    </div>

                    {/* Action buttons */}
                    <div className="mt-8 flex justify-end gap-3 border-t border-tmo-border pt-6">
                        <Button as={Link} href={route('tmo.violations')} variant="secondary">
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            variant="dangerSolid"
                            icon={ShieldAlert}
                            loading={processing}
                            disabled={!data.tricycle_id || !data.location}
                        >
                            {processing ? 'Logging Ticket...' : 'File Infraction Ticket'}
                        </Button>
                    </div>
                </form>
            </div>
        </TrivoraLayout>
    );
}
