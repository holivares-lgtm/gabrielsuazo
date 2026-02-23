
(function(){
  const CLP = new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 });
  const byId = (id) => document.getElementById(id);
  const todayISO = () => new Date().toISOString().slice(0,10);
  const safeText = (s) => (s ?? "").toString();

  const demo = {
    mesActual: "Enero",
    cuotaMensual: 50000,
    alumnos: [
      { id: "ALU-001", nombre: "Diego Soto", categoria: "Sub 12", email: "diego.soto@example.com", whatsapp: "56911111111" },
      { id: "ALU-002", nombre: "Lucas Rojas", categoria: "Sub 15", email: "lucas.rojas@example.com", whatsapp: "56922222222" },
      { id: "ALU-003", nombre: "Matías Herrera", categoria: "Sub 18", email: "matias.herrera@example.com", whatsapp: "56933333333" },
      { id: "ALU-004", nombre: "Benjamín Núñez", categoria: "Sub 12", email: "benjamin.nunez@example.com", whatsapp: "56944444444" },
      { id: "ALU-005", nombre: "Tomás Vera", categoria: "Sub 15", email: "tomas.vera@example.com", whatsapp: "56955555555" }
    ],
    profesores: [
      { id:"PRO-001", nombre:"Juan Pérez", categoria:"Sub 12", email:"juan.perez@example.com", remuneracion: 400000 },
      { id:"PRO-002", nombre:"Marcos Díaz", categoria:"Sub 15", email:"marcos.diaz@example.com", remuneracion: 450000 },
      { id:"PRO-003", nombre:"Pedro González", categoria:"Sub 18", email:"pedro.gonzalez@example.com", remuneracion: 500000 }
    ],
    pagos: [
      { alumnoId:"ALU-001", mes:"Enero", monto: 50000, estado:"Pagado" },
      { alumnoId:"ALU-002", mes:"Enero", monto: 50000, estado:"Pendiente" },
      { alumnoId:"ALU-003", mes:"Enero", monto: 50000, estado:"Pagado" },
      { alumnoId:"ALU-004", mes:"Enero", monto: 50000, estado:"Pendiente" },
      { alumnoId:"ALU-005", mes:"Enero", monto: 50000, estado:"Pagado" }
    ],
    asistencia: [
      { alumnoId:"ALU-001", fecha:"2026-02-10", estado:"Presente", fuente:"Manual" },
      { alumnoId:"ALU-002", fecha:"2026-02-10", estado:"Ausente", fuente:"Manual" },
      { alumnoId:"ALU-003", fecha:"2026-02-10", estado:"Presente", fuente:"Manual" }
    ],
    avisos: []
  };

  const KEY = "efgs_mvp_v2";
  function loadState(){
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return structuredClone(demo);
      const parsed = JSON.parse(raw);
      return { ...structuredClone(demo), ...parsed };
    } catch (e){
      console.warn("No se pudo cargar estado, usando demo.", e);
      return structuredClone(demo);
    }
  }
  function saveState(state){ localStorage.setItem(KEY, JSON.stringify(state)); }
  function resetState(){ localStorage.removeItem(KEY); location.reload(); }

  const state = loadState();

  function alumnoById(id){ return state.alumnos.find(a => a.id === id); }
  function pagoByAlumnoMes(alumnoId, mes){ return state.pagos.find(p => p.alumnoId === alumnoId && p.mes === mes); }
  function setPagoEstado(alumnoId, mes, nuevoEstado){
    const p = pagoByAlumnoMes(alumnoId, mes);
    if (p){ p.estado = nuevoEstado; }
    else { state.pagos.push({ alumnoId, mes, monto: state.cuotaMensual, estado: nuevoEstado }); }
    saveState(state);
  }
  function totalCostosProfes(){ return state.profesores.reduce((acc,p) => acc + (Number(p.remuneracion)||0), 0); }
  function totalesPagos(mes){
    const pagosMes = state.pagos.filter(p => p.mes === mes);
    const esperado = state.alumnos.length * state.cuotaMensual;
    const recaudado = pagosMes.filter(p => p.estado === "Pagado").reduce((acc,p)=> acc + (Number(p.monto)||0), 0);
    const pendiente = esperado - recaudado;
    return { esperado, recaudado, pendiente };
  }

  function initTabs(){
    const btns = document.querySelectorAll(".tab-btn");
    if (!btns.length) return;
    btns.forEach(btn => btn.addEventListener("click", () => {
      btns.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      const tab = btn.getAttribute("data-tab");
      document.querySelectorAll(".tab-panel").forEach(p => p.style.display = "none");
      const panel = byId(`tab-${tab}`);
      if (panel) panel.style.display = "block";
    }));
  }

  function renderDashboard(){
    const tbody = byId("tablaCuotas");
    if (!tbody) return;

    const mes = state.mesActual;
    const { esperado, recaudado, pendiente } = totalesPagos(mes);

    const alDia = state.pagos.filter(p => p.mes === mes && p.estado === "Pagado").length;
    const morosos = state.alumnos.length - alDia;

    byId("statAlDia").textContent = alDia;
    byId("statMorosos").textContent = morosos;
    byId("statPendiente").textContent = CLP.format(pendiente);
    byId("statRecaudado").textContent = CLP.format(recaudado);

    if (byId("balIngresos")){
      const costos = totalCostosProfes();
      byId("balIngresos").textContent = CLP.format(esperado);
      byId("balRecaudado").textContent = CLP.format(recaudado);
      byId("balPendiente").textContent = CLP.format(pendiente);
      byId("balCostosProf").textContent = CLP.format(costos);
      byId("balMargen").textContent = CLP.format(esperado - costos);
      byId("balMargenReal").textContent = CLP.format(recaudado - costos);

      const tbProf = byId("tablaCostosProfes");
      if (tbProf){
        tbProf.innerHTML = state.profesores.map(p => `
          <tr><td>${safeText(p.nombre)}</td><td>${safeText(p.categoria)}</td><td>${CLP.format(Number(p.remuneracion)||0)}</td></tr>
        `).join("");
      }
    }

    const search = byId("searchMorosos");
    const filtroEstado = byId("filtroEstado");
    const filtroCategoria = byId("filtroCategoria");

    function rowForAlumno(a){
      const pago = pagoByAlumnoMes(a.id, mes) || { monto: state.cuotaMensual, estado: "Pendiente" };
      const badge = pago.estado === "Pagado"
        ? `<span class="badge ok">Al día</span>`
        : `<span class="badge bad">Moroso</span>`;
      const checked = pago.estado !== "Pagado" ? "checked" : "";
      return `
        <tr data-alumno="${a.id}">
          <td>${safeText(a.nombre)}<div class="hint">${a.id}</div></td>
          <td>${safeText(a.categoria)}</td>
          <td>${safeText(mes)}</td>
          <td>${CLP.format(Number(pago.monto)||0)}</td>
          <td>${badge}</td>
          <td>
            <label class="hint" style="display:flex;align-items:center;gap:8px;">
              <input type="checkbox" class="chkSelectMoroso" ${checked}>
              Seleccionar (moroso)
            </label>
            <div style="margin-top:8px; display:flex; gap:8px; flex-wrap:wrap;">
              <button class="btn secondary btnTogglePago" data-estado="${pago.estado}">
                ${pago.estado === "Pagado" ? "Marcar pendiente" : "Marcar pagado"}
              </button>
            </div>
          </td>
        </tr>
      `;
    }

    function applyFilters(){
      const q = safeText(search?.value).toLowerCase().trim();
      const fe = filtroEstado?.value || "todos";
      const fc = filtroCategoria?.value || "todas";

      const rows = state.alumnos.filter(a => {
        const pago = pagoByAlumnoMes(a.id, mes) || { estado: "Pendiente" };
        const esMoroso = pago.estado !== "Pagado";
        const estadoOk =
          fe === "todos" ||
          (fe === "aldia" && !esMoroso) ||
          (fe === "moroso" && esMoroso);
        const catOk = (fc === "todas" || a.categoria === fc);
        const text = `${a.id} ${a.nombre} ${a.categoria} ${a.email} ${a.whatsapp}`.toLowerCase();
        const qOk = !q || text.includes(q);
        return estadoOk && catOk && qOk;
      });

      tbody.innerHTML = rows.map(rowForAlumno).join("");

      tbody.querySelectorAll(".btnTogglePago").forEach(btn => {
        btn.addEventListener("click", (e) => {
          const tr = e.target.closest("tr");
          const alumnoId = tr.getAttribute("data-alumno");
          const pago = pagoByAlumnoMes(alumnoId, mes) || { estado:"Pendiente" };
          const next = (pago.estado === "Pagado") ? "Pendiente" : "Pagado";
          setPagoEstado(alumnoId, mes, next);
          renderDashboard();
        });
      });

      tbody.querySelectorAll("tr").forEach(tr => {
        const alumnoId = tr.getAttribute("data-alumno");
        const pago = pagoByAlumnoMes(alumnoId, mes) || { estado:"Pendiente" };
        const chk = tr.querySelector(".chkSelectMoroso");
        if (!chk) return;
        chk.checked = (pago.estado !== "Pagado");
      });
    }

    search?.addEventListener("input", applyFilters);
    filtroEstado?.addEventListener("change", applyFilters);
    filtroCategoria?.addEventListener("change", applyFilters);

    const template = byId("templateAviso");
    if (template && !template.value){
      template.value = `Hola {{NOMBRE}} 👋\n\nTe escribimos desde la Escuela de Fútbol Gabriel Suazo.\n\nSegún nuestro registro, tu cuota de {{MES}} está PENDIENTE por {{MONTO}}.\n\n¿Nos ayudas poniéndote al día? Si ya pagaste, ignora este mensaje.\n\nGracias ⚽\nAdministración`;
    }

    function selectedMorososIds(){
      const ids = [];
      tbody.querySelectorAll("tr").forEach(tr => {
        const alumnoId = tr.getAttribute("data-alumno");
        const pago = pagoByAlumnoMes(alumnoId, mes) || { estado:"Pendiente" };
        const chk = tr.querySelector(".chkSelectMoroso");
        if (chk && chk.checked && pago.estado !== "Pagado") ids.push(alumnoId);
      });
      return ids;
    }

    function renderHistAvisos(){
      const t = byId("tablaHistAvisos");
      if (!t) return;
      t.innerHTML = state.avisos.slice().reverse().map(a => `
        <tr><td>${safeText(a.fecha)}</td><td>${safeText(a.canal)}</td><td>${safeText(a.destinatario)}</td><td><span class="badge bad">Moroso</span></td></tr>
      `).join("");
    }

    function buildMessage(alumno){
      const pago = pagoByAlumnoMes(alumno.id, mes) || { monto: state.cuotaMensual, estado:"Pendiente" };
      const tpl = safeText(template?.value);
      return tpl
        .replaceAll("{{NOMBRE}}", alumno.nombre)
        .replaceAll("{{MES}}", mes)
        .replaceAll("{{MONTO}}", CLP.format(Number(pago.monto)||0));
    }

    byId("btnAvisoMail")?.addEventListener("click", () => {
      const ids = selectedMorososIds();
      if (!ids.length) return alert("Selecciona al menos 1 moroso en la tabla.");
      const first = alumnoById(ids[0]);
      const subject = encodeURIComponent(`Cuota pendiente - ${mes} | Escuela de Fútbol Gabriel Suazo`);
      const body = encodeURIComponent(buildMessage(first));
      window.location.href = `mailto:${encodeURIComponent(first.email)}?subject=${subject}&body=${body}`;
      state.avisos.push({ fecha: new Date().toLocaleString("es-CL"), canal:"Correo", destinatario:first.email, alumnoId:first.id });
      saveState(state);
      renderHistAvisos();
    });

    byId("btnAvisoWhats")?.addEventListener("click", () => {
      const ids = selectedMorososIds();
      if (!ids.length) return alert("Selecciona al menos 1 moroso en la tabla.");
      const first = alumnoById(ids[0]);
      const text = encodeURIComponent(buildMessage(first));
      window.open(`https://wa.me/${first.whatsapp}?text=${text}`, "_blank");
      state.avisos.push({ fecha: new Date().toLocaleString("es-CL"), canal:"WhatsApp", destinatario:first.whatsapp, alumnoId:first.id });
      saveState(state);
      renderHistAvisos();
    });

    applyFilters();
    renderHistAvisos();
  }

  function renderProfesores(){
    const tbody = byId("tablaProfesores");
    if (!tbody) return;

    tbody.innerHTML = state.profesores.map(p => `
      <tr data-prof="${p.id}" style="cursor:pointer;">
        <td>${safeText(p.nombre)}<div class="hint">${p.id}</div></td>
        <td>${safeText(p.categoria)}</td>
        <td>${safeText(p.email)}</td>
        <td>${CLP.format(Number(p.remuneracion)||0)}</td>
        <td><span class="badge ok">Ver/Editar</span></td>
      </tr>
    `).join("");

    const fichaEmpty = byId("profFichaEmpty");
    const ficha = byId("profFicha");
    const inpNombre = byId("profNombre");
    const inpCat = byId("profCategoria");
    const inpMail = byId("profEmail");
    const inpRemu = byId("profRemu");

    let currentId = null;

    tbody.querySelectorAll("tr").forEach(tr => tr.addEventListener("click", () => {
      const id = tr.getAttribute("data-prof");
      const p = state.profesores.find(x => x.id === id);
      if (!p) return;
      currentId = id;
      fichaEmpty.style.display = "none";
      ficha.style.display = "block";
      inpNombre.value = p.nombre;
      inpCat.value = p.categoria;
      inpMail.value = p.email;
      inpRemu.value = Number(p.remuneracion)||0;
    }));

    byId("btnGuardarProf")?.addEventListener("click", () => {
      if (!currentId) return;
      const p = state.profesores.find(x => x.id === currentId);
      if (!p) return;
      p.remuneracion = Number(inpRemu.value)||0;
      saveState(state);
      alert("Guardado (demo). Revisa el balance en Dashboard.");
      renderProfesores();
    });

    byId("btnResetProf")?.addEventListener("click", () => {
      if (confirm("¿Restaurar datos demo? Se perderán cambios locales.")) resetState();
    });
  }

  function renderAlumnos(){
    const tbody = byId("tablaAlumnos");
    if (!tbody) return;
    const mes = state.mesActual;

    tbody.innerHTML = state.alumnos.map(a => {
      const pago = pagoByAlumnoMes(a.id, mes) || { estado:"Pendiente" };
      const badge = pago.estado === "Pagado" ? `<span class="badge ok">Al día</span>` : `<span class="badge bad">Moroso</span>`;
      return `
        <tr>
          <td>${safeText(a.nombre)}<div class="hint">${a.id}</div></td>
          <td>${safeText(a.categoria)}</td>
          <td>${safeText(a.email)}</td>
          <td>${safeText(a.whatsapp)}</td>
          <td>${badge}</td>
        </tr>
      `;
    }).join("");
  }

  function renderPagos(){
    const tbody = byId("tablaPagos");
    if (!tbody) return;

    const mesSel = byId("mesPago");
    if (mesSel) mesSel.value = state.mesActual;
    const search = byId("searchPagos");

    function render(){
      const mes = mesSel ? mesSel.value : state.mesActual;
      const q = safeText(search?.value).toLowerCase().trim();

      const rows = state.alumnos.map(a => {
        const pago = pagoByAlumnoMes(a.id, mes) || { monto: state.cuotaMensual, estado:"Pendiente" };
        return { a, pago, mes };
      }).filter(({a,pago,mes}) => {
        const text = `${a.nombre} ${a.id} ${a.categoria} ${mes} ${pago.estado}`.toLowerCase();
        return !q || text.includes(q);
      });

      tbody.innerHTML = rows.map(({a,pago,mes}) => {
        const badge = pago.estado === "Pagado" ? `<span class="badge ok">Pagado</span>` : `<span class="badge bad">Pendiente</span>`;
        return `
          <tr data-alumno="${a.id}">
            <td>${safeText(a.nombre)}<div class="hint">${a.id}</div></td>
            <td>${safeText(a.categoria)}</td>
            <td>${safeText(a.email)}</td>
            <td>${safeText(a.whatsapp)}</td>
            <td>${safeText(mes)}</td>
            <td>${CLP.format(Number(pago.monto)||0)}</td>
            <td>${badge}</td>
            <td><button class="btn secondary btnTogglePago2">${pago.estado === "Pagado" ? "Marcar pendiente" : "Marcar pagado"}</button></td>
          </tr>
        `;
      }).join("");

      tbody.querySelectorAll(".btnTogglePago2").forEach(btn => {
        btn.addEventListener("click", (e) => {
          const tr = e.target.closest("tr");
          const alumnoId = tr.getAttribute("data-alumno");
          const pago = pagoByAlumnoMes(alumnoId, mes) || { estado:"Pendiente" };
          const next = (pago.estado === "Pagado") ? "Pendiente" : "Pagado";
          setPagoEstado(alumnoId, mes, next);
          render();
        });
      });
    }

    mesSel?.addEventListener("change", render);
    search?.addEventListener("input", render);
    render();
  }

  function renderAsistencia(){
    const tbody = byId("tablaAsistencia");
    if (!tbody) return;

    const sel = byId("asistAlumno");
    if (sel) sel.innerHTML = state.alumnos.map(a => `<option value="${a.id}">${a.nombre} (${a.id})</option>`).join("");
    const fecha = byId("asistFecha");
    if (fecha && !fecha.value) fecha.value = todayISO();

    function draw(){
      tbody.innerHTML = state.asistencia.slice().reverse().map(r => {
        const a = alumnoById(r.alumnoId) || { nombre: r.alumnoId };
        return `<tr><td>${safeText(a.nombre)}<div class="hint">${safeText(r.alumnoId)}</div></td><td>${safeText(r.fecha)}</td><td>${safeText(r.estado)}</td><td>${safeText(r.fuente)}</td></tr>`;
      }).join("");
    }

    byId("btnRegistrarAsist")?.addEventListener("click", () => {
      const alumnoId = sel.value;
      const f = fecha.value || todayISO();
      const est = byId("asistEstado").value;
      state.asistencia.push({ alumnoId, fecha: f, estado: est, fuente:"Manual" });
      saveState(state);
      draw();
    });

    draw();
  }

  function renderAsistenciaQR(){
    const tbody = byId("tablaAsistenciaQR");
    if (!tbody) return;

    const last = byId("qrLast");
    function draw(){
      const onlyQR = state.asistencia.filter(a => a.fuente === "QR").slice().reverse();
      tbody.innerHTML = onlyQR.map(r => {
        const a = alumnoById(r.alumnoId) || { nombre: r.alumnoId };
        return `<tr><td>${safeText(a.nombre)}<div class="hint">${safeText(r.alumnoId)}</div></td><td>${safeText(r.fecha)}</td><td>${safeText(r.estado)}</td><td>${safeText(r.fuente)}</td></tr>`;
      }).join("");
      if (onlyQR[0]){
        const a = alumnoById(onlyQR[0].alumnoId) || { nombre: onlyQR[0].alumnoId };
        last.innerHTML = `<strong>${safeText(a.nombre)}</strong> (${safeText(onlyQR[0].alumnoId)})<br>Fecha: ${safeText(onlyQR[0].fecha)}<br>Estado: ${safeText(onlyQR[0].estado)}<br>Fuente: QR`;
      }
    }
    draw();

    const startBtn = byId("btnStartQR");
    const stopBtn = byId("btnStopQR");
    if (!startBtn || !stopBtn) return;

    let scanner = null;
    let running = false;

    async function start(){
      if (running) return;
      if (!window.Html5Qrcode) {
        alert("No se pudo cargar la librería de QR. Revisa tu conexión a internet.");
        return;
      }
      scanner = new Html5Qrcode("qr-reader");
      running = true;
      try {
        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: 250 },
          (decodedText) => {
            const alumnoId = decodedText.trim();
            const a = alumnoById(alumnoId);
            if (!a){
              alert(`QR leído: ${alumnoId}\nNo existe ese ID en el listado demo.`);
              return;
            }
            state.asistencia.push({ alumnoId, fecha: todayISO(), estado:"Presente", fuente:"QR" });
            saveState(state);
            draw();
          }
        );
      } catch (e){
        running = false;
        console.error(e);
        alert("No se pudo iniciar la cámara. Permite el acceso a cámara en el navegador.");
      }
    }

    async function stop(){
      if (!scanner || !running) return;
      try { await scanner.stop(); } catch(e) {}
      try { await scanner.clear(); } catch(e) {}
      running = false;
    }

    startBtn.addEventListener("click", start);
    stopBtn.addEventListener("click", stop);
  }

  initTabs();
  renderDashboard();
  renderProfesores();
  renderAlumnos();
  renderPagos();
  renderAsistencia();
  renderAsistenciaQR();

  console.log("MVP v2 cargado.");
})();
