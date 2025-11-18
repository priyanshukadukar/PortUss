


/* Constants & helper functions (same logic as before) */
const CIF_USD_DEFAULT = 64;
const FOB_CIF_USD = 54;
const DEFAULT_EX_RATE = 88.2;
const SHIPPING_GST = 18;
const MACHINE_GST_PCT = 18;
const IMPORT_DUTY_PCT = 0.075;

const PROFIT_FCA = 27;
const PROFIT_CIF_FOB = 20;

const CE = 18000;
const BG_BOND = 15000;
const AGENCY_FEE = 30000;

const $ = id => document.getElementById(id);
function fmtINR(n){ return '₹' + Number(n || 0).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2}) }

function getYearMultiplier(){
  const sel = $('manYear');
  const opt = sel.options[sel.selectedIndex];
  const mult = Number(opt.getAttribute('data-mult')) || 100000;
  return { year: opt.value, mult, label: opt.text };
}
function getIncoterm(){
  const radios = document.getElementsByName('incoterm');
  for(const r of radios){ if(r.checked) return r.value; }
  return 'FCA';
}

function computePublic({tons, cbm, truckingRate, machineUSD, exRate, incoterm, yearMult}){
  const ex = Number(exRate) || DEFAULT_EX_RATE;
  const assessedValue = Number(tons || 0) * Number(yearMult || 100000);
  const dosp = tons * 450;
  const assessed_shipping = assessedValue;
  const port = assessed_shipping * 0.0065;
  const agencyPct = assessed_shipping * 0.015;
  const stamp = assessed_shipping * 0.00125;

  let cifUsd = CIF_USD_DEFAULT;
  if(incoterm === 'FOB') cifUsd = FOB_CIF_USD;
  const rawChinaCharges = cbm * cifUsd * ex;
  const trucking = Number(truckingRate) || 0;

  const profitPct = (incoterm === 'FCA') ? PROFIT_FCA : PROFIT_CIF_FOB;

  let askNoGst = 0;
  let askWithGst = 0;
  let totalVariable = 0;
  let totalFixed = 0;
  let portAgencyStamp = 0;
  let chinaChargesWithProfit = 0;

  if(incoterm === 'FCA'){
    portAgencyStamp = port + agencyPct + stamp;
    const hiddenItems = { port, agencyPct, chinaCharges: rawChinaCharges, stamp };
    let hiddenSum = 0;
    for(const k in hiddenItems){
      const base = Number(hiddenItems[k] || 0);
      hiddenSum += base * (1 + profitPct/100);
    }
    totalVariable = dosp + trucking + hiddenSum;
    totalFixed = CE + BG_BOND + AGENCY_FEE;
    const totalCost = totalVariable + totalFixed;
    askNoGst = totalCost;
    askWithGst = askNoGst * (1 + SHIPPING_GST/100);
    chinaChargesWithProfit = rawChinaCharges * (1 + profitPct/100);
  } else if(incoterm === 'CIF' || incoterm === 'FOB'){
    portAgencyStamp = 0;
    chinaChargesWithProfit = rawChinaCharges * (1 + profitPct/100);
    totalVariable = chinaChargesWithProfit;
    totalFixed = 0;
    askNoGst = chinaChargesWithProfit;
    askWithGst = chinaChargesWithProfit * (1 + SHIPPING_GST/100);
  } else {
    // fallback
    const hiddenItems = { port, agencyPct, chinaCharges: rawChinaCharges, stamp };
    let hiddenSum = 0;
    for(const k in hiddenItems){
      const base = Number(hiddenItems[k] || 0);
      hiddenSum += base * (1 + profitPct/100);
    }
    totalVariable = dosp + trucking + hiddenSum;
    totalFixed = CE + BG_BOND + AGENCY_FEE;
    askNoGst = totalVariable + totalFixed;
    askWithGst = askNoGst * (1 + SHIPPING_GST/100);
    chinaChargesWithProfit = rawChinaCharges * (1 + profitPct/100);
  }

  // Machine
  const machineINR = Number(machineUSD || 0) * ex;
  const importDuty = assessedValue * IMPORT_DUTY_PCT;
  const machineGst = assessedValue * (MACHINE_GST_PCT/100);
  const machineNoGst = machineINR + importDuty;
  const machineWithGst = machineNoGst + machineGst;

  const combinedNoGst = askNoGst + machineNoGst;
  const combinedWithGst = askWithGst + machineWithGst;

  return {
    incoterm,
    cifUsd: cifUsd,
    profitPct,
    assessedValue,
    assessedMultiplier: yearMult,
    assessedYearLabel: (document.getElementById('manYear').options[document.getElementById('manYear').selectedIndex].text),
    dosp, trucking, port, agencyPct, stamp, rawChinaCharges, chinaChargesWithProfit,
    totalVariable, totalFixed, askNoGst, askWithGst, portAgencyStamp,
    machineINR, importDuty, machineGst, machineNoGst, machineWithGst,
    combinedNoGst, combinedWithGst
  };
}

