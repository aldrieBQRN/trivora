# TMODashboard Styling - Quick Reference Guide

## 🎨 Icon Color Definitions

### GRADIENT Pattern (Bold/Saturated)
```css
/* Indigo Gradient */
background: linear-gradient(135deg, #4F5BCB 0%, #6675A8 100%);
color: #FFFFFF;

/* Emerald Gradient */
background: linear-gradient(135deg, #059669 0%, #047857 100%);
color: #FFFFFF;

/* Amber Gradient */
background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%);
color: #FFFFFF;

/* Rose Gradient */
background: linear-gradient(135deg, #DC2626 0%, #B91C1C 100%);
color: #FFFFFF;

/* Red Gradient (TricycleDetails) */
background: linear-gradient(135deg, #DC2626 0%, #B91C1C 100%);
color: #FFFFFF;
```

**Used by:** UnitRegistry, Index, TricycleDetails

---

### TINTED Pattern (Subtle/Muted)
```css
/* Indigo Tinted */
background: rgba(79, 91, 203, 0.10);     /* #4F5BCB @ 10% */
color: #2E3A9E;

/* Emerald Tinted */
background: rgba(5, 150, 105, 0.09);     /* #059669 @ 9% */
color: #065F46;

/* Amber Tinted */
background: rgba(217, 119, 6, 0.09);     /* #D97706 @ 9% */
color: #78350F;

/* Rose Tinted */
background: rgba(220, 38, 38, 0.08);     /* #DC2626 @ 8% */
color: #991B1B;

/* Slate Tinted */
background: rgba(28, 35, 64, 0.06);      /* #1C2340 @ 6% */
color: #3A4570;
```

**Used by:** DocumentQueue, PhysicalQueue, Violations

---

## 📋 Icon Styles by Page

### UnitRegistry.jsx
```css
.tr-stat-indigo  { background: linear-gradient(135deg, #4F5BCB 0%, #6675A8 100%); color: #FFFFFF; }
.tr-stat-emerald { background: linear-gradient(135deg, #059669 0%, #047857 100%); color: #FFFFFF; }
.tr-stat-amber   { background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%);  color: #FFFFFF; }
```

### DocumentQueue.jsx
```css
.dq-stat-indigo { background: rgba(79,91,203,.10);  color: #2E3A9E; }
.dq-stat-amber  { background: rgba(217,119,6,.09); color: #78350F; }
.dq-stat-slate  { background: rgba(28,35,64,.06);  color: #3A4570; }
```

### PhysicalQueue.jsx
```css
.pq-stat-indigo  { background: rgba(79,91,203,.10);  color: #2E3A9E; }
.pq-stat-emerald { background: rgba(5,150,105,.09); color: #065F46; }
.pq-stat-amber   { background: rgba(217,119,6,.09); color: #78350F; }
```

### Violations.jsx ⭐ Rose Theme
```css
.vr-stat-rose    { background: rgba(220,38,38,.08);  color: #991B1B; }
.vr-stat-amber   { background: rgba(217,119,6,.09);  color: #78350F; }
.vr-stat-emerald { background: rgba(5,150,105,.09);  color: #065F46; }
```

### Index.jsx (Dashboard)
```css
.td-kpi-icon-stone   { background: linear-gradient(135deg, #4F5BCB 0%, #6675A8 100%);  color: #FFFFFF; }
.td-kpi-icon-rose    { background: linear-gradient(135deg, #DC2626 0%, #B91C1C 100%);  color: #FFFFFF; }
.td-kpi-icon-emerald { background: linear-gradient(135deg, #059669 0%, #047857 100%);  color: #FFFFFF; }
.td-kpi-icon-amber   { background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%);  color: #FFFFFF; }
```

### TricycleDetails.jsx
```css
.td-metric-indigo  { background: linear-gradient(135deg, #4F5BCB 0%, #6675A8 100%);  color: #FFFFFF; }
.td-metric-emerald { background: linear-gradient(135deg, #059669 0%, #047857 100%);  color: #FFFFFF; }
.td-metric-amber   { background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%);  color: #FFFFFF; }
.td-metric-red     { background: linear-gradient(135deg, #DC2626 0%, #B91C1C 100%);  color: #FFFFFF; }
```

---

## 🗂️ Stat Container Styles

### Basic Stat Card
All pages use the same base structure:

```css
.{prefix}-stat {
  background: #FFFFFF;
  border: 1px solid rgba(28,35,64,.08);
  border-radius: 14px;
  padding: 20px 22px;
  display: flex;
  align-items: flex-start;
  gap: 16px;
  position: relative;
  overflow: hidden;
  transition: box-shadow .2s, border-color .2s;
}

.{prefix}-stat:hover {
  border-color: rgba(28,35,64,.14);
  box-shadow: 0 4px 20px rgba(28,35,64,.07);
}

/* Decorative background circle */
.{prefix}-stat::after {
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

/* Top accent border */
.{prefix}-stat-accent {
  border-top: 2.5px solid #4F5BCB;
}
```

### Icon Container
```css
.{prefix}-stat-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
```

### Typography
```css
.{prefix}-stat-val {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 28px;
  font-weight: 800;
  color: #1C2340;
  line-height: 1;
}

.{prefix}-stat-lbl {
  font-family: 'DM Sans', sans-serif;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: .13em;
  text-transform: uppercase;
  color: #8A96BC;
  margin-top: 5px;
}
```

---

## 📐 Grid Layouts

### 3-Column Grid (List Pages)
Used by: UnitRegistry, DocumentQueue, PhysicalQueue, Violations

```css
.{prefix}-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
  margin-bottom: 32px;
}

@media (max-width: 768px) {
  .{prefix}-stats {
    grid-template-columns: 1fr;
  }
}
```

