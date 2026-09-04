/* ============================================================
   🥕 保卫萝卜大作战 v2 —— 纯 Canvas 手绘塔防
   4 张地图 · 9 种炮塔 · 13 种怪物 · 主动技能 · 障碍物 · 难度 · 无尽
   ============================================================ */
(() => {
'use strict';

/* ================= 基础配置 ================= */
const COLS = 12, ROWS = 8, CELL = 80;
const W = COLS * CELL, H = ROWS * CELL;
const START_HP = 10;
const TAU = Math.PI*2;

/* ================= 地图 ================= */
const MAPS = [
  {
    id:'meadow', name:'青青草原', icon:'🌳', theme:'grass', waves:20, gold:280, hpMul:1.0,
    desc:'单入口，绕山路，入门友好',
    paths:[[[0,1],[1,1],[2,1],[3,1],[3,2],[3,3],[2,3],[1,3],[1,4],[1,5],[2,5],[3,5],[4,5],[5,5],[5,4],[5,3],[6,3],[6,2],[6,1],[7,1],[8,1],[8,2],[8,3],[8,4],[8,5],[9,5],[10,5]]],
    carrot:[11,5],
    obstacles:[[10,0,'tree'],[11,0,'tree'],[11,1,'tree'],[0,6,'rock'],[0,7,'rock'],[5,0,'rock'],[9,2,'crate'],[4,7,'tree']],
  },
  {
    id:'desert', name:'沙漠绿洲', icon:'🌵', theme:'desert', waves:25, gold:300, hpMul:1.05,
    desc:'超长蛇形路，考验火力布局',
    paths:[[[1,0],[1,1],[1,2],[1,3],[1,4],[1,5],[1,6],[2,6],[3,6],[4,6],[4,5],[4,4],[4,3],[4,2],[4,1],[5,1],[6,1],[7,1],[7,2],[7,3],[7,4],[7,5],[7,6],[8,6],[9,6],[10,6],[10,5],[10,4],[10,3]]],
    carrot:[10,2],
    obstacles:[[0,0,'rock'],[11,0,'rock'],[11,7,'rock'],[6,3,'crate'],[9,1,'cactus'],[2,7,'cactus'],[11,3,'cactus'],[5,7,'crate'],[2,2,'cactus'],[9,3,'rock']],
  },
  {
    id:'snow', name:'冰雪王国', icon:'❄️', theme:'snow', waves:30, gold:320, hpMul:1.1,
    desc:'双入口！南边小路直通萝卜',
    paths:[
      [[0,3],[1,3],[2,3],[2,2],[2,1],[3,1],[4,1],[5,1],[5,2],[5,3],[5,4],[6,4],[7,4],[8,4],[9,4]],
      [[4,7],[5,7],[6,7],[6,6],[7,6],[8,6],[8,5],[8,4],[9,4]],
    ],
    carrot:[10,4],
    obstacles:[[0,0,'ice'],[11,0,'ice'],[0,7,'ice'],[11,7,'tree'],[3,5,'ice'],[10,1,'tree'],[1,6,'crate'],[10,6,'ice'],[7,2,'rock'],[11,3,'crate']],
  },
  {
    id:'lava', name:'熔岩地狱', icon:'🌋', theme:'lava', waves:30, gold:360, hpMul:1.15,
    desc:'双入口 + 短路，怪物很凶',
    paths:[
      [[5,0],[5,1],[5,2],[4,2],[3,2],[2,2],[2,3],[2,4],[2,5],[3,5],[4,5],[5,5],[6,5],[7,5],[8,5],[8,4],[8,3],[9,3]],
      [[11,7],[10,7],[9,7],[8,7],[8,6],[8,5],[8,4],[8,3],[9,3]],
    ],
    carrot:[10,3],
    obstacles:[[0,0,'magma'],[11,0,'magma'],[0,7,'magma'],[3,7,'magma'],[6,7,'crate'],[10,5,'magma'],[11,1,'crate'],[7,1,'magma'],[0,4,'magma'],[10,1,'magma'],[4,3,'crate']],
  },
];
const THEMES = {
  grass:  { tiles:['#a9d97c','#9ed06f'], road:['#a97f4f','#e6c288'], sky:'#8fd3f4' },
  desert: { tiles:['#ecd79f','#e4cd92'], road:['#a5773f','#d4a86a'], sky:'#f7d9a0' },
  snow:   { tiles:['#e6f1fa','#d8e8f5'], road:['#7f96ad','#b9cbdc'], sky:'#cfe6f7' },
  lava:   { tiles:['#5b4046','#523a40'], road:['#8c6f5c','#c9a58a'], sky:'#6b3a3a' },
};
const OBS_KINDS = {
  tree:   { name:'大树',   hp:120, gold:30 },
  rock:   { name:'石头',   hp:200, gold:45 },
  cactus: { name:'仙人掌', hp:100, gold:30 },
  ice:    { name:'冰晶',   hp:160, gold:40 },
  magma:  { name:'熔岩石', hp:220, gold:55 },
  crate:  { name:'宝箱',   hp:60,  gold:90 },
};
const DIFFS = {
  easy:      { name:'轻松', hp:0.75, speed:0.9,  count:0.8, gold:1.15, prep:15, cls:'' },
  normal:    { name:'普通', hp:1.0,  speed:1.0,  count:1.0, gold:1.0,  prep:12, cls:'' },
  hard:      { name:'困难', hp:1.4,  speed:1.08, count:1.2, gold:0.9,  prep:10, cls:'' },
  nightmare: { name:'噩梦', hp:1.9,  speed:1.16, count:1.4, gold:0.8,  prep:8,  cls:'nm' },
};

/* ================= 炮塔 / 怪物数据 ================= */
const TOWERS = {
  bottle: { name:'萝卜瓶', desc:'连射萝卜籽，攻速快',        costs:[100,120,160], dmg:[18,32,52],   range:[150,165,185], cd:0.55 },
  fan:    { name:'小风扇', desc:'飞出扇叶，穿透一排怪',      costs:[160,190,240], dmg:[16,28,46],   range:[175,190,205], cd:1.15 },
  snow:   { name:'雪花球', desc:'冰冻脉冲，减速周围怪',      costs:[140,170,210], dmg:[6,10,16],    range:[115,130,145], cd:1.5, slow:[0.42,0.52,0.62] },
  rocket: { name:'小火箭', desc:'轰隆爆炸，范围伤害',        costs:[220,270,340], dmg:[55,95,160],  range:[205,220,235], cd:1.7, splash:[70,82,95] },
  tesla:  { name:'电击球', desc:'连锁闪电，一次电好几只',    costs:[180,230,300], dmg:[24,42,70],   range:[160,175,190], cd:1.0, chain:[3,4,6] },
  poison: { name:'毒蘑菇', desc:'喷毒孢子持续掉血，无视护甲', costs:[170,210,270], dmg:[12,20,32],   range:[140,155,170], cd:1.3 },
  star:   { name:'星星炮', desc:'超远狙击，高伤害可暴击',    costs:[260,330,420], dmg:[140,260,440],range:[300,330,360], cd:2.6 },
  magnet: { name:'大磁铁', desc:'把周围怪物推回去',          costs:[190,240,310], dmg:[8,14,22],    range:[120,135,150], cd:3.0, push:[70,100,140] },
  sun:    { name:'太阳花', desc:'不攻击，定时产出金币',      costs:[150,210,280], gold:[14,24,40],  range:[0,0,0],       cd:8 },
};
const TOWER_KEYS = Object.keys(TOWERS);

const ENEMIES = {
  bean:     { name:'豆豆怪',   icon:'🟢', hp:55,   speed:55,  gold:12,  r:20 },
  bat:      { name:'蝙蝠仔',   icon:'🦇', hp:42,   speed:92,  gold:14,  r:17, fly:true },
  thief:    { name:'偷金鼠',   icon:'🐭', hp:70,   speed:105, gold:20,  r:17, steal:30 },
  pig:      { name:'胖胖猪',   icon:'🐷', hp:175,  speed:36,  gold:26,  r:25 },
  slime:    { name:'史莱姆',   icon:'🫧', hp:120,  speed:48,  gold:18,  r:22, split:'slimelet' },
  slimelet: { name:'小史莱姆', icon:'💧', hp:40,   speed:72,  gold:5,   r:13 },
  ghost:    { name:'小幽灵',   icon:'👻', hp:92,   speed:62,  gold:22,  r:19, noSlow:true },
  knight:   { name:'铁甲骑士', icon:'🛡️', hp:260,  speed:34,  gold:34,  r:23, armor:10 },
  mole:     { name:'钻地鼠',   icon:'🕳️', hp:140,  speed:50,  gold:28,  r:20, burrow:true },
  healer:   { name:'治疗精灵', icon:'💗', hp:110,  speed:44,  gold:30,  r:19, heal:true },
  boss:     { name:'大魔王',   icon:'👿', hp:950,  speed:28,  gold:160, r:33, boss:true, dmg:3 },
  dragon:   { name:'喷火龙',   icon:'🐲', hp:1500, speed:34,  gold:240, r:36, boss:true, fly:true, dmg:3, summon:{type:'bat', n:2, every:7} },
  king:     { name:'终极魔王', icon:'👑', hp:3200, speed:26,  gold:500, r:40, boss:true, dmg:5, armor:8, rage:true, summon:{type:'knight', n:1, every:10} },
};

const SKILLS = {
  fire:   { name:'陨石', cd:30, radius:95 },
  freeze: { name:'冻结', cd:45, dur:3 },
  heal:   { name:'修复', cd:25, cost:120 },
};

/* ================= 工具 ================= */
const $ = id => document.getElementById(id);
const clamp = (v,a,b) => v<a?a:(v>b?b:v);
const dist2 = (ax,ay,bx,by) => (ax-bx)*(ax-bx)+(ay-by)*(ay-by);
function mulberry32(a){ return function(){ a|=0; a=a+0x6D2B79F5|0; let t=Math.imul(a^a>>>15,1|a); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; }
const FONT = '"Microsoft YaHei", "PingFang SC", sans-serif';

/* ================= 存档 ================= */
const SAVE_KEY = 'carrot_td_v2';
let records = {};
try { records = JSON.parse(localStorage.getItem(SAVE_KEY) || '{}') || {}; } catch(e){ records = {}; }
function saveRecord(mapId, diff, endless, wave, stars){
  const k = mapId + '_' + diff + (endless?'_e':'');
  const r = records[k] || { wave:0, stars:0 };
  r.wave = Math.max(r.wave, wave); r.stars = Math.max(r.stars, stars);
  records[k] = r;
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(records)); } catch(e){}
}

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
      case 'bigfreeze': [900,1200,1500,1800].forEach((f,i)=>this.tone(f,f*1.3,0.3,'sine',0.06,i*0.07)); break;
      case 'coin':   this.tone(900,900,0.07,'sine',0.06); this.tone(1350,1350,0.12,'sine',0.06,0.07); break;
      case 'pop':    this.tone(500,140,0.14,'triangle',0.07); break;
      case 'hurt':   this.tone(300,70,0.35,'sawtooth',0.1); break;
      case 'build':  this.tone(240,480,0.12,'triangle',0.08); this.tone(480,720,0.1,'triangle',0.06,0.1); break;
      case 'ui':     this.tone(650,900,0.06,'sine',0.05); break;
      case 'upgrade':this.tone(520,1040,0.18,'triangle',0.08); break;
      case 'zap':    this.tone(1800,300,0.12,'sawtooth',0.05); this.tone(2400,400,0.08,'square',0.03,0.02); break;
      case 'spore':  this.tone(300,180,0.12,'sine',0.05); break;
      case 'snipe':  this.tone(1400,200,0.2,'square',0.06); break;
      case 'magnet': this.tone(200,90,0.3,'sine',0.09); this.tone(400,180,0.25,'triangle',0.05,0.05); break;
      case 'crack':  this.tone(220,90,0.15,'square',0.07); this.tone(600,200,0.1,'triangle',0.05,0.05); break;
      case 'steal':  this.tone(700,300,0.15,'sawtooth',0.07); this.tone(500,200,0.15,'sawtooth',0.06,0.12); break;
      case 'meteor': this.tone(80,30,0.6,'sawtooth',0.18); this.tone(200,40,0.5,'square',0.1,0.05); break;
      case 'win':    [523,659,784,1046].forEach((f,i)=>this.tone(f,f,0.25,'triangle',0.09,i*0.16)); break;
      case 'lose':   [392,330,262,196].forEach((f,i)=>this.tone(f,f*0.9,0.3,'sawtooth',0.07,i*0.2)); break;
    }
  }
};
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

/* ================= 当前地图运行时 ================= */
let MP = null;          // { map, theme, paths:[{cells,wps,len,dir}], pathSet, carrotKey, cx, cy }
let DIFF = DIFFS.normal;
const bgCanvas = document.createElement('canvas');
bgCanvas.width = W; bgCanvas.height = H;

function buildMap(map){
  const paths = map.paths.map(cells => {
    const wps = [];
    const [c0,r0] = cells[0], [c1,r1] = cells[1];
    const dx = Math.sign(c1-c0), dy = Math.sign(r1-r0);
    wps.push([(c0+0.5)*CELL - dx*70, (r0+0.5)*CELL - dy*70]);
    for (const [c,r] of cells) wps.push([(c+0.5)*CELL, (r+0.5)*CELL]);
    const [cl,rl] = cells[cells.length-1];
    const ex = Math.sign(map.carrot[0]-cl), ey = Math.sign(map.carrot[1]-rl);
    wps.push([(map.carrot[0]+0.5)*CELL - ex*28, (map.carrot[1]+0.5)*CELL - ey*28]);
    let len = 0;
    for (let i=1;i<wps.length;i++) len += Math.hypot(wps[i][0]-wps[i-1][0], wps[i][1]-wps[i-1][1]);
    return { cells, wps, len, dir:[dx,dy] };
  });
  const pathSet = new Set();
  map.paths.forEach(p => p.forEach(c => pathSet.add(c.join(','))));
  MP = {
    map, theme:THEMES[map.theme], paths, pathSet,
    carrotKey: map.carrot.join(','),
    cx:(map.carrot[0]+0.5)*CELL, cy:(map.carrot[1]+0.5)*CELL,
  };
  drawBG();
}

