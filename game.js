/* ============================================================
   🥕 保卫萝卜大作战 —— 纯 Canvas 手绘塔防
   ============================================================ */
(() => {
'use strict';

/* ================= 基础配置 ================= */
const COLS = 12, ROWS = 8, CELL = 80;
const W = COLS * CELL, H = ROWS * CELL;

// 怪物行进路径（格子坐标）
const PATH_CELLS = [
  [0,1],[1,1],[2,1],[3,1],[3,2],[3,3],[2,3],[1,3],[1,4],[1,5],
  [2,5],[3,5],[4,5],[5,5],[5,4],[5,3],[6,3],[6,2],[6,1],[7,1],
  [8,1],[8,2],[8,3],[8,4],[8,5],[9,5],[10,5]
];
const CARROT_CELL = [11,5];
const BLOCKED = [[10,0],[11,0],[11,1],[0,6],[0,7],[5,0]]; // 树木/石头占位

const WPS = [[-70, (1+0.5)*CELL]];
for (const [c,r] of PATH_CELLS) WPS.push([(c+0.5)*CELL, (r+0.5)*CELL]);
const CARROT_X = (CARROT_CELL[0]+0.5)*CELL, CARROT_Y = (CARROT_CELL[1]+0.5)*CELL;
WPS.push([CARROT_X - 28, CARROT_Y]);

const pathSet  = new Set(PATH_CELLS.map(p => p.join(',')));
const blockSet = new Set(BLOCKED.map(p => p.join(',')));
const carrotKey = CARROT_CELL.join(',');

const TOTAL_WAVES = 20;
const START_GOLD = 280;
const START_HP = 10;

/* ================= 炮塔 / 怪物数据 ================= */
const TOWERS = {
  bottle: { name:'萝卜瓶', desc:'连射萝卜籽，攻速快',   costs:[100,120,160], dmg:[18,32,52],  range:[150,165,185], cd:0.55 },
  fan:    { name:'小风扇', desc:'飞出扇叶，穿透一排怪', costs:[160,190,240], dmg:[16,28,46],  range:[175,190,205], cd:1.15 },
  snow:   { name:'雪花球', desc:'冰冻脉冲，减速周围怪', costs:[140,170,210], dmg:[6,10,16],   range:[115,130,145], cd:1.5, slow:[0.42,0.52,0.62] },
  rocket: { name:'小火箭', desc:'轰隆爆炸，范围伤害',   costs:[220,270,340], dmg:[55,95,160], range:[205,220,235], cd:1.7, splash:[70,82,95] },
  sun:    { name:'太阳花', desc:'定时产出金币',         costs:[150,210,280], gold:[14,24,40], range:[0,0,0],       cd:8 },
};
const TOWER_KEYS = Object.keys(TOWERS);

const ENEMIES = {
  bean:  { name:'豆豆怪', hp:55,  speed:55, gold:12,  r:20 },
  bat:   { name:'蝙蝠仔', hp:42,  speed:92, gold:14,  r:17, fly:true },
  pig:   { name:'胖胖猪', hp:175, speed:36, gold:26,  r:25 },
  ghost: { name:'小幽灵', hp:92,  speed:62, gold:22,  r:19, noSlow:true },
  boss:  { name:'大魔王', hp:950, speed:28, gold:160, r:33, boss:true, dmg:3 },
};

function buildWaveGroups(w) {
  const g = [];
  g.push({ type:'bean', count: 6 + Math.floor(w*1.5), int: Math.max(0.55, 1.0 - w*0.02) });
  if (w >= 3) g.push({ type:'bat',   count: Math.floor(w*1.1), int: 0.55 });
  if (w >= 5) g.push({ type:'pig',   count: Math.floor(w/2),   int: 1.3 });
  if (w >= 7) g.push({ type:'ghost', count: Math.floor(w/2),   int: 0.9 });
  if (w % 5 === 0) g.push({ type:'boss', count: (w === TOTAL_WAVES ? 2 : 1), int: 3 });
  return g;
}
const hpScale = w => Math.pow(1.15, w-1);

/* ================= 工具 ================= */
const $ = id => document.getElementById(id);
const clamp = (v,a,b) => v<a?a:(v>b?b:v);
const dist2 = (ax,ay,bx,by) => (ax-bx)*(ax-bx)+(ay-by)*(ay-by);
const TAU = Math.PI*2;
function mulberry32(a){ return function(){ a|=0; a=a+0x6D2B79F5|0; let t=Math.imul(a^a>>>15,1|a); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; }

/* ================= 音效 ================= */
const AC = {
  ctx:null, muted:false,
  init(){ if(!this.ctx){ try{ this.ctx = new (window.AudioContext||window.webkitAudioContext)(); }catch(e){} }
          if(this.ctx && this.ctx.state==='suspended') this.ctx.resume(); },
  tone(f0,f1,dur,type,vol,delay){
    if(!this.ctx || this.muted) return;
    const t = this.ctx.currentTime + (delay||0);
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type||'sine';
    o.frequency.setValueAtTime(Math.max(f0,1), t);
    o.frequency.exponentialRampToValueAtTime(Math.max(f1,1), t+dur);
    g.gain.setValueAtTime(vol||0.1, t);
    g.gain.exponentialRampToValueAtTime(0.001, t+dur);
    o.connect(g); g.connect(this.ctx.destination);
    o.start(t); o.stop(t+dur+0.03);
  },
  sfx(n){
    switch(n){
      case 'shoot':  this.tone(760,260,0.09,'square',0.035); break;
      case 'fan':    this.tone(320,620,0.12,'sawtooth',0.03); break;
      case 'hit':    this.tone(420,160,0.07,'triangle',0.05); break;
      case 'boom':   this.tone(160,40,0.35,'sawtooth',0.12); this.tone(90,30,0.4,'square',0.08); break;
      case 'freeze': this.tone(1200,1800,0.15,'sine',0.04); this.tone(1600,2200,0.12,'sine',0.03,0.05); break;
      case 'coin':   this.tone(900,900,0.07,'sine',0.06); this.tone(1350,1350,0.12,'sine',0.06,0.07); break;
      case 'pop':    this.tone(500,140,0.14,'triangle',0.07); break;
      case 'hurt':   this.tone(300,70,0.35,'sawtooth',0.1); break;
      case 'build':  this.tone(240,480,0.12,'triangle',0.08); this.tone(480,720,0.1,'triangle',0.06,0.1); break;
      case 'ui':     this.tone(650,900,0.06,'sine',0.05); break;
      case 'upgrade':this.tone(520,1040,0.18,'triangle',0.08); break;
      case 'win':    [523,659,784,1046].forEach((f,i)=>this.tone(f,f,0.25,'triangle',0.09,i*0.16)); break;
      case 'lose':   [392,330,262,196].forEach((f,i)=>this.tone(f,f*0.9,0.3,'sawtooth',0.07,i*0.2)); break;
    }
  }
};
// 轻快小背景音乐（低音量循环）
const MELODY = [0,4,7,4, 9,7,4,2, 0,4,7,12, 9,7,4,7];
const bgm = { next:0, idx:0 };
function tickBGM(){
  if (!AC.ctx || AC.muted || game.state!=='playing' || game.paused || document.hidden) return;
  const now = AC.ctx.currentTime;
  if (bgm.next < now) bgm.next = now + 0.1;
  while (bgm.next < now + 0.25) {
    const semi = MELODY[bgm.idx % MELODY.length];
    AC.tone(523*Math.pow(2,semi/12), 523*Math.pow(2,semi/12), 0.22, 'sine', 0.028, bgm.next-now);
    if (bgm.idx % 4 === 0) AC.tone(131, 131, 0.3, 'triangle', 0.04, bgm.next-now);
    bgm.idx++; bgm.next += 0.3;
  }
}

/* ================= 画布 ================= */
const canvas = $('game');
canvas.width = W; canvas.height = H;
const ctx = canvas.getContext('2d');

function rr(g,x,y,w,h,r){
  r = Math.min(r, w/2, h/2);
  g.beginPath();
  g.moveTo(x+r,y);
  g.arcTo(x+w,y,x+w,y+h,r); g.arcTo(x+w,y+h,x,y+h,r);
  g.arcTo(x,y+h,x,y,r);     g.arcTo(x,y,x+w,y,r);
  g.closePath();
}
function drawStarPath(g,x,y,r){
  g.beginPath();
  for(let i=0;i<10;i++){
    const a = -Math.PI/2 + i*Math.PI/5, rad = i%2===0 ? r : r*0.45;
    const px = x+Math.cos(a)*rad, py = y+Math.sin(a)*rad;
    i===0 ? g.moveTo(px,py) : g.lineTo(px,py);
  }
  g.closePath();
}

/* ================= 背景（预渲染） ================= */
const bgCanvas = document.createElement('canvas');
bgCanvas.width = W; bgCanvas.height = H;
(function drawBG(){
  const g = bgCanvas.getContext('2d');
  const rnd = mulberry32(20260708);
  // 草地棋盘
  for (let r=0;r<ROWS;r++) for (let c=0;c<COLS;c++){
    g.fillStyle = (c+r)%2===0 ? '#a9d97c' : '#9ed06f';
    g.fillRect(c*CELL, r*CELL, CELL, CELL);
  }
  // 小草丛 + 小花
  for (let i=0;i<90;i++){
    const x = rnd()*W, y = rnd()*H;
    const c = Math.floor(x/CELL), r = Math.floor(y/CELL);
    if (pathSet.has(c+','+r) || (c+','+r)===carrotKey) continue;
    if (rnd() < 0.75) { // 草
      g.strokeStyle = 'rgba(80,150,50,.5)'; g.lineWidth = 2; g.lineCap='round';
      for (let k=-1;k<=1;k++){ g.beginPath(); g.moveTo(x+k*3,y); g.quadraticCurveTo(x+k*4,y-5,x+k*5,y-9); g.stroke(); }
    } else { // 花
      const col = ['#ffb3c7','#ffe08a','#c9a7ff','#ffffff'][Math.floor(rnd()*4)];
      for (let p=0;p<5;p++){ const a=p/5*TAU; g.fillStyle=col; g.beginPath(); g.ellipse(x+Math.cos(a)*4,y+Math.sin(a)*4,3,3,0,0,TAU); g.fill(); }
      g.fillStyle = '#ffd23e'; g.beginPath(); g.arc(x,y,2.6,0,TAU); g.fill();
    }
  }
  // 道路
  g.lineJoin='round'; g.lineCap='round';
  const strokePath = (w,col)=>{
    g.strokeStyle=col; g.lineWidth=w;
    g.beginPath(); g.moveTo(WPS[0][0],WPS[0][1]);
    for(let i=1;i<WPS.length;i++) g.lineTo(WPS[i][0],WPS[i][1]);
    g.stroke();
  };
  strokePath(66,'#a97f4f');
  strokePath(56,'#e6c288');
  // 路面小点缀
  for (let i=1;i<WPS.length-1;i++){
    const [x,y]=WPS[i];
    g.fillStyle='rgba(169,127,79,.35)';
    g.beginPath(); g.arc(x+(rnd()-0.5)*20, y+(rnd()-0.5)*20, 3+rnd()*2, 0, TAU); g.fill();
  }
  // 入口山洞
  const [ex,ey]=[0,(1+0.5)*CELL];
  g.fillStyle='#6b4f35'; g.beginPath(); g.arc(ex,ey,40,-Math.PI/2,Math.PI/2); g.fill();
  g.fillStyle='#3a2a1a'; g.beginPath(); g.arc(ex,ey,28,-Math.PI/2,Math.PI/2); g.fill();
  g.fillStyle='#7fbf5a';
  for(let i=0;i<5;i++){ g.beginPath(); g.arc(ex+6, ey-40+i*18, 9, 0, TAU); g.fill(); }
  // 萝卜家的土堆
  g.fillStyle='#c98d54'; g.beginPath(); g.ellipse(CARROT_X, CARROT_Y+22, 42, 20, 0, 0, TAU); g.fill();
  g.fillStyle='#b3763f'; g.beginPath(); g.ellipse(CARROT_X, CARROT_Y+22, 42, 20, 0, 0, Math.PI); g.fill();
  // 障碍装饰：树和石头
  for (const [c,r] of BLOCKED){
    const x=(c+0.5)*CELL, y=(r+0.5)*CELL;
    if (r>=6 || c===5){ // 石头
      g.fillStyle='#9aa3a8'; g.beginPath(); g.ellipse(x,y+8,26,18,0,0,TAU); g.fill();
      g.fillStyle='#b8c0c4'; g.beginPath(); g.ellipse(x-6,y+2,18,14,0,0,TAU); g.fill();
      g.fillStyle='rgba(255,255,255,.5)'; g.beginPath(); g.ellipse(x-12,y-3,5,3,0,0,TAU); g.fill();
    } else { // 树
      g.fillStyle='#8a5a33'; rr(g,x-6,y,12,26,4); g.fill();
      g.fillStyle='#5da344'; g.beginPath(); g.arc(x,y-16,24,0,TAU); g.fill();
      g.fillStyle='#71b856'; g.beginPath(); g.arc(x-10,y-8,16,0,TAU); g.arc(x+12,y-10,15,0,TAU); g.fill();
      g.fillStyle='#ff6b81'; g.beginPath(); g.arc(x-8,y-20,4,0,TAU); g.arc(x+10,y-14,4,0,TAU); g.fill();
    }
  }
  // 木牌
  g.save(); g.translate(30, 52); g.rotate(-0.06);
  g.fillStyle='#8a5a33'; rr(g,-4,10,8,30,3); g.fill();
  g.fillStyle='#c98d54'; rr(g,-32,-12,64,26,8); g.fill();
  g.strokeStyle='#8a5a33'; g.lineWidth=3; rr(g,-32,-12,64,26,8); g.stroke();
  g.fillStyle='#5b3a1e'; g.font='bold 15px "Microsoft YaHei", sans-serif'; g.textAlign='center'; g.textBaseline='middle';
  g.fillText('入口→', 0, 2);
  g.restore();
})();

/* ================= 游戏状态 ================= */
const game = {
  state:'menu',      // menu | playing | over
  time:0, spd:1, paused:false,
  gold:START_GOLD, hp:START_HP,
  wave:0, phase:'prep', prepT:15,
  spawnQ:[], spawnT:0,
  enemies:[], towers:[], towerMap:{}, projs:[], parts:[], floats:[],
  menu:null, menuHover:-1, hover:null,
  chest:null, chestT:16,
  shake:0, hurtT:0, carrotBounce:0,
  kills:0, goldEarned:0,
};

function resetGame(){
  Object.assign(game, {
    state:'playing', time:0, spd:1, paused:false,
    gold:START_GOLD, hp:START_HP,
    wave:0, phase:'prep', prepT:15,
    spawnQ:[], spawnT:0,
    enemies:[], towers:[], towerMap:{}, projs:[], parts:[], floats:[],
    menu:null, menuHover:-1, hover:null,
    chest:null, chestT:16,
    shake:0, hurtT:0, carrotBounce:0,
    kills:0, goldEarned:0,
  });
  syncHUD(true);
}

function addGold(n, x, y){
  game.gold += n; game.goldEarned += n;
  if (x !== undefined){
    game.floats.push({x, y, txt:'+'+n, col:'#ffd23e', life:0.9, t:0, gold:true});
    game.parts.push({type:'coin', x, y, vx:(Math.random()-0.5)*30, vy:-90, life:0.7, t:0});
  }
}

/* ================= 波次 ================= */
function startWave(){
  game.wave++;
  game.phase = 'wave';
  game.spawnT = 0;
  game.spawnQ = [];
  let t = 0.5;
  for (const grp of buildWaveGroups(game.wave)){
    for (let i=0;i<grp.count;i++){ game.spawnQ.push({type:grp.type, t}); t += grp.int; }
    t += 1.4;
  }
  AC.sfx('ui');
}
function waveCleared(){
  const bonus = 30 + game.wave*5;
  addGold(bonus, CARROT_X, CARROT_Y-70);
  if (game.wave >= TOTAL_WAVES){ endGame(true); return; }
  game.phase = 'prep';
  game.prepT = 10;
}
function spawnEnemy(type){
  const def = ENEMIES[type];
  const hp = Math.round(def.hp * hpScale(game.wave));
  game.enemies.push({
    type, def, hp, maxHp:hp,
    x:WPS[0][0], y:WPS[0][1] + (Math.random()-0.5)*16,
    wp:1, dist:0, phase:Math.random()*TAU,
    slowT:0, slowF:0, hitFlash:0, dead:false,
    gold: def.gold + Math.floor(game.wave/2),
  });
}

/* ================= 战斗 ================= */
function hurtEnemy(e, d){
  if (e.dead) return;
  e.hp -= d; e.hitFlash = 0.15;
  game.floats.push({x:e.x+(Math.random()-0.5)*14, y:e.y-e.def.r-12, txt:Math.round(d), col:'#fff', life:0.6, t:0});
  if (e.hp <= 0){
    e.dead = true; game.kills++;
    addGold(e.gold, e.x, e.y-10);
    for (let i=0;i<7;i++){
      const a = Math.random()*TAU, s = 30+Math.random()*60;
      game.parts.push({type:'puff', x:e.x, y:e.y, vx:Math.cos(a)*s, vy:Math.sin(a)*s-20, life:0.5, t:0, r:5+Math.random()*6});
    }
    if (e.def.boss){
      game.shake = Math.max(game.shake, 0.4);
      game.parts.push({type:'ring', x:e.x, y:e.y, r0:10, r1:90, life:0.5, t:0, col:'rgba(255,210,60,.8)'});
      AC.sfx('boom');
    } else AC.sfx('pop');
  } else AC.sfx('hit');
}
function slowEnemy(e, f, dur){
  if (e.def.noSlow) return;
  e.slowF = Math.max(e.slowF * (e.slowT>0?1:0), f); e.slowT = dur; e.slowF = f;
}
function carrotHit(n){
  game.hp -= n;
  game.shake = Math.max(game.shake, 0.4);
  game.hurtT = 1;
  AC.sfx('hurt');
  for (let i=0;i<6;i++){
    const a = Math.random()*TAU;
    game.parts.push({type:'chunk', x:CARROT_X, y:CARROT_Y-10, vx:Math.cos(a)*80, vy:-60-Math.random()*80, life:0.6, t:0});
  }
  if (game.hp <= 0){ game.hp = 0; endGame(false); }
}

function updateEnemy(e, dt){
  if (e.slowT > 0) e.slowT -= dt;
  if (e.hitFlash > 0) e.hitFlash -= dt;
  let sp = e.def.speed * (1 + game.wave*0.012);
  if (e.slowT > 0 && !e.def.noSlow) sp *= (1 - e.slowF);
  let step = sp * dt;
  while (step > 0 && !e.dead){
    if (e.wp >= WPS.length){ e.dead = true; carrotHit(e.def.dmg||1); break; }
    const [tx,ty] = WPS[e.wp];
    const dx = tx-e.x, dy = ty-e.y, d = Math.hypot(dx,dy);
    if (d <= step){ e.x = tx; e.y = ty; e.wp++; step -= d; }
    else { e.x += dx/d*step; e.y += dy/d*step; e.dist += step; step = 0; }
  }
}

function acquireTarget(t, range){
  let best = null;
  for (const e of game.enemies){
    if (e.dead) continue;
    if (dist2(e.x,e.y,t.x,t.y) <= range*range){
      if (!best || e.dist > best.dist) best = e;
    }
  }
  return best;
}

function updateTower(t, dt){
  const def = TOWERS[t.type];
  t.cd -= dt;
  t.anim += dt;
  if (t.recoil > 0) t.recoil -= dt*4;
  if (t.type === 'sun'){
    if (t.cd <= 0){
      t.cd = def.cd;
      const amt = def.gold[t.lv-1];
      addGold(amt, t.x, t.y - 40);
      game.parts.push({type:'ring', x:t.x, y:t.y-24, r0:6, r1:36, life:0.4, t:0, col:'rgba(255,220,90,.8)'});
      AC.sfx('coin');
    }
    return;
  }
  const range = def.range[t.lv-1];
  const target = acquireTarget(t, range);
  if (target) t.angle = Math.atan2(target.y - t.y, target.x - t.x);
  if (t.type === 'fan') t.spin += dt * (target ? 14 : 3);
  if (t.type === 'snow'){
    if (target && t.cd <= 0){
      t.cd = def.cd;
      game.parts.push({type:'ring', x:t.x, y:t.y-14, r0:14, r1:range, life:0.45, t:0, col:'rgba(140,200,255,.85)'});
      for (const e of game.enemies){
        if (!e.dead && dist2(e.x,e.y,t.x,t.y) <= range*range){
          hurtEnemy(e, def.dmg[t.lv-1]);
          slowEnemy(e, def.slow[t.lv-1], 2);
        }
      }
      AC.sfx('freeze');
    }
    return;
  }
  if (target && t.cd <= 0){
    t.cd = def.cd;
    t.recoil = 1;
    const dmg = def.dmg[t.lv-1];
    if (t.type === 'bottle'){
      game.projs.push({kind:'bullet', x:t.x, y:t.y-16, sp:430, target, dmg, life:1.4, ang:t.angle});
      AC.sfx('shoot');
    } else if (t.type === 'fan'){
      const a = t.angle;
      game.projs.push({kind:'blade', x:t.x, y:t.y-14, dx:Math.cos(a), dy:Math.sin(a), sp:310,
                       traveled:0, max:range+70, dmg, hit:new Set(), spin:0});
      AC.sfx('fan');
    } else if (t.type === 'rocket'){
      game.projs.push({kind:'rocket', x:t.x, y:t.y-20, sp:250, target, tx:target.x, ty:target.y,
                       dmg, splash:def.splash[t.lv-1], life:3, ang:t.angle});
      AC.sfx('shoot');
    }
  }
}

function explode(x, y, dmg, radius){
  for (const e of game.enemies){
    if (!e.dead && dist2(e.x,e.y,x,y) <= radius*radius) hurtEnemy(e, dmg);
  }
  game.shake = Math.max(game.shake, 0.2);
  game.parts.push({type:'ring', x, y, r0:10, r1:radius, life:0.35, t:0, col:'rgba(255,140,60,.9)'});
  game.parts.push({type:'flash', x, y, life:0.15, t:0, r:radius*0.7});
  for (let i=0;i<10;i++){
    const a = Math.random()*TAU, s = 40+Math.random()*120;
    game.parts.push({type:'spark', x, y, vx:Math.cos(a)*s, vy:Math.sin(a)*s, life:0.4, t:0});
  }
  AC.sfx('boom');
}

function updateProj(p, dt){
  if (p.kind === 'blade'){
    p.x += p.dx*p.sp*dt; p.y += p.dy*p.sp*dt;
    p.traveled += p.sp*dt; p.spin += dt*22;
    for (const e of game.enemies){
      if (!e.dead && !p.hit.has(e) && dist2(e.x,e.y,p.x,p.y) <= (e.def.r+14)*(e.def.r+14)){
        p.hit.add(e); hurtEnemy(e, p.dmg);
      }
    }
    if (p.traveled >= p.max || p.x<-40 || p.x>W+40 || p.y<-40 || p.y>H+40) p.dead = true;
    return;
  }
  p.life -= dt;
  if (p.life <= 0){ p.dead = true; return; }
  if (p.kind === 'bullet'){
    if (p.target && !p.target.dead) p.ang = Math.atan2(p.target.y-p.y, p.target.x-p.x);
    p.x += Math.cos(p.ang)*p.sp*dt; p.y += Math.sin(p.ang)*p.sp*dt;
    if (p.target && !p.target.dead && dist2(p.x,p.y,p.target.x,p.target.y) <= p.target.def.r*p.target.def.r){
      hurtEnemy(p.target, p.dmg);
      game.parts.push({type:'spark', x:p.x, y:p.y, vx:0, vy:-30, life:0.2, t:0});
      p.dead = true;
    }
  } else if (p.kind === 'rocket'){
    if (p.target && !p.target.dead){ p.tx = p.target.x; p.ty = p.target.y; }
    p.ang = Math.atan2(p.ty-p.y, p.tx-p.x);
    p.sp += 260*dt;
    p.x += Math.cos(p.ang)*p.sp*dt; p.y += Math.sin(p.ang)*p.sp*dt;
    if (Math.random()<0.6) game.parts.push({type:'smoke', x:p.x-Math.cos(p.ang)*14, y:p.y-Math.sin(p.ang)*14, vx:(Math.random()-0.5)*20, vy:(Math.random()-0.5)*20, life:0.35, t:0, r:4});
    if (dist2(p.x,p.y,p.tx,p.ty) <= 14*14){
      explode(p.tx, p.ty, p.dmg, p.splash);
      p.dead = true;
    }
  }
}

/* ================= 建造 ================= */
function cellBuildable(c, r){
  if (c<0||r<0||c>=COLS||r>=ROWS) return false;
  const k = c+','+r;
  return !pathSet.has(k) && !blockSet.has(k) && k!==carrotKey && !game.towerMap[k];
}
function buildTower(type, c, r){
  const cost = TOWERS[type].costs[0];
  if (game.gold < cost || !cellBuildable(c,r)) return false;
  game.gold -= cost;
  const t = {type, lv:1, c, r, x:(c+0.5)*CELL, y:(r+0.5)*CELL, cd:0, angle:-Math.PI/2, spin:0, recoil:0, anim:Math.random()*9};
  game.towers.push(t);
  game.towerMap[c+','+r] = t;
  for (let i=0;i<8;i++){
    const a = Math.random()*TAU;
    game.parts.push({type:'puff', x:t.x+Math.cos(a)*20, y:t.y+14, vx:Math.cos(a)*40, vy:-30, life:0.4, t:0, r:5});
  }
  AC.sfx('build');
  return true;
}
function towerInvested(t){
  let s = 0;
  for (let i=0;i<t.lv;i++) s += TOWERS[t.type].costs[i];
  return s;
}
function upgradeTower(t){
  if (t.lv >= 3) return;
  const cost = TOWERS[t.type].costs[t.lv];
  if (game.gold < cost) return;
  game.gold -= cost; t.lv++;
  game.parts.push({type:'ring', x:t.x, y:t.y, r0:8, r1:50, life:0.4, t:0, col:'rgba(255,230,120,.9)'});
  game.floats.push({x:t.x, y:t.y-46, txt:'升级!', col:'#ffe08a', life:0.8, t:0});
  AC.sfx('upgrade');
}
function sellTower(t){
  const refund = Math.floor(towerInvested(t)*0.7);
  addGold(refund, t.x, t.y-30);
  game.towers.splice(game.towers.indexOf(t), 1);
  delete game.towerMap[t.c+','+t.r];
  AC.sfx('coin');
}

/* ================= 礼物盒 ================= */
function updateChest(dt){
  if (game.chest){
    game.chest.life -= dt;
    if (game.chest.life <= 0) game.chest = null;
    return;
  }
  game.chestT -= dt;
  if (game.chestT <= 0){
    const spots = [];
    for (let r=0;r<ROWS;r++) for (let c=0;c<COLS;c++) if (cellBuildable(c,r)) spots.push([c,r]);
    if (spots.length){
      const [c,r] = spots[Math.floor(Math.random()*spots.length)];
      game.chest = {x:(c+0.5)*CELL, y:(r+0.5)*CELL, life:8, max:8};
    }
    game.chestT = 20 + Math.random()*14;
  }
}
function collectChest(){
  const amt = 25 + game.wave*3 + Math.floor(Math.random()*15);
  addGold(amt, game.chest.x, game.chest.y-20);
  for (let i=0;i<10;i++){
    const a = Math.random()*TAU, s = 50+Math.random()*80;
    game.parts.push({type:'coin', x:game.chest.x, y:game.chest.y, vx:Math.cos(a)*s, vy:Math.sin(a)*s-60, life:0.7, t:0});
  }
  game.chest = null;
  AC.sfx('coin');
}

/* ================= 菜单 ================= */
function openBuildMenu(c, r){
  const cx = clamp((c+0.5)*CELL, 132, W-132);
  const cy = clamp((r+0.5)*CELL, 132, H-132);
  const items = TOWER_KEYS.map((k,i)=>{
    const a = -Math.PI/2 + i*TAU/TOWER_KEYS.length;
    return {key:k, x:cx+Math.cos(a)*92, y:cy+Math.sin(a)*92, r:31};
  });
  game.menu = {kind:'build', c, r, cx, cy, items};
  game.menuHover = -1;
  AC.sfx('ui');
}
function openTowerMenu(t){
  const cx = t.x, cy = clamp(t.y, 110, H-110);
  const items = [];
  if (t.lv < 3) items.push({key:'upgrade', x:cx, y:cy-74, r:30});
  items.push({key:'sell', x:cx, y:cy+74, r:30});
  game.menu = {kind:'tower', tower:t, cx, cy, items};
  game.menuHover = -1;
  AC.sfx('ui');
}
function clickMenu(mx, my){
  const m = game.menu;
  for (const it of m.items){
    if (dist2(mx,my,it.x,it.y) <= (it.r+5)*(it.r+5)){
      if (m.kind === 'build'){
        buildTower(it.key, m.c, m.r);
      } else {
        if (it.key === 'upgrade') upgradeTower(m.tower);
        else sellTower(m.tower);
      }
      game.menu = null;
      return;
    }
  }
  game.menu = null;
}

/* ================= 输入 ================= */
function canvasPos(ev){
  const rect = canvas.getBoundingClientRect();
  return [(ev.clientX-rect.left)*W/rect.width, (ev.clientY-rect.top)*H/rect.height];
}
canvas.addEventListener('click', ev => {
  if (game.state !== 'playing' || game.paused) return;
  const [mx,my] = canvasPos(ev);
  if (game.menu){ clickMenu(mx,my); return; }
  if (game.chest && dist2(mx,my,game.chest.x,game.chest.y) <= 38*38){ collectChest(); return; }
  const c = Math.floor(mx/CELL), r = Math.floor(my/CELL);
  if (c<0||r<0||c>=COLS||r>=ROWS) return;
  const k = c+','+r;
  if (k === carrotKey){
    game.carrotBounce = 1;
    game.parts.push({type:'heart', x:CARROT_X, y:CARROT_Y-46, vx:0, vy:-40, life:0.8, t:0});
    AC.sfx('coin');
    return;
  }
  if (game.towerMap[k]){ openTowerMenu(game.towerMap[k]); return; }
  if (cellBuildable(c,r)) openBuildMenu(c,r);
});
canvas.addEventListener('mousemove', ev => {
  const [mx,my] = canvasPos(ev);
  game.mx = mx; game.my = my;
  const c = Math.floor(mx/CELL), r = Math.floor(my/CELL);
  game.hover = (c>=0&&r>=0&&c<COLS&&r<ROWS) ? [c,r] : null;
  game.menuHover = -1;
  if (game.menu){
    game.menu.items.forEach((it,i)=>{ if (dist2(mx,my,it.x,it.y) <= (it.r+5)*(it.r+5)) game.menuHover = i; });
  }
});
canvas.addEventListener('mouseleave', ()=>{ game.hover = null; game.menuHover = -1; });

/* ================= HUD ================= */
const hpEl=$('hp'), goldEl=$('gold'), waveEl=$('wave'), nextBtn=$('nextBtn');
function prepBonus(){ return Math.ceil(game.prepT)*4; }
function syncHUD(force){
  hpEl.textContent = game.hp;
  goldEl.textContent = Math.floor(game.gold);
  waveEl.textContent = game.wave;
  const prep = game.state==='playing' && game.phase==='prep';
  nextBtn.hidden = !prep;
  if (prep){
    nextBtn.textContent = game.wave===0
      ? `🚀 开始出怪 (${Math.ceil(game.prepT)}s)`
      : `🚀 提前召唤 +${prepBonus()}💰 (${Math.ceil(game.prepT)}s)`;
  }
}
nextBtn.addEventListener('click', ()=>{
  if (game.phase !== 'prep') return;
  if (game.wave > 0) addGold(prepBonus(), CARROT_X, CARROT_Y-70);
  startWave();
});
$('pauseBtn').addEventListener('click', function(){
  if (game.state!=='playing') return;
  game.paused = !game.paused;
  this.textContent = game.paused ? '▶️' : '⏸️';
  AC.sfx('ui');
});
$('speedBtn').addEventListener('click', function(){
  game.spd = game.spd===1 ? 2 : 1;
  this.textContent = game.spd===1 ? '▶️ x1' : '⏩ x2';
  AC.sfx('ui');
});
$('muteBtn').addEventListener('click', function(){
  AC.muted = !AC.muted;
  this.textContent = AC.muted ? '🔇' : '🔊';
});
$('restartBtn').addEventListener('click', ()=>{ AC.init(); resetGame(); $('endScreen').hidden = true; $('startScreen').hidden = true; });
$('startBtn').addEventListener('click', ()=>{
  AC.init();
  $('startScreen').hidden = true;
  resetGame();
});
$('againBtn').addEventListener('click', ()=>{
  $('endScreen').hidden = true;
  resetGame();
});

function endGame(win){
  game.state = 'over';
  game.menu = null;
  AC.sfx(win?'win':'lose');
  $('endTitle').textContent = win ? '🎉 萝卜保住啦！' : '😭 萝卜被吃掉了…';
  let stars = 0;
  if (win) stars = game.hp>=8 ? 3 : (game.hp>=4 ? 2 : 1);
  $('endStars').textContent = win ? '⭐'.repeat(stars) + '☆'.repeat(3-stars) : '';
  $('endStats').textContent = `坚守 ${game.wave} 波 · 击败 ${game.kills} 只怪物 · 累计金币 ${game.goldEarned}`;
  $('endScreen').hidden = false;
}

/* ================= 更新 ================= */
function update(dt){
  game.time += dt;
  if (game.shake > 0) game.shake -= dt;
  if (game.hurtT > 0) game.hurtT -= dt;
  if (game.carrotBounce > 0) game.carrotBounce -= dt*2;

  if (game.phase === 'prep'){
    game.prepT -= dt;
    if (game.prepT <= 0) startWave();
  } else {
    game.spawnT += dt;
    while (game.spawnQ.length && game.spawnQ[0].t <= game.spawnT){
      spawnEnemy(game.spawnQ.shift().type);
    }
    if (!game.spawnQ.length && game.enemies.length === 0 && game.state==='playing') waveCleared();
  }

  updateChest(dt);
  for (const t of game.towers) updateTower(t, dt);
  for (const e of game.enemies) updateEnemy(e, dt);
  game.enemies = game.enemies.filter(e => !e.dead);
  for (const p of game.projs) updateProj(p, dt);
  game.projs = game.projs.filter(p => !p.dead);
  for (const p of game.parts){ p.t += dt; p.x += (p.vx||0)*dt; p.y += (p.vy||0)*dt; if (p.vy!==undefined) p.vy += 120*dt; }
  game.parts = game.parts.filter(p => p.t < p.life);
  for (const f of game.floats){ f.t += dt; f.y -= 32*dt; }
  game.floats = game.floats.filter(f => f.t < f.life);
}

/* ================= 绘制：怪物 ================= */
function drawEyes(g, x, y, gap, r, phase, lookA){
  const blink = ((game.time*0.7 + phase) % 3) < 0.1;
  const dx = Math.cos(lookA||0)*r*0.3, dy = Math.sin(lookA||0)*r*0.3;
  for (const s of [-1,1]){
    g.fillStyle = '#fff';
    g.beginPath(); g.ellipse(x+s*gap, y, r, r*1.1, 0, 0, TAU); g.fill();
    if (blink){
      g.strokeStyle = '#333'; g.lineWidth = 2; g.lineCap='round';
      g.beginPath(); g.moveTo(x+s*gap-r*0.7, y); g.lineTo(x+s*gap+r*0.7, y); g.stroke();
    } else {
      g.fillStyle = '#333';
      g.beginPath(); g.arc(x+s*gap+dx, y+dy, r*0.5, 0, TAU); g.fill();
      g.fillStyle = '#fff';
      g.beginPath(); g.arc(x+s*gap+dx-r*0.15, y+dy-r*0.18, r*0.16, 0, TAU); g.fill();
    }
  }
}

function drawEnemy(e){
  const g = ctx, d = e.def, t = game.time;
  const bob = d.fly ? Math.sin(t*6+e.phase)*5 : 0;
  const wob = Math.sin(e.dist*0.12 + e.phase);
  const x = e.x, y = e.y - bob - (d.fly?10:0);
  // 影子
  g.fillStyle = 'rgba(0,0,0,.15)';
  g.beginPath(); g.ellipse(e.x, e.y + d.r*0.75, d.r*0.8, d.r*0.3, 0, 0, TAU); g.fill();

  g.save();
  g.translate(x, y);
  if (!d.fly) g.scale(1+wob*0.05, 1-wob*0.05);
  const r = d.r;

  if (e.type === 'bean'){
    g.fillStyle = '#7ec850'; g.strokeStyle = '#5a9e35'; g.lineWidth = 3;
    g.beginPath(); g.ellipse(0, 0, r, r*0.92, 0, 0, TAU); g.fill(); g.stroke();
    g.fillStyle = '#a5dd7e'; g.beginPath(); g.ellipse(-r*0.3, -r*0.3, r*0.35, r*0.25, -0.6, 0, TAU); g.fill();
    // 头顶小芽
    g.strokeStyle = '#5a9e35'; g.lineWidth = 3; g.lineCap = 'round';
    g.beginPath(); g.moveTo(0,-r*0.85); g.quadraticCurveTo(3,-r*1.2, 8,-r*1.3); g.stroke();
    g.fillStyle = '#7ec850'; g.beginPath(); g.ellipse(10,-r*1.3, 6, 4, 0.5, 0, TAU); g.fill();
    drawEyes(g, 0, -r*0.15, r*0.4, r*0.22, e.phase, 0);
    g.strokeStyle = '#446622'; g.lineWidth = 2;
    g.beginPath(); g.arc(0, r*0.25, r*0.25, 0.2, Math.PI-0.2); g.stroke();
    // 小脚
    g.fillStyle = '#5a9e35';
    for (const s of [-1,1]){ g.beginPath(); g.ellipse(s*r*0.45, r*0.85 + Math.sin(e.dist*0.3+ (s>0?0:Math.PI))*3, 6, 4, 0, 0, TAU); g.fill(); }
  }
  else if (e.type === 'bat'){
    const flap = Math.sin(t*14+e.phase)*0.6;
    g.fillStyle = '#9b7fd4';
    for (const s of [-1,1]){
      g.save(); g.translate(s*r*0.7, -2); g.rotate(s*flap);
      g.beginPath(); g.ellipse(s*r*0.5, 0, r*0.75, r*0.4, s*0.4, 0, TAU); g.fill();
      g.restore();
    }
    g.fillStyle = '#7e5fc0'; g.strokeStyle = '#5d40a0'; g.lineWidth = 3;
    g.beginPath(); g.arc(0, 0, r*0.9, 0, TAU); g.fill(); g.stroke();
    // 耳朵
    g.fillStyle = '#7e5fc0';
    for (const s of [-1,1]){ g.beginPath(); g.moveTo(s*r*0.3,-r*0.7); g.lineTo(s*r*0.75,-r*1.25); g.lineTo(s*r*0.75,-r*0.5); g.closePath(); g.fill(); }
    drawEyes(g, 0, -r*0.1, r*0.38, r*0.24, e.phase, 0);
    // 小尖牙
    g.fillStyle = '#fff';
    for (const s of [-1,1]){ g.beginPath(); g.moveTo(s*r*0.2, r*0.35); g.lineTo(s*r*0.3, r*0.6); g.lineTo(s*r*0.38, r*0.35); g.closePath(); g.fill(); }
  }
  else if (e.type === 'pig'){
    g.fillStyle = '#ffa8c0'; g.strokeStyle = '#e07898'; g.lineWidth = 3;
    g.beginPath(); g.ellipse(0, 0, r, r*0.9, 0, 0, TAU); g.fill(); g.stroke();
    g.fillStyle = '#ffc4d6'; g.beginPath(); g.ellipse(-r*0.3, -r*0.3, r*0.4, r*0.28, -0.5, 0, TAU); g.fill();
    // 耳朵
    g.fillStyle = '#ffa8c0'; g.strokeStyle = '#e07898';
    for (const s of [-1,1]){
      g.beginPath(); g.moveTo(s*r*0.4,-r*0.65); g.quadraticCurveTo(s*r*0.75,-r*1.15, s*r*0.85,-r*0.55); g.closePath();
      g.fill(); g.stroke();
    }
    drawEyes(g, 0, -r*0.3, r*0.42, r*0.2, e.phase, 0);
    // 猪鼻子
    g.fillStyle = '#ff8fb0'; g.strokeStyle = '#e07898'; g.lineWidth = 2.5;
    g.beginPath(); g.ellipse(0, r*0.15, r*0.34, r*0.24, 0, 0, TAU); g.fill(); g.stroke();
    g.fillStyle = '#c05878';
    for (const s of [-1,1]){ g.beginPath(); g.ellipse(s*r*0.13, r*0.15, r*0.06, r*0.1, 0, 0, TAU); g.fill(); }
    // 小脚
    g.fillStyle = '#e07898';
    for (const s of [-1,1]){ g.beginPath(); g.ellipse(s*r*0.5, r*0.82 + Math.sin(e.dist*0.25+(s>0?0:Math.PI))*3, 7, 5, 0, 0, TAU); g.fill(); }
  }
  else if (e.type === 'ghost'){
    g.globalAlpha = 0.88;
    const wave = t*5 + e.phase;
    g.fillStyle = '#dcecff'; g.strokeStyle = '#9db8dd'; g.lineWidth = 2.5;
    g.beginPath();
    g.arc(0, -r*0.2, r*0.85, Math.PI, 0);
    // 波浪下摆
    for (let i=0;i<=6;i++){
      const px = r*0.85 - i*(r*1.7/6);
      const py = r*0.6 + Math.sin(wave + i)* 4 + (i%2===0? 6:0);
      g.lineTo(px, py);
    }
    g.closePath(); g.fill(); g.stroke();
    drawEyes(g, 0, -r*0.25, r*0.4, r*0.22, e.phase, 0);
    g.strokeStyle = '#7a95bb'; g.lineWidth = 2;
    g.beginPath(); g.arc(0, r*0.1, r*0.18, 0.3, Math.PI-0.3); g.stroke();
    g.globalAlpha = 1;
  }
  else if (e.type === 'boss'){
    g.fillStyle = '#6d5aa8'; g.strokeStyle = '#4a3a80'; g.lineWidth = 4;
    g.beginPath(); g.ellipse(0, 0, r, r*0.95, 0, 0, TAU); g.fill(); g.stroke();
    g.fillStyle = '#8a76c8'; g.beginPath(); g.ellipse(-r*0.3, -r*0.3, r*0.4, r*0.3, -0.5, 0, TAU); g.fill();
    // 犄角
    g.fillStyle = '#ffd23e'; g.strokeStyle = '#d9a520'; g.lineWidth = 2.5;
    for (const s of [-1,1]){
      g.beginPath(); g.moveTo(s*r*0.45,-r*0.6); g.quadraticCurveTo(s*r*0.9,-r*1.1, s*r*0.6,-r*1.35);
      g.quadraticCurveTo(s*r*0.55,-r*0.95, s*r*0.75,-r*0.55); g.closePath(); g.fill(); g.stroke();
    }
    // 小皇冠
    g.fillStyle = '#ffd23e'; g.strokeStyle = '#d9a520';
    g.beginPath();
    g.moveTo(-r*0.3,-r*0.9); g.lineTo(-r*0.3,-r*1.15); g.lineTo(-r*0.12,-r*0.98);
    g.lineTo(0,-r*1.2); g.lineTo(r*0.12,-r*0.98); g.lineTo(r*0.3,-r*1.15); g.lineTo(r*0.3,-r*0.9);
    g.closePath(); g.fill(); g.stroke();
    // 生气眉毛 + 眼睛
    g.strokeStyle = '#332255'; g.lineWidth = 3.5; g.lineCap='round';
    for (const s of [-1,1]){ g.beginPath(); g.moveTo(s*r*0.15,-r*0.42); g.lineTo(s*r*0.55,-r*0.28); g.stroke(); }
    drawEyes(g, 0, -r*0.12, r*0.35, r*0.2, e.phase, 0);
    // 獠牙嘴
    g.strokeStyle = '#332255'; g.lineWidth = 3;
    g.beginPath(); g.arc(0, r*0.32, r*0.28, Math.PI+0.4, -0.4); g.stroke();
    g.fillStyle = '#fff';
    for (const s of [-1,1]){ g.beginPath(); g.moveTo(s*r*0.22, r*0.2); g.lineTo(s*r*0.3, r*0.42); g.lineTo(s*r*0.4, r*0.22); g.closePath(); g.fill(); }
  }

  // 受击闪白
  if (e.hitFlash > 0){
    g.globalAlpha = Math.min(1, e.hitFlash*6)*0.6;
    g.fillStyle = '#fff';
    g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fill();
    g.globalAlpha = 1;
  }
  // 冰冻效果
  if (e.slowT > 0 && !d.noSlow){
    g.globalAlpha = 0.3; g.fillStyle = '#7ec3ff';
    g.beginPath(); g.arc(0, 0, r+2, 0, TAU); g.fill();
    g.globalAlpha = 1;
    g.strokeStyle = '#bfe4ff'; g.lineWidth = 2; g.lineCap='round';
    g.save(); g.translate(0, -r-14); g.rotate(t*2);
    for (let i=0;i<3;i++){ g.rotate(Math.PI/3); g.beginPath(); g.moveTo(-6,0); g.lineTo(6,0); g.stroke(); }
    g.restore();
  }
  g.restore();

  // 血条
  const bw = d.boss ? 66 : 40, bh = d.boss ? 8 : 5;
  const bx = e.x - bw/2, by = y - r - (d.boss?26:18);
  g.fillStyle = 'rgba(0,0,0,.4)';
  rr(g, bx-1, by-1, bw+2, bh+2, 3); g.fill();
  const pct = Math.max(0, e.hp/e.maxHp);
  g.fillStyle = pct>0.5 ? '#6fdd51' : (pct>0.25 ? '#ffcf3e' : '#ff5a5a');
  rr(g, bx, by, bw*pct, bh, 2.5); g.fill();
}

/* ================= 绘制：炮塔 ================= */
function drawTowerHead(g, type, lv, angle, o){
  // o: {anim, spin, recoil} —— 以原点为塔心
  const t = o.anim || 0;
  if (type === 'bottle'){
    g.save(); g.rotate(angle);
    const rec = Math.max(0, o.recoil||0)*6;
    g.translate(-rec, 0);
    g.fillStyle = '#ff8a3d'; g.strokeStyle = '#d96a1e'; g.lineWidth = 3;
    rr(g, -16, -12, 38, 24, 11); g.fill(); g.stroke();
    g.fillStyle = '#ffb27a'; rr(g, -10, -8, 18, 7, 3.5); g.fill();
    g.fillStyle = '#b34d12'; g.beginPath(); g.arc(22, 0, 7.5, 0, TAU); g.fill();
    g.fillStyle = '#7a3208'; g.beginPath(); g.arc(22, 0, 4, 0, TAU); g.fill();
    // 尾部叶子
    g.fillStyle = '#67c23a';
    g.beginPath(); g.ellipse(-20, -5, 9, 4.5, -0.5, 0, TAU); g.fill();
    g.beginPath(); g.ellipse(-20, 5, 9, 4.5, 0.5, 0, TAU); g.fill();
    g.restore();
  }
  else if (type === 'fan'){
    g.save();
    g.fillStyle = '#3d87d6'; g.beginPath(); g.arc(0, 0, 20, 0, TAU); g.fill();
    g.fillStyle = '#eaf4ff'; g.beginPath(); g.arc(0, 0, 17, 0, TAU); g.fill();
    g.save(); g.rotate(o.spin||0);
    g.fillStyle = '#5ab0ff';
    for (let i=0;i<3;i++){ g.rotate(TAU/3); g.beginPath(); g.ellipse(0, -9, 5.5, 10, 0, 0, TAU); g.fill(); }
    g.restore();
    g.fillStyle = '#3d87d6'; g.beginPath(); g.arc(0, 0, 5.5, 0, TAU); g.fill();
    g.fillStyle = '#fff'; g.beginPath(); g.arc(-1.5, -1.5, 1.5, 0, TAU); g.fill();
    g.restore();
  }
  else if (type === 'snow'){
    g.save();
    const pulse = 1 + Math.sin(t*3)*0.04;
    g.scale(pulse, pulse);
    g.fillStyle = 'rgba(190,225,255,.9)'; g.strokeStyle = '#7ec3ff'; g.lineWidth = 2.5;
    g.beginPath(); g.arc(0, -4, 18, 0, TAU); g.fill(); g.stroke();
    g.strokeStyle = '#4a9de0'; g.lineWidth = 2.5; g.lineCap = 'round';
    g.save(); g.translate(0, -4); g.rotate(t*0.8);
    for (let i=0;i<6;i++){
      g.rotate(Math.PI/3);
      g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -11); g.stroke();
      g.beginPath(); g.moveTo(-3, -7); g.lineTo(0, -11); g.lineTo(3, -7); g.stroke();
    }
    g.restore();
    g.fillStyle = 'rgba(255,255,255,.85)'; g.beginPath(); g.ellipse(-6, -11, 4.5, 3, -0.6, 0, TAU); g.fill();
    g.restore();
  }
  else if (type === 'rocket'){
    g.save(); g.rotate(angle + Math.PI/2); // 火箭头朝目标
    const rec = Math.max(0, o.recoil||0)*5;
    g.translate(0, rec);
    g.fillStyle = '#ff5a5a'; g.strokeStyle = '#c23838'; g.lineWidth = 2.5;
    rr(g, -10, -22, 20, 36, 9); g.fill(); g.stroke();
    g.fillStyle = '#c23838';
    g.beginPath(); g.moveTo(-10, -18); g.lineTo(0, -32); g.lineTo(10, -18); g.closePath(); g.fill();
    for (const s of [-1,1]){
      g.beginPath(); g.moveTo(s*10, 4); g.lineTo(s*17, 16); g.lineTo(s*10, 13); g.closePath(); g.fill();
    }
    g.fillStyle = '#bfe4ff'; g.strokeStyle = '#fff'; g.lineWidth = 2;
    g.beginPath(); g.arc(0, -8, 5.5, 0, TAU); g.fill(); g.stroke();
    if ((o.recoil||0) > 0.4){
      g.fillStyle = '#ffb23e';
      g.beginPath(); g.moveTo(-6, 14); g.lineTo(0, 26+Math.random()*6); g.lineTo(6, 14); g.closePath(); g.fill();
    }
    g.restore();
  }
  else if (type === 'sun'){
    g.save(); g.rotate(Math.sin(t*1.6)*0.07);
    g.strokeStyle = '#5da344'; g.lineWidth = 5; g.lineCap='round';
    g.beginPath(); g.moveTo(0, 16); g.quadraticCurveTo(3, 4, 0, -6); g.stroke();
    g.fillStyle = '#7fbf5a';
    g.beginPath(); g.ellipse(-8, 8, 8, 4, -0.6, 0, TAU); g.fill();
    g.beginPath(); g.ellipse(8, 10, 8, 4, 0.6, 0, TAU); g.fill();
    g.translate(0, -14);
    g.fillStyle = '#ffd23e'; g.strokeStyle = '#e8a91e'; g.lineWidth = 1.5;
    for (let i=0;i<8;i++){
      const a = i/8*TAU + t*0.3;
      g.beginPath(); g.ellipse(Math.cos(a)*15, Math.sin(a)*15, 8, 5, a, 0, TAU); g.fill(); g.stroke();
    }
    g.fillStyle = '#ff9d2e'; g.strokeStyle = '#d97b12'; g.lineWidth = 2;
    g.beginPath(); g.arc(0, 0, 11, 0, TAU); g.fill(); g.stroke();
    g.fillStyle = '#7a4a10';
    g.beginPath(); g.arc(-4, -2, 1.8, 0, TAU); g.arc(4, -2, 1.8, 0, TAU); g.fill();
    g.strokeStyle = '#7a4a10'; g.lineWidth = 1.8;
    g.beginPath(); g.arc(0, 2, 4, 0.3, Math.PI-0.3); g.stroke();
    g.restore();
  }
}

function drawTower(t){
  const g = ctx;
  // 底座
  g.fillStyle = 'rgba(0,0,0,.12)';
  g.beginPath(); g.ellipse(t.x, t.y+22, 26, 10, 0, 0, TAU); g.fill();
  g.fillStyle = '#d9b98a'; g.strokeStyle = '#a5834f'; g.lineWidth = 3;
  rr(g, t.x-22, t.y+2, 44, 24, 9); g.fill(); g.stroke();
  g.fillStyle = '#c4a06b'; rr(g, t.x-22, t.y+14, 44, 12, 6); g.fill();
  // 底座小表情
  g.fillStyle = '#6b4f2a';
  g.beginPath(); g.arc(t.x-7, t.y+11, 2, 0, TAU); g.arc(t.x+7, t.y+11, 2, 0, TAU); g.fill();
  g.strokeStyle = '#6b4f2a'; g.lineWidth = 1.8;
  g.beginPath(); g.arc(t.x, t.y+14, 4, 0.3, Math.PI-0.3); g.stroke();
  // 塔头
  g.save();
  g.translate(t.x, t.y-10);
  drawTowerHead(g, t.type, t.lv, t.angle, t);
  g.restore();
  // 等级星星
  g.fillStyle = '#ffd23e'; g.strokeStyle = '#d9a520'; g.lineWidth = 1;
  for (let i=0;i<t.lv;i++){
    drawStarPath(g, t.x - (t.lv-1)*7 + i*14, t.y+33, 5.5);
    g.fill(); g.stroke();
  }
}

/* ================= 绘制：萝卜 ================= */
function drawCarrot(){
  const g = ctx, t = game.time;
  const bounce = Math.sin(t*3)*2 + (game.carrotBounce>0 ? Math.sin(game.carrotBounce*Math.PI)*8 : 0);
  const hurt = game.hurtT > 0;
  const x = CARROT_X + (hurt ? Math.sin(t*60)*3 : 0);
  const y = CARROT_Y - bounce;
  g.save();
  g.translate(x, y);
  // 叶子
  g.fillStyle = '#5da344'; g.strokeStyle = '#3f7d2c'; g.lineWidth = 2;
  for (const [a, len] of [[-0.7, 26],[0, 32],[0.7, 26]]){
    g.save(); g.rotate(a + Math.sin(t*2 + a)*0.08);
    g.beginPath(); g.ellipse(0, -44 - len*0.4, 8, len*0.62, 0, 0, TAU); g.fill(); g.stroke();
    g.restore();
  }
  // 身体
  const grad = g.createLinearGradient(0, -40, 0, 42);
  grad.addColorStop(0, '#ff9d3e'); grad.addColorStop(1, '#f0741c');
  g.fillStyle = grad; g.strokeStyle = '#c9581a'; g.lineWidth = 3;
  g.beginPath();
  g.moveTo(-27, -30);
  g.quadraticCurveTo(-30, 8, -8, 38);
  g.quadraticCurveTo(0, 46, 8, 38);
  g.quadraticCurveTo(30, 8, 27, -30);
  g.quadraticCurveTo(0, -44, -27, -30);
  g.closePath(); g.fill(); g.stroke();
  // 纹路
  g.strokeStyle = 'rgba(201,88,26,.55)'; g.lineWidth = 2.5; g.lineCap='round';
  g.beginPath(); g.moveTo(-14, -8); g.quadraticCurveTo(-10, -5, -5, -7); g.stroke();
  g.beginPath(); g.moveTo(6, 8); g.quadraticCurveTo(10, 11, 15, 9); g.stroke();
  g.beginPath(); g.moveTo(-8, 22); g.quadraticCurveTo(-4, 25, 1, 23); g.stroke();
  // 高光
  g.fillStyle = 'rgba(255,255,255,.35)';
  g.beginPath(); g.ellipse(-14, -20, 7, 12, 0.3, 0, TAU); g.fill();
  // 表情
  const mood = game.hp >= 8 ? 'happy' : (game.hp >= 4 ? 'worry' : 'cry');
  drawEyes(g, 0, -16, 10, 5.5, 0.5, 0);
  g.strokeStyle = '#8a3d0f'; g.lineWidth = 2.5; g.lineCap='round';
  if (hurt || mood === 'cry'){
    g.beginPath(); g.arc(0, 2, 6, Math.PI+0.4, -0.4); g.stroke(); // 哭嘴（倒扣）
    g.fillStyle = 'rgba(120,190,255,.9)';
    const tearY = (t*80) % 20;
    for (const s of [-1,1]){ g.beginPath(); g.ellipse(s*13, -8+tearY, 3, 4.5, 0, 0, TAU); g.fill(); }
  } else if (mood === 'worry'){
    g.beginPath(); g.moveTo(-6, 0); g.quadraticCurveTo(0, 3, 6, 0); g.stroke();
    for (const s of [-1,1]){ g.beginPath(); g.moveTo(s*5, -26); g.lineTo(s*14, -23); g.stroke(); }
  } else {
    g.beginPath(); g.arc(0, -2, 7, 0.3, Math.PI-0.3); g.stroke();
    g.fillStyle = 'rgba(255,120,120,.45)';
    for (const s of [-1,1]){ g.beginPath(); g.ellipse(s*17, -6, 5, 3.5, 0, 0, TAU); g.fill(); }
  }
  g.restore();
  // 头顶血量
  const bw = 64, bx = CARROT_X - bw/2, by = CARROT_Y - 92;
  g.fillStyle = 'rgba(0,0,0,.35)'; rr(g, bx-2, by-2, bw+4, 12, 6); g.fill();
  g.fillStyle = game.hp>=6 ? '#6fdd51' : (game.hp>=3 ? '#ffcf3e' : '#ff5a5a');
  rr(g, bx, by, bw*Math.max(0, game.hp/START_HP), 8, 4); g.fill();
  g.font = 'bold 12px "Microsoft YaHei", sans-serif'; g.textAlign='center'; g.textBaseline='middle';
  g.fillStyle = '#fff'; g.strokeStyle='rgba(0,0,0,.4)'; g.lineWidth=3;
  g.strokeText('🥕 '+game.hp, CARROT_X, by-10); g.fillText('🥕 '+game.hp, CARROT_X, by-10);
}

/* ================= 绘制：其他 ================= */
function drawProj(p){
  const g = ctx;
  if (p.kind === 'bullet'){
    g.save(); g.translate(p.x, p.y); g.rotate(p.ang);
    g.fillStyle = '#ffb23e'; g.strokeStyle = '#d9821e'; g.lineWidth = 2;
    g.beginPath(); g.ellipse(0, 0, 8, 5, 0, 0, TAU); g.fill(); g.stroke();
    g.fillStyle = 'rgba(255,220,120,.5)';
    g.beginPath(); g.ellipse(-9, 0, 6, 3, 0, 0, TAU); g.fill();
    g.restore();
  } else if (p.kind === 'blade'){
    g.save(); g.translate(p.x, p.y); g.rotate(p.spin);
    g.fillStyle = 'rgba(120,190,255,.35)'; g.beginPath(); g.arc(0,0,16,0,TAU); g.fill();
    g.fillStyle = '#5ab0ff'; g.strokeStyle = '#2d6db0'; g.lineWidth = 1.5;
    for (let i=0;i<3;i++){ g.rotate(TAU/3); g.beginPath(); g.ellipse(0, -9, 5, 10, 0, 0, TAU); g.fill(); g.stroke(); }
    g.fillStyle = '#fff'; g.beginPath(); g.arc(0,0,4,0,TAU); g.fill();
    g.restore();
  } else if (p.kind === 'rocket'){
    g.save(); g.translate(p.x, p.y); g.rotate(p.ang + Math.PI/2);
    g.fillStyle = '#ff5a5a'; g.strokeStyle = '#c23838'; g.lineWidth = 2;
    rr(g, -6, -12, 12, 20, 6); g.fill(); g.stroke();
    g.fillStyle = '#c23838'; g.beginPath(); g.moveTo(-6,-9); g.lineTo(0,-18); g.lineTo(6,-9); g.closePath(); g.fill();
    g.fillStyle = '#ffb23e'; g.beginPath(); g.moveTo(-4,8); g.lineTo(0,16+Math.random()*5); g.lineTo(4,8); g.closePath(); g.fill();
    g.restore();
  }
}

function drawPart(p){
  const g = ctx, k = p.t/p.life;
  g.globalAlpha = 1-k;
  if (p.type === 'puff'){
    g.fillStyle = '#fff';
    g.beginPath(); g.arc(p.x, p.y, (p.r||6)*(1+k), 0, TAU); g.fill();
  } else if (p.type === 'smoke'){
    g.fillStyle = '#bbb';
    g.beginPath(); g.arc(p.x, p.y, (p.r||4)*(1+k*2), 0, TAU); g.fill();
  } else if (p.type === 'spark'){
    g.fillStyle = '#ffd23e';
    g.beginPath(); g.arc(p.x, p.y, 3.5*(1-k*0.5), 0, TAU); g.fill();
  } else if (p.type === 'ring'){
    g.strokeStyle = p.col || '#fff'; g.lineWidth = 4*(1-k)+1;
    g.beginPath(); g.arc(p.x, p.y, p.r0 + (p.r1-p.r0)*k, 0, TAU); g.stroke();
  } else if (p.type === 'flash'){
    g.fillStyle = 'rgba(255,220,140,.8)';
    g.beginPath(); g.arc(p.x, p.y, p.r*(0.5+k*0.5), 0, TAU); g.fill();
  } else if (p.type === 'coin'){
    g.fillStyle = '#ffd23e'; g.strokeStyle = '#d9a520'; g.lineWidth = 2;
    g.beginPath(); g.arc(p.x, p.y, 6, 0, TAU); g.fill(); g.stroke();
    g.strokeStyle = '#b8860b'; g.lineWidth = 1.5;
    g.beginPath(); g.arc(p.x, p.y, 3, 0, TAU); g.stroke();
  } else if (p.type === 'chunk'){
    g.fillStyle = '#ff8a3d';
    g.beginPath(); g.arc(p.x, p.y, 5*(1-k*0.4), 0, TAU); g.fill();
  } else if (p.type === 'heart'){
    g.fillStyle = '#ff6b81';
    const s = 8*(1+k*0.5);
    g.save(); g.translate(p.x, p.y);
    g.beginPath();
    g.moveTo(0, s*0.35);
    g.bezierCurveTo(-s, -s*0.45, -s*0.45, -s*1.1, 0, -s*0.35);
    g.bezierCurveTo(s*0.45, -s*1.1, s, -s*0.45, 0, s*0.35);
    g.fill(); g.restore();
  }
  g.globalAlpha = 1;
}

function drawChest(){
  const g = ctx, ch = game.chest, t = game.time;
  const wob = Math.sin(t*5)*0.06;
  const scale = 1 + Math.sin(t*5)*0.05;
  g.save(); g.translate(ch.x, ch.y); g.rotate(wob); g.scale(scale, scale);
  g.fillStyle = 'rgba(0,0,0,.15)'; g.beginPath(); g.ellipse(0, 22, 24, 8, 0, 0, TAU); g.fill();
  g.fillStyle = '#ff6b81'; g.strokeStyle = '#d14a63'; g.lineWidth = 3;
  rr(g, -20, -10, 40, 30, 6); g.fill(); g.stroke();
  rr(g, -24, -18, 48, 14, 6); g.fill(); g.stroke();
  g.fillStyle = '#ffd23e';
  rr(g, -5, -18, 10, 38, 3); g.fill();
  // 蝴蝶结
  g.fillStyle = '#ffd23e'; g.strokeStyle = '#d9a520'; g.lineWidth = 2;
  for (const s of [-1,1]){ g.beginPath(); g.ellipse(s*9, -24, 8, 5.5, s*0.5, 0, TAU); g.fill(); g.stroke(); }
  g.beginPath(); g.arc(0, -23, 4, 0, TAU); g.fill();
  // 闪光
  const sp = (t*3)%1;
  g.globalAlpha = 1-sp;
  g.fillStyle = '#fff'; drawStarPath(g, 16, -26, 5+sp*4); g.fill();
  g.globalAlpha = 1;
  g.restore();
  // 倒计时
  g.strokeStyle = 'rgba(255,255,255,.9)'; g.lineWidth = 3.5;
  g.beginPath(); g.arc(ch.x, ch.y, 32, -Math.PI/2, -Math.PI/2 + TAU*(ch.life/ch.max)); g.stroke();
}

function drawTowerIcon(g, key, x, y, s){
  g.save(); g.translate(x, y); g.scale(s, s);
  drawTowerHead(g, key, 1, key==='bottle' ? -0.5 : -Math.PI/2, {anim:1.2, spin:0.8, recoil:0});
  g.restore();
}

function drawMenu(){
  const g = ctx, m = game.menu;
  g.fillStyle = 'rgba(0,0,0,.25)';
  g.fillRect(0, 0, W, H);
  if (m.kind === 'build'){
    // 中心格高亮
    g.fillStyle = 'rgba(255,255,255,.25)';
    rr(g, m.c*CELL+3, m.r*CELL+3, CELL-6, CELL-6, 10); g.fill();
    m.items.forEach((it, i) => {
      const def = TOWERS[it.key];
      const afford = game.gold >= def.costs[0];
      const hov = game.menuHover === i;
      // 范围预览
      if (hov && def.range[0] > 0){
        g.fillStyle = 'rgba(120,220,120,.18)'; g.strokeStyle = 'rgba(120,220,120,.6)'; g.lineWidth = 2;
        g.beginPath(); g.arc((m.c+0.5)*CELL, (m.r+0.5)*CELL, def.range[0], 0, TAU); g.fill(); g.stroke();
      }
      const R = it.r + (hov?4:0);
      g.fillStyle = afford ? '#fffbe8' : '#d8d4c8';
      g.strokeStyle = hov ? '#ffb23e' : '#c9a36b'; g.lineWidth = hov ? 4 : 3;
      g.beginPath(); g.arc(it.x, it.y, R, 0, TAU); g.fill(); g.stroke();
      if (!afford) g.globalAlpha = 0.45;
      drawTowerIcon(g, it.key, it.x, it.y + (it.key==='sun'?10:4), 0.72);
      g.globalAlpha = 1;
      // 价格
      g.fillStyle = afford ? '#f0fae8' : '#f0e8e8';
      rr(g, it.x-22, it.y+R-6, 44, 17, 8); g.fill();
      g.strokeStyle = afford ? '#7fbf5a' : '#cc8888'; g.lineWidth = 2;
      rr(g, it.x-22, it.y+R-6, 44, 17, 8); g.stroke();
      g.font = 'bold 12px "Microsoft YaHei", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillStyle = afford ? '#3f7d2c' : '#a33';
      g.fillText('💰'+def.costs[0], it.x, it.y+R+3);
      if (hov){
        // 名称提示
        const ty = m.cy - 138;
        g.font = 'bold 16px "Microsoft YaHei", sans-serif';
        const info = def.name + '：' + def.desc;
        const tw = g.measureText(info).width + 24;
        g.fillStyle = 'rgba(60,40,20,.85)';
        rr(g, m.cx - tw/2, ty-14, tw, 30, 15); g.fill();
        g.fillStyle = '#ffe8b0';
        g.fillText(info, m.cx, ty+1);
      }
    });
  } else {
    const t = m.tower, def = TOWERS[t.type];
    // 攻击范围
    if (def.range[t.lv-1] > 0){
      g.fillStyle = 'rgba(120,220,120,.15)'; g.strokeStyle = 'rgba(120,220,120,.55)'; g.lineWidth = 2;
      g.beginPath(); g.arc(t.x, t.y, def.range[t.lv-1], 0, TAU); g.fill(); g.stroke();
    }
    m.items.forEach((it, i) => {
      const hov = game.menuHover === i;
      const isUp = it.key === 'upgrade';
      const cost = isUp ? def.costs[t.lv] : Math.floor(towerInvested(t)*0.7);
      const afford = !isUp || game.gold >= cost;
      const R = it.r + (hov?4:0);
      g.fillStyle = afford ? '#fffbe8' : '#d8d4c8';
      g.strokeStyle = hov ? '#ffb23e' : '#c9a36b'; g.lineWidth = hov?4:3;
      g.beginPath(); g.arc(it.x, it.y, R, 0, TAU); g.fill(); g.stroke();
      g.font = 'bold 20px "Microsoft YaHei", sans-serif'; g.textAlign='center'; g.textBaseline='middle';
      g.fillText(isUp ? '⬆️' : '💰', it.x, it.y-6);
      g.font = 'bold 12px "Microsoft YaHei", sans-serif';
      g.fillStyle = afford ? '#3f7d2c' : '#a33';
      g.fillText(isUp ? '-'+cost : '+'+cost, it.x, it.y+14);
    });
    // 名称牌
    g.font = 'bold 15px "Microsoft YaHei", sans-serif'; g.textAlign='center'; g.textBaseline='middle';
    const label = def.name + ' Lv.' + t.lv + (t.lv>=3?' (满级)':'');
    const tw = g.measureText(label).width + 24;
    g.fillStyle = 'rgba(60,40,20,.85)';
    rr(g, t.x - tw/2, m.cy - 122, tw, 28, 14); g.fill();
    g.fillStyle = '#ffe8b0'; g.fillText(label, t.x, m.cy - 108);
  }
}

/* ================= 主绘制 ================= */
function render(){
  ctx.clearRect(0, 0, W, H);
  ctx.save();
  if (game.shake > 0){
    ctx.translate((Math.random()-0.5)*game.shake*16, (Math.random()-0.5)*game.shake*16);
  }
  ctx.drawImage(bgCanvas, 0, 0);

  // 悬停高亮
  if (game.state === 'playing' && !game.menu && game.hover){
    const [c,r] = game.hover;
    if (cellBuildable(c,r)){
      ctx.fillStyle = 'rgba(255,255,255,.22)';
      ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 2.5;
      rr(ctx, c*CELL+3, r*CELL+3, CELL-6, CELL-6, 10); ctx.fill(); ctx.stroke();
    } else if (game.towerMap[c+','+r]){
      const t = game.towerMap[c+','+r], def = TOWERS[t.type];
      if (def.range[t.lv-1] > 0){
        ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 2;
        ctx.setLineDash([6,6]);
        ctx.beginPath(); ctx.arc(t.x, t.y, def.range[t.lv-1], 0, TAU); ctx.stroke();
        ctx.setLineDash([]);
      }
    }
  }

  drawCarrot();
  if (game.chest) drawChest();
  for (const t of game.towers) drawTower(t);
  for (const e of [...game.enemies].sort((a,b)=>a.y-b.y)) drawEnemy(e);
  for (const p of game.projs) drawProj(p);
  for (const p of game.parts) drawPart(p);

  // 浮动文字
  for (const f of game.floats){
    const k = f.t/f.life;
    ctx.globalAlpha = 1 - k*k;
    ctx.font = `bold ${f.gold?17:14}px "Microsoft YaHei", sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.lineWidth = 3;
    ctx.strokeText(f.txt, f.x, f.y);
    ctx.fillStyle = f.col;
    ctx.fillText(f.txt, f.x, f.y);
    ctx.globalAlpha = 1;
  }

  if (game.menu) drawMenu();

  // 波次横幅
  if (game.state==='playing' && game.phase==='wave' && game.spawnT < 2){
    const k = game.spawnT/2;
    ctx.globalAlpha = k<0.15 ? k/0.15 : (k>0.8 ? (1-k)/0.2 : 1);
    ctx.font = 'bold 42px "Microsoft YaHei", sans-serif';
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.strokeStyle = 'rgba(120,60,10,.9)'; ctx.lineWidth = 8;
    const isBossWave = game.wave % 5 === 0;
    const txt = isBossWave ? `⚠️ 第 ${game.wave} 波 · Boss来袭！` : `第 ${game.wave} / ${TOTAL_WAVES} 波`;
    ctx.strokeText(txt, W/2, H*0.32);
    ctx.fillStyle = isBossWave ? '#ffcf3e' : '#fff';
    ctx.fillText(txt, W/2, H*0.32);
    ctx.globalAlpha = 1;
  }

  // 暂停遮罩
  if (game.paused && game.state==='playing'){
    ctx.fillStyle = 'rgba(0,0,0,.4)';
    ctx.fillRect(0,0,W,H);
    ctx.font = 'bold 48px "Microsoft YaHei", sans-serif';
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillStyle = '#fff';
    ctx.fillText('⏸️ 暂停中', W/2, H/2);
  }
  ctx.restore();
}

/* ================= 主循环 ================= */
let lastT = performance.now();
function step(now){
  let dt = Math.min(0.05, (now - lastT)/1000);
  lastT = now;
  if (game.state === 'playing' && !game.paused){
    for (let i=0;i<game.spd;i++) update(dt);
  } else if (game.state !== 'playing'){
    game.time += dt; // 背景动画继续
  }
  tickBGM();
  syncHUD();
  render();
}
function loop(now){
  requestAnimationFrame(loop);
  step(now);
}
requestAnimationFrame(loop);
// rAF 停摆时（如嵌入式环境节流）用定时器兜底，避免游戏卡死
setInterval(() => {
  const now = performance.now();
  if (now - lastT > 120) step(now);
}, 40);
// 切出标签页时自动暂停，避免后台偷跑和响音乐
document.addEventListener('visibilitychange', () => {
  if (document.hidden && game.state === 'playing' && !game.paused){
    game.paused = true;
    $('pauseBtn').textContent = '▶️';
  }
});

// 调试口
window.G = { game, buildTower, upgradeTower, TOWERS, ENEMIES, startWave };
})();
