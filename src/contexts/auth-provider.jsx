import { useCallback, useEffect, useMemo, useState } from "react";
import { AuthContext } from "@/contexts/auth-context";
import { appRequest } from "@/services/app-api";

const EMPTY_SESSION = {
    user: null,
    csrfToken: "",
    services: [],
};

export function AuthProvider({ children }) {
    const [session, setSession] = useState(EMPTY_SESSION);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let active = true;

        async function restoreSession() {
            try {
                const result = await appRequest("auth.me");
                if (active && result?.authenticated && result.user) {
                    setSession({
                        user: result.user,
                        csrfToken: result.csrfToken || "",
                        services: Array.isArray(result.services) ? result.services : [],
                    });
                }
            } catch {
                // Sessão ausente ou indisponível: a aplicação permanece no estado visitante.
            } finally {
                if (active) setIsLoading(false);
            }
        }

        restoreSession();
        return () => {
            active = false;
        };
    }, []);

    const establishSession = useCallback(({ user, csrfToken, services = [] }) => {
        if (!user) {
            throw new Error("Não foi possível estabelecer a sessão: usuário ausente.");
        }

        setSession({
            user,
            csrfToken: csrfToken || "",
            services: Array.isArray(services) ? services : [],
        });
    }, []);

    const updateServices = useCallback((nextServices) => {
        setSession((current) => ({
            ...current,
            services: typeof nextServices === "function"
                ? nextServices(current.services)
                : nextServices,
        }));
    }, []);

    const updateUser = useCallback((nextUser) => {
        setSession((current) => {
            if (!current.user || !nextUser || current.user.idUsuario !== nextUser.idUsuario) {
                return current;
            }
            return { ...current, user: nextUser };
        });
    }, []);

    const logout = useCallback(async () => {
        if (!session.user) return;

        await appRequest("auth.logout", {}, session.csrfToken);
        setSession(EMPTY_SESSION);
    }, [session.csrfToken, session.user]);

    const clearSession = useCallback(() => {
        setSession(EMPTY_SESSION);
    }, []);

    const value = useMemo(() => ({
        ...session,
        isLoading,
        establishSession,
        setServices: updateServices,
        updateUser,
        logout,
        clearSession,
    }), [session, isLoading, establishSession, updateServices, updateUser, logout, clearSession]);

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
