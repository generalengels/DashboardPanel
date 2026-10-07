/**
 * app.js – BetXsoft Shop Admin
 * Ortak durum (state), demo veriler, yardımcılar ve UI kabuğu (header / footer / drawer).
 * Sayfa içerikleri views.js içinde; olay bağlama app-runtime.js içinde.
 */

/* -------------------------------------------------------------------------- */
/* Dil: cihaz / localStorage ile başlangıç dili                                */
/* -------------------------------------------------------------------------- */
function initialSiteLanguage(){
  const supported=(window.BETXSOFT_I18N?.languages||[]).map(x=>x.code);
  try{
    const saved=localStorage.getItem('betxsoftLanguage');
    if(saved && supported.includes(saved)) return saved;
  }catch(_){}
  const deviceLanguage=String(navigator.language||navigator.userLanguage||'').toLowerCase();
  const primary=deviceLanguage.split('-')[0];
  const detected=supported.includes(primary)?primary:'en';
  try{ localStorage.setItem('betxsoftLanguage',detected); }catch(_){}
  return detected;
}

/* -------------------------------------------------------------------------- */
/* Mağaza girişi: kullanıcı adı, SHA-256 şifre, oturum bayrağı                */
/* -------------------------------------------------------------------------- */
const SHOP_LOGIN_USERNAME='loca25';
const SHOP_INITIAL_PASSWORD_HASH='09f9b2ca7fb069aa348872f33579c84324698040e7269791658ef5839097e998';
const SHOP_PASSWORD_HASH_KEY='betxsoftShopPasswordHash';
const SHOP_AUTH_SESSION_KEY='betxsoftShopAuthenticated';

function currentShopPasswordHash(){
  try{
    const stored=String(localStorage.getItem(SHOP_PASSWORD_HASH_KEY)||'').trim().toLowerCase();
    if(/^[a-f0-9]{64}$/.test(stored)) return stored;
  }catch(_){}
  return SHOP_INITIAL_PASSWORD_HASH;
}
function saveShopPasswordHash(hash){
  const normalized=String(hash||'').toLowerCase();
  if(!/^[a-f0-9]{64}$/.test(normalized)) return false;
  try{
    localStorage.setItem(SHOP_PASSWORD_HASH_KEY,normalized);
    return String(localStorage.getItem(SHOP_PASSWORD_HASH_KEY)||'').trim().toLowerCase()===normalized;
  }catch(_){
    return false;
  }
}
async function hashShopPassword(value){
  const bytes=new TextEncoder().encode(String(value||''));
  const digest=await crypto.subtle.digest('SHA-256',bytes);
  return Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
}
function shopAuthSession(){
  try{ return sessionStorage.getItem(SHOP_AUTH_SESSION_KEY)==='1'; }
  catch(_){ return false; }
}
function setShopAuthSession(active){
  try{
    if(active) sessionStorage.setItem(SHOP_AUTH_SESSION_KEY,'1');
    else sessionStorage.removeItem(SHOP_AUTH_SESSION_KEY);
  }catch(_){}
}

/* -------------------------------------------------------------------------- */
/* Boşta kalma: 10 dk sonra otomatik çıkış (sessionStorage süresi)            */
/* -------------------------------------------------------------------------- */
const SHOP_IDLE_TIMEOUT_MS=10*60*1000;
const SHOP_IDLE_EXPIRY_KEY='betxsoftShopIdleExpiresAt';
const SHOP_LEGACY_ACTIVITY_KEY='betxsoftShopLastActivityAt';
let shopIdleTimer=null;
let shopIdleWatchdog=null;
let shopIdleExpiry=0;
let shopLastActivityWrite=0;

function readShopIdleExpiry(){
  if(Number.isFinite(shopIdleExpiry) && shopIdleExpiry>0) return shopIdleExpiry;
  try{
    // Remove the old v222 activity value. It must never be reused for a new login.
    sessionStorage.removeItem(SHOP_LEGACY_ACTIVITY_KEY);
    const stored=Number(sessionStorage.getItem(SHOP_IDLE_EXPIRY_KEY)||0);
    if(Number.isFinite(stored) && stored>0){
      shopIdleExpiry=stored;
      return stored;
    }
  }catch(_){}
  return 0;
}
function writeShopIdleExpiry(expiry){
  const safe=Number(expiry);
  if(!Number.isFinite(safe) || safe<=0) return;
  shopIdleExpiry=safe;
  try{
    sessionStorage.setItem(SHOP_IDLE_EXPIRY_KEY,String(safe));
    sessionStorage.removeItem(SHOP_LEGACY_ACTIVITY_KEY);
  }catch(_){}
}
function clearShopIdleTracking(){
  if(shopIdleTimer){
    clearTimeout(shopIdleTimer);
    shopIdleTimer=null;
  }
  if(shopIdleWatchdog){
    clearInterval(shopIdleWatchdog);
    shopIdleWatchdog=null;
  }
  shopIdleExpiry=0;
  shopLastActivityWrite=0;
  try{
    sessionStorage.removeItem(SHOP_IDLE_EXPIRY_KEY);
    sessionStorage.removeItem(SHOP_LEGACY_ACTIVITY_KEY);
  }catch(_){}
}
function shopIdleSessionExpired(now=Date.now()){
  if(!state.authenticated) return false;
  const expiry=readShopIdleExpiry();
  return expiry>0 && now>=expiry;
}
function finishShopIdleLogout(){
  if(!state.authenticated) return;
  clearShopIdleTracking();
  setShopAuthSession(false);
  state.authenticated=false;
  state.drawer=false;
  state.languageOpen=false;
  state.customer='';
  state.amount='';
  state.committedFlow='';
  go('home');
  toast('Sitzung wegen Inaktivität beendet. Bitte erneut anmelden.');
}
function scheduleShopIdleLogout(){
  if(shopIdleTimer){
    clearTimeout(shopIdleTimer);
    shopIdleTimer=null;
  }
  if(!state.authenticated) return;

  let expiry=readShopIdleExpiry();
  if(!expiry){
    expiry=Date.now()+SHOP_IDLE_TIMEOUT_MS;
    writeShopIdleExpiry(expiry);
  }

  const remaining=expiry-Date.now();
  if(remaining<=0){
    finishShopIdleLogout();
    return;
  }

  shopIdleTimer=setTimeout(()=>{
    shopIdleTimer=null;
    if(!state.authenticated) return;
    if(shopIdleSessionExpired()) finishShopIdleLogout();
    else scheduleShopIdleLogout();
  },remaining);
}
function ensureShopIdleWatchdog(){
  if(shopIdleWatchdog || !state.authenticated) return;
  shopIdleWatchdog=setInterval(()=>{
    if(!state.authenticated) return;
    if(shopIdleSessionExpired()) finishShopIdleLogout();
  },5000);
}
function startShopIdleSession(){
  if(!state.authenticated) return;

  // A successful login always starts a completely fresh idle session.
  clearShopIdleTracking();

  const now=Date.now();
  shopLastActivityWrite=now;
  writeShopIdleExpiry(now+SHOP_IDLE_TIMEOUT_MS);
  ensureShopIdleWatchdog();
  scheduleShopIdleLogout();
}
function registerShopActivity(){
  if(!state.authenticated) return;

  const now=Date.now();

  // Never revive a session that has already expired.
  if(shopIdleSessionExpired(now)){
    finishShopIdleLogout();
    return;
  }

  // Limit storage writes while still treating normal activity as activity.
  if(now-shopLastActivityWrite<750) return;
  shopLastActivityWrite=now;
  writeShopIdleExpiry(now+SHOP_IDLE_TIMEOUT_MS);
  ensureShopIdleWatchdog();
  scheduleShopIdleLogout();
}
function installShopIdleLogout(){
  const events=['pointerdown','pointermove','mousedown','mousemove','keydown','wheel','touchstart','scroll'];
  events.forEach(type=>window.addEventListener(type,registerShopActivity,{passive:true}));

  document.addEventListener('visibilitychange',()=>{
    if(document.visibilityState!=='visible' || !state.authenticated) return;

    if(shopIdleSessionExpired()){
      finishShopIdleLogout();
      return;
    }

    // Returning to an active tab counts as user activity only if the session is still valid.
    registerShopActivity();
  });

  window.addEventListener('focus',()=>{
    if(!state.authenticated) return;
    if(shopIdleSessionExpired()){
      finishShopIdleLogout();
      return;
    }
    registerShopActivity();
  });

  if(state.authenticated){
    let expiry=readShopIdleExpiry();
    if(!expiry){
      expiry=Date.now()+SHOP_IDLE_TIMEOUT_MS;
      writeShopIdleExpiry(expiry);
    }

    if(Date.now()>=expiry){
      finishShopIdleLogout();
      return;
    }

    ensureShopIdleWatchdog();
    scheduleShopIdleLogout();
  }
}
/* -------------------------------------------------------------------------- */
/* Uygulama durumu: sessionStorage, rota → HTML URL                            */
/* -------------------------------------------------------------------------- */
const APP_STATE_STORAGE_KEY='betxsoftUiState';
function loadAppState(){
  try{
    const saved=JSON.parse(sessionStorage.getItem(APP_STATE_STORAGE_KEY)||'{}');
    return saved&&typeof saved==='object'&&!Array.isArray(saved)?saved:{};
  }catch(_){
    return {};
  }
}
function saveAppState(){
  try{ sessionStorage.setItem(APP_STATE_STORAGE_KEY,JSON.stringify(state)); }catch(_){}
}
function pageUrl(route){
  return route==='home'?'./index.html':`./${route}.html`;
}

