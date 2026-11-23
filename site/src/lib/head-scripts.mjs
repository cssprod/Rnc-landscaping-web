export const HEAD_SCRIPT = "(function(d){d.classList.add('js');try{var s=localStorage,t=s.getItem('rnc-theme'),m=s.getItem('rnc-motion');if(t=='light'||t=='dark')d.setAttribute('data-theme',t);if(m=='on'||m=='off')d.setAttribute('data-motion',m)}catch(e){}})(document.documentElement)";
export const SPECULATION_RULES = '{"prefetch":[{"source":"document","where":{"and":[{"href_matches":"/*"},{"not":{"href_matches":"/downloads/*"}}]},"eagerness":"moderate"}]}';
export const INLINE_SCRIPTS = [HEAD_SCRIPT, SPECULATION_RULES];
