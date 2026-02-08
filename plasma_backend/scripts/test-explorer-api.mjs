/**
 * Test des APIs explorateur - exécuter: node scripts/test-explorer-api.mjs
 */
const address = "0x405bd50dd92436d4e90a8E81d437298f960ea3c1";
const bases = [
  "https://api.routescan.io/v2/network/evm/9746/etherscan/api",
  "https://testnet.plasmascan.to/api",
];

async function fetchUrl(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    return { ok: res.ok, status: res.status, body: text.slice(0, 500) };
  }
  return { ok: res.ok, status: res.status, json };
}

async function main() {
  for (const base of bases) {
    console.log("\n=== Base:", base);
    for (const action of ["txlist", "tokentx", "txlistinternal"]) {
      const url = `${base}?module=account&action=${action}&address=${address}&page=1&offset=5&sort=desc`;
      console.log("\n  action=" + action + ":");
      try {
        const out = await fetchUrl(url);
        console.log("  status:", out.status, "ok:", out.ok);
        if (out.json) {
          console.log("  response status:", out.json.status);
          console.log("  response message:", out.json.message);
          const r = out.json.result;
          if (Array.isArray(r)) {
            console.log("  result length:", r.length);
            if (r.length > 0) console.log("  first item keys:", Object.keys(r[0]).join(", "));
          } else {
            console.log("  result type:", typeof r, "value:", String(r).slice(0, 200));
          }
        } else {
          console.log("  body:", out.body);
        }
      } catch (e) {
        console.log("  error:", e.message);
      }
    }
  }
}

main();
