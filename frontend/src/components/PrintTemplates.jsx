import { formatAmount, formatDate, formatDateTime, formatUsd, formatRate, isUsd, dzdToUsd } from "../utils/format.js";
import { PrintLogo } from "./AnimatedLogo.jsx";

/* ============================================================================
 * Professional, single-page print templates (A4 portrait), available in
 * French (lang="fr", LTR) and Arabic (lang="ar", RTL). Every block sits in its
 * own bordered frame with a coloured header band; the whole document fits one
 * page with no large empty gaps.
 * ========================================================================== */

const ACCENT = "#b91c1c"; // crimson brand colour
const INK = "#111827";
const MUTE = "#6b7280";
const LINE = "#d1d5db";
const SOFT = "#f3f4f6";

const exact = { WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" };
// Keep latin text / numbers / amounts / dates rendering left-to-right even inside
// an RTL (Arabic) document, so "4 800 000 DA" never bidi-reverses to "DA 000 800 4".
const ltr = { direction: "ltr", unicodeBidi: "isolate" };

// ── Bilingual label dictionary ────────────────────────────────────────────
const L = {
  fr: {
    telPrefix: "Tél :",
    docNo: "N°",
    purchaseTitle: "Bon d'Achat",
    purchaseExtraSupplier: "Achat auprès d'un fournisseur",
    purchaseExtraClient: "Achat auprès d'un client",
    saleTitle: "Facture de Vente",
    saleNormal: "Vente normale",
    saleDeposit: "Dépôt / Réservation",
    receiptTitle: "Reçu de Paiement",
    depositTitle: "Bon de Versement",
    withdrawalTitle: "Bon de Retrait",
    depositExtra: "Versement en caisse",
    withdrawalExtra: "Retrait de caisse",
    operationDetail: "Détail de l'opération",
    amount: "Montant",
    beneficiary: "Bénéficiaire",
    sigBeneficiary: "Signature Bénéficiaire",
    supplier: "Fournisseur",
    client: "Client",
    clientSeller: "Client (vendeur)",
    vehicle: "Véhicule",
    companyName: "Raison sociale",
    phone: "Téléphone",
    phone2: "Tél. secondaire",
    address: "Adresse",
    article: "Article",
    fullName: "Nom complet",
    profession: "Profession",
    idDoc: "Pièce d'identité",
    deliveredOn: "Délivrée le",
    expiresOn: "Expire le",
    brand: "Marque", model: "Modèle", plate: "Immatriculation", year: "Année",
    color: "Couleur", energy: "Énergie", gearbox: "Boîte", seats: "Places",
    mileage: "Kilométrage", keys: "Nombre de clés", vin: "VIN / N° de châssis", documents: "Documents",
    financialInfo: "Informations financières",
    financialDetail: "Détail financier",
    paymentDetail: "Détail du paiement",
    purchasePrice: "Prix d'achat",
    priceUsd: "Prix en dollars",
    exchangeRate: "Taux de change",
    amountPaid: "Montant versé",
    rest: "Reste à payer",
    basePrice: "Prix de base",
    tva: "TVA",
    totalTTC: "Total TTC",
    reduction: "Réduction",
    deposit: "Acompte versé",
    totalToPay: "Total à payer",
    description: "Description",
    paymentHistory: "Historique des paiements",
    inspectionReport: "Rapport d'inspection",
    security: "Sécurité", equipment: "Équipements", comfort: "Confort",
    sigSupplier: "Signature Fournisseur",
    sigSeller: "Signature Vendeur",
    sigClient: "Signature Client",
    sigShowroom: "Signature & Cachet Showroom",
    thanks: "Merci de votre confiance.",
    generatedOn: "Document généré le",
    energyLabels: { ESSENCE: "Essence", DIESEL: "Diesel", HYBRID: "Hybride", ELECTRIC: "Électrique" },
    gearboxLabels: { MANUAL: "Manuelle", AUTO: "Automatique" },
    kmUnit: "km",
  },
  ar: {
    telPrefix: "الهاتف :",
    docNo: "رقم",
    purchaseTitle: "وصل شراء",
    purchaseExtraSupplier: "شراء من مورّد",
    purchaseExtraClient: "شراء من عميل",
    saleTitle: "فاتورة بيع",
    saleNormal: "بيع عادي",
    saleDeposit: "عربون / حجز",
    receiptTitle: "وصل دفع",
    depositTitle: "وصل إيداع",
    withdrawalTitle: "وصل سحب",
    depositExtra: "إيداع في الصندوق",
    withdrawalExtra: "سحب من الصندوق",
    operationDetail: "تفاصيل العملية",
    amount: "المبلغ",
    beneficiary: "المستفيد",
    sigBeneficiary: "توقيع المستفيد",
    supplier: "المورّد",
    client: "العميل",
    clientSeller: "العميل (البائع)",
    vehicle: "المركبة",
    companyName: "التسمية التجارية",
    phone: "الهاتف",
    phone2: "هاتف ثانوي",
    address: "العنوان",
    article: "المادة",
    fullName: "الاسم الكامل",
    profession: "المهنة",
    idDoc: "وثيقة الهوية",
    deliveredOn: "صادرة في",
    expiresOn: "تنتهي في",
    brand: "الماركة", model: "الطراز", plate: "رقم التسجيل", year: "السنة",
    color: "اللون", energy: "الطاقة", gearbox: "علبة السرعة", seats: "المقاعد",
    mileage: "المسافة المقطوعة", keys: "عدد المفاتيح", vin: "رقم الهيكل", documents: "الوثائق",
    financialInfo: "المعلومات المالية",
    financialDetail: "التفاصيل المالية",
    paymentDetail: "تفاصيل الدفع",
    purchasePrice: "سعر الشراء",
    priceUsd: "السعر بالدولار",
    exchangeRate: "سعر الصرف",
    amountPaid: "المبلغ المدفوع",
    rest: "المبلغ المتبقي",
    basePrice: "السعر الأساسي",
    tva: "الرسم على القيمة المضافة",
    totalTTC: "الإجمالي مع الرسم",
    reduction: "تخفيض",
    deposit: "الدفعة المقدمة",
    totalToPay: "المبلغ الإجمالي",
    description: "الوصف",
    paymentHistory: "سجل الدفعات",
    inspectionReport: "تقرير الفحص",
    security: "الأمان", equipment: "التجهيزات", comfort: "الراحة",
    sigSupplier: "توقيع المورّد",
    sigSeller: "توقيع البائع",
    sigClient: "توقيع العميل",
    sigShowroom: "التوقيع وختم المعرض",
    thanks: "شكراً لثقتكم.",
    generatedOn: "حُرّر هذا المستند في",
    energyLabels: { ESSENCE: "بنزين", DIESEL: "ديزل", HYBRID: "هجين", ELECTRIC: "كهربائي" },
    gearboxLabels: { MANUAL: "يدوية", AUTO: "أوتوماتيكية" },
    kmUnit: "كم",
  },
};

const tr = (lang) => L[lang] || L.fr;
const isAr = (lang) => lang === "ar";

function sheetStyle(lang) {
  return {
    fontFamily: isAr(lang)
      ? "'Segoe UI', Tahoma, Arial, sans-serif"
      : "Inter, Arial, sans-serif",
    color: INK,
    background: "#fff",
    width: "190mm",
    margin: "0 auto",
    padding: "0",
    fontSize: "11px",
    lineHeight: 1.4,
    direction: isAr(lang) ? "rtl" : "ltr",
    textAlign: isAr(lang) ? "right" : "left",
    ...exact,
  };
}

// ── Small building blocks ────────────────────────────────────────────────
function Frame({ title, children, style }) {
  return (
    <div style={{ border: `1px solid ${LINE}`, borderRadius: 6, overflow: "hidden", breakInside: "avoid", ...style }}>
      <div
        style={{
          background: ACCENT,
          color: "#fff",
          padding: "4px 9px",
          fontWeight: 800,
          fontSize: "9.5px",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          ...exact,
        }}
      >
        {title}
      </div>
      <div style={{ padding: "7px 9px" }}>{children}</div>
    </div>
  );
}

function Row({ label, value, strong, last, lang }) {
  const v = value == null || value === "" ? "—" : value;
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: 10,
        padding: "2.5px 0",
        borderBottom: last ? "none" : `1px dotted ${LINE}`,
      }}
    >
      <span style={{ color: MUTE, whiteSpace: "nowrap" }}>{label}</span>
      <span style={{ fontWeight: strong ? 800 : 600, textAlign: isAr(lang) ? "left" : "right", ...ltr }}>{v}</span>
    </div>
  );
}

