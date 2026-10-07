function formatDashboardValue(value){ return new Intl.NumberFormat('de-DE',{minimumFractionDigits:2,maximumFractionDigits:2}).format(value); }
function currentDashboard(){
  if(state.dashboardPeriod==='custom' && state.customDashboard) return state.customDashboard;
  if(['today','yesterday','week','month'].includes(state.dashboardPeriod)){
    const totals=turnoverTotals(filteredDataForPeriod(state.dashboardPeriod));
    return {deposit:totals.deposit,payout:totals.payout,profit:totals.profit};
  }
  return dashboardPeriods.today;
}

function homeView(){ const d=currentDashboard(); return `${pageHead('⌂','Übersicht','Alle wichtigen Kennzahlen und Schnellaktionen auf einen Blick.')}<div class="quick-grid">
  <button class="quick-card green" data-go="deposit-1"><span class="quick-icon">${svgIcon('down')}</span><span class="quick-copy"><strong>Einzahlung</strong><small>Geld einzahlen</small></span></button>
  <button class="quick-card red" data-go="payout-1"><span class="quick-icon">${svgIcon('up')}</span><span class="quick-copy"><strong>Auszahlung</strong><small>Geld auszahlen</small></span></button>
  <button class="quick-card blue" data-go="create-user"><span class="quick-icon">${svgIcon('user')}</span><span class="quick-copy"><strong>Neuer Kunde</strong><small>Neuen Kunden anlegen</small></span></button></div>
  <div class="dash-grid"><section class="card card-pad"><h2 class="section-title overview-title">Übersicht</h2><div class="date-tabs"><button class="tab ${state.dashboardPeriod==='today'?'active':''}" data-period="today">Heute</button><button class="tab ${state.dashboardPeriod==='yesterday'?'active':''}" data-period="yesterday">Gestern</button><button class="tab ${state.dashboardPeriod==='week'?'active':''}" data-period="week">1 Woche</button><button class="tab ${state.dashboardPeriod==='month'?'active':''}" data-period="month">Diesen Monat</button></div><button class="custom-date ${state.dashboardPeriod==='custom'?'active':''}" data-custom-range><span>${svgIcon('calendar')}</span><span class="custom-date-label">${state.dashboardPeriod==='custom' ? `${new Date(state.customFrom+'T00:00:00').toLocaleDateString('de-DE')} – ${new Date(state.customTo+'T00:00:00').toLocaleDateString('de-DE')}` : 'Individueller Zeitraum'}</span><span>${svgIcon('chevron')}</span></button>${state.customRangeOpen?`<div class="date-range-panel"><label>Von<input type="date" value="${state.customFrom}" data-range-from></label><label>Bis<input type="date" value="${state.customTo}" data-range-to></label><button data-range-apply>Anwenden</button></div>`:''}<div class="kpis"><div class="kpi green"><div class="kpi-icon">${svgIcon('wallet')}</div><label>Einzahlung</label><strong data-kpi="deposit">${formatDashboardValue(d.deposit)}</strong></div><div class="kpi red"><div class="kpi-icon">${svgIcon('wallet')}</div><label>Auszahlung</label><strong data-kpi="payout">${formatDashboardValue(d.payout)}</strong></div><div class="kpi orange"><div class="kpi-icon">${svgIcon('chart')}</div><label>Gewinn</label><strong data-kpi="profit">${formatDashboardValue(d.profit)}</strong></div><div class="kpi violet"><div class="kpi-icon">${svgIcon('ticket')}</div><label>Offene Wetten</label><strong data-kpi="open">${currentOpenTickets}</strong></div></div></section>
  <section class="card card-pad"><h2 class="section-title">Menü</h2><div class="menu-list">${[
  ['turnover','dollar','Buchhaltung','Shop Umsatz & Agent Umsatz'],
  ['coupons','ticket','Wettscheine','Wettscheine verwalten'],
  ['customers','searchUser','Kundensuche','Profil bearbeiten'],
  ['deposit-transactions','depositWallet','Einzahlungstransaktionen','Einzahlungsverlauf'],
  ['payout-transactions','payoutWallet','Auszahlungstransaktionen','Auszahlungsverlauf']
  ].map((x,i)=>`<button class="menu-entry ${i===0?'primary-icon':''}" data-go="${x[0]}"><span>${svgIcon(x[1])}</span><span><strong>${x[2]}</strong><small>${x[3]}</small></span><span class="chev">${svgIcon('chevron')}</span></button>`).join('')}</div></section></div>`; }

function depositClose(){ return `<button class="page-close" data-close-page aria-label="Einzahlung schließen" title="Schließen">${svgIcon('close')}</button>`; }
function deposit1(){ return `<section class="deposit-minimal-page">
  <div class="deposit-minimal-head">
    <button class="deposit-back" data-go="home" aria-label="Zurück zur Startseite">‹</button>
    <h1>Einzahlung</h1>
    <button class="deposit-minimal-close" data-close-page aria-label="Einzahlung schließen" title="Schließen">${svgIcon('close')}</button>
  </div>
  ${steps(1)}
  <section class="deposit-minimal-form">
    <div class="deposit-form-grid">
      ${field('Kunde auswählen',depositCustomerSelect())}
      ${field('Einzahlungsbetrag',`<div class="deposit-amount-shell">${input('Betrag eingeben','id="depositAmount" inputmode="decimal" autocomplete="off"')}<span class="deposit-amount-icon">${svgIcon('coins')}</span></div>`)}
    </div>
    <label class="deposit-helper">Schnellauswahl</label>
    <div class="amounts">${[10,20,40,50,70,100,150,200].map(x=>`<button class="amount-chip" data-amount="${x}">${x}</button>`).join('')}</div>
    <div class="actions"><button class="btn block deposit-continue" data-flow="deposit-next">Einzahlung fortsetzen <span aria-hidden="true">→</span></button></div>
  </section>
</section>`; }
function deposit2(){
  const amount=Number(state.amount||'0');
  const currentBalance=customerBalanceValue(state.customer);
  const newBalance=currentBalance+amount;
  return `${pageHead(svgIcon('depositWallet'),'Einzahlung','',depositClose())} ${steps(2)}<section class="card card-pad flow-card"><h2>Einzahlung bestätigen</h2><p class="muted">Bitte überprüfen Sie Ihre Angaben vor der Bestätigung.</p><div class="summary-list"><div class="summary-row"><span>Benutzer-ID</span><strong>${esc(state.customer)}</strong></div><div class="summary-row deposit-amount-highlight"><span>Betrag</span><strong class="positive">${formatAccountBalance(amount)}</strong></div><div class="summary-row"><span>Aktuelles Guthaben</span><strong>${formatAccountBalance(currentBalance)}</strong></div><div class="summary-row"><span>Neues Guthaben</span><strong>${formatAccountBalance(newBalance)}</strong></div></div><div class="actions"><button class="btn secondary" data-go="deposit-1">Zurück</button><button class="btn success" data-confirm-deposit>Einzahlung bestätigen</button></div></section>`;
}
function deposit3(){
  const newBalance=customerBalanceValue(state.customer);
  return `${pageHead(svgIcon('depositWallet'),'Einzahlung','',depositClose())} ${steps(3)}<section class="card flow-card success-panel"><div class="success-mark">✓</div><h2>Einzahlung erfolgreich!</h2><p class="muted">Ihre Einzahlung wurde erfolgreich durchgeführt.</p><div class="summary-list"><div class="summary-row"><span>Neues Guthaben</span><strong class="positive">${formatAccountBalance(newBalance)}</strong></div><div class="summary-row"><span>Benutzer-ID</span><strong>${esc(state.customer)}</strong></div></div><div class="actions"><button class="btn block" data-go="home">Zurück zur Übersicht</button></div></section>`;
}

