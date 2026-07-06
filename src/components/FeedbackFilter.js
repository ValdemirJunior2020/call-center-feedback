import React, { useState } from 'react';
import axios from 'axios';
import moment from 'moment';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

const SHEET_ID = '1kjUS4purNu0_r0dSYO3knyMb8DqVPkFRpue8VcaoxeA';
const TAB_NAME = '2026';

const CALL_CENTERS = [
  {
    value: 'Telus',
    label: 'Telus (Monday)',
    sendDay: 'Monday',
    aliases: ['telus', 'tus', 'telus international']
  },
  {
    value: 'TEP',
    label: 'TEP (Tuesday)',
    sendDay: 'Tuesday',
    aliases: ['tep', 'teleperformance']
  },
  {
    value: 'Buwelo',
    label: 'Buwelo (Wednesday)',
    sendDay: 'Wednesday',
    aliases: ['buwelo', 'buwelo-g', 'buwelo-c', 'buwelo ghana', 'buwelo colombia']
  },
  {
    value: 'WNS',
    label: 'WNS (Thursday)',
    sendDay: 'Thursday',
    aliases: ['wns']
  },
  {
    value: 'Concentrix',
    label: 'Concentrix (Friday)',
    sendDay: 'Friday',
    aliases: ['concentrix', 'con']
  }
];

const normalizeText = (value) => {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ');
};

const escapeHtml = (value) => {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

const parseSheetDate = (rawDate) => {
  const formats = [
    'M/D/YYYY H:mm:ss',
    'M/D/YYYY h:mm:ss A',
    'M/D/YYYY H:mm',
    'M/D/YYYY h:mm A',
    'MM/DD/YYYY',
    'YYYY-MM-DD',
    moment.ISO_8601
  ];

  const parsed = moment(rawDate, formats, true);

  if (parsed.isValid()) {
    return parsed;
  }

  return moment(new Date(rawDate));
};

const FeedbackFilter = () => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [callCenter, setCallCenter] = useState('');

  const selectedCallCenter = CALL_CENTERS.find(center => center.value === callCenter);

  const setTelusMondayReport = () => {
    const today = moment();

    const startOfPrevious7Days = today.clone().subtract(7, 'days').format('YYYY-MM-DD');
    const endOfPrevious7Days = today.clone().subtract(1, 'days').format('YYYY-MM-DD');

    setStartDate(startOfPrevious7Days);
    setEndDate(endOfPrevious7Days);
    setCallCenter('Telus');
  };

  const downloadXLSX = async (headers, rows, centerName) => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Feedback');

    sheet.addRow(headers);

    rows.forEach(row => {
      sheet.addRow(headers.map((_, index) => row[index] || ''));
    });

    sheet.columns.forEach(column => {
      column.width = 24;
    });

    sheet.eachRow(row => {
      row.eachCell(cell => {
        cell.alignment = {
          vertical: 'middle',
          horizontal: 'center',
          wrapText: true
        };

        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();

    saveAs(
      new Blob([buffer]),
      `feedback-${centerName}-${startDate}_to_${endDate}.xlsx`
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!startDate || !endDate || !callCenter) {
      alert('Please select all fields.');
      return;
    }

    if (!selectedCallCenter) {
      alert('Please select a valid call center.');
      return;
    }

    const apiKey = process.env.REACT_APP_SHEETS_API_KEY;
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${TAB_NAME}!A:L?key=${apiKey}`;

    try {
      const res = await axios.get(url);
      const rows = res.data.values || [];

      if (rows.length === 0) {
        alert('❌ No data found in the Google Sheet.');
        return;
      }

      const rawHeaders = rows[0];
      const headers = rawHeaders.map(h => String(h || '').trim());
      const data = rows.slice(1);

      const dateIndex = headers.findIndex(h =>
        h.toLowerCase().includes('timestamp')
      );

      const centerIndex = headers.findIndex(h =>
        h.toLowerCase().includes('call center')
      );

      if (dateIndex === -1 || centerIndex === -1) {
        alert("❌ 'Timestamp' or 'Call Center' column not found. Please verify column headers.");
        return;
      }

      const selectedAliases = selectedCallCenter.aliases.map(normalizeText);

      const filtered = data.filter(row => {
        const rawDate = row[dateIndex];
        const rawCenter = row[centerIndex];

        const parsedDate = parseSheetDate(rawDate);
        const isValidDate = parsedDate.isValid();

        const normalizedRowCenter = normalizeText(rawCenter);

        const isWithinRange =
          isValidDate &&
          parsedDate.isBetween(
            moment(startDate),
            moment(endDate),
            'days',
            '[]'
          );

        const matchesCenter = selectedAliases.includes(normalizedRowCenter);

        return isWithinRange && matchesCenter;
      });

      if (filtered.length === 0) {
        alert(`⚠️ No feedback found for ${selectedCallCenter.value} in the selected range.`);
        return;
      }

      const cellStyle = `
        border: 1px solid black;
        padding: 6px;
        max-width: 260px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: normal;
        text-align: center;
        vertical-align: middle;
      `;

      let html = `<table style="border-collapse: collapse; width: 100%;">`;

      html += `<thead><tr>${headers
        .map(h => `<th style="${cellStyle}">${escapeHtml(h)}</th>`)
        .join('')}</tr></thead>`;

      html += '<tbody>';

      filtered.forEach(row => {
        html += `<tr>${headers
          .map((_, index) => `<td style="${cellStyle}">${escapeHtml(row[index] || '')}</td>`)
          .join('')}</tr>`;
      });

      html += '</tbody></table>';

      let plainText = headers.join('\t') + '\n';

      filtered.forEach(row => {
        plainText += headers
          .map((_, index) => row[index] || '')
          .join('\t') + '\n';
      });

      if (navigator.clipboard && window.ClipboardItem) {
        await navigator.clipboard.write([
          new ClipboardItem({
            'text/html': new Blob([html], { type: 'text/html' }),
            'text/plain': new Blob([plainText], { type: 'text/plain' })
          })
        ]);

        alert(
          `✅ ${filtered.length} ${selectedCallCenter.value} feedback entries copied. Send this feedback every ${selectedCallCenter.sendDay} if any feedback is found.`
        );
      } else {
        await navigator.clipboard.writeText(plainText);

        alert(
          `✅ ${filtered.length} ${selectedCallCenter.value} entries copied as plain text. Send this feedback every ${selectedCallCenter.sendDay} if any feedback is found.`
        );
      }

      await downloadXLSX(headers, filtered, selectedCallCenter.value);

    } catch (err) {
      console.error('❌ Error fetching/parsing data:', err);
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

            {CALL_CENTERS.map(center => (
              <option key={center.value} value={center.value}>
                {center.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="d-flex gap-2 flex-wrap">
        <button type="submit" className="btn btn-success">
          📋 Copy + 📥 Download XLSX
        </button>

        <button
          type="button"
          className="btn btn-primary"
          onClick={setTelusMondayReport}
        >
          ⚡ Telus Monday / Previous 7 Days
        </button>
      </div>
    </form>
  );
};

export default FeedbackFilter;