const grid2 = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "9px" };

// ── Header (full logo, no frame) + showroom legal block ───────────────────
function Header({ showroom, lang }) {
  const x = tr(lang);
  // Render each contact segment as its own isolated run so latin numbers/emails
  // never bidi-reverse next to the Arabic "الهاتف :" label.
  const contactItems = [];
  if (showroom?.address) contactItems.push(<span style={ltr}>{showroom.address}</span>);
  if (showroom?.phone) contactItems.push(<span>{x.telPrefix} <span style={ltr}>{showroom.phone}</span></span>);
  if (showroom?.email) contactItems.push(<span style={ltr}>{showroom.email}</span>);
  const legal = [
    ["NIF", showroom?.nif],
    ["NIS", showroom?.nis],
    ["Art", showroom?.article],
    ["RC", showroom?.rc],
  ].filter(([, v]) => v);
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        borderBottom: `2.5px solid ${ACCENT}`,
        paddingBottom: 9,
        marginBottom: 10,
        ...exact,
      }}
    >
      <div style={{ display: "flex", gap: 12, alignItems: "center", minWidth: 0 }}>
        <PrintLogo src={showroom?.logo} size={58} />
        <div style={{ minWidth: 0, textAlign: isAr(lang) ? "right" : "left" }}>
          <div style={{ fontWeight: 900, fontSize: 17, textTransform: "uppercase", color: ACCENT, letterSpacing: "0.02em", ...ltr }}>
            {showroom?.name || "Showroom"}
          </div>
          {showroom?.description && <div style={{ color: MUTE, fontSize: 9.5, ...ltr }}>{showroom.description}</div>}
          {contactItems.length > 0 && (
            <div style={{ color: MUTE, fontSize: 9.5, marginTop: 2 }}>
              {contactItems.map((el, i) => (
                <span key={i}>{i > 0 ? "   ·   " : ""}{el}</span>
              ))}
            </div>
          )}
        </div>
      </div>
      {legal.length > 0 && (
        <div style={{ textAlign: isAr(lang) ? "left" : "right", fontSize: 9, color: MUTE, lineHeight: 1.5, whiteSpace: "nowrap", ...ltr }}>
          {legal.map(([k, v]) => (
            <div key={k}>
              {k} : <b style={{ color: INK }}>{v}</b>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Document title band ───────────────────────────────────────────────────
function TitleBar({ title, reference, date, extra, lang }) {
  const x = tr(lang);
  const accentSide = isAr(lang) ? { borderRight: `4px solid ${ACCENT}` } : { borderLeft: `4px solid ${ACCENT}` };
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        background: SOFT,
        border: `1px solid ${LINE}`,
        ...accentSide,
        borderRadius: 6,
        padding: "7px 12px",
        marginBottom: 10,
        ...exact,
      }}
    >
      <div>
        <div style={{ fontWeight: 900, fontSize: 14, textTransform: "uppercase", color: ACCENT, letterSpacing: "0.03em" }}>
          {title}
        </div>
        {extra && <div style={{ fontSize: 9.5, color: MUTE, marginTop: 1 }}>{extra}</div>}
      </div>
      <div style={{ textAlign: isAr(lang) ? "left" : "right", fontSize: 10 }}>
        <div style={{ fontSize: 12 }}>
          {x.docNo} <b style={ltr}>{reference}</b>
        </div>
        <div style={{ color: MUTE, ...ltr, textAlign: isAr(lang) ? "left" : "right" }}>{date}</div>
      </div>
    </div>
  );
}

// ── Party blocks (all available details) ──────────────────────────────────
function ClientBlock({ client, title, lang }) {
  const x = tr(lang);
  const c = client || {};
  const doc = [c.docType, c.docNumber].filter(Boolean).join(" ");
  return (
    <Frame title={title || x.client}>
      <Row lang={lang} label={x.fullName} value={`${c.firstName || ""} ${c.lastName || ""}`.trim()} strong />
      <Row lang={lang} label={x.phone} value={c.phonePrimary} />
      {c.phoneSecondary && <Row lang={lang} label={x.phone2} value={c.phoneSecondary} />}
      <Row lang={lang} label={x.address} value={c.address} />
      {c.profession && <Row lang={lang} label={x.profession} value={c.profession} />}
      <Row lang={lang} label={x.idDoc} value={doc || "—"} />
      {c.docDeliveryDate && <Row lang={lang} label={x.deliveredOn} value={formatDate(c.docDeliveryDate)} />}
      {c.docExpiry && <Row lang={lang} label={x.expiresOn} value={formatDate(c.docExpiry)} />}
      {c.nif && <Row lang={lang} label="NIF" value={c.nif} />}
      {c.rc && <Row lang={lang} label="RC" value={c.rc} last />}
    </Frame>
  );
}

function SupplierBlock({ supplier, lang }) {
  const x = tr(lang);
  const s = supplier || {};
  return (
    <Frame title={x.supplier}>
      <Row lang={lang} label={x.companyName} value={s.fullName} strong />
      <Row lang={lang} label={x.phone} value={s.phone} />
      <Row lang={lang} label={x.address} value={s.address} />
      {s.nif && <Row lang={lang} label="NIF" value={s.nif} />}
      {s.nis && <Row lang={lang} label="NIS" value={s.nis} />}
      {s.article && <Row lang={lang} label={x.article} value={s.article} />}
      {s.rs && <Row lang={lang} label="RS" value={s.rs} last />}
    </Frame>
  );
}

function CarBlock({ car, lang }) {
  const x = tr(lang);
  const c = car || {};
  const docs = c.documents || [];
  return (
    <Frame title={x.vehicle}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 14px" }}>
        <Row lang={lang} label={x.brand} value={c.brand} strong />
        <Row lang={lang} label={x.model} value={c.model} strong />
        <Row lang={lang} label={x.plate} value={c.plate} />
        <Row lang={lang} label={x.year} value={c.year} />
        <Row lang={lang} label={x.color} value={c.color} />
        <Row lang={lang} label={x.energy} value={x.energyLabels[c.energy]} />
        <Row lang={lang} label={x.gearbox} value={x.gearboxLabels[c.gearbox]} />
        <Row lang={lang} label={x.seats} value={c.seats} />
        <Row lang={lang} label={x.mileage} value={c.mileage != null ? formatAmount(c.mileage, x.kmUnit) : "—"} />
        <Row lang={lang} label={x.keys} value={c.keysCount != null ? c.keysCount : "—"} />
      </div>
      <Row lang={lang} label={x.vin} value={c.vin} last={docs.length === 0} />
      {docs.length > 0 && <Row lang={lang} label={x.documents} value={docs.map((d) => d.type).join(", ")} last />}
    </Frame>
  );
}

// ── Financial frame ───────────────────────────────────────────────────────
function MoneyFrame({ title, lines, total, rest, lang }) {
  return (
    <Frame title={title}>
      {lines.map((l, i) => (
        <Row key={i} lang={lang} label={l.label} value={l.value} strong={l.strong} />
      ))}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: 6,
          padding: "6px 9px",
          background: SOFT,
          borderRadius: 5,
          border: `1px solid ${LINE}`,
          ...exact,
        }}
      >
        <span style={{ fontWeight: 800, textTransform: "uppercase", fontSize: 10 }}>{total.label}</span>
        <span style={{ fontWeight: 900, fontSize: 15, color: ACCENT, ...ltr }}>{total.value}</span>
      </div>
      {rest && (
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 5, padding: "0 2px" }}>
          <span style={{ fontWeight: 700, color: MUTE }}>{rest.label}</span>
          <span style={{ fontWeight: 900, color: rest.danger ? ACCENT : "#047857", ...ltr }}>{rest.value}</span>
        </div>
      )}
    </Frame>
  );
}