function payoutClose(){ return `<button class="page-close" data-close-page aria-label="Auszahlung schließen" title="Schließen">${svgIcon('close')}</button>`; }

function payout1(){
  const currentBalance=state.customer?customerBalanceValue(state.customer):0;
  return `<section class="payout-minimal-page">
  <div class="payout-minimal-head">
    <button class="payout-back payout-icon-button" data-go="home" aria-label="Zurück zur Startseite" title="Auszahlung">${svgIcon('payoutWallet')}</button>
    <h1>Auszahlung</h1>
    <button class="payout-minimal-close" data-close-page aria-label="Auszahlung schließen" title="Schließen">${svgIcon('close')}</button>
  </div>
  ${steps(1,'Auszahlung')}
  <section class="payout-minimal-form">
    <div class="payout-form-grid">
      ${field('Kunde auswählen',payoutCustomerSelect())}
      <div class="field payout-balance-field" id="payoutBalanceField" ${state.customer?'':'hidden'}>
        <label>Aktuelles Guthaben</label>
        <div class="payout-balance-display" id="payoutCurrentBalance">${state.customer?formatAccountBalance(currentBalance):''}</div>
      </div>
      ${field('Auszahlungsbetrag',`<div class="payout-amount-shell">${input('Betrag eingeben','id="payoutAmount" inputmode="decimal" autocomplete="off"')}<span class="payout-amount-icon">${svgIcon('coins')}</span></div>`)}
    </div>
    <label class="payout-helper">Schnellauswahl</label>
    <div class="amounts">${[10,20,40,50,70,100,150,200].map(x=>`<button class="amount-chip" data-amount="${x}">${x}</button>`).join('')}</div>
    <div class="actions"><button class="btn block payout-continue" data-flow="payout-next">Auszahlung fortsetzen <span aria-hidden="true">→</span></button></div>
  </section>
</section>`; }

function payout2(){
  const amount=Number(state.amount||'0');
  const currentBalance=customerBalanceValue(state.customer);
  const newBalance=Math.max(0,currentBalance-amount);
  return `${pageHead(svgIcon('payoutWallet'),'Auszahlung','',payoutClose())} ${steps(2,'Auszahlung')}<section class="card card-pad flow-card"><h2>Auszahlung bestätigen</h2><p class="muted">Bitte überprüfen Sie Ihre Angaben vor der Bestätigung.</p><div class="summary-list"><div class="summary-row"><span>Benutzer-ID</span><strong>${esc(state.customer)}</strong></div><div class="summary-row payout-amount-highlight"><span>Betrag</span><strong class="negative">${formatAccountBalance(amount)}</strong></div><div class="summary-row"><span>Aktuelles Guthaben</span><strong>${formatAccountBalance(currentBalance)}</strong></div><div class="summary-row"><span>Neues Guthaben</span><strong>${formatAccountBalance(newBalance)}</strong></div></div><div class="actions"><button class="btn secondary" data-go="payout-1">Zurück</button><button class="btn danger" data-confirm-payout>Auszahlung bestätigen</button></div></section>`; }

function payout3(){
  const amount=Number(state.amount||'0');
  const newBalance=customerBalanceValue(state.customer);
  return `${pageHead(svgIcon('payoutWallet'),'Auszahlung','',payoutClose())} ${steps(3,'Auszahlung')}<section class="card flow-card success-panel"><div class="success-mark payout-success-mark">✓</div><h2>Auszahlung erfolgreich!</h2><p class="muted">Die Auszahlung wurde erfolgreich durchgeführt.</p><div class="summary-list"><div class="summary-row payout-amount-highlight"><span>Ausgezahlter Betrag</span><strong class="negative">${formatAccountBalance(amount)}</strong></div><div class="summary-row"><span>Neues Guthaben</span><strong>${formatAccountBalance(newBalance)}</strong></div><div class="summary-row"><span>Benutzer-ID</span><strong>${esc(state.customer)}</strong></div></div><div class="actions"><button class="btn block" data-go="home">Zurück zur Übersicht</button></div></section>`;
}

function customerIsActive(row){
  return customerEffectiveStatus(row)==='Aktiv';
}
function sortedCustomerRows(rows){
  return rows
    .map((row,index)=>({row,index,balance:customerBalanceValue(row[1]),active:customerIsActive(row)}))
    .sort((a,b)=>{
      if(a.active!==b.active) return a.active?-1:1;
      if(b.balance!==a.balance) return b.balance-a.balance;
      return a.index-b.index;
    })
    .map(x=>x.row);
}
function customerPagination(total,currentPage,pageSize=20){
  const totalPages=Math.max(1,Math.ceil(total/pageSize));
  if(totalPages<=1) return `<div class="table-bottom customer-table-bottom"><span>Zeige ${total?1:0} bis ${total} von ${total} Kunden</span></div>`;
  const page=Math.min(Math.max(1,currentPage),totalPages);
  const from=(page-1)*pageSize+1;
  const to=Math.min(page*pageSize,total);
  const buttons=Array.from({length:totalPages},(_,i)=>{
    const p=i+1;
    return `<button class="page-btn ${p===page?'active':''}" data-customer-page="${p}">${p}</button>`;
  }).join('');
  return `<div class="table-bottom customer-table-bottom"><span>Zeige ${from} bis ${to} von ${total} Kunden</span><div class="pagination"><button class="page-btn" data-customer-page="${Math.max(1,page-1)}" ${page===1?'disabled':''}>‹</button>${buttons}<button class="page-btn" data-customer-page="${Math.min(totalPages,page+1)}" ${page===totalPages?'disabled':''}>›</button></div></div>`;
}
function customersView(){
  const idFilter=String(state.customerIdFilter||'').trim().toLowerCase();
  const nameFilter=String(state.customerNameFilter||'').trim().toLowerCase();
  const statusFilter=state.customerStatusFilter||'Alle';
  const allRows=customers.concat(state.createdUsers)
    .filter(r=>!idFilter||String(r[0]).toLowerCase().includes(idFilter))
    .filter(r=>!nameFilter||String(r[1]).toLowerCase().includes(nameFilter))
    .filter(r=>statusFilter==='Alle'||customerEffectiveStatus(r)===statusFilter);
  const rows=sortedCustomerRows(allRows);
  const pageSize=20;
  const totalPages=Math.max(1,Math.ceil(rows.length/pageSize));
  const currentPage=Math.min(Math.max(1,Number(state.customerPage)||1),totalPages);
  state.customerPage=currentPage;
  const start=(currentPage-1)*pageSize;
  const visibleRows=rows.slice(start,start+pageSize);
  const statusOptions=['Alle','Aktiv','Gesperrt'].map(x=>`<option ${x===statusFilter?'selected':''}>${x}</option>`).join('');
  const closeButton=`<button class="page-close" data-close-page aria-label="Kundensuche schließen" title="Schließen">${svgIcon('close')}</button>`;
  const headActions=`<div class="customers-head-actions"><button class="btn" data-go="create-user">＋ Neuen Kunden erstellen</button>${closeButton}</div>`;
  return `${pageHead(svgIcon('searchUser'),'Kundensuche','Verwalten Sie Ihre Kunden.',headActions)}
  <section class="card card-pad customers-filter-card"><div class="filters">
    <div class="field"><label>ID</label>${input('z. B. 4590',`data-customer-id-filter value="${esc(state.customerIdFilter)}"`)}</div>
    <div class="field"><label>Benutzername</label>${input('z. B. David',`data-customer-name-filter value="${esc(state.customerNameFilter)}"`)}</div>
    <div class="field"><label>Status</label><select class="control" data-customer-status-filter>${statusOptions}</select></div>
    <div class="filter-actions"><button class="btn" data-apply-customer>Filtern</button><button class="btn secondary" data-reset-customer>Zurücksetzen</button></div>
  </div></section>
  <section class="card table-card customers-table-card" style="margin-top:16px"><div class="table-wrap"><table class="data-table"><thead><tr><th>ID</th><th>Benutzername</th><th>Guthaben</th><th>Status</th><th>Aktionen</th></tr></thead><tbody>${visibleRows.length?visibleRows.map(r=>`<tr class="${String(state.selectedCustomerId)===String(r[0])?'customer-selected-row':''}" data-customer-row="${esc(r[0])}"><td>${r[0]}</td><td><strong>${r[1]}</strong></td><td>${formatAccountBalance(customerBalanceValue(r[1]))}</td><td><span class="status ${customerEffectiveStatus(r)==='Aktiv'?'active':'neutral'}">${customerEffectiveStatus(r)}</span></td><td><button class="btn small outline" data-edit-customer="${esc(r[0])}">Bearbeiten</button> <button class="btn small secondary" data-customer-history="${esc(r[0])}">Kontoverlauf</button></td></tr>`).join(''):`<tr><td colspan="5" class="empty">Keine Kunden gefunden.</td></tr>`}</tbody></table></div>${customerPagination(rows.length,currentPage,pageSize)}</section>`;
}

