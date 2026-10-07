function render(){
  const preservedScrollY=window.scrollY;
  const scrollTopOnNextRender=state.scrollTopOnNextRender;
  const restoreCouponScrollOnNextRender=state.restoreCouponScrollOnNextRender;
  const couponListScrollY=state.couponListScrollY;
  const restoreCustomerScrollOnNextRender=state.restoreCustomerScrollOnNextRender;
  const customerListScrollY=state.customerListScrollY;
  state.scrollTopOnNextRender=false;
  state.restoreCouponScrollOnNextRender=false;
  state.restoreCustomerScrollOnNextRender=false;
  state.route=document.body.dataset.route||'home'; if(!views[state.route]) state.route='home';
  const i18n=window.BETXSOFT_I18N;
  if(!i18n?.languages?.some(x=>x.code===state.language)) state.language='en';
  const routeTitle=routes.find(x=>x[0]===state.route)?.[1]||'Shop Admin';
  document.title=`${i18n?.translate(routeTitle,state.language)||routeTitle} | BetXsoft`;
  document.querySelector('#app').innerHTML=`<div class="app route-${state.route}">${header()}<main class="layout">${views[state.route]()}</main>${footer()}</div>${drawer()}`;
  i18n?.apply(document.querySelector('#app'),state.language);
  const metaDescription=document.querySelector('meta[name="description"]');
  if(metaDescription) metaDescription.setAttribute('content',i18n?.translate('BetXsoft Shop Admin – Kunden, Zahlungen, Wettscheine und Umsätze zentral verwalten.',state.language)||metaDescription.getAttribute('content'));
  bind();
  saveAppState();
  requestAnimationFrame(()=>{
    const targetY=restoreCustomerScrollOnNextRender?customerListScrollY:(restoreCouponScrollOnNextRender?couponListScrollY:(scrollTopOnNextRender?0:preservedScrollY));
    window.scrollTo({top:targetY,left:0,behavior:'auto'});
    if(restoreCustomerScrollOnNextRender){
      requestAnimationFrame(()=>window.scrollTo({top:customerListScrollY,left:0,behavior:'auto'}));
      setTimeout(()=>window.scrollTo({top:customerListScrollY,left:0,behavior:'auto'}),160);
    }
  });
}

