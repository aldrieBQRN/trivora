<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Certificate of Registration - {{ $data['plate'] }}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Courier New', monospace;
            background: #f5f5f5;
            color: #000;
            padding: 20px;
            line-height: 1.4;
        }

        .container {
            max-width: 900px;
            margin: 0 auto;
        }

        .document {
            background: white;
            padding: 0;
            border-radius: 0;
            box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
            width: 100%;
            aspect-ratio: 8.5 / 11;
            position: relative;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            page-break-after: always;
        }

        .header {
            background: linear-gradient(135deg, #1C2340 0%, #2E3A9E 100%);
            color: white;
            padding: 20px 30px;
            text-align: center;
            border-bottom: 3px solid #FFD700;
        }

        .header h1 {
            font-size: 18px;
            font-weight: bold;
            letter-spacing: 2px;
            margin-bottom: 4px;
        }

        .header p {
            font-size: 11px;
            letter-spacing: 1px;
        }

        .form-number {
            position: absolute;
            top: 12px;
            right: 20px;
            font-size: 10px;
            color: #666;
        }

        .content {
            padding: 20px 30px;
            flex: 1;
            display: flex;
            flex-direction: column;
            font-size: 11px;
            line-height: 1.4;
        }

        .form-section {
            margin-bottom: 12px;
        }

        .section-title {
            font-weight: bold;
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 6px;
            border-bottom: 1px dashed #333;
            padding-bottom: 4px;
        }

        .form-row {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 8px;
        }

        .form-row.full {
            grid-template-columns: 1fr;
        }

        .form-row.three {
            grid-template-columns: 1fr 1fr 1fr;
        }

        .form-field {
            display: flex;
            flex-direction: column;
        }

        .field-label {
            font-size: 9px;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 2px;
            color: #333;
        }

        .field-value {
            font-size: 11px;
            font-weight: bold;
            padding: 3px 4px;
            border-bottom: 1px solid #000;
            min-height: 18px;
            display: flex;
            align-items: center;
        }

        .field-value.empty {
            border-bottom-style: solid;
            min-height: 16px;
        }

        .checkbox-group {
            display: flex;
            gap: 15px;
            flex-wrap: wrap;
        }

        .checkbox-item {
            display: flex;
            align-items: center;
            font-size: 10px;
        }

        .checkbox {
            width: 14px;
            height: 14px;
            border: 1px solid #000;
            margin-right: 4px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 10px;
            font-weight: bold;
        }

        .checkbox.checked {
            background: #000;
            color: white;
        }

        .remarks {
            background: #f9f9f9;
            border: 1px dashed #999;
            padding: 8px;
            margin-top: 8px;
            font-size: 9px;
            line-height: 1.3;
            font-style: italic;
            color: #555;
        }

        .signature-area {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 15px;
            margin-top: 12px;
            text-align: center;
        }

        .sig-box {
            border-top: 1px solid #000;
            padding-top: 20px;
        }

        .sig-label {
            font-size: 9px;
            font-weight: bold;
        }

        .sig-title {
            font-size: 8px;
            margin-top: 2px;
        }

        .footer {
            border-top: 1px solid #999;
            padding-top: 8px;
            margin-top: 8px;
            font-size: 8px;
            text-align: center;
            color: #666;
        }

        .watermark {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) rotate(-45deg);
            font-size: 48px;
            color: rgba(255, 215, 0, 0.1);
            font-weight: bold;
            pointer-events: none;
            white-space: nowrap;
            z-index: 0;
        }

        .document-content {
            position: relative;
            z-index: 1;
        }

        @media print {
            body {
                background: white;
                padding: 0;
            }
            .document {
                box-shadow: none;
                border-radius: 0;
                margin: 0;
                aspect-ratio: auto;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="document">
            <div class="watermark">SAMPLE COPY</div>

            <div class="document-content">
                <!-- Header -->
                <div class="header">
                    <h1>CERTIFICATE OF REGISTRATION</h1>
                    <p>LAND TRANSPORTATION OFFICE</p>
                </div>

                <!-- Form Number -->
                <div class="form-number">LTO Form 1A</div>

                <!-- Content -->
                <div class="content">
                    <!-- Vehicle Identification -->
                    <div class="form-section">
                        <div class="section-title">Vehicle Identification</div>

                        <div class="form-row three">
                            <div class="form-field">
                                <label class="field-label">Make/Brand</label>
                                <div class="field-value">{{ explode(' ', $data['make'])[0] }}</div>
                            </div>
                            <div class="form-field">
                                <label class="field-label">Series</label>
                                <div class="field-value">{{ $data['make'] }}</div>
                            </div>
                            <div class="form-field">
                                <label class="field-label">Body Type</label>
                                <div class="field-value">Motorcycle</div>
                            </div>
                        </div>

                        <div class="form-row three">
                            <div class="form-field">
                                <label class="field-label">Year Model</label>
                                <div class="field-value">{{ now()->year }}</div>
                            </div>
                            <div class="form-field">
                                <label class="field-label">Color</label>
                                <div class="field-value">Black/Red</div>
                            </div>
                            <div class="form-field">
                                <label class="field-label">Door</label>
                                <div class="field-value">2</div>
                            </div>
                        </div>

                        <div class="form-row three">
                            <div class="form-field">
                                <label class="field-label">Engine Number</label>
                                <div class="field-value">{{ $data['engine_number'] }}</div>
                            </div>
                            <div class="form-field">
                                <label class="field-label">Chassis Number</label>
                                <div class="field-value">{{ $data['chassis_number'] }}</div>
                            </div>
                            <div class="form-field">
                                <label class="field-label">Serial Number</label>
                                <div class="field-value">SN-{{ now()->year }}-{{ substr(md5($data['plate']), 0, 4) }}</div>
                            </div>
                        </div>
                    </div>

                    <!-- Registration Details -->
                    <div class="form-section">
                        <div class="section-title">Registration Details</div>

                        <div class="form-row">
                            <div class="form-field">
                                <label class="field-label">Plate Number</label>
                                <div class="field-value">{{ $data['plate'] }}</div>
                            </div>
                            <div class="form-field">
                                <label class="field-label">Conduction Sticker</label>
                                <div class="field-value">{{ $data['plate'] }}-1</div>
                            </div>
                        </div>

                        <div class="form-row">
                            <div class="form-field">
                                <label class="field-label">Date of Registration</label>
                                <div class="field-value">{{ now()->subYear()->format('F d, Y') }}</div>
                            </div>
                            <div class="form-field">
                                <label class="field-label">Date of Expiration</label>
                                <div class="field-value">{{ now()->format('F d, Y') }}</div>
                            </div>
                        </div>

                        <div class="form-row full">
                            <div class="form-field">
                                <label class="field-label">Operation Type</label>
                                <div class="checkbox-group">
                                    <div class="checkbox-item">
                                        <div class="checkbox checked">✓</div>
                                        <span>Public Utility (Tricycle)</span>
                                    </div>
                                    <div class="checkbox-item">
                                        <div class="checkbox">□</div>
                                        <span>Private</span>
                                    </div>
                                    <div class="checkbox-item">
                                        <div class="checkbox">□</div>
                                        <span>Rental</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Owner Information -->
                    <div class="form-section">
                        <div class="section-title">Owner Information</div>

                        <div class="form-row full">
                            <div class="form-field">
                                <label class="field-label">Name of Owner</label>
                                <div class="field-value">{{ $data['owner'] }}</div>
                            </div>
                        </div>

                        <div class="form-row">
                            <div class="form-field">
                                <label class="field-label">Address</label>
                                <div class="field-value">{{ $data['barangay'] }}</div>
                            </div>
                            <div class="form-field">
                                <label class="field-label">Contact</label>
                                <div class="field-value">{{ $data['contact'] }}</div>
                            </div>
                        </div>
                    </div>

                    <!-- Remarks -->
                    <div class="remarks">
                        <strong>REMARKS:</strong> Lorem ipsum dolor sit amet, consectetur adipiscing elit. Vehicle registered for public transportation operations under TODA association regulations. All documentary requirements satisfied. Valid for municipal transportation services only.
                    </div>

                    <!-- Signatures -->
                    <div class="signature-area">
                        <div class="sig-box">
                            <div class="sig-title">Applicant/Owner</div>
                            <div style="height: 25px;"></div>
                            <div class="sig-label">{{ $data['owner'] }}</div>
                        </div>
                        <div class="sig-box">
                            <div class="sig-title">Examiner</div>
                            <div style="height: 25px;"></div>
                            <div class="sig-label">LTO Examiner</div>
                        </div>
                        <div class="sig-box">
                            <div class="sig-title">Approving Officer</div>
                            <div style="height: 25px;"></div>
                            <div class="sig-label">LTO Officer</div>
                        </div>
                    </div>

                    <!-- Footer -->
                    <div class="footer">
                        Document ID: LTO-{{ now()->year }}-{{ substr(md5($data['plate']), 0, 6) }} | Issued: {{ now()->subYear()->format('F d, Y') }} | This is a SAMPLE COPY for demonstration purposes only
                    </div>
                </div>
            </div>
        </div>
    </div>
</body>
</html>