function historyPagination(total,currentPage,pageSize=HISTORY_PAGE_SIZE){
  const totalPages=Math.max(1,Math.ceil(total/pageSize));
  const page=Math.min(Math.max(1,currentPage),totalPages);
  const from=total?((page-1)*pageSize+1):0;
  const to=Math.min(page*pageSize,total);
  if(totalPages<=1) return `<div class="table-bottom"><span>Zeige ${from} bis ${to} von ${total} Transaktionen</span></div>`;
  const buttons=Array.from({length:totalPages},(_,i)=>{
    const p=i+1;
    return `<button class="page-btn ${p===page?'active':''}" data-history-page="${p}">${p}</button>`;
  }).join('');
  return `<div class="table-bottom"><span>Zeige ${from} bis ${to} von ${total} Transaktionen</span><div class="pagination"><button class="page-btn" data-history-page="${Math.max(1,page-1)}" ${page===1?'disabled':''}>‹</button>${buttons}<button class="page-btn" data-history-page="${Math.min(totalPages,page+1)}" ${page===totalPages?'disabled':''}>›</button></div></div>`;
}

function historyView(){
  const rows=filteredHistoryRows();
  const pageSize=HISTORY_PAGE_SIZE;
  const totalPages=Math.max(1,Math.ceil(rows.length/pageSize));
  const currentPage=Math.min(Math.max(1,Number(state.historyPage)||1),totalPages);
  state.historyPage=currentPage;
  const start=(currentPage-1)*pageSize;
  const visibleRows=rows.slice(start,start+pageSize);
  const statusOptions=['Alle','Erfolgreich','Ausstehend','Storniert'].map(x=>`<option ${x===state.historyStatusFilter?'selected':''}>${x}</option>`).join('');
  const typeOptions=['Alle','Einzahlung','Auszahlung','Wetteinsatz','Gewinn'].map(x=>`<option ${x===state.historyTypeFilter?'selected':''}>${x}</option>`).join('');
  return `${pageHead(svgIcon('transfer'),'Kontoverlauf','Übersicht aller Transaktionen in Echtzeit.','<button class="page-close" data-close-page aria-label="Kontoverlauf schließen" title="Schließen">'+svgIcon('close')+'</button>')}
  <section class="card card-pad history-filter-card"><div class="history-filter-grid">
    <div class="field"><label>Status</label><select class="control" data-history-status>${statusOptions}</select></div>
    <div class="field"><label>Transaktionstyp</label><select class="control" data-history-type>${typeOptions}</select></div>
    <div class="filter-actions"><button class="btn" data-apply-history>Filtern</button><button class="btn secondary" data-reset-history>Zurücksetzen</button></div>
    <div class="history-export-action"><button class="history-export-btn" data-export>${svgIcon('download')}<span>Exportieren</span></button></div>
  </div></section>
  <section class="card table-card history-table-card" style="margin-top:16px"><div class="table-wrap"><table class="data-table"><thead><tr><th>ID</th><th>Datum & Zeit</th><th>Typ</th><th>Betrag</th><th><span class="history-balance-head"><span>Guthaben</span><span>Davor</span></span></th><th><span class="history-balance-head"><span>Guthaben</span><span>Danach</span></span></th><th>Beschreibung</th></tr></thead><tbody>${visibleRows.length?visibleRows.map(row=>{
    const r=historyDisplayRow(row);
    return `<tr>${r.map((cell,i)=>`<td class="${i===3?moneyClass(cell):''}">${i===1?historyDateTimeMarkup(cell):i===6?historyDescriptionMarkup(row):esc(cell)}</td>`).join('')}</tr>`;
  }).join(''):'<tr><td colspan="7" class="empty">Keine Transaktionen gefunden.</td></tr>'}</tbody></table></div>${historyPagination(rows.length,currentPage,pageSize)}</section>`;
}


function editCustomerView(){
  const row=customerById(state.editingCustomerId);
  if(!row){
    return `${pageHead(svgIcon('person'),'Kunde bearbeiten','Kundendaten verwalten.','<button class="page-close" data-close-page aria-label="Kunde bearbeiten schließen" title="Schließen">'+svgIcon('close')+'</button>')}
      <section class="card card-pad edit-customer-card"><div class="empty">Kein Kunde ausgewählt.</div></section>`;
  }
  const profile=customerProfile(row);
  const balance=formatAccountBalance(customerBalanceValue(row[1]));
  const riskOptions=['Red 5%','Yellow 10%','Green 20%'].map(x=>`<option value="${x}" ${profile.risk===x?'selected':''}>${x}</option>`).join('');
  const switchField=(name,checked)=>`<label class="edit-customer-switch-row" data-edit-customer-toggle><input type="checkbox" name="${name}" ${checked?'checked':''}><span class="edit-customer-switch-ui" aria-hidden="true"></span><span class="edit-customer-status-text ${checked?'active':'inactive'}" data-edit-customer-status>${checked?'Aktiv':'Inaktiv'}</span></label>`;
  return `${pageHead(svgIcon('person'),'Kunde bearbeiten',`Kundendaten von ${esc(row[1])} verwalten.`,'<button class="page-close" data-close-page aria-label="Kunde bearbeiten schließen" title="Schließen">'+svgIcon('close')+'</button>')}
  <section class="card card-pad edit-customer-card">
    <form id="editCustomerForm" data-customer-id="${esc(row[0])}">
      <div class="edit-customer-grid">
        <div class="field">
          <label>User Name</label>
          <input class="control" name="username" value="${esc(row[1])}" autocomplete="username" required>
        </div>
        <div class="field">
          <label>Passwort</label>
          <input class="control" type="password" name="password" value="${esc(profile.password)}" autocomplete="new-password" required>
        </div>
        <div class="field">
          <label>Balance</label>
          <div class="control edit-customer-readonly" aria-readonly="true">${esc(balance)}</div>
        </div>
        <div class="field">
          <label>Risikostufe</label>
          <select class="control" name="risk">${riskOptions}</select>
        </div>
        <div class="field edit-customer-toggle-field">
          <label>Cash-Out</label>
          ${switchField('payoutActive',profile.payoutActive)}
        </div>
        <div class="field edit-customer-toggle-field">
          <label>Casino Aktiv</label>
          ${switchField('casinoActive',profile.casinoActive)}
        </div>
        <div class="field edit-customer-toggle-field">
          <label>Konto Aktiv</label>
          ${switchField('accountActive',profile.accountActive)}
        </div>
        <div class="edit-customer-section-title">Kundeninformationen</div>
        <div class="field">
          <label>Vorname</label>
          <input class="control" name="firstName" value="${esc(profile.firstName)}" autocomplete="given-name">
        </div>
        <div class="field">
          <label>Nachname</label>
          <input class="control" name="lastName" value="${esc(profile.lastName)}" autocomplete="family-name">
        </div>
        <div class="field">
          <label>E-Mail</label>
          <input class="control" type="email" name="email" value="${esc(profile.email)}" autocomplete="email">
        </div>
        <div class="field">
          <label>Telefon</label>
          <div class="edit-customer-phone-shell">
            <input class="control" type="tel" name="phone" value="${esc(profile.phone)}" autocomplete="tel">
          </div>
        </div>
        <div class="field">
          <label>Adress</label>
          <input class="control" name="address" value="${esc(profile.address||'')}" autocomplete="street-address">
        </div>
        <div class="field">
          <label>Country</label>
          <input class="control" name="country" value="${esc(profile.country||'')}" autocomplete="country-name">
        </div>
      </div>
      <div class="edit-customer-actions">
        <button type="button" class="btn secondary" data-go="customers">Abbrechen</button>
        <button type="submit" class="btn edit-customer-save">Speichern</button>
      </div>
    </form>
  </section>`;
}

