import { PriceReport, StationWithReports } from "@/lib/types";

const now = Date.now();

const reports: PriceReport[] = [
  {
    id: "rep-1",
    stationId: "st-1",
    fuelType: "gasolina_comum",
    price: 6.14,
    photoUrl: "/icons/icon.svg",
    photoTakenAt: new Date(now - 1000 * 60 * 32).toISOString(),
    reportedAt: new Date(now - 1000 * 60 * 28).toISOString(),
    createdAt: new Date(now - 1000 * 60 * 28).toISOString(),
    reporterNickname: "Morador VR",
    status: "approved",
    moderationNote: null
  },
  {
    id: "rep-2",
    stationId: "st-1",
    fuelType: "etanol",
    price: 4.26,
    photoUrl: "/icons/icon.svg",
    photoTakenAt: new Date(now - 1000 * 60 * 55).toISOString(),
    reportedAt: new Date(now - 1000 * 60 * 48).toISOString(),
    createdAt: new Date(now - 1000 * 60 * 48).toISOString(),
    reporterNickname: "VR Abandonada",
    status: "approved",
    moderationNote: null
  },
  {
    id: "rep-3",
    stationId: "st-2",
    fuelType: "gasolina_comum",
    price: 6.29,
    photoUrl: "/icons/icon.svg",
    photoTakenAt: new Date(now - 1000 * 60 * 90).toISOString(),
    reportedAt: new Date(now - 1000 * 60 * 80).toISOString(),
    createdAt: new Date(now - 1000 * 60 * 80).toISOString(),
    reporterNickname: "Posto do bairro",
    status: "approved",
    moderationNote: null
  },
  {
    id: "rep-4",
    stationId: "st-2",
    fuelType: "diesel_s10",
    price: 6.05,
    photoUrl: "/icons/icon.svg",
    photoTakenAt: new Date(now - 1000 * 60 * 115).toISOString(),
    reportedAt: new Date(now - 1000 * 60 * 105).toISOString(),
    createdAt: new Date(now - 1000 * 60 * 105).toISOString(),
    reporterNickname: "Equipe campo",
    status: "approved",
    moderationNote: null
  },
  {
    id: "rep-5",
    stationId: "st-3",
    fuelType: "gasolina_aditivada",
    price: 6.49,
    photoUrl: "/icons/icon.svg",
    photoTakenAt: new Date(now - 1000 * 60 * 220).toISOString(),
    reportedAt: new Date(now - 1000 * 60 * 200).toISOString(),
    createdAt: new Date(now - 1000 * 60 * 200).toISOString(),
    reporterNickname: "Leitor BM",
    status: "pending",
    moderationNote: null
  }
];

export const stations: StationWithReports[] = [
  {
    id: "st-1",
    name: "Posto Retiro Popular",
    brand: "BR",
    address: "Avenida Savio Gama, 1120",
    city: "Volta Redonda",
    neighborhood: "Retiro",
    lat: -22.5233,
    lng: -44.1041,
    isActive: true,
    createdAt: new Date(now - 1000 * 60 * 60 * 24 * 12).toISOString(),
    latestReports: reports.filter((report) => report.stationId === "st-1"),
    recentReports: reports.filter((report) => report.stationId === "st-1"),
    photoGallery: ["/icons/icon.svg"]
  },
  {
    id: "st-2",
    name: "Posto Vila Santa Cecilia",
    brand: "Ipiranga",
    address: "Rua Quatorze, 45",
    city: "Volta Redonda",
    neighborhood: "Vila Santa Cecilia",
    lat: -22.5194,
    lng: -44.0956,
    isActive: true,
    createdAt: new Date(now - 1000 * 60 * 60 * 24 * 8).toISOString(),
    latestReports: reports.filter((report) => report.stationId === "st-2"),
    recentReports: reports.filter((report) => report.stationId === "st-2"),
    photoGallery: ["/icons/icon.svg"]
  },
  {
    id: "st-3",
    name: "Posto Centro BM",
    brand: "Shell",
    address: "Avenida Domingos Mariano, 301",
    city: "Barra Mansa",
    neighborhood: "Centro",
    lat: -22.5442,
    lng: -44.1719,
    isActive: true,
    createdAt: new Date(now - 1000 * 60 * 60 * 24 * 4).toISOString(),
    latestReports: reports.filter((report) => report.stationId === "st-3"),
    recentReports: reports.filter((report) => report.stationId === "st-3"),
    photoGallery: ["/icons/icon.svg"]
  }
];

export const recentUpdates = reports
  .filter((report) => report.status !== "rejected")
  .sort((a, b) => new Date(b.reportedAt).getTime() - new Date(a.reportedAt).getTime());

export const fuelLabels: Record<PriceReport["fuelType"], string> = {
  gasolina_comum: "Gasolina comum",
  gasolina_aditivada: "Gasolina aditivada",
  etanol: "Etanol",
  diesel_s10: "Diesel S10",
  diesel_comum: "Diesel comum",
  gnv: "GNV"
};
