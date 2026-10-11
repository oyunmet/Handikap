type CatalogRequest = { method?: string };
type CatalogResponse = {
  setHeader(name: string, value: string): void;
  status(code: number): CatalogResponse;
  json(body: unknown): void;
  end(body?: string): void;
};

export default async function handler(
  request: CatalogRequest,
  response: CatalogResponse,
): Promise<void> {
  try {
    if (request.method !== "GET") {
      response.setHeader("Allow", "GET");
      response.status(405).end();
      return;
    }

    const { STORE_CATALOG } = await import(
      "../../src/shafak/game/store-catalog.ts"
    );
    response.setHeader("Cache-Control", "public, max-age=60");
    response.status(200).json({ items: STORE_CATALOG });
  } catch {
    response.setHeader("Cache-Control", "no-store");
    response.status(500).json({
      error: "catalog_unavailable",
      message: "Ürün kataloğu yüklenemedi.",
    });
  }
}