/* ================= 背景（预渲染） ================= */
function drawBG(){
  const g = bgCanvas.getContext('2d');
  const th = MP.theme, kind = MP.map.theme;
  const rnd = mulberry32(20260708 + MAPS.indexOf(MP.map)*77);
  g.clearRect(0,0,W,H);
  for (let r=0;r<ROWS;r++) for (let c=0;c<COLS;c++){
    g.fillStyle = (c+r)%2===0 ? th.tiles[0] : th.tiles[1];
    g.fillRect(c*CELL, r*CELL, CELL, CELL);
  }
  // 点缀
  for (let i=0;i<110;i++){
    const x = rnd()*W, y = rnd()*H;
    const c = Math.floor(x/CELL), r = Math.floor(y/CELL);
    if (MP.pathSet.has(c+','+r) || (c+','+r)===MP.carrotKey) continue;
    if (kind === 'grass'){
      if (rnd() < 0.75) {
        g.strokeStyle = 'rgba(80,150,50,.5)'; g.lineWidth = 2; g.lineCap='round';
        for (let k=-1;k<=1;k++){ g.beginPath(); g.moveTo(x+k*3,y); g.quadraticCurveTo(x+k*4,y-5,x+k*5,y-9); g.stroke(); }
      } else {
        const col = ['#ffb3c7','#ffe08a','#c9a7ff','#ffffff'][Math.floor(rnd()*4)];
        for (let p=0;p<5;p++){ const a=p/5*TAU; g.fillStyle=col; g.beginPath(); g.ellipse(x+Math.cos(a)*4,y+Math.sin(a)*4,3,3,0,0,TAU); g.fill(); }
        g.fillStyle = '#ffd23e'; g.beginPath(); g.arc(x,y,2.6,0,TAU); g.fill();
      }
    } else if (kind === 'desert'){
      if (rnd() < 0.6){
        g.fillStyle = 'rgba(160,120,60,.35)';
        g.beginPath(); g.ellipse(x, y, 4+rnd()*3, 2.5+rnd()*2, rnd()*3, 0, TAU); g.fill();
      } else if (rnd() < 0.6){
        g.strokeStyle = 'rgba(150,110,50,.5)'; g.lineWidth = 2; g.lineCap='round';
        for (let k=-1;k<=1;k++){ g.beginPath(); g.moveTo(x+k*3,y); g.lineTo(x+k*6,y-8-rnd()*3); g.stroke(); }
      } else {
        g.fillStyle = 'rgba(255,255,255,.45)'; g.beginPath(); g.arc(x,y,2,0,TAU); g.fill();
      }
    } else if (kind === 'snow'){
      if (rnd() < 0.6){
        g.fillStyle = 'rgba(255,255,255,.8)';
        g.beginPath(); g.ellipse(x, y, 7+rnd()*6, 3+rnd()*2, 0, 0, TAU); g.fill();
      } else if (rnd() < 0.5){
        g.fillStyle = '#7fa66a';
        g.beginPath(); g.moveTo(x, y-12); g.lineTo(x+7, y+2); g.lineTo(x-7, y+2); g.closePath(); g.fill();
        g.fillStyle = 'rgba(255,255,255,.85)';
        g.beginPath(); g.moveTo(x, y-12); g.lineTo(x+4, y-4); g.lineTo(x-4, y-4); g.closePath(); g.fill();
      } else {
        g.strokeStyle = 'rgba(160,200,235,.7)'; g.lineWidth = 1.5;
        for (let k=0;k<3;k++){ const a=k*Math.PI/3; g.beginPath(); g.moveTo(x-Math.cos(a)*4,y-Math.sin(a)*4); g.lineTo(x+Math.cos(a)*4,y+Math.sin(a)*4); g.stroke(); }
      }
    } else if (kind === 'lava'){
      if (rnd() < 0.55){
        g.strokeStyle = 'rgba(255,120,40,.55)'; g.lineWidth = 2; g.lineCap='round';
        g.beginPath(); g.moveTo(x-8, y); g.lineTo(x-2, y-4+rnd()*8); g.lineTo(x+4, y+2); g.lineTo(x+9, y-3); g.stroke();
      } else if (rnd() < 0.5){
        g.fillStyle = 'rgba(255,170,60,.7)'; g.beginPath(); g.arc(x,y,2+rnd()*2,0,TAU); g.fill();
      } else {
        g.fillStyle = 'rgba(0,0,0,.18)'; g.beginPath(); g.ellipse(x,y,6,3.5,rnd()*3,0,TAU); g.fill();
      }
    }
  }
  // 道路
  g.lineJoin='round'; g.lineCap='round';
  for (const p of MP.paths){
    const strokePath = (w,col)=>{
      g.strokeStyle=col; g.lineWidth=w;
      g.beginPath(); g.moveTo(p.wps[0][0],p.wps[0][1]);
      for(let i=1;i<p.wps.length;i++) g.lineTo(p.wps[i][0],p.wps[i][1]);
      g.stroke();
    };
    strokePath(66, th.road[0]);
    strokePath(56, th.road[1]);
  }
  for (const p of MP.paths){
    for (let i=1;i<p.wps.length-1;i++){
      const [x,y]=p.wps[i];
      g.fillStyle = kind==='snow' ? 'rgba(255,255,255,.4)' : 'rgba(0,0,0,.14)';
      g.beginPath(); g.arc(x+(rnd()-0.5)*20, y+(rnd()-0.5)*20, 3+rnd()*2, 0, TAU); g.fill();
    }
  }
  // 入口山洞 + 木牌
  for (const p of MP.paths){
    const ex = clamp(p.wps[0][0], 0, W), ey = clamp(p.wps[0][1], 0, H);
    const a = Math.atan2(p.dir[1], p.dir[0]);
    g.save(); g.translate(ex, ey); g.rotate(a);
    g.fillStyle = kind==='lava' ? '#3a2020' : '#6b4f35'; g.beginPath(); g.arc(0,0,40,-Math.PI/2,Math.PI/2); g.fill();
    g.fillStyle = kind==='lava' ? '#1a0a0a' : '#3a2a1a'; g.beginPath(); g.arc(0,0,28,-Math.PI/2,Math.PI/2); g.fill();
    g.fillStyle = kind==='snow' ? '#e8f3fb' : (kind==='lava' ? '#ff7a3a' : (kind==='desert' ? '#d6b678' : '#7fbf5a'));
    for(let i=0;i<5;i++){ g.beginPath(); g.arc(6, -40+i*18, 9, 0, TAU); g.fill(); }
    g.restore();
    // 木牌
    const sx = clamp(ex + p.dir[0]*30 + (p.dir[0]===0 ? 52 : 0), 36, W-36);
    const sy = clamp(ey + p.dir[1]*30 + (p.dir[1]===0 ? -52 : 0), 26, H-26);
    g.save(); g.translate(sx, sy); g.rotate(-0.06);
    g.fillStyle='#8a5a33'; rr(g,-4,10,8,22,3); g.fill();
    g.fillStyle='#c98d54'; rr(g,-30,-12,60,26,8); g.fill();
    g.strokeStyle='#8a5a33'; g.lineWidth=3; rr(g,-30,-12,60,26,8); g.stroke();
    g.fillStyle='#5b3a1e'; g.font='bold 14px '+FONT; g.textAlign='center'; g.textBaseline='middle';
    g.fillText('入口', 0, 2);
    g.restore();
  }
  // 萝卜家的土堆
  g.fillStyle = kind==='snow' ? '#d8c3a5' : '#c98d54'; g.beginPath(); g.ellipse(MP.cx, MP.cy+22, 42, 20, 0, 0, TAU); g.fill();
  g.fillStyle = kind==='snow' ? '#b89c78' : '#b3763f'; g.beginPath(); g.ellipse(MP.cx, MP.cy+22, 42, 20, 0, 0, Math.PI); g.fill();
}

/* ================= 游戏状态 ================= */
const game = {
  state:'menu', time:0, spd:1, paused:false,
  gold:0, hp:START_HP, wave:0, phase:'prep', prepT:15,
  spawnQ:[], spawnT:0, spawnN:0,
  enemies:[], towers:[], towerMap:{}, projs:[], parts:[], floats:[], obs:[],
  menu:null, menuHover:-1, hover:null, mx:0, my:0,
  chest:null, chestT:16,
  shake:0, hurtT:0, carrotBounce:0, freezeT:0,
  kills:0, goldEarned:0, obsBroken:0,
  skillCd:{fire:0, freeze:0, heal:0}, aim:null,
  endless:false, diffKey:'normal', mapIdx:0,
};

