# 📥 Add Export Buttons to All Pages

## எங்கு add செய்ய வேண்டும்:

### 1. Raw Materials (app/raw-materials/page.tsx)
```typescript
import ExportButton from '@/components/ExportButton'

// Add near search/filter section:
<ExportButton 
  data={materials} 
  filename="raw_materials"
  label="Download"
/>
```

### 2. Essential Items (app/essential-items/page.tsx)
```typescript
import ExportButton from '@/components/ExportButton'

<ExportButton 
  data={essentialItems} 
  filename="essential_items"
  label="Download"
/>
```

### 3. Purchases (app/purchases/page.tsx)
```typescript
import ExportButton from '@/components/ExportButton'

<ExportButton 
  data={purchases} 
  filename="purchases"
  label="Download"
/>
```

### 4. Recipes (app/recipes/page.tsx)
```typescript
import ExportButton from '@/components/ExportButton'

<ExportButton 
  data={recipes} 
  filename="recipes"
  label="Download"
/>
```

### 5. Production (app/production/page.tsx)
```typescript
import ExportButton from '@/components/ExportButton'

<ExportButton 
  data={productionLogs} 
  filename="production_logs"
  label="Download"
/>
```

### 6. Cost Reports (app/reports/page.tsx)
```typescript
import ExportButton from '@/components/ExportButton'

<ExportButton 
  data={reportData} 
  filename="cost_report"
  label="Download Report"
/>
```

### 7. Deleted Items (app/deleted-items/page.tsx)
```typescript
import ExportButton from '@/components/ExportButton'

<ExportButton 
  data={deletedItems} 
  filename="deleted_items"
  label="Download"
/>
```

---

## Usage Examples:

### Full Button:
```typescript
<ExportButton 
  data={myData} 
  filename="my_data"
  label="Download"
  variant="button"
/>
```

### Icon Only:
```typescript
<ExportButton 
  data={myData} 
  filename="my_data"
  variant="icon"
/>
```

### Without Data Cleaning:
```typescript
<ExportButton 
  data={myData} 
  filename="my_data"
  cleanData={false}
/>
```

---

## Features:

✅ 3 export formats:
  - Excel (.xls)
  - CSV (.csv)
  - JSON (.json)

✅ Auto-formatting:
  - Clean column names
  - Format dates
  - Handle special characters
  - Remove internal fields

✅ Filename with date:
  - Example: raw_materials_2025-01-04.csv

✅ No data warning:
  - Shows alert if no data to export

---

## Example Placement:

```typescript
<div className="flex justify-between items-center mb-6">
  <h2 className="text-2xl font-bold">Raw Materials</h2>
  
  <div className="flex gap-2">
    <button className="...">Add Material</button>
    <ExportButton data={materials} filename="raw_materials" />
  </div>
</div>
```

---

All pages ready for export functionality! 📥
