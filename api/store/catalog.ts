import { STORE_CATALOG } from "../../src/shafak/game/store-catalog";

type CatalogRequest = { method?: string };
type CatalogResponse = {
  setHeader(name: string, value: string): void;
  status(code: number): CatalogResponse;
  json(body: unknown): void;
  end(body?: string): void;
};

export default function handler(request: CatalogRequest, response: CatalogResponse) {
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    response.status(405).end();
    return;
  }
  response.setHeader("Cache-Control", "public, max-age=60");
  response.status(200).json({ items: STORE_CATALOG });
}