function createUserView(){ return `<section class="create-user-page">
  <div class="create-user-head">
    <div class="create-user-heading">
      <span class="create-user-heading-icon">${svgIcon('user')}</span>
      <div><h1>Kunden erstellen</h1><p>Neuen Kunden anlegen</p></div>
    </div>
    <button class="create-user-close" data-close-page aria-label="Kunden erstellen schließen" title="Schließen">${svgIcon('close')}</button>
  </div>
  <section class="create-user-form-card">
    <div class="create-user-form-title"><h2>Kundendaten</h2><p>Geben Sie die Daten des neuen Kunden ein.</p></div>
    <form id="createUserForm">
      <div class="create-user-fields">
        <div class="field">
          <label>Nutzername (Nick) *</label>
          <div class="create-user-input-shell"><span class="create-user-field-icon">${svgIcon('person')}</span>${input('Benutzernamen eingeben','name="username" required minlength="3" autocomplete="username"')}</div>
        </div>
        <div class="field">
          <label>Passwort *</label>
          <div class="create-user-input-shell"><span class="create-user-field-icon">${svgIcon('lock')}</span>${input('Mindestens 6 Zeichen','name="password" required minlength="6" type="password" autocomplete="new-password"')}</div>
          <p class="create-user-helper">Mindestens 6 Zeichen.</p>
        </div>
        <div class="field">
          <label>Startguthaben</label>
          <div class="create-user-input-shell create-user-balance-shell"><span class="create-user-field-icon">${svgIcon('coins')}</span>${input('0,00','name="balance" inputmode="decimal" autocomplete="off"')}</div>
        </div>
      </div>
      <div class="create-user-actions">
        <button type="button" class="btn secondary create-user-cancel" data-go="customers">Abbrechen</button>
        <button class="btn create-user-submit" type="submit">Kunden erstellen <span aria-hidden="true">→</span></button>
      </div>
    </form>
  </section>
</section>`; }

function ticketStatusIcon(index){
  const icons=[
    '<path d="M7 3.5h7l4 4v13H7z"/><path d="M14 3.5v4h4M10 12h5M10 16h5"/>',
    '<path d="M8 4h8v4a4 4 0 0 1-8 0V4Z"/><path d="M8 6H5v1a4 4 0 0 0 4 4M16 6h3v1a4 4 0 0 1-4 4M12 12v5M9 20h6M10 17h4"/>',
    '<circle cx="12" cy="12" r="8"/><path d="m9 9 6 6M15 9l-6 6"/>',
    '<circle cx="12" cy="12" r="8"/><path d="M6.4 6.4 17.6 17.6"/>',
    '<path d="M4 6h2l2 9h9l2-6H8"/><circle cx="10" cy="19" r="1.3"/><circle cx="17" cy="19" r="1.3"/>'
  ];
  return `<svg class="svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[index]||icons[0]}</svg>`;
}
function toggleCards(){ return ['Offen','Gewonnen','Verloren','Storniert','Verkauft'].map((n,i)=>`<label class="toggle-card status-toggle status-${i}"><button class="switch ${state.toggles[i]?'on':''}" data-toggle="${i}" aria-label="${n}"></button><span class="status-toggle-icon">${ticketStatusIcon(i)}</span><span class="status-toggle-label">${n}</span></label>`).join(''); }
function activeTicketStatus(){
  const active=Object.keys(state.toggles).find(k=>state.toggles[k]);
  return active===undefined ? '' : ({0:'OPEN',1:'WON',2:'LOSS',3:'CANCELLED',4:'SOLD'})[active] || '';
}
function couponMatchesStatus(row,status){
  if(!status) return true;
  const value=String(row[3]||'').toUpperCase();
  if(status==='LOSS') return value==='LOSS' || value==='LOST';
  if(status==='CANCELLED') return value==='CANCELLED' || value==='CANCELED' || value==='STORNIERT';
  if(status==='SOLD') return value==='SOLD' || value==='VERKAUFT';
  return value===status;
}
function couponPagination(totalPages,currentPage){
  if(totalPages<=1) return '';
  const pages=[];
  const addPage=p=>{ if(p>=1&&p<=totalPages&&!pages.includes(p)) pages.push(p); };
  if(totalPages<=7){
    for(let p=1;p<=totalPages;p++) addPage(p);
  }else if(currentPage<=3){
    addPage(1);addPage(2);addPage(3);pages.push('…');addPage(totalPages);
  }else if(currentPage>=totalPages-2){
    addPage(1);pages.push('…');addPage(totalPages-2);addPage(totalPages-1);addPage(totalPages);
  }else{
    addPage(1);pages.push('…');addPage(currentPage);pages.push('…');addPage(totalPages);
  }
  const pageButtons=pages.map(p=>p==='…'
    ? '<span class="page-ellipsis">…</span>'
    : `<button class="page-btn ${p===currentPage?'active':''}" data-ticket-page="${p}">${p}</button>`
  ).join('');
  return `<div class="table-bottom coupon-pagination-only"><div class="pagination"><button class="page-btn" data-ticket-page="${Math.max(1,currentPage-1)}" ${currentPage===1?'disabled':''}>‹</button>${pageButtons}<button class="page-btn" data-ticket-page="${Math.min(totalPages,currentPage+1)}" ${currentPage===totalPages?'disabled':''}>›</button></div></div>`;
}