function resetGame(){
  const map = MAPS[game.mapIdx];
  DIFF = DIFFS[game.diffKey];
  buildMap(map);
  Object.assign(game, {
    state:'playing', time:0, paused:false,
    gold:map.gold, hp:START_HP, wave:0, phase:'prep', prepT:15,
    spawnQ:[], spawnT:0, spawnN:0,
    enemies:[], towers:[], towerMap:{}, projs:[], parts:[], floats:[], obs:[],
    menu:null, menuHover:-1, hover:null,
    chest:null, chestT:16,
    shake:0, hurtT:0, carrotBounce:0, freezeT:0,
    kills:0, goldEarned:0, obsBroken:0,
    skillCd:{fire:0, freeze:0, heal:0}, aim:null,
  });
  game.blockSet = new Set();
  for (const [c,r,kind] of map.obstacles){
    const k = OBS_KINDS[kind];
    game.obs.push({ isObs:true, kind, c, r, x:(c+0.5)*CELL, y:(r+0.5)*CELL, hp:k.hp, maxHp:k.hp, def:{r:24}, dead:false, prog:-1, hitFlash:0, wob:Math.random()*9 });
    game.blockSet.add(c+','+r);
  }
  $('pauseBtn').textContent = '⏸️';
  $('waveTotal').textContent = game.endless ? '∞' : map.waves;
  $('mapTag').textContent = map.icon + ' ' + map.name + ' · ' + DIFF.name + (game.endless ? ' · 无尽' : '');
  canvas.classList.remove('aim');
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
const hpScale = w => Math.pow(1.17, w-1) * (1 + Math.max(0, w-20)*0.05) * DIFF.hp * MP.map.hpMul;
const speedScale = w => (1 + w*0.015) * DIFF.speed;

function buildWaveGroups(w){
  const n = x => Math.max(1, Math.round(x * DIFF.count));
  const g = [];
  g.push({ type:'bean', count:n(6 + w*1.4), int:Math.max(0.45, 0.95 - w*0.02) });
  if (w >= 3)  g.push({ type:'bat',    count:n(1 + w*1.1), int:0.5 });
  if (w >= 4 && w % 3 === 1) g.push({ type:'thief', count:n(2 + w/5), int:0.8 });
  if (w >= 5)  g.push({ type:'pig',    count:n(1 + w/2),   int:1.2 });
  if (w >= 6)  g.push({ type:'slime',  count:n(1 + w/3),   int:1.1 });
  if (w >= 7)  g.push({ type:'ghost',  count:n(w/2),       int:0.85 });
  if (w >= 9)  g.push({ type:'knight', count:n(w/3),       int:1.5 });
  if (w >= 11) g.push({ type:'mole',   count:n(w/3),       int:1.0 });
  if (w >= 12) g.push({ type:'healer', count:n(1 + w/6),   int:2.0 });
  const fw = MP.map.waves;
  if (w === fw || (w > fw && (w-fw) % 10 === 0)) g.push({ type:'king', count:1 + Math.floor((w-fw)/10), int:5 });
  else if (w % 10 === 0) g.push({ type:'dragon', count:1 + Math.floor(w/20), int:4 });
  else if (w % 5 === 0)  g.push({ type:'boss',   count:1 + Math.floor(w/15), int:3 });
  return g;
}
function startWave(){
  game.wave++;
  game.phase = 'wave';
  game.spawnT = 0;
  game.spawnQ = [];
  const groups = buildWaveGroups(game.wave);
  groups.forEach((grp, gi) => {
    let t = 0.5 + gi*1.8;
    if (ENEMIES[grp.type].boss) t = 2.5;
    for (let i=0;i<grp.count;i++){ game.spawnQ.push({type:grp.type, t}); t += grp.int; }
  });
  game.spawnQ.sort((a,b)=>a.t-b.t);
  AC.sfx('ui');
  syncHUD(true);
}
function waveCleared(){
  const bonus = 30 + game.wave*4;
  addGold(bonus, MP.cx, MP.cy-70);
  if (!game.endless && game.wave >= MP.map.waves){ endGame(true); return; }
  game.phase = 'prep';
  game.prepT = DIFF.prep;
  syncHUD(true);
}
function spawnEnemy(type, opt){
  const def = ENEMIES[type];
  opt = opt || {};
  const hp = Math.round(def.hp * hpScale(game.wave));
  let pi = opt.path;
  if (pi === undefined){
    pi = (MP.paths.length > 1 && game.spawnN % 4 === 3) ? 1 : 0;
    game.spawnN++;
  }
  const wps = MP.paths[pi].wps;
  const e = {
    type, def, hp, maxHp:hp, path:pi, wps,
    x: opt.x !== undefined ? opt.x : wps[0][0],
    y: opt.y !== undefined ? opt.y : wps[0][1] + (Math.random()-0.5)*16,
    wp: opt.wp || 1, dist: opt.dist || 0, prog:0, phase:Math.random()*TAU,
    slowT:0, slowF:0, hitFlash:0, dead:false,
    poisonT:0, poisonDps:0, poisonAcc:0,
    burrowed:false, bT:2.5, hT:1.5, sT:def.summon ? def.summon.every*0.6 : 0,
    gold: Math.max(1, Math.round(def.gold * DIFF.gold * (1 + game.wave*0.02) * (opt.summoned ? 0.3 : 1))),
  };
  game.enemies.push(e);
  return e;
}

/* ================= 战斗 ================= */
function damageObs(o, d){
  o.hp -= d; o.hitFlash = 0.15;
  game.floats.push({x:o.x+(Math.random()-0.5)*14, y:o.y-30, txt:Math.round(d), col:'#ddd', life:0.5, t:0});
  if (o.hp <= 0){
    o.dead = true; game.obsBroken++;
    game.blockSet.delete(o.c+','+o.r);
    const k = OBS_KINDS[o.kind];
    if (o.kind === 'crate' && game.hp < START_HP && Math.random() < 0.35){
      game.hp++;
      game.floats.push({x:o.x, y:o.y-20, txt:'🥕 +1 血!', col:'#8ee060', life:1.1, t:0, gold:true});
      game.parts.push({type:'heart', x:o.x, y:o.y-20, vx:0, vy:-40, life:0.9, t:0});
    } else {
      addGold(k.gold + game.wave*2 + (o.kind==='crate' ? Math.floor(Math.random()*40) : 0), o.x, o.y-20);
    }
    for (let i=0;i<9;i++){
      const a = Math.random()*TAU, s = 40+Math.random()*80;
      game.parts.push({type:'chunk', x:o.x, y:o.y, vx:Math.cos(a)*s, vy:Math.sin(a)*s-60, life:0.6, t:0, col:obsColor(o.kind)});
    }
    game.floats.push({x:o.x, y:o.y-44, txt:'地块解锁!', col:'#fff', life:1, t:0});
    AC.sfx('crack');
  } else AC.sfx('hit');
}
function obsColor(kind){
  return {tree:'#5da344', rock:'#9aa3a8', cactus:'#4f9e5a', ice:'#a9dcff', magma:'#5a3030', crate:'#c98d54'}[kind] || '#999';
}
function hurtEnemy(e, d, opt){
  if (e.dead) return;
  opt = opt || {};
  if (e.isObs){ damageObs(e, d); return; }
  if (e.burrowed) return;
  if (e.def.armor && !opt.pierce) d = Math.max(1, d - e.def.armor);
  if (opt.crit) d *= 2;
  e.hp -= d; e.hitFlash = 0.15;
  game.floats.push({x:e.x+(Math.random()-0.5)*14, y:e.y-e.def.r-12, txt:Math.round(d)+(opt.crit?'!':''), col:opt.crit?'#ffd23e':'#fff', life:0.6, t:0, gold:!!opt.crit});
  if (e.hp <= 0) killEnemy(e);
  else AC.sfx('hit');
}
function killEnemy(e){
  if (e.dead) return;
  e.dead = true; game.kills++;
  addGold(e.gold, e.x, e.y-10);
  for (let i=0;i<7;i++){
    const a = Math.random()*TAU, s = 30+Math.random()*60;
    game.parts.push({type:'puff', x:e.x, y:e.y, vx:Math.cos(a)*s, vy:Math.sin(a)*s-20, life:0.5, t:0, r:5+Math.random()*6});
  }
  if (e.def.split){
    for (let i=0;i<2;i++){
      const s = spawnEnemy(e.def.split, {x:e.x+(i?12:-12), y:e.y, wp:e.wp, path:e.path, dist:e.dist, summoned:true});
      s.slowT = e.slowT; s.slowF = e.slowF;
    }
    game.floats.push({x:e.x, y:e.y-40, txt:'分裂!', col:'#9fe0ff', life:0.7, t:0});
  }
  if (e.def.boss){
    game.shake = Math.max(game.shake, 0.4);
    game.parts.push({type:'ring', x:e.x, y:e.y, r0:10, r1:90, life:0.5, t:0, col:'rgba(255,210,60,.8)'});
    AC.sfx('boom');
  } else AC.sfx('pop');
}
function slowEnemy(e, f, dur){
  if (e.isObs || e.def.noSlow) return;
  e.slowF = Math.max(e.slowT>0 ? e.slowF : 0, f); e.slowT = Math.max(e.slowT, dur);
}
function poisonEnemy(e, dps, dur){
  if (e.isObs) return;
  e.poisonDps = Math.max(e.poisonT>0 ? e.poisonDps : 0, dps); e.poisonT = dur;
}
function pushBack(e, amt){
  if (e.isObs || e.burrowed) return;
  if (e.def.boss) amt *= 0.3;
  else if (e.def.fly) amt *= 0.5;
  while (amt > 0 && e.wp > 1){
    const [px,py] = e.wps[e.wp-1];
    const dx = px-e.x, dy = py-e.y, d = Math.hypot(dx,dy);
    if (d <= amt){ e.x = px; e.y = py; e.wp--; amt -= d; e.dist -= d; }
    else { e.x += dx/d*amt; e.y += dy/d*amt; e.dist -= amt; amt = 0; }
  }
  if (e.dist < 0) e.dist = 0;
}
function carrotHit(n){
  game.hp -= n;
  game.shake = Math.max(game.shake, 0.4);
  game.hurtT = 1;
  AC.sfx('hurt');
  for (let i=0;i<6;i++){
    const a = Math.random()*TAU;
    game.parts.push({type:'chunk', x:MP.cx, y:MP.cy-10, vx:Math.cos(a)*80, vy:-60-Math.random()*80, life:0.6, t:0, col:'#ff8a3d'});
  }
  if (game.hp <= 0){ game.hp = 0; endGame(false); }
}
function stealGold(e){
  const amt = Math.min(game.gold, e.def.steal + game.wave*2);
  game.gold -= amt;
  game.floats.push({x:MP.cx, y:MP.cy-70, txt:'-'+amt+' 💰 被偷了!', col:'#ff5a5a', life:1.1, t:0, gold:true});
  game.shake = Math.max(game.shake, 0.15);
  AC.sfx('steal');
}

function updateEnemy(e, dt){
  if (e.slowT > 0) e.slowT -= dt;
  if (e.hitFlash > 0) e.hitFlash -= dt;
  // 中毒
  if (e.poisonT > 0){
    e.poisonT -= dt;
    const d = e.poisonDps*dt;
    e.hp -= d; e.poisonAcc += d;
    if (e.poisonAcc >= 8){
      game.floats.push({x:e.x+(Math.random()-0.5)*14, y:e.y-e.def.r-10, txt:Math.round(e.poisonAcc), col:'#c46bff', life:0.6, t:0});
      e.poisonAcc = 0;
    }
    if (e.hp <= 0){ killEnemy(e); return; }
  }
  // 钻地
  if (e.def.burrow){
    e.bT -= dt;
    if (e.bT <= 0){
      e.burrowed = !e.burrowed;
      e.bT = e.burrowed ? 2.2 : 3.2;
      for (let i=0;i<6;i++){ const a=Math.random()*TAU; game.parts.push({type:'chunk', x:e.x, y:e.y+8, vx:Math.cos(a)*50, vy:-50-Math.random()*40, life:0.5, t:0, col:'#8a5a33'}); }
    }
  }
  // 治疗
  if (e.def.heal){
    e.hT -= dt;
    if (e.hT <= 0){
      e.hT = 2;
      let did = false;
      for (const o of game.enemies){
        if (o !== e && !o.dead && o.hp < o.maxHp && dist2(o.x,o.y,e.x,e.y) <= 85*85){
          const amt = Math.round(o.maxHp*0.06);
          o.hp = Math.min(o.maxHp, o.hp + amt); did = true;
          game.floats.push({x:o.x, y:o.y-o.def.r-14, txt:'+'+amt, col:'#8ee060', life:0.6, t:0});
        }
      }
      if (did) game.parts.push({type:'ring', x:e.x, y:e.y-6, r0:10, r1:85, life:0.5, t:0, col:'rgba(255,120,170,.8)'});
    }
  }
  // 召唤
  if (e.def.summon){
    e.sT -= dt;
    if (e.sT <= 0){
      e.sT = e.def.summon.every;
      for (let i=0;i<e.def.summon.n;i++){
        spawnEnemy(e.def.summon.type, {x:e.x+(Math.random()-0.5)*30, y:e.y+(Math.random()-0.5)*30, wp:e.wp, path:e.path, dist:e.dist, summoned:true});
      }
      game.parts.push({type:'ring', x:e.x, y:e.y, r0:10, r1:70, life:0.5, t:0, col:'rgba(180,80,255,.8)'});
      game.floats.push({x:e.x, y:e.y-e.def.r-30, txt:'召唤!', col:'#e0a0ff', life:0.8, t:0});
    }
  }
  let sp = e.def.speed * speedScale(game.wave);
  if (e.def.rage && e.hp < e.maxHp*0.4) sp *= 1.5;
  if (e.burrowed) sp *= 1.5;
  if (game.freezeT > 0) sp = 0;
  else if (e.slowT > 0 && !e.def.noSlow) sp *= (1 - e.slowF);
  let step = sp * dt;
  while (step > 0 && !e.dead){
    if (e.wp >= e.wps.length){
      e.dead = true;
      if (e.def.steal) stealGold(e); else carrotHit(e.def.dmg||1);
      break;
    }
    const [tx,ty] = e.wps[e.wp];
    const dx = tx-e.x, dy = ty-e.y, d = Math.hypot(dx,dy);
    if (d <= step){ e.x = tx; e.y = ty; e.wp++; step -= d; e.dist += d; }
    else { e.x += dx/d*step; e.y += dy/d*step; e.dist += step; step = 0; }
  }
  e.prog = e.dist / MP.paths[e.path].len;
}

function acquireTarget(t, range, allowObs){
  let best = null;
  const r2 = range*range;
  for (const e of game.enemies){
    if (e.dead || e.burrowed) continue;
    if (dist2(e.x,e.y,t.x,t.y) <= r2){
      if (!best || e.prog > best.prog) best = e;
    }
  }
  if (best || !allowObs) return best;
  let bd = Infinity;
  for (const o of game.obs){
    if (o.dead) continue;
    const d = dist2(o.x,o.y,t.x,t.y);
    if (d <= r2 && d < bd){ bd = d; best = o; }
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
      addGold(def.gold[t.lv-1], t.x, t.y - 40);
      game.parts.push({type:'ring', x:t.x, y:t.y-24, r0:6, r1:36, life:0.4, t:0, col:'rgba(255,220,90,.8)'});
      AC.sfx('coin');
    }
    return;
  }
  const range = def.range[t.lv-1];
  const target = acquireTarget(t, range, t.type !== 'magnet');
  if (target) t.angle = Math.atan2(target.y - t.y, target.x - t.x);
  if (t.type === 'fan') t.spin += dt * (target ? 14 : 3);
  if (t.cd > 0 || !target) return;
  const dmg = def.dmg[t.lv-1];

  if (t.type === 'snow'){
    t.cd = def.cd;
    game.parts.push({type:'ring', x:t.x, y:t.y-14, r0:14, r1:range, life:0.45, t:0, col:'rgba(140,200,255,.85)'});
    for (const e of game.enemies.concat(game.obs)){
      if (!e.dead && !e.burrowed && dist2(e.x,e.y,t.x,t.y) <= range*range){
        hurtEnemy(e, dmg);
        slowEnemy(e, def.slow[t.lv-1], 2);
      }
    }
    AC.sfx('freeze');
  }
  else if (t.type === 'magnet'){
    t.cd = def.cd; t.recoil = 1;
    const push = def.push[t.lv-1];
    game.parts.push({type:'ring', x:t.x, y:t.y-10, r0:range, r1:10, life:0.5, t:0, col:'rgba(255,90,90,.8)'});
    game.parts.push({type:'ring', x:t.x, y:t.y-10, r0:range, r1:10, life:0.5, t:0.1, col:'rgba(90,150,255,.8)'});
    for (const e of game.enemies){
      if (!e.dead && !e.burrowed && dist2(e.x,e.y,t.x,t.y) <= range*range){
        hurtEnemy(e, dmg);
        pushBack(e, push);
        game.parts.push({type:'spark', x:e.x, y:e.y, vx:0, vy:-30, life:0.25, t:0});
      }
    }
    AC.sfx('magnet');
  }
  else if (t.type === 'tesla'){
    t.cd = def.cd; t.recoil = 1;
    const pts = [[t.x, t.y-22]];
    const hitList = [target];
    let cur = target, d = dmg;
    if (!target.isObs){
      const maxJ = def.chain[t.lv-1];
      while (hitList.length < maxJ){
        let nb = null, bd = 100*100;
        for (const e of game.enemies){
          if (e.dead || e.burrowed || hitList.includes(e)) continue;
          const dd = dist2(e.x,e.y,cur.x,cur.y);
          if (dd < bd){ bd = dd; nb = e; }
        }
        if (!nb) break;
        hitList.push(nb); cur = nb;
      }
    }
    for (const e of hitList){ pts.push([e.x, e.y]); hurtEnemy(e, Math.round(d)); d *= 0.85; }
    game.parts.push({type:'arc', pts, life:0.22, t:0});
    AC.sfx('zap');
  }
  else if (t.type === 'bottle'){
    t.cd = def.cd; t.recoil = 1;
    game.projs.push({kind:'bullet', x:t.x, y:t.y-16, sp:430, target, dmg, life:1.4, ang:t.angle});
    AC.sfx('shoot');
  }
  else if (t.type === 'fan'){
    t.cd = def.cd; t.recoil = 1;
    const a = t.angle;
    game.projs.push({kind:'blade', x:t.x, y:t.y-14, dx:Math.cos(a), dy:Math.sin(a), sp:310, traveled:0, max:range+70, dmg, hit:new Set(), spin:0});
    AC.sfx('fan');
  }
  else if (t.type === 'rocket'){
    t.cd = def.cd; t.recoil = 1;
    game.projs.push({kind:'rocket', x:t.x, y:t.y-20, sp:250, target, tx:target.x, ty:target.y, dmg, splash:def.splash[t.lv-1], life:3, ang:t.angle});
    AC.sfx('shoot');
  }
  else if (t.type === 'poison'){
    t.cd = def.cd; t.recoil = 1;
    game.projs.push({kind:'spore', x:t.x, y:t.y-18, sp:300, target, dmg, life:1.6, ang:t.angle});
    AC.sfx('spore');
  }
  else if (t.type === 'star'){
    t.cd = def.cd; t.recoil = 1;
    const crit = Math.random() < 0.25;
    game.projs.push({kind:'star', x:t.x, y:t.y-20, sp:900, target, dmg, crit, life:1.2, ang:t.angle, spin:0});
    AC.sfx('snipe');
  }
}

