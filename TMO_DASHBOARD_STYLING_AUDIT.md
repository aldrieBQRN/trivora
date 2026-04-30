# TMODashboard Comprehensive Styling Audit

**Generated:** April 17, 2026
**Scope:** All pages in `resources/js/Pages/TMODashboard/`

---

## Executive Summary

| Metric | Value |
|--------|-------|
| Total Pages Analyzed | 9 |
| Pages with Stat/KPI Cards | 5 |
| Pages with Full-Width Layout (max-width: 1500px) | 2 |
| Icon Styling Patterns | 2 (Gradient & Tinted Background) |
| Primary Color Palette | 5 colors |
| **Critical Issues Found** | **2** |

---

## 📊 PAGES WITH STAT/KPI CARDS

### 1️⃣ **UnitRegistry.jsx** | Tricycle Registry
**Status:** ✅ Has Stats | ❌ No Full-Width

```
File: resources/js/Pages/TMODashboard/UnitRegistry.jsx
Prefix: tr-*
Grid: 3 columns | gap: 14px | 3-column layout
```

#### Icon Styling - **GRADIENT PATTERN (Full Color)**
```css
.tr-stat-indigo  → linear-gradient(135deg, #4F5BCB, #6675A8) | color: #FFFFFF
.tr-stat-emerald → linear-gradient(135deg, #059669, #047857) | color: #FFFFFF
.tr-stat-amber   → linear-gradient(135deg, #F59E0B, #D97706) | color: #FFFFFF
```

#### Card Structure
```css
.tr-stat {
  background: #FFFFFF;
  border: 1px solid rgba(28,35,64,.08);
  border-radius: 14px;
  padding: 20px 22px;
  gap: 16px;
}

.tr-stat-icon { /* 40x40px */
  width: 40px; height: 40px;
  border-radius: 10px;
  display: flex;
}

.tr-stat-val { font-size: 28px; font-weight: 800; }
.tr-stat-lbl { font-size: 9px; letter-spacing: .13em; }
```

**Accent:** `.tr-stat-accent { border-top: 2.5px solid #4F5BCB; }`

---

### 2️⃣ **DocumentQueue.jsx** | Document Review Queue
**Status:** ✅ Has Stats | ❌ No Full-Width

```
File: resources/js/Pages/TMODashboard/DocumentQueue.jsx
Prefix: dq-*
Grid: 3 columns | gap: 14px
```

#### Icon Styling - **TINTED BACKGROUND PATTERN (Subtle)**
```css
.dq-stat-indigo → rgba(79,91,203,.10)    | color: #2E3A9E
.dq-stat-amber  → rgba(217,119,6,.09)   | color: #78350F
.dq-stat-slate  → rgba(28,35,64,.06)    | color: #3A4570
```

#### Key Difference from UnitRegistry
- Icons use **tinted backgrounds** (10% opacity) instead of gradients
- Text colors are **darker/muted** versions of the color scheme
- More subtle visual presentation for list/queue context

---

### 3️⃣ **PhysicalQueue.jsx** | Physical Inspection Queue
**Status:** ✅ Has Stats | ❌ No Full-Width

```
File: resources/js/Pages/TMODashboard/PhysicalQueue.jsx
Prefix: pq-*
Grid: 3 columns | gap: 14px
```

#### Icon Styling - **TINTED BACKGROUND PATTERN (Subtle)**
```css
.pq-stat-indigo  → rgba(79,91,203,.10)  | color: #2E3A9E
.pq-stat-emerald → rgba(5,150,105,.09) | color: #065F46
.pq-stat-amber   → rgba(217,119,6,.09) | color: #78350F
```

**Note:** Same tinted pattern as DocumentQueue, but with **Emerald** instead of Slate

---

### 4️⃣ **Violations.jsx** | Violation Records
**Status:** ✅ Has Stats | ✅ **Has Full-Width Layout**

```
File: resources/js/Pages/TMODashboard/Violations/Violations.jsx
Prefix: vr-*
Grid: 3 columns | gap: 14px
Layout: max-width: 1500px; margin: 0 auto;
```

#### Icon Styling - **TINTED BACKGROUND PATTERN (Rose-Themed)**
```css
.vr-stat-rose    → rgba(220,38,38,.08)  | color: #991B1B  ⚠️ ROSE instead of Indigo!
.vr-stat-amber   → rgba(217,119,6,.09)  | color: #78350F
.vr-stat-emerald → rgba(5,150,105,.09)  | color: #065F46
```

**Color Accent:** Eyebrow and accent borders are `#DC2626` (red) instead of `#4F5BCB` (indigo)

