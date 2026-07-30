import { useEffect, useMemo, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { navigationSections } from '../navigation.js';

const routeMatches = (pathname, path) => pathname === path || pathname.startsWith(`${path}/`);

const activeSectionKey = (sections, pathname) =>
  sections.find((section) => {
    const items = section.item ? [section.item] : section.items;
    return items.some((item) => routeMatches(pathname, item.path));
  })?.key ?? null;

/** Accessible accordion navigation filtered with the current user's permissions. */
export default function SidebarNavigation({
  hasPermission,
  onNavigate,
  sections = navigationSections,
}) {
  const { pathname } = useLocation();
  const visibleSections = useMemo(
    () =>
      sections
        .map((section) =>
          section.item
            ? section
            : {
                ...section,
                items: section.items.filter((item) => hasPermission(item.permission)),
              },
        )
        .filter((section) =>
          section.item ? hasPermission(section.item.permission) : section.items.length > 0,
        ),
    [hasPermission, sections],
  );
  const currentSectionKey = activeSectionKey(visibleSections, pathname);
  const [openSectionKey, setOpenSectionKey] = useState(currentSectionKey);
  const allItems = visibleSections.flatMap((section) =>
    section.item ? [section.item] : section.items,
  );

  useEffect(() => {
    setOpenSectionKey(currentSectionKey);
  }, [currentSectionKey]);

  const link = (item, nested = false) => {
    const hasDedicatedChildRoute = allItems.some(
      (candidate) => candidate.path !== item.path && candidate.path.startsWith(`${item.path}/`),
    );

    return (
      <NavLink
        className={({ isActive }) =>
          `sidebar-link ${nested ? 'sidebar-sublink' : ''} ${isActive ? 'active' : ''}`.trim()
        }
        end={hasDedicatedChildRoute}
        key={item.path}
        onClick={onNavigate}
        to={item.path}
      >
        {item.label}
      </NavLink>
    );
  };

  return (
    <div className="sidebar-nav">
      {visibleSections.map((section) => {
        if (section.item) return link(section.item);

        const isOpen = openSectionKey === section.key;
        const submenuId = `sidebar-section-${section.key}`;
        return (
          <div
            className={`sidebar-group ${currentSectionKey === section.key ? 'active' : ''}`}
            key={section.key}
          >
            <button
              aria-controls={submenuId}
              aria-expanded={isOpen}
              className="sidebar-group-button"
              type="button"
              onClick={() => setOpenSectionKey(isOpen ? null : section.key)}
            >
              <span>{section.label}</span>
              <span className="sidebar-chevron" aria-hidden="true" />
            </button>
            <div className="sidebar-submenu" hidden={!isOpen} id={submenuId}>
              {section.items.map((item) => link(item, true))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
