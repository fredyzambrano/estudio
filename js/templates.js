/* ============================================================
   DESPEGA — Banco de plantillas de guiones (ES / EN / PT)
   3 formatos del playbook UGC:
     hookdemo  → cara + dolor primero, demo después
     longtext  → video 6s + texto que provoca comentarios
     talking   → storytelling con el producto tejido en la trama
   Variables: {pain} {want} {product} {desc} {occupation}
   (las variantes *_l van en minúscula inicial para ir a mitad de frase)
   ============================================================ */

const TPL = (() => {
  const BANK = {
    /* ---------------- ESPAÑOL ---------------- */
    es: {
      hooks_hookdemo: [
        "¿Cómo es que NADIE me dijo que así es como la gente está logrando {want_l}?",
        "Llevaba meses con {pain_l}… hasta que encontré esto.",
        "POV: descubres cómo acabar con {pain_l} en 30 segundos.",
        "Deja de sufrir por {pain_l}. Mira esto.",
        "Esto es lo que hacen los que ya lograron {want_l} (y nadie lo cuenta).",
        "Si tu problema es {pain_l}, este video te va a cambiar la semana.",
        "Probé de todo para {want_l} y esto fue lo ÚNICO que funcionó.",
        "Me daba pena admitir que {pain_l}… hasta que descubrí este truco.",
      ],
      beats_hookdemo: [
        { t: "0–2 s", k: "Tu cara a cámara, sin logos ni producto. Di el hook mirando al lente como si le hablaras a un amigo." },
        { t: "2–8 s", k: "Amplía el dolor con tus palabras: «{pain}». Una o dos frases, tono natural, cero guion leído." },
        { t: "8–20 s", k: "Corta a la pantalla: demo EN VIVO de {product} resolviendo justo eso. Muestra lo fácil que es, sin narrar funciones." },
        { t: "20–28 s", k: "Muestra el resultado: {want_l}. Reacción genuina, no de vendedor." },
        { t: "28–32 s", k: "Cierre suave: «los dejo, tengo que seguir usándola» o una pregunta a la audiencia. El nombre va en el comentario fijado." },
      ],
      overlays_longtext: [
        "acabo de descubrir cómo dejar atrás {pain_l} y siento que viví engañado todo este tiempo",
        "si supieras cómo logré {want_l} sin pagar nada, no me creerías",
        "¿alguien más sufre con {pain_l}? porque acabo de resolverlo y nadie me lo había dicho",
        "día 3 usando el truco para {want_l} y ya no pienso volver atrás",
        "me preguntaron cómo hice para {want_l} y no supe si contar el secreto 💀",
        "pov: por fin encontraste la forma de {want_l} y no sabes si contarlo o quedártelo",
        "el 99% sigue sufriendo con {pain_l} porque nadie les mostró esto",
      ],
      beats_longtext: [
        { t: "Video", k: "~6 segundos tuyos haciendo algo cotidiano (estudiando, caminando, tomando café). Nada actuado, luz natural." },
        { t: "Texto", k: "El texto de arriba va sobre el video, centrado, fuente nativa de TikTok/IG." },
        { t: "Audio", k: "Un audio en tendencia a volumen bajo, o silencio. Tu voz no hace falta." },
        { t: "Clave", k: "NO nombres a {product}. Este formato convierte en los comentarios, no en el video." },
      ],
      hooks_talking: [
        "El otro día vi un video que me hizo darme cuenta de por qué me pasaba esto: {pain_l}…",
        "Tengo que contarles lo que me pasó esta semana con {pain_l}.",
        "Nadie me cree cuando cuento cómo pasé de {pain_l} a {want_l}.",
        "Mi amiga se burlaba de mí por {pain_l}… hasta que me vio esta semana.",
        "Estaba a punto de rendirme con {want_l} y pasó algo que me cambió el plan.",
      ],
      beats_talking: [
        { t: "0–3 s", k: "Arranca EN MITAD de la historia con el gancho. Nada de «hola chicos»." },
        { t: "3–15 s", k: "El conflicto: desarrolla «{pain}» con detalles reales — lugares, personas, momentos. La historia es la protagonista." },
        { t: "15–25 s", k: "El giro: {product} aparece tejido en la trama («y yo ahí, con la app abierta…»), como parte natural de lo que pasó. Nunca como solución mágica." },
        { t: "25–35 s", k: "El resultado: {want_l}. Cierra la HISTORIA, no la venta. Si quedó bien contada, los comentarios preguntan solos." },
      ],
      replies: [
        "Es {product} 🙌 {desc_l}",
        "Se llama {product}, búscala en la tienda de apps 📲",
        "¡{product}! Te juro que {desc_l} 🔥",
      ],
      search_want: ["cómo {want_l}", "tips para {want_l}"],
      search_occupation: ["consejos para {occupation_l}", "un día siendo {occupation_l}"],
    },

    /* ---------------- ENGLISH ---------------- */
    en: {
      hooks_hookdemo: [
        "How come NOBODY told me this is how people are actually {want_l}?",
        "I spent months dealing with {pain_l}… until I found this.",
        "POV: you find out how to end {pain_l} in 30 seconds.",
        "Stop struggling with {pain_l}. Watch this.",
        "This is what people who already managed {want_l} actually do (and nobody talks about it).",
        "If your problem is {pain_l}, this video will change your week.",
        "I tried everything to {want_l} and this was the ONLY thing that worked.",
        "I was embarrassed to admit that {pain_l}… until I found this trick.",
      ],
      beats_hookdemo: [
        { t: "0–2 s", k: "Your face on camera, no logos, no product. Say the hook looking at the lens like you're talking to a friend." },
        { t: "2–8 s", k: "Expand the pain in your own words: “{pain}”. One or two sentences, natural tone, never read from a script." },
        { t: "8–20 s", k: "Cut to the screen: LIVE demo of {product} solving exactly that. Show how easy it is — don't narrate features." },
        { t: "20–28 s", k: "Show the result: {want_l}. Genuine reaction, not a salesy one." },
        { t: "28–32 s", k: "Soft close: “gotta go, I'm still using it” or a question to the audience. The name goes in the pinned comment." },
      ],
      overlays_longtext: [
        "just figured out how to get past {pain_l} and I feel like I've been lied to this whole time",
        "if you knew how I managed {want_l} without paying anything, you wouldn't believe me",
        "is anyone else struggling with {pain_l}? because I just solved it and nobody ever told me",
        "day 3 using the trick for {want_l} and I'm never going back",
        "someone asked how I managed {want_l} and I didn't know if I should share the secret 💀",
        "pov: you finally found the way to {want_l} and you don't know whether to share it",
        "99% of people still struggle with {pain_l} because nobody showed them this",
      ],
      beats_longtext: [
        { t: "Video", k: "~6 seconds of you doing something ordinary (studying, walking, having coffee). Nothing staged, natural light." },
        { t: "Text", k: "The copy above goes over the video, centered, native TikTok/IG font." },
        { t: "Audio", k: "A trending sound at low volume, or silence. Your voice isn't needed." },
        { t: "Key", k: "Do NOT name {product}. This format converts in the comments, not in the video." },
      ],
      hooks_talking: [
        "The other day I saw a video that made me realize why this kept happening to me: {pain_l}…",
        "I have to tell you what happened to me this week with {pain_l}.",
        "Nobody believes me when I tell them how I went from {pain_l} to {want_l}.",
        "My friend used to make fun of me for {pain_l}… until she saw me this week.",
        "I was about to give up on {want_l} and then something changed my whole plan.",
      ],
      beats_talking: [
        { t: "0–3 s", k: "Start IN THE MIDDLE of the story with the hook. No “hey guys”." },
        { t: "3–15 s", k: "The conflict: develop “{pain}” with real details — places, people, moments. The story is the main character." },
        { t: "15–25 s", k: "The turn: {product} shows up woven into the plot (“and there I was, app open…”), as a natural part of what happened. Never as a magic fix." },
        { t: "25–35 s", k: "The result: {want_l}. Close the STORY, not the sale. If it's well told, the comments ask on their own." },
      ],
      replies: [
        "It's {product} 🙌 {desc_l}",
        "It's called {product}, find it in the app store 📲",
        "{product}! I swear {desc_l} 🔥",
      ],
      search_want: ["how to {want_l}", "tips to {want_l}"],
      search_occupation: ["advice for {occupation_l}", "day in the life of {occupation_l}"],
    },

    /* ---------------- PORTUGUÊS ---------------- */
    pt: {
      hooks_hookdemo: [
        "Como é que NINGUÉM me contou que é assim que as pessoas estão conseguindo {want_l}?",
        "Passei meses lidando com {pain_l}… até encontrar isso.",
        "POV: você descobre como acabar com {pain_l} em 30 segundos.",
        "Pare de sofrer com {pain_l}. Olha isso.",
        "É isso que fazem os que já conseguiram {want_l} (e ninguém conta).",
        "Se o seu problema é {pain_l}, esse vídeo vai mudar a sua semana.",
        "Tentei de tudo para {want_l} e isso foi a ÚNICA coisa que funcionou.",
        "Eu tinha vergonha de admitir que {pain_l}… até descobrir esse truque.",
      ],
      beats_hookdemo: [
        { t: "0–2 s", k: "Seu rosto na câmera, sem logos nem produto. Fale o hook olhando para a lente como se falasse com um amigo." },
        { t: "2–8 s", k: "Amplie a dor com suas palavras: «{pain}». Uma ou duas frases, tom natural, nada de texto decorado." },
        { t: "8–20 s", k: "Corte para a tela: demo AO VIVO do {product} resolvendo exatamente isso. Mostre como é fácil, sem narrar funções." },
        { t: "20–28 s", k: "Mostre o resultado: {want_l}. Reação genuína, não de vendedor." },
        { t: "28–32 s", k: "Fechamento leve: «vou indo, tenho que continuar usando» ou uma pergunta para a audiência. O nome vai no comentário fixado." },
      ],
      overlays_longtext: [
        "acabei de descobrir como superar {pain_l} e sinto que vivi enganado esse tempo todo",
        "se você soubesse como consegui {want_l} sem pagar nada, não acreditaria",
        "mais alguém sofre com {pain_l}? porque acabei de resolver e ninguém tinha me contado",
        "dia 3 usando o truque para {want_l} e não penso em voltar atrás",
        "me perguntaram como consegui {want_l} e não soube se contava o segredo 💀",
        "pov: você finalmente achou o jeito de {want_l} e não sabe se conta ou guarda",
        "99% continua sofrendo com {pain_l} porque ninguém mostrou isso",
      ],
      beats_longtext: [
        { t: "Vídeo", k: "~6 segundos seus fazendo algo cotidiano (estudando, caminhando, tomando café). Nada encenado, luz natural." },
        { t: "Texto", k: "O texto acima vai sobre o vídeo, centralizado, fonte nativa do TikTok/IG." },
        { t: "Áudio", k: "Um som em alta no volume baixo, ou silêncio. Sua voz não é necessária." },
        { t: "Chave", k: "NÃO cite o {product}. Esse formato converte nos comentários, não no vídeo." },
      ],
      hooks_talking: [
        "Outro dia vi um vídeo que me fez perceber por que isso vivia acontecendo comigo: {pain_l}…",
        "Preciso contar o que aconteceu comigo essa semana com {pain_l}.",
        "Ninguém acredita quando conto como saí de {pain_l} para {want_l}.",
        "Minha amiga zoava de mim por {pain_l}… até me ver essa semana.",
        "Eu estava quase desistindo de {want_l} e aconteceu algo que mudou meu plano.",
      ],
      beats_talking: [
        { t: "0–3 s", k: "Comece NO MEIO da história com o gancho. Nada de «oi gente»." },
        { t: "3–15 s", k: "O conflito: desenvolva «{pain}» com detalhes reais — lugares, pessoas, momentos. A história é a protagonista." },
        { t: "15–25 s", k: "A virada: o {product} aparece tecido na trama («e eu lá, com o app aberto…»), como parte natural do que aconteceu. Nunca como solução mágica." },
        { t: "25–35 s", k: "O resultado: {want_l}. Feche a HISTÓRIA, não a venda. Se ficou bem contada, os comentários perguntam sozinhos." },
      ],
      replies: [
        "É o {product} 🙌 {desc_l}",
        "Chama {product}, procura na loja de apps 📲",
        "{product}! Juro que {desc_l} 🔥",
      ],
      search_want: ["como {want_l}", "dicas para {want_l}"],
      search_occupation: ["conselhos para {occupation_l}", "um dia sendo {occupation_l}"],
    },
  };

  function bank(lang) { return BANK[lang] || BANK.es; }

  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  function lowerFirst(s) {
    if (!s) return "";
    return s.charAt(0).toLowerCase() + s.slice(1);
  }

  function fill(str, vars) {
    let out = str;
    for (const k in vars) out = out.split("{" + k + "}").join(vars[k]);
    return out;
  }

  /* Construye el set de variables desde persona + producto */
  function varsFrom(persona, product) {
    const pain = pick(persona.pains);
    const want = persona.wants.length ? pick(persona.wants) : pain;
    return {
      pain, pain_l: lowerFirst(pain),
      want, want_l: lowerFirst(want),
      product: (product && product.name) || "tu app",
      desc: (product && product.desc) || "",
      desc_l: lowerFirst((product && product.desc) || ""),
      occupation: persona.occupation || "",
      occupation_l: lowerFirst(persona.occupation || ""),
    };
  }

  /* Genera un guion completo para un formato dado */
  function generate(lang, format, persona, product) {
    const b = bank(lang);
    const v = varsFrom(persona, product);
    const out = { format, vars: v, hook: "", overlay: "", beats: [], reply: fill(pick(b.replies), v) };

    if (format === "hookdemo") {
      out.hook = fill(pick(b.hooks_hookdemo), v);
      out.beats = b.beats_hookdemo.map((x) => ({ t: x.t, k: fill(x.k, v) }));
    } else if (format === "longtext") {
      out.overlay = fill(pick(b.overlays_longtext), v);
      out.hook = out.overlay;
      out.beats = b.beats_longtext.map((x) => ({ t: x.t, k: fill(x.k, v) }));
    } else {
      out.hook = fill(pick(b.hooks_talking), v);
      out.beats = b.beats_talking.map((x) => ({ t: x.t, k: fill(x.k, v) }));
    }
    return out;
  }

  /* Genera términos de búsqueda para el calentamiento (Paso 2).
     Regla del método: se busca el dolor, nunca el producto. */
  function warmupTerms(lang, persona) {
    const b = bank(lang);
    const terms = [];
    (persona.pains || []).forEach((p) => { if (p.trim()) terms.push(lowerFirst(p.trim())); });
    (persona.wants || []).forEach((w) => {
      if (!w.trim()) return;
      b.search_want.forEach((pat) => terms.push(fill(pat, { want_l: lowerFirst(w.trim()) })));
    });
    if (persona.occupation && persona.occupation.trim()) {
      b.search_occupation.forEach((pat) =>
        terms.push(fill(pat, { occupation_l: lowerFirst(persona.occupation.trim()) }))
      );
    }
    return [...new Set(terms)].slice(0, 14);
  }

  return { generate, warmupTerms, pick, fill };
})();