function explode(x, y, dmg, radius, big){
  for (const e of game.enemies.concat(game.obs)){
    if (!e.dead && !e.burrowed && dist2(e.x,e.y,x,y) <= radius*radius) hurtEnemy(e, dmg);
  }
  game.shake = Math.max(game.shake, big ? 0.6 : 0.2);
  game.parts.push({type:'ring', x, y, r0:10, r1:radius, life:0.35, t:0, col:'rgba(255,140,60,.9)'});
  game.parts.push({type:'flash', x, y, life:0.15, t:0, r:radius*0.7});
  for (let i=0;i<(big?24:10);i++){
    const a = Math.random()*TAU, s = 40+Math.random()*(big?220:120);
    game.parts.push({type:'spark', x, y, vx:Math.cos(a)*s, vy:Math.sin(a)*s, life:0.4+(big?0.3:0), t:0});
  }
  AC.sfx(big ? 'meteor' : 'boom');
}

function updateProj(p, dt){
  if (p.kind === 'blade'){
    p.x += p.dx*p.sp*dt; p.y += p.dy*p.sp*dt;
    p.traveled += p.sp*dt; p.spin += dt*22;
    for (const e of game.enemies.concat(game.obs)){
      if (!e.dead && !e.burrowed && !p.hit.has(e) && dist2(e.x,e.y,p.x,p.y) <= (e.def.r+14)*(e.def.r+14)){
        p.hit.add(e); hurtEnemy(e, p.dmg);
      }
    }
    if (p.traveled >= p.max || p.x<-40 || p.x>W+40 || p.y<-40 || p.y>H+40) p.dead = true;
    return;
  }
  if (p.kind === 'meteor'){
    p.x += p.vx*dt; p.y += p.vy*dt;
    game.parts.push({type:'smoke', x:p.x, y:p.y, vx:(Math.random()-0.5)*30, vy:(Math.random()-0.5)*30, life:0.4, t:0, r:8, col:'#ff9a4a'});
    if (p.y >= p.ty){ explode(p.tx, p.ty, p.dmg, p.radius, true); p.dead = true; }
    return;
  }
  p.life -= dt;
  if (p.life <= 0){ p.dead = true; return; }
  const tg = p.target;
  const alive = tg && !tg.dead;
  if (p.kind === 'bullet' || p.kind === 'spore' || p.kind === 'star'){
    if (alive) p.ang = Math.atan2(tg.y-p.y, tg.x-p.x);
    if (p.kind === 'star') p.spin += dt*20;
    p.x += Math.cos(p.ang)*p.sp*dt; p.y += Math.sin(p.ang)*p.sp*dt;
    if (alive && dist2(p.x,p.y,tg.x,tg.y) <= (tg.def.r+4)*(tg.def.r+4)){
      if (p.kind === 'bullet'){
        hurtEnemy(tg, p.dmg);
        game.parts.push({type:'spark', x:p.x, y:p.y, vx:0, vy:-30, life:0.2, t:0});
      } else if (p.kind === 'spore'){
        hurtEnemy(tg, tg.isObs ? p.dmg*2 : 6, {pierce:true});
        poisonEnemy(tg, p.dmg, 4);
        for (let i=0;i<5;i++){ const a=Math.random()*TAU; game.parts.push({type:'puff', x:p.x, y:p.y, vx:Math.cos(a)*40, vy:Math.sin(a)*40-10, life:0.4, t:0, r:5, col:'#c46bff'}); }
      } else {
        hurtEnemy(tg, p.dmg, {crit:p.crit});
        game.parts.push({type:'ring', x:p.x, y:p.y, r0:4, r1:p.crit?40:24, life:0.25, t:0, col:'rgba(255,230,120,.9)'});
      }
      p.dead = true;
    }
  } else if (p.kind === 'rocket'){
    if (alive){ p.tx = tg.x; p.ty = tg.y; }
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

/* ================= 技能 ================= */
function useSkill(k){
  if (game.state !== 'playing' || game.paused) return;
  if (game.skillCd[k] > 0) return;
  if (k === 'fire'){
    game.aim = game.aim === 'fire' ? null : 'fire';
    canvas.classList.toggle('aim', game.aim === 'fire');
    AC.sfx('ui');
  } else if (k === 'freeze'){
    game.skillCd.freeze = SKILLS.freeze.cd;
    game.freezeT = SKILLS.freeze.dur;
    game.parts.push({type:'flash', x:W/2, y:H/2, life:0.35, t:0, r:900, col:'rgba(180,225,255,.55)'});
    for (const e of game.enemies){ if (!e.dead) game.parts.push({type:'ring', x:e.x, y:e.y, r0:6, r1:e.def.r+16, life:0.4, t:0, col:'rgba(180,225,255,.9)'}); }
    AC.sfx('bigfreeze');
  } else if (k === 'heal'){
    if (game.gold < SKILLS.heal.cost || game.hp >= START_HP){
      game.floats.push({x:MP.cx, y:MP.cy-70, txt: game.hp>=START_HP ? '血量已满' : '金币不够', col:'#ff8a8a', life:0.8, t:0, gold:true});
      return;
    }
    game.gold -= SKILLS.heal.cost;
    game.skillCd.heal = SKILLS.heal.cd;
    game.hp++;
    game.carrotBounce = 1;
    game.parts.push({type:'heart', x:MP.cx, y:MP.cy-46, vx:0, vy:-40, life:0.9, t:0});
    game.parts.push({type:'ring', x:MP.cx, y:MP.cy-10, r0:10, r1:60, life:0.5, t:0, col:'rgba(140,230,100,.9)'});
    game.floats.push({x:MP.cx, y:MP.cy-80, txt:'🥕 +1', col:'#8ee060', life:0.9, t:0, gold:true});
    AC.sfx('upgrade');
  }
  syncHUD(true);
}
function castFire(x, y){
  game.aim = null; canvas.classList.remove('aim');
  game.skillCd.fire = SKILLS.fire.cd;
  const dmg = 160 + game.wave*10;
  game.projs.push({kind:'meteor', x:x-160, y:-60, tx:x, ty:y, vx:160/0.45, vy:(y+60)/0.45, dmg, radius:SKILLS.fire.radius});
  AC.sfx('shoot');
  syncHUD(true);
}

/* ================= 建造 ================= */
function cellBuildable(c, r){
  if (c<0||r<0||c>=COLS||r>=ROWS) return false;
  const k = c+','+r;
  return !MP.pathSet.has(k) && !game.blockSet.has(k) && k!==MP.carrotKey && !game.towerMap[k];
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
  const cx = clamp((c+0.5)*CELL, 142, W-142);
  const cy = clamp((r+0.5)*CELL, 142, H-142);
  const items = TOWER_KEYS.map((k,i)=>{
    const a = -Math.PI/2 + i*TAU/TOWER_KEYS.length;
    return {key:k, x:cx+Math.cos(a)*108, y:cy+Math.sin(a)*108, r:29};
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
      if (m.kind === 'build') buildTower(it.key, m.c, m.r);
      else if (it.key === 'upgrade') upgradeTower(m.tower);
      else sellTower(m.tower);
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
  if (game.aim === 'fire'){ castFire(clamp(mx,0,W), clamp(my,0,H)); return; }
  if (game.menu){ clickMenu(mx,my); return; }
  if (game.chest && dist2(mx,my,game.chest.x,game.chest.y) <= 38*38){ collectChest(); return; }
  const c = Math.floor(mx/CELL), r = Math.floor(my/CELL);
  if (c<0||r<0||c>=COLS||r>=ROWS) return;
  const k = c+','+r;
  if (k === MP.carrotKey){
    game.carrotBounce = 1;
    game.parts.push({type:'heart', x:MP.cx, y:MP.cy-46, vx:0, vy:-40, life:0.8, t:0});
    AC.sfx('coin');
    return;
  }
  if (game.towerMap[k]){ openTowerMenu(game.towerMap[k]); return; }
  if (cellBuildable(c,r)) openBuildMenu(c,r);
});
canvas.addEventListener('contextmenu', ev => {
  ev.preventDefault();
  if (game.aim){ game.aim = null; canvas.classList.remove('aim'); syncHUD(true); }
  else if (game.menu) game.menu = null;
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
document.addEventListener('keydown', ev => {
  if (game.state !== 'playing') return;
  if (ev.code === 'Space'){ ev.preventDefault(); $('pauseBtn').click(); }
  else if (ev.key === '1') useSkill('fire');
  else if (ev.key === '2') useSkill('freeze');
  else if (ev.key === '3') useSkill('heal');
  else if (ev.key === 'Escape'){ game.aim = null; canvas.classList.remove('aim'); game.menu = null; syncHUD(true); }
});

/* ================= HUD ================= */
const hpEl=$('hp'), goldEl=$('gold'), waveEl=$('wave'), nextBtn=$('nextBtn'), previewEl=$('wavePreview');
const skillBtns = { fire:$('skFire'), freeze:$('skFreeze'), heal:$('skHeal') };
const skillTs   = { fire:$('skFireT'), freeze:$('skFreezeT'), heal:$('skHealT') };
const hudCache = {};
function setText(el, key, txt){ if (hudCache[key] !== txt){ hudCache[key] = txt; el.textContent = txt; } }
function prepBonus(){ return Math.ceil(game.prepT)*4; }
function previewText(){
  if (game.state !== 'playing') return '';
  if (game.phase === 'wave'){
    const left = game.spawnQ.length + game.enemies.length;
    return `⚔️ 战斗中 · 剩余 ${left} 只`;
  }
  const w = game.wave+1;
  const parts = buildWaveGroups(w).map(g => ENEMIES[g.type].icon + '×' + g.count);
  return `下一波(${w})：` + parts.join(' ');
}
function syncHUD(force){
  setText(hpEl, 'hp', String(game.hp));
  setText(goldEl, 'gold', String(Math.floor(game.gold)));
  setText(waveEl, 'wave', String(game.wave));
  const prep = game.state==='playing' && game.phase==='prep';
  nextBtn.hidden = !prep;
  if (prep){
    setText(nextBtn, 'next', game.wave===0
      ? `🚀 开始出怪 (${Math.ceil(game.prepT)}s)`
      : `🚀 提前召唤 +${prepBonus()}💰 (${Math.ceil(game.prepT)}s)`);
  }
  setText(previewEl, 'prev', previewText() || '💡 无怪物时，炮塔会自动拆地图上的障碍物赚金币～');
  for (const k in skillBtns){
    const cd = game.skillCd[k];
    const txt = cd > 0 ? Math.ceil(cd)+'s' : (k==='heal' ? SKILLS.heal.cost+'💰' : '就绪');
    setText(skillTs[k], 'sk'+k, txt);
    skillBtns[k].classList.toggle('cd', cd > 0);
    skillBtns[k].classList.toggle('active', game.aim === k);
  }
}
nextBtn.addEventListener('click', ()=>{
  if (game.phase !== 'prep') return;
  if (game.wave > 0) addGold(prepBonus(), MP.cx, MP.cy-70);
  startWave();
});
for (const k in skillBtns) skillBtns[k].addEventListener('click', ()=>useSkill(k));
$('pauseBtn').addEventListener('click', function(){
  if (game.state!=='playing') return;
  game.paused = !game.paused;
  this.textContent = game.paused ? '▶️' : '⏸️';
  AC.sfx('ui');
});
$('speedBtn').addEventListener('click', function(){
  game.spd = game.spd===1 ? 2 : (game.spd===2 ? 3 : 1);
  this.textContent = ['','▶️ x1','⏩ x2','⏭️ x3'][game.spd];
  AC.sfx('ui');
});
$('muteBtn').addEventListener('click', function(){
  AC.muted = !AC.muted;
  this.textContent = AC.muted ? '🔇' : '🔊';
});
function showMenu(){
  game.state = 'menu'; game.menu = null; game.aim = null; canvas.classList.remove('aim');
  $('endScreen').hidden = true; $('startScreen').hidden = false;
  renderMapCards();
  nextBtn.hidden = true;
}
$('restartBtn').addEventListener('click', ()=>{ AC.init(); showMenu(); });
$('startBtn').addEventListener('click', ()=>{
  AC.init();
  game.endless = $('endlessChk').checked;
  $('startScreen').hidden = true;
  resetGame();
});
$('againBtn').addEventListener('click', ()=>{ $('endScreen').hidden = true; resetGame(); });
$('menuBtn').addEventListener('click', showMenu);

/* 开始界面：地图卡片与难度 */
function renderMapCards(){
  const list = $('mapList');
  list.innerHTML = '';
  MAPS.forEach((m, i) => {
    const rec = records[m.id+'_'+game.diffKey] || {};
    const recE = records[m.id+'_'+game.diffKey+'_e'] || {};
    const card = document.createElement('div');
    card.className = 'mapCard' + (i===game.mapIdx ? ' sel' : '');
    let recTxt = '';
    if (rec.stars) recTxt += '<span class="stars">' + '⭐'.repeat(rec.stars) + '</span> ';
    if (rec.wave) recTxt += `最佳 ${rec.wave} 波`;
    if (recE.wave) recTxt += (recTxt?' · ':'') + `无尽 ${recE.wave} 波`;
    card.innerHTML = `<div class="ico">${m.icon}</div><div class="nm">${m.name}</div><div class="ds">${m.desc}</div><div class="ds">${m.waves} 波 · ${m.paths.length} 入口</div><div class="rec">${recTxt || '暂无纪录'}</div>`;
    card.addEventListener('click', ()=>{ game.mapIdx = i; AC.init(); AC.sfx('ui'); renderMapCards(); });
    list.appendChild(card);
  });
  const dl = $('diffList');
  dl.innerHTML = '';
  for (const k in DIFFS){
    const b = document.createElement('button');
    b.textContent = DIFFS[k].name;
    b.className = (DIFFS[k].cls||'') + (k===game.diffKey ? ' sel' : '');
    b.addEventListener('click', ()=>{ game.diffKey = k; AC.init(); AC.sfx('ui'); renderMapCards(); });
    dl.appendChild(b);
  }
}
renderMapCards();

function endGame(win){
  game.state = 'over';
  game.menu = null; game.aim = null; canvas.classList.remove('aim');
  AC.sfx(win?'win':'lose');
  let stars = 0;
  if (win) stars = game.hp>=8 ? 3 : (game.hp>=4 ? 2 : 1);
  const map = MAPS[game.mapIdx];
  const prev = records[map.id+'_'+game.diffKey+(game.endless?'_e':'')] || {wave:0};
  const newBest = game.wave > prev.wave;
  saveRecord(map.id, game.diffKey, game.endless, game.wave, stars);
  $('endTitle').textContent = win ? '🎉 萝卜保住啦！' : (game.endless ? '🏁 无尽挑战结束' : '😭 萝卜被吃掉了…');
  $('endStars').textContent = win ? '⭐'.repeat(stars) + '☆'.repeat(3-stars) : (newBest && game.endless ? '🏆 新纪录！' : '');
  $('endStats').textContent = `${map.icon} ${map.name} · ${DIFF.name}${game.endless?' · 无尽':''}\n坚守 ${game.wave} 波 · 击败 ${game.kills} 只怪物 · 拆除 ${game.obsBroken} 个障碍 · 累计金币 ${game.goldEarned}`;
  $('endScreen').hidden = false;
}

/* ================= 更新 ================= */
function update(dt){
  game.time += dt;
  if (game.shake > 0) game.shake -= dt;
  if (game.hurtT > 0) game.hurtT -= dt;
  if (game.carrotBounce > 0) game.carrotBounce -= dt*2;
  if (game.freezeT > 0) game.freezeT -= dt;
  for (const k in game.skillCd) if (game.skillCd[k] > 0) game.skillCd[k] -= dt;

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
  for (const o of game.obs) if (o.hitFlash > 0) o.hitFlash -= dt;
  game.obs = game.obs.filter(o => !o.dead);
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
function feet(g, r, col, dist){
  g.fillStyle = col;
  for (const s of [-1,1]){ g.beginPath(); g.ellipse(s*r*0.45, r*0.85 + Math.sin(dist*0.3+(s>0?0:Math.PI))*3, 6, 4, 0, 0, TAU); g.fill(); }
}

function drawEnemy(e){
  const g = ctx, d = e.def, t = game.time;
  const bob = d.fly ? Math.sin(t*6+e.phase)*5 : 0;
  const wob = Math.sin(e.dist*0.12 + e.phase);
  const x = e.x, y = e.y - bob - (d.fly?10:0);
  const r = d.r;

  if (e.burrowed){
    // 土堆
    g.fillStyle = '#8a5a33'; g.beginPath(); g.ellipse(e.x, e.y+6, r*1.1, r*0.55, 0, 0, TAU); g.fill();
    g.fillStyle = '#a5713f'; g.beginPath(); g.ellipse(e.x-4, e.y+2, r*0.7, r*0.35, 0, 0, TAU); g.fill();
    for (let i=0;i<3;i++){ const k=(t*3+i)%1; g.fillStyle=`rgba(138,90,51,${1-k})`; g.beginPath(); g.arc(e.x+(i-1)*10, e.y-4-k*16, 3, 0, TAU); g.fill(); }
    return;
  }

  g.fillStyle = 'rgba(0,0,0,.15)';
  g.beginPath(); g.ellipse(e.x, e.y + d.r*0.75, d.r*0.8, d.r*0.3, 0, 0, TAU); g.fill();

  g.save();
  g.translate(x, y);
  if (!d.fly) g.scale(1+wob*0.05, 1-wob*0.05);

  if (e.type === 'bean'){
    g.fillStyle = '#7ec850'; g.strokeStyle = '#5a9e35'; g.lineWidth = 3;
    g.beginPath(); g.ellipse(0, 0, r, r*0.92, 0, 0, TAU); g.fill(); g.stroke();
    g.fillStyle = '#a5dd7e'; g.beginPath(); g.ellipse(-r*0.3, -r*0.3, r*0.35, r*0.25, -0.6, 0, TAU); g.fill();
    g.strokeStyle = '#5a9e35'; g.lineWidth = 3; g.lineCap = 'round';
    g.beginPath(); g.moveTo(0,-r*0.85); g.quadraticCurveTo(3,-r*1.2, 8,-r*1.3); g.stroke();
    g.fillStyle = '#7ec850'; g.beginPath(); g.ellipse(10,-r*1.3, 6, 4, 0.5, 0, TAU); g.fill();
    drawEyes(g, 0, -r*0.15, r*0.4, r*0.22, e.phase, 0);
    g.strokeStyle = '#446622'; g.lineWidth = 2;
    g.beginPath(); g.arc(0, r*0.25, r*0.25, 0.2, Math.PI-0.2); g.stroke();
    feet(g, r, '#5a9e35', e.dist);
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
    g.fillStyle = '#7e5fc0';
    for (const s of [-1,1]){ g.beginPath(); g.moveTo(s*r*0.3,-r*0.7); g.lineTo(s*r*0.75,-r*1.25); g.lineTo(s*r*0.75,-r*0.5); g.closePath(); g.fill(); }
    drawEyes(g, 0, -r*0.1, r*0.38, r*0.24, e.phase, 0);
    g.fillStyle = '#fff';
    for (const s of [-1,1]){ g.beginPath(); g.moveTo(s*r*0.2, r*0.35); g.lineTo(s*r*0.3, r*0.6); g.lineTo(s*r*0.38, r*0.35); g.closePath(); g.fill(); }
  }
  else if (e.type === 'thief'){
    g.fillStyle = '#9e9e9e'; g.strokeStyle = '#6e6e6e'; g.lineWidth = 3;
    // 大耳朵
    for (const s of [-1,1]){ g.beginPath(); g.arc(s*r*0.65, -r*0.7, r*0.4, 0, TAU); g.fill(); g.stroke(); g.fillStyle='#ffb3c7'; g.beginPath(); g.arc(s*r*0.65, -r*0.7, r*0.2, 0, TAU); g.fill(); g.fillStyle='#9e9e9e'; }
    g.beginPath(); g.ellipse(0, 0, r, r*0.9, 0, 0, TAU); g.fill(); g.stroke();
    // 眼罩
    g.fillStyle = '#333'; rr(g, -r*0.85, -r*0.42, r*1.7, r*0.5, 6); g.fill();
    g.fillStyle = '#fff';
    for (const s of [-1,1]){ g.beginPath(); g.arc(s*r*0.38, -r*0.17, r*0.15, 0, TAU); g.fill(); }
    g.fillStyle = '#ffb3c7'; g.beginPath(); g.arc(0, r*0.3, r*0.15, 0, TAU); g.fill();
    // 麻袋
    g.fillStyle = '#c98d54'; g.strokeStyle = '#8a5a33'; g.lineWidth = 2;
    g.beginPath(); g.ellipse(r*0.95, r*0.25, r*0.45, r*0.55, 0.3, 0, TAU); g.fill(); g.stroke();
    g.fillStyle = '#ffd23e'; g.font = 'bold 11px '+FONT; g.textAlign='center'; g.textBaseline='middle'; g.fillText('$', r*0.95, r*0.3);
    feet(g, r, '#6e6e6e', e.dist);
  }
  else if (e.type === 'pig'){
    g.fillStyle = '#ffa8c0'; g.strokeStyle = '#e07898'; g.lineWidth = 3;
    g.beginPath(); g.ellipse(0, 0, r, r*0.9, 0, 0, TAU); g.fill(); g.stroke();
    g.fillStyle = '#ffc4d6'; g.beginPath(); g.ellipse(-r*0.3, -r*0.3, r*0.4, r*0.28, -0.5, 0, TAU); g.fill();
    g.fillStyle = '#ffa8c0'; g.strokeStyle = '#e07898';
    for (const s of [-1,1]){
      g.beginPath(); g.moveTo(s*r*0.4,-r*0.65); g.quadraticCurveTo(s*r*0.75,-r*1.15, s*r*0.85,-r*0.55); g.closePath();
      g.fill(); g.stroke();
    }
    drawEyes(g, 0, -r*0.3, r*0.42, r*0.2, e.phase, 0);
    g.fillStyle = '#ff8fb0'; g.strokeStyle = '#e07898'; g.lineWidth = 2.5;
    g.beginPath(); g.ellipse(0, r*0.15, r*0.34, r*0.24, 0, 0, TAU); g.fill(); g.stroke();
    g.fillStyle = '#c05878';
    for (const s of [-1,1]){ g.beginPath(); g.ellipse(s*r*0.13, r*0.15, r*0.06, r*0.1, 0, 0, TAU); g.fill(); }
    g.fillStyle = '#e07898';
    for (const s of [-1,1]){ g.beginPath(); g.ellipse(s*r*0.5, r*0.82 + Math.sin(e.dist*0.25+(s>0?0:Math.PI))*3, 7, 5, 0, 0, TAU); g.fill(); }
  }
  else if (e.type === 'slime' || e.type === 'slimelet'){
    const sq = 1 + Math.sin(t*6+e.phase)*0.08;
    g.scale(1/sq, sq);
    g.globalAlpha = 0.9;
    g.fillStyle = '#5fd3e8'; g.strokeStyle = '#2f9bb5'; g.lineWidth = 2.5;
    g.beginPath(); g.moveTo(-r, r*0.7); g.quadraticCurveTo(-r*1.1, -r*0.9, 0, -r*0.95); g.quadraticCurveTo(r*1.1, -r*0.9, r, r*0.7); g.quadraticCurveTo(0, r*0.95, -r, r*0.7); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = 'rgba(255,255,255,.6)'; g.beginPath(); g.ellipse(-r*0.35, -r*0.4, r*0.28, r*0.18, -0.6, 0, TAU); g.fill();
    g.fillStyle = 'rgba(255,255,255,.45)'; g.beginPath(); g.arc(r*0.3, r*0.1, r*0.14, 0, TAU); g.fill();
    g.globalAlpha = 1;
    drawEyes(g, 0, -r*0.1, r*0.38, r*0.2, e.phase, 0);
    g.strokeStyle = '#1f7a90'; g.lineWidth = 2;
    g.beginPath(); g.arc(0, r*0.3, r*0.2, 0.2, Math.PI-0.2); g.stroke();
  }
  else if (e.type === 'ghost'){
    g.globalAlpha = 0.88;
    const wave = t*5 + e.phase;
    g.fillStyle = '#dcecff'; g.strokeStyle = '#9db8dd'; g.lineWidth = 2.5;
    g.beginPath();
    g.arc(0, -r*0.2, r*0.85, Math.PI, 0);
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
  else if (e.type === 'knight'){
    g.fillStyle = '#b8c0c8'; g.strokeStyle = '#6f7a86'; g.lineWidth = 3;
    g.beginPath(); g.ellipse(0, 0, r, r*0.95, 0, 0, TAU); g.fill(); g.stroke();
    // 头盔
    g.fillStyle = '#8f9aa6'; g.beginPath(); g.arc(0, -r*0.25, r*0.85, Math.PI, 0); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = '#ff5a5a'; g.beginPath(); g.moveTo(-r*0.15,-r*1.05); g.quadraticCurveTo(0,-r*1.5, r*0.5,-r*1.25); g.quadraticCurveTo(r*0.2,-r*1.15, r*0.15,-r*1.0); g.closePath(); g.fill();
    // 面甲缝
    g.fillStyle = '#2b3138'; rr(g, -r*0.6, -r*0.32, r*1.2, r*0.28, 5); g.fill();
    g.fillStyle = '#ffe08a';
    for (const s of [-1,1]){ g.beginPath(); g.arc(s*r*0.3, -r*0.18, r*0.08, 0, TAU); g.fill(); }
    // 盾牌
    g.fillStyle = '#4a7fd6'; g.strokeStyle = '#2b5aa8'; g.lineWidth = 2.5;
    g.beginPath(); g.moveTo(-r*1.15, -r*0.35); g.lineTo(-r*0.55, -r*0.35); g.lineTo(-r*0.55, r*0.35); g.lineTo(-r*0.85, r*0.6); g.lineTo(-r*1.15, r*0.35); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = '#ffd23e'; drawStarPath(g, -r*0.85, r*0.05, r*0.2); g.fill();
    feet(g, r, '#6f7a86', e.dist);
  }
  else if (e.type === 'mole'){
    g.fillStyle = '#8a6a4a'; g.strokeStyle = '#5c4430'; g.lineWidth = 3;
    g.beginPath(); g.ellipse(0, 0, r, r*0.9, 0, 0, TAU); g.fill(); g.stroke();
    g.fillStyle = '#a88a6a'; g.beginPath(); g.ellipse(0, r*0.25, r*0.6, r*0.45, 0, 0, TAU); g.fill();
    drawEyes(g, 0, -r*0.25, r*0.38, r*0.16, e.phase, 0);
    g.fillStyle = '#ff8fb0'; g.beginPath(); g.ellipse(0, r*0.15, r*0.22, r*0.16, 0, 0, TAU); g.fill();
    g.strokeStyle = '#5c4430'; g.lineWidth = 1.5;
    for (const s of [-1,1]){ g.beginPath(); g.moveTo(s*r*0.25, r*0.2); g.lineTo(s*r*0.7, r*0.1); g.stroke(); g.beginPath(); g.moveTo(s*r*0.25, r*0.3); g.lineTo(s*r*0.7, r*0.4); g.stroke(); }
    // 爪子
    g.fillStyle = '#ffe0b0'; g.strokeStyle = '#c9a070';
    for (const s of [-1,1]){ g.beginPath(); g.ellipse(s*r*0.85, r*0.5, r*0.28, r*0.2, s*0.5, 0, TAU); g.fill(); g.stroke(); }
    // 安全帽
    g.fillStyle = '#ffd23e'; g.strokeStyle = '#d9a520'; g.lineWidth = 2;
    g.beginPath(); g.arc(0, -r*0.55, r*0.62, Math.PI, 0); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = '#fff'; g.beginPath(); g.arc(0, -r*0.85, r*0.14, 0, TAU); g.fill();
  }
  else if (e.type === 'healer'){
    g.fillStyle = '#fff5f8'; g.strokeStyle = '#e8a0b8'; g.lineWidth = 3;
    g.beginPath(); g.ellipse(0, 0, r, r*0.95, 0, 0, TAU); g.fill(); g.stroke();
    // 小翅膀
    const fl = Math.sin(t*10+e.phase)*0.4;
    g.fillStyle = 'rgba(255,255,255,.85)'; g.strokeStyle = '#e8a0b8'; g.lineWidth = 1.5;
    for (const s of [-1,1]){ g.save(); g.translate(s*r*0.8, -r*0.1); g.rotate(s*fl); g.beginPath(); g.ellipse(s*r*0.35, 0, r*0.5, r*0.25, s*0.5, 0, TAU); g.fill(); g.stroke(); g.restore(); }
    // 护士帽
    g.fillStyle = '#fff'; g.strokeStyle = '#e8a0b8'; g.lineWidth = 2;
    rr(g, -r*0.5, -r*1.15, r, r*0.45, 4); g.fill(); g.stroke();
    g.fillStyle = '#ff5a7a'; rr(g, -r*0.08, -r*1.08, r*0.16, r*0.32, 1); g.fill(); rr(g, -r*0.16, -r*1.0, r*0.32, r*0.16, 1); g.fill();
    drawEyes(g, 0, -r*0.15, r*0.38, r*0.2, e.phase, 0);
    g.fillStyle = 'rgba(255,120,150,.4)';
    for (const s of [-1,1]){ g.beginPath(); g.ellipse(s*r*0.55, r*0.15, r*0.18, r*0.12, 0, 0, TAU); g.fill(); }
    g.strokeStyle = '#c05878'; g.lineWidth = 2;
    g.beginPath(); g.arc(0, r*0.2, r*0.2, 0.2, Math.PI-0.2); g.stroke();
  }
  else if (e.type === 'boss'){
    g.fillStyle = '#6d5aa8'; g.strokeStyle = '#4a3a80'; g.lineWidth = 4;
    g.beginPath(); g.ellipse(0, 0, r, r*0.95, 0, 0, TAU); g.fill(); g.stroke();
    g.fillStyle = '#8a76c8'; g.beginPath(); g.ellipse(-r*0.3, -r*0.3, r*0.4, r*0.3, -0.5, 0, TAU); g.fill();
    g.fillStyle = '#ffd23e'; g.strokeStyle = '#d9a520'; g.lineWidth = 2.5;
    for (const s of [-1,1]){
      g.beginPath(); g.moveTo(s*r*0.45,-r*0.6); g.quadraticCurveTo(s*r*0.9,-r*1.1, s*r*0.6,-r*1.35);
      g.quadraticCurveTo(s*r*0.55,-r*0.95, s*r*0.75,-r*0.55); g.closePath(); g.fill(); g.stroke();
    }
    g.beginPath();
    g.moveTo(-r*0.3,-r*0.9); g.lineTo(-r*0.3,-r*1.15); g.lineTo(-r*0.12,-r*0.98);
    g.lineTo(0,-r*1.2); g.lineTo(r*0.12,-r*0.98); g.lineTo(r*0.3,-r*1.15); g.lineTo(r*0.3,-r*0.9);
    g.closePath(); g.fill(); g.stroke();
    g.strokeStyle = '#332255'; g.lineWidth = 3.5; g.lineCap='round';
    for (const s of [-1,1]){ g.beginPath(); g.moveTo(s*r*0.15,-r*0.42); g.lineTo(s*r*0.55,-r*0.28); g.stroke(); }
    drawEyes(g, 0, -r*0.12, r*0.35, r*0.2, e.phase, 0);
    g.strokeStyle = '#332255'; g.lineWidth = 3;
    g.beginPath(); g.arc(0, r*0.32, r*0.28, Math.PI+0.4, -0.4); g.stroke();
    g.fillStyle = '#fff';
    for (const s of [-1,1]){ g.beginPath(); g.moveTo(s*r*0.22, r*0.2); g.lineTo(s*r*0.3, r*0.42); g.lineTo(s*r*0.4, r*0.22); g.closePath(); g.fill(); }
  }
  else if (e.type === 'dragon'){
    const flap = Math.sin(t*9+e.phase)*0.5;
    g.fillStyle = '#e0563a'; g.strokeStyle = '#9e2f1c'; g.lineWidth = 3;
    for (const s of [-1,1]){
      g.save(); g.translate(s*r*0.6, -r*0.2); g.rotate(s*flap);
      g.beginPath(); g.moveTo(0,0); g.lineTo(s*r*1.1, -r*0.7); g.lineTo(s*r*1.25, -r*0.1); g.lineTo(s*r*0.9, r*0.25); g.closePath(); g.fill(); g.stroke();
      g.restore();
    }
    g.fillStyle = '#5fbf6a'; g.strokeStyle = '#2f7a3a'; g.lineWidth = 4;
    g.beginPath(); g.ellipse(0, 0, r, r*0.92, 0, 0, TAU); g.fill(); g.stroke();
    g.fillStyle = '#c9e89a'; g.beginPath(); g.ellipse(0, r*0.35, r*0.55, r*0.4, 0, 0, TAU); g.fill();
    // 犄角
    g.fillStyle = '#ffe08a'; g.strokeStyle = '#d9a520'; g.lineWidth = 2;
    for (const s of [-1,1]){ g.beginPath(); g.moveTo(s*r*0.35,-r*0.7); g.lineTo(s*r*0.55,-r*1.3); g.lineTo(s*r*0.7,-r*0.6); g.closePath(); g.fill(); g.stroke(); }
    g.strokeStyle = '#2f5a2a'; g.lineWidth = 3.5; g.lineCap='round';
    for (const s of [-1,1]){ g.beginPath(); g.moveTo(s*r*0.15,-r*0.5); g.lineTo(s*r*0.55,-r*0.35); g.stroke(); }
    drawEyes(g, 0, -r*0.15, r*0.38, r*0.2, e.phase, 0);
    // 鼻孔 + 火苗
    g.fillStyle = '#2f7a3a'; for (const s of [-1,1]){ g.beginPath(); g.arc(s*r*0.18, r*0.22, r*0.06, 0, TAU); g.fill(); }
    const fk = (t*4+e.phase)%1;
    g.fillStyle = `rgba(255,${140+fk*80},40,${0.8-fk*0.5})`;
    g.beginPath(); g.moveTo(-r*0.25, r*0.5); g.lineTo(0, r*0.5+r*0.5*(0.6+fk)); g.lineTo(r*0.25, r*0.5); g.closePath(); g.fill();
  }
  else if (e.type === 'king'){
    const rage = e.hp < e.maxHp*0.4;
    if (rage){ g.fillStyle = `rgba(255,60,60,${0.25+Math.sin(t*12)*0.1})`; g.beginPath(); g.arc(0, 0, r*1.35, 0, TAU); g.fill(); }
    // 披风
    g.fillStyle = '#b3232f'; g.strokeStyle = '#7a1420'; g.lineWidth = 3;
    g.beginPath(); g.moveTo(-r*0.9, -r*0.3); g.quadraticCurveTo(-r*1.4, r*0.6, -r*1.0, r*1.05); g.lineTo(r*1.0, r*1.05); g.quadraticCurveTo(r*1.4, r*0.6, r*0.9, -r*0.3); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = rage ? '#5c2a3a' : '#3f2c52'; g.strokeStyle = '#1f1430'; g.lineWidth = 4;
    g.beginPath(); g.ellipse(0, 0, r, r*0.95, 0, 0, TAU); g.fill(); g.stroke();
    g.fillStyle = 'rgba(255,255,255,.15)'; g.beginPath(); g.ellipse(-r*0.3, -r*0.3, r*0.4, r*0.3, -0.5, 0, TAU); g.fill();
    // 大皇冠
    g.fillStyle = '#ffd23e'; g.strokeStyle = '#d9a520'; g.lineWidth = 2.5;
    g.beginPath();
    g.moveTo(-r*0.55,-r*0.75); g.lineTo(-r*0.55,-r*1.3); g.lineTo(-r*0.28,-r*1.0); g.lineTo(0,-r*1.45); g.lineTo(r*0.28,-r*1.0); g.lineTo(r*0.55,-r*1.3); g.lineTo(r*0.55,-r*0.75);
    g.closePath(); g.fill(); g.stroke();
    g.fillStyle = '#ff5a5a'; g.beginPath(); g.arc(0, -r*1.0, r*0.1, 0, TAU); g.fill();
    g.fillStyle = '#5ab0ff'; for (const s of [-1,1]){ g.beginPath(); g.arc(s*r*0.42, -r*0.95, r*0.08, 0, TAU); g.fill(); }
    g.strokeStyle = '#fff'; g.lineWidth = 4; g.lineCap='round';
    for (const s of [-1,1]){ g.beginPath(); g.moveTo(s*r*0.12,-r*0.42); g.lineTo(s*r*0.55,-r*0.22); g.stroke(); }
    drawEyes(g, 0, -r*0.1, r*0.35, r*0.2, e.phase, 0);
    if (rage){ g.fillStyle = '#ff3030'; for (const s of [-1,1]){ g.beginPath(); g.arc(s*r*0.35, -r*0.1, r*0.1, 0, TAU); g.fill(); } }
    g.strokeStyle = '#fff'; g.lineWidth = 3;
    g.beginPath(); g.arc(0, r*0.35, r*0.32, Math.PI+0.3, -0.3); g.stroke();
    g.fillStyle = '#fff';
    for (const s of [-1,1]){ g.beginPath(); g.moveTo(s*r*0.25, r*0.2); g.lineTo(s*r*0.33, r*0.5); g.lineTo(s*r*0.45, r*0.22); g.closePath(); g.fill(); }
  }

  if (e.hitFlash > 0){
    g.globalAlpha = Math.min(1, e.hitFlash*6)*0.6;
    g.fillStyle = '#fff';
    g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fill();
    g.globalAlpha = 1;
  }
  if (e.poisonT > 0){
    g.fillStyle = 'rgba(180,90,255,.25)';
    g.beginPath(); g.arc(0, 0, r+2, 0, TAU); g.fill();
    for (let i=0;i<3;i++){ const k=(t*1.5+i/3+e.phase)%1; g.fillStyle=`rgba(200,120,255,${1-k})`; g.beginPath(); g.arc((i-1)*r*0.5, -r*0.4-k*r*0.9, 3.5, 0, TAU); g.fill(); }
  }
  if (game.freezeT > 0 || (e.slowT > 0 && !d.noSlow)){
    g.globalAlpha = game.freezeT > 0 ? 0.5 : 0.3; g.fillStyle = '#7ec3ff';
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
  if (d.armor){
    g.font = 'bold 10px '+FONT; g.textAlign='center'; g.textBaseline='middle';
    g.fillStyle = '#fff'; g.strokeStyle='rgba(0,0,0,.5)'; g.lineWidth=2;
    g.strokeText('🛡'+d.armor, e.x+bw/2+12, by+bh/2); g.fillText('🛡'+d.armor, e.x+bw/2+12, by+bh/2);
  }
}

/* ================= 绘制：障碍物 ================= */
function drawObstacle(o){
  const g = ctx, x = o.x, y = o.y, t = game.time;
  g.save();
  if (o.hitFlash > 0){ g.translate((Math.random()-0.5)*4, 0); }
  if (o.kind === 'tree'){
    g.fillStyle = 'rgba(0,0,0,.12)'; g.beginPath(); g.ellipse(x, y+26, 24, 8, 0, 0, TAU); g.fill();
    g.fillStyle='#8a5a33'; rr(g,x-6,y,12,26,4); g.fill();
    g.fillStyle='#5da344'; g.beginPath(); g.arc(x,y-16,24,0,TAU); g.fill();
    g.fillStyle='#71b856'; g.beginPath(); g.arc(x-10,y-8,16,0,TAU); g.arc(x+12,y-10,15,0,TAU); g.fill();
    g.fillStyle='#ff6b81'; g.beginPath(); g.arc(x-8,y-20,4,0,TAU); g.arc(x+10,y-14,4,0,TAU); g.fill();
  } else if (o.kind === 'rock' || o.kind === 'magma'){
    const m = o.kind === 'magma';
    g.fillStyle = m ? '#4a2a2a' : '#9aa3a8'; g.beginPath(); g.ellipse(x,y+8,26,18,0,0,TAU); g.fill();
    g.fillStyle = m ? '#6a3a3a' : '#b8c0c4'; g.beginPath(); g.ellipse(x-6,y+2,18,14,0,0,TAU); g.fill();
    if (m){
      g.strokeStyle = `rgba(255,${120+Math.sin(t*3)*40},40,.9)`; g.lineWidth = 2.5; g.lineCap='round';
      g.beginPath(); g.moveTo(x-14, y+4); g.lineTo(x-4, y-2); g.lineTo(x+4, y+8); g.lineTo(x+14, y+2); g.stroke();
    } else { g.fillStyle='rgba(255,255,255,.5)'; g.beginPath(); g.ellipse(x-12,y-3,5,3,0,0,TAU); g.fill(); }
  } else if (o.kind === 'cactus'){
    g.fillStyle = 'rgba(0,0,0,.12)'; g.beginPath(); g.ellipse(x, y+26, 20, 7, 0, 0, TAU); g.fill();
    g.fillStyle = '#4f9e5a'; g.strokeStyle = '#2f6e3a'; g.lineWidth = 2.5;
    rr(g, x-10, y-24, 20, 50, 10); g.fill(); g.stroke();
    rr(g, x-26, y-14, 12, 24, 6); g.fill(); g.stroke(); rr(g, x-26, y-2, 18, 10, 5); g.fill(); g.stroke();
    rr(g, x+14, y-20, 12, 22, 6); g.fill(); g.stroke(); rr(g, x+8, y-8, 18, 10, 5); g.fill(); g.stroke();
    g.fillStyle = '#ffb3c7'; g.beginPath(); g.arc(x, y-26, 5, 0, TAU); g.fill();
    g.strokeStyle = '#2f6e3a'; g.lineWidth = 1.5;
    for (let i=0;i<4;i++){ g.beginPath(); g.moveTo(x-4, y-14+i*11); g.lineTo(x+4, y-14+i*11); g.stroke(); }
  } else if (o.kind === 'ice'){
    g.fillStyle = 'rgba(0,0,0,.1)'; g.beginPath(); g.ellipse(x, y+24, 24, 7, 0, 0, TAU); g.fill();
    g.fillStyle = 'rgba(169,220,255,.9)'; g.strokeStyle = '#6fb0e0'; g.lineWidth = 2.5;
    g.beginPath(); g.moveTo(x-22, y+20); g.lineTo(x-14, y-14); g.lineTo(x, y-30); g.lineTo(x+12, y-10); g.lineTo(x+22, y+20); g.closePath(); g.fill(); g.stroke();
    g.beginPath(); g.moveTo(x-6, y+20); g.lineTo(x+4, y-2); g.lineTo(x+14, y+20); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = 'rgba(255,255,255,.7)'; g.beginPath(); g.moveTo(x-12, y-4); g.lineTo(x-4, y-20); g.lineTo(x-2, y-8); g.closePath(); g.fill();
  } else if (o.kind === 'crate'){
    const b = Math.sin(t*4 + o.wob)*2;
    g.fillStyle = 'rgba(0,0,0,.12)'; g.beginPath(); g.ellipse(x, y+22, 24, 8, 0, 0, TAU); g.fill();
    g.fillStyle = '#c98d54'; g.strokeStyle = '#8a5a33'; g.lineWidth = 3;
    rr(g, x-22, y-8-b, 44, 30, 6); g.fill(); g.stroke();
    g.fillStyle = '#a5713f'; rr(g, x-24, y-18-b, 48, 14, 6); g.fill(); g.stroke();
    g.fillStyle = '#ffd23e'; g.strokeStyle = '#d9a520'; g.lineWidth = 2;
    rr(g, x-5, y-14-b, 10, 12, 2); g.fill(); g.stroke();
    g.fillStyle = '#5b3a1e'; g.beginPath(); g.arc(x, y-9-b, 2, 0, TAU); g.fill();
    const sp = (t*2 + o.wob)%1;
    g.globalAlpha = 1-sp; g.fillStyle = '#fff'; drawStarPath(g, x+18, y-24-b, 4+sp*4); g.fill(); g.globalAlpha = 1;
  }
  g.restore();
  if (o.hp < o.maxHp){
    const bw = 40, bh = 5, bx = x-20, by = y-44;
    g.fillStyle = 'rgba(0,0,0,.4)'; rr(g, bx-1, by-1, bw+2, bh+2, 3); g.fill();
    g.fillStyle = '#c9a36b'; rr(g, bx, by, bw*Math.max(0,o.hp/o.maxHp), bh, 2.5); g.fill();
  }
}

/* ================= 绘制：炮塔 ================= */
function drawTowerHead(g, type, lv, angle, o){
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
    g.save(); g.rotate(angle + Math.PI/2);
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
  else if (type === 'tesla'){
    g.save();
    // 线圈
    g.fillStyle = '#6b5a4a'; g.strokeStyle = '#4a3a2a'; g.lineWidth = 2;
    rr(g, -9, -2, 18, 20, 4); g.fill(); g.stroke();
    g.strokeStyle = '#c9a36b'; g.lineWidth = 2;
    for (let i=0;i<4;i++){ g.beginPath(); g.moveTo(-9, 2+i*4.5); g.lineTo(9, 2+i*4.5); g.stroke(); }
    // 电球
    const pulse = 1 + Math.sin(t*8)*0.06;
    g.translate(0, -12); g.scale(pulse, pulse);
    g.fillStyle = 'rgba(120,200,255,.35)'; g.beginPath(); g.arc(0, 0, 18, 0, TAU); g.fill();
    g.fillStyle = '#5ab0ff'; g.strokeStyle = '#2d6db0'; g.lineWidth = 2.5;
    g.beginPath(); g.arc(0, 0, 12, 0, TAU); g.fill(); g.stroke();
    g.fillStyle = 'rgba(255,255,255,.7)'; g.beginPath(); g.arc(-4, -4, 4, 0, TAU); g.fill();
    g.strokeStyle = '#eaf6ff'; g.lineWidth = 1.8; g.lineCap='round';
    for (let i=0;i<3;i++){
      const a = t*5 + i*TAU/3;
      g.beginPath(); g.moveTo(Math.cos(a)*11, Math.sin(a)*11);
      g.lineTo(Math.cos(a+0.3)*15, Math.sin(a+0.3)*15); g.lineTo(Math.cos(a+0.1)*19, Math.sin(a+0.1)*19); g.stroke();
    }
    g.restore();
  }
  else if (type === 'poison'){
    g.save();
    const rec = Math.max(0, o.recoil||0);
    g.scale(1+rec*0.08, 1-rec*0.08);
    g.fillStyle = '#f3e6cf'; g.strokeStyle = '#c9a36b'; g.lineWidth = 2.5;
    rr(g, -8, -4, 16, 22, 6); g.fill(); g.stroke();
    g.fillStyle = '#b05be0'; g.strokeStyle = '#7a2fb0'; g.lineWidth = 3;
    g.beginPath(); g.ellipse(0, -8, 24, 16, 0, Math.PI, 0); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = '#e6c2ff';
    g.beginPath(); g.arc(-10, -13, 4, 0, TAU); g.arc(6, -17, 3.5, 0, TAU); g.arc(14, -10, 2.8, 0, TAU); g.fill();
    // 小眼睛
    g.fillStyle = '#4a2a60'; g.beginPath(); g.arc(-4, 4, 1.8, 0, TAU); g.arc(4, 4, 1.8, 0, TAU); g.fill();
    g.strokeStyle = '#4a2a60'; g.lineWidth = 1.5; g.beginPath(); g.arc(0, 8, 3, 0.3, Math.PI-0.3); g.stroke();
    // 孢子
    for (let i=0;i<3;i++){ const k=(t*0.8+i/3)%1; g.fillStyle=`rgba(200,120,255,${0.7*(1-k)})`; g.beginPath(); g.arc((i-1)*10, -24-k*14, 3, 0, TAU); g.fill(); }
    g.restore();
  }
  else if (type === 'star'){
    g.save(); g.rotate(angle);
    const rec = Math.max(0, o.recoil||0)*7;
    g.translate(-rec, 0);
    // 炮管
    g.fillStyle = '#4a4a5a'; g.strokeStyle = '#2a2a3a'; g.lineWidth = 2.5;
    rr(g, -6, -7, 40, 14, 6); g.fill(); g.stroke();
    g.fillStyle = '#7a7a90'; rr(g, 22, -9, 12, 18, 4); g.fill(); g.stroke();
    // 星星主体
    g.rotate(-angle);
    g.fillStyle = '#ffd23e'; g.strokeStyle = '#d9a520'; g.lineWidth = 2.5;
    g.save(); g.rotate(Math.sin(t*2)*0.15); drawStarPath(g, 0, 0, 20); g.fill(); g.stroke(); g.restore();
    g.fillStyle = '#7a4a10'; g.beginPath(); g.arc(-5, -2, 2, 0, TAU); g.arc(5, -2, 2, 0, TAU); g.fill();
    g.strokeStyle = '#7a4a10'; g.lineWidth = 1.8; g.beginPath(); g.arc(0, 3, 4, 0.2, Math.PI-0.2); g.stroke();
    g.restore();
  }
  else if (type === 'magnet'){
    g.save();
    const rec = Math.max(0, o.recoil||0);
    g.translate(0, -6); g.scale(1+rec*0.12, 1+rec*0.12);
    g.rotate(Math.PI); // 开口朝下
    g.lineCap = 'butt';
    g.strokeStyle = '#c23838'; g.lineWidth = 12;
    g.beginPath(); g.arc(0, 0, 14, Math.PI, 0); g.stroke();
    g.strokeStyle = '#ff5a5a'; g.lineWidth = 8;
    g.beginPath(); g.arc(0, 0, 14, Math.PI, 0); g.stroke();
    g.fillStyle = '#4a7fd6'; g.strokeStyle = '#2b5aa8'; g.lineWidth = 2;
    for (const s of [-1,1]){ rr(g, s*14-6, 0, 12, 14, 2); g.fill(); g.stroke(); }
    g.fillStyle = '#c9dfff';
    for (const s of [-1,1]){ rr(g, s*14-4, 10, 8, 4, 1); g.fill(); }
    g.rotate(Math.PI);
    g.fillStyle = '#7a1420'; g.beginPath(); g.arc(-5, -6, 1.8, 0, TAU); g.arc(5, -6, 1.8, 0, TAU); g.fill();
    g.strokeStyle = '#7a1420'; g.lineWidth = 1.6; g.beginPath(); g.arc(0, -2, 3.5, 0.2, Math.PI-0.2); g.stroke();
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
  g.fillStyle = 'rgba(0,0,0,.12)';
  g.beginPath(); g.ellipse(t.x, t.y+22, 26, 10, 0, 0, TAU); g.fill();
  g.fillStyle = '#d9b98a'; g.strokeStyle = '#a5834f'; g.lineWidth = 3;
  rr(g, t.x-22, t.y+2, 44, 24, 9); g.fill(); g.stroke();
  g.fillStyle = '#c4a06b'; rr(g, t.x-22, t.y+14, 44, 12, 6); g.fill();
  g.fillStyle = '#6b4f2a';
  g.beginPath(); g.arc(t.x-7, t.y+11, 2, 0, TAU); g.arc(t.x+7, t.y+11, 2, 0, TAU); g.fill();
  g.strokeStyle = '#6b4f2a'; g.lineWidth = 1.8;
  g.beginPath(); g.arc(t.x, t.y+14, 4, 0.3, Math.PI-0.3); g.stroke();
  g.save();
  g.translate(t.x, t.y-10);
  drawTowerHead(g, t.type, t.lv, t.angle, t);
  g.restore();
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
  const x = MP.cx + (hurt ? Math.sin(t*60)*3 : 0);
  const y = MP.cy - bounce;
  g.save();
  g.translate(x, y);
  g.fillStyle = '#5da344'; g.strokeStyle = '#3f7d2c'; g.lineWidth = 2;
  for (const [a, len] of [[-0.7, 26],[0, 32],[0.7, 26]]){
    g.save(); g.rotate(a + Math.sin(t*2 + a)*0.08);
    g.beginPath(); g.ellipse(0, -44 - len*0.4, 8, len*0.62, 0, 0, TAU); g.fill(); g.stroke();
    g.restore();
  }
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
  g.strokeStyle = 'rgba(201,88,26,.55)'; g.lineWidth = 2.5; g.lineCap='round';
  g.beginPath(); g.moveTo(-14, -8); g.quadraticCurveTo(-10, -5, -5, -7); g.stroke();
  g.beginPath(); g.moveTo(6, 8); g.quadraticCurveTo(10, 11, 15, 9); g.stroke();
  g.beginPath(); g.moveTo(-8, 22); g.quadraticCurveTo(-4, 25, 1, 23); g.stroke();
  g.fillStyle = 'rgba(255,255,255,.35)';
  g.beginPath(); g.ellipse(-14, -20, 7, 12, 0.3, 0, TAU); g.fill();
  const mood = game.hp >= 8 ? 'happy' : (game.hp >= 4 ? 'worry' : 'cry');
  drawEyes(g, 0, -16, 10, 5.5, 0.5, 0);
  g.strokeStyle = '#8a3d0f'; g.lineWidth = 2.5; g.lineCap='round';
  if (hurt || mood === 'cry'){
    g.beginPath(); g.arc(0, 2, 6, Math.PI+0.4, -0.4); g.stroke();
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
  const bw = 64, bx = MP.cx - bw/2, by = MP.cy - 92;
  g.fillStyle = 'rgba(0,0,0,.35)'; rr(g, bx-2, by-2, bw+4, 12, 6); g.fill();
  g.fillStyle = game.hp>=6 ? '#6fdd51' : (game.hp>=3 ? '#ffcf3e' : '#ff5a5a');
  rr(g, bx, by, bw*Math.max(0, game.hp/START_HP), 8, 4); g.fill();
  g.font = 'bold 12px '+FONT; g.textAlign='center'; g.textBaseline='middle';
  g.fillStyle = '#fff'; g.strokeStyle='rgba(0,0,0,.4)'; g.lineWidth=3;
  g.strokeText('🥕 '+game.hp, MP.cx, by-10); g.fillText('🥕 '+game.hp, MP.cx, by-10);
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
  } else if (p.kind === 'spore'){
    g.save(); g.translate(p.x, p.y);
    g.fillStyle = 'rgba(180,90,255,.35)'; g.beginPath(); g.arc(0,0,11,0,TAU); g.fill();
    g.fillStyle = '#b05be0'; g.strokeStyle = '#7a2fb0'; g.lineWidth = 2;
    g.beginPath(); g.arc(0,0,7,0,TAU); g.fill(); g.stroke();
    g.fillStyle = '#e6c2ff'; g.beginPath(); g.arc(-2,-2,2.5,0,TAU); g.fill();
    g.restore();
  } else if (p.kind === 'star'){
    g.save(); g.translate(p.x, p.y);
    g.strokeStyle = 'rgba(255,230,120,.6)'; g.lineWidth = 4; g.lineCap='round';
    g.beginPath(); g.moveTo(0,0); g.lineTo(-Math.cos(p.ang)*34, -Math.sin(p.ang)*34); g.stroke();
    g.rotate(p.spin);
    g.fillStyle = '#ffd23e'; g.strokeStyle = '#d9a520'; g.lineWidth = 1.5;
    drawStarPath(g, 0, 0, p.crit ? 13 : 10); g.fill(); g.stroke();
    g.restore();
  } else if (p.kind === 'meteor'){
    g.save(); g.translate(p.x, p.y);
    g.fillStyle = 'rgba(255,120,40,.4)'; g.beginPath(); g.arc(0,0,26,0,TAU); g.fill();
    g.fillStyle = '#ff7a3a'; g.strokeStyle = '#a83a10'; g.lineWidth = 3;
    g.beginPath(); g.arc(0,0,16,0,TAU); g.fill(); g.stroke();
    g.fillStyle = '#ffd23e'; g.beginPath(); g.arc(-4,-4,6,0,TAU); g.fill();
    g.restore();
    // 落点提示
    g.strokeStyle = 'rgba(255,90,40,.7)'; g.lineWidth = 2; g.setLineDash([6,6]);
    g.beginPath(); g.arc(p.tx, p.ty, p.radius, 0, TAU); g.stroke(); g.setLineDash([]);
  }
}

function drawPart(p){
  const g = ctx, k = p.t/p.life;
  g.globalAlpha = 1-k;
  if (p.type === 'puff'){
    g.fillStyle = p.col || '#fff';
    g.beginPath(); g.arc(p.x, p.y, (p.r||6)*(1+k), 0, TAU); g.fill();
  } else if (p.type === 'smoke'){
    g.fillStyle = p.col || '#bbb';
    g.beginPath(); g.arc(p.x, p.y, (p.r||4)*(1+k*2), 0, TAU); g.fill();
  } else if (p.type === 'spark'){
    g.fillStyle = '#ffd23e';
    g.beginPath(); g.arc(p.x, p.y, 3.5*(1-k*0.5), 0, TAU); g.fill();
  } else if (p.type === 'ring'){
    g.strokeStyle = p.col || '#fff'; g.lineWidth = 4*(1-k)+1;
    g.beginPath(); g.arc(p.x, p.y, Math.max(0, p.r0 + (p.r1-p.r0)*k), 0, TAU); g.stroke();
  } else if (p.type === 'flash'){
    g.fillStyle = p.col || 'rgba(255,220,140,.8)';
    g.beginPath(); g.arc(p.x, p.y, p.r*(0.5+k*0.5), 0, TAU); g.fill();
  } else if (p.type === 'coin'){
    g.fillStyle = '#ffd23e'; g.strokeStyle = '#d9a520'; g.lineWidth = 2;
    g.beginPath(); g.arc(p.x, p.y, 6, 0, TAU); g.fill(); g.stroke();
    g.strokeStyle = '#b8860b'; g.lineWidth = 1.5;
    g.beginPath(); g.arc(p.x, p.y, 3, 0, TAU); g.stroke();
  } else if (p.type === 'chunk'){
    g.fillStyle = p.col || '#ff8a3d';
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
  } else if (p.type === 'arc'){
    g.lineCap = 'round'; g.lineJoin = 'round';
    for (const [w, col] of [[7,'rgba(120,200,255,.5)'],[3,'#eaf6ff']]){
      g.strokeStyle = col; g.lineWidth = w;
      g.beginPath();
      g.moveTo(p.pts[0][0], p.pts[0][1]);
      for (let i=1;i<p.pts.length;i++){
        const [ax,ay] = p.pts[i-1], [bx,by] = p.pts[i];
        const segs = 4;
        for (let s=1;s<=segs;s++){
          const f = s/segs, jx = s<segs ? (Math.random()-0.5)*16 : 0, jy = s<segs ? (Math.random()-0.5)*16 : 0;
          g.lineTo(ax+(bx-ax)*f+jx, ay+(by-ay)*f+jy);
        }
      }
      g.stroke();
    }
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
  g.fillStyle = '#ffd23e'; g.strokeStyle = '#d9a520'; g.lineWidth = 2;
  for (const s of [-1,1]){ g.beginPath(); g.ellipse(s*9, -24, 8, 5.5, s*0.5, 0, TAU); g.fill(); g.stroke(); }
  g.beginPath(); g.arc(0, -23, 4, 0, TAU); g.fill();
  const sp = (t*3)%1;
  g.globalAlpha = 1-sp;
  g.fillStyle = '#fff'; drawStarPath(g, 16, -26, 5+sp*4); g.fill();
  g.globalAlpha = 1;
  g.restore();
  g.strokeStyle = 'rgba(255,255,255,.9)'; g.lineWidth = 3.5;
  g.beginPath(); g.arc(ch.x, ch.y, 32, -Math.PI/2, -Math.PI/2 + TAU*(ch.life/ch.max)); g.stroke();
}

function drawTowerIcon(g, key, x, y, s){
  g.save(); g.translate(x, y); g.scale(s, s);
  drawTowerHead(g, key, 1, (key==='bottle'||key==='star') ? -0.5 : -Math.PI/2, {anim:1.2, spin:0.8, recoil:0});
  g.restore();
}

function drawMenu(){
  const g = ctx, m = game.menu;
  g.fillStyle = 'rgba(0,0,0,.25)';
  g.fillRect(0, 0, W, H);
  if (m.kind === 'build'){
    g.fillStyle = 'rgba(255,255,255,.25)';
    rr(g, m.c*CELL+3, m.r*CELL+3, CELL-6, CELL-6, 10); g.fill();
    m.items.forEach((it, i) => {
      const def = TOWERS[it.key];
      const afford = game.gold >= def.costs[0];
      const hov = game.menuHover === i;
      if (hov && def.range[0] > 0){
        g.fillStyle = 'rgba(120,220,120,.18)'; g.strokeStyle = 'rgba(120,220,120,.6)'; g.lineWidth = 2;
        g.beginPath(); g.arc((m.c+0.5)*CELL, (m.r+0.5)*CELL, def.range[0], 0, TAU); g.fill(); g.stroke();
      }
      const R = it.r + (hov?4:0);
      g.fillStyle = afford ? '#fffbe8' : '#d8d4c8';
      g.strokeStyle = hov ? '#ffb23e' : '#c9a36b'; g.lineWidth = hov ? 4 : 3;
      g.beginPath(); g.arc(it.x, it.y, R, 0, TAU); g.fill(); g.stroke();
      if (!afford) g.globalAlpha = 0.45;
      drawTowerIcon(g, it.key, it.x, it.y + (it.key==='sun'?10:(it.key==='tesla'||it.key==='magnet'?6:4)), 0.68);
      g.globalAlpha = 1;
      g.fillStyle = afford ? '#f0fae8' : '#f0e8e8';
      rr(g, it.x-22, it.y+R-6, 44, 17, 8); g.fill();
      g.strokeStyle = afford ? '#7fbf5a' : '#cc8888'; g.lineWidth = 2;
      rr(g, it.x-22, it.y+R-6, 44, 17, 8); g.stroke();
      g.font = 'bold 12px '+FONT; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillStyle = afford ? '#3f7d2c' : '#a33';
      g.fillText('💰'+def.costs[0], it.x, it.y+R+3);
      if (hov){
        const ty = m.cy + (m.cy < H/2 ? 168 : -168);
        g.font = 'bold 16px '+FONT;
        const info = def.name + '：' + def.desc;
        const tw = g.measureText(info).width + 24;
        g.fillStyle = 'rgba(60,40,20,.85)';
        rr(g, clamp(m.cx - tw/2, 4, W-tw-4), ty-14, tw, 30, 15); g.fill();
        g.fillStyle = '#ffe8b0';
        g.fillText(info, clamp(m.cx, tw/2+4, W-tw/2-4), ty+1);
      }
    });
  } else {
    const t = m.tower, def = TOWERS[t.type];
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
      g.font = 'bold 20px '+FONT; g.textAlign='center'; g.textBaseline='middle';
      g.fillText(isUp ? '⬆️' : '💰', it.x, it.y-6);
      g.font = 'bold 12px '+FONT;
      g.fillStyle = afford ? '#3f7d2c' : '#a33';
      g.fillText(isUp ? '-'+cost : '+'+cost, it.x, it.y+14);
    });
    g.font = 'bold 15px '+FONT; g.textAlign='center'; g.textBaseline='middle';
    const label = def.name + ' Lv.' + t.lv + (t.lv>=3?' (满级)':'');
    const tw = g.measureText(label).width + 24;
    g.fillStyle = 'rgba(60,40,20,.85)';
    rr(g, clamp(t.x - tw/2, 4, W-tw-4), m.cy - 122, tw, 28, 14); g.fill();
    g.fillStyle = '#ffe8b0'; g.fillText(label, clamp(t.x, tw/2+4, W-tw/2-4), m.cy - 108);
  }
}

/* ================= 主绘制 ================= */
function render(){
  ctx.clearRect(0, 0, W, H);
  if (!MP){ return; }
  ctx.save();
  if (game.shake > 0){
    ctx.translate((Math.random()-0.5)*game.shake*16, (Math.random()-0.5)*game.shake*16);
  }
  ctx.drawImage(bgCanvas, 0, 0);

  if (game.state === 'playing' && !game.menu && game.hover && !game.aim){
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
  for (const o of game.obs) drawObstacle(o);
  if (game.chest) drawChest();
  for (const t of game.towers) drawTower(t);
  for (const e of [...game.enemies].sort((a,b)=>a.y-b.y)) drawEnemy(e);
  for (const p of game.projs) drawProj(p);
  for (const p of game.parts) drawPart(p);

  for (const f of game.floats){
    const k = f.t/f.life;
    ctx.globalAlpha = 1 - k*k;
    ctx.font = `bold ${f.gold?17:14}px ${FONT}`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.lineWidth = 3;
    ctx.strokeText(f.txt, f.x, f.y);
    ctx.fillStyle = f.col;
    ctx.fillText(f.txt, f.x, f.y);
    ctx.globalAlpha = 1;
  }

  // 冻结画面
  if (game.freezeT > 0){
    ctx.fillStyle = `rgba(170,220,255,${Math.min(0.25, game.freezeT*0.2)})`;
    ctx.fillRect(0,0,W,H);
  }

  if (game.menu) drawMenu();

  // 陨石瞄准
  if (game.aim === 'fire' && game.state === 'playing'){
    ctx.fillStyle = 'rgba(0,0,0,.15)'; ctx.fillRect(0,0,W,H);
    ctx.strokeStyle = 'rgba(255,90,40,.9)'; ctx.lineWidth = 3; ctx.setLineDash([8,6]);
    ctx.beginPath(); ctx.arc(game.mx, game.my, SKILLS.fire.radius, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(255,120,40,.2)'; ctx.fill();
    ctx.font = 'bold 18px '+FONT; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.strokeStyle = 'rgba(0,0,0,.6)'; ctx.lineWidth = 4;
    ctx.strokeText('🔥 点击落点砸陨石（右键取消）', W/2, 30); ctx.fillStyle = '#ffe8b0'; ctx.fillText('🔥 点击落点砸陨石（右键取消）', W/2, 30);
  }

  // 波次横幅
  if (game.state==='playing' && game.phase==='wave' && game.spawnT < 2){
    const k = game.spawnT/2;
    ctx.globalAlpha = k<0.15 ? k/0.15 : (k>0.8 ? (1-k)/0.2 : 1);
    ctx.font = 'bold 42px '+FONT;
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.strokeStyle = 'rgba(120,60,10,.9)'; ctx.lineWidth = 8;
    const grp = buildWaveGroups(game.wave);
    const bossG = grp.find(g => ENEMIES[g.type].boss);
    const total = game.endless ? '∞' : MP.map.waves;
    const txt = bossG ? `⚠️ 第 ${game.wave} 波 · ${ENEMIES[bossG.type].name}来袭！` : `第 ${game.wave} / ${total} 波`;
    ctx.strokeText(txt, W/2, H*0.32);
    ctx.fillStyle = bossG ? '#ffcf3e' : '#fff';
    ctx.fillText(txt, W/2, H*0.32);
    ctx.globalAlpha = 1;
  }

  if (game.paused && game.state==='playing'){
    ctx.fillStyle = 'rgba(0,0,0,.4)';
    ctx.fillRect(0,0,W,H);
    ctx.font = 'bold 48px '+FONT;
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
    for (let i=0;i<game.spd;i++){ if (game.state==='playing') update(dt); }
  } else if (game.state !== 'playing'){
    game.time += dt;
  }
  tickBGM();
  syncHUD();
  render();
}
function loop(now){
  requestAnimationFrame(loop);
  step(now);
}
buildMap(MAPS[0]);
requestAnimationFrame(loop);
setInterval(() => {
  const now = performance.now();
  if (now - lastT > 120) step(now);
}, 40);
document.addEventListener('visibilitychange', () => {
  if (document.hidden && game.state === 'playing' && !game.paused){
    game.paused = true;
    $('pauseBtn').textContent = '▶️';
  }
});

// 调试口
window.G = { game, buildTower, upgradeTower, TOWERS, ENEMIES, MAPS, startWave, spawnEnemy, resetGame, useSkill, castFire, tick(dt){ if (game.state==='playing') update(dt); }, get MP(){ return MP; } };
})();