#### Full-Width Layout CSS
```css
.vr-root {
  font-family: 'Inter', sans-serif;
  color: #1C2340;
  max-width: 1500px;    ← Full-width constraint
  margin: 0 auto;       ← Centered
  padding-bottom: 48px;
}
```

**⭐ This is the model for responsive full-width pages**

---

### 5️⃣ **Index.jsx** | TMO Dashboard
**Status:** ✅ Has Stats | ❌ No Full-Width

```
File: resources/js/Pages/TMODashboard/Index.jsx
Prefix: td-* (⚠️ NAMING CONFLICT - see Issues)
Grid: 4 columns | gap: 14px (responsive: 2→1 on mobile)
```

#### Icon Styling - **GRADIENT PATTERN (Full Color)**
```css
.td-kpi-icon-stone   → linear-gradient(135deg, #4F5BCB, #6675A8) | #FFFFFF
.td-kpi-icon-rose    → linear-gradient(135deg, #DC2626, #B91C1C) | #FFFFFF
.td-kpi-icon-emerald → linear-gradient(135deg, #059669, #047857) | #FFFFFF
.td-kpi-icon-amber   → linear-gradient(135deg, #F59E0B, #D97706) | #FFFFFF
```

#### Card Background (Unique)
```css
.td-kpi {
  background: linear-gradient(135deg, #F9FAFB 0%, #F3F4F9 100%);
  border: 1px solid rgba(79,91,203,.12);
  border-radius: 14px;
  padding: 20px 22px;
}
```

**Note:** KPI cards have gradient backgrounds, unlike other stat cards which have solid white

---

## 💾 DETAIL PAGES (No Stat Cards)

### **DocumentReview.jsx**
- **Prefix:** `dr-*`
- **Layout:** Two-column (sidebar + content)
- **Has Full-Width:** ❌ No
- **Stat Cards:** ❌ No (detail view)

### **PhysicalInspection.jsx**
- **Prefix:** `pi-*`
- **Layout:** Detail form with hero section
- **Has Full-Width:** ❌ No
- **Stat Cards:** ❌ No (checklist/inspection form)

### **ViolationDetails.jsx**
- **Prefix:** `vd-*`
- **Layout:** Two-column with map
- **Has Full-Width:** ❌ No
- **Stat Cards:** ❌ No (detail view with Leaflet map)

---

## 🎨 COLOR PALETTE BREAKDOWN

### Primary Color System

| Color | Hex Codes | Usage |
|-------|-----------|-------|
| **Indigo** | `#4F5BCB`, `#6675A8` | Primary accent, form focus, stat icons |
| **Emerald** | `#059669`, `#047857` | Success, positive metrics, checkmarks |
| **Amber** | `#F59E0B`, `#D97706` | Warning, attn needed, document pending |
| **Rose** | `#DC2626`, `#B91C1C` | Errors, violations, alert states |
| **Slate** | `#3A4570` | Neutral metrics **(DocumentQueue only)** |

### Color Usage by Page

| Page | Colors Used | Pattern |
|------|-------------|---------|
| UnitRegistry | Indigo, Emerald, Amber | Gradient |
| DocumentQueue | Indigo, Amber, Slate | Tinted |
| PhysicalQueue | Indigo, Emerald, Amber | Tinted |
| **Violations** | **Rose, Amber, Emerald** | **Tinted** (Rose theme!) |
| Index (Dashboard) | Indigo, Rose, Emerald, Amber | Gradient |
| TricycleDetails | Indigo, Emerald, Amber, Red | Gradient |

**⚠️ Violations uses Rose instead of Indigo as primary - intentional for red theme**

---

## 📐 LAYOUT COMPARISON

### Full-Width Implementation (Recommended Pattern)

**✅ Violations.jsx Example:**
```css
.vr-root {
  font-family: 'Inter', sans-serif;
  color: #1C2340;
  max-width: 1500px;
  margin: 0 auto;
  padding-bottom: 48px;
}
```

**✅ TricycleDetails.jsx Example:**
```css
.td-root {
  font-family: 'Inter', sans-serif;
  color: #1C2340;
  max-width: 1500px;  ← Standard constraint
  margin: 0 auto;
  padding-bottom: 48px;
}
```

### Pages Missing Full-Width Layout:
- UnitRegistry.jsx
- DocumentQueue.jsx
- PhysicalQueue.jsx
- Index.jsx
- DocumentReview.jsx
- PhysicalInspection.jsx
- ViolationDetails.jsx

---

## 🚨 CRITICAL ISSUES IDENTIFIED

### Issue #1: **PREFIX NAMING CONFLICT - `td-*`**
⚠️ **Severity:** HIGH

**Problem:**
```
✗ Index.jsx uses prefix: td-* (tmo-dashboard)
✗ TricycleDetails.jsx uses prefix: td-* (tricycle-details)
```

