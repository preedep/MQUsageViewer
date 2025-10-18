# Multi-System Chart Feature

## Overview
เพิ่มฟีเจอร์ใหม่ที่ให้ผู้ใช้สามารถเลือกและแสดงข้อมูล TPS ของหลาย system ในกราฟเดียวกันได้ เพื่อเปรียบเทียบประสิทธิภาพระหว่าง systems ต่างๆ

## Features Added

### 1. Multi-System Selection UI
- **Checkbox Toggle**: เพิ่ม "Show All Systems (Multiple Selection)" checkbox
- **System Checkboxes**: แสดงรายการ systems ในรูปแบบ checkboxes เมื่อเปิดใช้งาน
- **Responsive Design**: UI ปรับตัวตามขนาดหน้าจอ
- **Visual Feedback**: แสดงสถานะการเลือกอย่างชัดเจน

### 2. Enhanced Chart Functionality
- **Multi-Dataset Support**: แสดงข้อมูลหลาย systems ในกราฟเดียว
- **Color Coding**: แต่ละ system มีสีเส้นที่แตกต่างกัน
- **Legend**: แสดง legend ระบุ system แต่ละเส้น
- **Improved Tooltips**: แสดงข้อมูลที่ละเอียดขึ้นเมื่อ hover

### 3. Backend Integration
- **Multiple API Calls**: เรียก API แยกสำหรับแต่ละ system
- **Data Aggregation**: รวมข้อมูลจากหลาย systems
- **Error Handling**: จัดการข้อผิดพลาดเมื่อ system ใดไม่มีข้อมูล

## Files Modified

### Frontend Files
1. **`statics/index.html`**
   - เพิ่ม checkbox สำหรับ multi-system mode
   - เพิ่ม container สำหรับ system checkboxes

2. **`statics/css/styles.css`**
   - เพิ่ม styling สำหรับ system checkboxes
   - ปรับปรุง responsive design

3. **`statics/js/scripts.js`**
   - เพิ่ม logic สำหรับ multi-system selection
   - ปรับปรุง `getSearchParams()` method
   - เพิ่ม `generateGraph()` method ที่รองรับ multi-system
   - เพิ่ม `performSearch()` และ `setupAggregateToggle()` methods

4. **`statics/js/chart.js`**
   - เพิ่ม `generateMultiSystemChart()` method
   - เพิ่ม `_processMultiSystemData()` helper method
   - เพิ่ม `displayTpsChart()` method
   - ปรับปรุง error handling และ tooltips

### Test Files
5. **`statics/test_multi_system.html`**
   - ไฟล์ทดสอบฟีเจอร์ multi-system
   - มี mock data และ test cases

## How to Use

### 1. Single System Mode (เดิม)
1. เลือก MQ Function จาก dropdown
2. เลือก System Name จาก dropdown
3. กด "Generate Graph"

### 2. Multi-System Mode (ใหม่)
1. เลือก MQ Function จาก dropdown
2. ✅ เช็ค "Show All Systems (Multiple Selection)"
3. เลือก systems ที่ต้องการเปรียบเทียบ (หลายตัว)
4. กด "Generate Graph"

### 3. Aggregate Mode (เดิม)
1. ✅ เช็ค "All MQ Functions (sum work_total)"
2. กด "Generate Graph"

## Technical Implementation

### Multi-System Chart Generation
```javascript
// ตัวอย่างการใช้งาน
await chartManager.generateMultiSystemChart(
    'chart',                    // container ID
    processedData,              // data object with system names as keys
    ['SYSTEM_A', 'SYSTEM_B'],   // array of system names
    {
        title: 'Multi-System Comparison',
        xLabel: 'Date/Time',
        yLabel: 'TPS'
    }
);
```

### Data Structure
```javascript
// รูปแบบข้อมูลที่ส่งให้ chart
processedData = {
    'SYSTEM_A': [
        { date_time: '2024-01-01T10:00:00Z', trans_per_sec: 150 },
        { date_time: '2024-01-01T11:00:00Z', trans_per_sec: 175 }
    ],
    'SYSTEM_B': [
        { date_time: '2024-01-01T10:00:00Z', trans_per_sec: 120 },
        { date_time: '2024-01-01T11:00:00Z', trans_per_sec: 140 }
    ]
}
```

## Color Scheme
กราฟใช้สีที่แตกต่างกันสำหรับแต่ละ system:
- System 1: Blue (`rgb(54, 162, 235)`)
- System 2: Red (`rgb(255, 99, 132)`)
- System 3: Teal (`rgb(75, 192, 192)`)
- System 4: Orange (`rgb(255, 159, 64)`)
- System 5: Purple (`rgb(153, 102, 255)`)
- System 6: Yellow (`rgb(255, 205, 86)`)
- System 7: Grey (`rgb(201, 203, 207)`)

## Error Handling

### Validation
- ตรวจสอบว่าเลือก MQ Function แล้ว
- ตรวจสอบว่าเลือก systems แล้วใน multi-system mode
- แสดง error message ที่เข้าใจง่าย

### API Errors
- จัดการกรณีที่ system ใดไม่มีข้อมูล
- แสดงข้อมูลของ systems ที่มีข้อมูลเท่านั้น
- Log errors ใน console สำหรับ debugging

## Testing

### Manual Testing
1. เปิด `test_multi_system.html` ในเบราว์เซอร์
2. ทดสอบ multi-system chart generation
3. ทดสอบ single system chart generation
4. ตรวจสอบ responsive design

### Test Cases
- ✅ เลือก 1 system
- ✅ เลือก 2-3 systems
- ✅ เลือก systems ทั้งหมด
- ✅ ไม่เลือก system ใดเลย (error case)
- ✅ Switch ระหว่าง single และ multi mode

## Performance Considerations

### Optimization
- ใช้ `animation: { duration: 0 }` เพื่อปิด animation สำหรับข้อมูลขนาดใหญ่
- จำกัดจำนวน data points ที่แสดงใน tooltip
- ใช้ `pointRadius: 2` เพื่อลดขนาดจุดบนกราฟ

### Memory Management
- ทำลาย chart instance เก่าก่อนสร้างใหม่
- Clear event listeners เมื่อไม่ใช้งาน

## Browser Compatibility
- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

## Future Enhancements
- [ ] Export chart เป็น PNG/PDF
- [ ] Save/Load chart configurations
- [ ] Real-time data updates
- [ ] Custom color selection
- [ ] Data filtering by date range per system
- [ ] Statistical analysis (average, peak, etc.)

## Troubleshooting

### Common Issues
1. **Chart ไม่แสดง**: ตรวจสอบ console errors และ network requests
2. **สีซ้ำกัน**: เกิดขึ้นเมื่อเลือก systems มากกว่า 7 ตัว
3. **Performance ช้า**: ลดจำนวน data points หรือ systems

### Debug Mode
เปิด browser developer tools และดู console logs:
```javascript
// เปิด debug mode
localStorage.setItem('debug', 'true');
```
