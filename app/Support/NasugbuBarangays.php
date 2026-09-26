<?php

namespace App\Support;

/**
 * The 42 official barangays of Nasugbu, Batangas (PSA/PSGC) — the single canonical list
 * the backend validates barangay submissions against.
 *
 * It mirrors EXACTLY the option list PublicApply.jsx submits: the 12 Poblacion barangays
 * submit as their bare number ("1".."12", so address text reads "Brgy. 1, Nasugbu,
 * Batangas") and the other 30 submit their official name. Backend Rule::in() and the form
 * dropdown must stay in lockstep — update both together.
 */
class NasugbuBarangays
{
    /**
     * The exact values the registration form may submit, for use with Rule::in().
     *
     * @return array<int, string>
     */
    public static function values(): array
    {
        return array_merge(
            array_map(fn (int $n): string => (string) $n, range(1, 12)),
            [
                'Aga', 'Balaytigui', 'Banilad', 'Bilaran', 'Bucana', 'Bulihan', 'Bunducan', 'Butucan',
                'Calayo', 'Catandaan', 'Cogunan', 'Dayap', 'Kaylaway', 'Kayrilaw', 'Latag', 'Looc',
                'Lumbangan', 'Malapad na Bato', 'Mataas na Pulo', 'Maugat', 'Munting Indan', 'Natipuan',
                'Pantalan', 'Papaya', 'Putat', 'Reparo', 'Talangan', 'Tumalim', 'Utod', 'Wawa',
            ],
        );
    }
}
