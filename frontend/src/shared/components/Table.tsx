import React from 'react';

interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => React.ReactNode;
  width?: string;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  rowKey: (row: T) => string;
  emptyMessage?: string;
}

export function Table<T>({ columns, data, rowKey, emptyMessage = 'No data available.' }: TableProps<T>) {
  return (
    <div style={{ overflowX: 'auto', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid rgba(212,175,55,0.2)' }}>
            {columns.map(col => (
              <th
                key={col.key}
                style={{
                  padding: '12px 16px',
                  textAlign: 'left',
                  color: '#D4AF37',
                  fontWeight: 600,
                  fontSize: '11px',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  width: col.width,
                  background: 'rgba(212,175,55,0.05)',
                }}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                style={{ padding: '32px', textAlign: 'center', color: '#666' }}
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, i) => (
              <tr
                key={rowKey(row)}
                style={{
                  borderBottom: '1px solid rgba(255,255,255,0.05)',
                  background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)',
                }}
              >
                {columns.map(col => (
                  <td key={col.key} style={{ padding: '12px 16px', color: '#e0e0e0', verticalAlign: 'middle' }}>
                    {col.render ? col.render(row) : String((row as Record<string, unknown>)[col.key] ?? '')}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}