**Impact:**
- Both files define `.td-root`, `.td-kpi`, `.td-metric-card` etc.
- CSS rules from one file may override the other
- Risk of unexpected styling when both pages are loaded

**Recommendation:**
Rename Index.jsx prefix from `td-*` to `tdb-*`:
```css
/* Current (Index.jsx) - CONFLICTS */
.td-root { ... }
.td-kpi-grid { ... }

/* Should be (Index.jsx) - NO CONFLICT */
.tdb-root { ... }
.tdb-kpi-grid { ... }
```

---

### Issue #2: **ICON STYLING INCONSISTENCY**
⚠️ **Severity:** MEDIUM

**Problem:**
```
List/Queue Pages: Use TINTED BACKGROUNDS (subtle)
  - DocumentQueue
  - PhysicalQueue
  - Violations

Dashboard/Detail Pages: Use GRADIENTS (bold)
  - UnitRegistry
  - Index
  - TricycleDetails
```

**Impact:**
- Inconsistent visual hierarchy
- Similar page types have different visual weight
- User confusion about importance

**Current Patterns:**

#### Pattern A: Gradient (Full Saturation)
```css
background: linear-gradient(135deg, #4F5BCB 0%, #6675A8 100%);
color: #FFFFFF;
```
Used by: UnitRegistry, Index, TricycleDetails

#### Pattern B: Tinted Background (Subtle)
```css
background: rgba(79,91,203,.10);
color: #2E3A9E;
```
Used by: DocumentQueue, PhysicalQueue, Violations

**Recommendation:**
Create standardized variants:
- `stat-{color}-bold` for high-emphasis KPIs
- `stat-{color}-subtle` for list/queue views

---

## 📋 STANDARDIZATION CHECKLIST

### For List Pages (UnitRegistry, DocumentQueue, PhysicalQueue, Violations):
- [ ] Apply full-width layout (max-width: 1500px) - **Currently missing from 3/4**
- [ ] Standardize stat card grid (all are 3-col, good ✓)
- [ ] Use consistent icon styling (currently mixed patterns)
- [ ] Apply padding-bottom: 48px for breathing room

### For Dashboard/Detail Pages (Index, TricycleDetails):
- [ ] Resolve `td-*` prefix conflict
- [ ] Apply full-width layout if needed
- [ ] Maintain gradient icon styling (currently good ✓)

### For Detail Pages (DocumentReview, PhysicalInspection, ViolationDetails):
- [ ] Consider adding full-width layout for consistency
- [ ] No stat cards needed (correct ✓)

---

## 🎯 ICON SIZING & SPACING

All stat/KPI cards use **consistent icon sizing:**

```css
/* Icon Container */
.stat-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

/* Card Layout */
.stat {
  display: flex;
  align-items: flex-start;
  gap: 16px;  ← Spacing between icon and content
  padding: 20px 22px;
}
```

**Consistent across all pages ✓**

---

## 📐 TYPOGRAPHY

### Stat Card Typography (Consistent Across All Pages)

```css
/* Value (Large Number) */
.stat-val {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 28px;
  font-weight: 800;
  color: #1C2340;
  line-height: 1;
}

/* Label (Description) */
.stat-lbl {
  font-family: 'DM Sans', sans-serif;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: .13em;
  text-transform: uppercase;
  color: #8A96BC;
  margin-top: 5px;
}
```

**All pages follow this pattern ✓**

---

## 🎨 VISUAL DECISION TREE

### Choosing Icon Style for New Pages:

```
Is it a list/queue view?
├─ YES → Use TINTED BACKGROUND pattern
│         └─ rgba(color, 0.08-0.12) background
│         └─ Dark text color (e.g., #2E3A9E)
│
└─ NO → Is it a dashboard/KPI view?
  ├─ YES → Use GRADIENT pattern
  │         └─ linear-gradient(135deg, color1, color2)
  │         └─ White text (#FFFFFF)
  │
  └─ NO → Check context...
```

---

## 📊 STAT CARD STRUCTURE TEMPLATE

All stat cards follow this consistent structure:

```jsx
<div className="PREFIX-stat PREFIX-stat-accent">
  <div className="PREFIX-stat-icon PREFIX-stat-{color}">
    <IconComponent size={20} />
  </div>
  <div>
    <div className="PREFIX-stat-val">42</div>
    <div className="PREFIX-stat-lbl">Label Text</div>
  </div>
</div>
```

