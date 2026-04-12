"use client";

import type { Route } from "next";
import { startTransition, useDeferredValue, useEffect, useState, type FormEvent } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";

type StationManagerFilterState = {
  q: string;
  city: string;
  neighborhood: string;
  brand: string;
  price: "all" | "recent" | "without_recent";
  review: "all" | "review";
};

interface StationManagerFiltersProps {
  initialFilters: StationManagerFilterState;
}

function buildFilterParams(filters: StationManagerFilterState) {
  const params = new URLSearchParams();

  if (filters.q.trim()) params.set("q", filters.q.trim());
  if (filters.city.trim()) params.set("city", filters.city.trim());
  if (filters.neighborhood.trim()) params.set("neighborhood", filters.neighborhood.trim());
  if (filters.brand.trim()) params.set("brand", filters.brand.trim());
  if (filters.price !== "all") params.set("price", filters.price);
  if (filters.review !== "all") params.set("review", filters.review);

  return params;
}

function buildRoute(pathname: string, params?: string) {
  return (params ? `${pathname}?${params}` : pathname) as Route;
}

export function StationManagerFilters({ initialFilters }: StationManagerFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [filters, setFilters] = useState(initialFilters);
  const deferredFilters = useDeferredValue(filters);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    setFilters(initialFilters);
    setIsSyncing(false);
  }, [initialFilters]);

  useEffect(() => {
    const currentParams = searchParams.toString();
    const nextParams = buildFilterParams(deferredFilters).toString();

    if (currentParams === nextParams) {
      setIsSyncing(false);
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setIsSyncing(true);
      startTransition(() => {
        router.replace(buildRoute(pathname, nextParams), { scroll: false });
      });
    }, 220);

    return () => window.clearTimeout(timeoutId);
  }, [deferredFilters, pathname, router, searchParams]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextParams = buildFilterParams(filters).toString();
    setIsSyncing(true);
    startTransition(() => {
      router.replace(buildRoute(pathname, nextParams), { scroll: false });
    });
  }

  function handleReset() {
    const emptyFilters: StationManagerFilterState = {
      q: "",
      city: "",
      neighborhood: "",
      brand: "",
      price: "all",
      review: "all"
    };

    setFilters(emptyFilters);
    setIsSyncing(true);
    startTransition(() => {
      router.replace(buildRoute(pathname), { scroll: false });
    });
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      <div className="xl:col-span-3 flex flex-wrap items-center justify-between gap-2 rounded-[16px] border border-white/8 bg-black/20 px-3 py-2 text-xs text-white/54">
        <span>Atualiza enquanto você digita. Busca geral cobre nome, rua, número, bairro, cidade e bandeira.</span>
        <span className={isSyncing ? "text-[color:var(--color-accent)]" : "text-white/34"}>
          {isSyncing ? "Atualizando lista..." : "Lista em sincronia"}
        </span>
      </div>

      <label className="space-y-2 xl:col-span-3">
        <span className="text-xs uppercase tracking-[0.18em] text-white/42">Busca geral</span>
        <input
          name="q"
          value={filters.q}
          onChange={(event) => setFilters((current) => ({ ...current, q: event.target.value }))}
          placeholder="Ex.: Geraldo Ribas 1765, Shell Retiro, Ale Aterrado"
          className="w-full rounded-[16px] border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/30"
        />
      </label>
      <label className="space-y-2">
        <span className="text-xs uppercase tracking-[0.18em] text-white/42">Cidade</span>
        <input
          name="city"
          value={filters.city}
          onChange={(event) => setFilters((current) => ({ ...current, city: event.target.value }))}
          placeholder="Ex.: Volta Redonda"
          className="w-full rounded-[16px] border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/30"
        />
      </label>
      <label className="space-y-2">
        <span className="text-xs uppercase tracking-[0.18em] text-white/42">Bairro</span>
        <input
          name="neighborhood"
          value={filters.neighborhood}
          onChange={(event) => setFilters((current) => ({ ...current, neighborhood: event.target.value }))}
          placeholder="Ex.: Aterrado"
          className="w-full rounded-[16px] border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/30"
        />
      </label>
      <label className="space-y-2">
        <span className="text-xs uppercase tracking-[0.18em] text-white/42">Bandeira</span>
        <input
          name="brand"
          value={filters.brand}
          onChange={(event) => setFilters((current) => ({ ...current, brand: event.target.value }))}
          placeholder="Ex.: Shell"
          className="w-full rounded-[16px] border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/30"
        />
      </label>
      <label className="space-y-2">
        <span className="text-xs uppercase tracking-[0.18em] text-white/42">Preço</span>
        <select
          name="price"
          value={filters.price}
          onChange={(event) => setFilters((current) => ({ ...current, price: event.target.value as StationManagerFilterState["price"] }))}
          className="w-full rounded-[16px] border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none"
        >
          <option value="all">Todos</option>
          <option value="recent">Com preço recente</option>
          <option value="without_recent">Sem preço recente</option>
        </select>
      </label>
      <label className="space-y-2">
        <span className="text-xs uppercase tracking-[0.18em] text-white/42">Revisão</span>
        <select
          name="review"
          value={filters.review}
          onChange={(event) => setFilters((current) => ({ ...current, review: event.target.value as StationManagerFilterState["review"] }))}
          className="w-full rounded-[16px] border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none"
        >
          <option value="all">Todos</option>
          <option value="review">Só em revisão</option>
        </select>
      </label>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end xl:col-span-3">
        <Button type="submit" className="sm:w-auto" disabled={isSyncing}>
          {isSyncing ? "Atualizando..." : "Aplicar filtros"}
        </Button>
        <button
          type="button"
          onClick={handleReset}
          className="inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white/74 transition hover:bg-white/10"
        >
          Limpar
        </button>
      </div>
    </form>
  );
}
