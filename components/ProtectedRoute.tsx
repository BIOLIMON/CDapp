import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../types';

interface ProtectedRouteProps {
    children: React.ReactNode;
    requiredRole?: UserRole;
    redirectTo?: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
    children,
    requiredRole,
    redirectTo = '/'
}) => {
    const { user, loading, session } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-primary font-medium flex flex-col items-center animate-pulse">
                    <span className="text-3xl">🌱</span>
                    <span className="mt-2">Cargando...</span>
                </div>
            </div>
        );
    }

    // 1. Not Authenticated
    if (!session && !user) {
        // We render null here because App.tsx usually handles the redirection or shows Login view
        // But if this is used inside a Router (which we don't strictly have, we have conditional rendering in App),
        // we might want to return a specific "Go to Login" signal?

        // Given current App.tsx architecture (state-based view switching), 
        // this component acts as a guard that renders children OR null/fallback.
        return null;
    }

    // 2. Role Mismatch
    if (requiredRole && user?.role !== requiredRole) {
        if (user?.role === 'god') {
            // God can go anywhere? Maybe.
        } else {
            return <div className="p-8 text-center text-red-500">No tienes permisos para ver esta página.</div>;
        }
    }

    return <>{children}</>;
};

export default ProtectedRoute;
