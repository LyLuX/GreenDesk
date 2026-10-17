import { useLayoutEffect, useRef } from 'react';

/** Keep small tables intact and reflow overflowing mobile tables into labelled rows. */
export default function ResponsiveTable({ children, className = '', ...props }) {
  const tableRef = useRef(null);

  useLayoutEffect(() => {
    const table = tableRef.current;
    const container = table.parentElement;
    for (const [selector, role] of [
      ['thead, tbody, tfoot', 'rowgroup'],
      ['tr', 'row'],
      ['td', 'cell'],
      ['th:not([scope="row"])', 'columnheader'],
      ['th[scope="row"]', 'rowheader'],
    ]) {
      table.querySelectorAll(selector).forEach((element) => element.setAttribute('role', role));
    }
    let availableWidth = container.clientWidth;
    const updateLayout = () => {
      table.classList.remove('table-mobile-stacked');
      if (window.innerWidth >= 576 || !container.clientWidth) return;
      if (table.scrollWidth <= container.clientWidth + 1) return;

      const headings = [...(table.tHead?.rows[0]?.cells ?? [])];
      // Detail tables already have a row heading and naturally fit in two columns.
      if (!headings.length) return;
      for (const section of table.tBodies) {
        for (const row of section.rows) {
          let column = 0;
          for (const cell of row.cells) {
            cell.dataset.label =
              cell.colSpan === 1 ? (headings[column]?.textContent.trim() ?? '') : '';
            column += cell.colSpan;
          }
        }
      }
      table.classList.add('table-mobile-stacked');
    };

    updateLayout();
    const observer =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(() => {
            if (availableWidth === container.clientWidth) return;
            availableWidth = container.clientWidth;
            updateLayout();
          });
    observer?.observe(container);
    window.addEventListener('resize', updateLayout);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', updateLayout);
    };
  });

  return (
    <table {...props} ref={tableRef} className={className} role="table">
      {children}
    </table>
  );
}
