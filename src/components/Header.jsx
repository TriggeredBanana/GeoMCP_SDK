import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSun, faMoon } from '@fortawesome/free-solid-svg-icons';
import { LogOut } from 'lucide-react';
import { ConfirmDialog } from './ConfirmDialog';

export function Header({ theme, onToggleTheme, user, onLogout }) {
    const [showConfirm, setShowConfirm] = useState(false);

    return (
        <div className="header-bar">
            <div className="logo">
                <img src={theme === 'dark' ? '/norkartFull_white.png' : '/norkartFull.png'} />
            </div>

            <div className="header-right">
                <button className="theme-toggle" onClick={onToggleTheme}>
                    <FontAwesomeIcon icon={theme === 'dark' ? faSun : faMoon} />
                </button>

                {user && (
                    <button
                        className="header-logout-btn"
                        title={`Logg ut (${user.email})`}
                        onClick={() => setShowConfirm(true)}
                    >
                        <LogOut size={15} />
                        Logg ut
                    </button>
                )}
            </div>

            {showConfirm && (
                <ConfirmDialog
                    title="Logg ut?"
                    message="Er du sikker på at du vil logge ut?"
                    confirmLabel="Logg ut"
                    cancelLabel="Forbli pålogget"
                    onConfirm={() => { setShowConfirm(false); onLogout(); }}
                    onCancel={() => setShowConfirm(false)}
                />
            )}
        </div>
    );
}