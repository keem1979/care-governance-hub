export const ONS_LOCAL_AUTHORITY_SOURCE = {
  title: "Local Authority Districts (April 2025) Names and Codes in the UK (V2)",
  publisher: "Office for National Statistics Open Geography Portal",
  effectiveFrom: "2025-04-01",
  itemUrl: "https://www.arcgis.com/home/item.html?id=5779a9578f0e48ccacef6af41546b56b",
  queryUrl: "https://services1.arcgis.com/ESMARspQHYMw9BZ9/arcgis/rest/services/LAD_APR_2025_UK_NC_v2/FeatureServer/0/query",
} as const;

export const ONS_HISTORIC_AUTHORITY_SOURCES = [
  { title: "Local Authority Districts (December 2024) Names and Codes in the UK", effectiveFrom: "2024-12-01", codeField: "LAD24CD", nameField: "LAD24NM", queryUrl: "https://services1.arcgis.com/ESMARspQHYMw9BZ9/arcgis/rest/services/LAD_DEC_2024_UK_NC/FeatureServer/0/query" },
  { title: "Local Authority Districts (December 2022) Names and Codes in the UK", effectiveFrom: "2022-12-01", codeField: "LAD22CD", nameField: "LAD22NM", queryUrl: "https://services1.arcgis.com/ESMARspQHYMw9BZ9/arcgis/rest/services/LAD_DEC_2022_UK_NC/FeatureServer/0/query" },
] as const;

export type UkLocalAuthority = {
  code: string;
  name: string;
  nation: "England" | "Wales" | "Scotland" | "Northern Ireland";
  authorityType: string;
  status: "current" | "historic";
  effectiveFrom: string;
  effectiveTo: null;
};

type OnsResponse = {
  features?: Array<{ attributes?: Record<string, unknown> }>;
  error?: { message?: string };
};

export async function searchUkLocalAuthorities(
  query: string,
  fetcher: typeof fetch = fetch,
  includeHistoric = false,
): Promise<UkLocalAuthority[]> {
  const clean = query.trim().slice(0, 80);
  if (clean.length < 2) return [];
  const escaped = clean.replaceAll("'", "''").toUpperCase();
  const current = await searchSource({ queryUrl: ONS_LOCAL_AUTHORITY_SOURCE.queryUrl, codeField: "LAD25CD", nameField: "LAD25NM", effectiveFrom: ONS_LOCAL_AUTHORITY_SOURCE.effectiveFrom }, escaped, fetcher, "current");
  if (!includeHistoric) return current;
  const historic = (await Promise.all(ONS_HISTORIC_AUTHORITY_SOURCES.map((source) => searchSource(source, escaped, fetcher, "historic")))).flat();
  const currentCodes = new Set(current.map((item) => item.code));
  const unique = new Map<string, UkLocalAuthority>(current.map((item) => [item.code, item]));
  for (const item of historic) if (!currentCodes.has(item.code) && !unique.has(item.code)) unique.set(item.code, item);
  return [...unique.values()].sort((a,b)=>a.name.localeCompare(b.name));
}

async function searchSource(
  source: { queryUrl:string; codeField:string; nameField:string; effectiveFrom:string },
  escaped: string,
  fetcher: typeof fetch,
  status: UkLocalAuthority["status"],
) {
  const params = new URLSearchParams({ f:"json", where:`UPPER(${source.nameField}) LIKE '%${escaped}%' OR UPPER(${source.codeField}) LIKE '%${escaped}%'`, outFields:`${source.codeField},${source.nameField}`, returnGeometry:"false", orderByFields:`${source.nameField} ASC`, resultRecordCount:"40" });
  const response = await fetcher(`${source.queryUrl}?${params}`, { headers:{accept:"application/json"}, cache:"force-cache" });
  if (!response.ok) throw new Error("The ONS local-authority directory is temporarily unavailable.");
  const body=(await response.json()) as OnsResponse;
  if(body.error)throw new Error(body.error.message||"The ONS local-authority directory could not be searched.");
  return (body.features??[]).flatMap(({attributes})=>{const code=String(attributes?.[source.codeField]??"").trim(),name=String(attributes?.[source.nameField]??"").trim();if(!code||!name)return[];return[{code,name,nation:nationFromCode(code),authorityType:authorityTypeFromCode(code),status,effectiveFrom:source.effectiveFrom,effectiveTo:null}];});
}

export function nationFromCode(code: string): UkLocalAuthority["nation"] {
  if (code.startsWith("W")) return "Wales";
  if (code.startsWith("S")) return "Scotland";
  if (code.startsWith("N")) return "Northern Ireland";
  return "England";
}

export function authorityTypeFromCode(code: string) {
  const prefix = code.slice(0, 3);
  return ({
    E06: "Unitary authority", E07: "Local authority district",
    E08: "Metropolitan district", E09: "London borough / City of London",
    W06: "Welsh principal area", S12: "Scottish council area",
    N09: "Northern Ireland local government district",
  } as Record<string, string>)[prefix] ?? "Local authority";
}
