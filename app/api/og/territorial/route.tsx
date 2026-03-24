import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    // Common params
    const type = searchParams.get("type") || "station";
    const name = searchParams.get("name") || "Bomba Aberta";
    const city = searchParams.get("city") || "";
    
    // Station direct params
    const price = searchParams.get("price");
    const fuel = searchParams.get("fuel");
    const recency = searchParams.get("recency");
    const isStale = searchParams.get("isStale") === "true";
    
    // Territorial params
    const score = searchParams.get("score");
    const stage = searchParams.get("stage") || "médio";

    // Colors & Styles
    const accentColor = isStale ? "#FFA500" : "#FFD700"; // Orange if stale, Gold if fresh

    return new ImageResponse(
      (
        <div
          style={{
            height: "100%",
            width: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#000",
            backgroundImage: "radial-gradient(circle at 50% 50%, #1a1a1a 0%, #000 100%)",
            color: "#fff",
            fontFamily: "Inter, sans-serif",
            padding: "40px",
            border: "1px solid #333",
          }}
        >
          {/* Header Branding */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "40px", opacity: 0.6 }}>
             <div style={{ padding: "4px 12px", borderRadius: "100px", border: "1px solid #444", fontSize: "12px", fontWeight: "bold", letterSpacing: "2px" }}>BOMBA ABERTA</div>
             <div style={{ fontSize: "12px", fontWeight: "bold", letterSpacing: "2px" }}>· PROJETO COMUNITÁRIO</div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: "16px" }}>
            <div style={{ fontSize: "14px", fontWeight: "900", color: accentColor, textTransform: "uppercase", letterSpacing: "4px" }}>
              {type === "station" ? "Preço Confirmado" : type === "group" ? "Radar Territorial" : "Status Cidade"}
            </div>
            
            <div style={{ fontSize: "64px", fontWeight: "900", lineHeight: "1.1", marginBottom: "8px", textTransform: "uppercase", fontStyle: "italic" }}>
              {name}
            </div>

            {city && (
              <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "rgba(255,255,255,0.4)", fontSize: "24px" }}>
                <span>{city}</span>
              </div>
            )}
          </div>

          {/* Main Visual Content */}
          <div style={{ display: "flex", marginTop: "60px", width: "100%", justifyContent: "center" }}>
            {type === "station" && price ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px", padding: "32px 64px", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "40px", backgroundColor: "rgba(255,255,255,0.03)" }}>
                <div style={{ fontSize: "80px", fontWeight: "900", color: accentColor, fontStyle: "italic" }}>R$ {price}</div>
                <div style={{ fontSize: "18px", fontWeight: "900", color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "3px" }}>{fuel}</div>
              </div>
            ) : type === "city" || type === "group" ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "20px", width: "600px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", width: "100%", marginBottom: "4px" }}>
                  <span style={{ fontSize: "14px", fontWeight: "bold", color: "rgba(255,255,255,0.4)", textTransform: "uppercase" }}>Prontidão Territorial</span>
                  <span style={{ fontSize: "14px", fontWeight: "bold", color: accentColor }}>{score}%</span>
                </div>
                <div style={{ height: "12px", width: "100%", backgroundColor: "rgba(255,255,255,0.1)", borderRadius: "100px", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${score}%`, backgroundColor: accentColor }} />
                </div>
                <div style={{ fontSize: "18px", fontWeight: "bold", color: "rgba(255,255,255,0.6)", marginTop: "12px", textTransform: "uppercase" }}>Estágio: {stage}</div>
              </div>
            ) : null}
          </div>

          {/* Footer Proof of Life / Call to Action */}
          <div style={{ marginTop: "auto", display: "flex", alignItems: "center", gap: "10px", opacity: 0.6 }}>
             <div style={{ fontSize: "14px", fontWeight: "900", textTransform: "uppercase", letterSpacing: "2px", color: isStale ? "#FFA500" : "#fff" }}>
               {type === "station" 
                 ? (recency ? `PROVA DE VIDA: ${recency}` : "Aguardando Foto Real") 
                 : "Dados Auditados pela Comunidade Local"}
             </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch (e: any) {
    console.error(e.message);
    return new Response(`Failed to generate the image`, {
      status: 500,
    });
  }
}