/** Tek kaynak: filtreler, formlar, drawer ve scroll konumları */
const state = {
  // Genel
  language: initialSiteLanguage(),
  scrollTopOnNextRender: false,
  toggles: {},
  createdUsers: [],
  // Yatırma / çekim formları
  amount: '',
  customer: '',
  // Müşteri arama listesi
  customerFilter: '',
  customerIdFilter: '',
  customerNameFilter: '',
  customerStatusFilter: 'Alle',
  customerPage: 1,
  selectedCustomerId: '',
  customerListScrollY: 0,
  restoreCustomerScrollOnNextRender: false,
  customerSubpageFromSearch: false,
  editingCustomerId: '',
  // Hesap geçmişi
  historyStatusFilter: 'Alle',
  historyTypeFilter: 'Alle',
  historyPage: 1,
  // Kuponlar
  ticketFilter: '',
  ticketPage: 1,
  selectedCouponId: '',
  couponListScrollY: 0,
  restoreCouponScrollOnNextRender: false,
  // Ana sayfa dashboard
  dashboardPeriod: 'today',
  customRangeOpen: false,
  customFrom: '2026-08-01',
  customTo: '2026-08-13',
  customDashboard: null,
  // Muhasebe / ciro
  turnoverPeriod: 'week',
  turnoverRangeOpen: false,
  turnoverFrom: '2026-09-01',
  turnoverTo: '2026-09-21',
  turnoverRecordPage: 1,
  turnoverResetConfirm: false,
  ...loadAppState(),
  // Sayfa HTML’inden gelen rota; UI overlay’leri kayıtlı state’i ezer
  route: document.body.dataset.route || 'home',
  drawer: false,
  authenticated: true,
  languageOpen: false,
};

/* -------------------------------------------------------------------------- */
/* Dashboard KPI: dönem → yatırma / çekim / kâr demo değerleri                 */
/* -------------------------------------------------------------------------- */
const dashboardPeriods = {
  today: {deposit:12450, payout:8920, profit:3530},
  yesterday: {deposit:39760, payout:26340, profit:13420},
  week: {deposit:92430, payout:61870, profit:30560},
  month: {deposit:368161, payout:244748, profit:123413}
};

/* Toplam bakiye (localStorage) – header mobil “Gesamtbalance” */
const TOTAL_BALANCE_STORAGE_KEY='betxsoftTotalBalance';
const INITIAL_TOTAL_BALANCE=368161;
function totalBalanceValue(){
  try{
    const raw=localStorage.getItem(TOTAL_BALANCE_STORAGE_KEY);
    if(raw!==null && raw.trim()!==''){
      const stored=Number(raw);
      if(Number.isFinite(stored) && stored>=0) return Math.round(stored*100)/100;
    }
  }catch(_){}
  return INITIAL_TOTAL_BALANCE;
}
function setTotalBalance(value){
  const numeric=Number(value);
  if(!Number.isFinite(numeric) || numeric<0) return totalBalanceValue();
  const safe=Math.round(numeric*100)/100;
  try{ localStorage.setItem(TOTAL_BALANCE_STORAGE_KEY,String(safe)); }catch(_){}
  return safe;
}
function adjustTotalBalance(delta){
  const change=Number(delta);
  if(!Number.isFinite(change)) return totalBalanceValue();
  const next=Math.round((totalBalanceValue()+change)*100)/100;
  if(next<0) return totalBalanceValue();
  return setTotalBalance(next);
}

// Open tickets are a live/current total and must never depend on the dashboard period filter.
const currentOpenTickets = 42;

/* [routeId, i18n başlık, ikon] – menü ve document.title için */
const routes = [
  ['home','Startseite','⌂'],['deposit-1','Einzahlung – Daten','↓'],['deposit-2','Einzahlung – Übersicht','↓'],['deposit-3','Einzahlung – Bestätigung','✓'],
  ['payout-1','Auszahlung – Daten','↑'],['payout-2','Auszahlung – Übersicht','↑'],['payout-3','Auszahlung – Bestätigung','✓'],['customers','Kunden','♙'],
  ['history','Kontoverlauf','↔'],['create-user','Kunden erstellen','＋'],['coupons','Wettscheine','▧'],['coupon-filters','Zusätzliche Filter','⚙'],
  ['coupon-detail','Wettschein-Details','▤'],['turnover','Umsatz','↗'],['deposit-transactions','Einzahlungstransaktionen','↓'],['payout-transactions','Auszahlungstransaktionen','↑'],
  ['edit-customer','Kunde bearbeiten','✎'],['shop','Shop','♙']
];

/* -------------------------------------------------------------------------- */
/* Müşteriler: [id, kullanıcı adı, bakiye metni, durum]                      */
/* -------------------------------------------------------------------------- */
const customers = [
  ['4258','Toni1234','40,00','Aktiv'],['800','akdag67','25,63','Aktiv'],['901','Sahin','40,00','Aktiv'],['4638','David','20,00','Aktiv'],
  ['1073','Halil2','13,97','Aktiv'],['2258','Ali elmali','10,00','Aktiv'],['1567','jassin','9,00','Aktiv'],['5067','mica','5,50','Gesperrt'],
  ['6121','Murat78','845,50','Aktiv'],['6122','Selim88','620,00','Aktiv'],['6123','Burak1907','410,75','Aktiv'],['6124','Emre34','305,40','Aktiv'],
  ['6125','CanKaya','275,00','Aktiv'],['6126','Serkan10','198,60','Aktiv'],['6127','Mehmet06','155,20','Aktiv'],['6128','Eren27','119,90','Aktiv'],
  ['6129','Kerem44','88,40','Aktiv'],['6130','Deniz81','64,75','Aktiv'],['6131','Onur23','52,30','Aktiv'],['6132','Yusuf55','34,80','Aktiv'],
  ['6133','Ahmet11','18,25','Aktiv'],['6134','Cem2020','320,00','Gesperrt'],['6135','Arda67','75,00','Gesperrt'],['6136','Ozan09','12,50','Gesperrt']
];

