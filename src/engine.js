// Blood Level Zero — minimal SugarCube-subset Twee interpreter.
// Supports: StoryData/StoryTitle/StoryInit, <<set>>, <<run>>, <<if>>/<<elseif>>/<<else>>/<</if>>,
// <<print>>/<<=>>, <<include "Name">>, naked $var / $var.prop interpolation, [[Text->Target]] links,
// ''bold'' markup, raw HTML passthrough.

function BLZCreateEngine(tweeSource) {
  const passages = parsePassages(tweeSource);
  const state = {};
  let currentPassage = null;

  function parsePassages(src) {
    const result = {};
    // normalize line endings
    src = src.replace(/\r\n/g, '\n');
    const parts = src.split(/^:: /m).slice(1);
    for (const part of parts) {
      const nl = part.indexOf('\n');
      const headerLine = nl === -1 ? part : part.slice(0, nl);
      const body = nl === -1 ? '' : part.slice(nl + 1);
      const m = headerLine.match(/^(.*?)\s*(?:\[(.*)\])?\s*$/);
      const name = (m ? m[1] : headerLine).trim();
      const tags = m && m[2] ? m[2].split(/\s+/).filter(Boolean) : [];
      result[name] = { name, tags, body, ast: null };
    }
    return result;
  }

  function tokenize(body) {
    const tokens = [];
    const re = /<<(.*?)>>|\[\[(.*?)\]\]/gs;
    let last = 0, m;
    while ((m = re.exec(body))) {
      if (m.index > last) tokens.push({ type: 'text', value: body.slice(last, m.index) });
      if (m[1] !== undefined) {
        const raw = m[1].trim();
        const mm = raw.match(/^(\/?[A-Za-z=]+)\s*([\s\S]*)$/);
        const kw = mm ? mm[1] : raw;
        const arg = mm ? mm[2] : '';
        tokens.push({ type: 'macro', kw, arg, raw });
      } else {
        tokens.push({ type: 'link', raw: m[2] });
      }
      last = re.lastIndex;
    }
    if (last < body.length) tokens.push({ type: 'text', value: body.slice(last) });
    return tokens;
  }

  function parseBlock(tokens, pos) {
    const nodes = [];
    while (pos.i < tokens.length) {
      const t = tokens[pos.i];
      if (t.type === 'text') { nodes.push({ type: 'text', value: t.value }); pos.i++; continue; }
      if (t.type === 'link') { nodes.push({ type: 'link', raw: t.raw }); pos.i++; continue; }
      // macro
      if (t.kw === 'if') {
        pos.i++;
        const branches = [{ cond: t.arg, body: parseBlock(tokens, pos) }];
        while (tokens[pos.i] && tokens[pos.i].type === 'macro' && tokens[pos.i].kw === 'elseif') {
          const cond = tokens[pos.i].arg; pos.i++;
          branches.push({ cond, body: parseBlock(tokens, pos) });
        }
        let elseBody = null;
        if (tokens[pos.i] && tokens[pos.i].type === 'macro' && tokens[pos.i].kw === 'else') {
          pos.i++;
          elseBody = parseBlock(tokens, pos);
        }
        if (tokens[pos.i] && tokens[pos.i].type === 'macro' && tokens[pos.i].kw === '/if') {
          pos.i++;
        } else {
          throw new Error('Missing <</if>> closing tag near: ' + JSON.stringify(t));
        }
        nodes.push({ type: 'if', branches, elseBody });
        continue;
      }
      if (t.kw === 'elseif' || t.kw === 'else' || t.kw === '/if') {
        return nodes; // let caller consume the closer
      }
      if (t.kw === 'set') { nodes.push({ type: 'set', arg: t.arg }); pos.i++; continue; }
      if (t.kw === 'run') { nodes.push({ type: 'run', arg: t.arg }); pos.i++; continue; }
      if (t.kw === 'print' || t.kw === '=') { nodes.push({ type: 'print', arg: t.arg }); pos.i++; continue; }
      if (t.kw === 'include') { nodes.push({ type: 'include', arg: t.arg }); pos.i++; continue; }
      // unknown macro: ignore silently
      pos.i++;
    }
    return nodes;
  }

  function ensureAst(p) {
    if (!p.ast) {
      const toks = tokenize(p.body);
      p.ast = parseBlock(toks, { i: 0 });
    }
    return p.ast;
  }

  function subst(expr) {
    return expr
      .replace(/\$([A-Za-z_][A-Za-z0-9_]*)/g, 'state.$1')
      .replace(/(^|[^A-Za-z0-9_$.])_([A-Za-z_][A-Za-z0-9_]*)/g, (m, pre, id) => pre + 'temp.' + id);
  }

  function evalExpr(expr) {
    const code = subst(expr);
    try {
      // eslint-disable-next-line no-new-func
      const fn = new Function('state', 'temp', 'Math', 'return (' + code + ')');
      return fn(state, {}, Math);
    } catch (e) {
      throw new Error('Expression error in "' + expr + '" (compiled: ' + code + '): ' + e.message);
    }
  }

  function execStmt(arg, isSet) {
    if (isSet) {
      const m = arg.match(/^\$([A-Za-z_][A-Za-z0-9_]*)\s+to\s+([\s\S]+)$/);
      if (!m) throw new Error('Malformed <<set>>: ' + arg);
      const varName = m[1];
      const value = evalExpr(m[2]);
      state[varName] = value;
    } else {
      const code = subst(arg);
      try {
        // eslint-disable-next-line no-new-func
        const fn = new Function('state', 'temp', 'Math', code);
        fn(state, {}, Math);
      } catch (e) {
        throw new Error('Statement error in "' + arg + '" (compiled: ' + code + '): ' + e.message);
      }
    }
  }

  function interpolateText(text) {
    // naked $var / $var.prop.prop interpolation (no calls/brackets)
    let out = text.replace(/\$([A-Za-z_][A-Za-z0-9_]*(?:\.[A-Za-z_][A-Za-z0-9_]*)*)/g, (m, path) => {
      try {
        const val = evalExpr('$' + path);
        return val === undefined ? '' : String(val);
      } catch (e) {
        return m;
      }
    });
    // ''bold'' markup -> <strong>
    out = out.replace(/''(.+?)''/g, '<strong>$1</strong>');
    return out;
  }

  function renderLink(raw) {
    let text, target;
    if (raw.includes('->')) {
      const idx = raw.indexOf('->');
      text = raw.slice(0, idx).trim();
      target = raw.slice(idx + 2).trim();
    } else if (raw.includes('<-')) {
      const idx = raw.indexOf('<-');
      target = raw.slice(0, idx).trim();
      text = raw.slice(idx + 2).trim();
    } else {
      text = raw.trim();
      target = raw.trim();
    }
    return '<a href="#" class="choice-link" data-target="' + target.replace(/"/g, '&quot;') + '">' + text + '</a>';
  }

  function render(nodes) {
    let out = '';
    for (const n of nodes) {
      if (n.type === 'text') {
        out += interpolateText(n.value);
      } else if (n.type === 'link') {
        out += renderLink(n.raw);
      } else if (n.type === 'if') {
        let done = false;
        for (const br of n.branches) {
          if (!done && evalExpr(br.cond)) { out += render(br.body); done = true; }
        }
        if (!done && n.elseBody) out += render(n.elseBody);
      } else if (n.type === 'set') {
        execStmt(n.arg, true);
      } else if (n.type === 'run') {
        execStmt(n.arg, false);
      } else if (n.type === 'print') {
        out += String(evalExpr(n.arg));
      } else if (n.type === 'include') {
        const name = n.arg.trim().replace(/^"|"$/g, '');
        const p = passages[name];
        if (p) { ensureAst(p); out += render(p.ast); }
      }
    }
    return out;
  }

  function formatOutput(html) {
    const lines = html.split('\n');
    let out = '';
    let paraBuf = [];
    function flushPara() {
      if (paraBuf.length) {
        out += '<p>' + paraBuf.join(' ') + '</p>';
        paraBuf = [];
      }
    }
    for (const raw of lines) {
      const line = raw.trim();
      if (line === '') { flushPara(); continue; }
      if (/^<div/.test(line)) { flushPara(); out += line; continue; }
      if (/^(<a href="#" class="choice-link"[^>]*>.*?<\/a>\s*)+$/.test(line)) {
        // Choice links are surfaced separately via getChoices()/result.choices —
        // the caller renders them as interactive buttons, so omit them from the
        // narrative HTML to avoid a second, non-interactive copy.
        flushPara();
        continue;
      }
      paraBuf.push(line);
    }
    flushPara();
    return out;
  }

  function getChoices(html) {
    const choices = [];
    const re = /<a href="#" class="choice-link" data-target="([^"]*)">(.*?)<\/a>/g;
    let m;
    while ((m = re.exec(html))) {
      choices.push({ target: m[1].replace(/&quot;/g, '"'), text: m[2] });
    }
    return choices;
  }

  // --- init ---
  if (passages['StoryInit']) {
    ensureAst(passages['StoryInit']);
    render(passages['StoryInit'].ast); // executes <<set>> side effects, discards text output
  }

  let startPassage = 'Awakening';
  if (passages['StoryData']) {
    try { startPassage = JSON.parse(passages['StoryData'].body).start || startPassage; } catch (e) { /* ignore */ }
  }

  return {
    passageNames: Object.keys(passages).filter(n => !['StoryData', 'StoryTitle', 'Styles', 'StoryInit', 'SystemCheck'].includes(n)),
    startPassage,
    state,
    goto(name) {
      const p = passages[name];
      if (!p) throw new Error('Unknown passage: ' + name);
      currentPassage = name;
      ensureAst(p);
      const raw = render(p.ast);
      const formatted = formatOutput(raw);
      return { html: formatted, choices: getChoices(raw), passage: name };
    },
    current() { return currentPassage; }
  };
}

if (typeof module !== 'undefined') module.exports = { BLZCreateEngine };
