import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const forwarded = req.headers.get("x-forwarded-for");
    const realIp = req.headers.get("x-real-ip");
    const cfIp = req.headers.get("cf-connecting-ip");

    let clientIp = cfIp || (forwarded ? forwarded.split(",")[0].trim() : null) || realIp || "127.0.0.1";

    let city = "";
    let region = "";
    let regionCode = "";
    let country = "";
    let countryName = "";
    let latitude: number | null = null;
    let longitude: number | null = null;

    // If client IP is valid and not localhost, try server-side lookup
    const isLocal = !clientIp || clientIp === "127.0.0.1" || clientIp === "::1" || clientIp.startsWith("192.168.") || clientIp.startsWith("10.");
    
    try {
      const lookupUrl = isLocal ? "https://ipapi.co/json/" : `https://ipapi.co/${clientIp}/json/`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);

      const res = await fetch(lookupUrl, {
        signal: controller.signal,
        headers: { "User-Agent": "AgioAgenda/1.0" }
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (data && !data.error) {
          clientIp = data.ip || clientIp;
          city = data.city || "";
          region = data.region || "";
          regionCode = data.region_code || "";
          country = data.country_code || data.country || "";
          countryName = data.country_name || "";
          latitude = data.latitude || null;
          longitude = data.longitude || null;
        }
      }
    } catch (e) {
      // Graceful fallback - do not fail
    }

    const location = [city, region, countryName].filter(Boolean).join(", ") || "Desconhecido";

    return NextResponse.json({
      ip: clientIp || "Desconhecido",
      city,
      region,
      region_code: regionCode,
      country,
      country_name: countryName,
      latitude,
      longitude,
      location
    });
  } catch (error) {
    return NextResponse.json({
      ip: "Desconhecido",
      city: "",
      region: "",
      region_code: "",
      country: "",
      country_name: "",
      latitude: null,
      longitude: null,
      location: "Desconhecido"
    });
  }
}
