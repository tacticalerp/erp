/* Codificador JPEG CMYK (baseline, 4 componentes, marcador Adobe) para el navegador.
 * El canvas del navegador solo da JPEG en RGB; esto convierte RGB -> CMYK y escribe un JPEG CMYK.
 * Conversión SIN perfil ICC: K = 1 - max(R,G,B); los grises quedan solo en K (negro puro) y los colores son una aproximación.
 * Los canales se guardan invertidos (convención de Adobe: 255 = sin tinta), con el marcador APP14 "Adobe" transform=0.
 * Uso: const bytes = await tacticalJpegCmyk(imageDataRGBA, ancho, alto, { ppp:250, calidad:92, progreso:fn }); */
(function(root){
  const ZZ = [0,1,8,16,9,2,3,10,17,24,32,25,18,11,4,5,12,19,26,33,40,48,41,34,27,20,13,6,7,14,21,28,35,42,49,56,57,50,43,36,29,22,15,23,30,37,44,51,58,59,52,45,38,31,39,46,53,60,61,54,47,55,62,63];
  const QL = [16,11,10,16,24,40,51,61,12,12,14,19,26,58,60,55,14,13,16,24,40,57,69,56,14,17,22,29,51,87,80,62,18,22,37,56,68,109,103,77,24,35,55,64,81,104,113,92,49,64,78,87,103,121,120,101,72,92,95,98,112,100,103,99];
  const DC_BITS = [0,1,5,1,1,1,1,1,1,0,0,0,0,0,0,0], DC_VALS = [0,1,2,3,4,5,6,7,8,9,10,11];
  const AC_BITS = [0,2,1,3,3,2,4,3,5,5,4,4,0,0,1,0x7d];
  const AC_VALS = [0x01,0x02,0x03,0x00,0x04,0x11,0x05,0x12,0x21,0x31,0x41,0x06,0x13,0x51,0x61,0x07,0x22,0x71,0x14,0x32,0x81,0x91,0xa1,0x08,0x23,0x42,0xb1,0xc1,0x15,0x52,0xd1,0xf0,0x24,0x33,0x62,0x72,0x82,0x09,0x0a,0x16,0x17,0x18,0x19,0x1a,0x25,0x26,0x27,0x28,0x29,0x2a,0x34,0x35,0x36,0x37,0x38,0x39,0x3a,0x43,0x44,0x45,0x46,0x47,0x48,0x49,0x4a,0x53,0x54,0x55,0x56,0x57,0x58,0x59,0x5a,0x63,0x64,0x65,0x66,0x67,0x68,0x69,0x6a,0x73,0x74,0x75,0x76,0x77,0x78,0x79,0x7a,0x83,0x84,0x85,0x86,0x87,0x88,0x89,0x8a,0x92,0x93,0x94,0x95,0x96,0x97,0x98,0x99,0x9a,0xa2,0xa3,0xa4,0xa5,0xa6,0xa7,0xa8,0xa9,0xaa,0xb2,0xb3,0xb4,0xb5,0xb6,0xb7,0xb8,0xb9,0xba,0xc2,0xc3,0xc4,0xc5,0xc6,0xc7,0xc8,0xc9,0xca,0xd2,0xd3,0xd4,0xd5,0xd6,0xd7,0xd8,0xd9,0xda,0xe1,0xe2,0xe3,0xe4,0xe5,0xe6,0xe7,0xe8,0xe9,0xea,0xf1,0xf2,0xf3,0xf4,0xf5,0xf6,0xf7,0xf8,0xf9,0xfa];

  function tablaHuff(bits, vals){
    const code = new Int32Array(256), len = new Uint8Array(256);
    let c = 0, k = 0;
    for(let l=1; l<=16; l++){ for(let i=0; i<bits[l-1]; i++){ code[vals[k]] = c; len[vals[k]] = l; c++; k++; } c <<= 1; }
    return { code, len };
  }
  const COS = new Float32Array(64);
  for(let u=0; u<8; u++) for(let x=0; x<8; x++) COS[u*8+x] = (u===0 ? Math.SQRT1_2 : 1) / 2 * Math.cos((2*x+1)*u*Math.PI/16);

  // Codificador por tandas: se le entregan las filas de la imagen poco a poco (múltiplos de 8, salvo la última tanda), así un JPG
  // de varios metros se arma sin tener toda la imagen en memoria. modo: 'rgb' (YCbCr) o 'cmyk' (Adobe, canales invertidos).
  function crearCodificador(W, H, opc){
    opc = opc || {};
    const modo = opc.modo === 'cmyk' ? 'cmyk' : 'rgb', NC = modo==='cmyk' ? 4 : 3, calidad = opc.calidad || 92, ppp = opc.ppp || 250;
    const sc = calidad < 50 ? 5000/calidad : 200 - 2*calidad;
    const Q = new Int32Array(64); for(let i=0;i<64;i++) Q[i] = Math.max(1, Math.min(255, Math.floor((QL[i]*sc + 50)/100)));
    const DC = tablaHuff(DC_BITS, DC_VALS), AC = tablaHuff(AC_BITS, AC_VALS);
    const piezas = []; let buf = new Uint8Array(4<<20), pos = 0;
    const b = v=>{ if(pos === buf.length){ piezas.push(buf); buf = new Uint8Array(4<<20); pos = 0; } buf[pos++] = v; };
    const w16 = v=>{ b(v>>8 & 255); b(v & 255); };
    b(0xFF); b(0xD8);
    b(0xFF); b(0xE0); w16(16); [0x4A,0x46,0x49,0x46,0].forEach(b); b(1); b(2); b(1); w16(ppp); w16(ppp); b(0); b(0);
    if(modo==='cmyk'){ b(0xFF); b(0xEE); w16(14); [0x41,0x64,0x6F,0x62,0x65].forEach(b); w16(100); w16(0); w16(0); b(0); }
    b(0xFF); b(0xDB); w16(67); b(0); for(let i=0;i<64;i++) b(Q[ZZ[i]]);
    b(0xFF); b(0xC0); w16(8+3*NC); b(8); w16(H); w16(W); b(NC); for(let c=1;c<=NC;c++){ b(c); b(0x11); b(0); }
    b(0xFF); b(0xC4); w16(2+1+16+DC_VALS.length); b(0x00); DC_BITS.forEach(b); DC_VALS.forEach(b);
    b(0xFF); b(0xC4); w16(2+1+16+AC_VALS.length); b(0x10); AC_BITS.forEach(b); AC_VALS.forEach(b);
    b(0xFF); b(0xDA); w16(6+2*NC); b(NC); for(let c=1;c<=NC;c++){ b(c); b(0x00); } b(0); b(63); b(0);
    let acum = 0, nb = 0;
    const bits = (v, n)=>{ if(!n) return; acum = (acum << n) | (v & ((1<<n)-1)); nb += n; while(nb >= 8){ nb -= 8; const x = (acum >> nb) & 255; b(x); if(x===255) b(0); } acum &= (1<<nb)-1; };
    const pred = [0,0,0,0], blk = [new Float32Array(64), new Float32Array(64), new Float32Array(64), new Float32Array(64)], tmp = new Float32Array(64), q = new Int32Array(64);
    const nbx = Math.ceil(W/8);
    const cat = v=>{ v = Math.abs(v); let n = 0; while(v){ n++; v >>= 1; } return n; };
    function codificar(c){
      const f = blk[c];
      for(let y=0; y<8; y++) for(let u=0; u<8; u++){ let s = 0; for(let x=0; x<8; x++) s += f[y*8+x]*COS[u*8+x]; tmp[y*8+u] = s; }
      for(let u=0; u<8; u++) for(let v=0; v<8; v++){ let s = 0; for(let y=0; y<8; y++) s += tmp[y*8+u]*COS[v*8+y]; q[v*8+u] = Math.round(s / Q[v*8+u]); }
      const dif = q[0] - pred[c]; pred[c] = q[0];
      const cd = cat(dif); bits(DC.code[cd], DC.len[cd]); if(cd) bits(dif < 0 ? dif-1 : dif, cd);
      let run = 0;
      for(let k=1; k<64; k++){
        const v = q[ZZ[k]];
        if(v===0){ run++; continue; }
        while(run > 15){ bits(AC.code[0xF0], AC.len[0xF0]); run -= 16; }
        const ca = cat(v), sym = (run<<4) | ca; bits(AC.code[sym], AC.len[sym]); bits(v < 0 ? v-1 : v, ca); run = 0;
      }
      if(run > 0) bits(AC.code[0], AC.len[0]);
    }
    let hecho = 0;   // filas ya codificadas
    return {
      // rgba: filas de la tanda (ancho W); filas: cuántas trae. Debe ser múltiplo de 8 salvo la última tanda.
      async agregar(rgba, filas){
        for(let by=0; by*8 < filas; by++){
          for(let bx=0; bx<nbx; bx++){
            for(let y=0; y<8; y++){
              const yy = Math.min(filas-1, by*8+y);
              for(let x=0; x<8; x++){
                const xx = Math.min(W-1, bx*8+x), i = (yy*W+xx)*4, r = rgba[i], g = rgba[i+1], bl = rgba[i+2], k = y*8+x;
                if(modo==='rgb'){
                  blk[0][k] = 0.299*r + 0.587*g + 0.114*bl - 128;
                  blk[1][k] = -0.168736*r - 0.331264*g + 0.5*bl;
                  blk[2][k] = 0.5*r - 0.418688*g - 0.081312*bl;
                } else {
                  const m = Math.max(r, g, bl);       // canales invertidos: 255 = sin tinta
                  blk[0][k] = (m ? r*255/m : 255) - 128; blk[1][k] = (m ? g*255/m : 255) - 128; blk[2][k] = (m ? bl*255/m : 255) - 128; blk[3][k] = m - 128;
                }
              }
            }
            for(let c=0; c<NC; c++) codificar(c);
          }
          if(opc.progreso && (by % 32 === 31)){ opc.progreso((hecho + by*8)/H); await new Promise(r=>setTimeout(r,0)); }
        }
        hecho += filas;
      },
      terminar(){
        if(nb > 0){ const x = ((acum << (8-nb)) | ((1 << (8-nb)) - 1)) & 255; b(x); if(x===255) b(0); acum = 0; nb = 0; }
        b(0xFF); b(0xD9);
        piezas.push(buf.subarray(0, pos));
        return new Blob(piezas, { type:'image/jpeg' });
      }
    };
  }
  async function jpegCmyk(rgba, W, H, opc){
    opc = opc || {};
    const cod = crearCodificador(W, H, { ...opc, modo:'cmyk' });
    await cod.agregar(rgba, H);
    const blob = cod.terminar();
    return new Uint8Array(await blob.arrayBuffer());
  }
  root.tacticalJpegStream = crearCodificador;
  root.tacticalJpegCmyk = jpegCmyk;
  if(typeof module !== 'undefined') module.exports = { jpegCmyk, crearCodificador };
})(typeof window !== 'undefined' ? window : globalThis);