function allCustomerRows(){
  return customers.concat(state.createdUsers);
}
function allCustomerNames(){
  return [...new Set(allCustomerRows().map(r=>r[1]))];
}
function customerUsage(){
  try{ return JSON.parse(localStorage.getItem('betxsoftDepositCustomerUsage')||'{}') || {}; }
  catch(_){ return {}; }
}
function topCustomerNames(limit=15){
  const usage=customerUsage();
  return allCustomerNames()
    .map((name,index)=>({name,index,count:Number(usage[name]||0)}))
    .sort((a,b)=>b.count-a.count || a.index-b.index)
    .slice(0,limit)
    .map(x=>x.name);
}
function recordCustomerSelection(name){
  if(!name) return;
  const usage=customerUsage();
  usage[name]=Number(usage[name]||0)+1;
  try{ localStorage.setItem('betxsoftDepositCustomerUsage',JSON.stringify(usage)); }catch(_){}
}
function customerPicker(prefix,extraClass=''){
  const top=topCustomerNames(15);
  const all=allCustomerNames();
  const option=(name,section)=>`<button type="button" class="customer-option" data-customer-option data-section="${section}" data-value="${esc(name)}"><span class="customer-option-icon">${svgIcon('person')}</span><span>${esc(name)}</span></button>`;
  return `<div class="customer-picker ${extraClass}" data-customer-picker>
    <input type="hidden" id="${prefix}Customer" value="${state.customer?esc(state.customer):''}">
    <div class="customer-picker-trigger" data-customer-trigger>
      <span class="customer-select-icon">${svgIcon('person')}</span>
      <input class="customer-picker-input customer-select-value" id="${prefix}CustomerSearch" type="search" inputmode="search" autocomplete="off" placeholder="Kunden suchen" value="${state.customer?esc(state.customer):''}" data-customer-search aria-label="Kunden suchen" aria-expanded="false">
      <span class="customer-select-chevron">${svgIcon('chevron')}</span>
    </div>
    <div class="customer-picker-menu" data-customer-menu hidden>
      <div class="customer-picker-section" data-customer-section="top">
        <div class="customer-picker-heading">Am häufigsten ausgewählt</div>
        <div class="customer-picker-options" data-customer-options="top">${top.map(name=>option(name,'top')).join('')}</div>
      </div>
      <div class="customer-picker-divider"></div>
      <div class="customer-picker-section" data-customer-section="all">
        <div class="customer-picker-heading">Alle Kunden</div>
        <div class="customer-picker-options" data-customer-options="all">${all.map(name=>option(name,'all')).join('')}</div>
      </div>
      <div class="customer-picker-empty" data-customer-empty hidden>Keine Kunden gefunden.</div>
    </div>
  </div>`;
}
function depositCustomerSelect(){ return customerPicker('deposit'); }
function payoutCustomerSelect(){ return customerPicker('payout','payout-customer-picker'); }

/* -------------------------------------------------------------------------- */
/* Bakiye: DE formatı, müşteri bazlı localStorage                              */
/* -------------------------------------------------------------------------- */
function parseAccountBalance(value){
  const normalized=String(value??'0').replace(/\./g,'').replace(',','.');
  const number=Number(normalized);
  return Number.isFinite(number)?number:0;
}
function formatAccountBalance(value){
  return new Intl.NumberFormat('de-DE',{minimumFractionDigits:2,maximumFractionDigits:2}).format(Number(value)||0);
}
function storedCustomerBalances(){
  try{ return JSON.parse(localStorage.getItem('betxsoftCustomerBalances')||'{}') || {}; }
  catch(_){ return {}; }
}
function customerBaseBalance(name){
  const row=customers.concat(state.createdUsers).find(r=>r[1]===name);
  return row?parseAccountBalance(row[2]):0;
}
function customerBalanceValue(name){
  const stored=storedCustomerBalances();
  if(Object.prototype.hasOwnProperty.call(stored,name)){
    const value=Number(stored[name]);
    return Number.isFinite(value)?value:customerBaseBalance(name);
  }
  return customerBaseBalance(name);
}
function setCustomerBalance(name,value){
  if(!name) return;
  const safe=Math.max(0,Math.round((Number(value)||0)*100)/100);
  const stored=storedCustomerBalances();
  stored[name]=safe;
  try{ localStorage.setItem('betxsoftCustomerBalances',JSON.stringify(stored)); }catch(_){}
  const row=customers.concat(state.createdUsers).find(r=>r[1]===name);
  if(row) row[2]=formatAccountBalance(safe);

}
function storedCustomerProfiles(){
  try{ return JSON.parse(localStorage.getItem('betxsoftCustomerProfiles')||'{}') || {}; }
  catch(_){ return {}; }
}
function customerProfileDefaults(row){
  const id=String(row?.[0]||'');
  const username=String(row?.[1]||'Kunde').trim();
  const nameParts=username.split(/\s+/).filter(Boolean);
  const cleanMail=username.toLowerCase().replace(/[^a-z0-9]+/g,'.').replace(/^\.|\.$/g,'')||('kunde'+id);
  const digits=(id.replace(/\D/g,'')+'000000').slice(0,6);
  const riskOptions=['Red 5%','Yellow 10%','Green 20%'];
  return {
    password:'Betx'+id+'!',
    risk:riskOptions[(Number(id)||0)%riskOptions.length],
    payoutActive:true,
    firstName:nameParts[0]||'',
    lastName:nameParts.slice(1).join(' '),
    email:cleanMail+'@kunde.ch',
    phone:'+41 79 '+digits.slice(0,3)+' '+digits.slice(3,5)+' '+digits.slice(5,6)+'0',
    address:'',
    country:'',
    casinoActive:true,
    accountActive:String(row?.[3]||'').toLowerCase()==='aktiv'
  };
}
function customerProfile(row){
  if(!row) return null;
  const defaults=customerProfileDefaults(row);
  const stored=storedCustomerProfiles();
  const saved=stored[String(row[0])]||{};
  const profile={...defaults,...saved};
  const legacyRiskMap={'Niedrig':'Red 5%','Mittel':'Yellow 10%','Hoch':'Green 20%'};
  if(legacyRiskMap[profile.risk]) profile.risk=legacyRiskMap[profile.risk];
  return profile;
}
function saveCustomerProfile(row,profile){
  if(!row) return;
  const stored=storedCustomerProfiles();
  stored[String(row[0])]={...customerProfile(row),...profile};
  try{ localStorage.setItem('betxsoftCustomerProfiles',JSON.stringify(stored)); }catch(_){}
}
function customerEffectiveStatus(row){
  const profile=customerProfile(row);
  return profile?.accountActive ? 'Aktiv' : 'Gesperrt';
}
function customerById(id){
  return customers.concat(state.createdUsers).find(row=>String(row[0])===String(id))||null;
}