/* UI wiring */
$('calc').addEventListener('click', ()=> {
  const tons = Number($('tons').value) || 0;
  const cbm = Number($('cbm').value) || 0;
  const truckingRate = Number($('truckingRate').value) || 0;
  const machineUSD = Number($('machineUSD').value) || 0;
  const exRate = Number($('exRateInput').value) || DEFAULT_EX_RATE;
  const incoterm = getIncoterm();
  const { year, mult, label } = getYearMultiplier();

  const out = computePublic({tons, cbm, truckingRate, machineUSD, exRate, incoterm, yearMult: mult});

  // update UI
  $('incotermNote').textContent = `Using: ${out.incoterm} · ${out.assessedYearLabel}`;
  $('askNoGst').textContent = fmtINR(out.askNoGst);
  $('askWithGst').textContent = fmtINR(out.askWithGst);
  $('dosp').textContent = (out.incoterm === 'FCA') ? fmtINR(out.dosp) : '—';
  $('truckDisplay').textContent = (out.incoterm === 'FCA') ? fmtINR(out.trucking) : '—';
  $('portAgencyStamp').textContent = (out.incoterm === 'FCA') ? fmtINR(out.portAgencyStamp) : '—';
  $('totalVar').textContent = fmtINR(out.totalVariable || 0);
  $('totalFixed').textContent = fmtINR(out.totalFixed || 0);
  $('totalCost').textContent = fmtINR(out.askNoGst || 0);
  $('assessedDisplay').textContent = fmtINR(out.assessedValue);

  $('ml_portusShipping').textContent = fmtINR(out.askNoGst);
  $('ml_machine').textContent = fmtINR(out.machineINR);
  $('ml_duty').textContent = fmtINR(out.importDuty);
  $('ml_gst').textContent = fmtINR(out.machineGst);
  $('machine_nogst').textContent = fmtINR(out.combinedNoGst);
  $('machine_withgst').textContent = fmtINR(out.combinedWithGst);

  window._lastClientRow = {
    incoterm: out.incoterm,
    cif_usd_used: out.cifUsd,
    profit_pct_applied: out.profitPct,
    assessed_year: year,
    assessed_multiplier: out.assessedMultiplier,
    assessed_label: out.assessedYearLabel,
    shipment: `Shanghai->Bombay`,
    crane_tons: tons,
    total_cbm: cbm,
    trucking_rate: truckingRate,
    assessed_value: Number(out.assessedValue.toFixed(2)),
    portus_shipping_no_gst: Number(out.askNoGst.toFixed(2)),
    portus_shipping_with_gst: Number(out.askWithGst.toFixed(2)),
    machine_inr: Number(out.machineINR.toFixed(2)),
    import_duty: Number(out.importDuty.toFixed(2)),
    machine_gst: Number(out.machineGst.toFixed(2)),
    machine_landed_no_gst: Number(out.machineNoGst ? out.machineNoGst.toFixed(2) : out.combinedNoGst.toFixed(2)),
    machine_landed_with_gst: Number(out.machineWithGst ? out.machineWithGst.toFixed(2) : out.combinedWithGst.toFixed(2)),
    combined_no_gst: Number(out.combinedNoGst.toFixed(2)),
    combined_with_gst: Number(out.combinedWithGst.toFixed(2))
  };
});

/* Copy CSV: unchanged */
$('copyBtn').addEventListener('click', async ()=>{
  if(!window._lastClientRow){ alert('Please run Calculate first'); return; }
  const keys = ['incoterm','cif_usd_used','profit_pct_applied','assessed_year','assessed_multiplier','assessed_label','shipment','crane_tons','total_cbm','trucking_rate','assessed_value','portus_shipping_no_gst','portus_shipping_with_gst','machine_inr','import_duty','machine_gst','machine_landed_no_gst','machine_landed_with_gst','combined_no_gst','combined_with_gst'];
  const header = keys.join(',');
  const row = keys.map(k => window._lastClientRow[k]).join(',');
  try {
    await navigator.clipboard.writeText(header + '\n' + row);
    alert('CSV copied to clipboard');
  } catch (e) {
    const w = window.open('','_blank');
    if(w){ w.document.write('<pre>'+ (header + '\n' + row).replace(/</g,'&lt;') +'</pre>'); w.document.title='CSV'; w.focus(); }
    else alert('Clipboard blocked — copy this line:\\n\\n' + (header + '\\n' + row));
  }
});

/* Download PDF: capture the main container and create PDF */
$('downloadBtn').addEventListener('click', async () => {
  if(!window._lastClientRow){ alert('Please run Calculate first'); return; }

  // Element to capture. We use the whole .container to include both input and results.
  const element = document.getElementById('pdfRoot');

  // Build a filename: include model (sanitized) and date
  const modelRaw = (document.getElementById('model').value || 'quote').replace(/[^a-z0-9_\-]/gi, '_');
  const now = new Date();
  const dateStr = now.toISOString().slice(0,19).replace(/[:T]/g,'-');
  const filename = `portus_quote_${modelRaw}_${dateStr}.pdf`;

  // html2pdf options: A4, portrait, margin 0.4in, high-quality image
  const opt = {
    margin:       [0.4, 0.4, 0.4, 0.4], // top, left, bottom, right in inches
    filename:     filename,
    image:        { type: 'jpeg', quality: 0.98 },
    html2canvas:  { scale: 2, useCORS: true },
    jsPDF:        { unit: 'in', format: 'a4', orientation: 'portrait' }
  };

  try {
    // temporarily add a small watermark / timestamp inside a clone if you want (optional)
    // generate PDF
    await html2pdf().set(opt).from(element).save();
    // success message optional
    // alert('PDF downloaded: ' + filename);
  } catch (err) {
    console.error('PDF generation failed', err);
    alert('PDF generation failed — try again or use Copy CSV.');
  }
});