function bind(){
  const loginPasswordInput=document.querySelector('[data-login-password-input]');
  const loginPasswordDisplay=document.querySelector('[data-login-password-display]');
  if(loginPasswordInput && loginPasswordDisplay){
    let revealTimer=null;

    const renderMaskedPassword=(revealIndex=-1)=>{
      const value=String(loginPasswordInput.value||'');
      if(!value){
        loginPasswordDisplay.textContent='';
        return;
      }

      let visible='';
      for(let i=0;i<value.length;i++){
        visible+=i===revealIndex?value[i]:'•';
      }
      loginPasswordDisplay.textContent=visible;
    };

    loginPasswordInput.addEventListener('input',e=>{
      clearTimeout(revealTimer);
      const value=String(loginPasswordInput.value||'');
      const inputType=String(e.inputType||'');
      const isInsert=inputType.startsWith('insert') && value.length>0;

      if(isInsert){
        const caret=Number(loginPasswordInput.selectionStart);
        const revealIndex=Number.isFinite(caret) && caret>0 ? Math.min(value.length-1,caret-1) : value.length-1;
        renderMaskedPassword(revealIndex);
        revealTimer=setTimeout(()=>renderMaskedPassword(-1),700);
      }else{
        renderMaskedPassword(-1);
      }
    });

    loginPasswordInput.addEventListener('blur',()=>{
      clearTimeout(revealTimer);
      renderMaskedPassword(-1);
    });

    loginPasswordInput.addEventListener('change',()=>renderMaskedPassword(-1));
    renderMaskedPassword(-1);
  }

  document.querySelector('[data-logout]')?.addEventListener('click',e=>{
    e.preventDefault();
    e.stopPropagation();
    setShopAuthSession(false);
    clearShopIdleTracking();
    state.authenticated=false;
    state.drawer=false;
    state.languageOpen=false;
    state.customer='';
    state.amount='';
    state.committedFlow='';
    go('home');
  });

  document.querySelector('#shopLoginForm')?.addEventListener('submit',async e=>{
    e.preventDefault();
    const form=e.currentTarget;
    const fd=new FormData(form);
    const username=String(fd.get('username')||'').trim();
    const password=String(fd.get('password')||'');
    let passwordHash='';
    try{ passwordHash=await hashShopPassword(password); }
    catch(_){ return toast('Anmeldung konnte nicht geprüft werden.'); }
    if(username.toLowerCase()!==SHOP_LOGIN_USERNAME.toLowerCase() || passwordHash!==currentShopPasswordHash()){
      return toast('Benutzername oder Passwort ist falsch.');
    }
    clearShopIdleTracking();
    setShopAuthSession(true);
    state.authenticated=true;
    startShopIdleSession();
    state.drawer=false;
    go('home');
    toast('Anmeldung erfolgreich.');
  });

  const shopPasswordForm=document.querySelector('#shopPasswordForm');
  if(shopPasswordForm){
    const newPasswordInput=shopPasswordForm.querySelector('[name="newPassword"]');
    const confirmPasswordInput=shopPasswordForm.querySelector('[name="confirmPassword"]');
    const passwordRule=shopPasswordForm.querySelector('[data-shop-password-rule]');
    const syncShopPasswordValidation=()=>{
      const newPassword=String(newPasswordInput?.value||'');
      const confirmPassword=String(confirmPasswordInput?.value||'');
      const lengthValid=newPassword.length>=6;
      const matchValid=!confirmPassword || confirmPassword===newPassword;

      if(passwordRule){
        passwordRule.classList.toggle('valid',lengthValid);
        passwordRule.classList.toggle('invalid',newPassword.length>0 && !lengthValid);
      }
      if(newPasswordInput){
        newPasswordInput.classList.toggle('shop-password-invalid',newPassword.length>0 && !lengthValid);
        newPasswordInput.classList.toggle('shop-password-valid',lengthValid);
        newPasswordInput.setAttribute('aria-invalid',newPassword.length>0 && !lengthValid?'true':'false');
      }
      if(confirmPasswordInput){
        confirmPasswordInput.classList.toggle('shop-password-invalid',confirmPassword.length>0 && !matchValid);
        confirmPasswordInput.classList.toggle('shop-password-valid',confirmPassword.length>0 && matchValid && lengthValid);
        confirmPasswordInput.setAttribute('aria-invalid',confirmPassword.length>0 && !matchValid?'true':'false');
      }
    };
    newPasswordInput?.addEventListener('input',syncShopPasswordValidation);
    confirmPasswordInput?.addEventListener('input',syncShopPasswordValidation);
    syncShopPasswordValidation();

    shopPasswordForm.addEventListener('submit',async e=>{
      e.preventDefault();
      const form=e.currentTarget;
      const fd=new FormData(form);
      const currentPassword=String(fd.get('currentPassword')||'');
      const newPassword=String(fd.get('newPassword')||'');
      const confirmPassword=String(fd.get('confirmPassword')||'');
      if(newPassword.length<6) return toast('Das Passwort muss mindestens 6 Zeichen enthalten.');
      if(newPassword!==confirmPassword) return toast('Die neuen Passwörter stimmen nicht überein.');
      let currentHash='',newHash='';
      try{
        [currentHash,newHash]=await Promise.all([hashShopPassword(currentPassword),hashShopPassword(newPassword)]);
      }catch(_){
        return toast('Passwort konnte nicht geändert werden.');
      }
      if(currentHash!==currentShopPasswordHash()) return toast('Aktuelles Passwort ist nicht korrekt.');
      if(!saveShopPasswordHash(newHash) || currentShopPasswordHash()!==newHash) return toast('Passwort konnte nicht geändert werden.');

      form.reset();
      toast('Passwort wurde erfolgreich geändert.');
    });
  }

  document.querySelectorAll('[data-customer-picker]').forEach(picker=>{
    const trigger=picker.querySelector('[data-customer-trigger]');
    const menu=picker.querySelector('[data-customer-menu]');
    const search=picker.querySelector('[data-customer-search]');
    const hidden=picker.querySelector('input[type="hidden"]');
    const empty=picker.querySelector('[data-customer-empty]');

    const resetOptions=()=>{
      picker.querySelectorAll('[data-customer-option]').forEach(btn=>btn.hidden=false);
      picker.querySelectorAll('[data-customer-section]').forEach(section=>section.hidden=false);
      if(empty) empty.hidden=true;
    };

    const closeMenu=()=>{
      menu.hidden=true;
      search?.setAttribute('aria-expanded','false');
      picker.classList.remove('open');
      resetOptions();
      if(search) search.value=hidden?.value||'';
    };

    const openMenu=()=>{
      document.querySelectorAll('[data-customer-picker].open').forEach(other=>{
        if(other!==picker){
          const otherMenu=other.querySelector('[data-customer-menu]');
          const otherSearch=other.querySelector('[data-customer-search]');
          const otherHidden=other.querySelector('input[type="hidden"]');
          if(otherMenu) otherMenu.hidden=true;
          if(otherSearch){
            otherSearch.setAttribute('aria-expanded','false');
            otherSearch.value=otherHidden?.value||'';
          }
          other.classList.remove('open');
        }
      });
      menu.hidden=false;
      search?.setAttribute('aria-expanded','true');
      picker.classList.add('open');
    };

    trigger?.addEventListener('click',e=>{
      openMenu();
      if(e.target!==search) search?.focus({preventScroll:true});
    });
    search?.addEventListener('focus',openMenu);

    search?.addEventListener('input',()=>{
      const raw=search.value;
      const q=raw.trim().toLowerCase();

      if(hidden && raw!==hidden.value){
        hidden.value='';
        state.customer='';
        if(hidden.id==='payoutCustomer'){
          const balanceField=document.querySelector('#payoutBalanceField');
          const balanceValue=document.querySelector('#payoutCurrentBalance');
          if(balanceField) balanceField.hidden=true;
          if(balanceValue) balanceValue.textContent='';
        }
      }

      let anyVisible=false;
      picker.querySelectorAll('[data-customer-section]').forEach(section=>{
        let sectionVisible=false;
        section.querySelectorAll('[data-customer-option]').forEach(btn=>{
          const show=!q || btn.dataset.value.toLowerCase().includes(q);
          btn.hidden=!show;
          if(show){ sectionVisible=true; anyVisible=true; }
        });
        section.hidden=!sectionVisible;
      });
      if(empty) empty.hidden=anyVisible;
      openMenu();
    });

    picker.querySelectorAll('[data-customer-option]').forEach(btn=>btn.addEventListener('click',()=>{
      const customer=btn.dataset.value||'';
      if(hidden) hidden.value=customer;
      if(search) search.value=customer;
      state.customer=customer;
      recordCustomerSelection(customer);
      closeMenu();

      if(hidden?.id==='payoutCustomer'){
        const balanceField=document.querySelector('#payoutBalanceField');
        const balanceValue=document.querySelector('#payoutCurrentBalance');
        if(balanceField) balanceField.hidden=!customer;
        if(balanceValue) balanceValue.textContent=customer?formatAccountBalance(customerBalanceValue(customer)):'';
      }
    }));
  });

  document.addEventListener('click',e=>{
    if(e.target.closest('[data-customer-picker]')) return;
    document.querySelectorAll('[data-customer-picker].open').forEach(picker=>{
      const menu=picker.querySelector('[data-customer-menu]');
      const search=picker.querySelector('[data-customer-search]');
      const hidden=picker.querySelector('input[type="hidden"]');
      if(menu) menu.hidden=true;
      if(search){
        search.setAttribute('aria-expanded','false');
        search.value=hidden?.value||'';
      }
      picker.classList.remove('open');
    });
  });

  // Close buttons are intentionally separate from regular navigation:
  // close the current flow, replace its history entry and show the dashboard immediately.
  document.querySelectorAll('[data-transaction-close]').forEach(el=>el.addEventListener('click',e=>{
    e.preventDefault();
    e.stopPropagation();
    state.drawer=false;
    go('home');
  }));
  document.querySelectorAll('[data-close-page]').forEach(el=>el.addEventListener('click',e=>{
    e.preventDefault();
    e.stopPropagation();
    state.drawer=false;
    if(state.customerSubpageFromSearch && (state.route==='edit-customer' || state.route==='history')){
      returnToCustomerSearch();
      return;
    }
    state.customer='';
    state.amount='';
    state.committedFlow='';
    go('home');
  }));
  document.querySelectorAll('[data-ticket-page]').forEach(el=>el.addEventListener('click',()=>{
    if(el.disabled) return;
    state.ticketPage=Number(el.dataset.ticketPage)||1;
    render();
  }));
  document.querySelectorAll('[data-open-coupon]').forEach(el=>el.addEventListener('click',()=>{
    state.selectedCouponId=el.dataset.openCoupon||'';
    state.couponListScrollY=window.scrollY;
    state.scrollTopOnNextRender=true;
    go('coupon-detail');
  }));
  document.querySelector('[data-coupon-back]')?.addEventListener('click',()=>{
    state.restoreCouponScrollOnNextRender=true;
    go('coupons');
  });

  document.querySelectorAll('[data-edit-customer]').forEach(el=>el.addEventListener('click',()=>{
    const customerId=el.dataset.editCustomer||'';
    saveCustomerSearchReturn(customerId);
    state.editingCustomerId=customerId;
    state.scrollTopOnNextRender=true;
    go('edit-customer');
  }));
  document.querySelectorAll('[data-customer-history]').forEach(el=>el.addEventListener('click',()=>{
    const customerId=el.dataset.customerHistory||'';
    saveCustomerSearchReturn(customerId);
    state.scrollTopOnNextRender=true;
    go('history');
  }));
  document.querySelectorAll('[data-edit-customer-toggle] input[type="checkbox"]').forEach(input=>input.addEventListener('change',()=>{
    const status=input.closest('[data-edit-customer-toggle]')?.querySelector('[data-edit-customer-status]');
    if(!status) return;
    const active=input.checked;
    const statusSource=active?'Aktiv':'Inaktiv';
    status.textContent=window.BETXSOFT_I18N?.translate(statusSource,state.language)||statusSource;
    status.classList.toggle('active',active);
    status.classList.toggle('inactive',!active);
  }));
  document.querySelectorAll('[data-go]').forEach(el=>el.addEventListener('click',()=>go(el.dataset.go)));
  document.querySelector('[data-confirm-deposit]')?.addEventListener('click',()=>{
    if(state.committedFlow==='deposit'){ go('deposit-3'); return; }
    const amount=Number(state.amount||'0');
    if(!Number.isFinite(amount) || amount<=0) return toast('Bitte einen gültigen Betrag eingeben.');
    const shopBalance=totalBalanceValue();
    if(amount>shopBalance) return toast('Einzahlung nicht möglich. Der Shop verfügt nicht über genügend Guthaben.');
    const current=customerBalanceValue(state.customer);
    setCustomerBalance(state.customer,current+amount);
    adjustTotalBalance(-amount);
    state.committedFlow='deposit';
    go('deposit-3');
  });
  document.querySelector('[data-confirm-payout]')?.addEventListener('click',()=>{
    if(state.committedFlow==='payout'){ go('payout-3'); return; }
    const amount=Number(state.amount||'0');
    const current=customerBalanceValue(state.customer);
    setCustomerBalance(state.customer,Math.max(0,current-amount));
    adjustTotalBalance(amount);
    state.committedFlow='payout';
    go('payout-3');
  });
  document.querySelector('[data-language-menu]')?.addEventListener('click',e=>{
    e.preventDefault();
    e.stopPropagation();
    state.languageOpen=!state.languageOpen;
    render();
  });
  document.querySelectorAll('[data-language]').forEach(el=>el.addEventListener('click',e=>{
    e.preventDefault();
    e.stopPropagation();
    state.language=el.dataset.language||'de';
    state.languageOpen=false;
    try{ localStorage.setItem('betxsoftLanguage',state.language); }catch(_){}
    render();
    toast('Sprache wurde geändert.');
  }));
  document.querySelectorAll('[data-drawer]').forEach(el=>el.addEventListener('click',()=>{state.drawer=true;state.languageOpen=false;render()}));
  document.querySelectorAll('[data-drawer-close]').forEach(el=>el.addEventListener('click',()=>{state.drawer=false;state.languageOpen=false;render()}));
  document.querySelectorAll('[data-turnover-record-page]').forEach(el=>el.addEventListener('click',()=>{
    if(el.disabled) return;
    state.turnoverRecordPage=Number(el.dataset.turnoverRecordPage)||1;
    render();
  }));
  document.querySelector('[data-reset-turnover]')?.addEventListener('click',()=>{
    const current=loadTurnoverLedger().current||{};
    const hasBalance=['deposit','payout','profit','card','crypto'].some(key=>Number(current[key]||0)!==0);
    if(!hasBalance){
      toast('Der Kassenstand ist bereits 0.');
      return;
    }
    state.turnoverResetConfirm=true;
    render();
  });
  document.querySelector('[data-turnover-reset-cancel]')?.addEventListener('click',()=>{
    state.turnoverResetConfirm=false;
    render();
  });
  document.querySelector('[data-turnover-reset-backdrop]')?.addEventListener('click',e=>{
    if(e.target!==e.currentTarget) return;
    state.turnoverResetConfirm=false;
    render();
  });
  document.querySelector('[data-turnover-reset-confirm]')?.addEventListener('click',()=>{
    state.turnoverResetConfirm=false;
    if(!resetCurrentTurnoverTill()){
      render();
      toast('Der Kassenstand ist bereits 0.');
      return;
    }
    state.turnoverRecordPage=1;
    render();
    toast('Kasse auf 0 gesetzt und unter „Letzte Aufzeichnungen“ gespeichert.');
  });
  document.querySelector('[data-apply-history]')?.addEventListener('click',()=>{
    state.historyStatusFilter=document.querySelector('[data-history-status]')?.value||'Alle';
    state.historyTypeFilter=document.querySelector('[data-history-type]')?.value||'Alle';
    state.historyPage=1;
    render();
    toast('Filter angewendet.');
  });
  document.querySelector('[data-reset-history]')?.addEventListener('click',()=>{
    state.historyStatusFilter='Alle';
    state.historyTypeFilter='Alle';
    state.historyPage=1;
    render();
    toast('Filter zurückgesetzt.');
  });
  document.querySelectorAll('[data-history-page]').forEach(el=>el.addEventListener('click',()=>{
    if(el.disabled) return;
    state.historyPage=Number(el.dataset.historyPage)||1;
    render();
  }));
  document.querySelectorAll('[data-demo]').forEach(el=>el.addEventListener('click',()=>toast(el.dataset.demo)));
  document.querySelectorAll('[data-export]').forEach(el=>el.addEventListener('click',()=>{
    if(state.route==='history') return exportHistoryCsv();
    toast('Export wurde vorbereitet.');
  }));
  document.querySelectorAll('[data-amount]').forEach(el=>el.addEventListener('click',()=>{const target=document.querySelector('#depositAmount,#payoutAmount');if(!target)return;target.value=el.dataset.amount;document.querySelectorAll('[data-amount]').forEach(x=>x.classList.remove('selected'));el.classList.add('selected')}));
  document.querySelectorAll('[data-toggle]').forEach(el=>el.addEventListener('click',e=>{
    e.preventDefault();
    const key=el.dataset.toggle;
    const next=!state.toggles[key];
    state.toggles={};
    if(next) state.toggles[key]=true;
    state.ticketPage=1;
    render();
  }));
  document.querySelector('[data-flow="deposit-next"]')?.addEventListener('click',()=>{
    const customer=document.querySelector('#depositCustomer')?.value||'';
    const raw=document.querySelector('#depositAmount')?.value.trim()||'';
    const amount=Number(raw.replace(',','.'));
    if(!customer) return toast('Bitte einen Kunden auswählen.');
    if(!raw||!Number.isFinite(amount)||amount<=0) return toast('Bitte einen gültigen Betrag eingeben.');
    if(amount>totalBalanceValue()) return toast('Einzahlung nicht möglich. Der Shop verfügt nicht über genügend Guthaben.');
    state.amount=String(amount);
    state.customer=customer;
    state.committedFlow='';
    go('deposit-2');
  });
  document.querySelector('[data-flow="payout-next"]')?.addEventListener('click',()=>{
    const customer=document.querySelector('#payoutCustomer')?.value||'';
    const raw=document.querySelector('#payoutAmount').value.trim();
    const amount=Number(raw.replace(',','.'));
    if(!customer)return toast('Bitte einen Kunden auswählen.');
    if(!raw||!Number.isFinite(amount)||amount<=0)return toast('Bitte einen gültigen Betrag eingeben.');
    const balance=customerBalanceValue(customer);
    if(amount>balance)return toast('Der Betrag übersteigt das aktuelle Guthaben.');
    state.amount=String(amount);
    state.customer=customer;
    state.committedFlow='';
    go('payout-2');
  });
  document.querySelector('[data-flow="filters-apply"]')?.addEventListener('click',()=>{toast('Filter wurden angewendet.');setTimeout(()=>go('coupons'),500)});
  document.querySelector('[data-apply-customer]')?.addEventListener('click',()=>{
    state.customerIdFilter=document.querySelector('[data-customer-id-filter]')?.value.trim()||'';
    state.customerNameFilter=document.querySelector('[data-customer-name-filter]')?.value.trim()||'';
    state.customerFilter='';
    state.customerStatusFilter=document.querySelector('[data-customer-status-filter]')?.value||'Alle';
    state.customerPage=1;
    render();
  });
  document.querySelector('[data-reset-customer]')?.addEventListener('click',()=>{
    state.customerFilter='';
    state.customerIdFilter='';
    state.customerNameFilter='';
    state.customerStatusFilter='Alle';
    state.customerPage=1;
    render();
  });
  document.querySelectorAll('[data-customer-page]').forEach(el=>el.addEventListener('click',()=>{
    if(el.disabled) return;
    state.customerPage=Number(el.dataset.customerPage)||1;
    render();
  }));
  document.querySelector('[data-apply-ticket]')?.addEventListener('click',()=>{state.ticketFilter=[...document.querySelectorAll('[data-filter="ticket"]')].map(x=>x.value).find(Boolean)||'';state.ticketPage=1;render()});
  document.querySelector('[data-reset-ticket]')?.addEventListener('click',()=>{state.ticketFilter='';state.ticketPage=1;state.toggles={};render()});

  document.querySelector('#editCustomerForm')?.addEventListener('submit',e=>{
    e.preventDefault();
    const form=e.currentTarget;
    const row=customerById(form.dataset.customerId);
    if(!row) return toast('Kunde wurde nicht gefunden.');
    const fd=new FormData(form);
    const oldUsername=String(row[1]||'');
    const username=String(fd.get('username')||'').trim();
    if(!username) return toast('Bitte einen User Name eingeben.');
    const duplicate=customers.concat(state.createdUsers).some(candidate=>candidate!==row && String(candidate[1]).toLowerCase()===username.toLowerCase());
    if(duplicate) return toast('Dieser User Name ist bereits vergeben.');
    const currentBalance=customerBalanceValue(oldUsername);
    const profile={
      password:String(fd.get('password')||''),
      risk:String(fd.get('risk')||'Yellow 10%'),
      payoutActive:fd.get('payoutActive')==='on',
      firstName:String(fd.get('firstName')||'').trim(),
      lastName:String(fd.get('lastName')||'').trim(),
      email:String(fd.get('email')||'').trim(),
      phone:String(fd.get('phone')||'').trim(),
      address:String(fd.get('address')||'').trim(),
      country:String(fd.get('country')||'').trim(),
      casinoActive:fd.get('casinoActive')==='on',
      accountActive:fd.get('accountActive')==='on'
    };
    saveCustomerProfile(row,profile);
    if(username!==oldUsername){
      const stored=storedCustomerBalances();
      delete stored[oldUsername];
      try{ localStorage.setItem('betxsoftCustomerBalances',JSON.stringify(stored)); }catch(_){}
      row[1]=username;
    }
    setCustomerBalance(row[1],currentBalance);
    row[3]=profile.accountActive?'Aktiv':'Gesperrt';
    render();
    toast('Kundendaten wurden gespeichert.');
  });
  document.querySelector('#createUserForm')?.addEventListener('submit',e=>{e.preventDefault();const fd=new FormData(e.target);const name=fd.get('username').trim();const rawBalance=String(fd.get('balance')||'').trim().replace(',','.');const balance=Number.isFinite(Number(rawBalance))&&rawBalance!==''?Number(rawBalance):0;state.createdUsers.unshift([String(6000+state.createdUsers.length),name,formatAccountBalance(balance),'Aktiv']);toast(`Kunde ${name} wurde erstellt.`);setTimeout(()=>go('home'),500)});
  document.querySelector('[data-transaction-search]')?.addEventListener('input',applyTransactionFilters);
  document.querySelector('[data-transaction-from]')?.addEventListener('change',applyTransactionFilters);
  document.querySelector('[data-transaction-to]')?.addEventListener('change',applyTransactionFilters);
  document.querySelectorAll('[data-turnover-period]').forEach(el=>el.addEventListener('click',()=>{
    state.turnoverPeriod=el.dataset.turnoverPeriod;
    state.turnoverRangeOpen=false;
    render();
    const selectedLabel=el.textContent.trim();
    const selectedRange=['today','yesterday','week','month'].includes(state.turnoverPeriod)
      ? ` (${periodRangeText(state.turnoverPeriod)})`
      : '';
    toast(`Zeitraum „${selectedLabel}“ ausgewählt.${selectedRange}`);
  }));
  document.querySelector('[data-turnover-custom-range]')?.addEventListener('click',()=>{
    state.turnoverRangeOpen=!state.turnoverRangeOpen;
    render();
  });
  document.querySelector('[data-turnover-range-apply]')?.addEventListener('click',()=>{
    const from=document.querySelector('[data-turnover-range-from]')?.value||'';
    const to=document.querySelector('[data-turnover-range-to]')?.value||'';
    const start=new Date(from+'T12:00:00');
    const end=new Date(to+'T12:00:00');
    if(!from||!to||Number.isNaN(start.getTime())||Number.isNaN(end.getTime())||end<start){
      toast('Bitte einen gültigen Zeitraum wählen.');
      return;
    }
    state.turnoverFrom=from;
    state.turnoverTo=to;
    state.turnoverPeriod='custom';
    state.turnoverRangeOpen=false;
    render();
    toast('Individueller Zeitraum angewendet.');
  });
  document.querySelectorAll('[data-period]').forEach(el=>el.addEventListener('click',()=>{
    state.dashboardPeriod=el.dataset.period;
    state.customRangeOpen=false;
    render();
    const selectedLabel=el.textContent.trim();
    const selectedRange=['today','yesterday','week','month'].includes(state.dashboardPeriod)
      ? ` (${periodRangeText(state.dashboardPeriod)})`
      : '';
    toast(`Zeitraum „${selectedLabel}“ ausgewählt.${selectedRange}`);
  }));
  document.querySelector('[data-custom-range]')?.addEventListener('click',()=>{state.customRangeOpen=!state.customRangeOpen;render()});
  document.querySelector('[data-range-apply]')?.addEventListener('click',()=>{const from=document.querySelector('[data-range-from]').value;const to=document.querySelector('[data-range-to]').value;const start=new Date(from+'T00:00:00');const end=new Date(to+'T00:00:00');if(!from||!to||end<start)return toast('Bitte einen gültigen Zeitraum wählen.');const days=Math.min(366,Math.floor((end-start)/86400000)+1);const deposit=Math.round(days*12175.35+(days%7)*420);const payout=Math.round(deposit*(.63+Math.min(days,30)*.001));state.customFrom=from;state.customTo=to;state.customDashboard={deposit,payout,profit:deposit-payout};state.dashboardPeriod='custom';state.customRangeOpen=false;render();toast(`${days} Tage ausgewertet.`)});
  document.querySelectorAll('.tab:not([data-period]):not([data-turnover-period])').forEach(el=>el.addEventListener('click',()=>{el.parentElement.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));el.classList.add('active');toast(`Zeitraum „${el.textContent.trim()}“ ausgewählt.`)}));
}