// ── Inspection (compact, 3 columns) ───────────────────────────────────────
function InspectionBlock({ inspection, lang }) {
  if (!inspection) return null;
  const x = tr(lang);
  const cats = [
    [x.security, inspection.security],
    [x.equipment, inspection.equipment],
    [x.comfort, inspection.comfort],
  ];
  const hasAny = cats.some(([, arr]) => arr && arr.length);
  if (!hasAny) return null;
  return (
    <Frame title={x.inspectionReport} style={{ marginTop: 10 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0 14px" }}>
        {cats.map(([label, arr]) => (
          <div key={label}>
            <div style={{ fontWeight: 800, textTransform: "uppercase", fontSize: 9, color: ACCENT, borderBottom: `1px solid ${LINE}`, paddingBottom: 2, marginBottom: 3 }}>
              {label}
            </div>
            {!arr || arr.length === 0 ? (
              <div style={{ color: MUTE }}>—</div>
            ) : (
              arr.map((it, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 4, padding: "1px 0" }}>
                  <span style={{ fontWeight: 900, fontFamily: "monospace", color: it.active ? "#047857" : ACCENT, ...exact }}>
                    {it.active ? "✓" : "✗"}
                  </span>
                  <span style={{ textDecoration: it.active ? "none" : "line-through", color: it.active ? INK : MUTE, fontSize: 10 }}>
                    {it.label}
                  </span>
                </div>
              ))
            )}
          </div>
        ))}
      </div>
    </Frame>
  );
}

