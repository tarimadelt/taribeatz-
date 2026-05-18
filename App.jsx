import { useState, useRef, useEffect } from "react";

// ─── CONFIG ──────────────────────────────────────────────────────────────────
const PAYPAL_EMAIL = "goldj9574@gmail.com"; // ← YOUR PayPal account
const PLATFORM_NAME = "TARI BEATZ";
const ADMIN_PASSWORD = "TariAdmin2026"; // Change this!

const UPLOAD_TIERS = [
  { id: "starter", name: "Starter Share", price: 9.99, color: "#6B7280", slots: 3, badge: null, perks: ["List up to 3 beats", "Basic profile page", "Standard placement", "7-day listing"] },
  { id: "producer", name: "Producer Share", price: 24.99, color: "#0EA5E9", slots: 10, badge: "POPULAR", perks: ["List up to 10 beats", "Featured profile", "Priority placement", "30-day listing", "Analytics access"] },
  { id: "label", name: "Label Share", price: 59.99, color: "#8B5CF6", slots: 999, badge: "UNLIMITED", perks: ["Unlimited beats", "Label profile page", "Top placement", "90-day listing", "Analytics + Insights", "Custom banner"] },
];

const LICENSES = [
  { id: "basic", name: "Basic Lease", price: 29.99, color: "#6B7280", badge: null, features: ["MP3 File", "5,000 streams", "2,500 downloads", "1 music video", "Non-profit use only"] },
  { id: "premium", name: "Premium Lease", price: 59.99, color: "#0EA5E9", badge: "POPULAR", features: ["MP3 + WAV Files", "Unlimited streams", "Unlimited downloads", "Unlimited music videos", "Profit allowed"] },
  { id: "unlimited", name: "Unlimited Lease", price: 99.99, color: "#8B5CF6", badge: null, features: ["MP3 + WAV + Stems", "Unlimited everything", "Radio ready", "Sync licensing allowed", "TV & film use"] },
  { id: "exclusive", name: "Exclusive Rights", price: 299.99, color: "#F59E0B", badge: "EXCLUSIVE", features: ["All files + Stems", "Full ownership transfer", "Beat removed from store", "Unlimited commercial use", "Contract included"] },
];

const GENRES = ["All", "Trap", "Drill", "R&B", "Hip-Hop", "Lo-fi", "Soul", "Pop", "Afrobeats", "Dancehall"];

const DEFAULT_BEATS = [
  { id: 1, title: "Midnight Cipher", bpm: 140, key: "F# Min", genre: "Trap", duration: 187, plays: 4821, producer: "TariMadeIt", verified: true, price: 29.99 },
  { id: 2, title: "Golden Hour", bpm: 92, key: "C Maj", genre: "R&B", duration: 203, plays: 3102, producer: "TariMadeIt", verified: true, price: 29.99 },
  { id: 3, title: "Steel Curtain", bpm: 145, key: "D Min", genre: "Drill", duration: 174, plays: 6540, producer: "TariMadeIt", verified: true, price: 29.99 },
  { id: 4, title: "Lotus Garden", bpm: 85, key: "A Maj", genre: "Lo-fi", duration: 215, plays: 2987, producer: "TariMadeIt", verified: true, price: 29.99 },
  { id: 5, title: "Apex", bpm: 160, key: "E Min", genre: "Hip-Hop", duration: 162, plays: 5213, producer: "TariMadeIt", verified: true, price: 29.99 },
  { id: 6, title: "Nova", bpm: 130, key: "D Maj", genre: "Pop", duration: 198, plays: 3421, producer: "TariMadeIt", verified: true, price: 29.99 },
];

function fmtTime(s) { return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`; }
function genWave(seed, bars = 55) { return Array.from({ length: bars }, (_, i) => Math.sin(seed * 9301 + i * 49297 + 233) * 0.42 + 0.58); }
let waveCache = {};
DEFAULT_BEATS.forEach(b => { waveCache[b.id] = genWave(b.id); });

function buildPayPalUrl(amount, description, returnUrl = "https://taribeatz.com/success") {
  const params = new URLSearchParams({
    cmd: "_xclick",
    business: PAYPAL_EMAIL,
    item_name: description,
    amount: amount.toFixed(2),
    currency_code: "USD",
    return: returnUrl,
    cancel_return: returnUrl,
    no_note: "1",
    no_shipping: "1",
  });
  return `https://www.paypal.com/cgi-bin/webscr?${params.toString()}`;
}