/* -------------------------------------------------------------------------- */
/* Hesap geçmişi: ham satırlar, filtre, görüntü metni, CSV export             */
/* -------------------------------------------------------------------------- */
const historyRows = [
  ['72810423','22.09.26 10:42:18','Einzahlung','+50,00','179,65','229,65','Einzahlung via Shop'],
  ['72810422','22.09.26 09:16:44','Auszahlung','-100,00','279,65','179,65','Auszahlung via Shop'],
  ['50054060','06.08.25 11:51:51','Einzahlung','+10,00','0,97','10,97','Einzahlung via Sofortüberweisung'],
  ['41064834','06.08.25 11:51:51','Wetteinsatz','-0,20','10,97','10,77','Wetteinsatz Slot Casino'],
  ['41064745','06.08.25 11:51:23','Gewinn','+21,42','10,77','32,19','Gewinn Slot Casino'],
  ['26205569','30.08.24 16:49:13','Auszahlung','-550,00','760,01','210,01','Auszahlung via Banküberweisung'],
  ['70242963','19.04.26 20:30:13','Cashed Out','+4,82','25,71','30,53','Cashed Out Wette'],
  ['67603472','10.03.26 09:45:35','Wette storniert','-3,00','35,32','32,32','Wette storniert'],
  ['66133658','18.02.25 18:12:38','Bonuserstattung','+18,00','19,36','37,36','Bonuserstattung'],
  ['64935923','02.02.26 10:09:50','Wetteinsatz','-61,00','50,78','-10,22','Wetteinsatz Sport'],
  ['55487595','19.10.25 21:42:06','Gewinn','+50,00','290,25','340,25','Gewinn Sport'],
  ['53063881','28.09.25 16:54:12','Auszahlung','-30,00','70,35','40,35','Auszahlung via Skrill'],
  ['72810421','21.09.26 19:14:22','Einzahlung','+100,00','48,60','148,60','Einzahlung via Card'],
  ['72810420','21.09.26 18:52:08','Wetteinsatz','-20,00','148,60','128,60','Wetteinsatz Sport'],
  ['72810419','21.09.26 18:47:31','Gewinn','+42,50','128,60','171,10','Gewinn Sport'],
  ['72810418','21.09.26 17:33:15','Auszahlung','-75,00','171,10','96,10','Auszahlung via Bank'],
  ['72810417','20.09.26 22:11:44','Einzahlung','+50,00','46,10','96,10','Einzahlung via Apple Pay'],
  ['72810416','20.09.26 21:45:02','Wetteinsatz','-12,50','96,10','83,60','Wetteinsatz Live Casino'],
  ['72810415','20.09.26 21:44:16','Gewinn','+31,25','83,60','114,85','Gewinn Live Casino'],
  ['72810414','20.09.26 20:18:37','Wetteinsatz','-10,00','114,85','104,85','Wetteinsatz Slot Casino'],
  ['72810413','20.09.26 20:17:49','Gewinn','+18,70','104,85','123,55','Gewinn Slot Casino'],
  ['72810412','19.09.26 16:40:11','Auszahlung','-60,00','123,55','63,55','Auszahlung via Bank'],
  ['72810411','19.09.26 15:22:54','Einzahlung','+150,00','63,55','213,55','Einzahlung via Google Pay'],
  ['72810410','19.09.26 14:51:33','Wetteinsatz','-25,00','213,55','188,55','Wetteinsatz Sport'],
  ['72810409','19.09.26 14:50:21','Gewinn','+62,00','188,55','250,55','Gewinn Sport'],
  ['72810408','18.09.26 23:07:09','Wetteinsatz','-15,00','250,55','235,55','Wetteinsatz Casino'],
  ['72810407','18.09.26 22:58:42','Gewinn','+27,80','235,55','263,35','Gewinn Casino'],
  ['72810406','18.09.26 18:31:27','Auszahlung','-100,00','263,35','163,35','Auszahlung via Bank'],
  ['72810405','18.09.26 12:16:48','Einzahlung','+200,00','163,35','363,35','Einzahlung via Card'],
  ['72810404','17.09.26 21:14:06','Wetteinsatz','-40,00','363,35','323,35','Wetteinsatz Sport'],
  ['72810403','17.09.26 21:10:12','Gewinn','+88,40','323,35','411,75','Gewinn Sport'],
  ['72810402','17.09.26 19:05:29','Wette storniert','+20,00','391,75','411,75','Wette storniert'],
  ['72810401','17.09.26 17:42:18','Wetteinsatz','-20,00','411,75','391,75','Wetteinsatz Sport'],
  ['72810400','16.09.26 20:36:51','Einzahlung','+75,00','316,75','391,75','Einzahlung via Apple Pay'],
  ['72810399','16.09.26 18:24:37','Auszahlung','-90,00','391,75','301,75','Auszahlung via Bank'],
  ['72810398','16.09.26 17:12:14','Gewinn','+54,60','247,15','301,75','Gewinn Live Casino'],
  ['72810397','16.09.26 17:08:09','Wetteinsatz','-30,00','277,15','247,15','Wetteinsatz Live Casino'],
  ['72810396','15.09.26 22:45:33','Einzahlung','+120,00','157,15','277,15','Einzahlung via Google Pay'],
  ['72810395','15.09.26 21:14:52','Wetteinsatz','-18,00','277,15','259,15','Wetteinsatz Slot Casino'],
  ['72810394','15.09.26 21:13:41','Gewinn','+36,00','259,15','295,15','Gewinn Slot Casino'],
  ['72810393','15.09.26 18:02:16','Auszahlung','-80,00','295,15','215,15','Auszahlung via Bank'],
  ['72810392','14.09.26 23:18:04','Einzahlung','+60,00','155,15','215,15','Einzahlung via Card'],
  ['72810391','14.09.26 22:49:28','Wetteinsatz','-10,00','215,15','205,15','Wetteinsatz Casino'],
  ['72810390','14.09.26 22:48:17','Gewinn','+24,50','205,15','229,65','Gewinn Casino']
];

function historyStatusForRow(row){
  const type=String(row?.[2]||'').toLowerCase();
  if(type.includes('storniert')) return 'Storniert';
  return 'Erfolgreich';
}
function filteredHistoryRows(){
  return historyRows.filter(row=>{
    const statusOk=state.historyStatusFilter==='Alle'||historyStatusForRow(row)===state.historyStatusFilter;
    const typeOk=state.historyTypeFilter==='Alle'||row[2]===state.historyTypeFilter;
    return statusOk&&typeOk;
  });
}
function historyDateTimeMarkup(value){
  const parts=String(value||'').trim().split(/\s+/);
  const date=parts.shift()||'';
  const time=parts.join(' ');
  return `<span class="history-date-time"><span>${esc(date)}</span><span>${esc(time)}</span></span>`;
}