**CSS Breakdown:**
```css
.PREFIX-stat {
  background: #FFFFFF;
  border: 1px solid rgba(28,35,64,.08);
  border-radius: 14px;
  padding: 20px 22px;
  display: flex;
  align-items: flex-start;
  gap: 16px;
  position: relative;
  overflow: hidden;
}

.PREFIX-stat:hover {
  border-color: rgba(28,35,64,.14);
  box-shadow: 0 4px 20px rgba(28,35,64,.07);
}

.PREFIX-stat::after {
  content: '';
  position: absolute;
  bottom: 0;
  right: 0;
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(79,91,203,.04) 0%, transparent 70%);
  pointer-events: none;
}

.PREFIX-stat-accent {
  border-top: 2.5px solid #4F5BCB;  /* or Rose/other accent */
}

.PREFIX-stat-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

/* Choose ONE pattern: */
/* Pattern A: Gradient */
.PREFIX-stat-{indigo|emerald|amber|rose} {
  background: linear-gradient(135deg, colorLight 0%, colorDark 100%);
  color: #FFFFFF;
}

/* Pattern B: Tinted */
.PREFIX-stat-{indigo|emerald|amber|rose} {
  background: rgba(colorRgb, 0.10);
  color: #darkTint;
}
```

---

## 🔄 GRID CONFIGURATIONS

### 3-Column Grid (List/Queue Pages)
Used by: UnitRegistry, DocumentQueue, PhysicalQueue, Violations
```css
display: grid;
grid-template-columns: repeat(3, 1fr);
gap: 14px;

@media (max-width: 768px) {
  grid-template-columns: 1fr;
}
```

### 4-Column Grid (Dashboard Page)
Used by: Index
```css
display: grid;
grid-template-columns: repeat(4, 1fr);
gap: 14px;

@media (max-width: 1280px) { grid-template-columns: repeat(2, 1fr); }
@media (max-width: 640px)  { grid-template-columns: 1fr; }
```

### 4-Column Metric Grid (Tricycle Details)
Used by: TricycleDetails
```css
display: grid;
grid-template-columns: repeat(4, 1fr);
gap: 16px;

@media (max-width: 1024px) { grid-template-columns: repeat(2, 1fr); }
@media (max-width: 640px)  { grid-template-columns: 1fr; }
```

---

## 🔗 CROSS-REFERENCE: FILES & STYLES

| File | Prefix | Has Stats | Full-Width | Icon Pattern | Colors |
|------|--------|-----------|-----------|-------------|--------|
| UnitRegistry.jsx | `tr-*` | ✅ | ❌ | Gradient | Indigo, Emerald, Amber |
| DocumentQueue.jsx | `dq-*` | ✅ | ❌ | Tinted | Indigo, Amber, Slate |
| PhysicalQueue.jsx | `pq-*` | ✅ | ❌ | Tinted | Indigo, Emerald, Amber |
| **Violations.jsx** | `vr-*` | ✅ | **✅** | Tinted | Rose, Amber, Emerald |
| **Index.jsx** | **`td-*`** ⚠️ | ✅ | ❌ | Gradient | Indigo, Rose, Emerald, Amber |
| **TricycleDetails.jsx** | **`td-*`** ⚠️ | ✅ | **✅** | Gradient | Indigo, Emerald, Amber, Red |
| DocumentReview.jsx | `dr-*` | ❌ | ❌ | N/A | Standard |
| PhysicalInspection.jsx | `pi-*` | ❌ | ❌ | N/A | Standard |
| ViolationDetails.jsx | `vd-*` | ❌ | ❌ | N/A | Standard |

---

## 📝 SUMMARY & RECOMMENDATIONS

### What's Working Well ✅
1. Consistent card size and spacing (40px icons, 16px gaps)
2. Consistent typography system
3. Hover effects and transitions
4. Color choices are accessible and cohesive
5. Grid layouts are responsive

### What Needs Improvement ⚠️
1. **Prefix duplication** (Index.jsx and TricycleDetails.jsx)
2. **Icon style inconsistency** (mix of gradients vs. tinted backgrounds)
3. **Missing full-width layouts** on most list pages
4. **Rose color override** in Violations page (inconsistent primary accent)

### Quick Wins
- [ ] Rename Index.jsx prefix to `tdb-*` (5 min)
- [ ] Add max-width: 1500px to list pages (15 min)
- [ ] Document icon style guidelines (10 min)
- [ ] Create reusable stat card component (30 min)

---

## 📚 Future-Proofing

### Recommended Component Abstraction:
```jsx
// StatCard.jsx
<StatCard
  value={42}
  label="Total Units"
  icon={<Bike />}
  variant="indigo"     /* Chooses color */
  style="gradient"     /* or "tinted" */
/>
```

This would:
- Eliminate CSS duplication
- Enforce consistency
- Make refactoring easier
- Support dark mode transition

---

**Document Version:** 1.0
**Last Updated:** April 17, 2026
**Audit Scope:** Complete TMODashboard folder structure
