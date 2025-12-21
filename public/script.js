/* public/script.js
   IVS Tuition Form — signature pad + PDF export + print + WhatsApp (app) share
*/
document.addEventListener("DOMContentLoaded", () => {
  initSignaturePad();
  wireButtons();
  initSingleGradeSelect();

  // ✅ Guardian WhatsApp Country Dropdown (same as admission form)
  initGuardianWhatsAppDropdown();

  // ✅ تھوڑا زیادہ delay تاکہ DOM مکمل load ہو جائے
  setTimeout(() => {
    autoFillRegDate();
  }, 1500);
});

// ✅ یہ function add کرنا ضروری ہے تاکہ error ختم ہو
function initSingleGradeSelect() {
  // اگر grade selection کا کوئی code نہیں ہے، تو فی الحال کچھ مت کریں
  return;
}

/* ---------- NEW: Auto-fill DATE OF REGISTRATION (MM/DD/YYYY boxes) ---------- */
function autoFillRegDate() {
  const container = document.getElementById("regBoxes");
  if (!container) return;

  const boxes = Array.from(container.querySelectorAll(".box"));
  if (!boxes.length) return;

  const anyFilled = boxes.some((b) => (b.value || "").trim() !== "");
  if (anyFilled) return;

  const now = new Date();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const yyyy = String(now.getFullYear());

  const seq = (mm + dd + yyyy).split("");
  boxes.forEach((b, i) => {
    if (i < seq.length) b.value = seq[i];
  });

  const hidden = document.getElementById("regDate");
  if (hidden) hidden.value = `${yyyy}-${mm}-${dd}`;
}

/* ---------- 1) SIGNATURE PAD (mouse + touch) ---------- */
let sigCanvas,
  sigCtx,
  isDrawing = false,
  lastPoint = null;

function initSignaturePad() {
  sigCanvas = document.getElementById("sig");
  if (!sigCanvas) return;

  sigCtx = sigCanvas.getContext("2d");
  sigCtx.lineWidth = 2;
  sigCtx.lineCap = "round";
  sigCtx.strokeStyle = "#0f172a";

  const getPos = (e) => {
    const t = e.touches ? e.touches[0] : e;
    const r = sigCanvas.getBoundingClientRect();
    return {
      x: (t.clientX - r.left) * (sigCanvas.width / r.width),
      y: (t.clientY - r.top) * (sigCanvas.height / r.height),
    };
  };

  const start = (e) => {
    isDrawing = true;
    lastPoint = getPos(e);
    e.preventDefault();
  };
  const move = (e) => {
    if (!isDrawing) return;
    const p = getPos(e);
    sigCtx.beginPath();
    sigCtx.moveTo(lastPoint.x, lastPoint.y);
    sigCtx.lineTo(p.x, p.y);
    sigCtx.stroke();
    lastPoint = p;
    e.preventDefault();
  };
  const end = () => {
    isDrawing = false;
    lastPoint = null;
  };

  sigCanvas.addEventListener("mousedown", start);
  sigCanvas.addEventListener("mousemove", move);
  document.addEventListener("mouseup", end);

  sigCanvas.addEventListener("touchstart", start, { passive: false });
  sigCanvas.addEventListener("touchmove", move, { passive: false });
  sigCanvas.addEventListener("touchend", end);

  const clr = document.getElementById("clearSig");
  if (clr)
    clr.addEventListener("click", () => {
      sigCtx.clearRect(0, 0, sigCanvas.width, sigCanvas.height);
    });
}

/* ---------- 2) BUTTON: PDF  ---------- */
const SCHOOL_WHATSAPP = "923355245551";

function wireButtons() {
  const pdfBtn = document.getElementById("btnPdf");
  if (pdfBtn)
    pdfBtn.addEventListener("click", () => exportPdfAndOpenWhatsAppApp());
}

/* Utility for signature if needed elsewhere */
function getSignatureDataURL() {
  if (!sigCanvas) return "";
  const blank = document.createElement("canvas");
  blank.width = sigCanvas.width;
  blank.height = sigCanvas.height;
  if (sigCanvas.toDataURL() === blank.toDataURL()) return "";
  return sigCanvas.toDataURL("image/png");
}

