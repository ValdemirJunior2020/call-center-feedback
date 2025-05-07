import React, { useState } from 'react';
import axios from 'axios';
import moment from 'moment';

const FeedbackFilter = () => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [callCenter, setCallCenter] = useState('');

  const downloadCSV = (headers, rows) => {
    let csv = headers.join(',') + '\n';
    rows.forEach(row => {
      const line = headers.map((_, idx) => {
        const cell = (row[idx] || '').replace(/"/g, '""');
        return `"${cell}"`;
      }).join(',');
      csv += line + '\n';
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `feedback-${callCenter}-${startDate}_to_${endDate}.csv`;
    link.click();
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
      const headers = rows[0].map(h => h.trim());
      const data = rows.slice(1);

      const dateIndex = headers.indexOf("Date");
      const centerIndex = headers.indexOf("Call Center");

      const filtered = data.filter(row => {
        const rowDate = moment(row[dateIndex], "MM/DD/YYYY");
        const rowCenter = row[centerIndex];
        return (
          rowDate.isBetween(moment(startDate), moment(endDate), 'days', '[]') &&
          rowCenter.trim().toLowerCase() === callCenter.toLowerCase()
        );
      });

      if (filtered.length === 0) {
        alert("No feedback found.");
        return;
      }

      // ✅ HTML table with borders, center text, and ellipsis for long content
      const cellStyle = 'border: 1px solid black; padding: 6px; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; text-align: center;';
      let html = `<table style="border-collapse: collapse; width: 100%;">`;
      html += `<tr>${headers.map(h => `<th style="${cellStyle}">${h}</th>`).join('')}</tr>`;
      filtered.forEach(row => {
        html += `<tr>${headers.map((_, idx) =>
          `<td style="${cellStyle}">${row[idx] || ''}</td>`
        ).join('')}</tr>`;
      });
      html += `</table>`;

      // ✅ Fallback plain text (tab-separated)
      let plainText = headers.join('\t') + '\n';
      filtered.forEach(row => {
        plainText += headers.map((_, idx) => row[idx] || '').join('\t') + '\n';
      });

      // ✅ Copy to clipboard (HTML & plain text)
      if (navigator.clipboard && window.ClipboardItem) {
        await navigator.clipboard.write([
          new ClipboardItem({
            "text/html": new Blob([html], { type: "text/html" }),
            "text/plain": new Blob([plainText], { type: "text/plain" })
          })
        ]);
        alert(`✅ ${filtered.length} entries copied with borders and ellipsis!`);
      } else {
        await navigator.clipboard.writeText(plainText);
        alert(`✅ ${filtered.length} entries copied (plain text only).`);
      }

      // ✅ Download CSV
      downloadCSV(headers, filtered);
    } catch (err) {
      console.error(err);
      alert('❌ Failed to load or copy data.');
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
      <button type="submit" className="btn btn-primary">📋 Copy & 📥 Download</button>
    </form>
  );
};

export default FeedbackFilter;
