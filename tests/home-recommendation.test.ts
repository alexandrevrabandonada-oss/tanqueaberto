import test from "node:test";
import assert from "node:assert/strict";

import { pickBestValueRecommendation, pickNearbyRecommendation } from "@/lib/navigation/nearby-recommendation";

test("pickNearbyRecommendation prefere um desvio curto com ganho material de preco", () => {
  const result = pickNearbyRecommendation([
    {
      id: "nearest-expensive",
      price: 7.19,
      distance: 280,
      recencyTone: "fresh",
      confidenceScore: 1,
      valueScore: 0.32
    },
    {
      id: "short-detour-better-price",
      price: 6.89,
      distance: 1_300,
      recencyTone: "fresh",
      confidenceScore: 1,
      valueScore: 0.81
    }
  ]);

  assert.ok(result);
  assert.equal(result.id, "short-detour-better-price");
});

test("pickNearbyRecommendation mantem o mais perto quando a vantagem de preco e pequena", () => {
  const result = pickNearbyRecommendation([
    {
      id: "nearest-balanced",
      price: 6.99,
      distance: 320,
      recencyTone: "fresh",
      confidenceScore: 1,
      valueScore: 0.74
    },
    {
      id: "slightly-cheaper-farther",
      price: 6.96,
      distance: 1_600,
      recencyTone: "fresh",
      confidenceScore: 1,
      valueScore: 0.75
    }
  ]);

  assert.ok(result);
  assert.equal(result.id, "nearest-balanced");
});

test("pickBestValueRecommendation alinha com a opcao proxima quando o score e parecido", () => {
  const nearby = {
    id: "nearby-practical",
    price: 6.89,
    distance: 1_300,
    recencyTone: "fresh" as const,
    confidenceScore: 1,
    valueScore: 0.78,
    netSavings40: 4.2
  };
  const result = pickBestValueRecommendation(
    [
      nearby,
      {
        id: "farther-marginal-win",
        price: 6.85,
        distance: 2_600,
        recencyTone: "fresh" as const,
        confidenceScore: 1,
        valueScore: 0.82,
        netSavings40: 4.8
      }
    ],
    nearby
  );

  assert.ok(result);
  assert.equal(result.id, "nearby-practical");
});

test("pickBestValueRecommendation mantem a opcao mais forte quando o ganho compensa o desvio", () => {
  const nearby = {
    id: "nearby-ok",
    price: 6.97,
    distance: 900,
    recencyTone: "fresh" as const,
    confidenceScore: 1,
    valueScore: 0.68,
    netSavings40: 2.1
  };
  const result = pickBestValueRecommendation(
    [
      nearby,
      {
        id: "farther-clear-win",
        price: 6.72,
        distance: 2_100,
        recencyTone: "fresh" as const,
        confidenceScore: 1,
        valueScore: 0.9,
        netSavings40: 7.4
      }
    ],
    nearby
  );

  assert.ok(result);
  assert.equal(result.id, "farther-clear-win");
});