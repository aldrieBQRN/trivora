# TRIVORA Document Examples - Setup Guide

## Overview
Sample requirement documents and templates for the TRIVORA TMO Management System. These documents serve as examples for document review and verification workflows.

## Files Created

### 1. **Controller: DocumentController.php**
- Location: `app/Http/Controllers/DocumentController.php`
- Methods:
  - `previewDocument()` - Renders a sample inspection report for preview
  - `previewORCR()` - Renders a sample OR/CR (Certificate of Registration) document
  - `generateInspectionPDF()` - Generates inspection PDF (structure for future PDF library integration)

### 2. **View: inspection-report-html.blade.php**
- Location: `resources/views/documents/inspection-report-html.blade.php`
- Laravel Blade template for server-rendered inspection reports
- Uses dynamic data injection from controller
- Print-friendly styling

### 3. **Static Example: sample-inspection-document.html**
- Location: `public/sample-inspection-document.html`
- Standalone HTML file with embedded CSS
- No server rendering required
- Can be printed directly to PDF
- Includes sample data

### 4. **OR/CR Document (Blade Template): orcr-document.blade.php**
- Location: `resources/views/documents/orcr-document.blade.php`
- Laravel Blade template for server-rendered OR/CR documents
- Uses dynamic data injection from controller
- Print-friendly styling matching official LTO format
- Includes vehicle details, registration info, owner info, and signatures

### 5. **OR/CR Sample Document (Static): sample-orcr-document.html**
- Location: `public/sample-orcr-document.html`
- Standalone OR/CR document with embedded CSS
- No server rendering required
- Mimics official Land Transportation Office (LTO) format
- Can be printed directly to PDF

## Route Configuration

Added to `routes/web.php`:
```php
Route::get('/document/inspection-preview', [DocumentController::class, 'previewDocument'])->name('document.preview');
Route::get('/document/orcr-preview', [DocumentController::class, 'previewORCR'])->name('document.orcr');
```

## How to Use

### Available Documents

#### 1. Vehicle Inspection Report
**Dynamic (Blade Template):** `http://localhost:8000/document/inspection-preview`
**Static HTML:** `http://localhost:8000/sample-inspection-document.html`

#### 2. OR/CR (Certificate of Registration) - Vehicle Registration Document
**Dynamic (Blade Template):** `http://localhost:8000/document/orcr-preview`
**Static HTML:** `http://localhost:8000/sample-orcr-document.html`

### Option 1: View Dynamic Documents (Server-Rendered)
1. Start your Laravel development server:
   ```bash
   php artisan serve
   ```
2. Navigate to either:
   - Inspection Report: `http://localhost:8000/document/inspection-preview`
   - OR/CR Document: `http://localhost:8000/document/orcr-preview`
3. Document will render with current date and mock data
4. Click "Print / Save as PDF" to save

### Option 2: View Static HTML (No Server Needed)
1. Open in browser:
   - Inspection Report: `http://localhost:8000/sample-inspection-document.html`
   - OR/CR Document: `http://localhost:8000/sample-orcr-document.html`
2. Document displays immediately
3. Click buttons to print or save as PDF

### Option 3: Print to PDF
- Any browser (Chrome, Firefox, Edge):
  1. Open the document URL
  2. Press `Ctrl+P` (or Cmd+P on Mac)
  3. Select "Save as PDF"
  4. Choose location and save

## Document Data Structure

### Vehicle Inspection Report

The inspection document includes:

#### Operator Information
- Name
- Contact Number
- Barangay
- Application ID

#### Vehicle Specifications
- Make & Model
- Plate Number
- Engine Number
- Chassis Number
- TODA Assignment
- Inspection Date

#### Inspection Findings
- Safety Equipment ✓
- Brakes and Steering ✓
- Lights and Reflectors ✓
- Tires and Suspension ✓
- Emissions Test ✓
- Driver License/TODA Docs ✓

#### Additional Sections
- Inspector Notes (Lorem ipsum example)
- Inspector Details
- Signature Areas (2 columns: Inspector & Operator)

### OR/CR (Certificate of Registration) Document

Official vehicle registration document from the Land Transportation Office (LTO).

#### Vehicle Identification Section
- Make/Brand
- Series/Model
- Body Type
- Year Model
- Color
- Engine Number
- Chassis Number
- Serial Number

#### Registration Details
- Plate Number
- Conduction Sticker
- Date of Registration
- Date of Expiration
- Operation Type (Public Utility, Private, Rental)

#### Owner Information
- Owner Name
- Address
- Contact Number

#### Additional Features
- Official LTO form header
- Remarks section
- Signature areas (3 columns: Applicant, Examiner, Approving Officer)
- Document ID and issue dates
- "SAMPLE COPY" watermark for demo purposes

## Customizing Data

### For Blade Template (Inspection Report):
Edit `resources/views/documents/inspection-report-html.blade.php`:
```blade
<div class="field-value">{{ $data['vehicle']['make'] }}</div>
```

### For Blade Template (OR/CR Document):
Edit `resources/views/documents/orcr-document.blade.php`:
```blade
<div class="field-value">{{ $data['plate'] }}</div>
```

### For Static HTML:
Edit the respective HTML file in `public/`:
- `public/sample-inspection-document.html`
- `public/sample-orcr-document.html`

Example:
```html
<div class="field-value">Kawasaki Barako 175</div>
```

## Future Enhancements

### 1. PDF Library Integration
Install Laravel PDF package (e.g., `barryvdh/laravel-dompdf`):
```bash
composer require barryvdh/laravel-dompdf
```

Then modify `DocumentController@generateInspectionPDF()`:
```php
public function generateInspectionPDF()
{
    $pdf = PDF::loadView('documents.inspection-report', compact('data'));
    return $pdf->download('inspection-' . $data['application_id'] . '.pdf');
}
```

### 2. Dynamic Data Connection
Connect to database instead of hardcoded mock data:
```php
$application = Application::findOrFail($id);
$data = [
    'application_id' => $application->id,
    'operator_name' => $application->operator_name,
    'vehicle' => [...],
    // ... etc
];
```

### 3. Email Integration
Send inspection reports directly to operators:
```php
Mail::send('documents.inspection-report', compact('data'), function ($mail) {
    $mail->to($operator->email)->subject('Your Inspection Report');
});
```

## Styling Notes

All documents use:
- **Font**: Inter (body), Plus Jakarta Sans (display)
- **Color Scheme**:
  - Primary: #4F5BCB (Indigo)
  - Success: #059669 (Emerald)
  - Warning: #F59E0B (Amber)
  - Text: #1C2340 (Dark Navy)
  - Borders: rgba(79, 91, 203, 0.15)

- **Responsive**: Print-optimized with media queries
- **Page Break**: Configured for A4/Letter format

## Testing Checklist

**Inspection Report:**
- [ ] View Blade template at `/document/inspection-preview`
- [ ] View static HTML at `/sample-inspection-document.html`
- [ ] Verify all fields display correctly
- [ ] Check signature areas render properly

**OR/CR Document:**
- [ ] View Blade template at `/document/orcr-preview`
- [ ] View static HTML at `/sample-orcr-document.html`
- [ ] Verify vehicle details render correctly
- [ ] Check registration details display properly

**Browser & Format:**
- [ ] Print to PDF from browser
- [ ] Test on different browsers (Chrome, Firefox, Safari, Edge)
- [ ] Test on mobile device (responsive)
- [ ] Verify page layout for printing

## Support

For additional document templates or customization, refer to:
- `resources/views/documents/` - All document templates
- `app/Http/Controllers/DocumentController.php` - Document generation logic
- `routes/web.php` - Document routes configuration