function couponsView(){
  const q=state.ticketFilter.toLowerCase();
  const status=activeTicketStatus();
  const rows=coupons.filter(r=>(!q||r.join(' ').toLowerCase().includes(q)) && couponMatchesStatus(r,status));
  const pageSize=20;
  const totalPages=Math.max(1,Math.ceil(rows.length/pageSize));
  const currentPage=Math.min(Math.max(1,Number(state.ticketPage)||1),totalPages);
  state.ticketPage=currentPage;
  const start=(currentPage-1)*pageSize;
  const pageRows=rows.slice(start,start+pageSize);
  const closeButton=`<button class="page-close" data-close-page aria-label="Wettscheine schließen" title="Schließen">${svgIcon('close')}</button>`;
  return `${pageHead(svgIcon('ticket'),'Wettscheine','Verwalten und durchsuchen Sie alle Wettscheine.',closeButton)}<section class="card card-pad"><div class="toggle-grid">${toggleCards()}</div><button class="btn outline wettscheine-extra-filter" data-go="coupon-filters">${svgIcon('list')} Zusätzliche Filter</button><div class="filters three"><div class="field"><label>Wettschein Nummer</label>${input('z. B. 1377640','data-filter="ticket"')}</div><div class="field"><label>Benutzername</label>${input('z. B. Max','data-filter="ticket"')}</div><div class="filter-actions"><button class="btn" data-apply-ticket>Filtern</button><button class="btn secondary" data-reset-ticket>Zurücksetzen</button></div></div></section><section class="card table-card" style="margin-top:16px"><div class="table-wrap"><table class="data-table"><thead><tr><th>Kunde</th><th>Einsatz</th><th>Status</th><th>Max.<br>Gewinn</th><th>Aktion</th><th>Datum</th><th>Wettart</th></tr></thead><tbody>${pageRows.length?pageRows.map(r=>`<tr class="coupon-status-row coupon-status-${r[3].toLowerCase()}${r[1]===state.selectedCouponId?' coupon-selected-row':''}"><td><strong>${r[0]}</strong></td><td>${r[2]}</td><td><span class="status ${r[3].toLowerCase()}">${r[3]}</span></td><td>${r[4]}</td><td><button class="coupon-open-btn" data-open-coupon="${r[1]}" aria-label="Wettschein ${r[1]} öffnen"><span class="coupon-open-eye">${svgIcon('eye')}</span><span class="coupon-open-arrow" aria-hidden="true">›</span></button></td><td>${r[6]}<small class="coupon-row-meta">${r[8]}</small></td><td><strong class="coupon-type">${r[7]}</strong></td></tr>`).join(''):`<tr><td colspan="7" class="empty">Keine Wettscheine gefunden.</td></tr>`}</tbody></table></div>${couponPagination(totalPages,currentPage)}</section>`;
}

function couponFilterRow(icon,label,control){
  return `<div class="coupon-filter-row"><div class="coupon-filter-row-icon">${svgIcon(icon)}</div><div class="coupon-filter-field"><label>${label}</label>${control}</div></div>`;
}
function couponFiltersView(){
  return `<section class="coupon-filter-shell">
    <div class="coupon-filter-hero">
      <div class="coupon-filter-hero-icon">${svgIcon('filter')}</div>
      <div class="coupon-filter-hero-copy">
        <h1>Zusätzliche Filter</h1>
        <button class="coupon-filter-back" data-go="coupons"><span aria-hidden="true">←</span><strong>Zurück zur Wettscheinübersicht</strong></button>
      </div>
    </div>
    <div class="coupon-filter-list">
      ${couponFilterRow('calendar','Zeitraum',select(['Alle','Heute','Gestern','7 Tage','30 Tage'],'data-advanced-filter="period"'))}
      ${couponFilterRow('list','Wettart',select(['Alle','Live','Prematch'],'data-advanced-filter="bet-type"'))}
      ${couponFilterRow('bars','Status',select(['Alle','Offen','Gewonnen','Verloren','Storniert'],'data-advanced-filter="status"'))}
      ${couponFilterRow('person','Kunde',input('Benutzername oder ID','data-advanced-filter="customer"'))}
      ${couponFilterRow('ticket','Wettschein Nummer',input('z. B. 1377640','data-advanced-filter="ticket"'))}
    </div>
    <div class="coupon-filter-actions">
      <button class="btn coupon-filter-apply" data-flow="filters-apply">Filter anwenden</button>
      <button class="btn secondary coupon-filter-reset" data-demo="Alle Filter zurückgesetzt">Zurücksetzen</button>
    </div>
  </section>`;
}

function couponDetailView(){
  const coupon=coupons.find(r=>r[1]===state.selectedCouponId)||coupons[0];
  const [customer,ticket,stake,status,maxProfit,id]=coupon;
  const statusClass=String(status).toLowerCase()==='won'?'win':String(status).toLowerCase();
  const statusKey=String(status).toUpperCase();
  const ticketMetaStatusClass=({LOSS:'ticket-status-loss',WON:'ticket-status-won',OPEN:'ticket-status-open',CANCELLED:'ticket-status-cancelled'})[statusKey]||'';
  const winningProfit=statusKey==='WON'?maxProfit:'0,00';
  const bets=[
    ['NEC Nijmegen','Olympiacos Piräus','Match Result','1','2.10','1 - 2','0 - 0','Europe','Uefa Champions League','LOSS'],
    ['CSKA 1948 Sofia','Panathinaikos','Both Teams To Score','Yes','1.85','1 - 1','0 - 1','Europe','Uefa Conference League','WON'],
    ['FK Crvena Zvezda','Hapoel Beer Sheva','Over/Under','Over 2.5','1.90','- : -','- : -','Europe','Uefa Champions League','OPEN'],
    ['SK Slovan Bratislava','Mjällby AIF','Handicap','1 (-1)','1.75','0 - 0','0 - 1','Europe','Uefa Champions League','CANCELLED'],
    ['NK Celje','FC Ararat-Armenia','Draw No Bet','1','1.95','0 - 1','0 - 0','Europe','Uefa Champions League','LOSS']
  ];
  const statusDot=status=>{
    const key=String(status).toLowerCase();
    return ['loss','won','cancelled'].includes(key)?`<span class="bet-status-dot ${key}" aria-hidden="true"></span>`:`<span class="bet-status-dot" style="visibility:hidden" aria-hidden="true"></span>`;
  };
  return `<button class="back-link" data-coupon-back>← Zurück zu Wettscheinen</button><div class="ticket-head"><div><h1 style="margin:0;font-size:20px"><span class="ticket-title-label">Wettschein</span><span class="ticket-title-number">#${ticket}</span></h1></div><span class="avatar">♙</span><strong>(${id}) ${esc(customer)}</strong></div><section class="card" style="margin-top:20px"><div class="stats-row"><div class="stat"><small>Ticket Amount</small><strong class="positive">${stake}</strong></div><div class="stat"><small>Max Profit</small><strong style="color:var(--blue)">${maxProfit}</strong></div><div class="stat"><small>Winning Profit</small><strong style="color:var(--blue)">${winningProfit}</strong></div><div class="stat"><small>Status</small><span class="status ${statusClass}">${status}</span></div></div></section><section class="card table-card coupon-detail-table" style="margin-top:14px"><div class="card-pad" style="padding-bottom:10px"><h2 class="section-title" style="margin:0">▤ Wett-Details (5)</h2></div><div class="table-wrap"><table class="data-table"><thead><tr><th>Teams</th><th>Markt</th><th>Wette</th><th>Quote</th><th>Score</th><th>Placed Score</th><th>Land / Liga</th><th>Status</th></tr></thead><tbody>${bets.map(r=>`<tr><td><div class="bet-team-cell">${statusDot(r[9])}<span class="bet-team-lines"><span>${r[0]}</span><span>${r[1]}</span></span></div></td><td><strong class="bet-detail-bold">${r[2]}</strong></td><td><strong class="bet-detail-bold">${r[3]}</strong></td><td>${r[4]}</td><td>${r[5]}</td><td>${r[6]}</td><td><span class="bet-league-lines"><span>${r[7]}</span><span>${r[8]}</span></span></td><td><span class="status ${r[9].toLowerCase()}">${r[9]}</span></td></tr>`).join('')}</tbody></table></div></section><section class="ticket-meta"><div><small>Status</small><span class="status ${statusClass}">${status}</span></div><div><small>Winning Profit</small><strong>${winningProfit}</strong></div><div><small>Erstellt</small><strong>11.08.2026 20:41:28</strong></div><div><small>Wett-Typ</small><strong style="color:var(--blue)">LIVE</strong></div><div><small>IP-Adresse</small><strong>194.230.160.96</strong></div><div><small>Ergebniszeit</small><strong>11.08.2026 21:31:51</strong></div><div><small>Coupon Type</small><strong>KOMBINATION (5)</strong></div><div><small>Wettstatus</small><strong>COMPLETED</strong></div></section>`;
}

