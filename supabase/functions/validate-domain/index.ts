import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { domain, internship_id, email } = await req.json();
    if (!domain || typeof domain !== "string") {
      return new Response(JSON.stringify({ error: "domain is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const cleanDomain = domain.replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/.*$/, "").toLowerCase();

    const results: { check: string; pass: boolean; detail: string }[] = [];

    // 1. DNS resolution — does the domain resolve at all?
    let dnsOk = false;
    try {
      const dns = await Deno.resolveDns(cleanDomain, "A").catch(() => []);
      dnsOk = dns.length > 0;
      results.push({ check: "dns", pass: dnsOk, detail: dnsOk ? "Domain resolves to an IP" : "No A record found" });
    } catch {
      results.push({ check: "dns", pass: false, detail: "DNS lookup failed" });
    }

    // 2. HTTPS reachable — does the site respond?
    let httpsOk = false;
    try {
      const res = await fetch(`https://${cleanDomain}`, {
        method: "GET",
        redirect: "follow",
        signal: AbortSignal.timeout(5000),
      });
      httpsOk = res.ok || res.status < 500;
      results.push({ check: "https", pass: httpsOk, detail: `HTTP ${res.status}` });
    } catch {
      results.push({ check: "https", pass: false, detail: "Site did not respond over HTTPS" });
    }

    // 3. MX records — can the domain receive email?
    let mxOk = false;
    try {
      const mx = await Deno.resolveDns(cleanDomain, "MX").catch(() => []);
      mxOk = mx.length > 0;
      results.push({ check: "mx", pass: mxOk, detail: mxOk ? `${mx.length} MX record(s) found` : "No MX records" });
    } catch {
      results.push({ check: "mx", pass: false, detail: "MX lookup failed" });
    }

    // 4. Email/domain consistency — if an email was provided, does it match the domain?
    let emailMatch = true;
    if (email) {
      const emailDomain = email.split("@").pop()?.toLowerCase();
      emailMatch = emailDomain === cleanDomain;
      results.push({ check: "email_match", pass: emailMatch, detail: emailMatch ? "Email domain matches" : `Email uses ${emailDomain}, expected ${cleanDomain}` });
    }

    const passed = results.filter((r) => r.pass).length;
    const verified = passed >= 2 && dnsOk;

    // If an internship_id was supplied, persist the result.
    if (internship_id && verified) {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      );
      await supabase.from("internships").update({
        domain_verified: true,
        domain_verified_at: new Date().toISOString(),
        domain: cleanDomain,
      }).eq("id", internship_id);
      await supabase.from("honour_events").insert({
        internship_id,
        delta: 5,
        reason: "Domain verified via DNS + HTTPS check",
        severity: "low",
        source: "domain",
      });
    }

    return new Response(JSON.stringify({
      domain: cleanDomain,
      verified,
      score: `${passed}/${results.length}`,
      checks: results,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