// ── Signatures + footer ───────────────────────────────────────────────────
function Signatures({ left, right }) {
  const box = {
    border: `1px solid ${LINE}`,
    borderRadius: 6,
    height: 64,
    display: "flex",
    flexDirection: "column",
    justifyContent: "flex-end",
    padding: "6px 9px",
  };
  const cap = { borderTop: `1px solid ${MUTE}`, paddingTop: 3, textAlign: "center", fontSize: 9.5, color: MUTE, textTransform: "uppercase", fontWeight: 700 };
  return (
    <div style={{ ...grid2, marginTop: 12, breakInside: "avoid" }}>
      <div style={box}><div style={cap}>{left}</div></div>
      <div style={box}><div style={cap}>{right}</div></div>
    </div>
  );
}

function Footer({ showroom, lang }) {
  const x = tr(lang);
  return (
    <div style={{ marginTop: 10, paddingTop: 6, borderTop: `1px solid ${LINE}`, display: "flex", justifyContent: "space-between", fontSize: 8.5, color: MUTE }}>
      <span><span style={ltr}>{showroom?.name || "Showroom"}</span> — {x.thanks}</span>
      <span>{x.generatedOn} <span style={ltr}>{formatDate(new Date())}</span></span>
    </div>
  );
}

// ============================================================================
// Purchase Invoice
// ============================================================================
export function PurchaseInvoice({ purchase, showroom, lang = "fr" }) {
  const x = tr(lang);
  const isSupplier = purchase.sourceType === "SUPPLIER";
  return (
    <div style={sheetStyle(lang)}>
      <Header showroom={showroom} lang={lang} />
      <TitleBar
        lang={lang}
        title={x.purchaseTitle}
        reference={purchase.reference || purchase.id}
        date={formatDateTime(purchase.date)}
        extra={isSupplier ? x.purchaseExtraSupplier : x.purchaseExtraClient}
      />
      <div style={grid2}>
        {isSupplier
          ? <SupplierBlock supplier={purchase.supplier} lang={lang} />
          : <ClientBlock client={purchase.client} title={x.clientSeller} lang={lang} />}
        <CarBlock car={purchase.car} lang={lang} />
      </div>

      <div style={{ marginTop: 10 }}>
        <MoneyFrame
          lang={lang}
          title={x.financialInfo}
          lines={[
            { label: x.purchasePrice, value: formatAmount(purchase.purchasePrice), strong: true },
            // when the deal was struck in dollars, the invoice states the $ amount
            // and the rate it was converted at
            ...(isUsd(purchase.purchaseCurrency, purchase.purchasePriceUsd)
              ? [
                  { label: x.priceUsd, value: formatUsd(purchase.purchasePriceUsd) },
                  { label: x.exchangeRate, value: formatRate(purchase.purchaseExchangeRate) },
                ]
              : []),
            { label: x.amountPaid, value: formatAmount(purchase.amountPaid) },
          ]}
          total={{ label: x.purchasePrice, value: formatAmount(purchase.purchasePrice) }}
          rest={{ label: x.rest, value: formatAmount(purchase.amountRest), danger: purchase.amountRest > 0 }}
        />
      </div>

      <InspectionBlock inspection={purchase.inspection} lang={lang} />
      <Signatures left={isSupplier ? x.sigSupplier : x.sigSeller} right={x.sigShowroom} />
      <Footer showroom={showroom} lang={lang} />
    </div>
  );
}

