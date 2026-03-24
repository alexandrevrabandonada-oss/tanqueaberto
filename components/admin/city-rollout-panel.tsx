"use client";

import { useState } from "react";
import { type EffectiveGroupStatus } from "@/lib/ops/release-control";
import { updateCityRolloutAction } from "@/app/admin/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, Shield, Globe, ExternalLink } from "lucide-react";
import Link from "next/link";
import type { Route } from "next";

interface CityRolloutPanelProps {
  cities: EffectiveGroupStatus[];
}

export function CityRolloutPanel({ cities }: CityRolloutPanelProps) {
  const [loading, setLoading] = useState<string | null>(null);

  const handleRolloutUpdate = async (slug: string, status: string, opsState: string, note: string) => {
    setLoading(slug);
    const formData = new FormData();
    formData.append("groupSlug", slug);
    formData.append("status", status);
    formData.append("operationalState", opsState);
    formData.append("rolloutNote", note);
    
    try {
      await updateCityRolloutAction(formData);
    } catch (e) {
      console.error(e);
      setLoading(null);
    }
  };

  return (
    <div className="overflow-hidden rounded-[24px] border border-white/10 bg-black/40 shadow-xl">
      <div className="flex items-center justify-between border-b border-white/5 bg-white/5 px-6 py-4">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
           <Globe className="h-4 w-4 text-blue-400" />
           Gestão de Rollout Territorial
        </h2>
        <Badge variant="outline" className="text-[10px] uppercase font-black opacity-40">
           {cities.length} Cidades
        </Badge>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-white/5 bg-white/2 text-[10px] uppercase tracking-widest text-white/40">
              <th className="px-6 py-3 font-black">Cidade / Grupo</th>
              <th className="px-6 py-3 font-black text-center">Prontidão</th>
              <th className="px-6 py-3 font-black">Estágio Público</th>
              <th className="px-6 py-3 font-black">Ações de Promoção</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {cities.map(city => (
              <tr key={city.slug} className="group hover:bg-white/[0.02]">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white">{city.name}</span>
                    <Link href={`/cidade/${city.slug}` as Route} target="_blank">
                       <ExternalLink className="h-3 w-3 text-white/20 hover:text-white" />
                    </Link>
                  </div>
                  <p className="text-[10px] text-white/30 uppercase tracking-widest">{city.slug}</p>
                </td>
                <td className="px-6 py-4 text-center">
                  <span className={`text-sm font-bold ${city.score > 70 ? 'text-green-500' : city.score > 40 ? 'text-yellow-500' : 'text-orange-500'}`}>
                    {city.score}%
                  </span>
                </td>
                <td className="px-6 py-4">
                   <div className="flex flex-col gap-1">
                      <Badge variant={city.publicStage === 'consolidated' ? 'default' : city.publicStage === 'public_beta' ? 'accent' : city.publicStage === 'restricted_beta' ? 'warning' : 'outline'} className="text-[9px] w-fit">
                         {city.publicStage.toUpperCase().replace('_', ' ')}
                      </Badge>
                      {city.isOverride && (
                        <span className="text-[8px] uppercase tracking-[0.2em] text-purple-400 font-bold">Override Manual</span>
                      )}
                   </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    {city.publicStage === 'public_beta' && (
                      <Button 
                        onClick={() => handleRolloutUpdate(city.slug, 'ready', 'beta_open', 'Consolidando cidade')}
                        disabled={loading === city.slug}
                        className="h-8 px-3 text-[10px] font-black bg-emerald-600 text-white"
                      >
                         <Shield className="h-3 w-3 mr-1" />
                         CONSOLIDAR
                      </Button>
                    )}
                    {city.publicStage === 'restricted_beta' && (
                      <Button 
                        onClick={() => handleRolloutUpdate(city.slug, 'validating', 'monitoring', 'Abrindo para beta público')}
                        disabled={loading === city.slug}
                        className="h-8 px-3 text-[10px] font-black bg-blue-600 text-white"
                      >
                         <TrendingUp className="h-3 w-3 mr-1" />
                         ABRIR BETA
                      </Button>
                    )}
                    {(city.publicStage === 'public_beta' || city.publicStage === 'consolidated') && (
                      <Button 
                        variant="secondary"
                        onClick={() => handleRolloutUpdate(city.slug, 'limited', 'rollback', 'Recuando por segurança')}
                        disabled={loading === city.slug}
                        className="h-8 px-3 text-[10px] font-black text-white"
                      >
                         <TrendingDown className="h-3 w-3 mr-1" />
                         RECUAR
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