function historyAbsoluteAmount(row){
  return String(row?.[3]||'0,00').trim().replace(/^[+-]/,'');
}
function historySourceText(row){
  return String(row?.[6]||'').trim();
}
function historyPaymentMethod(row){
  const source=historySourceText(row);
  const via=source.match(/\bvia\s+(.+)$/i);
  return via ? via[1].trim() : '';
}
function historyCasinoName(row){
  const source=historySourceText(row).toLowerCase();
  if(source.includes('live casino')) return 'Live Casino';
  if(source.includes('slot casino')) return 'Slot Casino';
  if(source.includes('casino')) return 'Casino';
  return 'Casino';
}
function historyIsSportBet(row){
  const source=historySourceText(row).toLowerCase();
  if(source.includes('casino')) return false;
  return source.includes('sport') || source.includes('wette');
}
function historyTicketNumber(row){
  const currentId=Number(String(row?.[0]||'').replace(/\D/g,''));
  const linkedStake=historyRows.find(candidate=>{
    const candidateId=Number(String(candidate?.[0]||'').replace(/\D/g,''));
    return Number.isFinite(currentId) &&
      Number.isFinite(candidateId) &&
      Math.abs(candidateId-currentId)===1 &&
      candidate?.[2]==='Wetteinsatz' &&
      historyIsSportBet(candidate);
  });
  const seed=String(linkedStake?.[0]||row?.[0]||'0').replace(/\D/g,'');
  const numeric=Number(seed.slice(-6))||0;
  return String(1300000+(numeric%200000));
}
function historyDisplayType(row){
  const type=String(row?.[2]||'');
  const source=historySourceText(row).toLowerCase();
  const method=historyPaymentMethod(row).toLowerCase();
  if(type==='Einzahlung' && method==='shop') return 'Einzahlung Shop';
  if(type==='Auszahlung' && method==='shop') return 'Auszahlung Shop';
  if(type==='Wetteinsatz') return historyIsSportBet(row) ? 'Wette platziert' : 'Casino gespielt';
  if(type==='Gewinn') return source.includes('sport') ? 'Wette gewonnen' : 'Casino gewonnen';
  if(type==='Cashed Out') return 'Wettschein ausgezahlt';
  if(type==='Wette storniert') return 'Wette storniert';
  if(type==='Bonuserstattung') return 'Bonuserstattung';
  return type;
}
function historyDisplayDescription(row){
  const type=String(row?.[2]||'');
  const amount=historyAbsoluteAmount(row);
  const source=historySourceText(row).toLowerCase();
  const ticket=`Wettschein #${historyTicketNumber(row)}`;
  if(type==='Wetteinsatz'){
    if(historyIsSportBet(row)) return `${ticket} · Einsatz ${amount}`;
    return `${historyCasinoName(row)} · Einsatz ${amount}`;
  }
  if(type==='Gewinn'){
    if(source.includes('sport')) return `${ticket} · Gewinn ${amount}`;
    return `${historyCasinoName(row)} · Gewinn ${amount}`;
  }
  if(type==='Cashed Out') return `${ticket} · Auszahlung ${amount}`;
  if(type==='Wette storniert') return `${ticket} · Erstattung ${amount}`;
  if(type==='Einzahlung'){
    const method=historyPaymentMethod(row);
    if(method.toLowerCase()==='shop') return `Einzahlung Shop · Betrag ${amount}`;
    return `Einzahlung ${amount}${method?` · ${method}`:''}`;
  }
  if(type==='Auszahlung'){
    const method=historyPaymentMethod(row);
    if(method.toLowerCase()==='shop') return `Auszahlung Shop · Betrag ${amount}`;
    return `Auszahlung ${amount}${method?` · ${method}`:''}`;
  }
  if(type==='Bonuserstattung') return `Bonuserstattung ${amount}`;
  return historySourceText(row);
}
function historyDisplayRow(row){
  return [
    row[0],
    row[1],
    historyDisplayType(row),
    row[3],
    row[4],
    row[5],
    historyDisplayDescription(row)
  ];
}
function historyDescriptionMarkup(row){
  const description=historyDisplayDescription(row);
  const amount=historyAbsoluteAmount(row);
  const escapedDescription=esc(description);
  const escapedAmount=esc(amount);
  if(!escapedAmount || !escapedDescription.includes(escapedAmount)) return escapedDescription;
  return escapedDescription.replace(escapedAmount,`<strong>${escapedAmount}</strong>`);
}
const HISTORY_PAGE_SIZE=20;
const HISTORY_EXPORT_MAX_PAGES=5;

function exportHistoryCsv(){
  const allRows=filteredHistoryRows();
  if(!allRows.length){
    toast('Keine Transaktionen zum Exportieren vorhanden.');
    return;
  }
  const maxExportRows=HISTORY_PAGE_SIZE*HISTORY_EXPORT_MAX_PAGES;
  const rows=allRows.slice(0,maxExportRows);
  const availablePages=Math.ceil(allRows.length/HISTORY_PAGE_SIZE);
  const exportedPages=Math.min(availablePages,HISTORY_EXPORT_MAX_PAGES);
  const headers=['ID','Datum & Zeit','Typ','Betrag','Guthaben vorher','Guthaben nachher','Beschreibung'];
  const csvCell=value=>`"${String(value??'').replace(/"/g,'""')}"`;
  const exportRows=rows.map(historyDisplayRow);
  const csv=[headers,...exportRows].map(row=>row.map(csvCell).join(';')).join('\n');
  const blob=new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8;'});
  const url=URL.createObjectURL(blob);
  const link=document.createElement('a');
  link.href=url;
  link.download='kontoverlauf-letzte-'+exportedPages+'-seiten.csv';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  toast(exportedPages===1?'Die letzte verfügbare Seite wurde exportiert.':`Die letzten ${exportedPages} verfügbaren Seiten wurden exportiert.`);
}

/* -------------------------------------------------------------------------- */
/* Kuponlar: seed + sentetik liste (80 kayıt)                                  */
/* -------------------------------------------------------------------------- */
const couponsSeed = [
  ['ali','1377640','5,00','LOSS','93,04','5172'],['ali','1377639','10,00','WON','34,50','5171'],['ali','1377638','3,50','OPEN','68,10','5170'],
  ['Deniz Çelik','1377637','20,00','LOSS','142,00','5169'],['Ucell061','1377636','5,00','WON','18,45','5168'],['Tona','1377635','15,00','OPEN','109,70','5167'],
  ['Amir1','1377634','8,00','LOSS','55,20','5166'],['Marlboro','1377633','12,00','WON','76,80','5165'],
  ['David','1377632','7,50','OPEN','48,60','5164'],['Sahin','1377631','25,00','WON','121,40','5163']
];
const couponNames=['ali','Deniz Çelik','Ucell061','Tona','Amir1','Marlboro','David','Sahin','Toni1234','Halil2','Ali elmali','jassin'];
const couponStatuses=['LOSS','WON','OPEN','LOSS','WON','OPEN','LOSS','WON','OPEN','WON'];
const couponTypes=['Single','Kombiwette (5)','Single','Kombiwette (3)','Kombiwette (6)'];
const couponTimes=['23:07','22:41','21:56','20:34','19:48','18:22','17:15','16:03'];
function couponDate(i){
  const d=new Date(Date.UTC(2026,7,11-Math.floor(i/8)));
  return new Intl.DateTimeFormat('de-DE',{day:'2-digit',month:'2-digit',year:'2-digit',timeZone:'UTC'}).format(d);
}
function couponTime(i){ return couponTimes[i%couponTimes.length]; }
const coupons = Array.from({length:80},(_,i)=>{
  const date=couponDate(i);
  const time=couponTime(i);
  const type=couponTypes[i%couponTypes.length];
  if(i<couponsSeed.length) return [...couponsSeed[i],date,type,time];
  const name=couponNames[i%couponNames.length];
  const ticket=String(1377640-i);
  const stakeValue=3.5+((i*7)%47)*0.5;
  const stake=stakeValue.toFixed(2).replace('.',',');
  const status=couponStatuses[i%couponStatuses.length];
  const maxValue=stakeValue*(2.4+((i%9)*0.65));
  const max=maxValue.toFixed(2).replace('.',',');
  const id=String(5172-i);
  return [name,ticket,stake,status,max,id,date,type,time];
});

/* Yatırma / çekim işlem tabloları (demo) */
const deposits = [
  ['233602','13.8.2026, 00:02:02','4638','David','104.28.62.88','Card','20'],['233597','12.8.2026, 21:26:01','4145','Amir1','193.5.238.77','Crypto','50'],
  ['233529','12.8.2026, 13:18:12','816','ali','194.230.160.141','Shop','20'],['233499','11.8.2026, 21:40:13','910','Ucell061','193.5.238.77','Card','30'],
  ['233482','11.8.2026, 20:35:43','5143','Tona','193.5.238.77','Crypto','20'],['233470','11.8.2026, 19:55:21','5143','Tona','193.5.238.77','Shop','20'],
  ['233469','11.8.2026, 19:52:49','5143','Tona','193.5.238.77','Card','30'],['233461','11.8.2026, 19:07:54','5143','Tona','193.5.238.77','Crypto','50'],
  ['233449','11.8.2026, 18:07:05','5143','Tona','194.230.160.21','Shop','60'],['233436','11.8.2026, 16:41:20','5143','Tona','194.230.160.21','Card','40'],
  ['233428','11.8.2026, 16:00:14','4303','Deniz Çelik','194.230.160.21','Crypto','20'],['233423','11.8.2026, 15:19:23','910','Ucell061','193.5.238.77','Shop','20'],
  ['233412','11.8.2026, 13:07:19','816','ali','194.230.160.21','Card','20'],['233359','10.8.2026, 20:03:16','5143','Tona','194.230.160.238','Crypto','20'],
  ['233350','10.8.2026, 19:20:07','5143','Tona','194.230.160.238','Shop','50'],['233342','10.8.2026, 18:44:20','5143','Tona','194.230.160.238','Card','50'],
  ['233341','10.8.2026, 18:44:00','4145','Amir1','194.230.160.238','Crypto','50'],['233325','10.8.2026, 17:14:15','5143','Tona','194.230.160.238','Shop','50'],
  ['233243','9.8.2026, 19:45:40','816','ali','193.5.238.77','Card','15'],['233220','9.8.2026, 18:17:36','910','Ucell061','193.5.238.77','Crypto','20']
];

