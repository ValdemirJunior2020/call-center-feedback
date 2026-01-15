import React, { useEffect, useState } from "react";

const FeedbackFilter = () => {
  const [data, setData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [loading, setLoading] = useState(true);

  // 🔁 UPDATED FOR 2026
  const sheetId = "1kjUS4purNu0_r0dSYO3knyMb8DqVPkFRpue8VcaoxeA";
  const tabName = "2026";
  const apiKey = process.env.REACT_APP_SHEETS_API_KEY;

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${tabName}!A:L?key=${apiKey}`;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(url);
        const json = await res.json();

        if (!json.values) {
          setData([]);
          setFilteredData([]);
          setLoading(false);
          return;
        }

        const headers = json.values[0];
        const rows = json.values.slice(1);

        const formattedData = rows.map((row) => {
          const obj = {};
          headers.forEach((header, index) => {
            obj[header] = row[index] || "";
          });
          return obj;
        });

        setData(formattedData);
        setFilteredData(formattedData);
      } catch (error) {
        console.error("Error fetching Google Sheet data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [url]);

  // Filter last 7 days
  useEffect(() => {
    const today = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(today.getDate() - 7);

    const last7DaysData = data.filter((item) => {
      if (!item.Date) return false;
      const itemDate = new Date(item.Date);
      return itemDate >= sevenDaysAgo && itemDate <= today;
    });

    setFilteredData(last7DaysData);
  }, [data]);

  if (loading) {
    return <p>Loading feedback...</p>;
  }

  return (
    <div>
      <h2>Last 7 Days Feedback</h2>

      {filteredData.length === 0 ? (
        <p>No feedback found for the last 7 days.</p>
      ) : (
        <table border="1" cellPadding="8" cellSpacing="0">
          <thead>
            <tr>
              {Object.keys(filteredData[0]).map((key) => (
                <th key={key}>{key}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredData.map((row, index) => (
              <tr key={index}>
                {Object.values(row).map((value, i) => (
                  <td key={i}>{value}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default FeedbackFilter;
