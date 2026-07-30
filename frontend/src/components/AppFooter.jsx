import appMetadata from '../config/app-metadata.js';

/** Compact footer displayed on every public and authenticated GreenDesk page. */
export default function AppFooter() {
  return (
    <footer className="app-footer" role="contentinfo">
      <span>
        © {new Date().getFullYear()} {appMetadata.owner}
      </span>
      <span>
        {appMetadata.name} · version {appMetadata.version}
      </span>
    </footer>
  );
}