const payouts = [
  ['20914','8.8.2026, 14:08:16','816','ali','194.230.164.135','Card','110'],['20909','7.8.2026, 18:21:54','5080','Halip123','194.230.160.47','Crypto','50'],
  ['20907','6.8.2026, 20:45:08','970','Ucell061','193.5.238.77','Shop','239'],['20864','31.7.2026, 18:57:41','910','Ucell061','193.5.238.77','Card','130'],
  ['20861','31.7.2026, 17:00:29','910','Ucell061','194.230.160.238','Crypto','140'],['20860','31.7.2026, 16:45:26','970','Ucell061','194.230.160.99','Shop','300'],
  ['20833','27.7.2026, 14:35:34','2967','SalihB','194.230.164.167','Card','80'],['20830','26.7.2026, 21:27:26','4155','Eagron','193.5.238.77','Crypto','30'],
  ['20801','24.7.2026, 20:47:55','4145','Amir1','193.5.234.118','Shop','150'],['20737','17.7.2026, 13:49:10','4962','Bur1','193.5.234.118','Card','50'],
  ['20716','14.7.2026, 21:16:10','4145','Amir1','193.5.234.118','Crypto','400'],['20715','14.7.2026, 20:42:25','4145','Amir1','193.5.234.118','Shop','50'],
  ['20714','14.7.2026, 20:09:37','4831','Malboro','193.5.234.118','Card','200'],['20712','14.7.2026, 15:53:32','4962','Bur1','193.5.234.118','Crypto','30'],
  ['20710','13.7.2026, 12:29:50','4831','Malboro','193.5.234.118','Shop','50'],['20708','13.7.2026, 10:48:00','1332','Daniel23','193.5.234.118','Card','100'],
  ['20604','9.7.2026, 18:02:55','910','Ucell061','193.5.238.77','Crypto','30'],['20602','9.7.2026, 16:31:41','910','Ucell061','193.5.238.77','Shop','150'],
  ['20555','8.7.2026, 20:33:54','4831','Malboro','193.5.234.118','Card','60'],['20547','7.7.2026, 10:06:00','5067','mica','193.5.234.118','Shop','50']
];

/* -------------------------------------------------------------------------- */
/* Navigasyon, toast, XSS kaçışı, müşteri aramaya dönüş                      */
/* -------------------------------------------------------------------------- */
function moneyClass(v){
  const s=String(v).trim();
  if(s.startsWith('-')) return 'negative';
  if(s.startsWith('+')) return 'positive';
  return '';
}
function esc(s){
  return String(s).replace(/[&<>'"]/g,c=>({
    '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'
  }[c]));
}
const CUSTOMER_SEARCH_RETURN_KEY='betxsoftCustomerSearchReturn';
function saveCustomerSearchReturn(customerId){
  const snapshot={
    customerId:String(customerId||''),
    page:Number(state.customerPage)||1,
    scrollY:Math.max(0,Math.round(window.scrollY||0)),
    idFilter:String(state.customerIdFilter||''),
    nameFilter:String(state.customerNameFilter||''),
    statusFilter:String(state.customerStatusFilter||'Alle')
  };
  state.selectedCustomerId=snapshot.customerId;
  state.customerListScrollY=snapshot.scrollY;
  state.customerSubpageFromSearch=true;
  try{ sessionStorage.setItem(CUSTOMER_SEARCH_RETURN_KEY,JSON.stringify(snapshot)); }catch(_){}
  return snapshot;
}
function readCustomerSearchReturn(){
  try{ return JSON.parse(sessionStorage.getItem(CUSTOMER_SEARCH_RETURN_KEY)||'null'); }
  catch(_){ return null; }
}
function restoreCustomerSearchReturn(){
  const snapshot=readCustomerSearchReturn();
  if(!snapshot) return;
  state.selectedCustomerId=String(snapshot.customerId||state.selectedCustomerId||'');
  state.customerPage=Number(snapshot.page)||state.customerPage||1;
  state.customerListScrollY=Math.max(0,Number(snapshot.scrollY)||0);
  state.customerIdFilter=String(snapshot.idFilter??state.customerIdFilter??'');
  state.customerNameFilter=String(snapshot.nameFilter??state.customerNameFilter??'');
  state.customerStatusFilter=String(snapshot.statusFilter||state.customerStatusFilter||'Alle');
}
function returnToCustomerSearch(){
  iosKeyboardViewportLock?.release?.();
  restoreCustomerSearchReturn();
  state.customerSubpageFromSearch=false;
  state.restoreCustomerScrollOnNextRender=true;
  go('customers');
}
/** Tam sayfa geçişi: ilgili .html dosyasına yönlendirir */
function go(route){
  if(route==='deposit-1' && state.route!=='deposit-2'){
    state.customer='';
    state.amount='';
  }
  if(route==='payout-1' && state.route!=='payout-2'){
    state.customer='';
    state.amount='';
  }
  state.drawer=false;
  state.languageOpen=false;
  state.route=route;
  saveAppState();
  location.href=pageUrl(route);
}
function toast(message){
  const t=document.querySelector('#toast');
  const translated=window.BETXSOFT_I18N?.translate(message,state.language)||message;
  t.textContent=translated;
  t.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer=setTimeout(()=>t.classList.remove('show'),2200);
}

/** Form parçaları (views.js şablonlarında) */
function field(label, input, required=''){
  return `<div class="field"><label>${label}${required?' *':''}</label>${input}</div>`;
}
function input(placeholder, attrs=''){
  return `<input class="control" placeholder="${placeholder}" ${attrs}>`;
}
function select(options, attrs=''){
  return `<select class="control" ${attrs}>${options.map(x=>`<option>${x}</option>`).join('')}</select>`;
}

