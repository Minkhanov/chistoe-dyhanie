(function(){
  "use strict";
  var LS = "chistoe-dyhanie-v1";
  var state = load();
  function load(){ try { return JSON.parse(localStorage.getItem(LS)) || {}; } catch(e){ return {}; } }
  function save(){ try{ localStorage.setItem(LS, JSON.stringify(state)); }catch(e){} }
  /* ---------- ХЕЛПЕРЫ ---------- */
  function $(id){ return document.getElementById(id); }
  function esc(s){ return String(s).replace(/[&<>"]/g, function(c){
    return {"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"}[c]; }); }
  function fmtMoney(v){
    return new Intl.NumberFormat("ru-RU",{maximumFractionDigits:0}).format(v) + " ₽";
  }
  function plural(n, a, b, c){
    var n10=n%10, n100=n%100;
    if(n10===1 && n100!==11) return a;
    if(n10>=2 && n10<=4 && (n100<10||n100>=20)) return b;
    return c;
  }
  function dayKey(d){
    return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
  }

  /* ---------- РАСЧЁТЫ ---------- */
  function elapsed(){
    if(!state.quitAt) return 0;
    return Math.max(0, Date.now() - new Date(state.quitAt).getTime());
  }
  function daysFloat(){ return elapsed() / 86400000; }

  /* ---------- РЕНДЕР: СЕГОДНЯ ---------- */
  var CIRC = 2 * Math.PI * 104;
  function renderToday(){
    var ms = elapsed(), d = daysFloat();
    var fullDays = Math.floor(d);
    $("bigDays").textContent = fullDays;
    $("bigDaysLabel").textContent = plural(fullDays,"день свободы","дня свободы","дней свободы");
    var h = Math.floor(ms/3600000)%24, m = Math.floor(ms/60000)%60, s = Math.floor(ms/1000)%60;
    $("hms").textContent = h+" ч "+String(m).padStart(2,"0")+" мин "+String(s).padStart(2,"0")+" с";

    var next = null;
    for(var i=0;i<MILES.length;i++){ if(d < MILES[i].m){ next = MILES[i]; break; } }
    var prevM = 0;
    if(next){
      for(var j=0;j<MILES.length;j++){ if(MILES[j].m < next.m && d >= MILES[j].m) prevM = MILES[j].m; }
      var frac = (d - prevM) / (next.m - prevM);
      frac = Math.min(1, Math.max(0, frac));
      $("ringBar").style.strokeDashoffset = String(CIRC * (1 - frac));
      var left = next.m - d;
      var leftTxt = left >= 1 ? Math.ceil(left)+" "+plural(Math.ceil(left),"день","дня","дней")
                              : Math.ceil(left*24)+" ч";
      $("nextMile").innerHTML = "До вехи «<b>"+esc(next.t)+"</b>» осталось "+leftTxt;
    } else {
      $("ringBar").style.strokeDashoffset = "0";
      $("nextMile").innerHTML = "<b>Все вехи пройдены.</b> Ты свободен полностью.";
    }

    var perDay = state.perDay||20, price = state.packPrice||250, size = state.packSize||20;
    var cigs = d * perDay;
    $("moneySaved").textContent = fmtMoney(cigs/size*price);
    $("cigsAvoided").textContent = Math.floor(cigs);
    var lifeMin = cigs*11;
    $("lifeMinutes").textContent = lifeMin>=60 ? Math.floor(lifeMin/60)+" ч" : Math.floor(lifeMin)+" мин";
    $("tasksDone").textContent = Object.keys(state.done||{}).length;

    var qi = Math.floor(d) % QUOTES.length;
    $("quoteText").textContent = "«"+QUOTES[qi]+"»";
  }

  /* ---------- РЕНДЕР: ЗДОРОВЬЕ ---------- */
  function renderNow(){
    var d = daysFloat(), st = NOW_STAGES[NOW_STAGES.length-1];
    for(var i=0;i<NOW_STAGES.length;i++){ if(d < NOW_STAGES[i].to){ st = NOW_STAGES[i]; break; } }
    $("nowEyebrow").textContent = st.e;
    $("nowTitle").textContent = st.h;
    $("nowText").textContent = st.p;
  }
  function renderBody(){
    var d = daysFloat(), html = "";
    MILES.forEach(function(x){
      var done = d >= x.m;
      var prev = 0;
      MILES.forEach(function(y){ if(y.m<x.m) prev = Math.max(prev, y.m); });
      var isNow = !done && d >= prev;
      var frac = done ? 1 : (isNow ? Math.max(0,(d-prev)/(x.m-prev)) : 0);
      html += '<li class="'+(done?"done":(isNow?"now":""))+'">'
        + '<span class="dot">✓</span><div class="card">'
        + '<div class="when">'+esc(x.t)+(done?" — пройдено":(isNow?" — идёт сейчас":""))+'</div>'
        + '<div class="what">'+esc(x.w)+'</div>'
        + (x.d ? '<div class="why">'+esc(x.d)+'</div>' : '')
        + (done?"":'<div class="bar"><i style="width:'+(frac*100).toFixed(1)+'%"></i></div><div class="pct">'+(frac*100).toFixed(0)+' %</div>')
        + '</div></li>';
    });
    $("timeline").innerHTML = html;
    renderNow();
  }

  /* ---------- РЕНДЕР: ЗАДАНИЯ ---------- */
  function renderTasks(){
    var dayNo = Math.max(1, Math.floor(daysFloat()) + 1);
    var task = TASKS[(dayNo-1) % TASKS.length];
    $("taskDayNo").textContent = "День "+dayNo+" без дыма";
    $("taskKind").textContent = task.k;
    $("taskTitle").textContent = task.t;
    $("taskWhy").textContent = task.w;
    if(task.read){ $("taskRead").hidden = false; $("taskRead").textContent = task.read; }
    else { $("taskRead").hidden = true; }

    var today = dayKey(new Date());
    var done = state.done||{};
    var isDone = !!done[today];
    $("doneBtn").disabled = isDone;
    $("doneBtn").textContent = isDone ? "Выполнено ✓" : "Выполнил";

    var streak = 0, cur = new Date();
    while(done[dayKey(cur)]){ streak++; cur.setDate(cur.getDate()-1); }
    $("streakLine").innerHTML = "Серия: <b>"+streak+" "+plural(streak,"день","дня","дней")+" подряд</b> · всего выполнено: <b>"+Object.keys(done).length+"</b>";

    var grid = "";
    for(var i=13;i>=0;i--){
      var dd = new Date(); dd.setDate(dd.getDate()-i);
      var on = !!done[dayKey(dd)];
      grid += '<i class="'+(on?"on":"")+(i===0?" today":"")+'" title="'+dayKey(dd)+'">'+(on?"✓":"·")+"</i>";
    }
    $("streakGrid").innerHTML = grid;
  }

  /* ---------- РЕНДЕР: ОПОРА ---------- */
  function renderFaith(){
    var html = "";
    FAITH.forEach(function(f){
      html += '<div class="ayah"><div class="ar">'+f.ar+'</div>'
        + (f.tr ? '<div class="tr">'+esc(f.tr)+'</div>' : '')
        + '<div class="ru">'+esc(f.ru)+'</div>'
        + (f.why ? '<div class="why">'+esc(f.why)+'</div>' : '')
        + '<div class="src">'+esc(f.src)+'</div></div>';
    });
    $("faithList").innerHTML = html;

    var dh = "";
    READ.forEach(function(x){
      dh += '<div class="dua read"><div class="step">'+x.step+'</div>'
        + '<div class="ar">'+x.ar+'</div>'
        + '<div class="tr">'+esc(x.tr)+'</div>'
        + '<div class="ru">'+esc(x.ru)+'</div>'
        + '<div class="zn"><b>Значение.</b> '+esc(x.zn)+'</div>'
        + '<div class="when">Как читать: '+esc(x.how)+'</div></div>';
    });
    dh += '<div class="dua read"><div class="step">☀︎</div>'
        + '<div class="ar">'+MORNING_DUA.ar+'</div>'
        + '<div class="tr">'+esc(MORNING_DUA.tr)+'</div>'
        + '<div class="ru">'+esc(MORNING_DUA.ru)+'</div>'
        + '<div class="zn"><b>Значение.</b> '+esc(MORNING_DUA.zn)+'</div>'
        + '<div class="when">Как читать: '+esc(MORNING_DUA.how)+'</div></div>';
    $("readList").innerHTML = dh;
  }

  /* ---------- НАСТРОЙКИ ---------- */
  function fillSetup(){
    if(state.quitAt){
      var dt = new Date(state.quitAt);
      var off = dt.getTimezoneOffset();
      $("quitAt").value = new Date(dt.getTime()-off*60000).toISOString().slice(0,16);
    }
    $("perDay").value = state.perDay||"";
    $("packPrice").value = state.packPrice||"";
    $("packSize").value = state.packSize||"";
  }
  $("saveBtn").addEventListener("click", function(){
    var v = $("quitAt").value;
    if(!v){ alert("Укажи дату и время последней сигареты."); return; }
    state.quitAt = new Date(v).toISOString();
    state.perDay = +($("perDay").value||20);
    state.packPrice = +($("packPrice").value||250);
    state.packSize = +($("packSize").value||20);
    save(); renderAll(); show("today");
  });
  $("resetBtn").addEventListener("click", function(){
    if(!confirm("Начать отсчёт заново с этой минуты? Прошлая серия останется в сердце, но счётчик обнулится.")) return;
    state.quitAt = new Date().toISOString();
    state.seenMiles = {};
    save(); renderAll(); show("today");
  });

  /* ---------- ВЕХИ-ПОЗДРАВЛЕНИЯ ---------- */
  function checkMilestone(){
    var d = daysFloat();
    var seen = state.seenMiles||{};
    for(var i=0;i<MILES.length;i++){
      var x = MILES[i];
      if(d >= x.m && !seen[x.t]){
        seen[x.t]=1; state.seenMiles=seen; save();
        $("mfTitle").textContent = "Веха «"+x.t+"» пройдена!";
        $("mfText").textContent = x.w;
        $("mf").classList.add("show");
        break;
      }
    }
  }
  $("mfClose").addEventListener("click", function(){ $("mf").classList.remove("show"); });

  /* ---------- НАВИГАЦИЯ ---------- */
  function show(name){
    var scrs = document.querySelectorAll(".screen");
    for(var i=0;i<scrs.length;i++) scrs[i].classList.remove("active");
    var scr = $("scr-"+name); if(scr) scr.classList.add("active");
    var tabs = document.querySelectorAll(".tab");
    for(var j=0;j<tabs.length;j++) tabs[j].classList.toggle("active", tabs[j].dataset.scr===name);
    window.scrollTo({top:0});
  }
  Array.prototype.forEach.call(document.querySelectorAll(".tab"), function(t){
    t.addEventListener("click", function(){ show(t.dataset.scr); });
  });
  $("gearBtn").addEventListener("click", function(){ fillSetup(); show("setup"); });
  $("doneBtn").addEventListener("click", function(){
    var today = dayKey(new Date());
    state.done = state.done||{}; state.done[today]=1; save(); renderTasks(); renderToday();
  });

  /* ---------- ПОДСКАЗКА «НА ЭКРАН ДОМОЙ» ---------- */
  (function(){
    var standalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
    if(standalone){ document.documentElement.classList.add("standalone"); return; }
    if(state.a2hsHidden) return;
    var ua = navigator.userAgent || "";
    var isIOS = /iPad|iPhone|iPod/.test(ua);
    var inApp = /Telegram|Instagram|VKClient|VKApp|FBAN|FBAV|WhatsApp|YaBrowser.*broApp|MailRuApp/i.test(ua);
    if(isIOS && inApp){
      $("a2hsHow").innerHTML = "Ты в браузере внутри другого приложения — тут кнопки установки нет. "
        + "Нажми <b>⋯</b> (или значок компаса/стрелки) → <b>«Открыть в Safari»</b>, "
        + "а там: «Поделиться» ⬆︎ → «На экран Домой».";
    } else if(!isIOS){
      $("a2hsHow").textContent = "Меню браузера ⋮ → «Установить приложение» или «Добавить на главный экран».";
    }
    $("a2hs").hidden = false;
    $("a2hsHide").addEventListener("click", function(){
      state.a2hsHidden = 1; save(); $("a2hs").hidden = true;
    });
  })();

  /* ---------- КНОПКИ «СКОПИРОВАТЬ» (напоминания) ---------- */
  Array.prototype.forEach.call(document.querySelectorAll("button.copy"), function(b){
    b.addEventListener("click", function(){
      var t = b.getAttribute("data-copy") || "";
      function ok(){ var was = b.textContent; b.textContent = "Скопировано ✓"; b.disabled = true;
        setTimeout(function(){ b.textContent = was; b.disabled = false; }, 1800); }
      if(navigator.clipboard && navigator.clipboard.writeText){
        navigator.clipboard.writeText(t).then(ok, function(){ fallback(); });
      } else { fallback(); }
      function fallback(){
        var ta = document.createElement("textarea"); ta.value = t;
        ta.style.position = "fixed"; ta.style.opacity = "0";
        document.body.appendChild(ta); ta.focus(); ta.select();
        try{ document.execCommand("copy"); ok(); }catch(e){ alert(t); }
        document.body.removeChild(ta);
      }
    });
  });

  /* ---------- ЦИКЛ ---------- */
  function renderAll(){ renderToday(); renderBody(); renderTasks(); renderFaith(); }
  renderAll();
  if(!state.quitAt){ fillSetup(); show("setup"); }
  setInterval(function(){ renderToday(); }, 1000);
  setInterval(function(){ renderBody(); checkMilestone(); }, 30000);
  checkMilestone();

  /* ---------- ОФЛАЙН ---------- */
  if("serviceWorker" in navigator){
    window.addEventListener("load", function(){
      navigator.serviceWorker.register("sw.js").catch(function(){});
    });
  }
})();