const turnoverLedgerStorageKey='betxsoftTurnoverLedgerV1';
const defaultTurnoverLedger={
  current:{
    startDate:'2026-09-01',
    deposit:410613,
    payout:226509,
    profit:184104,
    card:76688,
    crypto:19295
  },
  records:[
    {from:'2026-01-18',to:'2026-02-28',time:'14:35',deposit:12777,payout:777,profit:12000},
    {from:'2025-12-02',to:'2026-01-18',time:'09:42',deposit:25800,payout:7465,profit:18335},
    {from:'2025-10-15',to:'2025-12-02',time:'16:20',deposit:48320,payout:21120,profit:27200},
    {from:'2025-09-01',to:'2025-10-15',time:'11:05',deposit:57240,payout:24890,profit:32350},
    {from:'2025-07-20',to:'2025-09-01',time:'18:12',deposit:69180,payout:31760,profit:37420},
    {from:'2025-06-10',to:'2025-07-20',time:'13:48',deposit:44860,payout:19640,profit:25220},
    {from:'2025-05-01',to:'2025-06-10',time:'10:26',deposit:53890,payout:24730,profit:29160},
    {from:'2025-03-18',to:'2025-05-01',time:'17:54',deposit:76420,payout:34810,profit:41610},
    {from:'2025-02-01',to:'2025-03-18',time:'12:17',deposit:62150,payout:28200,profit:33950},
    {from:'2024-12-15',to:'2025-02-01',time:'15:33',deposit:89540,payout:41670,profit:47870},
    {from:'2024-11-01',to:'2024-12-15',time:'09:58',deposit:71420,payout:32900,profit:38520},
    {from:'2024-09-20',to:'2024-11-01',time:'14:41',deposit:58760,payout:26740,profit:32020},
    {from:'2024-08-01',to:'2024-09-20',time:'19:06',deposit:66390,payout:30150,profit:36240},
    {from:'2024-06-15',to:'2024-08-01',time:'11:29',deposit:51980,payout:23460,profit:28520}
  ]
};
function cloneDefaultTurnoverLedger(){
  return JSON.parse(JSON.stringify(defaultTurnoverLedger));
}
function loadTurnoverLedger(){
  try{
    const stored=JSON.parse(localStorage.getItem(turnoverLedgerStorageKey)||'null');
    if(!stored||!stored.current||!Array.isArray(stored.records)) return cloneDefaultTurnoverLedger();
    stored.records=stored.records.slice(0,40);

    // One-time demo seed for the Shop Umsatz till. Existing reset history is preserved.
    if(Number(stored.shopTurnoverSeedVersion||0)<1){
      const current=stored.current||{};
      const isEmpty=['deposit','payout','profit'].every(key=>Number(current[key]||0)===0);
      if(isEmpty){
        current.deposit=685420;
        current.payout=412780;
        current.profit=272640;
        stored.current=current;
      }
      stored.shopTurnoverSeedVersion=1;
      try{ localStorage.setItem(turnoverLedgerStorageKey,JSON.stringify(stored)); }catch(_){}
    }

    // One-time migration: add 12 demo reset records while preserving existing records.
    if(Number(stored.turnoverRecordSeedVersion||0)<1){
      const extras=defaultTurnoverLedger.records.slice(2);
      const existingKeys=new Set(stored.records.map(r=>`${r.from}|${r.to}|${r.time}`));
      stored.records=stored.records.concat(
        extras.filter(r=>!existingKeys.has(`${r.from}|${r.to}|${r.time}`))
      ).slice(0,40);
      stored.turnoverRecordSeedVersion=1;
      try{ localStorage.setItem(turnoverLedgerStorageKey,JSON.stringify(stored)); }catch(_){}
    }

    return stored;
  }catch(_){
    return cloneDefaultTurnoverLedger();
  }
}
function saveTurnoverLedger(ledger){
  try{ localStorage.setItem(turnoverLedgerStorageKey,JSON.stringify(ledger)); }catch(_){}
}
function shortLedgerDate(value){
  const date=new Date(value+'T12:00:00');
  return Number.isNaN(date.getTime())?'–':date.toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'2-digit'});
}
function resetLedgerPeriodLabel(record){
  return `${shortLedgerDate(record.from)} – ${shortLedgerDate(record.to)}, ${record.time} Uhr`;
}
function resetCurrentTurnoverTill(){
  const ledger=loadTurnoverLedger();
  const current=ledger.current||{};
  const hasBalance=['deposit','payout','profit','card','crypto'].some(key=>Number(current[key]||0)!==0);
  if(!hasBalance) return false;

  const now=new Date();
  const to=turnoverDateKey(now);
  const time=now.toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit',hour12:false});
  ledger.records.unshift({
    from:current.startDate||to,
    to,
    time,
    deposit:Number(current.deposit||0),
    payout:Number(current.payout||0),
    profit:Number(current.profit||0)
  });
  ledger.records=ledger.records.slice(0,40);
  ledger.current={startDate:to,deposit:0,payout:0,profit:0,card:0,crypto:0};
  saveTurnoverLedger(ledger);
  return true;
}

function turnoverDateKey(date){
  const y=date.getFullYear();
  const m=String(date.getMonth()+1).padStart(2,'0');
  const d=String(date.getDate()).padStart(2,'0');
  return `${y}-${m}-${d}`;
}
function turnoverData(){
  const today=new Date();
  today.setHours(0,0,0,0);
  return Array.from({length:92},(_,i)=>{
    const date=new Date(today);
    date.setDate(today.getDate()-i);
    const seed=Math.floor(date.getTime()/86400000);
    const deposit=14800+((seed*1379)%9800);
    const payout=7200+((seed*947)%7200);
    const card=Math.round(deposit*(.16+(seed%4)*.018));
    const crypto=Math.round(deposit*(.035+(seed%3)*.012));
    const profit=deposit-payout;
    const hour=16+(seed%7);
    const minute=String((seed*13)%60).padStart(2,'0');
    const second=String((seed*7)%60).padStart(2,'0');
    return {key:turnoverDateKey(date),date,time:`${String(hour).padStart(2,'0')}:${minute}:${second}`,deposit,payout,profit,card,crypto};
  });
}
function sharedPeriodRange(period,customFrom='',customTo=''){
  const now=new Date();
  let start=new Date(now.getFullYear(),now.getMonth(),now.getDate(),0,0,0,0);
  let end=new Date(now);

  if(period==='yesterday'){
    start.setDate(start.getDate()-1);
    end=new Date(start);
    end.setHours(23,59,59,999);
  }
  else if(period==='week'){
    start.setDate(start.getDate()-6);
  }
  else if(period==='month'){
    start=new Date(now.getFullYear(),now.getMonth(),1,0,0,0,0);
  }
  else if(period==='custom'){
    start=new Date(customFrom+'T00:00:00');
    end=new Date(customTo+'T23:59:59.999');
  }

  return {start,end};
}
function currentTurnoverMonthRange(){
  return sharedPeriodRange('month');
}
function filteredDataForPeriod(period,customFrom='',customTo=''){
  const {start,end}=sharedPeriodRange(period,customFrom,customTo);
  return turnoverData().filter(r=>r.date>=start && r.date<=end);
}
function turnoverRange(){
  return sharedPeriodRange(state.turnoverPeriod,state.turnoverFrom,state.turnoverTo);
}
function filteredTurnoverData(){
  return filteredDataForPeriod(state.turnoverPeriod,state.turnoverFrom,state.turnoverTo);
}
function turnoverTotals(rows){
  return rows.reduce((sum,r)=>({deposit:sum.deposit+r.deposit,payout:sum.payout+r.payout,profit:sum.profit+r.profit,card:sum.card+r.card,crypto:sum.crypto+r.crypto}),{deposit:0,payout:0,profit:0,card:0,crypto:0});
}
function periodRangeText(period,customFrom='',customTo=''){
  const {start,end}=sharedPeriodRange(period,customFrom,customTo);
  return `${start.toLocaleDateString('de-DE')} – ${end.toLocaleDateString('de-DE')}`;
}
function turnoverPeriodText(){
  const labels={today:'Heute',yesterday:'Gestern',week:'1 Woche'};
  if(state.turnoverPeriod==='month') return periodRangeText('month');
  if(state.turnoverPeriod!=='custom') return labels[state.turnoverPeriod]||'1 Woche';
  return periodRangeText('custom',state.turnoverFrom,state.turnoverTo);
}
function turnoverRecordPagination(totalPages,currentPage){
  if(totalPages<=1) return '';
  const buttons=Array.from({length:totalPages},(_,i)=>{
    const page=i+1;
    return `<button class="page-btn ${page===currentPage?'active':''}" data-turnover-record-page="${page}">${page}</button>`;
  }).join('');
  return `<div class="table-bottom turnover-record-pagination"><div class="pagination"><button class="page-btn" data-turnover-record-page="${Math.max(1,currentPage-1)}" ${currentPage===1?'disabled':''}>‹</button>${buttons}<button class="page-btn" data-turnover-record-page="${Math.min(totalPages,currentPage+1)}" ${currentPage===totalPages?'disabled':''}>›</button></div></div>`;
}

