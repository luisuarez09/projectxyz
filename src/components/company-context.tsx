"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import type { CompanyDetail, CompanyOfferingOption, CompanyStaffOption } from "@/modules/companies/domain/company";

type CompanyDirectoryResponse = {
  activeCompanyId: string | null;
  companies: CompanyDetail[];
  staff: CompanyStaffOption[];
  offerings: CompanyOfferingOption[];
  canManage: boolean;
};

type CompanyContextValue = CompanyDirectoryResponse & {
  activeCompany: CompanyDetail | null;
  loading: boolean;
  selecting: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  selectCompany: (companyId: string | null) => Promise<void>;
};

const CompanyContext = createContext<CompanyContextValue | null>(null);
const emptyDirectory: CompanyDirectoryResponse = { activeCompanyId: null, companies: [], staff: [], offerings: [], canManage: false };

export function CompanyProvider({ children }: { children: ReactNode }) {
  const [directory, setDirectory] = useState(emptyDirectory);
  const [loading, setLoading] = useState(true);
  const [selecting, setSelecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/companies", { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "No fue posible cargar las empresas.");
      setDirectory(body);
      setError(null);
    } catch (reason) {
      setDirectory(emptyDirectory);
      setError(reason instanceof Error ? reason.message : "No fue posible cargar las empresas.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const selectCompany = useCallback(async (companyId: string | null) => {
    setSelecting(true);
    try {
      const response = await fetch("/api/companies/active", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ companyId }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "No fue posible cambiar la empresa activa.");
      setDirectory((current) => ({ ...current, activeCompanyId: body.activeCompanyId }));
      setError(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No fue posible cambiar la empresa activa.");
      throw reason;
    } finally {
      setSelecting(false);
    }
  }, []);

  const value = useMemo<CompanyContextValue>(() => ({
    ...directory,
    activeCompany: directory.companies.find(({ id }) => id === directory.activeCompanyId) ?? null,
    loading,
    selecting,
    error,
    refresh,
    selectCompany,
  }), [directory, loading, selecting, error, refresh, selectCompany]);

  return <CompanyContext.Provider value={value}>{children}</CompanyContext.Provider>;
}

export function useCompanyContext() {
  const value = useContext(CompanyContext);
  if (!value) throw new Error("useCompanyContext debe usarse dentro de CompanyProvider.");
  return value;
}