/* ---------- 3) Build PDF from .page elements ---------- */
async function buildPdfFromPages() {
  const { jsPDF } = window.jspdf;
  const pages = Array.from(document.querySelectorAll(".page"));
  if (!pages.length) return null;

  document.body.classList.add("pdf-export");
  const infoBar = document.querySelector(".info-bar");
  const prevBarDisp = infoBar ? infoBar.style.display : null;
  if (infoBar) infoBar.style.display = "none";

  await Promise.all(
    Array.from(document.images).map((img) => {
      if (img.complete) return Promise.resolve();
      return new Promise((res) => {
        img.onload = img.onerror = res;
      });
    })
  );

  const pdf = new jsPDF("p", "pt", "a4");

  for (let i = 0; i < pages.length; i++) {
    const el = pages[i];
    const canvas = await html2canvas(el, {
      scale: 2.2,
      useCORS: true,
      backgroundColor: "#ffffff",
      windowWidth: 980,
      scrollX: 0,
      scrollY: 0,
    });

    const img = canvas.toDataURL("image/jpeg", 0.95);
    if (i > 0) pdf.addPage();
    pdf.addImage(img, "JPEG", 0, 0, 595, 842);
  }

  if (infoBar) infoBar.style.display = prevBarDisp || "";
  document.body.classList.remove("pdf-export");

  const filename = `IVS-Admission-${new Date().toISOString().slice(0, 10)}.pdf`;
  return { pdf, filename };
}

/* ---------- 4) Export PDF + WhatsApp ---------- */
async function exportPdfAndOpenWhatsAppApp() {
  const built = await buildPdfFromPages();
  if (!built) return;
  const { pdf, filename } = built;

  const blob = pdf.output("blob");
  const file = new File([blob], filename, { type: "application/pdf" });

  const student =
    document.getElementById("studentName")?.value?.trim() || "student";
  const caption =
    `IVS Tuition Form for ${student}\nSession: 2025–26\n\nPlease review the attached PDF. Thank you.`;

  try {
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({
        files: [file],
        title: "IVS Tuition Form",
        text: caption,
      });
      try {
        pdf.save(filename);
      } catch {}
      return;
    }
  } catch (err) {
    console.warn("Native share failed:", err);
  }

  try {
    pdf.save(filename);
  } catch {}
  const helper =
    `Assalamu Alaikum. I have saved my tuition form PDF (${filename}). I will attach the file here and send.`;
  const deepLink = `whatsapp://send?text=${encodeURIComponent(helper)}`;
  window.location.href = deepLink;

  setTimeout(() => {
    alert(
      "If WhatsApp didn’t open automatically, please open the WhatsApp app and attach the saved PDF from your downloads."
    );
  }, 1200);
}

/* ---------- LIVE INVOICE AUTO-FILL (updates while user fills page 1) ---------- */
const gradeFee = {
  "KG-1": 120,
  "KG-2": 120,
  "Grade 1": 120,
  "Grade 2": 120,
  "Grade 3": 130,
  "Grade 4": 130,
  "Grade 5": 130,
  "Grade 6": 130,
  "Grade 7": 130,
  "Grade 8(Fed)": 140,
  "Grade 9(Fed)": 140,
  "Grade 10(Fed)": 150,
  "Grade 11(Fed)": 150,
  "Grade 12(Fed)": 150,
  "Grade 8(IGCSE)": 180,
  "Grade 9(IGCSE)": 250,
  "Grade 10(IGCSE)": 250,
  "Grade 11(IGCSE)": 250,
  "Grade 12(IGCSE)": 250,
};

// 🔹 حساب لگانے والا فنکشن
function calculateFee(grade, selectedSubjects) {
  const selectedCount = selectedSubjects.length;
  const fee = gradeFee[grade] || 0;
  const total = fee * selectedCount; // multiply per subject
  return total;
}