// ============================================================================
// Sale Invoice
// ============================================================================
export function SaleInvoice({ sale, showroom, lang = "fr" }) {
  const x = tr(lang);
  const lines = [{ label: x.basePrice, value: formatAmount(sale.totalBeforeTax), strong: true }];
  // The dollar amount stored on a sale is the base price; TVA / reduction land on
  // the dinar total. State both the $ base and the rate used.
  if (isUsd(sale.saleCurrency, sale.salePriceUsd)) {
    lines.push({ label: x.priceUsd, value: formatUsd(sale.salePriceUsd) });
    lines.push({ label: x.exchangeRate, value: formatRate(sale.saleExchangeRate) });
  }
  if (sale.tvaEnabled) {
    lines.push({ label: `${x.tva} (${sale.tvaRate}%)`, value: formatAmount(sale.totalAfterTax - sale.totalBeforeTax) });
    lines.push({ label: x.totalTTC, value: formatAmount(sale.totalAfterTax) });
  }
  if (sale.reductionType && sale.reductionType !== "NONE") {
    const label = sale.reductionType === "PERCENT" ? `${sale.reductionValue}%` : formatAmount(sale.reductionValue);
    lines.push({ label: `${x.reduction} (${label})`, value: `- ${formatAmount(sale.totalAfterTax - sale.totalAfterReduction)}` });
  }
  lines.push({ label: x.deposit, value: formatAmount(sale.amountPaid) });

  return (
    <div style={sheetStyle(lang)}>
      <Header showroom={showroom} lang={lang} />
      <TitleBar
        lang={lang}
        title={x.saleTitle}
        reference={sale.reference || sale.id}
        date={formatDateTime(sale.date)}
        extra={sale.saleType === "DEPOSIT" ? x.saleDeposit : x.saleNormal}
      />
      <div style={grid2}>
        <ClientBlock client={sale.client} lang={lang} />
        <CarBlock car={sale.car} lang={lang} />
      </div>

      <div style={{ marginTop: 10 }}>
        <MoneyFrame
          lang={lang}
          title={x.financialDetail}
          lines={lines}
          total={{
            label: x.totalToPay,
            value: isUsd(sale.saleCurrency, sale.salePriceUsd)
              ? `${formatAmount(sale.totalAfterReduction)}  (${formatUsd(dzdToUsd(sale.totalAfterReduction, sale.saleExchangeRate))})`
              : formatAmount(sale.totalAfterReduction),
          }}
          rest={{ label: x.rest, value: formatAmount(sale.amountRest), danger: sale.amountRest > 0 }}
        />
      </div>

      <InspectionBlock inspection={sale.inspection} lang={lang} />
      <Signatures left={x.sigClient} right={x.sigShowroom} />
      <Footer showroom={showroom} lang={lang} />
    </div>
  );
}

