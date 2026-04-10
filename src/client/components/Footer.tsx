declare const __GIT_COMMIT__: string;
declare const __VERSION__: string;

export function Footer() {
  return (
    <footer className="app-footer">
      <div className="footer-content">
        <span className="footer-item version">{__VERSION__}</span>
        <span className="footer-item git-ref">{__GIT_COMMIT__}</span>
        <span className="footer-item">&copy; 2026 bumbleflies UG</span>
        <span className="footer-item">Made in 🥨 with ♥️</span>
      </div>
    </footer>
  );
}