// 🔹 Invoice بھرنے والا فنکشن
function updateInvoice() {
  const studentName = document.getElementById("studentName")?.value || "";
  const fatherName = document.getElementById("fatherName")?.value || "";
  const grade = document.getElementById("grade")?.value || "";
  const selectedSubjects = Array.from(
    document.querySelectorAll('input[name="subjects"]:checked')
  );

  // 🆕 Other Subjects handle کرنے کے لیے
  const otherSubjectsInput = document.getElementById("igcse_text");
  let otherSubjectsCount = 0;
  if (otherSubjectsInput) {
    const others = otherSubjectsInput.value
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    otherSubjectsCount = others.length;
  }

  // اگر grade منتخب نہیں تو invoice صاف رکھیں
  if (!grade) {
    document.getElementById("invoiceNo").textContent = "";
    document.getElementById("parentName").textContent = "";
    document.getElementById("studentFor").textContent = "";
    document.getElementById("invoiceAmount").textContent = "";
    document.getElementById("totalAmount").textContent = "";
    return;
  }

  // Dates
  const today = new Date();
  const issuedOn = today.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const monthYear = today.toLocaleString("en-GB", {
    month: "short",
    year: "numeric",
  });
  const invoiceNo = Math.floor(100000 + Math.random() * 900000);

  // 💰 Fee Calculation (main change)
  const totalAmount =
    calculateFee(grade, selectedSubjects) +
    calculateFee(grade, Array(otherSubjectsCount).fill("extra"));

  // Fill invoice fields live
  document.getElementById("invoiceNo").textContent = invoiceNo;
  document.getElementById("parentName").textContent = fatherName;
  document.getElementById("issuedOn").textContent = issuedOn;
  document.getElementById("studentFor").textContent = `(${studentName})`;
  document.getElementById("monthYear").textContent = monthYear;
  document.getElementById("invoiceAmount").textContent = `${totalAmount} SAR/AED`;
  document.getElementById("totalAmount").textContent = totalAmount;
}

// 🔹 Real-time triggers
document.addEventListener("DOMContentLoaded", () => {
  const inputs = ["studentName", "fatherName", "grade"];

  // Listen on text/grade changes
  inputs.forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener("input", updateInvoice);
    if (el) el.addEventListener("change", updateInvoice);
  });

  // Listen on subjects checkboxes
  document.querySelectorAll('input[name="subjects"]').forEach((cb) => {
    cb.addEventListener("change", updateInvoice);
  });

  // 🆕 Listen on other subjects input
  const otherSubjectsInput = document.getElementById("igcse_text");
  if (otherSubjectsInput) {
    otherSubjectsInput.addEventListener("input", updateInvoice);
    otherSubjectsInput.addEventListener("change", updateInvoice);
  }

  // Initial fill (in case of reload)
  updateInvoice();
});

