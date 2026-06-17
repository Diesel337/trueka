import { describe, expect, it } from "vitest";

import {
  buildProhibitedItemReviewReason,
  findProhibitedItemReviewReasons,
} from "./prohibited-items";

describe("prohibited item review signals", () => {
  it("detects prohibited item language across item text", () => {
    const reasons = findProhibitedItemReviewReasons({
      title: "Vape nuevo",
      description: "Incluye liquido con nicotina y accesorios.",
      knownDefects: "Sin detalles.",
    });

    expect(reasons).toContain("alcohol, tabaco, vapes o nicotina");
    expect(buildProhibitedItemReviewReason(reasons)).toContain("Posible articulo prohibido");
  });

  it("does not flag ordinary item descriptions", () => {
    expect(findProhibitedItemReviewReasons({
      title: "Laptop HP con cargador",
      description: "Funciona bien para clases y trae funda.",
      knownDefects: "Rayones leves.",
    })).toEqual([]);
  });
});