function turnoverView(){
  const rows=filteredTurnoverData();
  const totals=turnoverTotals(rows);
  const periodText=turnoverPeriodText();
  const ledger=loadTurnoverLedger();
  const till=ledger.current||cloneDefaultTurnoverLedger().current;
  const resetRecords=(ledger.records||[]).slice(0,40);
  const recordPageSize=10;
  const recordTotalPages=Math.max(1,Math.ceil(resetRecords.length/recordPageSize));
  const recordCurrentPage=Math.min(Math.max(1,Number(state.turnoverRecordPage)||1),recordTotalPages);
  state.turnoverRecordPage=recordCurrentPage;
  const recordStart=(recordCurrentPage-1)*recordPageSize;
  const visibleResetRecords=resetRecords.slice(recordStart,recordStart+recordPageSize);
  const closeButton=`<button class="page-close" data-close-page aria-label="Buchhaltung schließen" title="Schließen">${svgIcon('close')}</button>`;
  const stats=[
    [svgIcon('down'),'Einzahlung',totals.deposit,'green'],
    [svgIcon('up'),'Auszahlung',totals.payout,'red'],
    [svgIcon('chart'),'Gewinn',totals.profit,'blue'],
    ['▤','Card Deposit',totals.card,'ink'],
    ['₿','Crypto Deposit',totals.crypto,'orange']
  ];
  return `${pageHead(svgIcon('chart'),'Umsatz / Turnover','Übersicht Ihrer Umsätze.',closeButton)}
  <section class="card card-pad turnover-period-card">
    <h2 class="section-title">Zeitraum wählen</h2>
    <div class="date-tabs turnover-date-tabs">
      <button class="tab ${state.turnoverPeriod==='today'?'active':''}" data-turnover-period="today">Heute</button>
      <button class="tab ${state.turnoverPeriod==='yesterday'?'active':''}" data-turnover-period="yesterday">Gestern</button>
      <button class="tab ${state.turnoverPeriod==='week'?'active':''}" data-turnover-period="week">1 Woche</button>
      <button class="tab ${state.turnoverPeriod==='month'?'active':''}" data-turnover-period="month">Diesen Monat</button>
    </div>
    <button class="custom-date turnover-custom-date ${state.turnoverPeriod==='custom'?'active':''}" data-turnover-custom-range><span>${svgIcon('calendar')}</span><span class="custom-date-label">${state.turnoverPeriod==='custom'?periodText:'Individuell'}</span><span>${svgIcon('chevron')}</span></button>
    ${state.turnoverRangeOpen?`<div class="date-range-panel turnover-date-range"><label>Von<input type="date" value="${state.turnoverFrom}" data-turnover-range-from></label><label>Bis<input type="date" value="${state.turnoverTo}" data-turnover-range-to></label><button data-turnover-range-apply>Anwenden</button></div>`:''}
  </section>
  <section class="card turnover-summary-card" style="margin-top:16px"><div class="revenue-top">${stats.map(x=>`<div class="revenue-card"><div class="bubble" style="color:var(--${x[3]})">${x[0]}</div><label>${x[1]}</label><strong style="color:var(--${x[3]})">${formatDashboardValue(x[2])}</strong><div class="spark" style="border-bottom:2px solid var(--${x[3]==='ink'?'line':x[3]});transform:skewY(-5deg)"></div></div>`).join('')}</div></section>
  <section class="card table-card turnover-shop-card" style="margin-top:16px">
    <div class="card-pad turnover-section-head"><div><h2 class="section-title" style="margin:0">Shop Umsatz</h2><small class="muted">Aktueller Kassenstand</small></div><button class="btn small outline" data-reset-turnover><span class="turnover-reset-icon" aria-hidden="true">${svgIcon('reset')}</span><span>Kasse auf 0 setzen</span></button></div>
    <div class="table-wrap"><table class="data-table"><thead><tr><th>#</th><th>Shop</th><th>Einzahlung</th><th>Auszahlung</th><th>Gewinn</th></tr></thead><tbody><tr><td>1</td><td><strong style="color:var(--blue)">Loca22</strong></td><td class="positive">${formatDashboardValue(till.deposit)}</td><td class="negative">${formatDashboardValue(till.payout)}</td><td style="color:var(--blue);font-weight:800">${formatDashboardValue(till.profit)}</td></tr></tbody></table></div>
  </section>
  <section class="card table-card turnover-records-card" style="margin-top:16px">
    <div class="card-pad turnover-section-head"><div><h2 class="section-title" style="margin:0">Letzte Aufzeichnungen</h2><small class="muted">Kassen-Resets</small></div><span class="turnover-record-count">${resetRecords.length} ${resetRecords.length===1?'Eintrag':'Einträge'}</span></div>
    <div class="table-wrap"><table class="data-table turnover-reset-table"><thead><tr><th>Datum</th><th>Einzahlung</th><th>Auszahlung</th><th>Gewinn</th></tr></thead><tbody>
      ${visibleResetRecords.length?visibleResetRecords.map(r=>`<tr><td><span class="turnover-reset-period"><strong>${shortLedgerDate(r.from)} – ${shortLedgerDate(r.to)}</strong><span class="turnover-reset-time">, ${r.time} Uhr</span></span></td><td class="positive">${formatDashboardValue(r.deposit)}</td><td class="negative">${formatDashboardValue(r.payout)}</td><td style="color:var(--blue);font-weight:800">${formatDashboardValue(r.profit)}</td></tr>`).join(''):`<tr><td colspan="4" class="empty">Noch keine Kassen-Resets vorhanden.</td></tr>`}
    </tbody></table></div>
    ${turnoverRecordPagination(recordTotalPages,recordCurrentPage)}
  </section>
  ${state.turnoverResetConfirm?`<div class="turnover-reset-confirm-backdrop" data-turnover-reset-backdrop>
    <div class="turnover-reset-confirm" role="dialog" aria-modal="true" aria-labelledby="turnoverResetConfirmTitle">
      <h3 id="turnoverResetConfirmTitle">Sind Sie sicher?</h3>
      <p>Die Kasse wird auf 0 gesetzt und der aktuelle Abschluss gespeichert.</p>
      <div class="turnover-reset-confirm-actions">
        <button type="button" class="btn outline" data-turnover-reset-cancel>Abbrechen</button>
        <button type="button" class="btn" data-turnover-reset-confirm>Kasse auf 0 setzen</button>
      </div>
    </div>
  </div>`:''}`;
}