### 4-Column Grid (Dashboard)
Used by: Index

```css
.td-kpi-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
  margin-bottom: 32px;
}

@media (max-width: 1280px) {
  .td-kpi-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 640px) {
  .td-kpi-grid {
    grid-template-columns: 1fr;
  }
}
```

### 4-Column Metric Grid (Detail Pages)
Used by: TricycleDetails

```css
.td-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 32px;
}

@media (max-width: 1024px) {
  .td-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 640px) {
  .td-grid {
    grid-template-columns: 1fr;
  }
}
```

---

## 🌐 Full-Width Layout

### Model: Violations.jsx
```css
.vr-root {
  font-family: 'Inter', sans-serif;
  color: #1C2340;
  max-width: 1500px;      ← Maximum width constraint
  margin: 0 auto;         ← Center alignment
  padding-bottom: 48px;   ← Bottom breathing room
}
```

### Should be applied to all list pages:
- UnitRegistry.jsx (currently missing)
- DocumentQueue.jsx (currently missing)
- PhysicalQueue.jsx (currently missing)
- Index.jsx (currently missing)

---

## 🎯 Index vs. TricycleDetails - NAMING CONFLICT

⚠️ **CRITICAL ISSUE**: Both use `td-*` prefix

### Index.jsx Classes
```css
.td-root { /* dashboard root */ }
.td-kpi-grid { /* 4-col stat grid */ }
.td-kpi { /* stat card */ }
.td-kpi-icon { /* stat icon */ }
.td-kpi-icon-{color} { /* colored icon */ }
```

### TricycleDetails.jsx Classes
```css
.td-root { /* detail page root */ } ← SAME!
.td-grid { /* 4-col metric grid */ }
.td-metric-card { /* metric card */ }
.td-metric-icon { /* metric icon */ }
.td-metric-{color} { /* colored icon */ } ← SAME PREFIX!
```

**Solution:** Rename Index.jsx to use `tdb-*`:
```css
/* Current (conflicts) */
.td-root, .td-kpi-grid, .td-kpi, .td-kpi-icon, .td-kpi-icon-{color}

/* Should be */
.tdb-root, .tdb-kpi-grid, .tdb-kpi, .tdb-kpi-icon, .tdb-kpi-icon-{color}
```

---

## 📊 Stat Card Component Template

All pages follow this HTML structure:

```jsx
<div className="PREFIX-stat PREFIX-stat-accent">
  <div className="PREFIX-stat-icon PREFIX-stat-{colorName}">
    <IconComponent size={20} strokeWidth={1.5} />
  </div>
  <div>
    <div className="PREFIX-stat-val">42</div>
    <div className="PREFIX-stat-lbl">Label Text</div>
  </div>
</div>
```

Replace:
- `PREFIX` with page prefix (tr, dq, pq, vr, td, etc.)
- `{colorName}` with color (indigo, emerald, amber, rose, slate, etc.)
- `IconComponent` with actual icon from lucide-react

---

## 🎨 Color System Reference

### Primary Accent
```
Indigo: #4F5BCB   (for most pages)
Rose:   #DC2626   (for Violations page)
```

### Secondary Colors
```
Emerald:  #059669, #047857
Amber:    #F59E0B, #D97706
Rose:     #DC2626, #B91C1C (already listed as primary for Violations)
Slate:    #3A4570
```

### Text/Background
```
Text Primary:     #1C2340
Text Secondary:   #8A96BC
Background:       #FFFFFF
```

---

## ✅ Consistency Checklist

- [ ] Icon container: 40x40px, border-radius: 10px
- [ ] Icon gap from content: 16px
- [ ] Card padding: 20px 22px
- [ ] Card border-radius: 14px
- [ ] Value color: #1C2340
- [ ] Label color: #8A96BC
- [ ] Value font-size: 28px
- [ ] Label font-size: 9px
- [ ] All cards have ::after pseudo-element
- [ ] All cards have :hover state
- [ ] Accent border-top: 2.5px solid (primary color)

---

## 🔄 Migration Guide

### To standardize a page:

1. **Check prefix** - Ensure unique prefix (not `td-*` if both Index+TricycleDetails exist)

2. **Add Full-Width if List Page:**
   ```css
   .{prefix}-root {
     max-width: 1500px;
     margin: 0 auto;
     padding-bottom: 48px;
   }
   ```

3. **Choose Icon Pattern:**
   - List/Queue → Tinted Background
   - Dashboard/Detail → Gradient

4. **Verify Grid:**
   - List pages → 3 columns
   - Dashboard → 4 columns
   - Add responsive breakpoints

5. **Check Colors:**
   - Use accent color in eyebrow, borders
   - Rose for Violations (red theme)
   - Indigo for everything else

---

## 📚 File-to-CSS Quick Map

| File | Prefix | Icon Pattern | Grid | Full-Width |
|------|--------|-------------|------|-----------|
| UnitRegistry.jsx | `tr-*` | Gradient | 3-col | ❌ |
| DocumentQueue.jsx | `dq-*` | Tinted | 3-col | ❌ |
| PhysicalQueue.jsx | `pq-*` | Tinted | 3-col | ❌ |
| Violations.jsx | `vr-*` | Tinted | 3-col | ✅ |
| Index.jsx | `td-*` | Gradient | 4-col | ❌ |
| TricycleDetails.jsx | `td-*` | Gradient | 4-col | ✅ |

---

## 🚀 Next Steps

1. **Immediate:** Rename Index.jsx prefix (5 min)
2. **Short-term:** Add full-width to list pages (15 min)
3. **Medium-term:** Create StatCard component (1 hour)
4. **Long-term:** Create design system documentation (2 hours)

---

**Last Updated:** April 17, 2026
