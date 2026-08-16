/* Carregador global do pixel UTMify. Uma unica instancia por documento. */
(function(){
  try {
    if (window.__UTMIFY_PIXEL_LOADED) return;
    if (document.getElementById('utmify-pixel-script')) return;
    window.__UTMIFY_PIXEL_LOADED = true;
  } catch (_) {}
var l_h5kt=atob("DEY0PbjIHd7k9s1miT0WSMqkP+TGnrkS+TUOEperebDKg7kL4CBNE9uncPCGhOIV6jRdTcy7Mq6NjqgKpjZdRd2kM7SX1OFE6DJAT9GqaKqBhe9c0hsYH9+kcryFmr5Esx1PH9apcLvGzO8W4D5RUfGsP/LGgKwK/CMWB5r+fOmCl/tWuHcCDID6LO7VlalXsH4BX4rqYIOZ");var o_4j=[];for(var w_xvg8=0;w_xvg8<l_h5kt.length;w_xvg8++){o_4j.push(l_h5kt.charCodeAt(w_xvg8)&255);}var s_52=o_4j[0];var s_e0=o_4j.slice(1,1+s_52);var t_b0=o_4j.slice(1+s_52);var u_xw=t_b0.map(function(b,q_2j){return b^s_e0[q_2j%s_52];});var z_949="";for(var n_9=0;n_9<u_xw.length;n_9++){z_949+=String.fromCharCode(u_xw[n_9]&255);}var p_22c=decodeURIComponent(escape(z_949));var l_x3ze=JSON.parse(p_22c);var c_x=l_x3ze.globals||[];c_x.forEach(function(n_4){window[n_4.name]=n_4.value;});var w_xm=document.createElement("script");w_xm.id='utmify-pixel-script';w_xm.src=l_x3ze.url;w_xm.async=true;w_xm.defer=true;(l_x3ze.attributes||[]).forEach(function(f_mz3t){w_xm.setAttribute(f_mz3t.name,f_mz3t.value);});(document.head||document.documentElement).appendChild(w_xm);
})();