/* ---------- Guardian WhatsApp Country Dropdown (Search + Auto Code + Lock Code) ---------- */
/* SAME BEHAVIOR AS ADMISSION FORM. Works on #guardianWhatsapp input. */
function initGuardianWhatsAppDropdown() {
  const input = document.getElementById("guardianWhatsapp");
  if (!input) return;

  // Basic tel settings
  input.setAttribute("inputmode", "tel");
  input.setAttribute("autocomplete", "tel");

  // Until a country is selected, user cannot type the number
  input.readOnly = true;
  let countrySelected = false;

  // Wrap input in a relative container
  const wrapper = document.createElement("div");
  wrapper.style.position = "relative";
  wrapper.style.width = "100%";

  const parent = input.parentNode;
  parent.insertBefore(wrapper, input);
  wrapper.appendChild(input);

  // Dropdown container
  const dropdown = document.createElement("div");
  dropdown.style.position = "absolute";
  dropdown.style.top = "100%";
  dropdown.style.left = "0";
  dropdown.style.right = "0";
  dropdown.style.zIndex = "50";
  dropdown.style.background = "#ffffff";
  dropdown.style.border = "1px solid #cbd5e1";
  dropdown.style.borderRadius = "6px";
  dropdown.style.marginTop = "4px";
  dropdown.style.boxShadow = "0 4px 12px rgba(15,23,42,0.12)";
  dropdown.style.display = "none";
  wrapper.appendChild(dropdown);

  // Search box
  const search = document.createElement("input");
  search.type = "text";
  search.placeholder = "Search country...";
  search.style.width = "100%";
  search.style.boxSizing = "border-box";
  search.style.padding = "6px 10px";
  search.style.border = "none";
  search.style.borderBottom = "1px solid #e2e8f0";
  search.style.outline = "none";
  dropdown.appendChild(search);

  // List
  const list = document.createElement("div");
  list.style.maxHeight = "190px";
  list.style.overflowY = "auto";
  dropdown.appendChild(list);

  // Country list (same list as admission form)
  const COUNTRIES = [
    { name: "Afghanistan", code: "AF", dial: "+93" },
    { name: "Albania", code: "AL", dial: "+355" },
    { name: "Algeria", code: "DZ", dial: "+213" },
    { name: "Andorra", code: "AD", dial: "+376" },
    { name: "Angola", code: "AO", dial: "+244" },
    { name: "Antigua and Barbuda", code: "AG", dial: "+1268" },
    { name: "Argentina", code: "AR", dial: "+54" },
    { name: "Armenia", code: "AM", dial: "+374" },
    { name: "Australia", code: "AU", dial: "+61" },
    { name: "Austria", code: "AT", dial: "+43" },
    { name: "Azerbaijan", code: "AZ", dial: "+994" },

    { name: "Bahamas", code: "BS", dial: "+1242" },
    { name: "Bahrain", code: "BH", dial: "+973" },
    { name: "Bangladesh", code: "BD", dial: "+880" },
    { name: "Barbados", code: "BB", dial: "+1246" },
    { name: "Belarus", code: "BY", dial: "+375" },
    { name: "Belgium", code: "BE", dial: "+32" },
    { name: "Belize", code: "BZ", dial: "+501" },
    { name: "Benin", code: "BJ", dial: "+229" },
    { name: "Bhutan", code: "BT", dial: "+975" },
    { name: "Bolivia", code: "BO", dial: "+591" },
    { name: "Bosnia and Herzegovina", code: "BA", dial: "+387" },
    { name: "Botswana", code: "BW", dial: "+267" },
    { name: "Brazil", code: "BR", dial: "+55" },
    { name: "Brunei Darussalam", code: "BN", dial: "+673" },
    { name: "Bulgaria", code: "BG", dial: "+359" },
    { name: "Burkina Faso", code: "BF", dial: "+226" },
    { name: "Burundi", code: "BI", dial: "+257" },

    { name: "Cabo Verde", code: "CV", dial: "+238" },
    { name: "Cambodia", code: "KH", dial: "+855" },
    { name: "Cameroon", code: "CM", dial: "+237" },
    { name: "Canada", code: "CA", dial: "+1" },
    { name: "Central African Republic", code: "CF", dial: "+236" },
    { name: "Chad", code: "TD", dial: "+235" },
    { name: "Chile", code: "CL", dial: "+56" },
    { name: "China", code: "CN", dial: "+86" },
    { name: "Colombia", code: "CO", dial: "+57" },
    { name: "Comoros", code: "KM", dial: "+269" },
    { name: "Congo", code: "CG", dial: "+242" },
    { name: "Congo, Democratic Republic", code: "CD", dial: "+243" },
    { name: "Costa Rica", code: "CR", dial: "+506" },
    { name: "Côte d’Ivoire", code: "CI", dial: "+225" },
    { name: "Croatia", code: "HR", dial: "+385" },
    { name: "Cuba", code: "CU", dial: "+53" },
    { name: "Cyprus", code: "CY", dial: "+357" },
    { name: "Czech Republic", code: "CZ", dial: "+420" },

    { name: "Denmark", code: "DK", dial: "+45" },
    { name: "Djibouti", code: "DJ", dial: "+253" },
    { name: "Dominica", code: "DM", dial: "+1767" },
    { name: "Dominican Republic", code: "DO", dial: "+1809" },

    { name: "Ecuador", code: "EC", dial: "+593" },
    { name: "Egypt", code: "EG", dial: "+20" },
    { name: "El Salvador", code: "SV", dial: "+503" },
    { name: "Equatorial Guinea", code: "GQ", dial: "+240" },
    { name: "Eritrea", code: "ER", dial: "+291" },
    { name: "Estonia", code: "EE", dial: "+372" },
    { name: "Eswatini", code: "SZ", dial: "+268" },
    { name: "Ethiopia", code: "ET", dial: "+251" },

    { name: "Fiji", code: "FJ", dial: "+679" },
    { name: "Finland", code: "FI", dial: "+358" },
    { name: "France", code: "FR", dial: "+33" },

    { name: "Gabon", code: "GA", dial: "+241" },
    { name: "Gambia", code: "GM", dial: "+220" },
    { name: "Georgia", code: "GE", dial: "+995" },
    { name: "Germany", code: "DE", dial: "+49" },
    { name: "Ghana", code: "GH", dial: "+233" },
    { name: "Greece", code: "GR", dial: "+30" },
    { name: "Grenada", code: "GD", dial: "+1473" },
    { name: "Guatemala", code: "GT", dial: "+502" },
    { name: "Guinea", code: "GN", dial: "+224" },
    { name: "Guinea-Bissau", code: "GW", dial: "+245" },
    { name: "Guyana", code: "GY", dial: "+592" },

    { name: "Haiti", code: "HT", dial: "+509" },
    { name: "Honduras", code: "HN", dial: "+504" },
    { name: "Hungary", code: "HU", dial: "+36" },

    { name: "Iceland", code: "IS", dial: "+354" },
    { name: "India", code: "IN", dial: "+91" },
    { name: "Indonesia", code: "ID", dial: "+62" },
    { name: "Iran", code: "IR", dial: "+98" },
    { name: "Iraq", code: "IQ", dial: "+964" },
    { name: "Ireland", code: "IE", dial: "+353" },
    { name: "Israel", code: "IL", dial: "+972" },
    { name: "Italy", code: "IT", dial: "+39" },

    { name: "Jamaica", code: "JM", dial: "+1876" },
    { name: "Japan", code: "JP", dial: "+81" },
    { name: "Jordan", code: "JO", dial: "+962" },

    { name: "Kazakhstan", code: "KZ", dial: "+7" },
    { name: "Kenya", code: "KE", dial: "+254" },
    { name: "Kiribati", code: "KI", dial: "+686" },
    { name: "Kuwait", code: "KW", dial: "+965" },
    { name: "Kyrgyzstan", code: "KG", dial: "+996" },

    { name: "Laos", code: "LA", dial: "+856" },
    { name: "Latvia", code: "LV", dial: "+371" },
    { name: "Lebanon", code: "LB", dial: "+961" },
    { name: "Lesotho", code: "LS", dial: "+266" },
    { name: "Liberia", code: "LR", dial: "+231" },
    { name: "Libya", code: "LY", dial: "+218" },
    { name: "Liechtenstein", code: "LI", dial: "+423" },
    { name: "Lithuania", code: "LT", dial: "+370" },
    { name: "Luxembourg", code: "LU", dial: "+352" },

    { name: "Madagascar", code: "MG", dial: "+261" },
    { name: "Malawi", code: "MW", dial: "+265" },
    { name: "Malaysia", code: "MY", dial: "+60" },
    { name: "Maldives", code: "MV", dial: "+960" },
    { name: "Mali", code: "ML", dial: "+223" },
    { name: "Malta", code: "MT", dial: "+356" },
    { name: "Marshall Islands", code: "MH", dial: "+692" },
    { name: "Mauritania", code: "MR", dial: "+222" },
    { name: "Mauritius", code: "MU", dial: "+230" },
    { name: "Mexico", code: "MX", dial: "+52" },
    { name: "Micronesia", code: "FM", dial: "+691" },
    { name: "Moldova", code: "MD", dial: "+373" },
    { name: "Monaco", code: "MC", dial: "+377" },
    { name: "Mongolia", code: "MN", dial: "+976" },
    { name: "Montenegro", code: "ME", dial: "+382" },
    { name: "Morocco", code: "MA", dial: "+212" },
    { name: "Mozambique", code: "MZ", dial: "+258" },
    { name: "Myanmar", code: "MM", dial: "+95" },

    { name: "Namibia", code: "NA", dial: "+264" },
    { name: "Nauru", code: "NR", dial: "+674" },
    { name: "Nepal", code: "NP", dial: "+977" },
    { name: "Netherlands", code: "NL", dial: "+31" },
    { name: "New Zealand", code: "NZ", dial: "+64" },
    { name: "Nicaragua", code: "NI", dial: "+505" },
    { name: "Niger", code: "NE", dial: "+227" },
    { name: "Nigeria", code: "NG", dial: "+234" },
    { name: "North Korea", code: "KP", dial: "+850" },
    { name: "North Macedonia", code: "MK", dial: "+389" },
    { name: "Norway", code: "NO", dial: "+47" },

    { name: "Oman", code: "OM", dial: "+968" },

    { name: "Pakistan", code: "PK", dial: "+92" },
    { name: "Palau", code: "PW", dial: "+680" },
    { name: "Palestine", code: "PS", dial: "+970" },
    { name: "Panama", code: "PA", dial: "+507" },
    { name: "Papua New Guinea", code: "PG", dial: "+675" },
    { name: "Paraguay", code: "PY", dial: "+595" },
    { name: "Peru", code: "PE", dial: "+51" },
    { name: "Philippines", code: "PH", dial: "+63" },
    { name: "Poland", code: "PL", dial: "+48" },
    { name: "Portugal", code: "PT", dial: "+351" },

    { name: "Qatar", code: "QA", dial: "+974" },

    { name: "Romania", code: "RO", dial: "+40" },
    { name: "Russia", code: "RU", dial: "+7" },
    { name: "Rwanda", code: "RW", dial: "+250" },

    { name: "Saint Kitts and Nevis", code: "KN", dial: "+1869" },
    { name: "Saint Lucia", code: "LC", dial: "+1758" },
    { name: "Saint Vincent and the Grenadines", code: "VC", dial: "+1784" },
    { name: "Samoa", code: "WS", dial: "+685" },
    { name: "San Marino", code: "SM", dial: "+378" },
    { name: "Sao Tome and Principe", code: "ST", dial: "+239" },
    { name: "Saudi Arabia", code: "SA", dial: "+966" },
    { name: "Senegal", code: "SN", dial: "+221" },
    { name: "Serbia", code: "RS", dial: "+381" },
    { name: "Seychelles", code: "SC", dial: "+248" },
    { name: "Sierra Leone", code: "SL", dial: "+232" },
    { name: "Singapore", code: "SG", dial: "+65" },
    { name: "Slovakia", code: "SK", dial: "+421" },
    { name: "Slovenia", code: "SI", dial: "+386" },
    { name: "Solomon Islands", code: "SB", dial: "+677" },
    { name: "Somalia", code: "SO", dial: "+252" },
    { name: "South Africa", code: "ZA", dial: "+27" },
    { name: "South Korea", code: "KR", dial: "+82" },
    { name: "South Sudan", code: "SS", dial: "+211" },
    { name: "Spain", code: "ES", dial: "+34" },
    { name: "Sri Lanka", code: "LK", dial: "+94" },
    { name: "Sudan", code: "SD", dial: "+249" },
    { name: "Suriname", code: "SR", dial: "+597" },
    { name: "Sweden", code: "SE", dial: "+46" },
    { name: "Switzerland", code: "CH", dial: "+41" },
    { name: "Syria", code: "SY", dial: "+963" },

    { name: "Taiwan", code: "TW", dial: "+886" },
    { name: "Tajikistan", code: "TJ", dial: "+992" },
    { name: "Tanzania", code: "TZ", dial: "+255" },
    { name: "Thailand", code: "TH", dial: "+66" },
    { name: "Timor-Leste", code: "TL", dial: "+670" },
    { name: "Togo", code: "TG", dial: "+228" },
    { name: "Tonga", code: "TO", dial: "+676" },
    { name: "Trinidad and Tobago", code: "TT", dial: "+1868" },
    { name: "Tunisia", code: "TN", dial: "+216" },
    { name: "Turkey", code: "TR", dial: "+90" },
    { name: "Turkmenistan", code: "TM", dial: "+993" },
    { name: "Tuvalu", code: "TV", dial: "+688" },

    { name: "Uganda", code: "UG", dial: "+256" },
    { name: "Ukraine", code: "UA", dial: "+380" },
    { name: "United Arab Emirates", code: "AE", dial: "+971" },
    { name: "United Kingdom", code: "GB", dial: "+44" },
    { name: "United States", code: "US", dial: "+1" },
    { name: "Uruguay", code: "UY", dial: "+598" },
    { name: "Uzbekistan", code: "UZ", dial: "+998" },

    { name: "Vanuatu", code: "VU", dial: "+678" },
    { name: "Vatican City", code: "VA", dial: "+39" },
    { name: "Venezuela", code: "VE", dial: "+58" },
    { name: "Vietnam", code: "VN", dial: "+84" },

    { name: "Yemen", code: "YE", dial: "+967" },

    { name: "Zambia", code: "ZM", dial: "+260" },
    { name: "Zimbabwe", code: "ZW", dial: "+263" },
  ];

  function renderList(filter = "") {
    const term = filter.trim().toLowerCase();
    list.innerHTML = "";

    COUNTRIES.filter((c) => {
      if (!term) return true;
      return (
        c.name.toLowerCase().includes(term) ||
        c.dial.replace("+", "").startsWith(term.replace("+", ""))
      );
    }).forEach((c) => {
      const item = document.createElement("div");
      item.textContent = `${c.name} (${c.dial})`;
      item.style.padding = "6px 10px";
      item.style.cursor = "pointer";
      item.style.fontSize = "13px";

      item.addEventListener("mouseenter", () => {
        item.style.background = "#e5f2ff";
      });
      item.addEventListener("mouseleave", () => {
        item.style.background = "transparent";
      });

      item.addEventListener("click", () => {
        applyCountry(c, true);
        closeDropdown();
        input.focus();
        input.setSelectionRange(input.value.length, input.value.length);
      });

      list.appendChild(item);
    });

    if (!list.innerHTML) {
      const empty = document.createElement("div");
      empty.textContent = "No matches";
      empty.style.padding = "6px 10px";
      empty.style.fontSize = "12px";
      empty.style.color = "#64748b";
      list.appendChild(empty);
    }
  }

  function applyCountry(country, fromUser = false) {
    const digits = input.value.replace(/\D/g, "");
    let local = "";

    if (input.dataset.currentCode) {
      const prevCode = input.dataset.currentCode;
      if (digits.startsWith(prevCode)) {
        local = digits.slice(prevCode.length);
      } else {
        local = digits;
      }
    } else {
      local = digits;
    }

    const sanitizedLocal = local ? " " + local : "";
    input.value = country.dial + sanitizedLocal;
    input.dataset.currentCode = country.dial.replace(/\D/g, "");
    input.dataset.currentDial = country.dial;

    if (fromUser) {
      countrySelected = true;
      input.readOnly = false;
    }
  }

  function openDropdown() {
    dropdown.style.display = "block";
    renderList(search.value);
  }

  function closeDropdown() {
    dropdown.style.display = "none";
  }

  input.addEventListener("focus", openDropdown);
  input.addEventListener("click", openDropdown);

  search.addEventListener("input", () => renderList(search.value));

  document.addEventListener("click", (e) => {
    if (!wrapper.contains(e.target)) closeDropdown();
  });

  // Input guard
  input.addEventListener("input", () => {
    const dial = input.dataset.currentDial || "";

    if (!dial || !countrySelected) {
      input.value = "";
      input.readOnly = true;
      countrySelected = false;
      input.dataset.currentCode = "";
      input.dataset.currentDial = "";
      return;
    }

    if (!input.value.trim()) {
      input.value = "";
      input.readOnly = true;
      countrySelected = false;
      input.dataset.currentCode = "";
      input.dataset.currentDial = "";
      return;
    }

    if (!input.value.startsWith(dial)) {
      input.value = "";
      input.readOnly = true;
      countrySelected = false;
      input.dataset.currentCode = "";
      input.dataset.currentDial = "";
    }
  });

  // No default country — user must select first
}
