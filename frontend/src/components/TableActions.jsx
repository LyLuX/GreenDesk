import { Children, Fragment, isValidElement } from 'react';

const collectActions = (children) =>
  Children.toArray(children).flatMap((child) => {
    if (isValidElement(child) && child.type === Fragment)
      return collectActions(child.props.children);
    return typeof child === 'string' && !child.trim() ? [] : [child];
  });

/** Compact Bootstrap button groups, with state changes separated from everyday actions. */
export default function TableActions({ children, secondary }) {
  const primaryActions = collectActions(children);
  const secondaryActions = collectActions(secondary);
  if (!primaryActions.length && !secondaryActions.length) return null;

  return (
    <div className="table-actions">
      {primaryActions.length > 0 && (
        <div className="btn-group" role="group" aria-label="Gestion">
          {primaryActions}
        </div>
      )}
      {secondaryActions.length > 0 && (
        <div className="btn-group" role="group" aria-label="État et suppression">
          {secondaryActions}
        </div>
      )}
    </div>
  );
}