// ============================================================================
// Payment Receipt
// ============================================================================
export function PaymentReceipt({ payment, showroom, history = [], lang = "fr" }) {
  const x = tr(lang);
  return (
    <div style={sheetStyle(lang)}>
      <Header showroom={showroom} lang={lang} />
      <TitleBar lang={lang} title={x.receiptTitle} reference={payment.id} date={formatDateTime(payment.date)} />
      <div style={grid2}>
        <ClientBlock client={payment.client} lang={lang} />
        <CarBlock car={payment.car} lang={lang} />
      </div>

      <div style={{ marginTop: 10 }}>
        <MoneyFrame
          lang={lang}
          title={x.paymentDetail}
          lines={payment.description ? [{ label: x.description, value: payment.description }] : []}
          total={{ label: x.amountPaid, value: formatAmount(payment.amount) }}
        />
      </div>

      {history.length > 0 && (
        <Frame title={x.paymentHistory} style={{ marginTop: 10 }}>
          {history.map((p, i) => (
            <Row key={i} lang={lang} label={formatDate(p.date)} value={formatAmount(p.amount)} last={i === history.length - 1} />
          ))}
        </Frame>
      )}

      <Signatures left={x.sigClient} right={x.sigShowroom} />
      <Footer showroom={showroom} lang={lang} />
    </div>
  );
}