function transactionDateTimeMarkup(value){
  const match=String(value||'').trim().match(/^(\d{1,2})\.(\d{1,2})\.(\d{4}),?\s+(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if(!match) return esc(value);
  const [,day,month,year,hour,minute]=match;
  return `<span class="transaction-date-time"><span>${day.padStart(2,'0')}.${month.padStart(2,'0')}.${year}</span><span>${hour.padStart(2,'0')}:${minute}</span></span>`;
}
function transactionView(type){
  const isDeposit=type==='deposit';
  const data=isDeposit?deposits:payouts;
  const title=isDeposit?'Einzahlung Transaktionen':'Auszahlungen Transaktionen';
  const closeButton=`<button class="page-close" data-transaction-close aria-label="${title} schließen" title="Schließen">${svgIcon('close')}</button>`;
  return `${pageHead(isDeposit?'↓':'↑',title,`Übersicht aller ${isDeposit?'Einzahlungs':'Auszahlungs'}transaktionen.`,closeButton)}<section class="card card-pad"><div class="filters three"><div class="field"><label>Zeitraum</label><div class="transaction-date-range"><label><span>Von</span><input class="control" type="date" data-transaction-from></label><label><span>Bis</span><input class="control" type="date" data-transaction-to></label></div></div><div class="field" style="grid-column:span 2"><label>Suche</label>${input('ID, Kunden-ID, Name oder IP-Adresse','data-transaction-search')}</div></div></section><section class="card table-card" style="margin-top:16px"><div class="table-wrap"><table class="data-table"><thead><tr><th>ID</th><th>Datum</th><th>Kunden-ID</th><th>Kundenname</th><th>IP-Adresse</th><th>Art der ${isDeposit?'Einzahlung':'Auszahlung'}</th><th>Betrag</th></tr></thead><tbody id="transactionBody">${transactionRows(data,isDeposit)}</tbody></table></div>${tableBottom(20,'Einträgen',13,250)}</section>`;
}
function transactionRows(data,isDeposit){
  return data.map(r=>`<tr>${r.map((cell,i)=>`<td class="${i===6?(isDeposit?'positive':'negative'):''}">${i===1?transactionDateTimeMarkup(cell):esc(cell)}</td>`).join('')}</tr>`).join('');
}
function transactionDateKey(value){
  const match=String(value||'').trim().match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})/);
  if(!match) return '';
  const [,day,month,year]=match;
  return `${year}-${month.padStart(2,'0')}-${day.padStart(2,'0')}`;
}
function applyTransactionFilters(){
  if(state.route!=='deposit-transactions' && state.route!=='payout-transactions') return;
  const isDeposit=state.route==='deposit-transactions';
  const data=isDeposit?deposits:payouts;
  const q=String(document.querySelector('[data-transaction-search]')?.value||'').trim().toLowerCase();
  const from=String(document.querySelector('[data-transaction-from]')?.value||'');
  const to=String(document.querySelector('[data-transaction-to]')?.value||'');
  const filtered=data.filter(row=>{
    const textOk=!q||row.join(' ').toLowerCase().includes(q);
    const date=transactionDateKey(row[1]);
    const fromOk=!from||date>=from;
    const toOk=!to||date<=to;
    return textOk&&fromOk&&toOk;
  });
  const body=document.querySelector('#transactionBody');
  if(body){
    body.innerHTML=transactionRows(filtered,isDeposit);
    window.BETXSOFT_I18N?.apply(body,state.language);
  }
}
function tableBottom(count,label,pages=5,total=count){ return `<div class="table-bottom"><span>Zeige 1 bis ${count} von ${total} ${label}</span><div class="pagination"><button class="page-btn">‹</button><button class="page-btn active">1</button><button class="page-btn">2</button><button class="page-btn">3</button><button class="page-btn">…</button><button class="page-btn">${pages}</button><button class="page-btn">›</button></div></div>`; }

function shopLoginView(){
  return `<div class="shop-login-page">
    <section class="shop-login-card">
      <div class="shop-login-brand">
        <div class="shop-login-logo" aria-label="X">
          <svg class="shop-login-x" viewBox="0 0 100 100" role="img" aria-hidden="true">
            <defs>
              <linearGradient id="shopLoginXGradient" x1="8" y1="92" x2="92" y2="8" gradientUnits="userSpaceOnUse">
                <stop offset="0" stop-color="#0a49ff"/>
                <stop offset="0.62" stop-color="#155cff"/>
                <stop offset="1" stop-color="#20b7ee"/>
              </linearGradient>
            </defs>
            <path d="M8 8h29l13 22 13-22h29L64 50l28 42H63L50 70 37 92H8l28-42L8 8Z" fill="url(#shopLoginXGradient)"/>
          </svg>
        </div>
      </div>
      <form id="shopLoginForm" class="shop-login-form">
        <div class="field">
          <label>Benutzername</label>
          <input class="control" name="username" autocomplete="username" required>
        </div>
        <div class="field">
          <label>Passwort</label>
          <div class="shop-login-password-shell">
            <input class="control" type="password" name="password" autocomplete="current-password" required data-login-password-input>
            <span class="shop-login-password-display" data-login-password-display aria-hidden="true"></span>
          </div>
        </div>
        <button class="btn block" type="submit">Anmelden</button>
      </form>
    </section>
  </div>`;
}

function shopView(){
  return `${pageHead(svgIcon('personSolid'),'Shop','Passwortverwaltung','<button class="page-close" data-close-page aria-label="Shop schließen" title="Schließen">'+svgIcon('close')+'</button>')}
  <section class="card card-pad shop-password-card">
    <form id="shopPasswordForm" class="shop-password-form">
      <div class="shop-password-grid">
        <div class="field">
          <label>Aktuelles Passwort</label>
          <input class="control" type="password" name="currentPassword" autocomplete="current-password" required>
        </div>
        <div class="field">
          <label>Neues Passwort</label>
          <input class="control" type="password" name="newPassword" autocomplete="new-password" minlength="6" required>
          <small class="shop-password-rule" data-shop-password-rule>Das Passwort muss mindestens 6 Zeichen enthalten.</small>
        </div>
        <div class="field">
          <label>Neues Passwort bestätigen</label>
          <input class="control" type="password" name="confirmPassword" autocomplete="new-password" required>
        </div>
      </div>
      <div class="shop-password-actions">
        <button class="btn" type="submit">Passwort ändern</button>
      </div>
    </form>
  </section>`;
}

const views={home:homeView,'deposit-1':deposit1,'deposit-2':deposit2,'deposit-3':deposit3,'payout-1':payout1,'payout-2':payout2,'payout-3':payout3,customers:customersView,history:historyView,'create-user':createUserView,'edit-customer':editCustomerView,coupons:couponsView,'coupon-filters':couponFiltersView,'coupon-detail':couponDetailView,turnover:turnoverView,'deposit-transactions':()=>transactionView('deposit'),'payout-transactions':()=>transactionView('payout'),shop:shopView};

