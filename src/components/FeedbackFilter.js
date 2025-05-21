import React, { useState } from 'react';
import axios from 'axios';
import moment from 'moment';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

const FeedbackFilter = () => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [callCenter, setCallCenter] = useState('');

  const downloadXLSX = async (headers, rows) => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Feedback');

    sheet.addRow(headers);
    rows.forEach(row => sheet.addRow(row));

    sheet.eachRow(row => {
      row.eachCell(cell => {
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `feedback-${callCenter}-${startDate}_to_${endDate}.xlsx`);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!startDate || !endDate || !callCenter) {
      alert("Please select all fields.");
      return;
    }

    const sheetId = '1IopPDIZ2ZoU25bMZrOLUoX-8BrIKH8-8TyWEY4DFIQA';
    const tabName = '2025';
    const apiKey = process.env.REACT_APP_SHEETS_API_KEY;
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${tabName}!A:L?key=${apiKey}`;

    try {
      const res = await axios.get(url);
      const rows = res.data.values;
      const rawHeaders = rows[0];
      const headers = rawHeaders.map(h => h.trim());
      const data = rows.slice(1);

      console.log("✅ Headers:", headers);
      console.log("✅ Raw data:", data);

      const dateIndex = headers.findIndex(h => h.toLowerCase().includes('timestamp'));
      const centerIndex = headers.findIndex(h => h.toLowerCase().includes('call center'));

      if (dateIndex === -1 || centerIndex === -1) {
        console.log("Matching indices:", { dateIndex, centerIndex });
        alert("❌ 'Timestamp' or 'Call Center' column not found. Please verify column headers.");
        return;
      }

      const filtered = data.filter(row => {
        const rawDate = row[dateIndex];
        const rowCenter = row[centerIndex]?.trim().toLowerCase();
        const selectedCenter = callCenter.trim().toLowerCase();
        const parsedDate = moment(new Date(rawDate));
        const isValidDate = parsedDate.isValid();

        const isWithinRange = isValidDate &&
          parsedDate.isBetween(moment(startDate), moment(endDate), 'days', '[]');
        const matchesCenter = rowCenter === selectedCenter;

        // Debug each row:
        console.log({
          rawDate,
          parsedDate: parsedDate.format('YYYY-MM-DD'),
          isValidDate,
          isWithinRange,
          rowCenter,
          selectedCenter,
          matchesCenter
        });

        return isWithinRange && matchesCenter;
      });

      console.log("✅ Filtered results:", filtered);

      if (filtered.length === 0) {
        alert("⚠️ No feedback found in the selected range.");
        return;
      }

      const cellStyle = `
        border: 1px solid black;
        padding: 6px;
        max-width: 200px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        text-align: center;
      `;

      let html = `<table style="border-collapse: collapse; width: 100%;">`;
      html += `<thead><tr>${headers.map(h => `<th style="${cellStyle}">${h}</th>`).join('')}</tr></thead>`;
      html += `<tbody>`;
      filtered.forEach(row => {
        html += `<tr>${headers.map((_, idx) =>
          `<td style="${cellStyle}">${row[idx] || ''}</td>`
        ).join('')}</tr>`;
      });
      html += `</tbody></table>`;

      let plainText = headers.join('\t') + '\n';
      filtered.forEach(row => {
        plainText += headers.map((_, idx) => row[idx] || '').join('\t') + '\n';
      });

      if (navigator.clipboard && window.ClipboardItem) {
        await navigator.clipboard.write([
          new ClipboardItem({
            "text/html": new Blob([html], { type: "text/html" }),
            "text/plain": new Blob([plainText], { type: "text/plain" })
          })
        ]);
        alert(`✅ ${filtered.length} feedback entries copied!`);
      } else {
        await navigator.clipboard.writeText(plainText);
        alert(`✅ ${filtered.length} entries copied (plain text only).`);
      }

      await downloadXLSX(headers, filtered);

    } catch (err) {
      console.error("❌ Error fetching/parsing data:", err);
      alert('❌ Failed to fetch or process data.');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="row mb-3">
        <div className="col-md-4">
          <label className="form-label">Start Date</label>
          <input
            type="date"
            className="form-control"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
          />
        </div>
        <div className="col-md-4">
          <label className="form-label">End Date</label>
          <input
            type="date"
            className="form-control"
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
          />
        </div>
        <div className="col-md-4">
          <label className="form-label">Call Center</label>
          <select
            className="form-select"
            value={callCenter}
            onChange={e => setCallCenter(e.target.value)}
          >
            <option value="">Select</option>
            <option value="TEP">TEP (Tuesday)</option>
            <option value="Buwelo">Buwelo (Wednesday)</option>
            <option value="WNS">WNS (Thursday)</option>
            <option value="Concentrix">Concentrix (Friday)</option>
          </select>
        </div>
      </div>
      <button type="submit" className="btn btn-success">📋 Copy + 📥 Download XLSX</button>
    </form>
  );
};

export default FeedbackFilter;
