declare const __GIT_COMMIT__: string;
declare const __VERSION__: string;

export function Footer() {
  return (
    <footer className="app-footer">
      <div className="footer-content">
        <span className="footer-item">
          <a
            href={`https://github.com/dachrisch/league.finance/releases/tag/${__VERSION__}`}
            target="_blank"
            rel="noopener noreferrer"
            title={__GIT_COMMIT__}
          >
            {__VERSION__}
          </a>
        </span>
        <span className="footer-item">&copy; 2026 bumbleflies UG</span>
        <span className="footer-item">Made in 🥨 with ♥️</span>
      </div>
    </footer>
  );
}
