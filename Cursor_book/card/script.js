// 카툰풍 아바타를 캔버스에 직접 그립니다.

const canvas = document.getElementById("avatarCanvas");
const ctx = canvas.getContext("2d");
const avatarBtn = document.getElementById("avatarBtn");

let viewW = 220;
let viewH = 220;

const DPR = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
function resizeForDpr() {
  const rect = canvas.getBoundingClientRect();
  const cssW = Math.max(1, rect.width);
  const cssH = Math.max(1, rect.height);
  viewW = cssW;
  viewH = cssH;

  canvas.width = Math.round(cssW * DPR);
  canvas.height = Math.round(cssH * DPR);

  // 실제 그리기는 CSS 픽셀 좌표계로
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
}

function hashString(s) {
  // 간단한 해시(결정적 색상 생성용)
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0);
}

function randFromSeed(seed) {
  // mulberry32
  let t = seed >>> 0;
  return function () {
    t += 0x6d2b79f5;
    let x = t;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

function hsl(h, s, l, a = 1) {
  return `hsla(${Math.round(h)}, ${Math.round(s)}%, ${Math.round(l)}%, ${a})`;
}

function roundRect(x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function drawAvatar(seedInput) {
  const baseSeed = hashString(seedInput);
  const rnd = randFromSeed(baseSeed);

  // 캔버스 초기화
  ctx.clearRect(0, 0, viewW, viewH);

  const w = viewW;
  const h = viewH;
  const cx = w / 2;
  const cy = h / 2;
  const s = Math.max(0.15, Math.min(1.2, Math.min(w, h) / 220)); // 220 기준 비율 스케일

  // 기존 지오메트리는 "220 기준" 상수값이 많아서, 중심 기준으로 스케일을 적용합니다.
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(s, s);
  ctx.translate(-cx, -cy);

  // 배경 그라데이션(아주 옅게)
  const bgHue = 200 + rnd() * 110;
  const bg1 = hsl(bgHue, 90, 65, 0.22);
  const bg2 = hsl(bgHue + 40, 90, 60, 0.12);
  const bg = ctx.createRadialGradient(cx - 25, cy - 20, 10, cx, cy, 140);
  bg.addColorStop(0, bg1);
  bg.addColorStop(1, bg2);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // 장식 파티클
  ctx.save();
  ctx.globalAlpha = 0.45;
  for (let i = 0; i < 22; i++) {
    const px = rnd() * w;
    const py = rnd() * h;
    const pr = 1 + rnd() * 2.2;
    ctx.fillStyle = hsl(bgHue + rnd() * 60, 90, 70, 0.25);
    ctx.beginPath();
    ctx.arc(px, py, pr, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // 얼굴(피부)
  const skinHue = 18 + rnd() * 22;
  const skin = hsl(skinHue, 70, 74, 1);
  const skinShade = hsl(skinHue, 60, 64, 0.95);

  // 머리 외곽(원+약간의 음영)
  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.arc(cx, cy, 72, 0, Math.PI * 2);
  ctx.fill();

  // 얼굴 음영
  const shade = ctx.createRadialGradient(cx - 18, cy - 10, 10, cx, cy, 90);
  shade.addColorStop(0, hsl(skinHue, 70, 78, 0.35));
  shade.addColorStop(1, hsl(skinHue, 55, 58, 0.25));
  ctx.fillStyle = shade;
  ctx.beginPath();
  ctx.arc(cx, cy, 72, 0, Math.PI * 2);
  ctx.fill();

  // 머리카락
  const hairHue = 210 + rnd() * 90; // blue~purple 범위도 섞이게
  const hair = hsl(hairHue, 55, 28, 1);
  const hairHi = hsl(hairHue, 60, 40, 1);

  ctx.fillStyle = hair;
  ctx.beginPath();
  // 앞머리(부드러운 곡선)
  ctx.moveTo(cx - 78, cy - 18);
  ctx.bezierCurveTo(cx - 55, cy - 70, cx + 35, cy - 70, cx + 75, cy - 18);
  ctx.bezierCurveTo(cx + 70, cy - 55, cx - 70, cy - 55, cx - 78, cy - 18);
  ctx.closePath();
  ctx.fill();

  // 머리카락 덩어리/실루엣(바닥쪽)
  ctx.beginPath();
  ctx.moveTo(cx - 82, cy - 10);
  ctx.quadraticCurveTo(cx - 70, cy + 14, cx - 44, cy + 6);
  ctx.quadraticCurveTo(cx - 10, cy + 26, cx, cy + 6);
  ctx.quadraticCurveTo(cx + 20, cy + 0, cx + 46, cy + 6);
  ctx.quadraticCurveTo(cx + 70, cy + 14, cx + 82, cy - 10);
  ctx.quadraticCurveTo(cx + 64, cy + 55, cx, cy + 54);
  ctx.quadraticCurveTo(cx - 64, cy + 55, cx - 82, cy - 10);
  ctx.closePath();
  ctx.fill();

  // 하이라이트(광택)
  ctx.fillStyle = hairHi;
  ctx.globalAlpha = 0.25;
  ctx.beginPath();
  ctx.ellipse(cx + 18, cy - 22, 34, 22, -0.25, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  // 귀
  const ear = hsl(skinHue, 65, 70, 0.95);
  ctx.fillStyle = ear;
  ctx.beginPath();
  ctx.ellipse(cx - 78, cy + 6, 10, 18, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(cx + 78, cy + 6, 10, 18, 0, 0, Math.PI * 2);
  ctx.fill();

  // 안경/장신구 확률(간단히)
  const wantsGlasses = rnd() > 0.55;
  if (wantsGlasses) {
    const frameHue = 0 + rnd() * 40;
    const frame = hsl(frameHue, 25, 80, 0.95);
    const frameStroke = hsl(frameHue, 25, 65, 0.95);

    ctx.strokeStyle = frameStroke;
    ctx.lineWidth = 3;
    ctx.fillStyle = frame;

    // 왼쪽 렌즈
    roundRect(cx - 42, cy - 6, 34, 26, 10);
    ctx.fill();
    ctx.stroke();
    // 오른쪽 렌즈
    roundRect(cx + 8, cy - 6, 34, 26, 10);
    ctx.fill();
    ctx.stroke();

    // 코받침
    ctx.beginPath();
    ctx.moveTo(cx - 9, cy + 8);
    ctx.quadraticCurveTo(cx - 2, cy + 2, cx + 5, cy + 8);
    ctx.stroke();

    // 안경다리
    ctx.beginPath();
    ctx.moveTo(cx - 7, cy - 1);
    ctx.lineTo(cx - 42, cy - 2);
    ctx.moveTo(cx + 3, cy - 1);
    ctx.lineTo(cx + 42, cy - 2);
    ctx.strokeStyle = frameStroke;
    ctx.lineWidth = 2.5;
    ctx.stroke();
  }

  // 눈
  const eyeY = cy + 5 + (rnd() - 0.5) * 8;
  const eyeXGap = 34 + (rnd() - 0.5) * 4;
  const irisHue = 170 + rnd() * 120;
  const iris = hsl(irisHue, 70, 45, 1);
  const irisHi = hsl(irisHue + 18, 80, 58, 0.95);

  function drawEye(x) {
    // 흰자
    ctx.fillStyle = "rgba(255,255,255,.92)";
    ctx.beginPath();
    ctx.ellipse(x, eyeY, 16, 10, 0, 0, Math.PI * 2);
    ctx.fill();

    // 동공
    ctx.fillStyle = "rgba(0,0,0,.72)";
    ctx.beginPath();
    ctx.arc(x, eyeY, 5.3, 0, Math.PI * 2);
    ctx.fill();

    // 홍채(동공 바깥에)
    ctx.fillStyle = iris;
    ctx.beginPath();
    ctx.arc(x, eyeY, 9.6, 0, Math.PI * 2);
    ctx.fill();

    // 홍채 테두리 하이라이트
    ctx.fillStyle = irisHi;
    ctx.beginPath();
    ctx.arc(x - 3, eyeY - 3, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // 눈꺼풀/속눈썹 느낌
    ctx.strokeStyle = "rgba(15, 23, 42, .45)";
    ctx.lineWidth = 2.1;
    ctx.beginPath();
    ctx.moveTo(x - 15, eyeY - 3);
    ctx.quadraticCurveTo(x, eyeY - 11, x + 15, eyeY - 3);
    ctx.stroke();
  }

  drawEye(cx - eyeXGap / 2);
  drawEye(cx + eyeXGap / 2);

  // 코
  ctx.strokeStyle = "rgba(15, 23, 42, .28)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx, cy + 18);
  ctx.quadraticCurveTo(cx - 5, cy + 18, cx - 2, cy + 23);
  ctx.quadraticCurveTo(cx, cy + 26, cx + 3, cy + 23);
  ctx.quadraticCurveTo(cx + 6, cy + 18, cx, cy + 18);
  ctx.stroke();

  // 볼(블러셔)
  ctx.fillStyle = hsl(skinHue + 5, 85, 70, 0.35);
  ctx.beginPath();
  ctx.ellipse(cx - 38, cy + 18, 14, 10, -0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(cx + 38, cy + 18, 14, 10, 0.2, 0, Math.PI * 2);
  ctx.fill();

  // 입
  const smile = 0.4 + rnd() * 0.5; // 0.4~0.9
  const mouthY = cy + 40;
  ctx.strokeStyle = "rgba(15, 23, 42, .35)";
  ctx.lineWidth = 2.6;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(cx - 26, mouthY);
  ctx.quadraticCurveTo(cx, mouthY + 8 * (1 - smile), cx + 26, mouthY);
  ctx.stroke();

  ctx.fillStyle = hsl(skinHue - 2, 70, 62, 0.12);
  ctx.beginPath();
  ctx.ellipse(cx, mouthY + 3, 24, 10, 0, 0, Math.PI * 2);
  ctx.fill();

  // 턱선 음영(살짝)
  ctx.strokeStyle = skinShade;
  ctx.globalAlpha = 0.22;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(cx - 52, cy + 52);
  ctx.quadraticCurveTo(cx, cy + 62, cx + 52, cy + 52);
  ctx.stroke();
  ctx.globalAlpha = 1;

  ctx.restore();
}

function init() {
  resizeForDpr();
  // 이름을 기반으로 기본 아바타 생성
  drawAvatar("방승욱");
}

window.addEventListener("resize", () => {
  resizeForDpr();
  drawAvatar(String(Date.now())); // 리사이즈 시에도 자연스럽게 변경
});

avatarBtn.addEventListener("click", () => {
  drawAvatar(String(Date.now()));
});

init();

