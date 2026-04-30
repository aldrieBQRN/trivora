# TMODashboard - Styling Comparison Matrix

## 📊 Visual Styling Comparison

### Each Page at a Glance

```
┌─────────────────────────────────────────────────────────────────────┐
│ FILE: UnitRegistry.jsx                                              │
├─────────────────────────────────────────────────────────────────────┤
│ Icon Styling  │ GRADIENT (Full color)                              │
│ Grid Layout   │ 3 columns                                          │
│ Full-Width    │ ❌ NO                                              │
│ Colors        │ Indigo (✅), Emerald (✅), Amber (✅)              │
│ CSS Selector  │ .tr-stat-indigo, .tr-stat-emerald, .tr-stat-amber│
│ Context       │ Tricycle/Unit listing page                         │
├─────────────────────────────────────────────────────────────────────┤
│ ICON EXAMPLES:                                                      │
│                                                                     │
│ ┌─────────┐  ┌─────────┐  ┌─────────┐                            │
│ │  [◉]    │  │  [◉]    │  │  [◉]    │                            │
│ │ 1,245   │  │  856    │  │  92     │                            │
│ │ UNITS   │  │ ACTIVE  │  │ PENDING │                            │
│ └─────────┘  └─────────┘  └─────────┘                            │
│   Indigo       Emerald      Amber                                  │
│  Gradient      Gradient     Gradient                               │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ FILE: DocumentQueue.jsx                                             │
├─────────────────────────────────────────────────────────────────────┤
│ Icon Styling  │ TINTED BACKGROUND (Subtle)                        │
│ Grid Layout   │ 3 columns                                          │
│ Full-Width    │ ❌ NO                                              │
│ Colors        │ Indigo (✅), Amber (✅), Slate (✅)               │
│ CSS Selector  │ .dq-stat-indigo, .dq-stat-amber, .dq-stat-slate  │
│ Context       │ Document queue list                                │
├─────────────────────────────────────────────────────────────────────┤
│ ICON EXAMPLES:                                                      │
│                                                                     │
│ ┌─────────┐  ┌─────────┐  ┌─────────┐                            │
│ │  [◉]    │  │  [◉]    │  │  [◉]    │                            │
│ │   34    │  │   12    │  │   5     │                            │
│ │ PENDING │  │ IN REVIEW│  │ RETURNED│                            │
│ └─────────┘  └─────────┘  └─────────┘                            │
│   Indigo      Amber (pale)   Slate (pale)                         │
│   Tinted      Tinted         Tinted                                │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ FILE: PhysicalQueue.jsx                                             │
├─────────────────────────────────────────────────────────────────────┤
│ Icon Styling  │ TINTED BACKGROUND (Subtle)                        │
│ Grid Layout   │ 3 columns                                          │
│ Full-Width    │ ❌ NO                                              │
│ Colors        │ Indigo (✅), Emerald (✅), Amber (✅)             │
│ CSS Selector  │ .pq-stat-indigo, .pq-stat-emerald, .pq-stat-amber│
│ Context       │ Physical inspection queue                          │
├─────────────────────────────────────────────────────────────────────┤
│ ICON EXAMPLES:                                                      │
│                                                                     │
│ ┌─────────┐  ┌─────────┐  ┌─────────┐                            │
│ │  [◉]    │  │  [◉]    │  │  [◉]    │                            │
│ │   28    │  │   19    │  │   3     │                            │
│ │ PENDING │  │ PASSED  │  │ FAILED  │                            │
│ └─────────┘  └─────────┘  └─────────┘                            │
│   Indigo      Emerald       Amber                                  │
│   Tinted      Tinted (pale) Tinted (pale)                         │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ FILE: Violations.jsx ⭐ DIFFERENT COLOR SCHEME                      │
├─────────────────────────────────────────────────────────────────────┤
│ Icon Styling  │ TINTED BACKGROUND (Subtle)                        │
│ Grid Layout   │ 3 columns                                          │
│ Full-Width    │ ✅ YES (max-width: 1500px)                        │
│ Colors        │ Rose (✅), Amber (✅), Emerald (✅)               │
│ CSS Selector  │ .vr-stat-rose, .vr-stat-amber, .vr-stat-emerald │
│ Context       │ Violation records (red theme!)                     │
├─────────────────────────────────────────────────────────────────────┤
│ ICON EXAMPLES:                                                      │
│                                                                     │
│ ┌─────────┐  ┌─────────┐  ┌─────────┐                            │
│ │  [◉]    │  │  [◉]    │  │  [◉]    │                            │
│ │   42    │  │   15    │  │   8     │                            │
│ │ TOTAL   │  │ PENDING │  │ SETTLED │                            │
│ └─────────┘  └─────────┘  └─────────┘                            │
│  Rose (pale)  Amber (pale) Emerald (pale)                         │
│  Tinted       Tinted       Tinted                                  │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ FILE: Index.jsx (TMO Dashboard)  ⚠️ NAMING CONFLICT: uses td-*     │
├─────────────────────────────────────────────────────────────────────┤
│ Icon Styling  │ GRADIENT (Full color)                              │
│ Grid Layout   │ 4 columns (responsive: 2 → 1)                    │
│ Full-Width    │ ❌ NO                                              │
│ Colors        │ Stone/Indigo (✅), Rose (✅), Emerald (✅), Amber │
│ CSS Selector  │ .td-kpi-icon-{stone,rose,emerald,amber}          │
│ Context       │ Main dashboard KPI display                         │
├─────────────────────────────────────────────────────────────────────┤
│ ICON EXAMPLES:                                                      │
│                                                                     │
│ ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐          │
│ │  [◉]     │  │  [◉]     │  │  [◉]     │  │  [◉]     │          │
│ │  2,341   │  │    18    │  │  1,256   │  │    47    │          │
│ │ TRICYLES │  │ VIOLATIONS│  │ OPERATORS│  │ REPORTS  │          │
│ └──────────┘  └──────────┘  └──────────┘  └──────────┘          │
│  Indigo Grad   Rose Grad        Emerald Grad  Amber Grad         │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ FILE: TricycleDetails.jsx  ⚠️ NAMING CONFLICT: uses td-*           │
├─────────────────────────────────────────────────────────────────────┤
│ Icon Styling  │ GRADIENT (Full color)                              │
│ Grid Layout   │ 4 columns (responsive: 2 → 1)                    │
│ Full-Width    │ ✅ YES (max-width: 1500px)                        │
│ Colors        │ Indigo (✅), Emerald (✅), Amber (✅), Red (✅)    │
│ CSS Selector  │ .td-metric-{indigo,emerald,amber,red}            │
│ Context       │ Detailed tricycle metrics view                     │
├─────────────────────────────────────────────────────────────────────┤
│ ICON EXAMPLES:                                                      │
│                                                                     │
│ ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐          │
│ │  [◉]     │  │  [◉]     │  │  [◉]     │  │  [◉]     │          │
│ │  3.2 yrs │  │   42     │  │  98  km  │  │    7     │          │
│ │   AGE    │  │ DOC SCORE│  │ DISTANCE │  │ DEFECTS  │          │
│ └──────────┘  └──────────┘  └──────────┘  └──────────┘          │
│  Indigo Grad   Emerald Grad    Amber Grad   Red Grad            │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 🎨 Color Comparison by Page

### Color Palette Distribution

```
                    Indigo  Emerald  Amber  Rose  Red   Slate