/* -------------------------------------------------------------------------- */
/* UI kabuğu: SVG ikonlar, sayfa başlığı, stepper, header, footer, drawer     */
/* -------------------------------------------------------------------------- */
function svgIcon(name){
  const paths={
    down:'<path d="M12 4v14M6.5 12.5 12 18l5.5-5.5"/>',up:'<path d="M12 20V6M6.5 11.5 12 6l5.5 5.5"/>',
    user:'<circle cx="10" cy="8" r="3"/><path d="M4.5 19c.7-3.1 2.6-4.8 5.5-4.8s4.8 1.7 5.5 4.8M18 7v6M15 10h6"/>',
    wallet:'<path d="M4 7.5h13.5A2.5 2.5 0 0 1 20 10v8a2 2 0 0 1-2 2H5a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3h11v3.5"/><path d="M15 11h5v5h-5a2.5 2.5 0 0 1 0-5Z"/><circle cx="15.5" cy="13.5" r=".6" fill="currentColor" stroke="none"/>',
    chart:'<path d="M3 20h18M5 16l4-5 4 3 7-9M16 5h4v4"/>',
    bars:'<path d="M5 20V12h3v8H5Zm6 0V6h3v14h-3Zm6 0V9h3v11h-3Z" fill="currentColor" stroke="none"/>',
    list:'<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4" cy="6" r="1.2" fill="currentColor" stroke="none"/><circle cx="4" cy="12" r="1.2" fill="currentColor" stroke="none"/><circle cx="4" cy="18" r="1.2" fill="currentColor" stroke="none"/>',
    historyClock:'<path d="M4 8V4m0 0h4M4 4a9 9 0 1 1-1 10"/><path d="M12 7v5l-3 2"/>',
    upload:'<path d="M12 17V5M7 10l5-5 5 5"/><path d="M5 15v4h14v-4"/>',
    download:'<path d="M12 4v12M7 11l5 5 5-5"/><path d="M5 18v2h14v-2"/>',
    ticket:'<path d="M5 4h14a1 1 0 0 1 1 1v4a3 3 0 0 0 0 6v4a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-4a3 3 0 0 0 0-6V5a1 1 0 0 1 1-1Z"/><path d="M12 7v2m0 2v2m0 2v2"/>',
    dollar:'<path d="M12 3v18M16 7.5c-.8-1-2-1.5-4-1.5-2.2 0-3.5 1.1-3.5 2.7 0 4.1 7.5 1.7 7.5 6 0 1.8-1.6 3.3-4.2 3.3-1.8 0-3.4-.7-4.3-1.9"/>',
    person:'<circle cx="12" cy="8" r="3.2"/><path d="M5.5 20c.8-3.7 3-5.6 6.5-5.6s5.7 1.9 6.5 5.6"/>',
    personSolid:'<circle cx="12" cy="7.5" r="4" fill="currentColor" stroke="none"/><path d="M4.5 21c.6-4.7 3.2-7 7.5-7s6.9 2.3 7.5 7H4.5Z" fill="currentColor" stroke="none"/>',
    userSolidAdd:'<circle cx="9" cy="7.2" r="3.5" fill="currentColor" stroke="none"/><path d="M3 20c.5-4.1 2.7-6.1 6-6.1 2.2 0 3.9.8 4.9 2.4" fill="currentColor" stroke="none"/><path d="M18 10v7M14.5 13.5h7"/>',
    telegram:'<path d="M21.4 3.4 2.9 10.6c-1.3.5-1.3 1.2-.2 1.5l4.7 1.5 1.8 5.5c.2.7.1 1 .8 1 .5 0 .8-.2 1-.4l2.3-2.2 4.8 3.5c.9.5 1.5.2 1.8-.8l3.1-14.7c.4-1.3-.5-1.9-1.6-1.5ZM8.2 13.3l9.2-5.8c.5-.3.9-.1.5.2l-7.6 6.9-.3 3.1-1.8-4.4Z" fill="currentColor" stroke="none"/>',
    globe:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.2 2.5 3.3 5.5 3.3 9S14.2 18.5 12 21M12 3C9.8 5.5 8.7 8.5 8.7 12S9.8 18.5 12 21"/>',
    logout:'<path d="M10 5H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h5M14 8l4 4-4 4M18 12H8"/>',
    lock:'<rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v2"/>',
    coins:'<ellipse cx="12" cy="6.2" rx="6.3" ry="2.7"/><path d="M5.7 6.2v4.1c0 1.5 2.8 2.7 6.3 2.7s6.3-1.2 6.3-2.7V6.2M5.7 10.3v4.1c0 1.5 2.8 2.7 6.3 2.7s6.3-1.2 6.3-2.7v-4.1M5.7 14.4v3.4c0 1.5 2.8 2.7 6.3 2.7s6.3-1.2 6.3-2.7v-3.4"/>',
    searchUser:'<circle cx="9" cy="8" r="3"/><path d="M3.5 19c.7-3.1 2.6-4.8 5.5-4.8 1.3 0 2.4.3 3.3 1M17 14a3 3 0 1 0 0 6 3 3 0 0 0 0-6Zm2.2 5.2L22 22"/>',
    shop:'<path d="M4 9v11h16V9M3 9l2-5h14l2 5"/><path d="M3 9a3 3 0 0 0 5 2 3 3 0 0 0 4 0 3 3 0 0 0 4 0 3 3 0 0 0 5-2M9 20v-5h6v5"/>',
    transfer:'<path d="M4 7h15M16 4l3 3-3 3M20 17H5M8 14l-3 3 3 3"/>',
    filter:'<path d="M4 5h16l-6.2 7v5.1L10 19v-7L4 5Z"/>',
    eye:'<path d="M2.5 12s3.4-5.5 9.5-5.5S21.5 12 21.5 12 18.1 17.5 12 17.5 2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="2.5"/>',
    calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 10h18"/>',
    chevron:'<path d="m9 5 7 7-7 7"/>',menu:'<path d="M3 6h18M3 12h18M3 18h18"/>',close:'<path d="M5 5l14 14M19 5 5 19"/>',
    depositWallet:'<path d="M4 9h15a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a3 3 0 0 1-3-3V8a3 3 0 0 1 3-3h9"/><path d="M16 13h5v5h-5a2.5 2.5 0 0 1 0-5ZM14 2v7M10.5 5.5 14 9l3.5-3.5"/>',
    payoutWallet:'<path d="M4 9h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a3 3 0 0 1-3-3V8a3 3 0 0 1 3-3h8"/><path d="M15 13h5v5h-5a2.5 2.5 0 0 1 0-5Z"/><path d="M12 10 19 3M14 3h5v5"/>',
    reset:'<path d="M17.65 6.35A7.96 7.96 0 0 0 12 4a8 8 0 1 0 7.73 10h-2.08A6 6 0 1 1 12 6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35Z" fill="currentColor" stroke="none"/>'
  };
  return `<svg class="svg-icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${paths[name]||''}</svg>`;
}
function pageHead(icon,title,sub,action=''){
  return `<div class="page-head">
    <div class="page-icon">${icon}</div>
    <div><h1>${title}</h1>${sub?`<p>${sub}</p>`:''}</div>
    ${action?`<div class="head-action">${action}</div>`:''}
  </div>`;
}
function steps(active,type='Einzahlung'){
  const names=['Daten','Übersicht','Bestätigung'];
  return `<div class="stepper">${names.map((n,i)=>`<div class="step ${i+1===active?'active':''} ${i+1<active?'done':''}"><span class="step-num">${i+1<active?'✓':i+1}</span>${n}</div>`).join('')}</div>`;
}
function footer(){
  return `<footer class="footer"><span>© 2022 BetXsoft. Alle Rechte vorbehalten.</span><i class="mobile-home-indicator"></i></footer>`;
}
/** Üst bar: marka, toplam bakiye (mobil), shop bakiyesi, menü */
function header(){
  return `<header class="topbar">
    <div class="topbar-main">
      <div class="brand-zone">
        <button class="brand" data-go="home" aria-label="Startseite">Bet<span class="brand-x">X</span>soft<small>Casino · Sports · Betting</small></button>
        <div class="mobile-total"><small>Gesamtbalance</small><strong>${formatAccountBalance(totalBalanceValue())}</strong></div>
      </div>
      <button class="home-button" data-go="home" aria-label="Startseite">⌂</button>
      <div class="top-spacer"></div>
      <div class="balance"><span class="balance-copy"><small>Guthaben</small><strong>14.857,00</strong></span></div>
      <button class="menu-button" data-drawer aria-label="Menü öffnen">${svgIcon('menu')}</button>
    </div>
  </header>`;
}