/* ios-keyboard-viewport-lock:start */
const iosKeyboardViewportLock=(()=>{
  const isIOS=/iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform==='MacIntel' && navigator.maxTouchPoints>1);
  if(!isIOS) return {installed:false,unfreeze(){},release(){}};

  const editableSelector=[
    'input:not([type="checkbox"]):not([type="radio"]):not([type="range"]):not([type="color"]):not([type="file"]):not([type="button"]):not([type="submit"]):not([type="reset"])',
    'textarea',
    '[contenteditable="true"]'
  ].join(',');

  let lock=null;
  let restoreTimer=null;

  function isEditable(el){
    return el instanceof Element && el.matches(editableSelector);
  }

  function freeze(){
    if(lock) return;
    const x=window.scrollX || 0;
    const y=window.scrollY || 0;
    lock={
      x,y,
      bodyPosition:document.body.style.position,
      bodyTop:document.body.style.top,
      bodyLeft:document.body.style.left,
      bodyRight:document.body.style.right,
      bodyWidth:document.body.style.width,
      bodyOverflow:document.body.style.overflow
    };

    document.documentElement.classList.add('ios-keyboard-locked');
    document.body.classList.add('ios-keyboard-locked');
    document.body.style.position='fixed';
    document.body.style.top=`-${y}px`;
    document.body.style.left=`-${x}px`;
    document.body.style.right='0';
    document.body.style.width='100%';
    document.body.style.overflow='hidden';
  }

  function unfreeze(restorePosition=true){
    if(!lock) return;
    const saved=lock;
    lock=null;

    document.documentElement.classList.remove('ios-keyboard-locked');
    document.body.classList.remove('ios-keyboard-locked');

    document.body.style.position=saved.bodyPosition;
    document.body.style.top=saved.bodyTop;
    document.body.style.left=saved.bodyLeft;
    document.body.style.right=saved.bodyRight;
    document.body.style.width=saved.bodyWidth;
    document.body.style.overflow=saved.bodyOverflow;

    if(restorePosition){
      requestAnimationFrame(()=>{
        window.scrollTo({left:saved.x,top:saved.y,behavior:'instant'});
        requestAnimationFrame(()=>window.scrollTo(saved.x,saved.y));
      });
    }
  }
  function release(){
    clearTimeout(restoreTimer);
    unfreeze(false);
  }

  document.addEventListener('focusin',e=>{
    if(!isEditable(e.target)) return;
    if(e.target.closest?.('.shop-login-page')) return;
    clearTimeout(restoreTimer);
    freeze();

    // Safari can try to pan the visual viewport after focus; keep the document anchored.
    requestAnimationFrame(()=>{
      if(lock) window.scrollTo(lock.x,lock.y);
      setTimeout(()=>{ if(lock) window.scrollTo(lock.x,lock.y); },80);
      setTimeout(()=>{ if(lock) window.scrollTo(lock.x,lock.y); },260);
    });
  },true);

  document.addEventListener('focusout',()=>{
    clearTimeout(restoreTimer);
    restoreTimer=setTimeout(()=>{
      if(!isEditable(document.activeElement)) unfreeze();
    },120);
  },true);

  // If Safari reports visual-viewport movement while the keyboard is open,
  // immediately keep the layout viewport at the saved position.
  if(window.visualViewport){
    const keepAnchored=()=>{
      if(!lock) return;
      window.scrollTo(lock.x,lock.y);
    };
    window.visualViewport.addEventListener('resize',keepAnchored,{passive:true});
    window.visualViewport.addEventListener('scroll',keepAnchored,{passive:true});
  }

  return {installed:true,unfreeze,release};
})();
/* ios-keyboard-viewport-lock:end */