UnitRegistry        ✅      ✅       ✅     —     —     —
DocumentQueue       ✅      —        ✅     —     —     ✅
PhysicalQueue       ✅      ✅       ✅     —     —     —
Violations.jsx      —       ✅       ✅     ✅    —     —      ⭐ Rose Theme!
Index.jsx           ✅*     ✅       ✅     ✅    —     —      *called "Stone"
TricycleDetails     ✅      ✅       ✅     —     ✅    —
```

**Note:** Rose/Red reserved for negative/error states and Violations page

---

## 🎯 Icon Styling Distribution

### Gradient vs. Tinted Comparison

```
GRADIENT (Bold/Saturated)
├─ UnitRegistry .................. 3 colors
├─ Index Dashboard ............... 4 colors
└─ TricycleDetails ............... 4 colors

TINTED (Subtle/Muted)
├─ DocumentQueue ............... 3 colors
├─ PhysicalQueue ............... 3 colors
└─ Violations .................. 3 colors
```

**Pattern:** List/Queue pages prefer subtle, detail pages prefer bold

---

## 📐 Layout Comparison

### Full-Width Layout Implementation

```
CURRENT IMPLEMENTATION:

Violations.jsx                      TricycleDetails.jsx
┌─────────────────────────────┐    ┌─────────────────────────────┐
│ .vr-root                    │    │ .td-root                    │
│ max-width: 1500px           │    │ max-width: 1500px           │
│ margin: 0 auto              │    │ margin: 0 auto              │
│ padding-bottom: 48px        │    │ padding-bottom: 48px        │
│                             │    │                             │
│ ┌───────────────────────┐   │    │ ┌───────────────────────┐   │
│ │ Content (max 1500px)  │   │    │ │ Content (max 1500px)  │   │
│ └───────────────────────┘   │    │ └───────────────────────┘   │
└─────────────────────────────┘    └─────────────────────────────┘