/* Drawer: dil bayrakları ve seçici */
function currentLanguageMeta(){
  const list=window.BETXSOFT_I18N?.languages||[];
  return list.find(x=>x.code===state.language)||list.find(x=>x.code==='de')||{code:'de',flag:'🇩🇪',name:'Deutsch'};
}
function languageFlagMarkup(lang){
  if(lang?.code==='ku'){
    const rays=Array.from({length:21},(_,i)=>`<line x1="14" y1="5.8" x2="14" y2="7.25" transform="rotate(${(i*360/21).toFixed(3)} 14 9.65)"/>`).join('');
    const outer='M2 4.05C5.5 1.75 9.35 2.15 13.15 3.35C17.1 4.6 21.1 2.05 26 3.95C25.45 7.45 25.7 10.95 26.25 14.55C21.95 12.95 17.75 15.2 13.65 14.15C9.65 13.12 5.85 12.3 2 14.75C2.45 11.15 2.45 7.55 2 4.05Z';
    const white='M2.28 7.55C5.85 5.55 9.55 5.95 13.35 7.05C17.2 8.18 21.15 5.98 25.72 7.58C25.55 8.9 25.56 10.2 25.72 11.55C21.55 10.15 17.65 12.25 13.55 11.2C9.55 10.18 5.78 9.45 2.27 11.65C2.38 10.28 2.38 8.9 2.28 7.55Z';
    const green='M2.27 11.65C5.78 9.45 9.55 10.18 13.55 11.2C17.65 12.25 21.55 10.15 25.72 11.55C25.84 12.55 26.02 13.55 26.25 14.55C21.95 12.95 17.75 15.2 13.65 14.15C9.65 13.12 5.85 12.3 2 14.75C2.12 13.7 2.2 12.68 2.27 11.65Z';
    return `<span class="drawer-language-flag drawer-language-kurdish-flag" aria-label="Kurdistan">
      <svg viewBox="0 0 28 19" aria-hidden="true" focusable="false">
        <path d="${outer}" fill="#d51d2a"/>
        <path d="${white}" fill="#fff"/>
        <path d="${green}" fill="#278e43"/>
        <g stroke="#f2c200" stroke-width=".88" stroke-linecap="round">${rays}</g>
        <circle cx="14" cy="9.65" r="2.5" fill="#f2c200"/>
        <path d="M5.05 2.85C6.2 2.28 7.18 2.26 8.2 2.47L7.72 13.3C6.7 13.05 5.72 13.1 4.7 13.62C5.15 10 5.3 6.42 5.05 2.85Z" fill="#fff" opacity=".16"/>
        <path d="M10.4 2.58C11.45 2.75 12.4 3.05 13.35 3.35L13.72 14.16C12.7 13.88 11.72 13.62 10.72 13.38C10.4 9.76 10.32 6.16 10.4 2.58Z" fill="#000" opacity=".11"/>
        <path d="M17.65 3.92C18.72 3.72 19.75 3.3 20.82 2.98L21.13 13.35C20.08 13.65 19.08 13.98 18.02 14.17C18.28 10.75 18.13 7.3 17.65 3.92Z" fill="#fff" opacity=".12"/>
        <path d="M23.55 3.17C24.35 3.18 25.15 3.42 26 3.95C25.45 7.45 25.7 10.95 26.25 14.55C25.42 14.23 24.6 14.05 23.78 14.03C24.18 10.4 24.1 6.8 23.55 3.17Z" fill="#000" opacity=".13"/>
        <path d="${outer}" fill="none" stroke="rgba(0,0,0,.22)" stroke-width=".42"/>
      </svg>
    </span>`;
  }
  return `<span class="drawer-language-flag drawer-language-emoji-flag" aria-hidden="true">${lang?.flag||''}</span>`;
}
function languageSelector(){
  const current=currentLanguageMeta();
  const list=window.BETXSOFT_I18N?.languages||[];
  const options=list.map(lang=>`<button type="button" class="drawer-language-option ${lang.code===state.language?'active':''}" data-language="${lang.code}">${languageFlagMarkup(lang)}<span>${lang.name}</span></button>`).join('');
  return `<div class="drawer-language-block">
    <button class="drawer-sub-link drawer-language-trigger" type="button" data-language-menu aria-expanded="${state.languageOpen?'true':'false'}">
      <span class="drawer-sub-icon">${svgIcon('globe')}</span>
      <span class="drawer-sub-label">Sprachen</span>
      <span class="drawer-language-right" data-no-i18n>
        <span class="drawer-language-current">${languageFlagMarkup(current)}</span>
        <span class="drawer-sub-chevron">${svgIcon('chevron')}</span>
      </span>
    </button>
    ${state.languageOpen?`<div class="drawer-language-list" data-no-i18n>${options}</div>`:''}
  </div>`;
}
/** Yan menü: backdrop + shop, yatırma/çekim/muhasebe, alt linkler, dil, QR */
function drawer(){
  const primary=(routeIndex,label,icon,tone)=>`<button class="drawer-primary ${tone} ${routes[routeIndex][0]===state.route?'active':''}" data-go="${routes[routeIndex][0]}"><span class="drawer-primary-icon">${svgIcon(icon)}</span><strong>${label}</strong><span class="drawer-primary-chevron">${svgIcon('chevron')}</span></button>`;
  const item=(routeIndex,icon,label=routes[routeIndex][1])=>`<button class="drawer-sub-link ${routes[routeIndex][0]===state.route?'active':''}" data-go="${routes[routeIndex][0]}"><span class="drawer-sub-icon">${svgIcon(icon)}</span><span class="drawer-sub-label">${label}</span><span class="drawer-sub-chevron">${svgIcon('chevron')}</span></button>`;
  return `<div class="drawer-backdrop ${state.drawer?'open':''}" data-drawer-close></div>
<aside class="drawer ${state.drawer?'open':''}">
    <nav class="drawer-nav">
      <button class="drawer-shop-user ${state.route==='shop'?'active':''}" type="button" data-go="shop" aria-label="Shop">
        <span class="drawer-shop-user-icon">${svgIcon('personSolid')}</span>
        <strong>Shop</strong>
        <span class="drawer-shop-user-chevron" aria-hidden="true">${svgIcon('chevron')}</span>
      </button>
      <div class="drawer-shop-user-divider" aria-hidden="true"></div>
      ${primary(1,'Einzahlung','down','deposit')}
      ${primary(4,'Auszahlung','up','payout')}
      ${primary(13,'Buchhaltung','bars','turnover')}
      <div class="drawer-section-title"><span class="drawer-section-icon">${svgIcon('list')}</span><strong>Weitere Bereiche</strong></div>
      ${item(10,'ticket','Wettübersicht')}
      ${item(9,'userSolidAdd','Kundenverwaltung')}
      ${item(7,'personSolid','Kundensuche')}
      <div class="drawer-menu-divider" aria-hidden="true"></div>
      ${item(14,'depositWallet')}
      ${item(15,'payoutWallet')}
      <div class="drawer-menu-divider" aria-hidden="true"></div>
      ${languageSelector()}
      <div class="drawer-footer">
        <div class="drawer-footer-rule" aria-hidden="true"></div>
        <a class="drawer-qr-link" href="https://t.me/BETXSOFT" target="_blank" rel="noopener noreferrer" aria-label="BetXsoft auf Telegram öffnen">
          <img class="drawer-qr" src="./assets/betxsoft-telegram-qr.svg" alt="QR-Code zu BetXsoft auf Telegram"><span class="drawer-qr-telegram" aria-hidden="true">${svgIcon('telegram')}</span>
        </a>
        <div class="drawer-footer-copy"><span>2022</span><i aria-hidden="true"></i><span>BETXSOFT</span></div>
      </div>
    </nav>
  </aside>`;
}