function initializePage(){
  state.route=document.body.dataset.route||'home';
  const i18n=window.BETXSOFT_I18N;
  if(!i18n?.languages?.some(x=>x.code===state.language)) state.language='en';
  const needsStatefulMarkup=
    (state.route==='deposit-1' && Boolean(state.customer||state.amount)) ||
    (state.route==='deposit-2' && Boolean(state.customer&&state.amount)) ||
    (state.route==='deposit-3' && state.committedFlow==='deposit') ||
    (state.route==='payout-1' && Boolean(state.customer||state.amount)) ||
    (state.route==='payout-2' && Boolean(state.customer&&state.amount)) ||
    (state.route==='payout-3' && state.committedFlow==='payout') ||
    (state.route==='edit-customer' && Boolean(state.editingCustomerId)) ||
    (state.route==='history' && Boolean(state.selectedCustomerId||state.customerSubpageFromSearch)) ||
    (state.route==='coupon-detail' && Boolean(state.selectedCouponId)) ||
    (state.route==='customers' && Boolean(state.customerSubpageFromSearch||state.restoreCustomerScrollOnNextRender)) ||
    (state.route==='coupons' && Boolean(state.restoreCouponScrollOnNextRender)) ||
    (state.route==='turnover' && state.turnoverPeriod!=='week') ||
    (state.route==='home' && state.dashboardPeriod!=='today');
  if(needsStatefulMarkup){
    render();
    return;
  }
  const routeTitle=routes.find(x=>x[0]===state.route)?.[1]||'Shop Admin';
  document.title=`${i18n?.translate(routeTitle,state.language)||routeTitle} | BetXsoft`;
  i18n?.apply(document.querySelector('#app'),state.language);
  bind();
  saveAppState();
}

try{ history.scrollRestoration='manual'; }catch(_){}
initializePage();
