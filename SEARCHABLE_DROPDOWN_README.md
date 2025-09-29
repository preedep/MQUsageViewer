# Searchable Dropdown Component

## Overview
เราได้สร้าง SearchableSelect component ที่ช่วยให้ผู้ใช้สามารถพิมพ์เพื่อ filter รายการใน dropdown ได้ ซึ่งจะช่วยปรับปรุง UX ให้ดีขึ้นมาก โดยเฉพาะเมื่อมีรายการเยอะ

## Features
- **Type to Search**: พิมพ์เพื่อค้นหาและ filter รายการ
- **Keyboard Navigation**: ใช้ลูกศรขึ้น/ลง, Enter, Escape
- **Click Selection**: คลิกเพื่อเลือกรายการ
- **Loading State**: แสดงสถานะ loading เมื่อกำลังโหลดข้อมูล
- **Error Handling**: จัดการ error และแสดงข้อความที่เหมาะสม
- **Responsive Design**: ทำงานได้ดีในทุกขนาดหน้าจอ

## Files Created/Modified

### 1. `js/searchable-select.js` (ใหม่)
SearchableSelect class ที่มี methods หลัก:
- `setData(data)` - ตั้งค่าข้อมูลสำหรับ dropdown
- `setValue(value)` - เลือกค่าโดย value
- `getValue()` - ดึงค่าที่เลือก
- `clear()` - ล้างการเลือก
- `setLoading(isLoading)` - ตั้งค่าสถานะ loading
- `disable()/enable()` - เปิด/ปิดการใช้งาน

### 2. `css/styles.css` (แก้ไข)
เพิ่ม CSS classes:
- `.searchable-select` - container หลัก
- `.dropdown-list` - รายการ dropdown
- `.dropdown-item` - แต่ละรายการ
- `.dropdown-arrow` - ลูกศร dropdown

### 3. `index.html` (แก้ไข)
- เพิ่ม script tag สำหรับ searchable-select.js
- แทนที่ `<select>` elements ด้วย `<div>` containers

### 4. `js/scripts.js` (แก้ไข)
- เพิ่ม SearchableSelect instances
- ปรับปรุง methods ให้ใช้กับ SearchableSelect
- อัปเดต aggregate mode toggle

## Usage Example

```javascript
// สร้าง SearchableSelect instance
const dropdown = new SearchableSelect('container-id', {
    placeholder: 'Search and select...',
    onSelect: (value, text) => {
        console.log('Selected:', value, text);
    }
});

// ตั้งค่าข้อมูล
dropdown.setData([
    { value: 'val1', text: 'Option 1' },
    { value: 'val2', text: 'Option 2' }
]);

// หรือใช้ array ของ strings
dropdown.setData(['Option 1', 'Option 2']);
```

## Integration with MQ Usage Viewer

### MQ Function Dropdown
```javascript
this.mqFunctionSelect = new SearchableSelect('mq-function-container', {
    placeholder: 'Loading MQ Functions...',
    onSelect: (value, text) => {
        this.loadSystemNames(value);
    }
});
```

### System Name Dropdown
```javascript
this.systemNameSelect = new SearchableSelect('system-name-container', {
    placeholder: 'Select MQ Function First',
});
```

## Benefits

1. **Better UX**: ผู้ใช้สามารถพิมพ์เพื่อค้นหาได้แทนการเลื่อนหารายการ
2. **Performance**: รองรับรายการจำนวนมากได้ดี
3. **Accessibility**: รองรับ keyboard navigation
4. **Responsive**: ทำงานได้ดีในทุกขนาดหน้าจอ
5. **Customizable**: สามารถปรับแต่ง placeholder, callback functions ได้

## Testing

สามารถทดสอบได้โดยเปิด `test-dropdown.html` ที่มี:
- ตัวอย่างการใช้งาน SearchableSelect
- ข้อมูลทดสอบ
- ปุ่มทดสอบ functions ต่างๆ

## Browser Support

- Chrome/Chromium (รองรับเต็มที่)
- Firefox (รองรับเต็มที่)
- Safari (รองรับเต็มที่)
- Edge (รองรับเต็มที่)

## Future Enhancements

- เพิ่ม multi-select support
- เพิ่ม grouping options
- เพิ่ม virtual scrolling สำหรับรายการจำนวนมาก
- เพิ่ม custom styling themes