// ============================================================================
// Cash Register Receipt (Caisse — deposit / withdrawal)
// ============================================================================
export function CashTransactionInvoice({ transaction, showroom, lang = "fr" }) {
  const x = tr(lang);
  const t = transaction || {};
  const isWithdrawal = t.type === "WITHDRAWAL";
  // Deposit party — prefer the linked client record, otherwise the typed name/phone.
  const c = t.client || {};
  const partyName = `${c.firstName || ""} ${c.lastName || ""}`.trim() || t.clientName;

  return (
    <div style={sheetStyle(lang)}>
      <Header showroom={showroom} lang={lang} />
      <TitleBar
        lang={lang}
        title={isWithdrawal ? x.withdrawalTitle : x.depositTitle}
        reference={t.reference || t.id}
        date={formatDateTime(t.date)}
        extra={isWithdrawal ? x.withdrawalExtra : x.depositExtra}
      />

      {!isWithdrawal && (partyName || t.clientPhone) && (
        <Frame title={x.client} style={{ marginBottom: 10 }}>
          <Row lang={lang} label={x.fullName} value={partyName} strong />
          <Row lang={lang} label={x.phone} value={t.clientPhone || c.phonePrimary} last />
        </Frame>
      )}

      <MoneyFrame
        lang={lang}
        title={x.operationDetail}
        lines={t.description ? [{ label: x.description, value: t.description }] : []}
        total={{ label: x.amount, value: formatAmount(t.amount) }}
      />

      <Signatures left={isWithdrawal ? x.sigBeneficiary : x.sigClient} right={x.sigShowroom} />
      <Footer showroom={showroom} lang={lang} />
    </div>
  );
}