MISSING FROM (should be added):
- UnitRegistry.jsx
- DocumentQueue.jsx
- PhysicalQueue.jsx
- Index.jsx
```

---

## ⚠️ Issues Summary

### Issue #1: Prefix Conflict (HIGH SEVERITY)

```
Index.jsx classes              vs.    TricycleDetails.jsx classes
────────────────────                ──────────────────────────────
.td-root                           .td-root              ← CONFLICT!
.td-kpi-grid                       .td-grid
.td-kpi                            .td-metric-card
.td-kpi-icon                       .td-metric-icon
.td-kpi-icon-stone  ┐              .td-metric-indigo ┐
.td-kpi-icon-rose   │ Uses         .td-metric-emerald│ Uses
.td-kpi-icon-emerald│ Gradients    .td-metric-amber  │ Gradients
.td-kpi-icon-amber  │              .td-metric-red    │
                    ┘                                ┘
```

**Risk:** CSS cascade conflicts, unexpected styling

### Issue #2: Icon Style Inconsistency (MEDIUM SEVERITY)

```
Type: List/Queue Pages                Type: Dashboard/Detail Pages
────────────────────────────────      ──────────────────────────
DocumentQueue .... Tinted             UnitRegistry ...... Gradient
PhysicalQueue .... Tinted             Index ............. Gradient
Violations ....... Tinted             TricycleDetails .... Gradient

Result: Same data type (KPIs) displayed differently depending on page
```

### Issue #3: Missing Full-Width Layout (LOW SEVERITY)

```
✅ HAS:                              ❌ MISSING:
──────────────────                  ────────────────
Violations.jsx                       UnitRegistry.jsx
TricycleDetails.jsx                  DocumentQueue.jsx
                                     PhysicalQueue.jsx
                                     Index.jsx

Should be applied to all list/dashboard pages
```

---

## 🔧 Quick Fix Checklist

### High Priority
- [ ] Rename Index.jsx prefix from `td-*` to `tdb-*`
  ```
  Files to update: 1 (Index.jsx)
  CSS rules to rename: ~20
  Time: 5 minutes
  ```

### Medium Priority
- [ ] Add full-width layout to all list pages
  ```
  Files to update: 4 (UnitRegistry, DocumentQueue, PhysicalQueue, Index)
  CSS rules to add: 1 block per file
  Time: 10 minutes
  ```

### Low Priority
- [ ] Standardize icon styling approach
  ```
  Decision: Keep gradient for detail/dashboard, tinted for list/queue
  Document: Add to style guide
  Time: 5 minutes
  ```

---

## 📋 Implementation Verification

### Check List for Each File

- [ ] Unique CSS prefix (not shared with other files)
- [ ] Stat cards if list/dashboard view
- [ ] Full-width layout if list/dashboard view
- [ ] Responsive grid layout (3-col or 4-col)
- [ ] Icon styling (gradient or tinted, consistent within page)
- [ ] Color choices appropriate for context
- [ ] Hover effects on cards
- [ ] Proper spacing (gap: 14-16px)
- [ ] Icon size 40x40px
- [ ] Typography consistent (value: 28px, label: 9px)

---

## 🎯 Decision Matrix

### When choosing icon styling for a new feature:

```
Step 1: Is it a list/queue (shows collection of items)?
        YES → Go to Step 2
        NO  → Go to Step 3

Step 2: Is context focused on status/metrics?
        YES → Use TINTED background (subtle)
        NO  → Use GRADIENT (bold)

Step 3: Is it a detail/dashboard view?
        YES → Use GRADIENT (bold)
        NO  → Use TINTED background (subtle)

Step 4: Select color:
        Primary accent topic → Indigo/Stone
        Error/Alert → Rose/Red
        Success → Emerald
        Warning → Amber
        Neutral → Slate
```

---

## 📊 Metrics by Page Type

| Page Type | Count | Icon Style | Grid | Full-Width | Prefix |
|-----------|-------|-----------|------|-----------|--------|
| List Pages | 4 | Mixed | 3-col | 1/4 | ✓ Unique |
| Dashboard | 1 | Gradient | 4-col | 0/1 | ⚠️ Conflict |
| Detail Pages | 3 | N/A | N/A | 1/1 | ⚠️ Conflict |

---

## 🚀 Next Steps

1. **Today:** Document findings (✅ DONE)
2. **Tomorrow:** Rename Index.jsx prefix
3. **This Week:** Add full-width to list pages
4. **Next Sprint:** Create StatCard component
5. **Design System:** Formalize guidelines

---

**Visual Comparison Matrix | Version 1.0 | Updated: April 17, 2026**
