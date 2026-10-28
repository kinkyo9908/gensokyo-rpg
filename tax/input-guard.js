/* Registered before the existing game keyboard listeners; active only in ledger. */
(() => {
 const guard=e=>{const tax=window.GensokyoTax;if(!tax?.isLedgerOpen)return;
  e.stopImmediatePropagation();
  if(e.type==='keydown'&&e.key==='Escape'){e.preventDefault();tax.closeLedger();}
 };
 window.addEventListener('keydown',guard,true);window.addEventListener('keyup',guard,true);
})();