export default function App() {
  const [page, setPage] = useState("store");
  const [beats, setBeats] = useState(DEFAULT_BEATS);
  const [cart, setCart] = useState([]);
  const [playing, setPlaying] = useState(null);
  const [progress, setProgress] = useState(0);
  const [genre, setGenre] = useState("All");
  const [search, setSearch] = useState("");
  const [selLic, setSelLic] = useState({});
  const [licModal, setLicModal] = useState(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [notif, setNotif] = useState(null);

  // Upload system
  const [uploadModal, setUploadModal] = useState(false);
  const [uploadStep, setUploadStep] = useState(1); // 1=tier, 2=beat info, 3=paypal, 4=success
  const [selectedTier, setSelectedTier] = useState(null);
  const [uploadForm, setUploadForm] = useState({ title: "", bpm: "", key: "", genre: "Trap", producerName: "", email: "" });
  const [uploadedFile, setUploadedFile] = useState(null);

  // Admin
  const [adminModal, setAdminModal] = useState(false);
  const [adminAuth, setAdminAuth] = useState(false);
  const [adminPass, setAdminPass] = useState("");
  const [adminPassErr, setAdminPassErr] = useState(false);
  const [adminUploadForm, setAdminUploadForm] = useState({ title: "", bpm: "", key: "", genre: "Trap" });

  const ivRef = useRef(null);
  const progRef = useRef(0);
  const beatIdRef = useRef(100);

  const showNotif = (msg, type = "info") => { setNotif({ msg, type }); setTimeout(() => setNotif(null), 3000); };

  const togglePlay = id => {
    clearInterval(ivRef.current);
    if (playing === id) { setPlaying(null); return; }
    setPlaying(id); progRef.current = 0; setProgress(0);
    const dur = beats.find(b => b.id === id)?.duration || 180;
    ivRef.current = setInterval(() => {
      progRef.current += 1 / dur;
      if (progRef.current >= 1) { progRef.current = 0; setPlaying(null); clearInterval(ivRef.current); }
      setProgress(progRef.current);
    }, 1000);
  };
  useEffect(() => () => clearInterval(ivRef.current), []);

  const getLic = id => selLic[id] || "premium";
  const addToCart = beat => {
    const lic = getLic(beat.id);
    const licObj = LICENSES.find(l => l.id === lic);
    if (cart.find(i => i.beatId === beat.id && i.licenseId === lic)) { showNotif("Already in cart", "warn"); setLicModal(null); return; }
    setCart(c => [...c, { beatId: beat.id, licenseId: lic, title: beat.title, producer: beat.producer, price: licObj.price, licenseName: licObj.name }]);
    showNotif(`"${beat.title}" added to cart ✓`, "success");
    setLicModal(null);
  };

  const cartTotal = cart.reduce((s, i) => s + i.price, 0);
  const filtered = beats.filter(b => (genre === "All" || b.genre === genre) && b.title.toLowerCase().includes(search.toLowerCase()));

  // Build PayPal cart checkout URL
  const buildCartPayPalUrl = () => {
    if (cart.length === 1) {
      return buildPayPalUrl(cartTotal, `${PLATFORM_NAME} - ${cart[0].title} (${cart[0].licenseName})`);
    }
    const params = new URLSearchParams({ cmd: "_cart", upload: "1", business: PAYPAL_EMAIL, currency_code: "USD", no_shipping: "1" });
    cart.forEach((item, i) => {
      const n = i + 1;
      params.append(`item_name_${n}`, `${item.title} - ${item.licenseName}`);
      params.append(`amount_${n}`, item.price.toFixed(2));
      params.append(`quantity_${n}`, "1");
    });
    return `https://www.paypal.com/cgi-bin/webscr?${params.toString()}`;
  };

  // Admin add beat
  const adminAddBeat = () => {
    if (!adminUploadForm.title || !adminUploadForm.bpm) { showNotif("Fill in all fields", "warn"); return; }
    const newId = ++beatIdRef.current;
    waveCache[newId] = genWave(newId);
    const newBeat = {
      id: newId,
      title: adminUploadForm.title,
      bpm: parseInt(adminUploadForm.bpm) || 140,
      key: adminUploadForm.key || "C Maj",
      genre: adminUploadForm.genre,
      duration: 180,
      plays: 0,
      producer: "TariMadeIt",
      verified: true,
      price: 29.99,
    };
    setBeats(b => [newBeat, ...b]);
    setAdminUploadForm({ title: "", bpm: "", key: "", genre: "Trap" });
    showNotif(`"${newBeat.title}" added to store ✓`, "success");
    setAdminModal(false);
  };

  // Producer upload final step
  const producerUploadBeat = () => {
    const newId = ++beatIdRef.current;
    waveCache[newId] = genWave(newId);
    const newBeat = {
      id: newId,
      title: uploadForm.title || "Untitled Beat",
      bpm: parseInt(uploadForm.bpm) || 140,
      key: uploadForm.key || "C Maj",
      genre: uploadForm.genre,
      duration: 180,
      plays: 0,
      producer: uploadForm.producerName || "Unknown Producer",
      verified: false,
      price: 29.99,
      pendingPayment: true,
    };
    setBeats(b => [newBeat, ...b]);
    setUploadStep(4);
  };

  const NAV = [
    { id: "store", label: "Beats" },
    { id: "licensing", label: "Licensing" },
    { id: "upload", label: "🎛️ Upload Beat", action: () => { setUploadModal(true); setUploadStep(1); } },
    { id: "about", label: "About" },
  ];

  return (
    <div style={S.root}>
      {/* NOTIFICATION */}
      {notif && <div style={{ ...S.notif, background: notif.type === "success" ? "#059669" : notif.type === "warn" ? "#D97706" : "#0EA5E9" }}>{notif.msg}</div>}

      {/* NAV */}
      <nav style={S.nav}>
        <div style={S.navInner}>
          <div style={S.logo} onClick={() => setPage("store")}>
            <span style={S.logoMark}>▲</span>
            <div><div style={S.logoText}>TARI BEATZ</div><div style={S.logoSub}>by TariMadeIt</div></div>
          </div>
          <div style={S.navLinks}>
            {NAV.map(n => (
              <button key={n.id} style={{ ...S.navLink, ...(page === n.id && !n.action ? S.navLinkActive : n.action ? S.navLinkUpload : {}) }}
                onClick={() => n.action ? n.action() : setPage(n.id)}>{n.label}</button>
            ))}
          </div>
          <div style={S.navRight}>
            <button style={S.adminBtn} onClick={() => setAdminModal(true)} title="Admin">🔒</button>
            <button style={S.cartBtn} onClick={() => setCartOpen(true)}>🛒 <span style={S.cartBadge}>{cart.length}</span></button>
            <button style={S.menuBtn} onClick={() => setMobileMenu(m => !m)}>☰</button>
          </div>
        </div>
        {mobileMenu && (
          <div style={S.mobileMenu}>
            {NAV.map(n => <button key={n.id} style={S.mobileItem} onClick={() => { n.action ? n.action() : setPage(n.id); setMobileMenu(false); }}>{n.label}</button>)}
            <button style={S.mobileItem} onClick={() => { setAdminModal(true); setMobileMenu(false); }}>🔒 Admin Panel</button>
          </div>
        )}
      </nav>

      {/* ── CART DRAWER ── */}
      {cartOpen && (
        <div style={S.overlay} onClick={() => setCartOpen(false)}>
          <div style={S.drawer} onClick={e => e.stopPropagation()}>
            <div style={S.drawerHead}><span style={S.drawerTitle}>Your Cart</span><button style={S.xBtn} onClick={() => setCartOpen(false)}>✕</button></div>
            {cart.length === 0
              ? <div style={S.cartEmpty}>Your cart is empty</div>
              : (
                <>
                  <div style={S.cartItems}>
                    {cart.map((item, i) => (
                      <div key={i} style={S.cartItem}>
                        <div>
                          <div style={S.ciTitle}>{item.title}</div>
                          <div style={S.ciLic}>{item.licenseName} · prod. {item.producer}</div>
                        </div>
                        <div style={S.ciRight}>
                          <span style={S.ciPrice}>${item.price.toFixed(2)}</span>
                          <button style={S.ciRm} onClick={() => setCart(c => c.filter((_, j) => j !== i))}>✕</button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={S.cartFoot}>
                    <div style={S.totalRow}><span>Total</span><span style={S.totalAmt}>${cartTotal.toFixed(2)}</span></div>

                    {/* PAYPAL CHECKOUT — Goes to goldj9574@gmail.com */}
                    <a href={buildCartPayPalUrl()} target="_blank" rel="noopener noreferrer" style={S.paypalCheckoutBtn} onClick={() => showNotif("Redirecting to PayPal...", "info")}>
                      <span style={S.paypalBtnLogo}>PayPal</span>
                      <span>Pay ${cartTotal.toFixed(2)}</span>
                    </a>

                    <div style={S.paypalNote}>
                      <span style={S.paypalNoteIcon}>🔒</span>
                      Payment goes directly to <strong style={{ color: "#009cde" }}>{PAYPAL_EMAIL}</strong>
                    </div>
                    <p style={S.cartNote}>Instant download delivered to your email after payment</p>
                  </div>
                </>
              )}
          </div>
        </div>
      )}

      {/* ── LICENSE MODAL ── */}
      {licModal && (
        <div style={{ ...S.overlay, justifyContent: "center", alignItems: "center" }} onClick={() => setLicModal(null)}>
          <div style={S.licModal} onClick={e => e.stopPropagation()}>
            <div style={S.licModalHead}>
              <span style={S.licModalTitle}>License — <em>{licModal.title}</em></span>
              <button style={S.xBtn} onClick={() => setLicModal(null)}>✕</button>
            </div>
            <div style={S.licGrid}>
              {LICENSES.map(lic => (
                <div key={lic.id} style={{ ...S.licCard, borderColor: getLic(licModal.id) === lic.id ? lic.color : "transparent" }} onClick={() => setSelLic(s => ({ ...s, [licModal.id]: lic.id }))}>
                  {lic.badge && <div style={{ ...S.licBadge, background: lic.color }}>{lic.badge}</div>}
                  <div style={{ ...S.licName, color: lic.color }}>{lic.name}</div>
                  <div style={S.licPrice}>${lic.price}</div>
                  <ul style={S.licFeat}>{lic.features.map((f, i) => <li key={i} style={S.licFeatItem}>✓ {f}</li>)}</ul>
                  <div style={{ ...S.licSel, background: getLic(licModal.id) === lic.id ? lic.color : "transparent", color: getLic(licModal.id) === lic.id ? "#fff" : lic.color, border: `1px solid ${lic.color}` }}>
                    {getLic(licModal.id) === lic.id ? "✓ Selected" : "Select"}
                  </div>
                </div>
              ))}
            </div>
            <div style={S.licModalFoot}>
              <button style={S.addCartBtn} onClick={() => addToCart(licModal)}>
                Add to Cart — ${LICENSES.find(l => l.id === getLic(licModal.id))?.price.toFixed(2)}
              </button>
              {/* Direct PayPal buy now */}
              <a href={buildPayPalUrl(LICENSES.find(l => l.id === getLic(licModal.id))?.price, `${licModal.title} - ${LICENSES.find(l => l.id === getLic(licModal.id))?.name}`)} target="_blank" rel="noopener noreferrer" style={S.buyNowBtn}>
                Buy Now via PayPal
              </a>
            </div>
          </div>
        </div>
      )}

      {/* ── PRODUCER UPLOAD MODAL ── */}
      {uploadModal && (
        <div style={{ ...S.overlay, justifyContent: "center", alignItems: "center" }} onClick={() => { setUploadModal(false); setUploadStep(1); }}>
          <div style={S.uploadModal} onClick={e => e.stopPropagation()}>

            {/* Step indicator */}
            <div style={S.stepBar}>
              {["Choose Plan", "Beat Info", "Pay & Upload", "Done"].map((label, i) => (
                <div key={i} style={S.stepItem}>
                  <div style={{ ...S.stepDot, background: uploadStep > i + 1 ? "#059669" : uploadStep === i + 1 ? "#0EA5E9" : "#1E293B", color: uploadStep >= i + 1 ? "#fff" : "#475569" }}>
                    {uploadStep > i + 1 ? "✓" : i + 1}
                  </div>
                  <div style={{ ...S.stepLabel, color: uploadStep === i + 1 ? "#E2E8F0" : "#475569" }}>{label}</div>
                </div>
              ))}
            </div>

            {/* STEP 1 — Choose tier */}
            {uploadStep === 1 && (
              <div style={S.uploadBody}>
                <div style={S.uploadTitle}>Upload Your Beats to {PLATFORM_NAME}</div>
                <p style={S.uploadSub}>Choose a share tier to list your beats. Your beats go live after payment is confirmed.</p>
                <div style={S.tierGrid}>
                  {UPLOAD_TIERS.map(tier => (
                    <div key={tier.id} style={{ ...S.tierCard, borderColor: selectedTier?.id === tier.id ? tier.color : "transparent" }} onClick={() => setSelectedTier(tier)}>
                      {tier.badge && <div style={{ ...S.licBadge, background: tier.color }}>{tier.badge}</div>}
                      <div style={{ ...S.tierName, color: tier.color }}>{tier.name}</div>
                      <div style={S.tierPrice}>${tier.price}<span style={S.tierPer}>/listing period</span></div>
                      <ul style={S.licFeat}>{tier.perks.map((p, i) => <li key={i} style={S.licFeatItem}>✓ {p}</li>)}</ul>
                      <div style={{ ...S.licSel, background: selectedTier?.id === tier.id ? tier.color : "transparent", color: selectedTier?.id === tier.id ? "#fff" : tier.color, border: `1px solid ${tier.color}` }}>
                        {selectedTier?.id === tier.id ? "✓ Selected" : "Select"}
                      </div>
                    </div>
                  ))}
                </div>
                <button style={{ ...S.uploadNextBtn, opacity: selectedTier ? 1 : 0.4 }} onClick={() => { if (selectedTier) setUploadStep(2); }}>
                  Continue with {selectedTier?.name || "a plan"} →
                </button>
              </div>
            )}

            {/* STEP 2 — Beat info */}
            {uploadStep === 2 && (
              <div style={S.uploadBody}>
                <div style={S.uploadTitle}>Tell Us About Your Beat</div>
                <p style={S.uploadSub}>Fill in the details. Your beat file will be verified before going live.</p>
                <div style={S.formGrid}>
                  {[
                    { label: "Beat Title *", key: "title", placeholder: "e.g. Night Drive" },
                    { label: "Your Producer Name *", key: "producerName", placeholder: "e.g. ProdByYou" },
                    { label: "Your Email *", key: "email", placeholder: "your@email.com" },
                    { label: "BPM *", key: "bpm", placeholder: "e.g. 140" },
                    { label: "Key", key: "key", placeholder: "e.g. F# Min" },
                  ].map(field => (
                    <div key={field.key} style={S.formField}>
                      <label style={S.formLabel}>{field.label}</label>
                      <input style={S.formInput} placeholder={field.placeholder} value={uploadForm[field.key]} onChange={e => setUploadForm(f => ({ ...f, [field.key]: e.target.value }))} />
                    </div>
                  ))}
                  <div style={S.formField}>
                    <label style={S.formLabel}>Genre *</label>
                    <select style={S.formInput} value={uploadForm.genre} onChange={e => setUploadForm(f => ({ ...f, genre: e.target.value }))}>
                      {GENRES.filter(g => g !== "All").map(g => <option key={g}>{g}</option>)}
                    </select>
                  </div>
                </div>
                <div style={S.fileUploadBox}>
                  <div style={S.fileUploadInner}>
                    <div style={S.fileUploadIcon}>🎵</div>
                    <div style={S.fileUploadText}>{uploadedFile ? `✓ ${uploadedFile}` : "Click to upload your beat file"}</div>
                    <div style={S.fileUploadSub}>MP3 or WAV · Max 50MB</div>
                    <input type="file" accept=".mp3,.wav" style={S.fileInput} onChange={e => { if (e.target.files[0]) setUploadedFile(e.target.files[0].name); }} />
                  </div>
                </div>
                <div style={S.stepBtns}>
                  <button style={S.backBtn} onClick={() => setUploadStep(1)}>← Back</button>
                  <button style={{ ...S.uploadNextBtn, flex: 1, opacity: (uploadForm.title && uploadForm.producerName && uploadForm.email) ? 1 : 0.4 }}
                    onClick={() => { if (uploadForm.title && uploadForm.producerName && uploadForm.email) setUploadStep(3); else showNotif("Fill in required fields", "warn"); }}>
                    Next → Review & Pay
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3 — Pay via PayPal */}
            {uploadStep === 3 && (
              <div style={S.uploadBody}>
                <div style={S.uploadTitle}>Review & Pay to Upload</div>
                <div style={S.reviewBox}>
                  <div style={S.reviewRow}><span style={S.reviewLabel}>Beat Title</span><span style={S.reviewVal}>{uploadForm.title}</span></div>
                  <div style={S.reviewRow}><span style={S.reviewLabel}>Producer</span><span style={S.reviewVal}>{uploadForm.producerName}</span></div>
                  <div style={S.reviewRow}><span style={S.reviewLabel}>Genre</span><span style={S.reviewVal}>{uploadForm.genre} · {uploadForm.bpm} BPM</span></div>
                  <div style={S.reviewRow}><span style={S.reviewLabel}>File</span><span style={S.reviewVal}>{uploadedFile || "No file selected"}</span></div>
                  <div style={S.reviewRow}><span style={S.reviewLabel}>Plan</span><span style={{ ...S.reviewVal, color: selectedTier?.color }}>{selectedTier?.name}</span></div>
                  <div style={{ ...S.reviewRow, borderBottom: "none", paddingBottom: 0 }}>
                    <span style={{ ...S.reviewLabel, fontSize: 16, fontWeight: 700, color: "#F1F5F9" }}>Total Due</span>
                    <span style={{ fontSize: 24, fontWeight: 900, color: "#10B981" }}>${selectedTier?.price.toFixed(2)}</span>
                  </div>
                </div>

                <div style={S.paypalBox}>
                  <div style={S.paypalBoxTitle}>💳 Pay with PayPal</div>
                  <p style={S.paypalBoxSub}>Payment goes to <strong style={{ color: "#009cde" }}>{PAYPAL_EMAIL}</strong>. After payment, your beat will be reviewed and listed within 24 hours.</p>

                  {/* Real PayPal payment link */}
                  <a
                    href={buildPayPalUrl(selectedTier?.price || 9.99, `${PLATFORM_NAME} Upload Fee - ${selectedTier?.name} - ${uploadForm.producerName}`)}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={S.paypalBigBtn}
                    onClick={() => setTimeout(() => producerUploadBeat(), 1500)}
                  >
                    <span style={{ fontSize: 20 }}>PayPal</span>
                    Pay ${selectedTier?.price.toFixed(2)} & Upload
                  </a>

                  <div style={S.paypalAlternate}>
                    <div style={S.paypalAltLabel}>Or send payment manually to:</div>
                    <div style={S.paypalEmail}>{PAYPAL_EMAIL}</div>
                    <div style={S.paypalAltNote}>Then email proof to: tari@taribeatz.com</div>
                  </div>
                </div>

                <div style={S.stepBtns}>
                  <button style={S.backBtn} onClick={() => setUploadStep(2)}>← Back</button>
                </div>
              </div>
            )}

            {/* STEP 4 — Success */}
            {uploadStep === 4 && (
              <div style={S.successBody}>
                <div style={S.bigCheckIcon}>✓</div>
                <div style={S.successTitle}>Beat Submitted!</div>
                <p style={S.successSub}>
                  <strong style={{ color: "#E2E8F0" }}>{uploadForm.title}</strong> by <strong style={{ color: "#0EA5E9" }}>{uploadForm.producerName}</strong> has been submitted. After payment confirmation, your beat will go live within 24 hours.
                </p>
                <div style={S.successDetails}>
                  <div style={S.successDetail}>📧 Confirmation sent to {uploadForm.email}</div>
                  <div style={S.successDetail}>⏱️ Live within 24 hours of payment</div>
                  <div style={S.successDetail}>💰 Revenue paid to your PayPal</div>
                </div>
                <button style={S.uploadNextBtn} onClick={() => { setUploadModal(false); setUploadStep(1); setUploadForm({ title: "", bpm: "", key: "", genre: "Trap", producerName: "", email: "" }); setUploadedFile(null); setSelectedTier(null); }}>
                  Back to Store
                </button>
              </div>
            )}

            {uploadStep < 4 && (
              <button style={S.modalCloseTop} onClick={() => { setUploadModal(false); setUploadStep(1); }}>✕</button>
            )}
          </div>
        </div>
      )}

      {/* ── ADMIN MODAL ── */}
      {adminModal && (
        <div style={{ ...S.overlay, justifyContent: "center", alignItems: "center" }} onClick={() => setAdminModal(false)}>
          <div style={S.adminModal} onClick={e => e.stopPropagation()}>
            <div style={S.adminHead}>
              <div style={S.adminTitle}>🔒 Admin Panel — TariMadeIt</div>
              <button style={S.xBtn} onClick={() => setAdminModal(false)}>✕</button>
            </div>

            {!adminAuth ? (
              <div style={S.adminBody}>
                <p style={S.adminSub}>Enter your admin password to upload beats directly.</p>
                <input
                  type="password"
                  style={{ ...S.formInput, marginBottom: 8 }}
                  placeholder="Admin password"
                  value={adminPass}
                  onChange={e => { setAdminPass(e.target.value); setAdminPassErr(false); }}
                  onKeyDown={e => { if (e.key === "Enter") { if (adminPass === ADMIN_PASSWORD) { setAdminAuth(true); setAdminPassErr(false); } else setAdminPassErr(true); } }}
                />
                {adminPassErr && <div style={S.passErr}>Incorrect password</div>}
                <button style={S.uploadNextBtn} onClick={() => {
                  if (adminPass === ADMIN_PASSWORD) { setAdminAuth(true); setAdminPassErr(false); } else setAdminPassErr(true);
                }}>Unlock Panel</button>
              </div>
            ) : (
              <div style={S.adminBody}>
                <div style={S.adminWelcome}>✓ Welcome, TariMadeIt. Add a beat to the store instantly.</div>
                <div style={S.formGrid}>
                  {[
                    { label: "Beat Title *", key: "title", placeholder: "e.g. Dark Wave" },
                    { label: "BPM *", key: "bpm", placeholder: "e.g. 140" },
                    { label: "Key", key: "key", placeholder: "e.g. F# Min" },
                  ].map(field => (
                    <div key={field.key} style={S.formField}>
                      <label style={S.formLabel}>{field.label}</label>
                      <input style={S.formInput} placeholder={field.placeholder} value={adminUploadForm[field.key]} onChange={e => setAdminUploadForm(f => ({ ...f, [field.key]: e.target.value }))} />
                    </div>
                  ))}
                  <div style={S.formField}>
                    <label style={S.formLabel}>Genre</label>
                    <select style={S.formInput} value={adminUploadForm.genre} onChange={e => setAdminUploadForm(f => ({ ...f, genre: e.target.value }))}>
                      {GENRES.filter(g => g !== "All").map(g => <option key={g}>{g}</option>)}
                    </select>
                  </div>
                </div>
                <button style={S.uploadNextBtn} onClick={adminAddBeat}>
                  ✓ Add Beat to Store
                </button>

                {/* Beat list management */}
                <div style={S.adminBeatList}>
                  <div style={S.adminBeatListTitle}>Current Beats ({beats.length})</div>
                  {beats.slice(0, 8).map(b => (
                    <div key={b.id} style={S.adminBeatRow}>
                      <div>
                        <span style={S.adminBeatName}>{b.title}</span>
                        <span style={S.adminBeatMeta}> · {b.producer} · {b.genre}</span>
                        {!b.verified && <span style={S.pendingBadge}>PENDING</span>}
                      </div>
                      <div style={S.adminBeatActions}>
                        {!b.verified && <button style={S.approveBtn} onClick={() => { setBeats(bs => bs.map(bb => bb.id === b.id ? { ...bb, verified: true, pendingPayment: false } : bb)); showNotif(`"${b.title}" approved ✓`, "success"); }}>Approve</button>}
                        <button style={S.deleteBtn} onClick={() => { setBeats(bs => bs.filter(bb => bb.id !== b.id)); showNotif(`"${b.title}" removed`, "warn"); }}>Remove</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <main style={S.main}>
        {/* ── STORE ── */}
        {page === "store" && (
          <div>
            <div style={S.hero}>
              <div style={S.heroTag}>TARI BEATZ · Prod. by TariMadeIt</div>
              <h1 style={S.heroH1}>Premium Beats<br />For Serious Artists</h1>
              <p style={S.heroP}>High-quality instrumentals across every genre. Instant PayPal delivery.</p>
              <div style={S.heroStats}>
                {[["200+", "Beats"], ["5K+", "Artists"], ["PayPal", "Secured"]].map(([n, l], i) => (
                  <div key={l} style={{ display: "flex", alignItems: "center" }}>
                    {i > 0 && <div style={S.statDiv} />}
                    <div style={S.heroStat}><strong>{n}</strong><span>{l}</span></div>
                  </div>
                ))}
              </div>
              <button style={S.heroUploadBtn} onClick={() => { setUploadModal(true); setUploadStep(1); }}>
                🎛️ Upload Your Beats & Earn Money
              </button>
            </div>

            <div style={S.filterBar}>
              <input style={S.searchInput} placeholder="Search beats..." value={search} onChange={e => setSearch(e.target.value)} />
              <div style={S.pills}>
                {GENRES.map(g => <button key={g} style={{ ...S.pill, ...(genre === g ? S.pillOn : {}) }} onClick={() => setGenre(g)}>{g}</button>)}
              </div>
            </div>

            <div style={S.beatList}>
              {filtered.map(beat => {
                const wf = waveCache[beat.id];
                const on = playing === beat.id;
                return (
                  <div key={beat.id} style={{ ...S.beatCard, ...(on ? S.beatCardOn : {}), ...(beat.pendingPayment ? S.beatCardPending : {}) }}>
                    <button style={{ ...S.playBtn, ...(on ? S.playBtnOn : {}) }} onClick={() => togglePlay(beat.id)}>{on ? "❚❚" : "▶"}</button>
                    <div style={S.beatInfo}>
                      <div style={S.beatTitleRow}>
                        <span style={S.beatTitle}>{beat.title}</span>
                        {beat.verified && <span style={S.verifiedBadge}>✓</span>}
                        {beat.pendingPayment && <span style={S.pendingTag}>Pending Review</span>}
                      </div>
                      <div style={S.beatMeta}>
                        <span style={S.beatGenre}>{beat.genre}</span>
                        <span style={S.dot}>·</span>
                        <span style={S.beatProd}>prod. {beat.producer}</span>
                        <span style={S.dot}>·</span>
                        <span>{beat.bpm} BPM</span>
                        <span style={S.dot}>·</span>
                        <span>{beat.key}</span>
                        <span style={S.dot}>·</span>
                        <span>{fmtTime(beat.duration)}</span>
                      </div>
                      <div style={S.waveform}>
                        {wf && wf.map((h, i) => (
                          <div key={i} style={{ ...S.waveBar, height: `${h * 100}%`, background: on && i / wf.length <= progress ? "#0EA5E9" : on ? "#334155" : "#1E293B" }} />
                        ))}
                      </div>
                    </div>
                    <div style={S.beatRight}>
                      <div style={S.plays}>▶ {beat.plays.toLocaleString()}</div>
                      {!beat.pendingPayment && (
                        <button style={S.licBtn} onClick={() => setLicModal(beat)}>License</button>
                      )}
                    </div>
                  </div>
                );
              })}
              {filtered.length === 0 && <div style={S.noRes}>No beats found</div>}
            </div>
          </div>
        )}

        {/* ── LICENSING ── */}
        {page === "licensing" && (
          <div style={{ paddingTop: 48 }}>
            <div style={S.pageHead}>
              <h2 style={S.pageTitle}>Licensing Options</h2>
              <p style={S.pageSub}>All licenses include instant delivery. Payment via PayPal to <span style={{ color: "#009cde" }}>{PAYPAL_EMAIL}</span>.</p>
            </div>
            <div style={S.licPageGrid}>
              {LICENSES.map(lic => (
                <div key={lic.id} style={{ ...S.licPageCard, borderTop: `3px solid ${lic.color}` }}>
                  {lic.badge && <div style={{ ...S.licBadge, background: lic.color }}>{lic.badge}</div>}
                  <div style={{ color: lic.color, fontWeight: 700, fontSize: 13, letterSpacing: 1, marginBottom: 8 }}>{lic.name}</div>
                  <div style={S.licPagePrice}>${lic.price}<span style={{ fontSize: 14, fontWeight: 400, color: "#64748B" }}>/beat</span></div>
                  <ul style={{ listStyle: "none", padding: 0, margin: "0 0 24px", display: "flex", flexDirection: "column", gap: 10 }}>
                    {lic.features.map((f, i) => <li key={i} style={{ fontSize: 13, color: "#94A3B8", display: "flex", gap: 8 }}><span style={{ color: lic.color }}>✓</span>{f}</li>)}
                  </ul>
                  <button style={{ ...S.licPageBtn, background: lic.color }} onClick={() => setPage("store")}>Browse Beats</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── ABOUT ── */}
        {page === "about" && (
          <div style={{ paddingTop: 48 }}>
            <div style={S.aboutHero}>
              <div style={S.avatar}>T</div>
              <h2 style={S.aboutName}>TariMadeIt</h2>
              <div style={S.aboutBrand}>TARI BEATZ</div>
              <p style={S.aboutRole}>Producer · Beatmaker · Sound Designer</p>
              <div style={S.socials}>
                {["Instagram", "YouTube", "Twitter", "SoundCloud"].map(s2 => <button key={s2} style={S.socialBtn}>{s2}</button>)}
              </div>
            </div>
            <div style={S.aboutGrid}>
              <div>
                <div style={S.secLabel}>About TariMadeIt</div>
                <p style={S.bioTxt}>TariMadeIt is the creative force behind TARI BEATZ. Every beat is hand-crafted, mixed and mastered to a professional standard across all genres.</p>
                <p style={S.bioTxt}>All beats are fully licensed and ready for commercial release. Payment via PayPal — instant delivery to your inbox.</p>
              </div>
              <div>
                <div style={S.secLabel}>Payment Info</div>
                <div style={S.payInfoCard}>
                  <div style={S.payInfoRow2}><span style={S.payInfoLabel2}>PayPal</span><span style={{ color: "#009cde", fontWeight: 700 }}>{PAYPAL_EMAIL}</span></div>
                  <div style={S.payInfoRow2}><span style={S.payInfoLabel2}>Delivery</span><span style={S.payInfoVal2}>Instant via email</span></div>
                  <div style={S.payInfoRow2}><span style={S.payInfoLabel2}>Formats</span><span style={S.payInfoVal2}>MP3, WAV, Stems</span></div>
                  <div style={{ ...S.payInfoRow2, borderBottom: "none" }}><span style={S.payInfoLabel2}>Support</span><span style={S.payInfoVal2}>tari@taribeatz.com</span></div>
                </div>
                <div style={S.contactBox}>
                  <div style={{ ...S.secLabel, marginBottom: 10 }}>John Watipa Kalambo</div>
                  <div style={{ color: "#F59E0B", fontSize: 12, fontWeight: 700, letterSpacing: 1, marginBottom: 8 }}>APP OWNER & PLATFORM DEVELOPER</div>
                  <a href="mailto:john@taribeatz.com" style={{ ...S.contactEmail, color: "#F59E0B" }}>john@taribeatz.com</a>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* FOOTER */}
      <footer style={S.footer}>
        <div style={S.footInner}>
          <div>
            <div style={S.footLogo}>▲ TARI BEATZ</div>
            <div style={S.footByline}>Beats by TariMadeIt · Platform by John Watipa Kalambo</div>
          </div>
          <span style={{ color: "#334155", fontSize: 13 }}>© 2026 TARI BEATZ. All rights reserved.</span>
          <div style={{ display: "flex", gap: 16 }}>
            <button style={S.footLink} onClick={() => setPage("licensing")}>Licensing</button>
            <button style={S.footLink} onClick={() => { setUploadModal(true); setUploadStep(1); }}>Upload Beats</button>
            <button style={S.footLink} onClick={() => setPage("about")}>About</button>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const S = {
  root: { fontFamily: "'DM Sans','Segoe UI',sans-serif", background: "#060B14", color: "#E2E8F0", minHeight: "100vh", display: "flex", flexDirection: "column" },
  notif: { position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", color: "#fff", padding: "10px 24px", borderRadius: 40, fontWeight: 600, fontSize: 14, zIndex: 9999, whiteSpace: "nowrap", boxShadow: "0 4px 24px rgba(0,0,0,.5)" },
  nav: { background: "rgba(6,11,20,.97)", borderBottom: "1px solid #0F172A", position: "sticky", top: 0, zIndex: 100, backdropFilter: "blur(12px)" },
  navInner: { maxWidth: 1100, margin: "0 auto", padding: "0 20px", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between" },
  logo: { display: "flex", alignItems: "center", gap: 10, cursor: "pointer" },
  logoMark: { color: "#0EA5E9", fontSize: 22, fontWeight: 900 },
  logoText: { fontWeight: 900, fontSize: 15, letterSpacing: 2, color: "#F1F5F9", lineHeight: 1.2 },
  logoSub: { fontSize: 10, color: "#0EA5E9", letterSpacing: 1.5, fontWeight: 600 },
  navLinks: { display: "flex", gap: 2 },
  navLink: { background: "none", border: "none", color: "#94A3B8", cursor: "pointer", fontSize: 13, fontWeight: 500, padding: "6px 12px", borderRadius: 8 },
  navLinkActive: { color: "#F1F5F9", background: "#0F172A" },
  navLinkUpload: { background: "#0EA5E9", color: "#fff", fontWeight: 700, borderRadius: 8 },
  navRight: { display: "flex", alignItems: "center", gap: 10 },
  adminBtn: { background: "#0F172A", border: "1px solid #1E293B", color: "#475569", cursor: "pointer", fontSize: 14, padding: "7px 10px", borderRadius: 8 },
  cartBtn: { background: "#0F172A", border: "1px solid #1E293B", color: "#E2E8F0", cursor: "pointer", fontSize: 14, fontWeight: 600, padding: "8px 16px", borderRadius: 10, display: "flex", alignItems: "center", gap: 6 },
  cartBadge: { background: "#0EA5E9", color: "#fff", borderRadius: 20, fontSize: 11, fontWeight: 700, padding: "1px 6px" },
  menuBtn: { display: "none", background: "none", border: "none", color: "#94A3B8", fontSize: 20, cursor: "pointer" },
  mobileMenu: { background: "#0A1120", borderTop: "1px solid #0F172A", padding: "12px 20px", display: "flex", flexDirection: "column", gap: 4 },
  mobileItem: { background: "none", border: "none", color: "#CBD5E1", cursor: "pointer", fontSize: 15, fontWeight: 500, textAlign: "left", padding: "10px 0" },
  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,.85)", zIndex: 200, display: "flex", justifyContent: "flex-end" },
  drawer: { background: "#0A1120", width: "100%", maxWidth: 420, height: "100%", overflow: "auto", display: "flex", flexDirection: "column", borderLeft: "1px solid #1E293B" },
  drawerHead: { padding: "20px 24px", borderBottom: "1px solid #1E293B", display: "flex", justifyContent: "space-between", alignItems: "center" },
  drawerTitle: { fontSize: 18, fontWeight: 700, color: "#F1F5F9" },
  xBtn: { background: "none", border: "none", color: "#94A3B8", cursor: "pointer", fontSize: 20 },
  cartEmpty: { flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#475569", fontSize: 15 },
  cartItems: { flex: 1, padding: "16px 24px", display: "flex", flexDirection: "column", gap: 12 },
  cartItem: { background: "#0F172A", borderRadius: 12, padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" },
  ciTitle: { fontWeight: 600, color: "#F1F5F9", fontSize: 14 },
  ciLic: { color: "#64748B", fontSize: 12, marginTop: 2 },
  ciRight: { display: "flex", alignItems: "center", gap: 12 },
  ciPrice: { fontWeight: 700, color: "#0EA5E9", fontSize: 15 },
  ciRm: { background: "none", border: "none", color: "#475569", cursor: "pointer", fontSize: 14 },
  cartFoot: { padding: "20px 24px", borderTop: "1px solid #1E293B" },
  totalRow: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, fontSize: 16, fontWeight: 600 },
  totalAmt: { color: "#0EA5E9", fontSize: 22, fontWeight: 800 },
  paypalCheckoutBtn: { display: "flex", alignItems: "center", justifyContent: "center", gap: 10, width: "100%", background: "#FFC439", border: "none", color: "#003087", fontWeight: 800, fontSize: 16, padding: 14, borderRadius: 12, cursor: "pointer", textDecoration: "none", boxShadow: "0 4px 16px rgba(255,196,57,.3)" },
  paypalBtnLogo: { background: "#003087", color: "#fff", padding: "2px 8px", borderRadius: 4, fontSize: 14, fontWeight: 900 },
  paypalNote: { marginTop: 12, background: "#0F172A", borderRadius: 10, padding: "10px 14px", fontSize: 12, color: "#94A3B8", display: "flex", alignItems: "center", gap: 8 },
  paypalNoteIcon: { fontSize: 14 },
  cartNote: { textAlign: "center", color: "#475569", fontSize: 12, marginTop: 10 },
  licModal: { background: "#0A1120", borderRadius: 20, width: "95%", maxWidth: 880, maxHeight: "90vh", overflow: "auto", border: "1px solid #1E293B" },
  licModalHead: { padding: "24px 28px", borderBottom: "1px solid #1E293B", display: "flex", justifyContent: "space-between", alignItems: "center" },
  licModalTitle: { fontSize: 18, fontWeight: 700, color: "#F1F5F9" },
  licGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 16, padding: "24px 28px" },
  licCard: { background: "#0F172A", borderRadius: 14, padding: 20, border: "2px solid transparent", cursor: "pointer", position: "relative" },
  licBadge: { position: "absolute", top: -10, right: 12, fontSize: 10, fontWeight: 800, color: "#fff", padding: "3px 8px", borderRadius: 20, letterSpacing: 1 },
  licName: { fontSize: 13, fontWeight: 700, letterSpacing: 0.5, marginBottom: 4 },
  licPrice: { fontSize: 24, fontWeight: 800, color: "#F1F5F9", marginBottom: 14 },
  licFeat: { listStyle: "none", padding: 0, margin: "0 0 16px", display: "flex", flexDirection: "column", gap: 6 },
  licFeatItem: { fontSize: 12, color: "#94A3B8" },
  licSel: { textAlign: "center", padding: "8px 0", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" },
  licModalFoot: { padding: "0 28px 28px", display: "flex", flexDirection: "column", gap: 10 },
  addCartBtn: { width: "100%", background: "#0EA5E9", border: "none", color: "#fff", fontWeight: 700, fontSize: 16, padding: 14, borderRadius: 12, cursor: "pointer" },
  buyNowBtn: { display: "block", textAlign: "center", width: "100%", background: "#FFC439", color: "#003087", fontWeight: 800, fontSize: 15, padding: 13, borderRadius: 12, textDecoration: "none", boxSizing: "border-box" },

  // Upload Modal
  uploadModal: { background: "#0A1120", borderRadius: 24, width: "95%", maxWidth: 720, maxHeight: "92vh", overflow: "auto", border: "1px solid #1E293B", position: "relative" },
  modalCloseTop: { position: "absolute", top: 20, right: 20, background: "none", border: "none", color: "#475569", cursor: "pointer", fontSize: 20, zIndex: 10 },
  stepBar: { display: "flex", justifyContent: "space-between", padding: "28px 32px 0", gap: 8 },
  stepItem: { display: "flex", flexDirection: "column", alignItems: "center", gap: 6, flex: 1 },
  stepDot: { width: 32, height: 32, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700 },
  stepLabel: { fontSize: 11, fontWeight: 600, letterSpacing: 0.5, textAlign: "center" },
  uploadBody: { padding: "24px 32px 32px" },
  uploadTitle: { fontSize: 22, fontWeight: 800, color: "#F1F5F9", marginBottom: 8 },
  uploadSub: { color: "#64748B", fontSize: 14, marginBottom: 24, lineHeight: 1.6 },
  tierGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 14, marginBottom: 24 },
  tierCard: { background: "#0F172A", borderRadius: 14, padding: 20, border: "2px solid transparent", cursor: "pointer", position: "relative" },
  tierName: { fontSize: 13, fontWeight: 700, letterSpacing: 0.5, marginBottom: 4 },
  tierPrice: { fontSize: 22, fontWeight: 800, color: "#F1F5F9", marginBottom: 14 },
  tierPer: { fontSize: 11, fontWeight: 400, color: "#64748B" },
  formGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 20 },
  formField: { display: "flex", flexDirection: "column", gap: 6 },
  formLabel: { fontSize: 12, fontWeight: 600, color: "#64748B", letterSpacing: 0.5 },
  formInput: { background: "#0F172A", border: "1px solid #1E293B", color: "#E2E8F0", borderRadius: 10, padding: "10px 14px", fontSize: 14, outline: "none", width: "100%", boxSizing: "border-box" },
  fileUploadBox: { border: "2px dashed #1E293B", borderRadius: 14, marginBottom: 20, cursor: "pointer", position: "relative" },
  fileUploadInner: { padding: "28px 20px", textAlign: "center", position: "relative" },
  fileUploadIcon: { fontSize: 32, marginBottom: 10 },
  fileUploadText: { color: "#E2E8F0", fontWeight: 600, fontSize: 15, marginBottom: 4 },
  fileUploadSub: { color: "#475569", fontSize: 13 },
  fileInput: { position: "absolute", inset: 0, opacity: 0, cursor: "pointer", width: "100%", height: "100%" },
  stepBtns: { display: "flex", gap: 12, marginTop: 4 },
  backBtn: { background: "#0F172A", border: "1px solid #1E293B", color: "#94A3B8", borderRadius: 10, padding: "12px 20px", fontSize: 14, fontWeight: 600, cursor: "pointer" },
  uploadNextBtn: { width: "100%", background: "#0EA5E9", border: "none", color: "#fff", fontWeight: 700, fontSize: 15, padding: 14, borderRadius: 12, cursor: "pointer" },

  reviewBox: { background: "#0F172A", borderRadius: 14, padding: "20px 24px", marginBottom: 24, display: "flex", flexDirection: "column", gap: 0 },
  reviewRow: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: "1px solid #1E293B" },
  reviewLabel: { color: "#64748B", fontSize: 13 },
  reviewVal: { color: "#E2E8F0", fontWeight: 600, fontSize: 14 },

  paypalBox: { background: "#0A0F1A", border: "1px solid #1E293B", borderRadius: 16, padding: "24px", marginBottom: 20 },
  paypalBoxTitle: { fontSize: 16, fontWeight: 800, color: "#F1F5F9", marginBottom: 8 },
  paypalBoxSub: { color: "#64748B", fontSize: 13, lineHeight: 1.7, marginBottom: 20 },
  paypalBigBtn: { display: "flex", alignItems: "center", justifyContent: "center", gap: 12, width: "100%", background: "#FFC439", border: "none", color: "#003087", fontWeight: 800, fontSize: 18, padding: "16px", borderRadius: 12, textDecoration: "none", boxSizing: "border-box", boxShadow: "0 4px 20px rgba(255,196,57,.3)", marginBottom: 20 },
  paypalAlternate: { background: "#0F172A", borderRadius: 12, padding: "14px 18px", textAlign: "center" },
  paypalAltLabel: { color: "#475569", fontSize: 12, marginBottom: 6 },
  paypalEmail: { color: "#009cde", fontWeight: 700, fontSize: 16, marginBottom: 6 },
  paypalAltNote: { color: "#334155", fontSize: 12 },

  successBody: { padding: "48px 32px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 16 },
  bigCheckIcon: { width: 80, height: 80, borderRadius: "50%", background: "#059669", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36, color: "#fff", fontWeight: 700 },
  successTitle: { fontSize: 28, fontWeight: 900, color: "#F1F5F9" },
  successSub: { color: "#64748B", fontSize: 15, lineHeight: 1.7, maxWidth: 420 },
  successDetails: { background: "#0F172A", borderRadius: 14, padding: "20px 24px", display: "flex", flexDirection: "column", gap: 12, width: "100%", maxWidth: 420 },
  successDetail: { color: "#94A3B8", fontSize: 14, textAlign: "left" },

  // Admin
  adminModal: { background: "#0A1120", borderRadius: 20, width: "95%", maxWidth: 600, maxHeight: "90vh", overflow: "auto", border: "1px solid #F59E0B44" },
  adminHead: { padding: "22px 28px", borderBottom: "1px solid #1E293B", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#0F172A" },
  adminTitle: { fontSize: 16, fontWeight: 800, color: "#F59E0B" },
  adminBody: { padding: "24px 28px", display: "flex", flexDirection: "column", gap: 16 },
  adminSub: { color: "#64748B", fontSize: 14 },
  passErr: { color: "#EF4444", fontSize: 13 },
  adminWelcome: { background: "#052e16", border: "1px solid #065f46", borderRadius: 10, padding: "10px 14px", color: "#6ee7b7", fontSize: 13, fontWeight: 600 },
  adminBeatList: { marginTop: 8, display: "flex", flexDirection: "column", gap: 0 },
  adminBeatListTitle: { fontSize: 12, fontWeight: 700, letterSpacing: 1, color: "#475569", textTransform: "uppercase", marginBottom: 10 },
  adminBeatRow: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #0F172A" },
  adminBeatName: { fontWeight: 600, color: "#E2E8F0", fontSize: 14 },
  adminBeatMeta: { color: "#475569", fontSize: 12 },
  pendingBadge: { background: "#78350f", color: "#FCD34D", fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20, marginLeft: 8 },
  adminBeatActions: { display: "flex", gap: 8 },
  approveBtn: { background: "#059669", border: "none", color: "#fff", fontSize: 12, fontWeight: 700, padding: "5px 12px", borderRadius: 6, cursor: "pointer" },
  deleteBtn: { background: "transparent", border: "1px solid #7f1d1d", color: "#EF4444", fontSize: 12, fontWeight: 600, padding: "5px 12px", borderRadius: 6, cursor: "pointer" },

  main: { flex: 1, maxWidth: 1100, margin: "0 auto", width: "100%", padding: "0 20px 80px" },
  hero: { textAlign: "center", padding: "64px 20px 40px" },
  heroTag: { display: "inline-block", background: "#0F172A", border: "1px solid #1E293B", color: "#0EA5E9", fontSize: 12, fontWeight: 600, letterSpacing: 2, padding: "5px 16px", borderRadius: 40, marginBottom: 24 },
  heroH1: { fontSize: "clamp(36px,6vw,64px)", fontWeight: 900, color: "#F1F5F9", lineHeight: 1.1, margin: "0 0 16px" },
  heroP: { color: "#64748B", fontSize: 16, maxWidth: 520, margin: "0 auto 28px" },
  heroStats: { display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 28 },
  heroStat: { display: "flex", flexDirection: "column", alignItems: "center", gap: 2, fontSize: 13, color: "#64748B" },
  statDiv: { width: 1, height: 32, background: "#1E293B", margin: "0 24px" },
  heroUploadBtn: { background: "linear-gradient(135deg,#8B5CF6,#0EA5E9)", border: "none", color: "#fff", fontWeight: 700, fontSize: 15, padding: "13px 28px", borderRadius: 40, cursor: "pointer", boxShadow: "0 4px 20px rgba(139,92,246,.3)" },
  filterBar: { display: "flex", flexDirection: "column", gap: 14, marginBottom: 32 },
  searchInput: { background: "#0F172A", border: "1px solid #1E293B", color: "#E2E8F0", borderRadius: 12, padding: "12px 18px", fontSize: 15, outline: "none", width: "100%", boxSizing: "border-box" },
  pills: { display: "flex", gap: 8, flexWrap: "wrap" },
  pill: { background: "#0F172A", border: "1px solid #1E293B", color: "#94A3B8", borderRadius: 40, padding: "6px 16px", fontSize: 13, fontWeight: 500, cursor: "pointer" },
  pillOn: { background: "#0EA5E9", border: "1px solid #0EA5E9", color: "#fff" },
  beatList: { display: "flex", flexDirection: "column", gap: 12 },
  beatCard: { background: "#0A1120", border: "1px solid #0F172A", borderRadius: 16, padding: "18px 20px", display: "flex", alignItems: "center", gap: 18 },
  beatCardOn: { borderColor: "#0EA5E9" },
  beatCardPending: { opacity: 0.7, borderStyle: "dashed", borderColor: "#78350f" },
  playBtn: { width: 46, height: 46, borderRadius: "50%", background: "#0F172A", border: "1px solid #1E293B", color: "#94A3B8", fontSize: 15, cursor: "pointer", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" },
  playBtnOn: { background: "#0EA5E9", border: "1px solid #0EA5E9", color: "#fff" },
  beatInfo: { flex: 1, minWidth: 0 },
  beatTitleRow: { display: "flex", alignItems: "center", gap: 8, marginBottom: 4 },
  beatTitle: { fontWeight: 700, color: "#F1F5F9", fontSize: 16 },
  verifiedBadge: { background: "#065f46", color: "#6ee7b7", fontSize: 10, fontWeight: 800, padding: "2px 7px", borderRadius: 20 },
  pendingTag: { background: "#78350f", color: "#FCD34D", fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20 },
  beatMeta: { display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", fontSize: 12, color: "#64748B" },
  beatGenre: { background: "#0F172A", padding: "2px 8px", borderRadius: 20, color: "#0EA5E9", fontWeight: 600 },
  beatProd: { color: "#8B5CF6", fontWeight: 600 },
  dot: { color: "#1E293B" },
  waveform: { display: "flex", alignItems: "center", gap: 2, height: 36, marginTop: 10 },
  waveBar: { flex: 1, minWidth: 2, maxWidth: 4, borderRadius: 2 },
  beatRight: { display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8, flexShrink: 0 },
  plays: { fontSize: 12, color: "#475569" },
  licBtn: { background: "#0EA5E9", border: "none", color: "#fff", fontWeight: 700, fontSize: 13, padding: "8px 18px", borderRadius: 10, cursor: "pointer", whiteSpace: "nowrap" },
  noRes: { textAlign: "center", color: "#475569", padding: "60px 0", fontSize: 16 },
  pageHead: { textAlign: "center", marginBottom: 48 },
  pageTitle: { fontSize: "clamp(28px,5vw,48px)", fontWeight: 900, color: "#F1F5F9", margin: "0 0 12px" },
  pageSub: { color: "#64748B", fontSize: 16, maxWidth: 580, margin: "0 auto" },
  licPageGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 20, marginBottom: 48 },
  licPageCard: { background: "#0A1120", border: "1px solid #0F172A", borderRadius: 16, padding: 28, position: "relative" },
  licPagePrice: { fontSize: 36, fontWeight: 900, color: "#F1F5F9", marginBottom: 24 },
  licPageBtn: { width: "100%", border: "none", color: "#fff", fontWeight: 700, fontSize: 14, padding: 12, borderRadius: 10, cursor: "pointer" },
  aboutHero: { textAlign: "center", marginBottom: 48 },
  avatar: { width: 100, height: 100, borderRadius: "50%", background: "linear-gradient(135deg,#0EA5E9,#8B5CF6)", margin: "0 auto 20px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36, fontWeight: 900, color: "#fff" },
  aboutName: { fontSize: 32, fontWeight: 900, color: "#F1F5F9", margin: "0 0 4px" },
  aboutBrand: { color: "#0EA5E9", fontWeight: 700, letterSpacing: 3, fontSize: 12, marginBottom: 8 },
  aboutRole: { color: "#64748B", fontSize: 15, marginBottom: 24 },
  socials: { display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" },
  socialBtn: { background: "#0F172A", border: "1px solid #1E293B", color: "#94A3B8", borderRadius: 40, padding: "7px 18px", fontSize: 13, fontWeight: 500, cursor: "pointer" },
  aboutGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 },
  secLabel: { fontSize: 11, fontWeight: 700, letterSpacing: 2, color: "#0EA5E9", textTransform: "uppercase", marginBottom: 16 },
  bioTxt: { color: "#94A3B8", lineHeight: 1.8, fontSize: 15, marginBottom: 16 },
  payInfoCard: { background: "#0A1120", border: "1px solid #0F172A", borderRadius: 14, overflow: "hidden", marginBottom: 20 },
  payInfoRow2: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 18px", borderBottom: "1px solid #0F172A" },
  payInfoLabel2: { color: "#475569", fontSize: 13 },
  payInfoVal2: { color: "#94A3B8", fontSize: 14, fontWeight: 500 },
  contactBox: { background: "#0A1120", border: "1px solid #0F172A", borderRadius: 16, padding: 24, marginTop: 0 },
  contactEmail: { color: "#0EA5E9", fontWeight: 600, fontSize: 15, textDecoration: "none" },
  footer: { background: "#040810", borderTop: "1px solid #0F172A", padding: "24px 0" },
  footInner: { maxWidth: 1100, margin: "0 auto", padding: "0 20px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 },
  footLogo: { fontWeight: 900, letterSpacing: 2, fontSize: 14, color: "#475569" },
  footByline: { fontSize: 11, color: "#1E293B", marginTop: 3 },
  footLink: { background: "none", border: "none", color: "#475569", cursor: "pointer", fontSize: 13 },
};
