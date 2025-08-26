
export default function attachFightArcade(client, io, sessionBag, addEntry){
  if (client._fightArcadeAttached) return;
  client._fightArcadeAttached = true;

  sessionBag.userStates = sessionBag.userStates || {};
  sessionBag._processedIds = sessionBag._processedIds || new Set();
  const userStates = sessionBag.userStates;
  const processed = sessionBag._processedIds;

  async function send(user, text){
    await client.sendMessage(user, text);
    try { io?.logSession?.(user.replace("@c.us",""), `BOT: ${text}`); } catch {}
  }

  client.on("message", async (msg) => {
    try{
      if (!msg.from?.endsWith("@c.us")) return;
      const id = msg.id? (msg.id._serialized || msg.id.id): null;
      if (id && processed.has(id)) return;
      if (id) processed.add(id);

      const u = msg.from;
      const body = (msg.body||"").trim().toLowerCase();
      userStates[u] = userStates[u] || { stage:"start" };

      if (/^(oi|ola|olá|menu|inicio|início)$/i.test(body)){
        userStates[u].stage="menu";
        await send(u, "1 Modelos, 2 Estampas, 3 Suporte, 4 Finalizar, 5 Atendente");
        return;
      }

      const st = userStates[u];
      switch (st.stage){
        case "menu":
          if (body==="1"){ st.stage="produto"; await send(u,"Fliperama(1) ou USB(2)?"); return; }
          if (body==="2"){ st.stage="estampas"; await send(u,"Catálogo: https://acesse.one/fightarcadeestampa"); st.stage="start"; return; }
          if (body==="3"){ st.stage="suporte"; await send(u,"Não Liga(1) / Botão(2)"); return; }
          if (body==="4"){ st.stage="final"; await send(u,"Online(1) / Atendente(2)"); return; }
          if (body==="5"){ st.stage="agente"; await send(u,"Chamando atendente..."); return; }
          await send(u,"Digite 1..5 ou *menu*."); return;
        case "produto":
          if (body==="1"){ st.stage="jog"; st.tipo="fliperama"; await send(u,"Quantos jogadores? 1 ou 2"); return; }
          if (body==="2"){ st.stage="jog"; st.tipo="usb"; await send(u,"Quantos jogadores? 1 ou 2"); return; }
          await send(u,"Responda 1 ou 2."); return;
        case "jog":
          if (!["1","2"].includes(body)){ await send(u,"1 ou 2."); return; }
          if (st.tipo==="fliperama"){ st.stage="mat"; st.jog=body; await send(u,"Material: 1 MDF / 2 Metal"); return; }
          // USB
          await send(u, body==="1" ? "USB 1J MDF 299 / Metal 399" : "USB 2J MDF 499 / Metal 650");
          st.stage="start"; return;
        case "mat":
          if (!["1","2"].includes(body)){ await send(u,"1 MDF / 2 Metal"); return; }
          const m = body==="1"?"MDF":"Metal";
          if (st.jog==="1") await send(u, m==="MDF"?"Flip 1J MDF 499/550":"Flip 1J Metal 599/650");
          else await send(u, m==="MDF"?"Flip 2J MDF 599/699":"Flip 2J Metal 699/799");
          st.stage="start"; return;
        case "suporte":
          await send(u, body==="1" ? "Não liga: verifique fonte 12V." : "Botão: confira microswitch.");
          st.stage="start"; return;
        case "final":
          await send(u, body==="1" ? "Comprar online: site." : "Conectar atendente.");
          st.stage="start"; return;
        case "agente":
          await send(u, "Aguarde atendimento."); return;
        default:
          await send(u,"Digite *menu* para começar."); return;
      }
    }catch(e){}
  });
}
