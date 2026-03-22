import type { ReportWithStation, StationWithReports } from "@/lib/types";

function isoDaysAgo(days: number, hours = 0) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(date.getHours() - hours);
  return date.toISOString();
}

const stations: StationWithReports[] = [
  {
    id: "preview-vr-centro",
    name: "Posto Central VR",
    brand: "Shell",
    address: "Av. Paulo de Frontin, 1200",
    city: "Volta Redonda",
    neighborhood: "Centro",
    lat: -22.5172,
    lng: -44.1034,
    isActive: true,
    createdAt: isoDaysAgo(120),
    nameOfficial: "Posto Central Volta Redonda",
    namePublic: "Posto Central VR",
    geoSource: "manual",
    geoConfidence: "high",
    geoReviewStatus: "ok",
    latestReports: [
      {
        id: "preview-r1",
        stationId: "preview-vr-centro",
        fuelType: "gasolina_comum",
        price: 6.39,
        photoUrl: "/brand/og-preview.svg",
        photoTakenAt: isoDaysAgo(1),
        observedAt: isoDaysAgo(1),
        submittedAt: isoDaysAgo(1),
        reportedAt: isoDaysAgo(1),
        approvedAt: isoDaysAgo(1),
        rejectedAt: null,
        createdAt: isoDaysAgo(1),
        reporterNickname: "Dani",
        status: "approved",
        moderationNote: null,
        moderationReason: null,
        moderatedBy: null,
        sourceKind: "community",
        photoHash: null,
        version: 1
      }
    ],
    recentReports: [],
    photoGallery: []
  },
  {
    id: "preview-bm-retiro",
    name: "Auto Posto Retiro",
    brand: "Ipiranga",
    address: "Rua 1, 450",
    city: "Barra Mansa",
    neighborhood: "Retiro",
    lat: -22.5481,
    lng: -44.1712,
    isActive: true,
    createdAt: isoDaysAgo(90),
    nameOfficial: "Auto Posto Retiro Ltda",
    namePublic: "Auto Posto Retiro",
    geoSource: "manual",
    geoConfidence: "high",
    geoReviewStatus: "ok",
    latestReports: [],
    recentReports: [],
    photoGallery: []
  },
  {
    id: "preview-resende-paraiso",
    name: "Posto Paraíso",
    brand: "BR",
    address: "Av. Brasil, 900",
    city: "Resende",
    neighborhood: "Paraíso",
    lat: -22.4702,
    lng: -44.4492,
    isActive: true,
    createdAt: isoDaysAgo(70),
    nameOfficial: "Posto Paraíso Serviços Automotivos",
    namePublic: "Posto Paraíso",
    geoSource: "manual",
    geoConfidence: "medium",
    geoReviewStatus: "pending",
    latestReports: [
      {
        id: "preview-r2",
        stationId: "preview-resende-paraiso",
        fuelType: "etanol",
        price: 4.39,
        photoUrl: "/brand/og-preview.svg",
        photoTakenAt: isoDaysAgo(6),
        observedAt: isoDaysAgo(6),
        submittedAt: isoDaysAgo(6),
        reportedAt: isoDaysAgo(6),
        approvedAt: isoDaysAgo(6),
        rejectedAt: null,
        createdAt: isoDaysAgo(6),
        reporterNickname: "Lia",
        status: "approved",
        moderationNote: null,
        moderationReason: null,
        moderatedBy: null,
        sourceKind: "community",
        photoHash: null,
        version: 1
      }
    ],
    recentReports: [],
    photoGallery: []
  },
  {
    id: "preview-bp-centro",
    name: "Posto Centro BPI",
    brand: "Rodoil",
    address: "Av. Pref. Arthur Costa, 88",
    city: "Barra do Piraí",
    neighborhood: "Centro",
    lat: -22.471,
    lng: -43.825,
    isActive: true,
    createdAt: isoDaysAgo(60),
    nameOfficial: "Posto Centro Barra do Piraí",
    namePublic: "Posto Centro BPI",
    geoSource: "manual",
    geoConfidence: "low",
    geoReviewStatus: "manual_review",
    latestReports: [
      {
        id: "preview-r3",
        stationId: "preview-bp-centro",
        fuelType: "diesel_s10",
        price: 6.19,
        photoUrl: "/brand/og-preview.svg",
        photoTakenAt: isoDaysAgo(18),
        observedAt: isoDaysAgo(18),
        submittedAt: isoDaysAgo(18),
        reportedAt: isoDaysAgo(18),
        approvedAt: isoDaysAgo(18),
        rejectedAt: null,
        createdAt: isoDaysAgo(18),
        reporterNickname: "Nina",
        status: "approved",
        moderationNote: null,
        moderationReason: null,
        moderatedBy: null,
        sourceKind: "community",
        photoHash: null,
        version: 1
      }
    ],
    recentReports: [],
    photoGallery: []
  }
];

const feed: ReportWithStation[] = [
  {
    id: "preview-r1",
    stationId: "preview-vr-centro",
    fuelType: "gasolina_comum",
    price: 6.39,
    photoUrl: "/brand/og-preview.svg",
    photoTakenAt: isoDaysAgo(1),
    observedAt: isoDaysAgo(1),
    submittedAt: isoDaysAgo(1),
    reportedAt: isoDaysAgo(1),
    approvedAt: isoDaysAgo(1),
    rejectedAt: null,
    createdAt: isoDaysAgo(1),
    reporterNickname: "Dani",
    status: "approved",
    moderationNote: null,
    moderationReason: null,
    moderatedBy: null,
    sourceKind: "community",
    photoHash: null,
    version: 1,
    station: {
      id: "preview-vr-centro",
      name: "Posto Central VR",
      brand: "Shell",
      city: "Volta Redonda",
      neighborhood: "Centro"
    }
  },
  {
    id: "preview-r2",
    stationId: "preview-resende-paraiso",
    fuelType: "etanol",
    price: 4.39,
    photoUrl: "/brand/og-preview.svg",
    photoTakenAt: isoDaysAgo(6),
    observedAt: isoDaysAgo(6),
    submittedAt: isoDaysAgo(6),
    reportedAt: isoDaysAgo(6),
    approvedAt: isoDaysAgo(6),
    rejectedAt: null,
    createdAt: isoDaysAgo(6),
    reporterNickname: "Lia",
    status: "approved",
    moderationNote: null,
    moderationReason: null,
    moderatedBy: null,
    sourceKind: "community",
    photoHash: null,
    version: 1,
    station: {
      id: "preview-resende-paraiso",
      name: "Posto Paraíso",
      brand: "BR",
      city: "Resende",
      neighborhood: "Paraíso"
    }
  }
];

export function isPreviewFixturesEnabled() {
  return process.env.NEXT_PUBLIC_BOMBA_ABERTA_USE_FIXTURES === "1";
}

export function getPreviewStations() {
  return stations;
}

export function getPreviewStationById(id: string) {
  return stations.find((station) => station.id === id) ?? null;
}

export function getPreviewRecentFeed(): ReportWithStation[] {
  return feed;
}

export function getPreviewRecentCount() {
  return 2;
}

export function getPreviewApprovedReportsSince(days: number) {
  return feed.filter((report) => (Date.now() - new Date(report.reportedAt).getTime()) / 86_400_000 <= days);
}
