import React from 'react';

interface ThemeToggleProps {
    isDark: boolean;
    onToggle: () => void;
}

const ThemeToggle: React.FC<ThemeToggleProps> = ({ isDark, onToggle }) => {
    return (
        <button 
            className="theme-toggle" 
            onClick={onToggle}
            title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
            <div className="toggle-track">
                <div className="toggle-icons">
                    {/* Sun icon */}
                    <svg className="sun-icon" viewBox="0 0 24 24" width="16" height="16">
                        <circle cx="12" cy="12" r="5" fill="currentColor" />
                        <path
                            fill="currentColor"
                            d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72l1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42m12.72-12.72l1.42-1.42"
                        />
                    </svg>
                    {/* Moon icon */}
                    <svg className="moon-icon" viewBox="0 0 24 24" width="16" height="16">
                        <path
                            fill="currentColor"
                            d="M12 3c.132 0 .263 0 .393 0a7.5 7.5 0 0 0 7.92 12.446a9 9 0 1 1 -8.313 -12.454z"
                        />
                    </svg>
                </div>
                <div className={`toggle-thumb ${isDark ? 'toggled' : ''}`} />
            </div>
        </button>
    );
};

export default ThemeToggle; 